import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectLmsFileBuffer,
  sanitizeLmsOriginalName,
  validateLmsUploadMetadata,
} from '../services/lmsStorageService.js';

test('LMS storage validates file content instead of trusting MIME metadata', () => {
  const pdf = Buffer.from('%PDF-1.7\nvalid test document');
  const result = inspectLmsFileBuffer(pdf, 'lesson.pdf');
  assert.equal(result.mimeType, 'application/pdf');
  assert.equal(result.checksum.length, 64);

  assert.throws(
    () => inspectLmsFileBuffer(Buffer.from('MZ executable content'), 'lesson.pdf'),
    /does not match/
  );
  assert.throws(
    () => validateLmsUploadMetadata({ originalname: 'malware.exe', mimetype: 'application/pdf' }),
    /Unsupported file type/
  );
  assert.throws(
    () => validateLmsUploadMetadata({ originalname: 'legacy.doc', mimetype: 'application/msword' }),
    /Unsupported file type/
  );
});

test('LMS storage checks Office containers and blocks scripts inside ZIP files', () => {
  const validDocx = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from('[Content_Types].xml word/document.xml'),
  ]);
  assert.equal(inspectLmsFileBuffer(validDocx, 'lesson.docx').mimeType, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

  const fakeDocx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('random/archive.txt')]);
  assert.throws(() => inspectLmsFileBuffer(fakeDocx, 'lesson.docx'), /Office file structure is invalid/);

  const unsafeZip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('files/install.ps1')]);
  assert.throws(() => inspectLmsFileBuffer(unsafeZip, 'resources.zip'), /blocked executable/);
});

test('LMS storage sanitizes download names', () => {
  assert.equal(sanitizeLmsOriginalName('../../bad\u0000:name.pdf'), 'bad_name.pdf');
});
