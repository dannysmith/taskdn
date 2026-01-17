---
title: Fix API rate limiting bug
status: in-progress
created-at: 2025-01-19
updated-at: 2025-01-22T14:30
projects:
  - "[[Acme Dashboard Redesign]]"
---

Users hitting rate limits when refreshing dashboard too quickly. Need to implement proper debouncing and caching.

## Investigation

Found the issue - each filter change triggers 3 separate API calls. Should batch these.

## Fix approach

1. Use React Query's `enabled` flag to delay queries
2. Add debounce to filter inputs
3. Consider server-side caching for expensive queries

Started implementation, PR is in draft: #247
