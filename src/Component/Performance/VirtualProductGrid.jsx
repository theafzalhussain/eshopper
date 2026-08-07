import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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

/* ══════════════════════════════════════════════════════════
   PROGRESSIVE GRID
   The old version rendered every product at once (despite the
   name) which meant 100+ heavy cards in the DOM, each with a
   framer-motion `layout` animation. That measure pass on every
   state change is what made filtering and scrolling stutter.

   Now we render a first batch immediately and append more as the
   customer approaches the end of the list. The DOM stays small,
   scrolling stays at 60fps, and nothing is lost — the full list
   still renders as you scroll.
══════════════════════════════════════════════════════════ */
const FIRST_BATCH = 12;
const BATCH_STEP = 12;

export default function VirtualProductGrid({
    items = [],
    renderItem,
    className = '',
    itemMinWidth = 300,
    gap = 24
}) {
    const safeItems = Array.isArray(items) ? items : [];
    const safeRenderItem = typeof renderItem === 'function' ? renderItem : null;

    const [visibleCount, setVisibleCount] = useState(FIRST_BATCH);
    const sentinelRef = useRef(null);

    /* reset the window whenever the result set changes (filter, sort, search) */
    useEffect(() => {
        setVisibleCount(FIRST_BATCH);
    }, [safeItems.length]);

    const showMore = useCallback(() => {
        setVisibleCount((c) => (c >= safeItems.length ? c : c + BATCH_STEP));
    }, [safeItems.length]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;
        if (visibleCount >= safeItems.length) return;

        if (!('IntersectionObserver' in window)) { setVisibleCount(safeItems.length); return; }

        const obs = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) showMore();
        }, { rootMargin: '800px 0px' });

        obs.observe(node);
        return () => obs.disconnect();
    }, [visibleCount, safeItems.length, showMore]);

    const shown = safeItems.slice(0, visibleCount);
    const remaining = safeItems.length - shown.length;

    return (
        <>
            <div
                className={className}
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(auto-fill, minmax(${itemMinWidth}px, 1fr))`,
                    gap,
                    alignItems: 'start',
                    /* isolate the grid so card paints never invalidate the page */
                    contain: 'layout paint style'
                }}
            >
                {shown.map((item, index) => {
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
                        <div key={item.id || item._id || index}>
                            {safeRenderItem(item, index)}
                        </div>
                    );
                })}
            </div>

            {remaining > 0 && (
                <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
            )}
        </>
    );
}

/* ══════════════════════════════════════════════════════════
   PRODUCT CARD
   A real memoised component. Previously this was a plain
   function returning JSX, so React re-rendered every card on
   every hover, wishlist toggle and size selection.

   Hover state now lives inside the card, so moving the mouse
   across a grid repaints one card instead of all of them.
══════════════════════════════════════════════════════════ */
const ProductCardInner = ({
    item,
    index,
    stats,
    onHoverChange,
    calcDiscount,
    isWishlisted,
    toggleWishlist,
    pushRecentlyViewed,
    cartCount,
    setQuickView,
    selectedSize,
    setSelectedSizes,
    selectedSizes,
    addToCart
}) => {
    const productId = item.id || item._id;
    const [hovered, setHovered] = useState(false);

    if (!productId) return null;

    const ratingValue = stats ? stats.average : (item.rating || 0);
    const reviewCount = stats ? stats.count : 0;
    const discount = calcDiscount(item);
    const isBestseller = (stats && (stats.count >= 5 || stats.average >= 4.2)) || item.isBestseller;
    const altImg = (item.pic2 && String(item.pic2).trim()) || (item.pic3 && String(item.pic3).trim()) || (item.pic4 && String(item.pic4).trim()) || null;
    const showAlt = !!altImg && hovered;
    const mainImg = showAlt ? altImg : (item.pic1 && String(item.pic1).trim() ? item.pic1 : altImg);
    const priority = index < 4;

    const enter = (v) => {
        if (!altImg) return;
        setHovered(v);
        if (onHoverChange) onHoverChange(productId, v ? 1 : 0);
    };

    return (
        <motion.div
            /* `layout` removed on purpose: measuring every card on every
               render was the single biggest source of scroll jank. */
            initial={index < FIRST_BATCH ? { opacity: 0, y: 18 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.02, 0.14) }}
            className="mp-card"
            onMouseEnter={() => enter(true)}
            onMouseLeave={() => enter(false)}
        >
            <button
                type="button"
                className={`mp-wish ${isWishlisted ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(item); }}
                aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                title={isWishlisted ? 'Wishlisted' : 'Wishlist'}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill={isWishlisted ? '#e11d48' : 'none'} stroke={isWishlisted ? '#e11d48' : '#282c3f'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                    eager={priority}
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
                                        className={`mp-sbtn ${selectedSize === sz ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (setSelectedSizes) setSelectedSizes({ ...(selectedSizes || {}), [productId]: sz });
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
                        className={`mp-addbtn ${cartCount ? 'pending' : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (addToCart) addToCart(item, selectedSize || null);
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                        {cartCount ? 'Add More' : 'Add to Bag'}
                    </button>
                </div>
            </div>

            {cartCount ? (
                <motion.div className="mp-cbadge" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 22 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Added · {cartCount}×
                </motion.div>
            ) : null}
        </motion.div>
    );
};

/* Only re-render a card when something it actually displays changed.
   Callback identity is deliberately ignored — Shop recreates those on
   every render and comparing them would defeat the memo entirely. */
const areEqual = (a, b) => (
    (a.item?.id || a.item?._id) === (b.item?.id || b.item?._id)
    && a.item === b.item
    && a.index === b.index
    && a.isWishlisted === b.isWishlisted
    && a.cartCount === b.cartCount
    && a.selectedSize === b.selectedSize
    && a.stats?.average === b.stats?.average
    && a.stats?.count === b.stats?.count
);

export const ProductCard = memo(ProductCardInner, areEqual);

/* Backwards-compatible wrapper so existing call sites keep working */
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
    const productId = item?.id || item?._id;
    if (!productId) return null;

    return (
        <ProductCard
            item={item}
            index={index}
            stats={stats}
            calcDiscount={calcDiscount}
            isWishlisted={typeof isInWishlist === 'function' ? Boolean(isInWishlist(productId)) : false}
            toggleWishlist={toggleWishlist}
            pushRecentlyViewed={pushRecentlyViewed}
            cartCount={cartNotifications ? cartNotifications[productId] : 0}
            setQuickView={setQuickView}
            selectedSize={selectedSizes ? selectedSizes[productId] : undefined}
            selectedSizes={selectedSizes}
            setSelectedSizes={setSelectedSizes}
            addToCart={addToCart}
            onHoverChange={setHoverIndex ? (id, v) => setHoverIndex((h) => ({ ...h, [id]: v })) : undefined}
        />
    );
};
