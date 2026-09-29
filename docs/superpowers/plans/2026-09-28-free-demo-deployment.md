# Free Demo Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing React/Express/MongoDB system deployable with InfinityFree hosting the frontend, Render hosting the API, MongoDB Atlas persisting records and files, and Hostinger sending email.

**Architecture:** Frontend requests pass through one API URL helper that uses `VITE_API_URL` only in production. Both applicant and LMS uploads use one MongoDB GridFS service, preserving existing protected routes, metadata fields, validation, and size limits.

**Tech Stack:** React 19, Vite 8, Express 4, Mongoose 8, MongoDB GridFS, Multer 2, Nodemailer 9, Node test runner, Playwright

**Spec:** `docs/superpowers/specs/2026-09-28-free-demo-deployment-design.md`

## Global Constraints

- Preserve React, Express, Mongoose, and Nodemailer; add no deployment framework.
- Keep secrets out of source code and the frontend bundle.
- Keep local Vite proxy behavior when `VITE_API_URL` is empty.
- Keep applicant uploads at 5 MB and LMS uploads at 20 MB.
- Preserve file validation, authentication, authorization, and protected download routes.
- Store demo files in the Atlas free cluster and document its 512 MB ceiling.
- Do not modify unrelated dirty-worktree files.

## Review Focus

- `VITE_API_URL` with or without trailing slash must produce one valid `/api/...` URL; Task 1 tests both.
- Absolute third-party URLs and non-API paths must remain unchanged; Task 1 tests both.
- Invalid, missing, and malformed GridFS identifiers must return controlled not-found behavior; Tasks 2–4 test these cases.
- Failed upload or metadata save must not leave an orphan file or broken metadata; Tasks 3–4 test cleanup paths.
- Existing file type, content-signature, size, and authorization checks must remain active; Tasks 3–4 run focused and existing tests.

---

### Task 1: Configurable frontend API origin

**Files:**
- Create: `src/utils/apiUrl.js`
- Create: `tests/api-url.test.js`
- Create: `.env.example`
- Modify: `src/utils/authFetch.js`
- Modify: `src/context/AuthContext.jsx`
- Modify: `src/context/EnrollmentContext.jsx`
- Modify: `src/views/admin/CourseManagementTab.jsx`
- Modify: `src/views/admin/DashboardView.jsx`
- Modify: `src/views/admin/IntegrityAuditTab.jsx`
- Modify: `src/views/applicant/ApplicantPortalAccess.jsx`
- Modify: `src/views/instructor/InstructorView.jsx`
- Modify: `src/views/lms/LmsAllAssignments.jsx`
- Modify: `src/views/lms/LmsAssignmentsTab.jsx`
- Modify: `src/views/lms/LmsClassView.jsx`
- Modify: `src/views/lms/LmsDashboard.jsx`
- Modify: `src/views/lms/LmsGradebookTab.jsx`
- Modify: `src/views/lms/LmsSchedule.jsx`
- Modify: `src/views/lms/LmsView.jsx`
- Modify: `src/views/public/PaymentSuccessView.jsx`
- Modify: `src/views/public/PaymongoCheckoutView.jsx`
- Modify: `src/views/registrar/GradeReviewQueue.jsx`
- Modify: `src/views/registrar/TermClosingQueue.jsx`
- Modify: `src/views/student/StudentAcademicView.jsx`
- Modify: `src/views/student/StudentPortalAccess.jsx`
- Modify: `src/views/student/steps/RegistrationStep.jsx`

**Interfaces:**
- Produces: `apiUrl(path, base?) -> string` and `apiFetch(path, options?) -> Promise<Response>`.
- Produces: existing `authFetch(url, options?)` with unchanged token behavior and API-prefix handling.
- Consumes: `import.meta.env.VITE_API_URL`; empty locally, Render origin for the InfinityFree build.

- [ ] **Step 1: Write URL helper tests**

