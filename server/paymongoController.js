import Student from './Student.js';
import User from './User.js';
import { generateNextId } from './studentsController.js'; // We can generate STU- ID and OR- receipt number

// Utility to generate a random receipt number
const generateReceiptNumber = () => {
  return `OR-2026-${Math.floor(100000 + Math.random() * 900000)}`;
};

// @desc    Simulate POST https://api.paymongo.com/v1/checkout_sessions
export const createMockCheckoutSession = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !data.attributes) {
      return res.status(400).json({
        errors: [{ detail: 'Attributes are required under data.attributes' }]
      });
    }

    const { line_items, payment_method_types, reference_number, success_url, cancel_url, billing } = data.attributes;
    
    if (!line_items || line_items.length === 0) {
      return res.status(400).json({
        errors: [{ detail: 'Line items are required' }]
      });
    }

    // Reference number is the student's _id (APP- or STU- ID)
    const student = await Student.findById(reference_number);
    if (!student) {
      return res.status(404).json({
        errors: [{ detail: 'Student/Reference not found' }]
      });
    }

    const sessionId = `cs_test_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const amountInCentavos = line_items.reduce((acc, item) => acc + item.amount * (item.quantity || 1), 0);
    const amountInPesos = amountInCentavos / 100;

    // Save session info on the student record
    student.paymentMethod = null; // Reset / waiting to choose
    student.paymentDetails = {
      checkoutSessionId: sessionId,
      status: 'active',
      amount: amountInPesos,
      paymentMethodTypes: payment_method_types || ['gcash', 'card', 'paymaya'],
      successUrl: success_url,
      cancelUrl: cancel_url,
      billing: billing || {},
      createdAt: new Date(),
    };

    await student.save();

    // Emulate Paymongo's official checkout response
    res.status(200).json({
      data: {
        id: sessionId,
        type: 'checkout_session',
        attributes: {
          billing: billing || null,
          line_items,
          payment_method_types: payment_method_types || ['gcash', 'card', 'paymaya'],
          payments: [],
          reference_number,
          status: 'active',
          success_url,
          cancel_url,
          checkout_url: `/?portal=paymongo-checkout&session_id=${sessionId}`,
        }
      }
    });
  } catch (error) {
    console.error('Error creating mock checkout session:', error);
    res.status(500).json({ errors: [{ detail: error.message }] });
  }
};

// @desc    Simulate GET https://api.paymongo.com/v1/checkout_sessions/:id
export const getMockCheckoutSession = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findOne({ 'paymentDetails.checkoutSessionId': id });
    
    if (!student) {
      return res.status(404).json({
        errors: [{ detail: 'Checkout session not found' }]
      });
    }

    const details = student.paymentDetails;
    
    res.status(200).json({
      data: {
        id,
        type: 'checkout_session',
        attributes: {
          billing: details.billing || null,
          reference_number: student._id.toString(),
          success_url: details.successUrl,
          cancel_url: details.cancelUrl,
          line_items: [
            {
              amount: details.amount * 100,
              currency: 'PHP',
              name: 'Tuition & Fees Assessment',
              quantity: 1
            }
          ],
          payment_method_types: details.paymentMethodTypes,
          payments: details.status === 'paid' ? [{
            id: details.paymentId || 'pay_test_payment_id',
            type: 'payment',
            attributes: {
              amount: details.amount * 100,
              currency: 'PHP',
              status: 'succeeded',
              payment_method_type: details.paymentMethod,
              reference_number: details.referenceCode,
            }
          }] : [],
          reference_number: student._id,
          status: details.status,
          success_url: details.successUrl,
          cancel_url: details.cancelUrl,
          checkout_url: `/?portal=paymongo-checkout&session_id=${id}`,
        }
      }
    });
  } catch (error) {
    console.error('Error getting mock checkout session:', error);
    res.status(500).json({ errors: [{ detail: error.message }] });
  }
};

// @desc    Simulate processing payment on the mock Paymongo checkout page
// @route   POST /api/paymongo/v1/checkout_sessions/:id/pay
export const payMockCheckoutSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, billingInfo, success, referenceCode } = req.body;

    const student = await Student.findOne({ 'paymentDetails.checkoutSessionId': id });
    if (!student) {
      return res.status(404).json({
        errors: [{ detail: 'Checkout session not found' }]
      });
    }

    if (student.paymentDetails.status === 'paid') {
      return res.status(400).json({
        errors: [{ detail: 'Checkout session has already been paid' }]
      });
    }

    if (success === false) {
      student.paymentDetails.status = 'failed';
      student.paymentStatus = 'failed';
      student.markModified('paymentDetails');
      await student.save();
      return res.json({ message: 'Simulated payment failure recorded' });
    }

    const mockPaymentId = `pay_pm_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const finalRefCode = referenceCode || `ref_${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // Update session state
    student.paymentDetails.status = 'paid';
    student.paymentDetails.paidAt = new Date();
    student.paymentDetails.paymentMethod = paymentMethod || 'gcash';
    student.paymentDetails.paymentId = mockPaymentId;
    student.paymentDetails.referenceCode = finalRefCode;
    student.paymentDetails.billing = billingInfo || student.paymentDetails.billing;

    // Apply enrollment clearance standards (auto-clear online payment)
    student.paymentMethod = paymentMethod || 'gcash';
    const paidAmount = Number(student.paymentDetails.amount) || 0;
    student.amountPaid = paidAmount;
    student.remainingBalance = Math.max(0, (Number(student.totalTuition) || 0) - paidAmount);
    student.paymentStatus = student.remainingBalance > 0 ? 'partial' : 'paid';
    student.status = student.remainingBalance > 0 ? 'payment_confirmed' : 'enrolled';
    if (student.remainingBalance === 0) {
      student.enrolledAt = student.enrolledAt || new Date();
      student.scheduleGenerated = true;
      student.registrationFormGenerated = true;
      student.receiptGenerated = true;
      student.receiptNumber = generateReceiptNumber();
    }
    student.paymentReference = finalRefCode;

    // Generate STU- ID if not already assigned
    if (!student.studentId) {
      student.studentId = await generateNextId('STU-');
      
      // Update username to student ID in auth system
      await User.updateOne(
        { username: student._id },
        { $set: { username: student.studentId } }
      );
    }

    student.auditLogs.push({
      action: `${student.remainingBalance > 0 ? 'Paid Downpayment' : 'Paid Tuition'} (Paymongo Online - ${paymentMethod?.toUpperCase()})`,
      user: 'Student Portal (Auto-Settled)',
      date: new Date(),
    });

    student.markModified('paymentDetails');
    await student.save();

    res.status(200).json({
      message: 'Payment completed successfully',
      data: {
        sessionId: id,
        paymentId: mockPaymentId,
        referenceCode: finalRefCode,
        receiptNumber: student.receiptNumber,
        studentId: student.studentId
      }
    });
  } catch (error) {
    console.error('Error paying mock checkout session:', error);
    res.status(500).json({ errors: [{ detail: error.message }] });
  }
};
