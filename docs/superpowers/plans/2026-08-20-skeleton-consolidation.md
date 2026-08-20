# Skeleton Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Свести всю разметку скелетонов загрузки кабинета к одному примитиву `<Skeleton>` с единой заливкой, авторазмером и доступностью, удалив два мёртвых компонента и ~40 инлайновых копий из 21 файла.

**Architecture:** Логика классов выносится в чистую функцию `skeletonClass()` (тестируется в текущем vitest-окружении `node`, без jsdom и testing-library — так же, как все существующие тесты кабинета). Поверх неё — тонкий React-компонент `<Skeleton>` и контейнер `<SkeletonGroup>`, который несёт `role="status"` / `aria-busy` / `aria-label` по образцу существующего `Spinner.tsx`. Dev-only маршрут-галерея даёт постоянную поверхность для визуальной проверки, потому что состояния загрузки в приложении транзиентны и иначе их не отскриншотить.

**Tech Stack:** React 19.2, TypeScript 5.2, Tailwind 3.4.19 (`darkMode: 'class'`, цвета через `withOpacity` + CSS-переменные `--color-dark-*`), `cn` = `clsx` + `tailwind-merge ^3.4`, react-i18next, react-router, vitest 4.1 (`environment: 'node'`), biome 2.5.3.

**Spec:** `docs/superpowers/specs/2026-08-20-skeleton-consolidation-spec.md`

**Repo:** `~/WebstormProjects/bedolaga-cabinet`, ветка от `dev` (базовый коммит `a451a12`).

## Global Constraints

- **Цвета — только токены палитры** `dark-*` / `champagne-*` / `accent-*` / `success-*` / `warning-*` / `error-*`. Никаких стоковых tailwind-цветов (`gray-400`, `slate-700`, …) и сырых хексов в классах. Источник: `CLAUDE.md:128-132`.
- **Радиусы:** карточки уровня страницы — `bento-card` / `rounded-3xl`; внутренние панели — `rounded-2xl`; контролы и строки — `rounded-xl` / `rounded-lg`. Источник: `CLAUDE.md:134-137`.
- **Иконки** — только Phosphor через баррель `@/components/icons`. В этом плане иконки не добавляются.
- **Новых npm-зависимостей не добавлять.** Ни `react-loading-skeleton`, ни `react-content-loader`, ни jsdom, ни `@testing-library/*`.
- **Новых i18n-ключей не добавлять.** Используется существующий `common.loading`, присутствующий в `en.json`, `ru.json`, `fa.json`, `zh.json`.
- **Не трогать 14 файлов** из раздела «НЕ ТРОГАТЬ» спеки — там `animate-pulse` это статус-точки нод, тинт при загрузке и декоративная анимация, а не скелетоны.
- **Не трогать** `src/pages/QuickPurchase.tsx:68` и `src/pages/GiftSubscription.tsx:94` — вопреки имени `LoadingSkeleton` внутри `animate-spin`, это спиннеры.
- **Перед каждым коммитом** прогонять `npm run check` (biome lint+format) и `npm run type-check` (tsc --noEmit).
- **Язык комментариев** — русский, как в остальном коде кабинета. В прозе писать «Remnawave», не «RemnaWave».

---

## Task 1: Чистая функция классов скелетона

**Files:**
- Create: `src/components/ui/skeleton/skeletonStyles.ts`
- Test: `src/components/ui/skeleton/skeletonStyles.test.ts`

**Interfaces:**
- Consumes: `cn` из `@/lib/utils` (сигнатура `cn(...inputs: ClassValue[]): string`, реализация `twMerge(clsx(inputs))` — `src/lib/utils.ts:8`).
- Produces:
  - `type SkeletonVariant = 'line' | 'card'`
  - `interface SkeletonClassOptions { variant?: SkeletonVariant; circle?: boolean; animate?: boolean; className?: string }`
  - `function skeletonClass(options?: SkeletonClassOptions): string`

**Почему чистая функция, а не сразу компонент:** в кабинете `vitest.config.ts` задаёт `environment: 'node'`, jsdom и `@testing-library/react` не установлены, `.test.tsx` файлов ноль. Вынос логики классов в чистую функцию даёт TDD без затаскивания новой инфраструктуры тестирования.

- [ ] **Step 1: Написать падающий тест**

Создать `src/components/ui/skeleton/skeletonStyles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { skeletonClass } from './skeletonStyles';

describe('skeletonClass', () => {
  it('по умолчанию даёт вариант line: заливка dark-700/50, радиус lg, пульс', () => {
    const cls = skeletonClass();
    expect(cls).toContain('bg-dark-700/50');
    expect(cls).toContain('rounded-lg');
    expect(cls).toContain('animate-pulse');
  });

  // shrink-0 ломал бы сжатие в узких flex-рядах — он опционален, не дефолтен.
  it('не навязывает shrink-0', () => {
    expect(skeletonClass()).not.toContain('shrink-0');
  });

  it('по умолчанию берёт размер от текста родителя (авторазмер)', () => {
    const cls = skeletonClass();
    expect(cls).toContain('h-[1em]');
    expect(cls).toContain('w-full');
  });

  it('размер из className перекрывает авторазмер, а не соседствует с ним', () => {
    const cls = skeletonClass({ className: 'h-4 w-32' });
    expect(cls).toContain('h-4');
    expect(cls).toContain('w-32');
    expect(cls).not.toContain('h-[1em]');
    expect(cls).not.toContain('w-full');
  });

  it('вариант card даёт рамку, свою заливку и радиус 2xl вместо line-стилей', () => {
    const cls = skeletonClass({ variant: 'card' });
    expect(cls).toContain('bg-dark-800/40');
    expect(cls).toContain('border-dark-700/30');
    expect(cls).toContain('rounded-2xl');
    expect(cls).not.toContain('bg-dark-700/50');
    expect(cls).not.toContain('rounded-lg');
  });

  it('circle заменяет радиус на rounded-full', () => {
    const cls = skeletonClass({ circle: true });
    expect(cls).toContain('rounded-full');
    expect(cls).not.toContain('rounded-lg');
  });

  it('animate=false убирает пульс', () => {
    expect(skeletonClass({ animate: false })).not.toContain('animate-pulse');
  });

  it('заливка из className перекрывает вариантную', () => {
    const cls = skeletonClass({ className: 'bg-dark-800/30' });
    expect(cls).toContain('bg-dark-800/30');
    expect(cls).not.toContain('bg-dark-700/50');
  });

  // Канон CLAUDE.md:128-132 — только токены палитры.
  it('не содержит стоковых tailwind-цветов и сырых хексов', () => {
    for (const opts of [{}, { variant: 'card' as const }, { circle: true }]) {
      const cls = skeletonClass(opts);
      expect(cls).not.toMatch(/\b(gray|slate|zinc|neutral|stone|purple|blue)-\d{2,3}\b/);
      expect(cls).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });
});
```

