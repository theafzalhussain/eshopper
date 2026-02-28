/**
 * Optimizes Cloudinary URLs with automatic format and quality compression
 * @param {string} url - The original image URL
 * @returns {string} - Optimized Cloudinary URL with f_auto,q_auto parameters
 */
export const optimizeCloudinaryUrl = (url) => {
  if (!url) return url;

  // Check if it's a Cloudinary URL
  if (!url.includes('cloudinary')) {
    return url;
  }

  // Extract the base URL and the path after /upload/
  const cloudinaryMatch = url.match(/(.+\/upload\/)(.+)/);
  if (!cloudinaryMatch) {
    return url;
  }

  const baseUrl = cloudinaryMatch[1];
  const imagePath = cloudinaryMatch[2];

  // Check if optimization params already exist
  if (imagePath.includes('f_auto') || imagePath.includes('q_auto')) {
    return url;
  }

  // Insert optimized transforms after /upload/
  // You can customize the transformation parameters as needed:
  // - f_auto: Auto-detect and serve the optimal format
  // - q_auto: Auto-detect and apply the optimal quality
  // - w_auto: Auto-scale based on device width
  // - dpr_auto: Auto-detect device pixel ratio
  return `${baseUrl}f_auto,q_auto:good,dpr_auto,w_auto/${imagePath}`;
};

/**
 * Advanced Cloudinary URL optimization with additional transformations
 * @param {string} url - The original image URL
 * @param {object} options - Optional configuration
 * @param {number} options.maxWidth - Max width for responsive images
 * @param {string} options.crop - Crop strategy (cover, fill, pad, etc.)
 * @returns {string} - Optimized Cloudinary URL
 */
export const optimizeCloudinaryUrlAdvanced = (url, options = {}) => {
  if (!url) return url;

  // Check if it's a Cloudinary URL
  if (!url.includes('cloudinary')) {
    return url;
  }

  const cloudinaryMatch = url.match(/(.+\/upload\/)(.+)/);
  if (!cloudinaryMatch) {
    return url;
  }

  const baseUrl = cloudinaryMatch[1];
  const imagePath = cloudinaryMatch[2];

  // Build transformation string
  let transformations = ['f_auto', 'q_auto:good', 'dpr_auto'];

  if (options.maxWidth) {
    transformations.push(`w_${options.maxWidth}`);
  }

  if (options.crop) {
    transformations.push(`c_${options.crop}`);
  }

  // Add gravity for consistent cropping
  if (options.crop && options.crop !== 'pad') {
    transformations.push('g_auto');
  }

  const transformationString = transformations.join(',');

  return `${baseUrl}${transformationString}/${imagePath}`;
};
