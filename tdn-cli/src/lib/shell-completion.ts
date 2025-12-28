import { homedir } from 'os';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export type Shell = 'zsh' | 'bash' | 'fish' | 'pwsh';

export function detectShell(): Shell | null {
  const shell = process.env.SHELL || '';

  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('bash')) return 'bash';
  if (shell.includes('fish')) return 'fish';
  if (shell.includes('pwsh') || shell.includes('powershell')) return 'pwsh';

  return null;
}

export function getShellConfig(shell: Shell): {
  configPath: string;
  scriptPath: string;
  sourceLine: string;
} {
  const home = homedir();

  switch (shell) {
    case 'zsh': {
      return {
        configPath: `${home}/.zshrc`,
        scriptPath: `${home}/.tdn-completion.zsh`,
        sourceLine: 'source ~/.tdn-completion.zsh',
      };
    }

    case 'bash': {
      // macOS uses .bash_profile, Linux uses .bashrc
      const bashConfig =
        process.platform === 'darwin' ? `${home}/.bash_profile` : `${home}/.bashrc`;

      return {
        configPath: bashConfig,
        scriptPath: `${home}/.tdn-completion.bash`,
        sourceLine: 'source ~/.tdn-completion.bash',
      };
    }

    case 'fish': {
      return {
        configPath: `${home}/.config/fish/config.fish`,
        scriptPath: `${home}/.config/fish/completions/tdn.fish`,
        sourceLine: '', // fish loads from completions dir automatically
      };
    }

    case 'pwsh': {
      // Windows PowerShell profile (Windows only)
      if (process.platform !== 'win32') {
        throw new Error('PowerShell completion is only supported on Windows');
      }
      const profilePath = execSync('powershell -Command "$PROFILE"', {
        encoding: 'utf8',
      }).trim();
      return {
        configPath: profilePath,
        scriptPath: `${homedir()}/.tdn-completion.ps1`,
        sourceLine: '. ~/.tdn-completion.ps1',
      };
    }

    default:
      throw new Error(`Unsupported shell: ${shell}`);
  }
}

export function generateCompletionScript(shell: Shell): string {
  const { scriptPath } = getShellConfig(shell);

  // Ensure directory exists (especially for fish completions dir)
  const scriptDir = dirname(scriptPath);
  if (!existsSync(scriptDir)) {
    mkdirSync(scriptDir, { recursive: true });
  }

  // Run: tdn complete <shell> > scriptPath
  const completionScript = execSync(`bun run tdn complete ${shell}`, {
    encoding: 'utf8',
  });

  writeFileSync(scriptPath, completionScript, 'utf8');

  return scriptPath;
}

export function isAlreadyInstalled(configPath: string, sourceLine: string): boolean {
  if (!existsSync(configPath)) {
    return false;
  }

  const content = readFileSync(configPath, 'utf8');
  return content.includes(sourceLine);
}

export function addToShellConfig(configPath: string, sourceLine: string): void {
  if (!sourceLine) {
    // Fish doesn't need sourcing (uses completions dir)
    return;
  }

  // Create backup
  const backup = `${configPath}.backup-${Date.now()}`;
  if (existsSync(configPath)) {
    copyFileSync(configPath, backup);
  }

  // Append sourcing line
  const content = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';

  // Build completion block with existence check
  let completionBlock = '';
  const { scriptPath } = getShellConfig(
    configPath.includes('.zshrc')
      ? 'zsh'
      : configPath.includes('.bash')
        ? 'bash'
        : configPath.includes('.fish')
          ? 'fish'
          : 'zsh'
  );

  if (configPath.includes('.zshrc')) {
    // Zsh: initialize compinit and source with existence check
    completionBlock =
      '\n\n# tdn completions\n' +
      '# Ensure completion system is initialized\n' +
      'autoload -Uz compinit && compinit\n' +
      `[[ -f ${scriptPath} ]] && ${sourceLine}\n`;
  } else if (configPath.includes('.bash')) {
    // Bash: source with existence check
    completionBlock =
      '\n\n# tdn completions\n' + `if [ -f ${scriptPath} ]; then\n  ${sourceLine}\nfi\n`;
  } else {
    // Fallback (shouldn't reach here for fish)
    completionBlock = '\n\n# tdn completions\n' + sourceLine + '\n';
  }

  const newContent = content.trim() + completionBlock;

  writeFileSync(configPath, newContent, 'utf8');
}

export function removeFromShellConfig(configPath: string, sourceLine: string): void {
  if (!existsSync(configPath) || !sourceLine) {
    return;
  }

  const content = readFileSync(configPath, 'utf8');
  const lines = content.split('\n');

  // Find the tdn completions block and remove it
  const filtered: string[] = [];
  let inTdnBlock = false;
  let inBashIfBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]?.trim() || '';

    // Detect start of tdn completions block
    if (trimmed === '# tdn completions') {
      inTdnBlock = true;
      continue; // Skip this line
    }

    // If we're in the tdn block, skip related lines
    if (inTdnBlock) {
      // Skip initialization comment
      if (trimmed === '# Ensure completion system is initialized') {
        continue;
      }

      // Skip compinit line
      if (trimmed === 'autoload -Uz compinit && compinit') {
        continue;
      }

      // Zsh pattern: [[ -f ~/.tdn-completion.zsh ]] && source ~/.tdn-completion.zsh
      if (trimmed.includes('[[ -f') && trimmed.includes('tdn-completion')) {
        inTdnBlock = false; // End of block
        continue;
      }

      // Bash pattern: if [ -f ~/.tdn-completion.bash ]; then
      if (trimmed.includes('if [ -f') && trimmed.includes('tdn-completion')) {
        inBashIfBlock = true;
        continue;
      }

      // Inside bash if block
      if (inBashIfBlock) {
        if (trimmed.includes(sourceLine)) {
          continue; // Skip the source line
        }
        if (trimmed === 'fi') {
          inBashIfBlock = false;
          inTdnBlock = false;
          continue; // Skip the fi
        }
        continue; // Skip any other lines in the if block
      }

      // Old format fallback: direct source line
      if (trimmed === sourceLine) {
        inTdnBlock = false;
        continue;
      }
    }

    // Keep this line
    filtered.push(lines[i] || '');
  }

  writeFileSync(configPath, filtered.join('\n'), 'utf8');
}
