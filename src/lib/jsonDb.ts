import fs from 'fs';
import path from 'path';

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

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure database file exists
function initDb(): DbSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const defaultData: DbSchema = {
      games: [],
      game_prices: [],
      user_wishlists: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }

  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading local JSON database, resetting...', error);
    const defaultData: DbSchema = {
      games: [],
      game_prices: [],
      user_wishlists: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
}

function saveDb(data: DbSchema) {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
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
    
    // Check if already wishlisted for this channel
    const existing = db.user_wishlists.find(
      w => w.user_id === wishlistData.user_id && w.app_id === wishlistData.app_id
    );
    if (existing) {
      // update it
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
