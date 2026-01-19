import apiClient from './client'

export interface LocalizedText {
  en: string
  ru: string
  zh?: string
  fa?: string
  fr?: string
}

export interface AppButton {
  id?: string  // Unique identifier for React key (client-side only)
  buttonLink: string
  buttonText: LocalizedText
}

export interface AppStep {
  description: LocalizedText
  buttons?: AppButton[]
  title?: LocalizedText
}

export interface AppDefinition {
  id: string
  name: string
  isFeatured: boolean
  urlScheme: string
  isNeedBase64Encoding?: boolean
  installationStep: AppStep
  addSubscriptionStep: AppStep
  connectAndUseStep: AppStep
  additionalBeforeAddSubscriptionStep?: AppStep
  additionalAfterAddSubscriptionStep?: AppStep
}

export interface AppConfigBranding {
  name: string
  logoUrl: string
  supportUrl: string
}

export interface AppConfigConfig {
  additionalLocales: string[]
  branding: AppConfigBranding
}

export interface AppConfigResponse {
  config: AppConfigConfig
  platforms: Record<string, AppDefinition[]>
}

export const adminAppsApi = {
  // Get full app config
  getConfig: async (): Promise<AppConfigResponse> => {
    const response = await apiClient.get<AppConfigResponse>('/cabinet/admin/apps')
    return response.data
  },

  // Get available platforms
  getPlatforms: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/cabinet/admin/apps/platforms')
    return response.data
  },

  // Get apps for a platform
  getPlatformApps: async (platform: string): Promise<AppDefinition[]> => {
    const response = await apiClient.get<AppDefinition[]>(`/cabinet/admin/apps/platforms/${platform}`)
    return response.data
  },

  // Create a new app
  createApp: async (platform: string, app: AppDefinition): Promise<AppDefinition> => {
    const response = await apiClient.post<AppDefinition>(`/cabinet/admin/apps/platforms/${platform}`, {
      platform,
      app,
    })
    return response.data
  },

  // Update an app
  updateApp: async (platform: string, appId: string, app: AppDefinition): Promise<AppDefinition> => {
    const response = await apiClient.put<AppDefinition>(`/cabinet/admin/apps/platforms/${platform}/${appId}`, {
      app,
    })
    return response.data
  },

  // Delete an app
  deleteApp: async (platform: string, appId: string): Promise<void> => {
    await apiClient.delete(`/cabinet/admin/apps/platforms/${platform}/${appId}`)
  },

  // Reorder apps
  reorderApps: async (platform: string, appIds: string[]): Promise<void> => {
    await apiClient.post(`/cabinet/admin/apps/platforms/${platform}/reorder`, {
      app_ids: appIds,
    })
  },

  // Copy app to another platform
  copyApp: async (platform: string, appId: string, targetPlatform: string): Promise<{ new_id: string }> => {
    const response = await apiClient.post<{ new_id: string; target_platform: string }>(
      `/cabinet/admin/apps/platforms/${platform}/copy/${appId}?target_platform=${targetPlatform}`
    )
    return response.data
  },

  // Get branding
  getBranding: async (): Promise<AppConfigBranding> => {
    const response = await apiClient.get<AppConfigBranding>('/cabinet/admin/apps/branding')
    return response.data
  },

  // Update branding
  updateBranding: async (branding: AppConfigBranding): Promise<AppConfigBranding> => {
    const response = await apiClient.put<AppConfigBranding>('/cabinet/admin/apps/branding', {
      branding,
    })
    return response.data
  },

  // Get RemnaWave config status
  getRemnaWaveStatus: async (): Promise<{ enabled: boolean; config_uuid: string | null }> => {
    const response = await apiClient.get<{ enabled: boolean; config_uuid: string | null }>(
      '/cabinet/admin/apps/remnawave/status'
    )
    return response.data
  },

  // Set RemnaWave config UUID
  setRemnaWaveUuid: async (uuid: string | null): Promise<{ enabled: boolean; config_uuid: string | null }> => {
    const response = await apiClient.put<{ enabled: boolean; config_uuid: string | null }>(
      '/cabinet/admin/apps/remnawave/uuid',
      { uuid }
    )
    return response.data
  },

  // List available RemnaWave configs
  listRemnaWaveConfigs: async (): Promise<{ uuid: string; name: string; view_position: number }[]> => {
    const response = await apiClient.get<{ uuid: string; name: string; view_position: number }[]>(
      '/cabinet/admin/apps/remnawave/configs'
    )
    return response.data
  },

  // Get RemnaWave subscription config
  getRemnaWaveConfig: async (): Promise<RemnawaveConfig> => {
    const response = await apiClient.get<{
      uuid: string
      name: string
      view_position: number
      config: RemnawaveConfig
    }>('/cabinet/admin/apps/remnawave/config')
    return response.data.config
  },
}

