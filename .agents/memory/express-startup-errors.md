---
name: Express startup errors
description: Express 5 listen callback behavior can hide failed binds behind misleading success logs.
---

Handle the error argument of Express 5's listen callback before reporting that the server is ready.

**Why:** Unlike an unhandled server error, a bind failure delivered to this callback can leave the process exiting successfully if ignored. A suspended terminal server can still reserve its port, even though it cannot answer requests.

**How to apply:** When startup logs claim success but the workflow finishes or HTTP requests hang, check the bind error and existing port owner rather than adding restart loops or keepalive timers.
