import { describe, test, expect } from 'bun:test';
import { validateEditor } from '@/commands/open.ts';

describe('open command security', () => {
  describe('validateEditor', () => {
    test('accepts common valid editors', () => {
      const validEditors = [
        'vim',
        'vi',
        'nvim',
        'nano',
        'emacs',
        'code',
        'subl',
        'atom',
        'gedit',
        'kate',
        'micro',
        'helix',
        'hx',
      ];

      for (const editor of validEditors) {
        expect(() => validateEditor(editor)).not.toThrow();
      }
    });

    test('accepts editors with full paths', () => {
      expect(() => validateEditor('/usr/bin/vim')).not.toThrow();
      expect(() => validateEditor('/opt/homebrew/bin/nvim')).not.toThrow();
      expect(() =>
        validateEditor('/Applications/Visual Studio Code.app/Contents/MacOS/code')
      ).not.toThrow();
    });

    test('is case-insensitive for editor names', () => {
      expect(() => validateEditor('VIM')).not.toThrow();
      expect(() => validateEditor('Vim')).not.toThrow();
      expect(() => validateEditor('NVIM')).not.toThrow();
    });

    test('rejects editors not in allowed list', () => {
      expect(() => validateEditor('rm')).toThrow('not in the allowed list');
      expect(() => validateEditor('sh')).toThrow('not in the allowed list');
      expect(() => validateEditor('bash')).toThrow('not in the allowed list');
      expect(() => validateEditor('python')).toThrow('not in the allowed list');
      expect(() => validateEditor('unknown-editor')).toThrow('not in the allowed list');
    });

    test('rejects editors with shell metacharacters - semicolon', () => {
      expect(() => validateEditor('vim; rm -rf ~/*')).toThrow(
        'dangerous shell metacharacters'
      );
    });

    test('rejects editors with shell metacharacters - pipe', () => {
      expect(() => validateEditor('vim | cat')).toThrow(
        'dangerous shell metacharacters'
      );
    });

    test('rejects editors with shell metacharacters - ampersand', () => {
      expect(() => validateEditor('vim && rm -rf /')).toThrow(
        'dangerous shell metacharacters'
      );
      expect(() => validateEditor('vim & sleep 10')).toThrow(
        'dangerous shell metacharacters'
      );
    });

    test('rejects editors with shell metacharacters - backticks', () => {
      expect(() => validateEditor('vim`whoami`')).toThrow(
        'dangerous shell metacharacters'
      );
    });

    test('rejects editors with shell metacharacters - dollar sign', () => {
      expect(() => validateEditor('vim$(whoami)')).toThrow(
        'dangerous shell metacharacters'
      );
      expect(() => validateEditor('vim$PATH')).toThrow('dangerous shell metacharacters');
    });

    test('rejects editors with shell metacharacters - redirection', () => {
      expect(() => validateEditor('vim > /tmp/output')).toThrow(
        'dangerous shell metacharacters'
      );
      expect(() => validateEditor('vim < /tmp/input')).toThrow(
        'dangerous shell metacharacters'
      );
    });

    test('rejects editors with shell metacharacters - parentheses', () => {
      expect(() => validateEditor('(vim)')).toThrow('dangerous shell metacharacters');
    });

    test('rejects command injection via EDITOR with semicolon and quotes', () => {
      // Example: export EDITOR='vim"; rm -rf ~/*; echo "'
      expect(() => validateEditor('vim"; rm -rf ~/*; echo "')).toThrow(
        'dangerous shell metacharacters'
      );
    });

    test('accepts .exe extensions', () => {
      // Windows executables with .exe extension
      expect(() => validateEditor('vim.exe')).not.toThrow();
      expect(() => validateEditor('nvim.exe')).not.toThrow();
      expect(() => validateEditor('code.exe')).not.toThrow();
    });
  });
});
