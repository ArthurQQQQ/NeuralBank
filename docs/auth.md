# GitHub and reviewed academic-email login

The public GitHub Pages site can use Supabase Auth and Postgres without moving
its frontend or reviving the unavailable Sites project. The existing Sites/D1
server remains a separate deployment. An unconfigured build is a local guest
application: it does not invent an account or claim cloud saves.

This integration uses the official, pinned Supabase browser SDK, bundled into
`src/vendor/supabase.js`. OAuth and PKCE are handled by the SDK. Learning progress
is owned by the verified Supabase user UUID, not an email address, display name,
client-supplied owner ID, or editable user metadata. A GitHub login proves a
GitHub identity; it does not certify university membership.

The browser's opaque account ID is `supabase:PROJECT_HOST:USER_UUID`. This keeps
offline caches and pending intents separate between Supabase projects and from
the earlier Sites identity provider. SQL ownership remains the actual JWT's
`auth.uid()` UUID; the browser ID never selects a database owner.

## Cloud setup still required

An administrator must create/select a real Supabase project, apply
`supabase/migrations/0001_neuralbank_auth.sql`, configure the providers below,
and supply this **public** configuration to the frontend's configuration file:

```js
{
  url: 'https://YOUR_PROJECT.supabase.co',
  publicKey: 'sb_publishable_REPLACE_WITH_PROJECT_PUBLIC_KEY',
  githubEnabled: false,
  emailEnabled: false
}
```

Enable each flag only after its real provider and an end-to-end login have been
verified. The project URL and publishable key may be public; an OAuth client
secret, SMTP password, Supabase management token, database password, secret key,
or legacy `service_role` key must remain in the provider dashboard/credential
store. The browser adapter accepts publishable or legacy `anon` public keys,
and rejects service-role credentials. Public keys require database policies;
they are not user identity. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

The configured repository connector does not create a Supabase project, register
an OAuth App, verify a sending domain, or provide SMTP. Those account settings
are genuine launch prerequisites. This setup never changes or rebinds the
unavailable Sites project.

## GitHub OAuth and redirect URLs

1. Register a GitHub OAuth App under an administrator-controlled GitHub account
   or organization. Set its homepage to
   `https://arthurqqqq.github.io/NeuralBank/` and its callback to the project's
   actual `https://PROJECT_REF.supabase.co/auth/v1/callback` URL.
2. Enter its client ID and secret in Supabase Authentication → Providers →
   GitHub. Do not put the secret in the repository or browser configuration.
3. Set Supabase's Site URL to the Pages URL. Allow the exact application return
   URL used by this build, including the `/NeuralBank/` project path. If testing
   locally, separately allow only the required localhost URL. Do not use a broad
   production wildcard.
4. Test sign-in, cancellation, refresh, sign-out, and an account switch before
   enabling `githubEnabled`.

