import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { TagInput, type Tag } from '@/components/ui/tag-input'
import { ShortcutPicker } from '../ShortcutPicker'
import { SettingsField, SettingsSection } from '../shared/SettingsComponents'
import { FolderPicker } from '../shared/FolderPicker'
import { usePreferences, useSavePreferences } from '@/services/preferences'
import { commands } from '@/lib/tauri-bindings'
import { logger } from '@/lib/logger'

export function GeneralPane() {
  const { t } = useTranslation()

  // Load preferences for keyboard shortcuts and vault directories
  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()

  // Get the default shortcut from the backend
  const { data: defaultShortcut } = useQuery({
    queryKey: ['default-quick-pane-shortcut'],
    queryFn: async () => {
      return await commands.getDefaultQuickPaneShortcut()
    },
    staleTime: Infinity,
  })

  // Check if running in dev mode
  const { data: isDevMode } = useQuery({
    queryKey: ['is-dev-mode'],
    queryFn: () => commands.isDevMode(),
    staleTime: Infinity,
  })

  const handleShortcutChange = async (newShortcut: string | null) => {
    if (!preferences) return

    const oldShortcut = preferences.quick_pane_shortcut

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
        quick_pane_shortcut: newShortcut,
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

  // Directory path handler factory
  const createDirChangeHandler =
    (field: 'tasks_dir' | 'areas_dir' | 'projects_dir') =>
    (path: string | null) => {
      if (!preferences) return
      savePreferences.mutate(
        { ...preferences, [field]: path },
        { onError: () => toast.error(t('toast.error.generic')) }
      )
    }

  // Read from CLI config
  const handleReadFromCli = async () => {
    if (!preferences) return

    const result = await commands.readCliConfig()

    if (result.status === 'error') {
      if (result.error.type === 'FileNotFound') {
        toast.info(t('preferences.general.cliNotConfigured'))
      } else {
        toast.error(t('toast.error.cliConfigRead'), {
          description:
            'message' in result.error ? result.error.message : undefined,
        })
      }
      return
    }

    const cliConfig = result.data
    savePreferences.mutate({
      ...preferences,
      tasks_dir: cliConfig.tasksDir ?? preferences.tasks_dir,
      areas_dir: cliConfig.areasDir ?? preferences.areas_dir,
      projects_dir: cliConfig.projectsDir ?? preferences.projects_dir,
      ignore: cliConfig.ignore ?? preferences.ignore,
    })

    toast.success(t('toast.success.pathsImported'))
  }

  // Use dummy vault (dev only)
  const handleUseDummyVault = async () => {
    if (!preferences) return

    const result = await commands.getDummyVaultPaths()
    savePreferences.mutate({
      ...preferences,
      tasks_dir: result.tasks_dir,
      areas_dir: result.areas_dir,
      projects_dir: result.projects_dir,
    })

    toast.success(t('toast.success.dummyVaultSet'))
  }

  // Handle ignore patterns change
  const handleIgnoreChange = (tags: Tag[]) => {
    if (!preferences) return

    // Normalize tags: trim whitespace, remove empty strings, deduplicate
    const normalized = [
      ...new Set(
        tags.map(tag => tag.text.trim()).filter(text => text.length > 0)
      ),
    ]

    savePreferences.mutate(
      {
        ...preferences,
        ignore: normalized.length > 0 ? normalized : null,
      },
      { onError: () => toast.error(t('toast.error.generic')) }
    )
  }

  return (
    <div className="space-y-6">
      <SettingsSection title={t('preferences.general.keyboardShortcuts')}>
        <SettingsField
          label={t('preferences.general.quickPaneShortcut')}
          description={t('preferences.general.quickPaneShortcutDescription')}
        >
          <ShortcutPicker
            value={preferences?.quick_pane_shortcut ?? null}
            defaultValue={defaultShortcut ?? 'CommandOrControl+Shift+.'}
            onChange={handleShortcutChange}
            disabled={!preferences || savePreferences.isPending}
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection title={t('preferences.general.vaultDirectories')}>
        <SettingsField
          label={t('preferences.general.tasksDir')}
          description={t('preferences.general.tasksDirDescription')}
        >
          <FolderPicker
            value={preferences?.tasks_dir ?? null}
            onChange={createDirChangeHandler('tasks_dir')}
            disabled={!preferences || savePreferences.isPending}
          />
        </SettingsField>

        <SettingsField
          label={t('preferences.general.areasDir')}
          description={t('preferences.general.areasDirDescription')}
        >
          <FolderPicker
            value={preferences?.areas_dir ?? null}
            onChange={createDirChangeHandler('areas_dir')}
            disabled={!preferences || savePreferences.isPending}
          />
        </SettingsField>

        <SettingsField
          label={t('preferences.general.projectsDir')}
          description={t('preferences.general.projectsDirDescription')}
        >
          <FolderPicker
            value={preferences?.projects_dir ?? null}
            onChange={createDirChangeHandler('projects_dir')}
            disabled={!preferences || savePreferences.isPending}
          />
        </SettingsField>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleReadFromCli}
            disabled={!preferences || savePreferences.isPending}
          >
            {t('preferences.general.readFromCli')}
          </Button>
          {isDevMode && (
            <Button
              variant="outline"
              onClick={handleUseDummyVault}
              disabled={!preferences || savePreferences.isPending}
            >
              {t('preferences.general.useDummyVault')}
            </Button>
          )}
        </div>
      </SettingsSection>

      <SettingsSection title={t('preferences.general.ignorePatterns')}>
        <SettingsField
          label={t('preferences.general.ignorePatterns')}
          description={t('preferences.general.ignorePatternsDescription')}
        >
          <TagInput
            tags={(preferences?.ignore ?? []).map(pattern => ({
              id: pattern,
              text: pattern,
            }))}
            onTagsChange={handleIgnoreChange}
            placeholder={t('preferences.general.ignorePatternsPlaceholder')}
            disabled={!preferences || savePreferences.isPending}
            allowDuplicates={false}
          />
        </SettingsField>
      </SettingsSection>
    </div>
  )
}
