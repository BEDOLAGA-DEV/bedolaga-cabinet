# Changelog

## [1.18.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.17.0...v1.18.0) (2026-02-18)


### Features

* add partner management and withdrawal admin pages ([779fbf0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/779fbf0dc61b5963e2ac48162b02a292155457a5))
* admin partner settings page, partner section visibility toggle, custom requisites text ([76d20fd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/76d20fdb1aa374b2de3f075bda4672484b8b8de6))
* partner-campaign integration in admin UI ([959f892](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/959f89266bd7fe6e8a38d218c7d34e14c509a21b))
* show blocked_count in broadcast admin UI ([9cf8e09](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9cf8e095b8ce45ea92f6289bf275cd82e264dcde))
* show partner campaign links with bonuses on referral page ([8b33d82](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8b33d8224d63509408f96919d702d1eb21bc050a))
* show traffic reset info in subscription card ([271a005](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/271a005e87d21f6a82aad7272c92775a6e1aec6c))
* show traffic reset period on tariff cards ([cfe9f64](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/cfe9f642d842fc0696e379ef59934b300c363a24))


### Bug Fixes

* add missing cancelled filter key to withdrawal i18n in all locales ([9b2742f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9b2742ff3afc627bfe382859e9239b5ba9104ea4))
* hide empty blocks in connection installation guide ([96f9a71](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/96f9a719fd02d5f21c2bd3753c4eb8afd36887c6))
* reduce campaigns fetch limit to 100 (backend max) ([be168a7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/be168a75df500757e0e2f5fbad19c178e3e817db))
* remove duplicate min withdrawal amount on referral page ([98ab109](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/98ab1099b9f9b639221b431205bd7eb9e8432d34))
* remove server/location count from tariff cards and confirmation ([0fac368](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0fac3689e57eee63489a379a966e89825f1a5854))
* rename Серверы to Локации in subscription card ([19e62fc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/19e62fccf1efbb0c17a160348c75f9e695691bf1))
* show all campaigns in assign list, add dual links and bonus details ([a72042d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a72042d8075000db204b0f57c893928cadc68cef))
* show locations count instead of servers on tariff cards ([ecc089d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ecc089da641c3b40739fbc4e77a997c27529b582))
* stop WS reconnect loop on auth rejection (code 1008) ([2efce0e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2efce0eb03c9511e7cd0aa814c364f6216e89e28))
* use correct translation key for inactive campaign badge ([8207368](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8207368ef77a772fdcf70d7ec798ddbbbfd9e63c))

## [1.17.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.16.1...v1.17.0) (2026-02-17)


### Features

* add web campaign links — capture, auth integration, bonus UI ([e0dd21f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e0dd21fd0bde52c4b10175635e605151eb8faf9d))

## [1.16.1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.16.0...v1.16.1) (2026-02-16)


### Bug Fixes

* move cabinet_branding to sessionStorage and add WebGL availabili… ([8200014](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/820001458bcc22e072d21e2faa9b4fe819b4dbad))
* move cabinet_branding to sessionStorage and add WebGL availability check ([fc7ee6a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fc7ee6abfe9920e1b3a51254fde877b66bcfb39a))

## [1.16.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.15.0...v1.16.0) (2026-02-15)


### Features

* add 'no color' option for button style customization ([e586129](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e586129c37d9152122899d3fea8034ceb03b3993))
* add ButtonsTab for per-section button style customization ([b289873](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b2898730b98b3bf73d075158a9f59ef5bf1f6e54))
* add per-button enable/disable toggle and custom labels per locale ([1a0a5ff](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1a0a5ff45313da383ed402b09a630e2774d2ae04))


### Bug Fixes

* normalize all API responses, add error handling and reset confirmation ([150a1b2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/150a1b2dbaeffbf39e00c6f75b2761a854821b09))
* prevent button settings cards from overflowing in admin panel ([54f1483](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/54f1483312e776f3c02cdcd797fe392482ed3e1d))
* wheel lands on correct prize sector for Stars payment spins ([22bda66](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/22bda66e81714a2ff3e8de02b216af70509ced3e))

## [1.15.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.14.1...v1.15.0) (2026-02-12)


### Features

