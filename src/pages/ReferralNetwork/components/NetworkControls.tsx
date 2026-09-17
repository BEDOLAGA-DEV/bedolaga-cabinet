import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapseIcon, ExpandIcon, MinusIcon, PlusIcon } from '@/components/icons';
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
      icon: <PlusIcon className="h-4 w-4" />,
    },
    {
      label: t('admin.referralNetwork.controls.zoomOut'),
      onClick: handleZoomOut,
      icon: <MinusIcon className="h-4 w-4" />,
    },
    {
      label: t('admin.referralNetwork.controls.resetZoom'),
      onClick: handleResetZoom,
      icon: <CollapseIcon className="h-4 w-4" />,
    },
    {
      label: t('admin.referralNetwork.controls.fullscreen'),
      onClick: handleFullscreen,
      icon: isFullscreen ? (
        <CollapseIcon className="h-4 w-4" />
      ) : (
        <ExpandIcon className="h-4 w-4" />
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
