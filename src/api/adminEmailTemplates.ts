import apiClient from './client';

export interface EmailTemplateLanguageStatus {
  has_custom: boolean;
}

export interface EmailTemplateType {
  type: string;
  label: Record<string, string>;
  description: Record<string, string>;
  context_vars: string[];
  languages: Record<string, EmailTemplateLanguageStatus>;
}

export interface EmailTemplateListResponse {
  items: EmailTemplateType[];
  available_languages: string[];
}

export interface EmailTemplateLanguageData {
  subject: string;
  body_html: string;
  is_default: boolean;
  default_subject: string;
  default_body_html: string;
}

export interface EmailTemplateDetail {
  notification_type: string;
  label: Record<string, string>;
  description: Record<string, string>;
  context_vars: string[];
  languages: Record<string, EmailTemplateLanguageData>;
}

export interface EmailTemplateUpdateRequest {
  subject: string;
  body_html: string;
}

export interface EmailTemplatePreviewRequest {
  language: string;
  subject?: string;
  body_html?: string;
}

export interface EmailTemplatePreviewResponse {
  subject: string;
  body_html: string;
}

export interface EmailTemplateSendTestRequest {
  language: string;
  email?: string;
}

export const adminEmailTemplatesApi = {
  getTemplateTypes: async (): Promise<EmailTemplateListResponse> => {
    const response = await apiClient.get<EmailTemplateListResponse>(
      '/cabinet/admin/email-templates',
    );
    return response.data;
  },

  getTemplate: async (notificationType: string): Promise<EmailTemplateDetail> => {
    const response = await apiClient.get<EmailTemplateDetail>(
      `/cabinet/admin/email-templates/${notificationType}`,
    );
    return response.data;
  },

  updateTemplate: async (
    notificationType: string,
    language: string,
    data: EmailTemplateUpdateRequest,
  ): Promise<void> => {
    await apiClient.put(`/cabinet/admin/email-templates/${notificationType}/${language}`, data);
  },

  deleteTemplate: async (notificationType: string, language: string): Promise<void> => {
    await apiClient.delete(`/cabinet/admin/email-templates/${notificationType}/${language}`);
  },

  previewTemplate: async (
    notificationType: string,
    data: EmailTemplatePreviewRequest,
  ): Promise<EmailTemplatePreviewResponse> => {
    const response = await apiClient.post<EmailTemplatePreviewResponse>(
      `/cabinet/admin/email-templates/${notificationType}/preview`,
      data,
    );
    return response.data;
  },

  sendTestEmail: async (
    notificationType: string,
    data: EmailTemplateSendTestRequest,
  ): Promise<{ sent_to: string }> => {
    const response = await apiClient.post<{ status: string; sent_to: string }>(
      `/cabinet/admin/email-templates/${notificationType}/test`,
      data,
    );
    return response.data;
  },
};
