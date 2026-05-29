import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import { getUser } from "../Store/ActionCreaters/UserActionCreators"
import { getWishlist } from "../Store/ActionCreaters/WishlistActionCreators"
import { getCheckout } from "../Store/ActionCreaters/CheckoutActionCreators"
import BuyerProfile from './BuyerProfile'
import { useMembership } from './MembershipContext'
import { motion, AnimatePresence } from 'framer-motion'
import { BASE_URL, SOCKET_TRANSPORTS } from '../constants'
import {
    ArrowRight, ShoppingBag, Clock3, Heart, ShoppingCart,
    Package, Shield, Settings, LayoutGrid, Sparkles, Star,
    UserCog, Crown, Award, ChevronRight, TrendingUp, Zap,
    Gift, Headphones, Truck, Wifi, WifiOff, CheckCircle2,
    Circle, Dot, IndianRupee, BarChart3, Target, Bell
} from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

/* ══════════════════════════════════════════════════════════════
   PURE LOGIC — ZERO CHANGES (backend / Redux / socket untouched)
══════════════════════════════════════════════════════════════ */
function normalizeProfileUserPayload(rawUser = {}, prevUser = {}) {
    const source = (rawUser && typeof rawUser === 'object' && rawUser.user && typeof rawUser.user === 'object')
        ? rawUser.user : rawUser

    const pickMapped = (keys = []) => {
        for (const key of keys)
            if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined && source[key] !== null)
                return source[key]
        for (const key of keys)
            if (Object.prototype.hasOwnProperty.call(prevUser, key) && prevUser[key] !== undefined && prevUser[key] !== null)
                return prevUser[key]
        return ''
    }

    const merged = { ...prevUser, ...source }
    return {
        ...merged,
        id: pickMapped(['id', '_id']),
        _id: pickMapped(['_id', 'id']),
        name: pickMapped(['name']),
        username: pickMapped(['username', 'userName']),
        email: pickMapped(['email']),
        phone: pickMapped(['phone']),
        pic: pickMapped(['pic', 'avatar']),
        addressline1: pickMapped(['addressline1', 'streetAddress', 'address']),
        addressline2: pickMapped(['addressline2', 'addressLine2', 'address_line2']),
        landmark: pickMapped(['landmark', 'deliveryLandmark', 'land_mark']),
        city: pickMapped(['city']),
        state: pickMapped(['state']),
        pin: pickMapped(['pin', 'postalCode', 'zipCode', 'pincode']),
        deliveryNotes: pickMapped(['deliveryNotes', 'deliveryInstructions', 'deliveryInstruction']),
    }
}

/* ══════════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,600&display=swap');

/* ── RESET / BASE ─────────────────────────────────────────── */
.pf2 { font-family: 'Inter', sans-serif; background: #f4f3ef; min-height: 100vh; padding-bottom: 80px; }
.pf2 *, .pf2 *::before, .pf2 *::after { box-sizing: border-box; }
.pf2 a { text-decoration: none; }
.pf2 button { font-family: 'Inter', sans-serif; }

/* ── HERO ─────────────────────────────────────────────────── */
.pf2-hero {
    position: relative;
    background: #0a0a0a;
    min-height: 240px;
    display: flex;
    align-items: flex-end;
    overflow: hidden;
    padding-bottom: 0;
}
.pf2-hero-bg {
    position: absolute;
    inset: 0;
    background:
        radial-gradient(ellipse 60% 80% at 80% 20%, rgba(201,168,76,0.18) 0%, transparent 60%),
        radial-gradient(ellipse 40% 60% at 10% 80%, rgba(201,168,76,0.08) 0%, transparent 60%),
        linear-gradient(160deg, #0a0a0a 0%, #13100a 50%, #0f0f0f 100%);
}
.pf2-hero-grid {
    position: absolute;
    inset: 0;
    background-image:
        linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
}
.pf2-hero-inner {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 48px 24px 0;
    display: flex;
    align-items: flex-end;
    gap: 0;
    flex-wrap: wrap;
}
.pf2-hero-text { flex: 1; padding-bottom: 40px; }
.pf2-hero-greeting {
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: rgba(201,168,76,0.7);
    font-weight: 700;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
}
.pf2-hero-greeting::before, .pf2-hero-greeting::after {
    content: '';
    width: 28px; height: 1px;
    background: rgba(201,168,76,0.4);
    display: block;
}
.pf2-hero-name {
    font-family: 'Playfair Display', serif;
    font-size: clamp(30px, 5vw, 46px);
    font-weight: 700;
    color: #fff;
    margin: 0 0 8px;
    line-height: 1.1;
    letter-spacing: -0.01em;
}
.pf2-hero-sub {
    font-size: 13.5px;
    color: rgba(255,255,255,0.45);
    margin: 0 0 20px;
    letter-spacing: 0.01em;
}
.pf2-socket-dot {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
}
.pf2-socket-dot.live {
    background: rgba(16,185,129,0.12);
    color: #10b981;
    border: 1px solid rgba(16,185,129,0.2);
}
.pf2-socket-dot.offline {
    background: rgba(239,68,68,0.1);
    color: #ef4444;
    border: 1px solid rgba(239,68,68,0.18);
}
.pf2-socket-dot .blink {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: currentColor;
    animation: pf2-blink 1.4s infinite;
}
@keyframes pf2-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}

/* ── STAT CARDS (overlap hero) ───────────────────────────── */
.pf2-stats-row {
    display: flex;
    gap: 10px;
    max-width: 1200px;
    margin: -22px auto 28px;
    padding: 0 24px;
    position: relative;
    z-index: 10;
    flex-wrap: wrap;
}
.pf2-stat {
    flex: 1;
    min-width: 130px;
    background: #fff;
    border-radius: 16px;
    border: 1px solid rgba(0,0,0,0.06);
    padding: 16px 18px;
    display: flex;
    align-items: center;
    gap: 13px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    transition: transform 0.22s, box-shadow 0.22s;
    cursor: default;
}
.pf2-stat:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
.pf2-stat-icon {
    width: 42px; height: 42px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}
.pf2-stat-val { font-size: 21px; font-weight: 800; color: #0f0f0f; line-height: 1; margin-bottom: 3px; }
.pf2-stat-lbl { font-size: 10.5px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }

/* ── CONTAINER ──────────────────────────────────────────── */
.pf2-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

/* ── TIER PROGRESS ──────────────────────────────────────── */
.pf2-tier-bar {
    background: #fff;
    border-radius: 18px;
    border: 1px solid rgba(0,0,0,0.06);
    padding: 20px 24px;
    margin-bottom: 20px;
    box-shadow: 0 2px 14px rgba(0,0,0,0.05);
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
}
.pf2-tier-icon {
    width: 52px; height: 52px;
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    background: linear-gradient(135deg, #C9A84C, #9A7A20);
    box-shadow: 0 6px 18px rgba(201,168,76,0.3);
}
.pf2-tier-texts { flex: 1; min-width: 0; }
.pf2-tier-name {
    font-size: 15px; font-weight: 800; color: #0f0f0f; margin-bottom: 3px;
    display: flex; align-items: center; gap: 8px;
}
.pf2-tier-sub { font-size: 12px; color: #6b7280; margin-bottom: 9px; }
.pf2-progress-track {
    height: 6px; background: #f3f4f6; border-radius: 999px; overflow: hidden; position: relative;
}
.pf2-progress-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #C9A84C, #E8C97A);
    position: relative;
    transition: width 1s cubic-bezier(0.4,0,0.2,1);
}
.pf2-progress-fill::after {
    content: '';
    position: absolute;
    right: 0; top: 0; bottom: 0;
    width: 20px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5));
    animation: pf2-shimmer 1.8s infinite;
}
@keyframes pf2-shimmer { 0% { opacity: 0 } 50% { opacity: 1 } 100% { opacity: 0 } }
.pf2-tier-milestones {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}
.pf2-tier-milestone {
    font-size: 11px; font-weight: 700; color: #9ca3af; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.pf2-tier-milestone.reached { color: #C9A84C; }
.pf2-tier-milestone-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #e5e7eb;
    border: 1.5px solid transparent;
}
.pf2-tier-milestone.reached .pf2-tier-milestone-dot {
    background: #C9A84C;
    border-color: rgba(201,168,76,0.3);
    box-shadow: 0 0 0 3px rgba(201,168,76,0.12);
}

/* ── TABS ─────────────────────────────────────────────────── */
.pf2-tabs-wrap {
    background: #fff;
    border-radius: 16px;
    border: 1px solid rgba(0,0,0,0.06);
    padding: 6px;
    margin-bottom: 20px;
    display: flex;
    gap: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.04);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
}
.pf2-tabs-wrap::-webkit-scrollbar { display: none; }
.pf2-tab {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 18px;
    border-radius: 12px;
    border: none;
    background: transparent;
    color: #6b7280;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
    white-space: nowrap;
    letter-spacing: 0.01em;
}
.pf2-tab:hover { background: #f9f8f5; color: #0f0f0f; }
.pf2-tab.active {
    background: #0a0a0a;
    color: #E8C97A;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
}

/* ── LAYOUT ──────────────────────────────────────────────── */
.pf2-layout { display: flex; gap: 20px;  }
.pf2-sidebar { flex: 0 0 288px; max-width: 300px; }
.pf2-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }

