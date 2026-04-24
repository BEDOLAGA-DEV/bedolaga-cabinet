import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import PlaceholderExtension from '@tiptap/extension-placeholder';
import TextAlignExtension from '@tiptap/extension-text-align';
import UnderlineExtension from '@tiptap/extension-underline';
import HighlightExtension from '@tiptap/extension-highlight';
import { VideoExtension } from '../lib/tiptap-video';
import { infoPagesApi } from '../api/infoPages';
import { newsApi } from '../api/news';
import { AdminBackButton } from '../components/admin';
import { Toggle } from '../components/admin/Toggle';
import { useHapticFeedback } from '../platform/hooks/useHaptic';
import { cn } from '../lib/utils';
import type { InfoPageType, FaqItem, ReplacesTab } from '../api/infoPages';

const AVAILABLE_LOCALES = ['ru', 'en', 'zh', 'fa'] as const;
type LocaleCode = (typeof AVAILABLE_LOCALES)[number];

// --- Icons ---
const BoldIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
  </svg>
);

const ItalicIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
  </svg>
);

const UnderlineIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" />
  </svg>
);

const StrikeIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" />
  </svg>
);

const H1Icon = () => <span className="text-xs font-bold">H1</span>;
const H2Icon = () => <span className="text-xs font-bold">H2</span>;
const H3Icon = () => <span className="text-xs font-bold">H3</span>;

const ListBulletIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" />
  </svg>
);

const ListOrderedIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" />
  </svg>
);

const QuoteIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
  </svg>
);

const CodeBlockIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
  </svg>
);

const ImageIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
    />
  </svg>
);

const LinkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
    />
  </svg>
);

const AlignLeftIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" />
  </svg>
);

const AlignCenterIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" />
  </svg>
);

const HighlightIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.56 3.44a1.5 1.5 0 012.12 0l1.88 1.88a1.5 1.5 0 010 2.12L8.44 19.56 3 21l1.44-5.44L16.56 3.44z" />
  </svg>
);

// --- Toolbar Button ---
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      className={cn(
        'min-h-[44px] min-w-[44px] rounded p-2.5 transition-colors',
        disabled && 'cursor-not-allowed opacity-50',
        isActive
          ? 'bg-accent-500/20 text-accent-400'
          : 'text-dark-400 hover:bg-dark-700 hover:text-dark-200',
      )}
    >
      {children}
    </button>
  );
}

// --- Security: URL scheme validation ---
function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// --- Slug utility ---
const TRANSLIT_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

function generateSlug(title: string): string {
  const lower = title.toLowerCase();
  const transliterated = Array.from(lower)
    .map((ch) => TRANSLIT_MAP[ch] ?? ch)
    .join('');
  return transliterated
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

// --- FAQ Q&A Item Icons ---
const ChevronUpIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const TrashSmallIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const PlusSmallIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

// --- FAQ Answer Rich Editor ---

const FAQ_EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: false,
    underline: false,
  }),
  UnderlineExtension,
  LinkExtension.configure({ openOnClick: false, HTMLAttributes: { class: 'link' } }),
  ImageExtension.configure({ HTMLAttributes: { class: 'rounded-xl max-w-full' } }),
  PlaceholderExtension.configure({ placeholder: '' }),
  TextAlignExtension.configure({ types: ['heading', 'paragraph'] }),
  HighlightExtension,
  VideoExtension,
];

function FaqAnswerEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const { t } = useTranslation();
  const haptic = useHapticFeedback();
  const mediaRef = useRef<HTMLInputElement>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const isUploading = uploadCount > 0;
  const [isDragging, setIsDragging] = useState(false);
  const activeUploadsRef = useRef(new Set<AbortController>());

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: FAQ_EDITOR_EXTENSIONS,
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[120px] p-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      const isEmpty = html === '<p></p>' || html === '';
      onChangeRef.current(isEmpty ? '' : html);
    },
  });

  // Sync external value changes (e.g., reorder, locale switch)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const currentHtml = editor.getHTML();
    const normalizedCurrent = currentHtml === '<p></p>' ? '' : currentHtml;
    if (normalizedCurrent !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  // Cleanup uploads on unmount
  useEffect(() => {
    const uploads = activeUploadsRef.current;
    return () => {
      for (const c of uploads) c.abort();
      uploads.clear();
    };
  }, []);

  const handleMediaUpload = useCallback(
    async (file: File) => {
      if (!editor) return;
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) return;
      const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        haptic.error();
        return;
      }
      const controller = new AbortController();
      activeUploadsRef.current.add(controller);
      setUploadCount((c) => c + 1);
      try {
        const result = await newsApi.uploadMedia(file, controller.signal);
        if (controller.signal.aborted) return;
        if (!isSafeUrl(result.url)) return;
        if (result.media_type === 'image') {
          editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
        } else {
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'video',
              attrs: { src: result.url, class: 'w-full rounded-xl max-h-96' },
            })
            .run();
        }
        haptic.success();
      } catch {
        if (!controller.signal.aborted) haptic.error();
      } finally {
        activeUploadsRef.current.delete(controller);
        setUploadCount((c) => c - 1);
      }
    },
    [editor, haptic],
  );

  const handleMediaUploadRef = useRef(handleMediaUpload);
  useEffect(() => {
    handleMediaUploadRef.current = handleMediaUpload;
  }, [handleMediaUpload]);

  // Register paste/drop handlers after editor is created
  useEffect(() => {
    if (!editor) return;
    const handlePaste = (_view: unknown, event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return false;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
          const file = item.getAsFile();
          if (file) {
            handleMediaUploadRef.current(file);
            return true;
          }
        }
      }
      return false;
    };
    const handleDrop = (_view: unknown, event: DragEvent) => {
      const file = event.dataTransfer?.files[0];
      if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
        event.preventDefault();
        handleMediaUploadRef.current(file);
        return true;
      }
      return false;
    };
    editor.setOptions({ editorProps: { ...editor.options.editorProps, handlePaste, handleDrop } });
  }, [editor]);

  const addLink = useCallback(() => {
    const url = window.prompt(t('news.admin.toolbar.linkUrlPrompt'));
    if (url && editor) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return;
      } catch {
        return;
      }
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor, t]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-dark-700 bg-dark-800/50">
      {/* Upload overlay */}
      {isUploading && (
        <div className="flex items-center justify-center gap-2 bg-dark-900/60 px-3 py-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
          <span className="text-xs text-dark-300">{t('news.admin.uploading')}</span>
        </div>
      )}
      {isDragging && !isUploading && (
        <div className="flex items-center justify-center border-b border-dashed border-accent-400 bg-accent-400/10 px-3 py-2">
          <span className="text-xs font-medium text-accent-400">{t('news.admin.dropMedia')}</span>
        </div>
      )}

      {/* Compact toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-dark-700 bg-dark-800 px-1.5 py-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title={t('news.admin.toolbar.bold')}
        >
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title={t('news.admin.toolbar.italic')}
        >
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title={t('news.admin.toolbar.underline')}
        >
          <UnderlineIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title={t('news.admin.toolbar.strikethrough')}
        >
          <StrikeIcon />
        </ToolbarButton>
        <div className="mx-0.5 h-4 w-px bg-dark-700" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title={t('news.admin.toolbar.heading2')}
        >
          <H2Icon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title={t('news.admin.toolbar.bulletList')}
        >
          <ListBulletIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title={t('news.admin.toolbar.orderedList')}
        >
          <ListOrderedIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title={t('news.admin.toolbar.blockquote')}
        >
          <QuoteIcon />
        </ToolbarButton>
        <div className="mx-0.5 h-4 w-px bg-dark-700" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title={t('news.admin.toolbar.highlight')}
        >
          <HighlightIcon />
        </ToolbarButton>
        <ToolbarButton onClick={addLink} title={t('news.admin.toolbar.link')}>
          <LinkIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => mediaRef.current?.click()}
          disabled={isUploading}
          title={t('news.admin.toolbar.image')}
        >
          {isUploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
          ) : (
            <ImageIcon />
          )}
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          setIsDragging(false);
          if (e.defaultPrevented) return;
          const file = e.dataTransfer.files[0];
          if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
            e.preventDefault();
            handleMediaUpload(file);
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Hidden file input */}
      <input
        ref={mediaRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleMediaUpload(file);
          e.target.value = '';
        }}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}

