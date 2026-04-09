# Changelog

## [1.44.2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.44.1...v1.44.2) (2026-04-08)


### Bug Fixes

* batch bug fixes matching backend changes ([e6f6713](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e6f6713b0e9b854d7eb88f4e2a53b26656637079))
* batch frontend fixes matching backend changes ([608a752](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/608a75220f19bf64a956601c00fcec7bb974c41a))

## [1.44.1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.44.0...v1.44.1) (2026-04-03)


### Bug Fixes

* 100% discount display + Telegram widget fix + sparkles icon ([300cb07](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/300cb07c58d8f374abde47b861f4757e236d4eb0))
* complete sparkles icon in trial offer card (was showing only 1 of 3 sparkle paths) ([1cf9526](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1cf95267138908e2da79e1da3ebb25c2d0ae03be))
* support 100% discount display + fix Telegram link widget race condition ([207af81](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/207af81c953eccb2e474cca47dfe9434e8a58527))

## [1.44.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.43.1...v1.44.0) (2026-04-02)


### Features

* move email linking form into Connected Accounts page ([6fd0668](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6fd0668a243ed9ada8485586216e3956d35edc8e))


### Bug Fixes

* add key prop to AnimatePresence, accessibility labels, remove hardcoded fallback ([7892630](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7892630e3bd4006e7f5dcd95d5e378c8a4d7e8f7))
* subscription tab not highlighted on detail pages ([e2f81ad](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e2f81ad28dd5caaee8d5b5a0796b4b78a6c36ace))

## [1.43.1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.43.0...v1.43.1) (2026-03-31)


### Bug Fixes

* admin users search not working on pages beyond first ([fe609a5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fe609a505b99ec54c76969e4eb7d35b4973243e9))
* unblock page rendering when Telegram CDN is unavailable ([826a82a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/826a82aa1cddbd9a5b225632186ad98d7d71434d))

## [1.43.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.42.0...v1.43.0) (2026-03-29)


### Features

* add "Add Referral" button to referrals tab ([222a123](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/222a1239efc6b83fcf9e62fa9afb05a8042d7016))
* add Referrals tab to admin user detail page ([e32663f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e32663f291bb9e4a374f3edbe3612b2e6a0a929e))
* add Remnawave panel 2.7.0 support ([a50c06c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a50c06c10195d41d857a6f123a1f8deff69e7330))
* add server selection for test_access promo offer templates ([5246ad2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5246ad2a091b2f25609fc7d56ab4617d231cded6))
* add subscription selector to admin sync tab for multi-tariff ([aa989a6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/aa989a6ade0a25a0dc47ed1bb6e9a8fc542700df))
* add Traffic tab with per-inbound breakdown in admin remnawave ([4ebc21b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4ebc21b3480781f3534da206add881279fcff369))
* add WebBackButton to all sub-pages, widen renew page layout ([31d0953](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/31d0953c2395f35c9ac62ad85891c9a49570a012))
* delete expired subscriptions with confirmation dialog ([fe75fa4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fe75fa45f02485bae3c9eed0852e4858aeac5144))
* dynamic language list from API instead of hardcoded array ([07500ed](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/07500ed2151c6c2357501a43505fdc0e4e8d54f2))
* enhance subscription list UX with progress bars, status badges, and glass theme ([376e1bb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/376e1bb56db682251ed1fa01ec881465768e7cc3))
* multi-subscription frontend support ([96ff258](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/96ff2585f21c0692807485c73853e5f674431df8))
* multi-subscription frontend support ([820ba46](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/820ba46cc42d768279acdfbec4203ee591621302))
* multi-tariff purchase UX - disable switch, show Buy for new tariffs, correct page title ([bcbfa41](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bcbfa4191e1727ece7053c84329502f2b0d36709))
* redesign admin panel with glass morphism UI, animated background, and stats bar ([0bb064e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0bb064e2c04b7a2c38f77cc69ceab6daf983081f))
* redesign admin settings with tree navigation and compact layout ([21813ef](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/21813ef82ecd89c349ceeee23d713f969ff9f02b))
* send language in payment requests for localized descriptions ([2b03e7e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2b03e7e514f59e5d0f8601568206a9b3e19b3f05))
* separate renewal and purchase flows in multi-tariff mode ([82eb03d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/82eb03dec9e2b726e28ad318f31c459b525680e6))
* show autopay/auto-charge status on subscription cards, invalidate list on toggle ([871b476](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/871b4769aa04ed7418ffcacee67f2d5bd3634699))
* show country emoji and provider name in traffic tab ([88c93e2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/88c93e2b5f65331e61d5d928f15239ba02c98deb))
* show MULTI_TARIFF_ENABLED setting only in tariffs sales mode ([60f11e9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/60f11e97a21e45b86f1183c948314ce58c58baf2))
* show per-subscription mini-cards on Dashboard with tariff name, traffic, devices, date ([09f467b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/09f467bfb36e89e6922d3add3e255351a5e6cabc))
* tariff selector for trial subscription promo codes ([94b9b9e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/94b9b9eb94d31d0cea8fb815b892f47d9a27a2e9))
* wheel subscription picker for multi-tariff mode ([2921d8c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2921d8cae66beb9005128e0a810471066091f647))


### Bug Fixes

* add i18n keys for Traffic tab, prevent sort mutation ([5d7b94f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5d7b94fc4867bbdca22f8a46268c238145d626d9))
* add missing balance cache invalidation after mutations ([9546e0f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9546e0ffe64ce7bf146c38fa617c6cfb41f67803))
* admin per-subscription panel data + hide purchased tariffs in create ([c7c2167](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c7c2167908f3a85f6b3e94cda5dbfcaa4d2f95ee))
* allow zero price for device and traffic topup in tariff settings ([8ba5cea](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8ba5ceae106d6265d791697bd477344f2be28c36))
* auto-reload on stale chunk errors after deploy ([c697ddb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c697ddb2240c4db5a4989a3f9d7742b86fddf9cb))
* back button goes to dashboard in single-tariff to prevent redirect loop ([45b7c85](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/45b7c857fcdd5a395bac68e88ff5402dcff5e9d8))
* bottom nav disappears after visiting payment page in Telegram ([3b659b7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3b659b74509b2fc83d827d7a506eade91f83dbf2))
* constrain delete Sheet width on desktop — centered max-w-md with rounded corners ([93fa435](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/93fa435ff7075c680cb31bf67839958e176a7ddf))
* correct glass theme and haptic API usage in Subscriptions page ([44d6069](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/44d60692948730ce458eed2758f0046c5cfaf2dd))
* desktop vertical alignment regression and touch target sizing ([3e6c021](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3e6c0212a67d630ec55bb9608fe1e96a8a0e7a44))
* filter existing referrals from search and clear stale results ([48fe923](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/48fe9235ffc44f8c82c391b3c9f6a9b7e376e7b7))
* four bugs in referrals tab from review ([63f7fa0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/63f7fa0a31d5b80cb3f04cd06f71029c14b37d29))
* gift code activation URL encoding and prefix handling ([859bd24](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/859bd24d8e97089caa6fb153fe6f3b6c99044af9))
* handle merge flow from email register endpoint ([0d4ddb2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0d4ddb26d93a9261bc16812d542e57d1a30c7a6f))
* handle undefined inbounds/outbounds in traffic tab ([06f6cbe](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/06f6cbeb8ef0ae9c0aa75ad69ad01cb84c90b263))
* hide legacy subscription card on Dashboard in multi-tariff mode ([865a78b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/865a78b801f7bed89b2534e5bc20577b4bcb39f6))
* hide panel info/traffic/devices from subscription list level, show only in detail ([23edd6a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/23edd6a2115e443143c0a7e59a9edabdc071bfd3))
* hide renewal button for daily tariffs in multi-tariff mode, fix hint text ([6a53221](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6a53221cc14adfd5233b638bf00caf89dfe34d19))
* make buy-another-tariff button more prominent on dashboard ([29003a6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/29003a6cbe91d4702dbb7fee90293653ad15bbe1))
* mobile layout and touch target improvements for admin settings ([e004d81](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e004d8103ba52b8dbe383061d6b609ce6024d45c))
* multi-subscription frontend improvements ([4de47cf](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4de47cfa949189a1ff967ae522028fc8f843dee4))
* multi-subscription UI audit fixes and cache invalidation improvements ([f4de6d8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f4de6d8ad843e5a1d47f5ae4ddaa0bc99d4ee5f2))
* navigation links point to /subscriptions (list page) instead of legacy /subscription ([a0c21a1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a0c21a11aaf55909ee457e916cd37ebcf8e3a385))
* platform-aware delete confirmation + trial CTA to purchase ([debee77](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/debee7729fdbd8b3794656abd6c53c1689e32c0b))
* preserve subscription context in navigation and cache keys ([fd01c0f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fd01c0f393491576230aff55275a5ef6d8c2ffb8))
* promocode multi-tariff support in cabinet ([6de864a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6de864ac434236425e9a3aa69d106794334b65c2))
* remove duplicate 'Create subscription' block in multi-subscription admin view ([20f0e44](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/20f0e44d2df1c86ed79694a638612ba6d3470a43))
* remove duplicate back buttons, improve multi-subscription UX ([9d3fb37](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9d3fb37d6065d3758b0a2584849cad56f816774f))
* remove duplicate floating orbs background from admin panel ([59e6528](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/59e65283e16b18b6a47c365cef0b80c43fb51409))
* remove unused multiSubCount variable ([258bfd7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/258bfd765487cab96b0c7f9325457b6f43614e71))
* resolve eslint warnings in NewsSection and AdminTickets ([e86b214](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e86b214008ce378e26f250a0601aae2002b8dbf9))
* send subscription_id as query param in ALL POST/PATCH endpoints ([348d654](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/348d654892f6a6aa609ac6cca1eaf1affc83b5ce))
* send subscription_id as query param in autopay PATCH, not in body ([b0421b9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b0421b94a66613e04481d1907498752f744e736c))
* show missing balance amount on renew page, no tariff switch in multi-tariff ([10824b7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/10824b732252c9b0b0fbe667df04e25bcc89e366))
* show subscriptions link on dashboard even with single subscription in multi-tariff mode ([f0d520d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f0d520dbaa8a048709ac4721b002f5dea6a4fda9))
* show warning hint when subscription must be selected before wheel spin ([16ccf78](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/16ccf78c95f813747051e79ac13041e4a81879bc))
* stabilize useMemo deps and add category search to sidebar ([ea1c735](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ea1c7359ceb6736e0d276f311ae747b81fbe4a75))
* three bugs found in second review round ([28ef6c9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/28ef6c97f5c2e95209ca0644e7ea66c9729208ed))
* transliterate Cyrillic to Latin in news slug generation ([84bded7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/84bded7974a01701a893c8e579bb3e0d60535462))
* use declarative Navigate instead of navigate() in render + fix useEffect deps ([98e9cfa](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/98e9cfadc6785bf7e713028d2d2c0ab262939d7f))
* whitespace search guard and unknown section fallback ([67055d5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/67055d58f77815568827fdf947da37a53b8d3182))

## [1.42.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.41.0...v1.42.0) (2026-03-23)


### Features

* add category/tag management UI with ColoredItemCombobox ([2ae01c9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2ae01c95aececf97ddec12337c7251ce6c0a82ec))
* add delete buttons for categories and tags in combobox dropdown ([be7219e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/be7219ec06efdfff6052cbcf6bd736af2e3691fc))
* add media upload to news editor with drag-drop, paste, and file picker ([723591e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/723591e5c386639f69a3716a306e04906224df24))
* add news section with admin editor and public article view ([99fc336](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/99fc33625e95430d465f09229b4f56a22a0589c1))


### Bug Fixes

