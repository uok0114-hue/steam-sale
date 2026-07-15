import axios from 'axios';

export interface NotificationLog {
  id: string;
  gameTitle: string;
  channel: 'kakaotalk' | 'discord' | 'telegram';
  destination: string;
  message: string;
  timestamp: string;
  status: 'success' | 'failed';
  error?: string;
}

// Global notifications logs cache for in-memory Edge fallback
const globalForNotifications = globalThis as unknown as {
  __notifications_cache: NotificationLog[] | undefined;
};

if (!globalForNotifications.__notifications_cache) {
  globalForNotifications.__notifications_cache = [];
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

export function logNotification(log: Omit<NotificationLog, 'id' | 'timestamp'>) {
  const newLog: NotificationLog = {
    ...log,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString()
  };

  // Sync to in-memory cache
  const cachedLogs = globalForNotifications.__notifications_cache || [];
  cachedLogs.unshift(newLog);
  if (cachedLogs.length > 100) {
    globalForNotifications.__notifications_cache = cachedLogs.slice(0, 100);
  } else {
    globalForNotifications.__notifications_cache = cachedLogs;
  }

  const { fs, path } = getFsModule();
  if (!fs || !path) {
    return newLog; // File-system write skipped on Edge (Cloudflare Pages)
  }

  try {
    const dir = path.join(process.cwd(), 'data');
    const file = path.join(dir, 'notifications.json');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let logs: NotificationLog[] = [];
    if (fs.existsSync(file)) {
      try {
        logs = JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch (e) {
        logs = [];
      }
    }

    logs.unshift(newLog);
    if (logs.length > 100) {
      logs = logs.slice(0, 100);
    }

    fs.writeFileSync(file, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to log notification to file:', error);
  }

  return newLog;
}

export const notifier = {
  sendDiscord: async (
    webhookUrl: string,
    gameTitle: string,
    steamPrice: number,
    discount: number,
    resellerPrice: number | null,
    resellerStore: string | null,
    targetPrice: number | null,
    headerImage: string | null,
    appId: number
  ): Promise<boolean> => {
    try {
      const steamLink = `https://store.steampowered.com/app/${appId}`;
      const embed = {
        title: `🚨 [역대 최저가 경신!] ${gameTitle}`,
        description: `K-SteamTracker가 가격 변동을 감지했습니다!`,
        color: 15158332, // Red/Alert color
        thumbnail: headerImage ? { url: headerImage } : undefined,
        fields: [
          { name: '스팀 현재가', value: `${steamPrice.toLocaleString()}원 (${discount}% 할인)`, inline: true },
          {
            name: '국내 리셀러 최저가',
            value: resellerPrice && resellerStore ? `${resellerPrice.toLocaleString()}원 (${resellerStore})` : '리셀러 특가 없음',
            inline: true
          },
          { name: '알림 설정 가격', value: targetPrice ? `${targetPrice.toLocaleString()}원` : '역대 최저가 기준', inline: false }
        ],
        url: steamLink,
        footer: { text: 'K-SteamTracker • 1초 모바일 가격 알림' }
      };

      await axios.post(webhookUrl, { embeds: [embed] });
      logNotification({
        gameTitle,
        channel: 'discord',
        destination: webhookUrl,
        message: `${gameTitle} 알림 발송 완료: 스팀가 ${steamPrice.toLocaleString()}원`,
        status: 'success'
      });
      return true;
    } catch (err: any) {
      console.error('Discord notification failed:', err.message);
      logNotification({
        gameTitle,
        channel: 'discord',
        destination: webhookUrl,
        message: `${gameTitle} 알림 발송 실패`,
        status: 'failed',
        error: err.message
      });
      return false;
    }
  },

  sendTelegram: async (
    destination: string,
    gameTitle: string,
    steamPrice: number,
    discount: number,
    resellerPrice: number | null,
    resellerStore: string | null,
    targetPrice: number | null,
    appId: number
  ): Promise<boolean> => {
    try {
      const parts = destination.split(':');
      if (parts.length < 2) {
        throw new Error('올바른 텔레그램 형식(Token:ChatID)이 아닙니다.');
      }
      const botToken = parts.slice(0, -1).join(':');
      const chatId = parts[parts.length - 1];

      const steamLink = `https://store.steampowered.com/app/${appId}`;
      let text = `🚨 *[K-SteamTracker] 역대 최저가 경신!*\n\n`;
      text += `🎮 *${gameTitle}*\n`;
      text += `💵 *스팀 현재가:* ${steamPrice.toLocaleString()}원 (${discount}% 할인)\n`;
      if (resellerPrice && resellerStore) {
        text += `🏷️ *국내 리셀러가:* ${resellerPrice.toLocaleString()}원 (${resellerStore})\n`;
      }
      text += `🎯 *알림 설정가:* ${targetPrice ? `${targetPrice.toLocaleString()}원` : '역대 최저가 기준'}\n\n`;
      text += `🔗 [스팀 상점 바로가기](${steamLink})`;

      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await axios.post(url, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      });

      logNotification({
        gameTitle,
        channel: 'telegram',
        destination,
        message: `${gameTitle} 알림 발송 완료: 스팀가 ${steamPrice.toLocaleString()}원`,
        status: 'success'
      });
      return true;
    } catch (err: any) {
      console.error('Telegram notification failed:', err.message);
      logNotification({
        gameTitle,
        channel: 'telegram',
        destination,
        message: `${gameTitle} 알림 발송 실패`,
        status: 'failed',
        error: err.message
      });
      return false;
    }
  },

  sendKakaoTalk: async (
    phoneOrToken: string,
    gameTitle: string,
    steamPrice: number,
    discount: number,
    resellerPrice: number | null,
    resellerStore: string | null,
    targetPrice: number | null,
    appId: number
  ): Promise<boolean> => {
    const message = `[카카오톡 알림톡 발송 완료 (시뮬레이션)]\n` +
      `▶ 수신처: ${phoneOrToken}\n` +
      `▶ 알림내용: 🚨 [역대 최저가 경신] ${gameTitle}\n` +
      `- 스팀 현재가: ${steamPrice.toLocaleString()}원 (${discount}% 할인)\n` +
      (resellerPrice && resellerStore ? `- 국내 리셀러 최저가: ${resellerPrice.toLocaleString()}원 (${resellerStore})\n` : '') +
      `- 바로가기: https://store.steampowered.com/app/${appId}`;

    console.log(message);

    logNotification({
      gameTitle,
      channel: 'kakaotalk',
      destination: phoneOrToken,
      message,
      status: 'success'
    });
    return true;
  },

  getLogs: (): NotificationLog[] => {
    const { fs, path } = getFsModule();
    if (!fs || !path) {
      return globalForNotifications.__notifications_cache || [];
    }

    const dir = path.join(process.cwd(), 'data');
    const file = path.join(dir, 'notifications.json');
    if (fs.existsSync(file)) {
      try {
        const fileLogs = JSON.parse(fs.readFileSync(file, 'utf-8'));
        // Sync cache in memory with file logs
        globalForNotifications.__notifications_cache = fileLogs;
        return fileLogs;
      } catch (e) {
        return globalForNotifications.__notifications_cache || [];
      }
    }
    return globalForNotifications.__notifications_cache || [];
  },

  clearLogs: () => {
    globalForNotifications.__notifications_cache = [];

    const { fs, path } = getFsModule();
    if (!fs || !path) {
      return;
    }

    try {
      const dir = path.join(process.cwd(), 'data');
      const file = path.join(dir, 'notifications.json');
      if (fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (e) {
      console.error('Failed to clear log file:', e);
    }
  }
};
export type { NotificationLog as NotifierLog };
