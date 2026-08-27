interface PageLoaderProps {
  variant?: 'dark' | 'light';
}

export default function PageLoader({ variant = 'dark' }: PageLoaderProps) {
  const spinnerColor = variant === 'dark' ? 'border-accent-500' : 'border-accent-500';

  return (
    <div className="min-h-viewport flex items-center justify-center">
      <div
        className={`h-10 w-10 border-[3px] ${spinnerColor} animate-spin rounded-full border-t-transparent`}
      />
    </div>
  );
}
