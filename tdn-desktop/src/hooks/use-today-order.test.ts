import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTodayOrder, type TodaySectionId } from './use-today-order'
import { useDisplayOrderStore } from '@/store/display-order-store'
import { toHeadingId } from '@/types/headings'
import { createTestTask, resetFactoryCounters } from '@/test/helpers/vault'
import type { Task } from '@/lib/tauri-bindings'

// Mock crypto.randomUUID for deterministic heading IDs
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(),
})

describe('useTodayOrder', () => {
  let uuidCounter = 0

  beforeEach(() => {
    useDisplayOrderStore.setState({
      sidebarAreaOrder: null,
      sidebarProjectOrder: null,
      inboxOrder: null,
      projectTaskOrder: null,
      areaTaskOrder: null,
      todaySectionOrder: null,
      todayHeadings: null,
      kanbanColumnOrder: null,
    })
    resetFactoryCounters()
    uuidCounter = 0
    vi.mocked(crypto.randomUUID).mockImplementation(
      () =>
        `heading-${++uuidCounter}` as `${string}-${string}-${string}-${string}-${string}`
    )
  })

  const createSections = (overrides?: {
    scheduledToday?: Task[]
    overdueOrDueToday?: Task[]
    becameAvailableToday?: Task[]
  }) => ({
    scheduledToday: overrides?.scheduledToday ?? [],
    overdueOrDueToday: overrides?.overdueOrDueToday ?? [],
    becameAvailableToday: overrides?.becameAvailableToday ?? [],
  })

  describe('getOrderedTasks', () => {
    it('returns natural order when no stored order exists', () => {
      const task1 = createTestTask({ id: 'task-1' })
      const task2 = createTestTask({ id: 'task-2' })
      const sections = createSections({
        scheduledToday: [task1, task2],
      })

      const { result } = renderHook(() => useTodayOrder(sections))
      const orderedTasks = result.current.getOrderedTasks('scheduled-today')

      expect(orderedTasks.map(t => t.id)).toEqual(['task-1', 'task-2'])
    })

    it('returns stored order for a section', () => {
      const task1 = createTestTask({ id: 'task-1' })
      const task2 = createTestTask({ id: 'task-2' })
      const sections = createSections({
        scheduledToday: [task1, task2],
      })

      useDisplayOrderStore.setState({
        todaySectionOrder: {
          'scheduled-today': ['task-2', 'task-1'],
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))
      const orderedTasks = result.current.getOrderedTasks('scheduled-today')

      expect(orderedTasks.map(t => t.id)).toEqual(['task-2', 'task-1'])
    })

    it('filters out headings from result', () => {
      const task1 = createTestTask({ id: 'task-1' })
      const task2 = createTestTask({ id: 'task-2' })
      const sections = createSections({
        scheduledToday: [task1, task2],
      })

      useDisplayOrderStore.setState({
        todaySectionOrder: {
          'scheduled-today': [toHeadingId('h1'), 'task-1', 'task-2'],
        },
        todayHeadings: {
          h1: { id: 'h1', title: 'Morning', color: 'blue' },
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))
      const orderedTasks = result.current.getOrderedTasks('scheduled-today')

      // Should only return tasks, not headings
      expect(orderedTasks.map(t => t.id)).toEqual(['task-1', 'task-2'])
    })

    it('filters out deleted tasks', () => {
      const task1 = createTestTask({ id: 'task-1' })
      const sections = createSections({
        scheduledToday: [task1], // task-2 removed
      })

      useDisplayOrderStore.setState({
        todaySectionOrder: {
          'scheduled-today': ['task-2', 'task-1'],
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))
      const orderedTasks = result.current.getOrderedTasks('scheduled-today')

      expect(orderedTasks.map(t => t.id)).toEqual(['task-1'])
    })

    it('appends new tasks to end', () => {
      const task1 = createTestTask({ id: 'task-1' })
      const task2 = createTestTask({ id: 'task-2' })
      const task3 = createTestTask({ id: 'task-3' }) // New task
      const sections = createSections({
        scheduledToday: [task1, task2, task3],
      })

      useDisplayOrderStore.setState({
        todaySectionOrder: {
          'scheduled-today': ['task-2', 'task-1'],
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))
      const orderedTasks = result.current.getOrderedTasks('scheduled-today')

      expect(orderedTasks.map(t => t.id)).toEqual([
        'task-2',
        'task-1',
        'task-3',
      ])
    })
  })

  describe('getOrderedItems', () => {
    it('returns both tasks and headings with type info', () => {
      const task1 = createTestTask({ id: 'task-1' })
      const task2 = createTestTask({ id: 'task-2' })
      const sections = createSections({
        scheduledToday: [task1, task2],
      })

      useDisplayOrderStore.setState({
        todaySectionOrder: {
          'scheduled-today': [toHeadingId('h1'), 'task-1', 'task-2'],
        },
        todayHeadings: {
          h1: { id: 'h1', title: 'Morning', color: 'blue' },
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))
      const items = result.current.getOrderedItems('scheduled-today')

      expect(items).toHaveLength(3)
      expect(items[0]).toEqual({
        type: 'heading',
        id: 'h1',
        data: { id: 'h1', title: 'Morning', color: 'blue' },
      })
      expect(items[1]).toEqual({
        type: 'task',
        id: 'task-1',
        data: expect.objectContaining({ id: 'task-1' }),
      })
      expect(items[2]).toEqual({
        type: 'task',
        id: 'task-2',
        data: expect.objectContaining({ id: 'task-2' }),
      })
    })

    it('filters out headings that no longer exist', () => {
      const task1 = createTestTask({ id: 'task-1' })
      const sections = createSections({
        scheduledToday: [task1],
      })

      useDisplayOrderStore.setState({
        todaySectionOrder: {
          'scheduled-today': [toHeadingId('h1'), 'task-1'],
        },
        todayHeadings: null, // No headings exist
      })

      const { result } = renderHook(() => useTodayOrder(sections))
      const items = result.current.getOrderedItems('scheduled-today')

      expect(items).toHaveLength(1)
      expect(items[0]!.type).toBe('task')
    })
  })

  describe('setSectionItemOrder', () => {
    it('updates store with new order including headings', () => {
      const sections = createSections({
        scheduledToday: [
          createTestTask({ id: 'task-1' }),
          createTestTask({ id: 'task-2' }),
        ],
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      act(() => {
        result.current.setSectionItemOrder('scheduled-today', [
          toHeadingId('h1'),
          'task-2',
          'task-1',
        ])
      })

      expect(
        useDisplayOrderStore.getState().todaySectionOrder?.['scheduled-today']
      ).toEqual([toHeadingId('h1'), 'task-2', 'task-1'])
    })
  })

  describe('setSectionTaskOrder (legacy)', () => {
    it('updates store with task IDs only', () => {
      const task1 = createTestTask({ id: 'task-1' })
      const task2 = createTestTask({ id: 'task-2' })
      const sections = createSections({
        scheduledToday: [task1, task2],
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      act(() => {
        result.current.setSectionTaskOrder('scheduled-today', [task2, task1])
      })

      expect(
        useDisplayOrderStore.getState().todaySectionOrder?.['scheduled-today']
      ).toEqual(['task-2', 'task-1'])
    })
  })

  describe('createHeading', () => {
    it('creates a new heading with default values', () => {
      const sections = createSections({
        scheduledToday: [createTestTask({ id: 'task-1' })],
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      let headingId: string
      act(() => {
        headingId = result.current.createHeading('scheduled-today')
      })

      expect(headingId!).toBe('heading-1')

      const state = useDisplayOrderStore.getState()
      expect(state.todayHeadings?.['heading-1']).toEqual({
        id: 'heading-1',
        title: '',
        color: 'default',
      })
    })

    it('appends heading to end of section order by default', () => {
      const sections = createSections({
        scheduledToday: [createTestTask({ id: 'task-1' })],
      })

      useDisplayOrderStore.setState({
        todaySectionOrder: {
          'scheduled-today': ['task-1'],
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      act(() => {
        result.current.createHeading('scheduled-today')
      })

      expect(
        useDisplayOrderStore.getState().todaySectionOrder?.['scheduled-today']
      ).toEqual(['task-1', toHeadingId('heading-1')])
    })

    it('inserts heading after specified item', () => {
      const sections = createSections({
        scheduledToday: [
          createTestTask({ id: 'task-1' }),
          createTestTask({ id: 'task-2' }),
        ],
      })

      useDisplayOrderStore.setState({
        todaySectionOrder: {
          'scheduled-today': ['task-1', 'task-2'],
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      act(() => {
        result.current.createHeading('scheduled-today', 'task-1')
      })

      expect(
        useDisplayOrderStore.getState().todaySectionOrder?.['scheduled-today']
      ).toEqual(['task-1', toHeadingId('heading-1'), 'task-2'])
    })

    it('appends to end if afterItemId not found', () => {
      const sections = createSections({
        scheduledToday: [createTestTask({ id: 'task-1' })],
      })

      useDisplayOrderStore.setState({
        todaySectionOrder: {
          'scheduled-today': ['task-1'],
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      act(() => {
        result.current.createHeading('scheduled-today', 'nonexistent-task')
      })

      expect(
        useDisplayOrderStore.getState().todaySectionOrder?.['scheduled-today']
      ).toEqual(['task-1', toHeadingId('heading-1')])
    })

    it('creates heading in empty section', () => {
      const sections = createSections({
        scheduledToday: [],
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      act(() => {
        result.current.createHeading('scheduled-today')
      })

      expect(
        useDisplayOrderStore.getState().todaySectionOrder?.['scheduled-today']
      ).toEqual([toHeadingId('heading-1')])
    })
  })

  describe('updateHeading', () => {
    it('updates heading title', () => {
      const sections = createSections()

      useDisplayOrderStore.setState({
        todayHeadings: {
          h1: { id: 'h1', title: 'Old Title', color: 'blue' },
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      act(() => {
        result.current.updateHeading('h1', { title: 'New Title' })
      })

      expect(useDisplayOrderStore.getState().todayHeadings?.['h1']).toEqual({
        id: 'h1',
        title: 'New Title',
        color: 'blue',
      })
    })

    it('updates heading color', () => {
      const sections = createSections()

      useDisplayOrderStore.setState({
        todayHeadings: {
          h1: { id: 'h1', title: 'Title', color: 'blue' },
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      act(() => {
        result.current.updateHeading('h1', { color: 'green' })
      })

      expect(useDisplayOrderStore.getState().todayHeadings?.['h1']?.color).toBe(
        'green'
      )
    })

    it('updates both title and color', () => {
      const sections = createSections()

      useDisplayOrderStore.setState({
        todayHeadings: {
          h1: { id: 'h1', title: 'Old', color: 'blue' },
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      act(() => {
        result.current.updateHeading('h1', { title: 'New', color: 'purple' })
      })

      expect(useDisplayOrderStore.getState().todayHeadings?.['h1']).toEqual({
        id: 'h1',
        title: 'New',
        color: 'purple',
      })
    })

    it('does nothing for non-existent heading', () => {
      const sections = createSections()

      useDisplayOrderStore.setState({
        todayHeadings: {
          h1: { id: 'h1', title: 'Title', color: 'blue' },
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      act(() => {
        result.current.updateHeading('nonexistent', { title: 'New' })
      })

      // Should not modify existing headings
      expect(useDisplayOrderStore.getState().todayHeadings).toEqual({
        h1: { id: 'h1', title: 'Title', color: 'blue' },
      })
    })
  })

  describe('deleteHeading', () => {
    it('removes heading from storage', () => {
      const sections = createSections()

      useDisplayOrderStore.setState({
        todayHeadings: {
          h1: { id: 'h1', title: 'Title', color: 'blue' },
          h2: { id: 'h2', title: 'Other', color: 'green' },
        },
        todaySectionOrder: {
          'scheduled-today': [toHeadingId('h1'), 'task-1', toHeadingId('h2')],
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      act(() => {
        result.current.deleteHeading('scheduled-today', 'h1')
      })

      expect(useDisplayOrderStore.getState().todayHeadings).toEqual({
        h2: { id: 'h2', title: 'Other', color: 'green' },
      })
    })

    it('removes heading from section order', () => {
      const sections = createSections()

      useDisplayOrderStore.setState({
        todayHeadings: {
          h1: { id: 'h1', title: 'Title', color: 'blue' },
        },
        todaySectionOrder: {
          'scheduled-today': [toHeadingId('h1'), 'task-1', 'task-2'],
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      act(() => {
        result.current.deleteHeading('scheduled-today', 'h1')
      })

      expect(
        useDisplayOrderStore.getState().todaySectionOrder?.['scheduled-today']
      ).toEqual(['task-1', 'task-2'])
    })

    it('does not affect other sections', () => {
      const sections = createSections()

      useDisplayOrderStore.setState({
        todayHeadings: {
          h1: { id: 'h1', title: 'Title', color: 'blue' },
        },
        todaySectionOrder: {
          'scheduled-today': [toHeadingId('h1'), 'task-1'],
          'overdue-due-today': ['task-2', 'task-3'],
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      act(() => {
        result.current.deleteHeading('scheduled-today', 'h1')
      })

      expect(
        useDisplayOrderStore.getState().todaySectionOrder?.['overdue-due-today']
      ).toEqual(['task-2', 'task-3'])
    })
  })

  describe('headings property', () => {
    it('returns empty object when no headings exist', () => {
      const sections = createSections()

      const { result } = renderHook(() => useTodayOrder(sections))

      expect(result.current.headings).toEqual({})
    })

    it('returns all headings', () => {
      const sections = createSections()

      useDisplayOrderStore.setState({
        todayHeadings: {
          h1: { id: 'h1', title: 'Morning', color: 'blue' },
          h2: { id: 'h2', title: 'Afternoon', color: 'green' },
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      expect(result.current.headings).toEqual({
        h1: { id: 'h1', title: 'Morning', color: 'blue' },
        h2: { id: 'h2', title: 'Afternoon', color: 'green' },
      })
    })
  })

  describe('multiple sections', () => {
    it('maintains separate order per section', () => {
      const task1 = createTestTask({ id: 'task-1' })
      const task2 = createTestTask({ id: 'task-2' })
      const task3 = createTestTask({ id: 'task-3' })
      const task4 = createTestTask({ id: 'task-4' })

      const sections = createSections({
        scheduledToday: [task1, task2],
        overdueOrDueToday: [task3, task4],
      })

      useDisplayOrderStore.setState({
        todaySectionOrder: {
          'scheduled-today': ['task-2', 'task-1'],
          'overdue-due-today': ['task-4', 'task-3'],
        },
      })

      const { result } = renderHook(() => useTodayOrder(sections))

      expect(
        result.current.getOrderedTasks('scheduled-today').map(t => t.id)
      ).toEqual(['task-2', 'task-1'])
      expect(
        result.current.getOrderedTasks('overdue-due-today').map(t => t.id)
      ).toEqual(['task-4', 'task-3'])
    })

    it('preserves headings in order across sections', () => {
      const task1 = createTestTask({ id: 'task-1' })
      const sections = createSections({
        scheduledToday: [task1],
      })

      useDisplayOrderStore.setState({
        todaySectionOrder: {
          'scheduled-today': [toHeadingId('h1'), 'task-1'],
        },
        todayHeadings: {
          h1: { id: 'h1', title: 'Morning', color: 'blue' },
        },
      })

      // Verify headings survive when task list changes
      const { result, rerender } = renderHook(
        ({ sections }) => useTodayOrder(sections),
        { initialProps: { sections } }
      )

      // Add a new task
      const task2 = createTestTask({ id: 'task-2' })
      rerender({
        sections: createSections({
          scheduledToday: [task1, task2],
        }),
      })

      const items = result.current.getOrderedItems('scheduled-today')
      expect(items[0]!.type).toBe('heading')
      expect(items[0]!.id).toBe('h1')
    })
  })

  describe('all section IDs', () => {
    const sectionIds: TodaySectionId[] = [
      'scheduled-today',
      'overdue-due-today',
      'became-available-today',
    ]

    it.each(sectionIds)('works with section %s', sectionId => {
      const task = createTestTask({ id: 'task-1' })
      const sections = createSections()
      if (sectionId === 'scheduled-today') {
        sections.scheduledToday = [task]
      } else if (sectionId === 'overdue-due-today') {
        sections.overdueOrDueToday = [task]
      } else {
        sections.becameAvailableToday = [task]
      }

      const { result } = renderHook(() => useTodayOrder(sections))

      expect(result.current.getOrderedTasks(sectionId)).toHaveLength(1)
      expect(result.current.getOrderedTasks(sectionId)[0]!.id).toBe('task-1')
    })
  })
})
