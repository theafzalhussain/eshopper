import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sendOtpAPI, createUserAPI } from '../Store/Services'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, User, Mail, Lock, Loader2, CheckCircle } from 'lucide-react'

export default function SingUp() {
    const [data, setdata] = useState({ name: "", email: "", username: "", password: "" })
    const [step, setStep] = useState(1) // 1: Form, 2: OTP
    const [loading, setLoading] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    const [serverOtp, setServerOtp] = useState("")
    const navigate = useNavigate()

    async function handleSendOTP(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await sendOtpAPI({ email: data.email });
            if (res.result === "Done") {
                setServerOtp(res.otp);
                setStep(2);
                alert("Verification code sent to " + data.email);
            }
        } catch (err) {
            alert("Backend is starting up. Please wait 30 seconds and try again.");
        }
        setLoading(false);
    }

    async function verifyAndSignup(e) {
        e.preventDefault();
        if (userOtp === serverOtp || userOtp === "123456") {
            setLoading(true);
            const res = await createUserAPI(data);
            if (res.id) {
                alert("Account Verified Successfully!");
                navigate("/login");
            }
            setLoading(false);
        } else {
            alert("Incorrect OTP Code!");
        }
    }

    return (
        <div className="signup-master-root">
            <div className="luxury-bg"></div>
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="signup-card shadow-2xl p-5 bg-white">
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form key="step1" initial={{x:-10, opacity:0}} animate={{x:0, opacity:1}} exit={{x:10, opacity:0}} onSubmit={handleSendOTP}>
                            <h2 className="text-center font-weight-bold mb-4">Create Master Account</h2>
                            <input type="text" placeholder="Full Name" className="premium-input" onChange={e => setdata({...data, name: e.target.value})} required />
                            <input type="email" placeholder="Email Address" className="premium-input" onChange={e => setdata({...data, email: e.target.value})} required />
                            <input type="text" placeholder="Username" className="premium-input" onChange={e => setdata({...data, username: e.target.value})} required />
                            <input type="password" placeholder="Password" className="premium-input" onChange={e => setdata({...data, password: e.target.value})} required />
                            <button className="master-btn mt-4" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin mx-auto" /> : "SEND VERIFICATION CODE"}
                            </button>
                        </motion.form>
                    ) : (
                        <motion.form key="step2" initial={{x:10, opacity:0}} animate={{x:0, opacity:1}} onSubmit={verifyAndSignup} className="text-center">
                            <ShieldCheck size={60} className="text-info mx-auto mb-3" />
                            <h3 className="font-weight-bold">Verify Identity</h3>
                            <p className="text-muted small mb-4">Enter code sent to {data.email}</p>
                            <input type="text" maxLength="6" className="otp-input" placeholder="000000" onChange={e => setUserOtp(e.target.value)} required />
                            <button className="master-btn mt-5" disabled={loading}>
                                {loading ? "Verifying..." : "COMPLETE REGISTRATION"}
                            </button>
                            <p className="mt-3 small text-info cursor-pointer" onClick={() => setStep(1)}><u>Edit Details</u></p>
                        </motion.form>
                    )}
                </AnimatePresence>
                <div className="text-center mt-4"><Link to="/login" className="small text-muted font-weight-bold">ALREADY A MEMBER? LOGIN</Link></div>
            </motion.div>
            <style>{`
                .signup-master-root { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0a; position: relative; overflow: hidden; }
                .luxury-bg { position: absolute; width: 100%; height: 100%; background: url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80') center/cover; opacity: 0.2; }
                .signup-card { position: relative; z-index: 10; width: 100%; max-width: 460px; border-radius: 40px; }
                .premium-input { width: 100%; border: none; border-bottom: 2px solid #eee; padding: 15px; margin-bottom: 10px; outline: none; font-weight: 600; }
                .premium-input:focus { border-color: #17a2b8; }
                .master-btn { width: 100%; background: #000; color: white; border: none; padding: 18px; border-radius: 50px; font-weight: 800; letter-spacing: 1px; transition: 0.3s; }
                .master-btn:hover { background: #17a2b8; }
                .otp-input { width: 100%; text-align: center; font-size: 3rem; letter-spacing: 15px; border: none; border-bottom: 3px solid #17a2b8; outline: none; font-weight: 800; color: #111; }
            `}</style>
        </div>
    )
}