* add multipart/form-data header to news media upload request ([4bcae6c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4bcae6ce11e18c42f8dd99316b918bfb70cb8fc5))
* add news link to admin panel, prevent empty news section flash ([38b0f4b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/38b0f4be9a921fa1af4a49817f6b17d738c5b074))
* disable duplicate link/underline extensions from StarterKit ([59d8b66](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/59d8b66884e544f2752e843c6040adfaa3b78cc4))
* isolated DOMPurify instance and correct video controls attribute ([f788f10](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f788f1034ccfe62dcfedc5eed52086b7f36e5a82))
* media upload security hardening from 6-agent review ([7408000](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/74080004e8156ad1f302f9c3b5ad809c6b3b8742))
* news feature security, accessibility, performance improvements ([74e6d52](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/74e6d52fee474f73f148c3f0081be727aa9b7e64))
* news section — remove duplicate title, add newspaper icon, hide views from users, fix cache invalidation ([b7ab2cf](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b7ab2cff55a206d7a705ffe42a01a652c5c1ddba))
* register DOMPurify hooks once, abort featured upload, fix double drop ([5c0eb12](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5c0eb129f437fe84e900391b02f1d4ff7557d26d))
* remove animated background from news section, fix mobile borders ([8d994f7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8d994f75d9c34443276cc4203fc01c0d3bedf40e))
* remove duplicate news title and replace N icon with newspaper SVG ([de5414f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/de5414f42ef13bc9d2dc9a8349243a2f1cb821e3))
* tag color bug, FormData interceptor, falsy id check ([13d27a5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/13d27a5929fd688a3a38abc587f3ce15683c7f86))
* video not rendering — add TipTap Video extension, allow HTTP src ([25f3602](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/25f3602aeab451f3463a872256706dd91f35db5b))

## [1.41.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.40.0...v1.41.0) (2026-03-22)


### Features

* add fill+border dual-color nodes, radial layout, and dark labels ([b18f3fb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b18f3fb211112c3a72db49a4b682e29257dd28ae))
* color-code referral network nodes by subscription status ([b289ea9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b289ea9c2315d4cb15aeb76da04cc0220fd16cbe))
* show subscription revenue and referral earnings in network stats ([5b12784](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5b12784ab84b6b3afed015b3172d34c6015b9e33))


### Bug Fixes

* add fill border to node-border program config ([5a92484](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5a92484912e1b6f251f1c1c13a68f5c6eeaa2d2a))
* fallback to referral role fill color when subscription_status is null ([61ca5cc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/61ca5cc53dfe1a1cf064461007c81a496bc9c234))
* make trial, campaign, and no-subscription node colors distinct ([2a57442](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2a57442e04c1b09690504e5ad9bb96a3fcb9f7c4))
* remove campaignUser fill color — campaign membership shown via edges ([2229eee](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2229eeecb089a869483f2dbeb30f8817f434930d))
* rename "Regular user" to "No subscription" in legend ([cc64f7b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/cc64f7b8ea7a136df4ad7dcf5cf2b1631455b031))
* superadmin assignments show ENV badge, block UI revoke ([8e59af9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8e59af96c57ec69b9fd2e64a703699f04348d900))
* use dark label color on hover (white bg), light on normal (dark bg) ([ebe2c3a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ebe2c3af7e1b0abd622f4c8f20a94af5ca8e6076))
* use light label color for graph nodes on dark background ([0cc1cd5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0cc1cd5871a4b82ff2e9f1b8dc793d8563016362))
* use white campaign edges to avoid blending with trial expired nodes ([2436060](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2436060b5a79e6b3f485b177e1be87a8c02d307b))

## [1.40.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.39.1...v1.40.0) (2026-03-22)


### Features

* add QR code and command to deeplink auth fallback, fix polling on tab return ([76c9d64](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/76c9d6448aa2cf79a856076a781c3f285633ee10))
* custom broadcast buttons UI and fix stale mediaType bug ([86d997d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/86d997d01d860b42a4d7fd61c703dc03c39f0a2a))
* show short device identifier (HWID) in device list ([58b1f96](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/58b1f96852fb32f57bfb1ca255b27ebc021236e9))


### Bug Fixes

* clear all cached auth state on Telegram MiniApp retry ([3e27472](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3e27472c8aaf836e855a7163f5a2829395655ccc))
* clear expire timer on 410/error and reset pollInFlight on retry ([1538879](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1538879f970bcadc115d10ff027ce4d015606099))
* prevent polling race condition and add missing zh/fa translations ([e571667](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e57166745c24875ffd50b78e31bbd1e20480720f))
* referral system — stop cabinet redirect to Telegram, fix deep link code handling ([3c034d2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3c034d2e70359357c6522ff9ba703a69f1a2f5d6))
* show error state instead of blank page on purchase-options failure ([9d519fb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9d519fb5ec8c06c35f0967a0901940d934e1c882))
* use live panel traffic data in admin subscription card ([ac1550c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ac1550ce107fc37b81cdf0271666976499fed4ef))

## [1.39.1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.39.0...v1.39.1) (2026-03-21)


### Bug Fixes

* infinite reload loop on login when Telegram widget unavailable ([c34375e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c34375e579b159b9a47421c4fddd992d630e74aa))

## [1.39.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.38.0...v1.39.0) (2026-03-20)


### Features

* add media attachment support for admin ticket replies ([84f0e4e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/84f0e4e9b4fd6b73444505696d3dd20a30cc0c82))
* add partner → campaign edges with distinct color to referral network ([2adb004](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2adb0047dda970df58ccddbcc00193441680c7e8))
* add referral network graph visualization page ([235eaec](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/235eaec85f46e46b4b588f325811a448a02dbcc3))
* multi-select scope for referral network graph ([db76cd0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/db76cd0c647fb7be986bdebad4cf7f56b554334c))
* redesign referral network with scope selector ([a6faf70](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a6faf702ec445f899ab0a9b93d668340483c44de))


### Bug Fixes

* adapt referral network for Telegram MiniApp safe areas ([33486a0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/33486a09d01b19961e02d4d72b63710e7cf8bc8f))
* bottom nav overlap and safe area handling in referral network ([94c8e73](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/94c8e73787ac40b73808785a5e12074bd1840bd9))
* defer Sigma init with requestAnimationFrame to prevent no-height crash ([6f58a0c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6f58a0ce5d326eb67a154b6f2687873aac6cd247))
* fullscreen layout and filter dropdown positioning ([4ebd85b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4ebd85b65d7bb2ebdace8eae3efc8b6fd4ef61cc))
* graph layout, node visibility and FA2 settings ([7c0b8e5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7c0b8e571a613173ed9cec6e87af469c6b141ca8))
* hide trial banner when subscription expired banner is active ([d34f5e8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d34f5e85596e7f34804a4e78dcef06e61bd62cd9))
* improve graph spacing, mobile layout, and Telegram viewport ([818557f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/818557f57d486a47c2965d4f3dfc0eb385ead7ad))
* position page below AppShell header, wait for container size ([fd9a47e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fd9a47ecda6660903bea54b6cf2a838392fd85cd))
* redesign top bar and filter panel for mobile ([ea143fd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ea143fdbc91243375f2abe2b2250d1666aede769))
* referral network graph rendering and layout ([b787726](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b787726d1bbfd0371ae5b1f470777439e0a8c95c))
* referral network rendering — portal fix and visual tuning ([2b43a30](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2b43a30ccccbc75e43dcc0fe5483b20e3ec66e04))
* remove dead store code and add search input maxLength ([0f756d6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0f756d633d8d64e11e5738c20bf9e4fdd631a667))
* resolve Sigma container height error on page load ([3434073](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3434073d7c327299db8ca80440d6054cf9e8065e))
* scope selector UX, ARIA, and code quality improvements ([2780898](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2780898d1c4944d69045a3271c1bbd67ef72c47a))

## [1.38.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.37.1...v1.38.0) (2026-03-18)


### Features

* clickable user link to user card in admin payments ([aa8fbd1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/aa8fbd1e23c9ee503b871d0de945eee5d4af4d2c))
* display manual admin top-ups in sales statistics ([a3a6fad](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a3a6fad9b76f9908b8240a05629d9d7eac1af98f))
* display user promo group badge on dashboard ([c579abe](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c579abe6a35cf86a7e001567eb1328b768b71772))


### Bug Fixes

* handle long promo group names with truncation and flex-wrap ([4a33a61](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4a33a61641ac6bf325988a5d60a2d07cd15c2a71))

## [1.37.1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.37.0...v1.37.1) (2026-03-18)


### Bug Fixes

* add tooltip text color for dark theme in all charts ([d640cc1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d640cc1a04825b687d59b3a7b2d7fa814e189819))
* add tooltip text color for dark theme in landing stats charts ([18b8605](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/18b860533cfb6d6e27ebdad919fc86b7406309b5))
* load telegram-web-app.js asynchronously to prevent page blocking ([c5f621b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c5f621b399e415d58af8c3c9723ec473294138e7))

## [1.37.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.36.0...v1.37.0) (2026-03-18)


### Features

* блокировка кнопки устройств при лимите + убраны дубли трафика ([8636bd7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8636bd7659b6b18cc9e19bce5bf5c6637da21d72))
* добавлена поддержка SeverPay в кабинете ([246fafd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/246fafdbfc1db6384d1626ae09e04431c72f61e2))
* редизайн страницы платежей в админке — поиск, фильтры, статистика ([df73b3f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/df73b3f77e4fe38715ca74782120f4c52ad0b1b7))


### Bug Fixes

* блокировка кнопки устройств на странице подписки ([2d89b5e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2d89b5e342b7dbd3f6ae6457a7aba06db962c91c))
* добавлена подпись «Стоимость вращения» к блоку оплаты спина ([914a802](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/914a802c1bf770be375eeb460ab255681eaf76c0))

## [1.36.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.35.0...v1.36.0) (2026-03-17)


### Features

