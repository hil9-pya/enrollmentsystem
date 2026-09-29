import mongoose from 'mongoose';

const BUCKET_NAME = 'uploads';

function bucket() {
  if (!mongoose.connection.db) throw new Error('Database is not connected.');
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
}

function objectId(value) {
  return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

export function storeFile({ buffer, filename, contentType, metadata = {} }) {
  return new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(filename, { contentType, metadata });
    stream.once('error', reject);
    stream.once('finish', () => resolve(stream.id.toString()));
    stream.end(buffer);
  });
}

export async function openFile(id) {
  const _id = objectId(id);
  if (!_id) return null;
  const storage = bucket();
  const file = await storage.find({ _id }).next();
  return file ? { file, stream: storage.openDownloadStream(_id) } : null;
}

export async function deleteFile(id) {
  const _id = objectId(id);
  if (!_id) return false;
  const storage = bucket();
  if (!await storage.find({ _id }).hasNext()) return false;
  await storage.delete(_id);
  return true;
}

export async function listFileIds(filter = {}) {
  const files = await bucket().find(filter).sort({ uploadDate: 1 }).toArray();
  return files.map((file) => file._id.toString());
}
