import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { brandingApi, type BrandingInfo } from '../api/branding'
import { authApi } from '../api/auth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import TelegramLoginButton from '../components/TelegramLoginButton'

const BRANDING_CACHE_KEY = 'cabinet-branding-cache'
const BRANDING_CACHE_TTL = 1000 * 60 * 60 // 1 hour

const getCachedBranding = (): BrandingInfo | undefined => {
	if (typeof window === 'undefined') {
		return undefined
	}
	try {
		const raw = localStorage.getItem(BRANDING_CACHE_KEY)
		if (!raw) return undefined
		const parsed = JSON.parse(raw) as {
			data?: BrandingInfo
			timestamp?: number
		}
		if (!parsed?.data || !parsed.timestamp) return undefined
		if (Date.now() - parsed.timestamp > BRANDING_CACHE_TTL) {
			localStorage.removeItem(BRANDING_CACHE_KEY)
			return undefined
		}
		return parsed.data
	} catch {
		return undefined
	}
}

const cacheBranding = (data: BrandingInfo) => {
	if (typeof window === 'undefined') {
		return
	}
	try {
		localStorage.setItem(
			BRANDING_CACHE_KEY,
			JSON.stringify({ data, timestamp: Date.now() }),
		)
	} catch {
		// Ignore storage errors (e.g., private mode)
	}
}

