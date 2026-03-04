# Cart Animation Updates

## Mobile Cart Icon Section (Line 254-305)

Replace the mobile cart section with this:

```jsx
{/* --- MOBILE MENU TOGGLE (Visible on Mobile Only) --- */}
<div className="mobile-menu-toggle d-lg-none d-flex align-items-center">
    <Link to="/cart" className="text-dark mr-3 position-relative" title="Shopping Cart">
        <motion.div
            animate={{ 
                scale: cartAnimation ? [1, 1.2, 0.95, 1.05, 1] : 1,
                rotate: cartAnimation ? [0, -10, 10, -10, 0] : 0
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{
                scale: { duration: 0.6, ease: "easeInOut" },
                rotate: { duration: 0.5, ease: "easeInOut" }
            }}
        >
            <ShoppingCart size={20} />
        </motion.div>
        
        {/* Premium Cart Badge - Mobile */}
        <AnimatePresence mode="wait">
            {cartCount > 0 && (
                <motion.div
                    key={`mobile-${cartCount}`}
                    initial={{ scale: 0, y: -10 }}
                    animate={{ 
                        scale: cartAnimation ? [0, 1.4, 0.9, 1.1, 1] : 1,
                        y: 0 
                    }}
                    exit={{ scale: 0, y: -10 }}
                    transition={{ 
                        type: 'spring', 
                        stiffness: 400, 
                        damping: 15,
                        duration: 0.6 
                    }}
                    className={`cart-badge-premium ${cartAnimation ? 'cart-badge-added' : ''}`}
                    style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-10px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '700',
                        boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
                        border: '2px solid #fff',
                        letterSpacing: '0.2px'
                    }}
                >
                    {cartCount > 99 ? '99+' : cartCount}
                </motion.div>
            )}
        </AnimatePresence>
    </Link>
    <button 
        className="hamburger-btn" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle Menu"
    >
        {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
    </button>
</div>
```

## CSS Animation Section (Line 610-640)

Replace the CSS with this:

```jsx
/* 🎁 PREMIUM CART BADGE */
.cart-badge-premium {
    animation: badgePulse 2s ease-in-out infinite;
}

/* 🚀 PREMIUM BADGE ADDED ANIMATION */
.cart-badge-added {
    animation: badgeAdded 0.8s ease-out, badgePulse 2s ease-in-out infinite !important;
}

@keyframes badgePulse {
    0%, 100% {
        box-shadow: 0 4px 16px rgba(16,185,129,0.4), 0 0 0 0 rgba(16,185,129,0.6);
    }
    50% {
        box-shadow: 0 6px 20px rgba(16,185,129,0.6), 0 0 0 10px rgba(16,185,129,0.15);
    }
}

@keyframes badgeAdded {
    0% { 
        transform: scale(0.5) rotate(-15deg);
        box-shadow: 0 0 0 0 rgba(16,185,129,0.8);
    }
    25% {
        transform: scale(1.3) rotate(5deg);
        box-shadow: 0 8px 32px rgba(16,185,129,0.8), 0 0 0 15px rgba(16,185,129,0.3);
    }
    50% {
        transform: scale(0.9) rotate(-3deg);
        box-shadow: 0 6px 24px rgba(16,185,129,0.6), 0 0 0 20px rgba(16,185,129,0.2);
    }
    75% {
        transform: scale(1.08) rotate(2deg);
        box-shadow: 0 5px 20px rgba(16,185,129,0.5), 0 0 0 12px rgba(16,185,129,0.1);
    }
    100% { 
        transform: scale(1) rotate(0deg);
        box-shadow: 0 4px 16px rgba(16,185,129,0.4), 0 0 0 0 rgba(16,185,129,0);
    }
}

@keyframes cartBounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
}
```
