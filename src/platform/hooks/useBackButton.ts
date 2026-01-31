import { useEffect, useRef, useCallback } from 'react';
import { usePlatform } from '@/platform/hooks/usePlatform';

interface UseBackButtonOptions {
  /**
   * Whether the back button should be visible
   * @default true
   */
  visible?: boolean;
}

/**
 * Hook to manage the Telegram BackButton
 * Automatically shows/hides based on component lifecycle
 *
 * @param onBack - Callback when back button is pressed
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const navigate = useNavigate();
 *   useBackButton(() => navigate(-1));
 *   // ...
 * }
 * ```
 */
export function useBackButton(
  onBack: (() => void) | null | undefined,
  options: UseBackButtonOptions = {},
): void {
  const { backButton, capabilities } = usePlatform();
  const { visible = true } = options;

  // Use ref to prevent callback recreation issues
  const callbackRef = useRef(onBack);
  callbackRef.current = onBack;

  // Stable callback wrapper
  const handleBack = useCallback(() => {
    callbackRef.current?.();
  }, []);

  useEffect(() => {
    // If no native back button support, do nothing
    if (!capabilities.hasBackButton) {
      return;
    }

    // If callback is null/undefined or visible is false, hide button
    if (!onBack || !visible) {
      backButton.hide();
      return;
    }

    // Show the back button with our handler
    backButton.show(handleBack);

    // Cleanup: hide button when component unmounts
    return () => {
      backButton.hide();
    };
  }, [backButton, capabilities.hasBackButton, handleBack, onBack, visible]);
}

/**
 * Hook to conditionally show back button based on navigation depth
 * Useful for showing back button only when there's history to go back to
 *
 * @param canGoBack - Whether navigation back is possible
 * @param onBack - Callback when back button is pressed
 */
export function useConditionalBackButton(canGoBack: boolean, onBack: () => void): void {
  useBackButton(canGoBack ? onBack : null);
}
