import { createClient } from '@supabase/supabase-js';
import { jsonDb, Game, GamePrice, UserWishlist } from './jsonDb';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const useSupabase = !!(supabaseUrl && (supabaseServiceRole || supabaseAnonKey));

export const supabase = useSupabase
  ? createClient(supabaseUrl, supabaseServiceRole || supabaseAnonKey)
  : null;

if (useSupabase) {
  console.log('K-SteamTracker: Using Supabase Database');
} else {
  console.log('K-SteamTracker: Using Local JSON Database fallback');
}

export type JoinedGamePrice = Game & GamePrice;

export const db = {
  getGames: async (): Promise<JoinedGamePrice[]> => {
    if (!supabase) {
      return jsonDb.getGames();
    }

    const { data, error } = await supabase
      .from('games')
      .select('*, game_prices(*)');

    if (error) {
      console.error('Error fetching games from Supabase:', error);
      return [];
    }

    return (data || []).map((game: any) => {
      const price = game.game_prices?.[0] || {
        steam_price: 0,
        steam_discount_percent: 0,
        domestic_price: null,
        domestic_store_name: null,
        lowest_recorded_price: 0,
        lowest_recorded_at: null,
        updated_at: new Date().toISOString()
      };
      // remove game_prices array and merge
      const { game_prices, ...gameInfo } = game;
      return {
        ...gameInfo,
        ...price
      };
    });
  },

  getGame: async (appId: number): Promise<JoinedGamePrice | null> => {
    if (!supabase) {
      return jsonDb.getGame(appId);
    }

    const { data, error } = await supabase
      .from('games')
      .select('*, game_prices(*)')
      .eq('app_id', appId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error(`Error fetching game ${appId} from Supabase:`, error);
      return null;
    }

    const price = data.game_prices?.[0] || {
      steam_price: 0,
      steam_discount_percent: 0,
      domestic_price: null,
      domestic_store_name: null,
      lowest_recorded_price: 0,
      lowest_recorded_at: null,
      updated_at: new Date().toISOString()
    };
    const { game_prices, ...gameInfo } = data;
    return {
      ...gameInfo,
      ...price
    };
  },

  upsertGame: async (gameData: Omit<Game, 'last_updated_at'>): Promise<Game | null> => {
    if (!supabase) {
      return jsonDb.upsertGame(gameData);
    }

    const { data, error } = await supabase
      .from('games')
      .upsert({
        app_id: gameData.app_id,
        title: gameData.title,
        header_image: gameData.header_image,
        is_free: gameData.is_free,
        has_kr_patch: gameData.has_kr_patch,
        kr_patch_url: gameData.kr_patch_url,
        kr_positive_rate: gameData.kr_positive_rate,
        last_updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting game to Supabase:', error);
      return null;
    }

    return data;
  },

  upsertPrice: async (priceData: Omit<GamePrice, 'updated_at'>): Promise<GamePrice | null> => {
    if (!supabase) {
      return jsonDb.upsertPrice(priceData);
    }

    const { data, error } = await supabase
      .from('game_prices')
      .upsert({
        app_id: priceData.app_id,
        steam_price: priceData.steam_price,
        steam_discount_percent: priceData.steam_discount_percent,
        domestic_price: priceData.domestic_price,
        domestic_store_name: priceData.domestic_store_name,
        lowest_recorded_price: priceData.lowest_recorded_price,
        lowest_recorded_at: priceData.lowest_recorded_at,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting price to Supabase:', error);
      return null;
    }

    return data;
  },

  getWishlists: async (userId: string): Promise<(UserWishlist & { game?: JoinedGamePrice })[]> => {
    if (!supabase) {
      return jsonDb.getWishlists(userId);
    }

    const { data, error } = await supabase
      .from('user_wishlists')
      .select('*, games(*, game_prices(*))')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching wishlists from Supabase:', error);
      return [];
    }

    return (data || []).map((w: any) => {
      let joinedGame: JoinedGamePrice | undefined;
      if (w.games) {
        const game = w.games;
        const price = game.game_prices?.[0] || {
          steam_price: 0,
          steam_discount_percent: 0,
          domestic_price: null,
          domestic_store_name: null,
          lowest_recorded_price: 0,
          lowest_recorded_at: null,
          updated_at: new Date().toISOString()
        };
        const { game_prices, ...gameInfo } = game;
        joinedGame = { ...gameInfo, ...price };
      }
      const { games, ...wishlistInfo } = w;
      return {
        ...wishlistInfo,
        game: joinedGame
      };
    });
  },

  getAllWishlists: async (): Promise<UserWishlist[]> => {
    if (!supabase) {
      return jsonDb.getAllWishlists();
    }

    const { data, error } = await supabase
      .from('user_wishlists')
      .select('*');

    if (error) {
      console.error('Error fetching all wishlists from Supabase:', error);
      return [];
    }

    return data || [];
  },

  addToWishlist: async (wishlistData: Omit<UserWishlist, 'id' | 'created_at'>): Promise<UserWishlist | null> => {
    if (!supabase) {
      return jsonDb.addToWishlist(wishlistData);
    }

    // Check if already wishlisted
    const { data: existing, error: checkError } = await supabase
      .from('user_wishlists')
      .select('*')
      .eq('user_id', wishlistData.user_id)
      .eq('app_id', wishlistData.app_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking wishlist existence in Supabase:', checkError);
      return null;
    }

    if (existing) {
      const { data, error } = await supabase
        .from('user_wishlists')
        .update({
          alert_target_price: wishlistData.alert_target_price,
          notification_channel: wishlistData.notification_channel,
          channel_destination: wishlistData.channel_destination
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating wishlist in Supabase:', error);
        return null;
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from('user_wishlists')
        .insert({
          user_id: wishlistData.user_id,
          app_id: wishlistData.app_id,
          alert_target_price: wishlistData.alert_target_price,
          notification_channel: wishlistData.notification_channel,
          channel_destination: wishlistData.channel_destination,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting wishlist to Supabase:', error);
        return null;
      }
      return data;
    }
  },

  removeFromWishlist: async (userId: string, id: number): Promise<boolean> => {
    if (!supabase) {
      return jsonDb.removeFromWishlist(userId, id);
    }

    const { error } = await supabase
      .from('user_wishlists')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting wishlist from Supabase:', error);
      return false;
    }

    return true;
  }
};