- [ ] **Step 2: Прогнать тест и убедиться, что он падает**

Run: `cd ~/WebstormProjects/bedolaga-cabinet && npx vitest run src/components/ui/skeleton/skeletonStyles.test.ts`
Expected: FAIL — `Failed to resolve import "./skeletonStyles"`.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `src/components/ui/skeleton/skeletonStyles.ts`:

```ts
import { cn } from '@/lib/utils';

export type SkeletonVariant = 'line' | 'card';

/**
 * Единственный источник правды по внешнему виду скелетонов загрузки.
 *
 * До консолидации кабинет заливал одну и ту же роль семью разными способами
 * (bg-dark-700, /50, /60, bg-dark-800, /30, /40, /50). Вариантов ровно два,
 * потому что реальных ролей в коде было ровно две:
 *   line — плейсхолдер контента ВНУТРИ карточки, контраст к bg-dark-900/70;
 *   card — плейсхолдер САМОЙ карточки на фоне страницы, поэтому с рамкой.
 *
 * Цвета — токены dark-*, они уже завязаны на --color-dark-* и перекрашиваются
 * под тему через applyThemeColors, поэтому светлая и кастомные темы работают
 * без отдельных веток.
 */
const VARIANT_FILL: Record<SkeletonVariant, string> = {
  line: 'bg-dark-700/50',
  card: 'border border-dark-700/30 bg-dark-800/40',
};

/** Радиусы по канону CLAUDE.md:134-137: строки — lg, внутренние панели — 2xl. */
const VARIANT_RADIUS: Record<SkeletonVariant, string> = {
  line: 'rounded-lg',
  card: 'rounded-2xl',
};

export interface SkeletonClassOptions {
  variant?: SkeletonVariant;
  /** Круглый плейсхолдер — аватар, точка, иконка. */
  circle?: boolean;
  /** Отключить пульсацию (например, для статичного макета). */
  animate?: boolean;
  /** Классы вызывающей стороны. Перекрывают дефолты через twMerge. */
  className?: string;
}

export function skeletonClass({
  variant = 'line',
  circle = false,
  animate = true,
  className,
}: SkeletonClassOptions = {}): string {
  return cn(
    // shrink-0 намеренно НЕ в дефолтах: в узких flex-рядах (подвал подписки
    // на маленьком экране Mini App) он запретил бы сжатие и вызвал переполнение.
    // Где нужно — добавляется через className, как было в исходном коде.
    'block',
    // Авторазмер в духе react-loading-skeleton: без явных классов размера
    // строка повторяет высоту текста родителя и тянется на всю ширину.
    // Любой h-*/w-* в className это перекрывает — cn построен на twMerge.
    'h-[1em] w-full',
    VARIANT_FILL[variant],
    circle ? 'rounded-full' : VARIANT_RADIUS[variant],
    animate && 'animate-pulse',
    className,
  );
}
```

- [ ] **Step 4: Прогнать тест и убедиться, что он проходит**

Run: `npx vitest run src/components/ui/skeleton/skeletonStyles.test.ts`
Expected: PASS, 9 тестов.

- [ ] **Step 5: Проверки и коммит**

```bash
cd ~/WebstormProjects/bedolaga-cabinet
npm run check && npm run type-check
git add src/components/ui/skeleton/skeletonStyles.ts src/components/ui/skeleton/skeletonStyles.test.ts docs/superpowers
git commit -m "feat(ui): единый источник правды по стилям скелетонов"
```

---

## Task 2: Компонент Skeleton, контейнер SkeletonGroup, снос мёртвых компонентов

**Files:**
- Delete: `src/components/ui/Skeleton.tsx` (0 импортов)
- Delete: `src/components/ui/BentoSkeleton.tsx` (0 импортов)
- Create: `src/components/ui/skeleton/Skeleton.tsx`
- Create: `src/components/ui/skeleton/index.ts`
- Create: `src/components/dev/SkeletonGallery.tsx`
- Modify: `src/App.tsx` (добавить dev-only маршрут в блок публичных маршрутов, после `/recurrent-payments` — сейчас строка 279)

**Interfaces:**
- Consumes: `skeletonClass`, `SkeletonVariant` из Task 1; `cn` из `@/lib/utils`; `useTranslation` из `react-i18next`.
- Produces:
  - `function Skeleton(props: SkeletonProps): JSX.Element` где
    `interface SkeletonProps { variant?: SkeletonVariant; circle?: boolean; animate?: boolean; count?: number; className?: string; style?: CSSProperties }`
  - `function SkeletonGroup(props: { className?: string; children: ReactNode }): JSX.Element`
  - Баррель `@/components/ui/skeleton` реэкспортирует `Skeleton`, `SkeletonGroup`, `skeletonClass`, `SkeletonVariant`, `SkeletonClassOptions`, `SkeletonProps`.

> **Ловушка macOS:** файловая система APFS по умолчанию регистронезависима. Пока существует `src/components/ui/Skeleton.tsx`, импорт `@/components/ui/skeleton` может разрешиться в него, а не в новую папку. Поэтому удаление старых файлов идёт ПЕРВЫМ шагом, до создания папки.

- [ ] **Step 1: Удалить мёртвые компоненты и убедиться, что ничего не сломалось**

```bash
cd ~/WebstormProjects/bedolaga-cabinet
grep -rn "BentoSkeleton\|ui/Skeleton" src --include="*.tsx" --include="*.ts" | grep -v "^src/components/ui/Skeleton.tsx" | grep -v "^src/components/ui/BentoSkeleton.tsx"
```
Expected: пустой вывод — импортов нет, оба файла мёртвые.

