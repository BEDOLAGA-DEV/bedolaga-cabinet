import { useTranslation } from 'react-i18next';
import { usePlatform } from '@/platform';
import { InfoIcon } from '@/components/icons';
import { Button } from '@/components/primitives';
import { useBlockingStore } from '../../store/blocking';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import BlockingShell from './BlockingShell';

/**
 * Full-screen block shown when the backend returns
 * `403 {detail: {code: "account_deleted", ...}}`.
 *
 * Triggered for two situations:
 *   * Token-bearing requests where the user row was flipped to DELETED
 *     by the inactivity-cleanup job out-of-band.
 *   * Email/password login of a previously-DELETED account where we
 *     have no Telegram signature to auto-revive on the server side.
 *
 * Recovery: pressing /start in the bot triggers the existing revival
 * flow (handlers/start.py), which flips status back to ACTIVE. The
 * "Retry" button reloads the SPA so the next request observes the new
 * status and clears the block.
 */
export default function AccountDeletedScreen() {
  const { t } = useTranslation();
  const { openTelegramLink } = usePlatform();
  const info = useBlockingStore((state) => state.accountDeletedInfo);
  const screenRef = useFocusTrap<HTMLDivElement>(true, { lockScroll: false });

  const deepLink = info?.telegram_deep_link?.trim() || null;
  // Route through the platform adapter, not raw window.open. Inside the
  // Telegram WebView, window.open is intercepted by the client and the
  // new-tab fallback is blocked on most platforms (Android, iOS). The
  // TelegramAdapter dispatches to the WebApp SDK's openTelegramLink in
  // Telegram and falls back to window.open in the standalone web build.
  const handleOpenBot = () => {
    if (deepLink) {
      openTelegramLink(deepLink);
    }
  };

  const handleRetry = () => {
    // Reload rather than just clearing the store: we want a fresh
    // network round-trip against the (hopefully now-revived) row.
    useBlockingStore.getState().clearBlocking();
    window.location.reload();
  };

  return (
    <BlockingShell
      screenRef={screenRef}
      titleId="account-deleted-title"
      accent="warning"
      icon={<InfoIcon className="h-9 w-9" />}
      title={t('blocking.accountDeleted.title')}
      description={t('blocking.accountDeleted.description')}
      footer={t('blocking.accountDeleted.hint')}
      actions={
        <>
          {deepLink && (
            <Button variant="primary" size="lg" fullWidth onClick={handleOpenBot}>
              {t('blocking.accountDeleted.openBot')}
            </Button>
          )}
          <Button variant="secondary" size="lg" fullWidth onClick={handleRetry}>
            {t('blocking.accountDeleted.retry')}
          </Button>
        </>
      }
    />
  );
}
