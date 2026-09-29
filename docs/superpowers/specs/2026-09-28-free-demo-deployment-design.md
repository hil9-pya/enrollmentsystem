# Free Demo Deployment Design

## Goal

Deploy the existing NCST enrollment system for professor/demo testing without rewriting its Node.js backend:

- InfinityFree hosts the compiled React frontend.
- Render hosts the Express backend.
- MongoDB Atlas stores application records and uploaded files.
- Hostinger SMTP sends verification and enrollment emails.

## Constraints

- Preserve the existing React, Express, Mongoose, and Nodemailer implementation.
- Use free service tiers suitable for a controlled classroom demonstration.
- Do not store secrets in the repository or frontend bundle.
- Preserve current authentication, file validation, access controls, and download permissions.
- Keep local development working through the existing Vite proxy.
- Accept Render cold-start delay as a free-tier limitation.

## Frontend-to-backend connection

Production frontend requests use a single `VITE_API_URL` value containing the Render backend origin. A small shared URL helper prefixes only local API paths. Local development leaves this value empty so Vite continues proxying `/api` to `localhost:5000`.

All frontend calls to backend endpoints use the shared helper. External URLs and static assets are unchanged. The backend CORS origin is configured with the exact InfinityFree HTTPS origin.

## Persistent uploads

Render's local filesystem is temporary, so applicant documents, LMS materials, and LMS submissions move to MongoDB GridFS. Multer keeps one validated upload in memory long enough to inspect and store it. Existing size limits remain 5 MB for applicant documents and 20 MB for LMS files.

One shared GridFS service performs upload, download streaming, deletion, and existence/list checks. Existing model fields such as `fileName` and `storageName` hold the GridFS file identifier as a string, limiting schema changes. Existing protected download routes remain the only way clients retrieve private files.

If GridFS storage fails, no database metadata is created. Replacing or deleting an upload removes the old GridFS object after the new state is safely stored. A missing stored object returns HTTP 404 without exposing storage internals.

## Deployment configuration

Render receives production environment variables for MongoDB, JWT, frontend origin, Hostinger SMTP, and any payment configuration. InfinityFree receives only the compiled `dist` output; `VITE_API_URL` is embedded during the local production build and is not a secret.

MongoDB Atlas holds both normal collections and the GridFS bucket. Its 512 MB free storage ceiling is accepted for professor/demo use. Demo files should remain small and disposable.

## Verification

- Unit-check URL construction for empty and configured API origins.
- Test applicant document upload, download, replacement, deletion, invalid type, oversize file, and missing GridFS object.
- Test LMS material and submission upload/download/delete behavior while retaining current content validation.
- Run existing backend tests and frontend production build.
- After deployment, verify health endpoint, login, one document round trip, and one SMTP verification email.

## Deployment order

1. Create/configure MongoDB Atlas database access.
2. Deploy and configure the Render backend.
3. Build the frontend with the Render API origin and upload `dist` to InfinityFree.
4. Run browser and SMTP smoke tests from the InfinityFree site.