* add admin pinned messages section ([88cc0d9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/88cc0d933e1ee24c854f7e2f32698698201ec06e))
* add admin pinned messages section ([aa5113b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/aa5113b8e309babb530e849fac12ae87a4769e9f))

## [1.14.1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.14.0...v1.14.1) (2026-02-12)


### Bug Fixes

* allow email change for unverified emails without code verification ([a0b10e6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a0b10e688cd96ecbab767bed4ee1abdd5aefc4db))
* handle unlimited traffic package selection and button text ([1d6ec70](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1d6ec70116a2d2f776a088e5045e72cfc5d452ae))

## [1.14.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.13.0...v1.14.0) (2026-02-11)


### Features

* compact login page with collapsible email, icon OAuth row, safe areas ([45cbfb5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/45cbfb5ecb194eb9cdcee5a9cf8b4f79c20c1444))


### Bug Fixes

* guard oauthProviders with Array.isArray to prevent TypeError on Login page ([f74e316](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f74e316161c3bea18bc9493e683556314db6172b))
* harden OAuth login flow — open redirect, path traversal, info leak ([a744b41](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a744b41910743e9604de669535f56a614fa269f1))
* remove colored background from logo on login page ([6bf0af4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6bf0af4ff33adcd74d7ac291f4e6e4734e1e72f1))
* remove redundant subtitle and register hint from login page ([d596b05](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d596b05048b4b14fac68acd606842d717bbc9dd1))
* restore package-lock.json for CI (npm ci requires it) ([069090a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/069090a63412fdb99debe6e6058218b1e4105953))
* use openTelegramLink for CryptoBot payment to open invoice in Telegram ([fc0dd39](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fc0dd3955092235c5b52c4da066954b6e3beaa19))

## [1.13.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.12.0...v1.13.0) (2026-02-09)


### Features

* add empty state for connection page when no apps configured ([fb25df6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fb25df6f0f5dee55fc40496e29bf22c94efc27b3))
* show affected subscriptions count on tariff deletion ([f10a02c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f10a02ceb6649b2dd4301365919fc066d604e95f))


### Bug Fixes

