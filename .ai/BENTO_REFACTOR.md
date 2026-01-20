# Bento Grids Refactor

> **Ветка:** `bento-grids`
> **Статус:** В работе
> **Последнее обновление:** 2026-01-20

## Референс

- **Стиль:** Bento Grids (карточки разных размеров в сетке)
- **Цветовая схема:** Зеленый неон на темном фоне, чистота
- **Шрифт:** Urbanist (современный гротеск)
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

- ❌ Модалки (ConnectionModal, TopUpModal) — вторично
- ❌ Страницы кроме Dashboard — после MVP
- ❌ Header — работает, не ломаем
- ❌ Рефакторинг логики — только UI

---

## Прогресс

```
Этап 1: ██████████ 100%
Этап 2: ██████████ 100%
Этап 3: ██████████ 100%
Этап 4: ██████████ 100%
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
