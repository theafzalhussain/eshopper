import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { optimizeCloudinaryUrlAdvanced } from '../../utils/cloudinaryHelper';
import LazyImage from '../LazyImage';

const SkeletonCard = memo(() => (
    <div className="mp-card mp-skel-card">
        <div className="mp-img-wrap mp-shimmer" />
        <div className="mp-cbody">
            <div className="mp-shimmer mp-skel-line" style={{ width: '40%' }} />
            <div className="mp-shimmer mp-skel-line" style={{ width: '85%', height: 14 }} />
            <div className="mp-shimmer mp-skel-line" style={{ width: '55%' }} />
            <div className="mp-shimmer mp-skel-line" style={{ width: '70%', height: 18, marginTop: 8 }} />
        </div>
    </div>
));

export default function VirtualProductGrid({
    items = [],
    renderItem,
    className = '',
    itemMinWidth = 300,
    gap = 24
}) {
    const safeItems = Array.isArray(items) ? items : [];
    const safeRenderItem = typeof renderItem === 'function' ? renderItem : null;

    return (
        <div
            className={className}
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${itemMinWidth}px, 1fr))`,
                gap,
                alignItems: 'start'
            }}
        >
            {safeItems.map((item, index) => {
                if (!item) return null;

                if (item.__skeleton) {
                    return (
                        <div key={item.id || `skeleton-${index}`}>
                            <SkeletonCard />
                        </div>
                    );
                }

                if (!safeRenderItem) return null;

                return (
                    <div key={item.id || index}>
                        {safeRenderItem(item, index)}
                    </div>
                );
            })}
        </div>
    );
}

export const renderProductCard = ({
    item,
    index,
    stats,
    hoverIndex,
    setHoverIndex,
    calcDiscount,
    isInWishlist,
    toggleWishlist,
    pushRecentlyViewed,
    cartNotifications,
    setQuickView,
    selectedSizes,
    setSelectedSizes,
    addToCart
}) => {
    const productId = item.id || item._id;
    if (!productId) return null;

    const ratingValue = stats ? stats.average : (item.rating || 0);
    const reviewCount = stats ? stats.count : 0;
    const discount = calcDiscount(item);
    const isBestseller = (stats && (stats.count >= 5 || stats.average >= 4.2)) || item.isBestseller;
    const altImg = (item.pic2 && String(item.pic2).trim()) || (item.pic3 && String(item.pic3).trim()) || (item.pic4 && String(item.pic4).trim()) || null;
    const showAlt = !!altImg && hoverIndex && hoverIndex[productId] === 1;
    const mainImg = showAlt ? altImg : (item.pic1 && String(item.pic1).trim() ? item.pic1 : altImg);
    const priority = index < 4;

    return (
        <motion.div
            key={productId}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.025, 0.18) }}
            className="mp-card"
            onMouseEnter={() => altImg && setHoverIndex((h) => ({ ...h, [productId]: 1 }))}
            onMouseLeave={() => setHoverIndex((h) => ({ ...h, [productId]: 0 }))}
        >
            <button
                type="button"
                className={`mp-wish ${isInWishlist(productId) ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(item); }}
                aria-label={isInWishlist(productId) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                title={isInWishlist(productId) ? 'Wishlisted' : 'Wishlist'}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill={isInWishlist(productId) ? '#e11d48' : 'none'} stroke={isInWishlist(productId) ? '#e11d48' : '#282c3f'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
            </button>

            <button
                type="button"
                className="mp-qview"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickView(item); pushRecentlyViewed(item); }}
                aria-label="Quick view"
                title="Quick view"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            </button>

            <Link to={`/single-product/${productId}`} className="mp-img-wrap" onClick={() => pushRecentlyViewed(item)}>
                <LazyImage
                    src={mainImg || '/assets/images/noimage.png'}
                    loading={priority ? 'eager' : 'lazy'}
                    fetchpriority={priority ? 'high' : 'auto'}
                    className="mp-img"
                    alt={item.name}
                    maxWidth={600}
                />
                {discount > 0 && <div className="mp-ribbon">✦ {discount}% OFF</div>}
                <div className="mp-badges">
                    {item.newArrival && <span className="mp-badge mp-badge-new">NEW</span>}
                    {item.isSale && <span className="mp-badge mp-badge-sale">SALE</span>}
                    {!item.isSale && isBestseller && <span className="mp-badge mp-badge-best">BESTSELLER</span>}
                    {!item.newArrival && !item.isSale && !isBestseller && discount >= 30 && <span className="mp-badge mp-badge-deal">HOT DEAL</span>}
                </div>
                <div className="mp-hover-bar">
                    <span className="mp-hover-text">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                        ADD TO BAG
                    </span>
                </div>
            </Link>

            <div className="mp-cbody">
                <h3 className="mp-cbrand">{item.brand}</h3>
                <h4 className="mp-cname"><Link to={`/single-product/${productId}`} className="mp-cnlink">{item.name}</Link></h4>
                <p className="mp-ccat">{item.maincategory} &bull; {item.subcategory}</p>

                <div className="mp-rating-row">
                    {reviewCount > 0 ? (
                        <>
                            <div className="mp-rpill">
                                {ratingValue.toFixed(1)} <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            </div>
                            <span className="mp-rcount">| {reviewCount}</span>
                        </>
                    ) : (
                        <div className="mp-rpill mp-rpill-new">NEW</div>
                    )}
                </div>

                <div className="mp-price-row">
                    <span className="mp-price">₹{item.finalprice}</span>
                    {discount > 0 && <span className="mp-orig">₹{item.baseprice || item.price}</span>}
                    {discount > 0 && <span className="mp-discount">({discount}% OFF)</span>}
                </div>

                <div className="mp-perks">
                    <span className="mp-perk">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> Free Delivery
                    </span>
                    {discount >= 30 && (
                        <span className="mp-perk mp-perk-hot">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 1.5-2"/></svg> Hot Deal
                        </span>
                    )}
                </div>

                <div className="mp-actions">
                    {item.size && item.size.length > 0 && (
                        <div className="mp-size-strip">
                            <span className="mp-size-label">Select Size</span>
                            <div className="mp-sbtns">
                                {item.size.map((sz) => (
                                    <button
                                        key={sz}
                                        type="button"
                                        className={`mp-sbtn ${selectedSizes && selectedSizes[productId] === sz ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (setSelectedSizes) setSelectedSizes({ ...selectedSizes, [productId]: sz });
                                        }}
                                    >
                                        {sz}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <button
                        type="button"
                        className={`mp-addbtn ${cartNotifications && cartNotifications[productId] ? 'pending' : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (addToCart) addToCart(item, selectedSizes ? selectedSizes[productId] : null);
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                        {cartNotifications && cartNotifications[productId] ? 'Add More' : 'Add to Bag'}
                    </button>
                </div>
            </div>

            {cartNotifications && cartNotifications[productId] && (
                <motion.div className="mp-cbadge" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 22 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Added · {cartNotifications[productId]}×
                </motion.div>
            )}
            {reviewCount > 0 && <span style={{ display: 'none' }}>{ratingValue}</span>}
        </motion.div>
    );
};