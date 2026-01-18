import apiClient from './client'
import type { AuthResponse, TokenResponse, User } from '../types'

export const authApi = {
	// Telegram WebApp authentication
	loginTelegram: async (initData: string): Promise<AuthResponse> => {
		const response = await apiClient.post<AuthResponse>(
			'/cabinet/auth/telegram',
			{
				init_data: initData,
			},
		)
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
		const response = await apiClient.post<AuthResponse>(
			'/cabinet/auth/telegram/widget',
			data,
		)
		return response.data
	},

	// Email login
	loginEmail: async (
		email: string,
		password: string,
	): Promise<AuthResponse> => {
		const response = await apiClient.post<AuthResponse>(
			'/cabinet/auth/email/login',
			{
				email,
				password,
			},
		)
		return response.data
	},

	// Complete registration (Email/Password)
	register: async (data: {
		email: string
		password: string
		first_name?: string
		last_name?: string
	}): Promise<{ message: string }> => {
		const response = await apiClient.post('/cabinet/auth/register', data)
		return response.data
	},

	// Register email (link to existing Telegram account)
	registerEmail: async (
		email: string,
		password: string,
	): Promise<{ message: string; email: string }> => {
		const response = await apiClient.post('/cabinet/auth/email/register', {
			email,
			password,
		})
		return response.data
	},

	// Verify email
	verifyEmail: async (token: string): Promise<{ message: string }> => {
		const response = await apiClient.post('/cabinet/auth/email/verify', {
			token,
		})
		return response.data
	},

	// Resend verification email
	resendVerification: async (email: string): Promise<{ message: string }> => {
		const response = await apiClient.post('/cabinet/auth/email/resend', {
			email,
		})
		return response.data
	},

	// Refresh token
	refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
		const response = await apiClient.post<TokenResponse>(
			'/cabinet/auth/refresh',
			{
				refresh_token: refreshToken,
			},
		)
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
		const response = await apiClient.post('/cabinet/auth/password/forgot', {
			email,
		})
		return response.data
	},

	// Reset password
	resetPassword: async (
		token: string,
		password: string,
	): Promise<{ message: string }> => {
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
