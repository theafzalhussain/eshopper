import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'
import { BASE_URL } from '../constants'
import {
  Clock3, PackageSearch, Search, SlidersHorizontal,
  X, ArrowLeft, ChevronRight, MessageCircle,
  MapPin, Calendar, RotateCcw, Package,
  CreditCard, TrendingUp, CheckCircle2, Truck
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

:root {
  --gold:    #C9A84C;
  --gold-lt: #E8C97A;
  --gold-dk: #9A7A20;
  --teal:    #1A8C8C;
  --ink:     #0A0A0A;
  --card:    #141414;
  --card2:   #1E1E1E;
  --card3:   #252525;
  --smoke:   #F7F5F0;
  --ash:     #888;
  --white:   #FFFFFF;
  --bd:      rgba(255,255,255,0.07);
  --shadow-g:0 24px 64px rgba(201,168,76,0.12);
}

.mop2-page {
  font-family:'DM Sans',sans-serif;
  background:#F4F1EB;
  min-height:100vh;
  padding-bottom:100px;
}

/* HERO */
.mop2-hero {
  background:linear-gradient(160deg,#080808 0%,#161616 55%,#0f1a1a 100%);
  padding:52px 0 44px;
  position:relative;
  overflow:hidden;
}
.mop2-hero-orb1 {
  position:absolute;top:-80px;right:-80px;
  width:320px;height:320px;
  background:radial-gradient(circle,rgba(201,168,76,0.15) 0%,transparent 65%);
  border-radius:50%;pointer-events:none;
}
.mop2-hero-orb2 {
  position:absolute;bottom:-60px;left:5%;
  width:220px;height:220px;
  background:radial-gradient(circle,rgba(26,140,140,0.1) 0%,transparent 65%);
  border-radius:50%;pointer-events:none;
}
.mop2-hero-inner {
  max-width:1180px;margin:0 auto;padding:0 28px;
  display:flex;align-items:flex-end;
  justify-content:space-between;flex-wrap:wrap;gap:20px;
  position:relative;z-index:1;
}
.mop2-eyebrow {
  font-size:10px;letter-spacing:0.26em;text-transform:uppercase;
  color:var(--gold);font-weight:600;margin-bottom:10px;
  display:flex;align-items:center;gap:10px;
}
.mop2-eyebrow::before {
  content:'';display:inline-block;
  width:28px;height:1px;
  background:linear-gradient(90deg,var(--gold),transparent);
}
.mop2-hero-title {
  font-family:'Cormorant Garamond',serif;
  font-size:clamp(40px,5.5vw,64px);
  font-weight:300;color:var(--white);
  letter-spacing:-0.02em;line-height:1;margin:0 0 8px;
}
.mop2-hero-title em{font-style:italic;color:var(--gold-lt);}
.mop2-hero-sub{font-size:13px;color:rgba(255,255,255,0.35);letter-spacing:0.05em;margin:0;}
.mop2-hero-right{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}

.mop2-live {
  display:flex;align-items:center;gap:8px;
  padding:8px 18px;border-radius:2px;
  font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;border:1px solid;
}
.mop2-live.on{background:rgba(34,197,94,0.08);color:#4ade80;border-color:rgba(34,197,94,0.2);}
.mop2-live.off{background:rgba(239,68,68,0.08);color:#f87171;border-color:rgba(239,68,68,0.18);}
.mop2-live-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.mop2-live.on .mop2-live-dot{background:#4ade80;animation:lp 2s infinite;}
.mop2-live.off .mop2-live-dot{background:#f87171;}
@keyframes lp{0%,100%{box-shadow:0 0 0 3px rgba(74,222,128,0.2);}50%{box-shadow:0 0 0 7px rgba(74,222,128,0.04);}}

.mop2-back {
  display:flex;align-items:center;gap:8px;
  padding:9px 20px;background:transparent;
  border:1px solid rgba(201,168,76,0.28);border-radius:2px;
  color:var(--gold);font-family:'DM Sans',sans-serif;
  font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;
  cursor:pointer;transition:all 0.22s;
}
.mop2-back:hover{background:rgba(201,168,76,0.08);border-color:var(--gold);}

/* STATS */
.mop2-stats{background:var(--white);border-bottom:1px solid #E8E4DC;}
.mop2-stats-inner {
  max-width:1180px;margin:0 auto;padding:0 28px;
  display:grid;grid-template-columns:repeat(4,1fr);
}
.mop2-stat {
  padding:20px 16px;text-align:center;
  border-right:1px solid #E8E4DC;
  position:relative;transition:background 0.2s;
}
.mop2-stat:last-child{border-right:none;}
.mop2-stat::after {
  content:'';position:absolute;bottom:0;left:20%;right:20%;height:2px;
  background:linear-gradient(90deg,transparent,var(--gold),transparent);
  opacity:0;transition:opacity 0.25s;
}
.mop2-stat:hover{background:#FAFAF7;}
.mop2-stat:hover::after{opacity:1;}
.mop2-stat-icon{margin-bottom:6px;color:var(--gold);opacity:0.65;}
.mop2-stat-num{
  font-family:'Cormorant Garamond',serif;
  font-size:28px;font-weight:600;
  color:var(--ink);line-height:1;margin-bottom:3px;
}
.mop2-stat-num.gold{color:var(--gold-dk);}
.mop2-stat-label{font-size:9.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--ash);font-weight:600;}
@media(max-width:640px){.mop2-stats-inner{grid-template-columns:1fr 1fr;}.mop2-stat{border-bottom:1px solid #E8E4DC;}}

/* MAIN */
.mop2-main{max-width:1180px;margin:0 auto;padding:36px 28px 0;}

/* TABS */
.mop2-tabs{display:flex;gap:6px;margin-bottom:22px;flex-wrap:wrap;}
.mop2-tab {
  display:flex;align-items:center;gap:8px;
  padding:9px 20px;border-radius:2px;
  font-family:'DM Sans',sans-serif;font-size:10px;
  font-weight:700;letter-spacing:0.15em;text-transform:uppercase;
  cursor:pointer;transition:all 0.2s;border:1px solid;
}
.mop2-tab.active{background:var(--ink);color:var(--white);border-color:var(--ink);box-shadow:0 6px 20px rgba(10,10,10,0.22);}
.mop2-tab.inactive{background:var(--white);color:var(--ash);border-color:#DDD9D0;}
.mop2-tab.inactive:hover{border-color:rgba(201,168,76,0.3);color:var(--ink);}
.mop2-tab-pill{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;border-radius:2px;font-size:10px;font-weight:700;}
.mop2-tab.active .mop2-tab-pill{background:rgba(255,255,255,0.15);}
.mop2-tab.inactive .mop2-tab-pill{background:#EDEAE3;}

/* SEARCH BOX */
.mop2-search-box {
  background:var(--white);border:1px solid #E8E4DC;border-radius:4px;
  padding:18px 20px;margin-bottom:22px;
  box-shadow:0 2px 12px rgba(10,10,10,0.05);
}
.mop2-search-row{display:flex;gap:10px;align-items:center;}
.mop2-search-wrap{flex:1;position:relative;}
.mop2-search-ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--ash);pointer-events:none;}
.mop2-search-input {
  width:100%;border:1px solid #E0DCD3;border-radius:3px;
  padding:11px 14px 11px 42px;background:#FAFAF7;
  font-family:'DM Sans',sans-serif;font-size:13px;
  color:var(--ink);outline:none;transition:all 0.2s;
}
.mop2-search-input::placeholder{color:#BBB8B0;}
.mop2-search-input:focus{border-color:var(--teal);background:var(--white);box-shadow:0 0 0 3px rgba(26,140,140,0.07);}
.mop2-filter-btn {
  display:flex;align-items:center;gap:7px;
  padding:11px 18px;background:transparent;
  border:1px solid #E0DCD3;border-radius:3px;
  font-family:'DM Sans',sans-serif;font-size:10px;
  font-weight:700;letter-spacing:0.12em;text-transform:uppercase;
  color:var(--ash);cursor:pointer;transition:all 0.2s;white-space:nowrap;
}
.mop2-filter-btn:hover,.mop2-filter-btn.open{border-color:var(--gold);color:var(--gold-dk);background:rgba(201,168,76,0.05);}
.mop2-clear-btn {
  display:flex;align-items:center;gap:6px;
  padding:11px 14px;background:transparent;
  border:1px solid #E0DCD3;border-radius:3px;
  font-size:10px;font-weight:700;letter-spacing:0.08em;
  color:var(--ash);cursor:pointer;transition:all 0.2s;white-space:nowrap;
}
.mop2-clear-btn:hover{border-color:#e11d48;color:#e11d48;}
.mop2-adv{display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end;border-top:1px solid #F0ECE4;margin-top:14px;padding-top:14px;}
@media(max-width:600px){.mop2-adv{grid-template-columns:1fr;}}
.mop2-date-group label{display:block;font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ash);font-weight:700;margin-bottom:6px;}
.mop2-date-input{width:100%;border:1px solid #E0DCD3;border-radius:3px;padding:10px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink);background:#FAFAF7;outline:none;transition:border-color 0.2s;}
.mop2-date-input:focus{border-color:var(--teal);}
.mop2-reset-btn{display:flex;align-items:center;gap:6px;padding:10px 14px;background:transparent;border:1px solid #E0DCD3;border-radius:3px;font-size:10px;font-weight:700;color:var(--ash);cursor:pointer;transition:all 0.2s;white-space:nowrap;}
.mop2-reset-btn:hover{border-color:var(--gold);color:var(--gold-dk);}

/* COUNT */
.mop2-count{font-size:11.5px;color:var(--ash);margin-bottom:16px;letter-spacing:0.05em;}
.mop2-count strong{color:var(--ink);}

/* ══ ORDER CARD — DARK ══ */
.mop2-card {
  background:var(--card);
  border:1px solid var(--bd);
  border-radius:8px;
  margin-bottom:18px;
  overflow:hidden;
  position:relative;
  transition:transform 0.28s cubic-bezier(.25,.46,.45,.94),box-shadow 0.28s,border-color 0.28s;
  cursor:pointer;
}
.mop2-card::before {
  content:'';
  position:absolute;left:0;top:0;bottom:0;width:3px;
  background:linear-gradient(180deg,var(--gold) 0%,var(--teal) 100%);
  opacity:0;transition:opacity 0.28s;
}
.mop2-card:hover{
  transform:translateY(-5px);
  border-color:rgba(201,168,76,0.3);
  box-shadow:0 28px 72px rgba(0,0,0,0.5),0 0 0 1px rgba(201,168,76,0.1),var(--shadow-g);
}
.mop2-card:hover::before{opacity:1;}

.mop2-card-head {
  display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;
  padding:20px 22px 18px;border-bottom:1px solid var(--bd);
  background:linear-gradient(135deg,#181818 0%,#141414 100%);
}
.mop2-order-id{
  font-family:'Cormorant Garamond',serif;
  font-size:22px;font-weight:600;color:var(--white);letter-spacing:0.02em;
}
.mop2-order-date{display:flex;align-items:center;gap:5px;font-size:11.5px;color:rgba(255,255,255,0.3);margin-top:3px;}
.mop2-chip{padding:5px 14px;border-radius:2px;font-size:9.5px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;flex-shrink:0;border:1px solid;}

.mop2-card-body{padding:20px 22px;}

.mop2-meta-row{
  display:grid;grid-template-columns:1fr 1fr;
  gap:1px;margin-bottom:18px;
  background:var(--bd);border:1px solid var(--bd);border-radius:5px;overflow:hidden;
}
@media(max-width:500px){.mop2-meta-row{grid-template-columns:1fr;}}
.mop2-meta-cell{background:var(--card2);padding:14px 16px;}
.mop2-meta-lbl{font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.28);font-weight:700;margin-bottom:5px;}
.mop2-meta-val{font-size:15px;font-weight:600;color:rgba(255,255,255,0.85);}
.mop2-meta-val.gold{font-family:'Cormorant Garamond',serif;font-size:27px;color:var(--gold-lt);letter-spacing:-0.01em;}

.mop2-product{
  display:flex;align-items:center;gap:14px;
  padding:13px 14px;
  background:var(--card3);border:1px solid var(--bd);border-radius:5px;margin-bottom:18px;
}
.mop2-product-img{width:58px;height:58px;border-radius:4px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:#1a1a1a;flex-shrink:0;}
.mop2-product-img img{width:100%;height:100%;object-fit:cover;}
.mop2-product-name{font-size:13px;font-weight:500;color:rgba(255,255,255,0.78);margin-bottom:3px;}
.mop2-product-price{font-size:12px;color:rgba(255,255,255,0.32);}
.mop2-more{margin-left:auto;font-size:11px;color:var(--gold);white-space:nowrap;}

/* PROGRESS */
.mop2-prog-wrap{margin-bottom:20px;}
.mop2-prog-lbl{font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.28);font-weight:700;margin-bottom:14px;}
.mop2-prog-track{display:flex;align-items:flex-start;justify-content:space-between;position:relative;padding-top:0;}
.mop2-prog-line{position:absolute;top:5px;left:5px;right:5px;height:2px;background:rgba(255,255,255,0.07);z-index:0;}
.mop2-prog-fill{position:absolute;top:5px;left:5px;height:2px;background:linear-gradient(90deg,var(--teal),var(--gold));z-index:1;border-radius:1px;transition:width 0.7s cubic-bezier(.25,.46,.45,.94);}
.mop2-prog-step{display:flex;flex-direction:column;align-items:center;gap:7px;position:relative;z-index:2;}
.mop2-prog-dot{width:12px;height:12px;border-radius:50%;border:2px solid rgba(255,255,255,0.1);background:var(--card);transition:all 0.3s;}
.mop2-prog-dot.done{background:var(--teal);border-color:var(--teal);box-shadow:0 0 0 3px rgba(26,140,140,0.18);}
.mop2-prog-dot.cur{background:var(--gold);border-color:var(--gold);animation:curpulse 2.2s infinite;}
@keyframes curpulse{0%,100%{box-shadow:0 0 0 4px rgba(201,168,76,0.25);}50%{box-shadow:0 0 0 8px rgba(201,168,76,0.06);}}
.mop2-prog-lbl2{font-size:9px;color:rgba(255,255,255,0.22);text-align:center;max-width:52px;line-height:1.3;}
.mop2-prog-lbl2.done{color:var(--teal);font-weight:600;}
.mop2-prog-lbl2.cur{color:var(--gold);font-weight:700;}

/* ACTIONS */
.mop2-actions{display:flex;gap:10px;flex-wrap:wrap;}
.mop2-btn-track {
  flex:1;display:flex;align-items:center;justify-content:center;gap:8px;
  padding:13px 20px;min-width:140px;
  background:linear-gradient(135deg,#C9A84C 0%,#9A7A20 100%);
  color:var(--ink);border:none;border-radius:3px;
  font-family:'DM Sans',sans-serif;font-size:10px;font-weight:800;
  letter-spacing:0.18em;text-transform:uppercase;cursor:pointer;
  transition:all 0.22s;position:relative;overflow:hidden;
}
.mop2-btn-track::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.15) 0%,transparent 50%);pointer-events:none;}
.mop2-btn-track:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(201,168,76,0.38);}
.mop2-btn-wa {
  flex:1;display:flex;align-items:center;justify-content:center;gap:8px;
  padding:13px 20px;min-width:140px;
  background:transparent;border:1px solid rgba(37,211,102,0.3);border-radius:3px;
  color:#25D366;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:800;
  letter-spacing:0.18em;text-transform:uppercase;cursor:pointer;transition:all 0.22s;
}
.mop2-btn-wa:hover{background:rgba(37,211,102,0.08);border-color:rgba(37,211,102,0.55);transform:translateY(-2px);box-shadow:0 8px 24px rgba(37,211,102,0.14);}

/* EMPTY */
.mop2-empty{text-align:center;padding:80px 24px;background:var(--card);border:1px solid var(--bd);border-radius:8px;}
.mop2-empty-title{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;color:rgba(255,255,255,0.45);margin:16px 0 8px;}
.mop2-empty-sub{font-size:13px;color:rgba(255,255,255,0.22);}

/* SKELETON */
.mop2-skel{background:linear-gradient(90deg,#1e1e1e 25%,#282828 50%,#1e1e1e 75%);background-size:200% 100%;animation:sk 1.4s infinite;border-radius:3px;}
@keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}

@media(max-width:640px){
  .mop2-hero-inner{flex-direction:column;align-items:flex-start;}
  .mop2-actions{flex-direction:column;}
}
`

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
const FILTERS = ['All', 'In Transit', 'Delivered']
const STEPS   = ['Ordered', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered']

const normalizeStatus = (v = '') => {
  const r = String(v).trim().toLowerCase()
  if (r === 'order placed' || r === 'ordered') return 'Ordered'
  if (r === 'packed')           return 'Packed'
  if (r === 'shipped')          return 'Shipped'
  if (r === 'out for delivery') return 'Out for Delivery'
  if (r === 'delivered')        return 'Delivered'
  return 'Ordered'
}

const ST = {
  'Ordered':          { bg:'rgba(14,165,233,0.1)',  color:'#38BDF8', border:'rgba(14,165,233,0.22)' },
  'Packed':           { bg:'rgba(245,158,11,0.1)',  color:'#FCD34D', border:'rgba(245,158,11,0.22)' },
  'Shipped':          { bg:'rgba(201,168,76,0.12)', color:'#E8C97A', border:'rgba(201,168,76,0.28)' },
  'Out for Delivery': { bg:'rgba(168,85,247,0.1)',  color:'#C084FC', border:'rgba(168,85,247,0.2)'  },
  'Delivered':        { bg:'rgba(34,197,94,0.1)',   color:'#4ADE80', border:'rgba(34,197,94,0.22)'  },
}

// ═══════════════════════════════════════════════════════════════════
// PROGRESS
// ═══════════════════════════════════════════════════════════════════
function Progress({ status }) {
  const norm   = normalizeStatus(status)
  const curIdx = STEPS.indexOf(norm)
  const pct    = curIdx < 0 ? 0 : Math.round((curIdx / (STEPS.length - 1)) * 100)
  return (
    <div className="mop2-prog-wrap">
      <div className="mop2-prog-lbl">Order Progress</div>
      <div className="mop2-prog-track">
        <div className="mop2-prog-line" />
        <div className="mop2-prog-fill" style={{ width:`${pct}%` }} />
        {STEPS.map((s, i) => {
          const done = i < curIdx, cur = i === curIdx
          return (
            <div className="mop2-prog-step" key={s}>
              <div className={`mop2-prog-dot${done?' done':cur?' cur':''}`} />
              <div className={`mop2-prog-lbl2${done?' done':cur?' cur':''}`}>{s}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ORDER CARD
// ═══════════════════════════════════════════════════════════════════
function OrderCard({ item, idx, navigate, onWA }) {
  const norm   = normalizeStatus(item.orderStatus)
  const st     = ST[norm] || ST['Ordered']
  const items  = item.orderItems || item.products || []
  const first  = items[0] || {}
  const img    = first.image || first.pic || first.pic1 || ''
  const name   = first.title || first.name || ''
  const price  = Number(first.price || first.finalprice || 0)
  const extras = items.length > 1 ? items.length - 1 : 0

  return (
    <motion.div
      className="mop2-card"
      initial={{ opacity:0, y:20 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:-10 }}
      transition={{ delay: idx * 0.06, duration: 0.38 }}
      layout
      onClick={() => navigate(`/order-tracking/${item.orderId}`)}
    >
      {/* HEAD */}
      <div className="mop2-card-head">
        <div>
          <div className="mop2-order-id">{item.orderId}</div>
          <div className="mop2-order-date">
            <Clock3 size={11} />
            {new Date(item.updatedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
          </div>
        </div>
        <span className="mop2-chip" style={{ background:st.bg, color:st.color, borderColor:st.border }}>{norm}</span>
      </div>

      {/* BODY */}
      <div className="mop2-card-body">
        {/* Meta */}
        <div className="mop2-meta-row">
          <div className="mop2-meta-cell">
            <div className="mop2-meta-lbl">Amount Paid</div>
            <div className="mop2-meta-val gold">₹{Number(item.finalAmount||0).toLocaleString('en-IN')}</div>
          </div>
          <div className="mop2-meta-cell">
            <div className="mop2-meta-lbl">Payment Method</div>
            <div className="mop2-meta-val">{item.paymentMethod || 'Cash on Delivery'}</div>
          </div>
        </div>

        {/* Product */}
        {name && (
          <div className="mop2-product">
            <div className="mop2-product-img">
              {img
                ? <img src={img} alt={name} />
                : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.15)', fontSize:10 }}>IMG</div>
              }
            </div>
            <div>
              <div className="mop2-product-name">{name}</div>
              <div className="mop2-product-price">₹{price.toLocaleString('en-IN')}</div>
            </div>
            {extras > 0 && <div className="mop2-more">+{extras} more</div>}
          </div>
        )}

        {/* Progress */}
        <Progress status={item.orderStatus} />

        {/* Buttons */}
        <div className="mop2-actions" onClick={e => e.stopPropagation()}>
          <motion.button
            className="mop2-btn-track"
            onClick={() => navigate(`/order-tracking/${item.orderId}`)}
            whileHover={{ scale:1.01 }} whileTap={{ scale:0.98 }}
          >
            <MapPin size={13} />
            Track Order
            <ChevronRight size={13} />
          </motion.button>
          <motion.button
            className="mop2-btn-wa"
            onClick={() => onWA(item.orderId)}
            whileHover={{ scale:1.01 }} whileTap={{ scale:0.98 }}
          >
            <MessageCircle size={13} />
            WhatsApp Support
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function MyOrders() {
  const navigate  = useNavigate()
  const userId    = localStorage.getItem('userid')
  const socketRef = useRef(null)

  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [active,  setActive]  = useState('All')
  const [search,  setSearch]  = useState('')
  const [from,    setFrom]    = useState('')
  const [to,      setTo]      = useState('')
  const [showAdv, setShowAdv] = useState(false)
  const [liveOn,  setLiveOn]  = useState(false)

  const openWA = (orderId) => {
    const msg = `Hi Luxe Support, I need assistance with my Order: ${orderId}`
    window.open(`https://wa.me/918447859784?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
  }

  // FETCH
  useEffect(() => {
    const load = async () => {
      if (!userId) { setError('Please login'); setLoading(false); return }
      try {
        setLoading(true)
        const { data } = await axios.get(`${BASE_URL}/api/orders/${userId}`, { timeout: 15000 })
        setOrders(Array.isArray(data?.orders) ? data.orders : [])
      } catch { setError('Unable to load your orders right now') }
      finally { setLoading(false) }
    }
    load()
  }, [userId])

  // SOCKET
  useEffect(() => {
    if (!userId) return
    let mounted = true
    const sock = io(BASE_URL, {
      auth: { userId }, transports: ['websocket','polling'],
      reconnection:true, reconnectionDelay:1000,
      reconnectionDelayMax:5000, reconnectionAttempts:5
    })
    socketRef.current = sock
    sock.on('connect',    () => { if (mounted) setLiveOn(true)  })
    sock.on('disconnect', () => { if (mounted) setLiveOn(false) })
    sock.on('statusUpdate', p => {
      if (p?.orderId && p?.status && mounted)
        setOrders(prev => prev.map(o =>
          o.orderId === p.orderId
            ? { ...o, orderStatus:p.status, updatedAt:p.updatedAt||new Date().toISOString() }
            : o
        ))
    })
    return () => { mounted=false; sock.disconnect() }
  }, [userId])

  // FILTER
  const filtered = useMemo(() => {
    let r = [...orders]
    if (active === 'Delivered')
      r = r.filter(o => normalizeStatus(o.orderStatus) === 'Delivered')
    else if (active === 'In Transit')
      r = r.filter(o => ['Ordered','Packed','Shipped','Out for Delivery'].includes(normalizeStatus(o.orderStatus)))
    if (search.trim())
      r = r.filter(o => String(o.orderId||'').toLowerCase().includes(search.trim().toLowerCase()))
    if (from) { const f=new Date(from); f.setHours(0,0,0,0); r=r.filter(o=>new Date(o.updatedAt)>=f) }
    if (to)   { const t=new Date(to);   t.setHours(23,59,59,999); r=r.filter(o=>new Date(o.updatedAt)<=t) }
    return r
  }, [orders, active, search, from, to])

  // STATS
  const total   = orders.length
  const transit = orders.filter(o => ['Ordered','Packed','Shipped','Out for Delivery'].includes(normalizeStatus(o.orderStatus))).length
  const done    = orders.filter(o => normalizeStatus(o.orderStatus) === 'Delivered').length
  const spent   = orders.reduce((s,o) => s + Number(o.finalAmount||0), 0)
  const hasF    = search || from || to

  const STATS = [
    { num:total,  label:'Total Orders', gold:false, Icon:Package       },
    { num:transit,label:'In Transit',   gold:false, Icon:Truck         },
    { num:done,   label:'Delivered',    gold:false, Icon:CheckCircle2  },
    { num:`₹${spent.toLocaleString('en-IN')}`, label:'Total Spent', gold:true, Icon:TrendingUp },
  ]

  return (
    <>
      <style>{CSS}</style>
      <div className="mop2-page">

        {/* HERO */}
        <div className="mop2-hero">
          <div className="mop2-hero-orb1" />
          <div className="mop2-hero-orb2" />
          <div className="mop2-hero-inner">
            <div>
              <div className="mop2-eyebrow">EShopper Boutique Luxe</div>
              <h1 className="mop2-hero-title">My <em>Orders</em></h1>
              <p className="mop2-hero-sub">Track all your recent and past orders in one place</p>
            </div>
            <div className="mop2-hero-right">
              <div className={`mop2-live ${liveOn?'on':'off'}`}>
                <div className="mop2-live-dot" />
                {liveOn ? 'Live Updates' : 'Connecting…'}
              </div>
              <button className="mop2-back" onClick={() => navigate('/profile')}>
                <ArrowLeft size={12} /> Back to Profile
              </button>
            </div>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="mop2-stats">
          <div className="mop2-stats-inner">
            {STATS.map((s,i) => (
              <motion.div key={i} className="mop2-stat"
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                transition={{ delay:0.08*i }}
              >
                <div className="mop2-stat-icon"><s.Icon size={16} /></div>
                <div className={`mop2-stat-num${s.gold?' gold':''}`}>{s.num}</div>
                <div className="mop2-stat-label">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="mop2-main">

          {/* TABS */}
          <div className="mop2-tabs">
            {FILTERS.map(f => {
              const cnt = f==='All'?total:f==='Delivered'?done:transit
              return (
                <motion.button key={f}
                  className={`mop2-tab ${active===f?'active':'inactive'}`}
                  onClick={() => setActive(f)}
                  whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                >
                  {f} <span className="mop2-tab-pill">{cnt}</span>
                </motion.button>
              )
            })}
          </div>

          {/* SEARCH */}
          <div className="mop2-search-box">
            <div className="mop2-search-row">
              <div className="mop2-search-wrap">
                <Search size={14} className="mop2-search-ico" />
                <input className="mop2-search-input" type="text"
                  placeholder="Search by Order ID…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {hasF && (
                <button className="mop2-clear-btn" onClick={() => { setSearch(''); setFrom(''); setTo('') }}>
                  <X size={12} /> Clear
                </button>
              )}
              <button className={`mop2-filter-btn${showAdv?' open':''}`} onClick={() => setShowAdv(p=>!p)}>
                <SlidersHorizontal size={13} />
                {showAdv ? 'Hide' : 'Date Filter'}
              </button>
            </div>

            <AnimatePresence>
              {showAdv && (
                <motion.div className="mop2-adv"
                  initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
                  exit={{ opacity:0, height:0 }} transition={{ duration:0.24 }}
                >
                  <div className="mop2-date-group">
                    <label><Calendar size={9} style={{ marginRight:4 }} />From Date</label>
                    <input className="mop2-date-input" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
                  </div>
                  <div className="mop2-date-group">
                    <label><Calendar size={9} style={{ marginRight:4 }} />To Date</label>
                    <input className="mop2-date-input" type="date" value={to} onChange={e=>setTo(e.target.value)} />
                  </div>
                  <button className="mop2-reset-btn" onClick={() => { setFrom(''); setTo('') }}>
                    <RotateCcw size={11} /> Reset
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* COUNT */}
          {!loading && !error && (
            <div className="mop2-count">
              Showing <strong>{filtered.length}</strong> order{filtered.length!==1?'s':''}
              {active!=='All' && <> · {active}</>}
            </div>
          )}

          {/* CARDS / STATES */}
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} className="mop2-card" style={{ pointerEvents:'none', marginBottom:18 }}>
                <div style={{ padding:'20px 22px', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'#181818' }}>
                  <div className="mop2-skel" style={{ height:22, width:'38%', marginBottom:8 }} />
                  <div className="mop2-skel" style={{ height:12, width:'20%' }} />
                </div>
                <div style={{ padding:'20px 22px' }}>
                  <div className="mop2-skel" style={{ height:72, marginBottom:14 }} />
                  <div className="mop2-skel" style={{ height:52, marginBottom:16 }} />
                  <div style={{ display:'flex', gap:10 }}>
                    <div className="mop2-skel" style={{ flex:1, height:46 }} />
                    <div className="mop2-skel" style={{ flex:1, height:46 }} />
                  </div>
                </div>
              </div>
            ))
          ) : error ? (
            <div className="mop2-empty">
              <PackageSearch size={44} style={{ color:'rgba(255,255,255,0.14)' }} />
              <div className="mop2-empty-title">Something went wrong</div>
              <div className="mop2-empty-sub">{error}</div>
            </div>
          ) : filtered.length ? (
            <AnimatePresence mode="popLayout">
              {filtered.map((item, idx) => (
                <OrderCard key={item.orderId} item={item} idx={idx}
                  navigate={navigate} onWA={openWA} />
              ))}
            </AnimatePresence>
          ) : (
            <motion.div className="mop2-empty" initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <PackageSearch size={48} style={{ color:'rgba(255,255,255,0.14)' }} />
              <div className="mop2-empty-title">No orders found</div>
              <div className="mop2-empty-sub">Try adjusting your filters or search term</div>
            </motion.div>
          )}

        </div>
      </div>
    </>
  )
}