---
title: Acme Dashboard Redesign
unique-id: acme-dash-2024
area: "[[Acme Corp]]"
description: Complete redesign of the Acme Corp internal dashboard.
start-date: 2024-08-15
end-date: 2025-02-28
---

## Project Overview

Redesigning Acme Corp's internal analytics dashboard. Current system is slow, hard to use, and missing key features.

## Stakeholders

- **Sponsor:** [[Sarah Chen]] (VP Engineering)
- **Users:** Operations team (~50 people)
- **Technical Lead:** Me

## Scope

### In Scope
- New dashboard UI with modern design
- Performance improvements (target: <2s load time)
- Key metrics visualization
- Export functionality
- Role-based access

### Out of Scope
- Mobile app (future phase)
- Real-time updates (future phase)
- Historical data migration beyond 2 years

## Timeline

| Phase | Dates | Status |
|-------|-------|--------|
| Discovery | Aug 15 - Sep 15 | Complete |
| Design | Sep 16 - Oct 31 | Complete |
| Development | Nov 1 - Jan 31 | In Progress |
| Testing | Feb 1 - Feb 15 | Not Started |
| Launch | Feb 28 | Target |

## Tech Stack

- React + TypeScript
- TanStack Query for data fetching
- Recharts for visualizations
- Tailwind CSS

## Risks

1. **Data quality issues** - Some legacy data may be inconsistent
2. **Scope creep** - Stakeholders keep requesting new features
3. **Timeline pressure** - Feb 28 deadline is firm

## Meeting Notes

Weekly syncs on Thursdays. Notes kept in separate meeting notes files.

- [[2025-01-16 Acme Sync]]
- [[2025-01-09 Acme Sync]]
- [[2025-01-02 Acme Sync]]
