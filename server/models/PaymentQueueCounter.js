import mongoose from 'mongoose';

const PaymentQueueCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, default: 0 },
});

const PaymentQueueCounter = mongoose.model('PaymentQueueCounter', PaymentQueueCounterSchema);

export default PaymentQueueCounter;
