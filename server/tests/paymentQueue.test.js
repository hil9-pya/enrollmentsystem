import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Student from '../Student.js';
import {
  callNextWalkInQueue,
  confirmPayment,
  joinWalkInQueue,
  updateWalkInQueue,
} from '../studentsController.js';

function invoke(handler, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, payload });
        return this;
      },
    };
    handler(req, res, reject);
  });
}

test('walk-in payments receive FIFO tickets and complete through accounting queue', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    await Student.create([
      {
        _id: 'APP-2026-9801',
        firstName: 'First',
        lastName: 'Student',
        status: 'payment_pending',
        paymentMethod: 'cash',
        totalTuition: 9000,
      },
      {
        _id: 'APP-2026-9802',
        firstName: 'Second',
        lastName: 'Student',
        status: 'payment_pending',
        paymentMethod: 'cash',
        totalTuition: 9000,
      },
    ]);

    const first = await invoke(joinWalkInQueue, {
      params: { id: 'APP-2026-9801' },
      body: { paymentPlan: 'downpayment' },
    });
    const second = await invoke(joinWalkInQueue, {
      params: { id: 'APP-2026-9802' },
      body: { paymentPlan: 'full' },
    });
    assert.equal(first.status, 201);
    assert.equal(first.payload.walkInQueue.ticketNumber, 'PAY-001');
    assert.equal(second.payload.walkInQueue.ticketNumber, 'PAY-002');

    const repeated = await invoke(joinWalkInQueue, {
      params: { id: 'APP-2026-9801' },
      body: { paymentPlan: 'full' },
    });
    assert.equal(repeated.payload.walkInQueue.ticketNumber, 'PAY-001');

    const called = await invoke(callNextWalkInQueue, {
      body: { counterNumber: '1' },
      user: { username: 'cashier' },
    });
    assert.equal(called.payload.id, 'APP-2026-9801');
    assert.equal(called.payload.walkInQueue.status, 'called');

    const firstCalledAt = new Date(called.payload.walkInQueue.calledAt).getTime();
    const repeatedCall = await invoke(updateWalkInQueue, {
      params: { id: 'APP-2026-9801', action: 'repeat-call' },
      body: {},
      user: { username: 'cashier' },
    });
    assert.equal(repeatedCall.payload.walkInQueue.status, 'called');
    assert.ok(new Date(repeatedCall.payload.walkInQueue.calledAt).getTime() > firstCalledAt);
    assert.match(repeatedCall.payload.auditLogs.at(-1).action, /Repeated Call/);

    const serving = await invoke(updateWalkInQueue, {
      params: { id: 'APP-2026-9801', action: 'serve' },
      body: {},
      user: { username: 'cashier' },
    });
    assert.equal(serving.payload.walkInQueue.status, 'serving');

    const paid = await invoke(confirmPayment, {
      params: { id: 'APP-2026-9801' },
      body: {},
      user: { username: 'cashier' },
    });
    assert.equal(paid.payload.walkInQueue.status, 'completed');
    assert.equal(paid.payload.paymentStatus, 'partial');
    assert.equal(paid.payload.amountPaid, 3000);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