// ============== RemnaWave Format Types ==============

export interface RemnawaveButton {
  url: string
  text: LocalizedText
}

export interface RemnawaveBlock {
  title: LocalizedText
  description: LocalizedText
  buttons?: RemnawaveButton[]
  svgIconKey?: string
  svgIconColor?: string
}

export interface RemnawaveApp {
  name: string
  featured?: boolean
  urlScheme?: string
  isNeedBase64Encoding?: boolean
  blocks: RemnawaveBlock[]
}

export interface RemnawavePlatform {
  apps: RemnawaveApp[]
}

export interface RemnawaveSvgItem {
  svgString: string
  tags?: string[]
}

export interface RemnawaveBaseSettings {
  isShowTutorialButton: boolean
  tutorialUrl: string
}

export interface RemnawaveBaseTranslations {
  installApp: LocalizedText
  addSubscription: LocalizedText
  connectAndUse: LocalizedText
  copyLink: LocalizedText
  openApp: LocalizedText
  tutorial: LocalizedText
  close: LocalizedText
}

export interface RemnawaveBrandingSettings {
  name: string
  logoUrl: string
  supportUrl: string
}

export interface RemnawaveConfig {
  platforms: Record<string, RemnawavePlatform>
  svgLibrary?: Record<string, RemnawaveSvgItem>
  baseSettings?: RemnawaveBaseSettings
  baseTranslations?: RemnawaveBaseTranslations
  brandingSettings?: RemnawaveBrandingSettings
}

// ============== Converter Functions ==============

const emptyLocalizedText = (): LocalizedText => ({
  en: '',
  ru: '',
  zh: '',
  fa: '',
  fr: '',
})

// Convert Cabinet button to RemnaWave button
const cabinetButtonToRemnawave = (button: AppButton): RemnawaveButton => ({
  url: button.buttonLink,
  text: { ...emptyLocalizedText(), ...button.buttonText },
})

// Convert RemnaWave button to Cabinet button
const remnawaveButtonToCabinet = (button: RemnawaveButton): AppButton => ({
  buttonLink: button.url,
  buttonText: { en: button.text.en || '', ru: button.text.ru || '', zh: button.text.zh, fa: button.text.fa, fr: button.text.fr },
})

