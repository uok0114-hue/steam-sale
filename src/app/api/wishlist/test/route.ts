import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifier } from '@/lib/notifier';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, userId } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
    }

    // Fetch wishlist items for this user
    const wishlists = await db.getWishlists(userId || 'guest_user');
    const item = wishlists.find(w => w.id === id);

    if (!item) {
      return NextResponse.json({ success: false, error: 'Wishlist item not found' }, { status: 404 });
    }

    if (!item.game) {
      return NextResponse.json({ success: false, error: 'Associated game details not found' }, { status: 404 });
    }

    const game = item.game;
    let notifySuccess = false;

    console.log(`Sending TEST notification for ${game.title} (Channel: ${item.notification_channel})...`);

    if (item.notification_channel === 'discord') {
      notifySuccess = await notifier.sendDiscord(
        item.channel_destination,
        `[테스트 알림] ${game.title}`,
        game.steam_price,
        game.steam_discount_percent,
        game.domestic_price,
        game.domestic_store_name,
        item.alert_target_price,
        game.header_image,
        game.app_id
      );
    } else if (item.notification_channel === 'telegram') {
      notifySuccess = await notifier.sendTelegram(
        item.channel_destination,
        `[테스트 알림] ${game.title}`,
        game.steam_price,
        game.steam_discount_percent,
        game.domestic_price,
        game.domestic_store_name,
        item.alert_target_price,
        game.app_id
      );
    } else if (item.notification_channel === 'kakaotalk') {
      notifySuccess = await notifier.sendKakaoTalk(
        item.channel_destination,
        `[테스트 알림] ${game.title}`,
        game.steam_price,
        game.steam_discount_percent,
        game.domestic_price,
        game.domestic_store_name,
        item.alert_target_price,
        game.app_id
      );
    }

    if (notifySuccess) {
      return NextResponse.json({ success: true, message: 'Test notification sent successfully!' });
    } else {
      return NextResponse.json({ success: false, error: 'Notification delivery failed. Check your destination format/URL.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error sending test notification API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
