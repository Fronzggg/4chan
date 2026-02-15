# Деплой на Render.com

## Проблема с бесплатным планом

На бесплатном плане Render:
- Сервис засыпает после 15 минут неактивности
- Файловая система эфемерная (все файлы теряются при перезапуске)
- База данных SQLite и загруженные файлы удаляются

## Решение: Persistent Disk

### Шаг 1: Подготовка проекта

1. Убедитесь что все файлы закоммичены в Git:
```bash
git add .
git commit -m "Add persistent storage support"
git push
```

### Шаг 2: Создание сервиса на Render

1. Зайдите на https://render.com
2. Нажмите "New +" → "Web Service"
3. Подключите ваш GitHub репозиторий
4. Настройки:
   - **Name**: les-forum
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### Шаг 3: Добавление Persistent Disk

1. В настройках сервиса найдите раздел "Disks"
2. Нажмите "Add Disk"
3. Настройки диска:
   - **Name**: forum-data
   - **Mount Path**: `/opt/render/project/src/data`
   - **Size**: 1 GB (бесплатно)
4. Сохраните

### Шаг 4: Переменные окружения

Добавьте в Environment Variables:
```
NODE_ENV=production
RENDER_EXTERNAL_URL=https://ваш-сервис.onrender.com
```

### Шаг 5: Деплой

1. Нажмите "Manual Deploy" → "Deploy latest commit"
2. Дождитесь завершения деплоя (3-5 минут)
3. Откройте ваш сайт

## Что сохраняется

✅ База данных SQLite (`/opt/render/project/src/data/forum.db`)
✅ Загруженные файлы (`/opt/render/project/src/data/uploads/`)
✅ Все пользователи, треды, сообщения
✅ Настройки и бейджи

## Keep-Alive (предотвращение засыпания)

Сервис автоматически пингует себя каждые 14 минут, чтобы не заснуть.

**Важно**: На бесплатном плане есть лимит 750 часов в месяц. Keep-alive использует эти часы.

## Альтернативы

### 1. Платный план Render ($7/месяц)
- Не засыпает
- Больше ресурсов
- Persistent disk включен

### 2. Railway.app
- $5/месяц за использование
- Persistent storage из коробки
- Не засыпает

### 3. Fly.io
- Бесплатный план с persistent volumes
- Не засыпает
- 3 GB persistent storage бесплатно

### 4. PostgreSQL вместо SQLite

Для production лучше использовать PostgreSQL:

```bash
npm install pg
```

Render предоставляет бесплатную PostgreSQL базу (90 дней, потом удаляется).

## Миграция на PostgreSQL (рекомендуется)

1. Создайте PostgreSQL базу на Render
2. Установите `pg` и `sequelize`
3. Замените SQLite на PostgreSQL в коде
4. База будет сохраняться даже при засыпании

## Проверка работы

После деплоя:
1. Создайте аккаунт
2. Создайте тред
3. Подождите 20 минут (сервис заснет)
4. Откройте сайт снова
5. Проверьте что данные сохранились

## Логи

Смотрите логи в Render Dashboard:
```
Server on 3000
Database: /opt/render/project/src/data/forum.db
Uploads: /opt/render/project/src/data/uploads
Keep-alive service started
```

## Troubleshooting

### База данных пустая после перезапуска

Проверьте что:
- Disk правильно примонтирован (`/opt/render/project/src/data`)
- В логах видно правильный путь к базе
- Disk не был удален в настройках

### Файлы не загружаются

Проверьте:
- Путь к uploads в логах
- Права доступа к папке
- Размер диска (не превышен ли лимит)

### Сервис все равно засыпает

- Keep-alive работает только в production
- Проверьте переменную `NODE_ENV=production`
- Проверьте `RENDER_EXTERNAL_URL`

## Бэкап

Рекомендуется делать бэкап базы:

1. Скачайте файл `forum.db` через Render Shell:
```bash
cat /opt/render/project/src/data/forum.db > backup.db
```

2. Или используйте API для экспорта данных
