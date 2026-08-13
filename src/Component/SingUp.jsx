import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createUserAPI } from '../Store/Services'
import { fastAPI } from '../Store/Services.jsx';
import { BASE_URL } from '../constants'
import { notifyAuthChanged } from '../utils/authEvents'
import { logAuthFailure } from '../utils/authErrors'
import { ShieldCheck, User, Mail, Lock, Loader2, ArrowRight, UserPlus, Eye, EyeOff, CheckCircle, AlertCircle, Chrome } from 'lucide-react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import Terms from './Terms'
import { useToast } from './ToastNotification'

export default function SingUp() {
    // ============ MASTER STEP STATE - CONTROLS ALL UI ============
    // 'initial' = email form | 'email_otp' = verify email
    const [masterStep, setMasterStep] = useState('initial')
    
    // ============ EMAIL SIGNUP STATES ============
    const [data, setdata] = useState({ name: "", email: "", username: "", password: "" })
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [showPass, setShowPass] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    
    const [errors, setErrors] = useState({ name: "", email: "", username: "", password: "", confirm: "" })
    const [usernameStatus, setUsernameStatus] = useState(null)
    const [checkingUsername, setCheckingUsername] = useState(false)
    const [generalError, setGeneralError] = useState("")
    
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [resendTimer, setResendTimer] = useState(0)
    const [passwordStrength, setPasswordStrength] = useState(null)
    const [showTerms, setShowTerms] = useState(false)
    const toast = useToast()

    const getSafePicValue = (pic) => {
        const value = String(pic || '').trim()
        if (!value) return ''
        if (value.startsWith('data:')) return ''
        if (value.length > 1000) return ''
        return value
    }
    
    const navigate = useNavigate()

    const resolveOtpErrorMessage = (err, fallback = "Failed to send OTP. Please try again.") => {
        const status = err?.status
        const message = err?.data?.message || err?.message

        if (status === 400) {
            return message || "This email is already registered. Please login or use Forgot Password."
        }
        if (status === 429) {
            return "Too many OTP requests. Please wait before retrying."
        }
        if (status >= 500) {
            return "Server issue while sending OTP. Please try again in a minute."
        }
        if ((message || '').includes('timeout')) {
            return "Request timed out. Please check your connection and retry."
        }

        return message || fallback
    }

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

    const validateConfirm = (pwd, confirm) => {
        if (!confirm) return "Please confirm your password"
        if (pwd !== confirm) return "Passwords do not match"
        return ""
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
        if (resendTimer > 0 || loading) return
        setLoading(true)
        try {
            const res = await fastAPI('/api/send-otp', 'POST', { email: data.email, type: 'signup' })
            if (res.result === "Done") {
                setResendTimer(60)
            } else {
                setGeneralError(res.message || "Unable to resend OTP. Please try again.")
            }
        } catch (err) {
            setGeneralError(resolveOtpErrorMessage(err, "Failed to resend OTP."))
            setResendTimer(0)
        } finally {
            setLoading(false)
        }
    }

    // ========== FIREBASE GOOGLE SIGN UP ==========
    async function handleGoogleSignUp() {
        setGoogleLoading(true)
        setGeneralError("")
        try {
            if (!auth || !googleProvider) {
                setGeneralError("Google sign-up is not configured. Please contact support or try again later.")
                setGoogleLoading(false)
                return
            }

            console.log('🔵 Initiating Google Sign-Up...');
            const result = await signInWithPopup(auth, googleProvider)
            const user = result.user
            const idToken = await user.getIdToken()
            
            console.log('✅ Google authentication successful:', {
                uid: user.uid,
                email: user.email,
                name: user.displayName
            });

            // Sync with backend (with error handling)
            let response;
            try {
                response = await fetch(`${BASE_URL}/api/auth-sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName || "User",
                        pic: user.photoURL,
                        provider: 'google',
                        idToken: idToken
                    })
                });
            } catch (networkErr) {
                console.error('❌ Network error during auth sync:', networkErr);
                throw new Error('Network error. Please check your connection and try again.');
            }

            if (response.ok) {
                const backendUser = await response.json()
                console.log('✅ Backend sync successful:', {
                    id: backendUser.id || backendUser._id,
                    email: backendUser.email,
                    username: backendUser.username,
                    provider: backendUser.provider
                });

                // Store user data
                localStorage.setItem("userid", backendUser.id || backendUser._id)
                localStorage.setItem("name", backendUser.name)
                localStorage.setItem("login", "true")
                localStorage.setItem("role", backendUser.role || "User")
                localStorage.setItem("username", backendUser.username)
                localStorage.setItem("userToken", idToken)
                const safePic = getSafePicValue(backendUser.pic || user.photoURL)
                if (safePic) {
                    localStorage.setItem("pic", safePic)
                }
                notifyAuthChanged()
                
                toast.success("Welcome! Account created successfully!")
                navigate("/profile")
            } else {
                let backendMessage = "Backend sync failed. Please try again."
                try {
                    const errorData = await response.json()
                    backendMessage = errorData.message || backendMessage
                    console.error('❌ Backend error:', errorData);
                } catch (_) {}
                setGeneralError(backendMessage)
            }
        } catch (err) {
            logAuthFailure("Google Sign Up Error:", err)
            
            // Handle specific Google auth errors
            if (err.code === 'auth/popup-closed-by-user') {
                setGeneralError("Sign-up cancelled. Please try again.")
            } else if (err.code === 'auth/popup-blocked') {
                setGeneralError("Pop-up blocked. Please allow pop-ups and try again.")
            } else {
                setGeneralError(err.message || "Failed to sign up with Google")
            }
        } finally {
            setGoogleLoading(false)
        }
    }



    
    // --- STEP 1: SEND OTP ---
    async function handleSendOTP(e) {
        e.preventDefault();
        setGeneralError("");
        if (!termsAccepted) {
            setGeneralError("Please accept Terms & Conditions to continue");
            return;
        }
        // Validate all fields
        const nameError = !data.name ? "Name is required" : "";
        const emailError = validateEmail(data.email);
        const usernameError = !data.username ? "Username is required" : (usernameStatus === 'taken' ? "Username already taken" : "");
        const passwordError = validatePassword(data.password);
        const confirmError = validateConfirm(data.password, confirmPassword);

        setErrors({ name: nameError, email: emailError, username: usernameError, password: passwordError, confirm: confirmError });

        if (nameError || emailError || usernameError || passwordError || confirmError || usernameStatus === 'taken') {
            setGeneralError("Please fix all errors before proceeding");
            return;
        }

        setLoading(true);
        try {
            const res = await fastAPI('/api/send-otp', 'POST', { email: data.email, type: 'signup' });
            if (res.result === "Done") {
                setMasterStep('email_otp');
                setResendTimer(60); // Start 60 second timer
                setGeneralError("");
                toast.success("Verification code sent! Check your email.");
            } else {
                setGeneralError(res.message || "Failed to send OTP. Please try again.");
            }
        } catch (err) {
            setGeneralError(resolveOtpErrorMessage(err));
            console.error("Send OTP Error:", err);
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
            if (res?.id || res?._id) {
                toast.success("Account created! Welcome to Eshopper.");
                navigate("/login")
            } else {
                setGeneralError(res.message || "Incorrect verification code!");
            }
        } catch (err) {
            const status = err?.status
            const backendMessage = err?.data?.message || ""
            const backendError = err?.data?.error || ""
            const fallbackMessage = err?.message || ""
            const combinedMessage = `${backendMessage} ${backendError} ${fallbackMessage}`.trim()
            const lowerMessage = combinedMessage.toLowerCase()

            let duplicateField = ''
            const duplicateFieldMatch = String(backendError).match(/index:\s+([a-zA-Z0-9_]+)_1/i)
            if (duplicateFieldMatch?.[1]) {
                duplicateField = duplicateFieldMatch[1]
            }

            const duplicateMessage = duplicateField
                ? `${duplicateField} already exists. Please use a different ${duplicateField}.`
                : 'Email or username already exists. Please use different credentials.'

            const errorMsg = status === 400
                ? ((lowerMessage.includes('e11000') || lowerMessage.includes('duplicate key') || lowerMessage.includes('already exists'))
                    ? duplicateMessage
                    : (lowerMessage.includes('otp')
                        ? (backendMessage || fallbackMessage || "Incorrect verification code. Please try again.")
                        : (backendMessage || backendError || fallbackMessage || "Incorrect verification code. Please try again.")))
                : (status === 429
                    ? "Too many verification attempts. Please wait before retrying."
                    : (backendMessage || backendError || fallbackMessage || "Incorrect verification code or server error."))
            setGeneralError(errorMsg)
            console.error("Verify OTP Error:", err)
        }
        setLoading(false);
    }

    return (
        <div className="signup-master-root">
            <div className="luxury-bg-overlay"></div>
            <div className="luxury-orb orb-a" aria-hidden="true"></div>
            <div className="luxury-orb orb-b" aria-hidden="true"></div>
            <div className="luxury-grid" aria-hidden="true"></div>
            <div className="container d-flex align-items-center justify-content-center min-vh-100">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="glass-signup-card shadow-2xl">
                    <div className="signup-inner-box p-4 p-md-5 text-center">
                        
                        {/* 🔥 LOADING SPINNER OVERLAY */}
                        {(loading && !googleLoading) && (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }}
                                className="premium-spinner-overlay"
                            >
                                <Loader2 className="premium-spinner" size={48} />
                                <p className="spinner-text">Processing...</p>
                            </motion.div>
                        )}

                        {/* PROGRESS INDICATOR */}
                        <div className="progress-indicator mb-4">
                            <div className="progress-bar-container">
                                <div className={`progress-bar ${
                                    masterStep === 'phone_otp' || masterStep === 'email_otp' ? 'completed' : 'active'
                                }`}></div>
                            </div>
                            <div className="progress-text">
                                {masterStep === 'email_otp' ? 'Step 2 of 2' : 'Step 1 of 2'}
                            </div>
                        </div>

                        <div className="icon-badge-premium mb-4"><UserPlus size={30} className="text-info" /></div>
                        <h2 className="brand-title">ESHOPPER<span className="accent">.</span></h2>
                        <p className="step-indicator">
                            {masterStep === 'email_otp' ? "VERIFY EMAIL" : "CREATE ACCOUNT"}
                        </p>

                        <AnimatePresence mode="wait">
                            {masterStep === 'initial' && (
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
                                    
                                    {/* CONFIRM PASSWORD FIELD */}
                                    <div className="p-field mb-5">
                                        <label>CONFIRM PASSWORD</label>
                                        <div className="p-input-box">
                                            <Lock size={18}/>
                                            <input type={showPass ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                                            <button type="button" className="eye-btn" onClick={()=>setShowPass(!showPass)}>{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                                        </div>
                                        {errors.confirm && <p className="error-text mt-3"><AlertCircle size={14} /> {errors.confirm}</p>}
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
                                            I agree to the <button type="button" onClick={() => setShowTerms(true)} className="terms-link" style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>Terms & Conditions</button>
                                        </label>
                                    </div>
                                    {!termsAccepted && <p className="error-text terms-error-text"><AlertCircle size={12} /> Please accept the terms to continue</p>}
                                    
                                    <button type="submit" className="p-submit-btn shadow-lg" disabled={loading || googleLoading || usernameStatus === 'taken' || !termsAccepted}>{loading ? <Loader2 className="animate-spin mx-auto"/> : <>CREATE ACCOUNT <ArrowRight className="ml-2" size={18}/></>}</button>

                                    {/* DIVIDER */}
                                    <div className="luxury-divider my-4">
                                        <span>OR SIGN UP WITH</span>
                                    </div>

                                    {/* GOOGLE SIGN UP BUTTON */}
                                    <motion.button 
                                        type="button" 
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="google-signup-btn mt-3 shadow-lg" 
                                        onClick={handleGoogleSignUp}
                                        disabled={loading || googleLoading}
                                    >
                                        {googleLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Chrome size={16} className="mr-2" />}
                                        {googleLoading ? 'CONNECTING GOOGLE...' : 'SIGN UP WITH GOOGLE'}
                                    </motion.button>
                                </motion.form>
                            )}
                            
                            {masterStep === 'email_otp' && (
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
                        
                        {masterStep === 'initial' && <div className="mt-5"><Link to="/login" className="login-call-link">ALREADY A MEMBER? LOGIN</Link></div>}
                    </div>
                </motion.div>

                {/* 🔥 TERMS & CONDITIONS MODAL */}
                <Terms isOpen={showTerms} onClose={() => setShowTerms(false)} />
                
                {/* 🔥 RECAPTCHA CONTAINER - VISIBLE & PROPERLY POSITIONED */}
                <div 
                    id="recaptcha-container" 
                    style={{ 
                        position: 'fixed', 
                        bottom: '20px', 
                        right: '20px', 
                        zIndex: 9999,
                        visibility: (masterStep === 'phone_input' || masterStep === 'phone_otp') ? 'visible' : 'hidden',
                        opacity: (masterStep === 'phone_input' || masterStep === 'phone_otp') ? 1 : 0,
                        transition: 'all 0.3s ease',
                        pointerEvents: (masterStep === 'phone_input' || masterStep === 'phone_otp') ? 'auto' : 'none',
                        display: 'block !important'
                    }}
                    className="recaptcha-wrapper"
                ></div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap');

                .signup-master-root {
                    --lux-ink: #101419;
                    --lux-card: rgba(255, 252, 245, 0.92);
                    --lux-muted: #5c6670;
                    --lux-border: rgba(20, 26, 33, 0.12);
                    --lux-highlight: #0f766e;
                    --lux-gold: #b78628;
                    --lux-danger: #b91c1c;
                    --lux-success: #15803d;
                    position: relative;
                    min-height: 100vh;
                    overflow-x: hidden;
                    overflow-y: auto;
                    z-index: 1;
                    font-family: 'Manrope', sans-serif;
                    background:
                        radial-gradient(circle at 12% 14%, rgba(183, 134, 40, 0.25), transparent 42%),
                        radial-gradient(circle at 92% 82%, rgba(15, 118, 110, 0.24), transparent 38%),
                        linear-gradient(142deg, #0a1318 0%, #11202a 45%, #2b1e14 100%);
                    padding-top: env(safe-area-inset-top);
                    padding-right: env(safe-area-inset-right);
                    padding-bottom: env(safe-area-inset-bottom);
                    padding-left: env(safe-area-inset-left);
                }

                .luxury-bg-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(180deg, rgba(6, 10, 14, 0.3), rgba(6, 10, 14, 0.72));
                    pointer-events: none;
                    z-index: 0;
                }

                .luxury-orb {
                    position: absolute;
                    border-radius: 999px;
                    filter: blur(10px);
                    opacity: 0.55;
                    animation: floatOrb 12s ease-in-out infinite;
                    pointer-events: none;
                    z-index: 0;
                }

                .orb-a {
                    width: 320px;
                    height: 320px;
                    top: -118px;
                    right: -86px;
                    background: radial-gradient(circle at 30% 30%, rgba(255, 208, 122, 0.85), rgba(183, 134, 40, 0.08));
                }

                .orb-b {
                    width: 280px;
                    height: 280px;
                    bottom: -106px;
                    left: -96px;
                    animation-delay: 2.8s;
                    background: radial-gradient(circle at 65% 40%, rgba(120, 255, 240, 0.6), rgba(15, 118, 110, 0.06));
                }

                .luxury-grid {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    background-image:
                        linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
                    background-size: 34px 34px;
                    mask-image: radial-gradient(circle at center, #000 40%, transparent 90%);
                    opacity: 0.34;
                    pointer-events: none;
                }

                .container {
                    position: relative;
                    z-index: 2;
                }

                .signup-master-root .container.min-vh-100 {
                    min-height: 100vh !important;
                    padding: clamp(18px, 2.4vw, 28px) 14px;
                }

                .glass-signup-card {
                    position: relative;
                    width: 100%;
                    max-width: 500px;
                    background: var(--lux-card);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: 34px;
                    box-shadow: 0 30px 90px rgba(2, 8, 14, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.45);
                    backdrop-filter: blur(16px);
                    z-index: 2;
                }

                .signup-inner-box {
                    position: relative;
                    background: transparent;
                    border-radius: 34px;
                    z-index: 3;
                }

                .progress-indicator {
                    margin-bottom: 14px !important;
                }

                .icon-badge-premium {
                    margin-bottom: 0.9rem !important;
                }

                .brand-title {
                    margin-bottom: 0.35rem;
                }

                .step-indicator {
                    margin-bottom: 0;
                }

                .premium-spinner-overlay {
                    position: absolute;
                    inset: 0;
                    border-radius: 34px;
                    background: rgba(255, 252, 245, 0.95);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 20;
                }

                .premium-spinner {
                    color: var(--lux-highlight);
                    animation: rotate 1s linear infinite;
                }

                .spinner-text {
                    margin-top: 14px;
                    color: var(--lux-highlight);
                    letter-spacing: 1.8px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .progress-indicator {
                    margin-bottom: 18px;
                }

                .progress-bar-container {
                    height: 7px;
                    width: 100%;
                    background: rgba(31, 41, 55, 0.14);
                    border-radius: 999px;
                    overflow: hidden;
                }

                .progress-bar {
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(90deg, #0f766e, #b78628);
                    border-radius: 999px;
                    transition: width 0.4s ease;
                }

                .progress-bar.completed {
                    width: 100%;
                }

                .progress-text {
                    margin-top: 8px;
                    font-size: 0.68rem;
                    letter-spacing: 1.2px;
                    color: #58616c;
                    font-weight: 800;
                }

                .icon-badge-premium {
                    width: 62px;
                    height: 62px;
                    border-radius: 20px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(145deg, #111 0%, #273744 72%, #0f766e 100%);
                    color: #fff;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
                    animation: pulse 3s ease-in-out infinite;
                }

                .brand-title {
                    margin-bottom: 5px;
                    color: var(--lux-ink);
                    font-family: 'Playfair Display', serif;
                    font-size: clamp(1.85rem, 4.2vw, 2.25rem);
                    letter-spacing: 3px;
                    font-weight: 700;
                }

                .accent {
                    color: var(--lux-gold);
                }

                .step-indicator {
                    margin: 0;
                    color: var(--lux-muted);
                    font-size: 0.66rem;
                    letter-spacing: 2.8px;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .general-error-box {
                    background: #fff2f2;
                    border: 1px solid #fecaca;
                    border-radius: 12px;
                    color: var(--lux-danger);
                    padding: 11px 13px;
                    font-size: 0.78rem;
                    font-weight: 700;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .inline-mr {
                    flex-shrink: 0;
                }

                .p-field label {
                    display: block;
                    margin-bottom: 7px;
                    color: #2c3540;
                    font-size: 0.62rem;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    font-weight: 800;
                }

                .p-input-box {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    border: 1px solid var(--lux-border);
                    border-radius: 14px;
                    background: rgba(255, 255, 255, 0.88);
                    min-height: 50px;
                    padding: 8px 12px;
                    transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
                }

                .p-input-box:focus-within {
                    border-color: rgba(15, 118, 110, 0.65);
                    box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
                    transform: translateY(-1px);
                }

                .p-input-box input {
                    width: 100%;
                    border: 0;
                    outline: 0;
                    background: transparent;
                    color: var(--lux-ink);
                    font-size: 0.95rem;
                    font-weight: 650;
                }

                .p-input-box input::placeholder {
                    color: #95a1ad;
                }

                .eye-btn {
                    border: 0;
                    background: transparent;
                    color: #8995a3;
                    min-width: 32px;
                    min-height: 32px;
                    border-radius: 8px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: color 0.2s ease, background-color 0.2s ease;
                }

                .eye-btn:hover {
                    color: var(--lux-highlight);
                    background: rgba(15, 118, 110, 0.1);
                }

                .input-valid-icon {
                    color: var(--lux-success);
                    flex-shrink: 0;
                }

                .input-error-icon {
                    color: var(--lux-danger);
                    flex-shrink: 0;
                }

                .error-text,
                .success-text {
                    margin-top: 6px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.73rem;
                    font-weight: 700;
                }

                .error-text {
                    color: var(--lux-danger);
                }

                .success-text {
                    color: var(--lux-success);
                }

                .password-strength-bar {
                    margin-top: 9px;
                    padding: 10px;
                    border-radius: 10px;
                    background: rgba(31, 41, 55, 0.06);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .strength-indicator {
                    width: 65%;
                    height: 6px;
                    border-radius: 999px;
                    background: rgba(31, 41, 55, 0.16);
                }

                .strength-weak .strength-indicator {
                    background: linear-gradient(90deg, #ef4444, #dc2626);
                }

                .strength-medium .strength-indicator {
                    background: linear-gradient(90deg, #f59e0b, #d97706);
                }

                .strength-strong .strength-indicator {
                    background: linear-gradient(90deg, #22c55e, #15803d);
                }

                .strength-text {
                    font-size: 0.72rem;
                    font-weight: 800;
                }

                .strength-text.weak { color: #dc2626; }
                .strength-text.medium { color: #d97706; }
                .strength-text.strong { color: #15803d; }

                .password-requirements {
                    margin-top: 10px;
                    border-radius: 10px;
                    border-left: 3px solid rgba(183, 134, 40, 0.9);
                    background: rgba(183, 134, 40, 0.08);
                    padding: 10px 11px;
                }

                .req-item {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    margin-bottom: 6px;
                    font-size: 0.72rem;
                    color: #b42318;
                    font-weight: 700;
                }

                .req-item:last-child {
                    margin-bottom: 0;
                }

                .req-item.met {
                    color: var(--lux-success);
                }

                .terms-checkbox {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 9px;
                    font-size: 0.76rem;
                    color: #374151;
                    font-weight: 650;
                }

                .terms-checkbox label {
                    margin: 0;
                }

                .terms-error-text {
                    justify-content: center;
                    text-align: center;
                    width: 100%;
                    margin-bottom: 12px;
                    font-size: 0.72rem;
                }

                .terms-link {
                    color: var(--lux-highlight);
                    border-bottom: 2px solid rgba(15, 118, 110, 0.45);
                    font-weight: 800;
                }

                .terms-link:hover {
                    color: #0d5f59;
                }

                .p-submit-btn {
                    width: 100%;
                    border: 0;
                    border-radius: 16px;
                    padding: 15px 17px;
                    margin-top: 2px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-size: 0.79rem;
                    font-weight: 800;
                    letter-spacing: 1.7px;
                    text-transform: uppercase;
                    color: #f6f8fa;
                    background: linear-gradient(132deg, #16212a, #0f766e 55%, #b78628);
                    box-shadow: 0 14px 28px rgba(15, 118, 110, 0.28);
                    transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease;
                }

                .p-submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 18px 34px rgba(15, 118, 110, 0.35);
                    filter: brightness(1.04);
                }

                .p-submit-btn:disabled {
                    opacity: 0.72;
                    cursor: not-allowed;
                }

                .luxury-divider {
                    position: relative;
                    text-align: center;
                    margin: 22px 0 14px;
                }

                .luxury-divider::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 0;
                    width: 100%;
                    height: 1px;
                    background: linear-gradient(90deg, transparent 0%, rgba(44, 53, 64, 0.25) 15%, rgba(44, 53, 64, 0.25) 85%, transparent 100%);
                }

                .luxury-divider span {
                    position: relative;
                    z-index: 1;
                    background: rgba(255, 252, 245, 0.95);
                    padding: 0 12px;
                    color: #6a727b;
                    font-size: 0.63rem;
                    letter-spacing: 1.9px;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .google-signup-btn {
                    width: 100%;
                    border-radius: 14px;
                    padding: 13px 16px;
                    border: 1px solid #dce1e6;
                    background: #fff;
                    color: #1f2328;
                    font-weight: 700;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    box-shadow: 0 10px 22px rgba(17, 24, 39, 0.08);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }

                .google-signup-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 14px 26px rgba(17, 24, 39, 0.12);
                }

                .google-signup-btn:disabled {
                    opacity: 0.74;
                    cursor: not-allowed;
                }

                .p-otp-input {
                    width: 100%;
                    border: 1px solid var(--lux-border);
                    border-radius: 16px;
                    text-align: center;
                    background: rgba(255, 255, 255, 0.92);
                    outline: 0;
                    font-size: clamp(1.9rem, 7vw, 2.65rem);
                    letter-spacing: 0.42rem;
                    font-weight: 800;
                    color: #1e293b;
                    padding: 10px 12px;
                }

                .p-otp-input:focus {
                    border-color: rgba(15, 118, 110, 0.7);
                    box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.13);
                }

                .resend-otp-btn {
                    border: 1px solid rgba(15, 118, 110, 0.45);
                    color: #0f766e;
                    border-radius: 12px;
                    background: rgba(15, 118, 110, 0.08);
                    padding: 10px 14px;
                    font-size: 0.74rem;
                    font-weight: 800;
                    letter-spacing: 1px;
                    transition: all 0.2s ease;
                }

                .resend-otp-btn:hover:not(:disabled) {
                    background: #0f766e;
                    color: #fff;
                }

                .resend-otp-btn:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

                .verify-title {
                    color: var(--lux-ink);
                    font-family: 'Playfair Display', serif;
                    font-size: 1.6rem;
                    margin-bottom: 10px;
                }

                .verify-text {
                    color: #5f6871;
                    font-size: 0.79rem;
                }

                .verify-email {
                    color: #1f2937;
                    font-size: 0.9rem;
                }

                .verify-help-text {
                    color: #68727e;
                    font-size: 0.72rem;
                }

                .login-call-link {
                    color: #14202b;
                    text-decoration: none;
                    font-size: 0.76rem;
                    font-weight: 800;
                    letter-spacing: 1.1px;
                    border-bottom: 2px solid rgba(183, 134, 40, 0.7);
                }

                .login-call-link:hover {
                    color: var(--lux-highlight);
                    border-bottom-color: var(--lux-highlight);
                }

                .back-to-form {
                    border: 1px solid rgba(15, 118, 110, 0.45);
                    border-radius: 12px;
                    background: rgba(15, 118, 110, 0.08);
                    color: #0f766e;
                    font-size: 0.73rem;
                    font-weight: 800;
                    padding: 8px 12px;
                }

                .pulse-anim {
                    animation: pulse 2s ease-in-out infinite;
                }

                #recaptcha-container {
                    display: block !important;
                }

                .recaptcha-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                @keyframes rotate {
                    to { transform: rotate(360deg); }
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.07); }
                }

                @keyframes floatOrb {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-14px) scale(1.06); }
                }

                @media (max-width: 1024px) {
                    .signup-master-root .container.min-vh-100 {
                        padding: 18px 12px;
                    }

                    .glass-signup-card {
                        max-width: 480px;
                    }

                    .signup-inner-box {
                        padding: 1.7rem 1.4rem !important;
                    }
                }

                @media (min-width: 1440px) {
                    .signup-master-root .container.min-vh-100 {
                        padding-top: 30px;
                        padding-bottom: 30px;
                    }

                    .glass-signup-card {
                        max-width: 520px;
                    }

                    .signup-inner-box {
                        padding: 2rem 1.7rem !important;
                    }
                }

                @media (max-width: 767px) {
                    .signup-master-root {
                        padding: 20px 14px;
                        min-height: 100svh;
                    }

                    .signup-master-root .container.min-vh-100 {
                        min-height: 100svh !important;
                        align-items: flex-start !important;
                        padding-top: 14px;
                        padding-bottom: 14px;
                    }

                    .glass-signup-card {
                        max-width: 100%;
                        border-radius: 26px;
                        max-height: none;
                        overflow: visible;
                    }

                    .signup-inner-box {
                        padding: 1.65rem 1.1rem !important;
                    }

                    .brand-title {
                        letter-spacing: 2.2px;
                    }

                    .step-indicator {
                        letter-spacing: 2.2px;
                    }

                    .p-submit-btn,
                    .google-signup-btn,
                    .resend-otp-btn {
                        min-height: 48px;
                    }

                    .signup-inner-box .mt-5,
                    .signup-inner-box .mb-5 {
                        margin-top: 0.9rem !important;
                        margin-bottom: 0.9rem !important;
                    }
                }

                @media (max-width: 420px) {
                    .signup-master-root {
                        padding: 10px 8px;
                    }

                    .signup-master-root .container.min-vh-100 {
                        padding-top: 8px;
                        padding-bottom: 8px;
                    }

                    .glass-signup-card {
                        border-radius: 22px;
                        max-height: none;
                    }

                    .signup-inner-box {
                        padding: 0.9rem 0.7rem !important;
                    }

                    .icon-badge-premium {
                        width: 54px;
                        height: 54px;
                    }

                    .brand-title {
                        font-size: 1.55rem;
                    }

                    .step-indicator {
                        font-size: 0.59rem;
                    }

                    .p-field label {
                        font-size: 0.57rem;
                        letter-spacing: 1.6px;
                    }

                    .error-text,
                    .success-text,
                    .verify-help-text,
                    .terms-checkbox,
                    .login-call-link {
                        font-size: 0.68rem;
                    }

                    .password-requirements,
                    .password-strength-bar {
                        padding: 8px;
                        margin-top: 6px;
                    }

                    .req-item {
                        margin-bottom: 4px;
                    }

                    .progress-text {
                        font-size: 0.62rem;
                    }
                }

                @media (max-width: 360px) {
                    .password-requirements {
                        display: none;
                    }

                    .luxury-divider {
                        margin: 14px 0 10px;
                    }
                }

                @media (max-height: 520px) and (orientation: landscape) {
                    .signup-master-root {
                        padding: 14px;
                    }

                    .signup-master-root .container.min-vh-100 {
                        align-items: flex-start !important;
                        min-height: auto !important;
                    }

                    .glass-signup-card {
                        max-height: none;
                        overflow: visible;
                    }

                    .signup-inner-box {
                        padding-top: 1rem !important;
                        padding-bottom: 1rem !important;
                    }

                    .icon-badge-premium {
                        margin-bottom: 0.65rem !important;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .luxury-orb,
                    .icon-badge-premium,
                    .premium-spinner,
                    .pulse-anim {
                        animation: none !important;
                    }

                    .p-input-box,
                    .p-submit-btn,
                    .google-signup-btn,
                    .resend-otp-btn,
                    .eye-btn {
                        transition: none !important;
                    }
                }
            `}} />
        </div>
    )
}