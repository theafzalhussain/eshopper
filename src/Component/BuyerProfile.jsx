import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useMembership } from './MembershipContext'
import {
    User,
    Mail,
    Phone,
    MapPin,
    Building2,
    Map,
    Hash,
    Copy,
    CheckCheck,
    Pencil,
    ShieldCheck,
} from 'lucide-react'

const css = `
.bpx-membership-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 6px 12px;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(201,168,76,0.16), rgba(201,168,76,0.08));
    border: 1px solid rgba(201,168,76,0.22);
    color: var(--gold-dk);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
}
.bpx-membership-badge.silver {
    background: linear-gradient(135deg, rgba(148,163,184,0.18), rgba(148,163,184,0.08));
    border-color: rgba(148,163,184,0.34);
    color: #475569;
}
.bpx-membership-badge.gold {
    background: linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1));
    border-color: rgba(212,175,55,0.34);
    color: #8b6f1a;
}
.bpx-membership-badge.elite {
    background: linear-gradient(135deg, rgba(201,168,76,0.22), rgba(26,140,140,0.12));
    border-color: rgba(201,168,76,0.4);
    color: #7a5f18;
}

:root {
    --gold:        #C9A84C;
    --gold-lt:     #E8C97A;
    --gold-dk:     #9A7A20;
    --teal:        #1A8C8C;
    --teal-dk:     #0f6b6b;
    --ink:         #0A0A0A;
    --smoke:       #F5F3EF;
    --fog:         #EAE7E0;
    --ash:         #9A9490;
    --white:       #FFFFFF;
    --border:      rgba(201,168,76,0.18);
    --shadow-gold: 0 8px 32px rgba(201,168,76,0.14);
    --shadow-soft: 0 4px 24px rgba(10,10,10,0.06);
}

.bpx-root {
    font-family: inherit;
    color: var(--ink);
}

.bpx-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
    gap: 12px;
}
.bpx-header-eyebrow {
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--gold);
    font-weight: 600;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
}
.bpx-header-eyebrow::before,
.bpx-header-eyebrow::after {
    content: '';
    display: inline-block;
    width: 18px;
    height: 1px;
    background: var(--gold);
    opacity: 0.5;
}
.bpx-header-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.01em;
    margin: 0;
}

.bpx-edit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 150px;
    padding: 10px 16px;
    background: #fffdf8;
    border: 1px solid rgba(201,168,76,0.28);
    border-radius: 4px;
    font-family: inherit;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9a9490;
    cursor: pointer;
    transition: all 0.22s ease;
    text-decoration: none;
}
.bpx-edit-btn:hover {
    color: #7e7668;
    border-color: rgba(201,168,76,0.46);
    background: #ffffff;
    box-shadow: 0 8px 16px rgba(21,17,10,0.08);
}

.bpx-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 28px;
}
@media (max-width: 640px) {
    .bpx-fields { grid-template-columns: 1fr; }
}
.bpx-field-full { grid-column: 1 / -1; }

.bpx-field {
    position: relative;
    background: #fff;
    border: 1px solid #e8ddc4;
    border-radius: 14px;
    padding: 14px 16px 14px 44px;
    transition: border-color 0.2s, box-shadow 0.2s;
    overflow: hidden;
    box-shadow: 0 14px 24px rgba(21,17,10,0.08);
}
.bpx-field::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, var(--gold) 0%, transparent 100%);
    opacity: 0;
    transition: opacity 0.2s;
    border-radius: 14px 0 0 14px;
}
.bpx-field::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 14px;
    pointer-events: none;
    border: 2px solid transparent;
    background: linear-gradient(135deg, rgba(201,168,76,0.54), rgba(255,255,255,0)) border-box;
    -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
}
.bpx-field:hover {
    border-color: #dec68f;
    box-shadow: 0 20px 34px rgba(17,17,17,0.14);
}
.bpx-field:hover::before { opacity: 1; }

.bpx-field-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--gold);
    opacity: 0.75;
}
.bpx-field-label {
    font-size: 9.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ash);
    font-weight: 600;
    margin-bottom: 3px;
}
.bpx-field-value {
    font-size: 14.5px;
    font-weight: 500;
    color: var(--ink);
    word-break: break-word;
    display: flex;
    align-items: center;
    gap: 8px;
}
.bpx-field-empty {
    color: var(--ash);
    font-style: italic;
    font-size: 13px;
}

.bpx-copy-btn {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: var(--ash);
    display: flex;
    align-items: center;
    margin-left: auto;
    opacity: 0;
    transition: opacity 0.2s, color 0.18s;
}
.bpx-field:hover .bpx-copy-btn { opacity: 1; }
.bpx-copy-btn:hover { color: var(--teal); }
.bpx-copy-btn.copied { color: #16a34a; opacity: 1; }

.bpx-verify-strip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    background: linear-gradient(135deg, rgba(26,140,140,0.06), rgba(201,168,76,0.04));
    border: 1px solid rgba(26,140,140,0.15);
    border-radius: 6px;
    margin-bottom: 22px;
}
.bpx-verify-icon { color: var(--teal); flex-shrink: 0; }
.bpx-verify-text { font-size: 12px; color: var(--ink); }
.bpx-verify-text strong { color: var(--teal); font-weight: 600; }

.bpx-divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 24px 0;
}

.bpx-toast {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%) translateY(10px);
    background: var(--ink);
    color: var(--white);
    font-size: 12px;
    padding: 8px 20px;
    border-radius: 3px;
    letter-spacing: 0.08em;
    pointer-events: none;
    z-index: 9999;
    opacity: 0;
    transition: all 0.25s ease;
}
.bpx-toast.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}
`

