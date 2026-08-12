import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getCart, addCart } from '../Store/ActionCreaters/CartActionCreators';
import { getWishlist, addWishlist, deleteWishlist } from '../Store/ActionCreaters/WishlistActionCreators';
import { useMembership } from './MembershipContext';
import ProductReviews from './ProductReviews';
import { motion } from 'framer-motion';
import axios from 'axios';
import { BASE_URL } from '../constants';
import { useProductQuery, useProductsQuery } from '../queries/catalogQueries';
import LazyImage from './LazyImage';
import SEO, { productJsonLd, breadcrumbJsonLd } from './SEO';

/* ─── Mock data ─────────────────────────────────────────────────────────────── */
const QA_LIST = [
  { q:"Is this true to size or does it run small/large?", a:"Fits true to size. For a relaxed fit, we recommend going one size up.", votes:12 },
  { q:"Is the fabric pre-shrunk?", a:"Yes, all fabrics are pre-washed and pre-shrunk to minimise further shrinkage after washing.", votes:8 },
  { q:"Can this be altered after purchase?", a:"Absolutely. Elite members receive complimentary alterations at our stores.", votes:5 },
];

const SPECS = [
  ["Material","100% Merino Cashmere"],["Fit Type","Slim / Regular Fit"],
  ["Closure","Single Button"],["Lining","Full Satin Lining"],
  ["Pocket","Chest + Two Side Pockets"],["Sleeve","Full Sleeve"],
  ["Wash Care","Dry Clean Only"],["Origin","Made in India"],["SKU","AFS-BLZ-2025-CMR"],
];

const FEATURES = [
  "100% Merino Cashmere — ultra-soft, breathable & skin-friendly",
  "Classic single-button Italian silhouette with structured shoulders",
  "Full satin lining for smooth layering over shirts",
  "Two side pockets + chest pocket with gold-tone finish",
  "Exclusive design — limited run of 200 pieces per colourway",
  "Individually cut and stitched by master craftsmen",
  "Available in 5 curated colourways for the season",
  "Timeless fit — formal and smart casual occasions",
];

const CARE_ITEMS = [
  { icon:"🧺", text:"Dry clean only — do not machine or hand wash" },
  { icon:"🚫", text:"Do not bleach, tumble dry, or wring" },
  { icon:"🌡️", text:"Cool iron on reverse side if necessary" },
  { icon:"🏪", text:"Store on a wide hanger away from direct sunlight" },
  { icon:"👜", text:"Carry in the dust bag provided when travelling" },
  { icon:"💧", text:"Spot clean with a damp cloth for minor stains" },
];

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Jost:wght@200;300;400;500;600;700&display=swap');

:root {
  --gold:#B8960C;--gold-light:#D4AF37;--gold-pale:#F5EDD0;--gold-glow:rgba(212,175,55,0.15);
  --teal:#0E7777;--teal-mid:#1A9A9A;--teal-light:rgba(14,119,119,0.1);
  --ink:#0A0A0A;--charcoal:#1C1C1E;--ash:#3A3A3C;
  --mist:#F8F6F2;--cloud:#FFFFFF;--fog:#F2F0EC;
  --border-light:#EAE6DF;--border-mid:#D4CFC7;
  --text-body:#4A4540;--text-light:#8A8480;
  --red:#C0392B;--green:#1A7A4A;--green-light:rgba(26,122,74,0.08);
  --sh-xs:0 1px 3px rgba(0,0,0,0.06);--sh-sm:0 4px 16px rgba(0,0,0,0.08);
  --sh-md:0 12px 40px rgba(0,0,0,0.12);--sh-lg:0 24px 80px rgba(0,0,0,0.16);
  --r-sm:4px;--r-md:8px;--r-lg:16px;--r-xl:24px;
  --tr:all 0.3s cubic-bezier(0.4,0,0.2,1);
}

.pd-accordion-wrap{margin-top:24px;border:1px solid var(--border-light);border-radius:var(--r-lg);background:var(--cloud);overflow:hidden;box-shadow:var(--sh-sm);}
.pd-accordion-item + .pd-accordion-item{border-top:1px solid var(--border-light);}
.pd-accordion-head{width:100%;display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:transparent;border:none;cursor:pointer;font-family:'Jost',sans-serif;font-size:12px;font-weight:700;color:var(--ink);letter-spacing:0.1em;text-transform:uppercase;transition:var(--tr);}
.pd-accordion-head:hover{background:var(--fog);}
.pd-accordion-chev{font-size:13px;transition:transform 0.3s ease;color:var(--text-light);}
.pd-accordion-chev.up{transform:rotate(180deg);}
.pd-accordion-body{overflow:hidden;max-height:0;transition:max-height 0.4s ease, padding 0.4s ease;padding:0 18px;}
.pd-accordion-body.open{max-height:500px;padding:0 18px 18px;}
.pd-accordion-content{border-top:1px dashed var(--border-mid);padding-top:16px;}

/* Accordion Content Styling */
.pd-accordion-content .pd-desc { font-size: 14px; line-height: 1.8; color: var(--text-body); }
.pd-accordion-content .pd-feat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; color: var(--text-body); }
.pd-accordion-content .pd-feat-item { display: flex; align-items: flex-start; gap: 10px; background: var(--fog); padding: 10px 12px; border-radius: var(--r-md); border: 1px solid var(--border-light); }
.pd-accordion-content .pd-feat-dot { flex-shrink: 0; margin-top: 2px; width: 18px; height: 18px; border-radius: 50%; background: var(--gold-glow); border: 1px solid var(--gold); display: flex; align-items: center; justify-content: center; font-size: 9px; color: var(--gold); font-weight: 700; }
.pd-accordion-content .pd-spec-table { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid var(--border-light); border-radius: var(--r-md); overflow: hidden; }
.pd-accordion-content .pd-spec-table tr:nth-child(even) { background: var(--fog); }
.pd-accordion-content .pd-spec-table td { padding: 12px 14px; border-bottom: 1px solid var(--border-light); color: var(--text-body); }
.pd-accordion-content .pd-spec-table tr:last-child td { border-bottom: none; }
.pd-accordion-content .pd-spec-table td:first-child { color: var(--text-light); font-weight: 600; padding-right: 16px; white-space: nowrap; }
.pd-accordion-content .pd-care-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; color: var(--text-body); }
.pd-accordion-content .pd-care-item { display: flex; align-items: center; gap: 10px; background: var(--fog); padding: 12px; border-radius: var(--r-md); border: 1px solid var(--border-light); }
.pd-accordion-content .pd-care-icon { font-size: 20px; color: var(--gold-light); }
}
*{box-sizing:border-box;margin:0;padding:0;}

.pd{font-family:'Jost',sans-serif;background:var(--mist);min-height:100vh;color:var(--ink);overflow-x:hidden;}

