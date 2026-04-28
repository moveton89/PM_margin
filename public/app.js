const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const rub = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 2 });

const scenarios = {
  marketplace: {
    tab: 'Маркетплейс',
    title: 'Продажа корней через маркетплейс',
    note: 'Формулы повторяют Excel. Поля логистики есть в исходнике, но в итоговой формуле Excel не участвуют.',
    fields: [
      ['purchasePrice', 'Закупочная цена 1 корня, руб', 350],
      ['quantity', 'Количество корней в партии, шт', 1000],
      ['salePrice', 'Цена продажи 1 корня, руб', 1225],
      ['defectPct', 'Брак / потери, %', 5],
      ['returnPct', 'Возвраты от клиентов, %', 3],
      ['packCost', 'Упаковка 1 корня, руб', 15],
      ['deliveryCost', 'Доставка до клиента, руб', 180, 'В Excel есть как входной параметр, но не включена в расчет расходов.'],
      ['reverseLogistics', 'Обратная логистика за возврат, руб', 120, 'В Excel есть как входной параметр, но не включена в расчет расходов.'],
      ['marketplaceFeePct', 'Комиссия маркетплейса, %', 29],
      ['acquiringPct', 'Эквайринг, %', 2.5],
      ['processingCost', 'Обработка заказа на 1 корень, руб', 10]
    ],
    calculate: calcMarketplace
  },
  cut: {
    tab: 'Срезка',
    title: 'Выращивание на срезку',
    note: 'Расчет на 10 лет: продуктивность по годам, средняя цена цветка, расходы, накопленный поток и окупаемость.',
    fields: [
      ['quantity', 'Количество корней, шт', 1000],
      ['rootCost', 'Стоимость 1 корня, руб', 350],
      ['plantingCost', 'Расходы на посадку, руб', 50000],
      ['budsPerRoot', 'Количество глазков на корень, шт', 3],
      ['maxFlowerCoef', 'Макс. коэф. цветения, цветов/глазок', 7.5],
      ['earlySharePct', 'Доля срезки начало сезона, %', 80],
      ['earlyPrice', 'Цена в начале сезона, руб', 100],
      ['lateSharePct', 'Доля срезки конец сезона, %', 20],
      ['latePrice', 'Цена в конце сезона, руб', 30],
      ['baseAnnualCost', 'Базовые ежегодные расходы, руб', 50000],
      ['inflationPct', 'Инфляция расходов в год, %', 3],
      ['variableCostPerFlower', 'Переменные расходы на 1 цветок, руб', 10],
      ['p1', 'Продуктивность: 1 год, %', 0],
      ['p2', 'Продуктивность: 2 год, %', 5],
      ['p3', 'Продуктивность: 3 год, %', 25],
      ['p4', 'Продуктивность: 4 год, %', 75],
      ['p5', 'Продуктивность: 5 год, %', 100],
      ['p6', 'Продуктивность: 6 год, %', 100],
      ['p7', 'Продуктивность: 7 год, %', 100],
      ['p8', 'Продуктивность: 8 год, %', 100],
      ['p9', 'Продуктивность: 9 год, %', 100],
      ['p10', 'Продуктивность: 10 год, %', 80]
    ],
    calculate: calcCut
  },
  grow: {
    tab: 'Доращивание',
    title: 'Доращивание корня в грунте или контейнере',
    note: 'Расчет на 5 лет: прирост глазков, деление, продажа деленок, расходы и накопленная прибыль.',
    fields: [
      ['quantity', 'Количество корней, шт', 1000],
      ['rootCost', 'Стоимость 1 корня, руб', 350],
      ['initialBuds', 'Нач. глазков на 1 корне, шт', 3],
      ['growthCoef', 'Коэфф. прироста глазков', 1.6],
      ['minBudsToSplit', 'Мин. глазков для деления, шт', 6],
      ['newDivisionBuds', 'Кол. глазков в новой деленке, шт', 3],
      ['salePrice', 'Цена за корень, руб', 350],
      ['saleSharePct', '% продажи деленок, %', 80],
      ['c1', 'Расход на 1 корень: 1 год, руб', 10],
      ['c2', 'Расход на 1 корень: 2 год, руб', 12],
      ['c3', 'Расход на 1 корень: 3 год, руб', 15],
      ['c4', 'Расход на 1 корень: 4 год, руб', 18],
      ['c5', 'Расход на 1 корень: 5 год, руб', 20]
    ],
    calculate: calcGrow
  }
};

