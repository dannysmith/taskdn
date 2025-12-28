import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getVersion } from '@tauri-apps/api/app'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { Button } from '@/components/ui/button'
import { SettingsField, SettingsSection } from '../shared/SettingsComponents'
import { commands } from '@/lib/tauri-bindings'

export function AdvancedPane() {
  const { t } = useTranslation()

  const { data: appVersion } = useQuery({
    queryKey: ['app-version'],
    queryFn: getVersion,
    staleTime: Infinity,
  })

  const handleOpenSettingsDir = async () => {
    const result = await commands.getAppDataDir()
    if (result.status === 'ok') {
      await revealItemInDir(result.data)
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection title={t('preferences.advanced.about')}>
        <SettingsField label={t('preferences.advanced.version')}>
          <span className="text-sm text-muted-foreground font-mono">
            {appVersion ?? '...'}
          </span>
        </SettingsField>
      </SettingsSection>

      <SettingsSection title={t('preferences.advanced.settingsAndRecovery')}>
        <SettingsField
          label={t('preferences.advanced.openSettingsDir')}
          description={t('preferences.advanced.openSettingsDirDescription')}
        >
          <Button variant="outline" onClick={handleOpenSettingsDir}>
            {t('preferences.advanced.openSettingsDir')}
          </Button>
        </SettingsField>
      </SettingsSection>
    </div>
  )
}
