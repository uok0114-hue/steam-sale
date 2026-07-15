import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'guest_user';
    
    const wishlists = await db.getWishlists(userId);
    return NextResponse.json({ success: true, data: wishlists });
  } catch (error: any) {
    console.error('Error fetching wishlists API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, appId, alertTargetPrice, notificationChannel, channelDestination } = body;

    if (!userId || !appId || !notificationChannel || !channelDestination) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const result = await db.addToWishlist({
      user_id: userId,
      app_id: appId,
      alert_target_price: alertTargetPrice ? parseInt(alertTargetPrice, 10) : null,
      notification_channel: notificationChannel,
      channel_destination: channelDestination
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error adding to wishlist API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idText = searchParams.get('id');
    const userId = searchParams.get('userId') || 'guest_user';

    if (!idText) {
      return NextResponse.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
    }

    const id = parseInt(idText, 10);
    const success = await db.removeFromWishlist(userId, id);

    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('Error deleting from wishlist API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