.pd-proof{background:linear-gradient(90deg,#0a0a0a,#1c1c1e,#0a0a0a);color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap;font-size:11px;letter-spacing:0.07em;font-weight:500;}
.pd-proof-pill{display:flex;align-items:center;gap:7px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.22);border-radius:20px;padding:4px 14px;}
.pd-live{width:7px;height:7px;border-radius:50%;background:#D4AF37;animation:pdPulse 1.5s ease-in-out infinite;display:inline-block;}
.pd-countdown{display:flex;align-items:center;gap:6px;background:rgba(192,57,43,0.15);border:1px solid rgba(192,57,43,0.3);border-radius:20px;padding:4px 14px;color:#ff8080;}
.pd-cd-num{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#fff;line-height:1;}
.pd-cd-lbl{font-size:8px;letter-spacing:0.1em;color:rgba(255,255,255,0.45);}
.pd-cd-sep{font-size:13px;font-weight:700;color:#D4AF37;margin:0 2px;padding-bottom:4px;}

.pd-bc{background:var(--cloud);border-bottom:1px solid var(--border-light);padding:12px 0;}
.pd-bc-inner{max-width:1380px;margin:0 auto;padding:0 40px;display:flex;align-items:center;gap:6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-light);flex-wrap:wrap;}
.pd-bc a{color:var(--text-light);text-decoration:none;transition:var(--tr);}
.pd-bc a:hover{color:var(--teal);}
.pd-bc-sep{color:var(--border-mid);}
.pd-bc-cur{color:var(--ash);font-weight:600;}

.pd-shell{max-width:1380px;margin:0 auto;padding:32px 40px 130px;}
.pd-body{display:grid;grid-template-columns:52% 1fr;gap:56px;align-items:start;}

.pd-gallery{position:sticky;top:20px;z-index:50;}
.pd-gal-inner{display:flex;gap:12px;}
.pd-gal-thumbs{display:flex;flex-direction:column;gap:8px;flex-shrink:0;}
.pd-thumb{width:68px;height:82px;border:1.5px solid var(--border-light);border-radius:6px;overflow:hidden;cursor:pointer;background:var(--cloud);transition:var(--tr);}
.pd-thumb:hover{border-color:var(--teal-mid);transform:translateX(3px);}
.pd-thumb.on{border-color:var(--gold);border-width:2px;box-shadow:0 0 0 3px var(--gold-glow);}
.pd-thumb img{width:100%;height:100%;object-fit:cover;}

.pd-main-wrap{flex:1;position:relative;background:var(--cloud);border-radius:var(--r-lg);border:1px solid var(--border-light);box-shadow:var(--sh-md);cursor:crosshair;aspect-ratio:3/4;}
.pd-main-img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;transition:opacity 0.22s ease;border-radius:calc(var(--r-lg) - 1px);background:#fff;}
.pd-main-img.fade{opacity:0;}
.pd-zoom-lens{position:absolute;width:120px;height:120px;border:2px solid var(--gold);border-radius:6px;pointer-events:none;z-index:10;background:rgba(212,175,55,0.07);opacity:0;visibility:hidden;transition:opacity 0.2s ease, visibility 0.2s ease;}
.pd-zoom-panel{position:absolute;left:calc(100% + 28px);top:0;width:100%;height:100%;border:1px solid var(--border-light);border-radius:var(--r-lg);overflow:hidden;background:var(--cloud);box-shadow:var(--sh-lg);z-index:100;pointer-events:none;opacity:0;visibility:hidden;transition:opacity 0.2s ease, visibility 0.2s ease;}
.pd-zoom-panel.fade { opacity: 0 !important; }
.pd-main-wrap:hover .pd-zoom-lens, .pd-main-wrap:hover .pd-zoom-panel, .pd-main-wrap:active .pd-zoom-lens, .pd-main-wrap:active .pd-zoom-panel { opacity: 1; visibility: visible; }

.pd-img-actions{position:absolute;top:14px;right:14px;display:flex;flex-direction:column;gap:8px;z-index:4;}
.pd-img-btn{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);border:1px solid rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:var(--tr);box-shadow:0 2px 12px rgba(0,0,0,0.1);}
.pd-img-btn:hover{transform:scale(1.12);}
.pd-img-btn.wish:hover{border-color:#e11d48;background:#fff4f6;}
.pd-img-btn.wish.on svg{fill:#e11d48;stroke:#e11d48;}
.pd-share-drop{position:absolute;top:48px;right:0;background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-md);box-shadow:var(--sh-md);padding:6px;min-width:160px;z-index:30;}
.pd-share-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;color:var(--ash);transition:var(--tr);}
.pd-share-item:hover{background:var(--fog);color:var(--teal);}

.pd-dots{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:5px;z-index:3;}
.pd-dot{width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,0.2);border:none;cursor:pointer;padding:0;transition:var(--tr);}
.pd-dot.on{background:var(--gold);width:18px;border-radius:3px;}
.pd-badge{position:absolute;top:16px;left:0;background:linear-gradient(135deg,#1A7A4A,#27ae60);color:#fff;font-size:10px;font-weight:800;letter-spacing:0.14em;padding:7px 16px 7px 12px;clip-path:polygon(0 0,100% 0,88% 100%,0 100%);z-index:3;}
.pd-elite-badge{position:absolute;bottom:46px;left:12px;background:linear-gradient(135deg,#B8960C,#D4AF37);color:#fff;font-size:9px;font-weight:700;letter-spacing:0.12em;padding:5px 12px;border-radius:20px;z-index:3;box-shadow:0 3px 14px rgba(184,150,12,0.45);}
.pd-view-strip{display:flex;gap:8px;margin-top:12px;width:100%;justify-content:center;}
.pd-view-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;border:1px solid var(--border-mid);border-radius:var(--r-md);background:var(--cloud);font-family:'Jost',sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-body);cursor:pointer;transition:var(--tr);white-space:nowrap;width:45%;margin:0 auto;}
.pd-view-btn:hover{border-color:var(--teal);color:var(--teal);background:var(--teal-light);}

.pd-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;}
.pd-tag{font-size:10px;letter-spacing:0.12em;text-transform:uppercase;padding:4px 11px;border-radius:20px;font-weight:700;border:1px solid transparent;}
.pd-tag-cat{background:var(--teal-light);color:var(--teal);border-color:rgba(14,119,119,0.25);}
.pd-tag-off{background:var(--green-light);color:var(--green);border-color:rgba(26,122,74,0.25);}
.pd-tag-new{background:rgba(99,102,241,0.08);color:#6366f1;border-color:rgba(99,102,241,0.25);}
.pd-tag-elite{background:linear-gradient(135deg,rgba(212,175,55,0.15),rgba(184,150,12,0.08));color:var(--gold);border-color:rgba(212,175,55,0.35);}
.pd-tag-hot{background:rgba(192,57,43,0.08);color:var(--red);border-color:rgba(192,57,43,0.2);}

.pd-name{font-family:'Playfair Display',serif;font-size:clamp(22px,2.8vw,38px);font-weight:600;line-height:1.15;color:var(--ink);margin-bottom:6px;letter-spacing:-0.01em;}
.pd-brand-row{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
.pd-brand-lbl{font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-light);}
.pd-brand-name{color:var(--teal);font-weight:700;cursor:pointer;transition:var(--tr);}
.pd-brand-name:hover{color:var(--gold);}
.pd-brand-sep{width:1px;height:14px;background:var(--border-mid);}
.pd-pts-pill{display:flex;align-items:center;gap:5px;background:linear-gradient(135deg,rgba(212,175,55,0.12),rgba(184,150,12,0.06));border:1px solid rgba(212,175,55,0.28);border-radius:20px;padding:3px 12px;font-size:10px;font-weight:700;color:var(--gold);letter-spacing:0.06em;text-transform:uppercase;margin-left:auto;}

.pd-rating-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 0;border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light);margin-bottom:20px;}
.pd-stars{display:flex;gap:2px;}
.pd-star{font-size:13px;color:#e0dbd4;}
.pd-star.f{color:#F5A623;}
.pd-star.h{color:#F5A623;opacity:0.5;}
.pd-rnum{font-family:'Playfair Display',serif;font-size:19px;font-weight:700;color:var(--ink);}
.pd-rct{font-size:12px;color:var(--text-light);cursor:pointer;text-decoration:underline;text-underline-offset:2px;}
.pd-rct:hover{color:var(--teal);}
.pd-vbadge{display:flex;align-items:center;gap:4px;background:var(--green-light);color:var(--green);font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.05em;}
.pd-qa-lnk{font-size:11px;color:var(--teal);cursor:pointer;margin-left:auto;font-weight:600;}

.pd-price-card{background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-lg);padding:20px 22px;margin-bottom:20px;position:relative;overflow:hidden;box-shadow:var(--sh-xs);}
.pd-price-card::before{content:'';position:absolute;top:0;left:0;width:4px;height:100%;background:linear-gradient(180deg,#B8960C,#D4AF37,#B8960C);}
.pd-price-top{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:4px;}
.pd-price-main{font-family:'Playfair Display',serif;font-size:38px;font-weight:700;color:var(--ink);line-height:1;}
.pd-price-mrp{font-size:17px;color:var(--text-light);text-decoration:line-through;}
.pd-price-off-pill{background:linear-gradient(135deg,#1A7A4A,#27ae60);color:#fff;font-size:11px;font-weight:800;padding:4px 12px;border-radius:20px;letter-spacing:0.06em;}
.pd-price-inc{font-size:11px;color:var(--text-light);margin-top:4px;}
.pd-price-lowest{display:inline-flex;align-items:center;gap:5px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);color:#6366f1;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;margin-top:8px;letter-spacing:0.04em;}
.pd-coupon-applied{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--green);font-weight:700;margin-top:10px;}

.pd-urgency{margin-bottom:18px;}
.pd-urgency-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;}
.pd-urgency-lbl{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:var(--red);}
.pd-urgency-live{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-light);}
.pd-urgency-bar{height:6px;background:var(--border-light);border-radius:10px;overflow:hidden;}
.pd-urgency-fill{height:100%;background:linear-gradient(90deg,var(--red),#e74c3c);border-radius:10px;}

.pd-hls{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;}
.pd-hl{display:flex;align-items:center;gap:6px;background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-md);padding:7px 12px;font-size:11px;font-weight:600;color:var(--text-body);box-shadow:var(--sh-xs);}
.pd-div{height:1px;background:linear-gradient(90deg,transparent,var(--border-mid),transparent);margin:16px 0;border:none;}

.pd-sel-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
.pd-sel-lbl{font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--text-light);font-weight:700;}
.pd-sel-val{font-size:13px;font-weight:600;color:var(--ink);}
.pd-colors{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px;}
.pd-col-sw{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;}
.pd-swatch{width:34px;height:34px;border-radius:50%;border:2.5px solid transparent;outline:1.5px solid rgba(0,0,0,0.12);transition:var(--tr);}
.pd-swatch.on{border-color:var(--gold);outline-color:var(--gold);box-shadow:0 0 0 3px var(--gold-glow);transform:scale(1.14);}
.pd-swatch:hover{transform:scale(1.1);}
.pd-col-name{font-size:9px;color:var(--text-light);letter-spacing:0.04em;text-transform:capitalize;}

.pd-size-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.pd-sz-guide{font-size:11px;color:var(--teal);cursor:pointer;font-weight:600;border:none;background:none;font-family:'Jost',sans-serif;letter-spacing:0.04em;}
.pd-sz-guide:hover{color:var(--gold);}
.pd-sizes{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;}
.pd-sz{min-width:52px;height:48px;padding:0 14px;border:1.5px solid var(--border-mid);border-radius:6px;background:var(--cloud);color:var(--ash);font-family:'Jost',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:var(--tr);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;}
.pd-sz:hover{border-color:var(--teal);color:var(--teal);background:var(--teal-light);}
.pd-sz.on{border-color:var(--ink);background:var(--ink);color:#fff;box-shadow:0 6px 18px rgba(10,10,10,0.2);}
.pd-sz-sub{font-size:8px;opacity:0.65;letter-spacing:0.04em;}
.pd-finder-link{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-light);cursor:pointer;margin-bottom:18px;}

.pd-qty-row{display:flex;align-items:center;gap:20px;margin-bottom:22px;}
.pd-qty-lbl{font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--text-light);font-weight:700;}
.pd-qty-ctrl{display:flex;align-items:center;border:1.5px solid var(--border-mid);border-radius:6px;overflow:hidden;background:var(--cloud);}
.pd-qty-btn{width:44px;height:44px;border:none;background:transparent;font-size:20px;color:var(--text-body);cursor:pointer;transition:var(--tr);display:flex;align-items:center;justify-content:center;}
.pd-qty-btn:hover:not(:disabled){background:var(--ink);color:#fff;}
.pd-qty-btn:disabled{opacity:0.25;cursor:not-allowed;}
.pd-qty-num{width:56px;text-align:center;font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:var(--ink);height:44px;display:flex;align-items:center;justify-content:center;border-left:1px solid var(--border-light);border-right:1px solid var(--border-light);user-select:none;}
.pd-qty-note{font-size:11px;color:var(--text-light);}

.pd-alert{display:flex;align-items:center;gap:8px;background:rgba(192,57,43,0.06);border:1px solid rgba(192,57,43,0.2);border-radius:8px;padding:11px 14px;font-size:12px;color:var(--red);margin-bottom:16px;}

.pd-cta{display:flex;flex-direction:column;gap:10px;margin-bottom:22px;}
.pd-cta-main{display:grid;grid-template-columns:1fr auto;gap:10px;}
.pd-btn-cart{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--ink);color:#fff;border:none;border-radius:6px;padding:17px 28px;font-family:'Jost',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;cursor:pointer;transition:var(--tr);position:relative;overflow:hidden;}
.pd-btn-cart::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--gold),var(--gold-light),var(--gold));transform:scaleX(0);transition:transform 0.3s ease;}
.pd-btn-cart:hover{background:var(--charcoal);transform:translateY(-2px);box-shadow:0 12px 32px rgba(10,10,10,0.25);}
.pd-btn-cart:hover::after{transform:scaleX(1);}
.pd-btn-buy{display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#B8960C 0%,#D4AF37 50%,#B8960C 100%);background-size:200% 100%;color:var(--ink);border:none;border-radius:6px;padding:17px 28px;font-family:'Jost',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;cursor:pointer;transition:var(--tr);box-shadow:0 4px 20px rgba(184,150,12,0.3);}
.pd-btn-buy:hover{background-position:right center;transform:translateY(-2px);box-shadow:0 12px 36px rgba(184,150,12,0.42);}
.pd-btn-wish{display:flex;align-items:center;justify-content:center;gap:7px;background:transparent;color:var(--text-body);border:1.5px solid var(--border-mid);border-radius:6px;padding:14px 18px;font-family:'Jost',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:var(--tr);white-space:nowrap;}
.pd-btn-wish:hover,.pd-btn-wish.on{border-color:#e11d48;color:#e11d48;background:rgba(225,29,72,0.05);}
.pd-btn-notify{display:flex;align-items:center;justify-content:center;gap:7px;background:transparent;color:var(--teal);border:1.5px solid var(--teal);border-radius:6px;padding:12px;font-family:'Jost',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;transition:var(--tr);}
.pd-btn-notify:hover{background:var(--teal-light);}

.pd-coupon{background:var(--cloud);border:1px dashed rgba(212,175,55,0.5);border-radius:var(--r-lg);padding:16px 18px;margin-bottom:18px;}
.pd-coupon-head{display:flex;align-items:center;gap:8px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-light);font-weight:700;margin-bottom:12px;}
.pd-coupon-row{display:flex;gap:8px;}
.pd-coupon-inp{flex:1;border:1.5px solid var(--border-mid);border-radius:6px;padding:10px 14px;font-family:'Jost',sans-serif;font-size:13px;color:var(--ink);outline:none;background:var(--fog);letter-spacing:0.08em;text-transform:uppercase;transition:var(--tr);}
.pd-coupon-inp:focus{border-color:var(--gold);background:#fff;box-shadow:0 0 0 3px var(--gold-glow);}
.pd-coupon-apply{background:var(--gold);color:var(--ink);border:none;border-radius:6px;padding:10px 18px;font-family:'Jost',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:var(--tr);white-space:nowrap;}
.pd-coupon-apply:hover{background:var(--gold-light);}
.pd-coupon-msg{font-size:11px;color:var(--green);margin-top:8px;font-weight:600;}
.pd-coupon-msg.err{color:var(--red);}
.pd-coupon-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px;}
.pd-coupon-chip{font-size:10px;border:1px dashed var(--border-mid);border-radius:5px;padding:4px 10px;color:var(--text-body);cursor:pointer;transition:var(--tr);font-weight:600;letter-spacing:0.06em;}
.pd-coupon-chip:hover{border-color:var(--gold);color:var(--gold);background:var(--gold-glow);}

.pd-offers{margin-bottom:18px;}
.pd-offers-title{font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--text-light);font-weight:700;margin-bottom:10px;}
.pd-offer-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.pd-offer-card{display:flex;align-items:flex-start;gap:10px;background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-md);padding:12px 14px;font-size:11px;color:var(--text-body);line-height:1.5;transition:var(--tr);}
.pd-offer-card:hover{border-color:var(--border-mid);box-shadow:var(--sh-xs);}
.pd-offer-icon{font-size:18px;flex-shrink:0;}
.pd-offer-title{font-size:10px;font-weight:700;color:var(--ink);letter-spacing:0.04em;margin-bottom:2px;}
.pd-offer-code{font-weight:700;color:var(--teal);}

.pd-emi{background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-lg);padding:14px 18px;margin-bottom:18px;}
.pd-emi-head{display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;}
.pd-emi-title{display:flex;align-items:center;gap:8px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-light);font-weight:700;}
.pd-emi-chev{font-size:13px;transition:transform 0.3s ease;color:var(--text-light);}
.pd-emi-chev.up{transform:rotate(180deg);}
.pd-emi-body{overflow:hidden;max-height:0;transition:max-height 0.4s ease;}
.pd-emi-body.open{max-height:320px;}
.pd-emi-table{width:100%;margin-top:14px;border-collapse:collapse;font-size:12px;}
.pd-emi-table th{text-align:left;padding:7px 10px;background:var(--fog);color:var(--text-light);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;}
.pd-emi-table td{padding:8px 10px;border-bottom:1px solid var(--border-light);color:var(--text-body);}
.pd-emi-table tr:last-child td{border-bottom:none;}
.pd-emi-hl{color:var(--teal);font-weight:700;}

