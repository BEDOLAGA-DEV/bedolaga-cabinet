import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { adminUsersApi } from '@/api/adminUsers';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useNotify } from '@/platform/hooks/useNotify';

interface SendMessageDialogProps {
  userId: number;
  open: boolean;
  onClose: () => void;
}

const MAX_LENGTH = 4096;
const KNOWN_ERRORS = ['no_telegram_id', 'forbidden', 'bad_request'];

/** «Написать» из шапки карточки: бот отправляет текст человеку в Telegram. */
export function SendMessageDialog({ userId, open, onClose }: SendMessageDialogProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const dialogRef = useFocusTrap<HTMLDivElement>(open, { onEscape: () => !sending && onClose() });

  if (!open) return null;

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await adminUsersApi.sendMessage(userId, trimmed);
      notify.success(t('admin.users.sendMessage.success'), t('common.success'));
      setText('');
      onClose();
    } catch (err) {
      const detail = (
        err as { response?: { data?: { detail?: { code?: string; message?: string } | string } } }
      )?.response?.data?.detail;
      const code = typeof detail === 'object' ? detail?.code : undefined;
      const message =
        code && KNOWN_ERRORS.includes(code)
          ? t(`admin.users.sendMessage.errors.${code}`)
          : (typeof detail === 'object' ? detail?.message : detail) ||
            t('admin.users.userActions.error');
      notify.error(message, t('common.error'));
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t('common.close')}
        className="fixed inset-0 bg-dark-950/60"
        onClick={() => !sending && onClose()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-message-title"
        className="relative w-full max-w-md rounded-2xl border border-dark-700 bg-dark-800 p-5"
      >
        <h2 id="send-message-title" className="mb-3 text-lg font-semibold text-dark-100">
          {t('admin.users.sendMessage.title')}
        </h2>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={MAX_LENGTH}
          rows={5}
          autoFocus
          placeholder={t('admin.users.sendMessage.placeholder')}
          className="input resize-y"
        />
        <div className="mt-1 text-right text-xs text-dark-500">
          {text.length}/{MAX_LENGTH}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={sending} className="btn-secondary">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending || !text.trim()}
            className="btn-primary"
          >
            {sending ? t('admin.users.sendMessage.sending') : t('admin.users.sendMessage.send')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
