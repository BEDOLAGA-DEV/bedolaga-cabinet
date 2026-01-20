import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { adminSettingsApi, SettingDefinition, SettingCategorySummary } from '../api/adminSettings'
import { brandingApi, setCachedBranding } from '../api/branding'
import { setCachedAnimationEnabled } from '../components/AnimatedBackground'
import { setCachedFullscreenEnabled } from '../hooks/useTelegramWebApp'
import { themeColorsApi } from '../api/themeColors'
import { DEFAULT_THEME_COLORS, DEFAULT_ENABLED_THEMES, ThemeColors } from '../types/theme'
import { ThemeBentoPicker } from '../components/ThemeBentoPicker'
import { applyThemeColors } from '../hooks/useThemeColors'
import { updateEnabledThemesCache } from '../hooks/useTheme'

// Icons
const BackIcon = () => (
  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const CogIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
)

const WarningIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
)

const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
)

// Meta-categories for grouping
const META_CATEGORIES: Record<string, { label: string; emoji: string; categories: string[] }> = {
  payments: {
    label: 'Платежные системы',
    emoji: '💳',
    categories: ['PAYMENT', 'PAYMENT_VERIFICATION', 'YOOKASSA', 'CRYPTOBOT', 'HELEKET', 'PLATEGA', 'TRIBUTE', 'MULENPAY', 'PAL24', 'WATA', 'TELEGRAM'],
  },
  subscriptions: {
    label: 'Подписки и тарифы',
    emoji: '📅',
    categories: ['SUBSCRIPTIONS_CORE', 'SIMPLE_SUBSCRIPTION', 'PERIODS', 'SUBSCRIPTION_PRICES', 'TRAFFIC', 'TRAFFIC_PACKAGES', 'TRIAL', 'AUTOPAY'],
  },
  interface: {
    label: 'Интерфейс',
    emoji: '🎨',
    categories: ['INTERFACE', 'INTERFACE_BRANDING', 'INTERFACE_SUBSCRIPTION', 'CONNECT_BUTTON', 'MINIAPP', 'HAPP', 'SKIP', 'ADDITIONAL'],
  },
  notifications: {
    label: 'Уведомления',
    emoji: '🔔',
    categories: ['NOTIFICATIONS', 'ADMIN_NOTIFICATIONS', 'ADMIN_REPORTS'],
  },
  database: {
    label: 'База данных',
    emoji: '💾',
    categories: ['DATABASE', 'POSTGRES', 'SQLITE', 'REDIS'],
  },
  system: {
    label: 'Система',
    emoji: '⚙️',
    categories: ['CORE', 'REMNAWAVE', 'SERVER_STATUS', 'MONITORING', 'MAINTENANCE', 'BACKUP', 'VERSION', 'WEB_API', 'WEBHOOK', 'LOG', 'DEBUG', 'EXTERNAL_ADMIN'],
  },
  users: {
    label: 'Пользователи',
    emoji: '👥',
    categories: ['SUPPORT', 'LOCALIZATION', 'CHANNEL', 'TIMEZONE', 'REFERRAL', 'MODERATION'],
  },
}

