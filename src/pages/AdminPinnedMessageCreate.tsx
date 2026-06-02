import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminPinnedMessagesApi,
  PinnedMessageCreateRequest,
  PinnedMessageUpdateRequest,
} from '../api/adminPinnedMessages';
import { AdminBackButton, Toggle } from '../components/admin';
import { PinIcon, XIcon, RefreshIcon, PhotoIcon, VideoIcon, SaveIcon } from '@/components/icons';

export default function AdminPinnedMessageCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(id);
  const messageId = id ? parseInt(id, 10) : null;

  // Form state
  const [content, setContent] = useState('');
  const [sendBeforeMenu, setSendBeforeMenu] = useState(true);
  const [sendOnEveryStart, setSendOnEveryStart] = useState(true);
  const [broadcastOnCreate, setBroadcastOnCreate] = useState(false);

  // Media state
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [existingMediaType, setExistingMediaType] = useState<'photo' | 'video' | null>(null);
  const mediaPreviewRef = useRef<string | null>(null);

  // Revoke blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (mediaPreviewRef.current) URL.revokeObjectURL(mediaPreviewRef.current);
    };
  }, []);

  // Load existing message for editing
  const { data: existingMessage, isLoading: isLoadingMessage } = useQuery({
    queryKey: ['admin', 'pinned-messages', 'detail', messageId],
    queryFn: () => adminPinnedMessagesApi.get(messageId!),
    enabled: isEditing && messageId !== null,
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (existingMessage) {
      setContent(existingMessage.content || '');
      setSendBeforeMenu(existingMessage.send_before_menu);
      setSendOnEveryStart(existingMessage.send_on_every_start);
      if (existingMessage.media_file_id && existingMessage.media_type) {
        setUploadedFileId(existingMessage.media_file_id);
        setExistingMediaType(existingMessage.media_type);
        setMediaType(existingMessage.media_type);
      }
    }
  }, [existingMessage]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: PinnedMessageCreateRequest) => adminPinnedMessagesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pinned-messages'] });
      navigate('/admin/pinned-messages');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: PinnedMessageUpdateRequest) =>
      adminPinnedMessagesApi.update(messageId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pinned-messages'] });
      navigate('/admin/pinned-messages');
    },
  });

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    setExistingMediaType(null);

    let detectedType: 'photo' | 'video' = 'photo';
    if (file.type.startsWith('image/')) {
      detectedType = 'photo';
      if (mediaPreviewRef.current) URL.revokeObjectURL(mediaPreviewRef.current);
      const url = URL.createObjectURL(file);
      mediaPreviewRef.current = url;
      setMediaPreview(url);
    } else if (file.type.startsWith('video/')) {
      detectedType = 'video';
      setMediaPreview(null);
    }
    setMediaType(detectedType);

    setIsUploading(true);
    try {
      const result = await adminPinnedMessagesApi.uploadMedia(file, detectedType);
      setUploadedFileId(result.file_id);
    } catch {
      setMediaFile(null);
      setMediaPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove media
  const handleRemoveMedia = () => {
    if (mediaPreviewRef.current) {
      URL.revokeObjectURL(mediaPreviewRef.current);
      mediaPreviewRef.current = null;
    }
    setMediaFile(null);
    setMediaPreview(null);
    setUploadedFileId(null);
    setExistingMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate
  const isValid = content.trim().length > 0 || uploadedFileId !== null;

  // Submit
  const handleSubmit = () => {
    if (!isValid) return;

    if (isEditing && messageId !== null) {
      const data: PinnedMessageUpdateRequest = {
        content,
        send_before_menu: sendBeforeMenu,
        send_on_every_start: sendOnEveryStart,
      };
      if (uploadedFileId) {
        data.media = { type: mediaType, file_id: uploadedFileId };
      }
      updateMutation.mutate(data);
    } else {
      const data: PinnedMessageCreateRequest = {
        content,
        send_before_menu: sendBeforeMenu,
        send_on_every_start: sendOnEveryStart,
        broadcast: broadcastOnCreate,
      };
      if (uploadedFileId) {
        data.media = { type: mediaType, file_id: uploadedFileId };
      }
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isLoadingMessage) {
    return (
      <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-8 text-center text-dark-400">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton to="/admin/pinned-messages" />
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-error-500/20 p-2 text-error-400">
            <PinIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-100">
              {isEditing ? t('admin.pinnedMessages.editMessage') : t('admin.pinnedMessages.create')}
            </h1>
            <p className="text-sm text-dark-400">{t('admin.pinnedMessages.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="card space-y-6">
        {/* Message text */}
        <div>
          <label htmlFor="pm-content" className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.pinnedMessages.content')}
          </label>
          <textarea
            id="pm-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('admin.pinnedMessages.contentPlaceholder')}
            rows={6}
            maxLength={4000}
            className="input min-h-[150px] resize-y"
          />
          <div className="mt-1 text-right text-xs text-dark-400">{content.length}/4000</div>
        </div>

        {/* Media upload */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.pinnedMessages.media')}
          </label>
          {mediaFile || existingMediaType ? (
            <div className="rounded-lg border border-dark-700 bg-dark-800 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(mediaType === 'photo' || existingMediaType === 'photo') && <PhotoIcon />}
                  {(mediaType === 'video' || existingMediaType === 'video') && <VideoIcon />}
                  <div>
                    <p className="text-sm text-dark-100">
                      {mediaFile
                        ? mediaFile.name
                        : `${existingMediaType} (${t('admin.pinnedMessages.media')})`}
                    </p>
                    {mediaFile && (
                      <p className="text-xs text-dark-400">
                        {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleRemoveMedia}
                  className="rounded-lg p-2 text-dark-400 hover:bg-dark-700 hover:text-error-400"
                  disabled={isUploading}
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
              {mediaPreview && (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="mt-3 max-h-48 rounded-lg object-cover"
                />
              )}
              {isUploading && (
                <div className="mt-2 flex items-center gap-2 text-sm text-accent-400">
                  <RefreshIcon />
                  {t('admin.pinnedMessages.uploading')}
                </div>
              )}
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-dark-600 bg-dark-800/50 p-6 text-dark-400 transition-colors hover:border-dark-500 hover:bg-dark-800 hover:text-dark-300"
              >
                <PhotoIcon />
                <span>{t('admin.pinnedMessages.addMedia')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-dark-100">
          {t('admin.pinnedMessages.settings')}
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-dark-200">
              {t('admin.pinnedMessages.sendBeforeMenu')}
            </p>
          </div>
          <Toggle checked={sendBeforeMenu} onChange={() => setSendBeforeMenu((p) => !p)} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-dark-200">
              {t('admin.pinnedMessages.sendOnEveryStart')}
            </p>
          </div>
          <Toggle checked={sendOnEveryStart} onChange={() => setSendOnEveryStart((p) => !p)} />
        </div>

        {!isEditing && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-200">
                {t('admin.pinnedMessages.broadcastOnCreate')}
              </p>
            </div>
            <Toggle checked={broadcastOnCreate} onChange={() => setBroadcastOnCreate((p) => !p)} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="card flex items-center justify-between">
        <button onClick={() => navigate('/admin/pinned-messages')} className="btn-secondary">
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || isPending || isUploading}
          className="btn-primary flex items-center gap-2"
        >
          {isPending ? <RefreshIcon /> : <SaveIcon />}
          {isEditing ? t('common.save') : t('admin.pinnedMessages.create')}
        </button>
      </div>
    </div>
  );
}
