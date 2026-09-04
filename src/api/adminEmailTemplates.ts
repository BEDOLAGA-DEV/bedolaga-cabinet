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
  /** Отправка писем этого типа включена (выключатель в редакторе). */
  enabled?: boolean;
  /** false — письмо нельзя отключить (без него не войти / не получить купленное). */
  can_disable?: boolean;
}

export interface EmailTemplateListResponse {
  items: EmailTemplateType[];
  available_languages: string[];
  /** Placeholders available in every template regardless of type */
  common_context_vars: string[];
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
  /** Placeholders available in every template regardless of type */
  common_context_vars?: string[];
  /** Обязательные плейсхолдеры: без них редактор не сохранит шаблон. */
  required_vars?: string[];
  enabled?: boolean;
  can_disable?: boolean;
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
  /** Current editor content — when set, the test sends it instead of the saved template */
  subject?: string;
  body_html?: string;
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

  // Включить/выключить отправку писем этого типа
  setEnabled: async (
    notificationType: string,
    enabled: boolean,
  ): Promise<{ status: string; enabled: boolean }> => {
    const response = await apiClient.patch<{ status: string; enabled: boolean }>(
      `/cabinet/admin/email-templates/${notificationType}/enabled`,
      { enabled },
    );
    return response.data;
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
