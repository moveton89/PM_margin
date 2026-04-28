# Telegram Mini App — калькулятор маржи

Готовое приложение по формулам из Excel-файлов:
- продажа корней через маркетплейс;
- выращивание на срезку;
- доращивание корня в грунте или контейнере.

## Что внутри

- `server.js` — Express-сервер + Telegram-бот.
- `public/index.html` — интерфейс Mini App.
- `public/app.js` — все формулы калькуляторов.
- `public/styles.css` — адаптивный дизайн для телефона.
- `.env.example` — переменные окружения.
- `Dockerfile` — запуск в контейнере.

## Запуск локально

```bash
npm install
cp .env.example .env
npm start
```

Откройте:

```text
http://localhost:3000
```

## Подключение к Telegram

1. Создайте бота через `@BotFather`.
2. Получите токен и добавьте его в `.env`:
   ```env
   BOT_TOKEN=123456:ABC...
   ```
3. Задеплойте приложение на HTTPS-домен.
4. Укажите публичный адрес в `.env`:
   ```env
   WEBAPP_URL=https://your-domain.com
   ```
5. В `@BotFather` можно также настроить Menu Button:
   - `/mybots`
   - выбрать бота
   - `Bot Settings`
   - `Menu Button`
   - `Configure menu button`
   - URL вашего Mini App.

После запуска бот отвечает на `/start` и `/calc` кнопкой открытия калькулятора.

## Деплой через Docker

```bash
docker build -t margin-calculator .
docker run -p 3000:3000 --env-file .env margin-calculator
```

## Важное по формулам

Приложение повторяет расчетные формулы из Excel. В калькуляторе маркетплейса поля доставки и обратной логистики сохранены как входные параметры, но в исходной Excel-формуле они не входят в итоговые расходы.