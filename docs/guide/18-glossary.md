[← Back to Documentation index](./README.md) · [← Environment Variables](./17-environment-variables.md)

# Glossary

- **cuid** — collision-resistant, URL-safe unique ID format used for every primary
  key in both backends (`cuid2` package on the Python side, Prisma's built-in
  `cuid()` on the Node side).
- **RBAC** — role-based access control; see
  [Authorization (RBAC)](./04-authorization-rbac.md).
- **Cache-aside** — a caching pattern where the application checks the cache
  first, falls through to the real data source on a miss, then populates the
  cache — as opposed to the cache being updated proactively on every write. Used
  for the dashboard summary (see [Redis Usage](./07-redis.md)).
- **Pre-signed URL** — a time-limited URL that grants temporary permission to
  upload/download one specific S3 object, generated server-side using AWS
  credentials the client never sees, without the file's bytes ever passing through
  the API server itself.
- **OAC (Origin Access Control)** — the modern AWS mechanism for letting
  CloudFront (and only CloudFront) read from a private S3 bucket, without the
  bucket needing any public access.
- **ASG (Auto Scaling Group)** — a set of EC2 instances managed as a group; here
  used at a fixed size (not for elastic scaling) mainly so the ALB target group
  registration and instance self-healing come for free.
- **Token versioning** — the refresh-token revocation scheme used here: a single
  integer per user in Redis, embedded in every issued refresh token, bumped on
  logout so older tokens are rejected even though their JWT signature is still
  valid. See [Authentication](./03-authentication.md).
- **Fail open** — a failure-handling stance where, if a dependency (here, Redis)
  is unavailable, the system degrades gracefully rather than rejecting requests —
  used consistently across caching, rate limiting, and refresh-token revocation
  in this app. See [Redis Usage](./07-redis.md).

---

[← Environment Variables](./17-environment-variables.md) · [Back to Documentation index →](./README.md)
