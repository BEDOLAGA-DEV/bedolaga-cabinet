# Спека: консолидация скелетонов кабинета

**Дата:** 2026-08-20
**Статус:** утверждено к реализации

## Проблема

Скелетоны загрузки в кабинете размазаны по коду копипастой, а канонический
компонент не используется.

Факты на ветке `dev` (коммит `a451a12`):

- `src/components/ui/Skeleton.tsx` — 5 вариантов, **0 импортов**. Мёртвый код.
- `src/components/ui/BentoSkeleton.tsx` — **0 импортов**. Мёртвый код.
  (Единственное вхождение строки `BentoSkeleton` вне самого файла — комментарий
  в `Skeleton.tsx:12`.)
- **21 файл** верстает скелетоны инлайном, ~40 узлов разметки.
- **3 локальные копии** `LoadingSkeleton()`: `MergeAccounts.tsx:208`,
  `ConnectedAccounts.tsx:284`, `CampaignDetailStats.tsx:29`.
  (`QuickPurchase.tsx:68` и `GiftSubscription.tsx:94` носят то же имя, но внутри
  `animate-spin` — это спиннеры, не скелетоны, и они вне скоупа.)
- Одна и та же визуальная роль залита **семью** разными способами:
  `bg-dark-700`, `bg-dark-700/50`, `bg-dark-700/60`, `bg-dark-800`,
  `bg-dark-800/30`, `bg-dark-800/40`, `bg-dark-800/50`.
- Ни один скелетон, кроме двух исключений
  (`GeoCheckImageViewer.tsx:85`, `SubscriptionConnectFooter.tsx:37`),
  не сообщает о себе скринридеру.
- `--stagger`, который проставляют оба мёртвых компонента, читается ТОЛЬКО
  правилом `.bento-card` (`src/styles/globals.css:426`). На скелетонах,
  у которых нет класса `.bento-card`, эта переменная не делает ничего.

## Решение: свой компонент, без сторонней зависимости

Рассмотрены `react-loading-skeleton` (1.36M загрузок/нед, 26 КБ, 0 deps,
релиз 3.5.0 от сен-2024), `react-content-loader` (679k/нед, SVG-подход),
shadcn/ui Skeleton (copy-paste, 6 строк), Skeleton внутри UI-китов
(MUI/HeroUI/Mantine/Radix Themes), Base UI (Skeleton отсутствует).

**Вывод: библиотека не берётся.** Обоснование:

1. Стоимость миграции одинакова в любом случае — те же 21 файл переписывать.
2. Из четырёх преимуществ `react-loading-skeleton` над своим компонентом одно
   (`prefers-reduced-motion`) уже закрыто глобально в `globals.css:1891`
   правилом `*, *::before, *::after { animation-duration: 0.01ms !important }`.
3. Оставшиеся три (авторазмер по `font-size`, `aria-busy`/`aria-live`, shimmer)
   переносятся к себе двумя десятками строк.
4. Библиотека приносит свой CSS-файл и класс `.react-loading-skeleton` вне
   токен-системы кабинета, а канон (`CLAUDE.md:128-132`) требует только токены.
5. shadcn Skeleton (`animate-pulse rounded-md bg-accent`, один div) беднее,
   чем то, что уже есть.

## Требования

**R1.** Один источник правды: заливка, радиус и анимация скелетона задаются
в одном месте, а не в 21 файле.

**R2.** Ровно два варианта — они соответствуют двум реальным ролям в коде:
- `line` — плейсхолдер контента ВНУТРИ карточки (контраст к `bg-dark-900/70`);
- `card` — плейсхолдер САМОЙ карточки на фоне страницы (нужна рамка).

**R3.** Авторазмер: `<Skeleton />` без классов размера повторяет высоту текста
родителя (`h-[1em]`) и тянется на всю ширину. Любой класс размера в `className`
это перекрывает (в проекте `cn` = `clsx` + `twMerge`, конфликты разрешаются).

**R4.** Доступность: контейнер загрузки объявляет себя как
`role="status"` + `aria-busy="true"` + `aria-label={t('common.loading')}` —
ровно как уже сделано в `src/components/ui/Spinner.tsx`. Ключ `common.loading`
существует во всех четырёх локалях (en/ru/fa/zh), новые ключи не нужны.

**R5.** Только токены палитры (`dark-*`), никаких стоковых tailwind-цветов и
сырых хексов — канон `CLAUDE.md:128-132`.

**R5.1 (уточнено замерами в браузере при исполнении).** Заливка берётся от
`dark-500`, а не от `dark-700`/`dark-800`. Шкала `dark-*` семантическая:
`dark-50` — цвет текста, `dark-950` — фон, `dark-600`/`dark-700` — сырые
интерполяции в сторону поверхности, из-за чего их контраст разъезжается между
темами, а `dark-800` вообще равен цвету поверхности. Измеренный контраст
к подложке (тёмная / светлая тема):

