import TelegramBot from 'node-telegram-bot-api';

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  message: string
): Promise<void> {
  if (!token || !chatId) {
    console.log('Telegram not configured');
    return;
  }

  try {
    const bot = new TelegramBot(token, {
      polling: false,
    });

    const res = await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
    });

    console.log('Telegram sent:', res.message_id);
  } catch (error) {
    console.error('Telegram send error:', error);
  }
}