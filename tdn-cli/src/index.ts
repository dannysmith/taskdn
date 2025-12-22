// Quick verification that all dependencies are working
import { Command } from '@commander-js/extra-typings';
import * as p from '@clack/prompts';
import { green, bold } from 'ansis';
import { helloFromRust } from '@bindings';

// Verify imports are working (will be replaced with actual CLI in Phase 4)
const _program = new Command();
const _spinner = p.spinner;

console.log(bold(green('✓ All dependencies loaded successfully')));
console.log(bold(green(`✓ Rust binding works: ${helloFromRust()}`)));
