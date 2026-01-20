# Bento Grids Refactor

> **Ветка:** `bento-grids`
> **Статус:** В работе
> **Последнее обновление:** 2026-01-20

## Референс

- **Стиль:** Bento Grids (карточки разных размеров в сетке)
- **Цветовая схема:** Зеленый неон на темном фоне, чистота
- **Шрифт:** Manrope (современный гротеск, заменён с Urbanist)
- **Скругления:** Крупные (24-32px)

---

## План рефакторинга

### Этап 1: Фундамент (Vibe Check)
> Цель: Пустая страница уже выглядит "секси"

| # | Задача | Статус | Заметки |
|---|--------|--------|---------|
| 1.1 | Подключить Urbanist шрифт | `[x]` | Google Fonts, заменить Inter |
| 1.2 | Tailwind: bento radius/spacing | `[x]` | `rounded-bento`, `rounded-4xl`, `spacing.bento` |
| 1.3 | globals.css: CSS переменные Bento | `[x]` | `--bento-radius`, `--bento-gap`, `--bento-padding` |

**Файлы:**
- `src/styles/globals.css`
- `tailwind.config.js`

---

### Этап 2: Атом (BentoCard)
> Цель: Один идеальный компонент-карточка

| # | Задача | Статус | Заметки |
|---|--------|--------|---------|
| 2.1 | Создать BentoCard компонент | `[x]` | С вариантами размеров |
| 2.2 | Обновить .card в globals.css | `[x]` | Новые классы .bento-card, .bento-card-hover, .bento-card-glow |

**Файлы:**
- `src/components/ui/BentoCard.tsx` (новый)
- `src/styles/globals.css`

**API компонента:**
```tsx
type BentoSize = 'sm' | 'md' | 'lg' | 'xl' // 1x1, 2x1, 1x2, 2x2

interface BentoCardProps {
  size?: BentoSize
  children: React.ReactNode
  className?: string
  hover?: boolean
  as?: 'div' | 'Link' | 'button'
}
```

---

### Этап 3: Скелет (Floating TabBar)
> Цель: Bottom navigation как "парящий остров"

| # | Задача | Статус | Заметки |
|---|--------|--------|---------|
| 3.1 | Floating island стиль | `[x]` | margin 16px от краев, shadow |
| 3.2 | Active state с pill | `[x]` | rounded-2xl фон под активной иконкой |
| 3.3 | Убрать border-top | `[x]` | Заменено на shadow |

**Файлы:**
- `src/components/layout/Layout.tsx` (секция bottom-nav)
- `src/styles/globals.css` (`.bottom-nav` классы)

---

### Этап 4: Мясо (Dashboard Grid)
> Цель: Главная страница в стиле Bento

| # | Задача | Статус | Заметки |
|---|--------|--------|---------|
| 4.1 | Создать .bento-grid контейнер | `[x]` | CSS Grid с gap, 2 колонки mobile, 4 desktop |
| 4.2 | Subscription Status → bento-card | `[x]` | Главная карточка подписки |
| 4.3 | Stats Grid → bento-grid + bento-card-hover | `[x]` | Balance, Subscription, Referrals, Earnings |
| 4.4 | Quick Actions → bento-card | `[x]` | Контейнер для кнопок |
| 4.5 | Trial + Wheel Banner → bento-card-glow/hover | `[x]` | Акцентные карточки |

**Файлы:**
- `src/pages/Dashboard.tsx`
- `src/styles/globals.css`

**Правило:** Логику JS/TS НЕ трогаем — только UI обёртки.

---

## Решения и обоснования

### Почему Urbanist, а не Inter?
- Urbanist более геометричный, лучше подходит под Bento-эстетику
- Хорошая читаемость на мобильных
- Бесплатный, Google Fonts

### Почему rounded-3xl (24px)?
- Стандарт Bento — крупные скругления
- 16px (текущий rounded-2xl) выглядит слишком "приложенечно"
- 32px (rounded-4xl) для особо крупных элементов

