import TelegramBot from 'node-telegram-bot-api';

export async function sendTelegramMessage(token: string, chatId: string, message: string): Promise<void> {
  if (!token || !chatId) {
    console.log('Telegram not configured, skipping message:', message);
    return;
  }

  try {
    const bot = new TelegramBot(token);
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Telegram send error:', error);
  }
}
