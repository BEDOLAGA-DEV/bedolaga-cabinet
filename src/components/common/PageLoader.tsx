interface PageLoaderProps {
  variant?: 'dark' | 'light';
}

export default function PageLoader({ variant = 'dark' }: PageLoaderProps) {
  const spinnerColor = variant === 'dark' ? 'border-accent-500' : 'border-accent-500';

  return (
    // data-page-loader: пока он на экране, заставка (src/intro/intro.js) не раскрывает приложение.
    <div className="min-h-viewport flex items-center justify-center" data-page-loader="">
      <div
        className={`h-10 w-10 border-[3px] ${spinnerColor} animate-spin rounded-full border-t-transparent`}
      />
    </div>
  );
}
