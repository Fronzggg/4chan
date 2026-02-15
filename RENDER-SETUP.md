# Быстрая настройка Render

## Проблема
На бесплатном плане Render сервис засыпает и **теряет все данные** (база, файлы).

## Решение
Используйте **Persistent Disk** - это бесплатно и сохраняет данные навсегда.

## Пошаговая инструкция

### 1. Загрузите код на GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ваш-username/ваш-repo.git
git push -u origin main
```

### 2. Создайте Web Service на Render

1. Зайдите на https://render.com
2. Нажмите **"New +"** → **"Web Service"**
3. Подключите GitHub репозиторий
4. Заполните:
   - **Name**: `les-forum` (или любое имя)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

### 3. Добавьте Persistent Disk (ВАЖНО!)

1. Прокрутите вниз до раздела **"Disks"**
2. Нажмите **"Add Disk"**
3. Заполните:
   - **Name**: `forum-data`
   - **Mount Path**: `/opt/render/project/src/data`
   - **Size**: `1 GB` (бесплатно)
4. Нажмите **"Save"**

### 4. Добавьте переменные окружения

В разделе **"Environment Variables"**:

1. Нажмите **"Add Environment Variable"**
2. Добавьте:
   ```
   Key: NODE_ENV
   Value: production
   ```
3. Добавьте еще одну:
   ```
   Key: RENDER_EXTERNAL_URL
   Value: https://ваш-сервис.onrender.com
   ```
   (замените на ваш URL, который покажет Render)

### 5. Деплой

1. Нажмите **"Create Web Service"**
2. Дождитесь деплоя (3-5 минут)
3. Откройте ваш сайт по ссылке

### 6. Проверка

После деплоя:
1. Создайте аккаунт
2. Создайте тред
3. Подождите 20 минут
4. Откройте сайт снова
5. ✅ Данные должны сохраниться!

## Что сохраняется

✅ База данных SQLite
✅ Все пользователи
✅ Все треды и сообщения
✅ Загруженные изображения
✅ Настройки и бейджи

## Важные моменты

### Keep-Alive
Сервис автоматически пингует себя каждые 14 минут, чтобы не заснуть.

**Лимит**: 750 часов в месяц на бесплатном плане.

### Если сервис всё равно засыпает

Это нормально на бесплатном плане. Но данные сохранятся благодаря Persistent Disk!

При первом запросе после сна:
- Сервис проснется за ~30 секунд
- Все данные будут на месте

### Обновление кода

После изменений в коде:
```bash
git add .
git commit -m "Update"
git push
```

Render автоматически задеплоит новую версию. Данные сохранятся!

## Альтернативы (если нужно без засыпания)

### 1. Платный план Render - $7/месяц
- Не засыпает
- Больше ресурсов

### 2. Railway.app - $5/месяц
- Persistent storage
- Не засыпает

### 3. Fly.io - Бесплатно
- 3 GB persistent storage
- Не засыпает

## Troubleshooting

### "Database is empty after restart"
- Проверьте что Disk добавлен
- Mount Path должен быть `/opt/render/project/src/data`
- Посмотрите логи: должно быть `Database: /opt/render/project/src/data/forum.db`

### "Images not loading"
- Проверьте что Disk примонтирован
- Размер диска не превышен (1 GB)

### "Service keeps sleeping"
- Это нормально на Free плане
- Keep-alive работает только если `NODE_ENV=production`
- Данные всё равно сохраняются

## Контакты

Если что-то не работает - проверьте логи в Render Dashboard.
