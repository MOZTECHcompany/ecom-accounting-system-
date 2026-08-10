# LUNA Ads Dashboard publication service

This is a separate Cloud Run service for publishing a generated LUNA Ads
Dashboard without making its GCS bucket public.

## Security and data model

- A publication is immutable. `artifactId` is idempotent and permanently binds
  to one SHA-256 and byte length.
- The HTML bytes are stored in a private GCS bucket under a path derived from
  hashes. The service writes with `ifGenerationMatch=0`, reads the object back,
  and verifies its exact GCS generation, byte length, and SHA-256. The ledger
  pins the generation, so deleting and recreating the same object name cannot
  silently replace a publication.
- The Cloud SQL ledger stores the opaque public ID, object pointer, SHA-256,
  creator, expiry, revocation, entity, report date, source digest, LUNA task,
  requested platform, platform coverage, and brand-mapping coverage. It does
  not store the HTML, raw ad-account IDs, or an access token.
- Ingest and revoke requests require a Google-signed ID token for the configured
  Cloud Run audience. The token's verified email must exactly match a
  configured GCE service account. User accounts and query-string tokens are not
  accepted.
- Viewer URLs use `https://ads.corely.cc/d/<256-bit-public-id>`. Revoked,
  expired, malformed, and unknown IDs all become a non-descriptive `404`.
- The viewer re-verifies the stored bytes for every response and sends
  `no-store`, `noindex`, `no-referrer`, frame denial, and a no-script CSP.
- The canonical host check prevents the Cloud Run `run.app` hostname from
  becoming a second advertised viewer origin.
- `VIEWER_ACCESS_MODE=capability` supports direct Cloud Run domain mapping.
  A later HTTPS load balancer + IAP migration can switch to `iap`; the service
  then verifies `X-Goog-IAP-JWT-Assertion`, its IAP audience and optional
  email/domain allowlist before reading the ledger.

An opaque URL is a revocable capability, not user authentication. It is
appropriate for a private company Discord with short retention, but it can be
forwarded by anyone who receives it. If dashboards later need per-user access,
put an identity-aware proxy in front of the viewer and switch
`VIEWER_ACCESS_MODE=iap`. Direct Cloud Run domain mapping does not itself
provide IAP.

## HTTP contract

### `POST /v1/publications`

Required headers:

```text
Authorization: Bearer <Google ID token>
Content-Type: text/html; charset=utf-8
X-Luna-Artifact-Id: <stable artifact id>
X-Luna-Sha256: <64 lowercase hex characters>
X-Luna-Expires-At: <optional ISO-8601 timestamp>
X-Luna-Entity-Id: <bounded internal entity id>
X-Luna-Source-Digest: <64 lowercase hex characters>
X-Luna-Report-Date: <YYYY-MM-DD>
X-Luna-Task-Id: <bounded LUNA task id>
X-Luna-Requested-Platform: <all|meta|google>
X-Luna-Platform-Coverage: <bounded JSON object>
X-Luna-Brand-Mapping-Coverage: <bounded JSON object without account ids>
```

The raw request body is the complete self-contained HTML. A new publication
returns `201`; a byte-identical retry returns `200`, the same `publicId`, and
`idempotent: true`. The response repeats the normalized cross-binding metadata,
so LUNA can prove that the URL represents the same entity, source snapshot,
task, report date, requested Meta/Google scope, and account-to-brand mapping
coverage. Reusing an artifact ID with different bytes **or** source context
returns `409`.

Coverage headers are each limited to 4096 UTF-8 bytes and accept only a
strictly bounded schema. `Platform-Coverage` contains `meta` / `google` row and
comparison counts. `Brand-Mapping-Coverage` contains only aggregate
mapped/unmapped account counts and visible-account counts; raw account IDs and
unknown fields are rejected.

### `POST /v1/publications/:artifactId/revoke`

Requires the same ID-token authentication. Revocation is idempotent and does
not immediately delete audit metadata or bytes. The public URL begins returning
`404` immediately.

### `GET|HEAD /d/:publicId`

Returns the verified HTML only while active and only on `PUBLIC_ORIGIN`'s host.
The GCS object name is never returned.

### Health

- `GET /health`: process liveness only (`/healthz` remains an application
  compatibility alias, but Cloud Run may reserve exact paths ending in `z`).
