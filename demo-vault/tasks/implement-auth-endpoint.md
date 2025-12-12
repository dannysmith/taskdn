---
title: Implement user authentication endpoint
status: in-progress
created-at: 2025-01-06
updated-at: 2025-01-12T16:45
projects:
  - "[[API Migration]]"
area: "[[TechStart]]"
due: 2025-01-17
---

## Overview

Implement the `/auth/login` and `/auth/refresh` endpoints for the new Go API.

## Requirements

- JWT token generation
- Refresh token rotation
- Auth0 integration for identity verification
- Rate limiting on login attempts

## Progress

- [x] Set up Auth0 connection
- [x] Implement login endpoint
- [ ] Implement refresh endpoint
- [ ] Add rate limiting
- [ ] Write integration tests

## Technical Notes

Using `golang-jwt/jwt/v5` for token handling. Tokens expire after 15 minutes, refresh tokens after 7 days.

```go
// Token claims structure
type Claims struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
    jwt.RegisteredClaims
}
```
