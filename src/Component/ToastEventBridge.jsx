import React, { useEffect } from 'react'
import { useToast } from './ToastNotification'

export default function ToastEventBridge() {
  const toast = useToast();

  useEffect(() => {
    const onCartConfirmed = (e) => {
      try {
        const msg = e?.detail?.message || 'Added to bag';
        toast.success(msg);
      } catch (err) {}
    };
    const onCartError = (e) => {
      try {
        const msg = e?.detail?.message || 'Failed to add to cart.';
        toast.error(msg);
      } catch (err) {}
    };

    const onWishlistConfirmed = (e) => {
      try {
        const msg = e?.detail?.message || 'Added to wishlist';
        toast.success(msg);
      } catch (err) {}
    };
    const onWishlistError = (e) => {
      try {
        const msg = e?.detail?.message || 'Failed to update wishlist.';
        toast.error(msg);
      } catch (err) {}
    };

    window.addEventListener('eshopper:cart:confirmed', onCartConfirmed);
    window.addEventListener('eshopper:cart:error', onCartError);
    window.addEventListener('eshopper:wishlist:confirmed', onWishlistConfirmed);
    window.addEventListener('eshopper:wishlist:error', onWishlistError);

    return () => {
      window.removeEventListener('eshopper:cart:confirmed', onCartConfirmed);
      window.removeEventListener('eshopper:cart:error', onCartError);
      window.removeEventListener('eshopper:wishlist:confirmed', onWishlistConfirmed);
      window.removeEventListener('eshopper:wishlist:error', onWishlistError);
    };
  }, [toast]);

  return null;
}
