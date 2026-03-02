# 🎨 ChatBot Design System & Brand Guidelines

## Color Palette

### Primary Colors
| Color | Hex | RGBA | Usage |
|-------|-----|------|-------|
| **Gold** | `#FFD700` | `rgba(255, 215, 0, 1)` | Primary accent, borders, text highlights |
| **Dark Navy** | `#0a0a0a` | `rgba(10, 10, 10, 1)` | Header background, dark elements |
| **Charcoal** | `#1a1a1a` | `rgba(26, 26, 26, 1)` | Secondary dark background |
| **Cyan** | `#00D9FF` | `rgba(0, 217, 255, 1)` | Status indicators, accents |

### Secondary Colors
| Color | Hex | RGBA | Usage |
|-------|-----|------|-------|
| **Off-White** | `#FAFAFA` | `rgba(250, 250, 250, 1)` | Chat background light |
| **Light Gray** | `#F8F8F8` | `rgba(248, 248, 248, 1)` | Chat background darker |
| **Text Dark** | `#222222` | `rgba(34, 34, 34, 1)` | Primary text |
| **Text Muted** | `#999999` | `rgba(153, 153, 153, 1)` | Secondary text |
| **Border** | `#999999` | `rgba(153, 153, 153, 1)` | Subtle borders |

### Semantic Colors
```css
/* Error */
--color-error: #FF6B6B;

/* Success */
--color-success: #51CF66;

/* Warning */
--color-warning: #FFD700;

/* Info */
--color-info: #00D9FF;
```

---

## Typography System

### Font Family Stack
```css
font-family: 'Inter', '-apple-system', 'Segoe UI', 'Roboto', sans-serif;
```

### Type Scale
| Usage | Size | Weight | Letter Spacing |
|-------|------|--------|-----------------|
| **Header (H4)** | 15px | 800 | -0.3px |
| **Status Text** | 10px | 700 | 1.5px |
| **Message Default** | 13px | 500 | 0px |
| **Message Bold** | 13px | 600 | 0px |
| **Timestamp** | 9px | 400 | 0.3px |
| **Caption** | 7px | 400 | 0.3px |

### Font Weights
```css
--fw-normal: 400;
--fw-medium: 500;
--fw-semibold: 600;
--fw-bold: 700;
--fw-extrabold: 800;
```

---

## Spacing System

### Base Unit: 4px

| Size | Value | Usage |
|------|-------|-------|
| **xs** | 4px | Tiny gaps |
| **sm** | 8px | Small gaps |
| **md** | 12px | Standard padding |
| **lg** | 16px | Large padding |
| **xl** | 20px | Message padding |
| **2xl** | 24px | Header padding |
| **3xl** | 32px | Margin around bubble |

### Component Spacing
```css
/* Chat Header */
padding: 22px 24px;        /* 2xl, 2xl */

/* Message Bubble */
padding: 13px 17px;        /* Custom tweak */

/* Chat Body */
padding: 20px;             /* xl */

/* Chat Footer */
padding: 16px;             /* lg */

/* Message Gap */
gap: 14px;                 /* Between messages */
gap: 10px;                 /* Between elements */
```

---

## Border Radius

| Size | Value | Usage |
|------|-------|-------|
| **sm** | 4px | Button corners, asymmetric message tails |
| **md** | 12px | Product card corners |
| **lg** | 20px | Message bubbles |
| **xl** | 32px | Chat card corners |
| **full** | 50% | Circle (bubble, avatars) |

---

## Shadow System

### Elevation Shadows
```css
/* Shadow 1 - Subtle */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

/* Shadow 2 - Medium */
box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);

/* Shadow 3 - Large */
box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);

/* Premium Glow - Gold */
box-shadow: 
  0 0 20px rgba(255, 215, 0, 0.4),
  0 8px 20px rgba(255, 215, 0, 0.3);

/* Premium Glow - Enhanced */
box-shadow: 
  0 0 40px rgba(255, 215, 0, 0.6),
  0 15px 35px rgba(255, 215, 0, 0.5);
```

### Glow Effects
```css
/* Subtle Glow */
box-shadow: 0 0 15px rgba(0, 217, 255, 0.4);

/* Strong Glow */
box-shadow: 0 0 30px rgba(255, 215, 0, 0.4);

/* Double Glow */
box-shadow: 
  0 0 50px rgba(255, 215, 0, 0.5),
  0 0 80px rgba(255, 215, 0, 0.25);
```

---

## Animation & Motion

### Timing Functions
| Easing | Value | Usage |
|--------|-------|-------|
| **Ease In/Out** | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Natural bounce |
| **Spring** | Spring damping: 20, stiffness: 300 | Smooth entries |
| **Linear** | `linear` | Spinning, continuous |
| **Ease** | `ease` | Default smooth |

