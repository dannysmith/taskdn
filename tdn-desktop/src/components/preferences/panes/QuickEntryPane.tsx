import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShortcutPicker } from '../ShortcutPicker'
import {
  PaneInfo,
  SettingsField,
  SettingsSection,
} from '../shared/SettingsComponents'
import {
  preferencesQueryKeys,
  usePreferences,
  useSavePreferences,
} from '@/services/preferences'
import { commands } from '@/lib/tauri-bindings'
import { logger } from '@/lib/logger'
import { Kbd, KbdGroup } from '@/components/ui/kbd'

export function QuickEntryPane() {
  const { t } = useTranslation()

  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()

  // Get the default shortcut from the backend
  const { data: defaultShortcut } = useQuery({
    queryKey: preferencesQueryKeys.defaultQuickPaneShortcut(),
    queryFn: async () => {
      return await commands.getDefaultQuickPaneShortcut()
    },
    staleTime: Infinity,
  })

  const handleShortcutChange = async (newShortcut: string | null) => {
    if (!preferences) return

    const oldShortcut = preferences.quickPaneShortcut

    logger.info('Updating quick pane shortcut', { oldShortcut, newShortcut })

    const result = await commands.updateQuickPaneShortcut(newShortcut)

    if (result.status === 'error') {
      logger.error('Failed to register shortcut', { error: result.error })
      toast.error(t('toast.error.shortcutFailed'), {
        description: result.error,
      })
      return
    }

    try {
      await savePreferences.mutateAsync({
        ...preferences,
        quickPaneShortcut: newShortcut,
      })
    } catch {
      logger.warn('Save failed, rolling back shortcut registration', {
        oldShortcut,
        newShortcut,
      })

      const rollbackResult = await commands.updateQuickPaneShortcut(oldShortcut)

      if (rollbackResult.status === 'error') {
        logger.error(
          'Rollback failed - backend and preferences are out of sync',
          {
            error: rollbackResult.error,
            attemptedShortcut: newShortcut,
            originalShortcut: oldShortcut,
          }
        )
        toast.error(t('toast.error.shortcutRestoreFailed'), {
          description: t('toast.error.shortcutRestoreDescription'),
        })
      } else {
        logger.info('Successfully rolled back shortcut registration')
      }
    }
  }

  return (
    <div className="space-y-6">
      <PaneInfo>{t('preferences.quickEntry.info')}</PaneInfo>

      <SettingsSection title={t('preferences.quickEntry.keyboardShortcuts')}>
        <SettingsField
          label={t('preferences.quickEntry.quickPaneShortcut')}
          description={t('preferences.quickEntry.quickPaneShortcutDescription')}
        >
          <ShortcutPicker
            value={preferences?.quickPaneShortcut ?? null}
            defaultValue={defaultShortcut ?? 'CommandOrControl+Shift+.'}
            onChange={handleShortcutChange}
            disabled={!preferences || savePreferences.isPending}
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection title={t('preferences.quickEntry.paneShortcuts')}>
        <div className="text-sm text-muted-foreground space-y-3">
          <p>{t('preferences.quickEntry.paneShortcutsIntro')}</p>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 items-center">
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>Enter</Kbd>
            </KbdGroup>
            <span>{t('preferences.quickEntry.shortcutSave')}</span>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>⇧</Kbd>
              <Kbd>Enter</Kbd>
            </KbdGroup>
            <span>{t('preferences.quickEntry.shortcutToggleNotes')}</span>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>T</Kbd>
            </KbdGroup>
            <span>{t('preferences.quickEntry.shortcutToday')}</span>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>D</Kbd>
            </KbdGroup>
            <span>{t('preferences.quickEntry.shortcutScheduled')}</span>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>⇧</Kbd>
              <Kbd>D</Kbd>
            </KbdGroup>
            <span>{t('preferences.quickEntry.shortcutDue')}</span>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>S</Kbd>
            </KbdGroup>
            <span>{t('preferences.quickEntry.shortcutStatus')}</span>
            <Kbd>Esc</Kbd>
            <span>{t('preferences.quickEntry.shortcutDismiss')}</span>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}
