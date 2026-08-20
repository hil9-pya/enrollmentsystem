import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const LMS_UPLOADS_DIRECTORY = path.resolve(moduleDirectory, '..', 'lms-uploads');
export const LMS_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const LMS_CLASS_STORAGE_LIMIT_BYTES = Math.max(
  LMS_MAX_FILE_SIZE_BYTES,
  Number(process.env.LMS_CLASS_STORAGE_LIMIT_MB || 500) * 1024 * 1024
);

const uploadTypes = new Map([
  ['.pdf', { mimeType: 'application/pdf', signature: 'pdf' }],
  ['.docx', { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', signature: 'zip' }],
  ['.xlsx', { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', signature: 'zip' }],
  ['.pptx', { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', signature: 'zip' }],
  ['.txt', { mimeType: 'text/plain', signature: 'text' }],
  ['.jpg', { mimeType: 'image/jpeg', signature: 'jpeg' }],
  ['.jpeg', { mimeType: 'image/jpeg', signature: 'jpeg' }],
  ['.png', { mimeType: 'image/png', signature: 'png' }],
  ['.zip', { mimeType: 'application/zip', signature: 'zip' }],
]);

const clientMimeTypes = new Set([
  ...[...uploadTypes.values()].map((item) => item.mimeType),
  'application/x-zip-compressed',
  'application/octet-stream',
]);

function hasPrefix(buffer, bytes) {
  return buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);
}

function signatureMatches(buffer, signature) {
  if (signature === 'pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (signature === 'jpeg') return hasPrefix(buffer, [0xff, 0xd8, 0xff]);
  if (signature === 'png') return hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (signature === 'zip') {
    return hasPrefix(buffer, [0x50, 0x4b, 0x03, 0x04])
      || hasPrefix(buffer, [0x50, 0x4b, 0x05, 0x06])
      || hasPrefix(buffer, [0x50, 0x4b, 0x07, 0x08]);
  }
  if (signature === 'text') {
    if (buffer.includes(0)) return false;
    const sample = buffer.subarray(0, Math.min(buffer.length, 8192)).toString('utf8');
    const replacementCount = [...sample].filter((character) => character === '\uFFFD').length;
    return replacementCount <= Math.max(1, Math.floor(sample.length * 0.01));
  }
  return false;
}

export function sanitizeLmsOriginalName(value) {
  const withoutControlCharacters = [...path.basename(String(value || 'file'))]
    .filter((character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127)
    .join('');
  return withoutControlCharacters
    .replace(/[<>:"/\\|?*]/g, '_')
    .trim()
    .slice(0, 180) || 'file';
}

export function validateLmsUploadMetadata(file) {
  const extension = path.extname(String(file?.originalname || '')).toLowerCase();
  if (!uploadTypes.has(extension) || !clientMimeTypes.has(String(file?.mimetype || '').toLowerCase())) {
    throw new Error('Unsupported file type. Upload PDF, Office, text, image, or ZIP files.');
  }
  return extension;
}

export function inspectLmsFileBuffer(buffer, originalName) {
  const extension = path.extname(String(originalName || '')).toLowerCase();
  const expected = uploadTypes.get(extension);
  if (!expected || !signatureMatches(buffer, expected.signature)) {
    throw new Error('File content does not match its extension or uses an unsafe format.');
  }
  if (expected.signature === 'zip') {
    const directoryText = buffer.toString('latin1');
    const dangerousEntry = /\.(exe|dll|js|jse|vbs|vbe|ps1|bat|cmd|com|scr|msi|jar|sh)(?:[^a-z0-9]|$)/i.test(directoryText);
    if (dangerousEntry) throw new Error('ZIP archive contains a blocked executable or script file.');
    const requiredFolder = extension === '.docx' ? 'word/' : extension === '.xlsx' ? 'xl/' : extension === '.pptx' ? 'ppt/' : '';
    if (requiredFolder && (!directoryText.includes('[Content_Types].xml') || !directoryText.includes(requiredFolder))) {
      throw new Error('Office file structure is invalid or does not match its extension.');
    }
  }
  return {
    mimeType: expected.mimeType,
    checksum: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
}

export async function inspectStoredLmsUpload(file) {
  const buffer = await fs.readFile(file.path);
  return inspectLmsFileBuffer(buffer, file.originalname);
}

export function resolveLmsStoragePath(storageName) {
  const safeName = path.basename(String(storageName || ''));
  if (!safeName || safeName !== storageName) throw new Error('Invalid LMS storage name.');
  const resolved = path.resolve(LMS_UPLOADS_DIRECTORY, safeName);
  if (!resolved.startsWith(`${LMS_UPLOADS_DIRECTORY}${path.sep}`)) throw new Error('Invalid LMS storage path.');
  return resolved;
}

export async function removeLmsStoredFile(filePathOrName) {
  if (!filePathOrName) return;
  const target = path.isAbsolute(filePathOrName) ? path.resolve(filePathOrName) : resolveLmsStoragePath(filePathOrName);
  if (!target.toLowerCase().startsWith(`${LMS_UPLOADS_DIRECTORY}${path.sep}`.toLowerCase())) {
    throw new Error('Refusing to remove file outside LMS storage.');
  }
  await fs.unlink(target).catch(() => {});
}

export async function listLmsStoredFiles() {
  const entries = await fs.readdir(LMS_UPLOADS_DIRECTORY, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}
