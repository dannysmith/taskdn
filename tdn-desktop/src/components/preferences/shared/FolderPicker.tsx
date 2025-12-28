import { useTranslation } from 'react-i18next'
import { open } from '@tauri-apps/plugin-dialog'
import { X, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface FolderPickerProps {
  value: string | null
  onChange: (path: string | null) => void
  placeholder?: string
  disabled?: boolean
}

export function FolderPicker({
  value,
  onChange,
  placeholder,
  disabled,
}: FolderPickerProps) {
  const { t } = useTranslation()

  const handleChoose = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: value ?? undefined,
    })
    if (selected && typeof selected === 'string') {
      onChange(selected)
    }
  }

  const handleClear = () => onChange(null)

  return (
    <div className="flex gap-2">
      <Input
        value={value ?? ''}
        placeholder={placeholder ?? t('preferences.general.notConfigured')}
        disabled
        className="flex-1 font-mono text-sm"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleChoose}
        disabled={disabled}
      >
        <Folder className="h-4 w-4 me-1" />
        {t('preferences.general.choose')}
      </Button>
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