* account linking and merge UI for cabinet ([93f97d4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/93f97d45bec4ac4ac893475edd3e79107fe5806b))
* account merge flow — merge redirect, error handling, server-complete linking ([2fc0759](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2fc0759f89da90b7a349deb8a502417a4f790827))
* adapt dashboard and subscription page for light theme ([f474067](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f474067efbb36974b47b51ba568304b6cd6b3805))
* add 'no color' option for button style customization ([e586129](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e586129c37d9152122899d3fea8034ceb03b3993))
* add 1d and 3d period filters for node usage ([f36ee60](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f36ee60c0b74bc6b3d0f51aa1c6ec0d50e5f38d7))
* add 1d and 3d period filters for node usage ([944b2ec](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/944b2eca02cef28fcb6c0e919fdcfea54cd8dbc7))
* add admin pinned messages section ([88cc0d9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/88cc0d933e1ee24c854f7e2f32698698201ec06e))
* add admin pinned messages section ([aa5113b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/aa5113b8e309babb530e849fac12ae87a4769e9f))
* add admin sales statistics dashboard with 5 analytics tabs ([a47c222](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a47c222310aea2f55bfa6b4df179aa8e27a5293d))
* add admin traffic packages and device limit management UI ([2dfa520](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2dfa5206046b50f4bc22793dfb448f684286adef))
* add admin traffic usage page ([8c8fa40](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8c8fa407f5dde627159a8c368c9ea75eb74ac774))
* add admin traffic usage page with TanStack Table ([a034a60](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a034a6068ccea07c6581427d3e80af754b175820))
* add admin updates page with release history ([a15b3d4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a15b3d410157f916c6008f7dbbe24b1284d3d595))
* add animated gradient border to Connect Device buttons ([70e1ed6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/70e1ed60bd545535b3148aae2b6546f7c17f9552))
* add button reordering within rows and replace modal with inline add panel ([082471b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/082471bf92cab2577fec6ae047e0ab1ded224ba3))
* add ButtonsTab for per-section button style customization ([b289873](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b2898730b98b3bf73d075158a9f59ef5bf1f6e54))
* add channel edit in admin, hide subscribed channels in blocking screen ([5a55892](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5a5589214529e42fd08a3b41929cddd974d52420))
* add configurable animated background for landing pages ([a404690](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a4046903344855d849482b585fee1e27d13efcae))
* add country filter and risk columns to traffic CSV export ([471e2c8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/471e2c8c43212c03b72d8f270182b731738836bd))
* add daily deposits by payment method chart ([f012710](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f012710df0c19c00de0c71c51515e03373a29eb5))
* add daily traffic & device purchase chart to addons stats ([2235b3c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2235b3cb77eb266b86eb98175e52855c6a08c828))
* add dashboard sub-components for subscription cards and stats grid ([909374d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/909374d369589474623ee006779586fadddd485b))
* add dedicated TopUpResult page for payment return flow ([b591228](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b59122818c3242ffab512b896f75179dd9a13c1b))
* add device management UI in admin user card ([6f31fbe](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6f31fbe6b5638e400db2ea16af65ab69979dca97))
* add discount UI for landing pages ([f7afa00](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f7afa002f08cfde0421ab8cfed8f699608fd6bc9))
* add empty state for connection page when no apps configured ([fb25df6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fb25df6f0f5dee55fc40496e29bf22c94efc27b3))
* add enrichment columns to admin traffic usage table ([893c69a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/893c69ab6fc05ddc4bb64d229ae20376471a4f07))
* add external squad selection to tariff admin form ([bc45294](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bc452944876b64c5346dc04d53c561831fb31bd8))
* add fonts, animations, and shared utilities for dashboard redesign ([7e345fc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7e345fc7d0431415496f8363959773e99a853b6e))
* add Freekassa SBP and card payment method icons and labels ([a725265](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a72526502605ab415c16d3506c6fd4aa0bee5c95))
* add fullscreen QR code for subscription connection ([4d14e3e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4d14e3e8062c321e56fc37e79ed6cc16fa83df2a))
* add gift navigation, routes, and i18n translations ([7890d48](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7890d480e05e87f77ea2fea3ae3a7e955bd167d3))
* add gift purchase UI states for telegram recipients ([eed077b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/eed077b0197f215c8f74f70a2bf0b73fd41d4628))
* add gift subscription API client and feature flag ([a495205](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a49520566e46eb0cfdc22a3661c5ba405dc6cc92))
* add gift subscription toggle to admin branding settings ([9542607](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9542607832561a8a72bb742947f3388bdaa087dc))
* add gifts tab to admin user detail page ([695ab42](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/695ab42e03a0a77ecdbede1f8621dca6baf4b374))
* add GiftSubscription and GiftResult pages ([814b1f5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/814b1f5e96f968d9bc2829ba395ac187fa4d2e11))
* add gradient fade indicators to scrollable desktop nav ([622172f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/622172f0387dc7f029c8af797d1f8df2e790771e))
* add granular user permissions (balance, subscription, promo_group, referral, send_offer) ([3d6987f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3d6987f761b168113c009845d8ff028f9ca86688))
* add HoverBorderGradient effect to key action buttons ([3fb9606](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3fb9606fd0f5bf765e117436e7507b4c7c226e89))
* add i18n translations and admin category for Telegram OIDC ([c221c6e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c221c6e8bfc15b160565083f0198816d4c84c146))
* add Info page link to desktop top navigation ([fa48cc4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fa48cc438b0b9e5df9fb1ca69c91196e0ba8153c))
* add Info page link to desktop top navigation ([18a14d6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/18a14d64eac156266348911fdcb49a8d690b1c1b))
* add inline referral commission editing in admin user card ([92d206f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/92d206f5b655cca2cceff172305f07d5edc551b7))
* add landing page statistics page with recharts ([3019019](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/30190199ed88cde6aea575eed44a2f7d4361dbdc))
* add landings permission section translations for role editor ([5228b2d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5228b2dea6f1adc78c521c197d09726a286516ba))
* add LIMITED subscription status support with traffic-exhausted UX ([b4f9f33](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b4f9f332cf714717ed52cd18a82af9d2feb22416))
* add menu editor tab with drag-and-drop rows, custom URL buttons, and button configuration ([23aa86f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/23aa86f1a81556ce2083e8b86107ee1a82c429b1))
* add multi-channel subscription blocking UI and admin management ([a767fe9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a767fe96d3992f91b5c1b722de132ea67f975432))
* add node/status filters and custom date range to traffic page ([90b38e3](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/90b38e3ef2815300ee4b50a4d3da0b1422d21092))
* add node/status filters, custom date range, connected devices to traffic page ([0301fd8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0301fd856639a0d70cb2a7201cfe80b3936dbc8d))
* add node/status filters, date range, devices to traffic page ([e824945](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e824945b733e3321bb2a785da52580508f00b64e))
* add OAuth 2.0 login UI (Google, Yandex, Discord, VK) ([83aeae8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/83aeae81b86c99615f0175cf0f3b1f656f6c66cc))
* add open_in setting for custom buttons (external browser / Telegram miniapp) ([638844e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/638844ef47686f4c9540b5591d499255cdc8ff2f))
* add partner management and withdrawal admin pages ([779fbf0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/779fbf0dc61b5963e2ac48162b02a292155457a5))
* add payment sub-option selection on quick purchase page ([58e93cd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/58e93cd2b72979ec95dd43ba7d6670d879e2f07d))
* add per-button enable/disable toggle and custom labels per locale ([1a0a5ff](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1a0a5ff45313da383ed402b09a630e2774d2ae04))
* add per-channel disable settings and global settings to channel admin ([48be067](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/48be067d1b41f57b02d97405b8a92538c306dabd))
* add promo group and promo offer management to AdminUserDetail ([8bd3c00](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8bd3c007bcceae947fc6f269694dc70a93c69db9))
* add purchases list with pagination to landing stats page ([887b13d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/887b13dec22bbb6c4f07e8035cbbeefc437f10e2))
* add RBAC permission system to admin cabinet frontend ([874ee26](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/874ee2682e50d9deca42b794a4be0ae0dd95ab5c))
* add recharts analytics to admin campaign stats page ([c7d05c4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c7d05c4809166341a1702566a343946fe9126797))
* add referral code persistence across all auth methods ([2b2ead8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2b2ead837c457a02c8a153d6b25cae492aa5e617))
* add reset traffic toggle on tariff switch ([49fff8e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/49fff8e85520ef3ee08cb06c473ba875cdf05dc6))
* add sales_stats RBAC permission section to frontend ([262303d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/262303d623a6e8a597b3aa9310d1b8290b494595))
* add show_in_gift toggle UI for tariffs in admin panel ([5a5a987](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5a5a9878931234103761d40fb24893afdb16a817))
* add sub-options UI for landing payment methods + extract components ([d0be127](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d0be127d30574af1cb90503943bfa721dda8e645))
* add SVG brand icons for payment methods ([c4f228f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c4f228fba6cbb0fe9ce0ac007e05c0cf2bf1fff0))
* add system info card to admin dashboard ([ab0270a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ab0270ac58565f883722f7b04aa300b644e7973b))
* add tariff checkbox filter, column resizing to traffic page ([cfb7ce7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/cfb7ce72f2fde01dc548b9c4b263f8b3b0a37074))
* add Telegram account linking UI with CSRF protection ([a6fabb1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a6fabb1d9d79c6a233e1ac52fcd006d9dea31a3e))
* add ticket status buttons to inline chat ([5664b28](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5664b283d6414e853488a86b42f75b49b35dc3d2))
* add ticket status change buttons to inline chat ([dafa69f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/dafa69f73689828749072c99206dd7d7f9ea766d))
* add tickets tab to admin user detail page ([995c034](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/995c0348dc8a65bc3e8432911c15137fe7e72bfa))
* add traffic abuse risk assessment with color gradation ([a6507b2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a6507b2cfe73d3f9dafec9e87fd17e287c91067d))
* add TrafficProgressBar and Sparkline components ([eb1f788](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/eb1f788033c696c1077002048f144b0bfd59592b))
* add translations for permission sections and actions ([80bfaca](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/80bfaca457192d25af182365da8c18a8f97c7830))
* add Twemoji for cross-platform emoji rendering ([031396d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/031396dd4529e20fe4d6727f02c84a0b5741cf76))
* add Twemoji for cross-platform emoji rendering ([72b1089](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/72b1089af7b2e830d993780b45225bd10361722a))
* add user filter chips and resource types to audit log ([4072274](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/40722747e33c2dcc5d5ccc1d213b4d2eb39e0f26))
* add user profile link button in ticket detail ([d483d84](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d483d84f1c3d22a6220116d581613146b98e4fc1))
* add web campaign links — capture, auth integration, bonus UI ([e0dd21f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e0dd21fd0bde52c4b10175635e605151eb8faf9d))
* add weekdays condition to ABAC policies ([a1a8dc2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a1a8dc22034def5802791e1ceda4da6a3558db6b))
* admin panel enhancements & release history ([3bd9abb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3bd9abb1db2aef6b4428f62a020b4ea57b6a3c85))
* admin partner settings page, partner section visibility toggle, custom requisites text ([76d20fd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/76d20fdb1aa374b2de3f075bda4672484b8b8de6))
* admin traffic usage, session persistence, and UI improvements ([2193df7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2193df799d839976cc19127ff4242c35c350e0b9))
* allow editing system roles ([a050125](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a050125ea8d4265f096bafe0317e811289f38738))
* brand-accurate payment method icons from favicons ([e24afc4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e24afc4b6f9b5d9048c8af2d0e427f7e5916cd0c))
* compact login page with collapsible email, icon OAuth row, safe areas ([45cbfb5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/45cbfb5ecb194eb9cdcee5a9cf8b4f79c20c1444))
* deep link авторизация при блокировке oauth.telegram.org ([6a1a9f5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6a1a9f5db7c3a2aa553e8965c1d6e7d65a40dc6e))
* desktop nav expand-on-hover with larger icons ([8dab6dc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8dab6dc8fb8ef7ba97c94fa71cff5b4ed750198d))
* display per-campaign stats on partner detail page ([75a6149](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/75a6149e2db4fd0ead705c431ff04ea6d9ffc3d2))
* display promo group and active discount banners on gift page ([03c9e73](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/03c9e73a372f0357757a1835a933bedceaa7749a))
* dual referral links UI (bot + cabinet) with independent copy states ([e023373](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e023373f56a06afc2b95b32930986bd1cdd4d241))
* dual-channel broadcast form (Telegram + Email simultaneously) ([772dcf7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/772dcf72365581be587456cd1f7e35c969b7c898))
* dual-channel broadcasts (Telegram + Email) ([74f6c61](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/74f6c61eb3bf317f16348779a4b5286f209d0a77))
* enable sorting on enrichment columns ([5678dfd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5678dfd55854d884220a02075fcc0f025752c189))
* enhance admin user detail with campaign, panel data, node usage ([0083b47](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0083b47d0459995e94470df005fe341fe666c41f))
* enhance admin user detail with campaign, panel data, node usage ([7b19f14](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7b19f14dc3628dfdea93fbcb995fc13b5276c8da))
* enhance sales stats with device stats, per-tariff charts, and dual-series trials ([4622b4b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4622b4b200bb2973115b0a9891b0ec5956af89d2))
* gift subscription redesign — code-only purchase + 3-tab UI ([af3e535](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/af3e535c698e7046f420b80a781991505f0c0ffb))
* guest purchase activation UI & landing editor improvements ([b852e1e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b852e1e4cda7303e19ac7af8c3826e2ba52ac68a))
* guest purchase cabinet credentials UI ([d228d99](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d228d997d8360f8a15a23ec007a06048af7bd47d))
* improve audit log - translate actions, fix resource filter, show request body ([5d0e353](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5d0e3539e22576e1824292da09c396123349b371))
* inline ticket chat in admin user detail ([0b10cfe](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0b10cfecf33b329a79a958858829289d4401b769))
* inline ticket chat in admin user detail ([145d94a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/145d94adcdefafb3257340544e04817cc729f2d4))
* local period calculation and refresh button for node usage ([64ea757](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/64ea75738feb1338c608754170fa7489b9926f54))
* local period calculation and refresh button for node usage ([bc6985f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bc6985f5222bc28db10f66c2a60aa073ac68d87c))
* migrate Telegram Login Widget to v23 with admin-configurable settings ([2c65ca8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2c65ca8a7ff372725bcbaa002e96bd043022bad1))
* move user action buttons to detail page and fix full delete ([2490399](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2490399f8eb8a96ea0992c134f4a33c6001c885e))
* move user actions to detail page, fix full delete ([dad0c5b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/dad0c5b756a2e99984ee1c423c9c80f6551070e6))
* node/status filters + custom date range for traffic page ([8b113a5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8b113a54e39e9dc43d230fa970adccedd4f98a8c))
* OAuth 2.0 login UI (Google, Yandex, Discord, VK) ([b7aca0c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b7aca0cc1c924763771853c680d656b2314ed79e))
* open OAuth linking in external browser from Telegram Mini App ([7c30a1e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7c30a1eab616846253df1ec2c93b97259a54c8b8))
* partner-campaign integration in admin UI ([959f892](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/959f89266bd7fe6e8a38d218c7d34e14c509a21b))
* promo group & offer management in AdminUserDetail ([280f4ae](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/280f4aef0d23c74f0afc038bd4d7af33f55e4aff))
* read gift warning from status response, soften poll error state ([4322d58](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4322d58ff8ca56ba401b669370bee8783cf55a86))
* render GitHub markdown in release changelogs ([0c34668](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0c34668e40d9d4eb7037da7d6f5c2c40c87b208f))
* replace animated backgrounds with Aceternity UI system ([1a702a6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1a702a68b9cad0f112a65494250c11758388a91f))
* responsive desktop nav — icon-only on lg, icon+text on xl ([e7cd370](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e7cd3702997144725ac90289e5aecd101856bc92))
* show affected subscriptions count on tariff deletion ([f10a02c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f10a02ceb6649b2dd4301365919fc066d604e95f))
* show blocked_count in broadcast admin UI ([9cf8e09](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9cf8e095b8ce45ea92f6289bf275cd82e264dcde))
* show localized error for self-activation attempt ([7549ae7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7549ae70eb3ae14ae0cd4a45e5033675f4555c6a))
* show partner campaign links with bonuses on referral page ([8b33d82](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8b33d8224d63509408f96919d702d1eb21bc050a))
* show query params in audit log details ([66f7fcb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/66f7fcb3dca32748503f1ab92155818369f94da6))
* show traffic reset info in subscription card ([271a005](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/271a005e87d21f6a82aad7272c92775a6e1aec6c))
* show traffic reset period on tariff cards ([cfe9f64](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/cfe9f642d842fc0696e379ef59934b300c363a24))
* split my gifts into Active/Activated/Received sections ([51ec799](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/51ec799c0c47189f9388dd6b19ca3329a55cf653))
* support disabled daily subscription status in cabinet UI ([7940410](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7940410d7d913e8c92a7732f4fdc4ababd06ba3b))
* support Telegram HTML formatting in privacy/offer content ([fb055c0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fb055c04e878e61be244c1e3ad5dd5f53cf29496))
* support Telegram HTML formatting in privacy/offer content ([3e70008](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3e70008b81a05781bff578328b4e96e2387278ab))
* SVG иконки платёжных методов, фикс колеса удачи ([2003052](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/20030527f07cf1baf6754713883475c33dd86524))
* tariff checkbox filter + column resizing for traffic ([c383c78](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c383c782133a2ba4226e928723102dfddf7b7cd4))
* TelegramLoginButton with OIDC popup + legacy widget fallback ([91f0e9e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/91f0e9e2fcd0d9c3f3dc7f7e31b763244350f754))
* tickets tab in admin user detail ([1426e46](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1426e46c844d29d2fff39d5f4fbf159790f6ea8b))
* traffic abuse risk assessment with color gradation ([88f8e8b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/88f8e8be7d41759af3376f0b8a6df512b3b0fce3))
* traffic page filters, risk assessment, country filter & CSV export ([84cce93](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/84cce93aec928680e3c8380bf99739d4b2e81e47))
* unified device manager with dot-based selector ([edb7ef0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/edb7ef0488b0ae994b7a37be9b95d1ab007feb09))
* update payment method icons with brand-accurate favicon designs ([33e878d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/33e878da846409868f623b36532b7d73a1a678d0))
* user profile link in ticket detail ([e0c9a89](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e0c9a89d347e1f44fee4274624707cefc690abff))
* кликабельные имена пользователей в последних платежах ([e278fec](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e278fec506e17281d0fb92cb04348b269dc8e30e))
* мультиязычные лендинги + переключатель языка + исправления по ревью ([ab13616](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ab13616b0f0d31eac007a4c4b7f4f360f0f3c9b4))
* публичные лендинг-страницы для быстрой покупки VPN-подписок ([8b5d777](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8b5d777f0a94296330227b5fab34c65c83fb3baa))


