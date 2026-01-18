import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  promoOffersApi,
  PromoOfferTemplate,
  PromoOfferTemplateUpdateRequest,
  PromoOfferLog,
  TARGET_SEGMENTS,
  TargetSegment,
  OFFER_TYPE_CONFIG,
  OfferType,
} from '../api/promoOffers'

// Icons
const BackIcon = () => (
  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
)

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

// Helper functions
const formatDateTime = (date: string | null): string => {
  if (!date) return '-'
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    created: 'Создано',
    claimed: 'Активировано',
    consumed: 'Использовано',
    disabled: 'Деактивировано',
  }
  return labels[action] || action
}

const getActionColor = (action: string): string => {
  const colors: Record<string, string> = {
    created: 'bg-blue-500/20 text-blue-400',
    claimed: 'bg-emerald-500/20 text-emerald-400',
    consumed: 'bg-purple-500/20 text-purple-400',
    disabled: 'bg-dark-600 text-dark-400',
  }
  return colors[action] || 'bg-dark-600 text-dark-400'
}

const getOfferTypeIcon = (offerType: string): string => {
  return OFFER_TYPE_CONFIG[offerType as OfferType]?.icon || '🎁'
}

const getOfferTypeLabel = (offerType: string): string => {
  return OFFER_TYPE_CONFIG[offerType as OfferType]?.label || offerType
}

// Template Edit Modal
interface TemplateEditModalProps {
  template: PromoOfferTemplate
  onSave: (data: PromoOfferTemplateUpdateRequest) => void
  onClose: () => void
  isLoading?: boolean
}

