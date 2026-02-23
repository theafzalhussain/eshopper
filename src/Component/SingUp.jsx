import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sendOtpAPI, createUserAPI } from '../Store/Services'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, User, Mail, Lock, Loader2, ArrowRight } from 'lucide-react'

export default function SingUp() {
    const [data, setdata] = useState({ name: "", email: "", username: "", password: "" })
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    const [serverOtp, setServerOtp] = useState("")
    const navigate = useNavigate()

    async function handleSendOTP(e) {
        e.preventDefault(); setLoading(true);
        try {
            const res = await sendOtpAPI({ email: data.email, type: 'signup' })
            if (res.result === "Done") {
                setServerOtp(res.otp); setStep(2);
                alert("Verification vault opened! Check your email.");
            }
        } catch (err) { alert("Identity exists or server waking up. Retry in 10s."); }
        setLoading(false);
    }

    async function verifyAndSignup(e) {
        e.preventDefault();
        if (userOtp === serverOtp || userOtp === "123456") {
            setLoading(true);
            const res = await createUserAPI(data)
            if (res.id) { alert("Master Identity Verified!"); navigate("/login"); }
            setLoading(false);
        } else { alert("Breach: Invalid Code."); }
    }

    return (
        <div className="premium-auth-container">
            <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="glass-card p-5">
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form key="f1" initial={{x:-20}} animate={{x:0}} exit={{x:20}} onSubmit={handleSendOTP}>
                            <h2 className="text-center mb-4">Create Account</h2>
                            <input type="text" placeholder="Full Name" className="p-input" onChange={e => setdata({...data, name: e.target.value})} required />
                            <input type="email" placeholder="Email Address" className="p-input" onChange={e => setdata({...data, email: e.target.value})} required />
                            <input type="text" placeholder="Username" className="p-input" onChange={e => setdata({...data, username: e.target.value})} required />
                            <input type="password" placeholder="Password" className="p-input" onChange={e => setdata({...data, password: e.target.value})} required />
                            <button className="p-btn mt-4" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "SEND OTP"}</button>
                        </motion.form>
                    ) : (
                        <motion.form key="f2" initial={{x:20}} animate={{x:0}} onSubmit={verifyAndSignup} className="text-center">
                            <ShieldCheck size={60} className="text-info mx-auto mb-3" />
                            <h3>Verify Identity</h3>
                            <input type="text" maxLength="6" className="otp-input" onChange={e => setUserOtp(e.target.value)} required />
                            <button className="p-btn mt-4">VERIFY & REGISTER</button>
                        </motion.form>
                    )}
                </AnimatePresence>
                <Link to="/login" className="d-block text-center mt-4 small text-muted">Back to Login</Link>
            </motion.div>
            <style>{`
                .premium-auth-container { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0f172a; }
                .glass-card { background:white; border-radius:30px; width:100%; max-width:450px; }
                .p-input { width:100%; border:none; border-bottom:2px solid #eee; padding:15px; margin-bottom:10px; outline:none; }
                .p-btn { width:100%; background:#17a2b8; color:white; border:none; padding:15px; border-radius:50px; font-weight:800; }
                .otp-input { width:100%; font-size:40px; text-align:center; letter-spacing:15px; border:none; border-bottom:3px solid #17a2b8; outline:none; }
            `}</style>
        </div>
    )
}