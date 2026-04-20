import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from "../Store/ActionCreaters/ProductActionCreators"
import { getCart, addCart } from "../Store/ActionCreaters/CartActionCreators"
import { getWishlist, addWishlist } from "../Store/ActionCreaters/WishlistActionCreators"
import { optimizeCloudinaryUrl } from '../utils/cloudinaryHelper';
import { useMembership } from './MembershipContext'

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Jost:wght@200;300;400;500;600&display=swap');

  :root {
    --gold: #B8960C;
    --gold-light: #D4AF37;
    --gold-pale: #F5EDD0;
    --gold-glow: rgba(212,175,55,0.15);
    --teal: #0E7777;
    --teal-mid: #1A9A9A;
    --teal-light: rgba(14,119,119,0.1);
    --ink: #0A0A0A;
    --charcoal: #1C1C1E;
    --ash: #3A3A3C;
    --mist: #F8F6F2;
    --cloud: #FFFFFF;
    --border-light: #EAE6DF;
    --border-mid: #D4CFC7;
    --text-body: #4A4540;
    --text-light: #8A8480;
    --red: #C0392B;
    --green: #1A7A4A;
    --shadow-xs: 0 1px 3px rgba(0,0,0,0.06);
    --shadow-sm: 0 4px 16px rgba(0,0,0,0.08);
    --shadow-md: 0 12px 40px rgba(0,0,0,0.12);
    --shadow-lg: 0 24px 80px rgba(0,0,0,0.16);
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 16px;
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .lux-page {
    font-family: 'Jost', sans-serif;
    background: var(--mist);
    min-height: 100vh;
    color: var(--ink);
    overflow-x: hidden;
  }

  /* ── Breadcrumb ── */
  .lux-breadcrumb {
    background: var(--cloud);
    border-bottom: 1px solid var(--border-light);
    padding: 14px 0;
  }
  .lux-breadcrumb-inner {
    max-width: 1320px;
    margin: 0 auto;
    padding: 0 32px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-light);
  }
  .lux-breadcrumb a {
    color: var(--teal);
    text-decoration: none;
    transition: var(--transition);
  }
  .lux-breadcrumb a:hover { color: var(--gold); }
  .lux-bc-sep { color: var(--border-mid); font-size: 14px; }
  .lux-bc-cur { color: var(--ash); font-weight: 500; }

  /* ── Main Layout ── */
  .lux-main {
    max-width: 1320px;
    margin: 0 auto;
    padding: 48px 32px 120px;
  }

  .lux-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 72px;
    align-items: start;
  }

  /* ── Gallery (Left) ── */
  .lux-gallery {
    position: sticky;
    top: 24px;
    display: flex;
    gap: 16px;
  }

  /* Vertical thumbs */
  .lux-thumbs-col {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-shrink: 0;
  }
  .lux-thumb {
    width: 72px;
    height: 88px;
    border: 1.5px solid var(--border-light);
    border-radius: var(--radius-sm);
    overflow: hidden;
    cursor: pointer;
    background: var(--cloud);
    transition: var(--transition);
    position: relative;
  }
  .lux-thumb::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(212,175,55,0);
    transition: var(--transition);
  }
  .lux-thumb:hover { border-color: var(--teal); transform: translateX(2px); }
  .lux-thumb.active { border-color: var(--gold); border-width: 2px; }
  .lux-thumb.active::after { background: rgba(212,175,55,0.06); }
  .lux-thumb img { width: 100%; height: 100%; object-fit: cover; }

  /* Main Image */
  .lux-main-img-wrap {
    flex: 1;
    position: relative;
    background: var(--cloud);
    border-radius: var(--radius-md);
    overflow: hidden;
    aspect-ratio: 3/4;
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-md);
  }
  .lux-main-img-wrap::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(145deg, rgba(212,175,55,0.03) 0%, transparent 50%, rgba(14,119,119,0.02) 100%);
    z-index: 1;
    pointer-events: none;
  }
  .lux-main-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 32px;
    transition: transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.25s;
    display: block;
  }
  .lux-main-img.switching { opacity: 0; transform: scale(0.97); }
  .lux-main-img-wrap:hover .lux-main-img { transform: scale(1.03); }

  .lux-badge {
    position: absolute;
    top: 20px;
    left: 0;
    background: var(--teal);
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 7px 14px 7px 16px;
    clip-path: polygon(0 0, 100% 0, 92% 100%, 0 100%);
    z-index: 2;
  }
  .lux-elite-badge {
    position: absolute;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%);
    color: #fff;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 6px 12px;
    border-radius: 20px;
    z-index: 2;
    box-shadow: 0 2px 12px rgba(184,150,12,0.4);
  }

  .lux-img-dots {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    z-index: 2;
  }
  .lux-img-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--border-mid);
    transition: var(--transition);
    cursor: pointer;
    border: none;
    padding: 0;
  }
  .lux-img-dot.active { background: var(--gold); width: 18px; border-radius: 3px; }

  .lux-wishlist-float {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255,255,255,0.9);
    backdrop-filter: blur(8px);
    border: 1px solid var(--border-light);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: var(--transition);
    z-index: 3;
    box-shadow: var(--shadow-sm);
  }
  .lux-wishlist-float:hover { background: #fff4f6; border-color: #e11d48; transform: scale(1.08); }
  .lux-wishlist-float.active svg { fill: #e11d48; stroke: #e11d48; }
  .lux-wishlist-float svg { transition: var(--transition); }

  /* ── RIGHT: Details ── */
  .lux-details { min-width: 0; }

  .lux-tag-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
  }
  .lux-tag {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 5px 13px;
    border-radius: 20px;
    font-weight: 500;
    border: 1px solid transparent;
  }
  .lux-tag-cat { background: var(--teal-light); color: var(--teal); border-color: rgba(14,119,119,0.2); }
  .lux-tag-off { background: var(--gold-glow); color: var(--gold); border-color: rgba(212,175,55,0.25); }
  .lux-tag-in  { background: rgba(26,122,74,0.08); color: var(--green); border-color: rgba(26,122,74,0.2); }
  .lux-tag-out { background: rgba(192,57,43,0.08); color: var(--red); border-color: rgba(192,57,43,0.2); }
  .lux-tag-elite { background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,150,12,0.1)); color: var(--gold); border-color: rgba(212,175,55,0.3); }

  .lux-name {
    font-family: 'Playfair Display', serif;
    font-size: clamp(28px, 3.5vw, 46px);
    font-weight: 500;
    line-height: 1.15;
    letter-spacing: -0.01em;
    color: var(--ink);
    margin-bottom: 8px;
    text-transform: capitalize;
  }
  .lux-name em { font-style: italic; color: var(--teal); }

  .lux-brand {
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-light);
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lux-brand-name { color: var(--teal); font-weight: 500; }
  .lux-brand-sep { width: 24px; height: 1px; background: var(--border-mid); }

  /* Rating */
  .lux-rating-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px 0;
    border-top: 1px solid var(--border-light);
    border-bottom: 1px solid var(--border-light);
    margin-bottom: 28px;
  }
  .lux-stars-wrap { display: flex; align-items: center; gap: 3px; }
  .lux-star { font-size: 15px; color: var(--border-mid); transition: var(--transition); }
  .lux-star.filled { color: var(--gold-light); }
  .lux-star.half { color: var(--gold-light); opacity: 0.6; }
  .lux-rating-num {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 600;
    color: var(--ink);
  }
  .lux-review-ct {
    font-size: 12px;
    color: var(--text-light);
    letter-spacing: 0.04em;
  }
  .lux-verified {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--green);
    letter-spacing: 0.06em;
    font-weight: 500;
  }

  /* Price */
  .lux-price-block {
    background: linear-gradient(135deg, rgba(212,175,55,0.04) 0%, rgba(248,246,242,0) 100%);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    padding: 20px 24px;
    margin-bottom: 28px;
    position: relative;
    overflow: hidden;
  }
  .lux-price-block::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 100%;
    background: linear-gradient(180deg, var(--gold) 0%, var(--gold-light) 100%);
  }
  .lux-price-row {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 6px;
  }
  .lux-final {
    font-family: 'Playfair Display', serif;
    font-size: 40px;
    font-weight: 600;
    color: var(--ink);
    line-height: 1;
  }
  .lux-original {
    font-size: 18px;
    color: var(--text-light);
    text-decoration: line-through;
  }
  .lux-save-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(26,122,74,0.1);
    color: var(--green);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    padding: 4px 12px;
    border-radius: 20px;
  }
  .lux-gst { font-size: 11px; color: var(--text-light); margin-top: 4px; letter-spacing: 0.04em; }

  /* Divider */
  .lux-divider {
    height: 1px;
    background: linear-gradient(90deg, var(--border-light), var(--border-mid) 50%, var(--border-light));
    margin: 24px 0;
    border: none;
  }

  /* Color Selector */
  .lux-selector-label {
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--text-light);
    font-weight: 600;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lux-selector-label span { color: var(--ink); font-weight: 500; font-size: 13px; letter-spacing: 0; text-transform: none; }

  .lux-colors {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 24px;
  }
  .lux-color-swatch {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  .lux-swatch-circle {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2.5px solid transparent;
    outline: 1px solid var(--border-light);
    transition: var(--transition);
    position: relative;
  }
  .lux-swatch-circle.active {
    border-color: var(--gold);
    outline-color: var(--gold);
    box-shadow: 0 0 0 3px var(--gold-glow);
    transform: scale(1.1);
  }
  .lux-swatch-circle:hover { transform: scale(1.1); }
  .lux-swatch-name { font-size: 10px; color: var(--text-light); letter-spacing: 0.05em; text-transform: capitalize; }

  /* Size Selector */
  .lux-sizes {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 24px;
  }
  .lux-size-btn {
    min-width: 52px;
    height: 48px;
    padding: 0 16px;
    border: 1.5px solid var(--border-mid);
    border-radius: var(--radius-sm);
    background: var(--cloud);
    color: var(--ash);
    font-family: 'Jost', sans-serif;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .lux-size-btn:hover { border-color: var(--teal); color: var(--teal); background: var(--teal-light); }
  .lux-size-btn.active {
    border-color: var(--ink);
    background: var(--ink);
    color: var(--cloud);
    box-shadow: 0 4px 16px rgba(10,10,10,0.2);
  }
  .lux-size-btn.out-of-stock {
    opacity: 0.4;
    cursor: not-allowed;
    text-decoration: line-through;
  }
  .lux-size-guide {
    font-size: 11px;
    color: var(--teal);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
    transition: var(--transition);
    border: none;
    background: none;
    font-family: 'Jost', sans-serif;
  }
  .lux-size-guide:hover { color: var(--gold); }

  /* Quantity */
  .lux-qty-block {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }
  .lux-qty-label {
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--text-light);
    font-weight: 600;
    white-space: nowrap;
  }
  .lux-qty-ctrl {
    display: flex;
    align-items: center;
    border: 1.5px solid var(--border-mid);
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--cloud);
  }
  .lux-qty-btn {
    width: 44px;
    height: 44px;
    border: none;
    background: transparent;
    font-size: 20px;
    color: var(--text-body);
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 300;
    flex-shrink: 0;
  }
  .lux-qty-btn:hover { background: var(--ink); color: var(--cloud); }
  .lux-qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .lux-qty-num {
    width: 56px;
    text-align: center;
    border: none;
    border-left: 1px solid var(--border-light);
    border-right: 1px solid var(--border-light);
    background: transparent;
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 600;
    color: var(--ink);
    outline: none;
    height: 44px;
    pointer-events: none;
    -webkit-user-select: none;
    user-select: none;
  }
  .lux-stock-info {
    font-size: 11px;
    color: var(--text-light);
    letter-spacing: 0.06em;
  }
  .lux-stock-info strong { color: var(--green); }

  /* CTA */
  .lux-cta-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 28px;
  }
  .lux-cta-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
  }
  .lux-btn-cart {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: var(--ink);
    color: var(--cloud);
    border: none;
    border-radius: var(--radius-sm);
    padding: 18px 32px;
    font-family: 'Jost', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    cursor: pointer;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
  }
  .lux-btn-cart::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, var(--gold), var(--gold-light), var(--gold));
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }
  .lux-btn-cart:hover {
    background: var(--charcoal);
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(10,10,10,0.25);
  }
  .lux-btn-cart:hover::after { transform: scaleX(1); }
  .lux-btn-cart:active { transform: translateY(0); }
  .lux-btn-cart.loading { opacity: 0.7; pointer-events: none; }

  .lux-btn-buy {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 50%, var(--gold) 100%);
    background-size: 200% 100%;
    color: var(--ink);
    border: none;
    border-radius: var(--radius-sm);
    padding: 18px 32px;
    font-family: 'Jost', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    cursor: pointer;
    transition: var(--transition);
    box-shadow: 0 4px 20px rgba(184,150,12,0.3);
  }
  .lux-btn-buy:hover {
    background-position: right center;
    transform: translateY(-2px);
    box-shadow: 0 12px 36px rgba(184,150,12,0.4);
  }

  .lux-btn-wish-full {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: transparent;
    color: var(--text-body);
    border: 1px solid var(--border-mid);
    border-radius: var(--radius-sm);
    padding: 14px 20px;
    font-family: 'Jost', sans-serif;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    transition: var(--transition);
    white-space: nowrap;
  }
  .lux-btn-wish-full:hover { border-color: #e11d48; color: #e11d48; background: rgba(225,29,72,0.04); }
  .lux-btn-wish-full.wishlisted { background: rgba(225,29,72,0.06); color: #e11d48; border-color: #e11d48; }

  /* Delivery Check */
  .lux-delivery {
    background: var(--cloud);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    padding: 20px;
    margin-bottom: 24px;
  }
  .lux-delivery-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-light);
    font-weight: 600;
    margin-bottom: 14px;
  }
  .lux-delivery-row { display: flex; gap: 8px; }
  .lux-pin-input {
    flex: 1;
    border: 1px solid var(--border-mid);
    border-radius: var(--radius-sm);
    padding: 11px 16px;
    font-family: 'Jost', sans-serif;
    font-size: 14px;
    color: var(--ink);
    outline: none;
    background: var(--mist);
    transition: var(--transition);
    letter-spacing: 0.1em;
  }
  .lux-pin-input:focus { border-color: var(--teal); background: var(--cloud); box-shadow: 0 0 0 3px var(--teal-light); }
  .lux-pin-btn {
    background: var(--teal);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    padding: 11px 20px;
    font-family: 'Jost', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: var(--transition);
    white-space: nowrap;
  }
  .lux-pin-btn:hover { background: var(--teal-mid); transform: translateY(-1px); }
  .lux-delivery-msg { font-size: 12px; color: var(--green); margin-top: 10px; font-weight: 500; }
  .lux-delivery-msg.err { color: var(--red); }

  /* Offers */
  .lux-offers {
    background: linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(14,119,119,0.04) 100%);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    padding: 16px 20px;
    margin-bottom: 24px;
  }
  .lux-offers-title {
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--text-light);
    font-weight: 600;
    margin-bottom: 12px;
  }
  .lux-offer-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px dashed var(--border-light);
    font-size: 12px;
    color: var(--text-body);
    line-height: 1.5;
  }
  .lux-offer-item:last-child { border-bottom: none; }
  .lux-offer-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
  .lux-offer-code { font-weight: 600; color: var(--teal); }

  /* Trust badges */
  .lux-trust {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 28px;
  }
  .lux-trust-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 8px;
    background: var(--cloud);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    text-align: center;
    transition: var(--transition);
  }
  .lux-trust-item:hover { border-color: var(--border-mid); box-shadow: var(--shadow-sm); transform: translateY(-2px); }
  .lux-trust-icon { font-size: 22px; }
  .lux-trust-text {
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-light);
    line-height: 1.5;
    font-weight: 500;
  }

  /* Description + Attributes tabs */
  .lux-tabs {
    display: flex;
    gap: 0;
    border-bottom: 2px solid var(--border-light);
    margin-bottom: 20px;
  }
  .lux-tab {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--text-light);
    padding: 12px 20px 10px;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    cursor: pointer;
    margin-bottom: -2px;
    transition: var(--transition);
    font-family: 'Jost', sans-serif;
  }
  .lux-tab.active { color: var(--ink); border-bottom-color: var(--gold); }
  .lux-tab:hover:not(.active) { color: var(--teal); }

  .lux-tab-content { margin-bottom: 24px; }
  .lux-desc {
    font-size: 14px;
    line-height: 1.85;
    color: var(--text-body);
    word-break: break-word;
  }
  .lux-attrs-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .lux-attr-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--cloud);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-light);
  }
  .lux-attr-key { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-light); font-weight: 500; }
  .lux-attr-val { font-size: 13px; font-weight: 500; color: var(--ink); text-transform: capitalize; }

  /* Sticky Bottom Bar (mobile) */
  .lux-sticky-bar {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: rgba(255,255,255,0.97);
    backdrop-filter: blur(16px);
    border-top: 1px solid var(--border-light);
    padding: 12px 16px;
    gap: 10px;
    box-shadow: 0 -8px 32px rgba(0,0,0,0.1);
  }
  .lux-sticky-info { flex: 1; }
  .lux-sticky-name { font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
  .lux-sticky-price { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: var(--ink); }
  .lux-sticky-actions { display: flex; gap: 8px; align-items: center; }
  .lux-sticky-cart {
    background: var(--ink);
    color: var(--cloud);
    border: none;
    border-radius: var(--radius-sm);
    padding: 12px 20px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'Jost', sans-serif;
    transition: var(--transition);
    white-space: nowrap;
  }
  .lux-sticky-cart:hover { background: var(--charcoal); }
  .lux-sticky-buy {
    background: linear-gradient(135deg, var(--gold), var(--gold-light));
    color: var(--ink);
    border: none;
    border-radius: var(--radius-sm);
    padding: 12px 20px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'Jost', sans-serif;
    transition: var(--transition);
    white-space: nowrap;
  }

  /* Mobile horizontal thumbs */
  .lux-thumbs-row {
    display: none;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 6px;
    scrollbar-width: none;
    -ms-overflow-style: none;
    margin-top: 14px;
  }
  .lux-thumbs-row::-webkit-scrollbar { display: none; }
  .lux-thumbs-row .lux-thumb {
    flex: 0 0 70px;
    width: 70px;
    height: 84px;
  }

  /* ── Toast ── */
  .lux-toast {
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: var(--ink);
    color: var(--cloud);
    padding: 12px 24px;
    border-radius: 24px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.04em;
    z-index: 200;
    opacity: 0;
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    pointer-events: none;
  }
  .lux-toast.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  /* ── Alert ── */
  .lux-alert {
    background: rgba(192,57,43,0.08);
    border: 1px solid rgba(192,57,43,0.2);
    border-radius: var(--radius-sm);
    color: var(--red);
    font-size: 12px;
    font-weight: 500;
    padding: 10px 14px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: 0.04em;
  }

  /* ── Responsive ── */
  @media (max-width: 1100px) {
    .lux-main { padding: 36px 24px 100px; }
    .lux-grid { gap: 48px; }
    .lux-trust { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 900px) {
    .lux-main { padding: 28px 20px 100px; }
    .lux-grid { grid-template-columns: 1fr; gap: 32px; }
    .lux-gallery { position: static; flex-direction: column; }
    .lux-thumbs-col { display: none; }
    .lux-thumbs-row { display: flex; }
    .lux-main-img-wrap { aspect-ratio: 4/5; max-height: 540px; }
    .lux-trust { grid-template-columns: repeat(4, 1fr); }
    .lux-sticky-bar { display: none !important; }
    /* Always show CTA stack on mobile below image */
    .lux-cta-stack { display: flex !important; margin-top: 24px !important; }
  }

  @media (max-width: 640px) {
    .lux-breadcrumb-inner { padding: 0 16px; font-size: 10px; }
    .lux-main { padding: 20px 16px 90px; }
    .lux-grid { gap: 24px; }
    .lux-main-img-wrap { aspect-ratio: 1/1; max-height: none; }
    .lux-main-img { padding: 20px; }
    .lux-name { font-size: clamp(22px, 7vw, 34px); }
    .lux-final { font-size: 32px; }
    .lux-trust { grid-template-columns: repeat(2, 1fr); }
    .lux-attrs-grid { grid-template-columns: 1fr; }
    .lux-cta-row { grid-template-columns: 1fr; }
    .lux-delivery-row { flex-direction: column; }
    .lux-pin-btn { width: 100%; text-align: center; padding: 13px; }
  }

  @media (max-width: 420px) {
    .lux-main { padding: 16px 12px 80px; }
    .lux-trust { grid-template-columns: 1fr 1fr; }
    .lux-sizes { gap: 8px; }
    .lux-size-btn { min-width: 46px; height: 44px; font-size: 12px; padding: 0 12px; }
    .lux-final { font-size: 28px; }
    .lux-sticky-name { max-width: 110px; }
    .lux-sticky-cart, .lux-sticky-buy { padding: 11px 14px; font-size: 10px; }
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = [
  { name: 'Black', hex: '#1C1C1E' },
  { name: 'White', hex: '#F5F5F0' },
  { name: 'Navy', hex: '#1B2B4B' },
  { name: 'Forest', hex: '#2D5A3D' },
  { name: 'Stone', hex: '#C4B99A' },
];

function StarRating({ value = 4.5 }) {
  return (
    <div className="lux-stars-wrap">
      {[1,2,3,4,5].map(s => {
        const filled = s <= Math.floor(value);
        const half = !filled && s <= Math.ceil(value) && value % 1 !== 0;
        return <span key={s} className={`lux-star ${filled ? 'filled' : half ? 'half' : ''}`}>★</span>;
      })}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function SingleProductPage() {
  const [p, setp] = useState({ pic1:'', pic2:'', pic3:'', pic4:'' });
  const [qty, setqty] = useState(1);
  const [mainImage, setMainImage] = useState('');
  const [imgSwitching, setImgSwitching] = useState(false);
  const [pincode, setPincode] = useState('');
  const [deliveryMsg, setDeliveryMsg] = useState('');
  const [deliveryErr, setDeliveryErr] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [wishlisted, setWishlisted] = useState(false);
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [validationErr, setValidationErr] = useState('');
  const [cartLoading, setCartLoading] = useState(false);

  const toastTimer = useRef(null);

  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const product = useSelector(s => s.ProductStateData);
  const cartState = useSelector(s => s.CartStateData);
  const cartItems = cartState && Array.isArray(cartState.items) ? cartState.items : [];
  const wishlist = useSelector(s => s.WishlistStateData);
  const { membershipType } = useMembership();

  function showToast(msg) {
    setToast(msg);
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2800);
  }

  function switchImage(img) {
    setImgSwitching(true);
    setTimeout(() => { setMainImage(img); setImgSwitching(false); }, 220);
  }

  function getAPIData() {
    dispatch(getProduct());
    dispatch(getCart());
    dispatch(getWishlist());
    const data = product.find(item => item.id === id);
    if (data) {
      setp(data);
      setMainImage(data.pic1);
      if (data.size && typeof data.size === 'string') setSelectedSize(data.size.split(',')[0]?.trim() || '');
      if (data.color && typeof data.color === 'string') setSelectedColor(data.color.split(',')[0]?.trim() || '');
    }
    // Check wishlist
    if (wishlist && id) {
      const wl = wishlist.find(item => item.productid === id && item.userid === localStorage.getItem('userid'));
      setWishlisted(!!wl);
    }
  }

  function addToCart() {
    if (!localStorage.getItem('login')) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (!selectedSize || !selectedColor) {
      setValidationErr('Please select size and colour before adding to cart.');
      setTimeout(() => setValidationErr(''), 3500);
      return;
    }
    setValidationErr('');
    const userId = localStorage.getItem('userid');
    const productId = p.id || p._id || id;
    const elitePrice = membershipType === 'Elite' ? Math.round(Number(p.finalprice || 0) * 0.9) : Number(p.finalprice || 0);
    const existing = cartItems.find(item =>
      String(item.productid) === String(productId) &&
      String(item.userid) === String(userId) &&
      String(item.size || '') === String(selectedSize) &&
      String(item.color || '') === String(selectedColor)
    );
    if (existing) { dispatch(getCart()); navigate('/cart'); return; }
    setCartLoading(true);
    dispatch(addCart({ userId, productId, quantity: Number(qty), price: elitePrice, size: selectedSize, color: selectedColor }));
    setTimeout(() => { setCartLoading(false); navigate('/cart'); }, 600);

  }

  // BUY NOW: Go directly to checkout with product data (no cart add, no cart page)
  function buyNow() {
    if (!localStorage.getItem('login')) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (!selectedSize || !selectedColor) {
      setValidationErr('Please select size and colour before buying.');
      setTimeout(() => setValidationErr(''), 3500);
      return;
    }
    setValidationErr('');
    // Prepare product data for checkout
    const checkoutProduct = {
      ...p,
      productid: p.id || p._id || id,
      product: p, // Support for components expecting nested product object
      size: selectedSize,
      color: selectedColor,
      quantity: qty,
      price: membershipType === 'Elite' ? Math.round(Number(p.finalprice || 0) * 0.9) : Number(p.finalprice || 0),
      pic: p.pic1 || p.pic, // Standardized image key for checkout mapping
      image: p.pic1 || p.pic,
    };
    // Save to sessionStorage (or localStorage) for checkout page to read
    sessionStorage.setItem('directCheckoutProduct', JSON.stringify(checkoutProduct));
    navigate('/checkout', { state: { direct: true } });
  }

  function addToWishlist() {
    if (!localStorage.getItem('login')) { navigate('/login', { state: { from: location.pathname } }); return; }
    const wl = wishlist.find(item => item.productid === id && item.userid === localStorage.getItem('userid'));
    if (wl) { navigate('/wishlist'); return; }
    dispatch(addWishlist({
      productid: p.id,
      userid: localStorage.getItem('userid'),
      name: p.name,
      color: selectedColor || (typeof p.color === 'string' ? p.color : ''),
      size: selectedSize || (typeof p.size === 'string' ? p.size : ''),
      price: Number(p.finalprice),
      pic: p.pic1,
    }));
    setWishlisted(true);
    showToast('❤️ Added to Wishlist');
  }

  function checkDelivery() {
    if (pincode.length === 6 && /^\d+$/.test(pincode)) {
      setDeliveryMsg(`✓ Delivery available to ${pincode} — arrives in 3–5 business days`);
      setDeliveryErr(false);
    } else {
      setDeliveryMsg('Please enter a valid 6-digit pincode.');
      setDeliveryErr(true);
    }
  }

  useEffect(() => { getAPIData(); }, [product.length, id]);
  useEffect(() => { return () => clearTimeout(toastTimer.current); }, []);

  const savings = p.baseprice > p.finalprice ? (p.baseprice - p.finalprice) : 0;
  const elitePrice = membershipType === 'Elite' ? Math.round(Number(p.finalprice || 0) * 0.9) : Number(p.finalprice || 0);
  const eliteSavings = membershipType === 'Elite' ? Math.round(Number(p.finalprice || 0) * 0.1) : 0;
  const thumbs = [p.pic1, p.pic2, p.pic3, p.pic4].filter(Boolean);

  // Parse color/size from product string or use COLORS/SIZES defaults
  const productColors = (p.color && typeof p.color === 'string')
    ? p.color.split(',').map(c => ({ name: c.trim(), hex: COLORS.find(x => x.name.toLowerCase() === c.trim().toLowerCase())?.hex || '#999' }))
    : COLORS;
  const productSizes = (p.size && typeof p.size === 'string')
    ? p.size.split(',').map(s => s.trim()).filter(Boolean)
    : SIZES;

  return (
    <>
      <style>{styles}</style>
      <div className="lux-page">

        {/* Toast */}
        <div className={`lux-toast ${toastVisible ? 'visible' : ''}`}>{toast}</div>

        {/* Breadcrumb */}
        <div className="lux-breadcrumb">
          <div className="lux-breadcrumb-inner">
            <a href="/">Home</a>
            <span className="lux-bc-sep">›</span>
            <a href="/shop">Shop</a>
            <span className="lux-bc-sep">›</span>
            <a href={`/shop?cat=${p.maincategory}`} style={{textTransform:'capitalize'}}>{p.maincategory || 'Products'}</a>
            <span className="lux-bc-sep">›</span>
            <span className="lux-bc-cur" style={{textTransform:'capitalize'}}>{p.name}</span>
          </div>
        </div>

        <div className="lux-main">
          <div className="lux-grid">
            

            {/* ── LEFT: GALLERY ── */}
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:'100%'}}>
              <div className="lux-gallery">
              {/* Vertical thumbs (desktop) */}
              {thumbs.length > 1 && (
                <div className="lux-thumbs-col">
                  {thumbs.map((img, i) => (
                    <div key={i} className={`lux-thumb ${mainImage === img ? 'active' : ''}`} onClick={() => switchImage(img)}>
                      <img src={typeof optimizeCloudinaryUrl === 'function' ? optimizeCloudinaryUrl(img) : img} alt={`View ${i+1}`} />
                    </div>
                  ))}
                </div>
              )}

              {/* Main Image */}
              <div className="lux-main-img-wrap">
                {p.discount > 0 && <span className="lux-badge">{p.discount}% OFF</span>}
                {membershipType === 'Elite' && <span className="lux-elite-badge">⭐ Elite 10% Off</span>}

                {/* Wishlist float (desktop) */}
                <button className={`lux-wishlist-float ${wishlisted ? 'active' : ''}`} onClick={addToWishlist} title="Add to Wishlist">
                  <svg width="18" height="18" fill="none" stroke="#e11d48" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                  </svg>
                </button>

                <img
                  src={typeof optimizeCloudinaryUrl === 'function' ? optimizeCloudinaryUrl(mainImage || p.pic1) : (mainImage || p.pic1)}
                  className={`lux-main-img ${imgSwitching ? 'switching' : ''}`}
                  alt={p.name}
                />

                {/* Dot indicators */}
                {thumbs.length > 1 && (
                  <div className="lux-img-dots">
                    {thumbs.map((img, i) => (
                      <button key={i} className={`lux-img-dot ${mainImage === img ? 'active' : ''}`} onClick={() => switchImage(img)} />
                    ))}
                  </div>
                )}
              </div>
              

              {/* Horizontal thumbs (mobile) */}
              {thumbs.length > 1 && (
                <div className="lux-thumbs-row">
                  {thumbs.map((img, i) => (
                    <div key={i} className={`lux-thumb ${mainImage === img ? 'active' : ''}`} onClick={() => switchImage(img)}>
                      <img src={typeof optimizeCloudinaryUrl === 'function' ? optimizeCloudinaryUrl(img) : img} alt={`View ${i+1}`} />
                    </div>
                  ))}
                </div>
              )}
              </div>

              {/* --- PREMIUM PRODUCT INFO SECTION (NOW BELOW IMAGES ONLY) --- */}
              <div className="lux-premium-info-wrap" style={{marginTop:'2.5rem',marginBottom:'2.5rem',boxShadow:'0 2px 24px #0001',borderRadius:'1.2rem',background:'#fff',padding:'2.2rem 1.5rem',maxWidth:'500px',width:'100%'}}>
                {/* Tabs */}
                <div className="lux-tabs" style={{marginBottom:'1.5rem'}}>
                  <button className={`lux-tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>Product Details</button>
                  <button className={`lux-tab ${activeTab === 'features' ? 'active' : ''}`} onClick={() => setActiveTab('features')}>Features</button>
                  <button className={`lux-tab ${activeTab === 'care' ? 'active' : ''}`} onClick={() => setActiveTab('care')}>Care Guide</button>
                </div>
                <div className="lux-tab-content" style={{marginBottom:'2.2rem'}}>
                  {activeTab === 'details' && (
                    <div className="lux-desc" style={{fontSize:'1.08rem',lineHeight:1.8}}>
                      {p.description || 'A premium quality product crafted with the finest materials. Designed for comfort, style, and durability. Perfect for everyday wear and special occasions alike.'}
                    </div>
                  )}
                  {activeTab === 'features' && (
                    <ul style={{paddingLeft:'1.2rem',fontSize:'1.08rem',lineHeight:2}}>
                      <li>100% Authentic, luxury-grade material</li>
                      <li>Ultra-soft, breathable & skin-friendly</li>
                      <li>Modern tailored fit for all-day comfort</li>
                      <li>Premium stitching & finishing</li>
                      <li>Exclusive design, limited edition</li>
                      <li>Made for both casual & formal occasions</li>
                    </ul>
                  )}
                  {activeTab === 'care' && (
                    <div className="lux-desc" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize:'1.08rem',lineHeight:2 }}>
                      <div>🧺 Machine wash cold with similar colours</div>
                      <div>🚫 Do not bleach or tumble dry</div>
                      <div>🌡️ Iron on low heat if needed</div>
                      <div>🏪 Store in a cool, dry place away from direct sunlight</div>
                    </div>
                  )}
                </div>
                {/* Ratings & Reviews */}
                <div className="lux-ratings-reviews" style={{marginBottom:'2.2rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'1.5rem',flexWrap:'wrap'}}>
                    <div style={{fontSize:'2.2rem',fontWeight:700,color:'#B8960C',display:'flex',alignItems:'center',gap:'0.5rem'}}>
                      <span>{(p.rating || 4.5).toFixed(1)}</span>
                      <StarRating value={p.rating || 4.5} />
                    </div>
                    <div style={{fontSize:'1.1rem',color:'#888'}}>({p.reviews || 0} Reviews)</div>
                  </div>
                  {/* Ratings breakdown bars (static demo) */}
                  <div style={{marginTop:'1.2rem',maxWidth:'340px'}}>
                    {[5,4,3,2,1].map(star => (
                      <div key={star} style={{display:'flex',alignItems:'center',gap:'0.7rem',marginBottom:'0.3rem'}}>
                        <span style={{width:22}}>{star}★</span>
                        <div style={{flex:1,background:'#f3f3f3',borderRadius:8,overflow:'hidden',height:8}}>
                          <div style={{width:`${p.rating ? Math.max(0,Math.min(100,star*20-10)) : star*18}%`,background:'#B8960C',height:'100%'}}></div>
                        </div>
                        <span style={{fontSize:12,color:'#888'}}>{Math.floor((p.reviews||20)*(star/15))}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* FAQ / Info Section */}
                <div className="lux-faq-info" style={{marginTop:'1.5rem',display:'grid',gap:'1.2rem',gridTemplateColumns:'1fr 1fr',maxWidth:'700px'}}>
                  <div>
                    <div style={{fontWeight:600,marginBottom:4}}>Why this product?</div>
                    <div style={{color:'#555'}}>Handpicked for luxury, comfort, and timeless style. Trusted by 10,000+ premium buyers.</div>
                  </div>
                  <div>
                    <div style={{fontWeight:600,marginBottom:4}}>Material</div>
                    <div style={{color:'#555'}}>Premium combed cotton blend, eco-friendly dyes, and sustainable sourcing.</div>
                  </div>
                  <div>
                    <div style={{fontWeight:600,marginBottom:4}}>Care</div>
                    <div style={{color:'#555'}}>Easy machine wash, no bleach, low iron, and quick dry.</div>
                  </div>
                  <div>
                    <div style={{fontWeight:600,marginBottom:4}}>Return/Exchange</div>
                    <div style={{color:'#555'}}>30-day hassle-free returns & instant exchange support.</div>
                  </div>
                </div>
                {/* Responsive: Stack FAQ on mobile */}
                <style>{`
                  @media (max-width: 700px) {
                    .lux-faq-info { grid-template-columns: 1fr !important; }
                  }
                `}</style>
              </div>
            </div>
            

            {/* ── RIGHT: DETAILS ── */}
            <div className="lux-details">


              {/* Tags */}
              <div className="lux-tag-row">
                {p.maincategory && <span className="lux-tag lux-tag-cat">{p.maincategory}</span>}
                {p.discount > 0 && <span className="lux-tag lux-tag-off">{p.discount}% Off</span>}
                <span className={`lux-tag ${p.stock === 'Out of Stock' ? 'lux-tag-out' : 'lux-tag-in'}`}>
                  {p.stock || 'In Stock'}
                </span>
                {membershipType === 'Elite' && <span className="lux-tag lux-tag-elite">⭐ Elite Member</span>}
              </div>

              {/* Name */}
              <h1 className="lux-name">{p.name}</h1>
              <div className="lux-brand">
                <span className="lux-brand-sep"/>
                <span>By</span>
                <span className="lux-brand-name">{p.brand || 'EShopper'}</span>
              </div>

              {/* Rating */}
              <div className="lux-rating-bar">
                <StarRating value={p.rating || 4.5} />
                <span className="lux-rating-num">{(p.rating || 4.5).toFixed(1)}</span>
                <span className="lux-review-ct">({p.reviews || 0} reviews)</span>
                <span className="lux-verified">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="var(--green)"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="var(--green)" strokeWidth="2" fill="none"/></svg>
                  Verified
                </span>
              </div>

              {/* Price */}
              <div className="lux-price-block">
                <div className="lux-price-row">
                  <span className="lux-final">₹{elitePrice.toLocaleString('en-IN')}</span>
                  {(p.baseprice > p.finalprice || membershipType === 'Elite') && (
                    <span className="lux-original">₹{Number(p.baseprice || 0).toLocaleString('en-IN')}</span>
                  )}
                  {(savings > 0 || membershipType === 'Elite') && (
                    <span className="lux-save-pill">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Save ₹{membershipType === 'Elite' ? eliteSavings.toLocaleString('en-IN') : savings.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <div className="lux-gst">Inclusive of all taxes · Free shipping above ₹999</div>
              </div>

              <hr className="lux-divider"/>

              {/* Color Selector */}
              <div className="lux-selector-label">
                Colour <span>{selectedColor || '—'}</span>
              </div>
              <div className="lux-colors">
                {productColors.map(c => (
                  <div key={c.name} className="lux-color-swatch" onClick={() => setSelectedColor(c.name)}>
                    <div
                      className={`lux-swatch-circle ${selectedColor === c.name ? 'active' : ''}`}
                      style={{ background: c.hex, border: c.hex === '#F5F5F0' ? '2.5px solid #ccc' : '' }}
                    />
                    <span className="lux-swatch-name">{c.name}</span>
                  </div>
                ))}
              </div>

              {/* Size Selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div className="lux-selector-label" style={{ marginBottom: 0 }}>
                  Size <span>{selectedSize || '—'}</span>
                </div>
                <button className="lux-size-guide" onClick={() => showToast('📏 Size guide coming soon!')}>Size Guide</button>
              </div>
              <div className="lux-sizes">
                {productSizes.map(s => (
                  <button
                    key={s}
                    className={`lux-size-btn ${selectedSize === s ? 'active' : ''}`}
                    onClick={() => setSelectedSize(s)}
                  >{s}</button>
                ))}
              </div>

              <hr className="lux-divider"/>

              {/* Quantity */}
              <div className="lux-qty-block">
                <span className="lux-qty-label">Qty</span>
                <div className="lux-qty-ctrl">
                  <button className="lux-qty-btn" onClick={() => qty > 1 && setqty(qty - 1)} disabled={qty <= 1}>−</button>
                  <div className="lux-qty-num">{qty}</div>
                  <button className="lux-qty-btn" onClick={() => qty < 10 && setqty(qty + 1)} disabled={qty >= 10}>+</button>
                </div>
                <span className="lux-stock-info">Only <strong>7 left</strong> in stock</span>
              </div>

              {/* Validation Error */}
              {validationErr && (
                <div className="lux-alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {validationErr}
                </div>
              )}

              {/* CTA Buttons (always visible, responsive) */}
              <div className="lux-cta-stack">
                <div className="lux-cta-row">
                  <button className={`lux-btn-cart ${cartLoading ? 'loading' : ''}`} onClick={addToCart}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 01-8 0"/>
                    </svg>
                    {cartLoading ? 'Adding…' : 'Add to Cart'}
                  </button>
                  <button className={`lux-btn-wish-full ${wishlisted ? 'wishlisted' : ''}`} onClick={addToWishlist}>
                    <svg width="15" height="15" fill={wishlisted ? '#e11d48' : 'none'} stroke={wishlisted ? '#e11d48' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                    {wishlisted ? 'Wishlisted' : 'Wishlist'}
                  </button>
                </div>
                <button className="lux-btn-buy" onClick={buyNow}>
                  ⚡ Buy Now
                </button>
              </div>

              {/* Offers */}
              <div className="lux-offers">
                <div className="lux-offers-title">Available Offers</div>
                <div className="lux-offer-item">
                  <span className="lux-offer-icon">💳</span>
                  <div>10% off on HDFC Bank Cards. Use code <span className="lux-offer-code">HDFC10</span></div>
                </div>
                <div className="lux-offer-item">
                  <span className="lux-offer-icon">🏦</span>
                  <div>No-cost EMI on orders above ₹3,000. 3–12 months available.</div>
                </div>
                <div className="lux-offer-item">
                  <span className="lux-offer-icon">🎁</span>
                  <div>Free gift wrapping on orders above ₹1,500. Use code <span className="lux-offer-code">GIFTWRAP</span></div>
                </div>
              </div>

              {/* Delivery Check */}
              <div className="lux-delivery">
                <div className="lux-delivery-head">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  Check Delivery
                </div>
                <div className="lux-delivery-row">
                  <input className="lux-pin-input" type="text" inputMode="numeric" placeholder="Enter 6-digit pincode" maxLength={6} value={pincode}
                    onChange={e => { setPincode(e.target.value); setDeliveryMsg(''); }}
                    onKeyDown={e => e.key === 'Enter' && checkDelivery()}
                  />
                  <button className="lux-pin-btn" onClick={checkDelivery}>Check</button>
                </div>
                {deliveryMsg && <div className={`lux-delivery-msg ${deliveryErr ? 'err' : ''}`}>{deliveryMsg}</div>}
              </div>

              {/* Trust badges */}
              <div className="lux-trust">
                <div className="lux-trust-item">
                  <div className="lux-trust-icon">🔄</div>
                  <div className="lux-trust-text">30-Day<br/>Returns</div>
                </div>
                <div className="lux-trust-item">
                  <div className="lux-trust-icon">🛡️</div>
                  <div className="lux-trust-text">Secure<br/>Payments</div>
                </div>
                <div className="lux-trust-item">
                  <div className="lux-trust-icon">✨</div>
                  <div className="lux-trust-text">100%<br/>Authentic</div>
                </div>
                <div className="lux-trust-item">
                  <div className="lux-trust-icon">🚚</div>
                  <div className="lux-trust-text">Free<br/>Shipping</div>
                </div>
              </div>

            
            </div>
          </div>
        </div>

        {/* Sticky Bottom Bar (Mobile) is now hidden on small screens as per user request */}

      </div>
    </>
  );
}