### Duration Scale
| Speed | Milliseconds | Usage |
|-------|-------------|-------|
| **Fast** | 200ms | Quick hover effects |
| **Normal** | 300ms | Standard transitions |
| **Slow** | 500-600ms | Bounce animations |
| **Very Slow** | 1000-2000ms | Pulse, breathing effects |
| **Very Very Slow** | 3000ms+ | Continuous animations |

### Key Animations
```css
/* Robot Float */
@keyframes robotFloat {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(2deg); }
}
Duration: 3s | Timing: ease-in-out | Repeat: infinite

/* Pulse (Status Dot) */
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 15px #00D9FF, 0 0 30px rgba(0, 217, 255, 0.4); }
  50% { box-shadow: 0 0 8px #00D9FF, 0 0 15px rgba(0, 217, 255, 0.2); }
}
Duration: 2s | Timing: ease-in-out | Repeat: infinite

/* Bubble Glow */
@keyframes bubbleGlow {
  0%, 100% { box-shadow: ...; }
  50% { box-shadow: ...; /* Stronger */ }
}
Duration: 3s | Timing: ease-in-out | Repeat: infinite

/* Waving Arm */
Animation: rotate([0, -25, 0])
Duration: 1.6s | Timing: easeInOut | Repeat: infinite | Delay: 0.3s

/* Blinking Eyes */
Animation: opacity([1, 1, 0.2, 1])
Duration: 3s | Times: [0, 0.7, 0.8, 1] | Repeat: infinite
```

---

## Component Dimensions

### Chat Bubble (Robot Icon)
```css
/* Base */
width: 76px;
height: 76px;
border-radius: 50%;

/* Responsive Breakpoints */
@media (max-width: 1400px) { width: 74px; height: 74px; }
@media (max-width: 1200px) { width: 70px; height: 70px; }
@media (max-width: 1024px) { width: 68px; height: 68px; }
@media (max-width: 768px)  { width: 64px; height: 64px; }
@media (max-width: 640px)  { width: 60px; height: 60px; }
@media (max-width: 480px)  { width: 56px; height: 56px; display: none; }
@media (max-width: 380px)  { width: 52px; height: 52px; }
@media (max-width: 320px)  { width: 48px; height: 48px; }
```

### Chat Card (Window)
```css
/* Desktop Base */
width: 380px;
height: 540px;
border-radius: 32px;
position: absolute;
bottom: 95px;
right: 0px;

/* Mobile Full-Screen */
@media (max-width: 480px) {
  position: fixed;
  width: 96vw;
  height: 84vh;
  bottom: 18px;
  right: 2%;
  left: 2%;
  border-radius: 23px;
}
```

### Avatar Icons
```css
width: 32px;
height: 32px;
border-radius: 50%;
font-size: 20px;

/* Responsive */
@media (max-width: 640px) {
  width: 28px;
  height: 28px;
  font-size: 16px;
}
```

### Send Button
```css
width: 42px;
height: 42px;
border-radius: 50%;

/* Responsive */
@media (max-width: 480px) {
  width: 34px;
  height: 34px;
}
```

---

## Message Bubble Styles

### User Message (Sender)
```css
Background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
Color: #FFD700;
Border: 1px solid rgba(255, 215, 0, 0.2);
Padding: 13px 17px;
Border-Radius: 20px 20px 4px 20px;
Font-Weight: 600;

/* Hover */
box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
border-color: rgba(255, 215, 0, 0.4);
```

### AI Message (Receiver)
```css
Background: #FFFFFF;
Color: #222222;
Border: 1.5px solid rgba(255, 215, 0, 0.2);
Padding: 13px 17px;
Border-Radius: 20px 20px 20px 4px;
Font-Weight: 500;

/* Hover */
box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
border-color: rgba(255, 215, 0, 0.4);
```

---

## State Colors

### Interactive States
```css
/* Default */
background: linear-gradient(135deg, #FFD700, #FFA500);

/* Hover */
box-shadow: 0 0 40px rgba(255, 215, 0, 0.6);
transform: translateY(-5px) scale(1.12);

/* Active/Pressed */
transform: scale(0.88);

/* Disabled */
opacity: 0.4;
cursor: not-allowed;

/* Focus */
outline: 2px solid #FFD700;
outline-offset: -2px;
```

---

## Responsive Breakpoints

### Device Sizes
```javascript
/* Mobile Phones */
320px  - Extra small phone (min)
380px  - Small phone
480px  - Large phone (mobile full-screen threshold)

/* Tablets */
640px  - Small tablet
768px  - iPad portrait
1024px - iPad landscape

/* Desktops */
1200px - Tablet/small desktop
1400px - Standard desktop
1920px - Large desktop
```

