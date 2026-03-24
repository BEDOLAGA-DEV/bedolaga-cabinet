import apiClient from './client';
import type {
  NewsArticle,
  NewsCategory,
  NewsTag,
  NewsListResponse,
  NewsCreateRequest,
  NewsUpdateRequest,
  NewsMediaUploadResponse,
} from '../types/news';

export const newsApi = {
  // User endpoints
  getNews: async (params?: {
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<NewsListResponse> => {
    const response = await apiClient.get<NewsListResponse>('/cabinet/news', { params });
    return response.data;
  },

  getArticle: async (slug: string): Promise<NewsArticle> => {
    const response = await apiClient.get<NewsArticle>(`/cabinet/news/${encodeURIComponent(slug)}`);
    return response.data;
  },

  // Admin endpoints
  getAdminNews: async (params?: { limit?: number; offset?: number }): Promise<NewsListResponse> => {
    const response = await apiClient.get<NewsListResponse>('/cabinet/admin/news', { params });
    return response.data;
  },

  getAdminArticle: async (id: number): Promise<NewsArticle> => {
    const response = await apiClient.get<NewsArticle>(`/cabinet/admin/news/${id}`);
    return response.data;
  },

  createArticle: async (data: NewsCreateRequest): Promise<NewsArticle> => {
    const response = await apiClient.post<NewsArticle>('/cabinet/admin/news', data);
    return response.data;
  },

  updateArticle: async (id: number, data: NewsUpdateRequest): Promise<NewsArticle> => {
    const response = await apiClient.put<NewsArticle>(`/cabinet/admin/news/${id}`, data);
    return response.data;
  },

  deleteArticle: async (id: number): Promise<void> => {
    await apiClient.delete(`/cabinet/admin/news/${id}`);
  },

  togglePublish: async (id: number): Promise<NewsArticle> => {
    const response = await apiClient.post<NewsArticle>(`/cabinet/admin/news/${id}/publish`);
    return response.data;
  },

  toggleFeatured: async (id: number): Promise<NewsArticle> => {
    const response = await apiClient.post<NewsArticle>(`/cabinet/admin/news/${id}/feature`);
    return response.data;
  },

  uploadMedia: async (file: File, signal?: AbortSignal): Promise<NewsMediaUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<NewsMediaUploadResponse>(
      '/cabinet/admin/news/media/upload',
      formData,
      { signal },
    );
    return response.data;
  },

  deleteMedia: async (filename: string): Promise<void> => {
    await apiClient.delete(`/cabinet/admin/news/media/${encodeURIComponent(filename)}`);
  },

  // Categories
  getCategories: async (): Promise<NewsCategory[]> => {
    const response = await apiClient.get<NewsCategory[]>('/cabinet/admin/news/categories');
    return response.data;
  },

  createCategory: async (data: { name: string; color: string }): Promise<NewsCategory> => {
    const response = await apiClient.post<NewsCategory>('/cabinet/admin/news/categories', data);
    return response.data;
  },

  updateCategory: async (
    id: number,
    data: { name?: string; color?: string },
  ): Promise<NewsCategory> => {
    const response = await apiClient.put<NewsCategory>(
      `/cabinet/admin/news/categories/${id}`,
      data,
    );
    return response.data;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(`/cabinet/admin/news/categories/${id}`);
  },

  // Tags
  getTags: async (): Promise<NewsTag[]> => {
    const response = await apiClient.get<NewsTag[]>('/cabinet/admin/news/tags');
    return response.data;
  },

  createTag: async (data: { name: string; color: string }): Promise<NewsTag> => {
    const response = await apiClient.post<NewsTag>('/cabinet/admin/news/tags', data);
    return response.data;
  },

  updateTag: async (id: number, data: { name?: string; color?: string }): Promise<NewsTag> => {
    const response = await apiClient.put<NewsTag>(`/cabinet/admin/news/tags/${id}`, data);
    return response.data;
  },

  deleteTag: async (id: number): Promise<void> => {
    await apiClient.delete(`/cabinet/admin/news/tags/${id}`);
  },
};
