# 🎨 Global Toast Notification System - Eshopper Boutique Luxe

A premium, reusable toast notification system with luxury Gold/Black theme matching the Eshopper brand.

## ✨ Features

- 🎯 **Global Availability** - Works across all pages
- 🎨 **Luxury Theme** - Gold (#d4af37) and Black (#0f0f0f) design
- 📱 **Fully Responsive** - Mobile, tablet, desktop optimized
- ⚡ **Auto-dismiss** - Configurable duration (default: 3.5s)
- 🎬 **Smooth Animations** - Slide-in, slide-out, shimmer effects
- 🔔 **4 Types** - Success, Error, Warning, Info
- 🎯 **Accessible** - ARIA labels and keyboard support

## 🚀 Usage

### Import the hook in any component:

```javascript
import { useToast } from './ToastNotification';

function MyComponent() {
  const toast = useToast();

  // Show different notification types
  const handleSuccess = () => {
    toast.success('Order placed successfully!');
  };

  const handleError = () => {
    toast.error('Payment failed. Please try again.');
  };

  const handleWarning = () => {
    toast.warning('Your session will expire in 5 minutes');
  };

  const handleInfo = () => {
    toast.info('Premium member benefits unlocked! 💎');
  };

  // Custom duration (in milliseconds)
  const handleCustom = () => {
    toast.success('Wishlist updated!', 2000); // 2 seconds
  };

  return (
    <button onClick={handleSuccess}>
      Show Success Toast
    </button>
  );
}
```

## 📚 API Reference

### `useToast()` Hook

Returns an object with the following methods:

#### `success(message, duration?)`
- **message**: String to display
- **duration**: Optional, milliseconds (default: 3500)
- Shows green checkmark ✅

#### `error(message, duration?)`
- **message**: String to display
- **duration**: Optional, milliseconds (default: 3500)
- Shows red X ❌

#### `warning(message, duration?)`
- **message**: String to display
- **duration**: Optional, milliseconds (default: 3500)
- Shows warning symbol ⚠️

#### `info(message, duration?)`
- **message**: String to display
- **duration**: Optional, milliseconds (default: 3500)
- Shows diamond 💎

#### `showToast(message, type, duration?)`
- **message**: String to display
- **type**: 'success' | 'error' | 'warning' | 'info'
- **duration**: Optional, milliseconds (default: 3500)
- Generic method for custom types

#### `removeToast(id)`
- **id**: Toast ID to remove
- Manually removes a specific toast

## 🎨 Styling

The toast system uses these CSS classes (customizable in `ToastNotification.css`):

- `.toast-container-luxury` - Container wrapper
- `.toast-luxury` - Individual toast
- `.toast-success` - Success variant
- `.toast-error` - Error variant
- `.toast-warning` - Warning variant
- `.toast-info` - Info variant

## 📱 Responsive Breakpoints

- **Desktop**: > 768px (top-right corner)
- **Tablet**: ≤ 768px (adjusted padding)
- **Mobile**: ≤ 480px (full-width, compact design)

## 🎬 Animations

- **Slide In**: Cubic bezier spring effect
- **Slide Out**: Smooth exit
- **Shimmer**: Background shine effect
- **Icon Pulse**: Subtle icon animation
- **Hover**: Shadow expansion

## 🔧 Integration Status

- ✅ Integrated into App.jsx (Global Provider)
- ✅ Available in all components via `useToast()` hook
- ✅ Works with existing Socket.io notifications
- ✅ Compatible with Datadog RUM tracking
- ✅ Mobile-optimized for all devices

## 💡 Example Use Cases

### Cart Actions
```javascript
const addToCart = async () => {
  try {
    await API.post('/cart', item);
    toast.success('Added to cart! 🛒');
  } catch (error) {
    toast.error('Failed to add to cart');
  }
};
```

### Form Validation
```javascript
const handleSubmit = (e) => {
  e.preventDefault();
  if (!email) {
    toast.warning('Email is required');
    return;
  }
  // Submit form...
};
```

### Real-time Updates
```javascript
useEffect(() => {
  socket.on('orderUpdate', (data) => {
    toast.info(`Order ${data.orderId} is now ${data.status}`);
  });
}, []);
```

### Admin Actions
```javascript
const deleteProduct = async (id) => {
  if (window.confirm('Delete this product?')) {
    await API.delete(`/product/${id}`);
    toast.success('Product deleted successfully');
  }
};
```

## 🎯 Best Practices

1. **Keep messages concise** (under 60 characters)
2. **Use appropriate types** (success for confirmations, error for failures)
3. **Avoid spam** (don't trigger multiple toasts rapidly)
4. **Test on mobile** (ensure readability on small screens)
5. **Consider duration** (2s for simple, 5s for important)

## 🔗 Backend Integration

Works seamlessly with:
- ✅ Socket.io real-time events
- ✅ REST API responses
- ✅ Firebase authentication events
- ✅ Brevo email confirmations
- ✅ WhatsApp notification callbacks
- ✅ Order status updates

---

**Built with ❤️ for Eshopper Boutique Luxe**
