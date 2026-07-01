import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { resetPasswordAPI, verifyOtpAPI } from '../Store/Services'
import { fastAPI } from '../Store/Services.jsx';
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, ShieldCheck, Loader2, User, Lock, CheckCircle2, ArrowLeft, RotateCcw, AlertCircle } from 'lucide-react'
import { useToast } from './ToastNotification'

export default function ForgetPassword() {
    const [data, setdata] = useState({ identifier: "", password: "", cpassword: "" })
    const [step, setStep] = useState(1)  // 1: Request OTP, 2: Reset Password, 3: Success
    const [loading, setLoading] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    const [timer, setTimer] = useState(0)
    const [resendAttempts, setResendAttempts] = useState(0)
    const [maxAttempts] = useState(10)
    const [errors, setErrors] = useState({})
    const [otpStatus, setOtpStatus] = useState({ state: 'idle', message: '' })
    const [redirectCountdown, setRedirectCountdown] = useState(3)
    const toast = useToast()
    
    const navigate = useNavigate()

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    // Auto-redirect countdown after success
    useEffect(() => {
        if (step === 3 && redirectCountdown > 0) {
            const countdown = setInterval(() => {
                setRedirectCountdown(prev => prev - 1);
            }, 1000);
            return () => clearInterval(countdown);
        } else if (step === 3 && redirectCountdown === 0) {
            navigate('/login');
        }
    }, [step, redirectCountdown, navigate]);

    // Listen for realtime password-reset events (emitted by server)
    useEffect(() => {
        const onUserPasswordReset = (e) => {
            try {
                const payload = e?.detail || {};
                const resetEmail = (payload.email || payload.emailAddress || '').toLowerCase();
                if (!resetEmail) return;
                if (resetEmail === (data.identifier || '').toLowerCase()) {
                    // If this client triggered the reset elsewhere, show success immediately
                    localStorage.removeItem("login");
                    localStorage.removeItem("userid");
                    localStorage.removeItem("name");
                    localStorage.removeItem("username");
                    localStorage.removeItem("role");
                    localStorage.removeItem("userToken");
                    localStorage.removeItem("savedCredentials");
                    toast.success("Password updated successfully.");
                    setStep(3);
                }
            } catch (err) { /* silent */ }
        };

        window.addEventListener('realtime:userPasswordReset', onUserPasswordReset);
        return () => window.removeEventListener('realtime:userPasswordReset', onUserPasswordReset);
    }, [data.identifier, toast]);

    // 🔒 PASSWORD VALIDATION FUNCTION
    const validatePassword = (password) => {
        const validationErrors = {};
        
        if (password.length < 8) {
            validationErrors.password = "Password must be at least 8 characters long";
        } else if (!/[A-Z]/.test(password)) {
            validationErrors.password = "Password must contain at least one uppercase letter";
        } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            validationErrors.password = "Password must contain at least one special character";
        }
        
        return validationErrors;
    };

    // Handle password change with real-time validation
    const handlePasswordChange = (e) => {
        const newPassword = e.target.value;
        setdata({...data, password: newPassword});
        
        // Clear errors when user starts typing
        if (errors.password) {
            const newErrors = {...errors};
            delete newErrors.password;
            setErrors(newErrors);
        }
        
        // Validate on blur or after user stops typing
        if (newPassword.length > 0) {
            const validationErrors = validatePassword(newPassword);
            if (Object.keys(validationErrors).length > 0) {
                setErrors(prev => ({...prev, ...validationErrors}));
            }
        }
    };

    // Handle confirm password with match validation
    const handleConfirmPasswordChange = (e) => {
        const confirmPassword = e.target.value;
        setdata({...data, cpassword: confirmPassword});
        
        // Clear match error when typing
        if (errors.cpassword) {
            const newErrors = {...errors};
            delete newErrors.cpassword;
            setErrors(newErrors);
        }
        
        // Check if passwords match
        if (confirmPassword.length > 0 && confirmPassword !== data.password) {
            setErrors(prev => ({...prev, cpassword: "Passwords do not match"}));
        }
    };

    // --- STEP 1: REQUEST OTP ---
    async function handleRequestOTP(e) {
        if(e) e.preventDefault();
        setErrors({});
        if (resendAttempts >= maxAttempts) {
            const attemptMsg = `Maximum resend attempts (${maxAttempts}) reached. Please try again later.`;
            setErrors({ identifier: attemptMsg });
            toast.warning(attemptMsg);
            return;
        }
        setLoading(true);
        try {
            const res = await fastAPI('/api/send-otp', 'POST', { identifier: data.identifier, type: 'forget' });
            if (res.result === "Done") {
                setStep(2);
                setUserOtp("")
                setOtpStatus({ state: 'idle', message: '' })
                setTimer(60);
                setResendAttempts(prev => prev + 1);
                toast.success("OTP sent successfully. Please check your email.");
            } else {
                const backendMsg = res.message || "Email is not registered.";
                setErrors({ identifier: backendMsg });
                toast.error(backendMsg);
            }
        } catch (err) {
            const status = err?.status
            const message = err?.data?.message || err?.message

            if (status === 429) {
                const rateLimitMsg = "Too many requests. Please wait before trying again.";
                setErrors({ identifier: rateLimitMsg });
                toast.warning(rateLimitMsg);
            } else if (status === 404) {
                const notRegisteredMsg = message || "Email or username is not registered.";
                setErrors({ identifier: notRegisteredMsg });
                toast.error(notRegisteredMsg);
            } else if (status >= 500) {
                const serverMsg = "Server issue while sending code. Please retry in a minute.";
                setErrors({ identifier: serverMsg });
                toast.error(serverMsg);
            } else {
                const genericMsg = message || "Email or username is not registered.";
                setErrors({ identifier: genericMsg });
                toast.error(genericMsg);
            }
        }
        setLoading(false);
    }

    useEffect(() => {
        if (step !== 2) return;

        if (!data.identifier || userOtp.length !== 6) {
            if (otpStatus.state !== 'idle') {
                setOtpStatus({ state: 'idle', message: '' })
            }
            return;
        }

        let cancelled = false
        ;(async () => {
            try {
                setOtpStatus({ state: 'checking', message: 'Verifying OTP...' })
                const res = await verifyOtpAPI({ identifier: data.identifier, otp: userOtp, type: 'forget' })
                if (cancelled) return
                if (res?.verified) {
                    setOtpStatus({ state: 'verified', message: 'OTP verified' })
                } else {
                    setOtpStatus({ state: 'invalid', message: res?.message || 'Invalid or expired OTP' })
                }
            } catch (err) {
                if (cancelled) return
                const msg = err?.data?.message || err?.message || 'OTP verification failed'
                if (String(msg).toLowerCase().includes('expired')) {
                    setOtpStatus({ state: 'invalid', message: 'OTP expired' })
                } else {
                    setOtpStatus({ state: 'invalid', message: msg })
                }
            }
        })()

        return () => {
            cancelled = true
        }
    }, [step, userOtp, data.identifier])

    // --- STEP 2: VERIFY & RESET ---
    async function handleReset(e) {
        e.preventDefault();
        
        // Clear previous errors
        setErrors({});
        
        // Validate password strength
        const passwordErrors = validatePassword(data.password);
        if (Object.keys(passwordErrors).length > 0) {
            setErrors(passwordErrors);
            return;
        }
        
        // Check if passwords match
        if (data.password !== data.cpassword) {
            setErrors({ cpassword: "Passwords do not match" });
            return;
        }

        if (otpStatus.state !== 'verified') {
            setErrors({ otp: "Please enter and verify a valid OTP first." });
            return;
        }

        setLoading(true);
        try {
            const res = await resetPasswordAPI({ identifier: data.identifier, password: data.password, cpassword: data.cpassword, otp: userOtp.trim() })
            if (res && res.result === "Done") {
                // Clear all login data only after backend confirms the OTP and password update
                localStorage.removeItem("login");
                localStorage.removeItem("userid");
                localStorage.removeItem("name");
                localStorage.removeItem("username");
                localStorage.removeItem("role");
                localStorage.removeItem("userToken");
                localStorage.removeItem("savedCredentials");
                setStep(3);
            } else {
                throw new Error(res?.message || 'Reset failed');
            }
        } catch (err) {
            const status = err?.status
            const message = err?.data?.message || err?.message
            const lowered = String(message || '').toLowerCase()
            if (status === 400 && (lowered.includes('current password') || lowered.includes('used previously'))) {
                setErrors({ password: message || "Please choose a new password different from current/previous passwords." });
                toast.warning(message || "Please choose a new password different from current/previous passwords.")
            } else if (status === 400 || status === 404) {
                setErrors({ otp: message || "Verification failed. Invalid or expired code." });
            } else if (status === 429) {
                setErrors({ otp: "Too many attempts. Please wait and try again." });
            } else {
                setErrors({ otp: message || "Reset failed due to a server issue. Please retry." });
            }

            setStep(2);
        }
        setLoading(false);
    }

    return (
        <div className="forget-master-root">
            <div className="luxury-overlay"></div>
            <div className="luxury-orb orb-a" aria-hidden="true"></div>
            <div className="luxury-orb orb-b" aria-hidden="true"></div>
            <div className="luxury-grid" aria-hidden="true"></div>
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
                                        <label className="field-label">EMAIL OR USERNAME</label>
                                        <div className="input-wrap">
                                            <User size={18} className="field-icon" />
                                            <input type="text" placeholder="enter your registered email or username" value={data.identifier} onChange={e => setdata({...data, identifier: e.target.value})} required />
                                        </div>
                                        {errors.identifier && (
                                            <motion.p 
                                                initial={{ opacity: 0, y: -5 }} 
                                                animate={{ opacity: 1, y: 0 }}
                                                className="error-message"
                                            >
                                                {errors.identifier}
                                            </motion.p>
                                        )}
                                    </div>
                                    <button type="submit" className="submit-lux shadow-lg" disabled={loading}>
                                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "REQUEST SECURITY CODE"}
                                    </button>
                                </motion.form>
                            ) : step === 2 ? (
                                <motion.form key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} onSubmit={handleReset} className="text-left">
                                    {/* --- SECURE OTP DISPLAY --- */}
                                    <div className="premium-field mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <label className="field-label">SECURITY CODE</label>
                                            {timer > 0 ? (
                                                <span className="timer-badge">{timer}s</span>
                                            ) : (
                                                resendAttempts >= maxAttempts ? (
                                                    <span className="max-attempts-msg">Max attempts reached</span>
                                                ) : (
                                                    <button type="button" onClick={handleRequestOTP} className="resend-btn" disabled={timer > 0}>
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
                                                    onChange={e => {
                                                        const clean = e.target.value.replace(/\D/g, '').slice(0, 6)
                                                        setUserOtp(clean)
                                                        if (clean.length !== 6) {
                                                            setOtpStatus({ state: 'idle', message: '' })
                                                        }
                                                        if (errors.otp) {
                                                            const nextErrors = { ...errors }
                                                            delete nextErrors.otp
                                                            setErrors(nextErrors)
                                                        }
                                                    }} 
                                                    required 
                                                />
                                            </div>
                                            <div className="code-expiry">✓ Valid for 10 minutes only</div>
                                            {otpStatus.state !== 'idle' && (
                                                <div className="code-expiry" style={{ color: otpStatus.state === 'verified' ? '#0a7f50' : otpStatus.state === 'checking' ? '#1f2937' : '#b42318', fontWeight: 700 }}>
                                                    {otpStatus.message}
                                                </div>
                                            )}
                                        </div>
                                        {errors.otp && (
                                            <motion.p 
                                                initial={{ opacity: 0, y: -5 }} 
                                                animate={{ opacity: 1, y: 0 }}
                                                className="error-message"
                                            >
                                                {errors.otp}
                                            </motion.p>
                                        )}
                                    </div>
                                    
                                    <div className="premium-field mb-4">
                                        <label className="field-label">NEW PASSWORD</label>
                                        <div className="input-wrap">
                                            <Lock size={18} className="field-icon" />
                                            <input 
                                                type="password" 
                                                placeholder="••••••••" 
                                                value={data.password}
                                                onChange={handlePasswordChange}
                                                onBlur={(e) => {
                                                    if (e.target.value) {
                                                        const validationErrors = validatePassword(e.target.value);
                                                        setErrors(prev => ({...prev, ...validationErrors}));
                                                    }
                                                }}
                                                required 
                                            />
                                        </div>
                                        {errors.password && (
                                            <motion.p 
                                                initial={{ opacity: 0, y: -5 }} 
                                                animate={{ opacity: 1, y: 0 }}
                                                className="error-message"
                                            >
                                                {errors.password}
                                            </motion.p>
                                        )}
                                        <div className="password-requirements">
                                            <small>• Minimum 8 characters • 1 Uppercase • 1 Special character</small>
                                        </div>
                                    </div>
                                    
                                    <div className="premium-field mb-4">
                                        <label className="field-label">CONFIRM PASSWORD</label>
                                        <div className="input-wrap">
                                            <CheckCircle2 size={18} className="field-icon" />
                                            <input 
                                                type="password" 
                                                placeholder="••••••••" 
                                                value={data.cpassword}
                                                onChange={handleConfirmPasswordChange}
                                                required 
                                            />
                                        </div>
                                        {errors.cpassword && (
                                            <motion.p 
                                                initial={{ opacity: 0, y: -5 }} 
                                                animate={{ opacity: 1, y: 0 }}
                                                className="error-message"
                                            >
                                                {errors.cpassword}
                                            </motion.p>
                                        )}
                                    </div>
                                    
                                    <button type="submit" className="submit-lux shadow-lg" disabled={loading}>
                                        {loading ? "SYNCING..." : "UPDATE CREDENTIALS"}
                                    </button>
                                </motion.form>
                            ) : (
                                <motion.div key="s3" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="success-screen text-center">
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="success-icon-box">
                                        <CheckCircle2 size={64} className="success-icon" />
                                    </motion.div>
                                    <h3 className="success-title mt-4 mb-2">PASSWORD RESET SUCCESSFUL</h3>
                                    <p className="success-subtitle mb-4">Your master credentials have been updated securely.</p>
                                    
                                    <div className="info-box mb-4">
                                        <AlertCircle size={16} />
                                        <span>You have been logged out for security. Please log in again.</span>
                                    </div>

                                    {/* --- REDIRECT COUNTDOWN --- */}
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="redirect-message mb-4"
                                    >
                                        <p>Redirecting to login in <strong>{redirectCountdown}</strong> second{redirectCountdown !== 1 ? 's' : ''}...</p>
                                    </motion.div>

                                    <motion.button 
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate("/login")} 
                                        className="submit-lux shadow-lg"
                                    >
                                        GO TO LOGIN NOW
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="text-center mt-5"><Link to="/login" className="back-link"><ArrowLeft size={16} className="mr-2" /> BACK TO LOGIN</Link></div>
                    </div>
                </motion.div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Playfair+Display:wght@600;700&display=swap');

                .forget-master-root {
                    --lux-ink: #101419;
                    --lux-card: rgba(255, 252, 245, 0.9);
                    --lux-muted: #5c6670;
                    --lux-border: rgba(20, 26, 33, 0.12);
                    --lux-highlight: #0f766e;
                    --lux-gold: #b78628;
                    --lux-warn: #b91c1c;
                    position: relative;
                    min-height: 100vh;
                    overflow: hidden;
                    font-family: 'Manrope', sans-serif;
                    background:
                        radial-gradient(circle at 15% 10%, rgba(183, 134, 40, 0.24), transparent 42%),
                        radial-gradient(circle at 90% 85%, rgba(15, 118, 110, 0.25), transparent 38%),
                        linear-gradient(145deg, #091217 0%, #13232e 46%, #2b1f14 100%);
                }

                .luxury-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(180deg, rgba(6, 10, 14, 0.28), rgba(6, 10, 14, 0.72));
                    pointer-events: none;
                }

                .luxury-orb {
                    position: absolute;
                    border-radius: 999px;
                    filter: blur(10px);
                    opacity: 0.52;
                    animation: floatOrb 12s ease-in-out infinite;
                    pointer-events: none;
                }

                .orb-a {
                    width: 320px;
                    height: 320px;
                    top: -120px;
                    right: -90px;
                    background: radial-gradient(circle at 30% 30%, rgba(255, 208, 122, 0.85), rgba(183, 134, 40, 0.08));
                }

                .orb-b {
                    width: 280px;
                    height: 280px;
                    bottom: -110px;
                    left: -100px;
                    animation-delay: 2.8s;
                    background: radial-gradient(circle at 65% 40%, rgba(120, 255, 240, 0.6), rgba(15, 118, 110, 0.06));
                }

                .luxury-grid {
                    position: absolute;
                    inset: 0;
                    background-image:
                        linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
                    background-size: 36px 36px;
                    mask-image: radial-gradient(circle at center, #000 40%, transparent 90%);
                    pointer-events: none;
                    opacity: 0.35;
                }

                .container { position: relative; z-index: 2; }

                .glass-forget-card {
                    position: relative;
                    width: 100%;
                    max-width: 500px;
                    background: var(--lux-card);
                    border: 1px solid rgba(255, 255, 255, 0.45);
                    backdrop-filter: blur(14px);
                    border-radius: 34px;
                    box-shadow: 0 30px 90px rgba(2, 8, 14, 0.48), inset 0 1px 0 rgba(255,255,255,0.45);
                }

                .icon-badge-premium {
                    width: 62px;
                    height: 62px;
                    border-radius: 20px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(145deg, #111, #273744 72%, #0f766e);
                    color: #fff;
                    border: 1px solid rgba(255,255,255,0.14);
                    animation: pulse 2.5s ease-in-out infinite;
                }

                .brand-logo {
                    margin-bottom: 4px;
                    color: var(--lux-ink);
                    font-family: 'Playfair Display', serif;
                    font-size: clamp(1.8rem, 4.2vw, 2.2rem);
                    letter-spacing: 3px;
                    font-weight: 700;
                }

                .dot { color: var(--lux-gold); }

                .subtitle {
                    margin: 0;
                    color: var(--lux-muted);
                    font-size: 0.66rem;
                    letter-spacing: 3px;
                    text-transform: uppercase;
                    font-weight: 800;
                }

                .field-label {
                    display: block;
                    margin-bottom: 8px;
                    color: #2c3540;
                    font-size: 0.62rem;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    font-weight: 800;
                }

                .input-wrap {
                    display: flex;
                    align-items: center;
                    border: 1px solid var(--lux-border);
                    border-radius: 14px;
                    background: rgba(255, 255, 255, 0.88);
                    padding: 8px 12px;
                    min-height: 50px;
                    transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
                }

                .input-wrap:focus-within {
                    border-color: rgba(15, 118, 110, 0.65);
                    box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
                    transform: translateY(-1px);
                }

                .field-icon { color: #86909a; flex-shrink: 0; }

                .input-wrap input {
                    width: 100%;
                    border: 0;
                    outline: 0;
                    background: transparent;
                    color: var(--lux-ink);
                    font-size: 0.95rem;
                    font-weight: 650;
                    padding: 9px 10px;
                }

                .input-wrap input::placeholder { color: #95a1ad; font-weight: 600; }

                .submit-lux {
                    width: 100%;
                    border: 0;
                    border-radius: 16px;
                    padding: 15px 18px;
                    margin-top: 0.5rem;
                    font-size: 0.78rem;
                    font-weight: 800;
                    letter-spacing: 1.7px;
                    text-transform: uppercase;
                    color: #f6f8fa;
                    background: linear-gradient(132deg, #16212a, #0f766e 55%, #b78628);
                    box-shadow: 0 14px 28px rgba(15, 118, 110, 0.28);
                    transition: transform 0.22s ease, box-shadow 0.22s ease;
                }

                .submit-lux:hover { transform: translateY(-2px); box-shadow: 0 18px 34px rgba(15, 118, 110, 0.36); }
                .submit-lux:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

                .timer-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px 10px;
                    border-radius: 999px;
                    font-size: 0.66rem;
                    font-weight: 800;
                    background: rgba(15, 118, 110, 0.14);
                    color: #0f766e;
                }

                .resend-btn {
                    border: 0;
                    background: transparent;
                    color: #0f766e;
                    font-size: 0.68rem;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                }

                .max-attempts-msg {
                    padding: 4px 10px;
                    border-radius: 999px;
                    font-size: 0.66rem;
                    font-weight: 700;
                    color: #b91c1c;
                    background: #fee2e2;
                }

                .security-code-box {
                    background: linear-gradient(135deg, rgba(15, 118, 110, 0.09), rgba(183, 134, 40, 0.08));
                    border: 1px solid rgba(15, 118, 110, 0.28);
                    border-radius: 16px;
                    padding: 14px;
                    margin-bottom: 14px;
                }

                .code-label {
                    font-size: 0.67rem;
                    font-weight: 700;
                    color: #4f5a66;
                    margin-bottom: 8px;
                    letter-spacing: 0.6px;
                }

                .code-expiry {
                    margin-top: 10px;
                    text-align: center;
                    font-size: 0.66rem;
                    font-weight: 700;
                    color: #0f766e;
                }

                .error-message {
                    margin: 8px 0 0;
                    padding: 8px 10px;
                    border-radius: 10px;
                    border: 1px solid #fecaca;
                    background: #fff2f2;
                    color: var(--lux-warn);
                    font-size: 0.71rem;
                    font-weight: 700;
                }

                .password-requirements small {
                    font-size: 0.67rem;
                    color: #5f6871;
                    font-weight: 600;
                }

                .success-screen { padding: 26px 8px 10px; }

                .success-icon-box {
                    width: 92px;
                    height: 92px;
                    border-radius: 999px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    background: linear-gradient(132deg, #1b2730, #0f766e 60%, #b78628);
                    box-shadow: 0 16px 30px rgba(15, 118, 110, 0.28);
                }

                .success-title {
                    font-size: 1.15rem;
                    font-weight: 800;
                    letter-spacing: 1px;
                    color: #17222d;
                }

                .success-subtitle { font-size: 0.82rem; color: #5e6872; }

                .info-box {
                    padding: 11px 12px;
                    border-radius: 11px;
                    border: 1px solid rgba(15, 118, 110, 0.25);
                    background: rgba(15, 118, 110, 0.08);
                    color: #0f5d57;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.74rem;
                    font-weight: 700;
                }

                .redirect-message {
                    border-radius: 10px;
                    border: 1px solid rgba(15, 118, 110, 0.25);
                    background: rgba(15, 118, 110, 0.08);
                    padding: 10px 12px;
                }

                .redirect-message p { margin: 0; font-size: 0.78rem; color: #205055; font-weight: 700; }
                .redirect-message strong { color: #0f766e; font-size: 0.95rem; }

                .back-link {
                    color: #1a2530;
                    font-size: 0.75rem;
                    font-weight: 800;
                    letter-spacing: 1px;
                    text-decoration: none !important;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: color 0.2s ease;
                }

                .back-link:hover { color: var(--lux-highlight); }

                @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
                @keyframes floatOrb { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-14px) scale(1.06); } }

                @media (max-width: 1024px) {
                    .glass-forget-card { max-width: 480px; }
                }

                @media (max-width: 767px) {
                    .forget-master-root { padding: 20px 14px; }
                    .glass-forget-card { max-width: 100%; border-radius: 26px; }
                    .forget-inner-box { padding: 30px 20px !important; }
                    .brand-logo { letter-spacing: 2px; }
                    .subtitle { letter-spacing: 2.2px; }
                    .input-wrap { min-height: 48px; }
                    .submit-lux { min-height: 50px; font-size: 0.73rem; letter-spacing: 1.4px; }
                }

                @media (max-width: 420px) {
                    .forget-master-root { padding: 16px 10px; }
                    .glass-forget-card { border-radius: 22px; }
                    .forget-inner-box { padding: 26px 14px !important; }
                    .icon-badge-premium { width: 56px; height: 56px; }
                    .subtitle { font-size: 0.6rem; }
                    .field-label { font-size: 0.58rem; letter-spacing: 1.6px; }
                    .input-wrap input { font-size: 0.88rem; }
                    .back-link { font-size: 0.67rem; }
                }

                @media (prefers-reduced-motion: reduce) {
                    .icon-badge-premium,
                    .luxury-orb { animation: none !important; }
                }
            `}} />
        </div>
    )
}