import cloudinary from '@/lib/cloudinary';

/**
 * Deletes a resume file from Cloudinary.
 * @param {string} publicId - The public ID of the resource to delete.
 * @returns {Promise<any>}
 */
export async function deleteResume(publicId) {
  if (!publicId) return null;

  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: 'raw' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary delete error:', error);
          return reject(error);
        }
        resolve(result);
      }
    );
  });
}
