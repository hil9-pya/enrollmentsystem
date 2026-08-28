# SIA Enrollment System

## Free Gmail SMTP setup

Applicant email verification and enrollment notifications use Nodemailer with Gmail SMTP.

1. Enable 2-Step Verification on the Gmail sender account.
2. Create a Google App Password for that account.
3. Copy SMTP values from `server/.env.example` into `server/.env`.
4. Set `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and a long random `EMAIL_OTP_SECRET`.
5. Restart the backend after changing environment variables.

Never commit `server/.env` or use the Gmail account's normal password. The generated `@ncst.edu` address is simulated; SMTP sends notices to the applicant's verified personal email.

## Development

## Safe Git workflow

Create commits on a feature branch, push that branch, and open a pull request into `main`. Review and test the pull request before merging.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
