import { NextResponse } from 'next/server';
import { syncPopularGames, getSyncProgress } from '@/lib/sync';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// GET: Returns current progress of the background sync
export async function GET() {
  try {
    const progress = getSyncProgress();
    return NextResponse.json({ success: true, progress });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Triggers the background popular games sync
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { apiKey } = body;

    console.log('Triggering manual popular games sync via Admin control...');
    const result = await syncPopularGames(apiKey);

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? '인기 게임 동기화가 백그라운드에서 성공적으로 시작되었습니다.' 
        : '동기화 작업 트리거에 실패했습니다.',
      total: result.total
    });
  } catch (error: any) {
    console.error('Failed to handle POST popular sync:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
