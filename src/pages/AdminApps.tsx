import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  adminAppsApi,
  AppDefinition,
  LocalizedText,
  AppStep,
  AppButton,
  exportToRemnawaveFormat,
  importFromRemnawaveFormat,
  RemnawaveConfig,
  importFromRemnawaveFormat as convertRemnawave,
} from '../api/adminApps'

// Icons
const AppsIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
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

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
)

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
  </svg>
)

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg className={`w-4 h-4 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-dark-500'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
)

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
)

const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
)

const CloudSyncIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
  </svg>
)

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const PLATFORM_LABELS: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
  androidTV: 'Android TV',
  appleTV: 'Apple TV',
}

const PLATFORMS = ['ios', 'android', 'macos', 'windows', 'linux', 'androidTV', 'appleTV']

// Helper to create empty localized text
const emptyLocalizedText = (): LocalizedText => ({
  en: '',
  ru: '',
  zh: '',
  fa: '',
})

// Helper to create empty app step
const emptyAppStep = (): AppStep => ({
  description: emptyLocalizedText(),
  buttons: [],
})

// Helper to create empty app
const createEmptyApp = (platform: string): AppDefinition => ({
  id: `new-app-${platform}-${Date.now()}`,
  name: '',
  isFeatured: false,
  urlScheme: '',
  installationStep: emptyAppStep(),
  addSubscriptionStep: emptyAppStep(),
  connectAndUseStep: emptyAppStep(),
})

interface AppEditorModalProps {
  app: AppDefinition
  platform: string
  isNew: boolean
  onSave: (app: AppDefinition) => void
  onClose: () => void
}

function AppEditorModal({ app, platform, isNew, onSave, onClose }: AppEditorModalProps) {
  const { t } = useTranslation()
  const [editedApp, setEditedApp] = useState<AppDefinition>({ ...app })
  const [activeTab, setActiveTab] = useState<'basic' | 'installation' | 'subscription' | 'connect' | 'additional'>('basic')

  const updateField = <K extends keyof AppDefinition>(field: K, value: AppDefinition[K]) => {
    setEditedApp((prev) => ({ ...prev, [field]: value }))
  }

  const updateLocalizedText = (
    stepKey: 'installationStep' | 'addSubscriptionStep' | 'connectAndUseStep' | 'additionalBeforeAddSubscriptionStep' | 'additionalAfterAddSubscriptionStep',
    field: 'description' | 'title',
    lang: keyof LocalizedText,
    value: string
  ) => {
    setEditedApp((prev) => {
      const step = prev[stepKey] || emptyAppStep()
      const fieldValue = step[field] || emptyLocalizedText()
      return {
        ...prev,
        [stepKey]: {
          ...step,
          [field]: { ...fieldValue, [lang]: value },
        },
      }
    })
  }

  const updateButtons = (
    stepKey: 'installationStep' | 'addSubscriptionStep' | 'connectAndUseStep' | 'additionalBeforeAddSubscriptionStep' | 'additionalAfterAddSubscriptionStep',
    buttons: AppButton[]
  ) => {
    setEditedApp((prev) => {
      const step = prev[stepKey] || emptyAppStep()
      return {
        ...prev,
        [stepKey]: { ...step, buttons },
      }
    })
  }

  const addButton = (stepKey: 'installationStep' | 'additionalBeforeAddSubscriptionStep' | 'additionalAfterAddSubscriptionStep') => {
    const step = editedApp[stepKey] || emptyAppStep()
    const buttons = step.buttons || []
    updateButtons(stepKey, [...buttons, { buttonLink: '', buttonText: emptyLocalizedText() }])
  }

  const removeButton = (stepKey: 'installationStep' | 'additionalBeforeAddSubscriptionStep' | 'additionalAfterAddSubscriptionStep', index: number) => {
    const step = editedApp[stepKey] || emptyAppStep()
    const buttons = step.buttons || []
    updateButtons(stepKey, buttons.filter((_, i) => i !== index))
  }

  const updateButton = (
    stepKey: 'installationStep' | 'additionalBeforeAddSubscriptionStep' | 'additionalAfterAddSubscriptionStep',
    index: number,
    field: 'buttonLink' | 'buttonText',
    value: string | LocalizedText
  ) => {
    const step = editedApp[stepKey] || emptyAppStep()
    const buttons = [...(step.buttons || [])]
    buttons[index] = { ...buttons[index], [field]: value }
    updateButtons(stepKey, buttons)
  }

  const renderLocalizedTextInputs = (
    stepKey: 'installationStep' | 'addSubscriptionStep' | 'connectAndUseStep' | 'additionalBeforeAddSubscriptionStep' | 'additionalAfterAddSubscriptionStep',
    field: 'description' | 'title',
    label: string
  ) => {
    const step = editedApp[stepKey]
    const value = step?.[field] || emptyLocalizedText()

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-dark-300">{label}</label>
        {(['en', 'ru'] as const).map((lang) => (
          <div key={lang} className="flex gap-2 items-center">
            <span className="w-8 text-xs text-dark-500 uppercase">{lang}</span>
            <textarea
              value={value[lang] || ''}
              onChange={(e) => updateLocalizedText(stepKey, field, lang, e.target.value)}
              className="input flex-1 text-sm"
              rows={2}
            />
          </div>
        ))}
      </div>
    )
  }

  const renderButtonsEditor = (stepKey: 'installationStep' | 'additionalBeforeAddSubscriptionStep' | 'additionalAfterAddSubscriptionStep') => {
    const step = editedApp[stepKey]
    const buttons = step?.buttons || []

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-dark-300">{t('admin.apps.buttons')}</label>
          <button
            type="button"
            onClick={() => addButton(stepKey)}
            className="text-xs text-accent-400 hover:text-accent-300"
          >
            + {t('admin.apps.addButton')}
          </button>
        </div>
        {buttons.map((button, index) => (
          <div key={index} className="p-3 bg-dark-800/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-dark-400">{t('admin.apps.button')} #{index + 1}</span>
              <button
                type="button"
                onClick={() => removeButton(stepKey, index)}
                className="text-error-400 hover:text-error-300"
              >
                <TrashIcon />
              </button>
            </div>
            <input
              type="url"
              value={button.buttonLink}
              onChange={(e) => updateButton(stepKey, index, 'buttonLink', e.target.value)}
              placeholder="https://..."
              className="input w-full text-sm"
            />
            {(['en', 'ru'] as const).map((lang) => (
              <div key={lang} className="flex gap-2 items-center">
                <span className="w-8 text-xs text-dark-500 uppercase">{lang}</span>
                <input
                  type="text"
                  value={button.buttonText[lang] || ''}
                  onChange={(e) => {
                    const newButtonText = { ...button.buttonText, [lang]: e.target.value }
                    updateButton(stepKey, index, 'buttonText', newButtonText)
                  }}
                  placeholder={t('admin.apps.buttonText')}
                  className="input flex-1 text-sm"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-dark-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark-100">
            {isNew ? t('admin.apps.createApp') : t('admin.apps.editApp')} - {PLATFORM_LABELS[platform]}
          </h2>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700 overflow-x-auto">
          {(['basic', 'installation', 'subscription', 'connect', 'additional'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                activeTab === tab
                  ? 'text-accent-400 border-b-2 border-accent-400'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              {t(`admin.apps.tabs.${tab}`)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'basic' && (
            <>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">{t('admin.apps.appId')}</label>
                <input
                  type="text"
                  value={editedApp.id}
                  onChange={(e) => updateField('id', e.target.value)}
                  className="input w-full"
                  disabled={!isNew}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">{t('admin.apps.appName')}</label>
                <input
                  type="text"
                  value={editedApp.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">{t('admin.apps.urlScheme')}</label>
                <input
                  type="text"
                  value={editedApp.urlScheme}
                  onChange={(e) => updateField('urlScheme', e.target.value)}
                  className="input w-full"
                  placeholder="app://add/"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editedApp.isFeatured}
                    onChange={(e) => updateField('isFeatured', e.target.checked)}
                    className="w-4 h-4 accent-accent-500"
                  />
                  <span className="text-sm text-dark-300">{t('admin.apps.featured')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editedApp.isNeedBase64Encoding || false}
                    onChange={(e) => updateField('isNeedBase64Encoding', e.target.checked || undefined)}
                    className="w-4 h-4 accent-accent-500"
                  />
                  <span className="text-sm text-dark-300">{t('admin.apps.base64Encoding')}</span>
                </label>
              </div>
            </>
          )}

          {activeTab === 'installation' && (
            <>
              {renderLocalizedTextInputs('installationStep', 'description', t('admin.apps.installDescription'))}
              {renderButtonsEditor('installationStep')}
            </>
          )}

          {activeTab === 'subscription' && (
            <>
              {renderLocalizedTextInputs('addSubscriptionStep', 'description', t('admin.apps.subscriptionDescription'))}
            </>
          )}

          {activeTab === 'connect' && (
            <>
              {renderLocalizedTextInputs('connectAndUseStep', 'description', t('admin.apps.connectDescription'))}
            </>
          )}

          {activeTab === 'additional' && (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-dark-200">{t('admin.apps.beforeSubscription')}</h3>
                {renderLocalizedTextInputs('additionalBeforeAddSubscriptionStep', 'title', t('admin.apps.stepTitle'))}
                {renderLocalizedTextInputs('additionalBeforeAddSubscriptionStep', 'description', t('admin.apps.stepDescription'))}
                {renderButtonsEditor('additionalBeforeAddSubscriptionStep')}
              </div>
              <div className="border-t border-dark-700 pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-dark-200">{t('admin.apps.afterSubscription')}</h3>
                {renderLocalizedTextInputs('additionalAfterAddSubscriptionStep', 'title', t('admin.apps.stepTitle'))}
                {renderLocalizedTextInputs('additionalAfterAddSubscriptionStep', 'description', t('admin.apps.stepDescription'))}
                {renderButtonsEditor('additionalAfterAddSubscriptionStep')}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-700 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            {t('common.cancel')}
          </button>
          <button onClick={() => onSave(editedApp)} className="btn-primary">
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminApps() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ios')
  const [editingApp, setEditingApp] = useState<{ app: AppDefinition; isNew: boolean } | null>(null)
  const [copyTarget, setCopyTarget] = useState<{ appId: string; platform: string } | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<{ platformApps: Record<string, AppDefinition[]> } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [useRemnaWave, setUseRemnaWave] = useState(false)
  const [showRemnaWaveSettings, setShowRemnaWaveSettings] = useState(false)
  const [remnaWaveUuidInput, setRemnaWaveUuidInput] = useState('')

  // Check if RemnaWave config is available
  const { data: remnaWaveStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['remnawave-status'],
    queryFn: adminAppsApi.getRemnaWaveStatus,
    staleTime: 60000,
  })

  // List available RemnaWave configs
  const { data: availableConfigs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['remnawave-configs-list'],
    queryFn: adminAppsApi.listRemnaWaveConfigs,
    enabled: showRemnaWaveSettings,
    staleTime: 30000,
  })

  // Mutation for setting UUID
  const setUuidMutation = useMutation({
    mutationFn: adminAppsApi.setRemnaWaveUuid,
    onSuccess: () => {
      refetchStatus()
      queryClient.invalidateQueries({ queryKey: ['remnawave-config'] })
      setShowRemnaWaveSettings(false)
    },
  })

  // Fetch RemnaWave config when toggle is enabled
  const { data: remnaWaveConfig, isLoading: isRemnaWaveLoading, refetch: refetchRemnaWave } = useQuery({
    queryKey: ['remnawave-config'],
    queryFn: adminAppsApi.getRemnaWaveConfig,
    enabled: useRemnaWave && remnaWaveStatus?.enabled,
    staleTime: 0,
  })

  // Convert RemnaWave config to local format
  const remnaWaveApps = remnaWaveConfig
    ? convertRemnawave(remnaWaveConfig).platformApps[selectedPlatform] || []
    : []

  const { data: localApps, isLoading: isLocalLoading } = useQuery({
    queryKey: ['admin-apps', selectedPlatform],
    queryFn: () => adminAppsApi.getPlatformApps(selectedPlatform),
    enabled: !useRemnaWave,
  })

  // Select which apps to show based on toggle
  const apps = useRemnaWave ? remnaWaveApps : localApps
  const isLoading = useRemnaWave ? isRemnaWaveLoading : isLocalLoading

  const createMutation = useMutation({
    mutationFn: ({ platform, app }: { platform: string; app: AppDefinition }) =>
      adminAppsApi.createApp(platform, app),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-apps'] })
      setEditingApp(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ platform, appId, app }: { platform: string; appId: string; app: AppDefinition }) =>
      adminAppsApi.updateApp(platform, appId, app),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-apps'] })
      setEditingApp(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ platform, appId }: { platform: string; appId: string }) =>
      adminAppsApi.deleteApp(platform, appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-apps'] })
    },
  })

  const reorderMutation = useMutation({
    mutationFn: ({ platform, appIds }: { platform: string; appIds: string[] }) =>
      adminAppsApi.reorderApps(platform, appIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-apps'] })
    },
  })

  const copyMutation = useMutation({
    mutationFn: ({ platform, appId, targetPlatform }: { platform: string; appId: string; targetPlatform: string }) =>
      adminAppsApi.copyApp(platform, appId, targetPlatform),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-apps'] })
      setCopyTarget(null)
    },
  })

  // Fetch all platforms for export
  const { data: allPlatformApps } = useQuery({
    queryKey: ['admin-apps-all'],
    queryFn: async () => {
      const result: Record<string, AppDefinition[]> = {}
      for (const platform of PLATFORMS) {
        try {
          result[platform] = await adminAppsApi.getPlatformApps(platform)
        } catch {
          result[platform] = []
        }
      }
      return result
    },
  })

  const { data: branding } = useQuery({
    queryKey: ['admin-branding'],
    queryFn: adminAppsApi.getBranding,
  })

  // Export handler
  const handleExport = () => {
    if (!allPlatformApps) return
    const remnawaveConfig = exportToRemnawaveFormat(allPlatformApps, branding)
    const json = JSON.stringify(remnawaveConfig, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `apps-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Import file handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportPreview(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string) as RemnawaveConfig
        const imported = importFromRemnawaveFormat(json)
        setImportPreview(imported)
        setShowImportModal(true)
      } catch (err) {
        setImportError(t('admin.apps.importError', 'Invalid JSON file'))
        setShowImportModal(true)
      }
    }
    reader.readAsText(file)
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Confirm import handler
  const handleConfirmImport = async () => {
    if (!importPreview) return
    try {
      for (const [platform, apps] of Object.entries(importPreview.platformApps)) {
        for (const app of apps) {
          await adminAppsApi.createApp(platform, app)
        }
      }
      queryClient.invalidateQueries({ queryKey: ['admin-apps'] })
      queryClient.invalidateQueries({ queryKey: ['admin-apps-all'] })
      setShowImportModal(false)
      setImportPreview(null)
    } catch (err) {
      setImportError(t('admin.apps.importCreateError', 'Failed to create some apps'))
    }
  }

  const handleMoveUp = (index: number) => {
    if (!apps || index === 0) return
    const newOrder = [...apps]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    reorderMutation.mutate({ platform: selectedPlatform, appIds: newOrder.map((a) => a.id) })
  }

  const handleMoveDown = (index: number) => {
    if (!apps || index === apps.length - 1) return
    const newOrder = [...apps]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    reorderMutation.mutate({ platform: selectedPlatform, appIds: newOrder.map((a) => a.id) })
  }

  const handleSave = (app: AppDefinition) => {
    if (editingApp?.isNew) {
      createMutation.mutate({ platform: selectedPlatform, app })
    } else {
      updateMutation.mutate({ platform: selectedPlatform, appId: app.id, app })
    }
  }

  const handleDelete = (appId: string) => {
    if (confirm(t('admin.apps.confirmDelete'))) {
      deleteMutation.mutate({ platform: selectedPlatform, appId })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <AppsIcon />
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-50">{t('admin.apps.title')}</h1>
        </div>

        {/* RemnaWave Toggle & Settings */}
        <div className="flex items-center gap-2">
          {remnaWaveStatus?.enabled && (
            <>
              <button
                onClick={() => setUseRemnaWave(!useRemnaWave)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  useRemnaWave
                    ? 'bg-accent-500 text-white'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
                title={t('admin.apps.remnaWaveToggle', 'Toggle RemnaWave source')}
              >
                <CloudSyncIcon />
                <span>RemnaWave</span>
              </button>
              {useRemnaWave && (
                <button
                  onClick={() => refetchRemnaWave()}
                  className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded-lg transition-colors"
                  title={t('admin.apps.refreshRemnaWave', 'Refresh from RemnaWave')}
                >
                  <RefreshIcon />
                </button>
              )}
            </>
          )}
          <button
            onClick={() => {
              setRemnaWaveUuidInput(remnaWaveStatus?.config_uuid || '')
              setShowRemnaWaveSettings(true)
            }}
            className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded-lg transition-colors"
            title={t('admin.apps.remnaWaveSettings', 'RemnaWave Settings')}
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      {/* RemnaWave Info Banner */}
      {useRemnaWave && (
        <div className="bg-accent-500/10 border border-accent-500/30 text-accent-200 p-3 rounded-lg text-sm flex items-center gap-2">
          <CloudSyncIcon />
          <span>{t('admin.apps.remnaWaveMode', 'Showing apps from RemnaWave panel. Changes here are read-only.')}</span>
        </div>
      )}

      {/* Platform Tabs */}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((platform) => (
          <button
            key={platform}
            onClick={() => setSelectedPlatform(platform)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPlatform === platform
                ? 'bg-accent-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            }`}
          >
            {PLATFORM_LABELS[platform]}
          </button>
        ))}
      </div>

      {/* Action Buttons - Only show when not in RemnaWave mode */}
      {!useRemnaWave && (
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary flex items-center gap-2"
              title={t('admin.apps.importApps', 'Import Apps')}
            >
              <UploadIcon />
              {t('admin.apps.import', 'Import')}
            </button>
            <button
              onClick={handleExport}
              disabled={!allPlatformApps}
              className="btn-secondary flex items-center gap-2"
              title={t('admin.apps.exportApps', 'Export Apps')}
            >
              <DownloadIcon />
              {t('admin.apps.export', 'Export')}
            </button>
          </div>
          <button
            onClick={() => setEditingApp({ app: createEmptyApp(selectedPlatform), isNew: true })}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon />
            {t('admin.apps.addApp')}
          </button>
        </div>
      )}

      {/* Apps List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : apps && apps.length > 0 ? (
        <div className="space-y-3">
          {apps.map((app, index) => (
            <div
              key={app.id}
              className="card flex items-center gap-4 p-4"
            >
              {/* Reorder buttons - Only show when not in RemnaWave mode */}
              {!useRemnaWave && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 text-dark-400 hover:text-dark-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUpIcon />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === apps.length - 1}
                    className="p-1 text-dark-400 hover:text-dark-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
              )}

              {/* App Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-dark-100">{app.name}</span>
                  {app.isFeatured && <StarIcon filled />}
                  {app.isNeedBase64Encoding && (
                    <span className="text-xs bg-dark-700 text-dark-400 px-2 py-0.5 rounded">Base64</span>
                  )}
                </div>
                <div className="text-xs text-dark-500 font-mono truncate">{app.id}</div>
                <div className="text-xs text-dark-400 mt-1">{app.urlScheme}</div>
              </div>

              {/* Actions - Only show when not in RemnaWave mode */}
              {!useRemnaWave && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCopyTarget({ appId: app.id, platform: selectedPlatform })}
                    className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded"
                    title={t('admin.apps.copyTo')}
                  >
                    <CopyIcon />
                  </button>
                  <button
                    onClick={() => setEditingApp({ app, isNew: false })}
                    className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded"
                    title={t('common.edit')}
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => handleDelete(app.id)}
                    className="p-2 text-error-400 hover:text-error-300 hover:bg-error-500/10 rounded"
                    title={t('common.delete')}
                  >
                    <TrashIcon />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <AppsIcon />
          <p className="text-dark-400 mt-4">{t('admin.apps.noApps')}</p>
          <button
            onClick={() => setEditingApp({ app: createEmptyApp(selectedPlatform), isNew: true })}
            className="btn-primary mt-4"
          >
            {t('admin.apps.addFirstApp')}
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingApp && (
        <AppEditorModal
          app={editingApp.app}
          platform={selectedPlatform}
          isNew={editingApp.isNew}
          onSave={handleSave}
          onClose={() => setEditingApp(null)}
        />
      )}

      {/* Copy Modal */}
      {copyTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">{t('admin.apps.copyTo')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.filter((p) => p !== copyTarget.platform).map((platform) => (
                <button
                  key={platform}
                  onClick={() => copyMutation.mutate({
                    platform: copyTarget.platform,
                    appId: copyTarget.appId,
                    targetPlatform: platform,
                  })}
                  className="px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-dark-200 text-sm"
                >
                  {PLATFORM_LABELS[platform]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCopyTarget(null)}
              className="btn-secondary w-full mt-4"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">
              {t('admin.apps.importPreview', 'Import Preview')}
            </h3>

            {importError && (
              <div className="bg-error-500/10 border border-error-500/30 text-error-400 p-3 rounded-lg mb-4">
                {importError}
              </div>
            )}

            {importPreview && (
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {Object.entries(importPreview.platformApps).map(([platform, platformApps]) => (
                  platformApps.length > 0 && (
                    <div key={platform} className="bg-dark-800/50 rounded-lg p-4">
                      <h4 className="font-medium text-dark-200 mb-2">
                        {PLATFORM_LABELS[platform] || platform} ({platformApps.length})
                      </h4>
                      <ul className="space-y-1">
                        {platformApps.map((app, idx) => (
                          <li key={idx} className="text-sm text-dark-400 flex items-center gap-2">
                            {app.isFeatured && <StarIcon filled />}
                            <span>{app.name}</span>
                            <span className="text-dark-600 font-mono text-xs">({app.urlScheme || '-'})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                ))}
                {Object.values(importPreview.platformApps).every(arr => arr.length === 0) && (
                  <div className="text-dark-400 text-center py-8">
                    {t('admin.apps.noAppsToImport', 'No apps to import')}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-dark-700">
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportPreview(null)
                  setImportError(null)
                }}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
              {importPreview && !importError && (
                <button
                  onClick={handleConfirmImport}
                  className="btn-primary"
                >
                  {t('admin.apps.confirmImport', 'Import Apps')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RemnaWave Settings Modal */}
      {showRemnaWaveSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <CloudSyncIcon />
              {t('admin.apps.remnaWaveSettings', 'RemnaWave Settings')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-2">
                  {t('admin.apps.remnaWaveConfigUuid', 'Config UUID')}
                </label>
                <input
                  type="text"
                  value={remnaWaveUuidInput}
                  onChange={(e) => setRemnaWaveUuidInput(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="input w-full font-mono text-sm"
                />
                <p className="text-xs text-dark-500 mt-1">
                  {t('admin.apps.remnaWaveConfigUuidHint', 'UUID of subscription page config from RemnaWave panel')}
                </p>
              </div>

              {/* Available configs from RemnaWave */}
              {isLoadingConfigs ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : availableConfigs && availableConfigs.length > 0 && (
                <div>
                  <label className="block text-sm text-dark-300 mb-2">
                    {t('admin.apps.availableConfigs', 'Available configs')}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableConfigs.map((config) => (
                      <button
                        key={config.uuid}
                        onClick={() => setRemnaWaveUuidInput(config.uuid)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          remnaWaveUuidInput === config.uuid
                            ? 'border-accent-500 bg-accent-500/10'
                            : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                        }`}
                      >
                        <div className="font-medium text-dark-100">{config.name}</div>
                        <div className="text-xs text-dark-500 font-mono mt-1">{config.uuid}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-dark-700">
              <button
                onClick={() => setShowRemnaWaveSettings(false)}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => setUuidMutation.mutate(remnaWaveUuidInput || null)}
                disabled={setUuidMutation.isPending}
                className="btn-primary"
              >
                {setUuidMutation.isPending
                  ? t('common.loading')
                  : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
