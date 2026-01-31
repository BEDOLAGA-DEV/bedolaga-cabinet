import { useEffect, useRef, useCallback } from 'react';
import { usePlatform } from '@/platform/hooks/usePlatform';
import type { MainButtonConfig } from '@/platform/types';

interface UseMainButtonOptions extends Omit<MainButtonConfig, 'onClick'> {
  /**
   * Whether the main button should be visible
   * @default true
   */
  visible?: boolean;
}

/**
 * Hook to manage the Telegram MainButton
 * Automatically shows/hides based on component lifecycle
 *
 * @param onClick - Callback when main button is pressed
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function SubmitForm() {
 *   const mutation = useMutation(...);
 *
 *   useMainButton(handleSubmit, {
 *     text: t('actions.submit'),
 *     isLoading: mutation.isPending,
 *     isActive: isFormValid,
 *   });
 * }
 * ```
 */
export function useMainButton(
  onClick: (() => void) | null | undefined,
  options: UseMainButtonOptions = { text: '' },
): void {
  const { mainButton, capabilities } = usePlatform();
  const { visible = true, text, isLoading, isActive, color, textColor } = options;

  // Use ref to prevent callback recreation issues
  const callbackRef = useRef(onClick);
  callbackRef.current = onClick;

  // Stable callback wrapper
  const handleClick = useCallback(() => {
    callbackRef.current?.();
  }, []);

  useEffect(() => {
    // If no native main button support, do nothing
    // UI components will render their own submit buttons
    if (!capabilities.hasMainButton) {
      return;
    }

    // If callback is null/undefined or visible is false, hide button
    if (!onClick || !visible || !text) {
      mainButton.hide();
      return;
    }

    // Show the main button with configuration
    mainButton.show({
      text,
      onClick: handleClick,
      isLoading,
      isActive,
      color,
      textColor,
    });

    // Cleanup: hide button when component unmounts
    return () => {
      mainButton.hide();
    };
  }, [
    mainButton,
    capabilities.hasMainButton,
    handleClick,
    onClick,
    visible,
    text,
    isLoading,
    isActive,
    color,
    textColor,
  ]);
}

/**
 * Hook for simple main button usage
 * Shows button only when conditions are met
 *
 * @param text - Button text
 * @param onClick - Click handler
 * @param enabled - Whether button should be shown and active
 * @param loading - Whether to show loading state
 */
export function useSimpleMainButton(
  text: string,
  onClick: () => void,
  enabled: boolean = true,
  loading: boolean = false,
): void {
  useMainButton(enabled ? onClick : null, {
    text,
    isLoading: loading,
    isActive: enabled && !loading,
    visible: enabled,
  });
}
