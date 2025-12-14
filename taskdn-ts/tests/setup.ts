import { execSync } from 'child_process';
import path from 'path';

const REPO_ROOT = path.join(__dirname, '..', '..');
const RESET_SCRIPT = path.join(REPO_ROOT, 'scripts', 'reset-dummy-vault.sh');

export function resetTestVault() {
    execSync(RESET_SCRIPT, { cwd: REPO_ROOT });
}

export const TEST_VAULT = {
    tasks: path.join(REPO_ROOT, 'dummy-demo-vault', 'tasks'),
    projects: path.join(REPO_ROOT, 'dummy-demo-vault', 'projects'),
    areas: path.join(REPO_ROOT, 'dummy-demo-vault', 'areas'),
};
