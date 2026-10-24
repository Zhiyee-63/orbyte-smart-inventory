---
name: Express startup errors
description: Express 5 listen callback behavior can hide failed binds behind misleading success logs.
---

Handle the error argument of Express 5's listen callback before reporting that the server is ready.

**Why:** Unlike an unhandled server error, a bind failure delivered to this callback can leave the process exiting successfully if ignored. A suspended terminal server can still reserve its port, even though it cannot answer requests.

**How to apply:** When startup logs claim success but the workflow finishes or HTTP requests hang, check the bind error and existing port owner rather than adding restart loops or keepalive timers.

Express 5 catch-all routes require a named wildcard. Use `/{*splat}` when the match must include `/`; a bare `*` throws during route registration.

**Why:** A SPA fallback using older Express syntax can crash before the listener opens, even when the frontend builds successfully.

**How to apply:** When adding frontend hosting or diagnosing failed startup probes, verify the production entrypoint actually starts and serves `/`, not only that the asset build succeeds.
