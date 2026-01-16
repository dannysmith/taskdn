import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { TagInput, type Tag } from '@/components/ui/tag-input'
import {
  PaneInfo,
  SettingsField,
  SettingsSection,
} from '../shared/SettingsComponents'
import { FolderPicker } from '../shared/FolderPicker'
import {
  preferencesQueryKeys,
  usePreferences,
  useSavePreferences,
} from '@/services/preferences'
import { commands, type AppPreferences } from '@/lib/tauri-bindings'
import { reinitializeVault, vaultConfigChanged } from '@/services/vault'
import { logger } from '@/lib/logger'

export function VaultPane() {
  const { t } = useTranslation()

  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()

  // Track whether we need to reinitialize after save
  const [isReinitializing, setIsReinitializing] = useState(false)

  // Check if running in dev mode
  const { data: isDevMode } = useQuery({
    queryKey: preferencesQueryKeys.devMode(),
    queryFn: () => commands.isDevMode(),
    staleTime: Infinity,
  })

  // Handler that saves preferences and reinitializes vault if paths changed
  // Returns true if successful, false if error (for callers to handle toasts)
  const saveAndReinitialize = async (
    newPreferences: AppPreferences
  ): Promise<boolean> => {
    const configChanged = vaultConfigChanged(preferences, newPreferences)

    try {
      // Save preferences first
      await savePreferences.mutateAsync(newPreferences)

      // If vault config changed and all paths are configured, reinitialize
      if (
        configChanged &&
        newPreferences.tasksDir &&
        newPreferences.areasDir &&
        newPreferences.projectsDir
      ) {
        setIsReinitializing(true)
        try {
          await reinitializeVault(
            newPreferences.tasksDir,
            newPreferences.projectsDir,
            newPreferences.areasDir,
            newPreferences.ignore ?? null
          )
        } catch (error) {
          logger.error('Failed to reinitialize vault', { error })
          toast.error(t('toast.error.vaultReinitialize'))
          return false
        } finally {
          setIsReinitializing(false)
        }
      }
      return true
    } catch (error) {
      // Save preferences failed - error already shown by useSavePreferences
      logger.error('Failed to save preferences', { error })
      return false
    }
  }

  // Directory path handlers - fire-and-forget with internal error handling
  // FolderPicker's onChange is synchronous, so we don't await
  const createDirChangeHandler =
    (field: 'tasksDir' | 'areasDir' | 'projectsDir') =>
    (path: string | null) => {
      if (!preferences) return
      // Don't await - saveAndReinitialize handles its own errors
      void saveAndReinitialize({ ...preferences, [field]: path })
    }

  // Read from CLI config
  const handleReadFromCli = async () => {
    if (!preferences) return

    const result = await commands.readCliConfig()

    if (result.status === 'error') {
      if (result.error.type === 'FileNotFound') {
        toast.info(t('preferences.vault.cliNotConfigured'))
      } else {
        toast.error(t('toast.error.cliConfigRead'), {
          description:
            'message' in result.error ? result.error.message : undefined,
        })
      }
      return
    }

    const cliConfig = result.data
    const success = await saveAndReinitialize({
      ...preferences,
      tasksDir: cliConfig.tasksDir ?? preferences.tasksDir,
      areasDir: cliConfig.areasDir ?? preferences.areasDir,
      projectsDir: cliConfig.projectsDir ?? preferences.projectsDir,
      ignore: cliConfig.ignore ?? preferences.ignore,
    })
    if (success) {
      toast.success(t('toast.success.pathsImported'))
    }
  }

  // Use dummy vault (dev only)
  const handleUseDummyVault = async () => {
    if (!preferences) return

    const result = await commands.getDummyVaultPaths()
    const success = await saveAndReinitialize({
      ...preferences,
      tasksDir: result.tasksDir,
      areasDir: result.areasDir,
      projectsDir: result.projectsDir,
    })
    if (success) {
      toast.success(t('toast.success.dummyVaultSet'))
    }
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

    void saveAndReinitialize({
      ...preferences,
      ignore: normalized.length > 0 ? normalized : null,
    })
  }

  // Disable inputs while reinitializing
  const isDisabled =
    !preferences || savePreferences.isPending || isReinitializing

  return (
    <div className="space-y-6">
      <PaneInfo>{t('preferences.vault.info')}</PaneInfo>

      <SettingsSection title={t('preferences.vault.directories')}>
        <SettingsField
          label={t('preferences.vault.tasksDir')}
          description={t('preferences.vault.tasksDirDescription')}
        >
          <FolderPicker
            value={preferences?.tasksDir ?? null}
            onChange={createDirChangeHandler('tasksDir')}
            disabled={isDisabled}
          />
        </SettingsField>

        <SettingsField
          label={t('preferences.vault.areasDir')}
          description={t('preferences.vault.areasDirDescription')}
        >
          <FolderPicker
            value={preferences?.areasDir ?? null}
            onChange={createDirChangeHandler('areasDir')}
            disabled={isDisabled}
          />
        </SettingsField>

        <SettingsField
          label={t('preferences.vault.projectsDir')}
          description={t('preferences.vault.projectsDirDescription')}
        >
          <FolderPicker
            value={preferences?.projectsDir ?? null}
            onChange={createDirChangeHandler('projectsDir')}
            disabled={isDisabled}
          />
        </SettingsField>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleReadFromCli}
            disabled={isDisabled}
          >
            {t('preferences.vault.readFromCli')}
          </Button>
          {isDevMode && (
            <Button
              variant="outline"
              onClick={handleUseDummyVault}
              disabled={isDisabled}
            >
              {t('preferences.vault.useDummyVault')}
            </Button>
          )}
        </div>
      </SettingsSection>

      <SettingsField
        label={t('preferences.general.ignorePatterns')}
        description={t('preferences.vault.ignorePatternsDescription')}
      >
        <TagInput
          tags={(preferences?.ignore ?? []).map(pattern => ({
            id: pattern,
            text: pattern,
          }))}
          onTagsChange={handleIgnoreChange}
          placeholder={t('preferences.vault.ignorePatternsPlaceholder')}
          disabled={isDisabled}
          allowDuplicates={false}
        />
      </SettingsField>
    </div>
  )
}
