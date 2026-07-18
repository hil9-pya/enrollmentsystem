import mongoose from 'mongoose';
import User from './User.js';

mongoose.connect('mongodb://127.0.0.1:27017/enrollment-system').then(async () => {
  await User.updateOne({ username: 'STU-2026-0004' }, { $set: { email: 'miguel@example.com' } });
  console.log('Fixed Miguel email');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
