import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import { getCart, addCart } from '../Store/ActionCreaters/CartActionCreators';
import { getWishlist, addWishlist, deleteWishlist } from '../Store/ActionCreaters/WishlistActionCreators';
import { useMembership } from './MembershipContext';

/* ─── Mock data ─────────────────────────────────────────────────────────────── */
const FBT = [
  { name:"Oxford Dress Shirt", price:2499, mrp:3499, img:"https://images.unsplash.com/photo-1562157873-818bc0726f68?w=300&q=80" },
  { name:"Slim Fit Chinos",    price:3299, mrp:4999, img:"https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=300&q=80" },
  { name:"Derby Leather Shoes",price:5999, mrp:8499, img:"https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=300&q=80" },
];

const RATING_DIST = [
  { stars:5,pct:68 },{ stars:4,pct:18 },{ stars:3,pct:8 },{ stars:2,pct:3 },{ stars:1,pct:3 },
];

const REVIEWS = [
  { user:"Rahul M.",  initial:"R", date:"12 Jan 2025", rating:5, body:"Absolutely stunning blazer. The cashmere quality is exceptional — soft, warm, and holds its shape perfectly. Received so many compliments at my sister's wedding.", verified:true,  helpful:34 },
  { user:"Priya S.",  initial:"P", date:"5 Feb 2025",  rating:4, body:"The fit is amazing and the material feels genuinely premium. Slight colour difference from the website photo but overall very happy. Delivery was on time and packaging was luxurious.", verified:true,  helpful:18 },
  { user:"Arjun K.",  initial:"A", date:"28 Feb 2025", rating:5, body:"Best blazer I've owned. Worn it to 3 formal events — still looks brand new. The stitching quality is top-tier.", verified:false, helpful:22 },
  { user:"Meera T.",  initial:"M", date:"15 Mar 2025", rating:4, body:"Lovely product. Sizing runs slightly large — I'd recommend going one size down. The charcoal colour is rich and sophisticated.", verified:true,  helpful:9  },
];

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

const SIZE_GUIDE = [
  ["36","36–37","16.5","29","25"],["38","38–39","17","29.5","25.5"],
  ["40","40–41","17.5","30","26"],["42","42–43","18","30.5","26.5"],
  ["44","44–45","18.5","31","27"],["46","46–47","19","31.5","27.5"],
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

.pd-gallery{position:sticky;top:20px;}
.pd-gal-inner{display:flex;gap:12px;}
.pd-gal-thumbs{display:flex;flex-direction:column;gap:8px;flex-shrink:0;}
.pd-thumb{width:68px;height:82px;border:1.5px solid var(--border-light);border-radius:6px;overflow:hidden;cursor:pointer;background:var(--cloud);transition:var(--tr);}
.pd-thumb:hover{border-color:var(--teal-mid);transform:translateX(3px);}
.pd-thumb.on{border-color:var(--gold);border-width:2px;box-shadow:0 0 0 3px var(--gold-glow);}
.pd-thumb img{width:100%;height:100%;object-fit:cover;}

.pd-main-wrap{flex:1;position:relative;background:var(--cloud);border-radius:var(--r-lg);overflow:hidden;border:1px solid var(--border-light);box-shadow:var(--sh-md);cursor:crosshair;aspect-ratio:3/4;}
.pd-main-img{width:100%;height:100%;object-fit:contain;padding:24px;display:block;pointer-events:none;transition:opacity 0.22s ease;}
.pd-main-img.fade{opacity:0;}
.pd-zoom-lens{position:absolute;width:120px;height:120px;border:2px solid var(--gold);border-radius:6px;pointer-events:none;z-index:10;background:rgba(212,175,55,0.07);display:none;}
.pd-zoom-panel{position:absolute;right:calc(100% + 14px);top:0;width:360px;height:100%;border:1px solid var(--border-light);border-radius:var(--r-lg);overflow:hidden;background:var(--cloud);box-shadow:var(--sh-lg);display:none;z-index:20;pointer-events:none;}
.pd-main-wrap:hover .pd-zoom-lens,.pd-main-wrap:hover .pd-zoom-panel{display:block;}

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
.pd-view-strip{display:flex;gap:7px;margin-top:10px;}
.pd-view-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border:1px solid var(--border-mid);border-radius:var(--r-md);background:var(--cloud);font-family:'Jost',sans-serif;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-body);cursor:pointer;transition:var(--tr);}
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

