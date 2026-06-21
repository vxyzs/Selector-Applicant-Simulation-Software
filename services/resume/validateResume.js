/**
 * Validates a resume file for allowed formats (PDF, DOC, DOCX), size (<= 2MB), and binary signature (magic bytes).
 * @param {File} file - The file object to validate.
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
export async function validateResume(file) {
  if (!file) {
    return { valid: false, error: 'Resume file is missing' };
  }

  // File size validation (<= 2MB)
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

  // Binary Magic Bytes Validation
  try {
    const headerSlice = file.slice(0, 8);
    const arrayBuffer = await headerSlice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const matchBytes = (actual, expected) => {
      if (actual.length < expected.length) return false;
      for (let i = 0; i < expected.length; i++) {
        if (actual[i] !== expected[i]) return false;
      }
      return true;
    };

    // 1. PDF: %PDF- (25 50 44 46 in hex)
    const isPDF = matchBytes(bytes, [0x25, 0x50, 0x44, 0x46]);

    // 2. DOCX / ZIP Container: PK.. (50 4B 03 04 in hex)
    const isDOCX = matchBytes(bytes, [0x50, 0x4B, 0x03, 0x04]);

    // 3. DOC / Legacy Compound Document: D0 CF 11 E0 A1 B1 1A E1 in hex
    const isDOC = matchBytes(bytes, [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);

    if (!isPDF && !isDOCX && !isDOC) {
      return { valid: false, error: 'File validation failed: Binary signature mismatch. The file content does not match its extension.' };
    }
  } catch (error) {
    console.error('Error validating resume magic bytes:', error);
    return { valid: false, error: 'Failed to process file binary validation.' };
  }

  return { valid: true };
}
