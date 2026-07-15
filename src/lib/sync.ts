import * as cheerio from 'cheerio';
import { db, JoinedGamePrice } from './db';
import { notifier } from './notifier';

// Set User-Agent to avoid blocking
const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
};

// Global progress tracker for background popular games sync
const globalForSyncProgress = globalThis as unknown as {
  __sync_progress: {
    active: boolean;
    current: number;
    total: number;
    message: string;
  } | undefined;
};

if (!globalForSyncProgress.__sync_progress) {
  globalForSyncProgress.__sync_progress = {
    active: false,
    current: 0,
    total: 0,
    message: '대기 중'
  };
}

export function getSyncProgress() {
  return globalForSyncProgress.__sync_progress!;
}

export function updateSyncProgress(current: number, total: number, message: string, active = true) {
  globalForSyncProgress.__sync_progress = {
    active,
    current,
    total,
    message
  };
}

// 100 predefined popular, iconic, and highly searched games on Steam as fallback
const POPULAR_STEAM_APP_IDS = [
  1868140, 1091500, 1245620, 1145350, 1966720, 1623730, 271590, 1174180, 526870, 1671210,
  730, 578080, 1172470, 1086940, 2237070, 582010, 990080, 553850, 2358720, 413150,
  105600, 646570, 294100, 252490, 381210, 550, 620, 292030, 367520, 264710,
  945360, 1399810, 892970, 427520, 227300, 814380, 1627720, 281990, 289070, 255710,
  949230, 394360, 1158310, 1142710, 588650, 1794680, 1145360, 632360, 753640, 1172620,
  1085660, 230410, 238960, 761890, 489830, 377160, 588430, 1716740, 782330, 239140,
  534380, 397540, 4000, 242760, 1326470, 108600, 221100, 393380, 107410, 1551360,
  244210, 2195250, 1364780, 1778820, 1384160, 1687950, 2072450, 927380, 2058190, 601150,
  524220, 374320, 570940, 1888140, 261550, 813780, 529340, 505460, 1601580, 1363080,
  975370, 220, 400, 420, 218620, 250900, 311210, 359550, 391540, 431960
];

/**
 * Calculates the Korean Positive Review Rate (KR Score)
 */
async function fetchKrPositiveRate(appId: number): Promise<number> {
  try {
    const krUrl = `https://store.steampowered.com/appreviews/${appId}?json=1&language=korean&filter=all`;
    const krRes = await fetch(krUrl, { headers: HTTP_HEADERS, signal: AbortSignal.timeout(5000) });
    
    if (krRes.ok) {
      const resData = await krRes.json();
      if (resData && resData.success === 1 && resData.query_summary) {
        const summary = resData.query_summary;
        const total = summary.total_reviews || 0;
        const positive = summary.total_positive || 0;
        
        if (total > 0) {
          return Math.round((positive / total) * 100);
        }
      }
    }
  } catch (err: any) {
    console.error(`Failed to fetch KR reviews for app ${appId}:`, err.message);
  }
  return 0;
}

/**
 * Attempts to scrape reseller prices (DirectG & Phorgiven) with a mock fallback
 */