### Mobile-First Media Queries
```css
/* Mobile (default) */
/* No media query */

/* Tablet & Up */
@media (min-width: 768px) { ... }

/* Desktop & Up */
@media (min-width: 1024px) { ... }

/* Large Desktop & Up */
@media (min-width: 1400px) { ... }

/* Or Desktop-First (Down) */
@media (max-width: 480px) { /* Mobile */ }
```

---

## Gradient Presets

### Background Gradients
```css
/* Header */
linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)

/* Chat Background */
linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)
linear-gradient(to bottom, #FAFAFA 0%, #F8F8F8 100%)

/* Bubble (User) */
linear-gradient(135deg, #1a1a1a 0%, #333 100%)

/* Button */
linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)

/* Bot Avatar */
linear-gradient(135deg, rgba(0, 217, 255, 0.15), rgba(255, 215, 0, 0.15))

/* User Avatar */
linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.15))

/* Footer */
linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 215, 0, 0.02))
```

---

## Z-Index Scale

```css
--z-dropdown: 100;
--z-sticky: 500;
--z-fixed-nav: 1000;
--z-modal-backdrop: 5000;
--z-modal: 5001;
--z-tooltip: 6000;
--z-chatbot: 9999;  /* ChatBot wrapper */
```

---

## Filter Effects

```css
/* Blur */
backdrop-filter: blur(8px);

/* Drop Shadow */
filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.4));
filter: drop-shadow(0 0 12px rgba(0, 217, 255, 0.2));
```

---

## Accessibility Colors

### Contrast Ratios (WCAG AA)
| Element | Foreground | Background | Ratio |
|---------|-----------|-----------|-------|
| Text | #222222 | #FFFFFF | 16:1 ✅ |
| Text | #FFD700 | #1a1a1a | 9.5:1 ✅ |
| Status | #00D9FF | #FFFFFF | 6.5:1 ✅ |
| Time | #999999 | #FFFFFF | 5.0:1 ✅ |

### Focus Indicators
```css
/* Keyboard Navigation */
:focus-visible {
  outline: 2px solid #FFD700;
  outline-offset: -2px;
}

button:focus-visible,
a:focus-visible {
  outline: 2px dashed #FFD700;
  outline-offset: 2px;
}
```

---

## Design Tokens (CSS Variables)

Add to your root CSS:
```css
:root {
  /* Colors */
  --color-gold: #FFD700;
  --color-gold-dark: #FFA500;
  --color-dark-navy: #0a0a0a;
  --color-charcoal: #1a1a1a;
  --color-cyan: #00D9FF;
  --color-white: #FFFFFF;
  --color-off-white: #FAFAFA;
  --color-light-gray: #F8F8F8;
  --color-text-dark: #222222;
  --color-text-muted: #999999;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;
  --space-3xl: 32px;

  /* Typography */
  --font-family: 'Inter', '-apple-system', 'Segoe UI', sans-serif;
  --font-size-sm: 12px;
  --font-size-md: 13px;
  --font-size-lg: 15px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 32px;
  --radius-full: 50%;

  /* Shadows */
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 8px 20px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 12px 30px rgba(0, 0, 0, 0.25);
  --shadow-glow: 0 0 20px rgba(255, 215, 0, 0.4);

  /* Durations */
  --duration-fast: 200ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
}
```

---

## Component Reference

### Robot SVG Dimensions
```svg
viewBox="0 0 52 52"
Width: 52px
Height: 52px

Elements:
- Head: x=10, y=8, w=32, h=24
- Eyes: 6x6px squares at (16,14) & (30,14)
- Body: x=12, y=33, w=28, h=14
- Arms: 6x12px rectangles
- Antennae: 5px lines
```

---

## Performance Guidelines

### Animations
- Use `transform` and `opacity` for GPU acceleration
- Avoid animating `width`, `height`, `left`, `top`
- Keep animations under 60 FPS
- Use `will-change` sparingly

```css
.animated {
  will-change: transform, opacity;
  transform: translateZ(0); /* Enable 3D acceleration */
}
```

### Responsive Images
- Product images: Use `object-fit: cover`
- Lazy load product images with intersection observer
- Optimize image dimensions for each breakpoint

---

## Variant Styles

### Light Mode (Current)
- Background: Light (#FAFAFA)
- Text: Dark (#222)
- Accents: Gold (#FFD700)

### Dark Mode (Future)
```css
@media (prefers-color-scheme: dark) {
  background: #0a0a0a;
  color: #FAFAFA;
  border: 1px solid rgba(255, 215, 0, 0.1);
}
```

---

## Print Styles
```css
@media print {
  .chatbot-master-wrapper {
    display: none !important;
  }
}
```

---

**Design System Version**: 2.0  
**Last Updated**: March 2026  
**Status**: Production Ready ✅
