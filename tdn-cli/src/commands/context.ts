import { Command } from '@commander-js/extra-typings';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type { GlobalOptions } from '@/output/index.ts';

/**
 * Context command - get expanded context for an entity
 *
 * Usage:
 *   taskdn context area "Work"            # Area + projects + tasks
 *   taskdn context project "Q1"           # Project + tasks + parent area
 *   taskdn context task ~/tasks/foo.md    # Task + parent project + area
 *   taskdn context --ai                   # Vault overview (AI only)
 */
export const contextCommand = new Command('context')
  .description('Get expanded context for an entity')
  .argument('[entity-type]', 'Entity type: area, project, or task')
  .argument('[target]', 'Name or path of the entity')
  .action((entityType, target, _options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);

    // No args behavior differs by mode
    if (!entityType && !target) {
      if (mode === 'human') {
        console.error(
          'Error: Please specify an entity (area, project, or task) or use --ai for vault overview.'
        );
        console.error('\nExamples:');
        console.error('  taskdn context area "Work"');
        console.error('  taskdn context project "Q1 Planning"');
        console.error('  taskdn context --ai');
        process.exit(2);
      }

      // AI mode: return vault overview (stub)
      const result = {
        type: 'context',
        overview: true,
        areas: [],
        projects: [],
        tasks: [],
      };
      console.log(formatOutput(result, globalOpts));
      return;
    }

    // Stub implementation for specific entity context
    const result = {
      type: 'context',
      entityType,
      target,
      data: '(stub) expanded context would go here',
    };

    console.log(formatOutput(result, globalOpts));
  });
