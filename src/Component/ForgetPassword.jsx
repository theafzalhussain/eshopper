import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { sendOtpAPI, resetPasswordAPI } from '../Store/Services'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, ShieldCheck, Loader2 } from 'lucide-react'

export default function ForgetPassword() {
    const [data, setdata] = useState({ username: "", password: "", cpassword: "" })
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    const navigate = useNavigate()

    async function handleRequestOTP(e) {
        e.preventDefault(); setLoading(true);
        try {
            const res = await sendOtpAPI({ email: data.username, type: 'forget' })
            if (res.result === "Done") { setStep(2); alert("Reset code sent!"); }
        } catch (err) { alert("Username not found in master records."); }
        setLoading(false);
    }

    async function handleReset(e) {
        e.preventDefault();
        if (data.password !== data.cpassword) return alert("Mismatch!");
        setLoading(true);
        try {
            const res = await resetPasswordAPI({ ...data, otp: userOtp })
            if (res.result === "Done") { alert("Credentials Synced!"); navigate("/login"); }
        } catch (err) { alert("Breach: Code Invalid."); }
        setLoading(false);
    }

    return (
        <div className="premium-auth-container">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="glass-card p-5">
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <form onSubmit={handleRequestOTP}>
                            <h2 className="text-center mb-4">Find Account</h2>
                            <input type="text" placeholder="Identity (User/Email)" className="p-input" onChange={e => setdata({...data, username: e.target.value})} required />
                            <button className="p-btn mt-4" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "SEND RESET CODE"}</button>
                        </form>
                    ) : (
                        <form onSubmit={handleReset}>
                            <h2 className="text-center mb-4">New Credentials</h2>
                            <input type="text" maxLength="6" className="otp-input" placeholder="000000" onChange={e => setUserOtp(e.target.value)} required />
                            <input type="password" placeholder="New Password" className="p-input mt-4" onChange={e => setdata({...data, password: e.target.value})} required />
                            <input type="password" placeholder="Confirm" className="p-input" onChange={e => setdata({...data, cpassword: e.target.value})} required />
                            <button className="p-btn mt-4">SYNC CREDENTIALS</button>
                        </form>
                    )}
                </AnimatePresence>
                <Link to="/login" className="d-block text-center mt-4 small text-muted">Back to Login</Link>
            </motion.div>
        </div>
    )
}