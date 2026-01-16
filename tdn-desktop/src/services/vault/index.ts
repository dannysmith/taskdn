/**
 * TanStack Query hooks for vault data (tasks, projects, areas).
 *
 * These hooks provide the primary data access layer for the frontend,
 * wrapping Tauri commands with proper caching and optimistic updates.
 */

// Query keys
export { vaultQueryKeys } from './keys'

// Cache utilities and error handling
export {
  addTaskToCache,
  handleVaultError,
  formatVaultError,
  markMutationStart,
  markMutationComplete,
} from './utils'

// Query hooks
export {
  useTasks,
  useTask,
  useProjects,
  useProject,
  useAreas,
  useArea,
  useVaultData,
  useVaultHelpers,
} from './queries'

// Mutation hooks
export {
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCreateProject,
  useUpdateProject,
} from './mutations'

// Initialization and events
export {
  useVaultInitialization,
  initializeVault,
  reinitializeVault,
  vaultConfigChanged,
  isVaultConfigured,
} from './init'
