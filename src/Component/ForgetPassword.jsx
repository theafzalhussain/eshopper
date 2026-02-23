import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, User, ShieldCheck, Lock, CheckCircle2, Loader2, ArrowRight, RotateCcw } from 'lucide-react'
import { sendOtpAPI, resetPasswordAPI } from '../Store/Services'

export default function ForgetPassword() {
    const [data, setdata] = useState({ username: "", password: "", cpassword: "" })
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    const [timer, setTimer] = useState(0)
    const navigate = useNavigate()

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    async function handleRequestOTP(e) {
        if(e) e.preventDefault()
        setLoading(true)
        try {
            const res = await sendOtpAPI({ email: data.username })
            if (res.result === "Done") {
                setStep(2)
                setTimer(60) // 1 minute timer
                alert("OTP Sent! Check your mail inbox/spam.")
            }
        } catch (error) { alert("Username not found!") }
        setLoading(false)
    }

    async function handleReset(e) {
        e.preventDefault()
        if (data.password !== data.cpassword) return alert("Passwords Mismatch!")
        setLoading(true)
        try {
            const res = await resetPasswordAPI({ username: data.username, password: data.password, otp: userOtp })
            if (res.result === "Done") {
                alert("Success! Password Updated.")
                navigate("/login")
            }
        } catch (error) { alert("Invalid OTP Code!") }
        setLoading(false)
    }

    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 bg-dark p-3">
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="bg-white p-5 rounded-3xl shadow-lg w-100" style={{maxWidth:'450px'}}>
                <div className="text-center mb-5">
                    <KeyRound size={48} className="text-info mb-3" />
                    <h2 className="font-weight-bold">Security Center</h2>
                    <p className="text-muted">Step {step}: {step === 1 ? 'Verification' : 'Reset Credentials'}</p>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form key="s1" onSubmit={handleRequestOTP}>
                            <div className="form-group mb-5 border-bottom">
                                <label className="small font-weight-bold text-muted">USERNAME / EMAIL</label>
                                <div className="d-flex align-items-center py-2">
                                    <User size={18} className="text-info mr-2" />
                                    <input type="text" className="form-control border-0 bg-transparent shadow-none" placeholder="Enter identity" onChange={e => setdata({...data, username: e.target.value})} required />
                                </div>
                            </div>
                            <button className="btn btn-info btn-block py-3 rounded-pill shadow font-weight-bold" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : "SEND OTP"}
                            </button>
                        </motion.form>
                    ) : (
                        <motion.form key="s2" onSubmit={handleReset}>
                            <div className="form-group mb-4 border-bottom">
                                <label className="small font-weight-bold text-muted">VERIFICATION CODE</label>
                                <div className="d-flex align-items-center py-2">
                                    <ShieldCheck size={18} className="text-info mr-2" />
                                    <input type="text" maxLength="6" className="form-control border-0 bg-transparent shadow-none font-weight-bold" placeholder="6-Digit OTP" onChange={e => setUserOtp(e.target.value)} required />
                                </div>
                            </div>
                            {/* Resend Logic */}
                            <div className="text-right mb-4">
                                {timer > 0 ? (
                                    <span className="small text-muted">Resend in {timer}s</span>
                                ) : (
                                    <button type="button" onClick={handleRequestOTP} className="btn btn-link p-0 small text-info font-weight-bold">RESEND OTP</button>
                                )}
                            </div>

                            <input type="password" placeholder="New Password"  className="form-control mb-3" onChange={e => setdata({...data, password: e.target.value})} required />
                            <input type="password" placeholder="Confirm Password" className="form-control mb-4" onChange={e => setdata({...data, cpassword: e.target.value})} required />
                            
                            <button className="btn btn-dark btn-block py-3 rounded-pill font-weight-bold shadow">{loading ? "SYNCING..." : "UPDATE PASSWORD"}</button>
                        </motion.form>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}