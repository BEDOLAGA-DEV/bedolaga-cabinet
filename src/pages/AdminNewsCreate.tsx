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
import { usePrompt } from '../store/promptDialog';
import { AdminBackButton } from '../components/admin';
import { ColoredItemCombobox } from '../components/admin/ColoredItemCombobox';
import { Toggle } from '../components/admin/Toggle';
import { useHapticFeedback } from '../platform/hooks/useHaptic';
import { cn } from '../lib/utils';
import type { NewsCategory, NewsTag, NewsCreateRequest } from '../types/news';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikeIcon,
  H1Icon,
  H2Icon,
  H3Icon,
  ListBulletIcon,
  ListOrderedIcon,
  QuoteIcon,
  CodeBlockIcon,
  ImageIcon,
  LinkIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  HighlightIcon,
  UploadIcon,
} from '@/components/icons';

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
  const promptDialog = usePrompt();
  const addLink = async () => {
    if (!editor) return;
    const url = await promptDialog({
      label: t('news.admin.toolbar.linkUrlPrompt'),
      inputType: 'url',
    });
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return;
    } catch {
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
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
          className="min-h-[44px] rounded-lg bg-accent-500 px-6 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveMutation.isPending ? t('news.admin.saving') : t('news.admin.save')}
        </button>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="news-title" className="label">
            {t('news.admin.titleLabel')}
          </label>
          <input
            id="news-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            required
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="news-slug" className="label">
            {t('news.admin.slugLabel')}
          </label>
          <input
            id="news-slug"
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
              ariaLabel={t('news.admin.categoryLabel')}
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
              ariaLabel={t('news.admin.tagLabel')}
            />
          </div>
        </div>

        {/* Read time */}
        <div>
          <label htmlFor="news-readtime" className="label">
            {t('news.admin.readTimeLabel')}
          </label>
          <input
            id="news-readtime"
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
          <label htmlFor="news-excerpt" className="label">
            {t('news.admin.excerptLabel')}
          </label>
          <textarea
            id="news-excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="input min-h-[80px] resize-y"
            rows={3}
          />
        </div>

        {/* Featured Image URL */}
        <div>
          <label htmlFor="news-image" className="label">
            {t('news.admin.imageLabel')}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="news-image"
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
                <UploadIcon className="h-4 w-4" />
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
                  <BoldIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  isActive={editor.isActive('italic')}
                  title={t('news.admin.toolbar.italic')}
                >
                  <ItalicIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  isActive={editor.isActive('underline')}
                  title={t('news.admin.toolbar.underline')}
                >
                  <UnderlineIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  isActive={editor.isActive('strike')}
                  title={t('news.admin.toolbar.strikethrough')}
                >
                  <StrikeIcon className="h-4 w-4" />
                </ToolbarButton>

                <div className="mx-1 h-5 w-px bg-dark-700" />

                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  isActive={editor.isActive('heading', { level: 1 })}
                  title={t('news.admin.toolbar.heading1')}
                >
                  <H1Icon className="h-4 w-4" />
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
                  <ListOrderedIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  isActive={editor.isActive('blockquote')}
                  title={t('news.admin.toolbar.blockquote')}
                >
                  <QuoteIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  isActive={editor.isActive('codeBlock')}
                  title={t('news.admin.toolbar.codeBlock')}
                >
                  <CodeBlockIcon className="h-4 w-4" />
                </ToolbarButton>

                <div className="mx-1 h-5 w-px bg-dark-700" />

                <ToolbarButton
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  isActive={editor.isActive({ textAlign: 'left' })}
                  title={t('news.admin.toolbar.alignLeft')}
                >
                  <AlignLeftIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  isActive={editor.isActive({ textAlign: 'center' })}
                  title={t('news.admin.toolbar.alignCenter')}
                >
                  <AlignCenterIcon className="h-4 w-4" />
                </ToolbarButton>

                <div className="mx-1 h-5 w-px bg-dark-700" />

                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleHighlight().run()}
                  isActive={editor.isActive('highlight')}
                  title={t('news.admin.toolbar.highlight')}
                >
                  <HighlightIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={addLink} title={t('news.admin.toolbar.link')}>
                  <LinkIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => mediaInputRef.current?.click()}
                  disabled={isUploading}
                  title={t('news.admin.toolbar.image')}
                >
                  {isUploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
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
          className="min-h-[44px] w-full rounded-lg bg-accent-500 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveMutation.isPending ? t('news.admin.saving') : t('news.admin.save')}
        </button>
      </div>
    </div>
  );
}