function Field({ icon: Icon, label, value, copyable, full, onCopied }) {
    const [copied, setCopied] = useState(false)

    function handleCopy() {
        if (!value) return
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true)
            if (onCopied) onCopied()
            setTimeout(() => setCopied(false), 1800)
        })
    }

    return (
        <motion.div
            className={`bpx-field${full ? ' bpx-field-full' : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <span className="bpx-field-icon">
                <Icon size={15} />
            </span>
            <div className="bpx-field-label">{label}</div>
            <div className="bpx-field-value">
                {value ? <span>{value}</span> : <span className="bpx-field-empty">Not provided</span>}
                {copyable && value && (
                    <button className={`bpx-copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy} title="Copy">
                        {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
                    </button>
                )}
            </div>
        </motion.div>
    )
}

export default function BuyerProfile({ user = {} }) {
    const navigate = useNavigate()
    // ...existing code...
    const [toast, setToast] = useState(false)
    const { membershipType: ctxMembershipType, totalOrders: ctxTotalOrders } = useMembership()

    function showCopiedToast() {
        setToast(true)
        setTimeout(() => setToast(false), 1200)
    }

    const streetAddress = user.streetAddress || user.addressline1 || ''
    const addressLine2 = user.addressline2 || user.addressLine2 || user.address_line2 || ''
    const landmark = user.landmark || user.deliveryLandmark || user.land_mark || ''
    const deliveryInstructions =
        user.deliveryNotes ||
        user.deliveryInstructions ||
        user.deliveryInstruction ||
        user.delivery_instructions ||
        ''
    const postalCode = user.postalCode || user.pin || ''
    const hasAddressLine2 = Boolean(String(addressLine2 || '').trim())
    const hasLandmark = Boolean(String(landmark || '').trim())
    const hasDeliveryInstructions = Boolean(String(deliveryInstructions || '').trim())
    const resolvedMembershipType = String(user.membershipType || ctxMembershipType || 'Silver')
    const resolvedTotalOrders = Number(user.totalOrders ?? ctxTotalOrders ?? 0)
    const tierClass = resolvedMembershipType.toLowerCase()

    return (
        <>
            <style>{css}</style>
            <div className={`bpx-toast${toast ? ' visible' : ''}`}>Copied to clipboard</div>

            <div className="bpx-root">
                <div className="bpx-header">
                    <div>
                        <div className="bpx-header-eyebrow">Personal Details</div>
                        <h2 className="bpx-header-title">Your Profile</h2>
                        <div className={`bpx-membership-badge ${tierClass}`}>
                            {resolvedMembershipType} Member - {resolvedTotalOrders} Orders
                        </div>
                    </div>
                    <button className="bpx-edit-btn" onClick={() => navigate('/update-profile', { state: { from: 'checkout' } })}>
                        <Pencil size={12} />
                        Edit Profile
                    </button>
                </div>

                <motion.div
                    className="bpx-verify-strip"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                >
                    <ShieldCheck size={18} className="bpx-verify-icon" />
                    <div className="bpx-verify-text">
                        <strong>Identity Verified</strong> - Your account is protected with enterprise-grade security
                    </div>
                </motion.div>

                <div className="bpx-fields">
                    <Field icon={User} label="Full Name" value={user.name} copyable onCopied={showCopiedToast} />
                    <Field icon={Hash} label="Username" value={user.username} copyable onCopied={showCopiedToast} />
                    <Field icon={Mail} label="Email Address" value={user.email} copyable onCopied={showCopiedToast} />
                    <Field icon={Phone} label="Phone Number" value={user.phone} copyable onCopied={showCopiedToast} />
                    <Field icon={MapPin} label="Street Address" value={streetAddress} full />
                    {hasAddressLine2 ? <Field icon={MapPin} label="Address Line 2" value={addressLine2} full /> : null}
                    {hasLandmark ? <Field icon={Building2} label="Landmark" value={landmark} full /> : null}
                    {hasDeliveryInstructions ? <Field icon={MapPin} label="Delivery Instructions" value={deliveryInstructions} full /> : null}
                    <Field icon={Building2} label="City" value={user.city} />
                    <Field icon={Map} label="State" value={user.state} />
                    <Field icon={Hash} label="Postal Code" value={postalCode} copyable onCopied={showCopiedToast} />
                </div>
            </div>
        </>
    )
}
