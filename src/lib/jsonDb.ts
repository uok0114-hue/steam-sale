export interface Game {
  app_id: number;
  title: string;
  header_image: string;
  is_free: boolean;
  has_kr_patch: boolean;
  kr_patch_url: string | null;
  kr_positive_rate: number;
  last_updated_at: string;
}

export interface GamePrice {
  app_id: number;
  steam_price: number;
  steam_discount_percent: number;
  domestic_price: number | null;
  domestic_store_name: string | null;
  lowest_recorded_price: number;
  lowest_recorded_at: string | null;
  updated_at: string;
}

export interface UserWishlist {
  id: number;
  user_id: string;
  app_id: number;
  alert_target_price: number | null;
  notification_channel: string;
  channel_destination: string;
  created_at: string;
}

export interface DbSchema {
  games: Game[];
  game_prices: GamePrice[];
  user_wishlists: UserWishlist[];
}

// 5 default seed games
const DEFAULT_INITIAL_DATA: DbSchema = {
  games: [
    {
      app_id: 1868140,
      title: "데이브 더 다이버 (Dave the Diver)",
      header_image: "https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/1868140/header.jpg",
      is_free: false,
      has_kr_patch: false,
      kr_patch_url: null,
      kr_positive_rate: 97,
      last_updated_at: "2026-07-15T00:00:00Z"
    },
    {
      app_id: 1091500,
      title: "사이버펑크 2077 (Cyberpunk 2077)",
      header_image: "https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/1091500/header.jpg",
      is_free: false,
      has_kr_patch: false,
      kr_patch_url: null,
      kr_positive_rate: 93,
      last_updated_at: "2026-07-15T00:00:00Z"
    },
    {
      app_id: 1245620,
      title: "엘든 링 (Elden Ring)",
      header_image: "https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/1245620/header.jpg",
      is_free: false,
      has_kr_patch: false,
      kr_patch_url: null,
      kr_positive_rate: 92,
      last_updated_at: "2026-07-15T00:00:00Z"
    },
    {
      app_id: 1145350,
      title: "하데스 II (Hades II)",
      header_image: "https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/1145350/header.jpg",
      is_free: false,
      has_kr_patch: false,
      kr_patch_url: null,
      kr_positive_rate: 95,
      last_updated_at: "2026-07-15T00:00:00Z"
    },
    {
      app_id: 1966720,
      title: "리썰 컴퍼니 (Lethal Company)",
      header_image: "https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/1966720/header.jpg",
      is_free: false,
      has_kr_patch: true,
      kr_patch_url: "https://github.com/B715/LethalCompany-KoreanPatch",
      kr_positive_rate: 98,
      last_updated_at: "2026-07-15T00:00:00Z"
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
      lowest_recorded_at: "2025-12-22T00:00:00Z",
      updated_at: "2026-07-15T00:00:00Z"
    },
    {
      app_id: 1091500,
      steam_price: 66000,
      steam_discount_percent: 50,
      domestic_price: 31500,
      domestic_store_name: "포기븐",
      lowest_recorded_price: 33000,
      lowest_recorded_at: "2025-11-28T00:00:00Z",
      updated_at: "2026-07-15T00:00:00Z"
    },
    {
      app_id: 1245620,
      steam_price: 64800,
      steam_discount_percent: 0,
      domestic_price: 58300,
      domestic_store_name: "다이렉트게임즈",
      lowest_recorded_price: 45360,
      lowest_recorded_at: "2026-01-05T00:00:00Z",
      updated_at: "2026-07-15T00:00:00Z"
    },
    {
      app_id: 1145350,
      steam_price: 34000,
      steam_discount_percent: 10,
      domestic_price: 34000,
      domestic_store_name: null,
      lowest_recorded_price: 30600,
      lowest_recorded_at: "2026-06-25T00:00:00Z",
      updated_at: "2026-07-15T00:00:00Z"
    },
    {
      app_id: 1966720,
      steam_price: 11000,
      steam_discount_percent: 30,
      domestic_price: 7500,
      domestic_store_name: "다이렉트게임즈",
      lowest_recorded_price: 7700,
      lowest_recorded_at: "2025-12-25T00:00:00Z",
      updated_at: "2026-07-15T00:00:00Z"
    }
  ],
  user_wishlists: []
};

// Global cache setup to prevent losing data during fast HMR/in-memory runs
const globalForDb = globalThis as unknown as {
  __json_db_cache: DbSchema | undefined;
};

if (!globalForDb.__json_db_cache) {
  globalForDb.__json_db_cache = DEFAULT_INITIAL_DATA;
}

// Dynamically load fs/path in Node environment only
function getFsModule() {
  if (typeof window !== 'undefined' || process.env.NEXT_RUNTIME === 'edge') {
    return { fs: null, path: null };
  }
  try {
    const fs = require('fs');
    const path = require('path');
    return { fs, path };
  } catch (e) {
    return { fs: null, path: null };
  }
}