// Setting translations (name + description) - comprehensive list
const SETTING_TRANSLATIONS: Record<string, { name: string; description: string }> = {
  // CORE
  BOT_USERNAME: { name: 'Username бота', description: 'Имя бота в Telegram' },
  // SUPPORT
  SUPPORT_USERNAME: { name: 'Username поддержки', description: 'Telegram @username поддержки' },
  SUPPORT_MENU_ENABLED: { name: 'Меню поддержки', description: 'Показывать раздел поддержки' },
  SUPPORT_SYSTEM_MODE: { name: 'Режим поддержки', description: 'tickets/contact/both' },
  MINIAPP_TICKETS_ENABLED: { name: 'Тикеты в MiniApp', description: 'Включить раздел тикетов в MiniApp' },
  MINIAPP_SUPPORT_TYPE: { name: 'Тип поддержки MiniApp', description: 'tickets - показать тикеты, profile - перейти в профиль бота, url - открыть внешнюю ссылку' },
  MINIAPP_SUPPORT_URL: { name: 'URL поддержки MiniApp', description: 'Внешняя ссылка для поддержки (только для type=url)' },
  SUPPORT_TICKET_SLA_ENABLED: { name: 'SLA', description: 'Контроль времени ответа' },
  SUPPORT_TICKET_SLA_MINUTES: { name: 'SLA (мин)', description: 'Время на ответ' },
  SUPPORT_TICKET_SLA_CHECK_INTERVAL_SECONDS: { name: 'Интервал SLA', description: 'Проверка просроченных (сек)' },
  SUPPORT_TICKET_SLA_REMINDER_COOLDOWN_MINUTES: { name: 'Кулдаун SLA', description: 'Мин. между напоминаниями' },
  SUPPORT_TOPUP_ENABLED: { name: 'Пополнение', description: 'Кнопка пополнения в поддержке' },
  // ADMIN NOTIFICATIONS
  ADMIN_NOTIFICATIONS_ENABLED: { name: 'Уведомления', description: 'Отправлять админам' },
  ADMIN_NOTIFICATIONS_CHAT_ID: { name: 'Chat ID', description: 'ID чата для уведомлений' },
  ADMIN_NOTIFICATIONS_TOPIC_ID: { name: 'Topic ID', description: 'ID топика' },
  ADMIN_NOTIFICATIONS_TICKET_TOPIC_ID: { name: 'Topic тикетов', description: 'ID топика тикетов' },
  // ADMIN REPORTS
  ADMIN_REPORTS_ENABLED: { name: 'Отчёты', description: 'Автоматические отчёты' },
  ADMIN_REPORTS_CHAT_ID: { name: 'Chat ID', description: 'ID чата отчётов' },
  ADMIN_REPORTS_TOPIC_ID: { name: 'Topic ID', description: 'ID топика отчётов' },
  ADMIN_REPORTS_SEND_TIME: { name: 'Время', description: 'Время отправки (HH:MM)' },
  // CHANNEL
  CHANNEL_SUB_ID: { name: 'ID канала', description: 'Telegram ID канала' },
  CHANNEL_LINK: { name: 'Ссылка', description: 'Ссылка на канал' },
  CHANNEL_IS_REQUIRED_SUB: { name: 'Обязательно', description: 'Требовать подписку' },
  // LOCALIZATION
  DEFAULT_LANGUAGE: { name: 'Язык', description: 'Язык по умолчанию' },
  AVAILABLE_LANGUAGES: { name: 'Языки', description: 'Доступные языки' },
  LANGUAGE_SELECTION_ENABLED: { name: 'Выбор языка', description: 'Разрешить выбор' },
  LOCALES_PATH: { name: 'Путь', description: 'Путь к локалям' },
  // TIMEZONE
  TIMEZONE: { name: 'Часовой пояс', description: 'Временная зона' },
  // SUBSCRIPTIONS
  DEFAULT_DEVICE_LIMIT: { name: 'Устройств', description: 'По умолчанию' },
  DEFAULT_TRAFFIC_LIMIT_GB: { name: 'Трафик (ГБ)', description: '0 = безлимит' },
  MAX_DEVICES_LIMIT: { name: 'Макс. устройств', description: 'Максимум' },
  PRICE_PER_DEVICE: { name: 'Цена/устройство', description: 'Доплата (коп.)' },
  DEVICES_SELECTION_ENABLED: { name: 'Выбор устройств', description: 'Разрешить выбор' },
  DEVICES_SELECTION_DISABLED_AMOUNT: { name: 'При откл. выборе', description: 'Кол-во устройств' },
  BASE_SUBSCRIPTION_PRICE: { name: 'Базовая цена', description: 'Стоимость (коп.)' },
  BASE_PROMO_GROUP_PERIOD_DISCOUNTS_ENABLED: { name: 'Скидки', description: 'На длинные периоды' },
  BASE_PROMO_GROUP_PERIOD_DISCOUNTS: { name: 'Настройка скидок', description: 'дни:процент' },
  SUBSCRIPTION_RENEWAL_BALANCE_THRESHOLD_KOPEKS: { name: 'Порог баланса', description: 'Для автопродления' },
  // SIMPLE SUBSCRIPTION
  SIMPLE_SUBSCRIPTION_ENABLED: { name: 'Быстрая покупка', description: 'Показывать кнопку' },
  SIMPLE_SUBSCRIPTION_PERIOD_DAYS: { name: 'Период (дней)', description: 'Длительность' },
  SIMPLE_SUBSCRIPTION_DEVICE_LIMIT: { name: 'Устройств', description: 'В быстрой покупке' },
  SIMPLE_SUBSCRIPTION_TRAFFIC_GB: { name: 'Трафик (ГБ)', description: '0 = безлимит' },
  SIMPLE_SUBSCRIPTION_SQUAD_UUID: { name: 'UUID сквада', description: 'Пусто = любой' },
  // PERIODS
  AVAILABLE_SUBSCRIPTION_PERIODS: { name: 'Периоды покупки', description: 'Дни через запятую' },
  AVAILABLE_RENEWAL_PERIODS: { name: 'Периоды продления', description: 'Дни через запятую' },
  // PRICES
  PRICE_14_DAYS: { name: 'Цена 14 дн', description: 'Копейки' },
  PRICE_30_DAYS: { name: 'Цена 30 дн', description: 'Копейки' },
  PRICE_60_DAYS: { name: 'Цена 60 дн', description: 'Копейки' },
  PRICE_90_DAYS: { name: 'Цена 90 дн', description: 'Копейки' },
  PRICE_180_DAYS: { name: 'Цена 180 дн', description: 'Копейки' },
  PRICE_360_DAYS: { name: 'Цена 360 дн', description: 'Копейки' },
  PAID_SUBSCRIPTION_USER_TAG: { name: 'Тег платного', description: 'Тег в RemnaWave' },
  // TRAFFIC
  DEFAULT_TRAFFIC_RESET_STRATEGY: { name: 'Сброс трафика', description: 'Стратегия обнуления' },
  RESET_TRAFFIC_ON_PAYMENT: { name: 'Сброс при оплате', description: 'Обнулять трафик' },
  TRAFFIC_SELECTION_MODE: { name: 'Режим выбора', description: 'Как выбирать трафик' },
  FIXED_TRAFFIC_LIMIT_GB: { name: 'Фикс. лимит', description: 'ГБ' },
  TRAFFIC_PACKAGES_CONFIG: { name: 'Пакеты', description: 'JSON конфиг' },
  PRICE_TRAFFIC_5GB: { name: '5 ГБ', description: 'Копейки' },
  PRICE_TRAFFIC_10GB: { name: '10 ГБ', description: 'Копейки' },
  PRICE_TRAFFIC_25GB: { name: '25 ГБ', description: 'Копейки' },
  PRICE_TRAFFIC_50GB: { name: '50 ГБ', description: 'Копейки' },
  PRICE_TRAFFIC_100GB: { name: '100 ГБ', description: 'Копейки' },
  PRICE_TRAFFIC_250GB: { name: '250 ГБ', description: 'Копейки' },
  PRICE_TRAFFIC_500GB: { name: '500 ГБ', description: 'Копейки' },
  PRICE_TRAFFIC_1000GB: { name: '1000 ГБ', description: 'Копейки' },
  PRICE_TRAFFIC_UNLIMITED: { name: 'Безлимит', description: 'Копейки' },
  // TRIAL
  TRIAL_DURATION_DAYS: { name: 'Дней триала', description: 'Длительность' },
  TRIAL_TRAFFIC_LIMIT_GB: { name: 'Трафик (ГБ)', description: 'В триале' },
  TRIAL_DEVICE_LIMIT: { name: 'Устройств', description: 'В триале' },
  TRIAL_ADD_REMAINING_DAYS_TO_PAID: { name: 'Перенос дней', description: 'К платной подписке' },
  TRIAL_PAYMENT_ENABLED: { name: 'Платный триал', description: 'Взимать плату' },
  TRIAL_ACTIVATION_PRICE: { name: 'Цена', description: 'Активация (коп.)' },
  TRIAL_USER_TAG: { name: 'Тег триала', description: 'Тег в RemnaWave' },
  TRIAL_WARNING_HOURS: { name: 'Предупреждение', description: 'За X часов' },
  // AUTOPAY
  AUTOPAY_WARNING_DAYS: { name: 'Дни уведомлений', description: 'Через запятую' },
  DEFAULT_AUTOPAY_ENABLED: { name: 'Автопродление', description: 'По умолчанию' },
  DEFAULT_AUTOPAY_DAYS_BEFORE: { name: 'Дней до', description: 'Когда продлять' },
  MIN_BALANCE_FOR_AUTOPAY_KOPEKS: { name: 'Мин. баланс', description: 'Для продления (коп.)' },
  // REFERRAL
  REFERRAL_PROGRAM_ENABLED: { name: 'Программа', description: 'Включить рефералку' },
  REFERRAL_MINIMUM_TOPUP_KOPEKS: { name: 'Мин. пополнение', description: 'Для бонуса (коп.)' },
  REFERRAL_FIRST_TOPUP_BONUS_KOPEKS: { name: 'Бонус новичку', description: 'Копейки' },
  REFERRAL_INVITER_BONUS_KOPEKS: { name: 'Бонус инвайтеру', description: 'Копейки' },
  REFERRAL_COMMISSION_PERCENT: { name: 'Комиссия %', description: 'От платежей' },
  REFERRAL_NOTIFICATIONS_ENABLED: { name: 'Уведомления', description: 'О бонусах' },
  // NOTIFICATIONS
  ENABLE_NOTIFICATIONS: { name: 'Уведомления', description: 'Пользователям' },
  NOTIFICATION_RETRY_ATTEMPTS: { name: 'Попыток', description: 'Отправки' },
  NOTIFICATION_CACHE_HOURS: { name: 'Кэш (ч)', description: 'Часов' },
  MONITORING_LOGS_RETENTION_DAYS: { name: 'Хранить логи', description: 'Дней' },
  // PAYMENT
  PAYMENT_SERVICE_NAME: { name: 'Название', description: 'В документах' },
  PAYMENT_BALANCE_DESCRIPTION: { name: 'Описание пополнения', description: 'В чеке' },
  PAYMENT_SUBSCRIPTION_DESCRIPTION: { name: 'Описание подписки', description: 'В чеке' },
  PAYMENT_BALANCE_TEMPLATE: { name: 'Шаблон', description: 'Пополнения' },
  PAYMENT_SUBSCRIPTION_TEMPLATE: { name: 'Шаблон', description: 'Подписки' },
  AUTO_PURCHASE_AFTER_TOPUP_ENABLED: { name: 'Автопокупка', description: 'После пополнения' },
  DISABLE_TOPUP_BUTTONS: { name: 'Скрыть', description: 'Кнопки пополнения' },
  DISABLE_WEB_PAGE_PREVIEW: { name: 'Без превью', description: 'Ссылок' },
  PAYMENT_VERIFICATION_AUTO_CHECK_ENABLED: { name: 'Автопроверка', description: 'Платежей' },
  PAYMENT_VERIFICATION_AUTO_CHECK_INTERVAL_MINUTES: { name: 'Интервал', description: 'Минут' },
  // TELEGRAM STARS
  TELEGRAM_STARS_ENABLED: { name: 'Stars', description: 'Принимать оплату' },
  TELEGRAM_STARS_RATE_RUB: { name: 'Курс', description: 'Рублей за Star' },
  // YOOKASSA
  YOOKASSA_ENABLED: { name: 'YooKassa', description: 'Включить' },
  YOOKASSA_SHOP_ID: { name: 'Shop ID', description: 'Идентификатор' },
  YOOKASSA_SECRET_KEY: { name: 'Секрет', description: 'Ключ API' },
  YOOKASSA_RETURN_URL: { name: 'URL возврата', description: 'После оплаты' },
  YOOKASSA_DEFAULT_RECEIPT_EMAIL: { name: 'Email чеков', description: 'По умолчанию' },
  YOOKASSA_VAT_CODE: { name: 'НДС', description: 'Код (1-6)' },
  YOOKASSA_SBP_ENABLED: { name: 'СБП', description: 'Оплата СБП' },
  YOOKASSA_PAYMENT_MODE: { name: 'Режим', description: 'Тип платежа' },
  YOOKASSA_PAYMENT_SUBJECT: { name: 'Предмет', description: 'Тип товара' },
  YOOKASSA_WEBHOOK_PATH: { name: 'Путь', description: 'Вебхука' },
  YOOKASSA_WEBHOOK_HOST: { name: 'Хост', description: 'Вебхука' },
  YOOKASSA_WEBHOOK_PORT: { name: 'Порт', description: 'Вебхука' },
  YOOKASSA_MIN_AMOUNT_KOPEKS: { name: 'Мин.', description: 'Копейки' },
  YOOKASSA_MAX_AMOUNT_KOPEKS: { name: 'Макс.', description: 'Копейки' },
  YOOKASSA_QUICK_AMOUNT_SELECTION_ENABLED: { name: 'Быстрый выбор', description: 'Суммы' },
  // CRYPTOBOT
  CRYPTOBOT_ENABLED: { name: 'CryptoBot', description: 'Включить' },
  CRYPTOBOT_API_TOKEN: { name: 'Токен', description: 'API' },
  CRYPTOBOT_WEBHOOK_SECRET: { name: 'Секрет', description: 'Вебхука' },
  CRYPTOBOT_BASE_URL: { name: 'URL', description: 'API' },
  CRYPTOBOT_TESTNET: { name: 'Тестнет', description: 'Тестовая сеть' },
  CRYPTOBOT_WEBHOOK_PATH: { name: 'Путь', description: 'Вебхука' },
  CRYPTOBOT_WEBHOOK_PORT: { name: 'Порт', description: 'Вебхука' },
  CRYPTOBOT_DEFAULT_ASSET: { name: 'Валюта', description: 'По умолчанию' },
  CRYPTOBOT_ASSETS: { name: 'Валюты', description: 'Через запятую' },
  CRYPTOBOT_INVOICE_EXPIRES_HOURS: { name: 'Срок (ч)', description: 'Инвойса' },
  // HELEKET
  HELEKET_ENABLED: { name: 'Heleket', description: 'Включить' },
  HELEKET_MERCHANT_ID: { name: 'Merchant ID', description: 'ID мерчанта' },
  HELEKET_API_KEY: { name: 'API Key', description: 'Ключ' },
  HELEKET_BASE_URL: { name: 'URL', description: 'API' },
  HELEKET_DEFAULT_CURRENCY: { name: 'Валюта', description: 'По умолчанию' },
  HELEKET_DEFAULT_NETWORK: { name: 'Сеть', description: 'По умолчанию' },
  HELEKET_INVOICE_LIFETIME: { name: 'Срок (сек)', description: 'Инвойса' },
  HELEKET_MARKUP_PERCENT: { name: 'Наценка %', description: 'Процент' },
  // PLATEGA
  PLATEGA_ENABLED: { name: 'Platega', description: 'Включить' },
  PLATEGA_MERCHANT_ID: { name: 'Merchant ID', description: 'ID' },
  PLATEGA_SECRET: { name: 'Секрет', description: 'Ключ' },
  PLATEGA_BASE_URL: { name: 'URL', description: 'API' },
  PLATEGA_RETURN_URL: { name: 'URL возврата', description: 'После оплаты' },
  PLATEGA_FAILED_URL: { name: 'URL ошибки', description: 'При ошибке' },
  PLATEGA_CURRENCY: { name: 'Валюта', description: 'Платежей' },
  PLATEGA_ACTIVE_METHODS: { name: 'Методы', description: 'ID через запятую' },
  PLATEGA_MIN_AMOUNT_KOPEKS: { name: 'Мин.', description: 'Копейки' },
  PLATEGA_MAX_AMOUNT_KOPEKS: { name: 'Макс.', description: 'Копейки' },
  // TRIBUTE
  TRIBUTE_ENABLED: { name: 'Tribute', description: 'Включить' },
  TRIBUTE_API_KEY: { name: 'API Key', description: 'Ключ' },
  TRIBUTE_DONATE_LINK: { name: 'Ссылка', description: 'На донат' },
  // MULENPAY
  MULENPAY_ENABLED: { name: 'MulenPay', description: 'Включить' },
  MULENPAY_API_KEY: { name: 'API Key', description: 'Ключ' },
  MULENPAY_SECRET_KEY: { name: 'Секрет', description: 'Ключ' },
  MULENPAY_SHOP_ID: { name: 'Shop ID', description: 'ID магазина' },
  MULENPAY_DISPLAY_NAME: { name: 'Название', description: 'Отображаемое' },
  MULENPAY_LANGUAGE: { name: 'Язык', description: 'Интерфейса' },
  MULENPAY_MIN_AMOUNT_KOPEKS: { name: 'Мин.', description: 'Копейки' },
  MULENPAY_MAX_AMOUNT_KOPEKS: { name: 'Макс.', description: 'Копейки' },
  // PAL24
  PAL24_ENABLED: { name: 'PAL24', description: 'Включить' },
  PAL24_API_TOKEN: { name: 'Токен', description: 'API' },
  PAL24_SHOP_ID: { name: 'Shop ID', description: 'ID' },
  PAL24_SIGNATURE_TOKEN: { name: 'Подпись', description: 'Токен' },
  PAL24_MIN_AMOUNT_KOPEKS: { name: 'Мин.', description: 'Копейки' },
  PAL24_MAX_AMOUNT_KOPEKS: { name: 'Макс.', description: 'Копейки' },
  PAL24_SBP_BUTTON_VISIBLE: { name: 'СБП', description: 'Показывать' },
  PAL24_CARD_BUTTON_VISIBLE: { name: 'Карта', description: 'Показывать' },
  // WATA
  WATA_ENABLED: { name: 'Wata', description: 'Включить' },
  WATA_ACCESS_TOKEN: { name: 'Токен', description: 'Доступа' },
  WATA_TERMINAL_PUBLIC_ID: { name: 'Terminal ID', description: 'Публичный ID' },
  WATA_PAYMENT_TYPE: { name: 'Тип', description: 'Платежа' },
  WATA_MIN_AMOUNT_KOPEKS: { name: 'Мин.', description: 'Копейки' },
  WATA_MAX_AMOUNT_KOPEKS: { name: 'Макс.', description: 'Копейки' },
  // EXTERNAL ADMIN
  EXTERNAL_ADMIN_TOKEN: { name: 'Токен', description: 'Только чтение' },
  EXTERNAL_ADMIN_TOKEN_BOT_ID: { name: 'ID бота', description: 'Связанного' },
  // INTERFACE
  MAIN_MENU_MODE: { name: 'Режим меню', description: 'default/text' },
  ENABLE_LOGO_MODE: { name: 'Логотип', description: 'В сообщениях' },
  LOGO_FILE: { name: 'Файл', description: 'Логотипа' },
  HIDE_SUBSCRIPTION_LINK: { name: 'Скрыть ссылку', description: 'На подписку' },
  CONNECT_BUTTON_MODE: { name: 'Подключение', description: 'Режим кнопки' },
  CONNECT_BUTTON_HAPP_DOWNLOAD_ENABLED: { name: 'Happ', description: 'Кнопка скачивания' },
  // MINIAPP
  MINIAPP_CUSTOM_URL: { name: 'URL', description: 'Mini App' },
  MINIAPP_STATIC_PATH: { name: 'Статика', description: 'Путь' },
  MINIAPP_PURCHASE_URL: { name: 'URL покупки', description: 'Страница' },
  MINIAPP_SERVICE_NAME_EN: { name: 'Название EN', description: 'Английское' },
  MINIAPP_SERVICE_NAME_RU: { name: 'Название RU', description: 'Русское' },
  // HAPP
  HAPP_DOWNLOAD_LINK_IOS: { name: 'iOS', description: 'Ссылка' },
  HAPP_DOWNLOAD_LINK_ANDROID: { name: 'Android', description: 'Ссылка' },
  HAPP_DOWNLOAD_LINK_MACOS: { name: 'macOS', description: 'Ссылка' },
  HAPP_DOWNLOAD_LINK_WINDOWS: { name: 'Windows', description: 'Ссылка' },
  // SKIP
  SKIP_RULES_ACCEPT: { name: 'Пропуск правил', description: 'Не показывать' },
  SKIP_REFERRAL_CODE: { name: 'Пропуск кода', description: 'Реферального' },
  // ADDITIONAL
  APP_CONFIG_PATH: { name: 'app-config', description: 'Путь' },
  ENABLE_DEEP_LINKS: { name: 'Deep Links', description: 'Включить' },
  APP_CONFIG_CACHE_TTL: { name: 'TTL кэша', description: 'Секунд' },
  // DATABASE
  DATABASE_MODE: { name: 'Режим БД', description: 'auto/postgresql/sqlite' },
  DATABASE_URL: { name: 'URL', description: 'Подключения' },
  POSTGRES_HOST: { name: 'Хост', description: 'PostgreSQL' },
  POSTGRES_PORT: { name: 'Порт', description: 'PostgreSQL' },
  POSTGRES_DB: { name: 'База', description: 'Имя' },
  POSTGRES_USER: { name: 'Пользователь', description: 'Логин' },
  POSTGRES_PASSWORD: { name: 'Пароль', description: 'PostgreSQL' },
  SQLITE_PATH: { name: 'Путь', description: 'SQLite' },
  REDIS_URL: { name: 'URL', description: 'Redis' },
  // REMNAWAVE
  REMNAWAVE_API_URL: { name: 'URL панели', description: 'Адрес' },
  REMNAWAVE_API_KEY: { name: 'API Key', description: 'Ключ' },
  REMNAWAVE_SECRET_KEY: { name: 'Секрет', description: 'Ключ' },
  REMNAWAVE_USERNAME: { name: 'Логин', description: 'Basic auth' },
  REMNAWAVE_PASSWORD: { name: 'Пароль', description: 'Basic auth' },
  REMNAWAVE_AUTH_TYPE: { name: 'Тип авторизации', description: 'api_key/basic_auth' },
  REMNAWAVE_USER_DESCRIPTION_TEMPLATE: { name: 'Шаблон описания', description: 'Пользователя' },
  REMNAWAVE_USER_USERNAME_TEMPLATE: { name: 'Шаблон username', description: 'Пользователя' },
  REMNAWAVE_USER_DELETE_MODE: { name: 'Режим удаления', description: 'delete/disable' },
  REMNAWAVE_AUTO_SYNC_ENABLED: { name: 'Автосинхр.', description: 'Включить' },
  REMNAWAVE_AUTO_SYNC_TIMES: { name: 'Время', description: 'Синхронизации (HH:MM)' },
  // SERVER STATUS
  SERVER_STATUS_MODE: { name: 'Режим', description: 'Статуса серверов' },
  SERVER_STATUS_EXTERNAL_URL: { name: 'URL', description: 'Внешний' },
  SERVER_STATUS_METRICS_URL: { name: 'Метрики', description: 'URL' },
  // MONITORING
  MONITORING_INTERVAL: { name: 'Интервал', description: 'Секунд' },
  TRAFFIC_MONITORING_ENABLED: { name: 'Мониторинг', description: 'Трафика' },
  TRAFFIC_THRESHOLD_GB_PER_DAY: { name: 'Порог', description: 'ГБ/день' },
  // MAINTENANCE
  MAINTENANCE_MODE: { name: 'Обслуживание', description: 'Включить' },
  MAINTENANCE_MESSAGE: { name: 'Сообщение', description: 'Текст' },
  MAINTENANCE_CHECK_INTERVAL: { name: 'Интервал', description: 'Секунд' },
  MAINTENANCE_AUTO_ENABLE: { name: 'Авто', description: 'Включение' },
  MAINTENANCE_MONITORING_ENABLED: { name: 'Мониторинг', description: 'Панели' },
  MAINTENANCE_RETRY_ATTEMPTS: { name: 'Попыток', description: 'Перед включением' },
  INACTIVE_USER_DELETE_MONTHS: { name: 'Удаление', description: 'Через X месяцев' },
  // BACKUP
  BACKUP_AUTO_ENABLED: { name: 'Автобэкап', description: 'Включить' },
  BACKUP_INTERVAL_HOURS: { name: 'Интервал', description: 'Часов' },
  BACKUP_TIME: { name: 'Время', description: 'Создания' },
  BACKUP_MAX_KEEP: { name: 'Хранить', description: 'Копий' },
  BACKUP_COMPRESSION: { name: 'Сжатие', description: 'Включить' },
  BACKUP_INCLUDE_LOGS: { name: 'Логи', description: 'Включать' },
  BACKUP_LOCATION: { name: 'Путь', description: 'Сохранения' },
  BACKUP_SEND_ENABLED: { name: 'Отправка', description: 'В Telegram' },
  BACKUP_SEND_CHAT_ID: { name: 'Chat ID', description: 'Для отправки' },
  // VERSION
  VERSION_CHECK_ENABLED: { name: 'Проверка', description: 'Обновлений' },
  VERSION_CHECK_REPO: { name: 'Репозиторий', description: 'GitHub' },
  VERSION_CHECK_INTERVAL_HOURS: { name: 'Интервал', description: 'Часов' },
  // WEB API
  WEB_API_ENABLED: { name: 'Web API', description: 'Включить' },
  WEB_API_HOST: { name: 'Хост', description: 'IP' },
  WEB_API_PORT: { name: 'Порт', description: 'API' },
  WEB_API_WORKERS: { name: 'Воркеров', description: 'Количество' },
  WEB_API_ALLOWED_ORIGINS: { name: 'CORS', description: 'Origins' },
  WEB_API_DOCS_ENABLED: { name: 'Документация', description: 'Swagger' },
  WEB_API_DEFAULT_TOKEN: { name: 'Токен', description: 'По умолчанию' },
  WEB_API_REQUEST_LOGGING: { name: 'Логирование', description: 'Запросов' },
  // WEBHOOK
  WEBHOOK_URL: { name: 'URL', description: 'Вебхука' },
  WEBHOOK_PATH: { name: 'Путь', description: 'Вебхука' },
  WEBHOOK_SECRET_TOKEN: { name: 'Секрет', description: 'Токен' },
  BOT_RUN_MODE: { name: 'Режим', description: 'polling/webhook' },
  // LOG
  LOG_LEVEL: { name: 'Уровень', description: 'Логирования' },
  LOG_FILE: { name: 'Файл', description: 'Логов' },
  // DEBUG
  DEBUG: { name: 'Отладка', description: 'Включить' },
  // MODERATION
  DISPLAY_NAME_BANNED_KEYWORDS: { name: 'Запрещённые', description: 'Слова в именах' },
  // CONTESTS
  CONTESTS_ENABLED: { name: 'Конкурсы', description: 'Включить' },
  CONTESTS_BUTTON_VISIBLE: { name: 'Кнопка', description: 'Конкурсов' },
  // CABINET
  CABINET_ENABLED: { name: 'Кабинет', description: 'Веб-кабинет' },
  CABINET_JWT_SECRET: { name: 'JWT секрет', description: 'Ключ' },
}

