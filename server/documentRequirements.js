const REQUIRED_DOCUMENTS_BY_ENROLLMENT_TYPE = {
  new: ['form-138', 'birth-cert', 'good-moral'],
  transfer: ['honorable-dismissal', 'tor', 'course-description', 'birth-cert', 'good-moral'],
  returning: ['readmission-form', 'clearance-returning'],
};

const CAMPUS_SUBMISSION_DOCUMENT_BY_ENROLLMENT_TYPE = {
  new: 'form-138',
  transfer: 'honorable-dismissal',
  returning: 'readmission-form',
};

export function getRequiredOnlineDocumentIds(enrollmentType, submitDocumentsOnCampus) {
  if (submitDocumentsOnCampus) {
    const primaryDocument = CAMPUS_SUBMISSION_DOCUMENT_BY_ENROLLMENT_TYPE[enrollmentType];
    return primaryDocument ? [primaryDocument] : [];
  }

  return REQUIRED_DOCUMENTS_BY_ENROLLMENT_TYPE[enrollmentType] || [];
}
