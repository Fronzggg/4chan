# Инструкция по установке LeS Forum

## Локальная установка

1. Установите Node.js (версия 14 или выше)

2. Установите зависимости:
```bash
npm install
```

3. Запустите сервер:
```bash
npm start
```

4. Откройте браузер: http://localhost:3000

## Деплой на Render.com

1. Создайте аккаунт на render.com

2. Нажмите "New +" -> "Web Service"

3. Подключите ваш GitHub репозиторий

4. Настройки:
   - Name: les-forum
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm start
   - Instance Type: Free

5. Нажмите "Create Web Service"

6. Дождитесь деплоя (3-5 минут)

## Функции безопасности

- AES-256-GCM шифрование контента
- Обфускация сетевых запросов
- Защита от отладки DevTools
- Подмена fingerprint браузера
- Фейковые IP адреса
- Защита от XSS и CSRF
- Безопасные HTTP заголовки

## Верифицированные аккаунты

По умолчанию созданы 2 верифицированных аккаунта:

- Логин: frnz, Пароль: 123
- Логин: Gnrl, Пароль: 123

## Структура базы данных

SQLite база создается автоматически при первом запуске:
- users - пользователи
- boards - разделы форума
- threads - треды
- replies - ответы
- notifications - уведомления

## Мобильная версия

Интерфейс полностью адаптивен:
- Планшеты: 768px и меньше
- Телефоны: 480px и меньше

## Технологии

- Backend: Node.js + Express + SQLite
- Frontend: Vanilla JS (без фреймворков)
- Шифрование: Web Crypto API + Node crypto
- Стили: CSS3 с темной темой
