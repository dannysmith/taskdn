import { cn } from '@/lib/utils'
import { TaskDetailPanel } from '@/components/tasks/task-detail-panel'

interface RightSideBarProps {
  className?: string
}

export function RightSideBar({ className }: RightSideBarProps) {
  return (
    <div
      className={cn('flex h-full flex-col border-l bg-background', className)}
    >
      <TaskDetailPanel />
    </div>
  )
}
