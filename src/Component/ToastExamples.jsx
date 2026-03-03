// 🎨 Toast Notification Usage Examples - Eshopper Boutique Luxe

import React from 'react';
import { useToast } from './ToastNotification';

// ============================================
// EXAMPLE 1: Cart Operations
// ============================================
function CartExample() {
  const toast = useToast();

  const addToCart = async (product) => {
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        body: JSON.stringify(product)
      });
      
      if (response.ok) {
        toast.success(`${product.name} added to cart! 🛒`);
      } else {
        toast.error('Failed to add to cart');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const removeFromCart = (productName) => {
    toast.warning(`${productName} removed from cart`);
  };

  return (
    <button onClick={() => addToCart({ name: 'Premium Shirt' })}>
      Add to Cart
    </button>
  );
}

// ============================================
// EXAMPLE 2: Wishlist Actions
// ============================================
function WishlistExample() {
  const toast = useToast();

  const toggleWishlist = (isInWishlist, productName) => {
    if (isInWishlist) {
      toast.info(`${productName} removed from wishlist`);
    } else {
      toast.success(`${productName} added to wishlist! ❤️`);
    }
  };

  return (
    <button onClick={() => toggleWishlist(false, 'Designer Jacket')}>
      Toggle Wishlist
    </button>
  );
}

// ============================================
// EXAMPLE 3: Form Validation
// ============================================
function FormExample() {
  const toast = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    // Validation
    if (!email) {
      toast.warning('Email is required');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // Success
    toast.success('Login successful! Welcome back! 💎');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" />
      <input name="password" type="password" />
      <button type="submit">Login</button>
    </form>
  );
}

// ============================================
// EXAMPLE 4: API Error Handling
// ============================================
function APIExample() {
  const toast = useToast();

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      
      if (response.status === 404) {
        toast.warning('No products found');
      } else if (response.status === 500) {
        toast.error('Server error. Please try again later.');
      } else if (!response.ok) {
        toast.error(`Error: ${response.statusText}`);
      } else {
        const data = await response.json();
        toast.success(`Loaded ${data.length} products`);
      }
    } catch (error) {
      toast.error('Network error. Check your connection.');
    }
  };

  return <button onClick={fetchProducts}>Load Products</button>;
}

// ============================================
// EXAMPLE 5: Socket.io Real-time Updates
// ============================================
function SocketExample() {
  const toast = useToast();

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL);

    socket.on('orderStatusUpdate', (data) => {
      if (data.status === 'Shipped') {
        toast.info(`Order ${data.orderId} has been shipped! 🚚`);
      } else if (data.status === 'Delivered') {
        toast.success(`Order ${data.orderId} delivered! 🎉`);
      } else {
        toast.info(`Order ${data.orderId} is now ${data.status}`);
      }
    });

    socket.on('lowStock', (product) => {
      toast.warning(`Only ${product.stock} left for ${product.name}`);
    });

    return () => socket.disconnect();
  }, [toast]);

  return <div>Listening for updates...</div>;
}

// ============================================
// EXAMPLE 6: Admin Operations
// ============================================
function AdminExample() {
  const toast = useToast();

  const deleteProduct = async (id, name) => {
    if (window.confirm(`Delete ${name}?`)) {
      try {
        await fetch(`/api/admin/product/${id}`, { method: 'DELETE' });
        toast.success(`${name} deleted successfully`);
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  const updateOrder = async (orderId, status) => {
    try {
      await fetch(`/api/admin/order/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      toast.success(`Order ${orderId} updated to ${status}`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  return (
    <>
      <button onClick={() => deleteProduct(123, 'Premium Shirt')}>
        Delete Product
      </button>
      <button onClick={() => updateOrder('ESHP-2026-0001', 'Shipped')}>
        Update Order
      </button>
    </>
  );
}

// ============================================
// EXAMPLE 7: Custom Duration
// ============================================
function CustomDurationExample() {
  const toast = useToast();

  const quickNotification = () => {
    // Short duration (1 second)
    toast.success('Quick success!', 1000);
  };

  const longNotification = () => {
    // Long duration (10 seconds)
    toast.info('Important information - read carefully', 10000);
  };

  const standardNotification = () => {
    // Default duration (3.5 seconds)
    toast.success('Standard notification');
  };

  return (
    <>
      <button onClick={quickNotification}>Quick (1s)</button>
      <button onClick={standardNotification}>Standard (3.5s)</button>
      <button onClick={longNotification}>Long (10s)</button>
    </>
  );
}

// ============================================
// EXAMPLE 8: Multiple Sequential Toasts
// ============================================
function SequentialExample() {
  const toast = useToast();

  const processOrder = async () => {
    toast.info('Processing your order...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.info('Validating payment...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.info('Sending confirmation email...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Order placed successfully! 🎉');
  };

  return (
    <button onClick={processOrder}>
      Place Order (with steps)
    </button>
  );
}

// ============================================
// EXAMPLE 9: Conditional Notifications
// ============================================
function ConditionalExample() {
  const toast = useToast();

  const checkout = (cartTotal, userBalance) => {
    if (cartTotal === 0) {
      toast.warning('Your cart is empty');
      return;
    }

    if (userBalance < cartTotal) {
      toast.error('Insufficient balance. Please add funds.');
      return;
    }

    if (cartTotal > 10000) {
      toast.success('Premium order! Free shipping included 💎');
    } else {
      toast.success('Order placed successfully!');
    }
  };

  return (
    <button onClick={() => checkout(15000, 20000)}>
      Proceed to Checkout
    </button>
  );
}

// ============================================
// EXAMPLE 10: Newsletter Subscription
// ============================================
function NewsletterExample() {
  const toast = useToast();

  const subscribe = async (email) => {
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.status === 409) {
        toast.warning('You are already subscribed!');
      } else if (response.ok) {
        toast.success('Welcome to Eshopper Boutique! Check your email 📧');
      } else {
        toast.error('Subscription failed. Try again.');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      subscribe(e.target.email.value);
    }}>
      <input name="email" type="email" placeholder="Your email" />
      <button type="submit">Subscribe</button>
    </form>
  );
}

export {
  CartExample,
  WishlistExample,
  FormExample,
  APIExample,
  SocketExample,
  AdminExample,
  CustomDurationExample,
  SequentialExample,
  ConditionalExample,
  NewsletterExample
};