```bash
git rm src/components/ui/Skeleton.tsx src/components/ui/BentoSkeleton.tsx
npm run type-check
```
Expected: tsc проходит без ошибок.

- [ ] **Step 2: Создать компонент**

Создать `src/components/ui/skeleton/Skeleton.tsx`:

```tsx
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { type SkeletonVariant, skeletonClass } from './skeletonStyles';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  circle?: boolean;
  animate?: boolean;
  /** Сколько одинаковых плейсхолдеров отрисовать подряд. */
  count?: number;
  className?: string;
  /** Для случаев с рантайм-фоном — например, стеклянные карточки Subscriptions. */
  style?: CSSProperties;
}

/**
 * Плейсхолдер загрузки. Без классов размера повторяет высоту текста родителя.
 *
 * Рендерится как <span class="block">, а не <div>, чтобы его можно было
 * ставить внутрь <p> и прочих inline-контекстов без невалидной вложенности.
 */
export function Skeleton({
  variant = 'line',
  circle = false,
  animate = true,
  count = 1,
  className,
  style,
}: SkeletonProps) {
  const cls = skeletonClass({ variant, circle, animate, className });

  if (count === 1) {
    return <span className={cls} style={style} />;
  }

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={cls} style={style} />
      ))}
    </>
  );
}

/**
 * Обёртка вокруг группы скелетонов: сообщает скринридеру, что здесь идёт
 * загрузка. role="status" несёт неявный aria-live="polite" — те же атрибуты,
 * что уже стоят на Spinner (src/components/ui/Spinner.tsx).
 *
 * Сами <Skeleton> намеренно ничего не объявляют: иначе на экране из двадцати
 * плейсхолдеров скринридер зачитал бы «загрузка» двадцать раз.
 */
export function SkeletonGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div role="status" aria-busy="true" aria-label={t('common.loading')} className={className}>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Создать баррель**

Создать `src/components/ui/skeleton/index.ts`:

```ts
export { Skeleton, SkeletonGroup, type SkeletonProps } from './Skeleton';
export {
  skeletonClass,
  type SkeletonClassOptions,
  type SkeletonVariant,
} from './skeletonStyles';
```

- [ ] **Step 4: Создать dev-галерею**

Состояния загрузки в приложении транзиентны — отскриншотить их в реальных
экранах без выкрутасов нельзя. Галерея даёт постоянную поверхность для
визуальной проверки и не попадает в прод: `import.meta.env.DEV` вычисляется
на этапе сборки, ветка вырезается тришейкингом.

Создать `src/components/dev/SkeletonGallery.tsx`:

```tsx
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';

/**
 * Dev-only витрина скелетонов: /__skeletons. В прод-сборку не попадает —
 * маршрут в App.tsx закрыт проверкой import.meta.env.DEV.
 */