function TemplateEditModal({ template, onSave, onClose, isLoading }: TemplateEditModalProps) {
  const [name, setName] = useState(template.name)
  const [messageText, setMessageText] = useState(template.message_text)
  const [buttonText, setButtonText] = useState(template.button_text)
  const [validHours, setValidHours] = useState(template.valid_hours)
  const [discountPercent, setDiscountPercent] = useState(template.discount_percent)
  const [activeDiscountHours, setActiveDiscountHours] = useState(template.active_discount_hours || 0)
  const [testDurationHours, setTestDurationHours] = useState(template.test_duration_hours || 0)
  const [isActive, setIsActive] = useState(template.is_active)

  const isTestAccess = template.offer_type === 'test_access'

  const handleSubmit = () => {
    const data: PromoOfferTemplateUpdateRequest = {
      name,
      message_text: messageText,
      button_text: buttonText,
      valid_hours: validHours,
      discount_percent: discountPercent,
      is_active: isActive,
    }
    if (isTestAccess) {
      data.test_duration_hours = testDurationHours > 0 ? testDurationHours : undefined
    } else {
      data.active_discount_hours = activeDiscountHours > 0 ? activeDiscountHours : undefined
    }
    onSave(data)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getOfferTypeIcon(template.offer_type)}</span>
            <h2 className="text-lg font-semibold text-dark-100">
              Редактирование шаблона
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1">Название шаблона</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
            />
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1">Текст сообщения</label>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1">Текст кнопки</label>
            <input
              type="text"
              value={buttonText}
              onChange={e => setButtonText(e.target.value)}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">Срок предложения (часы)</label>
              <input
                type="number"
                value={validHours}
                onChange={e => setValidHours(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                min={1}
              />
              <p className="text-xs text-dark-500 mt-1">Время на активацию</p>
            </div>

            {!isTestAccess && (
              <div>
                <label className="block text-sm text-dark-300 mb-1">Скидка (%)</label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                  min={0}
                  max={100}
                />
              </div>
            )}
          </div>

          {isTestAccess ? (
            <div>
              <label className="block text-sm text-dark-300 mb-1">Длительность доступа (часы)</label>
              <input
                type="number"
                value={testDurationHours}
                onChange={e => setTestDurationHours(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                min={0}
              />
              <p className="text-xs text-dark-500 mt-1">0 = по умолчанию</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-dark-300 mb-1">Действие скидки (часы)</label>
              <input
                type="number"
                value={activeDiscountHours}
                onChange={e => setActiveDiscountHours(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                min={0}
              />
              <p className="text-xs text-dark-500 mt-1">Сколько действует скидка после активации</p>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                isActive ? 'bg-accent-500' : 'bg-dark-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isActive ? 'left-5' : 'left-1'
                }`}
              />
            </button>
            <span className="text-sm text-dark-200">Шаблон активен</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-dark-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isLoading}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Send Offer Modal
interface SendOfferModalProps {
  templates: PromoOfferTemplate[]
  onSend: (templateId: number, target: string | null, userId: number | null) => void
  onClose: () => void
  isLoading?: boolean
}

function SendOfferModal({ templates, onSend, onClose, isLoading }: SendOfferModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(templates[0]?.id || null)
  const [sendMode, setSendMode] = useState<'segment' | 'user'>('segment')
  const [selectedTarget, setSelectedTarget] = useState<TargetSegment>('active')
  const [userId, setUserId] = useState('')

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)
  const activeTemplates = templates.filter(t => t.is_active)

  const handleSubmit = () => {
    if (!selectedTemplateId) return
    if (sendMode === 'user') {
      const id = parseInt(userId)
      if (!id) return
      onSend(selectedTemplateId, null, id)
    } else {
      onSend(selectedTemplateId, selectedTarget, null)
    }
  }

  const isValid = () => {
    if (!selectedTemplateId) return false
    if (sendMode === 'user' && !userId.trim()) return false
    return true
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-500/20 rounded-lg">
              <SendIcon />
            </div>
            <h2 className="text-lg font-semibold text-dark-100">
              Отправка промопредложения
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Template Selection */}
          <div>
            <label className="block text-sm text-dark-300 mb-2">Шаблон предложения</label>
            <div className="space-y-2">
              {activeTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedTemplateId === template.id
                      ? 'border-accent-500 bg-accent-500/10'
                      : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getOfferTypeIcon(template.offer_type)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-dark-100">{template.name}</div>
                      <div className="text-sm text-dark-400">
                        {template.discount_percent > 0 && `${template.discount_percent}% скидка`}
                        {template.offer_type === 'test_access' && 'Тестовый доступ'}
                        <span className="mx-1">•</span>
                        {template.valid_hours}ч на активацию
                      </div>
                    </div>
                    {selectedTemplateId === template.id && (
                      <CheckIcon />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Send Mode */}
          <div>
            <label className="block text-sm text-dark-300 mb-2">Кому отправить</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSendMode('segment')}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  sendMode === 'segment'
                    ? 'border-accent-500 bg-accent-500/10 text-accent-400'
                    : 'border-dark-600 text-dark-400 hover:text-dark-200'
                }`}
              >
                <UsersIcon />
                <span className="ml-2">Сегмент</span>
              </button>
              <button
                onClick={() => setSendMode('user')}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  sendMode === 'user'
                    ? 'border-accent-500 bg-accent-500/10 text-accent-400'
                    : 'border-dark-600 text-dark-400 hover:text-dark-200'
                }`}
              >
                <UserIcon />
                <span className="ml-2">Пользователь</span>
              </button>
            </div>

            {sendMode === 'segment' ? (
              <select
                value={selectedTarget}
                onChange={e => setSelectedTarget(e.target.value as TargetSegment)}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
              >
                {Object.entries(TARGET_SEGMENTS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="Telegram ID или User ID"
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
              />
            )}
          </div>

          {/* Preview */}
          {selectedTemplate && (
            <div className="p-4 bg-dark-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-dark-300 mb-2">Предпросмотр</h4>
              <div className="text-sm text-dark-200 whitespace-pre-wrap">
                {selectedTemplate.message_text}
              </div>
              <div className="mt-3">
                <span className="inline-block px-3 py-1.5 bg-accent-500 text-white text-sm rounded-lg">
                  {selectedTemplate.button_text}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-dark-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid() || isLoading}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <SendIcon />
            {isLoading ? 'Отправка...' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Result Modal
interface ResultModalProps {
  title: string
  message: string
  isSuccess: boolean
  onClose: () => void
}

function ResultModal({ title, message, isSuccess, onClose }: ResultModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl p-6 max-w-sm w-full text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
          isSuccess ? 'bg-emerald-500/20' : 'bg-error-500/20'
        }`}>
          {isSuccess ? (
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <h3 className="text-lg font-semibold text-dark-100 mb-2">{title}</h3>
        <p className="text-dark-400 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
        >
          Закрыть
        </button>
      </div>
    </div>
  )
}

export default function AdminPromoOffers() {
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'templates' | 'send' | 'logs'>('templates')
  const [editingTemplate, setEditingTemplate] = useState<PromoOfferTemplate | null>(null)
  const [showSendModal, setShowSendModal] = useState(false)
  const [resultModal, setResultModal] = useState<{ title: string; message: string; isSuccess: boolean } | null>(null)

  // Queries
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['admin-promo-templates'],
    queryFn: promoOffersApi.getTemplates,
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-promo-logs'],
    queryFn: () => promoOffersApi.getLogs({ limit: 100 }),
    enabled: activeTab === 'logs',
  })

  // Mutations
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PromoOfferTemplateUpdateRequest }) =>
      promoOffersApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-templates'] })
      setEditingTemplate(null)
    },
  })

  const broadcastMutation = useMutation({
    mutationFn: promoOffersApi.broadcastOffer,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-logs'] })
      setShowSendModal(false)
      setResultModal({
        title: 'Отправлено!',
        message: `Промопредложение отправлено ${result.created_offers} пользователям`,
        isSuccess: true,
      })
    },
    onError: (error: any) => {
      setResultModal({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Не удалось отправить предложение',
        isSuccess: false,
      })
    },
  })

  const handleSendOffer = (templateId: number, target: string | null, userId: number | null) => {
    const template = templatesData?.items.find(t => t.id === templateId)
    if (!template) return

    const data: any = {
      notification_type: template.offer_type,
      valid_hours: template.valid_hours,
      discount_percent: template.discount_percent,
      effect_type: template.offer_type === 'test_access' ? 'test_access' : 'percent_discount',
      extra_data: {
        template_id: template.id,
        active_discount_hours: template.active_discount_hours,
        test_duration_hours: template.test_duration_hours,
        test_squad_uuids: template.test_squad_uuids,
      },
    }

    if (target) {
      data.target = target
    }
    if (userId) {
      data.telegram_id = userId
    }

    broadcastMutation.mutate(data)
  }

  const templates = templatesData?.items || []
  const logs = logsData?.items || []

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 border border-dark-700 hover:border-dark-600 transition-colors"
          >
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-dark-100">Промопредложения</h1>
            <p className="text-sm text-dark-400">Шаблоны, рассылка и логи предложений</p>
          </div>
        </div>
        <button
          onClick={() => setShowSendModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
        >
          <SendIcon />
          Отправить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-dark-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'bg-dark-700 text-dark-100'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          Шаблоны ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'logs'
              ? 'bg-dark-700 text-dark-100'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          Логи
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-dark-400">Нет шаблонов</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 bg-dark-800 rounded-xl border transition-colors ${
                    template.is_active ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getOfferTypeIcon(template.offer_type)}</span>
                      <div>
                        <h3 className="font-medium text-dark-100">{template.name}</h3>
                        <span className="text-xs text-dark-500">{getOfferTypeLabel(template.offer_type)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="p-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 hover:text-dark-100 transition-colors"
                    >
                      <EditIcon />
                    </button>
                  </div>

                  <div className="space-y-2 text-sm">
                    {template.discount_percent > 0 && (
                      <div className="flex justify-between">
                        <span className="text-dark-400">Скидка:</span>
                        <span className="text-accent-400 font-medium">{template.discount_percent}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-dark-400">Срок предложения:</span>
                      <span className="text-dark-200">{template.valid_hours}ч</span>
                    </div>
                    {template.active_discount_hours && (
                      <div className="flex justify-between">
                        <span className="text-dark-400">Действие скидки:</span>
                        <span className="text-dark-200">{template.active_discount_hours}ч</span>
                      </div>
                    )}
                    {template.test_duration_hours && (
                      <div className="flex justify-between">
                        <span className="text-dark-400">Тестовый доступ:</span>
                        <span className="text-dark-200">{template.test_duration_hours}ч</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-dark-700">
                    <div className="flex items-center gap-2">
                      {template.is_active ? (
                        <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">
                          Активен
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-dark-600 text-dark-400 rounded">
                          Неактивен
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <>
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-dark-400">Нет записей</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log: PromoOfferLog) => (
                <div
                  key={log.id}
                  className="p-4 bg-dark-800 rounded-xl border border-dark-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-dark-700 rounded-full flex items-center justify-center">
                        <UserIcon />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-dark-100">
                            {log.user?.full_name || log.user?.username || `User #${log.user_id}`}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded ${getActionColor(log.action)}`}>
                            {getActionLabel(log.action)}
                          </span>
                        </div>
                        <div className="text-sm text-dark-400">
                          {log.source && (
                            <span>{getOfferTypeLabel(log.source)}</span>
                          )}
                          {log.percent && log.percent > 0 && (
                            <span className="ml-2 text-accent-400">{log.percent}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-dark-500">
                      <ClockIcon />
                      {formatDateTime(log.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Template Edit Modal */}
      {editingTemplate && (
        <TemplateEditModal
          template={editingTemplate}
          onSave={(data) => updateTemplateMutation.mutate({ id: editingTemplate.id, data })}
          onClose={() => setEditingTemplate(null)}
          isLoading={updateTemplateMutation.isPending}
        />
      )}

      {/* Send Offer Modal */}
      {showSendModal && (
        <SendOfferModal
          templates={templates}
          onSend={handleSendOffer}
          onClose={() => setShowSendModal(false)}
          isLoading={broadcastMutation.isPending}
        />
      )}

      {/* Result Modal */}
      {resultModal && (
        <ResultModal
          title={resultModal.title}
          message={resultModal.message}
          isSuccess={resultModal.isSuccess}
          onClose={() => setResultModal(null)}
        />
      )}
    </div>
  )
}
