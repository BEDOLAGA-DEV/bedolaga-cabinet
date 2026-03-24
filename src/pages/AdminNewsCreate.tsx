import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
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
import { newsApi } from '../api/news';
import { AdminBackButton } from '../components/admin';
import { ColoredItemCombobox } from '../components/admin/ColoredItemCombobox';
import { Toggle } from '../components/admin/Toggle';
import { useHapticFeedback } from '../platform/hooks/useHaptic';
import { cn } from '../lib/utils';
import type { NewsCategory, NewsTag, NewsCreateRequest } from '../types/news';

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

const UploadIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
    />
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
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s\-а-яёА-ЯЁ]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

export default function AdminNewsCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: rawId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const haptic = useHapticFeedback();
  const articleId = rawId != null ? Number(rawId) : undefined;
  const isEdit = articleId != null && !Number.isNaN(articleId);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | null>(null);
  const [selectedTag, setSelectedTag] = useState<NewsTag | null>(null);
  const [excerpt, setExcerpt] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [readTimeMinutes, setReadTimeMinutes] = useState(3);
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Media upload state
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const featuredImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const isUploading = uploadCount > 0;
  const [isDragging, setIsDragging] = useState(false);
  const [isFeaturedImageUploading, setIsFeaturedImageUploading] = useState(false);
  const activeUploadsRef = useRef(new Set<AbortController>());

  // Ref to hold the media upload handler — allows editorProps.handlePaste to
  // reference it without a circular dependency with useEditor.
  const handleMediaUploadRef = useRef<(file: File) => void>(() => {});

  // TipTap editor — extensions are memoized with NO deps so the editor is
  // never destroyed/recreated on re-renders. The PlaceholderExtension
  // placeholder reads the translation at mount time only, which is acceptable
  // since locale changes at runtime are rare and the editor retains content.
  // Using [t] as the dependency would destroy the editor on every locale change.
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
        placeholder: t('news.admin.contentLabel'),
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

  // Keep the ref in sync so editorProps handlers can access the latest callback
  useEffect(() => {
    handleMediaUploadRef.current = handleMediaUpload;
  }, [handleMediaUpload]);

  // Cancel all in-flight uploads on unmount to prevent state updates on destroyed editor
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

  const handleFeaturedImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';

      if (!file.type.startsWith('image/')) return;

      if (file.size > 10 * 1024 * 1024) {
        haptic.error();
        setSaveError(t('news.admin.fileTooLarge'));
        return;
      }

      const controller = new AbortController();
      activeUploadsRef.current.add(controller);
      setIsFeaturedImageUploading(true);

      try {
        const result = await newsApi.uploadMedia(file, controller.signal);
        if (controller.signal.aborted) return;
        setFeaturedImageUrl(result.url);
        haptic.success();
      } catch {
        if (controller.signal.aborted) return;
        haptic.error();
        setSaveError(t('news.admin.uploadError'));
      } finally {
        activeUploadsRef.current.delete(controller);
        setIsFeaturedImageUploading(false);
      }
    },
    [haptic, t],
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
      // TipTap's handleDrop already handled media files dropped on the editor content
      if (e.defaultPrevented) return;
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleMediaUpload(file);
    },
    [handleMediaUpload],
  );

  // Fetch categories and tags for combobox selectors
  const { data: categoriesData } = useQuery({
    queryKey: ['admin', 'news', 'categories'],
    queryFn: () => newsApi.getCategories(),
    staleTime: 60_000,
  });
  const { data: tagsData } = useQuery({
    queryKey: ['admin', 'news', 'tags'],
    queryFn: () => newsApi.getTags(),
    staleTime: 60_000,
  });

  const handleCreateCategory = useCallback(
    async (name: string, color: string) => {
      const cat = await newsApi.createCategory({ name, color });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'news', 'categories'] });
      return cat;
    },
    [queryClient],
  );

  const handleCreateTag = useCallback(
    async (name: string, color: string) => {
      const tag = await newsApi.createTag({ name, color });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'news', 'tags'] });
      return tag;
    },
    [queryClient],
  );

  const handleDeleteCategory = useCallback(
    async (item: { id: number }) => {
      await newsApi.deleteCategory(item.id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'news', 'categories'] });
    },
    [queryClient],
  );

  const handleDeleteTag = useCallback(
    async (item: { id: number }) => {
      await newsApi.deleteTag(item.id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'news', 'tags'] });
    },
    [queryClient],
  );

  // Fetch article for editing
  const { data: articleData, isLoading: isLoadingArticle } = useQuery({
    queryKey: ['admin', 'news', 'article', articleId],
    queryFn: () => {
      if (articleId == null) throw new Error('Missing article id parameter');
      return newsApi.getAdminArticle(articleId);
    },
    enabled: isEdit,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Populate form when article data loads — guard prevents re-populating on editor re-init
  const editorPopulated = useRef(false);
  useEffect(() => {
    if (!articleData) return;
    setTitle(articleData.title);
    setSlug(articleData.slug);
    setSlugManuallyEdited(true);
    // Reconstruct category/tag objects from article data
    if (articleData.category) {
      setSelectedCategory({
        id: articleData.category_id ?? 0,
        name: articleData.category,
        color: articleData.category_color,
      });
    }
    if (articleData.tag) {
      const matchedTag = tagsData?.find((t) => t.id === articleData.tag_id);
      setSelectedTag({
        id: articleData.tag_id ?? 0,
        name: articleData.tag,
        color: matchedTag?.color ?? '#94a3b8',
      });
    }
    setExcerpt(articleData.excerpt ?? '');
    setFeaturedImageUrl(articleData.featured_image_url ?? '');
    setReadTimeMinutes(articleData.read_time_minutes);
    setIsPublished(articleData.is_published);
    setIsFeatured(articleData.is_featured);
    if (editor && articleData.content && !editorPopulated.current) {
      editor.commands.setContent(articleData.content);
      editorPopulated.current = true;
    }
  }, [articleData, editor, tagsData]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: NewsCreateRequest) => {
      if (isEdit && articleId != null) {
        return newsApi.updateArticle(articleId, data);
      }
      return newsApi.createArticle(data);
    },
    onSuccess: () => {
      haptic.success();
      queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
      queryClient.invalidateQueries({ queryKey: ['news'] });
      navigate('/admin/news');
    },
    onError: (error: Error) => {
      haptic.error();
      setSaveError(error.message || t('news.admin.saveError'));
    },
  });

  const handleSave = () => {
    setSaveError(null);
    if (!title.trim() || !slug.trim() || !selectedCategory) return;

    const content = editor?.getHTML() ?? '';
    const data: NewsCreateRequest = {
      title: title.trim(),
      slug: slug.trim(),
      content,
      excerpt: excerpt.trim() || null,
      category: selectedCategory.name,
      category_color: selectedCategory.color,
      category_id: selectedCategory.id !== 0 ? selectedCategory.id : null,
      tag: selectedTag?.name ?? null,
      tag_id: selectedTag?.id != null && selectedTag.id !== 0 ? selectedTag.id : null,
      featured_image_url: isSafeUrl(featuredImageUrl.trim()) ? featuredImageUrl.trim() : null,
      is_published: isPublished,
      is_featured: isFeatured,
      read_time_minutes: readTimeMinutes,
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

  if (isEdit && isLoadingArticle) {
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
          <AdminBackButton to="/admin/news" />
          <h1 className="text-xl font-bold text-dark-100">
            {isEdit ? t('news.admin.edit') : t('news.admin.create')}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || !title.trim() || !slug.trim() || !selectedCategory}
          className="min-h-[44px] rounded-lg bg-accent-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveMutation.isPending ? t('news.admin.saving') : t('news.admin.save')}
        </button>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Title */}
        <div>
          <label className="label">{t('news.admin.titleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            required
          />
        </div>

        {/* Slug */}
        <div>
          <label className="label">{t('news.admin.slugLabel')}</label>
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

        {/* Category + Tag row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('news.admin.categoryLabel')}</label>
            <ColoredItemCombobox
              items={categoriesData ?? []}
              value={selectedCategory}
              onChange={setSelectedCategory}
              onCreateNew={handleCreateCategory}
              onDelete={handleDeleteCategory}
              placeholder={t('news.admin.combobox.selectCategory')}
            />
          </div>
          <div>
            <label className="label">{t('news.admin.tagLabel')}</label>
            <ColoredItemCombobox
              items={tagsData ?? []}
              value={selectedTag}
              onChange={setSelectedTag}
              onCreateNew={handleCreateTag}
              onDelete={handleDeleteTag}
              placeholder={t('news.admin.combobox.selectTag')}
            />
          </div>
        </div>

        {/* Read time */}
        <div>
          <label className="label">{t('news.admin.readTimeLabel')}</label>
          <input
            type="number"
            value={readTimeMinutes}
            onChange={(e) => setReadTimeMinutes(Number(e.target.value) || 1)}
            min={1}
            max={60}
            className="input max-w-xs"
          />
        </div>

        {/* Excerpt */}
        <div>
          <label className="label">{t('news.admin.excerptLabel')}</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="input min-h-[80px] resize-y"
            rows={3}
          />
        </div>

        {/* Featured Image URL */}
        <div>
          <label className="label">{t('news.admin.imageLabel')}</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={featuredImageUrl}
              onChange={(e) => setFeaturedImageUrl(e.target.value)}
              className="input flex-1"
              placeholder="https://..."
            />
            <button
              type="button"
              onClick={() => featuredImageInputRef.current?.click()}
              disabled={isFeaturedImageUploading}
              className="flex min-h-[44px] items-center gap-2 rounded-lg bg-dark-700 px-4 py-2.5 text-sm font-medium text-dark-200 transition-colors hover:bg-dark-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t('news.admin.uploadFeaturedImage')}
            >
              {isFeaturedImageUploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
              ) : (
                <UploadIcon />
              )}
              <span className="hidden sm:inline">{t('news.admin.uploadFeaturedImage')}</span>
            </button>
          </div>
          <input
            ref={featuredImageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFeaturedImageUpload}
            className="hidden"
            aria-hidden="true"
          />
          {isSafeUrl(featuredImageUrl) && (
            <div className="mt-2 overflow-hidden rounded-xl">
              <img
                src={featuredImageUrl}
                alt=""
                className="h-auto max-h-48 w-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* Toggles row */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Toggle
              checked={isPublished}
              onChange={() => setIsPublished((v) => !v)}
              aria-label={t('news.admin.published')}
            />
            <span className="text-sm text-dark-300">{t('news.admin.published')}</span>
          </div>
          <div className="flex items-center gap-3">
            <Toggle
              checked={isFeatured}
              onChange={() => setIsFeatured((v) => !v)}
              aria-label={t('news.admin.featured')}
            />
            <span className="text-sm text-dark-300">{t('news.admin.featured')}</span>
          </div>
        </div>

        {/* Content editor */}
        <div>
          <label className="label">{t('news.admin.contentLabel')}</label>
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

        {/* Error feedback */}
        {saveError && (
          <div className="rounded-lg border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm text-error-400">
            {saveError}
          </div>
        )}

        {/* Bottom save button for long forms */}
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || !title.trim() || !slug.trim() || !selectedCategory}
          className="min-h-[44px] w-full rounded-lg bg-accent-500 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveMutation.isPending ? t('news.admin.saving') : t('news.admin.save')}
        </button>
      </div>
    </div>
  );
}
