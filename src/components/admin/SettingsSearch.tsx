import { useTranslation } from 'react-i18next'
import { SearchIcon, CloseIcon } from './icons'

interface SettingsSearchProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  resultsCount?: number
}

export function SettingsSearch({ searchQuery, setSearchQuery }: SettingsSearchProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Search - desktop */}
      <div className="relative hidden sm:block">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('admin.settings.searchPlaceholder')}
          className="w-48 lg:w-64 pl-10 pr-10 py-2 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-500 text-sm"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
          <SearchIcon />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
          >
            <CloseIcon />
          </button>
        )}
      </div>
    </>
  )
}

export function SettingsSearchMobile({ searchQuery, setSearchQuery }: Omit<SettingsSearchProps, 'resultsCount'>) {
  const { t } = useTranslation()

  return (
    <div className="relative mt-3 sm:hidden">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={t('admin.settings.searchPlaceholder')}
        className="w-full pl-10 pr-10 py-2 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-500 text-sm"
      />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
        <SearchIcon />
      </div>
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  )
}

export function SettingsSearchResults({ searchQuery, resultsCount }: { searchQuery: string; resultsCount: number }) {
  if (!searchQuery.trim()) return null

  return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      <span className="text-dark-400">
        {resultsCount > 0 ? `Найдено: ${resultsCount}` : 'Ничего не найдено'}
      </span>
      {resultsCount > 0 && (
        <span className="text-dark-500">по запросу «{searchQuery}»</span>
      )}
    </div>
  )
}
