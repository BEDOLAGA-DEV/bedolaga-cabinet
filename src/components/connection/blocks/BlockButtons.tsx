import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, CopyIcon } from '@/components/icons';
import type { RemnawaveButtonClient, LocalizedText } from '@/types';
import { copyToClipboard } from '@/utils/clipboard';
import { blockButtonClass } from './buttonStyles';

// eslint-disable-next-line no-script-url
const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];

function isValidDeepLink(url: string | undefined): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase().trim();
  if (dangerousSchemes.some((s) => lowerUrl.startsWith(s))) return false;
  return lowerUrl.includes('://');
}

function isValidExternalUrl(url: string | undefined): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase().trim();
  if (dangerousSchemes.some((s) => lowerUrl.startsWith(s))) return false;
  return lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://');
}

interface BlockButtonsProps {
  buttons: RemnawaveButtonClient[] | undefined;
  variant: 'light' | 'subtle';
  isLight?: boolean;
  subscriptionUrl: string | null;
  hideLink?: boolean;
  deepLink?: string | null;
  getLocalizedText: (text: LocalizedText | undefined) => string;
  getBaseTranslation: (key: string, i18nKey: string) => string;
  getSvgHtml: (key: string | undefined) => string;
  onOpenDeepLink: (url: string) => void;
}

export function BlockButtons({
  buttons,
  variant,
  isLight,
  subscriptionUrl,
  hideLink,
  deepLink,
  getLocalizedText,
  getBaseTranslation,
  getSvgHtml,
  onOpenDeepLink,
}: BlockButtonsProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (url: string) => {
    await copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  if (!buttons || buttons.length === 0) return null;

  const baseClass = blockButtonClass(variant, isLight);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {buttons.map((btn, idx) => {
        const btnText = getLocalizedText(btn.text);
        const btnSvg = getSvgHtml(btn.svgIconKey);
        const btnIcon = btnSvg ? (
          <div
            className="h-4 w-4 [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: btnSvg }}
          />
        ) : null;

        if (btn.type === 'subscriptionLink') {
          const url = btn.resolvedUrl || btn.url || btn.link || deepLink || subscriptionUrl;
          if (!url || !isValidDeepLink(url)) return null;
          return (
            <button
              key={idx}
              onClick={() => onOpenDeepLink(url)}
              className={`flex items-center gap-2 ${baseClass}`}
            >
              {btnIcon}
              {btnText || getBaseTranslation('openApp', 'subscription.connection.openLink')}
            </button>
          );
        }

        if (btn.type === 'copyButton') {
          if (hideLink) return null;
          const url = btn.resolvedUrl || subscriptionUrl;
          if (!url) return null;
          return (
            <button
              key={idx}
              onClick={() => handleCopy(url)}
              className={`flex items-center gap-2 ${
                copied
                  ? `rounded-xl border border-success-500 bg-success-500/10 px-4 py-2 text-sm font-medium ${isLight ? 'text-success-600' : 'text-success-400'}`
                  : baseClass
              }`}
            >
              {copied ? <CheckIcon /> : btnIcon || <CopyIcon />}
              {copied
                ? t('subscription.connection.copied')
                : btnText || getBaseTranslation('copyLink', 'subscription.connection.copyLink')}
            </button>
          );
        }

        // external
        const href = btn.link || btn.url || '';
        if (!isValidExternalUrl(href)) return null;
        return (
          <a
            key={idx}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 ${baseClass}`}
          >
            {btnIcon}
            {btnText}
          </a>
        );
      })}
    </div>
  );
}
