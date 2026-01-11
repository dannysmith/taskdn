import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/store/ui-store'
import { useCommandContext } from '@/hooks/use-command-context'
import { getAllCommands, executeCommand, getCommandLabel } from '@/lib/commands'
import { formatForDisplay } from '@/lib/shortcuts'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command'

/** Order in which groups should appear in the palette */
const GROUP_ORDER = [
  'navigation',
  'areas',
  'projects',
  'tasks',
  'view',
  'settings',
  'help',
  'app',
  'other',
]

export function CommandPalette() {
  const { t } = useTranslation()
  const commandPaletteOpen = useUIStore(state => state.commandPaletteOpen)
  const setCommandPaletteOpen = useUIStore(state => state.setCommandPaletteOpen)
  const commandContext = useCommandContext()
  const [search, setSearch] = useState('')

  // Get all available commands and filter by surfaces.commandPalette
  const allCommands = getAllCommands(commandContext, search, t)
  const commands = allCommands.filter(
    cmd => cmd.surfaces?.commandPalette !== false
  )

  // Group commands by category
  const commandGroups = commands.reduce(
    (groups, command) => {
      const group = command.group || 'other'
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(command)
      return groups
    },
    {} as Record<string, typeof commands>
  )

  // Sort groups by defined order
  const sortedGroups = Object.entries(commandGroups).sort(([a], [b]) => {
    const aIndex = GROUP_ORDER.indexOf(a)
    const bIndex = GROUP_ORDER.indexOf(b)
    // Put unknown groups at the end
    const aOrder = aIndex === -1 ? 999 : aIndex
    const bOrder = bIndex === -1 ? 999 : bIndex
    return aOrder - bOrder
  })

  // Handle command execution
  const handleCommandSelect = async (commandId: string) => {
    setCommandPaletteOpen(false)
    setSearch('') // Clear search when closing

    const result = await executeCommand(commandId, commandContext)

    if (!result.success && result.error) {
      commandContext.showToast(result.error, 'error')
    }
  }

  // Handle dialog open/close with search clearing
  const handleOpenChange = (open: boolean) => {
    setCommandPaletteOpen(open)
    if (!open) {
      setSearch('') // Clear search when closing
    }
  }

  // Helper function to get readable group labels
  const getGroupLabel = (groupName: string): string => {
    const key = `commands.group.${groupName}`
    const translated = t(key)
    // If translation exists, use it; otherwise capitalize the group name
    return translated !== key
      ? translated
      : groupName.charAt(0).toUpperCase() + groupName.slice(1)
  }

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={handleOpenChange}
      title={t('commandPalette.title')}
      description={t('commandPalette.placeholder')}
      className="sm:max-w-xl"
    >
      <CommandInput
        placeholder={t('commandPalette.placeholder')}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>{t('commandPalette.noResults')}</CommandEmpty>

        {sortedGroups.map(([groupName, groupCommands]) => (
          <CommandGroup key={groupName} heading={getGroupLabel(groupName)}>
            {groupCommands.map(command => (
              <CommandItem
                key={command.id}
                value={command.id}
                onSelect={() => handleCommandSelect(command.id)}
              >
                {command.icon && (
                  <command.icon className="mr-2 h-4 w-4 shrink-0" />
                )}
                <span className="min-w-40 truncate">
                  {getCommandLabel(command, t)}
                </span>
                {command.descriptionKey && (
                  <span className="flex-1 truncate text-xs text-muted-foreground">
                    {t(command.descriptionKey)}
                  </span>
                )}
                {command.shortcut && (
                  <CommandShortcut>
                    {formatForDisplay(command.shortcut)}
                  </CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
