---
title: Fix API rate limiting bug
status: in-progress
created-at: 2026-01-12
updated-at: 2026-01-15T14:30
projects:
  - "[[Acme Dashboard Redesign]]"
scheduled: 2026-01-15
---

Users hitting rate limits when refreshing dashboard too quickly. Need to implement proper debouncing and caching.

## Investigation

Found the issue - each filter change triggers 3 separate API calls. Should batch these.

## Fix approach

1. Use React Query's `enabled` flag to delay queries
2. Add debounce to filter inputs
3. Consider server-side caching for expensive queries

Started implementation, PR is in draft: #247
