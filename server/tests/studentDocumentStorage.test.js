import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Student from '../Student.js';
import { removeDocument, uploadDocument } from '../studentsController.js';
import { openFile } from '../services/gridFsStorageService.js';

let mongo;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

async function invoke(handler, req, res) {
  let failure;
  await handler(req, res, (error) => { failure = error; });
  if (failure) throw failure;
}

test('student document storage uploads and removes GridFS content', async () => {
  const student = await Student.create({ _id: 'APP-DEMO-001', firstName: 'Demo', lastName: 'Student' });
  const uploadResponse = response();

  await invoke(uploadDocument, {
    params: { id: student._id.toString() },
    body: { typeId: 'form-138' },
    file: {
      buffer: Buffer.from('%PDF-demo'),
      originalname: 'Form 138.pdf',
      mimetype: 'application/pdf',
    },
  }, uploadResponse);

  const saved = await Student.findById(student._id);
  const storedId = saved.documents[0].fileName;
  assert.equal(mongoose.isValidObjectId(storedId), true);
  const stored = await openFile(storedId);
  assert.equal(stored.file.filename, 'Form 138.pdf');

  await invoke(removeDocument, {
    params: { id: student._id.toString(), typeId: 'form-138' },
  }, response());

  assert.equal(await openFile(storedId), null);
  assert.equal((await Student.findById(student._id)).documents.length, 0);
});
