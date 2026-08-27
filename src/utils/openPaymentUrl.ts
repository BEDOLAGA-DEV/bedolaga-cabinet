/**
 * Open a payment-provider URL the right way for the current platform.
 *
 * In the Telegram in-app WebView, navigating the SAME container to the provider page
 * (window.location.href) breaks when that page hands off to a bank app via a custom scheme
 * — SBP/RollyPay/YooKassa do this. Android then shows a full-page net::ERR_UNKNOWN_URL_SCHEME
 * and iOS opens nothing ("приложение не определяется"), even though link generation succeeded
 * (Telegram bug #654272). Opening in the EXTERNAL browser (openLink) lets the OS hand off to
 * the bank app, and the provider's return_url brings the user back.
 *
 * On the web platform a real browser handles the hand-off inline, so same-tab navigation is
 * correct — and it isn't popup-blocked the way window.open() from an async callback would be.
 */
export function openPaymentUrl(
  url: string,
  platform: string,
  openLink: (url: string) => void,
): void {
  if (platform === 'telegram') {
    openLink(url);
  } else {
    window.location.href = url;
  }
}
