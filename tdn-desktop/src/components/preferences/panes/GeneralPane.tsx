import { useTranslation } from 'react-i18next'
import { locale } from '@tauri-apps/plugin-os'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/hooks/use-theme'
import {
  PaneInfo,
  SettingsField,
  SettingsFieldInline,
  SettingsSection,
} from '../shared/SettingsComponents'
import { usePreferences, useSavePreferences } from '@/services/preferences'
import { availableLanguages } from '@/i18n'
import { logger } from '@/lib/logger'

// Language display names (native names)
const languageNames: Record<string, string> = {
  en: 'English',
}

export function GeneralPane() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()

  // Appearance handlers
  const handleThemeChange = (value: 'light' | 'dark' | 'system' | null) => {
    if (!value) return
    // Update the theme provider immediately for instant UI feedback
    setTheme(value)

    // Persist the theme preference to disk, preserving other preferences
    if (preferences) {
      savePreferences.mutate({ ...preferences, theme: value })
    }
  }

  const handleLanguageChange = async (value: string | null) => {
    if (!value) return
    const language = value === 'system' ? null : value

    try {
      // Change the language immediately for instant UI feedback
      if (language) {
        await i18n.changeLanguage(language)
      } else {
        // System language selected - detect and apply system locale
        const systemLocale = await locale()
        const langCode = systemLocale?.split('-')[0]?.toLowerCase() ?? 'en'
        const targetLang = availableLanguages.includes(langCode)
          ? langCode
          : 'en'
        await i18n.changeLanguage(targetLang)
      }
    } catch (error) {
      logger.error('Failed to change language', { error })
      toast.error(t('toast.error.generic'))
      return
    }

    // Persist the language preference to disk
    if (preferences) {
      savePreferences.mutate({ ...preferences, language })
    }
  }

  // Feature settings handlers
  const handleObsidianToggle = (checked: boolean) => {
    if (!preferences) return
    savePreferences.mutate(
      { ...preferences, showObsidianFeatures: checked ? true : null },
      { onError: () => toast.error(t('toast.error.generic')) }
    )
  }

  const handlePermanentDeleteToggle = (checked: boolean) => {
    if (!preferences) return
    savePreferences.mutate(
      { ...preferences, permanentDeleteTasks: checked ? true : null },
      { onError: () => toast.error(t('toast.error.generic')) }
    )
  }

  // Determine the current language value for the select
  const currentLanguageValue = preferences?.language ?? 'system'

  // Get display labels for selected values
  const getLanguageLabel = (value: string) => {
    if (value === 'system') return t('preferences.appearance.language.system')
    return languageNames[value] ?? value
  }

  const getThemeLabel = (value: string) => {
    if (value === 'light') return t('preferences.appearance.theme.light')
    if (value === 'dark') return t('preferences.appearance.theme.dark')
    return t('preferences.appearance.theme.system')
  }

  return (
    <div className="space-y-6">
      <PaneInfo>{t('preferences.general.info')}</PaneInfo>

      <SettingsSection title={t('preferences.general.appearance')}>
        <SettingsField
          label={t('preferences.appearance.language')}
          description={t('preferences.appearance.languageDescription')}
        >
          <Select
            value={currentLanguageValue}
            onValueChange={handleLanguageChange}
            disabled={savePreferences.isPending}
          >
            <SelectTrigger>
              <SelectValue>
                {getLanguageLabel(currentLanguageValue)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">
                {t('preferences.appearance.language.system')}
              </SelectItem>
              {availableLanguages.map(lang => (
                <SelectItem key={lang} value={lang}>
                  {languageNames[lang] ?? lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsField>

        <SettingsField
          label={t('preferences.appearance.colorTheme')}
          description={t('preferences.appearance.colorThemeDescription')}
        >
          <Select
            value={theme}
            onValueChange={handleThemeChange}
            disabled={savePreferences.isPending}
          >
            <SelectTrigger>
              <SelectValue>{getThemeLabel(theme)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                {t('preferences.appearance.theme.light')}
              </SelectItem>
              <SelectItem value="dark">
                {t('preferences.appearance.theme.dark')}
              </SelectItem>
              <SelectItem value="system">
                {t('preferences.appearance.theme.system')}
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingsField>
      </SettingsSection>

      <SettingsSection title={t('preferences.general.featureSettings')}>
        <SettingsFieldInline
          label={t('preferences.general.showObsidianFeatures')}
          description={t('preferences.general.showObsidianFeaturesDescription')}
        >
          <Switch
            checked={preferences?.showObsidianFeatures === true}
            onCheckedChange={handleObsidianToggle}
            disabled={!preferences || savePreferences.isPending}
          />
        </SettingsFieldInline>

        <SettingsFieldInline
          label={t('preferences.general.permanentDelete')}
          description={t('preferences.general.permanentDeleteDescription')}
        >
          <Switch
            checked={preferences?.permanentDeleteTasks === true}
            onCheckedChange={handlePermanentDeleteToggle}
            disabled={!preferences || savePreferences.isPending}
          />
        </SettingsFieldInline>
      </SettingsSection>
    </div>
  )
}
