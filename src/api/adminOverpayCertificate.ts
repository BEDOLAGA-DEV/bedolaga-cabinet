import apiClient from './client';

export const OVERPAY_CERT_MAX_SIZE = 1024 * 1024;

export interface OverpayCertificateStatus {
  uploaded: boolean;
  valid: boolean;
  path: string;
  subject: string | null;
  not_valid_after: string | null;
  has_chain: boolean | null;
  env_locked_path: boolean;
  env_locked_passphrase: boolean;
}

export interface OverpayCertificateUploadResponse {
  subject: string;
  not_valid_after: string;
  has_chain: boolean;
  path: string;
  env_locked_path: boolean;
  env_locked_passphrase: boolean;
  warning: string | null;
}

export const adminOverpayCertificateApi = {
  getStatus: async (): Promise<OverpayCertificateStatus> => {
    const response = await apiClient.get<OverpayCertificateStatus>(
      '/cabinet/admin/overpay/certificate',
    );
    return response.data;
  },

  upload: async (file: File, passphrase: string): Promise<OverpayCertificateUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('passphrase', passphrase);
    const response = await apiClient.post<OverpayCertificateUploadResponse>(
      '/cabinet/admin/overpay/certificate',
      formData,
    );
    return response.data;
  },

  remove: async (): Promise<void> => {
    await apiClient.delete('/cabinet/admin/overpay/certificate');
  },
};