The callback returns to the existing page, not a nonexistent Pages server route.
The adapter captures `code`/OAuth errors synchronously before the hash router
runs, exchanges the code, removes authentication query parameters, and preserves
the application hash. The PKCE verifier must survive the redirect in the same
browser; a browser that cannot persist it must not start this OAuth flow.
See [GitHub provider setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-github),
[redirect allowlists](https://supabase.com/docs/guides/auth/redirect-urls), and
[Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

## Email OTP and delivery

Configure **both Confirm sign up and Magic Link** email templates to include
`{{ .Token }}` for a six-digit code. With `shouldCreateUser: true`, a first-time
email account can use the sign-up confirmation template; configuring only the
returning-user template leaves new users with a link they cannot enter as a code.
The API named `signInWithOtp` sends a link by default; changing these templates
is necessary for the UI's code-entry flow. Keep email confirmation enabled and
password/anonymous sign-up methods disabled if they are not offered by this app.
The adapter verifies the entered token using the SDK, then checks the account's
trusted database eligibility. See [passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless)
and [Auth email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

Public email login needs a real delivery service. Supabase's default SMTP sends
only to project-team addresses and currently allows two messages per hour; it
is not a public-school-email delivery solution. Configure a custom SMTP provider
and an authorized From address, including the provider's required sender-domain
DNS records. A custom SMTP project initially has a 30-message/hour limit, which
must be reviewed against expected traffic and the email provider's own limits.
Do not enable `emailEnabled` before delivery to real, independent institution
mailboxes succeeds. See [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
and [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## Academic domains: reviewed allowlist, not `.edu`

The migration intentionally approves **zero** institution domains. GitHub can be
enabled independently. Email login remains denied until maintainers review and
import appropriate institution domains. Both the database and frontend preflight
check the allowlist; bypassing frontend JavaScript cannot unlock progress access.

Prepare public candidate data without touching any cloud project:

```sh
node auth/import-academic-domains.mjs --output /tmp/neuralbank-domain-candidates.json
```

The script pins JetBrains/swot commit
`c72dc870cfdc7a84b2bc7cdf0e0230369e134c22` and its archive checksum, checks a
pinned checksum of the official Public Suffix List, removes shared providers,
public suffixes and SWOT abuse entries, and outputs **unapproved candidates**.
An upstream source change fails closed. Optional `--archive` and `--psl` accept
offline copies matching those same hashes; updating a pin requires a deliberate
source review. At this snapshot it yields 26,472 candidates, not approved schools.

SWOT is an educational-license dataset with IT-course and other inclusion rules;
it includes some school groups and is not an exhaustive universities registry.
Its contents do not establish current student status. Maintainers must review
official university evidence that the institution owns/uses the exact email
domain. An institution's website domain alone is insufficient evidence of an
email domain. See [SWOT's own inclusion rules](https://github.com/JetBrains/swot)
and the [Public Suffix List](https://publicsuffix.org/list/).

Write an explicit reviewed manifest (synthetic illustration only):

```json
{
  "schemaVersion": 1,
  "domains": [{
    "domain": "REPLACE_WITH_REVIEWED_CANDIDATE",
    "institution": "Official institution name",
    "allowSubdomains": false,
    "evidenceUrl": "https://official-institution.example/email-policy",
    "reviewedBy": "Maintainer identifier",
    "reviewedAt": "2026-11-26T00:00:00Z"
  }]
}
```

Then prepare SQL for review and a separate administrator application:

```sh
node auth/import-academic-domains.mjs --approved /tmp/reviewed-domains.json --output /tmp/reviewed-domains.sql
```

The script never applies SQL. It accepts only explicitly reviewed, nonblocked
candidates; a domain absent from SWOT requires separate official evidence and a
reviewed administrator migration, not an invented suffix rule. Grant subdomain
coverage only when the institution controls that namespace. Matches require the
exact domain or a `.` boundary; `university.edu.attacker.com` and
`fakeuniversity.edu` do not match `university.edu`. Abuse blocks override an
approved parent. Shared consumer/tenant-provider roots are denied.

Provide an issue/PR path for an unrecognized institution with its official email
documentation. Never request an applicant's password, OTP or private mailbox
content. A successful OTP proves access to that mailbox, which may belong to
staff or alumni; the UI must not call it proof of current enrollment or promise
that every university worldwide already works.

Enable `public.neuralbank_before_user_created` as the Before User Created SQL
hook in Authentication → Hooks. Current official hook documentation lists this
hook on Free and Pro. It blocks new unapproved email registrations early;
confirmed-email checks in the RLS/RPC gate still apply to existing accounts and
later sign-ins. If this hook is not enabled, callers can still use the public
Auth API directly to create accounts or request mail, bypassing the frontend
preflight; RLS denies ineligible accounts access to this site's cloud learning
data, but does not itself restrict Auth account creation. Only Supabase Auth's trusted hook event/provider fields are
used, not user metadata. See [Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks)
and [Before User Created](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook).

## Progress ownership and concurrency

Only `public` should be an exposed Data API schema. Keep `neuralbank_private`
unexposed. The private progress table has RLS policies for authenticated,
eligible owners and no guest or delete grants. Academic-domain tables are not
client-readable. `get_neuralbank_auth_status()` inspects Auth's server-owned
users/identities. GitHub identities are allowed; email identities additionally
need a confirmed primary email and an approved, nonblocked domain.

The client transport presents the existing `/api/session` and `/api/learning`
Response interface to the learning library, but calls these Supabase RPCs:

| RPC | Result |
| --- | --- |
| `check_neuralbank_email_domain(email_address)` | Boolean preflight; no users disclosed |
| `get_neuralbank_auth_status()` | `{eligible, reason}` |
| `get_neuralbank_learning()` | `{learned, revision, updatedAt}` |
| `put_neuralbank_learning(expected_revision, model_ids)` | `{ok:true,...snapshot}` or `{ok:false,code:"REVISION_CONFLICT",...snapshot}` |

No RPC accepts an owner ID. `auth.uid()` selects the authenticated owner. PUT
validates known catalog IDs, locks that owner's row, compares its revision and
updates atomically. The adapter maps a conflict to HTTP 409 for existing
pending-intent rebasing and rejects an `X-NeuralBank-User` mismatch. Requests
must keep the exact token used to verify the owner so a cross-tab account switch
cannot write one account's pending intent into another account.

The initial SQL catalog contains the current 64 model IDs. A catalog expansion
needs a subsequent reviewed ID migration. Local guest progress is imported only
through the existing explicit import action; signing in does not silently merge
identities. GitHub and academic accounts with different emails may be separate
Supabase users unless a deliberate verified linking flow is implemented. See
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and
[identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).

## Verification and maintenance

```sh
npm ci --prefix auth
npm run build --prefix auth
node --test server/cloud-auth.test.mjs
node auth/check-migration.mjs --require
```

The SQL check requires local PostgreSQL server binaries discoverable through
`pg_config` and a non-root OS user. It creates its own temporary cluster using
only a private Unix socket, applies the migration with synthetic Supabase Auth
fixtures, tests identity confirmation, allowlist boundaries, role grants, RLS
isolation, validation, persistence and concurrent revision CAS, then deletes the
cluster. It ignores database connection environment variables and never connects
to an existing/cloud database. Without `--require`, unavailable local PostgreSQL
prints an explicit **SKIP**, not a claimed SQL test success. These checks do not
replace live OAuth, SMTP, account-switch and two-device tests on the configured
project. The SDK vendor bundle has its own reproducible package lock and MIT
notices; update it deliberately and rerun tests.

Review provider quota/abuse logs, sending reputation, domain changes and policy
migrations periodically. As checked on 2026-11-26, Supabase Free includes
50,000 monthly active users and 500 MB database storage, but pauses after one
week of inactivity and does not include automatic backups. Public SMTP delivery
has separate provider costs/limits. Production availability and backups may
therefore warrant a paid project; no subscription is required merely to prepare
this code. See the current [Supabase pricing](https://supabase.com/pricing).