// Extract emoji from label
const extractEmoji = (label: string): { emoji: string; text: string } => {
  const emojiMatch = label.match(/^(\p{Emoji})/u)
  if (emojiMatch) {
    return { emoji: emojiMatch[1], text: label.slice(emojiMatch[1].length).trim() }
  }
  return { emoji: '⚙️', text: label }
}

// Get translated setting name and description
const getSettingTranslation = (key: string, originalName: string) => {
  const translation = SETTING_TRANSLATIONS[key]
  return {
    name: translation?.name || originalName,
    description: translation?.description || '',
  }
}

interface SettingRowProps {
  setting: SettingDefinition
  onUpdate: (key: string, value: unknown) => void
  onReset: (key: string) => void
  isUpdating: boolean
}

function SettingRow({ setting, onUpdate, onReset, isUpdating }: SettingRowProps) {
  const { t } = useTranslation()
  const [editValue, setEditValue] = useState<string>(
    setting.current !== null && setting.current !== undefined ? String(setting.current) : ''
  )
  const [isEditing, setIsEditing] = useState(false)

  const translation = getSettingTranslation(setting.key, setting.name)

  const handleSave = () => {
    let valueToSave: unknown = editValue

    if (setting.type === 'bool') {
      valueToSave = editValue === 'true'
    } else if (setting.type === 'int') {
      valueToSave = parseInt(editValue, 10)
    } else if (setting.type === 'float') {
      valueToSave = parseFloat(editValue)
    }

    onUpdate(setting.key, valueToSave)
    setIsEditing(false)
  }

  const handleReset = () => {
    onReset(setting.key)
    setEditValue(setting.original !== null && setting.original !== undefined ? String(setting.original) : '')
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no')
    return String(value)
  }

  const renderInput = () => {
    if (setting.read_only) {
      return (
        <div className="flex items-center gap-2 text-dark-400 text-sm">
          <LockIcon />
          <span className="font-mono text-xs break-all">{formatValue(setting.current)}</span>
        </div>
      )
    }

    if (setting.choices && setting.choices.length > 0) {
      return (
        <select
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value)
            let valueToSave: unknown = e.target.value
            if (setting.type === 'bool') {
              valueToSave = e.target.value === 'true'
            } else if (setting.type === 'int') {
              valueToSave = parseInt(e.target.value, 10)
            }
            onUpdate(setting.key, valueToSave)
          }}
          className="input py-1.5 text-sm w-full"
          disabled={isUpdating}
        >
          {setting.choices.map((choice) => (
            <option key={String(choice.value)} value={String(choice.value)}>
              {choice.label}
            </option>
          ))}
        </select>
      )
    }

    if (setting.type === 'bool') {
      return (
        <button
          onClick={() => onUpdate(setting.key, setting.current !== true)}
          disabled={isUpdating}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            setting.current === true ? 'bg-accent-500' : 'bg-dark-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              setting.current === true ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      )
    }

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <input
            type={setting.type === 'int' || setting.type === 'float' ? 'number' : 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="input py-1.5 text-sm flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') {
                setIsEditing(false)
                setEditValue(String(setting.current ?? ''))
              }
            }}
          />
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="p-1.5 bg-accent-500 hover:bg-accent-600 rounded text-white shrink-0"
          >
            <CheckIcon />
          </button>
        </div>
      )
    }

    return (
      <button
        onClick={() => setIsEditing(true)}
        className="text-left px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded text-sm font-mono w-full transition-colors truncate"
        title={formatValue(setting.current)}
      >
        {formatValue(setting.current)}
      </button>
    )
  }

  return (
    <div className="py-3 border-b border-dark-700/30 last:border-b-0">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-dark-100">{translation.name}</span>
            {setting.has_override && (
              <span className="text-[10px] bg-accent-500/20 text-accent-400 px-1.5 py-0.5 rounded">
                {t('admin.settings.modified')}
              </span>
            )}
            {setting.read_only && (
              <span className="text-[10px] bg-dark-600 text-dark-400 px-1.5 py-0.5 rounded">
                {t('admin.settings.readOnly')}
              </span>
            )}
          </div>
          {translation.description && (
            <p className="text-xs text-dark-400 mt-0.5">{translation.description}</p>
          )}
        </div>

        {setting.has_override && !setting.read_only && (
          <button
            onClick={handleReset}
            disabled={isUpdating}
            className="p-1.5 text-dark-500 hover:text-dark-200 hover:bg-dark-700 rounded transition-colors shrink-0"
            title={t('admin.settings.reset')}
          >
            <RefreshIcon />
          </button>
        )}
      </div>

      <div>{renderInput()}</div>

      {/* Warning from hint */}
      {setting.hint?.warning && (
        <div className="flex items-start gap-2 mt-2 text-xs text-warning-400">
          <WarningIcon />
          <p>{setting.hint.warning}</p>
        </div>
      )}
    </div>
  )
}

