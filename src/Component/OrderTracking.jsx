import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { BASE_URL } from '../constants'
import {
  Package, Archive, Truck, MapPin, BadgeCheck, Calendar,
  RefreshCw, Copy, Clock3, Home, Phone, Mail, Sparkles, Gauge, Wallet,
  FileText, Download, Navigation
} from 'lucide-react'

const STEPS = ['Ordered', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered']
const STATUS_COLOR = {
  Ordered: '#38BDF8',
  Packed: '#FCD34D',
  Shipped: '#C9A84C',
  'Out for Delivery': '#C084FC',
  Delivered: '#22C55E'
}

const STATUS_ICON = {
  Ordered: Package,
  Packed: Archive,
  Shipped: Truck,
  'Out for Delivery': MapPin,
  Delivered: BadgeCheck
}

const STATUS_SUBTEXT = {
  Ordered: 'Your order has been confirmed and moved to our processing desk.',
  Packed: 'Your item has been carefully packed with premium care.',
  Shipped: 'Your package is in transit via our courier partner.',
  'Out for Delivery': 'Your order is out for delivery and will reach you today.',
  Delivered: 'Delivered! We hope you enjoy your purchase.'
}

const normalizeStatus = (value = '') => {
  const raw = String(value).trim().toLowerCase()
  if (raw === 'order placed' || raw === 'ordered') return 'Ordered'
  if (raw === 'packed') return 'Packed'
  if (raw === 'shipped') return 'Shipped'
  if (raw === 'out for delivery') return 'Out for Delivery'
  if (raw === 'delivered') return 'Delivered'
  return 'Ordered'
}

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`

const resolveItemImage = (item = {}) => {
  const raw = item?.image || item?.pic || item?.pic1 || item?.thumbnail || item?.productid?.pic1 || ''
  if (!raw || typeof raw !== 'string') return ''
  if (raw.startsWith('http') || raw.startsWith('data:')) return raw
  return `${BASE_URL}/productimages/${raw}`
}

const formatDateTimeShort = (value) => {
  if (!value) return 'Pending'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return 'Pending'
  return dt.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatDeliverySchedule = (deliverySchedule = null) => {
  if (!deliverySchedule) return ''
  const baseDate = deliverySchedule?.date || deliverySchedule?.estimatedDelivery
  if (!baseDate) return ''
  const dateLabel = formatDateTimeShort(baseDate)
  const timeLabel = deliverySchedule?.time ? ` • ${deliverySchedule.time}` : ''
  return `${dateLabel}${timeLabel}`
}

const pickAddressField = (address = {}, keys = []) => {
  for (const key of keys) {
    const value = address?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

const formatAddress = (address = {}) => {
  const fullName = pickAddressField(address, ['fullName', 'name'])
  const phone = pickAddressField(address, ['phone', 'mobile', 'contactNumber'])
  const line1 = pickAddressField(address, ['addressline1', 'line1', 'address1', 'street', 'address'])
  const line2 = pickAddressField(address, ['addressline2', 'line2', 'address2', 'landmark', 'area'])
  const city = pickAddressField(address, ['city', 'town'])
  const state = pickAddressField(address, ['state', 'province'])
  const pin = pickAddressField(address, ['pin', 'pincode', 'postalCode', 'zip'])
  const country = pickAddressField(address, ['country'])

  const parts = [fullName, phone, line1, line2, [city, state].filter(Boolean).join(', '), pin, country].filter(Boolean)
  return parts.join(', ')
}

const formatAddressLines = (address = {}) => {
  const fullName = pickAddressField(address, ['fullName', 'name'])
  const phone = pickAddressField(address, ['phone', 'mobile', 'contactNumber'])
  const line1 = pickAddressField(address, ['addressline1', 'line1', 'address1', 'street', 'address'])
  const line2 = pickAddressField(address, ['addressline2', 'line2', 'address2', 'landmark', 'area'])
  const city = pickAddressField(address, ['city', 'town'])
  const state = pickAddressField(address, ['state', 'province'])
  const pin = pickAddressField(address, ['pin', 'pincode', 'postalCode', 'zip'])
  const country = pickAddressField(address, ['country'])

  const cityState = [city, state].filter(Boolean).join(', ')
  const cityStatePin = [cityState, pin].filter(Boolean).join(' - ')

  return [fullName, phone, line1, line2, cityStatePin, country].filter(Boolean)
}

const getCountdownText = (dateValue) => {
  if (!dateValue) return 'ETA unavailable'
  const eta = new Date(dateValue).getTime()
  if (Number.isNaN(eta)) return 'ETA unavailable'
  const diff = eta - Date.now()
  if (diff <= 0) return 'Expected today'
  const totalHours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) return `${days}d ${hours}h remaining`
  return `${hours}h remaining`
}

const pickCoords = (source = null) => {
  if (!source || typeof source !== 'object') return null

  const latRaw = source.lat ?? source.latitude ?? source?.coords?.lat ?? source?.coords?.latitude
  const lngRaw = source.lng ?? source.lon ?? source.longitude ?? source?.coords?.lng ?? source?.coords?.lon ?? source?.coords?.longitude

  const lat = Number(latRaw)
  const lng = Number(lngRaw)

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng }
  }

  if (Array.isArray(source.coordinates) && source.coordinates.length >= 2) {
    const lngVal = Number(source.coordinates[0])
    const latVal = Number(source.coordinates[1])
    if (Number.isFinite(latVal) && Number.isFinite(lngVal)) {
      return { lat: latVal, lng: lngVal }
    }
  }

  return null
}

const getTrackingSnapshot = (order = null, timeline = []) => {
  const latestEntry = Array.isArray(timeline) && timeline.length ? timeline[timeline.length - 1] : null
  const coordSources = [
    latestEntry?.deliverySchedule,
    latestEntry,
    order?.deliverySchedule,
    order?.deliveryLocation,
    order?.currentLocation,
    order?.location,
    order
  ]

  let coords = null
  for (const source of coordSources) {
    coords = pickCoords(source)
    if (coords) break
  }

  const label = [
    latestEntry?.deliveryLocation,
    order?.deliveryLocation,
    order?.shippingAddress?.city,
    order?.shippingAddress?.state
  ].filter(Boolean).join(', ')

  return {
    coords,
    label: label || ''
  }
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

:root {
  --gold:    #C9A84C;
  --gold-lt: #E8C97A;
  --gold-dk: #9A7A20;
  --teal:    #1A8C8C;
  --ink:     #0A0A0A;
  --smoke:   #F5F3EF;
  --fog:     #EAE7E0;
  --ash:     #9A9490;
  --white:   #FFFFFF;
  --bd:      rgba(201,168,76,0.15);
  --shadow-g: 0 12px 40px rgba(201,168,76,0.08);
  --shadow-soft: 0 4px 20px rgba(10,10,10,0.04);
}

.ot-page {
  font-family: 'DM Sans', sans-serif;
  background: linear-gradient(135deg, #fafaf8 0%, #f5f3ef 100%);
  min-height: 100vh;
  padding: 80px 20px 60px;
  position: relative;
}

.ot-hero {
  background: linear-gradient(135deg, #f9f7f3 0%, #f2ede5 50%, #ede7df 100%);
  padding: 48px 0 44px;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--bd);
  margin-bottom: 40px;
}

.ot-hero-orb1 {
  position: absolute; top: -80px; right: -80px;
  width: 320px; height: 320px;
  background: radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 65%);
  border-radius: 50%; pointer-events: none;
}

.ot-hero-orb2 {
  position: absolute; bottom: -60px; left: 5%;
  width: 220px; height: 220px;
  background: radial-gradient(circle, rgba(26,140,140,0.06) 0%, transparent 65%);
  border-radius: 50%; pointer-events: none;
}

.ot-hero-inner {
  max-width: 1180px; margin: 0 auto; padding: 0 28px;
  display: flex; align-items: flex-end; justify-content: space-between;
  flex-wrap: wrap; gap: 20px; position: relative; z-index: 1;
}

.ot-eyebrow {
  font-size: 10px; letter-spacing: 0.26em; text-transform: uppercase;
  color: var(--gold-dk); font-weight: 700; margin-bottom: 10px;
  display: flex; align-items: center; gap: 10px;
}

.ot-eyebrow::before {
  content: ''; display: inline-block;
  width: 28px; height: 1px;
  background: linear-gradient(90deg, var(--gold-dk), transparent);
}

.ot-header-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(36px, 5vw, 52px);
  font-weight: 700; color: var(--ink);
  letter-spacing: -0.02em; line-height: 1; margin: 0 0 8px;
}

.ot-header-title em {
  font-style: italic; color: var(--gold);
}

.ot-header-sub {
  font-size: 13px; color: var(--ash);
  letter-spacing: 0.05em; margin: 0;
}

.ot-hero-right {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}

.ot-hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.ot-ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  border: 1px solid rgba(201,168,76,0.3);
  background: rgba(255,255,255,0.6);
  color: var(--gold-dk);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}

.ot-ghost-btn:hover {
  border-color: var(--gold);
  background: rgba(201,168,76,0.08);
}

.ot-ghost-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.ot-back-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 20px; background: transparent;
  border: 1px solid rgba(201,168,76,0.35); border-radius: 2px;
  color: var(--gold-dk); font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: 0.16em;
  text-transform: uppercase; cursor: pointer;
  transition: all 0.22s;
}

.ot-back-btn:hover {
  background: rgba(201,168,76,0.08); border-color: var(--gold);
}

.ot-card {
  background: var(--white);
  border: 1px solid var(--bd);
  border-radius: 10px;
  margin-bottom: 28px;
  padding: 26px;
  box-shadow: var(--shadow-soft);
  transition: all 0.28s cubic-bezier(.25,.46,.45,.94);
  position: relative;
}

.ot-card::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, var(--gold) 0%, var(--teal) 100%);
  opacity: 0; transition: opacity 0.28s; border-radius: 10px 0 0 10px;
}

.ot-card:hover {
  transform: translateY(-4px);
  border-color: rgba(201,168,76,0.3);
  box-shadow: 0 20px 48px rgba(201,168,76,0.12), var(--shadow-g);
}

.ot-card:hover::before {
  opacity: 1;
}

.ot-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 26px;
}

.ot-kpi {
  background: var(--white);
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 16px;
  box-shadow: var(--shadow-soft);
}

.ot-kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.ot-kpi-label {
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ash);
  font-weight: 700;
}

.ot-kpi-value {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  line-height: 1;
  color: var(--ink);
  letter-spacing: -0.01em;
}

.ot-kpi-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--ash);
}

.ot-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.9fr);
  gap: 18px;
}
.ot-top-premium-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
  margin-bottom: 18px;
}
.ot-top-premium-grid > .ot-card,
.ot-top-premium-grid > .ot-mini-card {
  margin-bottom: 0;
  height: 100%;
}

.ot-stack {
  display: grid;
  gap: 18px;
}

.ot-mini-card {
  background: linear-gradient(145deg, #ffffff 0%, #faf7f2 100%);
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 18px;
  box-shadow: var(--shadow-soft);
}

.ot-mini-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gold-dk);
  font-weight: 700;
  margin-bottom: 12px;
}

.ot-mini-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(201,168,76,0.2);
  font-size: 13px;
}

.ot-mini-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.ot-mini-key {
  color: var(--ash);
}

.ot-mini-val {
  color: var(--ink);
  font-weight: 600;
  text-align: right;
}

.ot-inline-note {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  background: rgba(26,140,140,0.08);
  border: 1px solid rgba(26,140,140,0.16);
  color: #0f6f6f;
}

.ot-map-frame {
  width: 100%;
  height: 210px;
  border: 1px solid rgba(201,168,76,0.2);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 10px;
  background: linear-gradient(145deg, #f7f3ec 0%, #eee7da 100%);
  box-shadow: 0 14px 30px rgba(15,15,15,0.08);
}

.ot-map-shell {
  background: linear-gradient(135deg, #fff 0%, #faf8f2 100%);
  border: 1px solid rgba(201,168,76,0.2);
  border-radius: 12px;
  padding: 14px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ot-map-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.ot-map-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gold-dk);
  font-weight: 700;
}

.ot-map-tag {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(201,168,76,0.35);
  background: rgba(201,168,76,0.1);
  color: var(--gold-dk);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
}

.ot-map-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ash);
  font-size: 12px;
  letter-spacing: 0.08em;
  flex: 1;
  text-transform: uppercase;
}

.ot-link-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid rgba(201,168,76,0.25);
  background: linear-gradient(135deg, #C9A84C 0%, #9A7A20 100%);
  color: #fff;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.ot-link-btn:hover {
  border-color: #9A7A20;
  box-shadow: 0 10px 24px rgba(201,168,76,0.28);
  transform: translateY(-1px);
}

.ot-section-title {
  font-family: 'Playfair Display', serif;
  font-size: 22px; font-weight: 700;
  color: var(--ink); margin: 0 0 16px;
  letter-spacing: -0.01em;
}

.ot-label {
  font-size: 10px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--ash);
  font-weight: 700; margin-bottom: 6px;
}

.ot-value {
  font-size: 16px; font-weight: 600; color: var(--ink);
}

.ot-value.gold {
  font-family: 'Playfair Display', serif;
  font-size: 28px; color: var(--gold-dk);
  font-weight: 700; letter-spacing: -0.01em;
}

.ot-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 16px; border-radius: 20px;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.15em; text-transform: uppercase;
  border: 1px solid;
}

.ot-btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 8px; padding: 14px 24px; border: none;
  border-radius: 4px; font-family: 'DM Sans', sans-serif;
  font-size: 11px; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase;
  cursor: pointer; transition: all 0.22s;
  position: relative; overflow: hidden;
}

.ot-btn-primary {
  background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dk) 100%);
  color: var(--white);
  box-shadow: 0 4px 14px rgba(201,168,76,0.2);
}

.ot-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(201,168,76,0.3);
}

.ot-btn-secondary {
  background: transparent;
  border: 1.5px solid #25D366;
  color: #16a34a;
  box-shadow: none;
}

.ot-btn-secondary:hover {
  background: rgba(37,211,102,0.06);
  border-color: #16a34a;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(37,211,102,0.12);
}

.ot-progress-bar {
  position: relative; margin: 38px 0 32px;
  height: 8px; border-radius: 99px;
  background: rgba(201,168,76,0.1);
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.04);
}

.ot-progress-fill {
  position: absolute; top: 0; left: 0;
  height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, var(--teal), var(--gold), #22C55E);
  box-shadow: 0 0 20px rgba(201,168,76,0.15);
  transition: width 0.7s cubic-bezier(.25,.46,.45,.94);
}

.ot-stepper {
  display: flex; justify-content: space-between;
  gap: 8px; margin-bottom: 32px;
  align-items: flex-start;
}

.ot-step {
  display: flex; flex-direction: column;
  align-items: center; gap: 8px;
  flex: 1; position: relative;
  text-align: center;
}

.ot-step::after {
  content: ''; position: absolute;
  top: 20px; left: 50%; right: -50%;
  height: 2px; background: rgba(201,168,76,0.1);
  transition: background 0.4s ease;
}

.ot-step.done::after {
  background: var(--teal);
  box-shadow: 0 0 8px rgba(26,140,140,0.3);
}

.ot-step:last-child::after {
  display: none;
}

.ot-step-dot {
  width: 44px; height: 44px; border-radius: 50%;
  border: 2px solid rgba(201,168,76,0.15);
  background: var(--white);
  display: flex; align-items: center; justify-content: center;
  color: var(--ash); transition: all 0.3s;
  position: relative; z-index: 2;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.ot-step.done .ot-step-dot {
  background: var(--teal);
  border-color: var(--teal);
  color: var(--white);
  box-shadow: 0 4px 12px rgba(26,140,140,0.2);
}

.ot-step.active .ot-step-dot {
  background: var(--gold);
  border-color: var(--gold);
  color: var(--white);
  box-shadow: 0 0 20px rgba(201,168,76,0.4);
  animation: pulse-step 2s infinite;
}

@keyframes pulse-step {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

.ot-step-label {
  font-size: 11px; font-weight: 600;
  color: var(--ash); transition: all 0.3s;
  max-width: 70px;
}

.ot-step.active .ot-step-label,
.ot-step.done .ot-step-label {
  color: var(--ink); font-weight: 700;
}

.ot-step.active .ot-step-label {
  color: var(--gold);
}

.ot-live-badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 18px; border-radius: 20px;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  border: 1px solid; margin: 18px 0;
}

.ot-live-badge.on {
  background: rgba(34,197,94,0.1);
  color: #16a34a;
  border-color: rgba(34,197,94,0.3);
}

.ot-live-badge.off {
  background: rgba(239,68,68,0.1);
  color: #dc2626;
  border-color: rgba(239,68,68,0.3);
}

.ot-live-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: currentColor; animation: pulse-live 2s infinite;
}

@keyframes pulse-live {
  0%, 100% { box-shadow: 0 0 0 2px rgba(22,163,74,0.2); }
  50% { box-shadow: 0 0 0 4px rgba(22,163,74,0.04); }
}

.ot-delivery-card {
  background: linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.04) 100%);
  border: 1px solid rgba(34,197,94,0.2);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ot-delivery-card.delivered {
  background: linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.04) 100%);
  border-color: rgba(34,197,94,0.2);
}

.ot-delivery-card.expected {
  background: linear-gradient(135deg, rgba(16,185,129,0.09) 0%, rgba(201,168,76,0.08) 100%);
  border-color: rgba(34,197,94,0.25);
}

.ot-delivery-icon {
  font-size: 28px; margin-bottom: 12px;
}

.ot-delivery-headline {
  font-size: 18px; font-weight: 700;
  color: #16a34a; margin: 8px 0;
}

.ot-delivery-meta {
  font-size: 12px; color: var(--ash);
}

.ot-delivery-countdown {
  margin-top: 10px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(16,185,129,0.25);
  background: rgba(16,185,129,0.08);
  color: #047857;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
}

.ot-fin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}

.ot-fin-block {
  background: linear-gradient(140deg, #ffffff 0%, #faf8f3 100%);
  border: 1px solid rgba(201,168,76,0.16);
  border-radius: 8px;
  padding: 14px;
}

.ot-fin-title {
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ash);
  font-weight: 700;
  margin-bottom: 8px;
}

.ot-fin-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--ink);
}

.ot-fin-value.gold {
  color: var(--gold-dk);
  font-family: 'Playfair Display', serif;
}

.ot-fin-extra {
  margin-top: 10px;
  display: grid;
  gap: 6px;
}

.ot-fin-extra-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: #6b7280;
}

.ot-fin-extra-row strong {
  color: #111827;
  text-align: right;
}

.ot-finance-shell {
  background: linear-gradient(135deg, #fff 0%, #fbf8f2 100%);
  border: 1px solid rgba(201,168,76,0.22);
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 16px 34px rgba(15,15,15,0.05);
}

.ot-finance-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.ot-finance-title {
  font-family: 'Playfair Display', serif;
  font-size: 22px;
  color: var(--ink);
}

.ot-finance-tag {
  border: 1px solid rgba(201,168,76,0.35);
  background: rgba(201,168,76,0.09);
  color: var(--gold-dk);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
}

.ot-delivery-hero {
  width: 100%;
  text-align: center;
  border-radius: 12px;
  padding: 26px 22px;
  background:
    radial-gradient(circle at 18% 18%, rgba(201,168,76,0.22), transparent 38%),
    radial-gradient(circle at 82% 22%, rgba(16,185,129,0.18), transparent 36%),
    linear-gradient(135deg, #f4f1ea 0%, #eef6f2 100%);
  border: 1px solid rgba(201,168,76,0.26);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 16px 38px rgba(15,15,15,0.06);
}

.ot-delivery-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  background: rgba(16,185,129,0.12);
  border: 1px solid rgba(16,185,129,0.24);
  color: #047857;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.ot-items-grid {
  display: grid; gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  margin-bottom: 24px;
}

.ot-item-card {
  background: var(--smoke);
  border: 1px solid var(--bd);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  transition: all 0.2s;
}

.ot-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.08);
  border-color: rgba(201,168,76,0.3);
}

.ot-item-image {
  width: 100%; height: 120px;
  border-radius: 6px;
  margin-bottom: 10px;
  object-fit: cover;
  background: var(--fog);
}

.ot-item-name {
  font-size: 12px; font-weight: 600;
  color: var(--ink); margin-bottom: 6px;
  line-height: 1.3;
}

.ot-item-price {
  font-size: 14px; font-weight: 700;
  color: var(--gold-dk);
}

.ot-item-qty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 4px 0 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(201,168,76,0.12);
  color: #8b6b12;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.ot-timeline-event {
  display: flex; gap: 18px;
  padding: 18px; margin-bottom: 16px;
  background: var(--smoke);
  border: 1px solid var(--bd);
  border-radius: 8px;
  border-left: 3px solid var(--teal);
  transition: all 0.2s;
}

.ot-timeline-event.done {
  border-left-color: var(--teal);
  background: linear-gradient(135deg, rgba(26,140,140,0.05), transparent);
}

.ot-timeline-event.active {
  border-left-color: var(--gold);
  background: linear-gradient(135deg, rgba(201,168,76,0.08), transparent);
  box-shadow: 0 4px 12px rgba(201,168,76,0.1);
}

.ot-timeline-dot {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--white);
  border: 2px solid var(--bd);
  display: flex; align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--ash);
}

.ot-timeline-event.done .ot-timeline-dot,
.ot-timeline-event.active .ot-timeline-dot {
  background: var(--teal);
  border-color: var(--teal);
  color: var(--white);
}

.ot-timeline-event.active .ot-timeline-dot {
  background: var(--gold);
  border-color: var(--gold);
  box-shadow: 0 0 16px rgba(201,168,76,0.3);
}

.ot-timeline-title {
  font-size: 16px; font-weight: 700;
  color: var(--ink); margin: 0 0 4px;
}

.ot-timeline-text {
  font-size: 13px; color: var(--ash);
  margin: 8px 0;
}

.ot-timeline-time {
  font-size: 11px; color: var(--ash);
  display: flex; align-items: center; gap: 6px;
}

@media (max-width: 768px) {
  .ot-page { padding: 70px 16px 60px; }
  .ot-hero-inner { flex-direction: column; align-items: flex-start; }
  .ot-stepper { gap: 4px; }
  .ot-items-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
  .ot-step-label { font-size: 9px; max-width: 60px; }
  .ot-kpi-grid { grid-template-columns: 1fr 1fr; }
  .ot-shell { grid-template-columns: 1fr; }
  .ot-top-premium-grid { grid-template-columns: 1fr; }
}
@media (max-width: 1100px) and (min-width: 769px) {
  .ot-top-premium-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
`

export default function OrderTracking() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const userId = localStorage.getItem('userid')
  const supportEmail = 'support@eshopperr.me'

  const [status, setStatus] = useState('Ordered')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [toasts, setToasts] = useState([])
  const [didCelebrate, setDidCelebrate] = useState(false)
  const [statusTimeline, setStatusTimeline] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [copiedOrderId, setCopiedOrderId] = useState(false)
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [nowTick, setNowTick] = useState(Date.now())

  const activeIndex = useMemo(() => Math.max(0, STEPS.indexOf(status)), [status])
  const progressPercent = useMemo(() => (activeIndex / (STEPS.length - 1)) * 100, [activeIndex])
  const orderItems = useMemo(() => {
    const candidates = [
      order?.orderItems,
      order?.products,
      order?.items,
      order?.productDetails,
      order?.cartItems
    ]

    const normalized = []
    const pushItems = (list) => {
      if (!Array.isArray(list)) return
      list.forEach((entry) => {
        if (Array.isArray(entry)) {
          pushItems(entry)
          return
        }
        if (entry && typeof entry === 'object') {
          normalized.push(entry)
        }
      })
    }

    candidates.forEach(pushItems)
    return normalized
  }, [order])

  const orderItemsDetailed = useMemo(
    () => orderItems.map((item, index) => {
      const quantityVal = Number(
        item?.quantity ??
        item?.qty ??
        item?.count ??
        item?.orderedQty ??
        item?.quantityOrdered ??
        item?.qnty ??
        item?.productQty ??
        item?.cartQuantity ??
        item?.productid?.quantity ??
        item?.productid?.qty ??
        0
      )
      const priceVal = Number(item?.price || item?.finalprice || item?.salePrice || item?.baseprice || item?.productid?.finalprice || item?.productid?.baseprice || 0)
      const unitPrice = Number.isFinite(priceVal) ? priceVal : 0
      const lineTotalVal = Number(item?.totalPrice || item?.total || unitPrice)
      const lineTotal = Number.isFinite(lineTotalVal) ? lineTotalVal : unitPrice

      // Fallback: infer qty from line total when backend qty field is missing.
      let quantity = Number.isFinite(quantityVal) && quantityVal > 0 ? quantityVal : 0
      if (!quantity && unitPrice > 0 && lineTotal > 0) {
        const inferredQty = lineTotal / unitPrice
        if (Number.isFinite(inferredQty) && inferredQty > 0) {
          quantity = Number.isInteger(inferredQty) ? inferredQty : Math.max(1, Math.round(inferredQty))
        }
      }
      if (!quantity) quantity = 1

      return {
        id: String(item?._id || item?.id || item?.productid?._id || `${item?.sku || item?.name || 'item'}-${index}`),
        name: item?.title || item?.name || item?.productName || item?.productid?.name || `Item ${index + 1}`,
        description: item?.description || item?.productid?.description || '',
        quantity,
        unitPrice,
        lineTotal,
        image: resolveItemImage(item)
      }
    }),
    [orderItems]
  )

  const totalItemCount = useMemo(
    () => orderItemsDetailed.reduce((sum, item) => sum + item.quantity, 0),
    [orderItemsDetailed]
  )

  const subtotalAmount = useMemo(() => {
    const fromOrder = Number(order?.totalAmount)
    if (Number.isFinite(fromOrder) && fromOrder > 0) return fromOrder
    return orderItemsDetailed.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0)
  }, [order?.totalAmount, orderItemsDetailed])

  const shippingAmount = useMemo(() => {
    const parsed = Number(order?.shippingAmount || 0)
    return Number.isFinite(parsed) ? parsed : 0
  }, [order?.shippingAmount])

  const discountAmount = useMemo(() => {
    const parsed = Number(order?.couponDiscount || 0)
    return Number.isFinite(parsed) ? parsed : 0
  }, [order?.couponDiscount])

  const finalAmount = useMemo(() => {
    const parsed = Number(order?.finalAmount)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
    return Math.max(subtotalAmount + shippingAmount - discountAmount, 0)
  }, [order?.finalAmount, subtotalAmount, shippingAmount, discountAmount])

  const paymentStatusLabel = useMemo(() => {
    const raw = String(order?.paymentStatus || '').toLowerCase()
    if (raw === 'paid') return 'Paid'
    if (raw === 'pending') return 'Pending'
    if (raw === 'failed') return 'Failed'
    return order?.paymentStatus || 'Pending'
  }, [order?.paymentStatus])

  const paymentReference = useMemo(() => (
    order?.transactionId ||
    order?.paymentId ||
    order?.paymentReference ||
    order?.upiRef ||
    order?.upiTransactionId ||
    order?.razorpayPaymentId ||
    order?.razorpay_payment_id ||
    order?.razorpayOrderId ||
    order?.razorpay_order_id ||
    ''
  ), [order])

  const paidAtLabel = useMemo(() => {
    const paidAt = order?.paidAt || order?.paymentDate || (paymentStatusLabel === 'Paid' ? order?.updatedAt : null)
    return formatDateTimeShort(paidAt)
  }, [order, paymentStatusLabel])

  const timelineEventMap = useMemo(() => {
    const map = {}
    ;(statusTimeline || []).forEach((entry) => {
      const normalized = normalizeStatus(entry?.status || '')
      const entryTime = new Date(entry?.timestamp || 0).getTime()
      const existingTime = new Date(map[normalized]?.timestamp || 0).getTime()
      if (!map[normalized] || entryTime >= existingTime) {
        map[normalized] = { ...entry, status: normalized }
      }
    })
    return map
  }, [statusTimeline])

  const timelineSteps = useMemo(
    () => STEPS.map((step, index) => ({
      step,
      index,
      isReached: index <= activeIndex,
      timestamp: timelineEventMap[step]?.timestamp,
      details: timelineEventMap[step] || null
    })),
    [activeIndex, timelineEventMap]
  )

  const pushToast = useCallback((title, message, timeout = 2800) => {
    const id = Date.now() + Math.random()
    const newToast = { id, title, message }
    setToasts(prev => [...prev, newToast])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), timeout)
  }, [])

  const showStatusToast = (nextStatus) => {
    const messages = {
      Ordered: '✅ Order Confirmed',
      Packed: '📦 Packed & Ready',
      Shipped: '🚚 On Its Way',
      Delivered: '🎉 Delivered!'
    }
    pushToast('📨 Order Updated', messages[nextStatus] || `Status: ${nextStatus}`, 3500)
  }

  const formatDeliveryDate = (dateString) => {
    if (!dateString) return null
    const deliveryDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const deliveryDateOnly = new Date(deliveryDate)
    deliveryDateOnly.setHours(0, 0, 0, 0)

    if (deliveryDateOnly.getTime() === today.getTime()) {
      return 'Today'
    } else if (deliveryDateOnly.getTime() === tomorrow.getTime()) {
      return 'Tomorrow'
    } else {
      return deliveryDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    }
  }

  const getDeliveryInfo = useMemo(() => {
    const scheduleDate = order?.deliverySchedule?.date || order?.deliverySchedule?.estimatedDelivery || order?.deliverySchedule?.scheduledAt
    const fallbackDate = order?.estimatedDelivery || order?.estimatedArrival
    const resolvedDate = scheduleDate || fallbackDate
    if (!resolvedDate) return null
    return {
      date: resolvedDate,
      time: order?.deliverySchedule?.time || null,
      source: scheduleDate ? 'schedule' : 'estimate'
    }
  }, [order])

  const deliveryCountdown = useMemo(() => {
    // nowTick keeps countdown reactive with real time progression.
    void nowTick
    return getCountdownText(getDeliveryInfo?.date)
  }, [getDeliveryInfo, nowTick])
  const addressText = useMemo(() => formatAddress(order?.shippingAddress || order?.address || {}), [order])
  const addressLines = useMemo(() => formatAddressLines(order?.shippingAddress || order?.address || {}), [order])
  const completedSteps = useMemo(() => Math.max(1, activeIndex + 1), [activeIndex])
  const trackingSnapshot = useMemo(() => getTrackingSnapshot(order, statusTimeline), [order, statusTimeline])

  const mapEmbedUrl = useMemo(() => {
    if (!trackingSnapshot?.coords) return ''
    const { lat, lng } = trackingSnapshot.coords
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.03}%2C${lat - 0.03}%2C${lng + 0.03}%2C${lat + 0.03}&layer=mapnik&marker=${lat}%2C${lng}`
  }, [trackingSnapshot])

  const mapSearchUrl = useMemo(() => {
    if (trackingSnapshot?.coords) {
      const { lat, lng } = trackingSnapshot.coords
      return `https://www.google.com/maps?q=${lat},${lng}`
    }
    const q = trackingSnapshot?.label || addressText || 'India'
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
  }, [trackingSnapshot, addressText])

  const invoiceUrl = useMemo(() => {
    if (!orderId || !userId) return ''
    return `${BASE_URL}/api/order/${encodeURIComponent(orderId)}/invoice?userId=${encodeURIComponent(userId)}`
  }, [orderId, userId])

  const openInvoice = async (inline = false) => {
    if (!invoiceUrl || invoiceLoading) return

    setInvoiceLoading(true)
    try {
      const target = inline ? `${invoiceUrl}&disposition=inline` : invoiceUrl
      const response = await axios.get(target, { responseType: 'blob', timeout: 120000 })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const blobUrl = URL.createObjectURL(blob)

      if (inline) {
        window.open(blobUrl, '_blank', 'noopener,noreferrer')
      } else {
        const anchor = document.createElement('a')
        anchor.href = blobUrl
        anchor.download = `Invoice-${orderId}.pdf`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
      pushToast('🧾 Invoice Ready', inline ? 'Invoice preview opened' : 'Invoice download started', 2200)
    } catch (error) {
      pushToast('❌ Invoice Error', error?.response?.data?.message || 'Unable to generate invoice right now', 2600)
    } finally {
      setInvoiceLoading(false)
    }
  }

  const fetchOrderData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const { data } = await axios.get(`${BASE_URL}/api/order/${orderId}?userId=${userId}`, { timeout: 15000 })
      setOrder(data)
      const initialStatus = normalizeStatus(data?.orderStatus)
      setStatus(initialStatus)
      if (Array.isArray(data?.statusHistory) && data.statusHistory.length) {
        setStatusTimeline(data.statusHistory)
      } else {
        setStatusTimeline([{ status: initialStatus, timestamp: data?.updatedAt || data?.createdAt || new Date().toISOString() }])
      }
    } catch (e) {
      const errorMsg = e.response?.status === 404 ? 'Order not found.' : 'Failed to load order.'
      setError(errorMsg)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [orderId, userId])

  const onRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    await fetchOrderData({ silent: true })
    pushToast('🔄 Refreshed', 'Order data synced with backend', 1800)
    setRefreshing(false)
  }

  const onCopyOrderId = async () => {
    if (!orderId) return
    try {
      await navigator.clipboard.writeText(orderId)
      setCopiedOrderId(true)
      pushToast('📋 Copied', `Order ID ${orderId} copied`, 1800)
      setTimeout(() => setCopiedOrderId(false), 1500)
    } catch {
      pushToast('⚠️ Copy Failed', 'Could not copy order ID. Try again.', 2200)
      setCopiedOrderId(false)
    }
  }

  const supportMailtoUrl = useMemo(() => {
    const subject = encodeURIComponent('Order Support')
    const supportLines = [
      'Hi Support, I need assistance with the following order:',
      `Order ID: ${orderId || 'N/A'}`,
      `Customer: ${order?.userName || order?.shippingAddress?.fullName || 'N/A'}`,
      `Status: ${status || 'N/A'}`,
      `Payment Status: ${paymentStatusLabel || 'N/A'}`,
      `Total Amount: ${formatMoney(finalAmount)}`,
      `Shipping Address: ${addressText || 'N/A'}`,
      `ETA: ${getDeliveryInfo ? formatDeliveryDate(getDeliveryInfo.date) : 'Pending'}`,
      '',
      'Please help me with this order.'
    ]
    const body = encodeURIComponent(supportLines.join('\n'))
    return `mailto:${supportEmail}?subject=${subject}&body=${body}`
  }, [addressText, finalAmount, getDeliveryInfo, order, orderId, paymentStatusLabel, status])

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now())
    }, 30000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!userId || !orderId) {
      setError('Please login and try again.')
      setLoading(false)
      return
    }

    let mounted = true
    let socketRef

    const init = async () => {
      await fetchOrderData()
      if (!mounted) return

      socketRef = io(BASE_URL, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        auth: { userId }
      })

      socketRef.on('connect', () => {
        if (mounted) setSocketConnected(true)
      })

      socketRef.on('disconnect', () => {
        if (mounted) setSocketConnected(false)
      })

      socketRef.on('statusUpdate', (payload) => {
        if (payload?.orderId === orderId && payload?.status) {
          if (mounted) {
            const nextStatus = normalizeStatus(payload.status)
            setStatus((prev) => {
              if (prev !== nextStatus) showStatusToast(nextStatus)
              return nextStatus
            })

            setOrder((prev) => {
              const updated = { ...(prev || {}), updatedAt: payload.updatedAt || new Date().toISOString() }
              const payloadScheduleDate = payload?.deliverySchedule?.date || payload?.deliverySchedule?.estimatedDelivery || payload?.deliverySchedule?.scheduledAt
              const payloadEstimatedDate = payload?.estimatedDelivery || payload?.estimatedArrival

              if (payload?.deliverySchedule || payloadScheduleDate || payloadEstimatedDate) {
                updated.deliverySchedule = {
                  ...(updated.deliverySchedule || {}),
                  ...(payload.deliverySchedule || {})
                }
                if (payloadScheduleDate || payloadEstimatedDate) {
                  updated.estimatedDelivery = payloadScheduleDate || payloadEstimatedDate
                  updated.estimatedArrival = payloadScheduleDate || payloadEstimatedDate
                }
              } else if (payload.deliveryAgent || payload.locationName || payload.latitude != null || payload.longitude != null) {
                updated.deliverySchedule = {
                  ...(updated.deliverySchedule || {}),
                  ...(payload.deliveryAgent ? { deliveryAgent: payload.deliveryAgent } : {}),
                  ...(payload.riderPhone ? { riderPhone: payload.riderPhone } : {}),
                  ...(payload.locationName ? { locationName: payload.locationName } : {}),
                  ...(payload.latitude != null ? { latitude: payload.latitude } : {}),
                  ...(payload.longitude != null ? { longitude: payload.longitude } : {})
                }
              }
              return updated
            })

            setStatusTimeline((prev) => [...prev, {
              status: nextStatus,
              timestamp: payload.updatedAt || new Date().toISOString(),
              deliverySchedule: payload.deliverySchedule || null,
              adminNote: payload.adminNote || null,
              deliveryAgent: payload.deliveryAgent || null,
              riderPhone: payload.riderPhone || null,
              locationName: payload.locationName || null,
              latitude: payload.latitude || null,
              longitude: payload.longitude || null
            }])
          }
        }
      })
    }

    init()
    return () => {
      mounted = false
      if (socketRef) socketRef.disconnect()
    }
  }, [orderId, userId, fetchOrderData])

  useEffect(() => {
    if (status !== 'Delivered' || didCelebrate) return
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#C9A84C', '#E8C97A', '#FFFFFF', '#22C55E']
    })
    setDidCelebrate(true)
  }, [status, didCelebrate])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fafaf8 0%, #f5f3ef 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
            <div style={{ fontSize: '48px' }}>📦</div>
          </motion.div>
          <p style={{ marginTop: '16px', color: '#999' }}>Loading your order...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fafaf8 0%, #f5f3ef 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <p style={{ marginTop: '16px', color: '#dc2626', fontWeight: 'bold' }}>{error}</p>
          <button onClick={() => navigate('/profile')} style={{ marginTop: '24px', padding: '10px 28px', background: '#0A0A0A', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
            Back to Profile
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="ot-page">
        {/* Toast Notifications */}
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {toasts.map((toast) => (
            <motion.div key={toast.id} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ minWidth: 280, background: '#FFFFFF', border: '1px solid rgba(201,168,76,0.2)', color: '#0A0A0A', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '14px 16px', position: 'relative' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--gold-dk)', marginBottom: 4 }}>
                {toast.title}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>{toast.message}</div>
            </motion.div>
          ))}
        </div>

        {/* Hero Section */}
        <div className="ot-hero">
          <div className="ot-hero-orb1" />
          <div className="ot-hero-orb2" />
          <div className="ot-hero-inner">
            <div>
              <div className="ot-eyebrow">ORDER TRACKING</div>
              <h1 className="ot-header-title">Track Your <em>Order</em></h1>
              <p className="ot-header-sub">Real-time delivery updates for order #{orderId}</p>
            </div>
            <div className="ot-hero-right">
              <div className="ot-hero-actions">
                <button className="ot-ghost-btn" onClick={onCopyOrderId}>
                  <Copy size={13} />
                  {copiedOrderId ? 'Copied' : 'Copy ID'}
                </button>
                <button className="ot-ghost-btn" onClick={onRefresh} disabled={refreshing}>
                  <RefreshCw size={13} style={refreshing ? { animation: 'pulse-step 1s linear infinite' } : {}} />
                  {refreshing ? 'Refreshing' : 'Refresh'}
                </button>
                <button className="ot-ghost-btn" onClick={() => openInvoice(true)} disabled={!invoiceUrl || invoiceLoading}>
                  <FileText size={13} /> Preview Invoice
                </button>
              </div>
              <button className="ot-back-btn" onClick={() => navigate('/my-orders')}>← Back</button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>
          <div className="ot-kpi-grid">
            <div className="ot-kpi">
              <div className="ot-kpi-head">
                <span className="ot-kpi-label">Current Status</span>
                <Sparkles size={15} color="#9A7A20" />
              </div>
              <div className="ot-kpi-value" style={{ color: STATUS_COLOR[status] }}>{status}</div>
              <div className="ot-kpi-sub">Live sync: {socketConnected ? 'Connected' : 'Reconnecting'}</div>
            </div>
            <div className="ot-kpi">
              <div className="ot-kpi-head">
                <span className="ot-kpi-label">Journey Progress</span>
                <Gauge size={15} color="#9A7A20" />
              </div>
              <div className="ot-kpi-value">{Math.round(progressPercent)}%</div>
              <div className="ot-kpi-sub">{completedSteps} of {STEPS.length} milestones</div>
            </div>
            <div className="ot-kpi">
              <div className="ot-kpi-head">
                <span className="ot-kpi-label">Items</span>
                <Package size={15} color="#9A7A20" />
              </div>
              <div className="ot-kpi-value">{totalItemCount}</div>
              <div className="ot-kpi-sub">Across your order bundle</div>
            </div>
            <div className="ot-kpi">
              <div className="ot-kpi-head">
                <span className="ot-kpi-label">Order Value</span>
                <Wallet size={15} color="#9A7A20" />
              </div>
              <div className="ot-kpi-value" style={{ color: 'var(--gold-dk)' }}>{formatMoney(finalAmount)}</div>
              <div className="ot-kpi-sub">Payment: {paymentStatusLabel}</div>
            </div>
          </div>

          {/* Finance Card */}
          <motion.div className="ot-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="ot-finance-shell">
              <div className="ot-finance-head">
                <div className="ot-finance-title">Payment Summary</div>
                <div className="ot-finance-tag">Verified Transaction</div>
              </div>

              <div className="ot-fin-grid">
                <div className="ot-fin-block">
                  <div className="ot-label">Payment Status</div>
                  <div className="ot-chip" style={{ marginTop: 8, background: paymentStatusLabel === 'Paid' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', borderColor: paymentStatusLabel === 'Paid' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)', color: paymentStatusLabel === 'Paid' ? '#16a34a' : '#d97706' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
                    {paymentStatusLabel}
                  </div>
                  <div className="ot-fin-extra">
                    <div className="ot-fin-extra-row"><span>Method</span><strong>{order?.paymentMethod || 'Unavailable'}</strong></div>
                    <div className="ot-fin-extra-row"><span>Reference</span><strong>{paymentReference || 'Pending'}</strong></div>
                    <div className="ot-fin-extra-row"><span>Paid On</span><strong>{paidAtLabel}</strong></div>
                  </div>
                </div>

                <div className="ot-fin-block">
                  <div className="ot-label">Amount Paid</div>
                  <div className="ot-fin-value gold">{formatMoney(finalAmount)}</div>
                  <div className="ot-fin-extra">
                    <div className="ot-fin-extra-row"><span>Total Quantity</span><strong>{totalItemCount} item{totalItemCount === 1 ? '' : 's'}</strong></div>
                    <div className="ot-fin-extra-row"><span>Subtotal</span><strong>{formatMoney(subtotalAmount)}</strong></div>
                    <div className="ot-fin-extra-row"><span>Shipping</span><strong>{shippingAmount > 0 ? formatMoney(shippingAmount) : 'Free'}</strong></div>
                    <div className="ot-fin-extra-row"><span>Discount</span><strong>{discountAmount > 0 ? `-${formatMoney(discountAmount)}` : 'No Discount'}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Delivery Status */}
          {status === 'Delivered' ? (
            <motion.div className="ot-card ot-delivery-card delivered" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="ot-delivery-icon">✅</div>
              <div className="ot-delivery-headline">Delivered Successfully!</div>
              <p style={{ fontSize: 14, color: '#666', margin: '8px 0' }}>Thank you for your purchase.</p>
              <div className="ot-delivery-meta">
                Delivered on {new Date(order?.updatedAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {order?.shippingAddress?.city ? ` to ${order.shippingAddress.city}` : ''}
              </div>
            </motion.div>
          ) : getDeliveryInfo ? (
            <motion.div className="ot-card ot-delivery-card expected" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="ot-delivery-hero">
                <div className="ot-delivery-pill">Expected Delivery</div>
                <div className="ot-delivery-icon">📅</div>
                <div className="ot-delivery-headline">{formatDeliveryDate(getDeliveryInfo.date)}{getDeliveryInfo.time ? ` at ${getDeliveryInfo.time}` : ''}</div>
                <div className="ot-delivery-meta">
                  Expected delivery: {new Date(getDeliveryInfo.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  {order?.shippingAddress?.city ? ` to ${order.shippingAddress.city}` : ''}
                </div>
                <div className="ot-delivery-countdown">{deliveryCountdown}</div>
              </div>
            </motion.div>
          ) : null}

          {/* Live Badge */}
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <div className={`ot-live-badge ${socketConnected ? 'on' : 'off'}`}>
              <div className="ot-live-dot" />
              {socketConnected ? '🟢 Live Updates On' : '🔴 Connecting...'}
            </div>
          </div>

          <div className="ot-shell">
            <div>

              {/* Ordered Items */}
              {orderItemsDetailed.length > 0 && (
                <motion.div className="ot-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 className="ot-section-title">📦 Ordered Items</h3>
                    <span style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold-dk)', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{totalItemCount} items</span>
                  </div>
                  <div className="ot-items-grid">
                    {orderItemsDetailed.map((item, idx) => (
                      <motion.div key={item.id} className="ot-item-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}>
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="ot-item-image" />
                        ) : (
                          <div className="ot-item-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Image</div>
                        )}
                        <p className="ot-item-name">{item.name}</p>
                        <div className="ot-item-qty">Ordered Qty: {item.quantity}</div>
                        <p className="ot-item-price">{formatMoney(item.lineTotal)}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Progress Bar */}
              <div className="ot-progress-bar">
                <motion.div className="ot-progress-fill" initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ delay: 0.2 }} />
              </div>

              {/* Stepper */}
              <div className="ot-stepper">
                {STEPS.map((step, idx) => {
                  const StepIcon = STATUS_ICON[step]
                  const isDone = idx < activeIndex
                  const isActive = idx === activeIndex
                  return (
                    <motion.div key={step} className={`ot-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                      <motion.div className="ot-step-dot" animate={isActive ? { scale: 1.1 } : { scale: 1 }}>
                        {StepIcon && <StepIcon size={20} strokeWidth={2} />}
                      </motion.div>
                      <div className="ot-step-label">{step}</div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Current Status */}
              <motion.div className="ot-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(201,168,76,0.05) 0%, transparent)', border: '1px solid rgba(201,168,76,0.1)' }}>
                <p className="ot-label" style={{ fontSize: 11 }}>Current Status</p>
                <h2 style={{ fontSize: 32, fontWeight: 700, color: STATUS_COLOR[status], margin: '12px 0 8px', letterSpacing: '-0.01em' }}>{status}</h2>
                <p style={{ fontSize: 14, color: '#666', margin: 0 }}>{STATUS_SUBTEXT[status]}</p>
              </motion.div>

              {/* Timeline */}
              {statusTimeline.length > 0 && (
                <motion.div className="ot-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <h3 className="ot-section-title">📍 Journey Timeline</h3>
                  {timelineSteps.map((event, idx) => {
                    const isDone = idx < activeIndex
                    const isActive = idx === activeIndex
                    const StepIcon = STATUS_ICON[event.step]
                    return (
                      <div key={event.step} className={`ot-timeline-event ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                        <div className="ot-timeline-dot">
                          {StepIcon && <StepIcon size={20} strokeWidth={2} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p className="ot-timeline-title">{event.step}</p>
                          <p className="ot-timeline-text">{STATUS_SUBTEXT[event.step]}</p>
                          <div className="ot-timeline-time">
                            <Calendar size={12} />
                            {formatDateTimeShort(event.timestamp)}
                          </div>
                          {event?.details?.deliverySchedule && (
                            <div className="ot-inline-note">
                              Delivery Slot: {formatDeliverySchedule(event.details.deliverySchedule)}
                            </div>
                          )}
                          {(event?.details?.deliverySchedule?.deliveryAgent || event?.details?.deliveryAgent) && (
                            <div className="ot-inline-note" style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)', color: '#1e40af' }}>
                              Rider: {event.details.deliverySchedule?.deliveryAgent || event.details.deliveryAgent}
                              {event.details.deliverySchedule?.riderPhone || event.details.riderPhone ? ` (${event.details.deliverySchedule?.riderPhone || event.details.riderPhone})` : ''}
                            </div>
                          )}
                          {(event?.details?.deliverySchedule?.locationName || event?.details?.locationName || event?.details?.deliverySchedule?.latitude != null || event?.details?.latitude != null) && (
                            <div className="ot-inline-note" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)', color: '#047857' }}>
                              Location: {event.details.deliverySchedule?.locationName || event.details.locationName || 'Live coordinates'}
                              {(event.details.deliverySchedule?.latitude != null || event.details.latitude != null) && (event.details.deliverySchedule?.longitude != null || event.details.longitude != null)
                                ? ` [${Number(event.details.deliverySchedule?.latitude || event.details.latitude).toFixed(4)}, ${Number(event.details.deliverySchedule?.longitude || event.details.longitude).toFixed(4)}]`
                                : ''}
                            </div>
                          )}
                          {event?.details?.adminNote && (
                            <div className="ot-inline-note" style={{ background: 'rgba(201,168,76,0.08)', borderColor: 'rgba(201,168,76,0.2)', color: '#9A7A20' }}>
                              Update Note: {event.details.adminNote}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </div>

            <div className="ot-stack">
              <div className="ot-mini-card">
                <div className="ot-map-shell">
                  <div className="ot-map-head">
                    <div className="ot-map-title"><Navigation size={14} /> Live Delivery Map</div>
                    <div className="ot-map-tag">Premium Route</div>
                  </div>
                  <div className="ot-map-frame">
                    {mapEmbedUrl ? (
                      <iframe
                        title="delivery-map"
                        src={mapEmbedUrl}
                        style={{ width: '100%', height: '100%', border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div className="ot-map-placeholder">Map will appear on live coordinates</div>
                    )}
                  </div>
                  <button className="ot-link-btn" onClick={() => window.open(mapSearchUrl, '_blank', 'noopener,noreferrer')}>
                    <MapPin size={13} /> Open in Maps
                  </button>
                </div>
              </div>

              <div className="ot-mini-card">
                <div className="ot-mini-title"><Clock3 size={14} /> Delivery Insight</div>
                <div className="ot-mini-row">
                  <span className="ot-mini-key">ETA Window</span>
                  <span className="ot-mini-val">{getDeliveryInfo ? formatDeliveryDate(getDeliveryInfo.date) : 'Pending'}</span>
                </div>
                <div className="ot-mini-row">
                  <span className="ot-mini-key">Countdown</span>
                  <span className="ot-mini-val">{status === 'Delivered' ? 'Completed' : deliveryCountdown}</span>
                </div>
                <div className="ot-mini-row">
                  <span className="ot-mini-key">Last Activity</span>
                  <span className="ot-mini-val">{formatDateTimeShort(order?.updatedAt)}</span>
                </div>
              </div>

              <div className="ot-mini-card">
                <div className="ot-mini-title"><Home size={14} /> Shipping Address</div>
                {addressLines.length ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {addressLines.map((line, index) => (
                      <div
                        key={`${line}-${index}`}
                        style={{
                          paddingTop: index === 0 ? 0 : 8,
                          borderTop: index === 0 ? 'none' : '1px solid rgba(201,168,76,0.08)',
                          color: index === 0 ? 'var(--ink)' : '#4b5563',
                          fontSize: index === 0 ? 14 : 13,
                          fontWeight: index === 0 ? 700 : 500,
                          lineHeight: 1.55
                        }}
                      >
                        {line}
                      </div>
                    ))}
                    {addressText && addressText !== addressLines.join(', ') && (
                      <div style={{ marginTop: 2, fontSize: 11, color: '#9ca3af' }}>
                        Full address captured from the order record.
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: '#4b5563', lineHeight: 1.55 }}>
                    Address not available yet.
                  </p>
                )}
              </div>

              <div className="ot-mini-card">
                <div className="ot-mini-title"><Wallet size={14} /> Payment Snapshot</div>
                <div className="ot-mini-row">
                  <span className="ot-mini-key">Total Quantity</span>
                  <span className="ot-mini-val">{totalItemCount} item{totalItemCount === 1 ? '' : 's'}</span>
                </div>
                <div className="ot-mini-row">
                  <span className="ot-mini-key">Subtotal</span>
                  <span className="ot-mini-val">{formatMoney(subtotalAmount)}</span>
                </div>
                <div className="ot-mini-row">
                  <span className="ot-mini-key">Shipping</span>
                  <span className="ot-mini-val">{formatMoney(shippingAmount)}</span>
                </div>
                <div className="ot-mini-row">
                  <span className="ot-mini-key">Discount</span>
                  <span className="ot-mini-val">-{formatMoney(discountAmount)}</span>
                </div>
                <div className="ot-mini-row">
                  <span className="ot-mini-key">Final Paid</span>
                  <span className="ot-mini-val" style={{ color: 'var(--gold-dk)' }}>{formatMoney(finalAmount)}</span>
                </div>
              </div>

              <div className="ot-mini-card">
                <div className="ot-mini-title"><Download size={14} /> Invoice Center</div>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
                  Directly generated from backend for your current order status.
                </p>
                <div style={{ display: 'grid', gap: 8 }}>
                  <button className="ot-link-btn" onClick={() => openInvoice(true)} disabled={!invoiceUrl || invoiceLoading}>
                    <FileText size={13} /> {invoiceLoading ? 'Preparing...' : 'View Invoice'}
                  </button>
                  <button className="ot-link-btn" onClick={() => openInvoice(false)} disabled={!invoiceUrl || invoiceLoading}>
                    <Download size={13} /> {invoiceLoading ? 'Preparing...' : 'Download Invoice'}
                  </button>
                </div>
              </div>

              <div className="ot-mini-card">
                <div className="ot-mini-title"><Phone size={14} /> Priority Support</div>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
                  Need help with delivery schedule, payment, or updates?
                </p>
                <div style={{ display: 'grid', gap: 8 }}>
                  <button className="ot-ghost-btn" style={{ justifyContent: 'center' }} onClick={() => {
                    const msg = `Hi Support, I need assistance with order: ${orderId}`
                    window.open(`https://wa.me/918447859784?text=${encodeURIComponent(msg)}`, '_blank')
                  }}>
                    <Phone size={13} /> WhatsApp Support
                  </button>
                  <a className="ot-ghost-btn" href={supportMailtoUrl} style={{ justifyContent: 'center', textDecoration: 'none' }}>
                    <Mail size={13} /> Email Support
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <motion.div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <motion.button className="ot-btn ot-btn-primary" onClick={() => navigate('/my-orders')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              ← Back to My Orders
            </motion.button>
            <motion.button className="ot-btn ot-btn-primary" onClick={() => navigate('/shop')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ background: 'linear-gradient(135deg, var(--teal) 0%, #0f6f6f 100%)' }}>
              Reorder Similar
            </motion.button>
            <motion.button className="ot-btn ot-btn-secondary" onClick={() => {
              const msg = `Hi Support, I need assistance with order: ${orderId}`
              window.open(`https://wa.me/918447859784?text=${encodeURIComponent(msg)}`, '_blank')
            }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              💬 Chat Support
            </motion.button>
          </motion.div>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: 11, color: '#999', marginTop: 28, marginBottom: 0 }}>
            Last updated: {order?.updatedAt ? new Date(order.updatedAt).toLocaleString() : 'Loading...'}
          </p>
        </div>
      </div>
    </>
  )
}
