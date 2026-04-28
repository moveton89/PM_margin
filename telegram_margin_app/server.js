import 'dotenv/config';
import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
}));

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Mini App is running on port ${PORT}`);
});

if (!BOT_TOKEN) {
  console.warn('BOT_TOKEN is not set. Web app is available, bot is disabled.');
} else {
  const bot = new Telegraf(BOT_TOKEN);

  const appUrl = WEBAPP_URL || `http://localhost:${PORT}`;
  const keyboard = Markup.inlineKeyboard([
    Markup.button.webApp('Открыть калькулятор маржи', appUrl)
  ]);

  bot.start(async (ctx) => {
    await ctx.reply(
      'Откройте калькулятор, выберите сценарий, введите свои данные и получите расчет маржи/ROI.',
      keyboard
    );
  });

  bot.command('calc', async (ctx) => {
    await ctx.reply('Калькулятор готов к запуску:', keyboard);
  });

  bot.launch();
  console.log('Telegram bot started');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}