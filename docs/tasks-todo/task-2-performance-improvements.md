# Task: Performance Review

> Independant review looking for performance issues of any kind

## Findings Summary

[performance-review.md](./performance-review.md)

**Overall Assessment:** The codebase has solid architectural foundations but three critical issues prevent meeting performance targets: (1) Full vault scans for fuzzy lookups instead of using indexes (500ms vs 1ms), (2) No parallelization despite having rayon available (2500ms vs 750ms for 5000 files), (3) Chatty NAPI interface causing multiple redundant scans (up to 1500ms for fuzzy entity lookup). With the three high-priority fixes identified, the CLI would comfortably meet all performance targets. TypeScript layer is already efficient.

## Actions

1. **Add parallelization to file scanning** (`tdn-cli/crates/core/src/vault.rs:76-112`)

   - Issue: Sequential I/O makes 5000-file scan take ~2500ms instead of ~750ms
   - Solution: Use `rayon` to parallelize `scan_directory()` function
   - Impact: 3× faster vault scans (meets <500ms target for 5000 files)

2. **Fix find\_\*\_by_title to use indexing** (`tdn-cli/crates/core/src/vault.rs:44-72`)

   - Issue: O(n) full vault scan for every title lookup (500ms per lookup)
   - Solution: Cache scan results or expose VaultIndex to TypeScript
   - Impact: 500× faster lookups (500ms → 1ms)

3. **Add unified entity lookup function** (new NAPI function)

   - Issue: Fuzzy lookup tries each entity type sequentially (up to 3 scans = 1500ms)
   - Solution: Single NAPI function `find_entity_by_query()` that searches all entity types in one scan
   - Impact: 3× faster fuzzy lookups

4. **Expose VaultIndex as NAPI type** (`tdn-cli/crates/core/src/vault_index.rs`)

   - Issue: Index rebuilt for every query
   - Solution: Let TypeScript build index once and pass to multiple queries
   - Impact: 10× faster multi-query operations (e.g., `context` command)

5. **Add VaultConfig caching** (`tdn-cli/crates/core/src/vault_index.rs:117`)

   - Issue: VaultConfig cloned on every NAPI call (unnecessary allocations)
   - Solution: Thread-local storage for VaultConfig
   - Impact: Marginal but cleaner code
