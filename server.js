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
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'calculations.json');
const CONFIG_FILE = process.env.CONFIG_FILE || path.join(__dirname, 'data', 'config.json');
const LEADS_FILE = process.env.LEADS_FILE || path.join(__dirname, 'data', 'leads.json');

const app = express();
app.use(express.json({ limit: '5mb' }));

function defaultConfig() {
  return {
    versionLabel: 'PlantMarket · версия 3.0 Premium',
    appTitle: 'PlantMarket',
    subtitle: 'Премиальный калькулятор прибыли для питомника: корни, срезка, доращивание и продажи через маркетплейсы.',
    heroBadge: 'Green Agro Premium',
    historyButton: 'Мои расчеты',
    resetButton: 'Сбросить',
    saveButton: 'Сохранить расчет',
    pdfButton: 'PDF отчет',
    leadButton: 'Получить консультацию',
    inputTitle: 'Входные данные',
    historyTitle: 'История расчетов',
    closeButton: 'Закрыть',
    botStartText: 'PlantMarket готов: откройте калькулятор, выберите сценарий, введите данные и получите расчет маржи, ROI и окупаемости.',
    botButtonText: 'Открыть PlantMarket',
    proTitle: 'PRO-доступ',
    proText: 'PDF-отчеты, история расчетов, заявки клиентов и расширенная аналитика для питомника.',
    colors: { accent: '#2f7d4f', accent2: '#9bcf53', bg: '#eef6ed', card: '#ffffff', text: '#132417' },
    scenarios: {
      marketplace: { tab: 'Маркетплейс', title: 'Продажа корней через маркетплейс', note: 'Расчет маржи с учетом брака, возвратов, комиссии, эквайринга, упаковки и обработки заказа.' },
      cut: { tab: 'Срезка', title: 'Выращивание на срезку', note: 'Модель на 10 лет: продуктивность по годам, средняя цена цветка, расходы, накопленный поток и окупаемость.' },
      grow: { tab: 'Доращивание', title: 'Доращивание корня', note: 'Модель на 5 лет: прирост глазков, деление, продажа деленок, расходы и накопленная прибыль.' }
    }
  };
}
function ensureFile(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function readJson(file, fallback) { ensureFile(file, fallback); try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function writeJson(file, data) { ensureFile(file, data); fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function readDb() { return readJson(DATA_FILE, { calculations: [] }); }
function writeDb(db) { writeJson(DATA_FILE, db); }
function readLeads() { return readJson(LEADS_FILE, { leads: [] }); }
function writeLeads(db) { writeJson(LEADS_FILE, db); }
function readConfig() {
  const d = defaultConfig();
  const saved = readJson(CONFIG_FILE, d);
  return { ...d, ...saved, colors: { ...d.colors, ...(saved.colors || {}) }, scenarios: { ...d.scenarios, ...(saved.scenarios || {}) } };
}
function writeConfig(config) {
  const d = defaultConfig();
  const merged = { ...d, ...config, colors: { ...d.colors, ...(config.colors || {}) }, scenarios: { ...d.scenarios, ...(config.scenarios || {}) } };
  writeJson(CONFIG_FILE, merged);
  return merged;
}
function checkAdmin(req) { return String(req.headers['x-admin-password'] || req.body?.password || '') === ADMIN_PASSWORD; }
function getUser(req) {
  const id = String(req.headers['x-telegram-user-id'] || req.body?.user?.id || 'demo');
  const name = decodeURIComponent(String(req.headers['x-telegram-user-name'] || req.body?.user?.name || 'Пользователь'));
  return { id, name };
}
function publicCalc(row) { return { id: row.id, scenario: row.scenario, scenarioTitle: row.scenarioTitle, name: row.name, createdAt: row.createdAt, kpis: row.kpis, inputs: row.inputs, summaryHtml: row.summaryHtml }; }

app.get('/api/config', (_, res) => res.json({ ok: true, config: readConfig() }));
app.post('/api/config', (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ ok: false, error: 'Неверный пароль администратора' });
  res.json({ ok: true, config: writeConfig(req.body?.config || {}) });
});
app.get('/api/admin/check', (req, res) => res.json({ ok: checkAdmin(req) }));
app.get('/api/admin/stats', (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ ok: false, error: 'Неверный пароль администратора' });
  const calculations = readDb().calculations;
  const leads = readLeads().leads;
  const users = new Set(calculations.map(x => x.userId));
  res.json({ ok: true, stats: { calculations: calculations.length, users: users.size, leads: leads.length }, calculations: calculations.slice(0, 100), leads: leads.slice(0, 100) });
});

app.post('/api/calculations', (req, res) => {
  const { scenario, scenarioTitle, name, inputs, kpis, summaryHtml } = req.body || {};
  if (!scenario || !scenarioTitle || !inputs || !Array.isArray(kpis)) return res.status(400).json({ ok: false, error: 'Некорректные данные расчета' });
  const user = getUser(req);
  const db = readDb();
  const row = { id: crypto.randomUUID(), userId: user.id, userName: user.name, scenario, scenarioTitle, name: name || `${scenarioTitle} — ${new Date().toLocaleDateString('ru-RU')}`, inputs, kpis, summaryHtml: String(summaryHtml || '').slice(0, 30000), createdAt: new Date().toISOString() };
  db.calculations.unshift(row);
  writeDb(db);
  res.json({ ok: true, calculation: publicCalc(row) });
});
app.get('/api/calculations', (req, res) => {
  const user = getUser(req);
  const items = readDb().calculations.filter(x => x.userId === user.id).slice(0, 50).map(publicCalc);
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
app.post('/api/leads', (req, res) => {
  const user = getUser(req);
  const { phone, comment } = req.body || {};
  const lead = { id: crypto.randomUUID(), userId: user.id, userName: user.name, phone: String(phone || '').slice(0, 80), comment: String(comment || '').slice(0, 1000), createdAt: new Date().toISOString() };
  const db = readLeads();
  db.leads.unshift(lead);
  writeLeads(db);
  res.json({ ok: true, lead });
});

app.use(express.static(path.join(__dirname, 'public'), { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.get('/health', (_, res) => res.json({ ok: true, app: 'PlantMarket 3.0' }));

app.listen(PORT, () => console.log(`PlantMarket Mini App is running on port ${PORT}`));

if (!BOT_TOKEN) {
  console.warn('BOT_TOKEN is not set. Web app is available, bot is disabled.');
} else {
  const bot = new Telegraf(BOT_TOKEN);
  const appUrl = WEBAPP_URL || `http://localhost:${PORT}`;
  const keyboard = () => Markup.inlineKeyboard([Markup.button.webApp(readConfig().botButtonText || 'Открыть PlantMarket', appUrl)]);
  bot.start(async (ctx) => ctx.reply(readConfig().botStartText || 'PlantMarket готов.', keyboard()));
  bot.command('calc', async (ctx) => ctx.reply('Калькулятор готов к запуску:', keyboard()));
  bot.launch();
  console.log('Telegram bot started');
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