export default function SkeletonGallery() {
  return (
    <div className="min-h-dvh space-y-8 bg-dark-950 p-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-dark-100">line внутри карточки</h2>
        <div className="space-y-4 rounded-3xl border border-dark-700/40 bg-dark-900/70 p-6">
          <SkeletonGroup className="flex items-center gap-3">
            <Skeleton circle className="h-10 w-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </SkeletonGroup>
          <SkeletonGroup className="space-y-2">
            <Skeleton count={3} className="h-3" />
          </SkeletonGroup>
          <p className="text-base text-dark-100">
            Авторазмер внутри текста: <Skeleton className="inline-block w-24 align-middle" />
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-dark-100">card на фоне страницы</h2>
        <SkeletonGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton variant="card" className="h-36" />
          <Skeleton variant="card" className="h-36" />
        </SkeletonGroup>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-dark-100">animate=false</h2>
        <SkeletonGroup className="space-y-2">
          <Skeleton animate={false} className="h-4 w-40" />
          <Skeleton animate={false} variant="card" className="h-20" />
        </SkeletonGroup>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Подключить маршрут**

В `src/App.tsx` добавить импорт рядом с остальными импортами страниц:

```tsx
import SkeletonGallery from '@/components/dev/SkeletonGallery';
```

и вставить маршрут сразу после публичного маршрута `/recurrent-payments`
(сейчас строка 279, ищи `<Route path="/recurrent-payments" element={<PublicLegal doc="recurrent" />} />`):

```tsx
{/* Dev-only витрина скелетонов. В прод-сборке ветка вырезается тришейкингом. */}
{import.meta.env.DEV && <Route path="/__skeletons" element={<SkeletonGallery />} />}
```

- [ ] **Step 6: Проверить рендером**

```bash
cd ~/WebstormProjects/bedolaga-cabinet && npm run dev
```

Открыть `http://localhost:5173/__skeletons` и глазами проверить:
1. Аватар круглый, строки прямоугольные с мягким радиусом.
2. Все `line`-плейсхолдеры одного цвета — разнобоя из семи заливок больше нет.
3. `card`-плейсхолдеры имеют видимую рамку и отличаются от фона страницы.
4. Строка «Авторазмер внутри текста» — плейсхолдер по высоте совпадает с текстом рядом.
5. Блок `animate=false` не пульсирует, остальные пульсируют.
6. Переключить тему на светлую — плейсхолдеры остаются видимыми и не сливаются с фоном.
7. В DevTools включить эмуляцию `prefers-reduced-motion: reduce` (Rendering → Emulate CSS media feature) — пульсация останавливается за счёт глобального правила `globals.css:1891`.

Сделать скриншот тёмной и светлой темы, приложить к отчёту о задаче.

- [ ] **Step 7: Проверки и коммит**

```bash
npm run check && npm run type-check && npx vitest run
git add -A src/components/ui/skeleton src/components/dev src/App.tsx
git commit -m "feat(ui): примитив Skeleton и SkeletonGroup вместо двух мёртвых компонентов"
```

---
## Task 3: Миграция пользовательских экранов (7 файлов)

**Files:**
- Modify: `src/pages/Subscriptions.tsx:145-157`
- Modify: `src/pages/SavedCards.tsx:182-205`
- Modify: `src/pages/MergeAccounts.tsx:206-246`
- Modify: `src/pages/ConnectedAccounts.tsx:284-304`
- Modify: `src/components/PromoOffersSection.tsx:325-336`
- Modify: `src/components/subscription/SubscriptionConnectFooter.tsx:32-52`
- Modify: `src/components/data-display/StatCard/StatCard.tsx:44-46`

**Interfaces:**
- Consumes: `Skeleton`, `SkeletonGroup` из `@/components/ui/skeleton` (Task 2).
- Produces: ничего для последующих задач — это применение примитива.

**Правило замены.** Инлайновый `<div className="h-X w-Y animate-pulse rounded bg-dark-NNN" />` становится `<Skeleton className="h-X w-Y" />`. Класс заливки и `animate-pulse` уходят — их задаёт примитив. Класс радиуса уходит, если это был `rounded`/`rounded-lg`; если был `rounded-xl`/`rounded-2xl`/`rounded-full` — сохраняется через `className` или проп `circle`. Ближайший контейнер состояния загрузки оборачивается в `<SkeletonGroup>`, если у него ещё нет `aria-busy`.

**Что НЕ делать:** не менять размеры (`h-*`/`w-*`) — они подобраны под конкретную вёрстку; не трогать обёртки `motion.div` и их `variants`; не переименовывать локальные `LoadingSkeleton()`.

- [ ] **Step 1: StatCard — самый простой случай, задаёт шаблон**

`src/components/data-display/StatCard/StatCard.tsx`, строка 45.

Было:
```tsx
{loading ? (
  <div className="mt-2 h-8 w-24 animate-pulse rounded bg-dark-800" />
) : (
```

Стало:
```tsx
{loading ? (
  <Skeleton className="mt-2 h-8 w-24" />
) : (
```

Добавить импорт: `import { Skeleton } from '@/components/ui/skeleton';`

Заливка меняется с `bg-dark-800` на каноническую `bg-dark-700/50` — это осознанно: `StatCard` рисуется внутри карточки, роль плейсхолдера здесь `line`.

- [ ] **Step 2: PromoOffersSection**

`src/components/PromoOffersSection.tsx`, блок «Loading State» на строках 325-336.

Было:
```tsx
{offersLoading && (
  <div className="card">
    <div className="flex items-center gap-4">
      <div className="h-12 w-12 animate-pulse rounded-xl bg-dark-700" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-32 animate-pulse rounded bg-dark-700" />
        <div className="h-4 w-48 animate-pulse rounded bg-dark-700" />
      </div>
    </div>
  </div>
)}
```

Стало:
```tsx
{offersLoading && (
  <div className="card">
    <SkeletonGroup className="flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </SkeletonGroup>
  </div>
)}
```

Импорт: `import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';`

- [ ] **Step 3: SubscriptionConnectFooter**

`src/components/subscription/SubscriptionConnectFooter.tsx`, строки 32-52. У обёртки уже есть `aria-busy="true"` — второй контейнер не добавляем, дополняем существующий до полного набора атрибутов и меняем три плейсхолдера.

Было:
```tsx
<div
  className="flex items-center gap-2.5 border-t px-4 py-2.5"
  style={{ borderColor }}
  aria-busy="true"
>
```
Стало:
```tsx
<div
  className="flex items-center gap-2.5 border-t px-4 py-2.5"
  style={{ borderColor }}
  role="status"
  aria-busy="true"
  aria-label={t('common.loading')}
>
```

Было:
```tsx
<div className="h-4 w-4 shrink-0 animate-pulse rounded bg-dark-700/60" />
<div className="h-3.5 w-40 animate-pulse rounded bg-dark-700/60" />
<div className="ml-auto h-3 w-10 animate-pulse rounded bg-dark-700/60" />
```
Стало:
```tsx
<Skeleton className="h-4 w-4 shrink-0" />
<Skeleton className="h-3.5 w-40" />
<Skeleton className="ml-auto h-3 w-10" />
```

`shrink-0` сохраняется ровно там, где он был в исходном коде, — примитив его
не навязывает. Сохранить комментарий про невидимый текст и сам `<span aria-hidden>` — он держит высоту строки.

Проверить, что `t` в этом компоненте уже есть (`useTranslation`); если нет — добавить `const { t } = useTranslation();` и импорт `import { useTranslation } from 'react-i18next';`.

- [ ] **Step 4: SavedCards**

`src/pages/SavedCards.tsx`, строки 182-205.

Было (внутренности `.map`):
```tsx
<div className="flex items-center gap-3">
  <div className="h-6 w-6 animate-pulse rounded bg-dark-700" />
  <div className="space-y-2">
    <div className="h-4 w-32 animate-pulse rounded bg-dark-700" />
    <div className="h-3 w-24 animate-pulse rounded bg-dark-700" />
  </div>
</div>
<div className="h-8 w-20 animate-pulse rounded bg-dark-700" />
```

Стало:
```tsx
<div className="flex items-center gap-3">
  <Skeleton className="h-6 w-6" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-3 w-24" />
  </div>
</div>
<Skeleton className="h-8 w-20" />
```

Обернуть `<div className="space-y-3">` (строка 186) в `SkeletonGroup`, заменив его:
```tsx
<SkeletonGroup className="space-y-3">
```
и закрывающий `</div>` на `</SkeletonGroup>`.

- [ ] **Step 5: ConnectedAccounts**

`src/pages/ConnectedAccounts.tsx`, функция `LoadingSkeleton` на строках 284-304. Здесь `animate-pulse` стоит на общей обёртке, а не на плейсхолдерах, — после миграции пульс переезжает на сами `<Skeleton>`.

Стало целиком:
```tsx
function LoadingSkeleton() {
  return (
    <SkeletonGroup className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton circle className="h-6 w-6" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </Card>
      ))}
    </SkeletonGroup>
  );
}
```

- [ ] **Step 6: MergeAccounts**

`src/pages/MergeAccounts.tsx`, функция `LoadingSkeleton` на строках 208-246. Обёртки `motion.div` с `staggerContainer`/`staggerItem` сохраняются как есть — `SkeletonGroup` надевается поверх `motion.div`, чтобы не ломать анимацию появления.

Стало целиком:
```tsx
function LoadingSkeleton() {
  return (
    <SkeletonGroup>
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7" />
            <Skeleton className="h-7 w-48" />
          </div>
        </motion.div>

        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div key={i} variants={staggerItem}>
            <Card>
              <div className="space-y-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </Card>
          </motion.div>
        ))}

        <motion.div variants={staggerItem}>
          <Skeleton className="h-12 w-full rounded-xl" />
        </motion.div>

        <motion.div variants={staggerItem} className="flex justify-center">
          <Skeleton className="h-4 w-32" />
        </motion.div>
      </motion.div>
    </SkeletonGroup>
  );
}
```

- [ ] **Step 7: Subscriptions**

`src/pages/Subscriptions.tsx`, строки 145-157. Здесь фон задаётся рантайм-значением стеклянной темы `g.innerBg`, поэтому используется проп `style`, а вариантная заливка перекрывается через `bg-transparent`.

Было:
```tsx
{isLoading && (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {[1, 2].map((i) => (
      <div
        key={i}
        className="h-36 animate-pulse rounded-2xl"
        style={{ background: g.innerBg }}
      />
    ))}
  </div>
)}
```

Стало:
```tsx
{isLoading && (
  <SkeletonGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {[1, 2].map((i) => (
      <Skeleton
        key={i}
        variant="card"
        // Фон и рамку задаёт стеклянная тема, поэтому вариантную заливку гасим.
        className="h-36 border-0 bg-transparent"
        style={{ background: g.innerBg }}
      />
    ))}
  </SkeletonGroup>
)}
```

- [ ] **Step 8: Прогнать проверки**

```bash
cd ~/WebstormProjects/bedolaga-cabinet
npm run check && npm run type-check && npx vitest run
grep -rn "animate-pulse" src/pages/Subscriptions.tsx src/pages/SavedCards.tsx src/pages/MergeAccounts.tsx src/pages/ConnectedAccounts.tsx src/components/PromoOffersSection.tsx src/components/subscription/SubscriptionConnectFooter.tsx src/components/data-display/StatCard/StatCard.tsx
```
Expected: `npm run check`, `type-check`, тесты — зелёные; `grep` — пустой вывод.

- [ ] **Step 9: Проверить рендером**

Запустить `npm run dev`. Для каждого из экранов ниже открыть DevTools → Network → throttling `Slow 3G`, перезагрузить страницу и поймать состояние загрузки. Если поймать не удаётся — временно заменить условие на `true` (например, `{true && (`), отскриншотить и вернуть обратно.

Экраны: `/subscriptions`, `/saved-cards`, `/merge-accounts`, `/connected-accounts`, главная (PromoOffersSection и StatCard).

Проверять: скелетоны не съехали по размеру относительно контента, который приходит на их место; цвет одинаковый на всех экранах; в светлой теме плейсхолдеры видны.

- [ ] **Step 10: Коммит**

```bash
git add -A src/pages/Subscriptions.tsx src/pages/SavedCards.tsx src/pages/MergeAccounts.tsx src/pages/ConnectedAccounts.tsx src/components/PromoOffersSection.tsx src/components/subscription/SubscriptionConnectFooter.tsx src/components/data-display/StatCard/StatCard.tsx
git commit -m "refactor(ui): перевести скелетоны пользовательских экранов на общий примитив"
```

---
## Task 4: Миграция админских экранов (7 файлов + 1 новый общий компонент)

**Files:**
- Create: `src/components/admin/ListRowSkeleton.tsx`
- Modify: `src/pages/AdminNews.tsx:286-310`
- Modify: `src/pages/AdminInfoPages.tsx:281-304`
- Modify: `src/pages/AdminTrafficUsage.tsx:497,511,529,547,565`
- Modify: `src/pages/AdminCampaignStats.tsx:354-361`
- Modify: `src/pages/AdminEmailTemplates.tsx:546-551`
- Modify: `src/pages/AdminUpdates.tsx:265-274`
- Modify: `src/components/admin/remnawave/GeoCheckImageViewer.tsx:84-94`

**Interfaces:**
- Consumes: `Skeleton`, `SkeletonGroup` из `@/components/ui/skeleton` (Task 2).
- Produces: `function ListRowSkeleton(props: { count?: number; actionWidths?: string[] }): JSX.Element` — экспорт по умолчанию отсутствует, именованный экспорт из `@/components/admin/ListRowSkeleton`.

**Почему появляется общий компонент:** блоки загрузки в `AdminNews.tsx:286-310` и `AdminInfoPages.tsx:281-304` совпадают строка в строку, кроме набора кнопок справа (три против двух). Держать две копии по 20 строк после консолидации бессмысленно.

**Импорты.** В каждом изменяемом файле, где после правки появляются `Skeleton` или `SkeletonGroup`, добавить `import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';` (или только нужное из двух). Ниже это отдельно не повторяется на каждом шаге.

**Внимание:** в `AdminUpdates.tsx` мигрируется ТОЛЬКО блок на строках 265-274. Строка 101 (`<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning-400" />`) — это индикатор статуса, а не скелетон, её не трогать.

- [ ] **Step 1: Создать общий компонент строки списка**

Создать `src/components/admin/ListRowSkeleton.tsx`:

```tsx
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';

interface ListRowSkeletonProps {
  /** Сколько строк-заглушек отрисовать. */
  count?: number;
  /** Ширины кнопок справа: у новостей три действия, у инфостраниц два. */
  actionWidths?: string[];
}

/**
 * Заглушка списка админских карточек. Общая для AdminNews и AdminInfoPages —
 * до консолидации это были две посимвольно одинаковые копии, отличавшиеся
 * только набором кнопок справа.
 */
export function ListRowSkeleton({
  count = 3,
  actionWidths = ['w-14', 'w-8'],
}: ListRowSkeletonProps) {
  return (
    <SkeletonGroup className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex gap-2">
              {actionWidths.map((w, j) => (
                <Skeleton key={j} className={`h-8 ${w} ${w === 'w-14' ? 'rounded-full' : ''}`} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}
```

- [ ] **Step 2: AdminNews — заменить блок загрузки вызовом компонента**

`src/pages/AdminNews.tsx`, строки 286-310. Весь блок от `{isLoading ? (` до соответствующего `) : articles.length === 0 ? (` заменить на:

```tsx
{isLoading ? (
  <ListRowSkeleton actionWidths={['w-8', 'w-14', 'w-8']} />
) : articles.length === 0 ? (
```

Импорт: `import { ListRowSkeleton } from '@/components/admin/ListRowSkeleton';`

- [ ] **Step 3: AdminInfoPages — то же самое**

`src/pages/AdminInfoPages.tsx`, строки 281-304:

```tsx
{isLoading ? (
  <ListRowSkeleton />
) : items.length === 0 ? (
```

Импорт: `import { ListRowSkeleton } from '@/components/admin/ListRowSkeleton';`

Дефолт `actionWidths` (`['w-14', 'w-8']`) уже совпадает с тем, что здесь было.

- [ ] **Step 4: AdminEmailTemplates**

`src/pages/AdminEmailTemplates.tsx`, строки 546-551.

Было:
```tsx
{typesLoading ? (
  <div className="space-y-3">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="h-20 animate-pulse rounded-xl bg-dark-800" />
    ))}
  </div>
) : (
```

Стало:
```tsx
{typesLoading ? (
  <SkeletonGroup className="space-y-3">
    <Skeleton variant="card" count={6} className="h-20 rounded-xl" />
  </SkeletonGroup>
) : (
```

- [ ] **Step 5: AdminUpdates**

`src/pages/AdminUpdates.tsx`, строки 265-274.

Было:
```tsx
{isLoading && (
  <div className="space-y-4">
    {[0, 1].map((i) => (
      <div
        key={i}
        className="h-64 animate-pulse rounded-xl border border-dark-700/50 bg-dark-800/40"
      />
    ))}
  </div>
)}
```

Стало:
```tsx
{isLoading && (
  <SkeletonGroup className="space-y-4">
    <Skeleton variant="card" count={2} className="h-64 rounded-xl" />
  </SkeletonGroup>
)}
```

- [ ] **Step 6: AdminCampaignStats**

`src/pages/AdminCampaignStats.tsx`, строки 354-361.

Было:
```tsx
{chartLoading ? (
  <div className="space-y-3">
    <div className="h-52 animate-pulse rounded-xl bg-dark-800/30" />
    <div className="grid grid-cols-2 gap-3">
      <div className="h-24 animate-pulse rounded-xl bg-dark-800/30" />
      <div className="h-24 animate-pulse rounded-xl bg-dark-800/30" />
    </div>
  </div>
) : chartData ? (
```

Стало:
```tsx
{chartLoading ? (
  <SkeletonGroup className="space-y-3">
    <Skeleton variant="card" className="h-52 rounded-xl" />
    <div className="grid grid-cols-2 gap-3">
      <Skeleton variant="card" count={2} className="h-24 rounded-xl" />
    </div>
  </SkeletonGroup>
) : chartData ? (
```

- [ ] **Step 7: AdminTrafficUsage — пять ячеек таблицы**

`src/pages/AdminTrafficUsage.tsx`. В пяти определениях колонок повторяется одна и та же заглушка ячейки. Добавить рядом с определением колонок константу:

```tsx
// Заглушка ячейки, пока догружается обогащение строки.
const cellSkeleton = (width: string) => <Skeleton className={`mx-auto h-4 ${width}`} />;
```

и заменить пять возвратов:

| Строка | Было | Стало |
|---|---|---|
| 497 | `<div className="mx-auto h-4 w-8 animate-pulse rounded bg-dark-700" />` | `cellSkeleton('w-8')` |
| 511 | `<div className="mx-auto h-4 w-12 animate-pulse rounded bg-dark-700" />` | `cellSkeleton('w-12')` |
| 529 | `<div className="mx-auto h-4 w-14 animate-pulse rounded bg-dark-700" />` | `cellSkeleton('w-14')` |
| 547 | `<div className="mx-auto h-4 w-14 animate-pulse rounded bg-dark-700" />` | `cellSkeleton('w-14')` |
| 565 | `<div className="mx-auto h-4 w-16 animate-pulse rounded bg-dark-700" />` | `cellSkeleton('w-16')` |

То есть `return <div .../>;` становится `return cellSkeleton('w-8');`

`SkeletonGroup` здесь НЕ применяется: заглушки живут в отдельных ячейках таблицы, обернуть их одним контейнером нельзя, а объявлять `role="status"` в каждой ячейке — значит заставить скринридер зачитать «загрузка» по разу на ячейку.

- [ ] **Step 8: GeoCheckImageViewer**

`src/components/admin/remnawave/GeoCheckImageViewer.tsx`, строки 84-94. У обёртки уже есть `aria-busy="true"` — дополняем её до полного набора, вложенные `div` меняем на `Skeleton`.

Стало:
```tsx
{!loaded && (
  <div
    className="absolute inset-0 z-10 space-y-2 p-4"
    role="status"
    aria-busy="true"
    aria-label={t('common.loading')}
  >
    {SKELETON_ROWS.map((w) => (
      <Skeleton key={w} className="h-3" style={{ width: `${w}%` }} />
    ))}
  </div>
)}
```

Проверить наличие `const { t } = useTranslation();` в компоненте; если нет — добавить вместе с импортом `react-i18next`.

- [ ] **Step 9: Прогнать проверки**

```bash
cd ~/WebstormProjects/bedolaga-cabinet
npm run check && npm run type-check && npx vitest run
grep -rn "animate-pulse" src/pages/AdminNews.tsx src/pages/AdminInfoPages.tsx src/pages/AdminTrafficUsage.tsx src/pages/AdminCampaignStats.tsx src/pages/AdminEmailTemplates.tsx src/components/admin/remnawave/GeoCheckImageViewer.tsx
grep -n "animate-pulse" src/pages/AdminUpdates.tsx
```
Expected: первый `grep` — пусто; второй — ровно одно вхождение, строка со статус-точкой `bg-warning-400`.

- [ ] **Step 10: Проверить рендером**

`npm run dev`, зайти под админом, открыть с троттлингом `Slow 3G`: `/admin/news`, `/admin/info-pages`, `/admin/email-templates`, `/admin/updates`, `/admin/traffic-usage`, страницу статистики кампании и просмотр отчёта GeoCheck. Убедиться, что заглушки списков совпадают по геометрии с реальными карточками и что заглушки ячеек таблицы не ломают ширины колонок.

- [ ] **Step 11: Коммит**

```bash
git add -A src/components/admin/ListRowSkeleton.tsx src/pages/AdminNews.tsx src/pages/AdminInfoPages.tsx src/pages/AdminTrafficUsage.tsx src/pages/AdminCampaignStats.tsx src/pages/AdminEmailTemplates.tsx src/pages/AdminUpdates.tsx src/components/admin/remnawave/GeoCheckImageViewer.tsx
git commit -m "refactor(admin): перевести скелетоны админских экранов на общий примитив"
```

---
## Task 5: Миграция вкладок статистики (7 файлов + 1 новый общий компонент)

**Files:**
- Create: `src/components/sales-stats/StatsTabSkeleton.tsx`
- Modify: `src/components/sales-stats/SalesTab.tsx:39-47`
- Modify: `src/components/sales-stats/TrialsTab.tsx:36-44`
- Modify: `src/components/sales-stats/RenewalsTab.tsx:29-37`
- Modify: `src/components/sales-stats/DepositsTab.tsx:66-74`
- Modify: `src/components/sales-stats/AddonsTab.tsx:48-56`
- Modify: `src/components/sales-stats/PaymentHealthTab.tsx:39-47`
- Modify: `src/components/partner/CampaignDetailStats.tsx:26-38`

**Interfaces:**
- Consumes: `Skeleton`, `SkeletonGroup` из `@/components/ui/skeleton` (Task 2).
- Produces: `function StatsTabSkeleton(props: { count?: number }): JSX.Element` — именованный экспорт из `@/components/sales-stats/StatsTabSkeleton`.

**Почему появляется общий компонент:** все шесть вкладок `sales-stats` содержат посимвольно одинаковый блок загрузки. Отличий нет ни одного, включая количество карточек.

- [ ] **Step 1: Создать общий компонент**

Создать `src/components/sales-stats/StatsTabSkeleton.tsx`:

```tsx
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';

/**
 * Заглушка вкладки статистики. Общая для всех шести вкладок sales-stats —
 * до консолидации это были шесть посимвольно одинаковых копий.
 */
export function StatsTabSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonGroup className="space-y-4">
      <Skeleton variant="card" count={count} className="h-24 rounded-xl" />
    </SkeletonGroup>
  );
}
```

- [ ] **Step 2: Заменить блок во всех шести вкладках**

В каждом из шести файлов заменить блок

```tsx
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-24 rounded-xl bg-dark-800/30" />
        ))}
      </div>
```

на

```tsx
      <StatsTabSkeleton />
```

и добавить импорт `import { StatsTabSkeleton } from '@/components/sales-stats/StatsTabSkeleton';`

Файлы и строки начала блока: `SalesTab.tsx:41`, `TrialsTab.tsx:38`, `RenewalsTab.tsx:31`, `DepositsTab.tsx:68`, `AddonsTab.tsx:50`, `PaymentHealthTab.tsx:41`.

- [ ] **Step 3: CampaignDetailStats**

`src/components/partner/CampaignDetailStats.tsx`, строки 26-38.

Было:
```tsx
if (isLoading) {
  return (
    <div className="space-y-3 pt-2">
      {/* Skeleton loader */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: PARTNER_STATS.SKELETON_COUNT }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-dark-800/30" />
        ))}
      </div>
      <div className="h-52 animate-pulse rounded-xl bg-dark-800/30" />
    </div>
  );
}
```

Стало:
```tsx
if (isLoading) {
  return (
    <SkeletonGroup className="space-y-3 pt-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Skeleton
          variant="card"
          count={PARTNER_STATS.SKELETON_COUNT}
          className="h-16 rounded-xl"
        />
      </div>
      <Skeleton variant="card" className="h-52 rounded-xl" />
    </SkeletonGroup>
  );
}
```

Константа `PARTNER_STATS.SKELETON_COUNT` из `src/constants/partner.ts` остаётся — не инлайнить её.

- [ ] **Step 4: Прогнать проверки**

```bash
cd ~/WebstormProjects/bedolaga-cabinet
npm run check && npm run type-check && npx vitest run
grep -rn "animate-pulse" src/components/sales-stats/ src/components/partner/
```
Expected: сборка и тесты зелёные, `grep` — пустой вывод.

- [ ] **Step 5: Проверить рендером**

`npm run dev`, под админом открыть экран статистики продаж, пройти все шесть вкладок с троттлингом `Slow 3G`. Затем открыть детальную статистику партнёрской кампании. Убедиться, что высота заглушек совпадает с высотой реальных карточек и график не «прыгает» при появлении данных.

- [ ] **Step 6: Коммит**

```bash
git add -A src/components/sales-stats src/components/partner/CampaignDetailStats.tsx
git commit -m "refactor(stats): свести шесть копий заглушки вкладок в один компонент"
```

---

## Task 6: Регрессионная защита и запись в канон

**Files:**
- Create: `src/components/ui/skeleton/skeletonUsage.test.ts`
- Modify: `CLAUDE.md` (секция Design Canon, после блока «Иконки» — сейчас строка 143)

**Interfaces:**
- Consumes: ничего из предыдущих задач в рантайме; тест читает исходники с диска.
- Produces: ничего.

**Что делает страж.** Ищет в `src/` строковые литералы, где `animate-pulse` соседствует с `bg-dark-*` внутри ОДНОГО литерала. Это точная сигнатура инлайнового скелетона. Статус-точки (`animate-pulse bg-success-500`), тинт при загрузке (`'animate-pulse'` в одиночку) и декоративные пульсации под неё не попадают, потому что `bg-dark-*` в их литералах нет.

Соседство проверяется именно внутри литерала, а не «в пределах N символов»: в `AdminBanSystem.tsx:714` и `AdminDashboard.tsx:76` тернарник ставит `'animate-pulse bg-success-500'` и `'bg-dark-500'` в одну строку кода, и оконная проверка дала бы ложное срабатывание на легальном коде.

- [ ] **Step 1: Написать тест**

Создать `src/components/ui/skeleton/skeletonUsage.test.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// .../src/components/ui/skeleton/ → .../src/
const SRC_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
const SKELETON_DIR = join(SRC_ROOT, 'components', 'ui', 'skeleton') + sep;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/**
 * Строковые литералы файла. Обычные кавычки и шаблонные строки разбираются
 * отдельно, а из шаблонных вырезаются ${...}-вставки: иначе внешний литерал
 * вида `... ${cond ? 'animate-pulse bg-success-500' : 'bg-dark-500'}` выглядел
 * бы как один литерал с обоими маркерами и давал ложное срабатывание.
 */
function stringLiterals(source: string): string[] {
  const quoted = source.match(/'[^'\n]*'|"[^"\n]*"/g) ?? [];
  const templates = (source.match(/`[^`]*`/g) ?? []).map((tpl) =>
    tpl.replace(/\$\{[^}]*\}/g, ' '),
  );
  return [...quoted, ...templates];
}