@media (max-width: 992px) {
    .pf2-layout { flex-direction: column; }
    .pf2-sidebar { flex: 0 0 100%; max-width: 100%; }
}
@media (max-width: 640px) {
    .pf2-hero-inner { padding: 36px 16px 0; }
    .pf2-stats-row { padding: 0 16px; gap: 8px; }
    .pf2-stat { min-width: 125px; }
    .pf2-container { padding: 0 16px; }
    .pf2-tier-bar { flex-direction: column; text-align: center; }
    .pf2-tier-milestones { justify-content: center; }
}
    @media (max-width: 350px) {
    .pf2-stat {
    padding: 16px 8px;
    max-width: 100%;
    }    
}

/* ── SIDEBAR CARD ────────────────────────────────────────── */
.pf2-profile-card {
    background: #fff;
    border-radius: 20px;
    border: 1px solid rgba(0,0,0,0.06);
    overflow: hidden;
    box-shadow: 0 8px 30px rgba(0,0,0,0.08);
    position: sticky;
    top: 120px;
    }
    .pf2-profile-card-top {
    background: linear-gradient(160deg, #0a0a0a 0%, #18130a 100%);
    padding: 40px 24px 0;
    text-align: center;
    position: relative;
    overflow: hidden;
}
.pf2-profile-card-top::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 160px; height: 160px;
    background: radial-gradient(circle, rgba(201,168,76,0.2), transparent 70%);
    border-radius: 50%;
}
.pf2-avatar-wrap {
    position: relative;
    display: inline-block;
    margin-bottom: 16px;
}
.pf2-avatar-spin {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: conic-gradient(#C9A84C 0%, #E8C97A 35%, #9A7A20 65%, #C9A84C 100%);
    z-index: 0;
}
.pf2-avatar-img, .pf2-avatar-fallback {
    position: relative;
    z-index: 1;
    width: 145px; height: 145px;
    border-radius: 50%;
    border: 6px solid #fff;
    display: block;
    object-fit: cover;
}
.pf2-avatar-fallback {
    background: linear-gradient(135deg, #1a1305, #2a1f0a);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Playfair Display', serif;
    font-size: 42px; font-weight: 700; color: #C9A84C;
}
.pf2-card-name {
    font-family: 'Playfair Display', serif;
    font-size: 26px; font-weight: 700; color: #fff;
    margin: 0 0 6px; line-height: 1.2; letter-spacing: 0.5px;
}
.pf2-card-email { font-size: 14px; color: rgba(255,255,255,0.6); margin: 0 0 20px; word-break: break-all; }
.pf2-card-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 18px; border-radius: 999px;
    font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; margin-bottom: 0;
}
.pf2-card-badge.silver {
    background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.2);
}
.pf2-card-badge.gold {
    background: rgba(201,168,76,0.15); color: #E8C97A; border: 1px solid rgba(201,168,76,0.25);
}
.pf2-card-badge.elite {
    background: linear-gradient(135deg, #C9A84C, #9A7A20); color: #fff;
    box-shadow: 0 4px 14px rgba(201,168,76,0.35);
}
.pf2-card-wave {
    height: 24px;
    background: #fff;
    margin-top: 20px;
    border-radius: 24px 24px 0 0;
}
.pf2-card-bottom { padding: 20px 28px 28px; }
.pf2-mini-stats {
    display: flex; justify-content: space-around;
    margin-bottom: 24px; padding-bottom: 24px;
    border-bottom: 1px solid rgba(201,168,76,0.1);
}
.pf2-mini-stat-val { font-size: 20px; font-weight: 800; color: #C9A84C; line-height: 1; margin-bottom: 6px; }
.pf2-mini-stat-lbl { font-size: 11px; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
.pf2-mini-divider { width: 1px; background: rgba(201,168,76,0.1); margin: 4px 0; }
.pf2-edit-btn {
    width: 100%; padding: 16px;
    background: #0a0a0a; color: #E8C97A;
    border: 1.5px solid #0a0a0a;
    border-radius: 12px;
    font-size: 13px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
    text-decoration: none;
}
.pf2-edit-btn:hover {
    background: #C9A84C; border-color: #C9A84C; color: #0a0a0a;
    box-shadow: 0 8px 26px rgba(201,168,76,0.3);
    transform: translateY(-2px);
    text-decoration: none;
}

/* ── SECTION CARD ────────────────────────────────────────── */
.pf2-card {
    background: #fff;
    border-radius: 18px;
    border: 1px solid rgba(0,0,0,0.06);
    box-shadow: 0 2px 14px rgba(0,0,0,0.05);
    overflow: hidden;
}
.pf2-card-header {
    padding: 20px 22px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
}
.pf2-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 16px; font-weight: 600; color: #0f0f0f;
    display: flex; align-items: center; gap: 8px;
}
.pf2-card-body { padding: 0 22px 22px; }

/* ── QUICK ACTIONS ───────────────────────────────────────── */
.pf2-quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 480px) { .pf2-quick-grid { grid-template-columns: 1fr; } }
.pf2-quick-btn {
    padding: 20px 18px;
    border-radius: 14px;
    border: 1.5px solid transparent;
    cursor: pointer;
    transition: all 0.24s cubic-bezier(0.4,0,0.2,1);
    display: flex;
    align-items: center;
    gap: 14px;
    text-align: left;
    background: #f8f7f3;
}
.pf2-quick-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,0.09); }
.pf2-quick-btn.gold { border-color: rgba(201,168,76,0.25); }
.pf2-quick-btn.gold:hover { border-color: #C9A84C; background: #fdf9ef; }
.pf2-quick-btn.green { border-color: rgba(16,185,129,0.2); }
.pf2-quick-btn.green:hover { border-color: #10b981; background: #f0fdf8; }
.pf2-quick-btn.dark { background: #0a0a0a; border-color: rgba(201,168,76,0.2); }
.pf2-quick-btn.dark:hover { border-color: rgba(201,168,76,0.5); box-shadow: 0 10px 28px rgba(0,0,0,0.18); }
.pf2-quick-icon {
    width: 46px; height: 46px;
    border-radius: 13px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}
.pf2-quick-title { font-size: 14px; font-weight: 700; color: #0f0f0f; margin-bottom: 2px; }
.pf2-quick-sub   { font-size: 12px; color: #9ca3af; }
.pf2-quick-btn.dark .pf2-quick-title { color: #fff; }
.pf2-quick-btn.dark .pf2-quick-sub   { color: rgba(255,255,255,0.45); }
.pf2-quick-arrow { margin-left: auto; flex-shrink: 0; }

/* ── SPENDING SUMMARY ────────────────────────────────────── */
.pf2-spending-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}
@media (max-width: 480px) { .pf2-spending-row { grid-template-columns: 1fr; } }
.pf2-spend-item {
    padding: 16px 14px;
    border-radius: 13px;
    background: #f8f7f3;
    border: 1px solid rgba(0,0,0,0.05);
    transition: transform 0.2s;
}
.pf2-spend-item:hover { transform: translateY(-2px); }
.pf2-spend-icon-wrap {
    width: 36px; height: 36px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 10px;
}
.pf2-spend-val { font-size: 17px; font-weight: 800; color: #0f0f0f; margin-bottom: 2px; }
.pf2-spend-lbl { font-size: 10.5px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; }

/* ── RECENT ORDERS ───────────────────────────────────────── */
.pf2-view-all {
    display: flex; align-items: center; gap: 5px;
    padding: 7px 16px;
    border-radius: 999px;
    background: #0a0a0a;
    color: #E8C97A;
    border: 1.5px solid #C9A84C;
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
}
.pf2-view-all:hover { background: #C9A84C; color: #0a0a0a; text-decoration: none; }
.pf2-order-item {
    padding: 16px 18px;
    border: 1.5px solid rgba(0,0,0,0.06);
    border-radius: 14px;
    background: #f8f7f3;
    cursor: pointer;
    transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
    margin-bottom: 10px;
    position: relative;
    overflow: hidden;
}
.pf2-order-item:last-child { margin-bottom: 0; }
.pf2-order-item:hover {
    border-color: rgba(201,168,76,0.28);
    background: #fff;
    box-shadow: 0 8px 26px rgba(0,0,0,0.07);
    transform: translateY(-2px);
}
.pf2-order-item.cancelled {
    background: linear-gradient(180deg, rgba(254,242,242,0.95), #fff);
    border-color: rgba(239,68,68,0.16);
}
.pf2-order-item.cancelled:hover {
    border-color: rgba(239,68,68,0.3);
    box-shadow: 0 10px 30px rgba(239,68,68,0.08);
}
.pf2-order-item::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    border-radius: 14px 0 0 14px;
    opacity: 0;
    transition: opacity 0.22s;
}
.pf2-order-item:hover::before { opacity: 1; background: #C9A84C; }
.pf2-order-item.cancelled::before { opacity: 1; background: linear-gradient(180deg, #F87171, #EF4444); }
.pf2-order-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.pf2-order-id { font-size: 14px; font-weight: 700; color: #0f0f0f; margin-bottom: 4px; }
.pf2-order-date { font-size: 11.5px; color: #9ca3af; display: flex; align-items: center; gap: 5px; }
.pf2-status-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 13px; border-radius: 999px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap;
}
.pf2-status-pill.cancelled {
    border: 1px solid rgba(239,68,68,0.14);
}
.pf2-order-bottom {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 14px; padding-top: 12px;
    border-top: 1px solid rgba(201,168,76,0.1);
    flex-wrap: wrap; gap: 10px;
}
.pf2-order-amount { font-size: 18px; font-weight: 800; color: #C9A84C; }
.pf2-order-amount-lbl { font-size: 9.5px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
.pf2-track-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 8px 18px; border-radius: 999px;
    background: #0a0a0a; color: #E8C97A;
    border: 1.5px solid #C9A84C;
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
    cursor: pointer; transition: all 0.2s;
}
.pf2-track-btn:hover { background: #C9A84C; color: #0a0a0a; box-shadow: 0 4px 16px rgba(201,168,76,0.28); }

/* ORDER STATUS STEPPER */
.pf2-stepper { display: flex; align-items: center; gap: 0; margin: 12px 0 2px; }
.pf2-step { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
.pf2-step-dot {
    width: 22px; height: 22px;
    border-radius: 50%;
    border: 2px solid #e5e7eb;
    background: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 700; color: #9ca3af;
    position: relative; z-index: 1;
    transition: all 0.3s;
}
.pf2-step-dot.done { background: #C9A84C; border-color: #C9A84C; color: #fff; }
.pf2-step-dot.active {
    background: #fff; border-color: #C9A84C; color: #C9A84C;
    box-shadow: 0 0 0 4px rgba(201,168,76,0.15);
}
.pf2-step-dot.cancelled {
    background: #ef4444; border-color: #ef4444; color: #fff;
}
.pf2-step-lbl { font-size: 9px; color: #9ca3af; font-weight: 600; text-align: center; white-space: nowrap; }
.pf2-step-lbl.done { color: #C9A84C; }
.pf2-step-lbl.active { color: #0f0f0f; font-weight: 700; }
.pf2-step-lbl.cancelled { color: #ef4444; font-weight: 800; }
.pf2-step-line {
    flex: 1; height: 2px;
    background: #e5e7eb;
    margin: 0 -1px;
    position: relative;
    align-self: flex-start;
    margin-top: 10px;
    transition: background 0.3s;
}
.pf2-step-line.done { background: linear-gradient(90deg, #C9A84C, #E8C97A); }

/* ── BENEFITS GRID ───────────────────────────────────────── */
.pf2-benefits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (max-width: 600px) { .pf2-benefits { grid-template-columns: 1fr 1fr; } }
.pf2-benefit {
    padding: 18px 14px; border-radius: 14px;
    border: 1px solid rgba(0,0,0,0.06);
    background: #f8f7f3; text-align: center;
    transition: all 0.22s;
}
.pf2-benefit:hover { transform: translateY(-3px); border-color: rgba(201,168,76,0.2); box-shadow: 0 8px 22px rgba(0,0,0,0.07); }
.pf2-benefit-icon {
    width: 46px; height: 46px;
    border-radius: 13px;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 11px;
}
.pf2-benefit-title { font-size: 12.5px; font-weight: 700; color: #0f0f0f; margin-bottom: 3px; }
.pf2-benefit-sub   { font-size: 11px; color: #9ca3af; line-height: 1.4; }

/* ── TRUST BANNER ────────────────────────────────────────── */
.pf2-trust {
    display: flex; align-items: center; justify-content: center;
    gap: 28px; padding: 20px 28px;
    background: #fff;
    border: 1px solid rgba(201,168,76,0.14);
    border-radius: 18px;
    flex-wrap: wrap;
    box-shadow: 0 2px 14px rgba(0,0,0,0.04);
}
.pf2-trust-item { display: flex; align-items: center; gap: 10px; }
.pf2-trust-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.pf2-trust-title { font-size: 12px; font-weight: 700; color: #0f0f0f; }
.pf2-trust-sub   { font-size: 10.5px; color: #9ca3af; }

/* ── EMPTY STATE ─────────────────────────────────────────── */
.pf2-empty {
    padding: 44px 24px; text-align: center;
    background: #f8f7f3; border-radius: 14px;
}
.pf2-empty-icon { opacity: 0.25; margin-bottom: 14px; }
.pf2-empty-text { font-size: 13.5px; color: #6b7280; margin-bottom: 18px; }
.pf2-shop-link {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 11px 28px; border-radius: 999px;
    background: linear-gradient(135deg, #C9A84C, #9A7A20);
    color: #fff; font-size: 12px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    text-decoration: none; transition: all 0.22s;
}
.pf2-shop-link:hover { box-shadow: 0 8px 24px rgba(201,168,76,0.38); transform: translateY(-2px); color: #fff; text-decoration: none; }
`

/* ══════════════════════════════════════════════════════════════
   MINI HELPERS
══════════════════════════════════════════════════════════════ */
function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
}

function getInitials(name = '') {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
}

/* ORDER STEPPER */
const STEPS = ['Ordered', 'Packed', 'Shipped']
function OrderStepper({ status, statusHistory = [], cancellation = null }) {
    const norm = (s = '') => {
        const r = String(s).trim().toLowerCase()
        if (r === 'order placed' || r === 'ordered') return 0
        if (r === 'packed')    return 1
        if (r === 'shipped')   return 2
        if (r === 'delivered') return 3
        if (r === 'cancelled' || r === 'canceled') return 3
        return 0
    }

    const isCancelled = cancellation && String(cancellation.status || '').trim() !== 'NOT_CANCELLED'

    // derive lastProgressIndex from history or current status
    let lastProgress = null
    if (Array.isArray(statusHistory) && statusHistory.length) {
        for (let i = statusHistory.length - 1; i >= 0; i--) {
            const s = String(statusHistory[i]?.status || '').trim().toLowerCase()
            if (s === 'delivered') { lastProgress = 3; break }
            if (s === 'shipped') { lastProgress = 2; break }
            if (s === 'packed') { lastProgress = 1; break }
            if (s === 'ordered' || s === 'order placed') { lastProgress = 0; break }
        }
    }
    if (lastProgress === null) lastProgress = norm(status)

    const finalLabel = isCancelled ? 'Cancel' : 'Delivered'

    return (
        <div className="pf2-stepper">
            {[...STEPS, finalLabel].map((step, i) => {
                const finalIndex = 3
                let done = false
                let active = false

                if (isCancelled) {
                    // previous steps up to lastProgress are done; final step is active (Cancelled)
                    done = i < lastProgress
                    active = i === finalIndex
                } else {
                    // normal flow: steps up to lastProgress are done, lastProgress is active (could be delivered=3)
                    done = i < lastProgress
                    active = i === lastProgress
                }

                const lineDone = (() => {
                    if (isCancelled) return i <= lastProgress
                    return i <= lastProgress
                })()

                const dotClass = done ? ' done' : active ? ' active' : ''
                const lblClass = done ? ' done' : active ? ' active' : ''
                const cancelledClass = isCancelled && i === finalIndex ? ' cancelled' : ''

                return (
                    <React.Fragment key={step}>
                        {i > 0 && <div className={`pf2-step-line${lineDone ? ' done' : ''}`} />}
                        <div className="pf2-step">
                            <div className={`pf2-step-dot${dotClass}${cancelledClass}`}>
                                {done ? <CheckCircle2 size={11} /> : (isCancelled && i === finalIndex ? '✕' : i + 1)}
                            </div>
                            <div className={`pf2-step-lbl${lblClass}${cancelledClass}`}>{step}</div>
                        </div>
                    </React.Fragment>
                )
            })}
        </div>
    )
}

/* STATUS STYLES */
function getStatusStyle(status) {
    const s = String(status).trim().toLowerCase()
    if (s === 'order placed' || s === 'ordered') return { bg: '#e0f2fe', color: '#0ea5e9' }
    if (s === 'packed')    return { bg: '#fef3c7', color: '#f59e0b' }
    if (s === 'shipped')   return { bg: '#fef9c3', color: '#ca8a04' }
    if (s === 'delivered') return { bg: '#dcfce7', color: '#16a34a' }
    if (s === 'cancelled' || s === 'canceled') return { bg: '#fee2e2', color: '#ef4444' }
    return { bg: '#e0f2fe', color: '#0ea5e9' }
}
function normLabel(status) {
    const s = String(status).trim().toLowerCase()
    if (s === 'order placed' || s === 'ordered') return 'Ordered'
    if (s === 'packed')    return 'Packed'
    if (s === 'shipped')   return 'Shipped'
    if (s === 'delivered') return 'Delivered'
    if (s === 'cancelled' || s === 'canceled') return 'Cancelled'
    return 'Ordered'
}

function isCancelledOrder(order = {}) {
    const status = String(order?.orderStatus || order?.status || '').trim().toLowerCase()
    if (status.includes('cancel')) return true
    const cancellationStatus = String(order?.cancellation?.status || '').trim().toUpperCase()
    return cancellationStatus && cancellationStatus !== 'NOT_CANCELLED'
}

function getOrderDisplayStatus(order = {}) {
    return isCancelledOrder(order) ? 'Cancelled' : normLabel(order?.orderStatus || order?.status)
}

/* TIER CONFIG */
const TIER_CONFIG = {
    Silver: { next: 'Gold',   ordersNeeded: 10, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    Gold:   { next: 'Elite',  ordersNeeded: 30, color: '#C9A84C', bg: 'rgba(201,168,76,0.12)'  },
    Elite:  { next: null,     ordersNeeded: 0,  color: '#C9A84C', bg: 'rgba(201,168,76,0.12)'  },
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function Profile() {
    /* ── REDUX (untouched) ── */
    var users    = useSelector((state) => state.UserStateData)
    var wishlist = useSelector((state) => state.WishlistStateData)
    var orders   = useSelector((state) => state.CheckoutStateData)

    const cachedProfileAtBoot = (() => {
        try { const c = localStorage.getItem('profile_cache'); return c ? JSON.parse(c) : null }
        catch (e) { return null }
    })()

    var [user, setuser] = useState(() => { try { return cachedProfileAtBoot || {} } catch (e) { return {} } })
    const [recentOrders, setRecentOrders]   = useState([])
    const [actualOrders, setActualOrders]   = useState([])
    const [loadingRecent, setLoadingRecent] = useState(false)
    const [isLoading, setIsLoading]         = useState(true)
    const socketRef = useRef(null)
    const [socketConnected, setSocketConnected] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    const hasFreshProfileRef = useRef(Boolean(cachedProfileAtBoot && Object.keys(cachedProfileAtBoot).length))
    var dispatch = useDispatch()
    var navigate = useNavigate()
    const { membershipType, totalOrders } = useMembership()

    /* ── API CALLS (untouched) ── */
    async function loadLatestUserProfile() {
        const userId = localStorage.getItem("userid")
        if (!userId) return
        try {
            const res = await axios.get(`${BASE_URL}/user/${userId}`, { timeout: 12000 })
            if (res?.data && typeof res.data === 'object') {
                hasFreshProfileRef.current = true
                setuser((prev) => {
                    const normalized = normalizeProfileUserPayload(res.data, prev)
                    localStorage.setItem('profile_cache', JSON.stringify(normalized))
                    return normalized
                })
            }
        } catch (e) {
            try {
                const fb = await axios.get(`${BASE_URL}/api/user/${userId}`, { timeout: 12000 })
                if (fb?.data && typeof fb.data === 'object') {
                    hasFreshProfileRef.current = true
                    setuser((prev) => {
                        const normalized = normalizeProfileUserPayload(fb.data, prev)
                        localStorage.setItem('profile_cache', JSON.stringify(normalized))
                        return normalized
                    })
                }
            } catch (_) { }
        }
    }

    function getAPIData() {
        dispatch(getUser())
        dispatch(getWishlist())
        dispatch(getCheckout())
    }

    /* ── EFFECTS (untouched) ── */
    useEffect(() => { 
        // Force clear stale cache on mount to ensure fresh order/membership data
        localStorage.removeItem('profile_cache')
        localStorage.removeItem('checkout_cache')
        getAPIData()
        loadLatestUserProfile()
    }, [])

    useEffect(() => {
        const handleProfileUpdated = (event) => {
            const freshUser = event?.detail
            if (freshUser && typeof freshUser === 'object') {
                hasFreshProfileRef.current = true
                setuser((prev) => {
                    const normalized = normalizeProfileUserPayload(freshUser, prev)
                    localStorage.setItem('profile_cache', JSON.stringify(normalized))
                    return normalized
                })
            }
            loadLatestUserProfile()
            dispatch(getUser())
        }
        window.addEventListener('profile-updated', handleProfileUpdated)
        return () => window.removeEventListener('profile-updated', handleProfileUpdated)
    }, [dispatch])

    useEffect(() => {
        const userId = localStorage.getItem("userid")
        if (!userId) { setIsLoading(false); return }
        if (hasFreshProfileRef.current) { setIsLoading(false); return }
        if (users && users.length > 0) {
            const data = users.find((item) => {
                const itemId = String(item.id || item._id || item.userid || '')
                return itemId === String(userId)
            })
            if (data) {
                console.log('✅ User data loaded:', { id: data.id || data._id, name: data.name, email: data.email })
                setuser((prev) => {
                    const normalized = normalizeProfileUserPayload(data, prev)
                    localStorage.setItem('profile_cache', JSON.stringify(normalized))
                    return normalized
                })
            } else {
                console.warn('⚠️ User not found in Redux state. Available users:', users.length, 'Looking for:', userId)
            }
        }
        setIsLoading(false)
    }, [users])

    useEffect(() => {
        const fetchRecentOrders = async () => {
            const userId = localStorage.getItem("userid")
            if (!userId) return
            try {
                setLoadingRecent(true)
                const { data } = await axios.get(`${BASE_URL}/api/orders/recent/${userId}?limit=4`, { timeout: 10000 })
                // debug: log API response so you can verify server returns cancellation/statusHistory
                console.log('Recent orders API response:', data)
                setRecentOrders(Array.isArray(data?.orders) ? data.orders : [])
            } catch (e) { setRecentOrders([]) }
            finally { setLoadingRecent(false) }
        }
        fetchRecentOrders()
    }, [orders.length])

    useEffect(() => {
        const fetchActualOrders = async () => {
            const userId = localStorage.getItem('userid')
            if (!userId) {
                setActualOrders([])
                return
            }

            try {
                const { data } = await axios.get(`${BASE_URL}/api/user/orders`, {
                    params: { userId },
                    timeout: 12000
                })
                const list = Array.isArray(data?.orders) ? data.orders : (Array.isArray(data) ? data : [])
                setActualOrders(list)
            } catch (error) {
                setActualOrders([])
            }
        }

        fetchActualOrders()
    }, [user?.id, user?._id])

    useEffect(() => {
        const userId = localStorage.getItem("userid")
        if (!userId) return
        let mounted = true
        const socket = io(BASE_URL, {
            auth: { userId }, transports: SOCKET_TRANSPORTS,
            reconnection: true, reconnectionDelay: 3000,
            reconnectionDelayMax: 10000, reconnectionAttempts: 3, forceNew: false
        })
        socketRef.current = socket
        socket.on('connect',    () => { if (mounted) { setSocketConnected(true);  console.log('✅ Profile Socket connected') } })
        socket.on('disconnect', () => { if (mounted) { setSocketConnected(false); console.log('❌ Profile Socket disconnected') } })
        socket.on('statusUpdate', (payload) => {
            if (payload?.orderId && payload?.status && mounted) {
                console.log('🔄 Real-time status update in Recent Status:', payload)
                setRecentOrders((prev) => prev.map((o) =>
                    o.orderId === payload.orderId
                        ? { ...o, orderStatus: payload.status, updatedAt: payload.updatedAt || new Date().toISOString() }
                        : o
                ))
            }
        })
        return () => { mounted = false; if (socket) socket.disconnect() }
    }, [])

    /* ── DERIVED DATA ── */
    const uid             = localStorage.getItem('userid')
    const currentWishlist = wishlist.filter(x => x.userid === uid)
    const currentOrders   = actualOrders
    const resolvedTier    = String(user.membershipType || membershipType || 'Silver')
    const resolvedOrderCount = Number(actualOrders.length || user.totalOrders || totalOrders || 0)
    const tierClass       = resolvedTier.toLowerCase()
    const TierIcon        = tierClass === 'elite' ? Crown : Award
    const tierConf        = TIER_CONFIG[resolvedTier] || TIER_CONFIG.Silver

    /* Tier progress — from real order count */
    const tierProgress = useMemo(() => {
        if (resolvedTier === 'Elite') return { pct: 100, ordersLeft: 0 }
        const needed = tierConf.ordersNeeded
        const pct    = Math.min(100, Math.round((resolvedOrderCount / needed) * 100))
        return { pct, ordersLeft: Math.max(0, needed - resolvedOrderCount) }
    }, [resolvedTier, resolvedOrderCount, tierConf])

    /* Spending summary — from real orders */
    const isOrderCancelled = (o = {}) => {
        return isCancelledOrder(o)
    }

    const spendingSummary = useMemo(() => {
        const paidOrders = (currentOrders || []).filter(o => !isOrderCancelled(o))
        const total = paidOrders.reduce((s, o) => s + Number(o.finalAmount || o.amount || 0), 0)
        const avg   = paidOrders.length ? Math.round(total / paidOrders.length) : 0
        const max   = paidOrders.reduce((m, o) => Math.max(m, Number(o.finalAmount || o.amount || 0)), 0)
        return { total, avg, max }
    }, [currentOrders])

    /* Tabs */
    const tabs = [
        { id: 'overview', label: 'Overview',   icon: LayoutGrid  },
        { id: 'wishlist', label: 'Wishlist',   icon: Heart       },
        { id: 'orders',   label: 'My Orders',  icon: Package     },
        { id: 'spending', label: 'Spending',   icon: BarChart3   },
        { id: 'benefits', label: 'Benefits',   icon: Sparkles    },
        { id: 'settings', label: 'Settings',   icon: Settings    },
    ]

    /* Benefits */
    const benefits = [
        { icon: Truck,       color: '#10b981', bg: '#ecfdf5', title: 'Priority Delivery',  sub: 'Faster shipping always'         },
        { icon: Gift,        color: '#C9A84C', bg: '#fdf9ef', title: 'Exclusive Rewards',  sub: 'Earn points on every order'     },
        { icon: Headphones,  color: '#6366f1', bg: '#eef2ff', title: 'VIP Support',        sub: '24/7 concierge assistance'      },
        { icon: Zap,         color: '#f59e0b', bg: '#fffbeb', title: 'Early Access',        sub: 'New arrivals first'             },
        { icon: Shield,      color: '#0ea5e9', bg: '#e0f2fe', title: 'Secure Payments',    sub: '256-bit encryption'             },
        { icon: Star,        color: '#C9A84C', bg: '#fdf9ef', title: 'Member-Only Deals',  sub: 'Exclusive pricing & offers'     },
    ]

    /* Tab panel cards */
    const tabPanelData = {
        overview: [
            { label: 'Wishlist', value: currentWishlist.length,          color: '#C9A84C' },
            { label: 'Orders',   value: currentOrders.length,            color: '#10b981' },
            { label: 'Tier',     value: resolvedTier,                    color: '#0ea5b7' },
        ],
        wishlist: currentWishlist.slice(0,3).map(i => ({
            label: i.name || 'Item',
            value: `₹${Number(i.price||0).toLocaleString('en-IN')}`,
            color: '#C9A84C'
        })),
        orders: recentOrders.slice(0,3).map(i => ({
            label: i.orderId || 'Order',
            value: getOrderDisplayStatus(i),
            color: getStatusStyle(getOrderDisplayStatus(i)).color
        })),
        spending: [
            { label: 'Total Spent', value: `₹${spendingSummary.total.toLocaleString('en-IN')}`, color: '#C9A84C' },
            { label: 'Avg Order',   value: `₹${spendingSummary.avg.toLocaleString('en-IN')}`,   color: '#10b981' },
            { label: 'Highest',     value: `₹${spendingSummary.max.toLocaleString('en-IN')}`,   color: '#6366f1' },
        ],
        benefits: [
            { label: 'Fast Delivery', value: 'Priority', color: '#10b981' },
            { label: 'Rewards',       value: 'Active',   color: '#C9A84C' },
            { label: 'Support',       value: 'VIP',      color: '#6366f1' },
        ],
        settings: [
            { label: 'Edit Profile', value: 'Update info',       color: '#17a2b8' },
            { label: 'Security',     value: 'Password & 2FA',    color: '#6366f1' },
            { label: 'Help',         value: 'Concierge support', color: '#ef4444' },
        ],
    }
    const tabCards = tabPanelData[activeTab] || tabPanelData.overview

    /* ── RENDER ── */
    return (
        <div className="pf2">
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* ══ HERO ════════════════════════════════════════ */}
            <div className="pf2-hero">
                <div className="pf2-hero-bg" />
                <div className="pf2-hero-grid" />
                <div className="pf2-hero-inner">
                    <div className="pf2-hero-text">
                        <motion.div
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="pf2-hero-greeting">{getGreeting()}</div>
                            <h1 className="pf2-hero-name">
                                {isLoading
                                    ? 'Your Account'
                                    : user.name ? `${user.name.split(' ')[0]}'s Space` : 'My Account'
                                }
                            </h1>
                            <p className="pf2-hero-sub">
                                Manage your orders, wishlist &amp; {resolvedTier} member benefits
                            </p>
                            {/* Live socket indicator */}
                            <span className={`pf2-socket-dot ${socketConnected ? 'live' : 'offline'}`}>
                                <span className="blink" />
                                {socketConnected ? 'Live Updates Active' : 'Connecting...'}
                            </span>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* ══ STAT STRIP ═══════════════════════════════════ */}
            <div className="pf2-stats-row">
                {[
                    { icon: Heart,      bg: '#fdf9ef', color: '#C9A84C', label: 'Wishlist',     val: isLoading ? '—' : currentWishlist.length },
                    { icon: Package,    bg: '#ecfdf5', color: '#10b981', label: 'Orders',        val: isLoading ? '—' : currentOrders.length   },
                    { icon: TierIcon,   bg: '#fdf9ef', color: '#C9A84C', label: 'Member Tier',   val: isLoading ? '—' : resolvedTier            },
                    { icon: IndianRupee,bg: '#eef2ff', color: '#6366f1', label: 'Total Spent',   val: isLoading ? '—' : `₹${(spendingSummary.total/1000).toFixed(1)}K` },
                ].map((s, i) => (
                    <motion.div key={s.label} className="pf2-stat"
                        initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07, duration: 0.38 }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="pf2-stat-icon" style={{ background: s.bg }}>
                            <s.icon size={18} color={s.color} strokeWidth={2} />
                        </div>
                        <div>
                            <div className="pf2-stat-val">{s.val}</div>
                            <div className="pf2-stat-lbl">{s.label}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="pf2-container">

                {/* ══ TIER PROGRESS BAR ════════════════════════ */}
                <motion.div className="pf2-tier-bar"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18, duration: 0.4 }}
                >
                    <div className="pf2-tier-icon">
                        <TierIcon size={22} color="#fff" strokeWidth={2} />
                    </div>
                    <div className="pf2-tier-texts">
                        <div className="pf2-tier-name">
                            {resolvedTier} Member
                            {tierConf.next && (
                                <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
                                    · {tierProgress.ordersLeft} orders to {tierConf.next}
                                </span>
                            )}
                        </div>
                        <div className="pf2-tier-sub">
                            {resolvedTier === 'Elite'
                                ? 'You have reached our highest tier. Enjoy all premium benefits.'
                                : `${resolvedOrderCount} of ${tierConf.ordersNeeded} orders to unlock ${tierConf.next} membership`
                            }
                        </div>
                        <div className="pf2-progress-track">
                            <motion.div className="pf2-progress-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${tierProgress.pct}%` }}
                                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.3 }}
                            />
                        </div>
                    </div>
                    {/* Tier milestones */}
                    <div className="pf2-tier-milestones">
                        {['Silver', 'Gold', 'Elite'].map((t) => {
                            const reached = ['Silver', 'Gold', 'Elite'].indexOf(t) <= ['Silver', 'Gold', 'Elite'].indexOf(resolvedTier)
                            return (
                                <div key={t} className={`pf2-tier-milestone${reached ? ' reached' : ''}`}>
                                    <div className="pf2-tier-milestone-dot" />
                                    <span style={{ fontSize: 9 }}>{t}</span>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>

                {/* ══ TABS ══════════════════════════════════════ */}
                <motion.div className="pf2-tabs-wrap"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22, duration: 0.38 }}
                >
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        return (
                            <button key={tab.id}
                                className={`pf2-tab${activeTab === tab.id ? ' active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <Icon size={13} strokeWidth={2.2} />
                                {tab.label}
                            </button>
                        )
                    })}
                </motion.div>

                {/* Tab summary strip */}
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab}
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.26 }}
                    >
                        {tabCards.map((c, i) => (
                            <div key={i} style={{
                                background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)',
                                padding: '16px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                            }}>
                                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', fontWeight: 700, marginBottom: 8 }}>{c.label}</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
                            </div>
                        ))}
                    </motion.div>
                </AnimatePresence>

                {/* ══ MAIN LAYOUT ═══════════════════════════════ */}
                <div className="pf2-layout">

                    {/* ── SIDEBAR ─────────────────────────────── */}
                    <motion.div className="pf2-sidebar"
                        initial={{ opacity: 0, x: -22 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.48, delay: 0.08 }}
                    >
                        <div className="pf2-profile-card">
                            <div className="pf2-profile-card-top">
                                {isLoading ? (
                                    <div style={{ paddingBottom: 20 }}>
                                        <Skeleton circle height={108} width={108} style={{ margin: '0 auto 16px' }} />
                                        <Skeleton count={2} />
                                    </div>
                                ) : (
                                    <>
                                        <motion.div className="pf2-avatar-wrap"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.2, duration: 0.42 }}
                                        >
                                            <motion.div className="pf2-avatar-spin"
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                            />
                                            {user.pic
                                                ? <img src={user.pic} className="pf2-avatar-img" alt={user.name} />
                                                : <div className="pf2-avatar-fallback">{getInitials(user.name)}</div>
                                            }
                                        </motion.div>
                                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
                                            <p className="pf2-card-name">{user.name || 'Your Name'}</p>
                                            <p className="pf2-card-email">{user.email || ''}</p>
                                            <div className={`pf2-card-badge ${tierClass}`} style={{ marginBottom: 0 }}>
                                                <TierIcon size={11} strokeWidth={2.5} />
                                                {resolvedTier} · {resolvedOrderCount} Orders
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                                <div className="pf2-card-wave" />
                            </div>
                            <div className="pf2-card-bottom">
                                {isLoading ? <Skeleton height={44} /> : (
                                    <motion.div className="pf2-mini-stats"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        transition={{ delay: 0.38 }}
                                    >
                                        <motion.div style={{ textAlign: 'center' }} whileHover={{ scale: 1.08 }}>
                                            <div className="pf2-mini-stat-val">{currentWishlist.length}</div>
                                            <div className="pf2-mini-stat-lbl">Wishlist</div>
                                        </motion.div>
                                        <div className="pf2-mini-divider" />
                                        <motion.div style={{ textAlign: 'center' }} whileHover={{ scale: 1.08 }}>
                                            <div className="pf2-mini-stat-val">{currentOrders.length}</div>
                                            <div className="pf2-mini-stat-lbl">Orders</div>
                                        </motion.div>
                                        <div className="pf2-mini-divider" />
                                        <motion.div style={{ textAlign: 'center' }} whileHover={{ scale: 1.08 }}>
                                            <div className="pf2-mini-stat-val">
                                                {spendingSummary.total >= 1000
                                                    ? `₹${(spendingSummary.total/1000).toFixed(1)}K`
                                                    : `₹${spendingSummary.total}`
                                                }
                                            </div>
                                            <div className="pf2-mini-stat-lbl">Spent</div>
                                        </motion.div>
                                    </motion.div>
                                )}
                                <Link to="/update-profile" className="pf2-edit-btn">
                                    <UserCog size={14} strokeWidth={2} />
                                    Edit Profile
                                </Link>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── MAIN CONTENT ─────────────────────────── */}
                    <motion.div className="pf2-main"
                        initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.48, delay: 0.08 }}
                    >
                        {/* Buyer Profile Details */}
                        <motion.div className="pf2-card"
                            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.18 }}
                        >
                            <div style={{ padding: 24 }}>
                                {isLoading
                                    ? <Skeleton count={6} height={56} style={{ marginBottom: 10 }} />
                                    : <BuyerProfile user={user} />
                                }
                            </div>
                        </motion.div>

                        {/* Quick Actions */}
                        <motion.div className="pf2-card"
                            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.24 }}
                        >
                            <div className="pf2-card-header">
                                <div className="pf2-card-title"><Zap size={15} color="#C9A84C" /> Quick Actions</div>
                            </div>
                            <div className="pf2-card-body">
                                <div className="pf2-quick-grid" style={{ marginBottom: 10 }}>
                                    <motion.button className="pf2-quick-btn gold" onClick={() => navigate('/wishlist')}
                                        whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                                    >
                                        <div className="pf2-quick-icon" style={{ background: 'rgba(201,168,76,0.1)' }}>
                                            <Heart size={20} color="#C9A84C" strokeWidth={2} />
                                        </div>
                                        <div>
                                            <div className="pf2-quick-title">My Wishlist</div>
                                            <div className="pf2-quick-sub">{currentWishlist.length} saved items</div>
                                        </div>
                                        <ChevronRight size={15} color="#C9A84C" className="pf2-quick-arrow" />
                                    </motion.button>

                                    <motion.button className="pf2-quick-btn green" onClick={() => navigate('/cart')}
                                        whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                                    >
                                        <div className="pf2-quick-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
                                            <ShoppingCart size={20} color="#10b981" strokeWidth={2} />
                                        </div>
                                        <div>
                                            <div className="pf2-quick-title">My Cart</div>
                                            <div className="pf2-quick-sub">Ready for checkout</div>
                                        </div>
                                        <ChevronRight size={15} color="#10b981" className="pf2-quick-arrow" />
                                    </motion.button>
                                </div>
                                <motion.button className="pf2-quick-btn dark" onClick={() => navigate('/my-orders')}
                                    whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                                    style={{ width: '100%' }}
                                >
                                    <div className="pf2-quick-icon" style={{ background: 'rgba(201,168,76,0.15)' }}>
                                        <Package size={20} color="#C9A84C" strokeWidth={2} />
                                    </div>
                                    <div>
                                        <div className="pf2-quick-title">All My Orders</div>
                                        <div className="pf2-quick-sub">{currentOrders.length} total purchases</div>
                                    </div>
                                    <ArrowRight size={18} color="rgba(201,168,76,0.7)" className="pf2-quick-arrow" />
                                </motion.button>
                            </div>
                        </motion.div>

                        {/* Spending Summary — from real order data */}
                        <motion.div className="pf2-card"
                            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="pf2-card-header">
                                <div className="pf2-card-title"><BarChart3 size={15} color="#6366f1" /> Spending Summary</div>
                            </div>
                            <div className="pf2-card-body">
                                {isLoading ? <Skeleton count={1} height={80} /> : (
                                    <div className="pf2-spending-row">
                                        {[
                                            { icon: IndianRupee, color: '#C9A84C', bg: '#fdf9ef', label: 'Total Spent', val: `₹${spendingSummary.total.toLocaleString('en-IN')}` },
                                            { icon: TrendingUp,  color: '#10b981', bg: '#ecfdf5', label: 'Avg Order',   val: `₹${spendingSummary.avg.toLocaleString('en-IN')}`   },
                                            { icon: Target,      color: '#6366f1', bg: '#eef2ff', label: 'Highest Order',val: `₹${spendingSummary.max.toLocaleString('en-IN')}`   },
                                        ].map((s, i) => (
                                            <motion.div key={s.label} className="pf2-spend-item"
                                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 + i * 0.07 }}
                                                whileHover={{ y: -2 }}
                                            >
                                                <div className="pf2-spend-icon-wrap" style={{ background: s.bg }}>
                                                    <s.icon size={16} color={s.color} strokeWidth={2} />
                                                </div>
                                                <div className="pf2-spend-val">{s.val}</div>
                                                <div className="pf2-spend-lbl">{s.label}</div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Recent Orders with Stepper */}
                        <motion.div className="pf2-card"
                            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.36 }}
                        >
                            <div className="pf2-card-header">
                                <div className="pf2-card-title"><Package size={15} color="#C9A84C" /> Recent Orders</div>
                                <Link to="/my-orders" className="pf2-view-all">
                                    VIEW ALL <ArrowRight size={11} />
                                </Link>
                            </div>
                            <div className="pf2-card-body">
                                {(loadingRecent || isLoading) ? (
                                    <Skeleton count={3} height={96} style={{ marginBottom: 10 }} />
                                ) : recentOrders.length ? (
                                    <AnimatePresence mode="wait">
                                        <motion.div>
                                            {recentOrders.map((item, idx) => {
                                                // determine cancellation override
                                                const isCancelledItem = isCancelledOrder(item)
                                                const lbl = getOrderDisplayStatus(item)
                                                const st  = getStatusStyle(lbl)
                                                return (
                                                    <motion.div key={item.orderId}
                                                        className={`pf2-order-item${isCancelledItem ? ' cancelled' : ''}`}
                                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.06 }}
                                                        onClick={() => navigate(`/order-tracking/${item.orderId}`)}
                                                    >
                                                        <div className="pf2-order-top">
                                                            <div>
                                                                <div className="pf2-order-id">Order #{item.orderId}</div>
                                                                <div className="pf2-order-date">
                                                                    <Clock3 size={11} color="#C9A84C" />
                                                                    {new Date(item.updatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </div>
                                                            </div>
                                                            <motion.span className={`pf2-status-pill${isCancelledItem ? ' cancelled' : ''}`}
                                                                initial={{ scale: 0.85 }} animate={{ scale: 1 }}
                                                                style={isCancelledItem
                                                                    ? { background: 'linear-gradient(135deg, rgba(254,226,226,0.96), rgba(255,255,255,0.96))', color: st.color, boxShadow: '0 2px 10px rgba(239,68,68,0.12)' }
                                                                    : { background: st.bg, color: st.color, boxShadow: `0 2px 8px ${st.color}20` }
                                                                }
                                                            >
                                                                <Dot size={14} />
                                                                {lbl}
                                                            </motion.span>
                                                        </div>

                                                        {/* Order stepper — connected to real status */}
                                                        <OrderStepper status={item.orderStatus} statusHistory={item.statusHistory} cancellation={item.cancellation} />

                                                        <div className="pf2-order-bottom">
                                                            <div>
                                                                <div className="pf2-order-amount-lbl">Order Total</div>
                                                                <div className="pf2-order-amount">
                                                                    ₹{Number(item.finalAmount || 0).toLocaleString('en-IN')}
                                                                </div>
                                                            </div>
                                                            <motion.button className="pf2-track-btn"
                                                                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/order-tracking/${item.orderId}`) }}
                                                            >
                                                                TRACK <ArrowRight size={11} />
                                                            </motion.button>
                                                        </div>
                                                    </motion.div>
                                                )
                                            })}
                                        </motion.div>
                                    </AnimatePresence>
                                ) : (
                                    <div className="pf2-empty">
                                        <div className="pf2-empty-icon"><ShoppingBag size={42} color="#9ca3af" /></div>
                                        <p className="pf2-empty-text">No orders yet — start shopping!</p>
                                        <Link to="/shop/All" className="pf2-shop-link">
                                            <ShoppingBag size={13} /> Start Shopping
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Benefits Grid */}
                        <motion.div className="pf2-card"
                            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.44 }}
                        >
                            <div className="pf2-card-header">
                                <div className="pf2-card-title"><Sparkles size={15} color="#C9A84C" /> {resolvedTier} Member Benefits</div>
                            </div>
                            <div className="pf2-card-body">
                                <div className="pf2-benefits">
                                    {benefits.map((b, i) => (
                                        <motion.div key={b.title} className="pf2-benefit"
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.44 + i * 0.05 }}
                                            whileHover={{ translateY: -3 }}
                                        >
                                            <div className="pf2-benefit-icon" style={{ background: b.bg }}>
                                                <b.icon size={18} color={b.color} strokeWidth={2} />
                                            </div>
                                            <div className="pf2-benefit-title">{b.title}</div>
                                            <div className="pf2-benefit-sub">{b.sub}</div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        {/* Trust Banner */}
                        <motion.div className="pf2-trust"
                            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.52 }}
                        >
                            {[
                                { icon: Shield,   color: '#0ea5e9', bg: '#e0f2fe', title: 'SSL Encrypted',    sub: '256-bit security'       },
                                { icon: Wifi,     color: '#10b981', bg: '#ecfdf5', title: socketConnected ? 'Live Updates' : 'Reconnecting', sub: socketConnected ? 'Real-time socket' : 'Attempting connection' },
                                { icon: Package,  color: '#C9A84C', bg: '#fdf9ef', title: 'Order Tracking',   sub: 'Step-by-step status'    },
                                { icon: Bell,     color: '#6366f1', bg: '#eef2ff', title: 'Instant Alerts',   sub: 'Status notifications'   },
                            ].map((t) => (
                                <div key={t.title} className="pf2-trust-item">
                                    <div className="pf2-trust-icon" style={{ background: t.bg }}>
                                        <t.icon size={16} color={t.color} strokeWidth={2} />
                                    </div>
                                    <div>
                                        <div className="pf2-trust-title">{t.title}</div>
                                        <div className="pf2-trust-sub">{t.sub}</div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
