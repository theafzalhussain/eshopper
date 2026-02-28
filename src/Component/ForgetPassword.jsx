import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { sendOtpAPI, resetPasswordAPI } from '../Store/Services'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, ShieldCheck, Loader2, User, Lock, CheckCircle2, ArrowLeft, RotateCcw, AlertCircle } from 'lucide-react'

export default function ForgetPassword() {
    const [data, setdata] = useState({ username: "", password: "", cpassword: "" })
    const [step, setStep] = useState(1)  // 1: Request OTP, 2: Reset Password, 3: Success
    const [loading, setLoading] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    const [timer, setTimer] = useState(0)
    const [resendAttempts, setResendAttempts] = useState(0)
    const [maxAttempts] = useState(10)
    
    const navigate = useNavigate()

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    // --- STEP 1: REQUEST OTP ---
    async function handleRequestOTP(e) {
        if(e) e.preventDefault();
        
        // Check max resend attempts
        if (resendAttempts >= maxAttempts) {
            alert(`Maximum resend attempts (${maxAttempts}) reached. Please try again later or contact support.`);
            return;
        }

        setLoading(true);
        try {
            // Type 'forget' triggers server to check existing identity
            const res = await sendOtpAPI({ email: data.username, type: 'forget' })
            if (res.result === "Done") {
                setStep(2);
                setTimer(60);
                setResendAttempts(prev => prev + 1);
                alert("Security code sent! Check your email for the verification code.");
            }
        } catch (err) {
            alert("No account found with this username/email. Please verify.");
        }
        setLoading(false);
    }

    // --- STEP 2: VERIFY & RESET ---
    async function handleReset(e) {
        e.preventDefault();
        if (data.password !== data.cpassword) {
            alert("Passwords do not match!");
            return;
        }

        setLoading(true);
        try {
            // Payload includes new password and OTP for server-side verification
            const res = await resetPasswordAPI({ ...data, otp: userOtp })
            if (res.result === "Done") {
                // Clear all login data and show success screen
                localStorage.removeItem("login");
                localStorage.removeItem("userid");
                localStorage.removeItem("name");
                localStorage.removeItem("username");
                localStorage.removeItem("role");
                localStorage.removeItem("userToken");
                localStorage.removeItem("savedCredentials");
                
                setStep(3);  // Show success screen
            }
        } catch (err) {
            alert("Verification Failed. Invalid or Expired Code.");
        }
        setLoading(false);
    }

    return (
        <div className="forget-master-root">
            <div className="luxury-overlay"></div>
            <div className="container d-flex align-items-center justify-content-center min-vh-100">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-forget-card shadow-2xl">
                    <div className="forget-inner-box p-4 p-md-5 text-center">
                        <div className="icon-badge-premium mb-4">
                            <KeyRound size={32} className="text-info" />
                        </div>
                        <h2 className="brand-logo mb-2">SECURITY<span className="dot">.</span></h2>
                        <p className="subtitle mb-5">{step === 1 ? "VERIFY YOUR IDENTITY" : "RESET MASTER CREDENTIALS"}</p>

                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.form key="s1" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} onSubmit={handleRequestOTP} className="text-left">
                                    <div className="premium-field mb-5">
                                        <label className="field-label">USERNAME / EMAIL</label>
                                        <div className="input-wrap">
                                            <User size={18} className="field-icon" />
                                            <input type="text" placeholder="enter identity" onChange={e => setdata({...data, username: e.target.value})} required />
                                        </div>
                                    </div>
                                    <button type="submit" className="submit-lux shadow-lg" disabled={loading}>
                                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "REQUEST SECURITY CODE"}
                                    </button>
                                </motion.form>
                            ) : step === 2 ? (
                                <motion.form key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} onSubmit={handleReset} className="text-left">
                                    {/* --- SECURE OTP DISPLAY --- */}
                                    <div className="premium-field mb-5">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <label className="field-label">SECURITY CODE</label>
                                            {timer > 0 ? (
                                                <span className="timer-badge">{timer}s</span>
                                            ) : (
                                                resendAttempts >= maxAttempts ? (
                                                    <span className="max-attempts-msg">Max attempts reached</span>
                                                ) : (
                                                    <button type="button" onClick={handleRequestOTP} className="resend-btn">
                                                        Resend ({resendAttempts}/{maxAttempts})
                                                    </button>
                                                )
                                            )}
                                        </div>
                                        <div className="security-code-box">
                                            <div className="code-label">Your verification code:</div>
                                            <div className="input-wrap">
                                                <ShieldCheck size={18} className="field-icon" />
                                                <input 
                                                    type="text" 
                                                    maxLength="6" 
                                                    placeholder="000000" 
                                                    style={{letterSpacing:'8px', fontWeight:'800', fontSize:'18px'}} 
                                                    onChange={e => setUserOtp(e.target.value)} 
                                                    required 
                                                />
                                            </div>
                                            <div className="code-expiry">✓ Valid for 10 minutes only</div>
                                        </div>
                                    </div>
                                    
                                    <div className="premium-field mb-4">
                                        <label className="field-label">NEW PASSWORD</label>
                                        <div className="input-wrap"><Lock size={18} className="field-icon" /><input type="password" placeholder="••••••••" onChange={e => setdata({...data, password: e.target.value})} required /></div>
                                    </div>
                                    
                                    <div className="premium-field mb-5">
                                        <label className="field-label">CONFIRM PASSWORD</label>
                                        <div className="input-wrap"><CheckCircle2 size={18} className="field-icon" /><input type="password" placeholder="••••••••" onChange={e => setdata({...data, cpassword: e.target.value})} required /></div>
                                    </div>
                                    
                                    <button type="submit" className="submit-lux shadow-lg" disabled={loading}>{loading ? "SYNCING..." : "UPDATE CREDENTIALS"}</button>
                                </motion.form>
                            ) : (
                                <motion.div key="s3" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="success-screen text-center">
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="success-icon-box">
                                        <CheckCircle2 size={64} className="success-icon" />
                                    </motion.div>
                                    <h3 className="success-title mt-4 mb-2">PASSWORD RESET SUCCESSFUL</h3>
                                    <p className="success-subtitle mb-4">Your master credentials have been updated securely.</p>
                                    
                                    <div className="info-box mb-5">
                                        <AlertCircle size={16} />
                                        <span>You have been logged out for security. Please log in again.</span>
                                    </div>

                                    <motion.button 
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate("/login")} 
                                        className="submit-lux shadow-lg"
                                    >
                                        PROCEED TO LOGIN
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="text-center mt-5"><Link to="/login" className="back-link"><ArrowLeft size={16} className="mr-2" /> BACK TO LOGIN</Link></div>
                    </div>
                </motion.div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .forget-master-root { position: relative; min-height: 100vh; background: url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=80') center/cover; overflow: hidden; }
                .luxury-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(10,10,10,0.85); backdrop-filter: blur(12px); }
                .glass-forget-card { position: relative; width: 100%; max-width: 480px; background: rgba(255, 255, 255, 0.95); border-radius: 40px; }
                .icon-badge-premium { width: 60px; height: 60px; background: rgba(23, 162, 184, 0.1); border-radius: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
                .brand-logo { font-weight: 800; letter-spacing: 5px; font-size: 1.8rem; color: #111; }
                .dot { color: #17a2b8; }
                .subtitle { font-size: 10px; font-weight: 800; letter-spacing: 2px; color: #888; }
                .premium-field .field-label { font-size: 9px; font-weight: 800; color: #333; margin-bottom: 8px; display: block; letter-spacing: 1.5px; }
                .input-wrap { display: flex; align-items: center; border-bottom: 2px solid #ddd; padding: 5px 0; transition: 0.3s; }
                .input-wrap:focus-within { border-color: #17a2b8; }
                .input-wrap input { border: none; background: transparent; width: 100%; outline: none; font-size: 15px; font-weight: 600; padding: 10px; color: #111; }
                .submit-lux { width: 100%; background: #000; color: white; border: none; padding: 18px; border-radius: 50px; font-weight: 800; font-size: 13px; letter-spacing: 2px; cursor: pointer; transition: 0.3s; }
                .submit-lux:hover { background: #17a2b8; }
                .submit-lux:disabled { opacity: 0.6; cursor: not-allowed; }
                
                /* --- TIMER & RESEND STYLING --- */
                .timer-badge { 
                    display: inline-block;
                    background: #17a2b8;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1px;
                }
                
                .resend-btn { 
                    border: none; 
                    background: transparent; 
                    font-size: 11px; 
                    color: #17a2b8; 
                    font-weight: bold; 
                    cursor: pointer;
                    transition: 0.3s;
                }
                
                .resend-btn:hover { color: #0f6a7a; text-decoration: underline; }
                
                .max-attempts-msg {
                    display: inline-block;
                    background: #fff0f0;
                    color: #e53e3e;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                }
                
                /* --- SECURITY CODE BOX --- */
                .security-code-box {
                    background: linear-gradient(135deg, rgba(23,162,184,0.08) 0%, rgba(23,162,184,0.04) 100%);
                    border: 2px solid #17a2b8;
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 15px;
                }
                
                .code-label {
                    font-size: 11px;
                    font-weight: 700;
                    color: #666;
                    margin-bottom: 12px;
                    letter-spacing: 1px;
                }
                
                .code-expiry {
                    font-size: 10px;
                    font-weight: 600;
                    color: #17a2b8;
                    margin-top: 12px;
                    text-align: center;
                }
                
                /* --- SUCCESS SCREEN --- */
                .success-screen {
                    padding: 30px 20px;
                }
                
                .success-icon-box {
                    width: 100px;
                    height: 100px;
                    background: linear-gradient(135deg, #17a2b8 0%, #0f6a7a 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                }
                
                .success-icon {
                    color: white;
                    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
                }
                
                .success-title {
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: #111;
                    letter-spacing: 2px;
                }
                
                .success-subtitle {
                    font-size: 13px;
                    color: #666;
                    font-weight: 500;
                }
                
                .info-box {
                    background: #f0f9ff;
                    border-left: 4px solid #17a2b8;
                    padding: 15px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 12px;
                    color: #0f6a7a;
                    font-weight: 600;
                }
                
                .back-link { color: #111; font-weight: 800; letter-spacing: 1px; font-size: 12px; text-decoration: none !important; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
                .back-link:hover { color: #17a2b8; }
                
                /* --- RESPONSIVE --- */
                @media (max-width: 576px) {
                    .glass-forget-card { border-radius: 25px; }
                    .brand-logo { font-size: 1.4rem; letter-spacing: 3px; }
                    .security-code-box { padding: 15px; }
                }
            `}} />
        </div>
    )
}