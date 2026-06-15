import pdf from 'pdf-parse';

/**
 * Extracts text content from a PDF file buffer or URL.
 * @param {string|Buffer} pdfUrlOrBuffer - The PDF URL from Cloudinary or a direct file buffer.
 * @returns {Promise<string>} The extracted text content.
 */
export async function extractResumeText(pdfUrlOrBuffer) {
  try {
    let buffer;
    if (typeof pdfUrlOrBuffer === 'string') {
      console.log('Fetching PDF from URL:', pdfUrlOrBuffer);
      const response = await fetch(pdfUrlOrBuffer);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = pdfUrlOrBuffer;
    }

    console.log('Parsing PDF content using pdf-parse...');
    // Parse the PDF buffer
    const data = await pdf(buffer);
    return data.text || '';
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}
