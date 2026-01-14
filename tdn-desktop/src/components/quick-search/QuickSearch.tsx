/**
 * QuickSearch - Fast task search modal (Cmd+P).
 *
 * Provides quick access to any task via fuzzy search. Opens the task in its
 * appropriate view (project, area, or no-area) based on task relationships.
 *
 * Uses cmdk's built-in filtering. Results only shown when user types.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Command as CommandPrimitive } from 'cmdk'
import { SearchIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { useNavigationStore } from '@/store/navigation-store'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { queryClient } from '@/lib/query-client'
import { vaultQueryKeys } from '@/services/vault'
import { getSelectionForTask } from '@/lib/task-navigation'
import type { Task, Project, Area } from '@/lib/tauri-bindings'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'
import { QuickSearchResult } from './QuickSearchResult'
import { resolveProjectName, resolveAreaName } from './utils'

/** Maximum number of results to display */
const MAX_RESULTS = 50

export function QuickSearch() {
  const { t } = useTranslation()
  const quickSearchOpen = useUIStore(state => state.quickSearchOpen)
  const setQuickSearchOpen = useUIStore(state => state.setQuickSearchOpen)
  const [search, setSearch] = useState('')

  // Get data from TanStack Query cache
  const tasks = queryClient.getQueryData<Task[]>(vaultQueryKeys.tasks()) ?? []
  const projects =
    queryClient.getQueryData<Project[]>(vaultQueryKeys.projects()) ?? []
  const areas = queryClient.getQueryData<Area[]>(vaultQueryKeys.areas()) ?? []

  // Sort tasks by updatedAt descending (most recent first)
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
    return dateB - dateA
  })

  // Limit displayed results
  const displayedTasks = sortedTasks.slice(0, MAX_RESULTS)

  // Handle task selection
  const handleSelect = (taskId: string) => {
    const task = sortedTasks.find(t => t.id === taskId)
    if (!task) return

    // Determine correct view and navigate
    const selection = getSelectionForTask(task, projects, areas)
    useNavigationStore.getState().navigate(selection)

    // Open task in detail panel
    useTaskDetailStore.getState().openTask(taskId)

    // Close modal and clear search
    setQuickSearchOpen(false)
    setSearch('')
  }

  // Handle dialog close
  const handleOpenChange = (open: boolean) => {
    setQuickSearchOpen(open)
    if (!open) {
      setSearch('')
    }
  }

  const hasSearch = search.trim().length > 0

  return (
    <Dialog open={quickSearchOpen} onOpenChange={handleOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>{t('quickSearch.title')}</DialogTitle>
        <DialogDescription>{t('quickSearch.description')}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className="rounded-xl! overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <CommandPrimitive
          className={cn(
            'bg-popover text-popover-foreground rounded-xl! p-1 flex size-full flex-col overflow-hidden',
            '[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium',
            '[&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0',
            '[&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3'
          )}
        >
          {/* Search input */}
          <div className="p-1">
            <InputGroup className="bg-input/30 border-input/30 h-8! rounded-lg! shadow-none! *:data-[slot=input-group-addon]:pl-2!">
              <CommandPrimitive.Input
                className="w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={t('quickSearch.placeholder')}
                value={search}
                onValueChange={setSearch}
              />
              <InputGroupAddon>
                <SearchIcon className="size-4 shrink-0 opacity-50" />
              </InputGroupAddon>
            </InputGroup>
          </div>

          {/* Results list - only render when there's a search query */}
          {hasSearch && (
            <CommandPrimitive.List className="no-scrollbar max-h-72 scroll-py-1 outline-none overflow-x-hidden overflow-y-auto">
              <CommandPrimitive.Empty className="py-6 text-center text-sm text-muted-foreground">
                {t('quickSearch.noResults')}
              </CommandPrimitive.Empty>

              <CommandPrimitive.Group className="text-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium">
                {displayedTasks.map(task => (
                  <CommandPrimitive.Item
                    key={task.id}
                    value={task.title}
                    onSelect={() => handleSelect(task.id)}
                    className={cn(
                      'data-selected:bg-muted data-selected:text-foreground',
                      'relative flex cursor-default items-center gap-2 rounded-lg px-2 py-2 text-sm outline-hidden select-none',
                      'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50'
                    )}
                  >
                    <QuickSearchResult
                      task={task}
                      projectName={resolveProjectName(task.project, projects)}
                      areaName={resolveAreaName(task.area, areas)}
                    />
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            </CommandPrimitive.List>
          )}
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  )
}