.pd-delivery{background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-lg);padding:16px 18px;margin-bottom:18px;}
.pd-del-head{display:flex;align-items:center;gap:8px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-light);font-weight:700;margin-bottom:14px;}
.pd-del-row{display:flex;gap:8px;}
.pd-pin-inp{flex:1;border:1.5px solid var(--border-mid);border-radius:6px;padding:11px 14px;font-family:'Jost',sans-serif;font-size:14px;color:var(--ink);outline:none;background:var(--fog);transition:var(--tr);}
.pd-pin-inp:focus{border-color:var(--teal);background:#fff;box-shadow:0 0 0 3px var(--teal-light);}
.pd-pin-btn{background:var(--teal);color:#fff;border:none;border-radius:6px;padding:11px 20px;font-family:'Jost',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:var(--tr);white-space:nowrap;}
.pd-pin-btn:hover{background:var(--teal-mid);}
.pd-del-msg{font-size:12px;color:var(--green);margin-top:10px;font-weight:600;}
.pd-del-msg.err{color:var(--red);}
.pd-del-timeline{display:flex;align-items:flex-start;margin-top:18px;}
.pd-del-step{flex:1;text-align:center;position:relative;}
.pd-del-step::before{content:'';position:absolute;top:14px;left:50%;width:100%;height:2px;background:var(--border-mid);}
.pd-del-step:last-child::before{display:none;}
.pd-del-dot{width:28px;height:28px;border-radius:50%;background:var(--green-light);border:2px solid var(--green);display:flex;align-items:center;justify-content:center;font-size:11px;margin:0 auto 6px;position:relative;z-index:1;}
.pd-del-step-lbl{font-size:10px;color:var(--text-body);font-weight:600;}
.pd-del-step-sub{font-size:9px;color:var(--text-light);margin-top:2px;}

.pd-gift{background:linear-gradient(135deg,rgba(212,175,55,0.06),rgba(14,119,119,0.04));border:1px solid rgba(212,175,55,0.25);border-radius:var(--r-lg);padding:14px 18px;margin-bottom:18px;}
.pd-gift-head{display:flex;align-items:center;gap:8px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-light);font-weight:700;margin-bottom:12px;}
.pd-gift-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.pd-gift-opt{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1.5px solid var(--border-mid);border-radius:var(--r-md);cursor:pointer;font-size:12px;color:var(--text-body);background:var(--cloud);transition:var(--tr);user-select:none;}
.pd-gift-opt:hover,.pd-gift-opt.on{border-color:var(--gold);background:var(--gold-glow);font-weight:600;}

.pd-pricedrop{display:flex;align-items:center;justify-content:space-between;background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.18);border-radius:var(--r-md);padding:12px 16px;margin-bottom:18px;gap:12px;flex-wrap:wrap;}
.pd-pricedrop-text{font-size:12px;color:var(--text-body);}
.pd-pricedrop-btn{font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6366f1;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:20px;padding:5px 14px;cursor:pointer;transition:var(--tr);font-family:'Jost',sans-serif;}
.pd-pricedrop-btn:hover{background:rgba(99,102,241,0.18);}

.pd-trust{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:22px;}
.pd-trust-item{display:flex;flex-direction:column;align-items:center;gap:5px;padding:14px 6px;background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-md);text-align:center;transition:var(--tr);}
.pd-trust-item:hover{box-shadow:var(--sh-sm);transform:translateY(-2px);}
.pd-trust-icon{font-size:22px;}
.pd-trust-lbl{font-size:9px;letter-spacing:0.04em;text-transform:uppercase;color:var(--text-light);font-weight:700;line-height:1.4;}
.pd-trust-sub{font-size:8px;color:var(--text-light);opacity:0.65;}

.pd-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(16px);background:var(--charcoal);color:#fff;padding:13px 26px;border-radius:40px;font-size:13px;font-weight:500;letter-spacing:0.03em;opacity:0;transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1);pointer-events:none;z-index:9999;white-space:nowrap;box-shadow:0 8px 32px rgba(0,0,0,0.3);}
.pd-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

.pd-sticky{position:fixed;bottom:0;left:0;right:0;background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);border-top:1px solid var(--border-light);box-shadow:0 -8px 32px rgba(0,0,0,0.1);z-index:200;padding:14px 40px;display:flex;align-items:center;gap:20px;transform:translateY(100%);transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);}
.pd-sticky.show{transform:translateY(0);}
.pd-sticky-info{display:flex;align-items:center;gap:14px;flex:1;min-width:0;}
.pd-sticky-img{width:48px;height:58px;object-fit:cover;border-radius:6px;border:1px solid var(--border-light);}
.pd-sticky-name{font-size:13px;font-weight:700;color:var(--ink);}
.pd-sticky-price{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--ink);}
.pd-sticky-btns{display:flex;gap:10px;}
.pd-sticky-cart{display:flex;align-items:center;gap:7px;background:var(--ink);color:#fff;border:none;border-radius:6px;padding:12px 22px;font-family:'Jost',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;transition:var(--tr);}
.pd-sticky-buy{display:flex;align-items:center;gap:7px;background:linear-gradient(135deg,var(--gold),var(--gold-light));color:var(--ink);border:none;border-radius:6px;padding:12px 22px;font-family:'Jost',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;transition:var(--tr);}

.pd-bottom{margin-top:56px;}
.pd-tabs{display:flex;border-bottom:2px solid var(--border-light);gap:0;flex-wrap:wrap;margin-bottom:36px;}
.pd-tab{padding:14px 22px;border:none;background:transparent;font-family:'Jost',sans-serif;font-size:12px;font-weight:700;color:var(--text-light);cursor:pointer;letter-spacing:0.1em;text-transform:uppercase;transition:var(--tr);position:relative;white-space:nowrap;}
.pd-tab::after{content:'';position:absolute;bottom:-2px;left:16px;right:16px;height:2px;background:var(--gold);transform:scaleX(0);transition:transform 0.3s ease;}
.pd-tab.on{color:var(--ink);}
.pd-tab.on::after{transform:scaleX(1);}
.pd-tab-body{max-width:920px;margin:0 auto;}
.pd-desc{font-size:15px;line-height:1.95;color:var(--text-body);}
.pd-feat-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.pd-feat-item{display:flex;align-items:flex-start;gap:12px;background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-md);padding:14px 16px;font-size:13px;color:var(--text-body);line-height:1.6;transition:var(--tr);}
.pd-feat-item:hover{box-shadow:var(--sh-xs);}
.pd-feat-dot{width:20px;height:20px;border-radius:50%;background:var(--gold-glow);border:1.5px solid var(--gold);display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--gold);flex-shrink:0;margin-top:2px;}
.pd-spec-table{width:100%;border-collapse:collapse;font-size:13px;border:1px solid var(--border-light);border-radius:var(--r-md);overflow:hidden;}
.pd-spec-table tr:nth-child(even){background:var(--fog);}
.pd-spec-table td{padding:12px 18px;border-bottom:1px solid var(--border-light);color:var(--text-body);}
.pd-spec-table td:first-child{color:var(--text-light);font-weight:700;letter-spacing:0.04em;width:36%;font-size:11px;text-transform:uppercase;}
.pd-spec-table tr:last-child td{border-bottom:none;}
.pd-care-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.pd-care-item{display:flex;align-items:flex-start;gap:12px;background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-md);padding:14px 16px;font-size:13px;color:var(--text-body);line-height:1.5;}
.pd-care-icon{font-size:18px;flex-shrink:0;}

