import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const EXPRESS_DELIVERY_FEE = 49;

const CartOrderSummary = memo(function CartOrderSummary({
    summary,
    itemCount,
    deliverySpeed,
    setDeliverySpeed,
    expectedDelivery,
    insuranceAdded,
    setInsuranceAdded,
    coupon,
    setCoupon,
    couponApplied,
    appliedCouponCode,
    couponError,
    setCouponError,
    availableCoupons,
    couponLoading,
    showCouponPanel,
    setShowCouponPanel,
    handleApplyCoupon,
    debouncedUpdateCartOptions,
    rewardsEarned,
    grandTotal,
}) {
    const { subtotal, shipping, gst } = summary;

    return (
        <aside className="lx-summary-col">
            <div className="lx-summary">
                {/* Delivery speed selector */}
                <div className="lx-delivery-pick">
                    <p className="lx-summary-title">CHOOSE DELIVERY</p>
                    <div className="lx-delivery-row">
                        <button
                            className={`lx-delivery-opt ${deliverySpeed === 'standard' ? 'on' : ''}`}
                            onClick={() => { setDeliverySpeed('standard'); debouncedUpdateCartOptions({ deliverySpeed: 'standard', insuranceAdded }); }}
                        >
                            <span className="lx-do-name">Standard</span>
                            <span className="lx-do-eta">5–6 days</span>
                            <span className="lx-do-fee">FREE</span>
                        </button>
                        <button
                            className={`lx-delivery-opt ${deliverySpeed === 'express' ? 'on' : ''}`}
                            onClick={() => { setDeliverySpeed('express'); debouncedUpdateCartOptions({ deliverySpeed: 'express', insuranceAdded }); }}
                        >
                            <span className="lux-express-badge"><span className="lux-express-icon">⚡</span> EXPRESS</span>
                            <span className="lx-do-name">Next Day</span>
                            <span className="lx-do-eta">By {expectedDelivery}</span>
                            <span className="lx-do-fee">+₹{EXPRESS_DELIVERY_FEE}</span>
                        </button>
                    </div>
                </div>

                {/* Coupon */}
                <div className="lx-coupon">
                    <div className="lx-coupon-head">
                        <span className="lx-coupon-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5a2 2 0 0 1 0 4v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a2 2 0 0 1 0-4z" /><line x1="13" y1="5" x2="13" y2="7" /><line x1="13" y1="11" x2="13" y2="13" /><line x1="13" y1="17" x2="13" y2="19" /></svg>
                        </span>
                        <div style={{ flex: 1 }}>
                            <p className="lx-coupon-title">Apply Coupon</p>
                            {couponApplied && appliedCouponCode ? (
                                <p className="lx-coupon-applied"><strong>{appliedCouponCode}</strong> applied · You saved ₹{summary.couponDiscount}</p>
                            ) : (
                                <p className="lx-coupon-sub">Save more with valid offers</p>
                            )}
                        </div>
                        <button type="button" className="lx-coupon-toggle" onClick={() => setShowCouponPanel(s => !s)}>
                            {showCouponPanel ? 'Hide' : 'View'}
                            <svg className={`lx-chev ${showCouponPanel ? 'open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                    </div>

                    <AnimatePresence initial={false}>
                        {showCouponPanel && (
                            <motion.div className="lx-coupon-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
                                <div className="lx-coupon-input-row">
                                    <input type="text" className="lx-coupon-input" placeholder="Enter coupon code" value={coupon} onChange={e => { setCoupon(e.target.value); setCouponError(''); }} />
                                    <button type="button" className="lx-coupon-apply" onClick={handleApplyCoupon} disabled={!coupon.trim()}>APPLY</button>
                                </div>
                                {couponError && <p className="lx-coupon-err">{couponError}</p>}
                                {couponLoading ? (
                                    <div className="lx-shimmer lx-skel-line" style={{ width: '60%', height: 12, marginTop: 12 }} />
                                ) : availableCoupons.length > 0 && (
                                    <div className="lx-coupon-list">
                                        <p className="lx-coupon-list-title">Available offers</p>
                                        {availableCoupons.map((c) => (
                                            <button key={c.code} type="button" className={`lx-coupon-card ${appliedCouponCode === String(c.code).toUpperCase() ? 'applied' : ''}`} onClick={() => setCoupon(c.code)} title={c.description || c.title || c.code}>
                                                <span className="lx-coupon-tag">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.42l9 9a2 2 0 0 0 2.83 0l7-7a2 2 0 0 0-.01-2.84zM7 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" /></svg>
                                                    {c.code}
                                                </span>
                                                <span className="lx-coupon-desc">{c.description || c.title || 'Tap to apply this coupon'}</span>
                                                {appliedCouponCode === String(c.code).toUpperCase() && (
                                                    <span className="lx-coupon-tick"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Insurance */}
                <label className="lx-insurance">
                    <input type="checkbox" checked={insuranceAdded} onChange={() => { const newVal = !insuranceAdded; setInsuranceAdded(newVal); debouncedUpdateCartOptions({ deliverySpeed, insuranceAdded: newVal }); }} />
                    <span className="lx-cbox" />
                    <span className="lx-insurance-body">
                        <span className="lx-insurance-title">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" /></svg>
                            Add Care+ Protection
                        </span>
                        <span className="lx-insurance-sub">2-year damage & defect cover · ₹49 only</span>
                    </span>
                </label>

                {/* Price details */}
                <div className="lx-price-card">
                    <h3 className="lx-summary-title">PRICE DETAILS <span>({itemCount} item{itemCount !== 1 ? 's' : ''})</span></h3>
                    <div className="lx-prow"><span>Total MRP</span><span>₹{subtotal}</span></div>
                    {summary.baseDiscount > 0 && <div className="lx-prow"><span>Discount on MRP</span><span className="lx-savetxt">−₹{summary.baseDiscount}</span></div>}
                    {couponApplied && summary.couponDiscount > 0 && <div className="lx-prow"><span>Coupon Discount <em>({appliedCouponCode})</em></span><span className="lx-savetxt">−₹{summary.couponDiscount}</span></div>}
                    <div className="lx-prow"><span>Shipping Fee</span><span className={shipping === 0 ? 'lx-free' : ''}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span></div>
                    {summary.expressDeliveryFee > 0 && <div className="lx-prow"><span>Express Delivery</span><span>₹{summary.expressDeliveryFee}</span></div>}
                    {summary.giftWrapCharge > 0 && <div className="lx-prow"><span>Gift Wrap</span><span>₹{summary.giftWrapCharge}</span></div>}
                    {summary.insuranceCharge > 0 && <div className="lx-prow"><span>Care+ Protection</span><span>₹{summary.insuranceCharge}</span></div>}
                    <div className="lx-prow"><span>GST / Tax</span><span>₹{gst}</span></div>
                    <div className="lx-total-row"><span>Total Amount</span><span>₹{grandTotal}</span></div>
                    {summary.totalSavings > 0 && (
                        <div className="lx-saved-banner">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            You will save <strong>₹{summary.totalSavings}</strong> on this order
                        </div>
                    )}
                    {rewardsEarned > 0 && (
                        <div className="lx-rewards">
                            <span className="lx-rewards-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg></span>
                            <span>Earn <strong>{rewardsEarned} points</strong> · ₹{rewardsEarned} off next order</span>
                        </div>
                    )}
                </div>

                {/* Checkout CTA */}
                <Link to="/checkout" className="lx-checkout">
                    <span className="lx-checkout-shine" />
                    <span className="lx-checkout-label">PLACE ORDER · ₹{grandTotal}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </Link>

                {/* Trust mini-bar */}
                <div className="lx-secure">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    Safe and Secure Payments · Easy returns · 100% Authentic products
                </div>

                {/* Payment methods */}
                <div className="lx-paymeths">
                    <span className="lx-paymeth pm-visa" title="Visa"><svg width="28" height="12" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#fff" /><text x="20" y="12" textAnchor="middle" fontWeight="bold" fontSize="10" fill="#1a1f71">VISA</text></svg></span>
                    <span className="lx-paymeth pm-mc" title="Mastercard"><svg width="28" height="12" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#fff" /><circle cx="16" cy="8" r="5" fill="#eb001b" /><circle cx="24" cy="8" r="5" fill="#f79e1b" /><text x="32" y="12" fontWeight="bold" fontSize="8" fill="#1a1f71">MC</text></svg></span>
                    <span className="lx-paymeth pm-amex" title="Amex"><svg width="28" height="12" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#fff" /><text x="20" y="12" textAnchor="middle" fontWeight="bold" fontSize="9" fill="#2e77bb">AMEX</text></svg></span>
                    <span className="lx-paymeth pm-upi" title="UPI"><svg width="28" height="12" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#fff" /><text x="20" y="12" textAnchor="middle" fontWeight="bold" fontSize="10" fill="#4caf50">UPI</text></svg></span>
                    <span className="lx-paymeth pm-rupay" title="RuPay"><svg width="28" height="12" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#fff" /><text x="20" y="12" textAnchor="middle" fontWeight="bold" fontSize="10" fill="#005ba2">RUPAY</text></svg></span>
                    <span className="lx-paymeth pm-cod" title="COD"><svg width="28" height="12" viewBox="0 0 40 16"><rect width="40" height="16" rx="3" fill="#fff" /><text x="20" y="12" textAnchor="middle" fontWeight="bold" fontSize="10" fill="#222">COD</text></svg></span>
                </div>
            </div>
        </aside>
    );
});

export default CartOrderSummary;
