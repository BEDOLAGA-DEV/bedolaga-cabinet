import { DotLottieReact } from '@lottiefiles/dotlottie-react'

interface PageLoaderProps {
  variant?: 'dark' | 'light'
}

export default function PageLoader({ variant = 'dark' }: PageLoaderProps) {
  const bgClass = variant === 'dark' ? 'bg-dark-950' : 'bg-gray-50'

  return (
    <div className={`min-h-screen flex items-center justify-center ${bgClass}`}>
      <div className="w-48 max-w-full">
        <DotLottieReact
          src="https://lottie.host/14b9dc34-cdaf-408c-87ea-291c1b01e343/r2rZZVuahg.lottie"
          loop
          autoplay
        />
      </div>
    </div>
  )
}
