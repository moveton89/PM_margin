# PlantMarket 3.0 Green Agro Premium

Telegram Mini App для расчета маржи питомника по трем сценариям:

1. Продажа корней через маркетплейс
2. Выращивание на срезку
3. Доращивание корня

## Что нового в 3.0

- Green Agro Premium дизайн под бренд PlantMarket
- История расчетов пользователей
- PDF/печать отчета через кнопку «PDF отчет»
- PRO-блок и форма заявки
- Админка с редактированием текстов и цветов
- Статистика: расчеты, пользователи, заявки

## Обновление на GitHub + Render

1. Распакуйте архив.
2. Замените старые файлы в GitHub на файлы из этого архива.
3. Нажмите Commit changes.
4. Render автоматически запустит новый deploy.
5. Проверьте приложение по ссылке Render.

## Админка

Откройте:

```text
https://ваш-сервис.onrender.com/admin.html
```

Пароль по умолчанию:

```text
admin123
```

Лучше поменять пароль в Render → Environment:

```text
ADMIN_PASSWORD=ваш_пароль
```

## Переменные Render

```text
BOT_TOKEN=токен_бота_от_BotFather
WEBAPP_URL=https://ваш-сервис.onrender.com
ADMIN_PASSWORD=ваш_пароль
```

## Важно про историю и заявки

На бесплатном Render файлы в контейнере могут очищаться при пересборке. Для постоянной истории и заявок подключите Render Disk и укажите:

```text
DATA_FILE=/data/calculations.json
CONFIG_FILE=/data/config.json
LEADS_FILE=/data/leads.json
```

