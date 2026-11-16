'use client'

import * as React from 'react'
import { GripVerticalIcon } from 'lucide-react'
import { Group, Panel, Separator } from 'react-resizable-panels'

import { cn } from '@/lib/utils'

interface ResizablePanelGroupProps extends Omit<
  React.ComponentProps<typeof Group>,
  'orientation'
> {
  direction?: 'horizontal' | 'vertical'
}

/**
 * Sizes on the panels inside follow react-resizable-panels v4: numbers are
 * pixels, unitless strings are percentages ('20' or '20%').
 */
function ResizablePanelGroup({
  className,
  direction = 'horizontal',
  ...props
}: ResizablePanelGroupProps) {
  return (
    <Group
      data-slot="resizable-panel-group"
      orientation={direction}
      className={cn('flex h-full w-full', className)}
      {...props}
    />
  )
}

function ResizablePanel(props: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) {
  // aria-orientation describes the separator, not the group: a vertical group
  // has horizontal separators, so the "vertical group" styles key off
  // aria-orientation=horizontal
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        'bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90',
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </Separator>
  )
}

export type { PanelImperativeHandle } from 'react-resizable-panels'
export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
