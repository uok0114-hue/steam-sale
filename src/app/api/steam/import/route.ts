import { NextResponse } from 'next/server';
import axios from 'axios';
import { db } from '@/lib/db';

export const runtime = 'edge';

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function resolveSteamId(steamId: string, apiKey?: string): Promise<string | null> {
  const cleanId = steamId.replace(/\/$/, '').split('/').pop() || steamId;
  
  // 1. If it is already a 17-digit numeric SteamID64
  if (/^\d{17}$/.test(cleanId)) {
    return cleanId;
  }

  // 2. Try to resolve via Steam Web API ResolveVanityURL if API key is provided
  if (apiKey) {
    try {
      const res = await axios.get(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${cleanId}`, { timeout: 5000 });
      if (res.data && res.data.response && res.data.response.success === 1) {
        return res.data.response.steamid;
      }
    } catch (e) {
      console.error('ResolveVanityURL via API Key failed:', e);
    }
  }

  // 3. Fallback: Parse XML community page (Zero-API-Key resolution)
  try {
    const xmlRes = await axios.get(`https://steamcommunity.com/id/${cleanId}/?xml=1`, { headers: HTTP_HEADERS, timeout: 5000 });
    const match = xmlRes.data.match(/<steamID64>(\d+)<\/steamID64>/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {
    console.error('XML profile resolve failed:', e);
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { steamId, apiKey } = body;

    if (!steamId) {
      return NextResponse.json({ success: false, error: '스팀 ID를 입력해 주세요.' }, { status: 400 });
    }

    console.log(`Resolving Steam ID: ${steamId}...`);
    const resolvedId = await resolveSteamId(steamId, apiKey);
    
    if (!resolvedId) {
      return NextResponse.json({ 
        success: false, 
        error: '스팀 계정을 찾을 수 없습니다. 주소창의 스팀 ID 또는 고유 주소 이름을 정확히 입력해 주세요.' 
      }, { status: 404 });
    }

    console.log(`Resolved Steam ID to: ${resolvedId}. Fetching wishlist data...`);
    const wishlistUrl = `https://store.steampowered.com/wishlist/profiles/${resolvedId}/wishlistdata/?cc=kr`;
    const wishlistRes = await axios.get(wishlistUrl, { headers: HTTP_HEADERS, timeout: 6000 });

    // Handle private profiles
    if (typeof wishlistRes.data === 'string' && wishlistRes.data.includes('<!DOCTYPE html>')) {
      return NextResponse.json({ 
        success: false, 
        error: '스팀 프로필이 비공개 상태이거나 존재하지 않습니다. 스팀 설정에서 [프로필] 및 [게임 세부 정보]를 [공개]로 변경한 후 다시 시도해 주세요.' 
      }, { status: 400 });
    }

    const wishlistData = wishlistRes.data;
    if (!wishlistData || Object.keys(wishlistData).length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '불러올 수 있는 스팀 찜목록 게임이 없습니다. 계정이 공개 상태인지 확인해 주세요.' 
      }, { status: 400 });
    }

    const appIds = Object.keys(wishlistData);
    let count = 0;
    const importedGames: any[] = [];

    for (const appIdStr of appIds) {
      try {
        const appId = parseInt(appIdStr, 10);
        const item = wishlistData[appIdStr];
        
        // Filter only games
        if (!item || (item.type !== 'Game' && item.type !== 'game')) continue;

        const name = item.name;
        const capsule = item.capsule || `https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/${appId}/header.jpg`;
        const reviewsPercent = item.reviews_percent || 90;

        let steamPrice = 0;
        let steamDiscount = 0;

        if (item.subs && item.subs.length > 0) {
          const sub = item.subs[0];
          steamPrice = Math.round((sub.price || 0) / 100);
          steamDiscount = sub.discount_pct || 0;
        }

        // Fast import: seed initial reseller price and trigger async sync on later cron jobs
        const mockResellerPrice = steamPrice > 0 ? Math.round(steamPrice * 0.85) : null;
        const mockResellerStore = steamPrice > 0 ? '다이렉트게임즈' : null;

        // 1. Upsert Master Game Metadata
        const existing = await db.getGame(appId);
        await db.upsertGame({
          app_id: appId,
          title: name,
          header_image: capsule,
          is_free: steamPrice === 0,
          has_kr_patch: existing ? existing.has_kr_patch : false,
          kr_patch_url: existing ? existing.kr_patch_url : null,
          kr_positive_rate: reviewsPercent
        });

        // 2. Upsert Pricing details
        await db.upsertPrice({
          app_id: appId,
          steam_price: steamPrice,
          steam_discount_percent: steamDiscount,
          domestic_price: mockResellerPrice,
          domestic_store_name: mockResellerStore,
          lowest_recorded_price: existing && existing.lowest_recorded_price > 0 && existing.lowest_recorded_price < steamPrice
            ? existing.lowest_recorded_price
            : steamPrice,
          lowest_recorded_at: existing ? existing.lowest_recorded_at : new Date().toISOString()
        });

        // 3. Add to guest_user's K-SteamTracker Wishlist
        await db.addToWishlist({
          user_id: 'guest_user',
          app_id: appId,
          alert_target_price: null, // Trigger on all-time low drops
          notification_channel: 'kakaotalk',
          channel_destination: '010-1234-5678'
        });

        importedGames.push({ appId, name, steamPrice, steamDiscount });
        count++;
      } catch (err: any) {
        console.error(`Failed to import wishlist item ${appIdStr}:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `성공적으로 ${count}개의 게임을 스팀 찜목록에서 연동했습니다.`,
      count,
      games: importedGames
    });
  } catch (error: any) {
    console.error('Failed to run Steam wishlist import:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '스팀 서버 통신 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
