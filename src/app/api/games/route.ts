import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const games = await db.getGames();
    return NextResponse.json({ success: true, data: games });
  } catch (error: any) {
    console.error('Error fetching games API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