* check apps before subscription on connection page ([a4e6e35](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a4e6e35da1f86163fbdb0ba90fd28c8ccdef4ed6))
* hide Telegram back button on bottom nav pages ([03a7db5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/03a7db53fbbf77d74f1f68ca8e723793d67c2dfb))
* hide Telegram back button on bottom nav pages ([e5ed6d0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e5ed6d0401892eabebd5bd226755cbf5f5ca927c))
* prevent useCloseOnSuccessNotification from firing on mount ([0389acd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0389acdf83eb8f0e14301f0d0515000467a30ccc))
* remove [@floating-ui](https://github.com/floating-ui) from radix chunk to resolve circular dependency ([772d83d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/772d83d1c97f2689376bcadbd7b3c37cf8cb797e))


### Performance Improvements

* extract locales into separate chunk ([2c126f5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2c126f5e12d51beff6e21280b423b1851f93a0ac))

## [1.12.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.11.1...v1.12.0) (2026-02-08)


### Features

* add admin traffic packages and device limit management UI ([2dfa520](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2dfa5206046b50f4bc22793dfb448f684286adef))
* add admin updates page with release history ([a15b3d4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a15b3d410157f916c6008f7dbbe24b1284d3d595))
* add device management UI in admin user card ([6f31fbe](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6f31fbe6b5638e400db2ea16af65ab69979dca97))
* add enrichment columns to admin traffic usage table ([893c69a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/893c69ab6fc05ddc4bb64d229ae20376471a4f07))
* add inline referral commission editing in admin user card ([92d206f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/92d206f5b655cca2cceff172305f07d5edc551b7))
* add system info card to admin dashboard ([ab0270a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ab0270ac58565f883722f7b04aa300b644e7973b))
* admin panel enhancements & release history ([3bd9abb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3bd9abb1db2aef6b4428f62a020b4ea57b6a3c85))
* enable sorting on enrichment columns ([5678dfd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5678dfd55854d884220a02075fcc0f025752c189))
* render GitHub markdown in release changelogs ([0c34668](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0c34668e40d9d4eb7037da7d6f5c2c40c87b208f))


### Bug Fixes

* show email for OAuth/email users in traffic table ([a8ea5c9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a8ea5c958f846d84945ebbca2e30f002421786ff))

## [1.11.1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.11.0...v1.11.1) (2026-02-08)


### Bug Fixes

* hide backend URL from logo by fetching as blob ([de09ea0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/de09ea039bea2fdfe3f3a9b3bc6c368a3a27f9f7))
* stretch low-res Aurora canvas to fill viewport ([23f56af](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/23f56afaf7182de6e8164fdc0075d4b4b02780d8))


### Performance Improvements

* reduce Aurora animated background GPU load by ~95% ([56788b1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/56788b12e78ea2f45571b0a0f3a8c2e3b667355c))

## [1.11.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.10.0...v1.11.0) (2026-02-08)


### Features

* admin traffic usage, session persistence, and UI improvements ([2193df7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2193df799d839976cc19127ff4242c35c350e0b9))


### Bug Fixes

* persist refresh token across Telegram Mini App reopens ([a449dd6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a449dd69813417c3064510ea300090f34dfcd8cf))
* persist refresh token across Telegram Mini App reopens ([20ea200](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/20ea2006ff703a76208c8ecfb8e2d9c2d789ccc4))

## [1.10.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.9.0...v1.10.0) (2026-02-07)


### Features

* add admin traffic usage page ([8c8fa40](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8c8fa407f5dde627159a8c368c9ea75eb74ac774))
* add admin traffic usage page with TanStack Table ([a034a60](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a034a6068ccea07c6581427d3e80af754b175820))
* add country filter and risk columns to traffic CSV export ([471e2c8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/471e2c8c43212c03b72d8f270182b731738836bd))
* add node/status filters and custom date range to traffic page ([90b38e3](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/90b38e3ef2815300ee4b50a4d3da0b1422d21092))
* add node/status filters, custom date range, connected devices to traffic page ([0301fd8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0301fd856639a0d70cb2a7201cfe80b3936dbc8d))
* add node/status filters, date range, devices to traffic page ([e824945](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e824945b733e3321bb2a785da52580508f00b64e))
* add promo group and promo offer management to AdminUserDetail ([8bd3c00](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8bd3c007bcceae947fc6f269694dc70a93c69db9))
* add tariff checkbox filter, column resizing to traffic page ([cfb7ce7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/cfb7ce72f2fde01dc548b9c4b263f8b3b0a37074))
* add traffic abuse risk assessment with color gradation ([a6507b2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a6507b2cfe73d3f9dafec9e87fd17e287c91067d))
* node/status filters + custom date range for traffic page ([8b113a5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8b113a54e39e9dc43d230fa970adccedd4f98a8c))
* promo group & offer management in AdminUserDetail ([280f4ae](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/280f4aef0d23c74f0afc038bd4d7af33f55e4aff))
* tariff checkbox filter + column resizing for traffic ([c383c78](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c383c782133a2ba4226e928723102dfddf7b7cd4))
* traffic abuse risk assessment with color gradation ([88f8e8b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/88f8e8be7d41759af3376f0b8a6df512b3b0fce3))
* traffic page filters, risk assessment, country filter & CSV export ([84cce93](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/84cce93aec928680e3c8380bf99739d4b2e81e47))


### Bug Fixes

* add client-side caching and smooth loading for traffic page ([471c37b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/471c37b7b3f64c08f2d749f4089009eb53ae7cac))
* allow user column to shrink smaller on mobile ([6aa8951](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6aa8951ce251eacddb897f8d8abf566b22a8e9c3))
* allow user column to shrink smaller on mobile ([12663a5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/12663a59a7aaec87933e9437d329d452f09ee2fe))
* client-side caching and smooth loading for traffic page ([81fcf54](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/81fcf54b1571970bf14175773bcdeb3aa706acfd))
* column shrinking on mobile + country dropdown overflow ([1aa0e7f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1aa0e7f943ef392a06778914edbb78c8bbbab8ce))
* enforce column maxWidth for proper shrinking on mobile + country dropdown positioning ([060c9be](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/060c9bef54c031503b72a819852f58f855591e33))
* improve risk assessment display with GB/d values ([4fe96bc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4fe96bc00c8a8f4fcad088bac6ee9516445f9a89))
* improve risk calculation display with actual GB/d values ([e60b846](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e60b846eca6dfb0d31a191c990ddccb5c8089d07))
* widen column resize touch target for mobile ([c54cc9e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c54cc9e57733ab2a0e4476ced2967d2a7feeadcd))
* widen column resize touch target for mobile devices ([da273d6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/da273d6776adc7212057f5857884d58144b89134))

## [1.9.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.8.0...v1.9.0) (2026-02-07)


### Features

* add 1d and 3d period filters for node usage ([f36ee60](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f36ee60c0b74bc6b3d0f51aa1c6ec0d50e5f38d7))
* add 1d and 3d period filters for node usage ([944b2ec](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/944b2eca02cef28fcb6c0e919fdcfea54cd8dbc7))
* add Info page link to desktop top navigation ([fa48cc4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fa48cc438b0b9e5df9fb1ca69c91196e0ba8153c))
* add Info page link to desktop top navigation ([18a14d6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/18a14d64eac156266348911fdcb49a8d690b1c1b))
* add OAuth 2.0 login UI (Google, Yandex, Discord, VK) ([83aeae8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/83aeae81b86c99615f0175cf0f3b1f656f6c66cc))
* add SVG brand icons for payment methods ([c4f228f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c4f228fba6cbb0fe9ce0ac007e05c0cf2bf1fff0))
* add ticket status buttons to inline chat ([5664b28](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5664b283d6414e853488a86b42f75b49b35dc3d2))
* add ticket status change buttons to inline chat ([dafa69f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/dafa69f73689828749072c99206dd7d7f9ea766d))
* add tickets tab to admin user detail page ([995c034](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/995c0348dc8a65bc3e8432911c15137fe7e72bfa))
* add Twemoji for cross-platform emoji rendering ([031396d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/031396dd4529e20fe4d6727f02c84a0b5741cf76))
* add Twemoji for cross-platform emoji rendering ([72b1089](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/72b1089af7b2e830d993780b45225bd10361722a))
* add user profile link button in ticket detail ([d483d84](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d483d84f1c3d22a6220116d581613146b98e4fc1))
* brand-accurate payment method icons from favicons ([e24afc4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e24afc4b6f9b5d9048c8af2d0e427f7e5916cd0c))
* dual-channel broadcast form (Telegram + Email simultaneously) ([772dcf7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/772dcf72365581be587456cd1f7e35c969b7c898))
* dual-channel broadcasts (Telegram + Email) ([74f6c61](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/74f6c61eb3bf317f16348779a4b5286f209d0a77))
* enhance admin user detail with campaign, panel data, node usage ([0083b47](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0083b47d0459995e94470df005fe341fe666c41f))
* enhance admin user detail with campaign, panel data, node usage ([7b19f14](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7b19f14dc3628dfdea93fbcb995fc13b5276c8da))
* inline ticket chat in admin user detail ([0b10cfe](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0b10cfecf33b329a79a958858829289d4401b769))
* inline ticket chat in admin user detail ([145d94a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/145d94adcdefafb3257340544e04817cc729f2d4))
* local period calculation and refresh button for node usage ([64ea757](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/64ea75738feb1338c608754170fa7489b9926f54))
* local period calculation and refresh button for node usage ([bc6985f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bc6985f5222bc28db10f66c2a60aa073ac68d87c))
* move user action buttons to detail page and fix full delete ([2490399](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2490399f8eb8a96ea0992c134f4a33c6001c885e))
* move user actions to detail page, fix full delete ([dad0c5b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/dad0c5b756a2e99984ee1c423c9c80f6551070e6))
* OAuth 2.0 login UI (Google, Yandex, Discord, VK) ([b7aca0c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b7aca0cc1c924763771853c680d656b2314ed79e))
* support Telegram HTML formatting in privacy/offer content ([fb055c0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fb055c04e878e61be244c1e3ad5dd5f53cf29496))
* support Telegram HTML formatting in privacy/offer content ([3e70008](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3e70008b81a05781bff578328b4e96e2387278ab))
* SVG иконки платёжных методов, фикс колеса удачи ([2003052](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/20030527f07cf1baf6754713883475c33dd86524))
* tickets tab in admin user detail ([1426e46](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1426e46c844d29d2fff39d5f4fbf159790f6ea8b))
* update payment method icons with brand-accurate favicon designs ([33e878d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/33e878da846409868f623b36532b7d73a1a678d0))
* user profile link in ticket detail ([e0c9a89](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e0c9a89d347e1f44fee4274624707cefc690abff))


### Bug Fixes

* add country flags to node usage display ([14b73f6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/14b73f6db5f7ce1b17de46eae97292f09d9c2034))
* add country flags to node usage display ([80bad9d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/80bad9d623a2fc125ac3090b570115ba8ea001b0))
* hide onboarding when blocking screen is active ([af25e6a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/af25e6a1b8b65168db520d2a7ede661641ab0a58))
* hide onboarding when blocking screen is active ([4791a9f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4791a9f19605624bceb9bdba22a3e0c97168ea6e))
* move theme save/cancel buttons outside collapsible section ([7c30454](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7c304545f8fcef0a2d1d589255d363bd35fe877d))
* remove incorrect ruble top-up prompt from fortune wheel ([2c0d265](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2c0d265ff5c3ea9e3ed56fdb24cdd2301abba617))
* remove payment method icons from admin pages ([77e0edf](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/77e0edf12d8a792623added1b438dafbbe824879))
* remove payment method icons from admin pages ([dd9ed83](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/dd9ed83b085c45dff2137dcda3820eba000ab8e2))
* theme custom colors not persisting after navigation ([174fefd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/174fefddefa68156f9bb8359268f92b8f210f73d))
* theme custom colors save button not appearing ([ab80e31](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ab80e311b56e4e1fc1b4eca851b52db3af28f79c))
* кнопка сохранения ручной темы не появлялась ([017a6fa](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/017a6fae35a395234ed6dcbd546e11cc7d38d455))

## [1.8.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.7.0...v1.8.0) (2026-02-06)


### Features

* add blacklisted user blocking screen ([c5cad20](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c5cad20a6f2069cf044d2a8fd55d1272d2631a40))
* add blacklisted user blocking screen ([5a8c1e7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5a8c1e7e33f4b5f3556076008842181098b65981))
* add drag-and-drop tariff sorting in admin panel ([ef365db](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ef365db16b435862a56d7b9de46a668f5ccba11d))
* connect RemnaWave baseTranslations and fix SVG icons ([a50dea9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a50dea9a3d23c021948d720c06e6d54e22cbf92f))
* convert ConnectionModal to /connection page with crypto deep links ([445dd06](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/445dd0601a0a262d12a3329829516b9beb43693a))
* drag-and-drop tariff sorting ([6f3abf8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6f3abf82602765236ad98275d939a6f7e0474895))
* render original RemnaWave blocks on connection page ([79afe3a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/79afe3a733167c6a64627aff70290a5f1815c6c2))
* **subscription:** auto-skip server selection step when only one available ([998f9db](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/998f9dbaf0ea9c3ae28ece77b4906e0f6e8f704f))
* **subscription:** auto-skip server selection when only one available ([e5a1c04](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e5a1c04980e50f2e13494f6e45319872a8e65dfa))
* use app-level svgIconKey for app logos and improve tile contrast ([65a6714](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/65a671470d1be2157ac2670e9eb1933cda90581f))
* use platform displayName from RemnaWave config in connection page ([53940a0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/53940a0169074ca5f1c40082bdfb13b2437406a6))


### Bug Fixes

* add bottom padding to last block in minimal layout ([5a69496](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5a69496dde580341040efbeb625e072a192296d5))
* add light theme support to connection page ([88d9377](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/88d9377adbcb74336a25748ae13d7baf7c7da4f1))
* add retry logic for Telegram Mini App auth failures ([a1c0ceb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a1c0ceba19d5069c81e12c4c388d29f9790adde8))
* full-screen page loader and remove bg flash on transitions ([30d984c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/30d984c5d464d3ca553b572d8dea8e5b66091288))
* increase bottom spacing for installation guide blocks ([c669d2e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c669d2e9b5fa09f552c583a43661475fc859160a))
* match header icon sizes for theme toggle and logout buttons ([48eee9f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/48eee9fac4b4d871f94c185723ad27aa0327e60c))
* prevent header layout shift and unify action button styles ([d900c6f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d900c6f1527c7982442dae86531d7d0119f7c831))
* prevent header nav shift with invisible theme button placeholder ([50e675b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/50e675b6e93a9279f95dc8a9ea415c481df54148))
* remove local toast from AdminPaymentMethods, use useNotify ([692e45a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/692e45ad1833d670420ee5ca3f628106db7c6eab))
* remove nested scroll constraint from tariff servers and promo groups ([c944e9e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c944e9ef0ba76f94917b69f4bc3c24829220c246))
* remove space-y-0 that overrides block margins in minimal layout ([c4f1070](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c4f1070f23c414cd4278e95dcc401140ee10e57d))
* resolve RemnaWave SVG icons and icon colors on connection page ([91afbbf](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/91afbbf3c629defcdac0d3fd6d42d31e4d1610b4))
* resolve Telegram Mini App auth failures on all platforms ([7df751e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7df751ea3570d4855ce921f79e096b1679f4b42e))
* restore platform dropdown with SVG icon and widen app chips to match original ([966343a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/966343a4d8ce4ae37a2da1c5270754a70f43467a))
* restyle app cards to match original RemnaWave UI and debug icons ([42e70f7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/42e70f72ffbd378bca1e6efed870c4212f8e48c1))
* standardize admin form inputs, validation, and sync with backend constraints ([6e7eb36](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6e7eb36f761532202e89b690d0e6b6876e5cef5e))
* **subscription:** display promo discounts for devices, traffic and tariff switch ([6c22a52](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6c22a522cccb2c371ac110a12efd5c823cee5848))
* **subscription:** display promo group discounts in device/traffic purchase and tariff switch ([46b93ef](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/46b93ef098798e626ea8504ceac32f4736f3ea65))
* theme preset persistence, page transition flash, and wheel LED jank ([f54ad4e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f54ad4eb1f88d053a9e21ca3846771133729c2e4))
* unify connection page design with global styles and add platform SVG icons ([4866003](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4866003c23be3a7c02bee5ac4b5c4246c928f192))
* unify toast notifications and improve visual/behavior ([66a6697](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/66a6697ea1475d680ca58e68083f67af5174a0fc))
* use redirect page for all platforms and fallback to regular subscription URL ([5111b63](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5111b63f2e5d4533a6a25994bd1051f8c0d48972))

## [1.7.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.6.2...v1.7.0) (2026-02-04)

### Features

- add Stars payment confirmation and admin validation ([e6f8ae6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e6f8ae6ab09c431d5322c851165f30469678ed72))
- replace payment modals with page-based navigation ([576893f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/576893f5c6b67c19bee0cd562cd0430a88350619))

### Bug Fixes

- dim accent color for background blobs ([bb32cd8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bb32cd8757b116728c0e7357fc40bcb842e7a476))
- inline Stars confirmation and unified payment type display ([8068f84](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8068f847247307aa3adae1f6965987882be8a785))
- prevent payment type reset after wheel spin ([4499c9a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4499c9ad57dcdcd3126c8d4261bc9f32accd21d7))
- unify wheel Stars payment across desktop and mobile ([02640d1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/02640d1c38dde00d431058a399adcc85fd9bcaac))
- update Aurora colors reactively without recreating WebGL context ([59a251c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/59a251cb8c706b3029990e58fc6003ce620f80d3))

## [1.6.2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.6.1...v1.6.2) (2026-02-04)

### Bug Fixes

- add theme toggle to desktop header and sync theme across components ([bf00d37](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bf00d37b4af799130e3dd8cd2c083ec933833281))
- Aurora animation ignoring light theme background color ([c1dc019](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c1dc019c8b2819e13da42ad1c2648740a09279d1))
- replace individual light theme overrides with CSS variable swap ([9ac00c9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9ac00c94a6805577d6ac71e83fae5032217a31c9))
- use dynamic champagne variables for light theme palette swap ([ecd912b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ecd912b16a63b692b45361cfa53e7cacb0cb3e4f))
- use theme surface and background colors for Aurora animation ([a91e055](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a91e0555979540f50ca1afef5ee8c91b162c4a7f))

## [1.6.1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.6.0...v1.6.1) (2026-02-04)

### Bug Fixes

- add fallback recovery for Telegram popup callback not firing ([7ac7db4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7ac7db4ddb2950216334be01db37f185594bea6e))
- add HMR guard to prevent ConcurrentCallError on SDK double-init ([bcbda17](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bcbda17220357815ee2df269e293db0fecee7bd3))
- get fresh Telegram WebApp reference on each popup call ([792fb1e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/792fb1ed8a1cc4d4a5350556308e00e8cad5313a))
- prevent duplicate Telegram popup opening ([71647eb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/71647ebc8795fc57f958d4fdedfb2f9c0b23837e))
- prevent popup cascade when Telegram callback doesn't fire ([2d00a5c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2d00a5c21fff339f229d8fe2001a898d15722cdd))
- resolve SDK v3 mount errors, back button and fullscreen not working ([61e3910](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/61e3910981e401fbc0b968615307e5101f6f96e9))
- use direct dialog.popup call instead of useDestructiveConfirm ([ef77276](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ef77276246fdb60255f625289542584b83c93fcc))

## [1.6.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.5.0...v1.6.0) (2026-02-04)

### Features

- add animated MovingGradient background ([24781f3](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/24781f32ec0b7889ddb4a88d994d91b6d8593dec))
- add autocomplete to settings search ([e5096d5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e5096d571ff0b9ea3fb9c08c1cbece46a1ece656))
- add locales for user search in promo offer sending ([0c9d092](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0c9d09280c600e03c8cd8b7f51c8eb27c664c22c))
- add Telegram/Email channel selection to broadcast create page ([0773afd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0773afdf6e37f0b8da679a176048764110795919))
- add useNotify hook for unified notifications ([6f4d1ef](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6f4d1ef08587a671a3060c304bc8603df5d9a17e))
- add user search autocomplete for promo offer sending ([fc92267](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fc922671d2fe2de7e4961205158c8e7e3404020a))
- extract promocodes and promo groups into separate pages ([a96ddde](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a96ddde314d938c2ee2e7c8fe7eaab84007060df))
- improve tariff builder UI ([e19767a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e19767af82ed84c80f1e5cb0e9535962d360fd54))
- Linear-style UI redesign with improved mobile experience ([b953ee0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b953ee0b8c79c6340eca0467d65fee22d362875e))
- migrate to [@tma](https://github.com/tma).js/sdk-react for Telegram Mini App ([edb5be0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/edb5be09ae372b6ee2985484518bdf76d87b89e4))
- move campaign statistics to dedicated page ([1027deb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1027deb134d58f72f40b2f18878e8700683a4c86))
- move ticket settings to dedicated page ([ead4606](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ead4606bb59e59c50445c7b7198abf42c54e1326))
- redesign fortune wheel UI and add to mobile nav ([7e2802c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7e2802c5b5ee4bae1cf8d07009056e9c66688197))
- redesign fortune wheel with improved UX ([494285b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/494285bcbf99d8f74873dcf571b0a780e968100b))
- replace broadcast creation modal with dedicated page ([175516e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/175516ec9bc85575483fa7223838e5f52e4cfe7b))
- replace campaign creation modal with dedicated page ([bce4d94](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bce4d94229c81d67a7621faccf9a69bd6b61d5e9))
- replace MovingGradient with Aurora WebGL background ([cffef41](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/cffef41f634f940da07645461420f32554e6da9d))
- replace tariff creation modal with dedicated page ([dc17695](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/dc1769520612286bc2da4bd25c23a60ab38792f3))
- scroll to tariffs section when clicking discount badge ([3613294](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3613294a7869e6866d3f3d5d2dccde4102e05b9f))

### Bug Fixes

- add full i18n support for RemnaWave section and improve sync UI ([ed86dfa](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ed86dfa8bd0c680f842bc17ef7663ee1d266ee11))
- add missing i18n keys for broadcast detail page ([c60a242](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c60a242f1da4b03d44d56485d83313755a5a0c8e))
- add placeholders to all tariff form number inputs ([8cd95b8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8cd95b84fb703104d436d4ce417d3ab57aa66f9f))
- add Russian translation for device limit reduction reason ([e884860](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e884860ab86b6cbcdb9db2858f47bd3813a18740))
- add Telegram header padding for Android fullscreen mode ([093c9f2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/093c9f28935133cd300bf4c481d5c798011ecbfe))
- AdminTariffCreate back button and daily tariff colors ([d623cd4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d623cd41e9e9e15733c68b9640f0296f37043468))
- allow clearing number inputs and add validation ([47e28ee](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/47e28ee78fd417db86ad4a026f5983f68f0e1c76))
- Aurora uses theme colors from API with blur overlay ([55ae55f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/55ae55f4af1050207ceac6db992f6bf66ce4b77b))
- disable Telegram swipe-to-close globally to prevent accidental app closures ([9b0be28](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9b0be280d292179fb6e9f219c21d18ce1ae7e5fc))
- disable Telegram vertical swipes during drag operations ([8deca2f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8deca2fa5bf1da2ba76191616d4a1638d1d79f9d))
- handle unmounted SDK components gracefully ([baa57b9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/baa57b907ecb3ada3623eafcffbc070a56e1915c))
- improve admin user detail tabs scroll and sync buttons design ([45dac03](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/45dac039f9e77f55fefe6ea1e761edd037bd13d8))
- improve header layout for mobile - stack button below title ([643d4fd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/643d4fd3af891fc9a9e27501dae715f91242f200))
- improve mobile layout for bandwidth and add pluralization support ([e9af285](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e9af285dadeeb0ce951940be46e07561f61844d9))
- improve tariff delete button visibility ([5b30f24](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5b30f24e7e3bd672464a0314433d8649267e7828))
- improve Toast visibility and allow tariff deletion with subscriptions ([36cc01c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/36cc01ca7e2489d603d96673f93237648832223e))
- make Aurora colors vibrant and increase speed ([851e6a3](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/851e6a353bbf5c48c7cdf36ba1d9fd821c775aff))
- promo offer button mobile layout ([1d4a99c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1d4a99c47432128402d213a3be3cbd9f316e6171))
- remove dark backgrounds causing black rectangles ([2926a5a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2926a5a89c522b2133b9f56eef950031c0f7f2c1))
- remove page transition animations to prevent flashing ([dda8323](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/dda8323b452bd3d3054d5bbdd607ce5c7a27a6a4))
- remove quick actions section and optimize build chunks ([de613d9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/de613d909d64b4e1853032447df671939ddad9b2))
- remove small discount badge and improve large badge UX ([822b9a6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/822b9a6265e7c9b14c4ef630e80ee81ef9597496))
- restore page animations, improve checkbox visibility ([5ad5e8d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5ad5e8d3657b8074305fd1c8b94cebd5c6cb4af2))
- revert to native Telegram WebApp API, remove SDK usage ([6f8bc4f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6f8bc4fca592f074d4705069a48bbaef3e5a105d))
- scroll to start of tariffs section and wait for data to load ([c815ac2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c815ac29ea281056908f39dfb6a390b3b201377b))
- UI improvements - reduce Android header, hide mobile scrollbar, disable animations in Telegram, consistent menu overlay ([768b340](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/768b340c35c5f145940bb9966e2e6713039be32f))
- unify card styles across the project ([4a25d8d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4a25d8df03b26f25800f882e46223bab64873b73))
- use native Telegram popup for email preview restriction ([7aeb47f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7aeb47f583056d651b90db4ed7cad2d2a2aef3b1))
- use pill-style tabs in admin user detail page ([09584fc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/09584fc901d778453fbda437d643f4bd9c4321e3))
- use RemnaWave icon in admin panel menu ([4034b4d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4034b4db3932cab273636bb54bf796aff6de712c))
- use single shared WebSocket connection and optimize build chunks ([f6854c6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f6854c6c3aef3ff46d7839dfe94d2ec6bf4d7d64))
- wrap all SDK isSupported() calls in try-catch ([e5ea09d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e5ea09dd3a13ec47ca65de93c6f5858c1fadb135))
