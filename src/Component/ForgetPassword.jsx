import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, User, Lock, CheckCircle2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react'
import { sendOtpAPI, resetPasswordAPI } from '../Store/Services' // APIs from your Master Service

export default function ForgetPassword() {
    const [data, setdata] = useState({ username: "", password: "", cpassword: "" })
    const [step, setStep] = useState(1) // 1: Username, 2: OTP & Reset
    const [loading, setLoading] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    const [serverOtp, setServerOtp] = useState("") // Just for reference or backend check
    
    const navigate = useNavigate()

    // --- STEP 1: OTP Request Logic ---
    async function requestOTP(e) {
        e.preventDefault()
        setLoading(true)
        try {
            // Note: Hamare backend me email se OTP jata hai. 
            // Agar aapke paas email hai to data.username use karein as email
            const res = await sendOtpAPI({ email: data.username }) 
            if (res.result === "Done") {
                setServerOtp(res.otp) // Agar backend response me OTP bhej raha hai
                setStep(2)
                alert("Verification code sent to your registered identity!")
            }
        } catch (error) {
            alert("Error: Username not found or server issues.")
        }
        setLoading(false)
    }

    // --- STEP 2: Password Reset Logic ---
    async function handleReset(e) {
        e.preventDefault()
        if (data.password !== data.cpassword) {
            alert("Passwords do not match!")
            return
        }

        setLoading(true)
        try {
            const res = await resetPasswordAPI({
                username: data.username,
                password: data.password,
                otp: userOtp
            })

            if (res.result === "Done") {
                alert("Security Credentials Updated! Please login with new password.")
                navigate("/login")
            } else {
                alert("Invalid or Expired OTP Code!")
            }
        } catch (error) {
            alert("Reset Failed: Please check your OTP code.")
        }
        setLoading(false)
    }

    return (
        <div className="d-flex align-items-center justify-content-center" 
             style={{ minHeight: "100vh", background: "url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=80') center/cover" }}>
            
            <div className="overlay-luxury" style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.6)', backdropFilter:'blur(5px)'}}></div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="p-5 shadow-2xl bg-white position-relative" 
                style={{ width: "450px", borderRadius: "35px", zIndex: 10 }}
            >
                <div className="text-center mb-5">
                    <div className="bg-info-light d-inline-block p-3 rounded-circle mb-3" style={{backgroundColor:'rgba(23, 162, 184, 0.1)'}}>
                        <KeyRound size={40} className="text-info" />
                    </div>
                    <h2 className="font-weight-bold text-dark">Security Portal</h2>
                    <p className="text-muted small">Step {step}: {step === 1 ? "Identity Verification" : "Credentials Reset"}</p>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        /* --- PHASE 1: ENTER USERNAME --- */
                        <motion.form 
                            key="step1"
                            initial={{ x: -20, opacity: 0 }} 
                            animate={{ x: 0, opacity: 1 }} 
                            exit={{ x: 20, opacity: 0 }}
                            onSubmit={requestOTP}
                        >
                            <div className="form-group mb-5 border-bottom">
                                <label className="small font-weight-bold text-muted uppercase">Login Username / Email</label>
                                <div className="d-flex align-items-center py-2">
                                    <User size={18} className="text-info mr-2" />
                                    <input type="text" placeholder="Enter your registered ID" className="form-control border-0 bg-transparent shadow-none" 
                                           onChange={(e) => setdata({ ...data, username: e.target.value })} required />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-info btn-block py-3 rounded-pill shadow-lg font-weight-bold d-flex align-items-center justify-content-center" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <>REQUEST CODE <ArrowRight size={18} className="ml-2" /></>}
                            </button>
                        </motion.form>
                    ) : (
                        /* --- PHASE 2: ENTER OTP & NEW PASSWORD --- */
                        <motion.form 
                            key="step2"
                            initial={{ x: 20, opacity: 0 }} 
                            animate={{ x: 0, opacity: 1 }} 
                            onSubmit={handleReset}
                        >
                            <div className="mb-4 text-center">
                                <span className="badge badge-success px-3 py-2 rounded-pill">CODE SENT ✅</span>
                            </div>

                            <div className="form-group mb-4 border-bottom">
                                <label className="small font-weight-bold text-muted">VERIFICATION CODE</label>
                                <div className="d-flex align-items-center py-2">
                                    <ShieldCheck size={18} className="text-info mr-2" />
                                    <input type="text" placeholder="6-Digit OTP" maxLength="6" className="form-control border-0 bg-transparent shadow-none font-weight-bold" 
                                           style={{letterSpacing:'5px'}} onChange={(e) => setUserOtp(e.target.value)} required />
                                </div>
                            </div>

                            <div className="form-group mb-4 border-bottom">
                                <label className="small font-weight-bold text-muted">NEW PASSWORD</label>
                                <div className="d-flex align-items-center py-2">
                                    <Lock size={18} className="text-info mr-2" />
                                    <input type="password" placeholder="••••••••" className="form-control border-0 bg-transparent shadow-none" 
                                           onChange={(e) => setdata({ ...data, password: e.target.value })} required />
                                </div>
                            </div>

                            <div className="form-group mb-5 border-bottom">
                                <label className="small font-weight-bold text-muted">CONFIRM PASSWORD</label>
                                <div className="d-flex align-items-center py-2">
                                    <CheckCircle2 size={18} className="text-info mr-2" />
                                    <input type="password" placeholder="••••••••" className="form-control border-0 bg-transparent shadow-none" 
                                           onChange={(e) => setdata({ ...data, cpassword: e.target.value })} required />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-dark btn-block py-3 rounded-pill shadow-lg font-weight-bold" disabled={loading}>
                                {loading ? "SYNCHRONIZING..." : "RESET PASSWORD"}
                            </button>
                            
                            <p className="text-center mt-3 small text-info cursor-pointer" onClick={() => setStep(1)}><u>Try different username?</u></p>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="text-center mt-4 border-top pt-3">
                    <Link to="/login" className="text-muted small font-weight-bold text-decoration-none">← BACK TO SECURE LOGIN</Link>
                </div>
            </motion.div>
        </div>
    )
}