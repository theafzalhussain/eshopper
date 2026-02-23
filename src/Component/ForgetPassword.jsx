import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { sendOtpAPI, resetPasswordAPI } from '../Store/Services'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, ShieldCheck, Loader2, User, Lock, CheckCircle2, ArrowLeft, ShieldAlert } from 'lucide-react'

export default function ForgetPassword() {
    const [data, setdata] = useState({ username: "", password: "", cpassword: "" })
    const [step, setStep] = useState(1) // 1: Find Account, 2: New Credentials
    const [loading, setLoading] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    const navigate = useNavigate()

    // Reset scroll to top
    useEffect(() => { window.scrollTo(0, 0); }, [])

    async function handleRequestOTP(e) {
        e.preventDefault(); 
        setLoading(true);
        try {
            const res = await sendOtpAPI({ email: data.username, type: 'forget' })
            if (res.result === "Done") { 
                setStep(2); 
                alert("Identity Verified. Reset code sent to your registered vault!"); 
            }
        } catch (err) { 
            alert("Security Error: Identity not found in master records."); 
        }
        setLoading(false);
    }

    async function handleReset(e) {
        e.preventDefault();
        if (data.password !== data.cpassword) return alert("Mismatch: Passwords do not align!");
        setLoading(true);
        try {
            const res = await resetPasswordAPI({ ...data, otp: userOtp })
            if (res.result === "Done") { 
                alert("Credentials Synced! Access Restored."); 
                navigate("/login"); 
            }
        } catch (err) { 
            alert("Breach: Verification Code Invalid."); 
        }
        setLoading(false);
    }

    return (
        <div className="forget-master-root">
            <div className="luxury-overlay"></div>
            
            <div className="container d-flex align-items-center justify-content-center min-vh-100">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="glass-forget-card shadow-2xl"
                >
                    <div className="forget-inner-box p-4 p-md-5">
                        
                        {/* Header Section */}
                        <div className="text-center mb-5">
                            <motion.div 
                                initial={{ y: -20 }} animate={{ y: 0 }}
                                className="icon-badge-premium mb-3"
                            >
                                <KeyRound size={30} className="text-info" />
                            </motion.div>
                            <h2 className="brand-title">SECURITY<span className="accent">.</span></h2>
                            <p className="step-indicator">
                                {step === 1 ? "RECOVER MASTER ACCESS" : "SYNC NEW CREDENTIALS"}
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                /* --- STEP 1: FIND ACCOUNT --- */
                                <motion.form 
                                    key="find-form"
                                    initial={{ x: -30, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 30, opacity: 0 }}
                                    onSubmit={handleRequestOTP} 
                                    className="premium-form"
                                >
                                    <div className="input-field-wrap mb-5">
                                        <label>IDENTITY (USERNAME / EMAIL)</label>
                                        <div className="input-lux-box">
                                            <User size={18} className="icon" />
                                            <input type="text" placeholder="enter your identity" onChange={e => setdata({...data, username: e.target.value})} required />
                                        </div>
                                    </div>

                                    <motion.button 
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit" 
                                        className="master-submit-btn shadow-lg"
                                        disabled={loading}
                                    >
                                        {loading ? <Loader2 className="spinner mx-auto" /> : "SEND RESET CODE"}
                                    </motion.button>
                                </motion.form>
                            ) : (
                                /* --- STEP 2: NEW CREDENTIALS --- */
                                <motion.form 
                                    key="reset-form"
                                    initial={{ x: 30, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    onSubmit={handleReset} 
                                    className="text-left"
                                >
                                    <div className="input-field-wrap mb-4">
                                        <label>VERIFICATION CODE</label>
                                        <div className="input-lux-box">
                                            <ShieldCheck size={18} className="icon" />
                                            <input type="text" maxLength="6" placeholder="000000" style={{letterSpacing:'10px', fontWeight:'800'}} onChange={e => setUserOtp(e.target.value)} required />
                                        </div>
                                    </div>

                                    <div className="input-field-wrap mb-4">
                                        <label>NEW PASSWORD</label>
                                        <div className="input-lux-box">
                                            <Lock size={18} className="icon" />
                                            <input type="password" placeholder="••••••••" onChange={e => setdata({...data, password: e.target.value})} required />
                                        </div>
                                    </div>

                                    <div className="input-field-wrap mb-5">
                                        <label>CONFIRM NEW PASSWORD</label>
                                        <div className="input-lux-box">
                                            <CheckCircle2 size={18} className="icon" />
                                            <input type="password" placeholder="••••••••" onChange={e => setdata({...data, cpassword: e.target.value})} required />
                                        </div>
                                    </div>

                                    <button type="submit" className="master-submit-btn shadow-lg" disabled={loading}>
                                        {loading ? "SYNCHRONIZING..." : "SYNC CREDENTIALS"}
                                    </button>
                                    
                                    <p className="text-center mt-3 small text-info cursor-pointer" onClick={() => setStep(1)}><u>Try different identity?</u></p>
                                </motion.form>
                            )}
                        </AnimatePresence>

                        <div className="forget-footer mt-5 text-center">
                            <div className="divider-line"><span>REMEMBERED?</span></div>
                            <Link to="/login" className="login-call-link">
                                BACK TO SECURE LOGIN
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;800&display=swap');

                .forget-master-root {
                    position: relative;
                    min-height: 100vh;
                    background: url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=80') center/cover;
                    font-family: 'Montserrat', sans-serif;
                    overflow: hidden;
                }

                .luxury-overlay {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(135deg, rgba(10,10,10,0.9) 0%, rgba(20,35,45,0.8) 100%);
                    backdrop-filter: blur(12px);
                }

                .glass-forget-card {
                    position: relative;
                    width: 100%;
                    max-width: 480px;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 40px;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.4);
                }

                .icon-badge-premium {
                    width: 60px; height: 60px;
                    background: rgba(23, 162, 184, 0.1);
                    border-radius: 18px;
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto;
                }

                .brand-title { font-weight: 800; letter-spacing: 6px; font-size: 1.8rem; color: #111; margin-bottom: 5px; }
                .accent { color: #17a2b8; }
                .step-indicator { font-size: 10px; font-weight: 800; letter-spacing: 2px; color: #888; }

                .input-field-wrap label {
                    font-size: 9px; font-weight: 800; color: #333;
                    margin-bottom: 8px; display: block; letter-spacing: 1.5px;
                }

                .input-lux-box {
                    display: flex; align-items: center;
                    background: #f8fafc;
                    border-radius: 15px; padding: 8px 18px;
                    border: 2px solid transparent; transition: 0.3s;
                }

                .input-lux-box:focus-within {
                    border-color: #17a2b8;
                    background: white;
                    box-shadow: 0 5px 15px rgba(23, 162, 184, 0.1);
                }

                .input-lux-box input {
                    border: none; background: transparent;
                    width: 100%; outline: none;
                    font-size: 15px; font-weight: 600;
                    padding: 10px; color: #111;
                }

                .icon { color: #cbd5e1; transition: 0.3s; }
                .input-lux-box:focus-within .icon { color: #17a2b8; }

                .master-submit-btn {
                    width: 100%; background: #111; color: white;
                    border: none; padding: 18px; border-radius: 50px;
                    font-weight: 800; font-size: 13px; letter-spacing: 2px;
                    cursor: pointer; transition: 0.4s;
                    display: flex; align-items: center; justify-content: center;
                }

                .master-submit-btn:hover { background: #17a2b8; transform: translateY(-2px); }

                .divider-line { margin: 40px 0 20px; position: relative; text-align: center; }
                .divider-line::before { content: ''; position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: #e2e8f0; }
                .divider-line span { background: white; padding: 0 15px; position: relative; font-size: 9px; font-weight: 800; color: #94a3b8; }

                .login-call-link {
                    color: #111; font-weight: 800; letter-spacing: 1px;
                    font-size: 12px; text-decoration: none; border-bottom: 2px solid #17a2b8;
                    padding-bottom: 3px; transition: 0.3s;
                }

                .spinner { animation: rotate 2s linear infinite; }
                @keyframes rotate { 100% { transform: rotate(360deg); } }

                @media (max-width: 576px) {
                    .glass-forget-card { border-radius: 0; min-height: 100vh; }
                }
            `}} />
        </div>
    )
}