// --- FAQ Q&A Builder ---
interface FaqBuilderProps {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
  locale: string;
  localeLabel: string;
}

function FaqBuilder({ items, onChange, locale, localeLabel }: FaqBuilderProps) {
  const { t } = useTranslation();

  // Stable keys for React — travel with items through reorder/delete
  const keyCounter = useRef(0);
  const [itemKeys, setItemKeys] = useState<number[]>(() => items.map(() => keyCounter.current++));

  // Regenerate all keys on locale switch (items are semantically different)
  useEffect(() => {
    setItemKeys(items.map(() => keyCounter.current++));
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync key count when items added/removed within the same locale
  useEffect(() => {
    setItemKeys((prev) => {
      if (prev.length === items.length) return prev;
      if (items.length > prev.length) {
        const newKeys = [...prev];
        for (let i = prev.length; i < items.length; i++) {
          newKeys.push(keyCounter.current++);
        }
        return newKeys;
      }
      return prev.slice(0, items.length);
    });
  }, [items.length]);

  const handleQuestionChange = useCallback(
    (index: number, value: string) => {
      const updated = items.map((item, i) => (i === index ? { ...item, q: value } : item));
      onChange(updated);
    },
    [items, onChange],
  );

  const handleAnswerChange = useCallback(
    (index: number, value: string) => {
      const updated = items.map((item, i) => (i === index ? { ...item, a: value } : item));
      onChange(updated);
    },
    [items, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      setItemKeys((prev) => prev.filter((_, i) => i !== index));
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange],
  );

  const handleAdd = useCallback(() => {
    const newKey = keyCounter.current++;
    setItemKeys((prev) => [...prev, newKey]);
    onChange([...items, { q: '', a: '' }]);
  }, [items, onChange]);

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const updated = [...items];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      setItemKeys((prev) => {
        const k = [...prev];
        [k[index - 1], k[index]] = [k[index], k[index - 1]];
        return k;
      });
      onChange(updated);
    },
    [items, onChange],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= items.length - 1) return;
      const updated = [...items];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      setItemKeys((prev) => {
        const k = [...prev];
        [k[index], k[index + 1]] = [k[index + 1], k[index]];
        return k;
      });
      onChange(updated);
    },
    [items, onChange],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="label">
          {t('admin.infoPages.faq.questions')} ({localeLabel})
        </label>
        <span className="text-xs text-dark-500">
          {items.length} {t('admin.infoPages.faq.questionsCount')}
        </span>
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-dark-700 bg-dark-800/30 p-6 text-center text-sm text-dark-500">
          {t('admin.infoPages.faq.noQuestions')}
        </div>
      )}

      {items.map((item, index) => (
        <div
          key={itemKeys[index] ?? index}
          className="rounded-xl border border-dark-700 bg-dark-800/50 p-4 transition-all hover:border-dark-600"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-dark-400">
              {t('admin.infoPages.faq.questionNumber', { n: index + 1 })}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="min-h-[44px] min-w-[44px] rounded-lg p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 disabled:cursor-not-allowed disabled:opacity-30"
                title={t('admin.infoPages.faq.moveUp')}
              >
                <ChevronUpIcon />
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index >= items.length - 1}
                className="min-h-[44px] min-w-[44px] rounded-lg p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 disabled:cursor-not-allowed disabled:opacity-30"
                title={t('admin.infoPages.faq.moveDown')}
              >
                <ChevronDownIcon />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="min-h-[44px] min-w-[44px] rounded-lg p-2 text-dark-400 transition-colors hover:bg-error-500/10 hover:text-error-400"
                title={t('admin.infoPages.faq.removeQuestion')}
              >
                <TrashSmallIcon />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-dark-400">
                {t('admin.infoPages.faq.question')}
              </label>
              <input
                type="text"
                value={item.q}
                onChange={(e) => handleQuestionChange(index, e.target.value)}
                className="input text-sm"
                placeholder={t('admin.infoPages.faq.questionPlaceholder')}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-dark-400">
                {t('admin.infoPages.faq.answer')}
              </label>
              <FaqAnswerEditor
                value={item.a}
                onChange={(html) => handleAnswerChange(index, html)}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAdd}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-dark-600 bg-dark-800/30 py-3 text-sm font-medium text-dark-300 transition-colors hover:border-dark-500 hover:bg-dark-800/50 hover:text-dark-100"
      >
        <PlusSmallIcon />
        {t('admin.infoPages.faq.addQuestion')}
      </button>
    </div>
  );
}

