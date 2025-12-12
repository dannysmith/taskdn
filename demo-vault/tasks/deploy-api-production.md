---
title: Deploy API to production
status: blocked
created-at: 2025-01-11
updated-at: 2025-01-12
projects:
  - "[[API Migration]]"
area: "[[TechStart]]"
---

## Blocker

Waiting on Priya's code review for the auth endpoints. Can't deploy until that's approved and merged.

PR: https://github.com/techstart/api-v2/pull/47

## Deployment Plan

Once unblocked:
1. Merge PR to main
2. Run full test suite
3. Deploy to staging
4. Smoke tests
5. Gradual rollout to production (10% → 50% → 100%)

## Notes

Have the rollback plan ready. Last deploy had issues with connection pooling.
