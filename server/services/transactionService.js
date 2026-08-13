import mongoose from 'mongoose';

function transactionUnavailable(error) {
  return error?.code === 20
    || error?.codeName === 'IllegalOperation'
    || /transaction numbers are only allowed|does not support transactions/i.test(error?.message || '');
}

export async function runWithOptionalTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (error) {
      if (!transactionUnavailable(error)) throw error;
      return work(null);
    }
  } finally {
    await session.endSession();
  }
}
