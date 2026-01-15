# Bedolaga Cabinet - Web Interface

Современный веб-интерфейс личного кабинета для VPN бота на базе [Remnawave Bedolaga Telegram Bot](https://github.com/BEDOLAGA-DEV/remnawave-bedolaga-telegram-bot).

## Возможности

- 🔐 Авторизация через Telegram
- 💳 Пополнение баланса (YooKassa, CryptoBot, Stars и др.)
- 📊 Управление подписками и ключами
- 🎫 Система тикетов поддержки
- 🌐 Мультиязычность (EN/RU)
- 📱 Адаптивный дизайн
- 🎨 Настраиваемый брендинг
- ⚡ Fast - React + Vite + TypeScript

## Требования

- Node.js 18+ (для разработки)
- Docker и Docker Compose (для production)
- Запущенный backend бота с включенным Cabinet API

## Быстрый старт

### Вариант 1: Готовый Docker образ

```bash
# Из GitHub Container Registry
docker pull ghcr.io/bedolaga-dev/bedolaga-cabinet:latest

# Или из Docker Hub
docker pull bedolaga/bedolaga-cabinet:latest
```

### Вариант 2: Сборка из исходников

#### 1. Клонирование репозитория

```bash
git clone https://github.com/BEDOLAGA-DEV/bedolaga-cabinet.git
cd bedolaga-cabinet
```

#### 2. Настройка окружения

Скопируйте `.env.example` в `.env` и настройте переменные:

```bash
cp .env.example .env
```

**Основные переменные:**

```env
# API URL - путь к backend API
# Используйте /api если прокси на том же домене
# Или полный URL если backend на другом сервере
VITE_API_URL=/api

# Telegram Bot Username (без @)
VITE_TELEGRAM_BOT_USERNAME=your_bot_username

# Брендинг (опционально)
VITE_APP_NAME=My VPN Cabinet
VITE_APP_LOGO=V

# Порт для Docker контейнера
CABINET_PORT=3000
```

#### 3. Запуск в Docker

```bash
docker compose up -d --build
```

Приложение будет доступно на `http://localhost:3000`

## Настройка backend

В `.env` файле вашего бота добавьте:

```env
# Включить Cabinet API
CABINET_ENABLED=true

# JWT секрет для авторизации (сгенерируйте случайную строку)
CABINET_JWT_SECRET=your_random_secret_key_here

# Разрешенные origins для CORS
CABINET_ALLOWED_ORIGINS=http://localhost:3000,https://cabinet.yourdomain.com
```

После изменений перезапустите бота.

## Настройка прокси для production

Frontend раздает только статические файлы. Для работы с API нужно настроить reverse proxy, который будет проксировать запросы `/api/*` на backend бота.

### Вариант 1: Caddy

Добавьте в ваш Caddyfile:

```caddyfile
cabinet.yourdomain.com {
    # Проксировать API запросы на backend
    handle /api/* {
        uri strip_prefix /api
        reverse_proxy backend_bot:8080
    }

    # Остальное - на frontend контейнер
    handle {
        reverse_proxy cabinet_frontend:80
    }
}
```

### Вариант 2: Nginx

Добавьте в конфигурацию Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name cabinet.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # API запросы проксируем на backend
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://backend_bot:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend контейнер
    location / {
        proxy_pass http://cabinet_frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Вариант 3: Статика + прямое проксирование

Если хотите раздавать статику напрямую без Docker:

```bash
# Соберите проект
npm install
npm run build

# Скопируйте dist на сервер
scp -r dist/* user@server:/var/www/cabinet/
```

Конфигурация Nginx для статики:

```nginx
server {
    listen 443 ssl http2;
    server_name cabinet.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/cabinet;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # API на backend
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://backend_bot:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование статики
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Разработка

### Установка зависимостей

```bash
npm install
```

### Запуск dev сервера

```bash
npm run dev
```

Откроется на `http://localhost:5173`

### Сборка для production

```bash
npm run build
```

Результат в папке `dist/`

### Проверка типов

```bash
npm run type-check
```

### Линтинг

```bash
npm run lint
```

## Переменные окружения

### Build-time (используются при сборке)

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `VITE_API_URL` | Путь к API (`/api` или полный URL) | `/api` |
| `VITE_TELEGRAM_BOT_USERNAME` | Username Telegram бота (без @) | - |
| `VITE_APP_NAME` | Название приложения | `Cabinet` |
| `VITE_APP_LOGO` | Логотип (короткий текст) | `V` |

### Runtime (только для Docker)

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `CABINET_PORT` | Порт контейнера | `3000` |

## Структура проекта

```
bedolaga-cabinet/
├── src/
│   ├── api/           # API клиенты
│   ├── components/    # React компоненты
│   ├── contexts/      # React контексты
│   ├── hooks/         # Custom hooks
│   ├── locales/       # Переводы (i18n)
│   ├── pages/         # Страницы приложения
│   ├── types/         # TypeScript типы
│   └── utils/         # Утилиты
├── public/            # Статические файлы
├── Dockerfile         # Docker образ
├── docker-compose.yml # Docker Compose конфигурация
└── .env.example       # Пример переменных окружения
```

## Устранение проблем

### Ошибка CORS

Убедитесь, что домен frontend добавлен в `CABINET_ALLOWED_ORIGINS` в настройках бота.

### API возвращает HTML вместо JSON

Проверьте настройку прокси - запросы на `/api/*` должны попадать на backend, а не на frontend.

### 502 Bad Gateway

Убедитесь что:
1. Backend бот запущен и работает
2. Контейнеры находятся в одной Docker сети
3. Имя сервиса backend в прокси конфигурации правильное

### Telegram авторизация не работает

1. Проверьте `VITE_TELEGRAM_BOT_USERNAME` - должен быть без `@`
2. Убедитесь что домен добавлен в Bot Settings → Domain

## Связанные проекты

- [Remnawave Bedolaga Telegram Bot](https://github.com/BEDOLAGA-DEV/remnawave-bedolaga-telegram-bot) - Backend бота
- [Bedolaga Chat](https://t.me/+wTdMtSWq8YdmZmVi) - Чат поддержки

## Лицензия

Apache-2.0 License - см. [LICENSE](LICENSE)

## Контакты

- Telegram: [@fringg](https://t.me/fringg)
- Telegram: [@pedzeo](https://t.me/pedzeo)
- Чат: [Bedolaga Chat](https://t.me/+wTdMtSWq8YdmZmVi)