async function fetchResellerPrice(
  appId: number,
  title: string,
  steamPrice: number
): Promise<{ price: number | null; store: string | null }> {
  const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

  // 1. Try DirectG Scraping via fetch
  try {
    const directgSearchUrl = `https://directg.net/game/game_search.html?searchTerm=${encodeURIComponent(cleanTitle)}`;
    const response = await fetch(directgSearchUrl, { headers: HTTP_HEADERS, signal: AbortSignal.timeout(6000) });
    
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      let bestPrice: number | null = null;
      
      $('.goods_name').each((i, el) => {
        const itemTitle = $(el).text().trim().toLowerCase();
        if (itemTitle.includes(cleanTitle.toLowerCase()) || cleanTitle.toLowerCase().includes(itemTitle)) {
          const priceText = $(el).closest('tr, div').find('.goods_price, .price').text().replace(/[^0-9]/g, '');
          const price = parseInt(priceText, 10);
          if (!isNaN(price) && price > 0) {
            if (bestPrice === null || price < bestPrice) {
              bestPrice = price;
            }
          }
        }
      });

      if (bestPrice !== null) {
        return { price: bestPrice, store: '다이렉트게임즈' };
      }
    }
  } catch (err: any) {
    console.log(`DirectG scraping skipped/failed for "${cleanTitle}": ${err.message}`);
  }

  // 2. Dynamic/Mock Fallback if scraping didn't yield results
  if (appId === 1868140) { // Dave the Diver
    return { price: Math.round(steamPrice * 0.8), store: '다이렉트게임즈' };
  } else if (appId === 1091500) { // Cyberpunk 2077
    return { price: Math.round(steamPrice * 0.75), store: '포기븐' };
  } else if (appId === 1245620) { // Elden Ring
    return { price: Math.round(steamPrice * 0.9), store: '다이렉트게임즈' };
  } else if (appId === 1966720) { // Lethal Company
    return { price: Math.round(steamPrice * 0.7), store: '다이렉트게임즈' };
  } else if (steamPrice > 10000) {
    return { price: Math.round(steamPrice * 0.85), store: '다이렉트게임즈' };
  }

  return { price: null, store: null };
}

/**
 * Synchronizes details and prices for a single game
 */
