import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { deleteFile, listFileIds, openFile, storeFile } from '../services/gridFsStorageService.js';

let mongo;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

test('GridFS stores, opens, lists, and deletes one file', async () => {
  const id = await storeFile({
    buffer: Buffer.from('demo-file'),
    filename: 'demo.txt',
    contentType: 'text/plain',
    metadata: { owner: 'student-1' },
  });

  const stored = await openFile(id);
  assert.equal(stored.file.filename, 'demo.txt');
  assert.equal(stored.file.contentType, 'text/plain');
  assert.equal(stored.file.metadata.owner, 'student-1');
  assert.deepEqual(await readStream(stored.stream), Buffer.from('demo-file'));
  assert.deepEqual(await listFileIds(), [id]);

  assert.equal(await deleteFile(id), true);
  assert.equal(await openFile(id), null);
  assert.deepEqual(await listFileIds(), []);
});

test('GridFS treats malformed and missing identifiers as absent', async () => {
  assert.equal(await openFile('not-an-object-id'), null);
  assert.equal(await deleteFile('not-an-object-id'), false);
  assert.equal(await openFile(new mongoose.Types.ObjectId().toString()), null);
});

test('GridFS listing can isolate one file category', async () => {
  const applicantId = await storeFile({
    buffer: Buffer.from('applicant'),
    filename: 'applicant.pdf',
    contentType: 'application/pdf',
    metadata: { kind: 'applicant-document' },
  });
  const lmsId = await storeFile({
    buffer: Buffer.from('lms'),
    filename: 'lesson.pdf',
    contentType: 'application/pdf',
    metadata: { kind: 'lms-material' },
  });

  assert.deepEqual(await listFileIds({ 'metadata.kind': 'lms-material' }), [lmsId]);

  await deleteFile(applicantId);
  await deleteFile(lmsId);
});
