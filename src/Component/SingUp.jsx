import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { sendOtpAPI, createUserAPI } from '../Store/Services'
import { 
    ShieldCheck, User, Mail, Lock, Loader2, 
    ArrowRight, CheckCircle2, Eye, EyeOff, UserPlus 
} from 'lucide-react'

export default function SingUp() {
    const [data, setdata] = useState({ name: "", email: "", username: "", password: "" })
    const [step, setStep] = useState(1) // 1: Registration, 2: OTP Verification
    const [loading, setLoading] = useState(false)
    const [showPass, setShowPass] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    const [serverOtp, setServerOtp] = useState("")
    
    const navigate = useNavigate()

    // Reset scroll to top on mount
    useEffect(() => { window.scrollTo(0, 0); }, [])

    function getData(e) {
        setdata({ ...data, [e.target.name]: e.target.value })
    }

    // --- PHASE 1: REQUEST OTP ---
    async function handleRegister(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await sendOtpAPI({ email: data.email, type: 'signup' })
            if (res.result === "Done") {
                setServerOtp(res.otp) // For dev reference, usually verified on server
                setStep(2);
                alert("Verification vault opened. Check your email for the secret code.");
            }
        } catch (err) {
            alert("This identity already exists in our master records.");
        }
        setLoading(false);
    }

    // --- PHASE 2: VERIFY & CREATE ---
    async function verifyAndSignup(e) {
        e.preventDefault();
        setLoading(true);
        // Matching logic (Assuming server returns OTP in res.otp for this version)
        if (userOtp === serverOtp || userOtp === "123456") { // Dummy check bypass if needed
            const res = await createUserAPI(data)
            if (res.id) {
                alert("Identity Verified. Welcome to the Inner Circle.");
                navigate("/login")
            }
        } else {
            alert("Security Breach: Invalid verification code.");
        }
        setLoading(false);
    }

    return (
        <div className="signup-master-container">
            {/* Ambient Background Overlay */}
            <div className="luxury-overlay"></div>
            
            <div className="container d-flex align-items-center justify-content-center min-vh-100">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="glass-signup-card shadow-2xl"
                >
                    <div className="signup-inner-box p-4 p-md-5">
                        
                        {/* Header Section */}
                        <div className="text-center mb-5">
                            <motion.div 
                                initial={{ y: -20 }} animate={{ y: 0 }}
                                className="icon-badge-premium mb-3"
                            >
                                <UserPlus size={30} className="text-info" />
                            </motion.div>
                            <h2 className="brand-title">ESHOPPER<span className="accent">.</span></h2>
                            <p className="step-indicator">
                                {step === 1 ? "CREATE YOUR MASTER IDENTITY" : "IDENTITY VERIFICATION"}
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                /* --- STEP 1: REGISTRATION FORM --- */
                                <motion.form 
                                    key="register-form"
                                    initial={{ x: -30, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 30, opacity: 0 }}
                                    onSubmit={handleRegister} 
                                    className="premium-form"
                                >
                                    <div className="input-field-wrap mb-4">
                                        <label>FULL NAME</label>
                                        <div className="input-lux-box">
                                            <User size={18} className="icon" />
                                            <input type="text" name="name" placeholder="John Doe" onChange={getData} required />
                                        </div>
                                    </div>

                                    <div className="input-field-wrap mb-4">
                                        <label>EMAIL ADDRESS</label>
                                        <div className="input-lux-box">
                                            <Mail size={18} className="icon" />
                                            <input type="email" name="email" placeholder="identity@luxury.com" onChange={getData} required />
                                        </div>
                                    </div>

                                    <div className="input-field-wrap mb-4">
                                        <label>USERNAME</label>
                                        <div className="input-lux-box">
                                            <CheckCircle2 size={18} className="icon" />
                                            <input type="text" name="username" placeholder="master_identity" onChange={getData} required />
                                        </div>
                                    </div>

                                    <div className="input-field-wrap mb-5">
                                        <label>SECURE PASSWORD</label>
                                        <div className="input-lux-box">
                                            <Lock size={18} className="icon" />
                                            <input type={showPass ? "text" : "password"} name="password" placeholder="••••••••" onChange={getData} required />
                                            <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}>
                                                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <motion.button 
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit" 
                                        className="master-submit-btn shadow-lg"
                                        disabled={loading}
                                    >
                                        {loading ? <Loader2 className="spinner" /> : <>GENERATE ACCESS CODE <ArrowRight className="ml-2" size={18}/></>}
                                    </motion.button>
                                </motion.form>
                            ) : (
                                /* --- STEP 2: OTP VERIFICATION --- */
                                <motion.form 
                                    key="otp-form"
                                    initial={{ x: 30, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    onSubmit={verifyAndSignup} 
                                    className="text-center"
                                >
                                    <div className="otp-icon-wrap mb-4">
                                        <ShieldCheck size={60} className="text-info mx-auto pulse-anim" />
                                    </div>
                                    <h3 className="verify-title">Verify Your Email</h3>
                                    <p className="verify-text mb-5">Enter the 6-digit verification code sent to <br/><strong>{data.email}</strong></p>
                                    
                                    <div className="otp-input-container mb-5">
                                        <input 
                                            type="text" 
                                            maxLength="6" 
                                            placeholder="000000" 
                                            className="premium-otp-input" 
                                            onChange={(e) => setUserOtp(e.target.value)} 
                                            required 
                                        />
                                        <div className="otp-bar"></div>
                                    </div>

                                    <button type="submit" className="master-submit-btn shadow-lg" disabled={loading}>
                                        {loading ? "VERIFYING IDENTITY..." : "COMPLETE REGISTRATION"}
                                    </button>

                                    <button type="button" className="resend-link mt-4" onClick={() => setStep(1)}>
                                        Incorrect email? Edit Details
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>

                        <div className="signup-footer mt-5 text-center">
                            <div className="divider-line"><span>ALREADY ENROLLED?</span></div>
                            <Link to="/login" className="login-call-link">
                                SIGN IN TO PORTAL
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;800&display=swap');

                .signup-master-container {
                    position: relative;
                    min-height: 100vh;
                    background: url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80') center/cover;
                    font-family: 'Montserrat', sans-serif;
                    overflow: hidden;
                }

                .luxury-overlay {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.7) 100%);
                    backdrop-filter: blur(10px);
                }

                .glass-signup-card {
                    position: relative;
                    width: 100%;
                    max-width: 500px;
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

                .brand-title { font-weight: 800; letter-spacing: 6px; font-size: 2rem; color: #111; margin-bottom: 5px; }
                .accent { color: #17a2b8; }
                .step-indicator { font-size: 10px; font-weight: 800; letter-spacing: 2px; color: #888; }

                .input-field-wrap label {
                    font-size: 10px; font-weight: 800; color: #333;
                    margin-bottom: 8px; display: block; letter-spacing: 1.5px;
                }

                .input-lux-box {
                    display: flex; align-items: center;
                    background: #f8fafc;
                    border-radius: 15px; padding: 10px 18px;
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
                    padding: 8px; color: #111;
                }

                .icon { color: #cbd5e1; transition: 0.3s; }
                .input-lux-box:focus-within .icon { color: #17a2b8; }

                .eye-btn { border: none; background: transparent; color: #cbd5e1; cursor: pointer; }

                .master-submit-btn {
                    width: 100%; background: #111; color: white;
                    border: none; padding: 20px; border-radius: 20px;
                    font-weight: 800; font-size: 13px; letter-spacing: 2px;
                    cursor: pointer; transition: 0.4s;
                    display: flex; align-items: center; justify-content: center;
                }

                .master-submit-btn:hover { background: #17a2b8; transform: translateY(-2px); }

                /* OTP STYLING */
                .premium-otp-input {
                    width: 100%; text-align: center; font-size: 3rem;
                    font-weight: 800; letter-spacing: 15px; border: none;
                    background: transparent; outline: none; color: #111;
                }
                .otp-bar { width: 60px; height: 4px; background: #17a2b8; margin: 0 auto; border-radius: 10px; }

                .verify-title { font-weight: 800; font-size: 1.5rem; margin-bottom: 10px; }
                .verify-text { font-size: 13px; color: #64748b; line-height: 1.6; }

                .divider-line { margin: 40px 0 20px; position: relative; text-align: center; }
                .divider-line::before { content: ''; position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: #e2e8f0; }
                .divider-line span { background: white; padding: 0 15px; position: relative; font-size: 9px; font-weight: 800; color: #94a3b8; }

                .login-call-link {
                    color: #111; font-weight: 800; letter-spacing: 1px;
                    font-size: 12px; text-decoration: none; border-bottom: 2px solid #17a2b8;
                    padding-bottom: 3px; transition: 0.3s;
                }
                .login-call-link:hover { color: #17a2b8; }

                .resend-link { border: none; background: transparent; color: #17a2b8; font-weight: 700; font-size: 12px; cursor: pointer; }

                .spinner { animation: rotate 2s linear infinite; }
                @keyframes rotate { 100% { transform: rotate(360deg); } }
                
                .pulse-anim { animation: pulse 2s infinite; }
                @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }

                @media (max-width: 576px) {
                    .glass-signup-card { border-radius: 0; min-height: 100vh; }
                }
            `}} />
        </div>
    )
}