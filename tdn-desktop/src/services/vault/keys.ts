/**
 * TanStack Query keys for vault data.
 *
 * Centralized query key definitions for consistent cache management.
 */

export const vaultQueryKeys = {
  all: ['vault'] as const,
  tasks: () => [...vaultQueryKeys.all, 'tasks'] as const,
  task: (id: string) => [...vaultQueryKeys.tasks(), id] as const,
  projects: () => [...vaultQueryKeys.all, 'projects'] as const,
  project: (id: string) => [...vaultQueryKeys.projects(), id] as const,
  areas: () => [...vaultQueryKeys.all, 'areas'] as const,
  area: (id: string) => [...vaultQueryKeys.areas(), id] as const,
}
