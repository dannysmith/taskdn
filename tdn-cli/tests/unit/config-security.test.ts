import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { validateVaultPath } from '@/config/index.ts';
import { platform } from 'os';

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
      // Use a path that's definitely in the home directory
      const result = validateVaultPath('~/tasks', 'tasksDir');
      expect(result).toContain('tasks');
      expect(warnCalls).toHaveLength(0);
    });

    test('accepts relative paths from cwd', () => {
      const result = validateVaultPath('./tasks', 'tasksDir');
      expect(result).toContain('tasks');
    });

    test('accepts absolute paths in home directory', () => {
      const { homedir } = require('os');
      const home = homedir();
      const result = validateVaultPath(`${home}/Documents/tasks`, 'tasksDir');
      expect(result).toBe(`${home}/Documents/tasks`);
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

      test('blocks the attack scenario from security review', () => {
        // From CRIT-2: malicious config pointing to sensitive locations
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

      test('warns when path is outside home directory but not system dir', () => {
        // /tmp is outside home but not a protected system directory
        const result = validateVaultPath('/tmp/tasks', 'tasksDir');
        expect(result).toBe('/tmp/tasks');
        expect(warnCalls.length).toBeGreaterThan(0);
        expect(warnCalls[0]).toContain('outside your home directory');
      });
    });

    test('resolves relative paths to absolute', () => {
      const result = validateVaultPath('./tasks', 'tasksDir');
      expect(result).toMatch(/^\/.*tasks$/);
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
      const { homedir } = require('os');
      const home = homedir();
      // A path like ~/foo/../bar should resolve to ~/bar, which is safe
      const result = validateVaultPath(`${home}/foo/../bar`, 'tasksDir');
      expect(result).toBe(`${home}/bar`);
      expect(warnCalls).toHaveLength(0);
    });
  });
});
