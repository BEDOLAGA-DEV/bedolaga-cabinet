interface PageLoaderProps {
  variant?: 'dark' | 'light';
}

export default function PageLoader({ variant = 'dark' }: PageLoaderProps) {
  const spinnerColor = variant === 'dark' ? 'border-accent-500' : 'border-blue-500';

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        className={`h-10 w-10 border-[3px] ${spinnerColor} animate-spin rounded-full border-t-transparent`}
      />
    </div>
  );
}
