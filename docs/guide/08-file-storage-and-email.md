[← Back to Documentation index](./README.md) · [← Redis Usage](./07-redis.md)

# S3 File Storage & Email Notifications

## S3 client

`app/core/s3.py` — a boto3 client (`region_name=settings.aws_region`, credentials
via boto3's default chain: env vars locally, the EC2 instance's IAM role in
production — **never** hardcoded, never passed to the frontend). Four functions:

- `generate_presigned_put_url(key, content_type)` — a short-lived (5 min) URL the
  client can `PUT` a file to directly, no server involvement in the actual byte
  transfer. Raises `AppError(..., 501)` if `S3_UPLOADS_BUCKET` isn't configured,
  rather than producing a URL that can never work.
- `generate_presigned_get_url(key)` — same idea for reading. Returns `None`
  (not an error) if `S3_UPLOADS_BUCKET` isn't configured, so serializing an
  entity that happens to reference a file doesn't itself break when uploads
  aren't set up.
- `object_exists(key)` — a `head_object` check, `False` (not an exception) if
  uploads aren't configured. Used to confirm a client's direct-to-S3 upload
  actually landed before any DB row is written referencing it.
- `delete_object(key)` — best-effort delete, no-ops if uploads aren't configured.

Two independent things are built on this, sharing the same pre-signed-URL
mechanics but different data models:

## 1. Employee profile images (`employees_service.py`) — one per employee

1. Client calls `POST /employees/me/profile-image/upload-url` with
   `{contentType: "image/jpeg" | "image/png" | "image/webp"}`.
2. Server computes a **deterministic** key —
   `employees/{employeeId}/profile-image.{ext}` — and returns a pre-signed PUT URL
   for it. One image per employee; a new upload overwrites the last one rather
   than accumulating objects.
3. Client `PUT`s the file bytes straight to that URL (S3, not the API).
4. Client calls `POST /employees/me/profile-image/confirm` with the *same*
   `{contentType}`. The server **recomputes** the identical key itself — it never
   trusts a key/path the client sends — and saves it on the Employee row. Note
   this step does *not* verify the object actually exists (see the Document flow
   below, which does) — a straggler from before that check existed.
5. Whenever an Employee is serialized in any API response, `profileImage` is
   resolved from the stored key to a fresh pre-signed **GET** URL on the way out
   (`employees_service.py::_serialize`) — the raw key is never exposed, and the
   bucket itself is fully private (no public bucket policy, all public-access-block
   settings on).

## 2. Employee documents & leave-request attachments (`documents_service.py`) — many per entity

The gap this closed: profile images are a single deterministic slot, but
"employee documents" (ID scans, offer letters) and "leave documents" (medical
certificates) are zero-or-more files with real filenames, needing their own
table — [`Document`](./02-data-model.md), polymorphically associated via
`(entityType, entityId)`, the same pattern `AuditLog` already used.

1. Client calls `POST .../documents/upload-url` with `{fileName, contentType}`
   (`contentType` restricted to a fixed allowlist: PDF, JPEG, PNG, DOC, DOCX —
   see `documents_service.DOCUMENT_CONTENT_TYPES`). Server generates a new
   document ID (`cuid`), computes a key —
   `employees/{id}/documents/{documentId}.{ext}` or
   `leave-requests/{id}/documents/{documentId}.{ext}` — and returns
   `{documentId, uploadUrl, expiresIn}`. **Nothing is written to the database
   yet.**
2. Client `PUT`s the file to that URL.
3. Client calls `POST .../documents/confirm` with
   `{documentId, fileName, contentType}`. The server recomputes the same key
   from `documentId` + `contentType` (never trusts one from the client) and
   calls `s3.object_exists(key)` — if the object genuinely isn't there (upload
   never happened, or failed), this returns `400`, **not** a dangling DB row
   referencing a file that doesn't exist. Only on success is the `Document` row
   created, in the same transaction as an `EMPLOYEE_DOCUMENT_UPLOADED` /
   `LEAVE_DOCUMENT_UPLOADED` audit record.
4. `GET .../documents` lists an entity's documents, each resolved to a fresh
   pre-signed `downloadUrl` at read time (`documents_service._serialize`).
