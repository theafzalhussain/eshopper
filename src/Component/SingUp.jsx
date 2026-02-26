import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { sendOtpAPI, createUserAPI } from '../Store/Services'
import { ShieldCheck, User, Mail, Lock, Loader2, ArrowRight, UserPlus, Eye, EyeOff } from 'lucide-react'

export default function SingUp() {
    const [data, setdata] = useState({ name: "", email: "", username: "", password: "" })
    const [step, setStep] = useState(1) 
    const [loading, setLoading] = useState(false)
    const [showPass, setShowPass] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    
    const navigate = useNavigate()

    useEffect(() => { window.scrollTo(0, 0); }, [])

    // --- STEP 1: SEND OTP ---
    async function handleSendOTP(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await sendOtpAPI({ email: data.email, type: 'signup' })
            if (res.result === "Done") {
                setStep(2);
                alert("Verification vault opened! Check your email.");
            }
        } catch (err) {
            alert("This email is already registered or server error. Please retry.");
        }
        setLoading(false);
    }

    // --- STEP 2: VERIFY & CREATE ---
    async function verifyAndSignup(e) {
        e.preventDefault();
        if (!userOtp || userOtp.length !== 6) {
            alert("Please enter a valid 6-digit code.");
            return;
        }
        setLoading(true);
        try {
            // OTP verification is handled on the backend
            const res = await createUserAPI({ ...data, otp: userOtp })
            if (res.id) {
                alert("Master Identity Verified. Welcome to Eshopper.");
                navigate("/login")
            } else {
                alert("Incorrect verification code!");
            }
        } catch (err) {
            alert("Incorrect verification code or server error. Please try again.");
        }
        setLoading(false);
    }

    return (
        <div className="signup-master-root">
            <div className="luxury-bg-overlay"></div>
            <div className="container d-flex align-items-center justify-content-center min-vh-100">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="glass-signup-card shadow-2xl">
                    <div className="signup-inner-box p-4 p-md-5 text-center">
                        <div className="icon-badge-premium mb-4"><UserPlus size={30} className="text-info" /></div>
                        <h2 className="brand-title">ESHOPPER<span className="accent">.</span></h2>
                        <p className="step-indicator">{step === 1 ? "CREATE MASTER IDENTITY" : "IDENTITY VERIFICATION"}</p>

                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.form key="f1" initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 30, opacity: 0 }} onSubmit={handleSendOTP} className="text-left mt-4">
                                    <div className="p-field mb-3"><label>FULL NAME</label><div className="p-input-box"><User size={18}/><input type="text" placeholder="John Doe" onChange={e => setdata({...data, name: e.target.value})} required /></div></div>
                                    <div className="p-field mb-3"><label>EMAIL</label><div className="p-input-box"><Mail size={18}/><input type="email" placeholder="identity@luxury.com" onChange={e => setdata({...data, email: e.target.value})} required /></div></div>
                                    <div className="p-field mb-3"><label>USERNAME</label><div className="p-input-box"><ShieldCheck size={18}/><input type="text" placeholder="master_id" onChange={e => setdata({...data, username: e.target.value})} required /></div></div>
                                    <div className="p-field mb-5"><label>PASSWORD</label><div className="p-input-box"><Lock size={18}/><input type={showPass ? "text" : "password"} placeholder="••••••••" onChange={e => setdata({...data, password: e.target.value})} required /><button type="button" className="eye-btn" onClick={()=>setShowPass(!showPass)}>{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></div>
                                    <button type="submit" className="p-submit-btn shadow-lg" disabled={loading}>{loading ? <Loader2 className="animate-spin mx-auto"/> : <>GENERATE ACCESS CODE <ArrowRight className="ml-2" size={18}/></>}</button>
                                </motion.form>
                            ) : (
                                <motion.form key="f2" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} onSubmit={verifyAndSignup} className="text-center mt-4">
                                    <ShieldCheck size={60} className="text-info mx-auto mb-3 pulse-anim" />
                                    <h3 className="verify-title">Verify Email</h3>
                                    <p className="verify-text mb-5">Code sent to <b>{data.email}</b></p>
                                    <input type="text" maxLength="6" placeholder="000000" className="p-otp-input mb-5" onChange={e => setUserOtp(e.target.value)} required />
                                    <button className="p-submit-btn" disabled={loading}>{loading ? <Loader2 className="animate-spin mx-auto"/> : "COMPLETE REGISTRATION"}</button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                        <div className="mt-5"><Link to="/login" className="login-call-link">ALREADY A MEMBER? LOGIN</Link></div>
                    </div>
                </motion.div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .signup-master-root { position: relative; min-height: 100vh; background: url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80') center/cover; overflow: hidden; }
                .luxury-bg-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(15,23,42,0.9); backdrop-filter: blur(10px); }
                .glass-signup-card { position: relative; width: 100%; max-width: 500px; background: rgba(255, 255, 255, 0.95); border-radius: 40px; }
                .icon-badge-premium { width: 60px; height: 60px; background: rgba(23, 162, 184, 0.1); border-radius: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
                .brand-title { font-weight: 800; letter-spacing: 6px; font-size: 2rem; color: #111; }
                .accent { color: #17a2b8; }
                .step-indicator { font-size: 10px; font-weight: 800; letter-spacing: 2px; color: #888; }
                .p-field label { font-size: 10px; font-weight: 800; color: #333; margin-bottom: 8px; display: block; letter-spacing: 1.5px; }
                .p-input-box { display: flex; align-items: center; background: #f8fafc; border-radius: 15px; padding: 10px 18px; border: 2px solid transparent; transition: 0.3s; }
                .p-input-box:focus-within { border-color: #17a2b8; background: white; }
                .p-input-box input { border: none; background: transparent; width: 100%; outline: none; font-size: 15px; font-weight: 600; padding: 8px; }
                .p-submit-btn { width: 100%; background: #111; color: white; border: none; padding: 20px; border-radius: 20px; font-weight: 800; font-size: 13px; letter-spacing: 2px; cursor: pointer; transition: 0.4s; }
                .p-otp-input { width: 100%; text-align: center; font-size: 3rem; font-weight: 800; letter-spacing: 15px; border: none; background: transparent; outline: none; border-bottom: 3px solid #17a2b8; }
                .login-call-link { color: #111; font-weight: 800; text-decoration: none; border-bottom: 2px solid #17a2b8; }
                .eye-btn { border: none; background: transparent; color: #cbd5e1; }
            `}} />
        </div>
    )
}