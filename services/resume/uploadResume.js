import cloudinary from '@/lib/cloudinary';

/**
 * Upload PDF resume to Cloudinary
 * @param {File} file
 * @returns {Promise<{
 *  secure_url: string,
 *  public_id: string,
 *  originalFilename: string,
 *  fileType: string,
 *  uploadedAt: Date
 * }>}
 */
export async function uploadResume(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract clean filename
    const extension =
      file.name?.split('.').pop()?.toLowerCase() || 'pdf';

    const originalName =
      file.name?.replace(/\.pdf$/i, '') || 'resume';

    // Safer filename cleanup
    const cleanName = originalName
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');

    const uniqueId = Date.now();

    // IMPORTANT:
    // no .pdf appended manually
    const publicId =
      `resumes/${cleanName}_${uniqueId}`;

    return new Promise((resolve, reject) => {
      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            folder: 'resumes',

            // PDF preview support
            resource_type: 'raw',

            // Clean public id
            public_id: publicId,

            // Prevent weird naming issues
            use_filename: false,
            unique_filename: false,
            overwrite: true,

            // Force PDF format
            format: 'pdf',

            // Better delivery
            access_mode: 'public',
          },
          (error, result) => {
            if (error) {
              console.error(
                'Cloudinary upload error:',
                error
              );

              return reject(
                new Error(
                  'Failed to upload resume'
                )
              );
            }

            resolve({
              secure_url:
                result.secure_url,

              public_id:
                result.public_id,

              originalFilename:
                file.name,

              fileType:
                extension,

              uploadedAt:
                new Date(),
            });
          }
        );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error(
      'Resume upload failed:',
      error
    );

    throw new Error(
      'Resume upload failed'
    );
  }
}