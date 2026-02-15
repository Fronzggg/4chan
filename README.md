# LeS Forum

Анонимный форум с полным шифрованием

## Деплой на Render

**Важно**: Используйте Persistent Disk для сохранения данных!

### Быстрый старт

1. Создайте новый Web Service на render.com
2. Подключите репозиторий
3. Build Command: `npm install`
4. Start Command: `npm start`
5. **Добавьте Disk**:
   - Name: `forum-data`
   - Mount Path: `/opt/render/project/src/data`
   - Size: 1 GB
6. Добавьте переменные окружения:
   - `NODE_ENV=production`
   - `RENDER_EXTERNAL_URL=https://ваш-сервис.onrender.com`

Подробнее: [DEPLOY.md](DEPLOY.md)

## Локальный запуск

```bash
npm install
npm start
```

Откройте http://localhost:3000

## Функции

### Основные
- Разделы и подразделы (создание админами)
- Анонимные сообщения
- Вложенные ответы (древовидная структура)
- Реалтайм обновления (каждые 3 секунды)
- Редактирование профиля
- Загрузка изображений и видео

### Реакции
- 6 эмоджи: 👍 ❤️ 😂 😮 😢 🔥
- На тредах и сообщениях
- Счетчик реакций

### Модерация
- Система жалоб
- Автомодерация (банворды)
- Баны и мьюты
- Админ-панель с вкладками

### Безопасность
- Шифрование данных
- Обфускация трафика
- Защита от DevTools
- Автобан за нарушения

### Пользователи
- Бейджи (ADMIN, OWNER, MODER, Community Lead)
- Premium статус (радужный ник)
- Синие галочки верификации
- Статистика профиля
- Счетчик просмотров

## Верифицированные пользователи

- **frnz** (пароль: 123) - OWNER, ADMIN, PREMIUM
- **Gnrl** (пароль: 123) - Community Lead, ADMIN, PREMIUM

## Технологии

- Backend: Node.js + Express + SQLite
- Frontend: Vanilla JS (без фреймворков)
- Стили: CSS3 с темной темой
- Хранилище: Persistent Disk на Render

## Структура проекта

```
├── server.js           # Бэкенд сервер
├── index.html          # Главная страница
├── script.js           # Логика фронтенда
├── style.css           # Стили
├── theme-dark.css      # Темная тема
├── keep-alive.js       # Предотвращение засыпания
├── render.yaml         # Конфигурация Render
├── DEPLOY.md           # Инструкции по деплою
└── data/               # Persistent storage (на Render)
    ├── forum.db        # База данных
    └── uploads/        # Загруженные файлы
```

## API Endpoints

### Аутентификация
- `POST /api/register` - Регистрация
- `POST /api/login` - Вход
- `GET /api/check-ban/:username` - Проверка бана

### Пользователи
- `GET /api/user/:username` - Профиль
- `POST /api/user/update` - Обновление профиля

### Разделы
- `GET /api/boards` - Все разделы
- `POST /api/boards/create` - Создать раздел (админ)
- `DELETE /api/boards/:code` - Удалить раздел (админ)

### Треды
- `GET /api/threads/:board` - Треды раздела
- `GET /api/thread/:id` - Один тред
- `GET /api/thread/:id/replies` - Ответы треда
- `POST /api/threads` - Создать тред
- `POST /api/thread/:id/pin` - Закрепить (админ)
- `POST /api/thread/:id/unpin` - Открепить (админ)
- `POST /api/thread/:id/delete` - Удалить

### Ответы
- `POST /api/replies` - Создать ответ
- `POST /api/reply/:id/delete` - Удалить ответ

### Реакции
- `POST /api/reactions` - Добавить/убрать реакцию
- `GET /api/reactions/:type/:id` - Получить реакции
- `GET /api/reactions/:type/:id/user/:username` - Реакции пользователя

### Жалобы
- `POST /api/reports` - Создать жалобу
- `GET /api/admin/reports` - Список жалоб (админ)
- `GET /api/admin/report/:id` - Детали жалобы (админ)
- `POST /api/admin/report/:id/resolve` - Разрешить жалобу (админ)

### Модерация (админ)
- `POST /api/admin/ban` - Забанить
- `POST /api/admin/unban` - Разбанить
- `POST /api/admin/mute` - Замьютить
- `POST /api/admin/unmute` - Размьютить
- `POST /api/admin/premium` - Выдать Premium
- `POST /api/admin/badges` - Управление бейджами
- `GET /api/admin/users` - Список пользователей
- `GET /api/admin/stats` - Статистика

## Лицензия

MIT
