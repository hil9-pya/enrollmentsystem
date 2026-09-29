# SIA Enrollment System

## Free Gmail SMTP setup

Applicant email verification and enrollment notifications use Nodemailer with Gmail SMTP.

1. Enable 2-Step Verification on the Gmail sender account.
2. Create a Google App Password for that account.
3. Copy SMTP values from `server/.env.example` into `server/.env`.
4. Set `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and a long random `EMAIL_OTP_SECRET`.
5. Restart the backend after changing environment variables.

Never commit `server/.env` or use the Gmail account's normal password. The generated `@ncst.edu` address is simulated; SMTP sends notices to the applicant's verified personal email.

## Free professor/demo deployment

This deployment keeps the existing Node.js backend:

- InfinityFree: compiled React frontend
- Render: Express API
- MongoDB Atlas: records and GridFS uploads
- Hostinger: SMTP

### 1. MongoDB Atlas

Create a free cluster, database user, and network access rule. Copy its connection string for Render's `MONGO_URI`. The free cluster has a 512 MB limit, so keep demo uploads small.

### 2. Render backend

Create a Web Service from this repository with:

```text
Root Directory: server
Build Command: npm install
Start Command: npm start
```

Set these Render environment variables:

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=30d
APPLICANT_TOKEN_EXPIRES_IN=7d
FRONTEND_URL=https://your-site.infinityfreeapp.com
USE_MEMORY_DB=false
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=admissions@your-domain.example
SMTP_PASS=your-hostinger-email-password
SMTP_FROM=NCST Admissions <admissions@your-domain.example>
EMAIL_OTP_SECRET=replace-with-another-long-random-secret
```

Do not commit real credentials. After deployment, open `https://your-api.onrender.com/api/health` and confirm the response reports `database: "Connected"`.

### 3. InfinityFree frontend

Build locally with the Render URL:

```powershell
$env:VITE_API_URL='https://your-api.onrender.com'
npm run build
```

Upload the **contents** of `dist` to InfinityFree's `htdocs` directory, including `.htaccess`. Do not upload `src`, `server`, `.env`, or `node_modules`.

### 4. Smoke test

From the InfinityFree site, verify:

1. Homepage and portal routes load after refresh.
2. Login and protected pages work.
3. One applicant document can be uploaded, downloaded, and removed.
4. One LMS file can be uploaded and downloaded.
5. One email verification code arrives through Hostinger SMTP.

Render's free service sleeps when idle, so the first API request can take about one minute.

## Safe Git workflow

Create commits on a feature branch, push that branch, and open a pull request into `main`. Review and test the pull request before merging.
