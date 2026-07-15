import { NextResponse } from 'next/server';
import { jsonDb as localJsonDb } from '@/lib/jsonDb';
import { notifier } from '@/lib/notifier';

export const runtime = 'edge';

export async function POST() {
  try {
    const defaultData = {
      games: [
        {
          app_id: 1868140,
          title: "데이브 더 다이버 (Dave the Diver)",
          header_image: "https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/1868140/header.jpg",
          is_free: false,
          has_kr_patch: false,
          kr_patch_url: null,
          kr_positive_rate: 97,
          last_updated_at: new Date().toISOString()
        },
        {
          app_id: 1091500,
          title: "사이버펑크 2077 (Cyberpunk 2077)",
          header_image: "https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/1091500/header.jpg",
          is_free: false,
          has_kr_patch: false,
          kr_patch_url: null,
          kr_positive_rate: 93,
          last_updated_at: new Date().toISOString()
        },
        {
          app_id: 1245620,
          title: "엘든 링 (Elden Ring)",
          header_image: "https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/1245620/header.jpg",
          is_free: false,
          has_kr_patch: false,
          kr_patch_url: null,
          kr_positive_rate: 92,
          last_updated_at: new Date().toISOString()
        },
        {
          app_id: 1145350,
          title: "하데스 II (Hades II)",
          header_image: "https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/1145350/header.jpg",
          is_free: false,
          has_kr_patch: false,
          kr_patch_url: null,
          kr_positive_rate: 95,
          last_updated_at: new Date().toISOString()
        },
        {
          app_id: 1966720,
          title: "리썰 컴퍼니 (Lethal Company)",
          header_image: "https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/1966720/header.jpg",
          is_free: false,
          has_kr_patch: true,
          kr_patch_url: "https://github.com/B715/LethalCompany-KoreanPatch",
          kr_positive_rate: 98,
          last_updated_at: new Date().toISOString()
        }
      ],
      game_prices: [
        {
          app_id: 1868140,
          steam_price: 24000,
          steam_discount_percent: 0,
          domestic_price: 19200,
          domestic_store_name: "다이렉트게임즈",
          lowest_recorded_price: 14400,
          lowest_recorded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          app_id: 1091500,
          steam_price: 66000,
          steam_discount_percent: 50,
          domestic_price: 31500,
          domestic_store_name: "포기븐",
          lowest_recorded_price: 33000,
          lowest_recorded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          app_id: 1245620,
          steam_price: 64800,
          steam_discount_percent: 0,
          domestic_price: 58300,
          domestic_store_name: "다이렉트게임즈",
          lowest_recorded_price: 45360,
          lowest_recorded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          app_id: 1145350,
          steam_price: 34000,
          steam_discount_percent: 10,
          domestic_price: 34000,
          domestic_store_name: null,
          lowest_recorded_price: 30600,
          lowest_recorded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          app_id: 1966720,
          steam_price: 11000,
          steam_discount_percent: 30,
          domestic_price: 7500,
          domestic_store_name: "다이렉트게임즈",
          lowest_recorded_price: 7700,
          lowest_recorded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      user_wishlists: []
    };

    // Seed local JSON database file
    localJsonDb.seedInitialData(defaultData);
    
    // Clear notification logs
    notifier.clearLogs();

    return NextResponse.json({ success: true, message: 'Database reset and seeded successfully!' });
  } catch (error: any) {
    console.error('Error resetting database API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
