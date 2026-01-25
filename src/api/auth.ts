import apiClient from './client'
import type { AuthResponse, RegisterResponse, TokenResponse, User } from '../types'

export const authApi = {
  // Telegram WebApp authentication
  loginTelegram: async (initData: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/telegram', {
      init_data: initData,
    })
    return response.data
  },

  // Telegram Login Widget authentication
  loginTelegramWidget: async (data: {
    id: number
    first_name: string
    last_name?: string
    username?: string
    photo_url?: string
    auth_date: number
    hash: string
  }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/telegram/widget', data)
    return response.data
  },

  // Email login
  loginEmail: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/email/login', {
      email,
      password,
    })
    return response.data
  },

  // Register email (link to existing Telegram account)
  registerEmail: async (email: string, password: string): Promise<{ message: string; email: string }> => {
    const response = await apiClient.post('/cabinet/auth/email/register', {
      email,
      password,
    })
    return response.data
  },

  // Register standalone email account (no Telegram required)
  // Returns message - user must verify email before login
  registerEmailStandalone: async (data: {
    email: string
    password: string
    first_name?: string
    language?: string
    referral_code?: string
  }): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>('/cabinet/auth/email/register/standalone', data)
    return response.data
  },

  // Verify email and get auth tokens
  verifyEmail: async (token: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/email/verify', { token })
    return response.data
  },

  // Resend verification email
  resendVerification: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/cabinet/auth/email/resend')
    return response.data
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/cabinet/auth/refresh', {
      refresh_token: refreshToken,
    })
    return response.data
  },

  // Logout
  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/cabinet/auth/logout', {
      refresh_token: refreshToken,
    })
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/cabinet/auth/password/forgot', { email })
    return response.data
  },

  // Reset password
  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/cabinet/auth/password/reset', {
      token,
      password,
    })
    return response.data
  },

  // Get current user
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/cabinet/auth/me')
    return response.data
  },
}
