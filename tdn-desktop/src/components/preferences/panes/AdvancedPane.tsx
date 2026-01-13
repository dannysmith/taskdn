import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getVersion } from '@tauri-apps/api/app'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PaneInfo } from '../shared/SettingsComponents'
import { commands } from '@/lib/tauri-bindings'
import { logger } from '@/lib/logger'

const DOCS_URL = 'https://tdn.danny.is'
const GITHUB_URL = 'https://github.com/dannysmith/taskdn'

export function AdvancedPane() {
  const { t } = useTranslation()

  const { data: appVersion } = useQuery({
    queryKey: ['app-version'],
    queryFn: getVersion,
    staleTime: Infinity,
  })

  const handleOpenSettingsDir = async () => {
    const result = await commands.openAppDataDir()
    if (result.status === 'error') {
      logger.error('Failed to open settings directory', { error: result.error })
      toast.error(t('toast.error.generic'))
    }
  }

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      <PaneInfo>{t('preferences.advanced.info')}</PaneInfo>

      {/* About Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">
            {t('preferences.advanced.about')}
          </h3>
          <Separator className="mt-2" />
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              {t('preferences.advanced.version')}
            </p>
            <p className="text-sm text-muted-foreground font-mono">
              {appVersion ?? '...'}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenLink(DOCS_URL)}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {t('preferences.advanced.websiteAndDocs')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenLink(GITHUB_URL)}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              GitHub
            </Button>
          </div>
        </div>
      </div>

      {/* Settings & Recovery Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">
            {t('preferences.advanced.settingsAndRecovery')}
          </h3>
          <Separator className="mt-2" />
        </div>

        <Button variant="outline" size="sm" onClick={handleOpenSettingsDir}>
          {t('preferences.advanced.openSettingsDir')}
        </Button>
      </div>
    </div>
  )
}