interface MetaCategoryCardProps {
  metaKey: string
  meta: { label: string; emoji: string; categories: string[] }
  categoriesData: SettingCategorySummary[]
  settingsCount: number
  onClick: () => void
}

function MetaCategoryCard({ meta, categoriesData, settingsCount, onClick }: MetaCategoryCardProps) {
  return (
    <button
      onClick={onClick}
      className="card p-4 text-left hover:bg-dark-800/50 transition-all hover:scale-[1.02] group"
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-dark-100 group-hover:text-accent-400 transition-colors">
            {meta.label}
          </h3>
          <p className="text-xs text-dark-500 mt-1">
            {categoriesData.length} разделов / {settingsCount} настроек
          </p>
        </div>
        <ChevronRightIcon />
      </div>
    </button>
  )
}

interface SettingsModalProps {
  metaKey: string
  meta: { label: string; emoji: string; categories: string[] }
  categories: SettingCategorySummary[]
  allSettings: SettingDefinition[]
  onClose: () => void
  onUpdate: (key: string, value: unknown) => void
  onReset: (key: string) => void
  isUpdating: boolean
}

function SettingsModal({ meta, categories, allSettings, onClose, onUpdate, onReset, isUpdating }: SettingsModalProps) {
  const { t } = useTranslation()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set([categories[0]?.key]))
  const [searchQuery, setSearchQuery] = useState('')

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Group settings by category
  const settingsByCategory = useMemo(() => {
    const result: Record<string, SettingDefinition[]> = {}
    for (const category of categories) {
      const categorySettings = allSettings.filter((s) => s.category.key === category.key)

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const filtered = categorySettings.filter((s) => {
          const translation = getSettingTranslation(s.key, s.name)
          return (
            translation.name.toLowerCase().includes(query) ||
            translation.description.toLowerCase().includes(query) ||
            s.key.toLowerCase().includes(query) ||
            String(s.current).toLowerCase().includes(query)
          )
        })
        if (filtered.length > 0) {
          result[category.key] = filtered
        }
      } else {
        if (categorySettings.length > 0) {
          result[category.key] = categorySettings
        }
      }
    }
    return result
  }, [categories, allSettings, searchQuery])

  // Auto-expand when searching
  useMemo(() => {
    if (searchQuery) {
      setExpandedCategories(new Set(Object.keys(settingsByCategory)))
    }
  }, [searchQuery, settingsByCategory])

  const totalFiltered = Object.values(settingsByCategory).reduce((acc, arr) => acc + arr.length, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] bg-dark-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{meta.emoji}</span>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">{meta.label}</h2>
              <p className="text-xs text-dark-400">{totalFiltered} настроек</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-dark-700/50 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('admin.settings.searchPlaceholder')}
              className="input w-full pl-10 py-2"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none">
              <SearchIcon />
            </div>
          </div>
        </div>

        {/* Categories with settings */}
        <div className="flex-1 overflow-y-auto">
          {Object.keys(settingsByCategory).length > 0 ? (
            categories
              .filter((cat) => settingsByCategory[cat.key])
              .map((category) => {
                const { emoji, text } = extractEmoji(category.label)
                const isExpanded = expandedCategories.has(category.key)
                const categorySettings = settingsByCategory[category.key] || []

                return (
                  <div key={category.key} className="border-b border-dark-700/30">
                    <button
                      onClick={() => toggleCategory(category.key)}
                      className="w-full flex items-center justify-between p-4 hover:bg-dark-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <span className="text-sm font-medium text-dark-200">{text}</span>
                        <span className="text-xs text-dark-500 bg-dark-700 px-1.5 py-0.5 rounded">
                          {categorySettings.length}
                        </span>
                      </div>
                      <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDownIcon />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4">
                        {categorySettings.map((setting) => (
                          <SettingRow
                            key={setting.key}
                            setting={setting}
                            onUpdate={onUpdate}
                            onReset={onReset}
                            isUpdating={isUpdating}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
          ) : (
            <div className="text-center py-12 text-dark-400">
              {t('admin.settings.noSearchResults')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-700/50 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors text-dark-200"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Icons for theme toggle
const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
)

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
)

export default function AdminSettings() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedMeta, setSelectedMeta] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [localColors, setLocalColors] = useState<ThemeColors | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Branding query and mutations
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
  })

  // Animation toggle query and mutation
  const { data: animationSettings } = useQuery({
    queryKey: ['animation-enabled'],
    queryFn: brandingApi.getAnimationEnabled,
  })

  const updateAnimationMutation = useMutation({
    mutationFn: (enabled: boolean) => brandingApi.updateAnimationEnabled(enabled),
    onSuccess: (data) => {
      // Update local cache immediately for instant effect
      setCachedAnimationEnabled(data.enabled)
      queryClient.invalidateQueries({ queryKey: ['animation-enabled'] })
    },
  })

  // Fullscreen toggle query and mutation
  const { data: fullscreenSettings } = useQuery({
    queryKey: ['fullscreen-enabled'],
    queryFn: brandingApi.getFullscreenEnabled,
  })

  const updateFullscreenMutation = useMutation({
    mutationFn: (enabled: boolean) => brandingApi.updateFullscreenEnabled(enabled),
    onSuccess: (data) => {
      // Update local cache immediately for instant effect
      setCachedFullscreenEnabled(data.enabled)
      queryClient.invalidateQueries({ queryKey: ['fullscreen-enabled'] })
    },
  })

  const updateNameMutation = useMutation({
    mutationFn: (name: string) => brandingApi.updateName(name),
    onSuccess: (data) => {
      setCachedBranding(data) // Update cache immediately
      queryClient.invalidateQueries({ queryKey: ['branding'] })
      setEditingName(false)
    },
  })

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => brandingApi.uploadLogo(file),
    onSuccess: (data) => {
      setCachedBranding(data) // Update cache immediately
      queryClient.invalidateQueries({ queryKey: ['branding'] })
    },
  })

  const deleteLogoMutation = useMutation({
    mutationFn: () => brandingApi.deleteLogo(),
    onSuccess: (data) => {
      setCachedBranding(data) // Update cache immediately
      queryClient.invalidateQueries({ queryKey: ['branding'] })
    },
  })

  // Theme colors query and mutations
  const { data: themeColors } = useQuery({
    queryKey: ['theme-colors'],
    queryFn: themeColorsApi.getColors,
  })

  const updateColorsMutation = useMutation({
    mutationFn: themeColorsApi.updateColors,
    onSuccess: (data) => {
      // Apply colors immediately after successful update
      applyThemeColors(data)
      queryClient.invalidateQueries({ queryKey: ['theme-colors'] })
    },
  })

  const resetColorsMutation = useMutation({
    mutationFn: themeColorsApi.resetColors,
    onSuccess: (data) => {
      // Apply default colors immediately
      applyThemeColors(data)
      queryClient.invalidateQueries({ queryKey: ['theme-colors'] })
    },
  })

  // Enabled themes query and mutation
  const { data: enabledThemes } = useQuery({
    queryKey: ['enabled-themes'],
    queryFn: themeColorsApi.getEnabledThemes,
  })

  const updateEnabledThemesMutation = useMutation({
    mutationFn: themeColorsApi.updateEnabledThemes,
    onSuccess: (data) => {
      // Update localStorage cache so useTheme hook picks up changes immediately
      updateEnabledThemesCache(data)
      queryClient.invalidateQueries({ queryKey: ['enabled-themes'] })
    },
  })

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadLogoMutation.mutate(file)
    }
    // Reset input so same file can be uploaded again
    e.target.value = ''
  }

  const handleNameSave = () => {
    // Allow empty name (logo-only mode)
    updateNameMutation.mutate(newName.trim())
  }

  const startEditingName = () => {
    setNewName(branding?.name || '')
    setEditingName(true)
  }

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin-settings-categories'],
    queryFn: adminSettingsApi.getCategories,
  })

  const { data: allSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminSettingsApi.getSettings(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      adminSettingsApi.updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
    },
  })

  const resetMutation = useMutation({
    mutationFn: (key: string) => adminSettingsApi.resetSetting(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
    },
  })

  const handleUpdate = (key: string, value: unknown) => {
    updateMutation.mutate({ key, value })
  }

  const handleReset = (key: string) => {
    resetMutation.mutate(key)
  }

  // Group categories by meta-category
  const metaCategoriesData = useMemo(() => {
    if (!categories || !allSettings) return null

    const result: Record<string, { categories: SettingCategorySummary[]; settingsCount: number }> = {}

    for (const [metaKey, meta] of Object.entries(META_CATEGORIES)) {
      const metaCategories = categories.filter((c) => meta.categories.includes(c.key))
      const settingsCount = allSettings.filter((s) => meta.categories.includes(s.category.key)).length

      if (metaCategories.length > 0) {
        result[metaKey] = { categories: metaCategories, settingsCount }
      }
    }

    // Add "Other" for uncategorized
    const allMetaCategories = Object.values(META_CATEGORIES).flatMap((m) => m.categories)
    const otherCategories = categories.filter((c) => !allMetaCategories.includes(c.key))
    if (otherCategories.length > 0) {
      const settingsCount = allSettings.filter(
        (s) => !allMetaCategories.includes(s.category.key)
      ).length
      result['other'] = { categories: otherCategories, settingsCount }
    }

    return result
  }, [categories, allSettings])

  // Filter meta-categories by search
  const filteredMetaCategories = useMemo(() => {
    if (!metaCategoriesData) return null
    if (!searchQuery.trim()) return metaCategoriesData

    const query = searchQuery.toLowerCase()
    const result: Record<string, { categories: SettingCategorySummary[]; settingsCount: number }> = {}

    for (const [metaKey, data] of Object.entries(metaCategoriesData)) {
      const meta = META_CATEGORIES[metaKey] || { label: 'Другое', emoji: '📁', categories: [] }
      if (
        meta.label.toLowerCase().includes(query) ||
        data.categories.some((c) => c.label.toLowerCase().includes(query))
      ) {
        result[metaKey] = data
      }
    }

    return result
  }, [metaCategoriesData, searchQuery])

  if (categoriesLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-10 h-10 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalSettings = allSettings?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 border border-dark-700 hover:border-dark-600 transition-colors"
        >
          <BackIcon />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-dark-50">{t('admin.settings.title')}</h1>
          <p className="text-sm text-dark-400">
            {Object.keys(filteredMetaCategories || {}).length} групп / {totalSettings} настроек
          </p>
        </div>
      </div>

      {/* Branding Card */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🎨</span>
          <h2 className="text-lg font-semibold text-dark-100">Брендинг</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center overflow-hidden shadow-xl shadow-accent-500/20">
              {branding?.has_custom_logo && branding.logo_url ? (
                <img
                  src={brandingApi.getLogoUrl(branding) || ''}
                  alt="Логотип"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-3xl">
                  {branding?.logo_letter || 'C'}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLogoMutation.isPending}
                className="btn-secondary text-xs px-3 py-1.5"
                title="Загрузить логотип"
              >
                {uploadLogoMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-dark-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadIcon />
                )}
              </button>
              {branding?.has_custom_logo && (
                <button
                  onClick={() => deleteLogoMutation.mutate()}
                  disabled={deleteLogoMutation.isPending}
                  className="btn-danger text-xs px-3 py-1.5"
                  title="Удалить логотип"
                >
                  {deleteLogoMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-error-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <TrashIcon />
                  )}
                </button>
              )}
            </div>
            <p className="text-xs text-dark-500">PNG, JPG, WebP, SVG до 2МБ</p>
          </div>

          {/* Name Section */}
          <div className="flex-1">
            <label className="label">Название проекта</label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input flex-1"
                  placeholder="Оставьте пустым для режима только логотип"
                  maxLength={50}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                />
                <button
                  onClick={handleNameSave}
                  disabled={updateNameMutation.isPending}
                  className="btn-primary"
                >
                  {updateNameMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckIcon />
                  )}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="btn-secondary"
                >
                  <CloseIcon />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {branding?.name ? (
                  <span className="text-lg font-medium text-dark-100">
                    {branding.name}
                  </span>
                ) : (
                  <span className="text-lg font-medium text-dark-500 italic">
                    Только логотип
                  </span>
                )}
                <button
                  onClick={startEditingName}
                  className="p-1.5 text-dark-500 hover:text-dark-200 hover:bg-dark-700 rounded transition-colors"
                  title="Редактировать"
                >
                  <PencilIcon />
                </button>
                {branding?.name && (
                  <button
                    onClick={() => updateNameMutation.mutate('')}
                    disabled={updateNameMutation.isPending}
                    className="p-1.5 text-dark-500 hover:text-error-400 hover:bg-dark-700 rounded transition-colors"
                    title="Убрать название"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-dark-500 mt-2">
              Оставьте пустым, чтобы показывать только логотип
            </p>
          </div>
        </div>

        {/* Animation Toggle */}
        <div className="mt-6 pt-6 border-t border-dark-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-dark-200">Анимированный фон</h3>
              <p className="text-xs text-dark-500 mt-0.5">
                Волновая анимация на фоне для всех пользователей
              </p>
            </div>
            <button
              onClick={() => updateAnimationMutation.mutate(!(animationSettings?.enabled ?? true))}
              disabled={updateAnimationMutation.isPending}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                (animationSettings?.enabled ?? true) ? 'bg-accent-500' : 'bg-dark-600'
              } ${updateAnimationMutation.isPending ? 'opacity-50' : ''}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                (animationSettings?.enabled ?? true) ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Fullscreen Toggle */}
        <div className="mt-4 pt-4 border-t border-dark-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-dark-200">Авто-Fullscreen</h3>
              <p className="text-xs text-dark-500 mt-0.5">
                Автоматически открывать на полный экран в Telegram
              </p>
            </div>
            <button
              onClick={() => updateFullscreenMutation.mutate(!(fullscreenSettings?.enabled ?? false))}
              disabled={updateFullscreenMutation.isPending}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                (fullscreenSettings?.enabled ?? false) ? 'bg-accent-500' : 'bg-dark-600'
              } ${updateFullscreenMutation.isPending ? 'opacity-50' : ''}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                (fullscreenSettings?.enabled ?? false) ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Theme Colors Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <h2 className="text-lg font-semibold text-dark-100">{t('theme.colors')}</h2>
          </div>
          <button
            onClick={() => resetColorsMutation.mutate()}
            disabled={resetColorsMutation.isPending}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {resetColorsMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-dark-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              t('theme.reset')
            )}
          </button>
        </div>

        <div className="space-y-6">
          {/* Theme Availability Toggles */}
          <div className="pb-6 border-b border-dark-700/50">
            <label className="label mb-3">Доступные темы</label>
            <div className="space-y-3">
              {/* Dark Theme Toggle */}
              <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl border border-dark-700">
                <div className="flex items-center gap-3">
                  <MoonIcon />
                  <div>
                    <span className="font-medium text-dark-200">Тёмная тема</span>
                    <p className="text-xs text-dark-500">Тёмное оформление интерфейса</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const currentDark = enabledThemes?.dark ?? DEFAULT_ENABLED_THEMES.dark
                    const currentLight = enabledThemes?.light ?? DEFAULT_ENABLED_THEMES.light
                    // Prevent disabling if it's the only enabled theme
                    if (currentDark && !currentLight) return
                    updateEnabledThemesMutation.mutate({ dark: !currentDark })
                  }}
                  disabled={updateEnabledThemesMutation.isPending}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    (enabledThemes?.dark ?? DEFAULT_ENABLED_THEMES.dark) ? 'bg-accent-500' : 'bg-dark-600'
                  } ${updateEnabledThemesMutation.isPending ? 'opacity-50' : ''}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    (enabledThemes?.dark ?? DEFAULT_ENABLED_THEMES.dark) ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Light Theme Toggle */}
              <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl border border-dark-700">
                <div className="flex items-center gap-3">
                  <SunIcon />
                  <div>
                    <span className="font-medium text-dark-200">Светлая тема</span>
                    <p className="text-xs text-dark-500">Светлое оформление интерфейса</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const currentDark = enabledThemes?.dark ?? DEFAULT_ENABLED_THEMES.dark
                    const currentLight = enabledThemes?.light ?? DEFAULT_ENABLED_THEMES.light
                    // Prevent disabling if it's the only enabled theme
                    if (currentLight && !currentDark) return
                    updateEnabledThemesMutation.mutate({ light: !currentLight })
                  }}
                  disabled={updateEnabledThemesMutation.isPending}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    (enabledThemes?.light ?? DEFAULT_ENABLED_THEMES.light) ? 'bg-accent-500' : 'bg-dark-600'
                  } ${updateEnabledThemesMutation.isPending ? 'opacity-50' : ''}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    (enabledThemes?.light ?? DEFAULT_ENABLED_THEMES.light) ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>
            <p className="text-xs text-dark-500 mt-2">
              Включите нужные темы для пользователей. Минимум одна тема должна быть активна.
            </p>
          </div>

          <ThemeBentoPicker
            currentColors={localColors || themeColors || DEFAULT_THEME_COLORS}
            onColorsChange={(colors) => setLocalColors(colors)}
            onSave={() => {
              if (localColors) {
                updateColorsMutation.mutate(localColors)
                setLocalColors(null)
              }
            }}
            isSaving={updateColorsMutation.isPending}
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('admin.settings.searchCategoriesPlaceholder')}
          className="input w-full pl-10"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none">
          <SearchIcon />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Meta-category Cards Grid */}
      {filteredMetaCategories && Object.keys(filteredMetaCategories).length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(filteredMetaCategories).map(([metaKey, data]) => {
            const meta = META_CATEGORIES[metaKey] || { label: 'Другое', emoji: '📁', categories: [] }
            return (
              <MetaCategoryCard
                key={metaKey}
                metaKey={metaKey}
                meta={meta}
                categoriesData={data.categories}
                settingsCount={data.settingsCount}
                onClick={() => setSelectedMeta(metaKey)}
              />
            )
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="flex justify-center mb-4 text-dark-500">
            <CogIcon />
          </div>
          <p className="text-dark-400">
            {searchQuery ? t('admin.settings.noSearchResults') : t('admin.settings.noSettings')}
          </p>
        </div>
      )}

      {/* Settings Modal */}
      {selectedMeta && metaCategoriesData && metaCategoriesData[selectedMeta] && (
        <SettingsModal
          metaKey={selectedMeta}
          meta={META_CATEGORIES[selectedMeta] || { label: 'Другое', emoji: '📁', categories: [] }}
          categories={metaCategoriesData[selectedMeta].categories}
          allSettings={allSettings || []}
          onClose={() => setSelectedMeta(null)}
          onUpdate={handleUpdate}
          onReset={handleReset}
          isUpdating={updateMutation.isPending || resetMutation.isPending}
        />
      )}
    </div>
  )
}
