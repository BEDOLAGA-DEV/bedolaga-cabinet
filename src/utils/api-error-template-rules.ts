// Source-audited owned templates. Parameter strings are never parsed or reformatted.
export const API_ERROR_TEMPLATE_RULES = [
  {
    key: 'template001',
    pattern: /^File too large\. Absolute maximum: (?<param1>-?[0-9]+) MB$/,
    routes: [{ method: 'post', path: /^\/cabinet\/admin\/news\/media\/upload$/ }],
  },
  {
    key: 'template002',
    pattern:
      /^File too large\. Maximum size for (?<param1>[^\r\n]{0,2048}?): (?<param2>-?[0-9]+) MB$/,
    routes: [{ method: 'post', path: /^\/cabinet\/admin\/news\/media\/upload$/ }],
  },
  {
    key: 'template003',
    pattern: /^Unsupported media type\. Allowed: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'post', path: /^\/cabinet\/media\/upload$/ }],
  },
  {
    key: 'template004',
    pattern: /^File too large\. Maximum size: (?<param1>-?[0-9]+)MB$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/media\/upload$/ },
      { method: 'post', path: /^\/cabinet\/branding\/logo$/ },
    ],
  },
  {
    key: 'template005',
    pattern: /^Period must be one of: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [
      { method: 'get', path: /^\/cabinet\/admin\/traffic$/ },
      { method: 'post', path: /^\/cabinet\/admin\/traffic\/export-csv$/ },
    ],
  },
  {
    key: 'template006',
    pattern: /^File too large\. Maximum size: (?<param1>-?[0-9]+) MB$/,
    routes: [{ method: 'post', path: /^\/cabinet\/branding\/bot-start-video$/ }],
  },
  {
    key: 'template007',
    pattern: /^Invalid hex color for (?<param1>[^\r\n]{0,2048}?): (?<param2>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'patch', path: /^\/cabinet\/branding\/colors$/ }],
  },
  {
    key: 'template008',
    pattern: /^Too many items selected \(max (?<param1>-?[0-9]+)\)$/,
    routes: [{ method: 'get', path: /^\/cabinet\/admin\/referral-network\/scoped$/ }],
  },
  {
    key: 'template009',
    pattern:
      /^Amount is below the minimum \((?<param1>[^\r\n]{0,2048}?)\) for this payment method$/,
    routes: [{ method: 'post', path: /^\/cabinet\/landing\/[^/?#]+\/purchase$/ }],
  },
  {
    key: 'template010',
    pattern: /^Amount exceeds the maximum \((?<param1>[^\r\n]{0,2048}?)\) for this payment method$/,
    routes: [{ method: 'post', path: /^\/cabinet\/landing\/[^/?#]+\/purchase$/ }],
  },
  {
    key: 'template011',
    pattern: /^Value must be one of: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/settings\/[^/?#]+$/ }],
  },
  {
    key: 'template012',
    pattern: /^Invalid permissions: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [
      { method: 'put', path: /^\/cabinet\/admin\/rbac\/roles\/[^/?#]+$/ },
      { method: 'post', path: /^\/cabinet\/admin\/rbac\/roles$/ },
    ],
  },
  {
    key: 'template013',
    pattern: /^You cannot grant permissions you do not hold: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [
      { method: 'put', path: /^\/cabinet\/admin\/rbac\/roles\/[^/?#]+$/ },
      { method: 'post', path: /^\/cabinet\/admin\/rbac\/assignments$/ },
      { method: 'post', path: /^\/cabinet\/admin\/rbac\/roles$/ },
    ],
  },
  {
    key: 'template014',
    pattern: /^Cannot change (?<param1>[^\r\n]{0,2048}?) on a system role$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/rbac\/roles\/[^/?#]+$/ }],
  },
  {
    key: 'template015',
    pattern: /^Slug "(?<param1>[^\r\n]{0,2048}?)" is reserved and cannot be used$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/admin\/landings$/ },
      { method: 'put', path: /^\/cabinet\/admin\/landings\/[^/?#]+$/ },
    ],
  },
  {
    key: 'template016',
    pattern: /^Landing page with slug "(?<param1>[^\r\n]{0,2048}?)" already exists$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/admin\/landings$/ },
      { method: 'put', path: /^\/cabinet\/admin\/landings\/[^/?#]+$/ },
    ],
  },
  {
    key: 'template017',
    pattern: /^Unknown action: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'post', path: /^\/cabinet\/admin\/users\/[^/?#]+\/subscription$/ }],
  },
  {
    key: 'template018',
    pattern:
      /^Insufficient balance\. Current: (?<param1>-?[0-9]+), requested: (?<param2>-?[0-9]+)$/,
    routes: [{ method: 'post', path: /^\/cabinet\/admin\/users\/[^/?#]+\/balance$/ }],
  },
  {
    key: 'template019',
    pattern:
      /^Аккаунт в панели принадлежит другому пользователю бота \(ID (?<param1>-?[0-9]+)\)\. Похоже, у человека две записи в боте — объедините их или удалите лишнюю\.$/,
    routes: [{ method: 'post', path: /^\/cabinet\/admin\/users\/[^/?#]+\/sync\/to-panel$/ }],
  },
  {
    key: 'template020',
    pattern:
      /^Action (?<param1>[^\r\n]{0,2048}?) operates on users, not subscriptions\. Use user_ids instead\.$/,
    routes: [{ method: 'post', path: /^\/cabinet\/admin\/bulk\/execute$/ }],
  },
  {
    key: 'template021',
    pattern: /^Payment method not found: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [
      { method: 'get', path: /^\/cabinet\/admin\/payment-methods\/[^/?#]+$/ },
      { method: 'put', path: /^\/cabinet\/admin\/payment-methods\/[^/?#]+$/ },
    ],
  },
  {
    key: 'template022',
    pattern: /^Date range cannot exceed (?<param1>-?[0-9]+) days$/,
    routes: [
      { method: 'get', path: /^\/cabinet\/admin\/stats\/sales\/summary$/ },
      { method: 'get', path: /^\/cabinet\/admin\/stats\/sales\/payment-health$/ },
      { method: 'get', path: /^\/cabinet\/admin\/stats\/sales\/subscriptions$/ },
      { method: 'get', path: /^\/cabinet\/admin\/stats\/sales\/addons$/ },
      { method: 'get', path: /^\/cabinet\/admin\/stats\/sales\/renewals$/ },
      { method: 'get', path: /^\/cabinet\/admin\/stats\/sales\/trials$/ },
      { method: 'get', path: /^\/cabinet\/admin\/stats\/sales\/deposits$/ },
    ],
  },
  {
    key: 'template023',
    pattern: /^Unsupported language: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/admin\/legal-pages\/faq\/pages$/ },
      { method: 'put', path: /^\/cabinet\/admin\/legal-pages\/recurrent-payments$/ },
      { method: 'put', path: /^\/cabinet\/admin\/legal-pages\/rules$/ },
      { method: 'put', path: /^\/cabinet\/admin\/legal-pages\/faq$/ },
      { method: 'put', path: /^\/cabinet\/admin\/legal-pages\/privacy-policy$/ },
      { method: 'put', path: /^\/cabinet\/admin\/legal-pages\/public-offer$/ },
    ],
  },
  {
    key: 'template024',
    pattern: /^Privacy policy for language (?<param1>[^\r\n]{0,2048}?) already exists$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/legal-pages\/privacy-policy$/ }],
  },
  {
    key: 'template025',
    pattern: /^Public offer for language (?<param1>[^\r\n]{0,2048}?) already exists$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/legal-pages\/public-offer$/ }],
  },
  {
    key: 'template026',
    pattern:
      /^Recurring-payments document for language (?<param1>[^\r\n]{0,2048}?) already exists$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/legal-pages\/recurrent-payments$/ }],
  },
  {
    key: 'template027',
    pattern: /^FAQ setting for language (?<param1>[^\r\n]{0,2048}?) already exists$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/legal-pages\/faq$/ }],
  },
  {
    key: 'template028',
    pattern: /^Invalid status\. Allowed: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'post', path: /^\/cabinet\/admin\/tickets\/[^/?#]+\/status$/ }],
  },
  {
    key: 'template029',
    pattern: /^Invalid priority\. Allowed: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'post', path: /^\/cabinet\/admin\/tickets\/[^/?#]+\/priority$/ }],
  },
  {
    key: 'template030',
    pattern: /^max_level_depth must be between 1 and (?<param1>-?[0-9]+)$/,
    routes: [{ method: 'patch', path: /^\/cabinet\/admin\/partners\/referral-depth$/ }],
  },
  {
    key: 'template031',
    pattern: /^levels_mode must be '(?<param1>[^\r\n]{0,2048}?)' or '(?<param2>[^\r\n]{0,2048}?)'$/,
    routes: [{ method: 'patch', path: /^\/cabinet\/admin\/partners\/referral-levels-mode$/ }],
  },
  {
    key: 'template032',
    pattern: /^Unknown tariff for (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/partners\/referral-levels\/[^/?#]+$/ }],
  },
  {
    key: 'template033',
    pattern:
      /^Invalid style "(?<param1>[^\r\n]{0,2048}?)" for section "(?<param2>[^\r\n]{0,2048}?)"\. Allowed: (?<param3>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'patch', path: /^\/cabinet\/admin\/button-styles$/ }],
  },
  {
    key: 'template034',
    pattern:
      /^Invalid locale "(?<param1>[^\r\n]{0,2048}?)" for section "(?<param2>[^\r\n]{0,2048}?)"\. Allowed: (?<param3>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'patch', path: /^\/cabinet\/admin\/button-styles$/ }],
  },
  {
    key: 'template035',
    pattern: /^Label value for locale "(?<param1>[^\r\n]{0,2048}?)" must be a string\.$/,
    routes: [
      { method: 'patch', path: /^\/cabinet\/admin\/button-styles$/ },
      { method: 'put', path: /^\/cabinet\/admin\/menu-layout$/ },
    ],
  },
  {
    key: 'template036',
    pattern:
      /^Label for locale "(?<param1>[^\r\n]{0,2048}?)" exceeds (?<param2>-?[0-9]+) characters\.$/,
    routes: [{ method: 'patch', path: /^\/cabinet\/admin\/button-styles$/ }],
  },
  {
    key: 'template037',
    pattern: /^Category with id=(?<param1>-?[0-9]+) not found$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/admin\/news$/ },
      { method: 'put', path: /^\/cabinet\/admin\/news\/[^/?#]+$/ },
    ],
  },
  {
    key: 'template038',
    pattern: /^Tag with id=(?<param1>-?[0-9]+) not found$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/admin\/news$/ },
      { method: 'put', path: /^\/cabinet\/admin\/news\/[^/?#]+$/ },
    ],
  },
  {
    key: 'template039',
    pattern:
      /^Текст слишком длинный для сообщения с медиа\. Максимум (?<param1>-?[0-9]+) символов, после обработки разметки\. Сократите текст или уберите медиафайл\.$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/admin\/broadcasts\/send$/ },
      { method: 'post', path: /^\/cabinet\/admin\/broadcasts$/ },
    ],
  },
  {
    key: 'template040',
    pattern: /^Invalid target: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/admin\/broadcasts\/preview$/ },
      { method: 'post', path: /^\/cabinet\/admin\/broadcasts$/ },
      { method: 'post', path: /^\/cabinet\/admin\/broadcasts\/send$/ },
    ],
  },
  {
    key: 'template041',
    pattern: /^Invalid email target: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/admin\/broadcasts\/email-preview$/ },
      { method: 'post', path: /^\/cabinet\/admin\/broadcasts\/send$/ },
    ],
  },
  {
    key: 'template042',
    pattern: /^Too many rows: (?<param1>-?[0-9]+)\. Maximum allowed: (?<param2>-?[0-9]+)\.$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/menu-layout$/ }],
  },
  {
    key: 'template043',
    pattern:
      /^Row "(?<param1>[^\r\n]{0,2048}?)" has (?<param2>-?[0-9]+) buttons\. Maximum per row: (?<param3>-?[0-9]+)\.$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/menu-layout$/ }],
  },
  {
    key: 'template044',
    pattern:
      /^Duplicate button ID: "(?<param1>[^\r\n]{0,2048}?)"\. Each button can only appear once\.$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/menu-layout$/ }],
  },
  {
    key: 'template045',
    pattern: /^Unknown built-in section: "(?<param1>[^\r\n]{0,2048}?)"\.$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/menu-layout$/ }],
  },
  {
    key: 'template046',
    pattern: /^Custom button id must start with "custom_": "(?<param1>[^\r\n]{0,2048}?)"\.$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/menu-layout$/ }],
  },
  {
    key: 'template047',
    pattern:
      /^Invalid style "(?<param1>[^\r\n]{0,2048}?)" for button "(?<param2>[^\r\n]{0,2048}?)"\. Allowed: (?<param3>[^\r\n]{0,2048}?)\.$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/menu-layout$/ }],
  },
  {
    key: 'template048',
    pattern:
      /^Custom button "(?<param1>[^\r\n]{0,2048}?)" must have a URL starting with http:\/\/, https:\/\/, or tg:\/\/\.$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/menu-layout$/ }],
  },
  {
    key: 'template049',
    pattern:
      /^Custom button "(?<param1>[^\r\n]{0,2048}?)" with webapp mode requires an https:\/\/ URL\.$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/menu-layout$/ }],
  },
  {
    key: 'template050',
    pattern:
      /^Invalid locale "(?<param1>[^\r\n]{0,2048}?)" for button "(?<param2>[^\r\n]{0,2048}?)"\. Allowed: (?<param3>[^\r\n]{0,2048}?)\.$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/menu-layout$/ }],
  },
  {
    key: 'template051',
    pattern:
      /^Label for locale "(?<param1>[^\r\n]{0,2048}?)" on button "(?<param2>[^\r\n]{0,2048}?)" exceeds (?<param3>-?[0-9]+) characters\.$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/menu-layout$/ }],
  },
  {
    key: 'template052',
    pattern: /^Failed to (?<param1>[^\r\n]{0,2048}?) node$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/admin\/stats\/nodes\/[^/?#]+\/toggle$/ },
      { method: 'post', path: /^\/cabinet\/admin\/remnawave\/nodes\/[^/?#]+\/action$/ },
    ],
  },
  {
    key: 'template053',
    pattern: /^Invalid language\. Supported: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'patch', path: /^\/cabinet\/info\/user\/language$/ }],
  },
  {
    key: 'template054',
    pattern:
      /^A (?<param1>[^\r\n]{0,2048}?) account is already linked to your account\. Unlink it first to link a different one\.$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/auth\/merge\/link\/[^/?#]+\/callback$/ },
      { method: 'post', path: /^\/cabinet\/auth\/merge\/link\/server-complete$/ },
    ],
  },
  {
    key: 'template055',
    pattern: /^Minimum amount is (?<param1>[0-9]+\.[0-9]{2}) RUB$/,
    routes: [{ method: 'post', path: /^\/cabinet\/balance\/topup$/ }],
  },
  {
    key: 'template056',
    pattern: /^Maximum amount is (?<param1>[0-9]+\.[0-9]{2}) RUB$/,
    routes: [{ method: 'post', path: /^\/cabinet\/balance\/topup$/ }],
  },
  {
    key: 'template057',
    pattern: /^Unsupported payment method: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'get', path: /^\/cabinet\/balance\/pending-payments\/[^/?#]+\/latest$/ }],
  },
  {
    key: 'template058',
    pattern: /^Invalid payment method: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [
      { method: 'get', path: /^\/cabinet\/balance\/pending-payments\/[^/?#]+\/latest$/ },
      { method: 'get', path: /^\/cabinet\/balance\/pending-payments\/[^/?#]+\/[^/?#]+$/ },
      { method: 'post', path: /^\/cabinet\/balance\/pending-payments\/[^/?#]+\/[^/?#]+\/check$/ },
    ],
  },
  {
    key: 'template059',
    pattern:
      /^Telegram Stars payments are only available through the bot\. Please use @(?<param1>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'post', path: /^\/cabinet\/balance\/topup$/ }],
  },
  {
    key: 'template060',
    pattern: /^GeoCheck requires Remnawave Panel and Node (?<param1>[^\r\n]{0,2048}?) or newer$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/admin\/remnawave\/nodes\/[^/?#]+\/geocheck$/ },
      { method: 'get', path: /^\/cabinet\/admin\/remnawave\/geocheck\/[^/?#]+$/ },
    ],
  },
  {
    key: 'template061',
    pattern: /^Campaign with start parameter '(?<param1>[^\r\n]{0,2048}?)' already exists$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/admin\/campaigns$/ },
      { method: 'put', path: /^\/cabinet\/admin\/campaigns\/[^/?#]+$/ },
    ],
  },
  {
    key: 'template062',
    pattern:
      /^Cannot delete campaign with (?<param1>-?[0-9]+) registrations\. Deactivate it instead\.$/,
    routes: [{ method: 'delete', path: /^\/cabinet\/admin\/campaigns\/[^/?#]+$/ }],
  },
  {
    key: 'template063',
    pattern: /^Unknown template type: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [
      { method: 'put', path: /^\/cabinet\/admin\/email-templates\/[^/?#]+\/[^/?#]+$/ },
      { method: 'delete', path: /^\/cabinet\/admin\/email-templates\/[^/?#]+\/[^/?#]+$/ },
      { method: 'patch', path: /^\/cabinet\/admin\/email-templates\/[^/?#]+\/enabled$/ },
      { method: 'get', path: /^\/cabinet\/admin\/email-templates\/[^/?#]+$/ },
      { method: 'post', path: /^\/cabinet\/admin\/email-templates\/[^/?#]+\/preview$/ },
      { method: 'post', path: /^\/cabinet\/admin\/email-templates\/[^/?#]+\/test$/ },
    ],
  },
  {
    key: 'template064',
    pattern:
      /^Invalid language: (?<param1>[^\r\n]{0,2048}?)\. Available: (?<param2>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/email-templates\/[^/?#]+\/[^/?#]+$/ }],
  },
  {
    key: 'template065',
    pattern:
      /^Неизвестные плейсхолдеры: (?<param1>[^\r\n]{0,2048}?) — бот их не подставит, и они уйдут в письмо как есть$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/email-templates\/[^/?#]+\/[^/?#]+$/ }],
  },
  {
    key: 'template066',
    pattern:
      /^В шаблоне нет обязательных плейсхолдеров: (?<param1>[^\r\n]{0,2048}?) — без них письмо бесполезно$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/email-templates\/[^/?#]+\/[^/?#]+$/ }],
  },
  {
    key: 'template067',
    pattern: /^Insufficient balance\. Need (?<param1>[0-9]+\.[0-9]{2}) RUB$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/subscription\/trial$/ },
      { method: 'put', path: /^\/cabinet\/subscription\/traffic$/ },
    ],
  },
  {
    key: 'template068',
    pattern:
      /^Traffic must be between (?<param1>-?[0-9]+) and (?<param2>-?[0-9]+) GB for this tariff$/,
    routes: [{ method: 'post', path: /^\/cabinet\/subscription\/purchase-tariff$/ }],
  },
  {
    key: 'template069',
    pattern:
      /^Insufficient balance\. Need (?<param1>[0-9]+\.[0-9]{2}) RUB, have (?<param2>[0-9]+\.[0-9]{2}) RUB$/,
    routes: [{ method: 'post', path: /^\/cabinet\/subscription\/countries$/ }],
  },
  {
    key: 'template070',
    pattern: /^Country (?<param1>[^\r\n]{0,2048}?) is not available$/,
    routes: [{ method: 'post', path: /^\/cabinet\/subscription\/countries$/ }],
  },
  {
    key: 'template071',
    pattern: /^Cannot renew subscription with status: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'post', path: /^\/cabinet\/subscription\/renew$/ }],
  },
  {
    key: 'template072',
    pattern: /^Cooldown active\. Try again in (?<param1>-?[0-9]+) seconds\.$/,
    routes: [{ method: 'post', path: /^\/cabinet\/subscription\/revoke$/ }],
  },
  {
    key: 'template073',
    pattern: /^Rate limited\. Try again in (?<param1>-?[0-9]+) seconds\.$/,
    routes: [{ method: 'post', path: /^\/cabinet\/subscription\/refresh-traffic$/ }],
  },
  {
    key: 'template074',
    pattern: /^Traffic package (?<param1>-?[0-9]+)GB is not available$/,
    routes: [{ method: 'post', path: /^\/cabinet\/subscription\/traffic$/ }],
  },
  {
    key: 'template075',
    pattern: /^Traffic package (?<param1>-?[0-9]+)GB has no price configured$/,
    routes: [{ method: 'post', path: /^\/cabinet\/subscription\/traffic$/ }],
  },
  {
    key: 'template076',
    pattern: /^Пакет трафика (?<param1>-?[0-9]+) ГБ недоступен$/,
    routes: [{ method: 'post', path: /^\/cabinet\/subscription\/traffic\/save-cart$/ }],
  },
  {
    key: 'template077',
    pattern:
      /^Traffic limit exceeded\. Max: (?<param1>-?[0-9]+) GB, available: (?<param2>-?[0-9]+) GB$/,
    routes: [{ method: 'post', path: /^\/cabinet\/subscription\/traffic$/ }],
  },
  {
    key: 'template078',
    pattern: /^Максимальное количество устройств: (?<param1>-?[0-9]+)$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/subscription\/devices$/ },
      { method: 'post', path: /^\/cabinet\/subscription\/devices\/save-cart$/ },
      { method: 'post', path: /^\/cabinet\/subscription\/devices\/purchase$/ },
    ],
  },
  {
    key: 'template079',
    pattern: /^Cannot reduce below minimum device limit \((?<param1>-?[0-9]+)\) for your tariff$/,
    routes: [{ method: 'post', path: /^\/cabinet\/subscription\/devices\/reduce$/ }],
  },
  {
    key: 'template080',
    pattern:
      /^You are blocked from contacting support until (?<param1>[0-9]{2}\.[0-9]{2}\.[0-9]{4} [0-9]{2}:[0-9]{2})$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/tickets$/ },
      { method: 'post', path: /^\/cabinet\/tickets\/[^/?#]+\/messages$/ },
    ],
  },
  {
    key: 'template081',
    pattern: /^Unknown activity types: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [{ method: 'get', path: /^\/cabinet\/admin\/users\/[^/?#]+\/activity$/ }],
  },
  {
    key: 'template082',
    pattern: /^quick_amounts cannot have more than (?<param1>-?[0-9]+) items$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/payment-methods\/[^/?#]+$/ }],
  },
  {
    key: 'template083',
    pattern: /^quick_amounts items must not exceed (?<param1>-?[0-9]+) rub$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/payment-methods\/[^/?#]+$/ }],
  },
  {
    key: 'template084',
    pattern: /^level must be between 1 and (?<param1>-?[0-9]+)$/,
    routes: [{ method: 'put', path: /^\/cabinet\/admin\/partners\/referral-levels\/[^/?#]+$/ }],
  },
  {
    key: 'template085',
    pattern: /^Unsupported contact type: (?<param1>[^\r\n]{0,2048}?)$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/gift\/purchase$/ },
      { method: 'post', path: /^\/cabinet\/landing\/[^/?#]+\/purchase$/ },
    ],
  },
  {
    key: 'template086',
    pattern: /^Минимальная сумма вывода: (?<param1>-?[0-9]+)₽\. Доступно: (?<param2>-?[0-9]+)₽$/,
    routes: [{ method: 'post', path: /^\/cabinet\/referral\/withdrawal\/create$/ }],
  },
  {
    key: 'template087',
    pattern: /^Недостаточно средств\. Доступно: (?<param1>-?[0-9]+)₽$/,
    routes: [{ method: 'post', path: /^\/cabinet\/referral\/withdrawal\/create$/ }],
  },
  {
    key: 'template088',
    pattern: /^Недостаточно средств на балансе\. Баланс: (?<param1>-?[0-9]+)₽$/,
    routes: [{ method: 'post', path: /^\/cabinet\/admin\/withdrawals\/[^/?#]+\/approve$/ }],
  },
  {
    key: 'template089',
    pattern: /^Недостаточно реферального баланса\. Доступно: (?<param1>-?[0-9]+)₽$/,
    routes: [{ method: 'post', path: /^\/cabinet\/referral\/withdrawal\/create$/ }],
  },
  {
    key: 'template090',
    pattern: /^Следующий запрос на вывод будет доступен через (?<param1>-?[0-9]+) дн\.$/,
    routes: [{ method: 'post', path: /^\/cabinet\/referral\/withdrawal\/create$/ }],
  },
  {
    key: 'template091',
    pattern:
      /^Тариф не имеет цены за период (?<param1>-?[0-9]+) дней — СБП-автопродление недоступно$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/subscription\/platega-recurrent\/enable$/ },
      { method: 'post', path: /^\/cabinet\/subscription\/platega-recurrent\/purchase$/ },
    ],
  },
  {
    key: 'template092',
    pattern:
      /^Тариф не имеет цены за период (?<param1>-?[0-9]+) дн\. — автопродление Cashera недоступно$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/subscription\/cashera-recurrent\/enable$/ },
      { method: 'post', path: /^\/cabinet\/subscription\/cashera-recurrent\/purchase$/ },
    ],
  },
  {
    key: 'template093',
    pattern:
      /^Продукт Lava стоит (?<param1>[0-9]+\.[0-9]{2}) ₽, а продление подписки — (?<param2>[0-9]+\.[0-9]{2}) ₽ за (?<param3>-?[0-9]+) дн\. Заведите продукт с актуальной ценой\.$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/subscription\/lava-recurrent\/enable$/ },
      { method: 'post', path: /^\/cabinet\/subscription\/lava-recurrent\/purchase$/ },
    ],
  },
  {
    key: 'template094',
    pattern: /^Максимальное количество устройств: (?<param1>-?[0-9]+)\. Баланс возвращён\.$/,
    routes: [
      { method: 'post', path: /^\/cabinet\/subscription\/devices$/ },
      { method: 'post', path: /^\/cabinet\/subscription\/devices\/purchase$/ },
    ],
  },
] as const;
