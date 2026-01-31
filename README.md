# Bedolaga Cabinet - Web Interface

Современный веб-интерфейс личного кабинета для VPN бота на базе [Remnawave Bedolaga Telegram Bot V3.0.0+](https://github.com/BEDOLAGA-DEV/remnawave-bedolaga-telegram-bot).

## Возможности

- 🔐 Авторизация через Telegram
- 💳 Пополнение баланса (YooKassa, CryptoBot, Stars и др.)
- 📊 Управление подписками и ключами
- 🎫 Система тикетов поддержки
- 🌐 Мультиязычность (EN/RU)
- 📱 Адаптивный дизайн
- 🎨 Настраиваемый брендинг
- Админпанель для управлени ботом
- Автоматическая передача subpage конфигов приложений из Remnawave
- ⚡ Fast - React + Vite + TypeScript

## Требования

- Node.js 18+ (для разработки)
- Docker и Docker Compose (для production)
- Запущенный backend бота с включенным Cabinet API

## Быстрый старт

### Вариант A: Готовый Docker образ

```bash
docker pull ghcr.io/bedolaga-dev/bedolaga-cabinet:latest

или

docker pull bedolaga/bedolaga-cabinet:latest
```

Затем настройте Caddy/Nginx для проксирования (см. раздел "Настройка прокси для production").

### Вариант B: Сборка из исходников

#### 1. Клонирование репозитория

```bash
git clone https://github.com/BEDOLAGA-DEV/bedolaga-cabinet.git
cd bedolaga-cabinet
```

#### 2. Настройка окружения

**⚠️ ОБЯЗАТЕЛЬНО:** Скопируйте `.env.example` в `.env` перед запуском!

```bash
cp .env.example .env
```

Docker Compose не запустится без `.env` файла.

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
CABINET_PORT=3020
```

#### 3. Запуск в Docker

```bash
docker compose up -d --build
```

Приложение будет доступно на `http://localhost:3020`

## Настройка backend

В `.env` файле вашего бота добавьте:

```env
# Включить Cabinet API
CABINET_ENABLED=true

# JWT секрет для авторизации (сгенерируйте случайную строку)
CABINET_JWT_SECRET=your_random_secret_key_here

# Разрешенные origins для CORS
CABINET_ALLOWED_ORIGINS=http://localhost:3020,https://cabinet.yourdomain.com
```

После изменений перезапустите бота.

## Настройка прокси для production

Frontend - это статические файлы (HTML, JS, CSS). Для работы нужно:

1. Раздавать статику через веб-сервер
2. Проксировать `/api/*` запросы на backend бота

> **💡 Важно:** Docker контейнер из этого репозитория содержит nginx, который слушает на **внутреннем порту 80**.
> Это НЕ хост-порт! Выберите один из вариантов ниже в зависимости от вашей инфраструктуры.

### Вариант 1: Caddy раздает статику напрямую

**✅ Рекомендуется** - без лишних слоев прокси, максимальная производительность.

Соберите frontend и примонтируйте в Caddy:

```bash
# Соберите образ или скопируйте dist из контейнера
docker compose build
docker create --name temp_cabinet cabinet_frontend
docker cp temp_cabinet:/usr/share/nginx/html ./cabinet-dist
docker rm temp_cabinet
```

Caddyfile:

```caddyfile
cabinet.yourdomain.com {
    root * /srv/cabinet
    encode gzip

    # API запросы на backend
    handle /api/* {
        uri strip_prefix /api
        reverse_proxy backend_bot:8080
    }
    @websockets {
        header_regexp Connection *Upgrade*
        header        Upgrade websocket
    }

    # WebSocket соединения
    handle /cabinet/ws {
        uri strip_prefix /api
        reverse_proxy backend_bot:8080 {
            transport http {
                read_timeout 0
                write_timeout 0
            }
        }
    }

    # Статические файлы
    handle {
        try_files {path} /index.html
        file_server
    }
}

```

docker-compose.yml для Caddy:

```yaml
services:
  caddy:
    image: caddy:2-alpine
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./cabinet-dist:/srv/cabinet:ro
      - caddy_data:/data
    ports:
      - '80:80'
      - '443:443'
    networks:
      - bot_network
```

### Вариант 2: Проксирование на frontend контейнер

Если хотите использовать готовый Docker контейнер с nginx внутри.

**⚠️ Важно:**

- Порт `80` в примерах - это **внутренний порт контейнера** (nginx внутри), не хост-порт!
- Контейнеры должны быть в одной Docker сети для связи друг с другом
- Имена контейнеров используются как DNS внутри Docker сети

#### A. Если у вас УЖЕ запущен Caddy/Nginx в Docker:

**Шаг 1:** Узнайте имя Docker сети вашего Caddy/Nginx:

```bash
# Посмотреть сети
docker network ls

# Или узнать сеть конкретного контейнера
docker inspect <имя_caddy_контейнера> | grep NetworkMode
```

**Шаг 2:** Создайте docker-compose.yml для frontend:

```yaml
services:
  cabinet-frontend:
    image: ghcr.io/bedolaga-dev/bedolaga-cabinet:latest
    container_name: cabinet_frontend
    restart: unless-stopped
    # НЕ открываем порты на хосте! Только внутри Docker сети
    networks:
      - bot_network

networks:
  bot_network:
    external: true # Используем существующую сеть
    name: remnawave-bedolaga-telegram-bot_bot_network # Пример для bedolaga bot
```

**Важно:** Замените имя сети на вашу:

- Если у вас bot + caddy: используйте сеть бота (обычно `<название_проекта>_bot_network`)
- Если отдельный Caddy: узнайте через `docker network ls`
- Если используете Traefik: обычно `traefik` или `web`

**Шаг 3:** Запустите frontend:

```bash
docker compose up -d
```

**Шаг 4:** Добавьте в конфигурацию Caddy/Nginx:

Caddy проксирует на контейнер:

```caddyfile
cabinet.yourdomain.com {
    # API на backend
    handle /api/* {
        uri strip_prefix /api
        reverse_proxy backend_bot:8080
    }

    # Frontend контейнер (nginx внутри на порту 80)
    handle {
        reverse_proxy cabinet_frontend:80
    }
}
```

Nginx (добавьте в существующий конфиг):

```nginx
server {
    listen 443 ssl http2;
    server_name cabinet.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

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

    # Frontend контейнер (nginx внутри на порту 80)
    location / {
        proxy_pass http://cabinet_frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Шаг 5:** Перезагрузите Caddy/Nginx:

```bash
# Для Caddy
docker exec <caddy_container> caddy reload --config /etc/caddy/Caddyfile

# Для Nginx
docker exec <nginx_container> nginx -s reload
```

#### B. Если Caddy/Nginx ещё НЕ запущен:

docker-compose.yml:

```yaml
services:
  cabinet-frontend:
    image: ghcr.io/bedolaga-dev/bedolaga-cabinet:latest
    container_name: cabinet_frontend
    restart: unless-stopped
    # Можно открыть порт для прямого доступа (для тестирования)
    # ports:
    #   - "3020:80"
    networks:
      - web

networks:
  web:
    driver: bridge
```

Затем настройте Caddy/Nginx в той же сети `web`.

## Переменные окружения

### Build-time (используются при сборке)

| Переменная                   | Описание                           | По умолчанию |
| ---------------------------- | ---------------------------------- | ------------ |
| `VITE_API_URL`               | Путь к API (`/api` или полный URL) | `/api`       |
| `VITE_TELEGRAM_BOT_USERNAME` | Username Telegram бота (без @)     | -            |
| `VITE_APP_NAME`              | Название приложения                | `Cabinet`    |
| `VITE_APP_LOGO`              | Логотип (короткий текст)           | `V`          |

### Runtime (только для Docker)

| Переменная     | Описание        | По умолчанию |
| -------------- | --------------- | ------------ |
| `CABINET_PORT` | Порт контейнера | `3020`       |

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

**Проверка связности контейнеров:**

```bash
# Проверить что frontend доступен из Caddy/Nginx контейнера
docker exec <caddy_container> wget -qO- http://cabinet_frontend:80

# Проверить что backend доступен
docker exec <caddy_container> wget -qO- http://backend_bot:8080/health

# Проверить в какой сети находятся контейнеры
docker inspect cabinet_frontend | grep -A 10 Networks
docker inspect <caddy_container> | grep -A 10 Networks
```

Если контейнеры в разных сетях, подключите их:

```bash
# Подключить frontend к сети Caddy
docker network connect <caddy_network> cabinet_frontend

# ИЛИ подключить Caddy к сети frontend
docker network connect <frontend_network> <caddy_container>
```

### Telegram авторизация не работает

1. Проверьте `VITE_TELEGRAM_BOT_USERNAME` - должен быть без `@`
2. Убедитесь что домен добавлен в Bot Settings → Domain

## Связанные проекты

- [Remnawave Bedolaga Telegram Bot](https://github.com/BEDOLAGA-DEV/remnawave-bedolaga-telegram-bot) - Backend бота
- [Bedolaga Chat](https://t.me/+wTdMtSWq8YdmZmVi) - Чат поддержки

## Контакты

- Telegram: [@fringg](https://t.me/fringg)
- Telegram: [@pedzeo](https://t.me/pedzeo)
- Чат: [Bedolaga Chat](https://t.me/+wTdMtSWq8YdmZmVi)
