import apiClient from './client';

// Types
export interface PinnedMessageMedia {
  type: 'photo' | 'video';
  file_id: string;
}

export interface PinnedMessageResponse {
  id: number;
  content: string;
  media_type: 'photo' | 'video' | null;
  media_file_id: string | null;
  send_before_menu: boolean;
  send_on_every_start: boolean;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface PinnedMessageListResponse {
  items: PinnedMessageResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface PinnedMessageCreateRequest {
  content: string;
  media?: PinnedMessageMedia;
  send_before_menu: boolean;
  send_on_every_start: boolean;
  broadcast: boolean;
}

export interface PinnedMessageUpdateRequest {
  content?: string;
  media?: PinnedMessageMedia;
  send_before_menu?: boolean;
  send_on_every_start?: boolean;
}

export interface PinnedMessageBroadcastResponse {
  message: PinnedMessageResponse;
  sent_count: number;
  failed_count: number;
}

export interface PinnedMessageUnpinResponse {
  unpinned_count: number;
  failed_count: number;
  was_active: boolean;
}

export interface MediaUploadResponse {
  media_type: string;
  file_id: string;
  file_unique_id: string | null;
  media_url: string;
}

export const adminPinnedMessagesApi = {
  // Get list of pinned messages with pagination
  list: async (limit = 20, offset = 0, activeOnly = false): Promise<PinnedMessageListResponse> => {
    const response = await apiClient.get<PinnedMessageListResponse>(
      '/cabinet/admin/pinned-messages',
      {
        params: { limit, offset, active_only: activeOnly },
      },
    );
    return response.data;
  },

  // Get current active message
  getActive: async (): Promise<PinnedMessageResponse> => {
    const response = await apiClient.get<PinnedMessageResponse>(
      '/cabinet/admin/pinned-messages/active',
    );
    return response.data;
  },

  // Get pinned message by ID
  get: async (id: number): Promise<PinnedMessageResponse> => {
    const response = await apiClient.get<PinnedMessageResponse>(
      `/cabinet/admin/pinned-messages/${id}`,
    );
    return response.data;
  },

  // Create pinned message
  create: async (data: PinnedMessageCreateRequest): Promise<PinnedMessageResponse> => {
    const response = await apiClient.post<PinnedMessageResponse>(
      '/cabinet/admin/pinned-messages',
      data,
    );
    return response.data;
  },

  // Update pinned message
  update: async (id: number, data: PinnedMessageUpdateRequest): Promise<PinnedMessageResponse> => {
    const response = await apiClient.patch<PinnedMessageResponse>(
      `/cabinet/admin/pinned-messages/${id}`,
      data,
    );
    return response.data;
  },

  // Update settings only
  updateSettings: async (
    id: number,
    data: Pick<PinnedMessageUpdateRequest, 'send_before_menu' | 'send_on_every_start'>,
  ): Promise<PinnedMessageResponse> => {
    const response = await apiClient.patch<PinnedMessageResponse>(
      `/cabinet/admin/pinned-messages/${id}/settings`,
      data,
    );
    return response.data;
  },

  // Deactivate active message
  deactivate: async (): Promise<PinnedMessageResponse> => {
    const response = await apiClient.post<PinnedMessageResponse>(
      '/cabinet/admin/pinned-messages/active/deactivate',
    );
    return response.data;
  },

  // Unpin from all users + deactivate
  unpin: async (): Promise<PinnedMessageUnpinResponse> => {
    const response = await apiClient.post<PinnedMessageUnpinResponse>(
      '/cabinet/admin/pinned-messages/active/unpin',
    );
    return response.data;
  },

  // Activate a message
  activate: async (id: number, broadcast = false): Promise<PinnedMessageResponse> => {
    const response = await apiClient.post<PinnedMessageResponse>(
      `/cabinet/admin/pinned-messages/${id}/activate`,
      null,
      { params: { broadcast } },
    );
    return response.data;
  },

  // Broadcast to all users
  broadcast: async (id: number): Promise<PinnedMessageBroadcastResponse> => {
    const response = await apiClient.post<PinnedMessageBroadcastResponse>(
      `/cabinet/admin/pinned-messages/${id}/broadcast`,
    );
    return response.data;
  },

  // Delete pinned message (only inactive)
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/cabinet/admin/pinned-messages/${id}`);
  },

  // Upload media (uses existing media endpoint)
  uploadMedia: async (file: File, mediaType: 'photo' | 'video'): Promise<MediaUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('media_type', mediaType);

    const response = await apiClient.post<MediaUploadResponse>('/cabinet/media/upload', formData);
    return response.data;
  },
};

export default adminPinnedMessagesApi;
