import { describe, it, expect, beforeEach } from 'vitest'
import { useDisplayOrderStore, type TodaySectionId } from './display-order-store'
import type { Heading } from '@/types/headings'

describe('display-order-store', () => {
  // Helper to get initial state
  const getInitialState = () => ({
    sidebarAreaOrder: null,
    sidebarProjectOrder: null,
    inboxOrder: null,
    projectTaskOrder: null,
    areaTaskOrder: null,
    todaySectionOrder: null,
    todayHeadings: null,
    kanbanColumnOrder: null,
  })

  beforeEach(() => {
    // Reset store state before each test
    useDisplayOrderStore.setState(getInitialState())
  })

  describe('initial state', () => {
    it('has null values for all ordering state', () => {
      const state = useDisplayOrderStore.getState()

      expect(state.sidebarAreaOrder).toBeNull()
      expect(state.sidebarProjectOrder).toBeNull()
      expect(state.inboxOrder).toBeNull()
      expect(state.projectTaskOrder).toBeNull()
      expect(state.areaTaskOrder).toBeNull()
      expect(state.todaySectionOrder).toBeNull()
      expect(state.todayHeadings).toBeNull()
      expect(state.kanbanColumnOrder).toBeNull()
    })
  })

  describe('sidebar ordering', () => {
    describe('setSidebarAreaOrder', () => {
      it('sets area order', () => {
        const { setSidebarAreaOrder } = useDisplayOrderStore.getState()

        setSidebarAreaOrder(['area-1', 'area-2', 'area-3'])

        expect(useDisplayOrderStore.getState().sidebarAreaOrder).toEqual([
          'area-1',
          'area-2',
          'area-3',
        ])
      })

      it('replaces existing order', () => {
        const { setSidebarAreaOrder } = useDisplayOrderStore.getState()

        setSidebarAreaOrder(['area-1', 'area-2'])
        setSidebarAreaOrder(['area-3', 'area-1'])

        expect(useDisplayOrderStore.getState().sidebarAreaOrder).toEqual([
          'area-3',
          'area-1',
        ])
      })

      it('accepts empty array', () => {
        const { setSidebarAreaOrder } = useDisplayOrderStore.getState()

        setSidebarAreaOrder([])

        expect(useDisplayOrderStore.getState().sidebarAreaOrder).toEqual([])
      })
    })

    describe('setSidebarProjectOrder', () => {
      it('sets project order for a container', () => {
        const { setSidebarProjectOrder } = useDisplayOrderStore.getState()

        setSidebarProjectOrder('area-1', ['project-a', 'project-b'])

        expect(useDisplayOrderStore.getState().sidebarProjectOrder).toEqual({
          'area-1': ['project-a', 'project-b'],
        })
      })

      it('preserves other container orders', () => {
        const { setSidebarProjectOrder } = useDisplayOrderStore.getState()

        setSidebarProjectOrder('area-1', ['project-a'])
        setSidebarProjectOrder('area-2', ['project-b', 'project-c'])

        expect(useDisplayOrderStore.getState().sidebarProjectOrder).toEqual({
          'area-1': ['project-a'],
          'area-2': ['project-b', 'project-c'],
        })
      })

      it('updates existing container order', () => {
        const { setSidebarProjectOrder } = useDisplayOrderStore.getState()

        setSidebarProjectOrder('area-1', ['project-a', 'project-b'])
        setSidebarProjectOrder('area-1', ['project-b', 'project-a'])

        expect(
          useDisplayOrderStore.getState().sidebarProjectOrder?.['area-1']
        ).toEqual(['project-b', 'project-a'])
      })

      it('works with orphan container ID', () => {
        const { setSidebarProjectOrder } = useDisplayOrderStore.getState()

        setSidebarProjectOrder('__orphan__', ['orphan-project-1'])

        expect(
          useDisplayOrderStore.getState().sidebarProjectOrder?.['__orphan__']
        ).toEqual(['orphan-project-1'])
      })
    })

    describe('setSidebarProjectOrderBatch', () => {
      it('sets multiple container orders at once', () => {
        const { setSidebarProjectOrderBatch } = useDisplayOrderStore.getState()

        setSidebarProjectOrderBatch({
          'area-1': ['project-a', 'project-b'],
          'area-2': ['project-c'],
        })

        expect(useDisplayOrderStore.getState().sidebarProjectOrder).toEqual({
          'area-1': ['project-a', 'project-b'],
          'area-2': ['project-c'],
        })
      })

      it('merges with existing orders', () => {
        const { setSidebarProjectOrder, setSidebarProjectOrderBatch } =
          useDisplayOrderStore.getState()

        setSidebarProjectOrder('area-1', ['project-a'])
        setSidebarProjectOrderBatch({
          'area-2': ['project-b'],
        })

        expect(useDisplayOrderStore.getState().sidebarProjectOrder).toEqual({
          'area-1': ['project-a'],
          'area-2': ['project-b'],
        })
      })

      it('overwrites overlapping keys', () => {
        const { setSidebarProjectOrder, setSidebarProjectOrderBatch } =
          useDisplayOrderStore.getState()

        setSidebarProjectOrder('area-1', ['project-a'])
        setSidebarProjectOrderBatch({
          'area-1': ['project-b', 'project-c'],
        })

        expect(
          useDisplayOrderStore.getState().sidebarProjectOrder?.['area-1']
        ).toEqual(['project-b', 'project-c'])
      })
    })
  })

  describe('inbox ordering', () => {
    describe('setInboxOrder', () => {
      it('sets inbox task order', () => {
        const { setInboxOrder } = useDisplayOrderStore.getState()

        setInboxOrder(['task-1', 'task-2', 'task-3'])

        expect(useDisplayOrderStore.getState().inboxOrder).toEqual([
          'task-1',
          'task-2',
          'task-3',
        ])
      })

      it('replaces existing order', () => {
        const { setInboxOrder } = useDisplayOrderStore.getState()

        setInboxOrder(['task-1', 'task-2'])
        setInboxOrder(['task-3', 'task-1'])

        expect(useDisplayOrderStore.getState().inboxOrder).toEqual([
          'task-3',
          'task-1',
        ])
      })
    })
  })

  describe('project task ordering', () => {
    describe('setProjectTaskOrder', () => {
      it('sets task order for a project', () => {
        const { setProjectTaskOrder } = useDisplayOrderStore.getState()

        setProjectTaskOrder('project-1', ['task-a', 'task-b'])

        expect(useDisplayOrderStore.getState().projectTaskOrder).toEqual({
          'project-1': ['task-a', 'task-b'],
        })
      })

      it('preserves orders for other projects', () => {
        const { setProjectTaskOrder } = useDisplayOrderStore.getState()

        setProjectTaskOrder('project-1', ['task-a'])
        setProjectTaskOrder('project-2', ['task-b', 'task-c'])

        expect(useDisplayOrderStore.getState().projectTaskOrder).toEqual({
          'project-1': ['task-a'],
          'project-2': ['task-b', 'task-c'],
        })
      })
    })
  })

  describe('area task ordering', () => {
    describe('setAreaTaskOrder', () => {
      it('sets task order for an area', () => {
        const { setAreaTaskOrder } = useDisplayOrderStore.getState()

        setAreaTaskOrder('area-1', ['task-a', 'task-b'])

        expect(useDisplayOrderStore.getState().areaTaskOrder).toEqual({
          'area-1': ['task-a', 'task-b'],
        })
      })

      it('preserves orders for other areas', () => {
        const { setAreaTaskOrder } = useDisplayOrderStore.getState()

        setAreaTaskOrder('area-1', ['task-a'])
        setAreaTaskOrder('area-2', ['task-b', 'task-c'])

        expect(useDisplayOrderStore.getState().areaTaskOrder).toEqual({
          'area-1': ['task-a'],
          'area-2': ['task-b', 'task-c'],
        })
      })
    })
  })

  describe('today section ordering', () => {
    describe('setTodaySectionOrder', () => {
      it('sets order for scheduled-today section', () => {
        const { setTodaySectionOrder } = useDisplayOrderStore.getState()

        setTodaySectionOrder('scheduled-today', ['task-1', 'task-2'])

        expect(useDisplayOrderStore.getState().todaySectionOrder).toEqual({
          'scheduled-today': ['task-1', 'task-2'],
        })
      })

      it('sets order for overdue-due-today section', () => {
        const { setTodaySectionOrder } = useDisplayOrderStore.getState()

        setTodaySectionOrder('overdue-due-today', ['task-1', 'task-2'])

        expect(useDisplayOrderStore.getState().todaySectionOrder).toEqual({
          'overdue-due-today': ['task-1', 'task-2'],
        })
      })

      it('sets order for became-available-today section', () => {
        const { setTodaySectionOrder } = useDisplayOrderStore.getState()

        setTodaySectionOrder('became-available-today', ['task-1'])

        expect(useDisplayOrderStore.getState().todaySectionOrder).toEqual({
          'became-available-today': ['task-1'],
        })
      })

      it('preserves orders for other sections', () => {
        const { setTodaySectionOrder } = useDisplayOrderStore.getState()

        setTodaySectionOrder('scheduled-today', ['task-1'])
        setTodaySectionOrder('overdue-due-today', ['task-2', 'task-3'])

        expect(useDisplayOrderStore.getState().todaySectionOrder).toEqual({
          'scheduled-today': ['task-1'],
          'overdue-due-today': ['task-2', 'task-3'],
        })
      })
    })
  })

  describe('today headings', () => {
    describe('setTodayHeading', () => {
      it('adds a new heading', () => {
        const { setTodayHeading } = useDisplayOrderStore.getState()

        const heading: Heading = {
          id: 'heading-1',
          title: 'Morning Tasks',
          color: 'blue',
        }
        setTodayHeading('heading-1', heading)

        expect(useDisplayOrderStore.getState().todayHeadings).toEqual({
          'heading-1': heading,
        })
      })

      it('updates existing heading', () => {
        const { setTodayHeading } = useDisplayOrderStore.getState()

        const heading1: Heading = {
          id: 'heading-1',
          title: 'Morning',
          color: 'blue',
        }
        const heading2: Heading = {
          id: 'heading-1',
          title: 'Afternoon',
          color: 'green',
        }

        setTodayHeading('heading-1', heading1)
        setTodayHeading('heading-1', heading2)

        expect(useDisplayOrderStore.getState().todayHeadings?.['heading-1']).toEqual(
          heading2
        )
      })

      it('preserves other headings', () => {
        const { setTodayHeading } = useDisplayOrderStore.getState()

        const heading1: Heading = {
          id: 'heading-1',
          title: 'Morning',
          color: 'blue',
        }
        const heading2: Heading = {
          id: 'heading-2',
          title: 'Afternoon',
          color: 'green',
        }

        setTodayHeading('heading-1', heading1)
        setTodayHeading('heading-2', heading2)

        expect(useDisplayOrderStore.getState().todayHeadings).toEqual({
          'heading-1': heading1,
          'heading-2': heading2,
        })
      })
    })

    describe('deleteTodayHeading', () => {
      it('removes a heading', () => {
        const { setTodayHeading, deleteTodayHeading } =
          useDisplayOrderStore.getState()

        const heading: Heading = {
          id: 'heading-1',
          title: 'Morning',
          color: 'blue',
        }
        setTodayHeading('heading-1', heading)

        deleteTodayHeading('heading-1')

        expect(useDisplayOrderStore.getState().todayHeadings).toBeNull()
      })

      it('preserves other headings when deleting one', () => {
        const { setTodayHeading, deleteTodayHeading } =
          useDisplayOrderStore.getState()

        const heading1: Heading = {
          id: 'heading-1',
          title: 'Morning',
          color: 'blue',
        }
        const heading2: Heading = {
          id: 'heading-2',
          title: 'Afternoon',
          color: 'green',
        }

        setTodayHeading('heading-1', heading1)
        setTodayHeading('heading-2', heading2)

        deleteTodayHeading('heading-1')

        expect(useDisplayOrderStore.getState().todayHeadings).toEqual({
          'heading-2': heading2,
        })
      })

      it('does nothing when headings is null', () => {
        const { deleteTodayHeading } = useDisplayOrderStore.getState()

        // Should not throw
        deleteTodayHeading('non-existent')

        expect(useDisplayOrderStore.getState().todayHeadings).toBeNull()
      })

      it('does nothing for non-existent heading', () => {
        const { setTodayHeading, deleteTodayHeading } =
          useDisplayOrderStore.getState()

        const heading: Heading = {
          id: 'heading-1',
          title: 'Morning',
          color: 'blue',
        }
        setTodayHeading('heading-1', heading)

        deleteTodayHeading('non-existent')

        expect(useDisplayOrderStore.getState().todayHeadings).toEqual({
          'heading-1': heading,
        })
      })
    })
  })

  describe('kanban column ordering', () => {
    describe('setKanbanColumnOrder', () => {
      it('sets order for a column in a view', () => {
        const { setKanbanColumnOrder } = useDisplayOrderStore.getState()

        setKanbanColumnOrder('project-1', 'ready', ['task-1', 'task-2'])

        expect(useDisplayOrderStore.getState().kanbanColumnOrder).toEqual({
          'project-1': {
            ready: ['task-1', 'task-2'],
          },
        })
      })

      it('preserves other columns in the same view', () => {
        const { setKanbanColumnOrder } = useDisplayOrderStore.getState()

        setKanbanColumnOrder('project-1', 'ready', ['task-1'])
        setKanbanColumnOrder('project-1', 'in-progress', ['task-2', 'task-3'])

        expect(useDisplayOrderStore.getState().kanbanColumnOrder).toEqual({
          'project-1': {
            ready: ['task-1'],
            'in-progress': ['task-2', 'task-3'],
          },
        })
      })

      it('preserves columns from other views', () => {
        const { setKanbanColumnOrder } = useDisplayOrderStore.getState()

        setKanbanColumnOrder('project-1', 'ready', ['task-1'])
        setKanbanColumnOrder('project-2', 'ready', ['task-2'])

        expect(useDisplayOrderStore.getState().kanbanColumnOrder).toEqual({
          'project-1': {
            ready: ['task-1'],
          },
          'project-2': {
            ready: ['task-2'],
          },
        })
      })

      it('updates existing column order', () => {
        const { setKanbanColumnOrder } = useDisplayOrderStore.getState()

        setKanbanColumnOrder('project-1', 'ready', ['task-1', 'task-2'])
        setKanbanColumnOrder('project-1', 'ready', ['task-2', 'task-1'])

        expect(
          useDisplayOrderStore.getState().kanbanColumnOrder?.['project-1']?.ready
        ).toEqual(['task-2', 'task-1'])
      })

      it('works with all task statuses', () => {
        const { setKanbanColumnOrder } = useDisplayOrderStore.getState()

        setKanbanColumnOrder('project-1', 'inbox', ['task-1'])
        setKanbanColumnOrder('project-1', 'icebox', ['task-2'])
        setKanbanColumnOrder('project-1', 'ready', ['task-3'])
        setKanbanColumnOrder('project-1', 'in-progress', ['task-4'])
        setKanbanColumnOrder('project-1', 'blocked', ['task-5'])
        setKanbanColumnOrder('project-1', 'done', ['task-6'])
        setKanbanColumnOrder('project-1', 'dropped', ['task-7'])

        const columns =
          useDisplayOrderStore.getState().kanbanColumnOrder?.['project-1']
        expect(columns?.inbox).toEqual(['task-1'])
        expect(columns?.icebox).toEqual(['task-2'])
        expect(columns?.ready).toEqual(['task-3'])
        expect(columns?.['in-progress']).toEqual(['task-4'])
        expect(columns?.blocked).toEqual(['task-5'])
        expect(columns?.done).toEqual(['task-6'])
        expect(columns?.dropped).toEqual(['task-7'])
      })
    })
  })

  describe('resetAllOrder', () => {
    it('resets all order state to null', () => {
      const {
        setSidebarAreaOrder,
        setSidebarProjectOrder,
        setInboxOrder,
        setProjectTaskOrder,
        setAreaTaskOrder,
        setTodaySectionOrder,
        setTodayHeading,
        setKanbanColumnOrder,
        resetAllOrder,
      } = useDisplayOrderStore.getState()

      // Set some state
      setSidebarAreaOrder(['area-1'])
      setSidebarProjectOrder('area-1', ['project-1'])
      setInboxOrder(['task-1'])
      setProjectTaskOrder('project-1', ['task-2'])
      setAreaTaskOrder('area-1', ['task-3'])
      setTodaySectionOrder('scheduled-today', ['task-4'])
      setTodayHeading('heading-1', { id: 'h-1', title: 'H1', color: 'blue' })
      setKanbanColumnOrder('project-1', 'ready', ['task-5'])

      // Verify state is set
      const stateBefore = useDisplayOrderStore.getState()
      expect(stateBefore.sidebarAreaOrder).not.toBeNull()
      expect(stateBefore.sidebarProjectOrder).not.toBeNull()

      // Reset
      resetAllOrder()

      // Verify all is null
      const stateAfter = useDisplayOrderStore.getState()
      expect(stateAfter.sidebarAreaOrder).toBeNull()
      expect(stateAfter.sidebarProjectOrder).toBeNull()
      expect(stateAfter.inboxOrder).toBeNull()
      expect(stateAfter.projectTaskOrder).toBeNull()
      expect(stateAfter.areaTaskOrder).toBeNull()
      expect(stateAfter.todaySectionOrder).toBeNull()
      expect(stateAfter.todayHeadings).toBeNull()
      expect(stateAfter.kanbanColumnOrder).toBeNull()
    })
  })
})
