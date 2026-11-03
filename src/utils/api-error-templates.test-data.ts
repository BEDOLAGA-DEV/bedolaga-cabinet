// Source-derived examples for every audited route/template pair.
export const API_ERROR_TEMPLATE_EXAMPLES = [
  {
    key: 'template001',
    raw: 'File too large. Absolute maximum: 18 MB',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/admin/news/media/upload',
  },
  {
    key: 'template002',
    raw: 'File too large. Maximum size for masked-1: 19 MB',
    params: {
      param1: 'masked-1',
      param2: '19',
    },
    method: 'post',
    url: '/cabinet/admin/news/media/upload',
  },
  {
    key: 'template003',
    raw: 'Unsupported media type. Allowed: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/media/upload',
  },
  {
    key: 'template004',
    raw: 'File too large. Maximum size: 18MB',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/media/upload',
  },
  {
    key: 'template004',
    raw: 'File too large. Maximum size: 18MB',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/branding/logo',
  },
  {
    key: 'template005',
    raw: 'Period must be one of: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'get',
    url: '/cabinet/admin/traffic',
  },
  {
    key: 'template005',
    raw: 'Period must be one of: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/traffic/export-csv',
  },
  {
    key: 'template006',
    raw: 'File too large. Maximum size: 18 MB',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/branding/bot-start-video',
  },
  {
    key: 'template007',
    raw: 'Invalid hex color for masked-1: masked-2',
    params: {
      param1: 'masked-1',
      param2: 'masked-2',
    },
    method: 'patch',
    url: '/cabinet/branding/colors',
  },
  {
    key: 'template008',
    raw: 'Too many items selected (max 18)',
    params: {
      param1: '18',
    },
    method: 'get',
    url: '/cabinet/admin/referral-network/scoped',
  },
  {
    key: 'template009',
    raw: 'Amount is below the minimum (masked-1) for this payment method',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/landing/masked-1/purchase',
  },
  {
    key: 'template010',
    raw: 'Amount exceeds the maximum (masked-1) for this payment method',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/landing/masked-1/purchase',
  },
  {
    key: 'template011',
    raw: 'Value must be one of: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/settings/masked-1',
  },
  {
    key: 'template012',
    raw: 'Invalid permissions: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/rbac/roles/masked-1',
  },
  {
    key: 'template012',
    raw: 'Invalid permissions: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/rbac/roles',
  },
  {
    key: 'template013',
    raw: 'You cannot grant permissions you do not hold: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/rbac/roles/masked-1',
  },
  {
    key: 'template013',
    raw: 'You cannot grant permissions you do not hold: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/rbac/assignments',
  },
  {
    key: 'template013',
    raw: 'You cannot grant permissions you do not hold: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/rbac/roles',
  },
  {
    key: 'template014',
    raw: 'Cannot change masked-1 on a system role',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/rbac/roles/masked-1',
  },
  {
    key: 'template015',
    raw: 'Slug "masked-1" is reserved and cannot be used',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/landings',
  },
  {
    key: 'template015',
    raw: 'Slug "masked-1" is reserved and cannot be used',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/landings/masked-1',
  },
  {
    key: 'template016',
    raw: 'Landing page with slug "masked-1" already exists',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/landings',
  },
  {
    key: 'template016',
    raw: 'Landing page with slug "masked-1" already exists',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/landings/masked-1',
  },
  {
    key: 'template017',
    raw: 'Unknown action: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/users/masked-1/subscription',
  },
  {
    key: 'template018',
    raw: 'Insufficient balance. Current: 18, requested: 19',
    params: {
      param1: '18',
      param2: '19',
    },
    method: 'post',
    url: '/cabinet/admin/users/masked-1/balance',
  },
  {
    key: 'template019',
    raw: 'Аккаунт в панели принадлежит другому пользователю бота (ID 18). Похоже, у человека две записи в боте — объедините их или удалите лишнюю.',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/admin/users/masked-1/sync/to-panel',
  },
  {
    key: 'template020',
    raw: 'Action masked-1 operates on users, not subscriptions. Use user_ids instead.',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/bulk/execute',
  },
  {
    key: 'template021',
    raw: 'Payment method not found: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'get',
    url: '/cabinet/admin/payment-methods/masked-1',
  },
  {
    key: 'template021',
    raw: 'Payment method not found: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/payment-methods/masked-1',
  },
  {
    key: 'template022',
    raw: 'Date range cannot exceed 18 days',
    params: {
      param1: '18',
    },
    method: 'get',
    url: '/cabinet/admin/stats/sales/summary',
  },
  {
    key: 'template022',
    raw: 'Date range cannot exceed 18 days',
    params: {
      param1: '18',
    },
    method: 'get',
    url: '/cabinet/admin/stats/sales/payment-health',
  },
  {
    key: 'template022',
    raw: 'Date range cannot exceed 18 days',
    params: {
      param1: '18',
    },
    method: 'get',
    url: '/cabinet/admin/stats/sales/subscriptions',
  },
  {
    key: 'template022',
    raw: 'Date range cannot exceed 18 days',
    params: {
      param1: '18',
    },
    method: 'get',
    url: '/cabinet/admin/stats/sales/addons',
  },
  {
    key: 'template022',
    raw: 'Date range cannot exceed 18 days',
    params: {
      param1: '18',
    },
    method: 'get',
    url: '/cabinet/admin/stats/sales/renewals',
  },
  {
    key: 'template022',
    raw: 'Date range cannot exceed 18 days',
    params: {
      param1: '18',
    },
    method: 'get',
    url: '/cabinet/admin/stats/sales/trials',
  },
  {
    key: 'template022',
    raw: 'Date range cannot exceed 18 days',
    params: {
      param1: '18',
    },
    method: 'get',
    url: '/cabinet/admin/stats/sales/deposits',
  },
  {
    key: 'template023',
    raw: 'Unsupported language: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/legal-pages/faq/pages',
  },
  {
    key: 'template023',
    raw: 'Unsupported language: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/legal-pages/recurrent-payments',
  },
  {
    key: 'template023',
    raw: 'Unsupported language: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/legal-pages/rules',
  },
  {
    key: 'template023',
    raw: 'Unsupported language: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/legal-pages/faq',
  },
  {
    key: 'template023',
    raw: 'Unsupported language: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/legal-pages/privacy-policy',
  },
  {
    key: 'template023',
    raw: 'Unsupported language: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/legal-pages/public-offer',
  },
  {
    key: 'template024',
    raw: 'Privacy policy for language masked-1 already exists',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/legal-pages/privacy-policy',
  },
  {
    key: 'template025',
    raw: 'Public offer for language masked-1 already exists',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/legal-pages/public-offer',
  },
  {
    key: 'template026',
    raw: 'Recurring-payments document for language masked-1 already exists',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/legal-pages/recurrent-payments',
  },
  {
    key: 'template027',
    raw: 'FAQ setting for language masked-1 already exists',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/legal-pages/faq',
  },
  {
    key: 'template028',
    raw: 'Invalid status. Allowed: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/tickets/masked-1/status',
  },
  {
    key: 'template029',
    raw: 'Invalid priority. Allowed: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/tickets/masked-1/priority',
  },
  {
    key: 'template030',
    raw: 'max_level_depth must be between 1 and 18',
    params: {
      param1: '18',
    },
    method: 'patch',
    url: '/cabinet/admin/partners/referral-depth',
  },
  {
    key: 'template031',
    raw: "levels_mode must be 'masked-1' or 'masked-2'",
    params: {
      param1: 'masked-1',
      param2: 'masked-2',
    },
    method: 'patch',
    url: '/cabinet/admin/partners/referral-levels-mode',
  },
  {
    key: 'template032',
    raw: 'Unknown tariff for masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/partners/referral-levels/masked-1',
  },
  {
    key: 'template033',
    raw: 'Invalid style "masked-1" for section "masked-2". Allowed: masked-3',
    params: {
      param1: 'masked-1',
      param2: 'masked-2',
      param3: 'masked-3',
    },
    method: 'patch',
    url: '/cabinet/admin/button-styles',
  },
  {
    key: 'template034',
    raw: 'Invalid locale "masked-1" for section "masked-2". Allowed: masked-3',
    params: {
      param1: 'masked-1',
      param2: 'masked-2',
      param3: 'masked-3',
    },
    method: 'patch',
    url: '/cabinet/admin/button-styles',
  },
  {
    key: 'template035',
    raw: 'Label value for locale "masked-1" must be a string.',
    params: {
      param1: 'masked-1',
    },
    method: 'patch',
    url: '/cabinet/admin/button-styles',
  },
  {
    key: 'template035',
    raw: 'Label value for locale "masked-1" must be a string.',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/menu-layout',
  },
  {
    key: 'template036',
    raw: 'Label for locale "masked-1" exceeds 19 characters.',
    params: {
      param1: 'masked-1',
      param2: '19',
    },
    method: 'patch',
    url: '/cabinet/admin/button-styles',
  },
  {
    key: 'template037',
    raw: 'Category with id=18 not found',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/admin/news',
  },
  {
    key: 'template037',
    raw: 'Category with id=18 not found',
    params: {
      param1: '18',
    },
    method: 'put',
    url: '/cabinet/admin/news/masked-1',
  },
  {
    key: 'template038',
    raw: 'Tag with id=18 not found',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/admin/news',
  },
  {
    key: 'template038',
    raw: 'Tag with id=18 not found',
    params: {
      param1: '18',
    },
    method: 'put',
    url: '/cabinet/admin/news/masked-1',
  },
  {
    key: 'template039',
    raw: 'Текст слишком длинный для сообщения с медиа. Максимум 18 символов, после обработки разметки. Сократите текст или уберите медиафайл.',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/admin/broadcasts/send',
  },
  {
    key: 'template039',
    raw: 'Текст слишком длинный для сообщения с медиа. Максимум 18 символов, после обработки разметки. Сократите текст или уберите медиафайл.',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/admin/broadcasts',
  },
  {
    key: 'template040',
    raw: 'Invalid target: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/broadcasts/preview',
  },
  {
    key: 'template040',
    raw: 'Invalid target: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/broadcasts',
  },
  {
    key: 'template040',
    raw: 'Invalid target: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/broadcasts/send',
  },
  {
    key: 'template041',
    raw: 'Invalid email target: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/broadcasts/email-preview',
  },
  {
    key: 'template041',
    raw: 'Invalid email target: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/broadcasts/send',
  },
  {
    key: 'template042',
    raw: 'Too many rows: 18. Maximum allowed: 19.',
    params: {
      param1: '18',
      param2: '19',
    },
    method: 'put',
    url: '/cabinet/admin/menu-layout',
  },
  {
    key: 'template043',
    raw: 'Row "masked-1" has 19 buttons. Maximum per row: 20.',
    params: {
      param1: 'masked-1',
      param2: '19',
      param3: '20',
    },
    method: 'put',
    url: '/cabinet/admin/menu-layout',
  },
  {
    key: 'template044',
    raw: 'Duplicate button ID: "masked-1". Each button can only appear once.',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/menu-layout',
  },
  {
    key: 'template045',
    raw: 'Unknown built-in section: "masked-1".',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/menu-layout',
  },
  {
    key: 'template046',
    raw: 'Custom button id must start with "custom_": "masked-1".',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/menu-layout',
  },
  {
    key: 'template047',
    raw: 'Invalid style "masked-1" for button "masked-2". Allowed: masked-3.',
    params: {
      param1: 'masked-1',
      param2: 'masked-2',
      param3: 'masked-3',
    },
    method: 'put',
    url: '/cabinet/admin/menu-layout',
  },
  {
    key: 'template048',
    raw: 'Custom button "masked-1" must have a URL starting with http://, https://, or tg://.',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/menu-layout',
  },
  {
    key: 'template049',
    raw: 'Custom button "masked-1" with webapp mode requires an https:// URL.',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/menu-layout',
  },
  {
    key: 'template050',
    raw: 'Invalid locale "masked-1" for button "masked-2". Allowed: masked-3.',
    params: {
      param1: 'masked-1',
      param2: 'masked-2',
      param3: 'masked-3',
    },
    method: 'put',
    url: '/cabinet/admin/menu-layout',
  },
  {
    key: 'template051',
    raw: 'Label for locale "masked-1" on button "masked-2" exceeds 20 characters.',
    params: {
      param1: 'masked-1',
      param2: 'masked-2',
      param3: '20',
    },
    method: 'put',
    url: '/cabinet/admin/menu-layout',
  },
  {
    key: 'template052',
    raw: 'Failed to masked-1 node',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/stats/nodes/masked-1/toggle',
  },
  {
    key: 'template052',
    raw: 'Failed to masked-1 node',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/remnawave/nodes/masked-1/action',
  },
  {
    key: 'template053',
    raw: 'Invalid language. Supported: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'patch',
    url: '/cabinet/info/user/language',
  },
  {
    key: 'template054',
    raw: 'A masked-1 account is already linked to your account. Unlink it first to link a different one.',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/auth/merge/link/masked-1/callback',
  },
  {
    key: 'template054',
    raw: 'A masked-1 account is already linked to your account. Unlink it first to link a different one.',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/auth/merge/link/server-complete',
  },
  {
    key: 'template055',
    raw: 'Minimum amount is 123.40 RUB',
    params: {
      param1: '123.40',
    },
    method: 'post',
    url: '/cabinet/balance/topup',
  },
  {
    key: 'template056',
    raw: 'Maximum amount is 123.40 RUB',
    params: {
      param1: '123.40',
    },
    method: 'post',
    url: '/cabinet/balance/topup',
  },
  {
    key: 'template057',
    raw: 'Unsupported payment method: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'get',
    url: '/cabinet/balance/pending-payments/masked-1/latest',
  },
  {
    key: 'template058',
    raw: 'Invalid payment method: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'get',
    url: '/cabinet/balance/pending-payments/masked-1/latest',
  },
  {
    key: 'template058',
    raw: 'Invalid payment method: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'get',
    url: '/cabinet/balance/pending-payments/masked-1/masked-1',
  },
  {
    key: 'template058',
    raw: 'Invalid payment method: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/balance/pending-payments/masked-1/masked-1/check',
  },
  {
    key: 'template059',
    raw: 'Telegram Stars payments are only available through the bot. Please use @masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/balance/topup',
  },
  {
    key: 'template060',
    raw: 'GeoCheck requires Remnawave Panel and Node masked-1 or newer',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/remnawave/nodes/masked-1/geocheck',
  },
  {
    key: 'template060',
    raw: 'GeoCheck requires Remnawave Panel and Node masked-1 or newer',
    params: {
      param1: 'masked-1',
    },
    method: 'get',
    url: '/cabinet/admin/remnawave/geocheck/masked-1',
  },
  {
    key: 'template061',
    raw: "Campaign with start parameter 'masked-1' already exists",
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/campaigns',
  },
  {
    key: 'template061',
    raw: "Campaign with start parameter 'masked-1' already exists",
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/campaigns/masked-1',
  },
  {
    key: 'template062',
    raw: 'Cannot delete campaign with 18 registrations. Deactivate it instead.',
    params: {
      param1: '18',
    },
    method: 'delete',
    url: '/cabinet/admin/campaigns/masked-1',
  },
  {
    key: 'template063',
    raw: 'Unknown template type: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/email-templates/masked-1/masked-1',
  },
  {
    key: 'template063',
    raw: 'Unknown template type: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'delete',
    url: '/cabinet/admin/email-templates/masked-1/masked-1',
  },
  {
    key: 'template063',
    raw: 'Unknown template type: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'patch',
    url: '/cabinet/admin/email-templates/masked-1/enabled',
  },
  {
    key: 'template063',
    raw: 'Unknown template type: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'get',
    url: '/cabinet/admin/email-templates/masked-1',
  },
  {
    key: 'template063',
    raw: 'Unknown template type: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/email-templates/masked-1/preview',
  },
  {
    key: 'template063',
    raw: 'Unknown template type: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/admin/email-templates/masked-1/test',
  },
  {
    key: 'template064',
    raw: 'Invalid language: masked-1. Available: masked-2',
    params: {
      param1: 'masked-1',
      param2: 'masked-2',
    },
    method: 'put',
    url: '/cabinet/admin/email-templates/masked-1/masked-1',
  },
  {
    key: 'template065',
    raw: 'Неизвестные плейсхолдеры: masked-1 — бот их не подставит, и они уйдут в письмо как есть',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/email-templates/masked-1/masked-1',
  },
  {
    key: 'template066',
    raw: 'В шаблоне нет обязательных плейсхолдеров: masked-1 — без них письмо бесполезно',
    params: {
      param1: 'masked-1',
    },
    method: 'put',
    url: '/cabinet/admin/email-templates/masked-1/masked-1',
  },
  {
    key: 'template067',
    raw: 'Insufficient balance. Need 123.40 RUB',
    params: {
      param1: '123.40',
    },
    method: 'post',
    url: '/cabinet/subscription/trial',
  },
  {
    key: 'template067',
    raw: 'Insufficient balance. Need 123.40 RUB',
    params: {
      param1: '123.40',
    },
    method: 'put',
    url: '/cabinet/subscription/traffic',
  },
  {
    key: 'template068',
    raw: 'Traffic must be between 18 and 19 GB for this tariff',
    params: {
      param1: '18',
      param2: '19',
    },
    method: 'post',
    url: '/cabinet/subscription/purchase-tariff',
  },
  {
    key: 'template069',
    raw: 'Insufficient balance. Need 123.40 RUB, have 123.40 RUB',
    params: {
      param1: '123.40',
      param2: '123.40',
    },
    method: 'post',
    url: '/cabinet/subscription/countries',
  },
  {
    key: 'template070',
    raw: 'Country masked-1 is not available',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/subscription/countries',
  },
  {
    key: 'template071',
    raw: 'Cannot renew subscription with status: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/subscription/renew',
  },
  {
    key: 'template072',
    raw: 'Cooldown active. Try again in 18 seconds.',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/revoke',
  },
  {
    key: 'template073',
    raw: 'Rate limited. Try again in 18 seconds.',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/refresh-traffic',
  },
  {
    key: 'template074',
    raw: 'Traffic package 18GB is not available',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/traffic',
  },
  {
    key: 'template075',
    raw: 'Traffic package 18GB has no price configured',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/traffic',
  },
  {
    key: 'template076',
    raw: 'Пакет трафика 18 ГБ недоступен',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/traffic/save-cart',
  },
  {
    key: 'template077',
    raw: 'Traffic limit exceeded. Max: 18 GB, available: 19 GB',
    params: {
      param1: '18',
      param2: '19',
    },
    method: 'post',
    url: '/cabinet/subscription/traffic',
  },
  {
    key: 'template078',
    raw: 'Максимальное количество устройств: 18',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/devices',
  },
  {
    key: 'template078',
    raw: 'Максимальное количество устройств: 18',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/devices/save-cart',
  },
  {
    key: 'template078',
    raw: 'Максимальное количество устройств: 18',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/devices/purchase',
  },
  {
    key: 'template079',
    raw: 'Cannot reduce below minimum device limit (18) for your tariff',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/devices/reduce',
  },
  {
    key: 'template080',
    raw: 'You are blocked from contacting support until 06.11.2026 11:05',
    params: {
      param1: '06.11.2026 11:05',
    },
    method: 'post',
    url: '/cabinet/tickets',
  },
  {
    key: 'template080',
    raw: 'You are blocked from contacting support until 06.11.2026 11:05',
    params: {
      param1: '06.11.2026 11:05',
    },
    method: 'post',
    url: '/cabinet/tickets/masked-1/messages',
  },
  {
    key: 'template081',
    raw: 'Unknown activity types: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'get',
    url: '/cabinet/admin/users/masked-1/activity',
  },
  {
    key: 'template082',
    raw: 'quick_amounts cannot have more than 18 items',
    params: {
      param1: '18',
    },
    method: 'put',
    url: '/cabinet/admin/payment-methods/masked-1',
  },
  {
    key: 'template083',
    raw: 'quick_amounts items must not exceed 18 rub',
    params: {
      param1: '18',
    },
    method: 'put',
    url: '/cabinet/admin/payment-methods/masked-1',
  },
  {
    key: 'template084',
    raw: 'level must be between 1 and 18',
    params: {
      param1: '18',
    },
    method: 'put',
    url: '/cabinet/admin/partners/referral-levels/masked-1',
  },
  {
    key: 'template085',
    raw: 'Unsupported contact type: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/gift/purchase',
  },
  {
    key: 'template085',
    raw: 'Unsupported contact type: masked-1',
    params: {
      param1: 'masked-1',
    },
    method: 'post',
    url: '/cabinet/landing/masked-1/purchase',
  },
  {
    key: 'template086',
    raw: 'Минимальная сумма вывода: 18₽. Доступно: 19₽',
    params: {
      param1: '18',
      param2: '19',
    },
    method: 'post',
    url: '/cabinet/referral/withdrawal/create',
  },
  {
    key: 'template087',
    raw: 'Недостаточно средств. Доступно: 18₽',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/referral/withdrawal/create',
  },
  {
    key: 'template088',
    raw: 'Недостаточно средств на балансе. Баланс: 18₽',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/admin/withdrawals/masked-1/approve',
  },
  {
    key: 'template089',
    raw: 'Недостаточно реферального баланса. Доступно: 18₽',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/referral/withdrawal/create',
  },
  {
    key: 'template090',
    raw: 'Следующий запрос на вывод будет доступен через 18 дн.',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/referral/withdrawal/create',
  },
  {
    key: 'template091',
    raw: 'Тариф не имеет цены за период 18 дней — СБП-автопродление недоступно',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/platega-recurrent/enable',
  },
  {
    key: 'template091',
    raw: 'Тариф не имеет цены за период 18 дней — СБП-автопродление недоступно',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/platega-recurrent/purchase',
  },
  {
    key: 'template092',
    raw: 'Тариф не имеет цены за период 18 дн. — автопродление Cashera недоступно',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/cashera-recurrent/enable',
  },
  {
    key: 'template092',
    raw: 'Тариф не имеет цены за период 18 дн. — автопродление Cashera недоступно',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/cashera-recurrent/purchase',
  },
  {
    key: 'template093',
    raw: 'Продукт Lava стоит 123.40 ₽, а продление подписки — 123.40 ₽ за 20 дн. Заведите продукт с актуальной ценой.',
    params: {
      param1: '123.40',
      param2: '123.40',
      param3: '20',
    },
    method: 'post',
    url: '/cabinet/subscription/lava-recurrent/enable',
  },
  {
    key: 'template093',
    raw: 'Продукт Lava стоит 123.40 ₽, а продление подписки — 123.40 ₽ за 20 дн. Заведите продукт с актуальной ценой.',
    params: {
      param1: '123.40',
      param2: '123.40',
      param3: '20',
    },
    method: 'post',
    url: '/cabinet/subscription/lava-recurrent/purchase',
  },
  {
    key: 'template094',
    raw: 'Максимальное количество устройств: 18. Баланс возвращён.',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/devices',
  },
  {
    key: 'template094',
    raw: 'Максимальное количество устройств: 18. Баланс возвращён.',
    params: {
      param1: '18',
    },
    method: 'post',
    url: '/cabinet/subscription/devices/purchase',
  },
] as const;
