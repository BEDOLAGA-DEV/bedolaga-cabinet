import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getSigmaInstance } from '../sigmaGlobals';

interface NetworkControlsProps {
  className?: string;
}

export function NetworkControls({ className }: NetworkControlsProps) {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen state when user exits via Escape key or browser UI
  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [handleFullscreenChange]);

  function handleZoomIn() {
    const sigma = getSigmaInstance();
    if (!sigma) return;
    const camera = sigma.getCamera();
    camera.animate({ ratio: camera.ratio / 1.5 }, { duration: 200 });
  }

  function handleZoomOut() {
    const sigma = getSigmaInstance();
    if (!sigma) return;
    const camera = sigma.getCamera();
    camera.animate({ ratio: camera.ratio * 1.5 }, { duration: 200 });
  }

  function handleResetZoom() {
    const sigma = getSigmaInstance();
    if (!sigma) return;
    const camera = sigma.getCamera();
    camera.animate({ x: 0.5, y: 0.5, ratio: 1 }, { duration: 400 });
  }

  function handleFullscreen() {
    const container = document.getElementById('referral-network-container');
    if (!container) return;

    if (!document.fullscreenElement) {
      container
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  }

  const buttons = [
    {
      label: t('admin.referralNetwork.controls.zoomIn'),
      onClick: handleZoomIn,
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      label: t('admin.referralNetwork.controls.zoomOut'),
      onClick: handleZoomOut,
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
        </svg>
      ),
    },
    {
      label: t('admin.referralNetwork.controls.resetZoom'),
      onClick: handleResetZoom,
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
          />
        </svg>
      ),
    },
    {
      label: t('admin.referralNetwork.controls.fullscreen'),
      onClick: handleFullscreen,
      icon: isFullscreen ? (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
          />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
          />
        </svg>
      ),
    },
  ];

  return (
    <div
      className={`flex gap-1 rounded-xl border border-dark-700/50 bg-dark-900/80 p-1.5 backdrop-blur-md ${className ?? ''}`}
    >
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={btn.onClick}
          title={btn.label}
          aria-label={btn.label}
          className="rounded-lg p-1.5 text-dark-400 transition-colors hover:bg-dark-800 hover:text-dark-200"
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
