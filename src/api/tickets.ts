import apiClient from './client';
import type { Ticket, TicketDetail, TicketMessage, PaginatedResponse } from '../types';

// Media upload response type
interface MediaUploadResponse {
  media_type: string;
  file_id: string;
  file_unique_id: string | null;
  media_url: string;
}

// Media parameters for ticket messages
interface MediaParams {
  media_type?: string;
  media_file_id?: string;
  media_caption?: string;
}

export const ticketsApi = {
  // Get tickets list
  getTickets: async (params?: {
    page?: number;
    per_page?: number;
    status?: string;
  }): Promise<PaginatedResponse<Ticket>> => {
    const response = await apiClient.get<PaginatedResponse<Ticket>>('/cabinet/tickets', {
      params,
    });
    return response.data;
  },

  // Create ticket with optional media
  createTicket: async (
    title: string,
    message: string,
    media?: MediaParams,
  ): Promise<TicketDetail> => {
    const response = await apiClient.post<TicketDetail>('/cabinet/tickets', {
      title,
      message,
      ...media,
    });
    return response.data;
  },

  // Get ticket detail
  getTicket: async (ticketId: number): Promise<TicketDetail> => {
    const response = await apiClient.get<TicketDetail>(`/cabinet/tickets/${ticketId}`);
    return response.data;
  },

  // Add message to ticket with optional media
  addMessage: async (
    ticketId: number,
    message: string,
    media?: MediaParams,
  ): Promise<TicketMessage> => {
    const response = await apiClient.post<TicketMessage>(`/cabinet/tickets/${ticketId}/messages`, {
      message,
      ...media,
    });
    return response.data;
  },

  // Upload media file for tickets
  uploadMedia: async (file: File, mediaType: string = 'photo'): Promise<MediaUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('media_type', mediaType);

    const response = await apiClient.post<MediaUploadResponse>('/cabinet/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get media URL for display
  getMediaUrl: (fileId: string): string => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    return `${baseUrl}/cabinet/media/${fileId}`;
  },
};
