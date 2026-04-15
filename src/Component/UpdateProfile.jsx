import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser } from '../Store/ActionCreaters/UserActionCreators'
import { motion } from 'framer-motion'
import {
    Save,
    Camera,
    Mail,
    Phone,
    MapPin,
    Loader2,
    ArrowLeft,
    User2,
    Building2,
    ShieldCheck,
    RefreshCcw,
    CheckCircle2,
    Bell,
    Lock,
    Eye,
    EyeOff,
    MessageSquare,
    Truck,
    Sparkles,
} from 'lucide-react'
import Spinner from './Spinner'
import { BASE_URL } from '../constants'

const defaultSettings = {
    notifications: {
        orderUpdates: true,
        deliveryUpdates: true,
        promotionalEmails: true,
        priceAlerts: false,
        wishlistAlerts: true,
        smsAlerts: false,
    },
    privacy: {
        profileVisibility: 'Private',
        personalizedRecommendations: true,
    },
    security: {
        twoFactorEnabled: false,
        loginAlerts: true,
    },
    communication: {
        newsletter: true,
        whatsappUpdates: false,
        pushNotifications: true,
    },
}

export default function Updateprofile() {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('personal')
    const [data, setdata] = useState({
        name: "", email: "", phone: "", addressline1: "",
        addressline2: "", landmark: "", pin: "", city: "", state: "", pic: null,
        deliveryNotes: "", password: "", confirmPassword: "", settings: defaultSettings
    })
    const [initialData, setInitialData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState(null)
    const [previewObjectUrl, setPreviewObjectUrl] = useState(null)
    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState('Profile updated successfully')
    const [showPassword, setShowPassword] = useState(false)
    
    const users = useSelector((state) => state.UserStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => {
        dispatch(getUser())
        const userId = localStorage.getItem("userid")
        if (users.length > 0) {
            const current = users.find((item) => (item.id || item._id) === userId)
            if (current) {
                const currentSettings = current.settings || {}
                const normalized = {
                    ...current,
                    password: "",
                    confirmPassword: "",
                    addressline1: current.addressline1 || current.streetAddress || "",
                    addressline2: current.addressline2 || "",
                    landmark: current.landmark || "",
                    deliveryNotes: current.deliveryNotes || current.deliveryInstructions || "",
                    pin: current.pin || current.postalCode || "",
                    settings: {
                        notifications: {
                            ...defaultSettings.notifications,
                            ...(currentSettings.notifications || {}),
                        },
                        privacy: {
                            ...defaultSettings.privacy,
                            ...(currentSettings.privacy || {}),
                        },
                        security: {
                            ...defaultSettings.security,
                            ...(currentSettings.security || {}),
                        },
                        communication: {
                            ...defaultSettings.communication,
                            ...(currentSettings.communication || {}),
                        },
                    }
                }
                setdata(normalized)
                setInitialData(normalized)
                if (current.pic) setPreview(current.pic)
            }
        }
    }, [users.length, dispatch])

    useEffect(() => {
        return () => {
            if (previewObjectUrl) {
                URL.revokeObjectURL(previewObjectUrl)
            }
        }
    }, [previewObjectUrl])

    function getData(e) {
        const { name, value } = e.target
        if (name === 'phone') {
            const cleanPhone = value.replace(/[^\d+\-\s]/g, '').slice(0, 15)
            setdata({ ...data, [name]: cleanPhone })
            return
        }
        if (name === 'pin') {
            const cleanPin = value.replace(/\D/g, '').slice(0, 6)
            setdata({ ...data, [name]: cleanPin })
            return
        }
        setdata({ ...data, [name]: value })
    }

    function updateSetting(section, key, value) {
        setdata((prev) => ({
            ...prev,
            settings: {
                ...prev.settings,
                [section]: {
                    ...prev.settings[section],
                    [key]: value,
                },
            }
        }))
    }

    function getFile(e) {
        const file = e.target.files[0]
        if (file) {
            if (previewObjectUrl) {
                URL.revokeObjectURL(previewObjectUrl)
            }
            const nextObjectUrl = URL.createObjectURL(file)
            setdata({ ...data, pic: file })
            setPreview(nextObjectUrl)
            setPreviewObjectUrl(nextObjectUrl)
        }
    }

    function resetForm() {
        if (!initialData) return
        setdata(initialData)
        setPreview(initialData.pic || null)
    }

    async function postData(e) {
        e.preventDefault();

        if (data.password || data.confirmPassword) {
            if (!data.password || !data.confirmPassword || data.password !== data.confirmPassword) {
                setToastMessage('Password confirmation does not match')
                setShowToast(true)
                setTimeout(() => setShowToast(false), 2200)
                return
            }
        }

        setLoading(true);
        
        let formData = new FormData();
        formData.append("id", localStorage.getItem("userid"));
        formData.append("name", data.name);
        formData.append("email", data.email);
        formData.append("phone", data.phone);
        formData.append("addressline1", data.addressline1 || "");
        formData.append("addressline2", data.addressline2 || "");
        formData.append("landmark", data.landmark || "");
        formData.append("deliveryNotes", data.deliveryNotes || "");
        formData.append("deliveryInstructions", data.deliveryNotes || "");
        formData.append("city", data.city || "");
        formData.append("state", data.state || "");
        formData.append("pin", data.pin || "");
        formData.append("settings", JSON.stringify(data.settings || defaultSettings));
        if (data.password) formData.append("password", data.password);
        
        if (data.pic && typeof data.pic !== "string") formData.append("pic", data.pic);

        try {
            const userId = localStorage.getItem("userid")
            if (!userId) throw new Error('User session missing. Please login again.')

            const updateRes = await fetch(`${BASE_URL}/user/${userId}`, {
                method: 'PUT',
                body: formData
            })

            if (!updateRes.ok) {
                const errText = await updateRes.text()
                throw new Error(errText || 'Failed to update profile')
            }

            const latestUserRaw = await updateRes.json()
            const latestUser = (latestUserRaw && typeof latestUserRaw === 'object' && latestUserRaw.user && typeof latestUserRaw.user === 'object')
                ? latestUserRaw.user
                : latestUserRaw

            const mergedUpdatedUser = {
                ...(latestUser && typeof latestUser === 'object' ? latestUser : {}),
                id: localStorage.getItem("userid"),
                _id: latestUser?._id || latestUser?.id || localStorage.getItem("userid"),
                name: data.name || '',
                email: data.email || '',
                phone: data.phone || '',
                addressline1: data.addressline1 || '',
                addressline2: data.addressline2 || '',
                landmark: data.landmark || '',
                deliveryNotes: data.deliveryNotes || '',
                deliveryInstructions: data.deliveryNotes || '',
                city: data.city || '',
                state: data.state || '',
                pin: data.pin || '',
                settings: data.settings || defaultSettings,
            }

            if (mergedUpdatedUser?.name) localStorage.setItem("name", mergedUpdatedUser.name)
            if (mergedUpdatedUser?.pic) localStorage.setItem("pic", mergedUpdatedUser.pic)
            localStorage.setItem('profile_cache', JSON.stringify(mergedUpdatedUser))

            // Keep Redux list in sync for other components.
            dispatch(getUser())

            window.dispatchEvent(new CustomEvent('profile-updated', { detail: mergedUpdatedUser }))
            setToastMessage(data.password ? 'Security settings updated successfully' : 'Profile updated successfully')
            setShowToast(true)
            setTimeout(() => {
                setShowToast(false)
                if (location.state && location.state.from === 'checkout') {
                    navigate(-1) // Go back to checkout
                } else {
                    navigate("/profile")
                }
            }, 900)
        } catch (error) {
            console.error('Profile update failed:', error)
            setToastMessage('Profile update failed. Please try again.')
            setShowToast(true)
            setTimeout(() => setShowToast(false), 2200)
        } finally {
            setLoading(false)
        }
    }

    const hasUnsavedChanges = initialData
        ? (
            initialData.name !== data.name ||
            initialData.email !== data.email ||
            initialData.phone !== data.phone ||
            initialData.addressline1 !== data.addressline1 ||
            initialData.addressline2 !== data.addressline2 ||
            initialData.landmark !== data.landmark ||
            initialData.deliveryNotes !== data.deliveryNotes ||
            initialData.city !== data.city ||
            initialData.state !== data.state ||
            initialData.pin !== data.pin ||
            initialData.password !== data.password ||
            JSON.stringify(initialData.settings || defaultSettings) !== JSON.stringify(data.settings || defaultSettings) ||
            (data.pic && typeof data.pic !== 'string')
        )
        : false

    const toggleCards = [
        {
            section: 'notifications',
            key: 'orderUpdates',
            title: 'Order updates',
            description: 'Get notified when order status changes or is shipped.',
            icon: Bell,
        },
        {
            section: 'notifications',
            key: 'deliveryUpdates',
            title: 'Delivery alerts',
            description: 'Live ETA and delivery completion notifications.',
            icon: Truck,
        },
        {
            section: 'notifications',
            key: 'promotionalEmails',
            title: 'Promotional emails',
            description: 'Receive offers, product launches and seasonal deals.',
            icon: Sparkles,
        },
        {
            section: 'notifications',
            key: 'priceAlerts',
            title: 'Price-drop alerts',
            description: 'Know when wishlist items go on sale.',
            icon: MessageSquare,
        },
        {
            section: 'notifications',
            key: 'wishlistAlerts',
            title: 'Wishlist alerts',
            description: 'Get stock reminders for saved products.',
            icon: Bell,
        },
        {
            section: 'communication',
            key: 'pushNotifications',
            title: 'Push notifications',
            description: 'Browser and mobile push updates for key events.',
            icon: Bell,
        },
    ]

    const renderToggleCard = ({ section, key, title, description, icon: Icon }) => {
        const checked = Boolean(data.settings?.[section]?.[key])
        return (
            <button
                key={`${section}-${key}`}
                type="button"
                className={`upd-toggle-card${checked ? ' active' : ''}`}
                onClick={() => updateSetting(section, key, !checked)}
            >
                <div className="upd-toggle-copy">
                    <span className="upd-toggle-icon"><Icon size={14} /></span>
                    <div>
                        <div className="upd-toggle-title">{title}</div>
                        <div className="upd-toggle-desc">{description}</div>
                    </div>
                </div>
                <span className="upd-toggle-state">{checked ? 'On' : 'Off'}</span>
            </button>
        )
    }

    const tabs = [
        {
            id: 'personal',
            label: 'Personal',
            icon: User2,
            summary: 'Name, contact, avatar and delivery address',
        },
        {
            id: 'security',
            label: 'Security',
            icon: Lock,
            summary: 'Password, 2FA and visibility controls',
        },
        {
            id: 'notifications',
            label: 'Notifications',
            icon: Bell,
            summary: 'Order, shipping and promotional alerts',
        },
        {
            id: 'privacy',
            label: 'Privacy',
            icon: ShieldCheck,
            summary: 'Recommendations and communication preferences',
        },
    ]

    return (
        <>
            {loading && <Spinner />}
            
            <div className="upd-root">
                <div className="upd-ambient upd-ambient-a" />
                <div className="upd-ambient upd-ambient-b" />

                <div className={`upd-toast${showToast ? ' visible' : ''}`}>
                    <CheckCircle2 size={15} />
                    {toastMessage}
                </div>

                <div className="container py-5">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="upd-shell">
                            <div className="upd-topbar">
                                <Link to="/profile" className="upd-back-link">
                                    <ArrowLeft size={16} />
                                    Back to Profile
                                </Link>

                                <div className="upd-security">
                                    <ShieldCheck size={14} />
                                    Secure profile update session
                                </div>
                            </div>

                            <div className="upd-heading-row">
                                <div className="upd-eyebrow">Account Personalization</div>
                                <h1 className="upd-title">Update Profile Settings</h1>
                                <p className="upd-subtitle">Simple, premium profile controls designed for fast checkout, secure access and accurate delivery.</p>
                            </div>

                            <div className="upd-summary-grid">
                                <div className="upd-summary-card">
                                    <div className="upd-summary-label">Security</div>
                                    <div className="upd-summary-value">{data.settings?.security?.twoFactorEnabled ? '2FA enabled' : 'Password only'}</div>
                                </div>
                                <div className="upd-summary-card">
                                    <div className="upd-summary-label">Privacy</div>
                                    <div className="upd-summary-value">{data.settings?.privacy?.profileVisibility || 'Private'}</div>
                                </div>
                                <div className="upd-summary-card">
                                    <div className="upd-summary-label">Alerts</div>
                                    <div className="upd-summary-value">{data.settings?.notifications?.orderUpdates ? 'Order alerts on' : 'Muted'}</div>
                                </div>
                            </div>

                            <div className="upd-tab-bar">
                                {tabs.map((tab) => {
                                    const TabIcon = tab.icon
                                    const active = activeTab === tab.id
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            className={`upd-tab-btn${active ? ' active' : ''}`}
                                            onClick={() => setActiveTab(tab.id)}
                                        >
                                            <TabIcon size={14} />
                                            <span>
                                                <strong>{tab.label}</strong>
                                                <small>{tab.summary}</small>
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>

                            <form onSubmit={postData}>
                                <div className="upd-grid">
                                    <section className="upd-card upd-avatar-card">
                                        <div className="upd-card-title">Profile Media</div>

                                        <label htmlFor="pic" className="upd-avatar-wrap">
                                            <img
                                                src={preview || '/assets/images/noimage.png'}
                                                className="upd-avatar"
                                                alt="User"
                                            />
                                            <span className="upd-avatar-edit">
                                                <Camera size={16} />
                                            </span>
                                        </label>
                                        <input type="file" id="pic" className="d-none" onChange={getFile} />

                                        <div className="upd-avatar-chip">Tap camera icon to update photo</div>
                                    </section>

                                    <section className="upd-card upd-form-card">
                                        {activeTab === 'personal' && (
                                            <>
                                                <div className="upd-section-title">Personal Information</div>

                                                <div className="upd-field-grid two">
                                                    <label className="upd-field">
                                                        <span className="upd-label"><User2 size={14} /> Full Name</span>
                                                        <input type="text" name="name" value={data.name} onChange={getData} required />
                                                    </label>

                                                    <label className="upd-field">
                                                        <span className="upd-label"><Phone size={14} /> Phone Number</span>
                                                        <input type="text" name="phone" value={data.phone} onChange={getData} placeholder="e.g. +91 98xxxxxx" />
                                                    </label>
                                                </div>

                                                <label className="upd-field">
                                                    <span className="upd-label"><Mail size={14} /> Email Address</span>
                                                    <input type="email" name="email" value={data.email} onChange={getData} placeholder="you@brand.com" />
                                                </label>

                                                <div className="upd-divider-title">Delivery Address</div>

                                                <label className="upd-field">
                                                    <span className="upd-label"><MapPin size={14} /> Street Address</span>
                                                    <input type="text" name="addressline1" value={data.addressline1} onChange={getData} placeholder="House no, street, landmark" />
                                                </label>

                                                <div className="upd-field-grid two">
                                                    <label className="upd-field">
                                                        <span className="upd-label"><MapPin size={14} /> Address Line 2</span>
                                                        <input type="text" name="addressline2" value={data.addressline2} onChange={getData} placeholder="Apartment, floor, block" />
                                                    </label>

                                                    <label className="upd-field">
                                                        <span className="upd-label"><MapPin size={14} /> Landmark</span>
                                                        <input type="text" name="landmark" value={data.landmark} onChange={getData} placeholder="Nearby shop, tower, mall" />
                                                    </label>
                                                </div>

                                                <div className="upd-field-grid three">
                                                    <label className="upd-field">
                                                        <span className="upd-label"><Building2 size={14} /> City</span>
                                                        <input type="text" name="city" value={data.city} onChange={getData} />
                                                    </label>

                                                    <label className="upd-field">
                                                        <span className="upd-label"><MapPin size={14} /> State</span>
                                                        <input type="text" name="state" value={data.state} onChange={getData} />
                                                    </label>

                                                    <label className="upd-field">
                                                        <span className="upd-label"><MapPin size={14} /> PIN Code</span>
                                                        <input type="text" name="pin" value={data.pin} onChange={getData} placeholder="6-digit PIN" />
                                                    </label>
                                                </div>

                                                <label className="upd-field">
                                                    <span className="upd-label"><Truck size={14} /> Delivery instructions</span>
                                                    <input
                                                        type="text"
                                                        name="deliveryNotes"
                                                        value={data.deliveryNotes || ''}
                                                        onChange={getData}
                                                        placeholder="Gate code, preferred delivery slot or contactless notes"
                                                    />
                                                </label>
                                            </>
                                        )}

                                        {activeTab === 'security' && (
                                            <>
                                                <div className="upd-section-title">Security Center</div>

                                                <div className="upd-field-grid two">
                                                    <label className="upd-field">
                                                        <span className="upd-label"><Lock size={14} /> New Password</span>
                                                        <div className="upd-password-wrap">
                                                            <input
                                                                type={showPassword ? 'text' : 'password'}
                                                                name="password"
                                                                value={data.password}
                                                                onChange={getData}
                                                                placeholder="Enter a new password"
                                                            />
                                                            <button type="button" className="upd-password-visibility" onClick={() => setShowPassword((prev) => !prev)}>
                                                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                            </button>
                                                        </div>
                                                    </label>

                                                    <label className="upd-field">
                                                        <span className="upd-label"><Lock size={14} /> Confirm Password</span>
                                                        <input
                                                            type={showPassword ? 'text' : 'password'}
                                                            name="confirmPassword"
                                                            value={data.confirmPassword}
                                                            onChange={getData}
                                                            placeholder="Re-enter new password"
                                                        />
                                                    </label>
                                                </div>

                                                <div className="upd-field-grid two">
                                                    <label className="upd-field">
                                                        <span className="upd-label"><ShieldCheck size={14} /> Profile Visibility</span>
                                                        <select value={data.settings?.privacy?.profileVisibility || 'Private'} onChange={(e) => updateSetting('privacy', 'profileVisibility', e.target.value)}>
                                                            <option value="Private">Private</option>
                                                            <option value="Orders only">Orders only</option>
                                                            <option value="Public">Public</option>
                                                        </select>
                                                    </label>

                                                    <label className="upd-field">
                                                        <span className="upd-label"><ShieldCheck size={14} /> Two-factor authentication</span>
                                                        <select value={data.settings?.security?.twoFactorEnabled ? 'on' : 'off'} onChange={(e) => updateSetting('security', 'twoFactorEnabled', e.target.value === 'on')}>
                                                            <option value="off">Disabled</option>
                                                            <option value="on">Enabled</option>
                                                        </select>
                                                    </label>
                                                </div>
                                            </>
                                        )}

                                        {activeTab === 'notifications' && (
                                            <>
                                                <div className="upd-section-title">Notification Preferences</div>

                                                <div className="upd-toggle-grid">
                                                    {toggleCards.map(renderToggleCard)}
                                                </div>

                                                <div className="upd-field-grid two">
                                                    <label className="upd-field">
                                                        <span className="upd-label"><MessageSquare size={14} /> Newsletter</span>
                                                        <select value={data.settings?.communication?.newsletter ? 'on' : 'off'} onChange={(e) => updateSetting('communication', 'newsletter', e.target.value === 'on')}>
                                                            <option value="on">Subscribed</option>
                                                            <option value="off">Unsubscribed</option>
                                                        </select>
                                                    </label>

                                                    <label className="upd-field">
                                                        <span className="upd-label"><MessageSquare size={14} /> WhatsApp updates</span>
                                                        <select value={data.settings?.communication?.whatsappUpdates ? 'on' : 'off'} onChange={(e) => updateSetting('communication', 'whatsappUpdates', e.target.value === 'on')}>
                                                            <option value="off">Disabled</option>
                                                            <option value="on">Enabled</option>
                                                        </select>
                                                    </label>
                                                </div>
                                            </>
                                        )}

                                        {activeTab === 'privacy' && (
                                            <>
                                                <div className="upd-section-title">Privacy & Communication</div>

                                                <div className="upd-field-grid two">
                                                    <label className="upd-field">
                                                        <span className="upd-label"><ShieldCheck size={14} /> Personalized recommendations</span>
                                                        <select value={data.settings?.privacy?.personalizedRecommendations ? 'on' : 'off'} onChange={(e) => updateSetting('privacy', 'personalizedRecommendations', e.target.value === 'on')}>
                                                            <option value="on">Enabled</option>
                                                            <option value="off">Disabled</option>
                                                        </select>
                                                    </label>

                                                    <label className="upd-field">
                                                        <span className="upd-label"><MessageSquare size={14} /> SMS alerts</span>
                                                        <select value={data.settings?.notifications?.smsAlerts ? 'on' : 'off'} onChange={(e) => updateSetting('notifications', 'smsAlerts', e.target.value === 'on')}>
                                                            <option value="off">Disabled</option>
                                                            <option value="on">Enabled</option>
                                                        </select>
                                                    </label>
                                                </div>

                                                <div className="upd-field-grid two">
                                                    <label className="upd-field">
                                                        <span className="upd-label"><MessageSquare size={14} /> Push notifications</span>
                                                        <select value={data.settings?.communication?.pushNotifications ? 'on' : 'off'} onChange={(e) => updateSetting('communication', 'pushNotifications', e.target.value === 'on')}>
                                                            <option value="on">Enabled</option>
                                                            <option value="off">Disabled</option>
                                                        </select>
                                                    </label>

                                                    <label className="upd-field">
                                                        <span className="upd-label"><MessageSquare size={14} /> Order alerts</span>
                                                        <select value={data.settings?.notifications?.orderUpdates ? 'on' : 'off'} onChange={(e) => updateSetting('notifications', 'orderUpdates', e.target.value === 'on')}>
                                                            <option value="on">Enabled</option>
                                                            <option value="off">Disabled</option>
                                                        </select>
                                                    </label>
                                                </div>
                                            </>
                                        )}

                                        <div className="upd-action-row">
                                            <button type="button" className="upd-reset-btn" onClick={resetForm} disabled={loading || !hasUnsavedChanges}>
                                                <RefreshCcw size={14} />
                                                Reset Changes
                                            </button>

                                            <button type="submit" className="upd-save-btn" disabled={loading}>
                                                {loading ? (
                                                    <>
                                                        <Loader2 size={15} className="upd-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={15} />
                                                        Save Profile
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </section>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Jost:wght@300;400;500;600;700&display=swap');

                .upd-root {
                    position: relative;
                    min-height: 100vh;
                    background: linear-gradient(180deg, #f8f5ee 0%, #f3efe7 100%);
                    overflow: hidden;
                    font-family: 'Jost', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }

                .upd-ambient {
                    position: absolute;
                    border-radius: 999px;
                    filter: blur(30px);
                    pointer-events: none;
                    opacity: 0.42;
                }

                .upd-ambient-a {
                    width: 260px;
                    height: 260px;
                    background: radial-gradient(circle, rgba(201,168,76,0.35), transparent 72%);
                    top: -90px;
                    left: -70px;
                }

                .upd-ambient-b {
                    width: 320px;
                    height: 320px;
                    background: radial-gradient(circle, rgba(26,140,140,0.20), transparent 72%);
                    bottom: -110px;
                    right: -90px;
                }

                .upd-shell {
                    position: relative;
                    z-index: 2;
                    background: rgba(255,255,255,0.78);
                    border: 1px solid rgba(201,168,76,0.24);
                    border-radius: 26px;
                    box-shadow: 0 18px 42px rgba(21,17,10,0.12);
                    backdrop-filter: blur(4px);
                    padding: 24px;
                    max-width: 1080px;
                    margin: 0 auto;
                }

                .upd-topbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }

                .upd-back-link {
                    text-decoration: none;
                    color: #1f1f1f;
                    border: 1px solid rgba(201,168,76,0.28);
                    background: #fff;
                    border-radius: 999px;
                    padding: 8px 14px;
                    font-size: 12px;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 600;
                }

                .upd-back-link:hover {
                    color: #0f6b6b;
                    border-color: #1a8c8c;
                }

                .upd-security {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    color: #0f6b6b;
                    background: rgba(26,140,140,0.09);
                    border: 1px solid rgba(26,140,140,0.22);
                    border-radius: 999px;
                    padding: 8px 13px;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                }

                .upd-heading-row {
                    display: block;
                    margin-bottom: 18px;
                    padding-bottom: 14px;
                    border-bottom: 1px solid rgba(201,168,76,0.22);
                    text-align: center;
                }

                .upd-eyebrow {
                    display: inline-block;
                    color: #9a7a20;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.14em;
                    font-weight: 600;
                    margin-bottom: 8px;
                }

                .upd-title {
                    margin: 0;
                    font-family: 'Playfair Display', serif;
                    font-size: clamp(28px, 4vw, 40px);
                    color: #121212;
                    font-weight: 600;
                    text-align: center;
                }

                .upd-subtitle {
                    margin: 8px 0 0;
                    color: #6f675a;
                    font-size: 14px;
                    line-height: 1.55;
                    max-width: 700px;
                    text-align: center;
                    margin-left: auto;
                    margin-right: auto;
                }

                .upd-grid {
                    display: grid;
                    grid-template-columns: 290px 1fr;
                    gap: 16px;
                    align-items: start;
                }

                .upd-card {
                    position: relative;
                    overflow: hidden;
                    background: #fff;
                    border: 1px solid #e8ddc4;
                    border-radius: 18px;
                    box-shadow: 0 20px 36px rgba(17, 17, 17, 0.16);
                    padding: 16px;
                }

                .upd-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 18px;
                    pointer-events: none;
                    border: 2px solid transparent;
                    background: linear-gradient(135deg, rgba(201,168,76,0.54), rgba(255,255,255,0)) border-box;
                    -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                }

                .upd-card-title {
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.16em;
                    color: #9a7a20;
                    font-weight: 700;
                    margin-bottom: 12px;
                    text-align: center;
                }

                .upd-divider-title {
                    margin: 16px 0 10px;
                    padding-top: 14px;
                    border-top: 1px solid rgba(201,168,76,0.18);
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.16em;
                    color: #8b7c66;
                    font-weight: 700;
                    text-align: center;
                }

                .upd-avatar-card {
                    position: sticky;
                    top: 14px;
                    text-align: center;
                }

                .upd-avatar-wrap {
                    display: inline-flex;
                    position: relative;
                    cursor: pointer;
                    margin-bottom: 12px;
                    padding: 6px;
                    border-radius: 50%;
                    background: radial-gradient(circle at 30% 20%, rgba(232,201,122,0.42), rgba(26,140,140,0.14) 58%, transparent 75%);
                }

                .upd-avatar {
                    width: 164px;
                    height: 164px;
                    object-fit: cover;
                    border-radius: 50%;
                    border: 5px solid #fff;
                    box-shadow: 0 16px 30px rgba(26,140,140,0.22);
                }

                .upd-avatar-edit {
                    position: absolute;
                    right: 2px;
                    bottom: 4px;
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    background: linear-gradient(135deg, #1a8c8c, #0f6b6b);
                    border: 2px solid #fff;
                }

                .upd-avatar-chip {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: #0f6b6b;
                    font-size: 12px;
                    font-weight: 600;
                    padding: 8px 12px;
                    border-radius: 999px;
                    border: 1px solid rgba(26,140,140,0.22);
                    background: rgba(26,140,140,0.08);
                }

                .upd-form-card {
                    padding: 18px;
                }

                .upd-section-title {
                    margin: 2px 0 10px;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.16em;
                    color: #8b7c66;
                    font-weight: 700;
                    text-align: center;
                }

                .upd-field-grid {
                    display: grid;
                    gap: 12px;
                }

                .upd-field-grid.two {
                    grid-template-columns: 1fr 1fr;
                }

                .upd-field-grid.three {
                    grid-template-columns: 1fr 1fr 1fr;
                }

                .upd-field {
                    display: grid;
                    gap: 6px;
                    margin-bottom: 12px;
                }

                .upd-label {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    color: #756a56;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    font-weight: 600;
                }

                .upd-field input {
                    width: 100%;
                    border: 1px solid #e8ddc4;
                    background: #fff;
                    border-radius: 12px;
                    padding: 12px 12px;
                    color: #151515;
                    outline: none;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                    box-shadow: 0 10px 18px rgba(21,17,10,0.07);
                }

                .upd-field input:focus {
                    border-color: #1a8c8c;
                    box-shadow: 0 0 0 3px rgba(26,140,140,0.14);
                    background: #fff;
                }

                .upd-field select,
                .upd-field textarea {
                    width: 100%;
                    border: 1px solid #e8ddc4;
                    background: #fff;
                    border-radius: 12px;
                    padding: 12px 12px;
                    color: #151515;
                    outline: none;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                    box-shadow: 0 10px 18px rgba(21,17,10,0.07);
                }

                .upd-field select:focus,
                .upd-field textarea:focus {
                    border-color: #1a8c8c;
                    box-shadow: 0 0 0 3px rgba(26,140,140,0.14);
                    background: #fff;
                }

                .upd-password-wrap {
                    position: relative;
                }

                .upd-password-wrap input {
                    padding-right: 44px;
                }

                .upd-password-visibility {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    border: none;
                    background: transparent;
                    color: #6b7280;
                    padding: 4px;
                    border-radius: 8px;
                }

                .upd-summary-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 12px;
                    margin-bottom: 18px;
                }

                .upd-tab-bar {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 10px;
                    margin-bottom: 16px;
                }

                .upd-tab-btn {
                    border: 1px solid rgba(201,168,76,0.2);
                    background: #fff;
                    border-radius: 16px;
                    padding: 12px 14px;
                    text-align: left;
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    color: #4b5563;
                    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
                }

                .upd-tab-btn strong {
                    display: block;
                    font-size: 13px;
                    color: #151515;
                    margin-bottom: 2px;
                }

                .upd-tab-btn small {
                    display: block;
                    font-size: 11px;
                    line-height: 1.35;
                    color: #6b7280;
                }

                .upd-tab-btn.active {
                    border-color: rgba(26,140,140,0.32);
                    box-shadow: 0 12px 22px rgba(26,140,140,0.08);
                    transform: translateY(-1px);
                }

                .upd-summary-card {
                    border-radius: 16px;
                    padding: 14px 16px;
                    background: linear-gradient(135deg, rgba(26,140,140,0.08), rgba(201,168,76,0.08));
                    border: 1px solid rgba(201,168,76,0.18);
                }

                .upd-summary-label {
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.16em;
                    color: #8b7c66;
                    margin-bottom: 6px;
                    font-weight: 700;
                }

                .upd-summary-value {
                    color: #0f6b6b;
                    font-weight: 700;
                    font-size: 14px;
                }

                .upd-toggle-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 12px;
                    margin-bottom: 14px;
                }

                .upd-toggle-card {
                    border: 1px solid rgba(201,168,76,0.2);
                    background: #fff;
                    border-radius: 16px;
                    padding: 14px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    text-align: left;
                    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
                }

                .upd-toggle-card.active {
                    border-color: rgba(26,140,140,0.35);
                    box-shadow: 0 10px 20px rgba(26,140,140,0.08);
                }

                .upd-toggle-card:hover {
                    transform: translateY(-1px);
                }

                .upd-toggle-copy {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                }

                .upd-toggle-icon {
                    width: 28px;
                    height: 28px;
                    border-radius: 10px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(26,140,140,0.08);
                    color: #0f6b6b;
                    flex: 0 0 auto;
                }

                .upd-toggle-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #151515;
                    margin-bottom: 2px;
                }

                .upd-toggle-desc {
                    font-size: 12px;
                    line-height: 1.45;
                    color: #6b7280;
                }

                .upd-toggle-state {
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.14em;
                    font-weight: 700;
                    color: #0f6b6b;
                    flex: 0 0 auto;
                }

                .upd-action-row {
                    margin-top: 4px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                }

                .upd-reset-btn,
                .upd-save-btn {
                    border: none;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    font-weight: 700;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
                    height: 44px;
                    padding: 0 18px;
                }

                .upd-reset-btn {
                    background: #fff;
                    border: 1px solid rgba(201,168,76,0.35);
                    color: #5f5441;
                }

                .upd-save-btn {
                    color: #fff;
                    background: linear-gradient(135deg, #1a8c8c, #0f6b6b);
                    box-shadow: 0 10px 20px rgba(26,140,140,0.28);
                    min-width: 220px;
                }

                .upd-reset-btn:hover,
                .upd-save-btn:hover {
                    transform: translateY(-1px);
                }

                .upd-spin {
                    animation: upd-spin 1s linear infinite;
                }

                @keyframes upd-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .upd-reset-btn:disabled,
                .upd-save-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .upd-toast {
                    position: fixed;
                    top: 18px;
                    left: 50%;
                    transform: translateX(-50%) translateY(-8px);
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 14px;
                    border-radius: 999px;
                    background: rgba(17, 17, 17, 0.92);
                    color: #fff;
                    border: 1px solid rgba(201,168,76,0.28);
                    box-shadow: 0 16px 32px rgba(13,13,13,0.22);
                    z-index: 9999;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s ease, transform 0.2s ease;
                }

                .upd-toast.visible {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }

                @media (max-width: 992px) {
                    .upd-grid {
                        grid-template-columns: 1fr;
                    }

                    .upd-summary-grid,
                    .upd-tab-bar,
                    .upd-toggle-grid {
                        grid-template-columns: 1fr;
                    }

                    .upd-avatar-card {
                        position: static;
                    }

                    .upd-avatar {
                        width: 150px;
                        height: 150px;
                    }
                }

                @media (max-width: 768px) {
                    .upd-shell {
                        padding: 16px;
                        border-radius: 20px;
                    }

                    .upd-toast {
                        width: calc(100% - 24px);
                        justify-content: center;
                    }

                    .upd-topbar {
                        justify-content: center;
                    }

                    .upd-back-link,
                    .upd-security {
                        width: 100%;
                        justify-content: center;
                    }

                    .upd-field-grid.two,
                    .upd-field-grid.three {
                        grid-template-columns: 1fr;
                    }

                    .upd-save-btn {
                        width: 100%;
                    }

                    .upd-action-row {
                        flex-direction: column;
                    }

                    .upd-reset-btn {
                        width: 100%;
                    }
                }

                @media (max-width: 480px) {
                    .upd-title {
                        font-size: 34px;
                    }

                    .upd-avatar {
                        width: 136px;
                        height: 136px;
                    }
                }
            ` }} />
        </>
    )
}