Create Node tests asserting empty base keeps `/api/health`, either trailing-slash form yields `https://example.onrender.com/api/health`, and absolute/non-API inputs remain unchanged.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/api-url.test.js`

Expected: FAIL because `src/utils/apiUrl.js` does not exist.

- [ ] **Step 3: Implement the minimal helper**

Add `apiUrl` and `apiFetch`; update `authFetch` to call `apiFetch`. Replace raw frontend API `fetch` calls with `apiFetch`, importing it from the shared helper. Do not alter calls for maps, mail, static assets, blobs, or other external URLs.

- [ ] **Step 4: Document build-time variable**

Add `VITE_API_URL=https://your-api.onrender.com` to root `.env.example`. This public API origin is not a secret.

- [ ] **Step 5: Verify helper, lint, and production build**

Run: `node --test tests/api-url.test.js`

Expected: PASS.

Run: `npm run lint && npm run build`

Expected: both exit 0; build emits `dist/`.

- [ ] **Step 6: Commit**

```bash
git add .env.example src tests/api-url.test.js
git commit -m "feat: configure production API origin"
```

### Task 2: Shared MongoDB GridFS storage

**Files:**
- Create: `server/services/gridFsStorageService.js`
- Create: `server/tests/gridFsStorage.test.js`

**Interfaces:**
- Produces: `storeFile({ buffer, filename, contentType, metadata }) -> Promise<string>`.
- Produces: `openFile(id) -> Promise<{ file, stream } | null>`.
- Produces: `deleteFile(id) -> Promise<boolean>`.
- Produces: `listFileIds() -> Promise<string[]>`.
- Consumes: active `mongoose.connection.db`; bucket name `uploads`.

- [ ] **Step 1: Write GridFS lifecycle tests**

Use `mongodb-memory-server` to assert store/read byte equality, metadata retention, listing, deletion, missing IDs, and malformed IDs.

- [ ] **Step 2: Run focused test and verify failure**

Run: `npm test --prefix server -- --test-name-pattern="GridFS"`

Expected: FAIL because storage service does not exist.

- [ ] **Step 3: Implement GridFS service**

Use `mongoose.mongo.GridFSBucket` and `mongoose.Types.ObjectId`. Resolve upload/download stream completion with Promises. Treat invalid or missing IDs as absent; do not leak driver errors to callers.

- [ ] **Step 4: Verify focused test**

Run: `npm test --prefix server -- --test-name-pattern="GridFS"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/services/gridFsStorageService.js server/tests/gridFsStorage.test.js
git commit -m "feat: add GridFS upload storage"
```

### Task 3: Persist applicant documents in GridFS

**Files:**
- Modify: `server/studentsRoutes.js`
- Modify: `server/studentsController.js`
- Create: `server/tests/studentDocumentStorage.test.js`

**Interfaces:**
- Consumes: Task 2 `storeFile`, `openFile`, and `deleteFile`.
- Preserves: `POST /api/students/:id/documents`, `GET /api/students/:id/documents/:typeId/file`, and `DELETE /api/students/:id/documents/:typeId`.
- Preserves: `Student.documents[].fileName` as string, now containing a GridFS ID; `originalName` remains display/download name.

- [ ] **Step 1: Write applicant document lifecycle tests**

Cover upload metadata, streamed download headers/body, replacement deleting the old object, deletion, missing object 404, invalid MIME type, and failed student save cleaning up the newly stored object.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test --prefix server -- --test-name-pattern="student document storage"`

Expected: FAIL because routes/controllers still use disk paths.

- [ ] **Step 3: Switch Multer to memory storage**

Remove applicant upload-directory creation and filename generation. Keep current MIME allowlist and 5 MB limit.

- [ ] **Step 4: Switch controller lifecycle to GridFS**

Store `req.file.buffer`, save returned ID in `fileName`, stream downloads with original filename and stored content type, and delete replaced/removed files. On metadata-save failure, delete only the new GridFS object.

- [ ] **Step 5: Verify focused and existing server tests**

Run: `npm test --prefix server -- --test-name-pattern="student document storage"`

Expected: PASS.

Run: `npm test --prefix server`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/studentsRoutes.js server/studentsController.js server/tests/studentDocumentStorage.test.js
git commit -m "feat: persist applicant documents in GridFS"
```

### Task 4: Persist LMS files in GridFS

**Files:**
- Modify: `server/lmsRoutes.js`
- Modify: `server/lmsController.js`
- Modify: `server/services/lmsStorageService.js`
- Modify: `server/tests/lmsStorage.test.js`
- Modify: `server/tests/lmsFoundation.test.js`

