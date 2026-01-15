import apiClient from './client'

export interface LocalizedText {
  en: string
  ru: string
  zh?: string
  fa?: string
}

export interface AppButton {
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
}