// Ensure database file exists (Only runs in standard Node environment)
function initDb(): DbSchema {
  const { fs, path } = getFsModule();
  
  // If fs/path is not supported (Edge / Cloudflare Pages), use global memory cache
  if (!fs || !path) {
    return globalForDb.__json_db_cache!;
  }

  const DB_DIR = path.join(process.cwd(), 'data');
  const DB_FILE = path.join(DB_DIR, 'db.json');

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(globalForDb.__json_db_cache, null, 2), 'utf-8');
    return globalForDb.__json_db_cache!;
  }

  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    globalForDb.__json_db_cache = parsed;
    return parsed;
  } catch (error) {
    console.error('Error reading local JSON database, using cache...', error);
    return globalForDb.__json_db_cache!;
  }
}

function saveDb(data: DbSchema) {
  globalForDb.__json_db_cache = data;

  const { fs, path } = getFsModule();
  if (!fs || !path) {
    return; // No file system access on Cloudflare Pages
  }

  try {
    const DB_DIR = path.join(process.cwd(), 'data');
    const DB_FILE = path.join(DB_DIR, 'db.json');
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write local database file:', error);
  }
}

export const jsonDb = {
  getGames: (): (Game & GamePrice)[] => {
    const db = initDb();
    return db.games.map(game => {
      const price = db.game_prices.find(p => p.app_id === game.app_id) || {
        app_id: game.app_id,
        steam_price: 0,
        steam_discount_percent: 0,
        domestic_price: null,
        domestic_store_name: null,
        lowest_recorded_price: 0,
        lowest_recorded_at: null,
        updated_at: new Date().toISOString()
      };
      return { ...game, ...price };
    });
  },

  getGame: (appId: number): (Game & GamePrice) | null => {
    const db = initDb();
    const game = db.games.find(g => g.app_id === appId);
    if (!game) return null;
    const price = db.game_prices.find(p => p.app_id === appId) || {
      app_id: appId,
      steam_price: 0,
      steam_discount_percent: 0,
      domestic_price: null,
      domestic_store_name: null,
      lowest_recorded_price: 0,
      lowest_recorded_at: null,
      updated_at: new Date().toISOString()
    };
    return { ...game, ...price };
  },

  upsertGame: (gameData: Omit<Game, 'last_updated_at'>) => {
    const db = initDb();
    const existingIndex = db.games.findIndex(g => g.app_id === gameData.app_id);
    const game: Game = {
      ...gameData,
      last_updated_at: new Date().toISOString()
    };

    if (existingIndex > -1) {
      db.games[existingIndex] = game;
    } else {
      db.games.push(game);
    }
    saveDb(db);
    return game;
  },

  upsertPrice: (priceData: Omit<GamePrice, 'updated_at'>) => {
    const db = initDb();
    const existingIndex = db.game_prices.findIndex(p => p.app_id === priceData.app_id);
    const price: GamePrice = {
      ...priceData,
      updated_at: new Date().toISOString()
    };

    if (existingIndex > -1) {
      db.game_prices[existingIndex] = price;
    } else {
      db.game_prices.push(price);
    }
    saveDb(db);
    return price;
  },

  getWishlists: (userId: string): (UserWishlist & { game?: Game & GamePrice })[] => {
    const db = initDb();
    const wishlists = db.user_wishlists.filter(w => w.user_id === userId);
    return wishlists.map(w => {
      const game = jsonDb.getGame(w.app_id);
      return {
        ...w,
        game: game || undefined
      };
    });
  },

  getAllWishlists: (): UserWishlist[] => {
    const db = initDb();
    return db.user_wishlists;
  },

  addToWishlist: (wishlistData: Omit<UserWishlist, 'id' | 'created_at'>): UserWishlist => {
    const db = initDb();
    
    const existing = db.user_wishlists.find(
      w => w.user_id === wishlistData.user_id && w.app_id === wishlistData.app_id
    );
    if (existing) {
      existing.alert_target_price = wishlistData.alert_target_price;
      existing.notification_channel = wishlistData.notification_channel;
      existing.channel_destination = wishlistData.channel_destination;
      saveDb(db);
      return existing;
    }

    const newId = db.user_wishlists.length > 0 
      ? Math.max(...db.user_wishlists.map(w => w.id)) + 1 
      : 1;

    const entry: UserWishlist = {
      ...wishlistData,
      id: newId,
      created_at: new Date().toISOString()
    };

    db.user_wishlists.push(entry);
    saveDb(db);
    return entry;
  },

  removeFromWishlist: (userId: string, id: number): boolean => {
    const db = initDb();
    const index = db.user_wishlists.findIndex(w => w.id === id && w.user_id === userId);
    if (index > -1) {
      db.user_wishlists.splice(index, 1);
      saveDb(db);
      return true;
    }
    return false;
  },

  seedInitialData: (data: DbSchema) => {
    saveDb(data);
  }
};
