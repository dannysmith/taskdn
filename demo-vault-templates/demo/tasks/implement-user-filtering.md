---
title: Implement user filtering for dashboard
status: in-progress
created-at: 2026-01-03
updated-at: 2026-01-14
projects:
  - "[[Acme Dashboard Redesign]]"
---

Add ability to filter dashboard data by user. This is a key feature request from the operations team. [[Sarah Chen]] flagged this as high priority in last week's sync.

## Requirements

- Filter by individual user
- Filter by user role
- Filter by department
- Filters should persist in URL for shareability

## Progress

- [x] Design filter UI component
- [x] Add filter state management
- [ ] Implement API endpoint for filtered data
- [ ] Connect UI to API
- [ ] Testing

## Technical Notes

Using TanStack Query for data fetching. Need to add query params to the existing dashboard query.

The API team said they can have the endpoint ready in a couple of days. See [[2026-01-09 Acme Sync]] for details.
