import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface SettingsFieldProps {
  label: string
  children: ReactNode
  description?: string
}

interface SettingsSectionProps {
  title: string
  children: ReactNode
}

interface PaneInfoProps {
  children: ReactNode
}

/**
 * An info callout box displayed at the top of preference panes.
 * Provides context about what the pane contains.
 */
export function PaneInfo({ children }: PaneInfoProps) {
  return (
    <div className="flex gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 text-sm text-muted-foreground">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <p className="leading-relaxed">{children}</p>
    </div>
  )
}

export function SettingsField({
  label,
  children,
  description,
}: SettingsFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

/**
 * A settings field variant with the control inline on the right.
 * Ideal for toggles/switches where label and control should be on the same row.
 */
export function SettingsFieldInline({
  label,
  children,
  description,
}: SettingsFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {children}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        <Separator className="mt-2" />
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
