import 'dotenv/config';
import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'calculations.json');

const app = express();
app.use(express.json({ limit: '1mb' }));

function ensureDataFile() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ calculations: [] }, null, 2));
}
function readDb() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    console.error('Cannot read data file:', error);
    return { calculations: [] };
  }
}
function writeDb(db) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}
function getUser(req) {
  const id = String(req.headers['x-telegram-user-id'] || req.body?.user?.id || 'demo');
  const name = String(req.headers['x-telegram-user-name'] || req.body?.user?.name || 'Пользователь');
  return { id, name };
}
function publicCalc(row) {
  return {
    id: row.id,
    scenario: row.scenario,
    scenarioTitle: row.scenarioTitle,
    name: row.name,
    createdAt: row.createdAt,
    kpis: row.kpis,
    inputs: row.inputs,
    summaryHtml: row.summaryHtml
  };
}

app.post('/api/calculations', (req, res) => {
  const { scenario, scenarioTitle, name, inputs, kpis, summaryHtml } = req.body || {};
  if (!scenario || !scenarioTitle || !inputs || !Array.isArray(kpis)) {
    return res.status(400).json({ ok: false, error: 'Некорректные данные расчета' });
  }
  const user = getUser(req);
  const db = readDb();
  const row = {
    id: crypto.randomUUID(),
    userId: user.id,
    userName: user.name,
    scenario,
    scenarioTitle,
    name: name || `${scenarioTitle} — ${new Date().toLocaleDateString('ru-RU')}`,
    inputs,
    kpis,
    summaryHtml: String(summaryHtml || '').slice(0, 20000),
    createdAt: new Date().toISOString()
  };
  db.calculations.unshift(row);
  writeDb(db);
  res.json({ ok: true, calculation: publicCalc(row) });
});

app.get('/api/calculations', (req, res) => {
  const user = getUser(req);
  const db = readDb();
  const items = db.calculations.filter(x => x.userId === user.id).slice(0, 50).map(publicCalc);
  res.json({ ok: true, calculations: items });
});

app.delete('/api/calculations/:id', (req, res) => {
  const user = getUser(req);
  const db = readDb();
  const before = db.calculations.length;
  db.calculations = db.calculations.filter(x => !(x.id === req.params.id && x.userId === user.id));
  writeDb(db);
  res.json({ ok: true, deleted: before - db.calculations.length });
});

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
      'Откройте калькулятор, выберите сценарий, введите свои данные и получите расчет маржи/ROI. В версии 2.0 можно сохранять расчеты и открывать историю.',
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
