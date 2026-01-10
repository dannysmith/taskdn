import { describe, it, expect, vi, beforeEach } from 'vitest'
import { notify, notifications, success, error, info, warning } from './notifications'
import { toast } from 'sonner'
import { commands } from './tauri-bindings'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('./tauri-bindings', () => ({
  commands: {
    sendNativeNotification: vi.fn(),
  },
}))

vi.mock('./logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('notify', () => {
    describe('toast notifications (default)', () => {
      it('shows info toast by default', async () => {
        await notify('Test Title', 'Test message')

        expect(toast.info).toHaveBeenCalledWith('Test Title: Test message', {})
      })

      it('shows toast with only title', async () => {
        await notify('Just Title')

        expect(toast.info).toHaveBeenCalledWith('Just Title', {})
      })

      it('shows success toast', async () => {
        await notify('Success!', 'Operation completed', { type: 'success' })

        expect(toast.success).toHaveBeenCalledWith(
          'Success!: Operation completed',
          {}
        )
      })

      it('shows error toast', async () => {
        await notify('Error', 'Something went wrong', { type: 'error' })

        expect(toast.error).toHaveBeenCalledWith(
          'Error: Something went wrong',
          {}
        )
      })

      it('shows warning toast', async () => {
        await notify('Warning', 'Be careful', { type: 'warning' })

        expect(toast.warning).toHaveBeenCalledWith('Warning: Be careful', {})
      })

      it('shows info toast explicitly', async () => {
        await notify('Info', 'FYI', { type: 'info' })

        expect(toast.info).toHaveBeenCalledWith('Info: FYI', {})
      })

      it('passes duration option to toast', async () => {
        await notify('Test', 'Message', { duration: 5000 })

        expect(toast.info).toHaveBeenCalledWith('Test: Message', {
          duration: 5000,
        })
      })

      it('passes duration 0 for persistent toast', async () => {
        await notify('Persistent', 'Will stay', { duration: 0 })

        expect(toast.info).toHaveBeenCalledWith('Persistent: Will stay', {
          duration: 0,
        })
      })
    })

    describe('native notifications', () => {
      it('sends native notification', async () => {
        vi.mocked(commands.sendNativeNotification).mockResolvedValue({
          status: 'ok',
          data: null,
        })

        await notify('Native Title', 'Native message', { native: true })

        expect(commands.sendNativeNotification).toHaveBeenCalledWith(
          'Native Title',
          'Native message'
        )
        expect(toast.info).not.toHaveBeenCalled()
      })

      it('sends native notification with null message when not provided', async () => {
        vi.mocked(commands.sendNativeNotification).mockResolvedValue({
          status: 'ok',
          data: null,
        })

        await notify('Title Only', undefined, { native: true })

        expect(commands.sendNativeNotification).toHaveBeenCalledWith(
          'Title Only',
          null
        )
      })

      it('falls back to toast on native notification error', async () => {
        vi.mocked(commands.sendNativeNotification).mockResolvedValue({
          status: 'error',
          error: 'Notification permission denied',
        })

        await notify('Fallback', 'Message', { native: true })

        expect(toast.error).toHaveBeenCalledWith('Fallback: Message')
      })

      it('falls back to toast without message', async () => {
        vi.mocked(commands.sendNativeNotification).mockResolvedValue({
          status: 'error',
          error: 'Error',
        })

        await notify('Just Title', undefined, { native: true })

        expect(toast.error).toHaveBeenCalledWith('Just Title')
      })
    })
  })

  describe('convenience functions', () => {
    describe('notifications.success / success', () => {
      it('sends success toast', async () => {
        await notifications.success('Great!', 'It worked')

        expect(toast.success).toHaveBeenCalledWith('Great!: It worked', {})
      })

      it('sends success toast via exported function', async () => {
        await success('Great!', 'It worked')

        expect(toast.success).toHaveBeenCalledWith('Great!: It worked', {})
      })

      it('sends native success notification', async () => {
        vi.mocked(commands.sendNativeNotification).mockResolvedValue({
          status: 'ok',
          data: null,
        })

        await notifications.success('Native Success', 'Done', true)

        expect(commands.sendNativeNotification).toHaveBeenCalledWith(
          'Native Success',
          'Done'
        )
      })
    })

    describe('notifications.error / error', () => {
      it('sends error toast', async () => {
        await notifications.error('Oops', 'Something broke')

        expect(toast.error).toHaveBeenCalledWith('Oops: Something broke', {})
      })

      it('sends error toast via exported function', async () => {
        await error('Oops', 'Something broke')

        expect(toast.error).toHaveBeenCalledWith('Oops: Something broke', {})
      })

      it('sends native error notification', async () => {
        vi.mocked(commands.sendNativeNotification).mockResolvedValue({
          status: 'ok',
          data: null,
        })

        await notifications.error('Native Error', 'Failed', true)

        expect(commands.sendNativeNotification).toHaveBeenCalledWith(
          'Native Error',
          'Failed'
        )
      })
    })

    describe('notifications.info / info', () => {
      it('sends info toast', async () => {
        await notifications.info('FYI', 'Just so you know')

        expect(toast.info).toHaveBeenCalledWith('FYI: Just so you know', {})
      })

      it('sends info toast via exported function', async () => {
        await info('FYI', 'Just so you know')

        expect(toast.info).toHaveBeenCalledWith('FYI: Just so you know', {})
      })
    })

    describe('notifications.warning / warning', () => {
      it('sends warning toast', async () => {
        await notifications.warning('Careful', 'Watch out')

        expect(toast.warning).toHaveBeenCalledWith('Careful: Watch out', {})
      })

      it('sends warning toast via exported function', async () => {
        await warning('Careful', 'Watch out')

        expect(toast.warning).toHaveBeenCalledWith('Careful: Watch out', {})
      })
    })
  })

  describe('edge cases', () => {
    it('handles empty message', async () => {
      // Empty string is falsy, so it's treated as no message
      await notify('Title', '')

      expect(toast.info).toHaveBeenCalledWith('Title', {})
    })

    it('handles special characters in title and message', async () => {
      await notify('Title <script>', 'Message with "quotes"')

      expect(toast.info).toHaveBeenCalledWith(
        'Title <script>: Message with "quotes"',
        {}
      )
    })

    it('handles very long messages', async () => {
      const longMessage = 'x'.repeat(1000)
      await notify('Title', longMessage)

      expect(toast.info).toHaveBeenCalledWith(`Title: ${longMessage}`, {})
    })
  })
})