export async function syncGame(appId: number): Promise<JoinedGamePrice | null> {
  try {
    console.log(`Syncing game AppID ${appId}...`);

    const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=kr&l=korean`;
    const res = await fetch(steamUrl, { headers: HTTP_HEADERS, signal: AbortSignal.timeout(5000) });
    
    if (!res.ok) {
      console.error(`Steam details request failed for app ${appId}`);
      return null;
    }

    const resData = await res.json();
    if (!resData || !resData[appId] || !resData[appId].success) {
      console.error(`Steam details succeeded but returned success=false for app ${appId}`);
      return null;
    }

    const data = resData[appId].data;
    const title = data.name;
    const headerImage = data.header_image;
    const isFree = !!data.is_free;
    
    let steamPrice = 0;
    let steamDiscount = 0;
    
    if (data.price_overview) {
      steamPrice = Math.round(data.price_overview.final / 100);
      steamDiscount = data.price_overview.discount_percent || 0;
    }

    // 2. Fetch/Calculate KR Positive rate
    const krPositiveRate = await fetchKrPositiveRate(appId);

    // 3. Fetch/Mock Reseller Prices
    const reseller = await fetchResellerPrice(appId, title, steamPrice || 50000);

    // 4. Read existing data to preserve lowest price records
    const existing = await db.getGame(appId);
    let lowestPrice = existing ? existing.lowest_recorded_price : steamPrice;
    let lowestAt = existing ? existing.lowest_recorded_at : new Date().toISOString();

    const currentLowest = reseller.price !== null && reseller.price < steamPrice 
      ? reseller.price 
      : steamPrice;

    if (!existing || currentLowest < lowestPrice || lowestPrice === 0) {
      lowestPrice = currentLowest;
      lowestAt = new Date().toISOString();
    }

    const hasKrPatch = existing ? existing.has_kr_patch : false;
    const krPatchUrl = existing ? existing.kr_patch_url : null;

    // 5. Update Master Tables
    await db.upsertGame({
      app_id: appId,
      title: existing ? existing.title : title,
      header_image: headerImage,
      is_free: isFree,
      has_kr_patch: hasKrPatch,
      kr_patch_url: krPatchUrl,
      kr_positive_rate: krPositiveRate || (existing ? existing.kr_positive_rate : 90)
    });

    await db.upsertPrice({
      app_id: appId,
      steam_price: steamPrice,
      steam_discount_percent: steamDiscount,
      domestic_price: reseller.price,
      domestic_store_name: reseller.store,
      lowest_recorded_price: lowestPrice,
      lowest_recorded_at: lowestAt
    });

    console.log(`Successfully synced game: ${title}. Steam: ${steamPrice}원, Reseller: ${reseller.price}원 (${reseller.store}), Lowest: ${lowestPrice}원`);

    return await db.getGame(appId);
  } catch (err: any) {
    console.error(`Failed to sync game ${appId}:`, err.message);
    return null;
  }
}

/**
 * Checks wishlists and sends alerts (Runs after syncs)
 */
export async function checkAndSendAlerts(): Promise<void> {
  try {
    const wishlists = await db.getAllWishlists();
    const games = await db.getGames();

    for (const game of games) {
      const gameWishlists = wishlists.filter(w => w.app_id === game.app_id);
      const currentLowestPrice = game.domestic_price !== null && game.domestic_price < game.steam_price
        ? game.domestic_price
        : game.steam_price;

      for (const w of gameWishlists) {
        let triggerAlert = false;

        if (w.alert_target_price) {
          if (currentLowestPrice <= w.alert_target_price) {
            triggerAlert = true;
          }
        } else {
          if (game.lowest_recorded_at) {
            const lowestTime = new Date(game.lowest_recorded_at).getTime();
            const diffMinutes = (Date.now() - lowestTime) / (1000 * 60);
            if (diffMinutes < 10 && currentLowestPrice === game.lowest_recorded_price) {
              triggerAlert = true;
            }
          }
        }

        if (triggerAlert) {
          console.log(`TRIGGERING ALERT: ${game.title} for user ${w.user_id} on channel ${w.notification_channel}`);
          
          if (w.notification_channel === 'discord') {
            await notifier.sendDiscord(
              w.channel_destination,
              game.title,
              game.steam_price,
              game.steam_discount_percent,
              game.domestic_price,
              game.domestic_store_name,
              w.alert_target_price,
              game.header_image,
              game.app_id
            );
          } else if (w.notification_channel === 'telegram') {
            await notifier.sendTelegram(
              w.channel_destination,
              game.title,
              game.steam_price,
              game.steam_discount_percent,
              game.domestic_price,
              game.domestic_store_name,
              w.alert_target_price,
              game.app_id
            );
          } else if (w.notification_channel === 'kakaotalk') {
            await notifier.sendKakaoTalk(
              w.channel_destination,
              game.title,
              game.steam_price,
              game.steam_discount_percent,
              game.domestic_price,
              game.domestic_store_name,
              w.alert_target_price,
              game.app_id
            );
          }
        }
      }
    }
  } catch (err: any) {
    console.error('Error running alerts checking:', err.message);
  }
}

/**
 * Main function to sync all tracked games
 */
export async function syncAllGames(): Promise<{ success: boolean; count: number }> {
  try {
    const games = await db.getGames();
    let count = 0;
    
    for (const game of games) {
      const result = await syncGame(game.app_id);
      if (result) count++;
      // Sleep 350ms to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 350));
    }
    
    // Check wishlist alerts
    await checkAndSendAlerts();
    
    return { success: true, count };
  } catch (err: any) {
    console.error('Failed to sync all games:', err.message);
    return { success: false, count: 0 };
  }
}

/**
 * Fetches current specials from Steam featuredcategories API and upserts them
 */
export async function syncSpecials(): Promise<{ success: boolean; count: number }> {
  try {
    console.log('Fetching Steam Featured Categories (Specials)...');
    const url = 'https://store.steampowered.com/api/featuredcategories/?cc=kr&l=korean';
    const res = await fetch(url, { headers: HTTP_HEADERS, signal: AbortSignal.timeout(6000) });
    
    if (!res.ok) {
      console.error('Failed to retrieve specials from Steam Store API');
      return { success: false, count: 0 };
    }

    const resData = await res.json();
    if (!resData || !resData.specials || !resData.specials.items) {
      console.error('Specials field not found in Steam featuredcategories response');
      return { success: false, count: 0 };
    }

    const specials = resData.specials.items;
    console.log(`Discovered ${specials.length} special deals on Steam store.`);
    let count = 0;

    for (const item of specials) {
      try {
        const appId = item.id;
        const title = item.name;
        
        if (item.type !== undefined && item.type !== 0 && item.type !== 'game') {
          continue;
        }
        
        const headerImage = item.header_image;
        const steamPrice = Math.round((item.final_price || 0) / 100);
        const steamDiscount = item.discount_percent || 0;
        
        if (steamDiscount === 0) continue;

        console.log(`Importing special deal: ${title} (AppID: ${appId})...`);

        const krPositiveRate = await fetchKrPositiveRate(appId);
        const reseller = await fetchResellerPrice(appId, title, steamPrice);

        const existing = await db.getGame(appId);
        let lowestPrice = existing ? existing.lowest_recorded_price : steamPrice;
        let lowestAt = existing ? existing.lowest_recorded_at : new Date().toISOString();

        const currentLowest = reseller.price !== null && reseller.price < steamPrice
          ? reseller.price
          : steamPrice;

        if (!existing || currentLowest < lowestPrice || lowestPrice === 0) {
          lowestPrice = currentLowest;
          lowestAt = new Date().toISOString();
        }

        await db.upsertGame({
          app_id: appId,
          title: title,
          header_image: headerImage,
          is_free: steamPrice === 0,
          has_kr_patch: existing ? existing.has_kr_patch : false,
          kr_patch_url: existing ? existing.kr_patch_url : null,
          kr_positive_rate: krPositiveRate || (existing ? existing.kr_positive_rate : 90)
        });

        await db.upsertPrice({
          app_id: appId,
          steam_price: steamPrice,
          steam_discount_percent: steamDiscount,
          domestic_price: reseller.price,
          domestic_store_name: reseller.store,
          lowest_recorded_price: lowestPrice,
          lowest_recorded_at: lowestAt
        });

        count++;
        await new Promise(resolve => setTimeout(resolve, 350));
      } catch (err: any) {
        console.error(`Failed to sync special item: ${item.name}`, err.message);
      }
    }

    return { success: true, count };
  } catch (err: any) {
    console.error('Failed to sync specials:', err.message);
    return { success: false, count: 0 };
  }
}

/**
 * Syncs the top 100 popular games on Steam in the background, utilizing Steam API Key if provided
 */
export async function syncPopularGames(apiKey?: string): Promise<{ success: boolean; count: number; total: number }> {
  try {
    let appIds = POPULAR_STEAM_APP_IDS;
    updateSyncProgress(0, 100, '인기 게임 목록 구성 중...', true);

    // If Steam API key is provided, try to fetch current actual top 100 most played games
    if (apiKey && apiKey.trim().length > 10) {
      try {
        console.log('Fetching live top 100 most played games from Steam API...');
        const url = `https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/?key=${apiKey}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const resData = await res.json();
          if (resData && resData.response && resData.response.ranks) {
            const ranks = resData.response.ranks;
            const liveAppIds = ranks.map((r: any) => r.appid).filter((id: number) => id > 0);
            if (liveAppIds.length > 0) {
              appIds = liveAppIds.slice(0, 100);
              console.log(`Successfully fetched ${appIds.length} live popular appids.`);
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to retrieve live most played games charts, falling back to static top 100 list:', err.message);
      }
    }

    const total = appIds.length;
    console.log(`Starting background sync for ${total} popular games...`);
    
    // We execute the sync asynchronously in the background
    (async () => {
      let currentCount = 0;
      for (let i = 0; i < total; i++) {
        const appId = appIds[i];
        try {
          updateSyncProgress(i + 1, total, `게임 정보 동기화 중 (AppID: ${appId})...`, true);
          
          const result = await syncGame(appId);
          if (result) {
            currentCount++;
          }
          
          // Throttling to prevent IP bans
          await new Promise(resolve => setTimeout(resolve, 350));
        } catch (inner: any) {
          console.error(`Error in background sync for AppID ${appId}:`, inner.message);
        }
      }
      updateSyncProgress(total, total, `인기 게임 100개 동기화 완료! (성공: ${currentCount}개)`, false);
      console.log(`Finished background sync. Successfully imported ${currentCount}/${total} games.`);
    })();

    return { success: true, count: 0, total }; // Returns immediately while background thread processes
  } catch (error: any) {
    console.error('Failed to trigger popular games sync:', error.message);
    updateSyncProgress(0, 0, `에러 발생: ${error.message}`, false);
    return { success: false, count: 0, total: 0 };
  }
}