function hasInlineSkeleton(source: string): boolean {
  return stringLiterals(source).some(
    (literal) => literal.includes('animate-pulse') && literal.includes('bg-dark-'),
  );
}

describe('скелетоны загрузки', () => {
  it('не верстаются инлайном — только через @/components/ui/skeleton', () => {
    const offenders = walk(SRC_ROOT)
      .filter((file) => !file.startsWith(SKELETON_DIR))
      .filter((file) => hasInlineSkeleton(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC_ROOT, file));

    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Прогнать тест — он должен пройти**

Run: `cd ~/WebstormProjects/bedolaga-cabinet && npx vitest run src/components/ui/skeleton/skeletonUsage.test.ts`
Expected: PASS. Если падает — в списке `offenders` пропущенный при миграции файл; вернуться к соответствующей задаче и домигрировать.

- [ ] **Step 3: Проверить, что страж действительно ловит нарушения**

Тест, который не умеет падать, бесполезен. Временно внести нарушение и убедиться, что оно поймано:

```bash
cd ~/WebstormProjects/bedolaga-cabinet
printf 'export const bad = "h-4 w-32 animate-pulse rounded bg-dark-700";\n' > src/__guard_probe.ts
npx vitest run src/components/ui/skeleton/skeletonUsage.test.ts
```
Expected: FAIL, в выводе `[ '__guard_probe.ts' ]`.

Затем проверить, что легальный код НЕ ловится:

```bash
printf 'export const ok = `h-3 w-3 rounded-full ${x ? "animate-pulse bg-success-500" : "bg-dark-500"}`;\n' > src/__guard_probe.ts
npx vitest run src/components/ui/skeleton/skeletonUsage.test.ts
```
Expected: PASS.

Убрать пробу:
```bash
rm src/__guard_probe.ts
```

- [ ] **Step 4: Записать правило в канон**

В `CLAUDE.md`, в секцию `## Design Canon`, после блока «Иконки» (сейчас строка 143) добавить:

```markdown
### Состояния загрузки
- Скелетоны — только `Skeleton` / `SkeletonGroup` из `@/components/ui/skeleton`. Инлайновая разметка `animate-pulse` + `bg-dark-*` запрещена, её ловит `src/components/ui/skeleton/skeletonUsage.test.ts`.
- Два варианта: `line` (плейсхолдер контента внутри карточки) и `card` (плейсхолдер самой карточки, с рамкой). Третьей заливки не заводить.
- Размер задаётся классами `h-*`/`w-*` в `className`; без них плейсхолдер повторяет высоту текста родителя.
- Контейнер загрузки объявляет себя скринридеру: `SkeletonGroup` ставит `role="status"` + `aria-busy` + `aria-label`. Отдельные `Skeleton` внутри группы ничего не объявляют — иначе экран из двадцати заглушек зачитывается двадцать раз.
- Спиннер (`components/ui/Spinner`) — для точечных действий и полноэкранной загрузки; скелетон — когда известна форма будущего контента.
- `animate-pulse` без `bg-dark-*` — это НЕ скелетон (статус-точки нод, тинт кнопок, декоративные пульсации), такие места трогать не нужно.
```

- [ ] **Step 5: Финальная проверка всего**

```bash
cd ~/WebstormProjects/bedolaga-cabinet
npm run check && npm run type-check && npx vitest run && npm run build
```
Expected: всё зелёное. В выводе `npm run build` убедиться, что `SkeletonGallery` не попал в прод-бандл:
```bash
grep -rl "SkeletonGallery" dist/ || echo "OK: галереи в бандле нет"
```
Expected: `OK: галереи в бандле нет`.

- [ ] **Step 6: Коммит**

```bash
git add -A src/components/ui/skeleton/skeletonUsage.test.ts CLAUDE.md
git commit -m "test(ui): страж от инлайновых скелетонов + правило в канон"
```

---

## Итоговая проверка перед PR

- [ ] `npm run check` — зелёный
- [ ] `npm run type-check` — зелёный
- [ ] `npx vitest run` — зелёный, включая `skeletonStyles.test.ts` и `skeletonUsage.test.ts`
- [ ] `npm run build` — зелёный, `SkeletonGallery` отсутствует в `dist/`
- [ ] `grep -rn "BentoSkeleton" src` — пусто
- [ ] Скриншоты `/__skeletons` в тёмной и светлой теме приложены
- [ ] Скриншоты состояний загрузки как минимум для `/subscriptions`, `/admin/news`, экрана статистики продаж
- [ ] Ни один из 14 файлов «НЕ ТРОГАТЬ» из спеки не изменён: `git diff --name-only dev...HEAD` сверить со списком

## Ожидаемый результат

| Метрика | До | После |
|---|---|---|
| Файлов с инлайновой скелетон-разметкой | 21 | 0 |
| Заливок для одной визуальной роли | 7 | 2 (по числу реальных ролей) |
| Мёртвых скелетон-компонентов | 2 | 0 |
| Копий одинаковой заглушки вкладки статистики | 6 | 1 |
| Копий одинаковой заглушки списка админки | 2 | 1 |
| Скелетонов, объявленных скринридеру | 2 из 21 файла | все |
| Тестов на скелетоны | 0 | 10 |