5. `DELETE .../documents/{id}` removes the S3 object and the DB row together
   (audit-logged as `*_DOCUMENT_DELETED`).

**Who can do what**: employee documents follow the same self-service-vs-staff
split as the rest of `/employees` (`/me/documents/...` for your own, `/{id}/documents/...`
gated to `STAFF_ROLES`/`ADMIN_ROLES` for anyone else's — see
[API Reference](./06-api-reference.md)). Leave documents are gated by a dedicated
visibility check, `leave_service.get_visible_leave_request` — the request's own
employee or a `CAN_MANAGE` role (SUPER_ADMIN/HR_ADMIN/MANAGER) can see them;
anyone else gets a `404` (not `403`, so the leave request's existence isn't leaked
to someone who shouldn't know about it). Deleting a leave document is further
restricted to while the request is still `PENDING`, unless you're a
`CAN_MANAGE` role.

Tested with `moto` (mocked S3, no real AWS needed) —
`fastapi-backend/tests/test_documents.py` exercises the full upload → confirm →
list → delete round trip against a real (mocked) bucket, plus the
unsupported-content-type, S3-not-configured, confirm-without-a-real-upload, and
leave-document-visibility edge cases. See [Testing](./14-testing.md).

## 3. Email notifications (SES)

The other side of "notifications" — [notifications endpoints](./06-api-reference.md)
are in-app only (DB rows, polled by the frontend); this is the actual-email half,
added so a leave decision reaches someone even if they aren't looking at the app.

- `app/core/email.py` — a lazy-initialized `boto3.client("ses", ...)`, same shape
  as `s3.py`'s client (`get_ses_client()` / module-level `_client`), and one
  function: `send_email(to, subject, body_text)`. **No-ops** (doesn't call SES at
  all) unless both `EMAIL_ENABLED=true` and `SES_FROM_EMAIL` are set — so local
  dev and CI, which have neither configured, never attempt a real AWS call. If SES
  itself errors (unverified sender, throttling, etc.), the exception is caught and
  logged, **never raised** — a bounced/failed email must not turn into a failed
  API request for the thing the email was *about* (submitting/approving/cancelling
  leave still has to succeed even if the notification email doesn't send).
- `app/services/email_service.py` — three thin, named wrappers
  (`send_leave_requested`, `send_leave_decided`, `send_leave_cancelled`) so the
  call sites in `leave_service.py` read as intent, not raw SMTP-shaped calls, and
  so tests can `monkeypatch` exactly one of these three functions per scenario.
- **Delivery mechanism**: FastAPI's `BackgroundTasks`, threaded through from each
  router function (`app/api/v1/leave.py`) down into the matching
  `leave_service.create/decide/cancel` call. The email is queued *after* the
  database transaction commits, and runs after the HTTP response has already been
  sent — a slow or failed SES call never adds latency to the leave-request
  response itself. This was a deliberate, minimal choice over a real task queue
  (Celery/SQS+worker): at this scale a stuck email send blocking one gunicorn
  worker for a few seconds is an acceptable tradeoff; a real queue (SQS + a
  worker fleet, or Celery/arq) is the obvious next step if this ever needed to
  scale — see [Current State & Known Gaps](./11-known-gaps.md).
- **No new dependency** — `boto3` was already a dependency for S3, so SES rides
  along for free.
- Tested in `fastapi-backend/tests/test_leave.py` by monkeypatching the three
  `email_service` functions to `Mock()`s and asserting call counts, rather than
  hitting real SES (there's no SES equivalent of the `moto` S3 mock used for file
  storage in this suite, so the test boundary is drawn one layer up, at
  `email_service`, instead of at the boto3 client).

**Terraform follow-up, not yet done**: the EC2 instance role in
[Terraform / AWS Infrastructure](./16-terraform.md) doesn't yet grant
`ses:SendEmail`/`ses:SendRawEmail`, and no SES sender identity has been verified —
`EMAIL_ENABLED` would need to stay `false` in the current Terraform deploy even if
it were applied.

---

[← Redis Usage](./07-redis.md) · Next: [Frontend Architecture →](./09-frontend.md)