.pd-rev-section{display:grid;grid-template-columns:180px 1fr;gap:40px;align-items:start;}
.pd-rev-big{text-align:center;background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-lg);padding:24px 16px;}
.pd-rev-num{font-family:'Playfair Display',serif;font-size:60px;font-weight:700;color:var(--ink);line-height:1;}
.pd-rev-star-row{display:flex;justify-content:center;gap:3px;margin:8px 0;}
.pd-rev-ct{font-size:12px;color:var(--text-light);}
.pd-rev-bars{display:flex;flex-direction:column;gap:9px;}
.pd-rev-bar-row{display:flex;align-items:center;gap:10px;}
.pd-rev-bar-lbl{font-size:11px;color:var(--text-light);width:30px;text-align:right;flex-shrink:0;}
.pd-rev-bar-track{flex:1;height:8px;background:var(--border-light);border-radius:10px;overflow:hidden;}
.pd-rev-bar-fill{height:100%;border-radius:10px;background:linear-gradient(90deg,#F5A623,#F9D06D);transition:width 1.2s ease;}
.pd-rev-bar-pct{font-size:11px;color:var(--text-light);width:34px;}
.pd-rev-cards{display:grid;gap:16px;margin-top:32px;}
.pd-rev-card{background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-lg);padding:20px 22px;transition:var(--tr);}
.pd-rev-card:hover{box-shadow:var(--sh-sm);border-color:var(--border-mid);}
.pd-rev-card-top{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
.pd-rev-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--teal),var(--gold));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;}
.pd-rev-meta{flex:1;}
.pd-rev-user{font-size:13px;font-weight:700;color:var(--ink);}
.pd-rev-date{font-size:11px;color:var(--text-light);}
.pd-rev-body{font-size:13px;color:var(--text-body);line-height:1.7;}
.pd-rev-vbadge{display:inline-flex;align-items:center;gap:5px;background:var(--green-light);color:var(--green);font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;margin-top:10px;}
.pd-rev-helpful{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:11px;color:var(--text-light);}
.pd-rev-helpful button{background:none;border:1px solid var(--border-mid);border-radius:4px;padding:4px 11px;font-family:'Jost',sans-serif;font-size:11px;cursor:pointer;color:var(--text-body);transition:var(--tr);}
.pd-rev-helpful button:hover{border-color:var(--teal);color:var(--teal);}

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