// Convert Cabinet app to RemnaWave app format
export const cabinetAppToRemnawave = (app: AppDefinition): RemnawaveApp => {
  const blocks: RemnawaveBlock[] = []

  // Block 1: Installation
  blocks.push({
    title: { ...emptyLocalizedText(), en: 'Install App', ru: 'Установка приложения' },
    description: { ...emptyLocalizedText(), ...app.installationStep.description },
    buttons: app.installationStep.buttons?.map(cabinetButtonToRemnawave),
    svgIconKey: 'download',
    svgIconColor: '#3B82F6',
  })

  // Block 2 (optional): Additional before subscription
  if (app.additionalBeforeAddSubscriptionStep?.description?.en || app.additionalBeforeAddSubscriptionStep?.description?.ru) {
    blocks.push({
      title: app.additionalBeforeAddSubscriptionStep.title || { ...emptyLocalizedText(), en: 'Preparation', ru: 'Подготовка' },
      description: { ...emptyLocalizedText(), ...app.additionalBeforeAddSubscriptionStep.description },
      buttons: app.additionalBeforeAddSubscriptionStep.buttons?.map(cabinetButtonToRemnawave),
      svgIconKey: 'settings',
      svgIconColor: '#8B5CF6',
    })
  }

  // Block 3: Add subscription
  blocks.push({
    title: { ...emptyLocalizedText(), en: 'Add Subscription', ru: 'Добавить подписку' },
    description: { ...emptyLocalizedText(), ...app.addSubscriptionStep.description },
    buttons: app.addSubscriptionStep.buttons?.map(cabinetButtonToRemnawave),
    svgIconKey: 'plus',
    svgIconColor: '#10B981',
  })

  // Block 4 (optional): Additional after subscription
  if (app.additionalAfterAddSubscriptionStep?.description?.en || app.additionalAfterAddSubscriptionStep?.description?.ru) {
    blocks.push({
      title: app.additionalAfterAddSubscriptionStep.title || { ...emptyLocalizedText(), en: 'Configuration', ru: 'Настройка' },
      description: { ...emptyLocalizedText(), ...app.additionalAfterAddSubscriptionStep.description },
      buttons: app.additionalAfterAddSubscriptionStep.buttons?.map(cabinetButtonToRemnawave),
      svgIconKey: 'settings',
      svgIconColor: '#F59E0B',
    })
  }

  // Block 5: Connect and use
  blocks.push({
    title: { ...emptyLocalizedText(), en: 'Connect and Use', ru: 'Подключение и использование' },
    description: { ...emptyLocalizedText(), ...app.connectAndUseStep.description },
    buttons: app.connectAndUseStep.buttons?.map(cabinetButtonToRemnawave),
    svgIconKey: 'check',
    svgIconColor: '#22C55E',
  })

  return {
    name: app.name,
    featured: app.isFeatured,
    urlScheme: app.urlScheme,
    isNeedBase64Encoding: app.isNeedBase64Encoding,
    blocks,
  }
}

// Convert RemnaWave app to Cabinet app format
export const remnawaveAppToCabinet = (app: RemnawaveApp, platform: string): AppDefinition => {
  const blocks = app.blocks || []

  // Default empty step
  const emptyStep = (): AppStep => ({
    description: emptyLocalizedText(),
    buttons: [],
  })

  // Try to identify blocks by their titles or position
  let installationBlock: RemnawaveBlock | undefined
  let subscriptionBlock: RemnawaveBlock | undefined
  let connectBlock: RemnawaveBlock | undefined
  let beforeSubBlock: RemnawaveBlock | undefined
  let afterSubBlock: RemnawaveBlock | undefined

  // First pass: try to identify by title keywords
  for (const block of blocks) {
    const enTitle = (block.title?.en || '').toLowerCase()
    const ruTitle = (block.title?.ru || '').toLowerCase()

    if (enTitle.includes('install') || ruTitle.includes('установ') || ruTitle.includes('скачай')) {
      if (!installationBlock) installationBlock = block
    } else if (enTitle.includes('subscription') || enTitle.includes('add') || ruTitle.includes('подписк') || ruTitle.includes('добав')) {
      if (!subscriptionBlock) subscriptionBlock = block
    } else if (enTitle.includes('connect') || enTitle.includes('use') || ruTitle.includes('подключ') || ruTitle.includes('использ')) {
      if (!connectBlock) connectBlock = block
    }
  }

  // Second pass: assign remaining blocks by position if not found by title
  if (!installationBlock && blocks.length > 0) {
    installationBlock = blocks[0]
  }
  if (!subscriptionBlock && blocks.length > 1) {
    subscriptionBlock = blocks.find(b => b !== installationBlock) || blocks[1]
  }
  if (!connectBlock && blocks.length > 2) {
    connectBlock = blocks.find(b => b !== installationBlock && b !== subscriptionBlock) || blocks[blocks.length - 1]
  }

  // Assign additional blocks
  const additionalBlocks = blocks.filter(b =>
    b !== installationBlock && b !== subscriptionBlock && b !== connectBlock
  )
  if (additionalBlocks.length >= 1) {
    // Check if block appears before subscription
    const subIndex = blocks.indexOf(subscriptionBlock!)
    const firstAdditionalIndex = blocks.indexOf(additionalBlocks[0])
    if (firstAdditionalIndex < subIndex) {
      beforeSubBlock = additionalBlocks[0]
      if (additionalBlocks.length >= 2) {
        afterSubBlock = additionalBlocks[1]
      }
    } else {
      afterSubBlock = additionalBlocks[0]
    }
  }

  // Convert block to cabinet step
  const blockToStep = (block: RemnawaveBlock | undefined): AppStep => {
    if (!block) return emptyStep()
    return {
      description: { en: block.description?.en || '', ru: block.description?.ru || '', zh: block.description?.zh, fa: block.description?.fa, fr: block.description?.fr },
      title: block.title ? { en: block.title.en || '', ru: block.title.ru || '', zh: block.title.zh, fa: block.title.fa, fr: block.title.fr } : undefined,
      buttons: block.buttons?.map(remnawaveButtonToCabinet),
    }
  }

  return {
    id: `${app.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${platform}-${Date.now()}`,
    name: app.name,
    isFeatured: app.featured || false,
    urlScheme: app.urlScheme || '',
    isNeedBase64Encoding: app.isNeedBase64Encoding,
    installationStep: blockToStep(installationBlock),
    addSubscriptionStep: blockToStep(subscriptionBlock),
    connectAndUseStep: blockToStep(connectBlock),
    additionalBeforeAddSubscriptionStep: beforeSubBlock ? blockToStep(beforeSubBlock) : undefined,
    additionalAfterAddSubscriptionStep: afterSubBlock ? blockToStep(afterSubBlock) : undefined,
  }
}

