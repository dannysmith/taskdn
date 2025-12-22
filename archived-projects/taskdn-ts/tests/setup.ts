import { cpSync, rmSync, existsSync } from 'fs';
import path from 'path';

const REPO_ROOT = path.join(__dirname, '..', '..');
const SOURCE_VAULT = path.join(REPO_ROOT, 'demo-vault');
const TARGET_VAULT = path.join(REPO_ROOT, 'dummy-demo-vault');

export function resetTestVault() {
    if (!existsSync(SOURCE_VAULT)) {
        throw new Error(`demo-vault not found at ${SOURCE_VAULT}`);
    }

    // Remove existing dummy vault if it exists
    if (existsSync(TARGET_VAULT)) {
        rmSync(TARGET_VAULT, { recursive: true, force: true });
    }

    // Copy demo-vault to dummy-demo-vault
    cpSync(SOURCE_VAULT, TARGET_VAULT, { recursive: true });
}

export const TEST_VAULT = {
    tasks: path.join(REPO_ROOT, 'dummy-demo-vault', 'tasks'),
    projects: path.join(REPO_ROOT, 'dummy-demo-vault', 'projects'),
    areas: path.join(REPO_ROOT, 'dummy-demo-vault', 'areas'),
};
