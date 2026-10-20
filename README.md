# CP Sync

CP Sync is a local-first Chrome extension for capturing competitive-programming solutions from LeetCode, Codeforces, and CodeChef and synchronizing them to GitHub.

It combines solution capture, repository organization, reliable GitHub uploads, failed-attempt tracking, spaced review, weak-topic analysis, and a redo queue. It is designed to be useful without a backend, paid hosting, or a cloud database.

[![Download latest release](https://img.shields.io/github/v/release/Kartikeyji17/cp-sync?label=Download%20latest%20release)](https://github.com/Kartikeyji17/cp-sync/releases/latest)
[![Checks](https://github.com/Kartikeyji17/cp-sync/actions/workflows/ci.yml/badge.svg)](https://github.com/Kartikeyji17/cp-sync/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/Kartikeyji17/cp-sync)](LICENSE)

> **[Download CP Sync](https://github.com/Kartikeyji17/cp-sync/releases/latest)** · Extract the ZIP · Load the extracted folder at `chrome://extensions`

## Quick Start

1. **[Download the latest release](https://github.com/Kartikeyji17/cp-sync/releases/latest)** and extract the ZIP.
2. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
3. Select the extracted CP Sync folder containing `manifest.json`.
4. Open **Options**, create a GitHub fine-grained token with access only to the repository where solutions should be stored, and save it.
5. Load repositories, assign one to each platform, and start with **Manual** upload mode.

CP Sync sends solutions directly from your browser to GitHub. It does not use a CP Sync server. Your token stays in Chrome local storage, so never share it or upload an exported backup file.

## Contents

- [Why CP Sync Exists](#why-cp-sync-exists)
- [What It Does](#what-it-does)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [End-to-End Flow](#end-to-end-flow)
- [Supported Platforms](#supported-platforms)
- [Installation](#installation)
- [Releasing](#releasing)
- [First-Time Setup](#first-time-setup)
- [Upload Modes](#upload-modes)
- [Capture and Correction](#capture-and-correction)
- [GitHub Storage Layout](#github-storage-layout)
- [Reliability and Recovery](#reliability-and-recovery)
- [Learning Features](#learning-features)
- [Local Storage and Backups](#local-storage-and-backups)
- [Security and Privacy](#security-and-privacy)
- [Development](#development)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Current Limitations](#current-limitations)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Why CP Sync Exists

Competitive-programming solutions often end up scattered across platform submissions, local files, screenshots, and notes. CP Sync keeps the code in a GitHub repository while preserving the context that makes the solution useful later:

- Which platform and problem produced it.
- Which language was used.
- Whether it was part of a contest.
- Which topics and difficulty were detected.
- What failed before the accepted solution.
- What should be reviewed again.
- Which mistakes or lessons should be remembered.

The core product question is not only "How do I save this solution?" It is also "How do I learn from it and find it again?"

## What It Does

### Solution synchronization

- Captures problem metadata and source code from supported platforms.
- Adds an Upload to GitHub control beside the platform submit control in manual mode.
- Supports manual, ask-after-accepted, and automatic upload modes.
- Lets users choose different repositories for LeetCode, Codeforces, and CodeChef.
- Generates language-aware file extensions and organized paths.
- Updates a generated dashboard section in the destination repository README.

### Reliable uploads

- Detects duplicate solutions before writing.
- Uses deterministic upload identity keys.
- Retries transient GitHub, network, and rate-limit failures.
- Preserves upload jobs across service-worker restarts.
- Records solution, notes, and README commit SHAs.
- Detects write conflicts using GitHub file SHAs.
- Supports Keep Local and Keep Remote conflict actions.
- Recovers when a solution succeeds but notes or README updates fail.
- Retries only unfinished stages after a partial failure.

### Learning workflow

- Stores failed attempts locally.
- Shows failed-attempt history and counts.
- Ranks weak topics from failed submissions.
- Builds a Redo Queue of recent unique failed problems.
- Creates review records after successful uploads.
- Supports Again, Hard, Good, and Easy spaced-review ratings.
- Stores review mistakes and reflection notes.
- Provides searchable upload and failed-attempt history.

### Local operations

- Exports and imports versioned JSON backups.
- Migrates older storage formats automatically.
- Provides a Clear Local Data action.
- Runs without a backend or paid infrastructure.

## Architecture

CP Sync is a Manifest V3 extension with four runtime surfaces:

```text
Competitive-programming page
        |
        v
Platform parser + content adapter
        |
        v
Shared capture, correction, and upload UI
        |
        v
Background service worker
        |
        +--> GitHub REST API
        +--> chrome.storage.local
        +--> chrome.alarms
        |
        v
Options dashboard, history, reviews, analytics
```

### Page/content layer

The content layer runs on supported problem and submission pages. It owns platform-specific DOM access, page controls, capture correction, accepted detection, toasts, repository selection, and in-page upload behavior.

- `content/cpSyncContent.js` contains shared content behavior.
- `content/leetcode.js` adapts LeetCode.
- `content/codeforces.js` adapts Codeforces.
- `content/codechef.js` adapts CodeChef.

### Parser layer

Platform parsers normalize page data into a common problem contract:

- Platform.
- Title and slug.
- External problem ID.
- Submission ID when available.
- URL.
- Difficulty.
- Language.
- Source code.
- Verdict.
- Runtime and memory when visible.
- Contest information.
- Tags and topic.
- Parser version and capture source.
- Capture confidence and missing fields.

The parser files are:

- `platforms/leetcodeParser.js`
- `platforms/codeforcesParser.js`
- `platforms/codechefParser.js`

LeetCode's Monaco editor runs in the page context. `inject/leetcodeInject.js` reads the active Monaco model and communicates with the content script through `window.postMessage`.

### Background layer

`background.js` is the service worker and message router. It handles:

- Active-tab lookup.
- Messages from the popup and content scripts.
- Repository lookup.
- Upload job creation and persistence.
- Manual retries and automatic retries.
- Conflict cancellation.
- Storage initialization and migration.
- Chrome alarm callbacks.

### GitHub layer

- `github/github.js` wraps the GitHub REST API.
- `uploader/githubUploader.js` owns upload orchestration.
- The uploader writes solution files, optional notes, and the generated README dashboard.
- The GitHub token is currently supplied by local settings.

### Options/dashboard layer

The options page provides:

- GitHub token and repository setup.
- Per-platform repository assignment.
- Default repository selection.
- Upload mode configuration.
- Organization and repository visibility settings.
- Upload-job status, retry, and conflict controls.
- Commit links.
- Upload history search.
- Failed-attempt history.
- Review queue.
- Weak-topic analytics.
- Redo Queue.
- Backup, restore, and local-data deletion.

## End-to-End Flow

### Manual upload

1. The content adapter asks its platform parser for the current problem.
2. The user reviews or corrects title, language, code, notes, approach, complexity, and editorial URL.
3. The extension loads repositories assigned to that platform.
4. The user selects a repository if multiple repositories are available.
5. The popup or background service creates a pending upload job.
6. The job moves to `uploading`.
7. The uploader validates and normalizes the problem contract.
8. GitHub is checked for the repository and target file.
9. The solution, notes, and README dashboard are written as separate stages.
10. Commit SHAs and completed stages are stored.
11. Upload history and a review record are saved locally.
12. The job becomes `succeeded` or `skipped`.

### Accepted monitoring

In ask and automatic modes, the content script checks the page periodically. When it sees an accepted verdict:

- Ask mode shows an upload prompt and then opens capture review.
- Automatic mode uploads without interactive review.
- Failed verdicts are recorded in local attempt history.
- Duplicate page observations are suppressed for the current page identity.

### Retry flow

A failed job can be retried from the options page. The original job is reused, and completed stages are skipped. Automatic retries use Chrome alarms for recoverable errors and are capped at three upload attempts.

## Supported Platforms

| Platform   | Problem pages | Submission pages         | Capture bridge                  | Known limitations                                                         |
| ---------- | ------------- | ------------------------ | ------------------------------- | ------------------------------------------------------------------------- |
| LeetCode   | Yes           | Page verdict/editor flow | Monaco bridge                   | Reliable submission ID and full runtime metadata are not always available |
| Codeforces | Yes           | Yes                      | DOM and visible source fallback | Runtime and memory depend on visible submission-page text                 |
| CodeChef   | Yes           | Yes                      | DOM, textarea, and Ace fallback | Runtime and memory depend on visible result-page text                     |

All platform parsers depend on page DOMs that can change without notice. Parser fixtures cover representative accepted, failed, incomplete, and alternate-editor cases, but real browser validation is still required after major platform UI changes.

## Installation

### Download a release (recommended)

1. Open the repository's [Releases](https://github.com/Kartikeyji17/cp-sync/releases) page.
2. Download the `cp-sync-vX.Y.Z.zip` asset from the latest release.
3. Extract the ZIP to a permanent folder. Do not load the ZIP itself.
4. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
5. Enable **Developer mode**.
6. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.
7. Open the CP Sync extension Options page and complete [First-Time Setup](#first-time-setup).

The packaged release contains only the files required to run the extension. It does not contain tests, Git history, local settings, or anyone else's GitHub token.

### Install directly from the repository

Use this when testing a branch or contributing:

1. Clone or download the repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the repository folder containing `manifest.json`.
6. Open the CP Sync extension Options page.
7. Configure GitHub access and repository assignments.

The extension currently targets Chrome Manifest V3 behavior. Edge and Firefox compatibility have not been formally validated.

## Releasing

The extension version is stored in both `manifest.json` and `package.json`; they must match.
Run the local checks and create a clean distributable ZIP with:

```bash
npm run verify
```

The ZIP is written to `dist/cp-sync-vX.Y.Z.zip`. The `dist/` directory is ignored by Git.
To publish a release, update both version fields, commit the change, and push a matching semantic-version tag:

```bash
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions validates the extension and attaches the ZIP to a generated GitHub Release.

## First-Time Setup

1. Create a GitHub fine-grained personal access token.
2. Grant only the repository permissions needed for the repositories CP Sync will update.
3. Open CP Sync Options.
4. Enter the token.
5. Select **Load Repositories**.
6. Assign repositories to LeetCode, Codeforces, and CodeChef.
7. Choose defaults for platforms with multiple repositories.
8. Select an upload mode.
9. Choose the desired solution organization layout.
10. Save Settings.

For personal testing, start with Manual mode and a test repository.

## Upload Modes

### Manual

A GitHub icon is placed beside the platform submit control. Clicking it opens capture review and then uploads the corrected problem to GitHub.

### Ask after Accepted

CP Sync observes the page for an accepted verdict. It shows an upload prompt and opens capture review if the user chooses Upload.

### Auto Upload

CP Sync uploads accepted solutions without interactive repository selection or capture review. This mode requires reliable page extraction and is best enabled after Manual mode has been tested.

## Capture and Correction

Before an interactive upload, users can correct:

- Problem title.
- Language.
- Source code.
- Notes.
- Approach.
- Time and space complexity.
- Editorial URL.

Required identity fields are title, slug, and URL. Source code is required for normal uploads, although forced/manual recovery paths can use existing remote state. Missing language is reported but can fall back to a text extension.

Every normalized capture includes:

- `schemaVersion`
- `contractVersion`
- `parserVersion`
- `captureSource`
- `captureConfidence`
- `missingFields`

## GitHub Storage Layout

The default organization is by platform:

```text
LeetCode/Two-Sum.py
Codeforces/123-A-nearly-lucky-number.cpp
CodeChef/Example.cpp
```

Other layouts can be selected:

```text
Platform/
Difficulty/
Topic/
Platform-Difficulty/
Platform-Topic/
Platform-Topic-Difficulty/
```

Contest solutions use a contest directory:

```text
Contests/Weekly-Contest-1/Two-Sum.py
```

When notes exist, CP Sync writes a README file beside the solution. The repository root README receives a marked generated dashboard section. Content outside CP Sync's markers is preserved.

## Upload Job States

Jobs use explicit states:

```text
pending -> uploading -> succeeded
                   -> skipped
                   -> conflict
                   -> failed -> retrying -> uploading
                   -> cancelled
```

Jobs also retain:

- Problem payload.
- Repository.
- Idempotency key.
- Attempt count.
- Error message.
- Completed stages.
- Commit SHAs.
- Retry scheduling information.
- Partial result information.

## Local Storage and Backups

CP Sync uses `chrome.storage.local`. No CP Sync data is sent to a CP Sync server.

Stored categories include:

- GitHub token.
- Repository assignments and defaults.
- Upload mode and organization settings.
- Fetched repository list.
- Upload history.
- Upload jobs.
- Review records.
- Failed-attempt history.

Storage has a schema version and migrations. Existing records are upgraded without being discarded.

### Backups

Use **Export Backup** in Options to create a versioned JSON backup. Use **Import Backup** to restore matching local settings and records.

Backups include the GitHub token. Treat them as secrets:

- Do not commit them to Git.
- Do not upload them to public storage.
- Store them only in a secure location.
- Delete them when no longer needed.

### Deletion

**Clear Local Data** removes current and legacy CP Sync settings, token data, upload history, jobs, reviews, attempts, and schema markers after two confirmations.

Deleting local data does not delete files already committed to GitHub.

## Security and Privacy

Current local mode is intended for personal use or a controlled private beta.

Important security facts:

- The GitHub token is stored in Chrome extension local storage.
- The token is not intentionally injected into supported webpages.
- Backup files contain the token.
- Imported external URLs are restricted to HTTP and HTTPS before rendering as links.
- Repository references are validated before GitHub API requests.
- User-controlled values are escaped before options-page HTML rendering.
- GitHub errors retain status codes so missing files are not confused with authentication or server failures.

Before broad public distribution, CP Sync should implement GitHub OAuth or device authorization, least-privilege scope verification, token revocation, expiry handling, and a documented privacy policy.

## Development

The project is plain JavaScript with ES modules in the background, popup, options, and utility layers. Platform content scripts are loaded as classic scripts by the manifest.

There are no third-party runtime dependencies at present.

Useful commands:

```text
npm test
npm run check
npm run verify
```

`npm run verify` runs the syntax check and all tests in one command.

## Testing

The repository contains dependency-free Node tests for:

- Problem contracts and capture diagnostics.
- Platform parser fixtures.
- Alternate editor extraction.
- Repository selection and validation.
- Upload paths and README merging.
- GitHub retries and authentication errors.
- Mocked uploader orchestration.
- Partial upload failures.
- Upload job transitions.
- Idempotency keys.
- Storage migrations.
- Backups and privacy key coverage.
- Review scheduling.
- Weak-topic analytics and redo recommendations.
- Manifest entry points.
- Safe external URLs.

CI is configured in `.github/workflows/ci.yml` and runs syntax validation and tests on pushes and pull requests.

The current automated suite does not replace manual browser testing on real LeetCode, Codeforces, and CodeChef pages.

## Project Structure

```text
background.js                 Manifest V3 service worker and message router
manifest.json                 Extension permissions, scripts, matches, and entry points
popup.html / popup.js         Quick upload popup
popup.css                     Popup styles

content/
  cpSyncContent.js             Shared content behavior and in-page upload UI
  leetcode.js                  LeetCode page adapter
  codeforces.js                Codeforces page adapter
  codechef.js                  CodeChef page adapter

platforms/
  leetcodeParser.js            LeetCode metadata and code parser
  codeforcesParser.js           Codeforces parser
  codechefParser.js             CodeChef parser

inject/
  leetcodeInject.js             Monaco editor page-context bridge

github/
  github.js                    GitHub REST API client

uploader/
  githubUploader.js             Multi-stage upload orchestration

options/
  options.html                  Settings and dashboard markup
  options.js                    Settings, history, reviews, analytics, backups
  options.css                   Options page styles

utils/
  problemContract.js            Normalization and validation
  storage.js                    Schema initialization and migrations
  repositories.js               Repository assignments and selection
  uploadJobs.js                 Upload job state machine and persistence
  uploadIdentity.js             Deterministic upload identity keys
  uploadPaths.js                GitHub path and file-content generation
  readmeDashboard.js            README dashboard generation and parsing
  reviews.js                    Spaced-review records and scheduling
  attempts.js                   Failed-attempt storage
  learningAnalytics.js           Weak-topic analytics
  recommendations.js             Redo Queue generation
  backup.js                     Versioned backup format
  privacy.js                    Local deletion keys
  githubRefs.js                 Repository reference validation
  platformCapabilities.js       Platform capability descriptions
  urls.js                       Safe external URL handling
  schema.js                     Shared record schema version

scripts/
  check-syntax.mjs              Repository-wide syntax validation

tests/
  *.test.js                     Dependency-free regression and integration tests

IMPLEMENTATION_PLAN.md          Full multi-phase roadmap
```

## Current Limitations

The local extension is feature-complete enough for personal use and controlled testing, but it is not yet a broadly publishable production service.

Remaining limitations include:

- No GitHub OAuth or account system.
- No backend, cloud database, or cross-device synchronization.
- Chrome is the only formally targeted browser.
- DOM parsers can break when platform layouts change.
- Runtime, memory, timestamp, and complete submission metadata are not consistently available.
- No full browser end-to-end test suite yet.
- No alternate-path conflict resolution yet.
- Automatic retry depends on the extension service worker and Chrome alarms.
- No production error monitoring or centralized telemetry.
- No release packaging workflow.
- No formal privacy policy, terms, or incident runbook.

## Roadmap

### Local-first completion

1. Validate manual, ask, and automatic flows on real pages.
2. Add browser-level smoke and end-to-end tests.
3. Improve runtime, memory, timestamp, and platform submission metadata extraction.
4. Add alternate-path conflict resolution.
5. Add extension packaging and release checks.
6. Add dependency and vulnerability scanning.
7. Document privacy, deletion, support, and recovery procedures.

### Optional public-product phase

Only after local usage validates the product:

1. GitHub OAuth or device authorization.
2. User accounts and secure session handling.
3. Backend API and database.
4. Cross-device synchronization.
5. Server-side job processing and webhooks.
6. Shared/team repositories.
7. Centralized analytics, quotas, and abuse protection.

The backend phase is intentionally deferred so CP Sync can remain free to develop and use.

## Troubleshooting

### The upload button does not appear

- Confirm the page matches a supported platform URL.
- Reload the page after loading the unpacked extension.
- Confirm Upload Mode is Manual.
- Check that the platform Submit control is visible.
- Open the service worker console from `chrome://extensions` for errors.

### No repositories are available

- Open Options.
- Confirm the token is present and valid.
- Select Load Repositories.
- Assign at least one repository to the current platform.
- Save Settings.

### Code is missing

- Use capture review to paste or correct the code.
- Confirm the correct editor is active.
- For LeetCode, wait for Monaco to finish loading.
- Try the platform submission page when the problem page does not expose source code.

### An upload is stuck or failed

- Open Options and inspect Upload Jobs.
- Check the error and completed stages.
- Use Retry for a recoverable failure.
- Use Keep Local or Keep Remote for a conflict.
- Verify the token still has access to the repository.
- Check GitHub rate limits and network connectivity.

### A backup will not import

- Confirm it is a CP Sync JSON backup.
- Do not edit the format or version fields.
- Make sure the file is complete and valid JSON.
- Remember that importing replaces matching local data after confirmation.

## Contributing

Before making a change:

1. Read the relevant local module and nearby tests.
2. Preserve the existing message contracts and storage migrations.
3. Add or update focused tests for behavior with meaningful regression risk.
4. Run `npm run verify` before submitting the change.
5. Keep user data, tokens, and imported values within their existing security boundaries.

Avoid adding a backend, account system, or cloud dependency without first updating the product decision and implementation plan.

## Status

CP Sync is currently a local-first Chrome extension suitable for personal use and controlled testing.

The current automated baseline is:

```text
npm run verify
53 tests passed
0 tests failed
```

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the full architecture plan, phase breakdown, domain model, test strategy, and future backend work.