export default function AdminInfoPageEditor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: rawId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const haptic = useHapticFeedback();
  const pageId = rawId != null ? Number(rawId) : undefined;
  const isEdit = pageId != null && !Number.isNaN(pageId);
  const initialPageType = (searchParams.get('type') === 'faq' ? 'faq' : 'page') as InfoPageType;

  // Form state
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [icon, setIcon] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [pageType, setPageType] = useState<InfoPageType>(initialPageType);
  const [replacesTab, setReplacesTab] = useState<ReplacesTab | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // FAQ Q&A state per locale
  const [faqItems, setFaqItems] = useState<Record<string, FaqItem[]>>({});

  // Multi-locale state
  const [activeLocale, setActiveLocale] = useState<LocaleCode>('ru');
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [contents, setContents] = useState<Record<string, string>>({});

  // Media upload state
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const isUploading = uploadCount > 0;
  const [isDragging, setIsDragging] = useState(false);
  const activeUploadsRef = useRef(new Set<AbortController>());

  const handleMediaUploadRef = useRef<(file: File) => void>(() => {});

  // TipTap editor
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'link' },
      }),
      ImageExtension.configure({
        HTMLAttributes: { class: 'rounded-xl max-w-full' },
      }),
      PlaceholderExtension.configure({
        placeholder: t('admin.infoPages.fields.content'),
      }),
      TextAlignExtension.configure({
        types: ['heading', 'paragraph'],
      }),
      HighlightExtension,
      VideoExtension,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const editor = useEditor({
    extensions,
    editorProps: {
      attributes: {
        class: 'prose max-w-none min-h-[300px] p-4 focus:outline-none',
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
            const file = item.getAsFile();
            if (file) {
              handleMediaUploadRef.current(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const file = event.dataTransfer?.files[0];
        if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
          event.preventDefault();
          handleMediaUploadRef.current(file);
          return true;
        }
        return false;
      },
    },
  });

  // --- Media upload handlers ---

  const handleMediaUpload = useCallback(
    async (file: File) => {
      if (!editor) return;

      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) return;

      const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        haptic.error();
        setSaveError(t('news.admin.fileTooLarge'));
        return;
      }

      const controller = new AbortController();
      activeUploadsRef.current.add(controller);
      setUploadCount((c) => c + 1);

      try {
        const result = await newsApi.uploadMedia(file, controller.signal);
        if (controller.signal.aborted) return;

        if (!isSafeUrl(result.url)) {
          haptic.error();
          setSaveError(t('news.admin.uploadError'));
          return;
        }

        if (result.media_type === 'image') {
          editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
        } else {
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'video',
              attrs: { src: result.url, class: 'w-full rounded-xl max-h-96' },
            })
            .run();
        }
        haptic.success();
      } catch {
        if (controller.signal.aborted) return;
        haptic.error();
        setSaveError(t('news.admin.uploadError'));
      } finally {
        activeUploadsRef.current.delete(controller);
        setUploadCount((c) => c - 1);
      }
    },
    [editor, haptic, t],
  );

  useEffect(() => {
    handleMediaUploadRef.current = handleMediaUpload;
  }, [handleMediaUpload]);

  useEffect(() => {
    const uploads = activeUploadsRef.current;
    return () => {
      for (const controller of uploads) {
        controller.abort();
      }
      uploads.clear();
    };
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleMediaUpload(file);
      e.target.value = '';
    },
    [handleMediaUpload],
  );

  const handleEditorDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleEditorDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleEditorDrop = useCallback(
    (e: React.DragEvent) => {
      setIsDragging(false);
      if (e.defaultPrevented) return;
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleMediaUpload(file);
    },
    [handleMediaUpload],
  );

  // Fetch all admin pages to detect tab conflicts
  const { data: allAdminPages } = useQuery({
    queryKey: ['admin', 'info-pages', 'list', 'all'],
    queryFn: () => infoPagesApi.getAdminPages(),
    staleTime: 30_000,
  });

  // Fetch page for editing
  const { data: pageData, isLoading: isLoadingPage } = useQuery({
    queryKey: ['admin', 'info-pages', 'page', pageId],
    queryFn: () => {
      if (pageId == null) throw new Error('Missing page id parameter');
      return infoPagesApi.getAdminPage(pageId);
    },
    enabled: isEdit,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Populate form when page data loads (once only -- not on locale switch)
  const editorPopulated = useRef(false);
  const formPopulated = useRef(false);
  useEffect(() => {
    if (!pageData || formPopulated.current) return;
    setSlug(pageData.slug);
    setSlugManuallyEdited(true);
    setIcon(pageData.icon ?? '');
    setIsActive(pageData.is_active);
    setSortOrder(pageData.sort_order);
    setPageType(pageData.page_type ?? 'page');
    setReplacesTab(pageData.replaces_tab ?? null);
    setTitles(pageData.title);

    if (pageData.page_type === 'faq') {
      // For FAQ pages, content stores Q&A arrays per locale
      const parsed: Record<string, FaqItem[]> = {};
      for (const [loc, val] of Object.entries(pageData.content)) {
        try {
          const arr = typeof val === 'string' ? JSON.parse(val) : val;
          parsed[loc] = Array.isArray(arr) ? arr : [];
        } catch {
          parsed[loc] = [];
        }
      }
      setFaqItems(parsed);
      setContents({});
    } else {
      setContents(pageData.content);
    }

    formPopulated.current = true;
  }, [pageData]);

  // Set editor content once when editor is ready
  useEffect(() => {
    if (!pageData || !editor || editorPopulated.current) return;
    const initialContent = pageData.content[activeLocale] ?? pageData.content['ru'] ?? '';
    editor.commands.setContent(initialContent);
    editorPopulated.current = true;
  }, [pageData, editor]); // activeLocale intentionally omitted

  // Auto-generate slug from Russian title
  useEffect(() => {
    if (!slugManuallyEdited && titles['ru']) {
      setSlug(generateSlug(titles['ru']));
    }
  }, [titles, slugManuallyEdited]);

  // --- Locale switching ---
  const switchLocale = useCallback(
    (newLocale: LocaleCode) => {
      if (!editor) return;
      // Save current editor content
      const currentHtml = editor.getHTML();
      const isEmpty = currentHtml === '<p></p>' || currentHtml === '';
      setContents((prev) => ({
        ...prev,
        [activeLocale]: isEmpty ? '' : currentHtml,
      }));
      // Load new locale content
      const newContent = contents[newLocale] ?? '';
      editor.commands.setContent(newContent);
      setActiveLocale(newLocale);
    },
    [editor, activeLocale, contents],
  );

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: {
      slug: string;
      title: Record<string, string>;
      content: Record<string, string>;
      page_type: InfoPageType;
      is_active: boolean;
      sort_order: number;
      icon: string | null;
      replaces_tab: ReplacesTab | null;
    }) => {
      if (isEdit && pageId != null) {
        return infoPagesApi.updatePage(pageId, data);
      }
      return infoPagesApi.createPage(data);
    },
    onSuccess: () => {
      haptic.success();
      queryClient.invalidateQueries({ queryKey: ['admin', 'info-pages'] });
      queryClient.invalidateQueries({ queryKey: ['info-pages'] });
      navigate('/admin/info-pages');
    },
    onError: (error: Error) => {
      haptic.error();
      setSaveError(error.message || t('admin.infoPages.saveError'));
    },
  });

  const handleSave = () => {
    setSaveError(null);
    if (!slug.trim()) return;

    let finalContents: Record<string, string>;

    if (pageType === 'faq') {
      // Serialize FAQ items as JSON strings per locale
      finalContents = {};
      for (const [loc, items] of Object.entries(faqItems)) {
        finalContents[loc] = JSON.stringify(items);
      }
    } else {
      // Capture current editor content for the active locale
      const currentHtml = editor?.getHTML() ?? '';
      const isEmpty = currentHtml === '<p></p>' || currentHtml === '';
      finalContents = {
        ...contents,
        [activeLocale]: isEmpty ? '' : currentHtml,
      };
    }

    const data = {
      slug: slug.trim(),
      title: titles,
      content: finalContents,
      page_type: pageType,
      is_active: isActive,
      sort_order: sortOrder,
      icon: icon.trim() || null,
      replaces_tab: replacesTab,
    };

    haptic.buttonPress();
    saveMutation.mutate(data);
  };

  // Toolbar actions
  const addLink = () => {
    const url = window.prompt(t('news.admin.toolbar.linkUrlPrompt'));
    if (url && editor) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return;
      } catch {
        return;
      }
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  if (isEdit && isLoadingPage) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-12 w-full rounded-xl" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AdminBackButton to="/admin/info-pages" />
          <h1 className="text-xl font-bold text-dark-100">
            {isEdit ? t('admin.infoPages.edit') : t('admin.infoPages.create')}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || !slug.trim()}
          className="min-h-[44px] rounded-lg bg-accent-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveMutation.isPending ? t('admin.infoPages.saving') : t('admin.infoPages.save')}
        </button>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Slug */}
        <div>
          <label className="label">{t('admin.infoPages.fields.slug')}</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManuallyEdited(true);
            }}
            className="input font-mono text-sm"
            required
          />
        </div>

        {/* Icon + Sort Order row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('admin.infoPages.fields.icon')}</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="input"
              placeholder="📄"
            />
          </div>
          <div>
            <label className="label">{t('admin.infoPages.fields.sortOrder')}</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              min={0}
              className="input max-w-xs"
            />
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <Toggle
            checked={isActive}
            onChange={() => setIsActive((v) => !v)}
            aria-label={t('admin.infoPages.fields.isActive')}
          />
          <span className="text-sm text-dark-300">{t('admin.infoPages.fields.isActive')}</span>
        </div>

        {/* Page type selector */}
        <div>
          <label className="label">{t('admin.infoPages.fields.pageType')}</label>
          <div className="flex gap-1">
            {(['page', 'faq'] as const).map((pt) => (
              <button
                key={pt}
                type="button"
                onClick={() => setPageType(pt)}
                className={cn(
                  'min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                  pageType === pt
                    ? pt === 'faq'
                      ? 'bg-warning-500 text-white'
                      : 'bg-accent-500 text-white'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-dark-100',
                )}
              >
                {t(`admin.infoPages.pageTypes.${pt}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Replaces tab selector */}
        <div>
          <label className="label">{t('admin.infoPages.fields.replacesTab')}</label>
          <select
            value={replacesTab ?? ''}
            onChange={(e) => setReplacesTab((e.target.value || null) as ReplacesTab | null)}
            className="input max-w-xs"
          >
            <option value="">{t('admin.infoPages.replacesTabNone')}</option>
            {(['faq', 'rules', 'privacy', 'offer'] as const).map((tab) => {
              const conflict = allAdminPages?.find(
                (p) => p.replaces_tab === tab && p.id !== pageId,
              );
              return (
                <option key={tab} value={tab}>
                  {t(`admin.infoPages.replacesTabOptions.${tab}`)}
                  {conflict ? ` (${t('admin.infoPages.replacesTabConflict')})` : ''}
                </option>
              );
            })}
          </select>
          {replacesTab &&
            allAdminPages?.some((p) => p.replaces_tab === replacesTab && p.id !== pageId) && (
              <p className="mt-1 text-xs text-warning-400">
                {t('admin.infoPages.replacesTabWarning')}
              </p>
            )}
        </div>

        {/* Locale tabs */}
        <div>
          <label className="label">{t('admin.infoPages.localeLabel')}</label>
          <div className="flex flex-wrap gap-1">
            {AVAILABLE_LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => switchLocale(loc)}
                className={cn(
                  'min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                  activeLocale === loc
                    ? 'bg-accent-500 text-white'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-dark-100',
                )}
              >
                {t(`admin.infoPages.locales.${loc}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Title for current locale */}
        <div>
          <label className="label">
            {t('admin.infoPages.fields.title')} ({t(`admin.infoPages.locales.${activeLocale}`)})
          </label>
          <input
            type="text"
            value={titles[activeLocale] ?? ''}
            onChange={(e) => setTitles((prev) => ({ ...prev, [activeLocale]: e.target.value }))}
            className="input"
          />
        </div>

        {/* Content: TipTap editor for pages, FAQ builder for FAQ */}
        {pageType === 'faq' ? (
          <FaqBuilder
            items={faqItems[activeLocale] ?? []}
            onChange={(items) => setFaqItems((prev) => ({ ...prev, [activeLocale]: items }))}
            locale={activeLocale}
            localeLabel={t(`admin.infoPages.locales.${activeLocale}`)}
          />
        ) : (
          <div>
            <label className="label">
              {t('admin.infoPages.fields.content')} ({t(`admin.infoPages.locales.${activeLocale}`)})
            </label>
            <div
              className="relative overflow-hidden rounded-xl border border-dark-700 bg-dark-800/50"
              onDragOver={handleEditorDragOver}
              onDragLeave={handleEditorDragLeave}
              onDrop={handleEditorDrop}
            >
              {/* Upload progress overlay */}
              {isUploading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-dark-900/60 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
                    <span className="text-sm font-medium text-dark-200">
                      {t('news.admin.uploading')}
                    </span>
                  </div>
                </div>
              )}

              {/* Drag overlay */}
              {isDragging && !isUploading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-accent-400 bg-accent-400/10">
                  <span className="text-sm font-semibold text-accent-400">
                    {t('news.admin.dropMedia')}
                  </span>
                </div>
              )}

              {/* Toolbar */}
              {editor && (
                <div className="flex flex-wrap items-center gap-0.5 border-b border-dark-700 bg-dark-800 p-2">
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title={t('news.admin.toolbar.bold')}
                  >
                    <BoldIcon />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title={t('news.admin.toolbar.italic')}
                  >
                    <ItalicIcon />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive('underline')}
                    title={t('news.admin.toolbar.underline')}
                  >
                    <UnderlineIcon />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    title={t('news.admin.toolbar.strikethrough')}
                  >
                    <StrikeIcon />
                  </ToolbarButton>

                  <div className="mx-1 h-5 w-px bg-dark-700" />

                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title={t('news.admin.toolbar.heading1')}
                  >
                    <H1Icon />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title={t('news.admin.toolbar.heading2')}
                  >
                    <H2Icon />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                    title={t('news.admin.toolbar.heading3')}
                  >
                    <H3Icon />
                  </ToolbarButton>

                  <div className="mx-1 h-5 w-px bg-dark-700" />

                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title={t('news.admin.toolbar.bulletList')}
                  >
                    <ListBulletIcon />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title={t('news.admin.toolbar.orderedList')}
                  >
                    <ListOrderedIcon />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title={t('news.admin.toolbar.blockquote')}
                  >
                    <QuoteIcon />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    title={t('news.admin.toolbar.codeBlock')}
                  >
                    <CodeBlockIcon />
                  </ToolbarButton>

                  <div className="mx-1 h-5 w-px bg-dark-700" />

                  <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    isActive={editor.isActive({ textAlign: 'left' })}
                    title={t('news.admin.toolbar.alignLeft')}
                  >
                    <AlignLeftIcon />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    isActive={editor.isActive({ textAlign: 'center' })}
                    title={t('news.admin.toolbar.alignCenter')}
                  >
                    <AlignCenterIcon />
                  </ToolbarButton>

                  <div className="mx-1 h-5 w-px bg-dark-700" />

                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    isActive={editor.isActive('highlight')}
                    title={t('news.admin.toolbar.highlight')}
                  >
                    <HighlightIcon />
                  </ToolbarButton>
                  <ToolbarButton onClick={addLink} title={t('news.admin.toolbar.link')}>
                    <LinkIcon />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => mediaInputRef.current?.click()}
                    disabled={isUploading}
                    title={t('news.admin.toolbar.image')}
                  >
                    {isUploading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
                    ) : (
                      <ImageIcon />
                    )}
                  </ToolbarButton>
                </div>
              )}

              {/* Editor content */}
              <EditorContent editor={editor} />
            </div>

            {/* Hidden file inputs */}
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              onChange={handleFileInputChange}
              className="hidden"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Error feedback */}
        {saveError && (
          <div className="rounded-lg border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm text-error-400">
            {saveError}
          </div>
        )}

        {/* Bottom save button */}
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || !slug.trim()}
          className="min-h-[44px] w-full rounded-lg bg-accent-500 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveMutation.isPending ? t('admin.infoPages.saving') : t('admin.infoPages.save')}
        </button>
      </div>
    </div>
  );
}
