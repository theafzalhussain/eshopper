import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser, updateUser } from '../Store/ActionCreaters/UserActionCreators'
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
} from 'lucide-react'
import Spinner from './Spinner'
import { BASE_URL } from '../constants'

export default function Updateprofile() {
    const [data, setdata] = useState({
        name: "", email: "", phone: "", addressline1: "",
        pin: "", city: "", state: "", pic: null
    })
    const [initialData, setInitialData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState(null)
    const [previewObjectUrl, setPreviewObjectUrl] = useState(null)
    const [showToast, setShowToast] = useState(false)
    
    const users = useSelector((state) => state.UserStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => {
        dispatch(getUser())
        const userId = localStorage.getItem("userid")
        if (users.length > 0) {
            const current = users.find((item) => (item.id || item._id) === userId)
            if (current) {
                const normalized = {
                    ...current,
                    password: "",
                    addressline1: current.addressline1 || current.streetAddress || "",
                    pin: current.pin || current.postalCode || "",
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
        setLoading(true);
        
        let formData = new FormData();
        formData.append("id", localStorage.getItem("userid"));
        formData.append("name", data.name);
        formData.append("email", data.email);
        formData.append("phone", data.phone);
        formData.append("addressline1", data.addressline1 || "");
        formData.append("city", data.city || "");
        formData.append("state", data.state || "");
        formData.append("pin", data.pin || "");
        
        if (data.pic && typeof data.pic !== "string") formData.append("pic", data.pic);

        dispatch(updateUser(formData));

        setTimeout(async () => {
            try {
                const userId = localStorage.getItem("userid")
                if (userId) {
                    const res = await fetch(`${BASE_URL}/user/${userId}`)
                    if (res.ok) {
                        const latestUser = await res.json()
                        if (latestUser?.name) localStorage.setItem("name", latestUser.name)
                        if (latestUser?.pic) localStorage.setItem("pic", latestUser.pic)
                    }
                }
            } catch (_) {
                if (data?.name) localStorage.setItem("name", data.name)
            } finally {
                window.dispatchEvent(new Event('profile-updated'))
                setShowToast(true)
                setLoading(false);
                setTimeout(() => {
                    setShowToast(false)
                    navigate("/profile")
                }, 900)
            }
        }, 2500);
    }

    const hasUnsavedChanges = initialData
        ? (
            initialData.name !== data.name ||
            initialData.email !== data.email ||
            initialData.phone !== data.phone ||
            initialData.addressline1 !== data.addressline1 ||
            initialData.city !== data.city ||
            initialData.state !== data.state ||
            initialData.pin !== data.pin ||
            (data.pic && typeof data.pic !== 'string')
        )
        : false

    return (
        <>
            {loading && <Spinner />}
            
            <div className="upd-root">
                <div className="upd-ambient upd-ambient-a" />
                <div className="upd-ambient upd-ambient-b" />

                <div className={`upd-toast${showToast ? ' visible' : ''}`}>
                    <CheckCircle2 size={15} />
                    Profile updated successfully
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
                                <p className="upd-subtitle">Simple, premium profile controls designed for fast checkout and accurate delivery.</p>
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
                                        <div className="upd-section-title">Basic Information</div>

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
                    background: #fff;
                    border: 1px solid rgba(201,168,76,0.23);
                    border-radius: 18px;
                    box-shadow: 0 12px 24px rgba(21,17,10,0.08);
                    padding: 16px;
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
                    border: 1px solid rgba(201,168,76,0.28);
                    background: #fcfaf6;
                    border-radius: 12px;
                    padding: 12px 12px;
                    color: #151515;
                    outline: none;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }

                .upd-field input:focus {
                    border-color: #1a8c8c;
                    box-shadow: 0 0 0 3px rgba(26,140,140,0.14);
                    background: #fff;
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