- `GET /ready`: verifies Cloud SQL connectivity without exposing database
  details (`/readyz` remains a compatibility alias).

## Local test

```bash
npm install
npm test
```

The test suite uses in-memory fakes. It never needs GCP credentials, a bucket,
or a database.

## Production prerequisites

1. Create a dedicated GCS bucket in the deployment region. Enable uniform
   bucket-level access and Public Access Prevention. Do **not** grant
   `allUsers` or `allAuthenticatedUsers`.
2. Create a project custom role from
   `deploy/storage-object-read-create-role.yaml` and grant it to the Cloud Run
   runtime service account on this bucket only. It contains exactly
   `storage.objects.create` and `storage.objects.get`; the service cannot list,
   overwrite, update, delete, or change IAM. If built-in roles are used instead,
   `roles/storage.objectViewer` also grants list permission and is therefore a
   broader fallback.
3. Apply `migrations/001_create_publication_ledger.sql` as the migration owner.
   Create a dedicated Cloud SQL login and apply the narrowed grants in
   `002_runtime_grants.sql.template`. Put its `DATABASE_URL` in Secret Manager.
4. Attach that one Secret to the Cloud Run runtime service account with
   secret-level `roles/secretmanager.secretAccessor`; do not grant it at project
   scope. Give the runtime service account `roles/cloudsql.client` for the
   selected Cloud SQL instance/project; it needs no database-owner privileges.
5. Deploy Cloud Run with the runtime service account, Cloud SQL attachment,
   non-secret values from `.env.example`, and `--allow-unauthenticated`.
   Unauthenticated invocation is needed only for `GET /d/...`; the service
   performs cryptographic path-level authentication for ingest and revoke.
6. Configure `ads.corely.cc` through the chosen Cloud Run custom-domain or HTTPS
   load-balancer path, then keep `PUBLIC_ORIGIN=https://ads.corely.cc`.
7. Give the GCE LUNA worker a dedicated service account and place its exact
   email in `INGEST_ALLOWED_CALLERS`. Do not create a static bearer secret.
8. Apply `deploy/gcs-lifecycle.json` only when `MAX_TTL_SECONDS` stays at or
   below 90 days. The extra 30 days preserve a short audit/recovery window.

For the first direct-domain release, keep `VIEWER_ACCESS_MODE=capability`. To
upgrade later, place the service behind an HTTPS load balancer with IAP, set
`VIEWER_ACCESS_MODE=iap`, set the exact backend-service audience in
`IAP_AUDIENCE`, and optionally configure `IAP_ALLOWED_EMAILS` or
`IAP_ALLOWED_DOMAINS`. The IAP mode validates the signed assertion in the
application as defense in depth; it does not trust an unsigned identity header.

The service itself never creates IAM bindings, a public bucket, DNS records, or
database roles. Those remain explicit deployment operations.

## GCE caller example

The LUNA worker obtains a short-lived ID token from the metadata server. The
token is placed only in the `Authorization` header:

```bash
AUDIENCE='https://luna-ads-dashboard-REPLACE.asia-east1.run.app'
ID_TOKEN="$(curl -fsS \
  -H 'Metadata-Flavor: Google' \
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${AUDIENCE}&format=full")"
SHA256="$(shasum -a 256 dashboard.html | awk '{print $1}')"

curl -fsS -X POST "${AUDIENCE}/v1/publications" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H 'Content-Type: text/html; charset=utf-8' \
  -H 'X-Luna-Artifact-Id: example-artifact-id' \
  -H "X-Luna-Sha256: ${SHA256}" \
  -H 'X-Luna-Entity-Id: tw-entity-001' \
  -H 'X-Luna-Source-Digest: REPLACE_64_HEX_SOURCE_DIGEST' \
  -H 'X-Luna-Report-Date: 2026-08-03' \
  -H 'X-Luna-Task-Id: REPLACE_LUNA_TASK_ID' \
  -H 'X-Luna-Requested-Platform: all' \
  -H 'X-Luna-Platform-Coverage: REPLACE_COMPACT_JSON' \
  -H 'X-Luna-Brand-Mapping-Coverage: REPLACE_COMPACT_JSON' \
  --data-binary @dashboard.html
```

Do not add the ID token to the URL, a Discord message, application logs, or the
publication ledger.
