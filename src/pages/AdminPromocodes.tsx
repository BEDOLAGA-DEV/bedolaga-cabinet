import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  promocodesApi,
  PromoCode,
  PromoCodeDetail,
  PromoCodeType,
  PromoCodeCreateRequest,
  PromoCodeUpdateRequest,
  PromoGroup,
  PromoGroupCreateRequest,
  PromoGroupUpdateRequest,
} from '../api/promocodes'

// Icons
const BackIcon = () => (
  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

const ChartIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
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

// Helper functions
const getTypeLabel = (type: PromoCodeType): string => {
  const labels: Record<PromoCodeType, string> = {
    balance: 'Баланс',
    subscription_days: 'Дни подписки',
    trial_subscription: 'Тестовая подписка',
    promo_group: 'Группа скидок',
  }
  return labels[type] || type
}

const getTypeColor = (type: PromoCodeType): string => {
  const colors: Record<PromoCodeType, string> = {
    balance: 'bg-emerald-500/20 text-emerald-400',
    subscription_days: 'bg-blue-500/20 text-blue-400',
    trial_subscription: 'bg-purple-500/20 text-purple-400',
    promo_group: 'bg-amber-500/20 text-amber-400',
  }
  return colors[type] || 'bg-dark-600 text-dark-300'
}

const formatDate = (date: string | null): string => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

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

// Promocode Modal
interface PromocodeModalProps {
  promocode?: PromoCodeDetail | null
  promoGroups: PromoGroup[]
  onSave: (data: PromoCodeCreateRequest | PromoCodeUpdateRequest) => void
  onClose: () => void
  isLoading?: boolean
}

function PromocodeModal({ promocode, promoGroups, onSave, onClose, isLoading }: PromocodeModalProps) {
  const isEdit = !!promocode

  const [code, setCode] = useState(promocode?.code || '')
  const [type, setType] = useState<PromoCodeType>(promocode?.type || 'balance')
  const [balanceBonusRubles, setBalanceBonusRubles] = useState(promocode?.balance_bonus_rubles || 0)
  const [subscriptionDays, setSubscriptionDays] = useState(promocode?.subscription_days || 0)
  const [maxUses, setMaxUses] = useState(promocode?.max_uses || 1)
  const [isActive, setIsActive] = useState(promocode?.is_active ?? true)
  const [firstPurchaseOnly, setFirstPurchaseOnly] = useState(promocode?.first_purchase_only || false)
  const [validUntil, setValidUntil] = useState(
    promocode?.valid_until ? promocode.valid_until.split('T')[0] : ''
  )
  const [promoGroupId, setPromoGroupId] = useState<number | null>(promocode?.promo_group_id || null)

  const handleSubmit = () => {
    const data: PromoCodeCreateRequest | PromoCodeUpdateRequest = {
      code: code.trim().toUpperCase(),
      type,
      balance_bonus_kopeks: Math.round(balanceBonusRubles * 100),
      subscription_days: subscriptionDays,
      max_uses: maxUses,
      is_active: isActive,
      first_purchase_only: firstPurchaseOnly,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      promo_group_id: type === 'promo_group' ? promoGroupId : null,
    }
    onSave(data)
  }

  const isValid = () => {
    if (!code.trim()) return false
    if (type === 'balance' && balanceBonusRubles <= 0) return false
    if ((type === 'subscription_days' || type === 'trial_subscription') && subscriptionDays <= 0) return false
    if (type === 'promo_group' && !promoGroupId) return false
    return true
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-dark-100">
            {isEdit ? 'Редактирование промокода' : 'Новый промокод'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Code */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">Код промокода</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500 uppercase"
              placeholder="SUMMER2025"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">Тип промокода</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as PromoCodeType)}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
            >
              <option value="balance">Пополнение баланса</option>
              <option value="subscription_days">Дни подписки</option>
              <option value="trial_subscription">Тестовая подписка</option>
              <option value="promo_group">Группа скидок</option>
            </select>
          </div>

          {/* Type-specific fields */}
          {type === 'balance' && (
            <div>
              <label className="block text-sm text-dark-300 mb-1">Сумма бонуса</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={balanceBonusRubles}
                  onChange={e => setBalanceBonusRubles(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                  min={0}
                  step={1}
                />
                <span className="text-dark-400">руб.</span>
              </div>
            </div>
          )}

          {(type === 'subscription_days' || type === 'trial_subscription') && (
            <div>
              <label className="block text-sm text-dark-300 mb-1">Количество дней</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={subscriptionDays}
                  onChange={e => setSubscriptionDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                  min={1}
                />
                <span className="text-dark-400">дней</span>
              </div>
            </div>
          )}

          {type === 'promo_group' && (
            <div>
              <label className="block text-sm text-dark-300 mb-1">Группа скидок</label>
              <select
                value={promoGroupId || ''}
                onChange={e => setPromoGroupId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
              >
                <option value="">Выберите группу...</option>
                {promoGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Max Uses */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">Макс. использований</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={maxUses}
                onChange={e => setMaxUses(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                min={0}
              />
              <span className="text-xs text-dark-500">0 = безлимит</span>
            </div>
          </div>

          {/* Valid Until */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">Действует до</label>
            <input
              type="date"
              value={validUntil}
              onChange={e => setValidUntil(e.target.value)}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
            />
            <p className="text-xs text-dark-500 mt-1">Оставьте пустым для бессрочного промокода</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
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
              <span className="text-sm text-dark-200">Активен</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => setFirstPurchaseOnly(!firstPurchaseOnly)}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  firstPurchaseOnly ? 'bg-accent-500' : 'bg-dark-600'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    firstPurchaseOnly ? 'left-5' : 'left-1'
                  }`}
                />
              </button>
              <span className="text-sm text-dark-200">Только для первой покупки</span>
            </label>
          </div>
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
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// PromoGroup Modal
interface PromoGroupModalProps {
  group?: PromoGroup | null
  onSave: (data: PromoGroupCreateRequest | PromoGroupUpdateRequest) => void
  onClose: () => void
  isLoading?: boolean
}

function PromoGroupModal({ group, onSave, onClose, isLoading }: PromoGroupModalProps) {
  const isEdit = !!group

  const [name, setName] = useState(group?.name || '')
  const [serverDiscount, setServerDiscount] = useState(group?.server_discount_percent || 0)
  const [trafficDiscount, setTrafficDiscount] = useState(group?.traffic_discount_percent || 0)
  const [deviceDiscount, setDeviceDiscount] = useState(group?.device_discount_percent || 0)
  const [applyToAddons, setApplyToAddons] = useState(group?.apply_discounts_to_addons ?? true)
  const [autoAssignSpent, setAutoAssignSpent] = useState(
    group?.auto_assign_total_spent_kopeks ? group.auto_assign_total_spent_kopeks / 100 : 0
  )

  const handleSubmit = () => {
    const data: PromoGroupCreateRequest | PromoGroupUpdateRequest = {
      name,
      server_discount_percent: serverDiscount,
      traffic_discount_percent: trafficDiscount,
      device_discount_percent: deviceDiscount,
      apply_discounts_to_addons: applyToAddons,
      auto_assign_total_spent_kopeks: autoAssignSpent > 0 ? Math.round(autoAssignSpent * 100) : null,
    }
    onSave(data)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-dark-100">
            {isEdit ? 'Редактирование группы' : 'Новая группа скидок'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">Название группы</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
              placeholder="VIP клиенты"
            />
          </div>

          {/* Discounts */}
          <div className="p-4 bg-dark-700/50 rounded-lg space-y-3">
            <h4 className="text-sm font-medium text-dark-200 mb-3">Скидки</h4>

            <div className="flex items-center gap-3">
              <span className="text-sm text-dark-400 w-32">На серверы:</span>
              <input
                type="number"
                value={serverDiscount}
                onChange={e => setServerDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-20 px-2 py-1 bg-dark-600 border border-dark-500 rounded text-dark-100 focus:outline-none focus:border-accent-500"
                min={0}
                max={100}
              />
              <span className="text-dark-400">%</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-dark-400 w-32">На трафик:</span>
              <input
                type="number"
                value={trafficDiscount}
                onChange={e => setTrafficDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-20 px-2 py-1 bg-dark-600 border border-dark-500 rounded text-dark-100 focus:outline-none focus:border-accent-500"
                min={0}
                max={100}
              />
              <span className="text-dark-400">%</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-dark-400 w-32">На устройства:</span>
              <input
                type="number"
                value={deviceDiscount}
                onChange={e => setDeviceDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-20 px-2 py-1 bg-dark-600 border border-dark-500 rounded text-dark-100 focus:outline-none focus:border-accent-500"
                min={0}
                max={100}
              />
              <span className="text-dark-400">%</span>
            </div>
          </div>

          {/* Auto-assign */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">Авто-назначение при тратах от</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={autoAssignSpent}
                onChange={e => setAutoAssignSpent(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                min={0}
              />
              <span className="text-dark-400">руб.</span>
            </div>
            <p className="text-xs text-dark-500 mt-1">0 = не назначать автоматически</p>
          </div>

          {/* Apply to addons */}
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setApplyToAddons(!applyToAddons)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                applyToAddons ? 'bg-accent-500' : 'bg-dark-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  applyToAddons ? 'left-5' : 'left-1'
                }`}
              />
            </button>
            <span className="text-sm text-dark-200">Применять к дополнительным услугам</span>
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

// Promocode Stats Modal
interface PromocodeStatsModalProps {
  promocode: PromoCodeDetail
  onClose: () => void
  onEdit: () => void
}

function PromocodeStatsModal({ promocode, onClose, onEdit }: PromocodeStatsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-lg font-mono font-bold text-lg ${getTypeColor(promocode.type)}`}>
              {promocode.code}
            </div>
            <span className={`px-2 py-0.5 text-xs rounded ${getTypeColor(promocode.type)}`}>
              {getTypeLabel(promocode.type)}
            </span>
            {!promocode.is_active && (
              <span className="px-2 py-0.5 text-xs bg-dark-600 text-dark-400 rounded">
                Неактивен
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-dark-700/50 rounded-xl text-center">
              <div className="text-3xl font-bold text-dark-100 mb-1">{promocode.total_uses}</div>
              <div className="text-sm text-dark-400">Всего использований</div>
            </div>
            <div className="p-4 bg-dark-700/50 rounded-xl text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">{promocode.today_uses}</div>
              <div className="text-sm text-dark-400">Сегодня</div>
            </div>
            <div className="p-4 bg-dark-700/50 rounded-xl text-center">
              <div className="text-3xl font-bold text-accent-400 mb-1">
                {promocode.max_uses === 0 ? '∞' : promocode.uses_left}
              </div>
              <div className="text-sm text-dark-400">Осталось</div>
            </div>
          </div>

          {/* Details */}
          <div className="p-4 bg-dark-700/50 rounded-xl space-y-3">
            <h4 className="font-medium text-dark-200 mb-3">Детали промокода</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-400">Тип:</span>
                <span className="text-dark-200">{getTypeLabel(promocode.type)}</span>
              </div>
              {promocode.type === 'balance' && (
                <div className="flex justify-between">
                  <span className="text-dark-400">Бонус:</span>
                  <span className="text-emerald-400">+{promocode.balance_bonus_rubles} руб.</span>
                </div>
              )}
              {(promocode.type === 'subscription_days' || promocode.type === 'trial_subscription') && (
                <div className="flex justify-between">
                  <span className="text-dark-400">Дней:</span>
                  <span className="text-blue-400">+{promocode.subscription_days}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-dark-400">Лимит:</span>
                <span className="text-dark-200">
                  {promocode.current_uses}/{promocode.max_uses === 0 ? '∞' : promocode.max_uses}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Статус:</span>
                <span className={promocode.is_valid ? 'text-emerald-400' : 'text-error-400'}>
                  {promocode.is_valid ? 'Активен' : 'Неактивен'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Создан:</span>
                <span className="text-dark-200">{formatDateTime(promocode.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Действует до:</span>
                <span className="text-dark-200">{promocode.valid_until ? formatDate(promocode.valid_until) : 'Бессрочно'}</span>
              </div>
              {promocode.first_purchase_only && (
                <div className="flex justify-between col-span-2">
                  <span className="text-dark-400">Ограничение:</span>
                  <span className="text-amber-400">Только первая покупка</span>
                </div>
              )}
            </div>
          </div>

          {/* Usage History */}
          <div className="p-4 bg-dark-700/50 rounded-xl">
            <h4 className="font-medium text-dark-200 mb-3 flex items-center gap-2">
              <ClockIcon />
              История использования
            </h4>
            {promocode.recent_uses.length === 0 ? (
              <p className="text-dark-500 text-sm text-center py-4">Промокод еще не использовался</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {promocode.recent_uses.map((use) => (
                  <div
                    key={use.id}
                    className="flex items-center justify-between p-3 bg-dark-600/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-dark-500 rounded-full flex items-center justify-center">
                        <UserIcon />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-dark-200">
                          {use.user_full_name || use.user_username || `User #${use.user_id}`}
                        </div>
                        {use.user_username && (
                          <div className="text-xs text-dark-500">@{use.user_username}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-dark-400">
                      {formatDateTime(use.used_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-dark-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
          >
            Закрыть
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors flex items-center gap-2"
          >
            <EditIcon />
            Редактировать
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPromocodes() {
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'promocodes' | 'groups'>('promocodes')
  const [viewingPromocode, setViewingPromocode] = useState<PromoCodeDetail | null>(null)
  const [showPromocodeModal, setShowPromocodeModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingPromocode, setEditingPromocode] = useState<PromoCodeDetail | null>(null)
  const [editingGroup, setEditingGroup] = useState<PromoGroup | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'promocode' | 'group'; id: number } | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Queries
  const { data: promocodesData, isLoading: promocodesLoading } = useQuery({
    queryKey: ['admin-promocodes'],
    queryFn: () => promocodesApi.getPromocodes({ limit: 100 }),
  })

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['admin-promo-groups'],
    queryFn: () => promocodesApi.getPromoGroups({ limit: 100 }),
  })

  // Promocode Mutations
  const createPromocodeMutation = useMutation({
    mutationFn: promocodesApi.createPromocode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promocodes'] })
      setShowPromocodeModal(false)
    },
  })

  const updatePromocodeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PromoCodeUpdateRequest }) =>
      promocodesApi.updatePromocode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promocodes'] })
      setShowPromocodeModal(false)
      setEditingPromocode(null)
    },
  })

  const deletePromocodeMutation = useMutation({
    mutationFn: promocodesApi.deletePromocode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promocodes'] })
      setDeleteConfirm(null)
    },
  })

  // PromoGroup Mutations
  const createGroupMutation = useMutation({
    mutationFn: promocodesApi.createPromoGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-groups'] })
      setShowGroupModal(false)
    },
  })

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PromoGroupUpdateRequest }) =>
      promocodesApi.updatePromoGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-groups'] })
      setShowGroupModal(false)
      setEditingGroup(null)
    },
  })

  const deleteGroupMutation = useMutation({
    mutationFn: promocodesApi.deletePromoGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-groups'] })
      setDeleteConfirm(null)
    },
  })

  const handleEditPromocode = async (id: number) => {
    try {
      const detail = await promocodesApi.getPromocode(id)
      setEditingPromocode(detail)
      setShowPromocodeModal(true)
    } catch (error) {
      console.error('Failed to load promocode:', error)
    }
  }

  const handleViewStats = async (id: number) => {
    try {
      const detail = await promocodesApi.getPromocode(id)
      setViewingPromocode(detail)
    } catch (error) {
      console.error('Failed to load promocode stats:', error)
    }
  }

  const handleSavePromocode = (data: PromoCodeCreateRequest | PromoCodeUpdateRequest) => {
    if (editingPromocode) {
      updatePromocodeMutation.mutate({ id: editingPromocode.id, data })
    } else {
      createPromocodeMutation.mutate(data as PromoCodeCreateRequest)
    }
  }

  const handleSaveGroup = (data: PromoGroupCreateRequest | PromoGroupUpdateRequest) => {
    if (editingGroup) {
      updateGroupMutation.mutate({ id: editingGroup.id, data })
    } else {
      createGroupMutation.mutate(data as PromoGroupCreateRequest)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleDelete = () => {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'promocode') {
      deletePromocodeMutation.mutate(deleteConfirm.id)
    } else {
      deleteGroupMutation.mutate(deleteConfirm.id)
    }
  }

  const promocodes = promocodesData?.items || []
  const groups = groupsData?.items || []

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
            <h1 className="text-xl font-semibold text-dark-100">Промокоды</h1>
            <p className="text-sm text-dark-400">Управление промокодами и группами скидок</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'promocodes') {
              setEditingPromocode(null)
              setShowPromocodeModal(true)
            } else {
              setEditingGroup(null)
              setShowGroupModal(true)
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
        >
          <PlusIcon />
          {activeTab === 'promocodes' ? 'Добавить промокод' : 'Добавить группу'}
        </button>
      </div>

      {/* Stats Overview */}
      {activeTab === 'promocodes' && promocodes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
            <div className="text-2xl font-bold text-dark-100">{promocodes.length}</div>
            <div className="text-xs text-dark-400">Всего промокодов</div>
          </div>
          <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
            <div className="text-2xl font-bold text-emerald-400">
              {promocodes.filter(p => p.is_active && p.is_valid).length}
            </div>
            <div className="text-xs text-dark-400">Активных</div>
          </div>
          <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
            <div className="text-2xl font-bold text-accent-400">
              {promocodes.reduce((sum, p) => sum + p.current_uses, 0)}
            </div>
            <div className="text-xs text-dark-400">Использований</div>
          </div>
          <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
            <div className="text-2xl font-bold text-amber-400">
              {promocodes.filter(p => p.uses_left === 0 && p.max_uses > 0).length}
            </div>
            <div className="text-xs text-dark-400">Исчерпано</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-dark-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('promocodes')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'promocodes'
              ? 'bg-dark-700 text-dark-100'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          Промокоды ({promocodes.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'groups'
              ? 'bg-dark-700 text-dark-100'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          Группы скидок ({groups.length})
        </button>
      </div>

      {/* Promocodes List */}
      {activeTab === 'promocodes' && (
        <>
          {promocodesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : promocodes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-dark-400">Нет промокодов</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promocodes.map((promo: PromoCode) => (
                <div
                  key={promo.id}
                  className={`p-4 bg-dark-800 rounded-xl border transition-colors ${
                    promo.is_active ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => handleCopyCode(promo.code)}
                          className="font-mono font-medium text-dark-100 hover:text-accent-400 flex items-center gap-1.5 transition-colors"
                        >
                          {promo.code}
                          {copiedCode === promo.code ? (
                            <CheckIcon />
                          ) : (
                            <CopyIcon />
                          )}
                        </button>
                        <span className={`px-2 py-0.5 text-xs rounded ${getTypeColor(promo.type)}`}>
                          {getTypeLabel(promo.type)}
                        </span>
                        {!promo.is_active && (
                          <span className="px-2 py-0.5 text-xs bg-dark-600 text-dark-400 rounded">
                            Неактивен
                          </span>
                        )}
                        {promo.first_purchase_only && (
                          <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                            Первая покупка
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                        {promo.type === 'balance' && (
                          <span className="text-emerald-400">+{promo.balance_bonus_rubles} руб.</span>
                        )}
                        {(promo.type === 'subscription_days' || promo.type === 'trial_subscription') && (
                          <span className="text-blue-400">+{promo.subscription_days} дней</span>
                        )}
                        <span>
                          Использовано: {promo.current_uses}/{promo.max_uses === 0 ? '∞' : promo.max_uses}
                        </span>
                        {promo.valid_until && (
                          <span>До: {formatDate(promo.valid_until)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewStats(promo.id)}
                        className="p-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-accent-500/20 hover:text-accent-400 transition-colors"
                        title="Статистика"
                      >
                        <ChartIcon />
                      </button>
                      <button
                        onClick={() => handleEditPromocode(promo.id)}
                        className="p-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 hover:text-dark-100 transition-colors"
                        title="Редактировать"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'promocode', id: promo.id })}
                        className="p-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-error-500/20 hover:text-error-400 transition-colors"
                        title="Удалить"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Groups List */}
      {activeTab === 'groups' && (
        <>
          {groupsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-dark-400">Нет групп скидок</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group: PromoGroup) => (
                <div
                  key={group.id}
                  className="p-4 bg-dark-800 rounded-xl border border-dark-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-dark-100">{group.name}</h3>
                        {group.is_default && (
                          <span className="px-2 py-0.5 text-xs bg-accent-500/20 text-accent-400 rounded">
                            По умолчанию
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                        {group.server_discount_percent > 0 && (
                          <span>Серверы: -{group.server_discount_percent}%</span>
                        )}
                        {group.traffic_discount_percent > 0 && (
                          <span>Трафик: -{group.traffic_discount_percent}%</span>
                        )}
                        {group.device_discount_percent > 0 && (
                          <span>Устройства: -{group.device_discount_percent}%</span>
                        )}
                        <span className="flex items-center gap-1">
                          <UsersIcon />
                          {group.members_count} участников
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingGroup(group)
                          setShowGroupModal(true)
                        }}
                        className="p-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 hover:text-dark-100 transition-colors"
                        title="Редактировать"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'group', id: group.id })}
                        className="p-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-error-500/20 hover:text-error-400 transition-colors"
                        title="Удалить"
                        disabled={group.is_default}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Promocode Modal */}
      {showPromocodeModal && (
        <PromocodeModal
          promocode={editingPromocode}
          promoGroups={groups}
          onSave={handleSavePromocode}
          onClose={() => {
            setShowPromocodeModal(false)
            setEditingPromocode(null)
          }}
          isLoading={createPromocodeMutation.isPending || updatePromocodeMutation.isPending}
        />
      )}

      {/* PromoGroup Modal */}
      {showGroupModal && (
        <PromoGroupModal
          group={editingGroup}
          onSave={handleSaveGroup}
          onClose={() => {
            setShowGroupModal(false)
            setEditingGroup(null)
          }}
          isLoading={createGroupMutation.isPending || updateGroupMutation.isPending}
        />
      )}

      {/* Promocode Stats Modal */}
      {viewingPromocode && (
        <PromocodeStatsModal
          promocode={viewingPromocode}
          onClose={() => setViewingPromocode(null)}
          onEdit={() => {
            setEditingPromocode(viewingPromocode)
            setViewingPromocode(null)
            setShowPromocodeModal(true)
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-dark-100 mb-2">
              {deleteConfirm.type === 'promocode' ? 'Удалить промокод?' : 'Удалить группу?'}
            </h3>
            <p className="text-dark-400 mb-6">
              {deleteConfirm.type === 'promocode'
                ? 'Промокод будет удален безвозвратно.'
                : 'Группа будет удалена. Пользователи потеряют скидки этой группы.'
              }
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-error-500 text-white rounded-lg hover:bg-error-600 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
