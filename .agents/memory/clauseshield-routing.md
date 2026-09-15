---
name: ClauseShield routing
description: The proxy path decision that keeps the contract audit endpoint reachable.
---

ClauseShield owns the `/api` prefix. The workspace's generic API scaffold must stay on a different prefix so `POST /api/analyze` reaches the app's own Express server.

**Why:** The shared proxy chooses artifact services by path specificity, and the generic scaffold initially intercepted ClauseShield requests.

**How to apply:** Preserve the ClauseShield `/api` service path and avoid assigning another artifact to `/api`; use a separate internal prefix for unrelated API scaffolding.