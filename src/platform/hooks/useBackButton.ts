interface UseBackButtonOptions {
  /**
   * Whether the back button should be visible
   * @default true
   */
  visible?: boolean;
}

/**
 * Hook to manage the Telegram BackButton
 *
 * NOTE: This hook is now a no-op for backward compatibility.
 * The Telegram Navigator (@telegram-apps/react-router-integration) handles
 * BackButton visibility and navigation automatically based on router history.
 *
 * The navigator:
 * - Shows BackButton when there's navigation history
 * - Hides BackButton on root page
 * - Handles back button clicks automatically
 *
 * @param onBack - (Ignored) Callback when back button is pressed
 * @param options - (Ignored) Configuration options
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const navigate = useNavigate();
 *   useBackButton(() => navigate('/admin')); // No-op: navigator handles this
 *   // ...
 * }
 * ```
 */
export function useBackButton(
  _onBack: (() => void) | null | undefined,
  _options: UseBackButtonOptions = {},
): void {
  // No-op: Navigator handles BackButton automatically
  return;
}

/**
 * Hook to conditionally show back button based on navigation depth
 *
 * NOTE: This hook is now a no-op for backward compatibility.
 * The navigator handles conditional visibility automatically.
 *
 * @param canGoBack - (Ignored) Whether navigation back is possible
 * @param onBack - (Ignored) Callback when back button is pressed
 */
export function useConditionalBackButton(_canGoBack: boolean, _onBack: () => void): void {
  // No-op: Navigator handles BackButton automatically
  return;
}
