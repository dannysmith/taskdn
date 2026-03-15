import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { validateVaultPath } from '@/config/index.ts';
import { platform, homedir } from 'os';
import { join, sep } from 'path';

describe('config security', () => {
  describe('validateVaultPath', () => {
    // Store original console.warn to restore later
    let originalWarn: typeof console.warn;
    let warnCalls: string[] = [];

    beforeEach(() => {
      originalWarn = console.warn;
      warnCalls = [];
      console.warn = (message: string) => {
        warnCalls.push(message);
      };
    });

    afterEach(() => {
      console.warn = originalWarn;
    });

    test('accepts paths in user home directory', () => {
      const home = homedir();
      const result = validateVaultPath(join(home, 'tasks'), 'tasksDir');
      expect(result).toContain('tasks');
      expect(warnCalls).toHaveLength(0);
    });

    test('accepts relative paths from cwd', () => {
      const result = validateVaultPath('./tasks', 'tasksDir');
      expect(result).toContain('tasks');
    });

    test('accepts absolute paths in home directory', () => {
      const home = homedir();
      const testPath = join(home, 'Documents', 'tasks');
      const result = validateVaultPath(testPath, 'tasksDir');
      expect(result).toBe(testPath);
      expect(warnCalls).toHaveLength(0);
    });

    // Skip system directory tests on Windows
    const describeUnix = platform() === 'win32' ? describe.skip : describe;

    describeUnix('system directory protection (Unix only)', () => {
      test('blocks /etc directory', () => {
        expect(() => validateVaultPath('/etc', 'tasksDir')).toThrow(
          'cannot point to system directory "/etc"'
        );
      });

      test('blocks /usr directory', () => {
        expect(() => validateVaultPath('/usr', 'projectsDir')).toThrow(
          'cannot point to system directory "/usr"'
        );
      });

      test('blocks /bin directory', () => {
        expect(() => validateVaultPath('/bin', 'tasksDir')).toThrow(
          'cannot point to system directory "/bin"'
        );
      });

      test('blocks /sbin directory', () => {
        expect(() => validateVaultPath('/sbin', 'tasksDir')).toThrow(
          'cannot point to system directory "/sbin"'
        );
      });

      test('blocks /root directory', () => {
        expect(() => validateVaultPath('/root', 'tasksDir')).toThrow(
          'cannot point to system directory "/root"'
        );
      });

      test('blocks /boot directory', () => {
        expect(() => validateVaultPath('/boot', 'tasksDir')).toThrow(
          'cannot point to system directory "/boot"'
        );
      });

      test('blocks /sys directory', () => {
        expect(() => validateVaultPath('/sys', 'tasksDir')).toThrow(
          'cannot point to system directory "/sys"'
        );
      });

      test('blocks paths under /etc', () => {
        expect(() => validateVaultPath('/etc/passwd', 'tasksDir')).toThrow(
          'cannot point to system directory "/etc"'
        );
        expect(() => validateVaultPath('/etc/shadow', 'areasDir')).toThrow(
          'cannot point to system directory "/etc"'
        );
      });

      test('blocks dangerous paths under /var', () => {
        expect(() => validateVaultPath('/var/log', 'projectsDir')).toThrow(
          'system directory'
        );
        expect(() => validateVaultPath('/var/lib/tasks', 'tasksDir')).toThrow(
          'system directory'
        );
        expect(() => validateVaultPath('/var/db', 'projectsDir')).toThrow(
          'system directory'
        );
      });

      test('blocks malicious config paths to sensitive system locations', () => {
        // Malicious .taskdn.json could try to point to /etc or /var/log
        expect(() => validateVaultPath('/etc', 'tasksDir')).toThrow(
          'system directory'
        );
        expect(() => validateVaultPath('/var/log', 'projectsDir')).toThrow(
          'system directory'
        );
      });

      test('blocks path traversal attempts to system directories', () => {
        // Try to escape to /etc via path traversal
        expect(() =>
          validateVaultPath('../../../../../../etc', 'tasksDir')
        ).toThrow('system directory');

        // Try to escape to /var via path traversal
        expect(() =>
          validateVaultPath('../../../../../../var/log', 'projectsDir')
        ).toThrow('system directory');
      });

      test('accepts /tmp without warning (Linux temp directory)', () => {
        // /tmp is the standard temp directory on Linux, should be allowed like /var/folders on macOS
        const result = validateVaultPath('/tmp/tasks', 'tasksDir');
        expect(result).toBe('/tmp/tasks');
        expect(warnCalls).toHaveLength(0);
      });

      test('warns when path is outside home directory and not a temp dir', () => {
        // /opt is outside home and not a temp directory
        const result = validateVaultPath('/opt/tasks', 'tasksDir');
        expect(result).toBe('/opt/tasks');
        expect(warnCalls.length).toBeGreaterThan(0);
        expect(warnCalls[0]).toContain('outside your home directory');
      });

      test('accepts /sessions/ paths without warning (Cowork VM mount)', () => {
        const result = validateVaultPath('/sessions/abc123/mnt/tasks', 'tasksDir');
        expect(result).toBe('/sessions/abc123/mnt/tasks');
        expect(warnCalls).toHaveLength(0);
      });

      test('accepts /mnt/ paths without warning (generic mount point)', () => {
        const result = validateVaultPath('/mnt/shared/tasks', 'tasksDir');
        expect(result).toBe('/mnt/shared/tasks');
        expect(warnCalls).toHaveLength(0);
      });
    });

    test('resolves relative paths to absolute', () => {
      const result = validateVaultPath('./tasks', 'tasksDir');
      // On Windows, absolute paths start with drive letter (e.g., C:\)
      // On Unix, they start with /
      if (platform() === 'win32') {
        expect(result).toMatch(/^[A-Z]:\\.*tasks$/i);
      } else {
        expect(result).toMatch(/^\/.*tasks$/);
      }
    });

    test('includes pathType in error messages', () => {
      if (platform() !== 'win32') {
        try {
          validateVaultPath('/etc', 'customDirName');
        } catch (error) {
          expect((error as Error).message).toContain('customDirName');
        }
      }
    });

    test('handles paths with .. in the middle correctly', () => {
      const home = homedir();
      // A path like ~/foo/../bar should resolve to ~/bar, which is safe
      const testPath = join(home, 'foo', '..', 'bar');
      const expectedPath = join(home, 'bar');
      const result = validateVaultPath(testPath, 'tasksDir');
      expect(result).toBe(expectedPath);
      expect(warnCalls).toHaveLength(0);
    });
  });
});