.pd-fbt{background:var(--cloud);border:1px solid var(--border-light);border-radius:var(--r-xl);padding:32px 36px;margin-top:48px;box-shadow:var(--sh-xs);}
.pd-fbt-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--ink);margin-bottom:4px;}
.pd-fbt-sub{font-size:12px;color:var(--text-light);margin-bottom:24px;}
.pd-fbt-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
.pd-fbt-product{display:flex;flex-direction:column;align-items:center;gap:7px;}
.pd-fbt-img{width:90px;height:110px;object-fit:cover;border-radius:8px;border:1px solid var(--border-light);box-shadow:var(--sh-xs);}
.pd-fbt-name{font-size:11px;color:var(--text-body);text-align:center;max-width:90px;line-height:1.4;font-weight:500;}
.pd-fbt-price{font-size:13px;font-weight:700;color:var(--ink);}
.pd-fbt-mrp{font-size:11px;color:var(--text-light);text-decoration:line-through;}
.pd-fbt-plus{font-size:24px;color:var(--border-mid);font-weight:300;}
.pd-fbt-total{margin-left:auto;text-align:right;background:linear-gradient(135deg,rgba(212,175,55,0.06),transparent);border:1px solid rgba(212,175,55,0.2);border-radius:var(--r-lg);padding:16px 22px;}
.pd-fbt-total-lbl{font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-light);font-weight:700;}
.pd-fbt-total-price{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--ink);margin:6px 0 2px;}
.pd-fbt-total-save{font-size:12px;color:var(--green);font-weight:700;}
.pd-fbt-btn{margin-top:22px;background:var(--ink);color:#fff;border:none;border-radius:6px;padding:14px 30px;font-family:'Jost',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;cursor:pointer;transition:var(--tr);}
.pd-fbt-btn:hover{background:var(--charcoal);transform:translateY(-1px);box-shadow:0 8px 24px rgba(10,10,10,0.2);}

.pd-overlay{position:fixed;inset:0;background:rgba(10,10,10,0.55);backdrop-filter:blur(6px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;animation:pdFade 0.2s ease;}
@keyframes pdFade{from{opacity:0}to{opacity:1}}
.pd-modal{background:var(--cloud);border-radius:var(--r-xl);max-width:580px;width:100%;max-height:82vh;overflow-y:auto;padding:36px;animation:pdSlide 0.3s ease;}
@keyframes pdSlide{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.pd-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:26px;}
.pd-modal-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--ink);}
.pd-modal-close{width:34px;height:34px;border-radius:50%;border:1px solid var(--border-light);background:var(--fog);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--text-light);transition:var(--tr);}
.pd-modal-close:hover{background:var(--border-light);color:var(--ink);}
.pd-sz-table{width:100%;border-collapse:collapse;font-size:13px;}
.pd-sz-table th{background:var(--ink);color:#fff;padding:11px 14px;text-align:center;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;}
.pd-sz-table td{padding:10px 14px;text-align:center;border-bottom:1px solid var(--border-light);color:var(--text-body);}
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
  .pd-gallery{position:relative;top:auto;}
  .pd-gal-thumbs{display:none;}
  .pd-zoom-panel{display:none!important;}
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

  const allProducts = useSelector(state => state.ProductStateData) || [];
  const cartState = useSelector(state => state.CartStateData) || { items: [] };
  const wishlist = useSelector(state => state.WishlistStateData) || [];
  const cartItems = Array.isArray(cartState.items) ? cartState.items : (Array.isArray(cartState) ? cartState : []);

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
  const [toastVis, setToastVis]         = useState(false);
  const [tab, setTab]                   = useState('details');
  const [sizeModal, setSizeModal]       = useState(false);
  const [finderModal, setFinderModal]   = useState(false);
  const [emiOpen, setEmiOpen]           = useState(false);
  const [coupon, setCoupon]             = useState('');
  const [couponMsg, setCouponMsg]       = useState('');
  const [couponErr, setCouponErr]       = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [shareOpen, setShareOpen]       = useState(false);
  const [stickyVis, setStickyVis]       = useState(false);
  const [giftWrap, setGiftWrap]         = useState(false);
  const [giftMsg, setGiftMsg]           = useState(false);
  const [finderChest, setFinderChest]   = useState('');
  const [finderResult, setFinderResult] = useState('');
  const [viewCount]                     = useState(Math.floor(Math.random() * 14) + 5);
  const [boughtCount]                   = useState(Math.floor(Math.random() * 180) + 70);
  const saleEnd = useRef(Date.now() + 4 * 3600_000 + 27 * 60_000).current;

  const ctaRef     = useRef(null);
  const toastTmr   = useRef(null);
  const imgWrapRef = useRef(null);
  const lensRef    = useRef(null);
  const zoomRef    = useRef(null);

  // ─── Data Fetching ───
  useEffect(() => {
    dispatch(getProduct());
    dispatch(getCart());
    dispatch(getWishlist());
  }, [dispatch]);

  useEffect(() => {
    const el = document.createElement('style');
    el.setAttribute('data-pdx','1');
    el.textContent = STYLES;
    document.head.appendChild(el);
    
    // Extract product on mount
    if (allProducts.length > 0) {
       const data = allProducts.find(item => item.id === id || item._id === id);
       if (data) {
         setp(data);
         setMainImg(data.pic1 || '/assets/images/noimage.png');
         if (data.size && typeof data.size === 'string') setSelSize(data.size.split(',')[0]?.trim() || '');
         if (data.color && typeof data.color === 'string') setSelColor(data.color.split(',')[0]?.trim() || '');
       } else {
         setp({ notFound: true });
       }
    }
    return () => { try { document.head.removeChild(el); } catch(_) {} };
  }, [allProducts, id]);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setStickyVis(!e.isIntersecting), { threshold:0 });
    if (ctaRef.current) obs.observe(ctaRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (p && !p.notFound && wishlist.length > 0) {
       const userId = localStorage.getItem('userid');
       const isWl = wishlist.some(item => String(item.productid?._id || item.productid || item.product?._id || item.product || item.productId) === String(p.id || p._id) && String(item.userid) === String(userId));
       setWishlisted(isWl);
    }
  }, [wishlist, p]);

  useEffect(() => () => { if (toastTmr.current) clearTimeout(toastTmr.current); }, []);

  function toast_(msg) {
    setToast(msg); setToastVis(true);
    if (toastTmr.current) clearTimeout(toastTmr.current);
    toastTmr.current = setTimeout(() => setToastVis(false), 2800);
  }

  // ─── Actions ───
  function handleAddToCart() {
    const userId = localStorage.getItem('userid');
    if (!userId) { navigate('/login', { state: { from: location.pathname } }); return; }
    if (!selSize && p?.size) { setValErr('Please select a size.'); return; }
    setValErr('');
    
    const elitePrice = membershipType === 'Elite' ? Math.round(Number(p.finalprice || 0) * 0.9) : Number(p.finalprice || 0);

    const existing = cartItems.find(item => {
      const cartProdId = item.productid?._id || item.productid?.id || item.productid || item.product?._id || item.product || item.productId;
      return String(cartProdId) === String(p.id || p._id) && String(item.userid) === String(userId) && String(item.size || '') === String(selSize) && String(item.color || '') === String(selColor);
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
    
    toast_(`✓ Added to cart — Size ${selSize || 'Standard'}`);
    dispatch(getCart());
  }

  function handleBuyNow() {
    if (!selSize && p?.size) { setValErr('Please select a size.'); return; }
    setValErr('');
    const userId = localStorage.getItem('userid');
    if (!userId) { navigate('/login', { state: { from: location.pathname } }); return; }
    
    const elitePrice = membershipType === 'Elite' ? Math.round(Number(p.finalprice || 0) * 0.9) : Number(p.finalprice || 0);
    const productForDirectCheckout = {
        productid: p.id || p._id,
        name: p.name,
        price: elitePrice,
        quantity: Number(qty),
        size: selSize,
        color: selColor,
        pic: p.pic1 || p.pic || '',
        total: elitePrice * Number(qty)
    };
    
    sessionStorage.setItem('directCheckoutProduct', JSON.stringify(productForDirectCheckout));
    toast_('Proceeding to checkout…');
    navigate('/checkout', { state: { direct: true } });
  }

  function handleWishlistToggle() {
    const userId = localStorage.getItem('userid');
    if (!userId) { navigate('/login', { state: { from: location.pathname } }); return; }
    
    if (wishlisted) {
      const existing = wishlist.find(item => String(item.productid?._id || item.productid || item.product) === String(p.id || p._id) && String(item.userid) === String(userId));
      if (existing) { dispatch(deleteWishlist({ id: existing.id || existing._id })); toast_('Removed from wishlist'); }
    } else {
       dispatch(addWishlist({ productid: p.id || p._id, userid: userId, name: p.name, color: selColor, size: selSize, price: Number(p.finalprice || 0), pic: p.pic1 || p.pic || '' }));
       toast_('❤️ Saved to Wishlist');
    }
  }

  function switchImg(url) {
    if (url === mainImg) return;
    setImgFade(true);
    setTimeout(() => { setMainImg(url); setImgFade(false); }, 220);
  }

  function handleMouseMove(e) {
    const wrap = imgWrapRef.current, lens = lensRef.current, zoom = zoomRef.current;
    if (!wrap || !lens || !zoom) return;
    const rect = wrap.getBoundingClientRect();
    const lw = 120, lh = 120;
    let x = e.clientX - rect.left - lw/2, y = e.clientY - rect.top - lh/2;
    x = Math.max(0, Math.min(x, rect.width - lw));
    y = Math.max(0, Math.min(y, rect.height - lh));
    lens.style.left = x+'px'; lens.style.top = y+'px';
    const cx = zoom.offsetWidth/lw, cy = zoom.offsetHeight/lh;
    zoom.style.backgroundImage    = `url(${mainImg})`;
    zoom.style.backgroundSize     = `${rect.width*cx}px ${rect.height*cy}px`;
    zoom.style.backgroundPosition = `-${x*cx}px -${y*cy}px`;
    zoom.style.backgroundRepeat   = 'no-repeat';
  }

  function applyCouponCode() {
    const code = coupon.trim().toUpperCase();
    if      (code==='ELITE10')  { setAppliedCoupon(code); setCouponMsg('✓ Applied! Extra 10% off.'); setCouponErr(false); }
    else if (code==='HDFC10')   { setCouponMsg('✓ HDFC10 valid — 10% off via HDFC at checkout.'); setCouponErr(false); }
    else if (code==='GIFTWRAP') { setCouponMsg('✓ Free premium gift wrap added!'); setCouponErr(false); setGiftWrap(true); }
    else                        { setCouponMsg('Invalid code. Try ELITE10, HDFC10 or GIFTWRAP.'); setCouponErr(true); setAppliedCoupon(''); }
  }

  function checkDelivery() {
    if (/^\d{6}$/.test(pin)) { setDelMsg(`✓ Free delivery to ${pin} — arrives in 3–5 business days`); setDelErr(false); setDelOk(true); }
    else { setDelMsg('Please enter a valid 6-digit pincode.'); setDelErr(true); setDelOk(false); }
  }

  function findMySize() {
    const chest = Number(finderChest);
    if (!chest) { toast_('Enter your chest measurement.'); return; }
    const rec = chest<=32?'36':chest<=34?'38':chest<=37?'40':chest<=39?'42':chest<=41?'44':'46';
    setFinderResult(`Recommended size: ${rec} (based on ${chest}" chest)`);
    const match = resolvedSizes.find(s => s===rec);
    if (match) setSelSize(match);
  }

  // ─── Computed Fallbacks ───
  if (!p && !allProducts.length) return <div className="pd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading product...</div>;
  if (p && p.notFound) return <div className="pd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Product Not Found</div>;
  if (!p) return <div className="pd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading details...</div>;

  const resolvedPics = [p.pic1, p.pic2, p.pic3, p.pic4].filter(Boolean);
  const displayPics = resolvedPics.length > 0 ? resolvedPics : ['/assets/images/noimage.png'];
  const resolvedSizes = p.size ? (typeof p.size === 'string' ? p.size.split(',') : p.size).map(s => s.trim()).filter(Boolean) : [];
  const resolvedColors = p.color ? (typeof p.color === 'string' ? p.color.split(',') : p.color).map(c => c.trim()).filter(Boolean) : [];

  const pBase = Number(p.baseprice || p.mrp || 0);
  const pFinal = Number(p.finalprice || p.price || 0);
  const pDiscount = p.discount || (pBase > pFinal ? Math.round(((pBase - pFinal) / pBase) * 100) : 0);
  const pRating = p.rating || 4.7;
  const pReviews = p.reviewCount || p.reviews || 248;

  const discountedPrice = appliedCoupon === 'ELITE10' ? Math.round(pFinal * 0.9) : pFinal;
  const pointsEarned = Math.round(discountedPrice / 10);
  const fbtTotal = pFinal + FBT.reduce((a,b) => a + b.price, 0);
  const fbtMrp   = pBase + 14797;
  const fbtSave  = fbtMrp - fbtTotal;

  return (
    <div className="pd">

      {/* Proof bar */}
      <div className="pd-proof">
        <div className="pd-proof-pill"><span className="pd-live"/>&nbsp;<strong>{boughtCount}</strong>&nbsp;bought today</div>
        <div className="pd-proof-pill">👁&nbsp;<strong>{viewCount}</strong>&nbsp;viewing now</div>
        <div className="pd-proof-pill">⚡&nbsp;Only&nbsp;<strong>7 left</strong></div>
        <Countdown end={saleEnd} />
      </div>

      {/* Breadcrumb */}
      <div className="pd-bc">
        <div className="pd-bc-inner">
          <a href="#">Home</a><span className="pd-bc-sep">›</span>
          <a href="#">Shop</a><span className="pd-bc-sep">›</span>
          <a href="#">{p.maincategory}</a><span className="pd-bc-sep">›</span>
          <a href="#">{p.subcategory}</a><span className="pd-bc-sep">›</span>
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
                    <img src={pic} alt={`View ${i+1}`} />
                  </div>
                ))}
              </div>

              <div className="pd-main-wrap" ref={imgWrapRef} onMouseMove={handleMouseMove}>
                <span className="pd-badge">{pDiscount}% OFF</span>
                <span className="pd-elite-badge">⭐ Elite 10% Off</span>
                <div className="pd-zoom-lens" ref={lensRef} />
                <div className="pd-zoom-panel" ref={zoomRef} />

                <div className="pd-img-actions">
                  <button className={`pd-img-btn wish${wishlisted?' on':''}`} onClick={handleWishlistToggle}>
                    <svg width="16" height="16" fill="none" stroke="#e11d48" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                  </button>
                  <div style={{ position:'relative' }}>
                    <button className="pd-img-btn" onClick={() => setShareOpen(o=>!o)}>
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                    </button>
                    {shareOpen && (
                      <div className="pd-share-drop">
                        {[{icon:'🔗',label:'Copy Link'},{icon:'💬',label:'WhatsApp'},{icon:'📸',label:'Instagram'},{icon:'𝕏',label:'Twitter / X'}].map(s=>(
                          <div key={s.label} className="pd-share-item" onClick={() => { toast_(`Opening ${s.label}…`); setShareOpen(false); }}>
                            <span>{s.icon}</span>{s.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <img src={mainImg} className={`pd-main-img${imgFade?' fade':''}`} alt={p.name} />

                <div className="pd-dots">
                  {displayPics.map((pic,i) => (
                    <button key={i} className={`pd-dot${mainImg===pic?' on':''}`} onClick={() => switchImg(pic)} />
                  ))}
                </div>
              </div>
            </div>

            <div className="pd-view-strip">
              <button className="pd-view-btn" onClick={() => toast_('360° View coming soon!')}>🔄 360° View</button>
              <button className="pd-view-btn" onClick={() => toast_('Video preview coming soon!')}>▶ Video</button>
              <button className="pd-view-btn" onClick={() => toast_('Try at Home available at checkout!')}>🏠 Try at Home</button>
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
              {appliedCoupon && (
                <div className="pd-coupon-applied">🎉 Coupon <strong>{appliedCoupon}</strong> — extra ₹{Math.round(pFinal*0.1).toLocaleString('en-IN')} off</div>
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
              <button className="pd-btn-notify" onClick={() => toast_('🔔 Price drop alert set!')}>🔔 Notify Me on Price Drop</button>
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
                {['ELITE10','HDFC10','GIFTWRAP'].map(c=><span key={c} className="pd-coupon-chip" onClick={()=>setCoupon(c)}>{c}</span>)}
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
            <div className="pd-emi">
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
            </div>

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
            {[{id:'details',label:'Details'},{id:'features',label:'Features'},{id:'specs',label:'Specifications'},{id:'care',label:'Care Guide'},{id:'reviews',label:`Reviews (${pReviews})`},{id:'qa',label:`Q&A (${QA_LIST.length})`}].map(t=>(
              <button key={t.id} className={`pd-tab${tab===t.id?' on':''}`} onClick={()=>setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          <div className="pd-tab-body">
            {tab==='details' && <p className="pd-desc">{p.description || p.details || 'A premium luxury product featuring the finest craftsmanship. Meticulously designed to provide both supreme comfort and unparalleled elegance.'}</p>}

            {tab==='features' && (
              <div className="pd-feat-grid">
                {FEATURES.map((f,i)=><div key={i} className="pd-feat-item"><span className="pd-feat-dot">✦</span>{f}</div>)}
              </div>
            )}

            {tab==='specs' && (
              <table className="pd-spec-table">
                <tbody>{SPECS.map(([k,v])=><tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody>
              </table>
            )}

            {tab==='care' && (
              <div className="pd-care-grid">
                {CARE_ITEMS.map((c,i)=><div key={i} className="pd-care-item"><span className="pd-care-icon">{c.icon}</span>{c.text}</div>)}
              </div>
            )}

            {tab==='reviews' && (
              <div>
                <div className="pd-rev-section">
                  <div className="pd-rev-big">
                    <div className="pd-rev-num">{pRating}</div>
                    <div className="pd-rev-star-row"><Stars rating={pRating} size={18}/></div>
                    <div className="pd-rev-ct">{pReviews} reviews</div>
                  </div>
                  <div className="pd-rev-bars">
                    {RATING_DIST.map(r=>(
                      <div key={r.stars} className="pd-rev-bar-row">
                        <span className="pd-rev-bar-lbl">{r.stars}★</span>
                        <div className="pd-rev-bar-track"><div className="pd-rev-bar-fill" style={{ width:`${r.pct}%` }}/></div>
                        <span className="pd-rev-bar-pct">{r.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pd-rev-cards">
                  {REVIEWS.map((r,i)=>(
                    <div key={i} className="pd-rev-card">
                      <div className="pd-rev-card-top">
                        <div className="pd-rev-avatar">{r.initial}</div>
                        <div className="pd-rev-meta"><div className="pd-rev-user">{r.user}</div><div className="pd-rev-date">{r.date}</div></div>
                        <Stars rating={r.rating} size={12}/>
                      </div>
                      <p className="pd-rev-body">{r.body}</p>
                      {r.verified && <div className="pd-rev-vbadge"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Verified Purchase</div>}
                      <div className="pd-rev-helpful">Was this helpful? <button onClick={()=>toast_('Thanks!')}>👍 Yes ({r.helpful})</button> <button onClick={()=>toast_('Thanks!')}>👎 No</button></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
          <div className="pd-fbt">
            <div className="pd-fbt-title">Frequently Bought Together</div>
            <div className="pd-fbt-sub">Complete the look — save more when you bundle</div>
            <div className="pd-fbt-row">
              <div className="pd-fbt-product">
                <img src={displayPics[0]} alt={p.name} className="pd-fbt-img"/>
                <div className="pd-fbt-name">{p.name}</div>
                <div className="pd-fbt-price">₹{pFinal.toLocaleString('en-IN')}</div>
                <div className="pd-fbt-mrp">₹{pBase.toLocaleString('en-IN')}</div>
              </div>
              {FBT.map(fp=>(
                <React.Fragment key={fp.name}>
                  <span className="pd-fbt-plus">+</span>
                  <div className="pd-fbt-product">
                    <img src={fp.img} alt={fp.name} className="pd-fbt-img"/>
                    <div className="pd-fbt-name">{fp.name}</div>
                    <div className="pd-fbt-price">₹{fp.price.toLocaleString('en-IN')}</div>
                    <div className="pd-fbt-mrp">₹{fp.mrp.toLocaleString('en-IN')}</div>
                  </div>
                </React.Fragment>
              ))}
              <div className="pd-fbt-total">
                <div className="pd-fbt-total-lbl">Bundle Total</div>
                <div className="pd-fbt-total-price">₹{fbtTotal.toLocaleString('en-IN')}</div>
                <div className="pd-fbt-total-save">You save ₹{fbtSave.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <button className="pd-fbt-btn" onClick={()=>toast_('All 4 items added to cart!')}>Add All to Cart</button>
          </div>
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
            <table className="pd-sz-table">
              <thead><tr><th>Size</th><th>Chest (in)</th><th>Shoulder (in)</th><th>Length (in)</th><th>Sleeve (in)</th></tr></thead>
              <tbody>{SIZE_GUIDE.map(row=><tr key={row[0]}>{row.map((c,i)=><td key={i}>{c}</td>)}</tr>)}</tbody>
            </table>
            <p className="pd-sz-hint">💡 <strong>How to measure:</strong> Measure your chest at its fullest point. If between sizes, size up for a relaxed fit or down for a slim fit. All measurements in inches.</p>
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
              <label className="pd-finder-lbl">Chest (inches)</label>
              <input className="pd-finder-inp" type="number" placeholder="e.g. 38" value={finderChest} onChange={e=>setFinderChest(e.target.value)} />
            </div>
            <button className="pd-btn-cart" onClick={findMySize} style={{ marginTop:8 }}>Find My Size</button>
            {finderResult && <div className="pd-finder-result">{finderResult}</div>}
          </div>
        </div>
      )}

      <div className={`pd-toast${toastVis?' show':''}`}>{toast}</div>
    </div>
  );
}