.pd-qa-list{display:grid;gap:14px;}
.pd-qa-item{background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-lg);padding:18px 22px;transition:var(--tr);}
.pd-qa-item:hover{box-shadow:var(--sh-sm);}
.pd-qa-q{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:10px;display:flex;align-items:flex-start;gap:10px;}
.pd-qa-a{font-size:13px;color:var(--text-body);line-height:1.7;padding-left:26px;}
.pd-qa-footer{display:flex;align-items:center;gap:10px;margin-top:12px;padding-left:26px;font-size:11px;color:var(--text-light);}
.pd-qa-helpful{color:var(--teal);cursor:pointer;font-weight:600;}
.pd-qa-ask{display:flex;align-items:center;gap:10px;margin-top:28px;background:var(--fog);border:1px solid var(--border-light);border-radius:var(--r-lg);padding:16px 20px;}
.pd-qa-ask-inp{flex:1;border:none;background:transparent;font-family:'Jost',sans-serif;font-size:13px;color:var(--ink);outline:none;}
.pd-qa-ask-inp::placeholder{color:var(--text-light);}
.pd-qa-ask-btn{background:var(--teal);color:#fff;border:none;border-radius:6px;padding:10px 18px;font-family:'Jost',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;transition:var(--tr);}
.pd-qa-ask-btn:hover{background:var(--teal-mid);}

.pd-fbt{background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-xl);padding:40px;margin-top:56px;box-shadow:var(--sh-md);text-align:center;}
.pd-fbt-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--ink);margin-bottom:6px;}
.pd-fbt-sub{font-size:14px;color:var(--text-light);margin-bottom:32px;}
.pd-fbt-row{display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap;}
.pd-fbt-product{display:flex;flex-direction:column;align-items:center;gap:12px;width:150px;text-align:center;}
.pd-fbt-img-wrap{position:relative;width:100%;aspect-ratio:3/4;border-radius:12px;overflow:hidden;border:1px solid var(--border-light);box-shadow:var(--sh-sm);}
.pd-fbt-img{width:100%;height:100%;object-fit:cover;transition:var(--tr);}
.pd-fbt-product:hover .pd-fbt-img{transform:scale(1.08);}
.pd-fbt-badge{position:absolute;top:8px;left:8px;background:linear-gradient(135deg,#111,#2a2a2a);color:var(--gold);border:1px solid rgba(212,175,55,0.4);font-size:9px;font-weight:800;padding:4px 8px;border-radius:4px;letter-spacing:1px;z-index:2;}
.pd-fbt-info{display:flex;flex-direction:column;gap:4px;width:100%;}
.pd-fbt-brand{font-size:10px;color:var(--gold);text-transform:uppercase;letter-spacing:0.15em;font-weight:800;}
.pd-fbt-name{font-size:13px;color:var(--ink);line-height:1.4;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.pd-fbt-price-row{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:2px;}
.pd-fbt-price{font-size:15px;font-weight:800;color:var(--teal);}
.pd-fbt-mrp{font-size:12px;color:var(--text-light);text-decoration:line-through;}
.pd-fbt-plus{font-size:32px;color:var(--gold);font-weight:300;}
.pd-fbt-total{margin:32px auto 0;max-width:320px;text-align:center;background:linear-gradient(135deg,rgba(212,175,55,0.06),rgba(212,175,55,0.02));border:1px solid rgba(212,175,55,0.3);border-radius:var(--r-lg);padding:24px 32px;box-shadow:var(--sh-sm);}
.pd-fbt-total-lbl{font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:var(--text-light);font-weight:700;}
.pd-fbt-total-price{font-family:'Playfair Display',serif;font-size:32px;font-weight:700;color:var(--ink);margin:8px 0 4px;}
.pd-fbt-total-save{font-size:13px;color:var(--green);font-weight:700;}
.pd-fbt-btn-wrap{text-align:center;margin-top:24px;}
.pd-fbt-btn{background:var(--ink);color:#fff;border:none;border-radius:8px;padding:16px 36px;font-family:'Jost',sans-serif;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;cursor:pointer;transition:var(--tr);box-shadow:0 8px 24px rgba(10,10,10,0.15);}
.pd-fbt-btn:hover{background:var(--charcoal);transform:translateY(-2px);box-shadow:0 12px 32px rgba(10,10,10,0.25);}

.pd-overlay{position:fixed;inset:0;background:rgba(10,10,10,0.55);backdrop-filter:blur(6px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;animation:pdFade 0.2s ease;}
@keyframes pdFade{from{opacity:0}to{opacity:1}}
.pd-modal{background:var(--cloud);border-radius:var(--r-xl);max-width:580px;width:100%;max-height:82vh;overflow-y:auto;padding:36px;animation:pdSlide 0.3s ease;}
@keyframes pdSlide{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.pd-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:26px;}
.pd-modal-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--ink);}
.pd-modal-close{width:34px;height:34px;border-radius:50%;border:1px solid var(--border-light);background:var(--fog);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--text-light);transition:var(--tr);}
.pd-modal-close:hover{background:var(--border-light);color:var(--ink);}
.pd-sz-table-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
.pd-sz-table{width:100%;border-collapse:collapse;font-size:13px;}
.pd-sz-table th{background:var(--ink);color:#fff;padding:11px 14px;text-align:center;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;white-space:nowrap;}
.pd-sz-table td{padding:10px 14px;text-align:center;border-bottom:1px solid var(--border-light);color:var(--text-body);white-space:nowrap;}
.pd-sz-table tr:nth-child(even) td{background:var(--fog);}
.pd-sz-hint{font-size:12px;color:var(--text-light);margin-top:18px;line-height:1.8;background:var(--fog);border-radius:var(--r-md);padding:14px 16px;}
.pd-finder-row{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
.pd-finder-lbl{font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light);font-weight:700;}
.pd-finder-inp{border:1.5px solid var(--border-mid);border-radius:6px;padding:11px 14px;font-family:'Jost',sans-serif;font-size:14px;color:var(--ink);outline:none;background:var(--fog);transition:var(--tr);}
.pd-finder-inp:focus{border-color:var(--teal);background:#fff;box-shadow:0 0 0 3px var(--teal-light);}
.pd-finder-result{background:linear-gradient(135deg,rgba(14,119,119,0.08),rgba(26,122,74,0.06));border:1px solid rgba(14,119,119,0.2);border-radius:var(--r-md);padding:16px;text-align:center;font-size:15px;color:var(--teal);font-weight:700;margin-top:14px;}

@keyframes pdPulse{0%,100%{opacity:1}50%{opacity:0.4}}

@media(max-width:1100px){
  .pd-body{grid-template-columns:1fr;gap:32px;}
  .pd-gallery{position:relative;top:auto;z-index:1;}
  .pd-gal-thumbs{display:none;}
  .pd-zoom-panel{left:0;}
  .pd-offer-grid{grid-template-columns:1fr;}
  .pd-rev-section{grid-template-columns:1fr;}
  .pd-fbt-total{display:none;}
}
@media(max-width:768px){
  .pd-shell{padding:20px 16px 130px;}
  .pd-bc-inner{padding:0 16px;}
  .pd-trust{grid-template-columns:repeat(2,1fr);}
  .pd-feat-grid{grid-template-columns:1fr;}
  .pd-care-grid{grid-template-columns:1fr;}
  .pd-gift-opts{grid-template-columns:1fr;}
  .pd-proof{gap:10px;font-size:10px;}
  .pd-sticky{padding:12px 16px;}
  .pd-zoom-lens, .pd-zoom-panel { display: none !important; }
  .pd-view-strip{gap:8px;flex-wrap:wrap;}
  .pd-view-btn{font-size:10px;padding:8px 12px;letter-spacing:0.04em;gap:5px;flex-grow:1;}
}
@media(max-width:500px){
  .pd-modal { padding: 20px 16px; }
  .pd-modal-title { font-size: 18px; }
  .pd-sz-table th, .pd-sz-table td { padding: 8px 10px; font-size: 11px; }
}
`;

/* ─── Sub-components ───────────────────────────────────────────────────────── */
function Stars({ rating, size = 13 }) {
  return (
    <div className="pd-stars">
      {[1,2,3,4,5].map(s => (
        <span key={s} className={`pd-star${s<=Math.floor(rating)?' f':s-0.5<=rating?' h':''}`} style={{ fontSize: size }}>★</span>
      ))}
    </div>
  );
}

function Countdown({ end }) {
  const [diff, setDiff] = useState(Math.max(0, Math.floor((end - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setDiff(d => Math.max(0, d - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  return (
    <div className="pd-countdown">
      🔥 Sale ends in&nbsp;
      {[h,m,s].map((v,i) => (
        <React.Fragment key={i}>
          <span style={{ display:'inline-flex',flexDirection:'column',alignItems:'center' }}>
            <span className="pd-cd-num">{v}</span>
            <span className="pd-cd-lbl">{['hr','min','sec'][i]}</span>
          </span>
          {i < 2 && <span className="pd-cd-sep">:</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────────────────── */
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { membershipType } = useMembership();

  const cartState = useSelector(state => state.CartStateData) || { items: [] };
  const wishlist = useSelector(state => state.WishlistStateData) || [];
  const cartItems = Array.isArray(cartState.items) ? cartState.items : (Array.isArray(cartState) ? cartState : []);

  const { data: allProductsData = [], isLoading: allProductsLoading } = useProductsQuery();
  const { data: productData, isLoading: productLoading, error: productError } = useProductQuery(id);
  const allProducts = Array.isArray(allProductsData) ? allProductsData : [];

  const [p, setp] = useState(null);
  const [mainImg, setMainImg]           = useState('');
  const [imgFade, setImgFade]           = useState(false);
  const [selColor, setSelColor]         = useState('');
  const [selSize, setSelSize]           = useState('');
  const [qty, setQty]                   = useState(1);
  const [wishlisted, setWishlisted]     = useState(false);
  const [valErr, setValErr]             = useState('');
  const [pin, setPin]                   = useState('');
  const [delMsg, setDelMsg]             = useState('');
  const [delErr, setDelErr]             = useState(false);
  const [delOk, setDelOk]               = useState(false);
  const [toast, setToast]               = useState('');
  const [toastVis, setToastVis]         = useState(false);  const [tab, setTab]                   = useState('reviews');
  const [sizeModal, setSizeModal]       = useState(false);
  const [videoModal, setVideoModal]     = useState(false);
  const [view360Modal, setView360Modal] = useState(false);
  const [szUnit, setSzUnit]             = useState('in');
  const [rotY, setRotY]                 = useState(0);
  const [dragStartX, setDragStartX]     = useState(0);
  const [isDragging360, setIsDragging360] = useState(false);
  const [finderModal, setFinderModal]   = useState(false);
  const [emiOpen, setEmiOpen]           = useState(false);
  const [openAccordion, setOpenAccordion] = useState('details');
  const [coupon, setCoupon]             = useState('');
  const [couponMsg, setCouponMsg]       = useState('');
  const [couponErr, setCouponErr]       = useState(false);
  const [appliedCouponData, setAppliedCouponData] = useState(null);
  const [couponsList, setCouponsList]   = useState([]);
  const [stickyVis, setStickyVis]       = useState(false);
  const [giftWrap, setGiftWrap]         = useState(false);
  const [giftMsg, setGiftMsg]           = useState(false);
  const [finderMeasure, setFinderMeasure] = useState('');
  const [finderResult, setFinderResult] = useState('');
  const [reviewStats, setReviewStats]   = useState({ count: 0, average: 0 });
  const [viewCount]                     = useState(Math.floor(Math.random() * 14) + 5);
  const [boughtCount]                   = useState(Math.floor(Math.random() * 180) + 70);
  const saleEnd = useRef(Date.now() + 4 * 3600_000 + 27 * 60_000).current;

  // Ensure Details accordion is always open by default when a product loads
  useEffect(() => {
    setOpenAccordion('details');
  }, [id]);

  const ctaRef     = useRef(null);
  const toastTmr   = useRef(null);
  const imgWrapRef = useRef(null);
  const lensRef    = useRef(null);
  const zoomRef    = useRef(null);

  // ─── Data Fetching ───
  useEffect(() => {
    const userId = localStorage.getItem('userid');
    const isLoggedIn = localStorage.getItem('login') === 'true';
    if (userId && isLoggedIn) {
      dispatch(getCart());
      dispatch(getWishlist());
    }

    // Fetch real coupons from DB
    axios.get(`${BASE_URL}/coupon`)
      .then(res => {
        if (Array.isArray(res.data)) {
          setCouponsList(res.data.filter(c => c.isActive));
        }
      })
      .catch(err => console.log('Failed to fetch coupons', err));
  }, [dispatch]);

  useEffect(() => {
      const el = document.createElement('style');
      el.setAttribute('data-pdx','1');
      el.textContent = STYLES;
      document.head.appendChild(el);
      return () => { try { document.head.removeChild(el); } catch(_) {} };
    }, []);

    useEffect(() => {
      // Instant display: try Redux cached products first (already loaded by CatalogQueryBridge)
      if (!p && !productData && allProducts.length > 0 && id) {
        const cached = allProducts.find(item => String(item._id || item.id) === String(id));
        if (cached) {
          setp(cached);
          setMainImg(cached.pic1 || '/assets/images/noimage.png');
          if (cached.size && typeof cached.size === 'string') setSelSize(cached.size.split(',')[0]?.trim() || '');
          if (cached.color && typeof cached.color === 'string') setSelColor(cached.color.split(',')[0]?.trim() || '');
        }
      }
    }, [allProducts, id, p, productData]);

    useEffect(() => {
      if (productLoading) return;

      if (productData) {
        setp(productData);
        setMainImg(productData.pic1 || '/assets/images/noimage.png');
        if (productData.size && typeof productData.size === 'string') setSelSize(productData.size.split(',')[0]?.trim() || '');
        if (productData.color && typeof productData.color === 'string') setSelColor(productData.color.split(',')[0]?.trim() || '');
        return;
      }

      if (productError || (!allProductsLoading && !productData)) {
        setp({ notFound: true });
      }
    }, [productData, productLoading, productError, allProductsLoading]);

    

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setStickyVis(!e.isIntersecting), { threshold:0 });
    if (ctaRef.current) obs.observe(ctaRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (p && !p.notFound && wishlist.length > 0) {
       const userId = localStorage.getItem('userid');
       const isWl = wishlist.some(item => String(item.productid?._id || item.productid || item.product?._id || item.product || item.productId) === String(p.id || p._id));
       setWishlisted(isWl);
    }
  }, [wishlist, p]);

  useEffect(() => () => { if (toastTmr.current) clearTimeout(toastTmr.current); }, []);

  function toast_(msg) {
    setToast(msg); setToastVis(true);
    if (toastTmr.current) clearTimeout(toastTmr.current);
    toastTmr.current = setTimeout(() => setToastVis(false), 2800);
  }

  // Auto-remove coupon if quantity decreases and subtotal drops below minCartValue
  useEffect(() => {
    if (appliedCouponData && p) {
      const baseFinal = Number(p.finalprice || p.price || 0);
      const curDiscountedPrice = membershipType === 'Elite' ? Math.round(baseFinal * 0.9) : baseFinal;
      const totalCartVal = curDiscountedPrice * qty;
      if (appliedCouponData.minCartValue && totalCartVal < appliedCouponData.minCartValue) {
          setCouponErr(true);
          setCouponMsg(`Coupon removed: Min order value of ₹${appliedCouponData.minCartValue} required.`);
          setAppliedCouponData(null);
      }
    }
  }, [qty, p, appliedCouponData, membershipType]);

  // ─── Actions ───
  function handleAddToCart() {
    const userId = localStorage.getItem('userid');
    if (!userId) { navigate('/login', { state: { from: location.pathname } }); return; }
    if (!selSize && p?.size) { setValErr('Please select a size.'); return; }
    setValErr('');
    
    const elitePrice = membershipType === 'Elite' ? Math.round(Number(p.finalprice || 0) * 0.9) : Number(p.finalprice || 0);

    const existing = cartItems.find(item => {
      const cartProdId = item.productid?._id || item.productid?.id || item.productid || item.product?._id || item.product || item.productId;
      return String(cartProdId) === String(p.id || p._id) && String(item.size || '') === String(selSize) && String(item.color || '') === String(selColor);
    });

    if (existing) {
       toast_('Product already in cart. Proceed to checkout.');
       navigate('/cart');
       return;
    }

    dispatch(addCart({
       userId,
       productId: p.id || p._id,
       quantity: Number(qty),
       price: elitePrice,
       size: selSize,
       color: selColor,
       name: p.name,
       pic: p.pic1 || p.pic || ''
    }));
     // success toast will be shown by saga-confirmation via ToastEventBridge
    dispatch(getCart());
  }

  function handleBuyNow() {
    if (!selSize && p?.size) { setValErr('Please select a size.'); return; }
    setValErr('');
    const userId = localStorage.getItem('userid');
    if (!userId) { navigate('/login', { state: { from: location.pathname } }); return; }
    
    const baseFinal = Number(p.finalprice || p.price || 0);
    const elitePrice = membershipType === 'Elite' ? Math.round(baseFinal * 0.9) : baseFinal;
    let subtotal = elitePrice * Number(qty);
    let discountAmt = 0;
    
    if (appliedCouponData) {
        if (appliedCouponData.type === 'percent') {
            discountAmt = Math.round((subtotal * appliedCouponData.value) / 100);
            if (appliedCouponData.maxDiscount > 0 && discountAmt > appliedCouponData.maxDiscount) discountAmt = appliedCouponData.maxDiscount;
        } else {
            discountAmt = appliedCouponData.value;
        }
    }

    const productForDirectCheckout = {
        productid: p.id || p._id,
        name: p.name,
        price: elitePrice,
        quantity: Number(qty),
        size: selSize,
        color: selColor,
        pic: p.pic1 || p.pic || '',
        total: subtotal,
        couponCode: appliedCouponData?.code || '',
        couponDiscount: discountAmt,
        giftWrap: giftWrap,
        giftMsg: giftMsg,
        finalPayable: Math.max(0, subtotal - discountAmt + (giftWrap ? 99 : 0))
    };
    
    sessionStorage.setItem('directCheckoutProduct', JSON.stringify(productForDirectCheckout));
    toast_('Proceeding to checkout…');
    navigate('/checkout', { state: { direct: true } });
  }

  function handleWishlistToggle() {
    const userId = localStorage.getItem('userid');
    if (!userId) { navigate('/login', { state: { from: location.pathname } }); return; }
    
    if (wishlisted) {
      const existing = wishlist.find(item => String(item.productid?._id || item.productid || item.product) === String(p.id || p._id));
      if (existing) { dispatch(deleteWishlist({ id: existing.id || existing._id })); }
      setWishlisted(false);
    } else {
        dispatch(addWishlist({ productid: p.id || p._id, userid: userId, name: p.name, color: selColor, size: selSize, price: Number(p.finalprice || 0), pic: p.pic1 || p.pic || '' }));
        // wishlist success handled by saga events
       setWishlisted(true);
    }
  }

  function handleShare() {
    if (!p) return;
    const shareUrl = window.location.href;
    const shareTitle = p.name || 'Eshopper Premium Product';
    const shareText = `Check out this amazing product: ${shareTitle} at Eshopper Boutique Luxe!`;

    if (navigator.share) {
      navigator.share({ title: shareTitle, text: shareText, url: shareUrl }).catch(() => {});
    } else {
      // Fallback for desktop browsers: copy link to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
          toast_('Link copied! You can now share it.');
      }).catch(() => {
          toast_('Sharing not supported on this browser.');
      });
    }
  }

  function switchImg(url) {
    if (url === mainImg) return;
    setImgFade(true);
    setTimeout(() => { setMainImg(url); setImgFade(false); }, 220);
  }

  function handleMouseMove(e) {
    if (window.innerWidth <= 768) return; // Disable zoom processing on mobile
    const wrap = imgWrapRef.current, lens = lensRef.current, zoom = zoomRef.current;
    if (!wrap || !lens || !zoom) return;

    const rect = wrap.getBoundingClientRect();
    const ZOOM_LEVEL = 2.5;
    const lw = rect.width / ZOOM_LEVEL;
    const lh = rect.height / ZOOM_LEVEL;

    lens.style.width = `${lw}px`;
    lens.style.height = `${lh}px`;
    
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    let x = clientX - rect.left - lw/2, y = clientY - rect.top - lh/2;
    x = Math.max(0, Math.min(x, rect.width - lw));
    y = Math.max(0, Math.min(y, rect.height - lh));
    lens.style.left = `${x}px`;
    lens.style.top = `${y}px`;

    zoom.style.backgroundImage    = `url("${mainImg}")`;
    zoom.style.backgroundSize     = `${rect.width * ZOOM_LEVEL}px ${rect.height * ZOOM_LEVEL}px`;
    zoom.style.backgroundPosition = `-${x * ZOOM_LEVEL}px -${y * ZOOM_LEVEL}px`;
    zoom.style.backgroundRepeat   = 'no-repeat';
  }

  function applyCouponCode() {
    const code = coupon.trim().toUpperCase();
    if (!code) { setCouponErr(true); setCouponMsg('Please enter a coupon code.'); return; }
    
    const found = couponsList.find(c => c.code.toUpperCase() === code);
    if (!found) {
        setCouponErr(true); setCouponMsg('Invalid or expired coupon code.'); setAppliedCouponData(null); return;
    }
    
    const currentCartValue = (membershipType === 'Elite' ? Math.round(Number(p.finalprice || 0) * 0.9) : Number(p.finalprice || 0)) * qty;
    if (found.minCartValue && currentCartValue < found.minCartValue) {
        setCouponErr(true); setCouponMsg(`Minimum order value of ₹${found.minCartValue} required.`); setAppliedCouponData(null); return;
    }
    
    setAppliedCouponData(found);
    setCouponErr(false);
    setCouponMsg(`✓ Applied! ${found.title || 'Coupon added successfully.'}`);
  }

  function checkDelivery() {
    if (/^\d{6}$/.test(pin)) { setDelMsg(`✓ Free delivery to ${pin} — arrives in 3–5 business days`); setDelErr(false); setDelOk(true); }
    else { setDelMsg('Please enter a valid 6-digit pincode.'); setDelErr(true); setDelOk(false); }
  }

  // ─── Dynamic Size Chart from DB Categories ───
  const sizeChartInfo = useMemo(() => {
    if (!p) return { headers: [], data: [], type: 'Chest' };
    
    const main = String(p.maincategory || '').toLowerCase();
    const sub = String(p.subcategory || '').toLowerCase();
    
    const isBottom = ['jean', 'trouser', 'pant', 'short', 'skirt', 'legging', 'jogger', 'track', 'chino', 'lower', 'bottom'].some(kw => sub.includes(kw));
    const isKid = ['kid', 'boy', 'girl'].some(kw => main.includes(kw) || sub.includes(kw));
    const isWomen = ['women', 'woman', 'lady', 'ladies', 'female'].some(kw => main.includes(kw) || sub.includes(kw));
    const isShoe = ['shoe', 'sneaker', 'heel', 'flat', 'boot', 'footwear'].some(kw => sub.includes(kw));

    if (isShoe) {
        return {
            headers: ["UK/India Size", "Euro Size", "US Size", "Foot Length (cm)"],
            data: [
                ["6", "40", "7", "24.6"], ["7", "41", "8", "25.4"], ["8", "42", "9", "26.2"],
                ["9", "43", "10", "27.1"], ["10", "44", "11", "27.9"], ["11", "45", "12", "28.8"]
            ],
            type: 'Foot Length (cm)'
        };
    }
    if (isKid) {
       return {
          headers: ["Size/Age", "Chest (in)", "Waist (in)", "Height (in)"],
          data: [
              ["2-3Y", "22", "21", "38"], ["4-5Y", "24", "22", "43"], ["6-7Y", "26", "23.5", "48"],
              ["8-9Y", "28", "25", "53"], ["10-11Y", "30", "26.5", "58"]
          ],
          type: 'Age (Yrs)'
       };
    }
    if (isBottom) {
        if (isWomen) {
            return {
                headers: ["Size", "Waist (in)", "Hip (in)", "Inseam (in)"],
                data: [
                    ["26", "26", "34", "28"], ["28", "28", "36", "28"], ["30", "30", "38", "28"],
                    ["32", "32", "40", "30"], ["34", "34", "42", "30"], ["36", "36", "44", "30"]
                ],
                type: 'Waist'
            };
        } else {
            return {
                headers: ["Size", "Waist (in)", "Hip (in)", "Inseam (in)"],
                data: [
                    ["28", "28", "36", "30"], ["30", "30", "38", "30"], ["32", "32", "40", "32"],
                    ["34", "34", "42", "32"], ["36", "36", "44", "32"], ["38", "38", "46", "34"], ["40", "40", "48", "34"]
                ],
                type: 'Waist'
            };
        }
    } else {
        if (isWomen) {
            return {
                headers: ["Size", "Bust (in)", "Waist (in)", "Hip (in)", "Shoulder (in)"],
                data: [
                    ["XS", "32", "26", "34", "14"], ["S", "34", "28", "36", "14.5"], ["M", "36", "30", "38", "15"],
                    ["L", "38", "32", "40", "15.5"], ["XL", "40", "34", "42", "16"], ["XXL", "42", "36", "44", "16.5"]
                ],
                type: 'Bust'
            };
        } else {
            return {
                headers: ["Size", "Chest (in)", "Shoulder (in)", "Length (in)", "Sleeve (in)"],
                data: [
                    ["S", "38", "16.5", "27", "24"], ["M", "40", "17", "28", "24.5"], ["L", "42", "17.5", "29", "25"],
                    ["XL", "44", "18", "30", "25.5"], ["XXL", "46", "18.5", "31", "26"]
                ],
                type: 'Chest'
            };
        }
    }
  }, [p]);

  function findMySize() {
    const measurement = Number(finderMeasure);
    if (!measurement) { toast_(`Enter your ${sizeChartInfo.type.split(' ')[0]} measurement.`); return; }
    
    let rec = '';
    if (sizeChartInfo.type === 'Waist') {
       rec = measurement <= 27 ? '26' : measurement <= 29 ? '28' : measurement <= 31 ? '30' : measurement <= 33 ? '32' : measurement <= 35 ? '34' : measurement <= 37 ? '36' : measurement <= 39 ? '38' : '40';
    } else if (sizeChartInfo.type === 'Bust') {
       rec = measurement <= 33 ? 'XS' : measurement <= 35 ? 'S' : measurement <= 37 ? 'M' : measurement <= 39 ? 'L' : measurement <= 41 ? 'XL' : 'XXL';
    } else if (sizeChartInfo.type === 'Foot Length (cm)') {
       rec = measurement <= 24.6 ? '6' : measurement <= 25.4 ? '7' : measurement <= 26.2 ? '8' : measurement <= 27.1 ? '9' : measurement <= 27.9 ? '10' : '11';
    } else if (sizeChartInfo.type === 'Age (Yrs)') {
       rec = measurement <= 3 ? '2-3Y' : measurement <= 5 ? '4-5Y' : measurement <= 7 ? '6-7Y' : measurement <= 9 ? '8-9Y' : '10-11Y';
    } else {
       rec = measurement <= 39 ? 'S' : measurement <= 41 ? 'M' : measurement <= 43 ? 'L' : measurement <= 45 ? 'XL' : 'XXL';
    }
    
    setFinderResult(`Recommended size: ${rec} (based on ${measurement} ${sizeChartInfo.type === 'Age (Yrs)' ? 'Yrs' : sizeChartInfo.type.includes('cm') ? 'cm' : 'inches'})`);
    const match = resolvedSizes.find(s => String(s).toLowerCase() === String(rec).toLowerCase() || String(s).toLowerCase() === String(measurement).toLowerCase());
    if (match) setSelSize(match);
  }

  // ─── Dynamic Frequently Bought Together ───
  const fbtProducts = useMemo(() => {
    if (!p || p.notFound || allProducts.length === 0) return [];
    const related = allProducts.filter(x => String(x.id || x._id) !== String(p.id || p._id));
    
    // 1. Strictly match the maincategory (e.g., Men, Women, Kids, Boys, Girls)
    let sameMain = related.filter(x => String(x.maincategory).toLowerCase() === String(p.maincategory).toLowerCase());

    // 2. Separate into same subcategory vs different subcategory to encourage bundling (e.g., Jeans + T-shirt)
    let sameSub = sameMain.filter(x => String(x.subcategory).toLowerCase() === String(p.subcategory).toLowerCase());
    let diffSub = sameMain.filter(x => String(x.subcategory).toLowerCase() !== String(p.subcategory).toLowerCase());

    let recommendations = [];
    if (sameMain.length >= 3) {
        // Mix them: 1 from same subcategory, 2 from complementary categories
        if (sameSub.length >= 1 && diffSub.length >= 2) recommendations = [sameSub[0], diffSub[0], diffSub[1]];
        else if (diffSub.length >= 3) recommendations = diffSub.slice(0, 3);
        else recommendations = sameMain.slice(0, 3);
    } else {
        recommendations = sameMain; // Strict fallback to whatever is left in the same demographic
    }

    return recommendations.slice(0, 3).map(item => {
      const mPrice = Number(item.finalprice || item.price || 0);
      const mMrp = Number(item.baseprice || item.mrp || 0);
      const mDisc = item.discount || (mMrp > mPrice ? Math.round(((mMrp - mPrice) / mMrp) * 100) : 0);
      return {
        id: item.id || item._id,
        name: item.name,
        brand: item.brand,
        price: mPrice,
        mrp: mMrp,
        discount: mDisc,
        img: item.pic1 || '/assets/images/noimage.png'
      };
    });
  }, [p, allProducts]);

  // ─── Computed Fallbacks ───
  if (!p && (allProductsLoading || productLoading)) return <div className="pd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading product...</div>;
  if (p && p.notFound) return <div className="pd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Product Not Found</div>;
  if (!p) return <div className="pd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading details...</div>;

  const resolvedPics = [p.pic1, p.pic2, p.pic3, p.pic4].filter(Boolean);
  const displayPics = resolvedPics.length > 0 ? resolvedPics : ['/assets/images/noimage.png'];
  const resolvedSizes = p.size ? (typeof p.size === 'string' ? p.size.split(',') : p.size).map(s => s.trim()).filter(Boolean) : [];
  const resolvedColors = p.color ? (typeof p.color === 'string' ? p.color.split(',') : p.color).map(c => c.trim()).filter(Boolean) : [];

  const pBase = Number(p.baseprice || p.mrp || 0);
  const pFinal = Number(p.finalprice || p.price || 0);
  const pDiscount = p.discount || (pBase > pFinal ? Math.round(((pBase - pFinal) / pBase) * 100) : 0);
  const pRating = reviewStats.count > 0 ? reviewStats.average : (p.rating || 0);
  const pReviews = reviewStats.count > 0 ? reviewStats.count : (p.reviewCount || p.reviews || 0);

  const discountedPrice = membershipType === 'Elite' ? Math.round(pFinal * 0.9) : pFinal;
  const pointsEarned = Math.round(discountedPrice / 10);
  
  let couponDiscountValue = 0;
  if (appliedCouponData) {
      let totalCartVal = discountedPrice * qty;
      if (appliedCouponData.type === 'percent') {
          couponDiscountValue = Math.round((totalCartVal * appliedCouponData.value) / 100);
          if (appliedCouponData.maxDiscount > 0 && couponDiscountValue > appliedCouponData.maxDiscount) couponDiscountValue = appliedCouponData.maxDiscount;
      } else {
          couponDiscountValue = appliedCouponData.value;
      }
  }
  
  const fbtTotal = pFinal + fbtProducts.reduce((sum, item) => sum + item.price, 0);
  const fbtMrp   = pBase + fbtProducts.reduce((sum, item) => sum + item.mrp, 0);
  const fbtSave  = fbtMrp - fbtTotal;

  function handleAddAllToCart() {
    const userId = localStorage.getItem('userid');
    if (!userId) { navigate('/login', { state: { from: location.pathname } }); return; }
    if (!selSize && p?.size) { 
      setValErr('Please select a size for the main product.'); 
      toast_('Please select a size for the main product.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; 
    }
    setValErr('');
    
    handleAddToCart(); // Add main product
    
    fbtProducts.forEach(fbt => {
      const fbtFull = allProducts.find(x => String(x.id || x._id) === String(fbt.id));
      if(fbtFull) {
          const fbtSize = Array.isArray(fbtFull.size) ? fbtFull.size[0] : (String(fbtFull.size||'').split(',')[0]?.trim() || "");
          const fbtColor = Array.isArray(fbtFull.color) ? fbtFull.color[0] : (String(fbtFull.color||'').split(',')[0]?.trim() || "");
          const fElite = membershipType === 'Elite' ? Math.round(fbt.price * 0.9) : fbt.price;
          dispatch(addCart({
             userId, productId: fbtFull.id || fbtFull._id, quantity: 1,
             price: fElite, size: fbtSize, color: fbtColor, name: fbtFull.name, pic: fbtFull.pic1 || fbtFull.pic || ''
          }));
      }
    });

    toast_(`Added ${fbtProducts.length + 1} items to cart!`);
    setTimeout(() => dispatch(getCart()), 500);
  }

  const productPath = `/single-product/${p?._id || p?.id || id}`;
  const productDescRaw = String(p?.description || '').trim();
  const productDescription =
    productDescRaw && !/^this is sample product$/i.test(productDescRaw)
      ? productDescRaw
      : `Buy ${p?.name || 'this product'}${p?.brand ? ` by ${p.brand}` : ''} online at Eshopper. Premium ${[p?.maincategory, p?.subcategory].filter(Boolean).join(' ')} fashion with free shipping above ₹999 and easy returns.`;

  const notFoundSeo = p?.notFound ? (
    <SEO
      title="Product Not Found"
      description="This product is unavailable on Eshopper."
      path={productPath}
      noindex
    />
  ) : null;

  const productSeo = !p || p.notFound ? null : (
    <SEO
      title={`${p.name}${p.brand ? ` by ${p.brand}` : ''}`}
      description={productDescription}
      path={productPath}
      image={p.pic1 || mainImg}
      type="product"
      keywords={[p.name, p.brand, p.maincategory, p.subcategory, 'eshopper', 'buy online India', 'premium fashion'].filter(Boolean).join(', ')}
      jsonLd={[
        productJsonLd({ ...p, description: productDescription }),
        breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop/All' },
          { name: p.maincategory || 'Collection', path: `/shop/${encodeURIComponent(p.maincategory || 'All')}` },
          { name: p.name, path: productPath },
        ]),
      ]}
    />
  );

  return (
    <>
      {notFoundSeo}{productSeo}
    <div className="pd">

      {/* Proof bar */}
      <div className="pd-proof">
        <div className="pd-proof-pill"><span className="pd-live"/>&nbsp;<strong>{boughtCount}</strong>&nbsp;bought today</div>
        <div className="pd-proof-pill">👁&nbsp;<strong>{viewCount}</strong>&nbsp;viewing now</div>
        <div className="pd-proof-pill">⚡&nbsp;Only&nbsp;<strong>7 left</strong></div>
        <Countdown end={saleEnd} />
      </div>

      {/* Breadcrumb — real internal links help crawl product hierarchy */}
      <div className="pd-bc">
        <div className="pd-bc-inner">
          <Link to="/">Home</Link><span className="pd-bc-sep">›</span>
          <Link to="/shop/All">Shop</Link><span className="pd-bc-sep">›</span>
          <Link to={`/shop/${encodeURIComponent(p.maincategory || 'All')}`}>{p.maincategory || 'Collection'}</Link><span className="pd-bc-sep">›</span>
          {p.subcategory ? (<><span>{p.subcategory}</span><span className="pd-bc-sep">›</span></>) : null}
          <span className="pd-bc-cur">{p.name}</span>
        </div>
      </div>

      <div className="pd-shell">
        <div className="pd-body">

          {/* ══ GALLERY ══ */}
          <div className="pd-gallery">
            <div className="pd-gal-inner">
              <div className="pd-gal-thumbs">
                {displayPics.map((pic,i) => (
                  <div key={i} className={`pd-thumb${mainImg===pic?' on':''}`} onClick={() => switchImg(pic)}>
                    <LazyImage src={pic} alt={`View ${i+1}`} maxWidth={180} />
                  </div>
                ))}
              </div>

              <div 
                className="pd-main-wrap" 
                ref={imgWrapRef} 
                onMouseMove={handleMouseMove}
                onTouchMove={handleMouseMove}
                onTouchStart={handleMouseMove}
              >
                <span className="pd-badge">{pDiscount}% OFF</span>
                <span className="pd-elite-badge">⭐ Elite 10% Off</span>
                <div className="pd-zoom-lens" ref={lensRef} />
                <div className={`pd-zoom-panel${imgFade ? ' fade' : ''}`} ref={zoomRef} />

                <div className="pd-img-actions">
                  <button className={`pd-img-btn wish${wishlisted?' on':''}`} onClick={handleWishlistToggle}>
                    <svg width="16" height="16" fill="none" stroke="#e11d48" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                  </button>
                  <button className="pd-img-btn" onClick={handleShare} title="Share">
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                  </button>
                </div>

                <LazyImage src={mainImg} className={`pd-main-img${imgFade?' fade':''}`} alt={p.name} maxWidth={1200} loading="eager" />

                <div className="pd-dots">
                  {displayPics.map((pic,i) => (
                    <button key={i} className={`pd-dot${mainImg===pic?' on':''}`} onClick={() => switchImg(pic)} />
                  ))}
                </div>
              </div>
            </div>

            <div className="pd-view-strip">
              <button className="pd-view-btn" onClick={() => setView360Modal(true)}>🔄 360° View</button>
              {p?.videoUrl && (
                <button className="pd-view-btn" onClick={() => setVideoModal(true)}>▶ Video</button>
              )}
              <button className="pd-view-btn" onClick={() => toast_('Try at Home available at checkout!')}>🏠 Try at Home</button>
            </div>

            {/* ══ ACCORDION DETAILS ══ */}
            <div className="pd-accordion-wrap">
              {[
                { id: 'details', title: 'Details', content: <p className="pd-desc">{p.description || p.details || 'A premium luxury product featuring the finest craftsmanship. Meticulously designed to provide both supreme comfort and unparalleled elegance.'}</p> },
                { id: 'features', title: 'Features', content: (
                  <div className="pd-feat-grid">
                    {FEATURES.map((f,i)=><div key={i} className="pd-feat-item"><span className="pd-feat-dot">✦</span>{f}</div>)}
                  </div>
                )},
                { id: 'specs', title: 'Specifications', content: (
                  <table className="pd-spec-table">
                    <tbody>{SPECS.map(([k,v])=><tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody>
                  </table>
                )},
                { id: 'care', title: 'Care Guide', content: (
                  <div className="pd-care-grid">
                    {CARE_ITEMS.map((c,i)=><div key={i} className="pd-care-item"><span className="pd-care-icon">{c.icon}</span>{c.text}</div>)}
                  </div>
                )}
              ].map(item => (
                <div key={item.id} className="pd-accordion-item">
                  <button className="pd-accordion-head" onClick={() => setOpenAccordion(openAccordion === item.id ? null : item.id)}>
                    <span>{item.title}</span>
                    <span className={`pd-accordion-chev${openAccordion === item.id ? ' up' : ''}`}>▾</span>
                  </button>
                  <div className={`pd-accordion-body${openAccordion === item.id ? ' open' : ''}`}>
                    <div className="pd-accordion-content">{item.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ══ DETAILS ══ */}
          <div style={{ minWidth:0 }}>

            <div className="pd-tags">
              <span className="pd-tag pd-tag-cat">{p.maincategory}</span>
              <span className="pd-tag pd-tag-off">{pDiscount}% Off</span>
              <span className="pd-tag pd-tag-new">New Arrival</span>
              <span className="pd-tag pd-tag-elite">⭐ Elite</span>
              <span className="pd-tag pd-tag-hot">🔥 Trending</span>
            </div>

            <h1 className="pd-name">{p.name}</h1>

            <div className="pd-brand-row">
              <span className="pd-brand-lbl">By</span>
              <span className="pd-brand-name">{p.brand || 'Boutique Luxe'}</span>
              <span className="pd-brand-sep"/>
              <span style={{ fontSize:11,color:'var(--text-light)',letterSpacing:'0.12em',textTransform:'uppercase' }}>{p.subcategory}</span>
              <div className="pd-pts-pill">🏆 Earn {pointsEarned} pts</div>
            </div>

            <div className="pd-rating-row">
              <Stars rating={pRating} />
              <span className="pd-rnum">{pRating}</span>
              <span className="pd-rct" onClick={() => setTab('reviews')}>({pReviews} reviews)</span>
              <span className="pd-vbadge">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Verified
              </span>
              <span className="pd-qa-lnk" onClick={() => setTab('qa')}>Q&A →</span>
            </div>

            {/* Price */}
            <div className="pd-price-card">
              <div className="pd-price-top">
                <span className="pd-price-main">₹{discountedPrice.toLocaleString('en-IN')}</span>
                <span className="pd-price-mrp">₹{pBase.toLocaleString('en-IN')}</span>
                <span className="pd-price-off-pill">{pDiscount}% OFF</span>
              </div>
              <div className="pd-price-inc">Inclusive of all taxes · Free shipping above ₹999</div>
              <div className="pd-price-lowest">📉 Lowest price in 90 days</div>
              {appliedCouponData && (
                <div className="pd-coupon-applied">🎉 Coupon <strong>{appliedCouponData.code}</strong> — extra ₹{couponDiscountValue.toLocaleString('en-IN')} off</div>
              )}
            </div>

            {/* Urgency */}
            <div className="pd-urgency">
              <div className="pd-urgency-top">
                <span className="pd-urgency-lbl"><span className="pd-live" style={{ background:'var(--red)' }}/>&nbsp;Only 7 left!</span>
                <span className="pd-urgency-live"><span className="pd-live"/>&nbsp;{viewCount} viewing now</span>
              </div>
              <div className="pd-urgency-bar"><div className="pd-urgency-fill" style={{ width:'22%' }}/></div>
            </div>

            {/* Highlights */}
            <div className="pd-hls">
              {['✨ Premium Quality','🚚 Free Delivery','🔄 30-Day Returns','🛡️ 100% Authentic','⭐ Elite Pricing'].map(h => (
                <div key={h} className="pd-hl">{h}</div>
              ))}
            </div>

            <div className="pd-div"/>

            {/* Colour */}
            <div className="pd-sel-head"><span className="pd-sel-lbl">Colour</span><span className="pd-sel-val">{selColor}</span></div>
            <div className="pd-colors">
              {resolvedColors.map(c => (
                <div key={c} className="pd-col-sw" onClick={() => setSelColor(c)}>
                  <div className={`pd-swatch${selColor===c?' on':''}`} style={{ backgroundColor: c.toLowerCase().replace(/[^a-z]/g, '') || '#ddd' }}/>
                  <span className="pd-col-name">{c}</span>
                </div>
              ))}
            </div>

            {/* Size */}
            <div className="pd-size-header">
              <div className="pd-sel-head" style={{ margin:0 }}><span className="pd-sel-lbl">Size</span><span className="pd-sel-val">{selSize||'—'}</span></div>
              <button className="pd-sz-guide" onClick={() => setSizeModal(true)}>📏 Size Chart</button>
            </div>
            <div className="pd-sizes">
              {resolvedSizes.map(s => (
                <button key={s} className={`pd-sz${selSize===s?' on':''}`} onClick={() => setSelSize(s)}>
                  {s}<span className="pd-sz-sub">In stock</span>
                </button>
              ))}
            </div>
            <div className="pd-finder-link" onClick={() => setFinderModal(true)}>
              🤔 Not sure? <strong style={{ color:'var(--teal)',marginLeft:4 }}>Find My Fit →</strong>
            </div>

            <div className="pd-div"/>

            {/* Qty */}
            <div className="pd-qty-row">
              <span className="pd-qty-lbl">Qty</span>
              <div className="pd-qty-ctrl">
                <button className="pd-qty-btn" onClick={() => setQty(q=>Math.max(1,q-1))} disabled={qty<=1}>−</button>
                <div className="pd-qty-num">{qty}</div>
                <button className="pd-qty-btn" onClick={() => setQty(q=>Math.min(10,q+1))} disabled={qty>=10}>+</button>
              </div>
              <span className="pd-qty-note">Max 10 per order</span>
            </div>

            {valErr && <div className="pd-alert"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{valErr}</div>}

            {/* CTAs */}
            <div className="pd-cta" ref={ctaRef}>
              <div className="pd-cta-main">
                <button className="pd-btn-cart" onClick={handleAddToCart}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                  Add to Cart
                </button>
                <button className={`pd-btn-wish${wishlisted?' on':''}`} onClick={handleWishlistToggle}>
                  <svg width="14" height="14" fill={wishlisted?'#e11d48':'none'} stroke={wishlisted?'#e11d48':'currentColor'} strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                  {wishlisted?'Wishlisted':'Wishlist'}
                </button>
              </div>
              <button className="pd-btn-buy" onClick={handleBuyNow}>⚡ Buy Now</button>
              {/* <button className="pd-btn-notify" onClick={() => toast_('🔔 Price drop alert set!')}>🔔 Notify Me on Price Drop</button> */}
            </div>

            {/* Coupon */}
            <div className="pd-coupon">
              <div className="pd-coupon-head">🎟️ Apply Coupon</div>
              <div className="pd-coupon-row">
                <input className="pd-coupon-inp" type="text" placeholder="Enter coupon code" value={coupon}
                  onChange={e=>setCoupon(e.target.value)} onKeyDown={e=>e.key==='Enter'&&applyCouponCode()} />
                <button className="pd-coupon-apply" onClick={applyCouponCode}>Apply</button>
              </div>
              {couponMsg && <div className={`pd-coupon-msg${couponErr?' err':''}`}>{couponMsg}</div>}
              <div className="pd-coupon-chips">
                {couponsList.map(c=><span key={c.code} className="pd-coupon-chip" onClick={()=>setCoupon(c.code)}>{c.code}</span>)}
              </div>
            </div>

            {/* Offers */}
            <div className="pd-offers">
              <div className="pd-offers-title">Available Offers</div>
              <div className="pd-offer-grid">
                {[
                  { icon:'💳', title:'Bank Offer',     text:'10% off with HDFC Card. Code: ', code:'HDFC10' },
                  { icon:'🏦', title:'No-Cost EMI',    text:'From ₹866/mo on orders above ₹3,000.' },
                  { icon:'🎁', title:'Gift Wrap Free', text:'Above ₹1,500. Code: ', code:'GIFTWRAP' },
                  { icon:'⭐', title:'Elite Exclusive', text:'Extra 10% for members. Code: ', code:'ELITE10' },
                ].map((o,i)=>(
                  <div key={i} className="pd-offer-card">
                    <span className="pd-offer-icon">{o.icon}</span>
                    <div>
                      <div className="pd-offer-title">{o.title}</div>
                      <div>{o.text}{o.code&&<span className="pd-offer-code">{o.code}</span>}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EMI */}
            {/* <div className="pd-emi">
              <div className="pd-emi-head" onClick={()=>setEmiOpen(o=>!o)}>
                <span className="pd-emi-title">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  No-Cost EMI Available
                </span>
                <span className={`pd-emi-chev${emiOpen?' up':''}`}>▾</span>
              </div>
              <div className={`pd-emi-body${emiOpen?' open':''}`}>
                <table className="pd-emi-table">
                  <thead><tr><th>Bank</th><th>Tenure</th><th>EMI/Month</th><th>Interest</th></tr></thead>
                  <tbody>
                    {[['HDFC','3 mo',Math.round(discountedPrice/3),'0% (Free)'],['HDFC','6 mo',Math.round(discountedPrice/6),'0% (Free)'],['ICICI','9 mo',Math.round(discountedPrice*1.045/9),'1.5% p.m.'],['SBI','12 mo',Math.round(discountedPrice*1.09/12),'1.5% p.m.']].map(([b,t,e,i])=>(
                      <tr key={b+t}><td>{b}</td><td>{t}</td><td className={String(i).startsWith('0')?'pd-emi-hl':''}>₹{Number(e).toLocaleString('en-IN')}</td><td>{i}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div> */}

            {/* Delivery */}
            <div className="pd-delivery">
              <div className="pd-del-head">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                Check Delivery
              </div>
              <div className="pd-del-row">
                <input className="pd-pin-inp" type="text" inputMode="numeric" placeholder="Enter 6-digit pincode" maxLength={6}
                  value={pin} onChange={e=>{setPin(e.target.value);setDelMsg('');setDelOk(false);}} onKeyDown={e=>e.key==='Enter'&&checkDelivery()} />
                <button className="pd-pin-btn" onClick={checkDelivery}>Check</button>
              </div>
              {delMsg && <div className={`pd-del-msg${delErr?' err':''}`}>{delMsg}</div>}
              {delOk && (
                <div className="pd-del-timeline">
                  {[{icon:'📦',label:'Order Placed',sub:'Today'},{icon:'🏭',label:'Processing',sub:'1–2 days'},{icon:'🚚',label:'Dispatched',sub:'Day 2–3'},{icon:'🏠',label:'Delivered',sub:'Day 3–5'}].map((s,i)=>(
                    <div key={i} className="pd-del-step">
                      <div className="pd-del-dot">{s.icon}</div>
                      <div className="pd-del-step-lbl">{s.label}</div>
                      <div className="pd-del-step-sub">{s.sub}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gift */}
            <div className="pd-gift">
              <div className="pd-gift-head">🎁 Gift Options</div>
              <div className="pd-gift-opts">
                <label className={`pd-gift-opt${giftWrap?' on':''}`} onClick={()=>setGiftWrap(g=>!g)}>
                  <input type="checkbox" checked={giftWrap} readOnly style={{ accentColor:'var(--gold)' }} /> Premium Gift Wrap (+₹99)
                </label>
                <label className={`pd-gift-opt${giftMsg?' on':''}`} onClick={()=>setGiftMsg(g=>!g)}>
                  <input type="checkbox" checked={giftMsg} readOnly style={{ accentColor:'var(--gold)' }} /> Add Gift Message (Free)
                </label>
              </div>
            </div>

            {/* Price drop */}
            <div className="pd-pricedrop">
              <span className="pd-pricedrop-text">📉 Want this at a lower price?</span>
              <button className="pd-pricedrop-btn" onClick={() => toast_('🔔 Price drop alert set!')}>Notify on Drop</button>
            </div>

            {/* Trust */}
            <div className="pd-trust">
              {[{icon:'🔄',lbl:'30-Day',sub:'Returns'},{icon:'🛡️',lbl:'Secure',sub:'Payments'},{icon:'✅',lbl:'100%',sub:'Authentic'},{icon:'🚀',lbl:'Fast',sub:'Delivery'}].map((t,i)=>(
                <div key={i} className="pd-trust-item">
                  <div className="pd-trust-icon">{t.icon}</div>
                  <div className="pd-trust-lbl">{t.lbl}</div>
                  <div className="pd-trust-sub">{t.sub}</div>
                </div>
              ))}
            </div>

          </div>{/* end details */}
        </div>{/* end body */}

        {/* ══ BOTTOM ══ */}
        <div className="pd-bottom">
          <div className="pd-tabs">
            {[{id:'reviews',label:`Reviews (${pReviews})`},{id:'qa',label:`Q&A (${QA_LIST.length})`}].map(t=>(
              <button key={t.id} className={`pd-tab${tab===t.id?' on':''}`} onClick={()=>setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          <div className="pd-tab-body">
            <div style={{ display: tab === 'reviews' ? 'block' : 'none' }}>
              <ProductReviews 
                productId={p.id || p._id} 
                onStatsUpdate={setReviewStats} 
              />
            </div>

            {tab==='qa' && (
              <div>
                <div className="pd-qa-list">
                  {QA_LIST.map((item,i)=>(
                    <div key={i} className="pd-qa-item">
                      <div className="pd-qa-q"><span style={{ fontSize:16 }}>❓</span>{item.q}</div>
                      <div className="pd-qa-a">{item.a}</div>
                      <div className="pd-qa-footer">
                        <span>{item.votes} people found this helpful</span>
                        <span className="pd-qa-helpful" onClick={()=>toast_('Marked helpful!')}>👍 Helpful</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pd-qa-ask">
                  <input className="pd-qa-ask-inp" placeholder="Ask a question about this product…" />
                  <button className="pd-qa-ask-btn" onClick={()=>toast_('Question submitted! We\'ll answer within 24 hrs.')}>Ask</button>
                </div>
              </div>
            )}
          </div>

          {/* FBT */}
          <motion.div 
            className="pd-fbt"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: { opacity: 0, y: 40 },
              show: {
                opacity: 1, y: 0,
                transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.1, delayChildren: 0.3 }
              }
            }}
          >
            <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="pd-fbt-title">Frequently Bought Together</motion.div>
            <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="pd-fbt-sub">Complete the look — save more when you bundle</motion.div>
            <div className="pd-fbt-row">
              <motion.div 
                variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1, transition: { duration: 0.4 } } }} 
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="pd-fbt-product"
              >
                <div className="pd-fbt-img-wrap">
                  <img src={displayPics[0]} alt={p.name} className="pd-fbt-img"/>
                  {pDiscount > 0 && <span className="pd-fbt-badge">{pDiscount}% OFF</span>}
                </div>
                <div className="pd-fbt-info">
                  <div className="pd-fbt-brand">{p.brand || 'Boutique Luxe'}</div>
                  <div className="pd-fbt-name">{p.name}</div>
                  <div className="pd-fbt-price-row">
                    <span className="pd-fbt-price">₹{pFinal.toLocaleString('en-IN')}</span>
                    {pBase > pFinal && <span className="pd-fbt-mrp">₹{pBase.toLocaleString('en-IN')}</span>}
                  </div>
                </div>
              </motion.div>
              {fbtProducts.map(fp=>(
                <React.Fragment key={fp.id}>
                  <motion.span variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.3 } } }} className="pd-fbt-plus">+</motion.span>
                  <motion.div 
                    variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1, transition: { duration: 0.4 } } }}
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  >
                    <Link to={`/single-product/${fp.id}`} className="pd-fbt-product" style={{textDecoration: 'none'}} onClick={() => window.scrollTo(0,0)}>
                      <div className="pd-fbt-img-wrap">
                        <img src={fp.img} alt={fp.name} className="pd-fbt-img"/>
                        {fp.discount > 0 && <span className="pd-fbt-badge">{fp.discount}% OFF</span>}
                      </div>
                      <div className="pd-fbt-info">
                        <div className="pd-fbt-brand">{fp.brand || 'Boutique Luxe'}</div>
                        <div className="pd-fbt-name">{fp.name}</div>
                        <div className="pd-fbt-price-row">
                          <span className="pd-fbt-price">₹{fp.price.toLocaleString('en-IN')}</span>
                          {fp.mrp > fp.price && <span className="pd-fbt-mrp">₹{fp.mrp.toLocaleString('en-IN')}</span>}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                </React.Fragment>
              ))}
            </div>
            {fbtProducts.length > 0 && (
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="pd-fbt-footer">
                <div className="pd-fbt-total">
                  <div className="pd-fbt-total-lbl">Bundle Total</div>
                  <div className="pd-fbt-total-price">₹{fbtTotal.toLocaleString('en-IN')}</div>
                  <div className="pd-fbt-total-save">You save ₹{fbtSave.toLocaleString('en-IN')}</div>
                </div>
                <div className="pd-fbt-btn-wrap">
                  <button className="pd-fbt-btn" onClick={handleAddAllToCart}>Add All {fbtProducts.length + 1} to Cart</button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Sticky */}
      <div className={`pd-sticky${stickyVis?' show':''}`}>
        <div className="pd-sticky-info">
          <img src={displayPics[0]} alt={p.name} className="pd-sticky-img"/>
          <div><div className="pd-sticky-name">{p.name}</div><div className="pd-sticky-price">₹{discountedPrice.toLocaleString('en-IN')}</div></div>
        </div>
        <div className="pd-sticky-btns">
          <button className="pd-sticky-cart" onClick={()=>toast_('Added to cart!')}>Add to Cart</button>
          <button className="pd-sticky-buy" onClick={handleBuyNow}>⚡ Buy Now</button>
        </div>
      </div>

      {/* Size chart modal */}
      {sizeModal && (
        <div className="pd-overlay" onClick={()=>setSizeModal(false)}>
          <div className="pd-modal" onClick={e=>e.stopPropagation()}>
            <div className="pd-modal-head">
              <div className="pd-modal-title">Size Chart</div>
              <button className="pd-modal-close" onClick={()=>setSizeModal(false)}>✕</button>
            </div>
            {sizeChartInfo.headers.some(h => h.includes('(in)')) && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'inline-flex', background: 'var(--fog)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border-light)' }}>
                  <button 
                    onClick={() => setSzUnit('in')} 
                    style={{ padding: '6px 20px', borderRadius: '6px', border: 'none', background: szUnit === 'in' ? 'var(--ink)' : 'transparent', color: szUnit === 'in' ? '#fff' : 'var(--text-body)', cursor: 'pointer', fontFamily: "'Jost', sans-serif", fontSize: '12px', fontWeight: 600, transition: 'var(--tr)' }}>
                    Inches
                  </button>
                  <button 
                    onClick={() => setSzUnit('cm')} 
                    style={{ padding: '6px 20px', borderRadius: '6px', border: 'none', background: szUnit === 'cm' ? 'var(--ink)' : 'transparent', color: szUnit === 'cm' ? '#fff' : 'var(--text-body)', cursor: 'pointer', fontFamily: "'Jost', sans-serif", fontSize: '12px', fontWeight: 600, transition: 'var(--tr)' }}>
                    Centimeters
                  </button>
                </div>
              </div>
            )}
            <div className="pd-sz-table-wrap">
              <table className="pd-sz-table">
                <thead><tr>{sizeChartInfo.headers.map((h, i)=><th key={i}>{szUnit === 'cm' ? h.replace('(in)', '(cm)') : h}</th>)}</tr></thead>
                <tbody>
                  {sizeChartInfo.data.map(row => (
                    <tr key={row[0]}>
                      {row.map((c, i) => {
                        const header = sizeChartInfo.headers[i];
                        let displayVal = c;
                        if (szUnit === 'cm' && header && header.includes('(in)')) {
                          const num = parseFloat(c);
                          if (!isNaN(num)) {
                            displayVal = (num * 2.54).toFixed(1);
                            if (displayVal.endsWith('.0')) displayVal = displayVal.slice(0, -2);
                          }
                        }
                        return <td key={i}>{displayVal}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="pd-sz-hint">💡 <strong>How to measure:</strong> Measure your {sizeChartInfo.type.split(' ')[0].toLowerCase()} at its fullest point. If between sizes, size up for a relaxed fit or down for a slim fit. All measurements are standard industry approximations.</p>
          </div>
        </div>
      )}

      {/* Finder modal */}
      {finderModal && (
        <div className="pd-overlay" onClick={()=>setFinderModal(false)}>
          <div className="pd-modal" onClick={e=>e.stopPropagation()}>
            <div className="pd-modal-head">
              <div className="pd-modal-title">Find My Fit</div>
              <button className="pd-modal-close" onClick={()=>setFinderModal(false)}>✕</button>
            </div>
            <p style={{ fontSize:13,color:'var(--text-body)',marginBottom:20,lineHeight:1.7 }}>Enter your measurements and we'll recommend the best size.</p>
            <div className="pd-finder-row">
              <label className="pd-finder-lbl">{sizeChartInfo.type}</label>
              <input className="pd-finder-inp" type="number" placeholder={sizeChartInfo.type.includes('Age') ? "e.g. 6" : "e.g. 32"} value={finderMeasure} onChange={e=>setFinderMeasure(e.target.value)} />
            </div>
            <button className="pd-btn-cart" onClick={findMySize} style={{ marginTop:8 }}>Find My Size</button>
            {finderResult && <div className="pd-finder-result">{finderResult}</div>}
          </div>
        </div>
      )}

      {/* Video Modal */}
      {videoModal && p?.videoUrl && (
        <div className="pd-overlay" onClick={() => setVideoModal(false)}>
          <div className="pd-modal" style={{ maxWidth: '800px', padding: 0, overflow: 'hidden', background: '#0a0a0a' }} onClick={e => e.stopPropagation()}>
            <button className="pd-modal-close" style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, background: 'rgba(255,255,255,0.9)', border: 'none' }} onClick={() => setVideoModal(false)}>✕</button>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              {p.videoUrl.includes('youtube.com') || p.videoUrl.includes('youtu.be') ? (
                <iframe 
                  src={p.videoUrl} 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} 
                  allow="autoplay; encrypted-media" 
                  allowFullScreen 
                  title="Product Video"
                />
              ) : (
                <video 
                  src={p.videoUrl} 
                  controls 
                  autoPlay 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 360 View Modal */}
      {view360Modal && (
        <div className="pd-overlay" onClick={() => setView360Modal(false)}>
          <div className="pd-modal" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="pd-modal-head">
              <div className="pd-modal-title">360° Interactive View</div>
              <button className="pd-modal-close" onClick={() => setView360Modal(false)}>✕</button>
            </div>
            <div 
              style={{ position: 'relative', width: '100%', height: '400px', background: 'var(--fog)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: isDragging360 ? 'grabbing' : 'grab' }}
              onMouseDown={(e) => { setIsDragging360(true); setDragStartX(e.clientX); }}
              onMouseMove={(e) => {
                if (isDragging360) {
                  setRotY(prev => prev + (e.clientX - dragStartX) * 0.8);
                  setDragStartX(e.clientX);
                }
              }}
              onMouseUp={() => setIsDragging360(false)}
              onMouseLeave={() => setIsDragging360(false)}
              onTouchStart={(e) => { setIsDragging360(true); setDragStartX(e.touches[0].clientX); }}
              onTouchMove={(e) => {
                if (isDragging360) {
                  setRotY(prev => prev + (e.touches[0].clientX - dragStartX) * 0.8);
                  setDragStartX(e.touches[0].clientX);
                }
              }}
              onTouchEnd={() => setIsDragging360(false)}
            >
              <motion.img 
                src={displayPics[0]} 
                alt="360 View" 
                style={{ maxHeight: '90%', maxWidth: '90%', objectFit: 'contain', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.15))', userSelect: 'none', pointerEvents: 'none' }}
                animate={{ rotateY: rotY }}
                transition={{ type: 'tween', ease: 'linear', duration: 0 }}
              />
              <div style={{ position: 'absolute', bottom: 16, background: 'rgba(255,255,255,0.9)', padding: '6px 16px', borderRadius: '20px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)', boxShadow: 'var(--sh-sm)', pointerEvents: 'none' }}>
                 Drag to Rotate
              </div>
            </div>
            <p className="pd-sz-hint" style={{ marginTop: 24 }}>💡 Full 360° interactive models require product-specific 3D assets (.glb/.gltf) or image sequences. This is a simulated showcase preview.</p>
          </div>
        </div>
      )}

      <div className={`pd-toast${toastVis?' show':''}`}>{toast}</div>
    </div>
    </>
  );
}
