# CP Sync Full-Scale Implementation Plan

## 1. Product Direction

CP Sync should grow from a browser-based solution uploader into a reliable competitive-programming learning and engineering platform.

The product must answer four questions:

1. How can a user capture a problem and solution reliably?
2. How can the user store, organize, search, and review that work?
3. How can the product explain progress, weaknesses, failures, and next actions?
4. How can all of this work safely across devices, repositories, platforms, and network conditions?

The existing extension remains the first client, but the long-term system should separate browser capture, synchronization, storage, analytics, and learning workflows.

## 2. Delivery Principles

- Preserve current manual upload behavior while new features are introduced.
- Prefer additive migrations over breaking changes.
- Make every upload idempotent and recoverable.
- Treat platform scraping as an unreliable boundary.
- Never silently overwrite user code or lose upload history.
- Keep credentials and page data within the minimum required trust boundary.
- Add tests before replacing parsers or upload behavior.
- Ship in vertical milestones that produce usable value.

## 3. Target Architecture

### 3.1 Extension

- Content adapters detect the active platform and collect page data.
- Platform parsers normalize page data into a versioned problem/submission contract.
- A capture layer supports parser fallbacks and user correction.
- A local queue stores pending upload jobs and retry state.
- The background service worker owns network operations and synchronization.
- Popup and options pages consume shared typed domain functions.

### 3.2 Backend

Introduce a backend when cross-device accounts, OAuth, queue processing, or shared analytics are required.

Responsibilities:

- User identity and sessions.
- GitHub OAuth token exchange and encrypted token storage.
- Canonical problem, submission, upload, and review records.
- Background jobs, retries, and webhook processing.
- Cross-device synchronization.
- Usage limits, audit events, and privacy controls.

The initial implementation may continue using local-only mode, but the data contracts should be designed so a backend can be added without rewriting the extension UI.

### 3.3 GitHub integration

- Use least-privilege OAuth or fine-grained authorization.
- Keep repository operations in one service boundary.
- Support idempotency, retries, rate limits, conflicts, and partial failures.
- Treat README generation as a derived view rather than the primary database.

## 4. Domain Model

Create versioned schemas for these entities:

### User

- id
- display name
- connected providers
- created and updated timestamps

### PlatformProblem

- platform
- external problem id
- canonical slug
- title
- URL
- difficulty
- tags/topics
- contest metadata
- constraints and examples when available

### Submission

- platform problem reference
- external submission id when available
- language
- source code
- verdict
- runtime and memory when available
- attempt timestamp
- parser version
- capture source

### SolutionRecord

- stable problem identity
- repository and branch
- target path
- commit SHA
- notes
- explanation
- status
- created and updated timestamps

### ReviewRecord

- solution reference
- review schedule
- confidence rating
- mistakes
- next review date
- completion state

All storage records must include a schema version and support migration.

## 5. Execution Phases

## Phase 0: Decisions and Baseline

Goal: remove ambiguity and create a measurable baseline before changing behavior.

Tasks:

- Confirm target browsers: Chrome only or Chrome plus Firefox/Edge.
- Confirm whether the first release is local-only or includes a backend.
- Choose backend stack if required.
- Choose authentication model: GitHub OAuth, device flow, or local token mode.
- Choose database and hosting strategy.
- Define privacy and retention expectations.
- Define supported repository layouts.
- Record current extension behavior as acceptance fixtures.
- Add a project README that documents install, permissions, settings, and limitations.

Exit criteria:

- Product scope is approved.
- Required credentials and deployment choices are available.
- Existing manual upload behavior has fixtures or documented acceptance checks.

## Phase 1: Foundation and Safety

Goal: make the existing extension maintainable and safe without changing its main workflow.

Tasks:

- Add a package/build setup or establish a documented no-build test setup.
- Add linting and formatting checks.
- Introduce shared types or schema validators for parsed problem data.
- Centralize storage keys and version the storage schema.
- Add migrations for legacy repository keys.
- Replace unsafe HTML interpolation with DOM APIs or escaping helpers.
- Add tests for path generation, repository selection, README merging, and storage migration.
- Fix popup connection status and disabled/loading states.
- Remove or document unused utility modules.

Exit criteria:

- Existing extension can be loaded and manually tested.
- Static checks pass.
- Storage migration is repeatable and preserves existing settings.
- No user-controlled value is inserted into HTML without escaping.

## Phase 2: Reliable Capture and Parser Adapters

Goal: make problem and solution capture resilient to page changes.

Tasks:

- Define the versioned parser contract.
- Add DOM fixtures for supported page types.
- Separate problem metadata parsing from submission/code parsing.
- Improve Monaco, CodeMirror, Ace, textarea, and submission-page extraction.
- Detect submission IDs, verdicts, runtime, memory, and timestamp where possible.
- Add parser confidence and missing-field diagnostics.
- Add a correction form before upload.
- Add parser fallback and platform capability reporting.
- Add platform adapter versioning and compatibility tests.

Exit criteria:

- Each supported platform has passing fixtures for problem, submission, accepted, failed, and incomplete states.
- A missing field produces a user-actionable message.
- Corrected fields are preserved in the upload record.

## Phase 3: Durable Upload Pipeline

Goal: make uploads safe under retries, offline use, rate limits, and conflicts.

Tasks:

- Add a local upload-job queue.
- Add job states: pending, uploading, succeeded, skipped, conflict, failed, retrying.
- Add exponential backoff and rate-limit handling.
- Distinguish 404, 401, 403, 409, 422, 429, and 5xx responses.
- Do not treat arbitrary file-read errors as file absence.
- Add idempotency keys based on stable problem, submission, repository, and path identity.
- Detect concurrent GitHub updates using SHA checks.
- Add conflict choices: keep remote, keep local, create alternate path, or cancel.
- Make README updates recoverable if solution upload succeeds first.
- Add retry and details actions in the UI.
- Record commit SHAs and upload results.

Exit criteria:

- Retrying the same job does not create duplicate records or commits unnecessarily.
- Network interruption can resume without losing the job.
- Conflicts are visible and require an explicit decision.
- Partial failures are recoverable.

## Phase 4: GitHub Security and Account Model

Goal: remove unsafe credential handling and support real users.

Tasks:

- Implement GitHub OAuth or device authorization.
- Move long-lived token handling out of page-visible extension contexts.
- Add connect, disconnect, revoke, and expired-session states.
- Restrict repository permissions to the required scope.
- Add account identity and linked GitHub account records.
- Add audit events for connection, upload, conflict, and disconnect actions.
- Define secret storage, encryption, rotation, and deletion rules.

Exit criteria:

- Tokens are never logged or rendered.
- Disconnect removes active credentials and local session references.
- Expired authorization produces a recovery path.
- Permission scope is documented and verified.

## Phase 5: Learning and Problem-Solving Features

Goal: turn stored solutions into an active learning system.

Tasks:

- Add searchable problem and solution history.
- Track attempted, failed, accepted, reviewed, and mastered states.
- Store failed-attempt metadata where platforms expose it.
- Add notes, approach, complexity, mistakes, and editorial references.
- Add review scheduling and spaced repetition.
- Add redo queues based on weak topics, difficulty, age, and failed attempts.
- Add topic, language, platform, contest, and difficulty filters.
- Add recommendations for the next problem.
- Add progress trends and topic weakness analysis.
- Add contest performance history.
- Add import/export of personal data.

Exit criteria:

- A user can find any captured problem quickly.
- A user can record why a solution failed and schedule a review.
- The dashboard produces actionable next steps, not only counts.

## Phase 6: Backend Synchronization

Goal: support accounts, multiple devices, and centralized processing.

Tasks:

- Implement API authentication and session management.
- Define REST or GraphQL contracts from the domain schemas.
- Add database migrations and indexes.
- Sync local records using change versions and conflict rules.
- Add background job processing.
- Add webhook handling for repository changes.
- Add server-side analytics aggregation.
- Add per-user quotas and abuse protection.
- Add backup and restore procedures.

Exit criteria:

- A user can sign in on a second device and recover their data.
- Offline local changes synchronize without silent loss.
- Server jobs are observable and retryable.

## Phase 7: Production Operations

Goal: make the system supportable at real usage levels.

Tasks:

- Add structured logs and correlation IDs.
- Add error monitoring and privacy-safe diagnostics.
- Add health checks and dependency checks.
- Add metrics for parser failures, upload success, retries, conflicts, and latency.
- Add CI for tests, lint, build, and extension packaging.
- Add dependency and vulnerability scanning.
- Add release channels and rollback procedures.
- Add privacy policy, terms, data deletion, and support documentation.
- Add migration and incident runbooks.

Exit criteria:

- Failures can be diagnosed from logs and job history.
- Releases are reproducible and rollbackable.
- User data deletion is verifiable.

## 6. Test Strategy

### Unit tests

- Platform detection.
- Slug and path generation.
- Language extension mapping.
- Contest detection.
- Repository selection priority.
- Storage migrations.
- README parsing and merging.
- Idempotency keys.

### Parser tests

- Problem pages for every supported platform.
- Submission pages.
- Accepted and failed verdicts.
- Missing editor content.
- Changed or incomplete DOM.
- Multiple language formats.

### Integration tests

- Mock GitHub repository lookup.
- Create and update file flows.
- Duplicate detection.
- Rate limits and retries.
- Concurrent update conflicts.
- Partial README failure.

### End-to-end tests

- Install extension.
- Configure repository.
- Capture and upload a solution.
- Ask-after-accepted flow.
- Automatic upload flow.
- Offline and retry flow.
- Reopen options and verify history.

## 7. Initial Backlog

The first implementation batch should be:

1. Add project documentation and a reproducible development/test setup.
2. Add shared problem and upload schemas.
3. Add storage versioning and legacy migration.
4. Add tests for upload paths, repository selection, and README merging.
5. Fix unsafe dashboard HTML rendering.
6. Fix popup connection status and upload state handling.
7. Harden GitHub error classification and file existence checks.
8. Add parser fixtures and contract validation.

The next batch should only begin after the first batch passes its checks.

## 8. Information Required Before Protected Work

Please provide decisions for these items before implementation reaches account or backend work:

- Target browsers.
- Local-only first release or backend-first release.
- GitHub OAuth versus fine-grained token mode.
- Backend preference, if any.
- Hosting and database preference, if any.
- Whether uploaded code may be processed or stored outside GitHub.
- Whether the product is personal, team-based, or public.
- Required launch date or milestone.
- Preferred problem-solving features for the first user-facing release.

Until these decisions are available, implementation should stay within the extension, local storage, parser contracts, tests, and GitHub upload reliability layers.

## 9. Definition Of Done

A milestone is complete only when:

- The behavior is implemented.
- Existing behavior remains covered.
- Failure states are visible and recoverable.
- Data migrations are tested.
- Security implications are documented.
- User-facing changes are documented.
- Automated checks pass.
- The change can be rolled back without data loss.