### Floating TabBar vs прилипший
- Floating выглядит премиально
- Отделяет навигацию от контента визуально
- Работает с safe-area на iOS

---

## Что НЕ делаем

- ✅ ~~Модалки (ConnectionModal, TopUpModal)~~ — Phase 6 complete
- ✅ ~~Страницы кроме Dashboard~~ — Phase 5 complete
- ✅ ~~Header~~ — Phase 7 complete
- ❌ Рефакторинг логики — только UI

---

## Прогресс

```
Этап 1: ██████████ 100%
Этап 2: ██████████ 100%
Этап 3: ██████████ 100%
Этап 4: ██████████ 100%
Этап 5: ██████████ 100%
Этап 6: ██████████ 100%
Этап 7: ██████████ 100%
─────────────────────
Общий:  ██████████ 100%
```

---

## Заметки для агентов

**Контекст:** Это Mini App для Telegram (VPN кабинет). Мобильный фокус.

**Текущий стек:**
- React + Vite + TypeScript
- Tailwind CSS
- React Query для данных

**Ключевые файлы:**
- `tailwind.config.js` — цвета через CSS переменные
- `src/styles/globals.css` — компонентные классы (.card, .btn, etc)
- `src/components/layout/Layout.tsx` — шапка + таббар
- `src/pages/Dashboard.tsx` — главный экран (монстр, но логику не трогаем)

**Темы:** Есть dark и light (champagne). Bento-стили должны работать в обеих.

---

## Следующие этапы (Phase 2)

### Этап 5: Остальные страницы пользователя
> Применить bento-стили к основным страницам

| # | Страница | Приоритет | Объём | Статус |
|---|----------|-----------|-------|--------|
| 5.1 | Subscription.tsx | High | Большая — формы, тарифы, карточки | `[x]` |
| 5.2 | Balance.tsx | High | Средняя — баланс, транзакции, методы оплаты | `[x]` |
| 5.3 | Referral.tsx | Medium | Средняя — статистика, ссылка, условия | `[x]` |
| 5.4 | Support.tsx | Medium | Малая — тикеты | `[x]` |
| 5.5 | Profile.tsx | Low | Малая — настройки | `[x]` |
| 5.6 | Info.tsx | Low | Малая — статичный контент | `[x]` |

### Этап 6: Модалки
> Обновить модальные окна в bento-стиле

| # | Компонент | Статус | Заметки |
|---|-----------|--------|---------|
| 6.1 | ConnectionModal | `[x]` | ✅ z-[60], rounded-3xl, backdrop-blur-xl (desktop + mobile) |
| 6.2 | TopUpModal | `[x]` | ✅ z-[60], rounded-3xl, backdrop-blur-xl |
| 6.3 | InsufficientBalancePrompt | `[x]` | ✅ z-[60], rounded-3xl, backdrop-blur-xl (PaymentMethodModal тоже) |
| 6.4 | Wheel Result Modal | `[x]` | ✅ z-[60] |
| 6.5 | Contests Modal | `[x]` | ✅ z-[60], bento-card, backdrop-blur-sm |

**Выборка модалок (select/close overlap):** Не найдено — все селекты в Subscription.tsx используют кнопки вместо `<select>` элемента.

### Этап 7: Header
> Обновить шапку (опционально)

| # | Задача | Статус | Заметки |
|---|--------|--------|---------|
| 7.0 | Смена шрифта Urbanist → Manrope | `[x]` | Google Fonts, tailwind.config.js, globals.css |
| 7.1 | Glass container + shadow | `[x]` | `glass shadow-lg shadow-black/10` (без border-b) |
| 7.2 | Logo в bento-контейнере | `[x]` | `rounded-xl bg-dark-800/80 border border-dark-700/50` (app icon style) |
| 7.3 | Controls в bento-стиле | `[x]` | Все кнопки: `rounded-xl bg-dark-800/50 hover:bg-dark-700 border border-dark-700/50` |
| 7.4 | Z-Index = 50 | `[x]` | Подтверждено (выше контента, ниже модалок z-[60]) |

