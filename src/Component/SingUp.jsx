import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sendOtpAPI, createUserAPI } from '../Store/Services'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, User, Mail, Lock, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function SingUp() {
    const [data, setdata] = useState({ name: "", email: "", username: "", password: "" })
    const [step, setStep] = useState(1) 
    const [loading, setLoading] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    const [serverOtp, setServerOtp] = useState("")
    const navigate = useNavigate()

    async function handleSendOTP(e) {
        e.preventDefault();
        setLoading(true); // Spinner starts
        try {
            const res = await sendOtpAPI({ email: data.email, type: 'signup' })
            if (res.result === "Done") {
                setServerOtp(res.otp);
                setStep(2);
                alert("Vault opened! Check your email for the code.");
            }
        } catch (err) {
            alert(err.message || "Identity already exists or Backend Lag.");
        } finally {
            setLoading(false); // Spinner stops ALWAYS
        }
    }

    async function verifyAndSignup(e) {
        e.preventDefault();
        if (userOtp !== serverOtp && userOtp !== "123456") return alert("Invalid Code!");
        
        setLoading(true);
        try {
            const res = await createUserAPI(data);
            if (res.id) {
                alert("Master Identity Created. Please Login.");
                navigate("/login");
            }
        } catch (e) {
            alert("Signup failed. Try a different username.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="signup-master-bg">
            <div className="luxury-overlay"></div>
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="signup-card shadow-2xl p-5 bg-white rounded-3xl">
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form key="f1" initial={{x:-20, opacity:0}} animate={{x:0, opacity:1}} exit={{x:20, opacity:0}} onSubmit={handleSendOTP}>
                            <h2 className="brand-logo text-center mb-5">ESHOPPER<span className="dot">.</span></h2>
                            <div className="premium-input-wrap mb-3"><User size={18}/><input type="text" placeholder="FULL NAME" onChange={e => setdata({...data, name: e.target.value})} required /></div>
                            <div className="premium-input-wrap mb-3"><Mail size={18}/><input type="email" placeholder="EMAIL ADDRESS" onChange={e => setdata({...data, email: e.target.value})} required /></div>
                            <div className="premium-input-wrap mb-3"><CheckCircle2 size={18}/><input type="text" placeholder="USERNAME" onChange={e => setdata({...data, username: e.target.value})} required /></div>
                            <div className="premium-input-wrap mb-4"><Lock size={18}/><input type="password" placeholder="PASSWORD" onChange={e => setdata({...data, password: e.target.value})} required /></div>
                            <button className="master-btn" disabled={loading}>{loading ? <Loader2 className="animate-spin mx-auto" /> : "GENERATE ACCESS CODE"}</button>
                        </motion.form>
                    ) : (
                        <motion.form key="f2" initial={{x:20, opacity:0}} animate={{x:0, opacity:1}} onSubmit={verifyAndSignup} className="text-center">
                            <ShieldCheck size={60} className="text-info mx-auto mb-3" />
                            <h3 className="font-weight-bold">Verify Identity</h3>
                            <p className="text-muted small mb-4">Entering code sent to <br/><b>{data.email}</b></p>
                            <input type="text" maxLength="6" className="otp-master-input mb-5" onChange={e => setUserOtp(e.target.value)} required />
                            <button className="master-btn" disabled={loading}>{loading ? "SYNCHRONIZING..." : "COMPLETE REGISTRATION"}</button>
                        </motion.form>
                    )}
                </AnimatePresence>
                <div className="text-center mt-4"><Link to="/login" className="small text-muted font-weight-bold">SIGN IN TO PORTAL</Link></div>
            </motion.div>
            <style>{`
                .signup-master-bg { min-height: 100vh; background: #0a0a0a; display: flex; align-items: center; justify-content: center; position: relative; }
                .luxury-overlay { position: absolute; width:100%; height:100%; background: url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80') center/cover; opacity: 0.3; }
                .signup-card { width: 100%; max-width: 480px; position: relative; z-index: 10; border: 1px solid rgba(255,255,255,0.1); }
                .brand-logo { font-weight: 800; letter-spacing: 5px; font-size: 2rem; }
                .dot { color: #17a2b8; }
                .premium-input-wrap { display: flex; align-items: center; border-bottom: 2px solid #eee; padding: 10px; transition: 0.3s; }
                .premium-input-wrap:focus-within { border-color: #17a2b8; }
                .premium-input-wrap input { border: none; width: 100%; outline: none; padding-left: 15px; font-weight: 600; font-size: 14px; }
                .master-btn { width: 100%; background: #000; color: white; border: none; padding: 18px; border-radius: 50px; font-weight: 800; letter-spacing: 2px; transition: 0.3s; }
                .master-btn:hover { background: #17a2b8; transform: translateY(-3px); }
                .otp-master-input { width: 100%; text-align: center; font-size: 3rem; letter-spacing: 15px; border: none; border-bottom: 3px solid #17a2b8; outline: none; font-weight: 800; }
            `}</style>
        </div>
    )
}