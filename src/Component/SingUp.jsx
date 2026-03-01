import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { sendOtpAPI, createUserAPI } from '../Store/Services'
import { BASE_URL } from '../constants'
import { ShieldCheck, User, Mail, Lock, Loader2, ArrowRight, UserPlus, Eye, EyeOff, CheckCircle, AlertCircle, Phone, Chrome } from 'lucide-react'
import { signInWithPopup, signInWithPhoneNumber } from 'firebase/auth'
import { auth, googleProvider, setUpRecaptcha } from '../firebase'
import Terms from './Terms'

export default function SingUp() {
    // ============ MASTER STEP STATE - CONTROLS ALL UI ============
    // 'initial' = email form | 'phone_input' = phone number | 'phone_otp' = verify OTP | 'email_otp' = verify email
    const [masterStep, setMasterStep] = useState('initial')
    
    // ============ EMAIL SIGNUP STATES ============
    const [data, setdata] = useState({ name: "", email: "", username: "", password: "" })
    const [loading, setLoading] = useState(false)
    const [showPass, setShowPass] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    
    const [errors, setErrors] = useState({ name: "", email: "", username: "", password: "" })
    const [usernameStatus, setUsernameStatus] = useState(null)
    const [checkingUsername, setCheckingUsername] = useState(false)
    const [generalError, setGeneralError] = useState("")
    
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [resendTimer, setResendTimer] = useState(0)
    const [passwordStrength, setPasswordStrength] = useState(null)
    const [showTerms, setShowTerms] = useState(false)
    
    // ============ PHONE SIGNUP STATES ============
    const [phoneNumber, setPhoneNumber] = useState("")
    const [phoneOtp, setPhoneOtp] = useState("")
    const [phoneLoading, setPhoneLoading] = useState(false)
    const [recaptchaReady, setRecaptchaReady] = useState(false)
    const [recaptchaError, setRecaptchaError] = useState(null)
    
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

    // 🔥 INITIALIZE RECAPTCHA WHEN PHONE MODE ACTIVATES
    // ============ RECAPTCHA INITIALIZATION - MASTER EFFECT ============
    useEffect(() => {
        // Only initialize when entering phone_input step
        if (masterStep === 'phone_input' && !recaptchaReady && !recaptchaError) {
            console.log('🔄 [EFFECT] Initializing reCAPTCHA for phone auth...')
            
            const initTimer = setTimeout(() => {
                try {
                    // Verify container exists in DOM
                    const container = document.getElementById('recaptcha-container')
                    if (!container) {
                        console.error('❌ [RECAPTCHA] Container #recaptcha-container not found in DOM')
                        setRecaptchaError('Container not found')
                        return
                    }

                    console.log('✓ [RECAPTCHA] Container found in DOM')

                    // Clear any existing verifier
                    if (window.recaptchaVerifier) {
                        try {
                            window.recaptchaVerifier.clear()
                            console.log('🧹 [RECAPTCHA] Cleared existing verifier')
                        } catch (e) {
                            console.warn('⚠️ Cleanup warning:', e.message)
                        }
                        window.recaptchaVerifier = null
                    }
                    
                    // Setup new verifier
                    console.log('⚙️ [RECAPTCHA] Calling setUpRecaptcha...')
                    const verifier = setUpRecaptcha('recaptcha-container')
                    
                    if (verifier) {
                        setRecaptchaReady(true)
                        setRecaptchaError(null)
                        console.log('✅ [RECAPTCHA] Ready for phone authentication')
                    } else {
                        throw new Error('setUpRecaptcha returned null')
                    }
                } catch (error) {
                    console.error('❌ [RECAPTCHA] Setup failed:', error.message)
                    setRecaptchaError(error.message || 'reCAPTCHA init failed')
                    setRecaptchaReady(false)
                }
            }, 300)
            
            return () => clearTimeout(initTimer)
        }

        // Cleanup when leaving phone mode
        if (masterStep !== 'phone_input' && masterStep !== 'phone_otp') {
            if (window.recaptchaVerifier) {
                try {
                    console.log('🧹 [CLEANUP] Cleaning up reCAPTCHA on mode switch')
                    window.recaptchaVerifier.clear()
                    window.recaptchaVerifier = null
                    setRecaptchaReady(false)
                    setRecaptchaError(null)
                } catch (e) {
                    console.warn('⚠️ Cleanup error:', e.message)
                }
            }
        }
    }, [masterStep, recaptchaReady, recaptchaError])

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

    // ========== FIREBASE GOOGLE SIGN UP ==========
    async function handleGoogleSignUp() {
        setLoading(true)
        setGeneralError("")
        try {
            if (!auth || !googleProvider) {
                setGeneralError("Google sign-up is not configured. Please contact support or try again later.")
                setLoading(false)
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

            // Sync with backend
            const response = await fetch(`${BASE_URL}/api/auth-sync`, {
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
            })

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
                
                alert("Welcome! Account created successfully!")
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
            console.error("❌ Google Sign Up Error:", err)
            
            // Handle specific Google auth errors
            if (err.code === 'auth/popup-closed-by-user') {
                setGeneralError("Sign-up cancelled. Please try again.")
            } else if (err.code === 'auth/popup-blocked') {
                setGeneralError("Pop-up blocked. Please allow pop-ups and try again.")
            } else {
                setGeneralError(err.message || "Failed to sign up with Google")
            }
        } finally {
            setLoading(false)
        }
    }

    // 🔥 REFACTORED: Step 1 - Send Phone OTP
    async function handlePhoneSendOTP(e) {
        e.preventDefault()
        
        if (phoneLoading) return
        
        setPhoneLoading(true)
        setGeneralError("")
        
        try {
            if (!auth) {
                throw new Error("Firebase not initialized")
            }

            // Validate and format phone input
            let formattedPhone = phoneNumber.trim().replace(/\s/g, '')
            
            // Auto-append +91 for India if no country code
            if (formattedPhone && !formattedPhone.startsWith('+')) {
                if (/^\d{10}$/.test(formattedPhone)) {
                    formattedPhone = '+91' + formattedPhone
                } else if (/^\d+$/.test(formattedPhone)) {
                    formattedPhone = '+91' + formattedPhone
                }
            }

            // Validate format
            const phoneRegex = /^\+[1-9]\d{1,14}$/
            if (!phoneRegex.test(formattedPhone)) {
                throw new Error("Invalid format. Use +91XXXXXXXXXX (India) or +1234567890 (international)")
            }

            console.log('📞 Sending OTP to:', formattedPhone);

            // Ensure reCAPTCHA is ready
            if (!window.recaptchaVerifier) {
                console.warn('⚠️ reCAPTCHA not initialized, attempting setup...')
                const verifier = setUpRecaptcha('recaptcha-container')
                if (!verifier) {
                    throw new Error("reCAPTCHA failed to initialize. Please refresh and try again.")
                }
                // Wait for verifier to be ready
                await new Promise(resolve => setTimeout(resolve, 500))
            }

            if (!window.recaptchaVerifier) {
                throw new Error("reCAPTCHA verifier not available")
            }

            // Send SMS
            console.log('🔐 Calling signInWithPhoneNumber...')
            const confirmationResult = await signInWithPhoneNumber(
                auth,
                formattedPhone,
                window.recaptchaVerifier
            );
            
            if (!confirmationResult || !confirmationResult.verificationId) {
                throw new Error('Failed to send verification code');
            }

            // ✅ Store confirmation globally
            window.confirmationResult = confirmationResult;
            
            console.log('✅ OTP sent successfully, verificationId:', confirmationResult.verificationId);
            setMasterStep('phone_otp'); // Move to OTP input
            alert("Verification code sent! Check your messages.");
            
        } catch (err) {
            console.error("❌ Phone OTP Error:", err);
            
            if (err.code === 'auth/invalid-phone-number') {
                setGeneralError("Invalid phone number. Use format: +1234567890");
            } else if (err.code === 'auth/too-many-requests') {
                setGeneralError("Too many attempts. Try again later.");
            } else if (err.code === 'auth/captcha-check-failed') {
                setGeneralError("Verification failed. Please refresh and try again.");
            } else {
                setGeneralError(err.message || "Failed to send code. Please check your number.");
            }
            
            // Reset reCAPTCHA
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                    window.recaptchaVerifier = null;
                    setRecaptchaReady(false);
                } catch (e) {
                    console.warn('Cleanup error:', e);
                }
            }
        } finally {
            setPhoneLoading(false)
        }
    }

    // 🔥 REFACTORED: Step 2 - Verify Phone OTP
    async function handlePhoneOtpVerify(e) {
        e.preventDefault()
        setPhoneLoading(true)
        setGeneralError("")

        try {
            if (!window.confirmationResult) {
                throw new Error("Session expired. Please request a new code.");
            }

            if (!phoneOtp || phoneOtp.length !== 6) {
                throw new Error("Please enter a valid 6-digit code");
            }
            
            console.log('🔐 Verifying OTP...');

            // Verify OTP
            const result = await window.confirmationResult.confirm(phoneOtp);
            
            if (!result || !result.user) {
                throw new Error('Verification failed');
            }
            
            const user = result.user;
            console.log('✅ Phone verified:', user.phoneNumber);

            const idToken = await user.getIdToken();

            // Sync with backend
            const response = await fetch(`${BASE_URL}/api/auth-sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    uid: user.uid,
                    phone: user.phoneNumber,
                    provider: 'phone',
                    idToken: idToken
                })
            })

            if (response.ok) {
                const backendUser = await response.json()
                localStorage.setItem("userid", backendUser.id || backendUser._id)
                localStorage.setItem("name", backendUser.name || "User")
                localStorage.setItem("login", "true")
                localStorage.setItem("role", backendUser.role || "User")
                localStorage.setItem("username", backendUser.username)
                localStorage.setItem("userToken", idToken)
                
                alert("Welcome! Phone verification successful!")
                navigate("/profile")
            } else {
                const errorData = await response.json()
                throw new Error(errorData.message || "Backend sync failed")
            }
        } catch (err) {
            console.error("❌ Phone Verify Error:", err)
            setGeneralError(err.message || "Invalid code. Please try again.")
        } finally {
            setPhoneLoading(false)
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
                setMasterStep('email_otp');
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
                        
                        {/* 🔥 LOADING SPINNER OVERLAY */}
                        {(loading || phoneLoading) && (
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
                                {masterStep === 'phone_input' ? 'Phone Verification - Step 1 of 2' :
                                 masterStep === 'phone_otp' ? 'Phone Verification - Step 2 of 2' :
                                 masterStep === 'email_otp' ? 'Step 2 of 2' : 'Step 1 of 2'}
                            </div>
                        </div>

                        <div className="icon-badge-premium mb-4"><UserPlus size={30} className="text-info" /></div>
                        <h2 className="brand-title">ESHOPPER<span className="accent">.</span></h2>
                        <p className="step-indicator">
                            {masterStep === 'phone_input' || masterStep === 'phone_otp' ? "PHONE VERIFICATION" :
                             masterStep === 'email_otp' ? "VERIFY EMAIL" : "CREATE ACCOUNT"}
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
                                    {!termsAccepted && <p className="error-text" style={{fontSize: '11px', marginBottom: '16px'}}><AlertCircle size={12} /> Please accept the terms to continue</p>}
                                    
                                    <button type="submit" className="p-submit-btn shadow-lg" disabled={loading || usernameStatus !== 'available' || !termsAccepted}>{loading ? <Loader2 className="animate-spin mx-auto"/> : <>CREATE ACCOUNT <ArrowRight className="ml-2" size={18}/></>}</button>

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
                                        disabled={loading}
                                    >
                                        <Chrome size={16} className="mr-2" /> SIGN UP WITH GOOGLE
                                    </motion.button>

                                    {/* PHONE SIGN UP BUTTON */}
                                    <motion.button 
                                        type="button" 
                                        whileHover={{ scale: loading ? 1 : 1.02 }}
                                        whileTap={{ scale: loading ? 1 : 0.98 }}
                                        className="phone-signup-btn mt-2 shadow-lg" 
                                        onClick={() => {
                                            console.log('📱 [CLICK] PHONE button clicked - Setting masterStep to phone_input')
                                            if (!auth) {
                                                alert('Firebase not initialized. Refresh.')
                                                return
                                            }
                                            setGeneralError("")
                                            setRecaptchaError(null)
                                            setPhoneNumber("")
                                            setPhoneOtp("")
                                            setMasterStep('phone_input') // 🔥 FORCE STATE CHANGE
                                        }}
                                        disabled={loading}
                                        style={{ pointerEvents: loading ? 'none' : 'auto' }}
                                    >
                                        <Phone size={16} className="mr-2" /> SIGN UP WITH PHONE
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
                            
                            {masterStep === 'phone_input' && (
                                <motion.form key="f3" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} onSubmit={handlePhoneSendOTP} className="text-center mt-4">
                                        {generalError && (
                                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="general-error-box mb-4">
                                                <AlertCircle size={18} />
                                                {generalError}
                                            </motion.div>
                                        )}
                                        
                                        <Phone size={60} className="text-info mx-auto mb-3 pulse-anim" />
                                        <h3 className="verify-title">Enter Your Phone Number</h3>
                                        <p className="verify-text mb-4">We'll send you a verification code</p>
                                        
                                        <div className="p-field mb-4">
                                            <label>PHONE NUMBER</label>
                                            <div className="p-input-box">
                                                <Phone size={18}/>
                                                <input 
                                                    type="tel" 
                                                    placeholder="9876543210 (India)" 
                                                    value={phoneNumber} 
                                                    onChange={e => setPhoneNumber(e.target.value.replace(/[^\d+]/g, ''))} 
                                                    required
                                                    disabled={phoneLoading}
                                                    autoFocus
                                                />
                                            </div>
                                            <p className="verify-text" style={{fontSize: '11px', marginTop: '8px', color: '#666'}}>
                                                ✓ Enter 10-digit (auto-appends +91) or full format: +1234567890<br/>
                                                Examples: 9876543210 (India), +14155552671 (USA)
                                            </p>
                                        </div>
                                        
                                        <button 
                                            type="submit" 
                                            className="p-submit-btn mb-3" 
                                            disabled={phoneLoading || !phoneNumber.trim() || phoneNumber.length < 10}
                                        >
                                            {phoneLoading ? <Loader2 className="animate-spin mx-auto"/> : "SEND VERIFICATION CODE"}
                                        </button>
                                        
                                        <button 
                                            type="button" 
                                            className="back-to-form" 
                                            onClick={() => {
                                                setMasterStep('initial');
                                                setPhoneNumber("");
                                                setPhoneOtp("");
                                                setGeneralError("");
                                                window.confirmationResult = null;
                                            }}
                                            disabled={phoneLoading}
                                        >
                                            ← Back to Email Signup
                                        </button>
                                    </motion.form>
                            )}
                            
                            {masterStep === 'phone_otp' && (
                                <motion.form key="f4" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} onSubmit={handlePhoneOtpVerify} className="text-center mt-4">
                                        {generalError && (
                                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="general-error-box mb-4">
                                                <AlertCircle size={18} />
                                                {generalError}
                                            </motion.div>
                                        )}
                                        
                                        <ShieldCheck size={60} className="text-info mx-auto mb-3 pulse-anim" />
                                        <h3 className="verify-title">Enter Verification Code</h3>
                                        <p className="verify-text mb-2">Code sent to:</p>
                                        <p className="verify-email mb-5"><b>{phoneNumber}</b></p>
                                        
                                        <div className="p-field mb-4">
                                            <label>6-DIGIT CODE</label>
                                            <input 
                                                type="text" 
                                                maxLength="6" 
                                                placeholder="000000" 
                                                className="p-otp-input" 
                                                value={phoneOtp} 
                                                onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, ''))} 
                                                required
                                                autoFocus
                                            />
                                        </div>
                                        
                                        <button type="submit" className="p-submit-btn mb-3" disabled={phoneLoading || phoneOtp.length !== 6}>
                                            {phoneLoading ? <Loader2 className="animate-spin mx-auto"/> : "VERIFY & SIGN UP"}
                                        </button>
                                        
                                        <button 
                                            type="button" 
                                            className="resend-otp-btn" 
                                            onClick={() => {
                                                setMasterStep('phone_input');
                                                setPhoneOtp("");
                                                setGeneralError("");
                                                window.confirmationResult = null;
                                            }}
                                        >
                                            ← Change Phone Number
                                        </button>
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
                .signup-master-root { position: relative; min-height: 100vh; background: url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80') center/cover; overflow: hidden; z-index: 1; }
                .luxury-bg-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(15,23,42,0.9); backdrop-filter: blur(10px); z-index: 0; }
                .glass-signup-card { position: relative; width: 100%; max-width: 500px; background: rgba(255, 255, 255, 0.95); border-radius: 40px; box-shadow: 0 30px 90px rgba(0,0,0,0.4); z-index: 10; }
                .signup-inner-box { background: white; border-radius: 40px; position: relative; z-index: 20; }
                
                /* 🔥 PREMIUM SPINNER OVERLAY */
                .premium-spinner-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.98);
                    border-radius: 40px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(5px);
                }
                .premium-spinner {
                    animation: spin 1s linear infinite;
                    color: #17a2b8;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spinner-text {
                    margin-top: 20px;
                    font-size: 14px;
                    font-weight: 700;
                    color: #17a2b8;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }
                
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

                /* GOOGLE & PHONE BUTTONS */
                .google-signup-btn { width: 100%; background: linear-gradient(135deg, #db4437, #ea4335); color: white; border: none; padding: 14px; border-radius: 20px; font-weight: 700; font-size: 11px; letter-spacing: 1.5px; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; }
                .google-signup-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(234, 67, 53, 0.3); }
                .google-signup-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                .phone-signup-btn { width: 100%; background: linear-gradient(135deg, #4caf50, #45a049); color: white; border: none; padding: 14px; border-radius: 20px; font-weight: 700; font-size: 11px; letter-spacing: 1.5px; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; }
                .phone-signup-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(76, 175, 80, 0.3); }
                .phone-signup-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                /* DIVIDER */
                .luxury-divider { position: relative; text-align: center; margin: 25px 0; z-index: 1; }
                .luxury-divider::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #ddd; }
                .luxury-divider span { background: white; padding: 0 12px; position: relative; font-size: 10px; color: #999; font-weight: 700; letter-spacing: 1.5px; }
                
                /* PHONE UI - ALWAYS ON TOP */
                #phone-ui { position: relative; z-index: 100; }
                
                .p-otp-input { width: 100%; text-align: center; font-size: 3rem; font-weight: 800; letter-spacing: 15px; border: none; background: transparent; outline: none; border-bottom: 3px solid #17a2b8; padding: 10px 0; }
                
                .login-call-link { color: #111; font-weight: 800; text-decoration: none; border-bottom: 2px solid #17a2b8; }
                .back-to-form { background: transparent; border: 2px solid #17a2b8; color: #17a2b8; padding: 10px 16px; border-radius: 15px; font-size: 11px; font-weight: 700; cursor: pointer; transition: 0.3s; }
                .back-to-form:hover { background: #17a2b8; color: white; }
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
                
                
                /* === ✨ PREMIUM ANIMATIONS === */
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                }
                
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }
                
                .pulse-anim { animation: pulse 2s ease-in-out infinite; }
                
                .icon-badge-premium {
                    animation: pulse 3s ease-in-out infinite;
                    transition: all 0.3s ease;
                }
                
                .icon-badge-premium:hover {
                    transform: rotate(10deg) scale(1.1);
                }
                
                .p-submit-btn {
                    position: relative;
                    overflow: hidden;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                
                .p-submit-btn::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 0;
                    height: 0;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.3);
                    transform: translate(-50%, -50%);
                    transition: width 0.6s, height 0.6s;
                }
                
                .p-submit-btn:hover::before {
                    width: 400px;
                    height: 400px;
                }
                
                .p-submit-btn:active {
                    transform: scale(0.98);
                }
                
                .p-input-box {
                    transition: all 0.3s ease;
                }
                
                .p-input-box:focus-within {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(23,162,184,0.15);
                }
                
                .progress-bar {
                    transition: width 0.5s cubic-bezier(0.65, 0, 0.35, 1);
                }
                
                /* === 📱 PREMIUM FULL RESPONSIVE DESIGN === */
                
                /* 🔥 RECAPTCHA CONTAINER - CRITICAL FIXES */
                #recaptcha-container {
                    display: block !important;
                    visibility: visible !important;
                }
                
                .recaptcha-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                /* Extra Large Devices (1200px and up) */
                @media (min-width: 1200px) {
                    .glass-signup-card { 
                        max-width: 550px;
                        padding: 0;
                        box-shadow: 0 50px 120px rgba(0,0,0,0.5);
                    }
                    .signup-inner-box { padding: 70px 50px !important; }
                    .brand-title { font-size: 2rem; letter-spacing: 5.5px; }
                    .icon-badge-premium { width: 65px; height: 65px; }
                    .p-input-box input { font-size: 16px; }
                    .p-submit-btn { font-size: 13px; padding: 18px; }
                }
                
                /* Large Devices (992px to 1199px) */
                @media (max-width: 1199px) and (min-width: 992px) {
                    .glass-signup-card { max-width: 520px; }
                    .signup-inner-box { padding: 60px 45px !important; }
                    .brand-title { font-size: 1.9rem; letter-spacing: 5.2px; }
                    .p-input-box { padding: 12px 16px; }
                }
                
                /* Medium Devices - Tablets (768px to 991px) */
                @media (max-width: 991px) and (min-width: 768px) {
                    .glass-signup-card { 
                        max-width: 500px;
                        border-radius: 35px;
                    }
                    .signup-inner-box { padding: 50px 38px !important; }
                    .brand-title { font-size: 1.75rem; letter-spacing: 4.8px; }
                    .step-indicator { font-size: 9.5px; letter-spacing: 2.3px; }
                    .icon-badge-premium { width: 58px; height: 58px; }
                    .p-field label { font-size: 9.5px; }
                    .p-input-box { padding: 11px 15px; border-radius: 14px; }
                    .p-input-box input { font-size: 15px; }
                    .p-submit-btn { padding: 16px; font-size: 12px; }
                    .progress-indicator { margin-bottom: 22px !important; }
                    .password-requirements { padding: 13px; }
                }
                
                /* Small Tablets & Large Phones (576px to 767px) */
                @media (max-width: 767px) and (min-width: 576px) {
                    .signup-master-root { padding: 25px 15px; }
                    .glass-signup-card { 
                        max-width: 93%;
                        border-radius: 32px;
                    }
                    .signup-inner-box { padding: 45px 32px !important; }
                    .icon-badge-premium { width: 56px; height: 56px; border-radius: 16px; }
                    .brand-title { font-size: 1.6rem; letter-spacing: 4.3px; }
                    .step-indicator { font-size: 9px; letter-spacing: 2.2px; }
                    .progress-indicator { margin-bottom: 20px !important; }
                    .progress-text { font-size: 11px; }
                    .p-field { margin-bottom: 18px !important; }
                    .p-field label { font-size: 9px; letter-spacing: 1.7px; }
                    .p-input-box { padding: 10px 14px; border-radius: 13px; }
                    .p-input-box input { font-size: 14.5px; }
                    .p-input-box svg { width: 17px; height: 17px; }
                    .p-submit-btn { padding: 15px; font-size: 11.5px; border-radius: 42px; }
                    .password-requirements { padding: 12px; border-radius: 12px; }
                    .req-item { font-size: 11.5px; }
                    .terms-checkbox { font-size: 12.5px; }
                    .error-text { font-size: 11.5px; }
                    .success-text { font-size: 11.5px; }
                    .p-otp-input { font-size: 2.8rem; letter-spacing: 14px; }
                    .verify-title { font-size: 1.4rem; }
                }
                
                /* Standard Mobile (480px to 575px) */
                @media (max-width: 575px) and (min-width: 480px) {
                    .signup-master-root { padding: 22px 15px; }
                    .glass-signup-card { 
                        max-width: 94%;
                        border-radius: 28px;
                        box-shadow: 0 25px 70px rgba(0,0,0,0.35);
                    }
                    .signup-inner-box { padding: 40px 26px !important; }
                    .icon-badge-premium { width: 54px; height: 54px; border-radius: 15px; }
                    .brand-title { font-size: 1.5rem; letter-spacing: 4px; }
                    .step-indicator { font-size: 8.5px; letter-spacing: 2px; }
                    .progress-indicator { margin-bottom: 18px !important; }
                    .progress-bar-container { height: 5px; }
                    .progress-text { font-size: 10.5px; }
                    .p-field { margin-bottom: 16px !important; }
                    .p-field label { font-size: 8.5px; letter-spacing: 1.6px; }
                    .p-input-box { padding: 10px 14px; border-radius: 12px; }
                    .p-input-box input { font-size: 14px; }
                    .p-input-box svg { width: 17px; height: 17px; }
                    .p-submit-btn { padding: 14px; font-size: 11px; letter-spacing: 1.2px; border-radius: 40px; }
                    .password-requirements { padding: 11px; border-radius: 11px; }
                    .req-item { font-size: 11px; }
                    .terms-checkbox { font-size: 12px; }
                    .terms-checkbox input[type="checkbox"] { width: 17px; height: 17px; }
                    .error-text { font-size: 11px; }
                    .success-text { font-size: 11px; }
                    .general-error-box { padding: 11px 13px; font-size: 11.5px; }
                    .resend-otp-btn { padding: 10px 16px; font-size: 12px; }
                    .p-otp-input { font-size: 2.6rem; letter-spacing: 13px; padding: 14px; }
                    .verify-title { font-size: 1.35rem; }
                    .verify-text { font-size: 12px; }
                    .verify-email { font-size: 13px; }
                }
                
                /* Compact Mobile (375px to 479px) */
                @media (max-width: 479px) and (min-width: 375px) {
                    .signup-master-root { padding: 18px 12px; }
                    .glass-signup-card { 
                        max-width: 95%;
                        border-radius: 25px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    }
                    .signup-inner-box { padding: 36px 22px !important; }
                    .icon-badge-premium { width: 52px; height: 52px; border-radius: 14px; }
                    .icon-badge-premium svg { width: 28px; height: 28px; }
                    .brand-title { font-size: 1.4rem; letter-spacing: 3.5px; }
                    .step-indicator { font-size: 8px; letter-spacing: 1.8px; }
                    .progress-indicator { margin-bottom: 16px !important; }
                    .progress-bar-container { height: 4px; }
                    .progress-text { font-size: 10px; }
                    .p-field { margin-bottom: 14px !important; }
                    .p-field label { font-size: 8px; letter-spacing: 1.5px; margin-bottom: 7px; }
                    .p-input-box { padding: 9px 13px; border-radius: 12px; }
                    .p-input-box input { font-size: 13.5px; }
                    .p-input-box svg { width: 16px; height: 16px; }
                    .p-submit-btn { padding: 13px; font-size: 10.5px; letter-spacing: 1px; border-radius: 38px; }
                    .password-requirements { padding: 10px; border-radius: 10px; }
                    .req-item { font-size: 10.5px; }
                    .req-item svg { width: 13px; height: 13px; }
                    .terms-checkbox { font-size: 11.5px; }
                    .terms-checkbox input[type="checkbox"] { width: 16px; height: 16px; }
                    .terms-link { font-size: 11.5px; }
                    .error-text { font-size: 10.5px; }
                    .success-text { font-size: 10.5px; }
                    .general-error-box { padding: 10px 12px; font-size: 11px; border-radius: 11px; }
                    .resend-otp-btn { padding: 9px 14px; font-size: 11.5px; border-radius: 13px; }
                    .p-otp-input { font-size: 2.5rem; letter-spacing: 12px; padding: 13px; }
                    .verify-title { font-size: 1.3rem; }
                    .verify-text { font-size: 11.5px; }
                    .verify-email { font-size: 12.5px; }
                    .verify-help-text { font-size: 11px; }
                }
                
                /* Extra Small Mobile (320px to 374px) */
                @media (max-width: 374px) {
                    .signup-master-root { 
                        padding: 15px 10px;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                    }
                    .glass-signup-card { 
                        max-width: 96%;
                        border-radius: 22px;
                        box-shadow: 0 15px 50px rgba(0,0,0,0.25);
                    }
                    .signup-inner-box { padding: 30px 18px !important; }
                    .icon-badge-premium { 
                        width: 48px; 
                        height: 48px; 
                        border-radius: 13px;
                        margin-bottom: 15px !important;
                    }
                    .icon-badge-premium svg { width: 26px; height: 26px; }
                    .brand-title { 
                        font-size: 1.25rem; 
                        letter-spacing: 3px;
                        margin-bottom: 5px;
                    }
                    .step-indicator { 
                        font-size: 7px; 
                        letter-spacing: 1.5px;
                        margin-bottom: 25px !important;
                    }
                    .progress-indicator { margin-bottom: 14px !important; }
                    .progress-bar-container { height: 3px; border-radius: 6px; }
                    .progress-bar { border-radius: 6px; }
                    .progress-text { font-size: 9px; margin-top: 6px; }
                    .p-field { margin-bottom: 13px !important; }
                    .p-field label { 
                        font-size: 7.5px; 
                        letter-spacing: 1.3px;
                        margin-bottom: 6px;
                    }
                    .p-input-box { 
                        padding: 8px 12px; 
                        border-radius: 11px;
                        min-height: 42px;
                    }
                    .p-input-box input { 
                        font-size: 13px;
                        padding: 6px;
                    }
                    .p-input-box svg { width: 15px; height: 15px; }
                    .input-valid-icon, .input-error-icon { width: 16px; height: 16px; }
                    .p-submit-btn { 
                        padding: 12px; 
                        font-size: 10px; 
                        letter-spacing: 0.9px;
                        border-radius: 36px;
                        min-height: 46px;
                    }
                    .p-submit-btn svg { width: 16px; height: 16px; }
                    .password-requirements { 
                        padding: 9px; 
                        border-radius: 9px;
                        margin-top: 10px;
                    }
                    .req-item { 
                        font-size: 10px;
                        margin-bottom: 6px;
                    }
                    .req-item svg { width: 12px; height: 12px; }
                    .terms-checkbox { 
                        font-size: 11px;
                        margin-bottom: 15px !important;
                    }
                    .terms-checkbox input[type="checkbox"] { 
                        width: 15px; 
                        height: 15px;
                        min-width: 15px;
                        min-height: 15px;
                    }
                    .terms-link { font-size: 11px; }
                    .error-text { 
                        font-size: 10px;
                        margin-top: 6px;
                    }
                    .error-text svg { width: 12px; height: 12px; }
                    .success-text { font-size: 10px; }
                    .success-text svg { width: 12px; height: 12px; }
                    .general-error-box { 
                        padding: 9px 11px; 
                        font-size: 10px;
                        border-radius: 10px;
                        margin-bottom: 15px !important;
                    }
                    .general-error-box svg { width: 16px; height: 16px; }
                    .resend-otp-btn { 
                        padding: 8px 13px; 
                        font-size: 11px;
                        border-radius: 12px;
                        min-height: 40px;
                    }
                    .p-otp-input { 
                        font-size: 2.3rem; 
                        letter-spacing: 10px;
                        padding: 12px;
                        border-radius: 13px;
                    }
                    .verify-title { font-size: 1.2rem; margin-bottom: 10px; }
                    .verify-text { font-size: 11px; }
                    .verify-email { font-size: 12px; margin-bottom: 30px !important; }
                    .verify-help-text { font-size: 10px; }
                }
                
                /* Touch-Friendly Enhancements for Mobile */
                @media (max-width: 767px) {
                    .p-input-box {
                        min-height: 46px;
                    }
                    .p-submit-btn {
                        min-height: 50px;
                        touch-action: manipulation;
                    }
                    .resend-otp-btn {
                        min-height: 44px;
                        touch-action: manipulation;
                    }
                    .terms-checkbox {
                        padding: 8px 0;
                    }
                    .terms-checkbox input[type="checkbox"] {
                        min-width: 18px;
                        min-height: 18px;
                        cursor: pointer;
                    }
                    .eye-toggle-btn {
                        padding: 8px;
                        min-width: 36px;
                        min-height: 36px;
                    }
                }
                
                /* Landscape Mode Optimizations */
                @media (max-height: 500px) and (orientation: landscape) {
                    .signup-master-root { 
                        padding: 20px 15px;
                        align-items: flex-start !important;
                    }
                    .glass-signup-card { 
                        margin: 20px auto;
                        max-height: 90vh;
                        overflow-y: auto;
                    }
                    .signup-inner-box { padding: 25px 30px !important; }
                    .icon-badge-premium { width: 45px; height: 45px; margin-bottom: 12px !important; }
                    .brand-title { font-size: 1.2rem; margin-bottom: 3px; }
                    .step-indicator { font-size: 7px; margin-bottom: 15px !important; }
                    .progress-indicator { margin-bottom: 12px !important; }
                    .p-field { margin-bottom: 12px !important; }
                    .p-submit-btn { padding: 11px; }
                    .password-requirements { padding: 8px; }
                    .terms-checkbox { margin-bottom: 12px !important; }
                }
                
                /* High Resolution Displays */
                @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
                    .glass-signup-card {
                        backdrop-filter: blur(25px);
                    }
                    .luxury-bg-overlay {
                        backdrop-filter: blur(15px);
                    }
                }
                
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