/**
 * AbuseNoticeCard — предупреждение о нарушении на главной.
 *
 * Показывает ровно то сообщение, которое клиенту уже отправили в Telegram и на
 * почту: ни скоринга, ни признаков, ни истории. Человек, которому объяснили
 * причину, чаще исправляется сам, а тот, кому показали перечень сработавших
 * проверок, просто обходит их.
 *
 * Карточка временная. Она исчезает, когда предупреждение перестаёт быть
 * актуальным на стороне антифрода, и её можно убрать вручную — тогда до
 * следующего предупреждения главная остаётся чистой.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { abuseApi } from '@/api/abuse';
import { ShieldIcon } from '@/components/icons';

const DISMISSED_KEY = 'abuse-notice-dismissed';

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    // Приватный режим и заблокированное хранилище: просто покажем карточку.
    return null;
  }
}

export default function AbuseNoticeCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [dismissedAt, setDismissedAt] = useState<string | null>(() => readDismissed());

  const { data } = useQuery({
    queryKey: ['abuse-status'],
    queryFn: abuseApi.myStatus,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const notice = data?.warned ? data.notice : null;
  if (!notice?.body) return null;
  // Скрытие привязано к конкретному предупреждению: новое покажется снова.
  if (dismissedAt && dismissedAt === (notice.sent_at ?? '')) return null;

  const dismiss = () => {
    const mark = notice.sent_at ?? '';
    setDismissedAt(mark);
    try {
      localStorage.setItem(DISMISSED_KEY, mark);
    } catch {
      // Не сохранилось — карточка вернётся после перезагрузки, это не страшно.
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={
        className ??
        'relative overflow-hidden rounded-2xl border border-warning-500/30 bg-warning-500/10 p-5'
      }
    >
      <div className="flex items-start gap-4">
        <span className="mt-0.5 shrink-0 text-warning-400">
          <ShieldIcon />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-dark-100">
              {notice.subject || t('abuse.notice.title')}
            </h3>
            {notice.sent_at && (
              <span className="text-xs text-dark-400">
                {new Date(notice.sent_at).toLocaleDateString()}
              </span>
            )}
          </div>

          <p className="whitespace-pre-line text-sm leading-relaxed text-dark-200">{notice.body}</p>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/support"
              className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-on-accent"
            >
              {t('abuse.notice.contactSupport')}
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-dark-700 px-4 py-2 text-sm font-medium text-dark-300"
            >
              {t('abuse.notice.dismiss')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