### Этап 8: Полировка
> Финальные штрихи

| # | Задача |
|---|--------|
| 8.1 | Анимации появления карточек (stagger) |
| 8.2 | Микро-взаимодействия (hover glow) |
| 8.3 | Тестирование на разных устройствах |
| 8.4 | Performance check (особенно blur на mobile) |

---

## Changelog

### 2026-01-20 — MVP Complete
- ✅ Urbanist шрифт
- ✅ CSS переменные Bento
- ✅ BentoCard компонент
- ✅ Floating TabBar
- ✅ Dashboard в bento-стиле
- ✅ Commit: `bf0bcfb`

### 2026-01-20 — Subscription.tsx Refactor
- ✅ Все секции `card` → `bento-card` (6 шт):
  - Current Subscription (line 429)
  - Daily Pause (line 634)
  - Additional Options (line 733)
  - My Devices (line 1153)
  - Tariffs section (line 1223)
  - Classic mode purchase (line 1925)
- ✅ Tariff cards: `bento-card-hover` + `bento-card-glow` для выбранного
- ✅ Period selection cards: `bento-card-hover` + `bento-card-glow`
- ✅ Traffic selection cards: `bento-card-hover` + `bento-card-glow`
- ✅ Исправлен `.bento-grid` — добавлен breakpoint для xs (<375px)

### 2026-01-20 — Phase 2 Complete (Все страницы пользователя)
- ✅ **Balance.tsx**: 4 карточки → `bento-card`, методы оплаты → `bento-card-hover`
- ✅ **Referral.tsx**: stats grid → `bento-grid` + `bento-card-hover`, 5 секций → `bento-card`
- ✅ **Support.tsx**: 3 карточки → `bento-card`, tickets list items → `rounded-bento`
- ✅ **Profile.tsx**: 3 карточки → `bento-card`
- ✅ **Info.tsx**: FAQ items, rules, privacy, offer → `bento-card`

### 2026-01-20 — Phase 7 Complete (Header + Font)
- ✅ **Шрифт:** Urbanist → Manrope (Google Fonts, tailwind.config.js, globals.css)
- ✅ **Header Container:** `glass` + `shadow-lg shadow-black/10` (убран border-b)
- ✅ **Logo:** App icon style — `rounded-xl bg-dark-800/80 border border-dark-700/50`
- ✅ **Theme Toggle:** Bento style — `rounded-xl bg-dark-800/50 hover:bg-dark-700 border border-dark-700/50`
- ✅ **Language Switcher:** Bento style — то же
- ✅ **Notification Bell:** Bento style — то же
- ✅ **Z-Index:** Header = z-50 (верифицировано)
- ✅ **ConnectionModal.tsx**: z-[60], rounded-3xl, backdrop-blur-xl (desktop + mobile wrapper)
- ✅ **TopUpModal.tsx**: z-[60], rounded-3xl, backdrop-blur-xl
- ✅ **InsufficientBalancePrompt.tsx**: z-[60], rounded-3xl, backdrop-blur-xl (PaymentMethodModal тоже)
- ✅ **Wheel.tsx**: Result modal z-[60]
- ✅ **Contests.tsx**: Game modal z-[60], bento-card, backdrop-blur-sm

**Z-Index Hierarchy (фиксировано):**
- z-[9999]: ConnectionModal mobile view
- z-[9998]: ConnectionModal mobile backdrop
- z-[100]: Toast, MaintenanceScreen, ChannelSubscriptionScreen
- z-[60]: Все модальные окна (TopUpModal, InsufficientBalancePrompt, ConnectionModal desktop, Wheel, Contests)
- z-50: Header, dropdowns
- z-40: TabBar (bottom nav)
