import { NextResponse } from 'next/server';
import { syncAllGames } from '@/lib/sync';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    // Simple key-based security if configured in environment variables
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && key !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Cron triggered: Syncing games...');
    const result = await syncAllGames();
    
    return NextResponse.json({
      success: result.success,
      message: `Successfully synchronized ${result.count} games.`,
      count: result.count,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error running cron sync:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Support POST request as well
export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('Authorization');
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await syncAllGames();
    return NextResponse.json({
      success: result.success,
      count: result.count,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
