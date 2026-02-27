/**
 * CLOUDINARY URL OPTIMIZATION - USAGE GUIDE
 * 
 * This file demonstrates how to use the cloudinaryHelper functions
 * throughout your React app for automatic image optimization.
 * 
 * NOTE: Code examples below are meant to be used in .jsx files
 */

// ============================================
// 1. BASIC IMPORT
// ============================================
// import { optimizeCloudinaryUrl, optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';

// ============================================
// 2. SIMPLE USAGE - BASIC OPTIMIZATION
// ============================================
// Example: Using in Home.jsx for product carousel
// 
// <img 
//   src={optimizeCloudinaryUrl(item.pic1)} 
//   alt="Product" 
//   loading="lazy"
// />

// ============================================
// 3. ADVANCED USAGE WITH OPTIONS
// ============================================
// Example: Using in Shop.jsx with custom width and crop
// 
// <img 
//   src={optimizeCloudinaryUrlAdvanced(item.pic1, { 
//     maxWidth: 400,
//     crop: 'fill'
//   })} 
//   alt="Product"
// />

// ============================================
// 4. USAGE IN COMPONENTS - EXAMPLES
// ============================================

// --- EXAMPLE 1: Product Card Component ---
// function ProductCard({ product }) {
//   return (
//     <div className="product-card">
//       <img 
//         src={optimizeCloudinaryUrl(product.pic1)} 
//         alt={product.name}
//         loading="lazy"
//       />
//       <h3>{product.name}</h3>
//       <p>₹{product.price}</p>
//     </div>
//   );
// }

// --- EXAMPLE 2: Hero Banner with Responsive Image ---
// function HeroBanner({ imageUrl }) {
//   return (
//     <div className="hero">
//       <img 
//         src={optimizeCloudinaryUrlAdvanced(imageUrl, {
//           maxWidth: window.innerWidth,
//           crop: 'fill'
//         })} 
//         alt="Hero"
//       />
//     </div>
//   );
// }

// --- EXAMPLE 3: Gallery with Multiple Images ---
// function Gallery({ images }) {
//   return (
//     <div className="gallery">
//       {images.map((img, idx) => (
//         <img 
//           key={idx}
//           src={optimizeCloudinaryUrl(img.url)} 
//           alt={img.alt}
//           loading="lazy"
//         />
//       ))}
//     </div>
//   );
// }

// --- EXAMPLE 4: NextJS Image Component (if you upgrade) ---
// import Image from 'next/image';
//
// function NextJSExample({ product }) {
//   return (
//     <Image
//       src={optimizeCloudinaryUrl(product.pic1)}
//       alt={product.name}
//       width={400}
//       height={400}
//     />
//   );
// }

// ============================================
// 5. TRANSFORMATION PARAMETERS REFERENCE
// ============================================

/**
 * AUTOMATIC TRANSFORMATIONS (f_auto, q_auto):
 * 
 * f_auto  = Automatic format detection
 *           - Serves WebP to modern browsers
 *           - Falls back to JPG for older browsers
 *           - Reduces bandwidth by 25-35%
 * 
 * q_auto  = Intelligent quality optimization
 *           - Analyzes image content
 *           - Applies optimal compression
 *           - Typically uses q_85 by default
 *           - Can combine with q_auto:best (max quality)
 * 
 * OPTIONAL PARAMETERS FOR ADVANCED OPTIMIZATION:
 * 
 * w_auto   = Auto width detection
 * c_fill   = Fill crop strategy (recommended for product images)
 * c_thumb  = Thumbnail crop (good for thumbnails)
 * c_pad    = Padding/letterbox (preserves aspect ratio)
 * g_auto   = Auto gravity/center detection
 * dpr_auto = Device pixel ratio auto-detection
 */

// ============================================
// 6. RECOMMENDED SETTINGS BY USE CASE
// ============================================

// Product Catalog Images (320x400px display)
// optimizeCloudinaryUrlAdvanced(url, {
//   maxWidth: 400,
//   crop: 'fill'
// });

// Thumbnails (100x100px)
// optimizeCloudinaryUrlAdvanced(url, {
//   maxWidth: 150,
//   crop: 'thumb'
// });

// Hero/Banner Images (Full width responsive)
// optimizeCloudinaryUrlAdvanced(url, {
//   maxWidth: 1920,
//   crop: 'fill'
// });

// ============================================
// 7. BENEFITS & OPTIMIZATION RESULTS
// ============================================

/**
 * FILE SIZE REDUCTION:
 * - f_auto: Saves ~25-35% with WebP format
 * - q_auto: Additional 15-25% savings with smart compression
 * - Combined: ~40-50% total bandwidth savings
 * 
 * PERFORMANCE METRICS:
 * - Faster page load times (especially on slow connections)
 * - Reduced server bandwidth costs
 * - Better SEO rankings (page speed is a factor)
 * - Improved mobile performance
 * - Better Core Web Vitals scores
 */

// ============================================
// 8. CLOUDINARY URL STRUCTURE
// ============================================

/**
 * STANDARD CLOUDINARY URL:
 * https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}
 * 
 * WITH TRANSFORMATIONS:
 * https://res.cloudinary.com/{cloud_name}/image/upload/f_auto,q_auto/{public_id}
 * 
 * RESULT AFTER OPTIMIZATION:
 * ✓ Automatically detects format (WebP, JPEG, PNG)
 * ✓ Auto-compresses to optimal quality
 * ✓ Reduces file size significantly
 * ✓ Maintains visual quality
 */

// ============================================
// 9. IMPLEMENTATION CHECKLIST
// ============================================

/**
 * ✅ Created /src/utils/cloudinaryHelper.js
 * ✅ Updated Home.jsx - imports cloudinaryHelper
 * ✅ Updated Home.jsx - uses optimizeCloudinaryUrl() for product images
 * ✅ Updated Shop.jsx - imports cloudinaryHelper
 * ✅ Updated Shop.jsx - uses optimizeCloudinaryUrl() for product images
 * 
 * TODO (Optional):
 * □ Update SingleProductPage.jsx for product detail images
 * □ Update Wishlist.jsx for wishlist product images
 * □ Update Cart.jsx for cart product images
 * □ Update Profile.jsx for user images
 * □ Add responsive width detection for mobile optimization
 */

export default {};
