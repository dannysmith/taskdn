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
import { commands } from '@/lib/tauri-bindings'

export function VaultPane() {
  const { t } = useTranslation()

  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()

  // Check if running in dev mode
  const { data: isDevMode } = useQuery({
    queryKey: preferencesQueryKeys.devMode(),
    queryFn: () => commands.isDevMode(),
    staleTime: Infinity,
  })

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
      <PaneInfo>{t('preferences.vault.info')}</PaneInfo>

      <SettingsSection title={t('preferences.vault.directories')}>
        <SettingsField
          label={t('preferences.vault.tasksDir')}
          description={t('preferences.vault.tasksDirDescription')}
        >
          <FolderPicker
            value={preferences?.tasks_dir ?? null}
            onChange={createDirChangeHandler('tasks_dir')}
            disabled={!preferences || savePreferences.isPending}
          />
        </SettingsField>

        <SettingsField
          label={t('preferences.vault.areasDir')}
          description={t('preferences.vault.areasDirDescription')}
        >
          <FolderPicker
            value={preferences?.areas_dir ?? null}
            onChange={createDirChangeHandler('areas_dir')}
            disabled={!preferences || savePreferences.isPending}
          />
        </SettingsField>

        <SettingsField
          label={t('preferences.vault.projectsDir')}
          description={t('preferences.vault.projectsDirDescription')}
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
            {t('preferences.vault.readFromCli')}
          </Button>
          {isDevMode && (
            <Button
              variant="outline"
              onClick={handleUseDummyVault}
              disabled={!preferences || savePreferences.isPending}
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
          disabled={!preferences || savePreferences.isPending}
          allowDuplicates={false}
        />
      </SettingsField>
    </div>
  )
}
