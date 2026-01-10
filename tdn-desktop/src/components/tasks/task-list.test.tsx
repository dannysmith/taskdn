/**
 * TaskList Component Smoke Tests
 *
 * Minimal tests to verify basic rendering. The complex logic (keyboard navigation,
 * dnd-kit, store interactions) is tested via the underlying store/hook tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import {
  createTestTask,
  resetFactoryCounters,
} from '@/test/helpers/vault'

// Mock the task-dnd-context to avoid DnD complexity
vi.mock('./task-dnd-context', () => ({
  useTaskDragPreview: () => ({
    lastDroppedTaskId: null,
    clearLastDroppedTaskId: vi.fn(),
    crossContainerHover: null,
    clearCrossContainerHover: vi.fn(),
  }),
}))

// Mock stores to avoid side effects
vi.mock('@/store/task-creation-store', () => ({
  useTaskCreationStore: {
    getState: () => ({
      activateList: vi.fn(),
      deactivateList: vi.fn(),
    }),
  },
}))

vi.mock('@/store/task-detail-store', () => ({
  useTaskDetailStore: vi.fn(() => vi.fn()),
}))

// Import after mocks
const { TaskList, DraggableTaskList } = await import('./task-list')

describe('TaskList', () => {
  beforeEach(() => {
    resetFactoryCounters()
  })

  it('renders empty state when no tasks', () => {
    render(
      <TaskList
        tasks={[]}
        projectId="test-project"
        onTasksReorder={vi.fn()}
        onTaskTitleChange={vi.fn()}
        onTaskStatusToggle={vi.fn()}
      />
    )

    expect(screen.getByText('No tasks')).toBeInTheDocument()
  })

  it('renders tasks when provided', () => {
    const tasks = [
      createTestTask({ title: 'First task', status: 'ready' }),
      createTestTask({ title: 'Second task', status: 'in-progress' }),
    ]

    render(
      <TaskList
        tasks={tasks}
        projectId="test-project"
        onTasksReorder={vi.fn()}
        onTaskTitleChange={vi.fn()}
        onTaskStatusToggle={vi.fn()}
      />
    )

    expect(screen.getByText('First task')).toBeInTheDocument()
    expect(screen.getByText('Second task')).toBeInTheDocument()
  })

  it('shows strikethrough for done tasks', () => {
    const tasks = [createTestTask({ title: 'Completed task', status: 'done' })]

    render(
      <TaskList
        tasks={tasks}
        projectId="test-project"
        onTasksReorder={vi.fn()}
        onTaskTitleChange={vi.fn()}
        onTaskStatusToggle={vi.fn()}
      />
    )

    const taskElement = screen.getByText('Completed task')
    expect(taskElement).toHaveClass('line-through')
  })
})

describe('DraggableTaskList', () => {
  beforeEach(() => {
    resetFactoryCounters()
  })

  it('renders empty state when no tasks', () => {
    render(
      <DraggableTaskList
        tasks={[]}
        projectId="test-project"
        onTasksReorder={vi.fn()}
        onTaskTitleChange={vi.fn()}
        onTaskStatusToggle={vi.fn()}
      />
    )

    expect(screen.getByText('No tasks yet')).toBeInTheDocument()
  })

  it('renders tasks with its own DndContext', () => {
    const tasks = [
      createTestTask({ title: 'Standalone task', status: 'ready' }),
    ]

    render(
      <DraggableTaskList
        tasks={tasks}
        projectId="test-project"
        onTasksReorder={vi.fn()}
        onTaskTitleChange={vi.fn()}
        onTaskStatusToggle={vi.fn()}
      />
    )

    expect(screen.getByText('Standalone task')).toBeInTheDocument()
  })
})
