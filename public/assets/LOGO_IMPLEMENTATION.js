/**
 * eShopper Logo Implementation Guide
 * Quick reference for developers
 */

// ==================== REACT IMPLEMENTATION ====================

// 1. Import logos as components
import LogoMain from '@/assets/eshopper-logo.svg';
import LogoMark from '@/assets/eshopper-logo-mark.svg';
import LogoHorizontal from '@/assets/eshopper-logo-horizontal.svg';
import LogoVertical from '@/assets/eshopper-logo-vertical.svg';

// 2. Create reusable components
export function BrandLogoMain({ width = 400, height = 500 }) {
  return (
    <img 
      src={LogoMain} 
      alt="eShopper Boutique Luxe Logo" 
      width={width} 
      height={height}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}

export function BrandLogoMark({ width = 60, height = 60 }) {
  return (
    <img 
      src={LogoMark} 
      alt="eShopper Logo Mark" 
      width={width} 
      height={height}
      style={{ aspectRatio: '1/1' }}
    />
  );
}

export function BrandLogoHorizontal({ width = 200, height = 40 }) {
  return (
    <img 
      src={LogoHorizontal} 
      alt="eShopper Boutique Luxe" 
      width={width} 
      height={height}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}

export function BrandLogoVertical({ width = 150, height = 200 }) {
  return (
    <img 
      src={LogoVertical} 
      alt="eShopper Logo" 
      width={width} 
      height={height}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}

// ==================== NAVBAR IMPLEMENTATION ====================

export function Navbar() {
  return (
    <nav style={{
      background: '#0a0a0a',
      padding: '20px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <BrandLogoHorizontal width={150} height={35} />
      </div>
      <div>{/* Navigation items */}</div>
    </nav>
  );
}

// ==================== FOOTER IMPLEMENTATION ====================

export function Footer() {
  return (
    <footer style={{
      background: '#0a0a0a',
      padding: '40px',
      textAlign: 'center',
      borderTop: '1px solid #2a2a2a'
    }}>
      <div style={{ marginBottom: '30px' }}>
        <BrandLogoVertical width={100} height={130} />
      </div>
      <p style={{ color: '#FFD700', fontSize: '12px', letterSpacing: '2px' }}>
        BOUTIQUE LUXE
      </p>
      <p style={{ color: '#888', marginTop: '10px' }}>
        © 2026 eShopper Boutique Luxe. All rights reserved.
      </p>
    </footer>
  );
}

// ==================== HERO SECTION IMPLEMENTATION ====================

export function HeroSection() {
  return (
    <div style={{
      background: '#0a0a0a',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      <div style={{ marginBottom: '40px', animation: 'fadeInDown 1s ease-out' }}>
        <BrandLogoMain width={300} height={375} />
      </div>
      <h1 style={{
        color: '#FFD700',
        fontSize: '48px',
        fontFamily: 'Playfair Display, Georgia, serif',
        letterSpacing: '3px',
        margin: 0
      }}>
        LUXURY SHOPPING REDEFINED
      </h1>
    </div>
  );
}

// ==================== EMAIL HEADER IMPLEMENTATION ====================

export function EmailHeader() {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
      <tr>
        <td align="center" style="padding:30px 0;">
          <img 
            src="https://eshopperr.me/assets/eshopper-logo-horizontal.svg" 
            alt="eShopper" 
            width="200" 
            height="45" 
            style="max-width:100%;height:auto;"
          />
        </td>
      </tr>
    </table>
  `;
}

// ==================== EMAIL FOOTER IMPLEMENTATION ====================

export function EmailFooter() {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;border-top:1px solid #2a2a2a;">
      <tr>
        <td align="center" style="padding:30px 0;">
          <img 
            src="https://eshopperr.me/assets/eshopper-logo-vertical.svg" 
            alt="eShopper" 
            width="100" 
            height="130" 
            style="max-width:100%;height:auto;"
          />
          <p style="color:#FFD700;font-size:12px;letter-spacing:2px;margin:15px 0 0 0;">
            BOUTIQUE LUXE
          </p>
          <p style="color:#888;font-size:11px;margin:10px 0;">
            © 2026 eShopper Boutique Luxe. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  `;
}

// ==================== FAVICON IMPLEMENTATION ====================

// Add to HTML <head>
// <link rel="icon" href="/assets/eshopper-logo-mark.svg" type="image/svg+xml" />
// <link rel="apple-touch-icon" href="/assets/eshopper-logo-mark.svg" />

// ==================== CSS BACKGROUND IMPLEMENTATION ====================

const logoStyles = `
  /* Full Logo Background */
  .hero-with-logo {
    background-image: url('/assets/eshopper-logo.svg');
    background-size: 400px 500px;
    background-repeat: no-repeat;
    background-position: center;
    background-attachment: fixed;
  }

  /* Logo Mark Background */
  .feature-with-mark {
    background-image: url('/assets/eshopper-logo-mark.svg');
    background-size: 150px;
    background-repeat: no-repeat;
    background-position: center top;
  }

  /* Logo with Overlay */
  .logo-overlay {
    position: relative;
    background: linear-gradient(135deg, rgba(10,10,10,0.9), rgba(10,10,10,0.7));
    background-image: url('/assets/eshopper-logo.svg');
    background-size: 60%;
    background-repeat: no-repeat;
    background-position: center;
  }

  /* Responsive Logo Sizing */
  @media (max-width: 768px) {
    .hero-with-logo {
      background-size: 200px 250px;
    }
  }
`;

// ==================== SOCIAL MEDIA USAGE ====================

// Facebook/Instagram Profile Picture
// File: eshopper-logo-mark.svg
// Size: 200x200px minimum, 400x400px recommended
// Format: Square (1:1 aspect ratio)

// Facebook/LinkedIn Banner
// File: eshopper-logo.svg or custom 16:9
// Size: 1200x628px (Facebook), 1200x500px (LinkedIn)
// Placement: Center, with dark background

// Instagram Story
// File: eshopper-logo-vertical.svg
// Size: 1080x1920px
// Placement: Center, add text overlay if needed

// Twitter Header
// File: eshopper-logo-horizontal.svg
// Size: 1500x500px
// Placement: Center, ensure contrast

// WhatsApp Business Avatar
// File: eshopper-logo-mark.svg
// Size: 400x400px (native support)
// Format: PNG/JPG with transparent background

// ==================== PRINT DESIGN SPECIFICATIONS ====================

const printSpecs = {
  businessCard: {
    file: 'eshopper-logo-horizontal.svg',
    size: '3.5" x 2" @ 300dpi',
    position: 'top-left or top-center',
    colorMode: 'CMYK for printing',
    background: 'Midnight Black (#0a0a0a)'
  },
  
  letterhead: {
    file: 'eshopper-logo-horizontal.svg',
    size: '2" x 0.5" @ 300dpi',
    position: 'top-center',
    colorMode: 'CMYK',
    background: 'White with black logo or black with gold'
  },

  brochure: {
    file: 'eshopper-logo.svg',
    size: '4" x 5" @ 300dpi',
    position: 'front cover center',
    colorMode: 'CMYK for full color'
  },

  packaging: {
    file: 'eshopper-logo.svg',
    size: '3" x 3.75" @ 300dpi',
    position: 'front-center on all packaging',
    colorMode: 'Gold foil embossing recommended'
  }
};

// ==================== ACCESSIBILITY NOTES ====================

// Alt Text Examples
const altTexts = {
  main: 'eShopper Boutique Luxe Logo - Luxury Shopping Brand',
  mark: 'eShopper Logo Mark - ES Monogram',
  horizontal: 'eShopper Boutique Luxe Horizontal Logo',
  vertical: 'eShopper Boutique Luxe Vertical Logo'
};

// Color Contrast Ratio
// Gold (#FFD700) on Black (#0a0a0a): 19.5:1 ✅ (Excellent - exceeds WCAG AAA)
// Ensures excellent accessibility and readability

// ==================== FILE LOCATIONS ====================

/*
All logo files located at: /public/assets/

Files:
1. eshopper-logo.svg              (Main vertical logo with monogram)
2. eshopper-logo-mark.svg         (ES monogram mark only)
3. eshopper-logo-horizontal.svg   (Horizontal text logo)
4. eshopper-logo-vertical.svg     (Vertical stacked logo)
5. LOGO_GUIDELINES.md             (Comprehensive guidelines)

Access in HTML:
<img src="/assets/eshopper-logo.svg" alt="eShopper" />

Access in React:
import LogoSvg from '@/assets/eshopper-logo.svg';

Access in CSS:
background-image: url('/assets/eshopper-logo.svg');
*/

// ==================== QUICK CHECKLIST ====================

const implementationChecklist = {
  'Website Header': [
    { task: 'Add horizontal logo to navbar', file: 'eshopper-logo-horizontal.svg', size: '150x35px' },
    { task: 'Set favicon to mark logo', file: 'eshopper-logo-mark.svg', size: '32x32px' },
    { task: 'Add logo to footer', file: 'eshopper-logo-vertical.svg', size: '100x130px' }
  ],
  'Social Media': [
    { task: 'Profile picture', file: 'eshopper-logo-mark.svg', size: '400x400px' },
    { task: 'Cover photos', file: 'eshopper-logo.svg', size: 'varies per platform' },
    { task: 'Story background', file: 'eshopper-logo-vertical.svg', size: '1080x1920px' }
  ],
  'Email': [
    { task: 'Email header', file: 'eshopper-logo-horizontal.svg', size: '200x45px' },
    { task: 'Email footer', file: 'eshopper-logo-vertical.svg', size: '100x130px' },
    { task: 'Signature', file: 'eshopper-logo-mark.svg', size: '40x40px' }
  ],
  'Print': [
    { task: 'Business cards', file: 'eshopper-logo-horizontal.svg', size: 'Print spec' },
    { task: 'Letterheads', file: 'eshopper-logo-horizontal.svg', size: 'Print spec' },
    { task: 'Marketing materials', file: 'eshopper-logo.svg', size: 'Print spec' }
  ]
};
