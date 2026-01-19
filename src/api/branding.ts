import apiClient from './client'

export interface BrandingInfo {
  name: string
  logo_url: string | null
  logo_letter: string
  has_custom_logo: boolean
}

export interface AnimationEnabled {
  enabled: boolean
}

const BRANDING_CACHE_KEY = 'cabinet_branding'

// Get cached branding from localStorage
export const getCachedBranding = (): BrandingInfo | null => {
  try {
    const cached = localStorage.getItem(BRANDING_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch {
    // localStorage not available or invalid JSON
  }
  return null
}

// Update branding cache in localStorage
export const setCachedBranding = (branding: BrandingInfo) => {
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding))
  } catch {
    // localStorage not available
  }
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

  // Get animation enabled (public, no auth required)
  getAnimationEnabled: async (): Promise<AnimationEnabled> => {
    const response = await apiClient.get<AnimationEnabled>('/cabinet/branding/animation')
    return response.data
  },

  // Update animation enabled (admin only)
  updateAnimationEnabled: async (enabled: boolean): Promise<AnimationEnabled> => {
    const response = await apiClient.patch<AnimationEnabled>('/cabinet/branding/animation', { enabled })
    return response.data
  },
}
