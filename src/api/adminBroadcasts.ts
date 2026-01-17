import apiClient from './client'

// Types
export interface BroadcastFilter {
  key: string
  label: string
  count: number | null
  group: string | null
}

export interface TariffFilter {
  key: string
  label: string
  tariff_id: number
  count: number
}

export interface BroadcastFiltersResponse {
  filters: BroadcastFilter[]
  tariff_filters: TariffFilter[]
  custom_filters: BroadcastFilter[]
}

export interface TariffForBroadcast {
  id: number
  name: string
  filter_key: string
  active_users_count: number
}

export interface BroadcastTariffsResponse {
  tariffs: TariffForBroadcast[]
}

export interface BroadcastButton {
  key: string
  label: string
  default: boolean
}

export interface BroadcastButtonsResponse {
  buttons: BroadcastButton[]
}

export interface BroadcastMedia {
  type: 'photo' | 'video' | 'document'
  file_id: string
  caption?: string
}

export interface BroadcastCreateRequest {
  target: string
  message_text: string
  selected_buttons: string[]
  media?: BroadcastMedia
}

export interface Broadcast {
  id: number
  target_type: string
  message_text: string
  has_media: boolean
  media_type: string | null
  media_file_id: string | null
  media_caption: string | null
  total_count: number
  sent_count: number
  failed_count: number
  status: 'queued' | 'in_progress' | 'completed' | 'partial' | 'failed' | 'cancelled' | 'cancelling'
  admin_id: number | null
  admin_name: string | null
  created_at: string
  completed_at: string | null
  progress_percent: number
}

export interface BroadcastListResponse {
  items: Broadcast[]
  total: number
  limit: number
  offset: number
}

export interface BroadcastPreviewRequest {
  target: string
}

export interface BroadcastPreviewResponse {
  target: string
  count: number
}

export interface MediaUploadResponse {
  media_type: string
  file_id: string
  file_unique_id: string | null
  media_url: string
}

export const adminBroadcastsApi = {
  // Get all available filters with counts
  getFilters: async (): Promise<BroadcastFiltersResponse> => {
    const response = await apiClient.get<BroadcastFiltersResponse>('/cabinet/admin/broadcasts/filters')
    return response.data
  },

  // Get tariffs for filtering
  getTariffs: async (): Promise<BroadcastTariffsResponse> => {
    const response = await apiClient.get<BroadcastTariffsResponse>('/cabinet/admin/broadcasts/tariffs')
    return response.data
  },

  // Get available buttons
  getButtons: async (): Promise<BroadcastButtonsResponse> => {
    const response = await apiClient.get<BroadcastButtonsResponse>('/cabinet/admin/broadcasts/buttons')
    return response.data
  },

  // Preview broadcast (get recipients count)
  preview: async (target: string): Promise<BroadcastPreviewResponse> => {
    const response = await apiClient.post<BroadcastPreviewResponse>('/cabinet/admin/broadcasts/preview', {
      target,
    })
    return response.data
  },

  // Create and start broadcast
  create: async (data: BroadcastCreateRequest): Promise<Broadcast> => {
    const response = await apiClient.post<Broadcast>('/cabinet/admin/broadcasts', data)
    return response.data
  },

  // Get list of broadcasts
  list: async (limit = 20, offset = 0): Promise<BroadcastListResponse> => {
    const response = await apiClient.get<BroadcastListResponse>('/cabinet/admin/broadcasts', {
      params: { limit, offset },
    })
    return response.data
  },

  // Get broadcast details
  get: async (id: number): Promise<Broadcast> => {
    const response = await apiClient.get<Broadcast>(`/cabinet/admin/broadcasts/${id}`)
    return response.data
  },

  // Stop broadcast
  stop: async (id: number): Promise<Broadcast> => {
    const response = await apiClient.post<Broadcast>(`/cabinet/admin/broadcasts/${id}/stop`)
    return response.data
  },

  // Upload media (uses existing media endpoint)
  uploadMedia: async (file: File, mediaType: 'photo' | 'video' | 'document'): Promise<MediaUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('media_type', mediaType)

    const response = await apiClient.post<MediaUploadResponse>('/cabinet/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

export default adminBroadcastsApi