**Interfaces:**
- Consumes: Task 2 `storeFile`, `openFile`, `deleteFile`, and `listFileIds`.
- Preserves: LMS material/submission endpoints and `storageName` string fields, now storing GridFS IDs.
- Produces: `inspectLmsFileBuffer(buffer, originalName)` as existing content validator used directly on Multer memory buffers.

- [ ] **Step 1: Extend LMS tests for GridFS lifecycle**

Cover material upload/download/delete, submission upload/download/attempt history, replacement cleanup, missing file 404, audit missing/orphan IDs, unsafe ZIP rejection, and cleanup after failed database writes.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test --prefix server -- --test-name-pattern="LMS|storage"`

Expected: FAIL where disk filenames and paths are expected.

- [ ] **Step 3: Switch LMS Multer and validation to memory**

Remove directory creation and disk filename generation. Keep 20 MB limit, extension/MIME checks, and call existing signature inspection against `req.file.buffer`.

- [ ] **Step 4: Switch LMS lifecycle and audit to GridFS**

Store IDs in `storageName`, stream protected downloads, delete replaced/removed files, and compare GridFS IDs during storage audit. Remove disk-only path/list helpers and `node:fs` dependencies.

- [ ] **Step 5: Verify focused and complete server suite**

Run: `npm test --prefix server -- --test-name-pattern="LMS|storage"`

Expected: PASS.

Run: `npm test --prefix server`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/lmsRoutes.js server/lmsController.js server/services/lmsStorageService.js server/tests/lmsStorage.test.js server/tests/lmsFoundation.test.js
git commit -m "feat: persist LMS files in GridFS"
```

### Task 5: Deployment instructions and final verification

**Files:**
- Modify: `README.md`
- Create: `public/.htaccess`

**Interfaces:**
- Documents: exact Render build/start settings, required environment-variable names, InfinityFree upload contents, SPA fallback, Atlas setup, and smoke-test order.
- Produces: InfinityFree SPA routing fallback to `index.html` while leaving real files and directories accessible.

- [ ] **Step 1: Add InfinityFree SPA fallback**

Create `.htaccess` rules that serve existing files/directories and rewrite other frontend routes to `/index.html`.

- [ ] **Step 2: Add concise deployment runbook**

Document Atlas connection setup; Render root/build/start commands; required `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`, SMTP, and payment variable names; local `VITE_API_URL` build; and uploading only `dist` contents to InfinityFree `htdocs`.

- [ ] **Step 3: Run full verification**

Run: `node --test tests/api-url.test.js`

Run: `npm test --prefix server`

Run: `npm run lint`

Run: `npm run build`

Expected: every command exits 0.

- [ ] **Step 4: Run local browser smoke test**

Start `npm run dev`; verify `/api/health`, homepage, login page, and one protected API request. Confirm browser console has no failed same-origin API requests.

- [ ] **Step 5: Commit**

```bash
git add README.md public/.htaccess
git commit -m "docs: add free deployment runbook"
```

### Task 6: Hosted smoke test after account configuration

**Files:**
- No repository changes expected.

**Interfaces:**
- Consumes: Render backend URL, InfinityFree frontend URL, Atlas connection string, and Hostinger SMTP credentials supplied through provider dashboards.
- Produces: verified professor/demo deployment.

- [ ] **Step 1: Verify Render before frontend upload**

Open `https://<render-service>/api/health`; expect HTTP 200 and `database: "Connected"`.

- [ ] **Step 2: Build and upload InfinityFree frontend**

Build with exact Render origin in `VITE_API_URL`, then upload `dist` contents to `htdocs`.

- [ ] **Step 3: Verify end-to-end workflow**

From InfinityFree URL, verify page load, login, one applicant document upload/download/delete round trip, and one LMS file round trip.

- [ ] **Step 4: Verify email**

Send one email verification code through Hostinger SMTP and confirm receipt. Do not expose credentials in logs or screenshots.

- [ ] **Step 5: Record provider URLs outside source control**

Keep dashboard URLs and credentials in the team's password manager or private deployment notes, not the repository.
