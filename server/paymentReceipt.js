function receiptIdPart(studentId) {
  const normalized = String(studentId || '').trim().toUpperCase();
  const applicationMatch = normalized.match(/^APP-(\d{4})-(\d+)$/);
  if (applicationMatch) {
    return `${applicationMatch[1]}-${applicationMatch[2].padStart(4, '0')}`;
  }

  const safe = normalized.replace(/[^A-Z0-9]/g, '').slice(-10);
  return `${new Date().getFullYear()}-${safe || Date.now()}`;
}

export function ensureReceiptNumber(student) {
  if (!student.receiptNumber) {
    student.receiptNumber = `OR-${receiptIdPart(student._id)}`;
  }
  return student.receiptNumber;
}

export function markPaymentReceived(student, { paidAt = new Date() } = {}) {
  const existingDetails = student.paymentDetails && typeof student.paymentDetails === 'object'
    ? student.paymentDetails
    : {};

  student.paymentDetails = {
    ...existingDetails,
    status: 'paid',
    amount: student.amountPaid,
    paidAt: existingDetails.paidAt || paidAt,
    paymentMethod: student.paymentMethod || existingDetails.paymentMethod || null,
    referenceCode: student.paymentReference || existingDetails.referenceCode || null,
  };
  ensureReceiptNumber(student);
}
