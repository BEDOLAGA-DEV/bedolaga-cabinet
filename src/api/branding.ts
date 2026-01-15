import apiClient from './client'

export interface BrandingInfo {
  name: string
  logo_url: string | null
  logo_letter: string
  has_custom_logo: boolean
}

export const brandingApi = {
  // Get current branding (public, no auth required)
  getBranding: async (): Promise<BrandingInfo> => {
    const response = await apiClient.get<BrandingInfo>('/cabinet/branding')
    return response.data
  },

  // Update project name (admin only)
  updateName: async (name: string): Promise<BrandingInfo> => {
    const response = await apiClient.put<BrandingInfo>('/cabinet/branding/name', { name })
    return response.data
  },

  // Upload custom logo (admin only)
  uploadLogo: async (file: File): Promise<BrandingInfo> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<BrandingInfo>('/cabinet/branding/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Delete custom logo (admin only)
  deleteLogo: async (): Promise<BrandingInfo> => {
    const response = await apiClient.delete<BrandingInfo>('/cabinet/branding/logo')
    return response.data
  },

  // Get logo URL (without cache busting - server handles caching via Cache-Control headers)
  getLogoUrl: (branding: BrandingInfo): string | null => {
    if (!branding.has_custom_logo || !branding.logo_url) {
      return null
    }
    return `${import.meta.env.VITE_API_URL || ''}${branding.logo_url}`
  },
}
