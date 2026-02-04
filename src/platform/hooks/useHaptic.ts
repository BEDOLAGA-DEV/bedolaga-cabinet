import { useCallback } from 'react';
import { usePlatform } from '@/platform/hooks/usePlatform';
import type { HapticImpactStyle, HapticNotificationType } from '@/platform/types';

interface HapticMethods {
  /**
   * Trigger impact feedback (for button presses, collisions)
   */
  impact: (style?: HapticImpactStyle) => void;

  /**
   * Trigger notification feedback (for success/warning/error events)
   */
  notification: (type: HapticNotificationType) => void;

  /**
   * Trigger selection feedback (for selection changes)
   */
  selection: () => void;

  /**
   * Whether haptic feedback is available
   */
  isAvailable: boolean;
}

/**
 * Hook to access haptic feedback
 * Works in Telegram Mini Apps and falls back to Web Vibration API
 *
 * @example
 * ```tsx
 * function MyButton() {
 *   const haptic = useHaptic();
 *
 *   const handleClick = () => {
 *     haptic.impact('medium');
 *     doSomething();
 *   };
 * }
 * ```
 */
export function useHaptic(): HapticMethods {
  const { haptic, capabilities } = usePlatform();

  const impact = useCallback(
    (style: HapticImpactStyle = 'medium') => {
      haptic.impact(style);
    },
    [haptic],
  );

  const notification = useCallback(
    (type: HapticNotificationType) => {
      haptic.notification(type);
    },
    [haptic],
  );

  const selection = useCallback(() => {
    haptic.selection();
  }, [haptic]);

  return {
    impact,
    notification,
    selection,
    isAvailable: capabilities.hasHapticFeedback,
  };
}

/**
 * Hook that returns a click handler with haptic feedback
 * Useful for buttons that need haptic on press
 *
 * @param onClick - Original click handler
 * @param style - Haptic impact style
 *
 * @example
 * ```tsx
 * function MyButton({ onClick }) {
 *   const handleClick = useHapticClick(onClick, 'light');
 *   return <button onClick={handleClick}>Press me</button>;
 * }
 * ```
 */
export function useHapticClick(
  onClick: (() => void) | undefined,
  style: HapticImpactStyle = 'light',
): (() => void) | undefined {
  const haptic = useHaptic();

  return useCallback(() => {
    haptic.impact(style);
    onClick?.();
  }, [haptic, onClick, style]);
}

/**
 * Returns individual haptic trigger functions
 * Useful when you need specific feedback types
 */
export function useHapticFeedback() {
  const haptic = useHaptic();

  return {
    // Common actions
    buttonPress: useCallback(() => haptic.impact('light'), [haptic]),
    buttonPressHeavy: useCallback(() => haptic.impact('medium'), [haptic]),
    toggle: useCallback(() => haptic.impact('rigid'), [haptic]),

    // Notifications
    success: useCallback(() => haptic.notification('success'), [haptic]),
    warning: useCallback(() => haptic.notification('warning'), [haptic]),
    error: useCallback(() => haptic.notification('error'), [haptic]),

    // Selection
    selectionChanged: useCallback(() => haptic.selection(), [haptic]),

    // Raw access
    impact: haptic.impact,
    notification: haptic.notification,
    selection: haptic.selection,
  };
}
