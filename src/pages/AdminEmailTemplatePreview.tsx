import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminEmailTemplatesApi } from '../api/adminEmailTemplates';
import { BackIcon } from '../components/admin';

interface PreviewState {
  subject: string;
  body_html: string;
}

export default function AdminEmailTemplatePreview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { type, lang } = useParams<{ type: string; lang: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [previewHtml, setPreviewHtml] = useState<string>('');

  // Get data from navigation state
  const state = location.state as PreviewState | null;

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: () => {
      if (!type || !lang || !state) {
        throw new Error('Missing required data');
      }
      return adminEmailTemplatesApi.previewTemplate(type, {
        language: lang,
        subject: state.subject,
        body_html: state.body_html,
      });
    },
    onSuccess: (data) => {
      setPreviewHtml(data.body_html);
    },
  });

  // Load preview on mount
  useEffect(() => {
    if (!type || !lang || !state) {
      navigate('/admin/email-templates');
      return;
    }
    previewMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, lang]);

  // Write preview HTML into iframe
  useEffect(() => {
    if (previewHtml && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [previewHtml]);

  if (!type || !lang || !state) {
    return null;
  }

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl border border-dark-700 bg-dark-800 p-2 transition-colors hover:bg-dark-700"
        >
          <BackIcon />
        </button>
        <div>
          <h1 className="text-xl font-bold text-dark-100">{t('admin.emailTemplates.preview')}</h1>
          <p className="text-sm text-dark-400">
            {type} / {lang.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-hidden rounded-xl border border-dark-700 bg-white">
        {previewMutation.isPending ? (
          <div className="flex h-full items-center justify-center bg-dark-800">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          </div>
        ) : previewMutation.isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-dark-800">
            <p className="text-dark-400">{t('common.error')}</p>
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
            >
              {t('common.back')}
            </button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            className="h-full w-full"
            sandbox="allow-same-origin"
            title="Email Preview"
          />
        )}
      </div>
    </div>
  );
}
