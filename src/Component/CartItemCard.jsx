import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';

const CartItemCard = memo(function CartItemCard({
    item,
    productState,
    isSelected,
    isMoving,
    isSaving,
    isRemoving,
    expectedDelivery,
    cartNotification,
    onToggleSelect,
    onRemoveConfirm,
    onUpdateQty,
    onMoveToWishlist,
    onSaveForLater,
    onToggleGiftWrap,
}) {
    const itemId = item._id || item.id;
    const prodId = item.productid || item.product?._id || item.productId || itemId;
    const fullProduct = productState.find(p => String(p.id || p._id) === String(prodId)) || {};
    const itemName = item.name || item.product?.name || fullProduct.name || 'Product';
    const itemBrand = item.brand || item.product?.brand || fullProduct.brand || 'Brand';
    const itemColor = item.color || item.product?.color || fullProduct.color || '';
    let itemSize = item.size || item.product?.size || fullProduct.size || 'N/A';
    if (Array.isArray(itemSize)) itemSize = itemSize[0] || 'N/A';
    const itemPic = item.pic || item.product?.pic1 || fullProduct.pic1 || '/assets/images/noimage.png';
    const itemQty = Number(item.quantity ?? item.qty ?? 1);
    const itemPrice = Number(item.price ?? item.product?.finalprice ?? item.product?.price ?? fullProduct.finalprice ?? fullProduct.price ?? 0);
    const basePrice = Number(item.product?.baseprice ?? fullProduct.baseprice ?? 0);
    const itemTotal = itemPrice * itemQty;
    const isGiftWrap = item.giftWrap;
    const itemDiscount = basePrice > itemPrice ? Math.round(((basePrice - itemPrice) / basePrice) * 100) : 0;
    const stockHint = (itemId.charCodeAt(0) % 7) + 2;

    return (
        <motion.div
            key={itemId}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 60, scale: 0.96 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className={`lx-item ${isRemoving ? 'removing' : ''} ${isSelected ? 'selected' : ''}`}
        >
            {/* Select checkbox */}
            <label className="lx-item-select" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(itemId)} />
                <span className="lx-cbox" />
            </label>

            {/* Image */}
            <Link to={`/single-product/${item.productid || item.product?._id || ''}`} className="lx-item-img-link">
                <div className="lx-item-img">
                    <img
                        src={optimizeCloudinaryUrlAdvanced(itemPic, { maxWidth: 320, crop: 'fill' })}
                        loading="lazy" decoding="async" alt={itemName}
                    />
                    {itemDiscount > 0 && <div className="mp-ribbon">✦ {itemDiscount}% OFF</div>}
                    {isGiftWrap && (
                        <div className="lx-gift-badge" title="Gift wrap added">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                        </div>
                    )}
                </div>
            </Link>

            {/* Body */}
            <div className="lx-item-body">
                <div className="lx-item-top">
                    <div className="lx-item-info">
                        <h4 className="lx-item-brand">{itemBrand}</h4>
                        <p className="lx-item-name">{itemName}</p>
                        <div className="lx-item-meta">
                            {itemColor && <span className="lx-meta-chip">Color: <strong>{itemColor}</strong></span>}
                            <span className="lx-meta-chip">Size: <strong>{itemSize}</strong></span>
                        </div>
                        <div className="lx-item-signals">
                            <p className="lx-item-eta">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12" /></svg>
                                Delivery by <strong>{expectedDelivery}</strong> · Free
                            </p>
                            {stockHint <= 5 && (
                                <p className="lx-item-stock">
                                    <span className="lx-pulse-dot" />
                                    Hurry, only <strong>{stockHint} left</strong>
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => onRemoveConfirm(itemId)}
                        className="lx-item-x"
                        title="Remove from bag"
                        disabled={isMoving || isSaving || isRemoving}
                        aria-label="Remove"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Bottom row: qty + price */}
                <div className="lx-item-bottom">
                    <div className="lx-qty">
                        <button onClick={() => onUpdateQty(item, "dec")} className="lx-qty-btn" disabled={isMoving || itemQty === 1} aria-label="Decrease">−</button>
                        <span className="lx-qty-num">{itemQty}</span>
                        <button onClick={() => onUpdateQty(item, "inc")} className="lx-qty-btn" disabled={isMoving} aria-label="Increase">+</button>
                    </div>
                    <div className="lx-item-price">
                        <span className="lx-item-final">₹{itemTotal}</span>
                        {basePrice > itemPrice && <del className="lx-item-base">₹{basePrice * itemQty}</del>}
                    </div>
                </div>

                {/* Action row */}
                <div className="lx-item-actions">
                    <button onClick={() => onMoveToWishlist(item)} className="lx-act lx-act-wish" disabled={isMoving || isSaving}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                        {isMoving ? 'Moving…' : 'Wishlist'}
                    </button>
                    <button onClick={() => onSaveForLater(item)} className="lx-act lx-act-save" disabled={isMoving || isSaving}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                        {isSaving ? 'Saving…' : 'Save for Later'}
                    </button>
                    <button onClick={() => onToggleGiftWrap(itemId)} className={`lx-act lx-act-gift ${isGiftWrap ? 'on' : ''}`} title="Add gift wrap">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                        {isGiftWrap ? 'Gift Wrap ✓' : 'Gift Wrap'}
                    </button>

                    {cartNotification && (
                        <motion.span
                            className="lx-cbadge"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                        >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            Added
                        </motion.span>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

export default CartItemCard;