export default function Login() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { isAuthenticated, loginWithTelegram, loginWithEmail } = useAuthStore()
	const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

	// Login form state
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')

	// Register form state
	const [regEmail, setRegEmail] = useState('')
	const [regPassword, setRegPassword] = useState('')
	const [regFirstName, setRegFirstName] = useState('')
	const [regLastName, setRegLastName] = useState('')

	const [error, setError] = useState('')
	const [successMsg, setSuccessMsg] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)

	// Fetch branding
	const cachedBranding = useMemo(() => getCachedBranding(), [])

	const { data: branding } = useQuery<BrandingInfo>({
		queryKey: ['branding'],
		queryFn: brandingApi.getBranding,
		staleTime: 60000,
		placeholderData: cachedBranding,
	})

	useEffect(() => {
		if (branding) {
			cacheBranding(branding)
		}
	}, [branding])

	const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || ''
	const appName = branding
		? branding.name
		: import.meta.env.VITE_APP_NAME || 'VPN'
	const appLogo = branding?.logo_letter || import.meta.env.VITE_APP_LOGO || 'V'
	const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null

	// Set document title
	useEffect(() => {
		document.title = appName || 'VPN'
	}, [appName])

	useEffect(() => {
		if (isAuthenticated) {
			navigate('/')
		}
	}, [isAuthenticated, navigate])

	// Try Telegram WebApp authentication on mount
	useEffect(() => {
		const tryTelegramAuth = async () => {
			const tg = window.Telegram?.WebApp
			if (tg?.initData) {
				setIsTelegramWebApp(true)
				tg.ready()
				tg.expand()
				setIsLoading(true)
				try {
					await loginWithTelegram(tg.initData)
					navigate('/')
				} catch (err) {
					console.error('Telegram auth failed:', err)
					setError(t('auth.telegramRequired'))
				} finally {
					setIsLoading(false)
				}
			}
		}

		tryTelegramAuth()
	}, [loginWithTelegram, navigate, t])

	const handleEmailLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setSuccessMsg('')
		setIsLoading(true)

		try {
			await loginWithEmail(email, password)
			navigate('/')
		} catch (err: unknown) {
			console.error('Login error:', err)
			const error = err as {
				response?: { data?: { detail?: string | unknown } }
			}
			const detail = error.response?.data?.detail
			if (typeof detail === 'string') {
				setError(detail)
			} else if (Array.isArray(detail)) {
				setError(t('common.error'))
			} else {
				setError(t('common.error'))
			}
		} finally {
			setIsLoading(false)
		}
	}

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setSuccessMsg('')
		setIsLoading(true)

		try {
			await authApi.register({
				email: regEmail,
				password: regPassword,
				first_name: regFirstName || undefined,
				last_name: regLastName || undefined,
			})
			setSuccessMsg(
				'Регистрация успешна. Пожалуйста, перейдите по ссылке в письме для подтверждения почты',
			)
			// Clear form
			setRegEmail('')
			setRegPassword('')
			setRegFirstName('')
			setRegLastName('')
		} catch (err: unknown) {
			console.error('Registration error:', err)
			const errorObj = err as {
				response?: { status?: number; data?: { detail?: string | unknown } }
			}
			const status = errorObj.response?.status
			const detail = errorObj.response?.data?.detail

			if (status === 400 && detail === 'REGISTER_EMAIL_ALREADY_EXISTS') {
				setError('Этот Email уже зарегистрирован')
			} else if (typeof detail === 'string') {
				setError(detail)
			} else {
				setError(t('common.error'))
			}
		} finally {
			setIsLoading(false)
		}
	}

	// Switch tab handler
	const switchTab = (tab: 'login' | 'register') => {
		if (activeTab !== tab) {
			setActiveTab(tab)
			setError('')
			setSuccessMsg('')
		}
	}

	return (
		<div className='min-h-screen flex items-center justify-center py-8 px-4 sm:py-12 sm:px-6 lg:px-8'>
			{/* Background gradient */}
			<div className='fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950' />
			<div className='fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-500/10 via-transparent to-transparent' />

			{/* Language switcher */}
			<div className='fixed top-4 right-4 z-50'>
				<LanguageSwitcher />
			</div>

			<div className='relative max-w-md w-full space-y-8'>
				{/* Logo */}
				<div className='text-center'>
					<div className='mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center mb-6 shadow-lg shadow-accent-500/30 overflow-hidden'>
						{branding?.has_custom_logo && logoUrl ? (
							<img
								src={logoUrl}
								alt={appName || 'Logo'}
								className='w-full h-full object-cover'
							/>
						) : (
							<span className='text-white font-bold text-2xl'>{appLogo}</span>
						)}
					</div>
					{appName && (
						<h1 className='text-3xl font-bold text-dark-50'>{appName}</h1>
					)}
					<p className='mt-2 text-dark-400'>{t('auth.loginSubtitle')}</p>
				</div>

				{/* Card */}
				<div className='card'>
					{/* Tabs */}
					<div className='flex mb-6'>
						<button
							className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${
								activeTab === 'login'
									? 'border-accent-500 text-accent-400'
									: 'border-transparent text-dark-500 hover:text-dark-300'
							}`}
							onClick={() => switchTab('login')}
						>
							{t('auth.login')}
						</button>
						<button
							className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${
								activeTab === 'register'
									? 'border-accent-500 text-accent-400'
									: 'border-transparent text-dark-500 hover:text-dark-300'
							}`}
							onClick={() => switchTab('register')}
						>
							{t('auth.register')}
						</button>
					</div>

					{error && (
						<div className='bg-error-500/10 border border-error-500/30 text-error-400 px-4 py-3 rounded-xl text-sm mb-6'>
							{error}
						</div>
					)}

					{successMsg && (
						<div className='bg-success-500/10 border border-success-500/30 text-success-400 px-4 py-3 rounded-xl text-sm mb-6'>
							{successMsg}
						</div>
					)}

					{/* Telegram Login Button (Always visible) */}
					<div className='mb-6'>
						{isLoading && isTelegramWebApp ? (
							<div className='text-center py-2'>
								<div className='w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-2' />
								<p className='text-sm text-dark-400'>
									{t('auth.authenticating')}
								</p>
							</div>
						) : (
							<TelegramLoginButton botUsername={botUsername} />
						)}
					</div>

					<div className='flex items-center gap-4 mb-6'>
						<div className='h-px bg-dark-700 flex-1' />
						<span className='text-dark-400 text-sm'>{t('common.or')}</span>
						<div className='h-px bg-dark-700 flex-1' />
					</div>

					{activeTab === 'login' ? (
						<form className='space-y-5' onSubmit={handleEmailLogin}>
							<div>
								<label htmlFor='email' className='label'>
									{t('auth.email')}
								</label>
								<input
									id='email'
									name='email'
									type='email'
									autoComplete='email'
									required
									className='input'
									placeholder='you@example.com'
									value={email}
									onChange={e => setEmail(e.target.value)}
								/>
							</div>

							<div>
								<label htmlFor='password' className='label'>
									{t('auth.password')}
								</label>
								<input
									id='password'
									name='password'
									type='password'
									autoComplete='current-password'
									required
									className='input'
									placeholder='••••••••'
									value={password}
									onChange={e => setPassword(e.target.value)}
								/>
							</div>

							<button
								type='submit'
								disabled={isLoading}
								className='btn-primary w-full py-3'
							>
								{isLoading ? (
									<span className='flex items-center justify-center gap-2'>
										<span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
										{t('common.loading')}
									</span>
								) : (
									t('auth.login')
								)}
							</button>
						</form>
					) : (
						<form className='space-y-5' onSubmit={handleRegister}>
							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label htmlFor='reg-firstName' className='label'>
										Имя
									</label>
									<input
										id='reg-firstName'
										name='firstName'
										type='text'
										className='input'
										placeholder='Иван'
										value={regFirstName}
										onChange={e => setRegFirstName(e.target.value)}
									/>
								</div>
								<div>
									<label htmlFor='reg-lastName' className='label'>
										Фамилия
									</label>
									<input
										id='reg-lastName'
										name='lastName'
										type='text'
										className='input'
										placeholder='Иванов'
										value={regLastName}
										onChange={e => setRegLastName(e.target.value)}
									/>
								</div>
							</div>

							<div>
								<label htmlFor='reg-email' className='label'>
									{t('auth.email')}
								</label>
								<input
									id='reg-email'
									name='email'
									type='email'
									autoComplete='email'
									required
									className='input'
									placeholder='you@example.com'
									value={regEmail}
									onChange={e => setRegEmail(e.target.value)}
								/>
							</div>

							<div>
								<label htmlFor='reg-password' className='label'>
									{t('auth.password')}
								</label>
								<input
									id='reg-password'
									name='password'
									type='password'
									autoComplete='new-password'
									required
									className='input'
									placeholder='••••••••'
									value={regPassword}
									onChange={e => setRegPassword(e.target.value)}
								/>
							</div>

							<button
								type='submit'
								disabled={isLoading}
								className='btn-primary w-full py-3'
							>
								{isLoading ? (
									<span className='flex items-center justify-center gap-2'>
										<span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
										{t('common.loading')}
									</span>
								) : (
									t('auth.register')
								)}
							</button>
						</form>
					)}
				</div>
			</div>
		</div>
	)
}
