# Версия для Render Upload

Этот архив нужно загружать в Render как Upload Files / Docker Web Service.

## Что выбрать в Render

1. New +
2. Web Service
3. Deploy from existing image / Upload files, если Render предлагает upload
4. Dockerfile Path: `./Dockerfile`
5. Docker Command: оставить пустым или `npm start`
6. Environment:
   - `BOT_TOKEN` = токен от BotFather
   - `WEBAPP_URL` = ссылка Render, например `https://pm-margin.onrender.com`

После сохранения нажать Manual Deploy → Deploy latest commit.

## Проверка

Откройте ссылку Render в браузере. Должен открыться калькулятор.
В Telegram отправьте боту `/start`.


## После обновления до версии 2.0

В GitHub замените файлы проекта на файлы из этого архива и дождитесь redeploy в Render.

Проверка:
1. Откройте приложение.
2. Измените любое поле.
3. Нажмите **Сохранить расчет**.
4. Нажмите **История** — расчет должен появиться в списке.

Для постоянной истории на Render лучше подключить Disk:
- Mount Path: `/var/data`
- Environment variable: `DATA_FILE=/var/data/calculations.json`