let state = JSON.parse(localStorage.getItem('marginCalcState') || '{}');
let active = state.active || 'marketplace';

const tabs = document.getElementById('tabs');
const form = document.getElementById('inputForm');
const title = document.getElementById('scenarioTitle');
const note = document.getElementById('scenarioNote');
const kpis = document.getElementById('kpis');
const details = document.getElementById('details');

function val(key, fallback = 0) {
  const raw = state[active]?.[key];
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
function p(key, fallback = 0) {
  return val(key, fallback) / 100;
}
function save() {
  state.active = active;
  localStorage.setItem('marginCalcState', JSON.stringify(state));
}
function renderTabs() {
  tabs.innerHTML = '';
  Object.entries(scenarios).forEach(([key, sc]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tab ${key === active ? 'active' : ''}`;
    b.textContent = sc.tab;
    b.onclick = () => {
      active = key;
      save();
      render();
    };
    tabs.appendChild(b);
  });
}
function renderForm() {
  const sc = scenarios[active];
  form.innerHTML = `<div class="group-title">Входные данные</div>`;
  state[active] ||= {};
  sc.fields.forEach(([key, label, def, hint]) => {
    if (state[active][key] === undefined) state[active][key] = def;
    const tpl = document.getElementById('fieldTemplate').content.cloneNode(true);
    const el = tpl.querySelector('.field');
    const input = tpl.querySelector('input');
    tpl.querySelector('.label').textContent = label;
    tpl.querySelector('small').textContent = hint || '';
    input.value = state[active][key];
    input.addEventListener('input', () => {
      state[active][key] = input.value;
      save();
      renderResults();
    });
    form.appendChild(el);
  });
}
function kpi(label, value, format = 'rub', cls = '') {
  const div = document.createElement('div');
  div.className = `kpi ${cls}`;
  let text = value;
  if (format === 'rub') text = `${rub.format(value)} ₽`;
  if (format === 'num') text = num.format(value);
  if (format === 'pct') text = pct.format(value);
  div.innerHTML = `<span>${label}</span><strong>${text}</strong>`;
  return div;
}
function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderResults() {
  const sc = scenarios[active];
  const result = sc.calculate();
  title.textContent = sc.title;
  note.textContent = sc.note;
  kpis.innerHTML = '';
  result.kpis.forEach(x => kpis.appendChild(kpi(...x)));
  details.innerHTML = result.html;
}
function render() {
  renderTabs();
  renderForm();
  renderResults();
}
document.getElementById('resetBtn').onclick = () => {
  state[active] = {};
  save();
  render();
};

function calcMarketplace() {
  const quantity = val('quantity', 1000);
  const purchasePrice = val('purchasePrice', 350);
  const salePrice = val('salePrice', 1225);
  const defectPct = p('defectPct', 5);
  const returnPct = p('returnPct', 3);
  const packCost = val('packCost', 15);
  const marketplaceFeePct = p('marketplaceFeePct', 29);
  const acquiringPct = p('acquiringPct', 2.5);
  const processingCost = val('processingCost', 10);

  const defective = quantity * defectPct;
  const sellable = quantity - defective;
  const returns = sellable * returnPct;
  const soldNet = sellable - returns;
  const grossRevenue = sellable * salePrice;
  const marketplaceFee = grossRevenue * marketplaceFeePct;
  const acquiring = grossRevenue * acquiringPct;
  const revenueAfterFees = grossRevenue - marketplaceFee - acquiring;
  const refunds = returns * salePrice;
  const netRevenue = revenueAfterFees - refunds;
  const purchase = purchasePrice * quantity;
  const packaging = sellable * packCost;
  const processing = sellable * processingCost;
  const allExpenses = purchase + packaging + processing + marketplaceFee + acquiring;
  const profit = netRevenue - (purchase + packaging + processing);
  const margin = safeDiv(profit, netRevenue);
  const roi = safeDiv(profit, allExpenses);

  return {
    kpis: [
      ['Чистая прибыль', profit, 'rub', profit >= 0 ? 'positive' : 'negative'],
      ['Маржа от выручки', margin, 'pct', margin >= 0 ? 'positive' : 'negative'],
      ['ROI', roi, 'pct', roi >= 0 ? 'positive' : 'negative']
    ],
    html: table(['Показатель', 'Значение'], [
      ['Количество корней', num.format(quantity)],
      ['Годные к продаже', num.format(sellable)],
      ['Возвраты', num.format(returns)],
      ['Продано нетто', num.format(soldNet)],
      ['Выручка брутто', `${rub.format(grossRevenue)} ₽`],
      ['Комиссия маркетплейса', `${rub.format(marketplaceFee)} ₽`],
      ['Эквайринг', `${rub.format(acquiring)} ₽`],
      ['Чистая выручка', `${rub.format(netRevenue)} ₽`],
      ['Все расходы по формуле Excel', `${rub.format(allExpenses)} ₽`]
    ])
  };
}

function calcCut() {
  const quantity = val('quantity', 1000);
  const rootCost = val('rootCost', 350);
  const plantingCost = val('plantingCost', 50000);
  const initialInvestment = rootCost * quantity + plantingCost;
  const budsPerRoot = val('budsPerRoot', 3);
  const maxFlowerCoef = val('maxFlowerCoef', 7.5);
  const avgPrice = p('earlySharePct', 80) * val('earlyPrice', 100) + p('lateSharePct', 20) * val('latePrice', 30);
  const baseAnnualCost = val('baseAnnualCost', 50000);
  const inflation = p('inflationPct', 3);
  const variableCost = val('variableCostPerFlower', 10);
  const productivity = [1,2,3,4,5,6,7,8,9,10].map(y => p(`p${y}`, y === 1 ? 0 : y === 2 ? 5 : y === 3 ? 25 : y === 4 ? 75 : y === 10 ? 80 : 100));

  let cumulative = 0;
  const rows = [];
  for (let i = 0; i < 10; i++) {
    const year = i + 1;
    const flowersPerBush = productivity[i] * budsPerRoot * maxFlowerCoef;
    const totalFlowers = flowersPerBush * quantity;
    const revenue = totalFlowers * avgPrice;
    const fixedCosts = baseAnnualCost * Math.pow(1 + inflation, year - 1);
    const variableCosts = totalFlowers * variableCost;
    const planting = year === 1 ? plantingCost : 0;
    const totalCosts = fixedCosts + variableCosts + planting;
    const profit = revenue - totalCosts;
    cumulative = year === 1 ? profit - initialInvestment : cumulative + profit;
    const profitPct = safeDiv(cumulative, initialInvestment);
    rows.push({ year, flowersPerBush, totalFlowers, revenue, fixedCosts, variableCosts, planting, totalCosts, profit, cumulative, profitPct });
  }
  const totalCosts10 = rows.reduce((s, r) => s + r.totalCosts, 0);
  const totalFlowers10 = rows.reduce((s, r) => s + r.totalFlowers, 0);
  const totalProfit10 = rows.reduce((s, r) => s + r.profit, 0);
  const payback = rows.find(r => r.cumulative >= 0)?.year || 'нет';

  return {
    kpis: [
      ['Год окупаемости', payback, 'text', payback !== 'нет' ? 'positive' : 'negative'],
      ['Прибыль за 10 лет', totalProfit10, 'rub', totalProfit10 >= 0 ? 'positive' : 'negative'],
      ['ROI за 10 лет', safeDiv(rows.at(-1).cumulative, initialInvestment), 'pct', rows.at(-1).cumulative >= 0 ? 'positive' : 'negative']
    ],
    html: `<div class="notice">Средняя цена цветка: ${num.format(avgPrice)} ₽. Общие начальные инвестиции: ${rub.format(initialInvestment)} ₽.</div>` +
      table(['Год', 'Цветов/куст', 'Всего цветов', 'Выручка', 'Расходы', 'Прибыль', 'Накопл. поток', 'ROI'], rows.map(r => [
        r.year,
        num.format(r.flowersPerBush),
        num.format(r.totalFlowers),
        `${rub.format(r.revenue)} ₽`,
        `${rub.format(r.totalCosts)} ₽`,
        `${rub.format(r.profit)} ₽`,
        `${rub.format(r.cumulative)} ₽`,
        pct.format(r.profitPct)
      ])) +
      `<p class="hint">Суммарные затраты за 10 лет: ${rub.format(totalCosts10)} ₽. Всего цветов: ${rub.format(totalFlowers10).replace('₽','шт')}.</p>`
  };
}

function calcGrow() {
  const quantity = val('quantity', 1000);
  const rootCost = val('rootCost', 350);
  const initialBuds = val('initialBuds', 3);
  const growthCoef = val('growthCoef', 1.6);
  const minBudsToSplit = val('minBudsToSplit', 6);
  const newDivisionBuds = val('newDivisionBuds', 3);
  const salePrice = val('salePrice', 350);
  const saleShare = p('saleSharePct', 80);
  const costs = [1,2,3,4,5].map(y => val(`c${y}`, [10,12,15,18,20][y-1]));

  let prev = { rootsEnd: quantity, budsEnd: initialBuds, split: 'Нет', kept: 0, cumulative: 0 };
  const rows = [];
  for (let i = 0; i < 5; i++) {
    const year = i + 1;
    const rootsStart = year === 1 ? quantity : (prev.split === 'Да' ? prev.kept : prev.rootsStart);
    const budsStart = year === 1 ? initialBuds : (prev.split === 'Да' ? newDivisionBuds : prev.budsEnd);
    const budsEnd = Math.round(budsStart * growthCoef);
    const split = budsEnd >= minBudsToSplit ? 'Да' : 'Нет';
    const totalDivisions = split === 'Да' ? Math.trunc(budsEnd / newDivisionBuds) * rootsStart : 0;
    const sold = totalDivisions * saleShare;
    const kept = totalDivisions - sold;
    const revenue = sold * salePrice;
    const expenses = rootsStart * costs[i];
    const profit = revenue - expenses;
    const cumulative = prev.cumulative + profit;
    const row = { year, rootsStart, budsStart, budsEnd, split, totalDivisions, sold, kept, revenue, expenses, profit, cumulative };
    rows.push(row);
    prev = row;
  }

  const totalCosts = rootCost * quantity + rows.reduce((s, r) => s + r.expenses, 0);
  const totalDivisionsSoldAndKept = rows.reduce((s, r) => s + r.sold + r.kept, 0);
  const profit5 = rows.at(-1).cumulative;
  const roi = safeDiv(profit5, totalCosts);
  const payback = rows.find(r => r.cumulative >= 0)?.year || 'нет';

  return {
    kpis: [
      ['Прибыль за 5 лет', profit5, 'rub', profit5 >= 0 ? 'positive' : 'negative'],
      ['ROI за 5 лет', roi, 'pct', roi >= 0 ? 'positive' : 'negative'],
      ['Год окупаемости', payback, 'text', payback !== 'нет' ? 'positive' : 'negative']
    ],
    html: table(['Год', 'Корней на начало', 'Глазков конец', 'Деление', 'Деленки всего', 'Продано', 'Расходы', 'Прибыль', 'Накопл. прибыль'], rows.map(r => [
      r.year,
      num.format(r.rootsStart),
      num.format(r.budsEnd),
      r.split,
      num.format(r.totalDivisions),
      num.format(r.sold),
      `${rub.format(r.expenses)} ₽`,
      `${rub.format(r.profit)} ₽`,
      `${rub.format(r.cumulative)} ₽`
    ])) + `<p class="hint">Суммарные затраты с учетом закупки корней: ${rub.format(totalCosts)} ₽. Всего получено деленок за 5 лет: ${num.format(totalDivisionsSoldAndKept)} шт.</p>`
  };
}

function safeDiv(a, b) {
  return b ? a / b : 0;
}

render();