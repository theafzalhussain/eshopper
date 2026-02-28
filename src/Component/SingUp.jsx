import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { sendOtpAPI, createUserAPI } from '../Store/Services'
import { BASE_URL } from '../constants'
import { ShieldCheck, User, Mail, Lock, Loader2, ArrowRight, UserPlus, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

export default function SingUp() {
    const [data, setdata] = useState({ name: "", email: "", username: "", password: "" })
    const [step, setStep] = useState(1) 
    const [loading, setLoading] = useState(false)
    const [showPass, setShowPass] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    
    // Validation states
    const [errors, setErrors] = useState({ name: "", email: "", username: "", password: "" })
    const [usernameStatus, setUsernameStatus] = useState(null) // 'available', 'taken', null
    const [checkingUsername, setCheckingUsername] = useState(false)
    const [generalError, setGeneralError] = useState("") // For API/server errors
    
    // New features
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [resendTimer, setResendTimer] = useState(0)
    const [passwordStrength, setPasswordStrength] = useState(null) // 'weak', 'medium', 'strong'
    
    const navigate = useNavigate()

    // PASSWORD STRENGTH CHECKER
    const checkPasswordStrength = (pwd) => {
        if (!pwd) return null
        let strength = 0
        if (pwd.length >= 8) strength++
        if (/[A-Z]/.test(pwd)) strength++
        if (/[@#$]/.test(pwd)) strength++
        if (/[0-9]/.test(pwd)) strength++
        
        if (strength <= 1) return 'weak'
        if (strength <= 2) return 'medium'
        return 'strong'
    }

    // PASSWORD VALIDATION FUNCTION
    const validatePassword = (pwd) => {
        const strength = checkPasswordStrength(pwd)
        setPasswordStrength(strength)
        
        if (!pwd) return "Password is required"
        if (pwd.length < 8) return "Minimum 8 characters required"
        if (!/[A-Z]/.test(pwd)) return "At least 1 Uppercase letter required"
        if (!/[@#$]/.test(pwd)) return "At least 1 special character (@, #, $) required"
        return "" // Valid
    }

    // EMAIL VALIDATION FUNCTION
    const validateEmail = (email) => {
        if (!email) return "Email is required"
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) return "Email invalid"
        return ""
    }

    // CHECK USERNAME AVAILABILITY (DEBOUNCED)
    useEffect(() => {
        if (!data.username || data.username.length < 3) {
            setUsernameStatus(null)
            return
        }

        const checkUsername = async () => {
            try {
                setCheckingUsername(true)
                // Call backend to check if username exists
                const res = await fetch(`${BASE_URL}/api/check-username`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: data.username })
                })
                const result = await res.json()
                setUsernameStatus(result.available ? 'available' : 'taken')
                if (!result.available) {
                    setErrors(prev => ({ ...prev, username: "Username already taken" }))
                } else {
                    setErrors(prev => ({ ...prev, username: "" }))
                }
            } catch (err) {
                setUsernameStatus(null)
            } finally {
                setCheckingUsername(false)
            }
        }

        const timer = setTimeout(checkUsername, 600) // Debounce 600ms
        return () => clearTimeout(timer)
    }, [data.username])

    useEffect(() => { window.scrollTo(0, 0); }, [])

    // RESEND OTP TIMER
    useEffect(() => {
        if (resendTimer <= 0) return
        const interval = setInterval(() => setResendTimer(prev => prev - 1), 1000)
        return () => clearInterval(interval)
    }, [resendTimer])

    // RESEND OTP FUNCTION
    async function handleResendOTP() {
        setGeneralError("")
        setResendTimer(60)
        try {
            const res = await sendOtpAPI({ email: data.email, type: 'signup' })
            if (res.result === "Done") {
                alert("OTP resent successfully!")
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || "Failed to resend OTP."
            setGeneralError(errorMsg)
            setResendTimer(0)
        }
    }
    
    // --- STEP 1: SEND OTP ---
    async function handleSendOTP(e) {
        e.preventDefault();
        setGeneralError("")
        
        if (!termsAccepted) {
            setGeneralError("Please accept Terms & Conditions to continue")
            return
        }
        
        // Validate all fields
        const nameError = !data.name ? "Name is required" : ""
        const emailError = validateEmail(data.email)
        const usernameError = !data.username ? "Username is required" : (usernameStatus === 'taken' ? "Username already taken" : "")
        const passwordError = validatePassword(data.password)

        setErrors({ name: nameError, email: emailError, username: usernameError, password: passwordError })

        if (nameError || emailError || usernameError || passwordError || usernameStatus !== 'available') {
            setGeneralError("Please fix all errors before proceeding")
            return
        }

        setLoading(true);
        try {
            const res = await sendOtpAPI({ email: data.email, type: 'signup' })
            if (res.result === "Done") {
                setStep(2);
                setResendTimer(60) // Start 60 second timer
                setGeneralError("")
                alert("Verification code sent! Check your email.");
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || "Failed to send OTP. Please try again."
            setGeneralError(errorMsg)
            console.error("Send OTP Error:", err)
        }
        setLoading(false);
    }

    // --- STEP 2: VERIFY & CREATE ---
    async function verifyAndSignup(e) {
        e.preventDefault();
        setGeneralError("")
        
        if (!userOtp || userOtp.length !== 6) {
            setGeneralError("Please enter a valid 6-digit verification code");
            return;
        }
        setLoading(true);
        try {
            // OTP verification is handled on the backend
            const res = await createUserAPI({ ...data, otp: userOtp })
            if (res.id) {
                alert("Account created! Welcome to Eshopper.");
                navigate("/login")
            } else {
                setGeneralError(res.message || "Incorrect verification code!");
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || "Incorrect verification code or server error."
            setGeneralError(errorMsg)
            console.error("Verify OTP Error:", err)
        }
        setLoading(false);
    }

    return (
        <div className="signup-master-root">
            <div className="luxury-bg-overlay"></div>
            <div className="container d-flex align-items-center justify-content-center min-vh-100">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="glass-signup-card shadow-2xl">
                    <div className="signup-inner-box p-4 p-md-5 text-center">
                        {/* PROGRESS INDICATOR */}
                        <div className="progress-indicator mb-4">
                            <div className="progress-bar-container">
                                <div className={`progress-bar ${step === 2 ? 'completed' : 'active'}`}></div>
                            </div>
                            <div className="progress-text">Step {step} of 2</div>
                        </div>

                        <div className="icon-badge-premium mb-4"><UserPlus size={30} className="text-info" /></div>
                        <h2 className="brand-title">ESHOPPER<span className="accent">.</span></h2>
                        <p className="step-indicator">{step === 1 ? "CREATE ACCOUNT" : "VERIFY EMAIL"}</p>

                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.form key="f1" initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 30, opacity: 0 }} onSubmit={handleSendOTP} className="text-left mt-4">
                                    {/* GENERAL ERROR */}
                                    {generalError && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="general-error-box mb-3">
                                            <AlertCircle size={18} className="inline-mr" />
                                            {generalError}
                                        </motion.div>
                                    )}
                                    {/* NAME FIELD */}
                                    <div className="p-field mb-3">
                                        <label>FULL NAME</label>
                                        <div className="p-input-box">
                                            <User size={18}/>
                                            <input type="text" placeholder="John Doe" value={data.name} onChange={e => setdata({...data, name: e.target.value})} required />
                                        </div>
                                        {errors.name && <p className="error-text"><AlertCircle size={14} /> {errors.name}</p>}
                                    </div>

                                    {/* EMAIL FIELD */}
                                    <div className="p-field mb-3">
                                        <label>EMAIL</label>
                                        <div className="p-input-box">
                                            <Mail size={18}/>
                                            <input type="email" placeholder="identity@luxury.com" value={data.email} onChange={e => setdata({...data, email: e.target.value})} required />
                                            {data.email && !errors.email && <CheckCircle size={18} className="input-valid-icon" />}
                                        </div>
                                        {errors.email && <p className="error-text"><AlertCircle size={14} /> {errors.email}</p>}
                                    </div>

                                    {/* USERNAME FIELD */}
                                    <div className="p-field mb-3">
                                        <label>USERNAME</label>
                                        <div className="p-input-box">
                                            <ShieldCheck size={18}/>
                                            <input type="text" placeholder="master_id" value={data.username} onChange={e => setdata({...data, username: e.target.value})} required />
                                            {checkingUsername && <Loader2 size={18} className="animate-spin" />}
                                            {!checkingUsername && usernameStatus === 'available' && <CheckCircle size={18} className="input-valid-icon" />}
                                            {usernameStatus === 'taken' && <AlertCircle size={18} className="input-error-icon" />}
                                        </div>
                                        {usernameStatus === 'available' && <p className="success-text"><CheckCircle size={14} /> Username available</p>}
                                        {errors.username && <p className="error-text"><AlertCircle size={14} /> {errors.username}</p>}
                                    </div>

                                    {/* PASSWORD FIELD */}
                                    <div className="p-field mb-5">
                                        <label>PASSWORD</label>
                                        <div className="p-input-box">
                                            <Lock size={18}/>
                                            <input type={showPass ? "text" : "password"} placeholder="••••••••" value={data.password} onChange={e => setdata({...data, password: e.target.value})} required />
                                            <button type="button" className="eye-btn" onClick={()=>setShowPass(!showPass)}>{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                                        </div>
                                        
                                        {/* PASSWORD STRENGTH INDICATOR */}
                                        {data.password && (
                                            <div className={`password-strength-bar strength-${passwordStrength}`}>
                                                <div className="strength-indicator"></div>
                                                <span className={`strength-text ${passwordStrength}`}>
                                                    {passwordStrength === 'weak' && '🔴 Weak'}
                                                    {passwordStrength === 'medium' && '🟡 Medium'}
                                                    {passwordStrength === 'strong' && '🟢 Strong'}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* PASSWORD REQUIREMENTS */}
                                        {data.password && (
                                            <div className="password-requirements mt-3">
                                                <div className={`req-item ${data.password.length >= 8 ? 'met' : ''}`}>
                                                    {data.password.length >= 8 ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                    <span>Minimum 8 characters</span>
                                                </div>
                                                <div className={`req-item ${/[A-Z]/.test(data.password) ? 'met' : ''}`}>
                                                    {/[A-Z]/.test(data.password) ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                    <span>1 Uppercase letter</span>
                                                </div>
                                                <div className={`req-item ${/[@#$]/.test(data.password) ? 'met' : ''}`}>
                                                    {/[@#$]/.test(data.password) ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                    <span>1 Special character (@, #, $)</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {errors.password && <p className="error-text mt-3"><AlertCircle size={14} /> {errors.password}</p>}
                                    </div>
                                    
                                    {/* TERMS & CONDITIONS */}
                                    <div className="terms-checkbox mb-4">
                                        <input 
                                            type="checkbox" 
                                            id="terms" 
                                            checked={termsAccepted} 
                                            onChange={e => setTermsAccepted(e.target.checked)}
                                        />
                                        <label htmlFor="terms">
                                            I agree to the <a href="#terms" className="terms-link">Terms & Conditions</a>
                                        </label>
                                    </div>
                                    {!termsAccepted && <p className="error-text" style={{fontSize: '11px', marginBottom: '16px'}}><AlertCircle size={12} /> Please accept the terms to continue</p>}
                                    
                                    <button type="submit" className="p-submit-btn shadow-lg" disabled={loading || usernameStatus !== 'available' || !termsAccepted}>{loading ? <Loader2 className="animate-spin mx-auto"/> : <>CREATE ACCOUNT <ArrowRight className="ml-2" size={18}/></>}</button>
                                </motion.form>
                            ) : (
                                <motion.form key="f2" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} onSubmit={verifyAndSignup} className="text-center mt-4">
                                    {/* ERROR IN VERIFICATION */}
                                    {generalError && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="general-error-box mb-4">
                                            <AlertCircle size={18} />
                                            {generalError}
                                        </motion.div>
                                    )}
                                    
                                    <ShieldCheck size={60} className="text-info mx-auto mb-3 pulse-anim" />
                                    <h3 className="verify-title">Verify Your Email</h3>
                                    <p className="verify-text mb-2">Verification code sent to:</p>
                                    <p className="verify-email mb-5"><b>{data.email}</b></p>
                                    
                                    <div className="p-field mb-4">
                                        <label>6-DIGIT CODE</label>
                                        <input type="text" maxLength="6" placeholder="000000" className="p-otp-input" value={userOtp} onChange={e => setUserOtp(e.target.value.replace(/\D/g, ''))} required />
                                    </div>
                                    
                                    <button type="submit" className="p-submit-btn mb-3" disabled={loading || userOtp.length !== 6}>{loading ? <Loader2 className="animate-spin mx-auto"/> : "VERIFY & COMPLETE"}</button>
                                    
                                    {/* RESEND OTP */}
                                    <button 
                                        type="button" 
                                        className="resend-otp-btn" 
                                        onClick={handleResendOTP} 
                                        disabled={resendTimer > 0}
                                    >
                                        {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                                    </button>
                                    
                                    <p className="verify-help-text mt-4">Didn't receive the code? Check your spam folder or request a new code.</p>
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
                
                /* PROGRESS INDICATOR */
                .progress-indicator { margin-bottom: 20px; }
                .progress-bar-container { width: 100%; height: 6px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin-bottom: 8px; }
                .progress-bar { height: 100%; background: linear-gradient(90deg, #17a2b8, #0c7a8d); border-radius: 10px; transition: width 0.5s ease; width: 50%; }
                .progress-bar.completed { width: 100%; }
                .progress-text { font-size: 11px; font-weight: 700; color: #666; letter-spacing: 1px; }
                
                .p-field label { font-size: 10px; font-weight: 800; color: #333; margin-bottom: 8px; display: block; letter-spacing: 1.5px; }
                .p-input-box { display: flex; align-items: center; background: #f8fafc; border-radius: 15px; padding: 12px 18px; border: 2px solid transparent; transition: 0.3s; gap: 10px; }
                .p-input-box:focus-within { border-color: #17a2b8; background: white; box-shadow: 0 0 0 3px rgba(23,162,184,0.1); }
                .p-input-box input { border: none; background: transparent; width: 100%; outline: none; font-size: 15px; font-weight: 600; padding: 4px 0; }
                
                .p-submit-btn { width: 100%; background: linear-gradient(135deg, #111, #333); color: white; border: none; padding: 16px; border-radius: 20px; font-weight: 800; font-size: 12px; letter-spacing: 2px; cursor: pointer; transition: 0.4s; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .p-submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.2); }
                .p-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                
                .p-otp-input { width: 100%; text-align: center; font-size: 3rem; font-weight: 800; letter-spacing: 15px; border: none; background: transparent; outline: none; border-bottom: 3px solid #17a2b8; padding: 10px 0; }
                
                .login-call-link { color: #111; font-weight: 800; text-decoration: none; border-bottom: 2px solid #17a2b8; }
                .eye-btn { border: none; background: transparent; color: #cbd5e1; cursor: pointer; padding: 0; display: flex; align-items: center; }
                
                /* VALIDATION STYLES */
                .error-text { font-size: 12px; color: #dc3545; margin-top: 6px; display: flex; align-items: center; gap: 6px; }
                .success-text { font-size: 12px; color: #28a745; margin-top: 6px; display: flex; align-items: center; gap: 6px; }
                .input-valid-icon { color: #28a745; flex-shrink: 0; }
                .input-error-icon { color: #dc3545; flex-shrink: 0; }
                
                /* GENERAL ERROR BOX */
                .general-error-box { background: #ffe5e5; border: 2px solid #dc3545; border-radius: 12px; padding: 12px 16px; color: #dc3545; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
                
                /* PASSWORD STRENGTH */
                .password-strength-bar { display: flex; align-items: center; gap: 10px; margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px; }
                .strength-indicator { width: 60%; height: 6px; background: #ddd; border-radius: 6px; overflow: hidden; }
                .strength-weak .strength-indicator { background: linear-gradient(90deg, #dc3545, #c82333); }
                .strength-medium .strength-indicator { background: linear-gradient(90deg, #ffc107, #e0a800); }
                .strength-strong .strength-indicator { background: linear-gradient(90deg, #28a745, #1e7e34); }
                .strength-text { font-size: 12px; font-weight: 700; color: #666; }
                .strength-text.weak { color: #dc3545; }
                .strength-text.medium { color: #ffc107; }
                .strength-text.strong { color: #28a745; }
                
                /* PASSWORD REQUIREMENTS */
                .password-requirements { background: #f8f9fa; border-left: 3px solid #ffc107; padding: 12px; border-radius: 8px; }
                .req-item { font-size: 12px; color: #dc3545; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; transition: 0.3s; }
                .req-item:last-child { margin-bottom: 0; }
                .req-item svg { flex-shrink: 0; }
                .req-item.met { color: #28a745; }
                .req-item.met svg { color: #28a745; }
                
                /* TERMS & CONDITIONS */
                .terms-checkbox { display: flex; align-items: center; gap: 10px; justify-content: center; font-size: 13px; }
                .terms-checkbox input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: #17a2b8; }
                .terms-checkbox label { cursor: pointer; margin: 0; user-select: none; }
                .terms-link { color: #17a2b8; text-decoration: none; font-weight: 700; border-bottom: 2px solid #17a2b8; }
                .terms-link:hover { color: #0c7a8d; }
                
                /* RESEND OTP */
                .resend-otp-btn { background: transparent; border: 2px solid #17a2b8; color: #17a2b8; padding: 12px 20px; border-radius: 15px; font-weight: 700; font-size: 13px; cursor: pointer; transition: 0.3s; }
                .resend-otp-btn:hover:not(:disabled) { background: #17a2b8; color: white; }
                .resend-otp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                
                /* VERIFY PAGE */
                .verify-title { font-weight: 800; font-size: 1.5rem; color: #111; margin-bottom: 12px; }
                .verify-text { font-size: 13px; color: #666; }
                .verify-email { font-size: 14px; color: #111; font-weight: 700; }
                .verify-help-text { font-size: 12px; color: #999; }
                
                /* MOBILE RESPONSIVENESS */
                @media (max-width: 575px) {
                    .glass-signup-card { max-width: 95vw; border-radius: 25px; }
                    .signup-inner-box { padding: 20px !important; }
                    .brand-title { font-size: 1.5rem; letter-spacing: 4px; }
                    .p-field label { font-size: 9px; }
                    .p-input-box { padding: 10px 14px; border-radius: 12px; }
                    .p-input-box input { font-size: 14px; }
                    .p-submit-btn { padding: 14px; font-size: 11px; letter-spacing: 1px; }
                    .p-otp-input { font-size: 2.5rem; letter-spacing: 12px; }
                    .error-text { font-size: 11px; }
                    .terms-checkbox { font-size: 12px; }
                    .terms-checkbox input[type="checkbox"] { width: 16px; height: 16px; }
                    .resend-otp-btn { padding: 10px 16px; font-size: 12px; }
                    .verify-title { font-size: 1.3rem; }
                    .verify-text { font-size: 12px; }
                }
                
                @media (max-width: 425px) {
                    .glass-signup-card { max-width: 100vw; border-radius: 20px; }
                    .signup-inner-box { padding: 16px !important; }
                    .brand-title { font-size: 1.3rem; }
                    .p-input-box { padding: 8px 12px; }
                    .p-submit-btn { padding: 12px; font-size: 10px; }
                    .password-requirements { padding: 10px; }
                    .req-item { font-size: 11px; }
                }
            `}} />
        </div>
    )
}