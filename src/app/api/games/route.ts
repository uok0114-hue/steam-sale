import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import axios from 'axios';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const matches: number[] = [];

    // If search term is supplied, trigger global Steam store search and auto-cache to DB
    if (search && search.trim().length > 1) {
      console.log(`Global Steam StoreSearch triggered for: "${search}"`);
      try {
        const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(search)}&cc=kr&l=korean&limit=15`;
        const res = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 5000
        });

        if (res.data && res.data.success && res.data.items) {
          const items = res.data.items;
          
          for (const item of items) {
            const appId = item.id;
            matches.push(appId); // Register this AppID as a search match
            
            try {
              const title = item.name;
              
              // Only insert if it doesn't exist in our DB
              const existing = await db.getGame(appId);
              if (!existing) {
                let steamPrice = 0;
                let steamDiscount = 0;

                if (item.price) {
                  steamPrice = Math.round((item.price.final || 0) / 100);
                  steamDiscount = item.price.discount_pct || 0;
                }

                const capsule = item.tiny_image || `https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/${appId}/header.jpg`;
                
                // Seed initial domestic reseller fallback
                const mockResellerPrice = steamPrice > 0 ? Math.round(steamPrice * 0.85) : null;
                const mockResellerStore = steamPrice > 0 ? '다이렉트게임즈' : null;

                // 1. Upsert metadata
                await db.upsertGame({
                  app_id: appId,
                  title,
                  header_image: capsule,
                  is_free: steamPrice === 0,
                  has_kr_patch: false,
                  kr_patch_url: null,
                  kr_positive_rate: 90
                });

                // 2. Upsert prices
                await db.upsertPrice({
                  app_id: appId,
                  steam_price: steamPrice,
                  steam_discount_percent: steamDiscount,
                  domestic_price: mockResellerPrice,
                  domestic_store_name: mockResellerStore,
                  lowest_recorded_price: steamPrice,
                  lowest_recorded_at: new Date().toISOString()
                });
              }
            } catch (innerErr: any) {
              console.error(`Failed to register searched game ${item.name}:`, innerErr.message);
            }
          }
        }
      } catch (searchErr: any) {
        console.error('Steam StoreSearch request failed:', searchErr.message);
      }
    }

    const data = await db.getGames();
    
    // Also include any local DB games that match the search substring in matches list
    if (search) {
      const searchLower = search.toLowerCase();
      data.forEach(game => {
        if (game.title.toLowerCase().includes(searchLower)) {
          if (!matches.includes(game.app_id)) {
            matches.push(game.app_id);
          }
        }
      });
    }

    return NextResponse.json({ success: true, data, matches });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