// Export all apps from cabinet to RemnaWave format
export const exportToRemnawaveFormat = (
  platformApps: Record<string, AppDefinition[]>,
  branding?: AppConfigBranding
): RemnawaveConfig => {
  const platforms: Record<string, RemnawavePlatform> = {}

  for (const [platform, apps] of Object.entries(platformApps)) {
    platforms[platform] = {
      apps: apps.map(cabinetAppToRemnawave),
    }
  }

  return {
    platforms,
    svgLibrary: {
      download: { svgString: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>' },
      plus: { svgString: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>' },
      check: { svgString: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>' },
      settings: { svgString: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>' },
    },
    baseSettings: {
      isShowTutorialButton: false,
      tutorialUrl: '',
    },
    baseTranslations: {
      installApp: { en: 'Install App', ru: 'Установить приложение', zh: '安装应用', fa: 'نصب برنامه', fr: 'Installer l\'application' },
      addSubscription: { en: 'Add Subscription', ru: 'Добавить подписку', zh: '添加订阅', fa: 'اضافه کردن اشتراک', fr: 'Ajouter un abonnement' },
      connectAndUse: { en: 'Connect and Use', ru: 'Подключиться и использовать', zh: '连接并使用', fa: 'اتصال و استفاده', fr: 'Connecter et utiliser' },
      copyLink: { en: 'Copy Link', ru: 'Скопировать ссылку', zh: '复制链接', fa: 'کپی لینک', fr: 'Copier le lien' },
      openApp: { en: 'Open App', ru: 'Открыть приложение', zh: '打开应用', fa: 'باز کردن برنامه', fr: 'Ouvrir l\'application' },
      tutorial: { en: 'Tutorial', ru: 'Инструкция', zh: '教程', fa: 'آموزش', fr: 'Tutoriel' },
      close: { en: 'Close', ru: 'Закрыть', zh: '关闭', fa: 'بستن', fr: 'Fermer' },
    },
    brandingSettings: branding ? {
      name: branding.name,
      logoUrl: branding.logoUrl,
      supportUrl: branding.supportUrl,
    } : undefined,
  }
}

// Import apps from RemnaWave format to cabinet
export const importFromRemnawaveFormat = (
  config: RemnawaveConfig
): { platformApps: Record<string, AppDefinition[]>; branding?: AppConfigBranding } => {
  const platformApps: Record<string, AppDefinition[]> = {}

  for (const [platform, platformData] of Object.entries(config.platforms || {})) {
    platformApps[platform] = (platformData.apps || []).map(app => remnawaveAppToCabinet(app, platform))
  }

  const branding = config.brandingSettings ? {
    name: config.brandingSettings.name,
    logoUrl: config.brandingSettings.logoUrl,
    supportUrl: config.brandingSettings.supportUrl,
  } : undefined

  return { platformApps, branding }
}
