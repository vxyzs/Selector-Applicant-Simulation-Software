/**
 * Validates a resume file for allowed formats (PDF, DOC, DOCX) and size (<= 5MB).
 * @param {File} file - The file object to validate.
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateResume(file) {
  if (!file) {
    return { valid: false, error: 'Resume file is missing' };
  }

  // File size validation (<= 5MB)
  const maxFileSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxFileSize) {
    return { valid: false, error: 'File size exceeds the 2MB limit' };
  }

  // File type validation (PDF, DOC, DOCX)
  const allowedTypes = [
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  // Checking file extension as a fallback/additional check
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const fileName = file.name ? file.name.toLowerCase() : '';
  const hasAllowedExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

  if (!allowedTypes.includes(file.type) && !hasAllowedExtension) {
    return { valid: false, error: 'Invalid file format. Only PDF, DOC, and DOCX files are allowed.' };
  }

  return { valid: true };
}