### Bug Fixes

* accessibility, query cache clear, post-merge navigation ([e447e99](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e447e993cb10989f55525d9bb57ed8a5d5ad9d97))
* activation broken — token uppercased + wrong env var for bot username ([d852bfe](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d852bfe969ed140f53872c5bdd8104ac20aecd34))
* adapt admin landings list for mobile layout ([b7c7dec](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b7c7decfd0f2818b65861699336d6221ba0e0ae2))
* add client-side caching and smooth loading for traffic page ([471c37b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/471c37b7b3f64c08f2d749f4089009eb53ae7cac))
* add country flags to node usage display ([14b73f6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/14b73f6db5f7ce1b17de46eae97292f09d9c2034))
* add country flags to node usage display ([80bad9d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/80bad9d623a2fc125ac3090b570115ba8ea001b0))
* add max attribute to expected referrals input ([d1043e8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d1043e83eaa163079a0272860b2d6a8f68332cf6))
* add missing cancelled filter key to withdrawal i18n in all locales ([9b2742f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9b2742ff3afc627bfe382859e9239b5ba9104ea4))
* add missing nameRequired i18n key for promo group form validation ([78fda22](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/78fda22679b9f5b4443fa602214e28ad52f7f2e9))
* add missing onError handlers on RBAC mutations ([c4e3211](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c4e3211baa3bfec81cc0efec4467660180e42ba7))
* add null guard for purchase_token before rendering CodeOnlySuccessState ([51cc122](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/51cc1221d0129018828b2abf0f273caada599649))
* add pagination to campaigns list ([46f640a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/46f640a7e0c2026c7629f0cd4cd01f7f4758bbe5))
* add purchase-options cache invalidation on balance changes ([f1102d2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f1102d278354ae3225f8b36029590d8c01b74ea0))
* add Referrer-Policy to prevent merge token leakage via Referer header ([584f002](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/584f00297bfc38fefc372f28ba0947300b8a6064))
* add resend email cooldown and allow email change for all auth types ([91d567f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/91d567f9cc48dea7d605b55c6014174806b8d9ab))
* add subscription tab to desktop nav, fix device dots overflow, show available referral balance ([27f85a1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/27f85a1db115ca386c5658786147800e33f484bc))
* add unmount safety guard to OIDC callback handler ([dfa7a09](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/dfa7a09a7cb53ebbbc5de057fd587897d77dcb9b))
* address code review findings for TelegramLoginButton ([5c11f12](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5c11f1251a9bdbb60f49c105b1a3ebcbd477d8b8))
* admin landing editor — tariff period mapping and cleanup ([6a92814](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6a92814ce25bb718ce29450adbd7d01775e4e1dc))
* admin promo groups - add default toggle, fix threshold reset to 0 ([9c7ab4b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9c7ab4b789f0d2e92c81afd2199789d03d3768db))
* align RecentPaymentItem types with backend schema ([3f05039](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3f050396b8d784d1f5d32a949cfab2caaef4ddac))
* align TypeScript types with backend referral schemas ([11343f4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/11343f4f12e0f082225f7413308972cb8ed92717))
* allow animated background to show through on landing pages ([66bb86a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/66bb86a5f286b40eb0cc7cbac8a82ad3d6336de2))
* allow email change for unverified emails without code verification ([a0b10e6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a0b10e688cd96ecbab767bed4ee1abdd5aefc4db))
* allow user column to shrink smaller on mobile ([6aa8951](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6aa8951ce251eacddb897f8d8abf566b22a8e9c3))
* allow user column to shrink smaller on mobile ([12663a5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/12663a59a7aaec87933e9437d329d452f09ee2fe))
* animation config not updating for users after admin change ([94ddf31](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/94ddf319bd242211cbebf74e89a6052856f84f60))
* auto-select single sub-option and remove unused return_url field ([83fbd0e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/83fbd0e44564a3b5f174f52549ff29b638701067))
* bar chart white hover cursor on dark theme ([14e5f43](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/14e5f436ce8e1ad110e60169095631916bf167d3))
* block wheel spin without active subscription ([821e991](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/821e991f51db6033d3e0f2befecf15c364d0e3e8))
* boxes background not covering full screen ([f16f96e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f16f96e442506484eae9434ae51c5f0f2fc45729))
* boxes background not covering viewport ([65afb29](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/65afb292747b0e57865bc4c0d5df320fbc58b261))
* check apps before subscription on connection page ([a4e6e35](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a4e6e35da1f86163fbdb0ba90fd28c8ccdef4ed6))
* clean up expired trial card - remove redundant badge and subtitle ([d2f02d6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d2f02d605c5990bc88fbade5f6fa6e7624abd70b))
* client-side caching and smooth loading for traffic page ([81fcf54](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/81fcf54b1571970bf14175773bcdeb3aa706acfd))
* column shrinking on mobile + country dropdown overflow ([1aa0e7f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1aa0e7f943ef392a06778914edbb78c8bbbab8ce))
* CopiedToast not visible due to CSS transform context ([39bdf8b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/39bdf8b5c3e79e2c224db29f3c87d17135e2e0fb))
* correct locale loader type to support nested translation objects ([ab03947](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ab0394776ad5f23778f45618e283fb319e4c688c))
* correct locale loader type to support nested translation objects ([682b6b7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/682b6b70dc65e14e8dc6c68c59501d5ca1a2171a))
* correct memory display to use actual usage instead of cache-inclusive ([67bacd3](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/67bacd3e7a36fa70c4ee97008849f0251600a7b8))
* cover all payment provider statuses in TopUpResult ([8897561](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8897561fb2af322b4b37b84ac07b7746fde70586))
* daily tariff renewal uses purchaseTariff instead of renewSubscription ([8629cfe](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8629cfea18aab9daf818f1f6c8e250ede29054d4))
* deep link auth timer cleanup and reliability ([3d95025](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3d950252b70b59a6a0f49976aeb87686e850d0e9))
* desktop nav always icon-only with tooltips ([f0777f0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f0777f0b5db9115b84bdcb37eb9dab6650bd725b))
* detect Telegram account switch across tab closes ([ee6ec59](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ee6ec5959c2e25deecfdbf93b79c04cb150dc7f2))
* device purchase guard condition and cache invalidation ([115c684](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/115c684fe00d0e209953e4bdd3ff5d213909e423))
* display zero-amount transactions with neutral styling ([6fd76c8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6fd76c8dc89c5fb4d766a94a47048dde0f0afc83))
* double-click guard on link, wall-clock timer, blur cleanup ([8ad0500](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8ad0500cc80fee51b03880e7988ffe1192e7f214))
* eliminate hover flickering across all pages ([bdc201b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bdc201b5ea5e359a7f9d97bd86202be35654a7fe))
* enforce column maxWidth for proper shrinking on mobile + country dropdown positioning ([060c9be](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/060c9bef54c031503b72a819852f58f855591e33))
* force fresh balance data on purchase-options query ([69a8fe8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/69a8fe8e03aca6b0a984a0acb3ed5d9091ed4737))
* gift code display + share modal backdrop ([a627eb0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a627eb0b30a6f65a8a0f40c13a891b4beb8e2e79))
* gift UI improvements — declension, GB display, share modal, deep links ([1bafcca](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1bafcca1ef58d98f044575511bbccf2c17825aa2))
* guard oauthProviders with Array.isArray to prevent TypeError on Login page ([f74e316](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f74e316161c3bea18bc9493e683556314db6172b))
* guard user detail API calls with RBAC permission checks ([bc5d832](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bc5d832e0d3faf5dc6f64a6359e32d75e68c4282))
* handle Pydantic validation errors in notify + nullify empty optional fields ([9bd58cb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9bd58cb914623b75ec2a035e8c6e077b0fe45e8d))
* handle Telegram Stars payment for gift subscriptions via openInvoice ([01e811b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/01e811bdfc5db4e0680c1b7d4bed5e91a66e503c))
* handle unlimited traffic package selection and button text ([1d6ec70](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1d6ec70116a2d2f776a088e5045e72cfc5d452ae))
* harden gift subscription frontend after multi-agent review ([6ea1de2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6ea1de2e8afba93361c48a364ddc5406f6bc5d4b))
* harden merge UI and improve error handling ([58cf1e3](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/58cf1e3b504c8577e6d6aa081bf861cb871fb765))
* harden OAuth login flow — open redirect, path traversal, info leak ([a744b41](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a744b41910743e9604de669535f56a614fa269f1))
* hide backend URL from logo by fetching as blob ([de09ea0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/de09ea039bea2fdfe3f3a9b3bc6c368a3a27f9f7))
* hide empty blocks in connection installation guide ([96f9a71](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/96f9a719fd02d5f21c2bd3753c4eb8afd36887c6))
* hide onboarding when blocking screen is active ([af25e6a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/af25e6a1b8b65168db520d2a7ede661641ab0a58))
* hide onboarding when blocking screen is active ([4791a9f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4791a9f19605624bceb9bdba22a3e0c97168ea6e))
* hide Quick Renew for expired trial subscriptions ([8b056e0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8b056e0b463d05106d389c41eae671684df7b043))
* hide Telegram back button on bottom nav pages ([03a7db5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/03a7db53fbbf77d74f1f68ca8e723793d67c2dfb))
* hide Telegram back button on bottom nav pages ([e5ed6d0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e5ed6d0401892eabebd5bd226755cbf5f5ca927c))
* improve campaign stats, shared chart components, and i18n coverage ([673de08](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/673de08dd4ad95a55fd70e230022a920fa8ea279))
* improve HoverBorderGradient visibility with accent colors and darker bg ([4332c2b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4332c2bd253774ddaef87f5735eec15f2b9645ee))
* improve light theme visibility for dashboard and subscription cards ([4cdff97](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4cdff9730b3c70d88c1b32f00561b16673a2d55a))
* improve light theme visibility for inner panels on subscription page ([430b703](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/430b703bbea7c923a54824b3a814d59f61065831))
* improve risk assessment display with GB/d values ([4fe96bc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4fe96bc00c8a8f4fcad088bac6ee9516445f9a89))
* improve risk calculation display with actual GB/d values ([e60b846](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e60b846eca6dfb0d31a191c990ddccb5c8089d07))
* isolate content layer from animated background to eliminate flickering ([04eacf6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/04eacf642184867f5ab3437f0aef09ff4ee73e0c))
* landing list crash — title is now LocaleDict, not string ([6755c1d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6755c1dc458e7f3ff68fb180306f72b17ff2a5b8))
* make desktop nav horizontally scrollable on narrow screens ([ab7d1b7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ab7d1b7f25215aa6fb8fe7978d570f02d884b032))
* **merge:** accessibility, token guard, state cleanup ([579f47e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/579f47e563a13f4a56ca92064949d594bfe66063))
* mobile layout and period label translations for quick purchase landing ([6d5c6fb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6d5c6fb9b3905d8a0c22f39317fd5f77743d3505))
* mobile layout overflow on landing page ([9aae9cc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9aae9cc0e6e650ff6eb6633b0d08c952aa7f2c4a))
* move cabinet_branding to sessionStorage and add WebGL availabili… ([8200014](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/820001458bcc22e072d21e2faa9b4fe819b4dbad))
* move cabinet_branding to sessionStorage and add WebGL availability check ([fc7ee6a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fc7ee6abfe9920e1b3a51254fde877b66bcfb39a))
* move CTA button above additional options section ([0bc817f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0bc817fa7f201e9176a586bb1b5c0a68c9406bf6))
* move theme save/cancel buttons outside collapsible section ([7c30454](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7c304545f8fcef0a2d1d589255d363bd35fe877d))
* move useState before useMutation for consistent hook ordering ([fba4481](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fba4481799081b05f0b082bcf983c6ac4c4daf1b))
* normalize all API responses, add error handling and reset confirmation ([150a1b2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/150a1b2dbaeffbf39e00c6f75b2761a854821b09))
* OIDC login UX improvements from review ([b335d66](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b335d666c2c1fb557288d70fb249e4166f99b146))
* ordered list numbering in Info page shows correct sequence ([8157ca5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8157ca5f0280dbcbf99eda210cd83130ec77c0b1))
* parse raw query string for deep link params to avoid double-decode ([ed65c29](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ed65c29bacbfc50cdfa11e58f0cb638c6c8c1841))
* partner system bugs - commission field, withdrawal UX, admin amount ([e94d81f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e94d81fe5a25341172bb787146fd80d70067a140))
* persist refresh token across Telegram Mini App reopens ([a449dd6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a449dd69813417c3064510ea300090f34dfcd8cf))
* persist refresh token across Telegram Mini App reopens ([20ea200](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/20ea2006ff703a76208c8ecfb8e2d9c2d789ccc4))
* plug memory leaks in blob URLs and traffic cache ([7cf7273](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7cf72735ece0510acc7a4e6af8997e8e7acdc9d8))
* preserve + chars in deep link URL params for crypto links ([65add9a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/65add9a111086f970c77d686447016551ca9ab0f))
* prevent button settings cards from overflowing in admin panel ([54f1483](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/54f1483312e776f3c02cdcd797fe392482ed3e1d))
* prevent buyer from activating gift pending subscription ([97959b0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/97959b013241597e77ed3223fb5aa2d1de8be2d0))
* prevent countdown timer overflow on narrow mobile screens ([96bcc76](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/96bcc76d695ee7e26ad2538e1733f439e6a2983b))
* prevent onBlur race cancelling unlink confirmation ([3418ba9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3418ba9b8da69ec8ea3822971729bd16fcfcd1ce))
* prevent useCloseOnSuccessNotification from firing on mount ([0389acd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0389acdf83eb8f0e14301f0d0515000467a30ccc))
* RBAC frontend type mismatches and translations ([4c9c399](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4c9c3992abe5ffbf98ad1e44e8e9d4b899af6594))
* RBAC policies page role handling and permission gates ([56188b1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/56188b1f8aa8526419d7a8e30389ef41787e7640))
* recursive setTimeout, Strict Mode guard, isAxiosError ([b350003](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b35000367bbfb0041d33b3852f1eddb083b2e9a3))
* redesign role revoke confirmation dialog ([f829076](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f829076bc2ec1f3229aa59d209ffbe5d1b00319f))
* reduce campaigns fetch limit to 100 (backend max) ([be168a7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/be168a75df500757e0e2f5fbad19c178e3e817db))
* remove [@floating-ui](https://github.com/floating-ui) from radix chunk to resolve circular dependency ([772d83d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/772d83d1c97f2689376bcadbd7b3c37cf8cb797e))
* remove bg-dark-950 from gift pages to preserve animated background ([c8ec221](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c8ec2211112656ffc3787e905d9d6b2774bc6866))
* remove colored background from logo on login page ([6bf0af4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6bf0af4ff33adcd74d7ac291f4e6e4734e1e72f1))
* remove dark backdrop overlay from share modal ([b213535](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b213535738d1261fbd7a68bb89ccaa21348615e7))
* remove devices stat block, stretch countdown to full width ([396f814](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/396f814cbdfae24bad3da8ad29d34ae9196593b9))
* remove double URL-decode in extractTelegramUserId ([e8acfee](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e8acfee3e462ad127d42b382d7a9c56f7742bba9))
* remove duplicate min withdrawal amount on referral page ([98ab109](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/98ab1099b9f9b639221b431205bd7eb9e8432d34))
* remove duplicate tariff info line, make tariff card clickable ([bef5102](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bef5102a7182ce4eb33a8fd366e6247b3cba9905))
* remove gemini-effect and noise backgrounds, fix aurora animation ([79ff741](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/79ff7412cbc374b7ac085b6c8d3fd5f34de8ce37))
* remove incorrect ruble top-up prompt from fortune wheel ([2c0d265](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2c0d265ff5c3ea9e3ed56fdb24cdd2301abba617))
* remove noreferrer from payment links to preserve Referer header ([45203da](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/45203dac5914c2abd60371ab552d2838048b3ef1))
* remove payment method icons from admin pages ([77e0edf](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/77e0edf12d8a792623added1b438dafbbe824879))
* remove payment method icons from admin pages ([dd9ed83](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/dd9ed83b085c45dff2137dcda3820eba000ab8e2))
* remove redundant subtitle and register hint from login page ([d596b05](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d596b05048b4b14fac68acd606842d717bbc9dd1))
* remove server/location count from tariff cards and confirmation ([0fac368](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0fac3689e57eee63489a379a966e89825f1a5854))
* remove unused linkTelegramWidget i18n key from all locales ([9b4a851](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9b4a8512c2e3cedf1f075aef62415fa5464b69e6))
* rename duplicate 'purchases' i18n key to 'purchaseCount' ([0ce74ea](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0ce74ea5fb7efad60bb78b56a0bf6518fecb88d8))
* rename Серверы to Локации in subscription card ([19e62fc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/19e62fccf1efbb0c17a160348c75f9e695691bf1))
* render animated background via portal at z-index:-1 to stop implicit compositing ([12c97a2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/12c97a2c5ebf0d3dc776f581589a9d4280fbdc2e))
* render newlines in tariff description ([0b4e825](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0b4e8253aa7a55b2cac7f6632912816b3234adc3))
* replace broken modal with inline confirmation for role revoke ([78e7099](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/78e70992f169861fa51150ad06f91f047f3d0708))
* replace deprecated Telegram Login Widget redirect with callback ([32091d3](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/32091d3648889795d01d78bff933da3a38caa10f))
* replace framer-motion with CSS keyframes in boxes background ([7f17d95](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7f17d95ed6f21b07fee5bd2201e1754611028209))
* replace hardcoded green with theme-aware accent color ([a3ddddf](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a3ddddfa8ce167c22177fde3b131083c710ea619))
* replace orphaned shareModal i18n keys in GiftResult ([0322974](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0322974ebdf0d904a5f39809c0e0da5dbdfe03b7))
* replace window.confirm with inline confirmation for unlink ([d0c01a0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d0c01a0e5cb656661b75175416ccf98c5aff8911))
* resolve all 14 ESLint warnings across the codebase ([885524a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/885524a00f7ea022ba6bb01108557e2e4db1f952))
* resolve all 14 ESLint warnings across the codebase ([62188b8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/62188b8d2e3cb090d0b27afe5cf4fcc65b3c68c2))
* resolve hover flickering caused by GPU layer destruction ([d8cf430](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d8cf4301caeeccb890636faded3867bf22afef00))
* resolve telegram auth token expiration and clean up codebase ([c0b834a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c0b834ab0610c3dc23e27099f224177187181c8a))
* resolve telegram auth token expiration and clean up codebase ([2dab25c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2dab25c5a036fb90f75c80e4e28f2a53885f9038))
* restore package-lock.json for CI (npm ci requires it) ([069090a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/069090a63412fdb99debe6e6058218b1e4105953))
* restore session from refresh token when access token is missing ([dc740ae](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/dc740ae2664059011fd755ccfa96ee46a26196d3))
* review findings — polling fallback, sessionStorage cleanup, UX ([da1926f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/da1926f0e1ab7f117aef120ac7648bdd50add72c))
* review fixes - Math.round kopecks, fa locale, admin list commission ([82987fd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/82987fd49a861a4ad167c10f89d51e88e8ecee51))
* rewrite 5 broken background components from Aceternity sources ([de97a03](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/de97a030d2ebffcfe957e179f32b2857d13465dc))
* rewrite BackgroundBoxes from 225 DOM divs to single canvas element ([d89c534](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d89c534c0b21bff91747002a6e96bf12d114fcc2))
* rewrite gradient border with [@property](https://github.com/property) CSS angle animation ([d8b83cc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d8b83ccdb8d64e73e9f73785e4d81c5931aa28ec))
* rewrite HoverBorderGradient with CSS rotate instead of framer-motion ([e95db23](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e95db23573987dcf1abff63a9fae0b3db3686764))
* route PendingGiftCard to gift activation tab instead of landing endpoint ([8ab740f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8ab740f8cb6ed9654b5f2d7d99d7f37a31e7de90))
* safe error handling and numeric client_id in OIDC login ([45e68ff](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/45e68ffac231516577ac1f5230bf90fd5a1b5cdb))
* second round review fixes for merge UI ([aa26059](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/aa26059e004dc7ce96b3b0953343ace5e86696c3))
* send Bearer token on email register (link to Telegram account) ([68e6ce1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/68e6ce1bce1edc3c6048c1ed873865a27c39ea52))
* show actual connected devices count instead of device limit ([a819f30](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a819f309c8105561618690e1408a826b3bce294a))
* show all campaigns in assign list, add dual links and bonus details ([a72042d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a72042d8075000db204b0f57c893928cadc68cef))
* show email for OAuth/email users in traffic table ([a8ea5c9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a8ea5c958f846d84945ebbca2e30f002421786ff))
* show fallback when tariff has no available periods for renewal ([ea06ad1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ea06ad1d8f7894f5460d150fa72d094617b9fbbe))
* show infinity symbol for unlimited traffic on landing page ([bda95ed](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bda95ed23f3b445c9a4a295a3be65310dae039e0))
* show locations count instead of servers on tariff cards ([ecc089d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ecc089da641c3b40739fbc4e77a997c27529b582))
* show nav labels from 2xl (1536px) instead of xl (1280px) ([3bae6cf](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3bae6cf1e1e40c8f1434d64cdc4e99079856bc56))
* show progress bar instead of dots when device_limit &gt; 10 ([d567817](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d567817e0564f2438d4192eb7b2321e1725da266))
* show total purchase count instead of paid on admin landings ([b9f1f59](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b9f1f59e3cbcd5c9839a4a2e9eebeefa01364898))
* stack promo offer discounts with promo group discounts ([321bedc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/321bedcb61a231d3dd8ecba8623d1ee9d632b9b7))
* stop beams background from causing UI flickering in browser ([7e89cce](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7e89ccea5c8fceaedee2a550d1ba01d9074ac1b2))
* stop WS reconnect loop on auth rejection (code 1008) ([2efce0e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2efce0eb03c9511e7cd0aa814c364f6216e89e28))
* stretch low-res Aurora canvas to fill viewport ([23f56af](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/23f56afaf7182de6e8164fdc0075d4b4b02780d8))
* subscription UI improvements - expired card, duplicate badges, live countdown ([f4d7a2c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f4d7a2cc8d20301108d86654ff03250206536cf3))
* support method query param fallback for external browser redirects ([7ce5341](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7ce5341e955ba34e7336959b09a528269e6b3417))
* support OIDC mode in TelegramLinkWidget for account linking ([880b2d4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/880b2d45fe8966f510f77b83d6513e8be0ec1e47))
* support VK ID OAuth 2.1 device_id in frontend ([60f16e6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/60f16e64e8cec2f540b2c49764fe711ddc9da86d))
* theme custom colors not persisting after navigation ([174fefd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/174fefddefa68156f9bb8359268f92b8f210f73d))
* theme custom colors save button not appearing ([ab80e31](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ab80e311b56e4e1fc1b4eca851b52db3af28f79c))
* tile noise texture instead of stretching on large screens ([f652936](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f652936d7867fba72b476de169de5e4b25bfaca5))
* unify device manager into additional options card with unbounded dot selector ([6dc8ca0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6dc8ca0d18bd0e23d6fa05b169f40686f6b2584c))
* use correct translation key for inactive campaign badge ([8207368](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8207368ef77a772fdcf70d7ec798ddbbbfd9e63c))
* use openTelegramLink for CryptoBot payment to open invoice in Telegram ([fc0dd39](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fc0dd3955092235c5b52c4da066954b6e3beaa19))
* use platform-conditional replace for QR navigation to preserve Telegram back behavior ([7bb75aa](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7bb75aa92045d911533506cf922cbc8a45ef0968))
* use short 12-char code in bot and cabinet share links ([73d67bc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/73d67bceedb84248992848c04d2792ae13c225a6))
* wheel lands on correct prize sector for Stars payment spins ([22bda66](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/22bda66e81714a2ff3e8de02b216af70509ced3e))
* widen column resize touch target for mobile ([c54cc9e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c54cc9e57733ab2a0e4476ced2967d2a7feeadcd))
* widen column resize touch target for mobile devices ([da273d6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/da273d6776adc7212057f5857884d58144b89134))
* админ-редактор — системные методы оплаты, реальные периоды тарифов, фильтрация на публичной странице ([e01c9f5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e01c9f51439fe74bbf74d7d40a7f7027252dbd17))
* безопасность и UX лендингов — 16 исправлений ([3cea482](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3cea48235f373412071afbb7d811a2306ad15b78))
* заменить Tailwind green/emerald классы на success из темы ([86f75f2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/86f75f25a78cd4b14c544ccb385474390d12d993))
* заменить хардкодный зелёный ([#3](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/issues/3)EDBB0) на акцентный цвет из темы ([d526d09](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d526d095dec1c4dc80f45ccd7940516a49051f3b))
* кнопка сохранения ручной темы не появлялась ([017a6fa](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/017a6fae35a395234ed6dcbd546e11cc7d38d455))
* поддержка режима «both» — показ кнопки контакта вместе с тикетами ([f960d5f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f960d5fc0bc627f523d06d442f0f6efb6adc2d5a))
* скрыть плашку верификации email при выключенной верификации ([11e8191](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/11e81917af4b950d3b33dd9362424a295c9c2cbd))


### Performance Improvements

* add Zustand selectors to prevent cascading re-renders ([03ad255](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/03ad255bf1cf8d3d80552351e26c4b1dc11fb9b9))
* eagerly load Dashboard to improve LCP on main route ([5c1be14](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5c1be1471e8b372bd6aec5470b0fdadf037cffbb))
* extract locales into separate chunk ([2c126f5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2c126f5e12d51beff6e21280b423b1851f93a0ac))
* extract Twemoji options to module-level const ([17b2f2e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/17b2f2e90328b9388175d1047fa01bf6257d584c))
* fix critical WebGL GPU resource leaks in Aurora ([9a84e13](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9a84e13e6cd4dcc3a6d5e7f95fddb4c9c1ec076e))
* fix GPU-heavy CSS patterns ([8604930](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/860493058a7d583edaea0e5261db1e485a016fc8))
* fix render cycle in useBranding and conditional polling ([30ece69](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/30ece694d43bd74fd2c26126926ec6452077681f))
* improve LCP — move font loading to HTML, defer logo preload ([962dd43](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/962dd43756438779b6cc1821f3ee6b8147113646))
* lazy-load locale files per language instead of bundling all ([9ae9ccc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9ae9cccbd96408c05f70163b50a63d7a33061a75))
* optimize animated backgrounds for mobile — reduce GPU load and memory pressure ([a933f66](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a933f661e49b70af3fadee90bc93257f689086be))
* prefetch background chunk on page load from localStorage cache ([44d88f7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/44d88f76532e5b9f7364210fafd3fc6c376c03cc))
* reduce Aurora animated background GPU load by ~95% ([56788b1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/56788b12e78ea2f45571b0a0f3a8c2e3b667355c))
* remove permanent GPU layer promotion from cards to fix flickering ([fe32322](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fe32322c323cce342a343c21acde9422855a9295))
* throttle theme color picker, rewrite beams with CSS animation ([d019953](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d0199536939a4553d5dace69453d52b37b6b50b0))


### Reverts

* remove device manager redesign, restore original device UI ([71a0111](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/71a0111a04d51f25ab8f4b226018519aeb3abcdc))
* remove user-facing reset traffic toggle ([4a68347](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4a68347ae8aec6296187da084031c02474fb97a1))

## [1.35.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.34.1...v1.35.0) (2026-03-17)


### Features

* deep link авторизация при блокировке oauth.telegram.org ([6a1a9f5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6a1a9f5db7c3a2aa553e8965c1d6e7d65a40dc6e))


### Bug Fixes

* deep link auth timer cleanup and reliability ([3d95025](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3d950252b70b59a6a0f49976aeb87686e850d0e9))
* recursive setTimeout, Strict Mode guard, isAxiosError ([b350003](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b35000367bbfb0041d33b3852f1eddb083b2e9a3))
* скрыть плашку верификации email при выключенной верификации ([11e8191](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/11e81917af4b950d3b33dd9362424a295c9c2cbd))

## [1.34.1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.34.0...v1.34.1) (2026-03-16)


### Bug Fixes

* поддержка режима «both» — показ кнопки контакта вместе с тикетами ([f960d5f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f960d5fc0bc627f523d06d442f0f6efb6adc2d5a))

## [1.34.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.33.2...v1.34.0) (2026-03-14)


### Features

* dual referral links UI (bot + cabinet) with independent copy states ([e023373](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e023373f56a06afc2b95b32930986bd1cdd4d241))


### Bug Fixes

* resolve all 14 ESLint warnings across the codebase ([885524a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/885524a00f7ea022ba6bb01108557e2e4db1f952))
* resolve all 14 ESLint warnings across the codebase ([62188b8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/62188b8d2e3cb090d0b27afe5cf4fcc65b3c68c2))

## [1.33.2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.33.1...v1.33.2) (2026-03-13)


### Bug Fixes

* resolve telegram auth token expiration and clean up codebase ([c0b834a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c0b834ab0610c3dc23e27099f224177187181c8a))
* resolve telegram auth token expiration and clean up codebase ([2dab25c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2dab25c5a036fb90f75c80e4e28f2a53885f9038))

## [1.33.1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.33.0...v1.33.1) (2026-03-13)


### Bug Fixes

* correct locale loader type to support nested translation objects ([ab03947](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ab0394776ad5f23778f45618e283fb319e4c688c))
* correct locale loader type to support nested translation objects ([682b6b7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/682b6b70dc65e14e8dc6c68c59501d5ca1a2171a))

## [1.33.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.32.0...v1.33.0) (2026-03-13)


### Features

* add LIMITED subscription status support with traffic-exhausted UX ([b4f9f33](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b4f9f332cf714717ed52cd18a82af9d2feb22416))


### Performance Improvements

* lazy-load locale files per language instead of bundling all ([9ae9ccc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9ae9cccbd96408c05f70163b50a63d7a33061a75))

## [1.32.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.31.0...v1.32.0) (2026-03-12)


### Features

* add show_in_gift toggle UI for tariffs in admin panel ([5a5a987](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5a5a9878931234103761d40fb24893afdb16a817))


### Bug Fixes

* handle Telegram Stars payment for gift subscriptions via openInvoice ([01e811b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/01e811bdfc5db4e0680c1b7d4bed5e91a66e503c))

## [1.31.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.30.0...v1.31.0) (2026-03-11)


### Features

* add gifts tab to admin user detail page ([695ab42](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/695ab42e03a0a77ecdbede1f8621dca6baf4b374))
* desktop nav expand-on-hover with larger icons ([8dab6dc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8dab6dc8fb8ef7ba97c94fa71cff5b4ed750198d))
* display promo group and active discount banners on gift page ([03c9e73](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/03c9e73a372f0357757a1835a933bedceaa7749a))
* responsive desktop nav — icon-only on lg, icon+text on xl ([e7cd370](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e7cd3702997144725ac90289e5aecd101856bc92))


### Bug Fixes

* desktop nav always icon-only with tooltips ([f0777f0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f0777f0b5db9115b84bdcb37eb9dab6650bd725b))
* display zero-amount transactions with neutral styling ([6fd76c8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6fd76c8dc89c5fb4d766a94a47048dde0f0afc83))
* show nav labels from 2xl (1536px) instead of xl (1280px) ([3bae6cf](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3bae6cf1e1e40c8f1434d64cdc4e99079856bc56))

## [1.30.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.29.1...v1.30.0) (2026-03-10)


### Features

* gift subscription redesign — code-only purchase + 3-tab UI ([af3e535](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/af3e535c698e7046f420b80a781991505f0c0ffb))
* show localized error for self-activation attempt ([7549ae7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7549ae70eb3ae14ae0cd4a45e5033675f4555c6a))
* split my gifts into Active/Activated/Received sections ([51ec799](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/51ec799c0c47189f9388dd6b19ca3329a55cf653))


### Bug Fixes

* activation broken — token uppercased + wrong env var for bot username ([d852bfe](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d852bfe969ed140f53872c5bdd8104ac20aecd34))
* add null guard for purchase_token before rendering CodeOnlySuccessState ([51cc122](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/51cc1221d0129018828b2abf0f273caada599649))
* CopiedToast not visible due to CSS transform context ([39bdf8b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/39bdf8b5c3e79e2c224db29f3c87d17135e2e0fb))
* gift code display + share modal backdrop ([a627eb0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a627eb0b30a6f65a8a0f40c13a891b4beb8e2e79))
* gift UI improvements — declension, GB display, share modal, deep links ([1bafcca](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1bafcca1ef58d98f044575511bbccf2c17825aa2))
* hide Quick Renew for expired trial subscriptions ([8b056e0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8b056e0b463d05106d389c41eae671684df7b043))
* remove dark backdrop overlay from share modal ([b213535](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b213535738d1261fbd7a68bb89ccaa21348615e7))
* replace orphaned shareModal i18n keys in GiftResult ([0322974](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0322974ebdf0d904a5f39809c0e0da5dbdfe03b7))
* route PendingGiftCard to gift activation tab instead of landing endpoint ([8ab740f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8ab740f8cb6ed9654b5f2d7d99d7f37a31e7de90))
* use short 12-char code in bot and cabinet share links ([73d67bc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/73d67bceedb84248992848c04d2792ae13c225a6))

## [1.29.1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.29.0...v1.29.1) (2026-03-10)


### Bug Fixes

* daily tariff renewal uses purchaseTariff instead of renewSubscription ([8629cfe](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8629cfea18aab9daf818f1f6c8e250ede29054d4))
* show fallback when tariff has no available periods for renewal ([ea06ad1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ea06ad1d8f7894f5460d150fa72d094617b9fbbe))

## [1.29.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.28.0...v1.29.0) (2026-03-09)


### Features

* add button reordering within rows and replace modal with inline add panel ([082471b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/082471bf92cab2577fec6ae047e0ab1ded224ba3))
* add gift navigation, routes, and i18n translations ([7890d48](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7890d480e05e87f77ea2fea3ae3a7e955bd167d3))
* add gift subscription API client and feature flag ([a495205](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a49520566e46eb0cfdc22a3661c5ba405dc6cc92))
* add gift subscription toggle to admin branding settings ([9542607](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9542607832561a8a72bb742947f3388bdaa087dc))
* add GiftSubscription and GiftResult pages ([814b1f5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/814b1f5e96f968d9bc2829ba395ac187fa4d2e11))
* add gradient fade indicators to scrollable desktop nav ([622172f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/622172f0387dc7f029c8af797d1f8df2e790771e))
* add menu editor tab with drag-and-drop rows, custom URL buttons, and button configuration ([23aa86f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/23aa86f1a81556ce2083e8b86107ee1a82c429b1))
* add open_in setting for custom buttons (external browser / Telegram miniapp) ([638844e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/638844ef47686f4c9540b5591d499255cdc8ff2f))
* read gift warning from status response, soften poll error state ([4322d58](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4322d58ff8ca56ba401b669370bee8783cf55a86))


### Bug Fixes

* add missing nameRequired i18n key for promo group form validation ([78fda22](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/78fda22679b9f5b4443fa602214e28ad52f7f2e9))
* admin promo groups - add default toggle, fix threshold reset to 0 ([9c7ab4b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9c7ab4b789f0d2e92c81afd2199789d03d3768db))
* harden gift subscription frontend after multi-agent review ([6ea1de2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6ea1de2e8afba93361c48a364ddc5406f6bc5d4b))
* make desktop nav horizontally scrollable on narrow screens ([ab7d1b7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ab7d1b7f25215aa6fb8fe7978d570f02d884b032))
* remove bg-dark-950 from gift pages to preserve animated background ([c8ec221](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c8ec2211112656ffc3787e905d9d6b2774bc6866))
* remove noreferrer from payment links to preserve Referer header ([45203da](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/45203dac5914c2abd60371ab552d2838048b3ef1))
* restore session from refresh token when access token is missing ([dc740ae](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/dc740ae2664059011fd755ccfa96ee46a26196d3))
* support OIDC mode in TelegramLinkWidget for account linking ([880b2d4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/880b2d45fe8966f510f77b83d6513e8be0ec1e47))

## [1.28.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.27.0...v1.28.0) (2026-03-09)


### Features

* add dedicated TopUpResult page for payment return flow ([b591228](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b59122818c3242ffab512b896f75179dd9a13c1b))
* support disabled daily subscription status in cabinet UI ([7940410](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7940410d7d913e8c92a7732f4fdc4ababd06ba3b))


### Bug Fixes

* cover all payment provider statuses in TopUpResult ([8897561](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8897561fb2af322b4b37b84ac07b7746fde70586))
* device purchase guard condition and cache invalidation ([115c684](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/115c684fe00d0e209953e4bdd3ff5d213909e423))
* force fresh balance data on purchase-options query ([69a8fe8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/69a8fe8e03aca6b0a984a0acb3ed5d9091ed4737))
* support method query param fallback for external browser redirects ([7ce5341](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7ce5341e955ba34e7336959b09a528269e6b3417))

## [1.27.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.26.0...v1.27.0) (2026-03-08)


### Features

* add gift purchase UI states for telegram recipients ([eed077b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/eed077b0197f215c8f74f70a2bf0b73fd41d4628))
* unified device manager with dot-based selector ([edb7ef0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/edb7ef0488b0ae994b7a37be9b95d1ab007feb09))


### Bug Fixes

* add purchase-options cache invalidation on balance changes ([f1102d2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f1102d278354ae3225f8b36029590d8c01b74ea0))
* mobile layout overflow on landing page ([9aae9cc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9aae9cc0e6e650ff6eb6633b0d08c952aa7f2c4a))
* show infinity symbol for unlimited traffic on landing page ([bda95ed](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bda95ed23f3b445c9a4a295a3be65310dae039e0))
* unify device manager into additional options card with unbounded dot selector ([6dc8ca0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6dc8ca0d18bd0e23d6fa05b169f40686f6b2584c))
* use platform-conditional replace for QR navigation to preserve Telegram back behavior ([7bb75aa](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7bb75aa92045d911533506cf922cbc8a45ef0968))


### Reverts

* remove device manager redesign, restore original device UI ([71a0111](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/71a0111a04d51f25ab8f4b226018519aeb3abcdc))

## [1.26.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.25.0...v1.26.0) (2026-03-07)


### Features

* add configurable animated background for landing pages ([a404690](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a4046903344855d849482b585fee1e27d13efcae))
* add landing page statistics page with recharts ([3019019](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/30190199ed88cde6aea575eed44a2f7d4361dbdc))
* add purchases list with pagination to landing stats page ([887b13d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/887b13dec22bbb6c4f07e8035cbbeefc437f10e2))


### Bug Fixes

* allow animated background to show through on landing pages ([66bb86a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/66bb86a5f286b40eb0cc7cbac8a82ad3d6336de2))
* rename duplicate 'purchases' i18n key to 'purchaseCount' ([0ce74ea](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0ce74ea5fb7efad60bb78b56a0bf6518fecb88d8))
* replace deprecated Telegram Login Widget redirect with callback ([32091d3](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/32091d3648889795d01d78bff933da3a38caa10f))
* send Bearer token on email register (link to Telegram account) ([68e6ce1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/68e6ce1bce1edc3c6048c1ed873865a27c39ea52))

## [1.25.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.24.0...v1.25.0) (2026-03-07)


### Features

* add discount UI for landing pages ([f7afa00](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f7afa002f08cfde0421ab8cfed8f699608fd6bc9))
* add external squad selection to tariff admin form ([bc45294](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bc452944876b64c5346dc04d53c561831fb31bd8))
* add i18n translations and admin category for Telegram OIDC ([c221c6e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c221c6e8bfc15b160565083f0198816d4c84c146))
* add landings permission section translations for role editor ([5228b2d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5228b2dea6f1adc78c521c197d09726a286516ba))
* add payment sub-option selection on quick purchase page ([58e93cd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/58e93cd2b72979ec95dd43ba7d6670d879e2f07d))
* add sub-options UI for landing payment methods + extract components ([d0be127](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d0be127d30574af1cb90503943bfa721dda8e645))
* add user filter chips and resource types to audit log ([4072274](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/40722747e33c2dcc5d5ccc1d213b4d2eb39e0f26))
* guest purchase activation UI & landing editor improvements ([b852e1e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b852e1e4cda7303e19ac7af8c3826e2ba52ac68a))
* guest purchase cabinet credentials UI ([d228d99](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d228d997d8360f8a15a23ec007a06048af7bd47d))
* migrate Telegram Login Widget to v23 with admin-configurable settings ([2c65ca8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2c65ca8a7ff372725bcbaa002e96bd043022bad1))
* TelegramLoginButton with OIDC popup + legacy widget fallback ([91f0e9e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/91f0e9e2fcd0d9c3f3dc7f7e31b763244350f754))
* мультиязычные лендинги + переключатель языка + исправления по ревью ([ab13616](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ab13616b0f0d31eac007a4c4b7f4f360f0f3c9b4))
* публичные лендинг-страницы для быстрой покупки VPN-подписок ([8b5d777](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8b5d777f0a94296330227b5fab34c65c83fb3baa))


### Bug Fixes

* adapt admin landings list for mobile layout ([b7c7dec](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b7c7decfd0f2818b65861699336d6221ba0e0ae2))
* add pagination to campaigns list ([46f640a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/46f640a7e0c2026c7629f0cd4cd01f7f4758bbe5))
* add unmount safety guard to OIDC callback handler ([dfa7a09](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/dfa7a09a7cb53ebbbc5de057fd587897d77dcb9b))
* address code review findings for TelegramLoginButton ([5c11f12](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5c11f1251a9bdbb60f49c105b1a3ebcbd477d8b8))
* admin landing editor — tariff period mapping and cleanup ([6a92814](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6a92814ce25bb718ce29450adbd7d01775e4e1dc))
* auto-select single sub-option and remove unused return_url field ([83fbd0e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/83fbd0e44564a3b5f174f52549ff29b638701067))
* handle Pydantic validation errors in notify + nullify empty optional fields ([9bd58cb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9bd58cb914623b75ec2a035e8c6e077b0fe45e8d))
* landing list crash — title is now LocaleDict, not string ([6755c1d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6755c1dc458e7f3ff68fb180306f72b17ff2a5b8))
* mobile layout and period label translations for quick purchase landing ([6d5c6fb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/6d5c6fb9b3905d8a0c22f39317fd5f77743d3505))
* OIDC login UX improvements from review ([b335d66](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b335d666c2c1fb557288d70fb249e4166f99b146))
* prevent buyer from activating gift pending subscription ([97959b0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/97959b013241597e77ed3223fb5aa2d1de8be2d0))
* safe error handling and numeric client_id in OIDC login ([45e68ff](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/45e68ffac231516577ac1f5230bf90fd5a1b5cdb))
* show total purchase count instead of paid on admin landings ([b9f1f59](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/b9f1f59e3cbcd5c9839a4a2e9eebeefa01364898))
* админ-редактор — системные методы оплаты, реальные периоды тарифов, фильтрация на публичной странице ([e01c9f5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e01c9f51439fe74bbf74d7d40a7f7027252dbd17))
* безопасность и UX лендингов — 16 исправлений ([3cea482](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3cea48235f373412071afbb7d811a2306ad15b78))

## [1.24.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.23.1...v1.24.0) (2026-03-05)


### Features

* account linking and merge UI for cabinet ([93f97d4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/93f97d45bec4ac4ac893475edd3e79107fe5806b))
* account merge flow — merge redirect, error handling, server-complete linking ([2fc0759](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2fc0759f89da90b7a349deb8a502417a4f790827))
* add sales_stats RBAC permission section to frontend ([262303d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/262303d623a6e8a597b3aa9310d1b8290b494595))
* add Telegram account linking UI with CSRF protection ([a6fabb1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a6fabb1d9d79c6a233e1ac52fcd006d9dea31a3e))
* open OAuth linking in external browser from Telegram Mini App ([7c30a1e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7c30a1eab616846253df1ec2c93b97259a54c8b8))
* кликабельные имена пользователей в последних платежах ([e278fec](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e278fec506e17281d0fb92cb04348b269dc8e30e))


### Bug Fixes

* accessibility, query cache clear, post-merge navigation ([e447e99](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e447e993cb10989f55525d9bb57ed8a5d5ad9d97))
* add Referrer-Policy to prevent merge token leakage via Referer header ([584f002](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/584f00297bfc38fefc372f28ba0947300b8a6064))
* double-click guard on link, wall-clock timer, blur cleanup ([8ad0500](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8ad0500cc80fee51b03880e7988ffe1192e7f214))
* harden merge UI and improve error handling ([58cf1e3](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/58cf1e3b504c8577e6d6aa081bf861cb871fb765))
* **merge:** accessibility, token guard, state cleanup ([579f47e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/579f47e563a13f4a56ca92064949d594bfe66063))
* move useState before useMutation for consistent hook ordering ([fba4481](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fba4481799081b05f0b082bcf983c6ac4c4daf1b))
* prevent onBlur race cancelling unlink confirmation ([3418ba9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3418ba9b8da69ec8ea3822971729bd16fcfcd1ce))
* remove unused linkTelegramWidget i18n key from all locales ([9b4a851](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9b4a8512c2e3cedf1f075aef62415fa5464b69e6))
* replace window.confirm with inline confirmation for unlink ([d0c01a0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d0c01a0e5cb656661b75175416ccf98c5aff8911))
* review findings — polling fallback, sessionStorage cleanup, UX ([da1926f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/da1926f0e1ab7f117aef120ac7648bdd50add72c))
* second round review fixes for merge UI ([aa26059](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/aa26059e004dc7ce96b3b0953343ace5e86696c3))
* заменить Tailwind green/emerald классы на success из темы ([86f75f2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/86f75f25a78cd4b14c544ccb385474390d12d993))
* заменить хардкодный зелёный ([#3](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/issues/3)EDBB0) на акцентный цвет из темы ([d526d09](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d526d095dec1c4dc80f45ccd7940516a49051f3b))

## [1.23.1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.23.0...v1.23.1) (2026-03-04)


### Bug Fixes

* ordered list numbering in Info page shows correct sequence ([8157ca5](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/8157ca5f0280dbcbf99eda210cd83130ec77c0b1))
* replace hardcoded green with theme-aware accent color ([a3ddddf](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a3ddddfa8ce167c22177fde3b131083c710ea619))

## [1.23.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.22.0...v1.23.0) (2026-03-02)


### Features

* add admin sales statistics dashboard with 5 analytics tabs ([a47c222](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a47c222310aea2f55bfa6b4df179aa8e27a5293d))
* add daily deposits by payment method chart ([f012710](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f012710df0c19c00de0c71c51515e03373a29eb5))
* add daily traffic & device purchase chart to addons stats ([2235b3c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2235b3cb77eb266b86eb98175e52855c6a08c828))
* add fullscreen QR code for subscription connection ([4d14e3e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4d14e3e8062c321e56fc37e79ed6cc16fa83df2a))
* add recharts analytics to admin campaign stats page ([c7d05c4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c7d05c4809166341a1702566a343946fe9126797))
* add reset traffic toggle on tariff switch ([49fff8e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/49fff8e85520ef3ee08cb06c473ba875cdf05dc6))
* display per-campaign stats on partner detail page ([75a6149](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/75a6149e2db4fd0ead705c431ff04ea6d9ffc3d2))
* enhance sales stats with device stats, per-tariff charts, and dual-series trials ([4622b4b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4622b4b200bb2973115b0a9891b0ec5956af89d2))


### Bug Fixes

* add subscription tab to desktop nav, fix device dots overflow, show available referral balance ([27f85a1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/27f85a1db115ca386c5658786147800e33f484bc))
* align RecentPaymentItem types with backend schema ([3f05039](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3f050396b8d784d1f5d32a949cfab2caaef4ddac))
* align TypeScript types with backend referral schemas ([11343f4](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/11343f4f12e0f082225f7413308972cb8ed92717))
* bar chart white hover cursor on dark theme ([14e5f43](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/14e5f436ce8e1ad110e60169095631916bf167d3))
* block wheel spin without active subscription ([821e991](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/821e991f51db6033d3e0f2befecf15c364d0e3e8))
* clean up expired trial card - remove redundant badge and subtitle ([d2f02d6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d2f02d605c5990bc88fbade5f6fa6e7624abd70b))
* eliminate hover flickering across all pages ([bdc201b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bdc201b5ea5e359a7f9d97bd86202be35654a7fe))
* improve campaign stats, shared chart components, and i18n coverage ([673de08](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/673de08dd4ad95a55fd70e230022a920fa8ea279))
* improve light theme visibility for dashboard and subscription cards ([4cdff97](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4cdff9730b3c70d88c1b32f00561b16673a2d55a))
* improve light theme visibility for inner panels on subscription page ([430b703](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/430b703bbea7c923a54824b3a814d59f61065831))
* isolate content layer from animated background to eliminate flickering ([04eacf6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/04eacf642184867f5ab3437f0aef09ff4ee73e0c))
* move CTA button above additional options section ([0bc817f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0bc817fa7f201e9176a586bb1b5c0a68c9406bf6))
* partner system bugs - commission field, withdrawal UX, admin amount ([e94d81f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e94d81fe5a25341172bb787146fd80d70067a140))
* prevent countdown timer overflow on narrow mobile screens ([96bcc76](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/96bcc76d695ee7e26ad2538e1733f439e6a2983b))
* remove devices stat block, stretch countdown to full width ([396f814](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/396f814cbdfae24bad3da8ad29d34ae9196593b9))
* render animated background via portal at z-index:-1 to stop implicit compositing ([12c97a2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/12c97a2c5ebf0d3dc776f581589a9d4280fbdc2e))
* replace framer-motion with CSS keyframes in boxes background ([7f17d95](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7f17d95ed6f21b07fee5bd2201e1754611028209))
* resolve hover flickering caused by GPU layer destruction ([d8cf430](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d8cf4301caeeccb890636faded3867bf22afef00))
* review fixes - Math.round kopecks, fa locale, admin list commission ([82987fd](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/82987fd49a861a4ad167c10f89d51e88e8ecee51))
* rewrite BackgroundBoxes from 225 DOM divs to single canvas element ([d89c534](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d89c534c0b21bff91747002a6e96bf12d114fcc2))
* show progress bar instead of dots when device_limit &gt; 10 ([d567817](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d567817e0564f2438d4192eb7b2321e1725da266))
* stop beams background from causing UI flickering in browser ([7e89cce](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7e89ccea5c8fceaedee2a550d1ba01d9074ac1b2))
* subscription UI improvements - expired card, duplicate badges, live countdown ([f4d7a2c](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f4d7a2cc8d20301108d86654ff03250206536cf3))
* support VK ID OAuth 2.1 device_id in frontend ([60f16e6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/60f16e64e8cec2f540b2c49764fe711ddc9da86d))
* tile noise texture instead of stretching on large screens ([f652936](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f652936d7867fba72b476de169de5e4b25bfaca5))


### Performance Improvements

* optimize animated backgrounds for mobile — reduce GPU load and memory pressure ([a933f66](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a933f661e49b70af3fadee90bc93257f689086be))
* remove permanent GPU layer promotion from cards to fix flickering ([fe32322](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/fe32322c323cce342a343c21acde9422855a9295))
* throttle theme color picker, rewrite beams with CSS animation ([d019953](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d0199536939a4553d5dace69453d52b37b6b50b0))


### Reverts

* remove user-facing reset traffic toggle ([4a68347](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4a68347ae8aec6296187da084031c02474fb97a1))

## [1.22.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.21.0...v1.22.0) (2026-02-25)


### Features

* adapt dashboard and subscription page for light theme ([f474067](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f474067efbb36974b47b51ba568304b6cd6b3805))
* add animated gradient border to Connect Device buttons ([70e1ed6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/70e1ed60bd545535b3148aae2b6546f7c17f9552))
* add dashboard sub-components for subscription cards and stats grid ([909374d](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/909374d369589474623ee006779586fadddd485b))
* add fonts, animations, and shared utilities for dashboard redesign ([7e345fc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7e345fc7d0431415496f8363959773e99a853b6e))
* add Freekassa SBP and card payment method icons and labels ([a725265](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a72526502605ab415c16d3506c6fd4aa0bee5c95))
* add HoverBorderGradient effect to key action buttons ([3fb9606](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3fb9606fd0f5bf765e117436e7507b4c7c226e89))
* add TrafficProgressBar and Sparkline components ([eb1f788](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/eb1f788033c696c1077002048f144b0bfd59592b))
* replace animated backgrounds with Aceternity UI system ([1a702a6](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/1a702a68b9cad0f112a65494250c11758388a91f))


### Bug Fixes

* animation config not updating for users after admin change ([94ddf31](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/94ddf319bd242211cbebf74e89a6052856f84f60))
* boxes background not covering full screen ([f16f96e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f16f96e442506484eae9434ae51c5f0f2fc45729))
* boxes background not covering viewport ([65afb29](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/65afb292747b0e57865bc4c0d5df320fbc58b261))
* improve HoverBorderGradient visibility with accent colors and darker bg ([4332c2b](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4332c2bd253774ddaef87f5735eec15f2b9645ee))
* remove duplicate tariff info line, make tariff card clickable ([bef5102](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bef5102a7182ce4eb33a8fd366e6247b3cba9905))
* remove gemini-effect and noise backgrounds, fix aurora animation ([79ff741](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/79ff7412cbc374b7ac085b6c8d3fd5f34de8ce37))
* rewrite 5 broken background components from Aceternity sources ([de97a03](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/de97a030d2ebffcfe957e179f32b2857d13465dc))
* rewrite gradient border with [@property](https://github.com/property) CSS angle animation ([d8b83cc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d8b83ccdb8d64e73e9f73785e4d81c5931aa28ec))
* rewrite HoverBorderGradient with CSS rotate instead of framer-motion ([e95db23](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e95db23573987dcf1abff63a9fae0b3db3686764))
* show actual connected devices count instead of device limit ([a819f30](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a819f309c8105561618690e1408a826b3bce294a))


### Performance Improvements

* eagerly load Dashboard to improve LCP on main route ([5c1be14](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5c1be1471e8b372bd6aec5470b0fdadf037cffbb))
* improve LCP — move font loading to HTML, defer logo preload ([962dd43](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/962dd43756438779b6cc1821f3ee6b8147113646))
* prefetch background chunk on page load from localStorage cache ([44d88f7](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/44d88f76532e5b9f7364210fafd3fc6c376c03cc))

## [1.21.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.20.0...v1.21.0) (2026-02-25)


### Features

* add granular user permissions (balance, subscription, promo_group, referral, send_offer) ([3d6987f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/3d6987f761b168113c009845d8ff028f9ca86688))
* add per-channel disable settings and global settings to channel admin ([48be067](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/48be067d1b41f57b02d97405b8a92538c306dabd))
* add RBAC permission system to admin cabinet frontend ([874ee26](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/874ee2682e50d9deca42b794a4be0ae0dd95ab5c))
* add translations for permission sections and actions ([80bfaca](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/80bfaca457192d25af182365da8c18a8f97c7830))
* add weekdays condition to ABAC policies ([a1a8dc2](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a1a8dc22034def5802791e1ceda4da6a3558db6b))
* allow editing system roles ([a050125](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a050125ea8d4265f096bafe0317e811289f38738))
* improve audit log - translate actions, fix resource filter, show request body ([5d0e353](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5d0e3539e22576e1824292da09c396123349b371))
* show query params in audit log details ([66f7fcb](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/66f7fcb3dca32748503f1ab92155818369f94da6))


### Bug Fixes

* add missing onError handlers on RBAC mutations ([c4e3211](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/c4e3211baa3bfec81cc0efec4467660180e42ba7))
* guard user detail API calls with RBAC permission checks ([bc5d832](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/bc5d832e0d3faf5dc6f64a6359e32d75e68c4282))
* RBAC frontend type mismatches and translations ([4c9c399](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/4c9c3992abe5ffbf98ad1e44e8e9d4b899af6594))
* RBAC policies page role handling and permission gates ([56188b1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/56188b1f8aa8526419d7a8e30389ef41787e7640))
* redesign role revoke confirmation dialog ([f829076](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/f829076bc2ec1f3229aa59d209ffbe5d1b00319f))
* replace broken modal with inline confirmation for role revoke ([78e7099](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/78e70992f169861fa51150ad06f91f047f3d0708))

## [1.20.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.19.1...v1.20.0) (2026-02-24)


### Features

* add channel edit in admin, hide subscribed channels in blocking screen ([5a55892](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/5a5589214529e42fd08a3b41929cddd974d52420))
* add multi-channel subscription blocking UI and admin management ([a767fe9](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/a767fe96d3992f91b5c1b722de132ea67f975432))

## [1.19.1](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.19.0...v1.19.1) (2026-02-23)


### Bug Fixes

* add max attribute to expected referrals input ([d1043e8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/d1043e83eaa163079a0272860b2d6a8f68332cf6))
* add resend email cooldown and allow email change for all auth types ([91d567f](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/91d567f9cc48dea7d605b55c6014174806b8d9ab))
* correct memory display to use actual usage instead of cache-inclusive ([67bacd3](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/67bacd3e7a36fa70c4ee97008849f0251600a7b8))
* detect Telegram account switch across tab closes ([ee6ec59](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ee6ec5959c2e25deecfdbf93b79c04cb150dc7f2))
* parse raw query string for deep link params to avoid double-decode ([ed65c29](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/ed65c29bacbfc50cdfa11e58f0cb638c6c8c1841))
* plug memory leaks in blob URLs and traffic cache ([7cf7273](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/7cf72735ece0510acc7a4e6af8997e8e7acdc9d8))
* preserve + chars in deep link URL params for crypto links ([65add9a](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/65add9a111086f970c77d686447016551ca9ab0f))
* remove double URL-decode in extractTelegramUserId ([e8acfee](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/e8acfee3e462ad127d42b382d7a9c56f7742bba9))
* render newlines in tariff description ([0b4e825](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/0b4e8253aa7a55b2cac7f6632912816b3234adc3))
* stack promo offer discounts with promo group discounts ([321bedc](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/321bedcb61a231d3dd8ecba8623d1ee9d632b9b7))


### Performance Improvements

* add Zustand selectors to prevent cascading re-renders ([03ad255](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/03ad255bf1cf8d3d80552351e26c4b1dc11fb9b9))
* extract Twemoji options to module-level const ([17b2f2e](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/17b2f2e90328b9388175d1047fa01bf6257d584c))
* fix critical WebGL GPU resource leaks in Aurora ([9a84e13](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/9a84e13e6cd4dcc3a6d5e7f95fddb4c9c1ec076e))
* fix GPU-heavy CSS patterns ([8604930](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/860493058a7d583edaea0e5261db1e485a016fc8))
* fix render cycle in useBranding and conditional polling ([30ece69](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/30ece694d43bd74fd2c26126926ec6452077681f))

## [1.19.0](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/compare/v1.18.0...v1.19.0) (2026-02-18)


### Features

* add referral code persistence across all auth methods ([2b2ead8](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet/commit/2b2ead837c457a02c8a153d6b25cae492aa5e617))

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
