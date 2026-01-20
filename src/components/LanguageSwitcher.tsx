import { useTranslation } from 'react-i18next'
import { useState, useRef, useEffect } from 'react'

const languages = [
  { code: 'ru', name: 'RU', flag: '🇷🇺', fullName: 'Русский' },
  { code: 'en', name: 'EN', flag: '🇬🇧', fullName: 'English' },
  { code: 'zh', name: 'ZH', flag: '🇨🇳', fullName: '中文' },
  { code: 'fa', name: 'FA', flag: '🇮🇷', fullName: 'فارسی' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code)
    // Set document direction for RTL languages
    document.documentElement.dir = code === 'fa' ? 'rtl' : 'ltr'
    setIsOpen(false)
  }

  // Set initial direction on mount
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'fa' ? 'rtl' : 'ltr'
  }, [i18n.language])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-dark-700/50 hover:border-dark-600 bg-dark-800/50 hover:bg-dark-700 transition-all text-sm"
        aria-label="Change language"
      >
        <span>{currentLang.flag}</span>
        <span className="font-medium text-dark-200">{currentLang.name}</span>
        <svg
          className={`w-3.5 h-3.5 text-dark-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-dark-800 rounded-xl shadow-lg border border-dark-700/50 py-1 z-50 animate-fade-in">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                lang.code === i18n.language
                  ? 'bg-accent-500/10 text-accent-400'
                  : 'text-dark-300 hover:bg-dark-700/50'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.fullName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