| заливка | к карточке | к фону страницы |
|---|---|---|
| `bg-dark-700` — было у `line` | 1.50 / 1.37 | 1.51 / 1.27 |
| `bg-dark-800/30` — было у `card` | — | 1.02 / 1.04 |
| `bg-dark-500/40` — стало у `line` | 1.67 / 1.61 | 1.65 / 1.57 |
| `bg-dark-500/25` + рамка `/40` — стало у `card` | — | 1.33 / 1.31, рамка 1.65 / 1.57 |

`dark-500` — readability-скорректированный hint-цвет с гарантированным отступом
от поверхности, поэтому он единственный держит контраст одинаковым в обеих
темах. У `card` заливка слабее намеренно: он покрывает большую площадь, а
мелкая строка требует большего контраста, чтобы читаться так же уверенно.

Прежние значения делали скелетоны практически невидимыми в светлой теме —
это унаследованный дефект всех 21 файла, а не следствие консолидации, но
чинится он именно здесь, потому что теперь значение одно.

**R6.** Радиусы по канону `CLAUDE.md:134-137`: строки/контролы — `rounded-lg`,
внутренние панели — `rounded-2xl`.

**R7.** Регрессионная защита: тест, падающий при появлении новой инлайновой
скелетон-разметки в `src/`.

**R8.** Не трогать 14 файлов, где `animate-pulse` — это НЕ скелетон
(статус-точки нод, тинт при загрузке, декоративная анимация). Список — ниже.

## Явно вне скоупа

- Сторонние библиотеки скелетонов.
- Shimmer-градиент вместо pulse (глобальный reduced-motion-килсвитч его всё
  равно гасит; отдельное решение, если захочется).
- Спиннеры `QuickPurchase.tsx:68` и `GiftSubscription.tsx:94`.
- Миграция Tailwind на v4 (сейчас `tailwindcss ^3.4.19`).
- Введение jsdom/testing-library: логика выносится в чистую функцию и
  тестируется в текущем `environment: 'node'`.

## Список файлов

### Мигрировать (21 файл)

Пользовательские (7):
1. `src/pages/Subscriptions.tsx:151`
2. `src/pages/SavedCards.tsx:193,195,196,199`
3. `src/pages/MergeAccounts.tsx:218,219,227,228,229,230,237,241`
4. `src/pages/ConnectedAccounts.tsx:289`
5. `src/components/PromoOffersSection.tsx:329,331,332`
6. `src/components/subscription/SubscriptionConnectFooter.tsx:43,44,45`
7. `src/components/data-display/StatCard/StatCard.tsx:45`

Админские (7):
8. `src/pages/AdminTrafficUsage.tsx:497,511,529,547,565`
9. `src/pages/AdminCampaignStats.tsx:356,358,359`
10. `src/pages/AdminEmailTemplates.tsx:549`
11. `src/pages/AdminUpdates.tsx:270` (ТОЛЬКО 270; строка 101 — статус-точка)
12. `src/pages/AdminNews.tsx:291`
13. `src/pages/AdminInfoPages.tsx:286`
14. `src/components/admin/remnawave/GeoCheckImageViewer.tsx:89`

Статистика (7):
15. `src/components/sales-stats/SalesTab.tsx:41`
16. `src/components/sales-stats/TrialsTab.tsx:38`
17. `src/components/sales-stats/RenewalsTab.tsx:31`
18. `src/components/sales-stats/DepositsTab.tsx:68`
19. `src/components/sales-stats/AddonsTab.tsx:50`
20. `src/components/sales-stats/PaymentHealthTab.tsx:41`
21. `src/components/partner/CampaignDetailStats.tsx:32,35`

### Удалить (2 файла)

- `src/components/ui/Skeleton.tsx` (0 импортов)
- `src/components/ui/BentoSkeleton.tsx` (0 импортов)

### НЕ ТРОГАТЬ — `animate-pulse` тут не скелетон (14 файлов)

- `src/components/SuccessNotificationModal.tsx:184` — праздничная анимация иконки
- `src/components/blocking/BlockingShell.tsx:177,181,185` — статус-точки
- `src/components/admin/ColoredItemCombobox.tsx:194` — тинт при загрузке
- `src/components/admin/userDetail/SyncTab.tsx:174,184` — пульс иконки действия
- `src/components/admin/trafficUsage/trafficUsageHelpers.ts:154` — класс точки
- `src/components/news/NewsSection.tsx:62` — live-точка
- `src/pages/NewsArticle.tsx:323` — live-точка
- `src/pages/AdminUpdates.tsx:101` — warning-точка
- `src/pages/AdminPanel.tsx:433,680` — тинт при загрузке
- `src/pages/DeepLinkRedirect.tsx:172` — пульс логотипа
- `src/pages/AdminBanSystem.tsx:714,1283,1285,1286` — статус-точки нод
- `src/pages/AdminRemnawave.tsx:219` — статус-точка ноды
- `src/pages/AdminDashboard.tsx:76` — статус-точка ноды
