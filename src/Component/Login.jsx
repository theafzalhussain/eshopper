import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { getUser } from '../Store/ActionCreaters/UserActionCreators'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, User as UserIcon, Lock, Eye, EyeOff, AlertCircle, ChevronRight, Loader2, ShieldCheck } from 'lucide-react'
import { signInWithPopup, getIdToken } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { loginAPI, login2FAAPI } from '../Store/Services'
import { BASE_URL } from '../constants'
import { useToast } from './ToastNotification'

export default function Login() {
    const [data, setdata] = useState({ username: "", password: "" })
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")
    const [twoFactorRequired, setTwoFactorRequired] = useState(false)
    const [otpCode, setOtpCode] = useState('')
    const [otpHint, setOtpHint] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [autoLoginAttempted, setAutoLoginAttempted] = useState(false)
    const toast = useToast()
    
    const dispatch = useDispatch()
    const navigate = useNavigate()

    // --- AUTO-LOGIN ON APP START ---
    useEffect(() => { 
        dispatch(getUser()) 
        window.scrollTo(0, 0);

        // Check if user is already logged in (persistent login)
        const savedUser = localStorage.getItem("userToken")
        if (savedUser && !autoLoginAttempted) {
            try {
                const user = JSON.parse(savedUser)
                if (user.id && user.username) {
                    // Auto-login: restore user session
                    localStorage.setItem("login", true)
                    localStorage.setItem("name", user.name)
                    localStorage.setItem("userid", user.id)
                    localStorage.setItem("role", user.role)
                    localStorage.setItem("username", user.username)
                    if (user.pic) {
                        localStorage.setItem("pic", user.pic)
                    }
                    navigate(user.role === "Admin" ? "/admin-home" : "/profile")
                }
            } catch (err) {
                console.error("Auto-login failed:", err)
                localStorage.removeItem("userToken")
            }
        }
        setAutoLoginAttempted(true)
    }, [dispatch, navigate])

    // --- POPULATE FORM FROM LOCALSTORAGE ON MOUNT ---
    useEffect(() => {
        const savedCredentials = localStorage.getItem("savedCredentials")
        if (savedCredentials) {
            try {
                const creds = JSON.parse(savedCredentials)
                setdata({ username: creds.username, password: creds.password })
                setRememberMe(true)
            } catch (err) {
                console.error("Error loading saved credentials:", err)
            }
        }
    }, [])

    function getData(e) {
        setdata({ ...data, [e.target.name]: e.target.value })
        if (errorMsg) setErrorMsg("");
        if (twoFactorRequired) {
            setTwoFactorRequired(false)
            setOtpCode('')
            setOtpHint('')
        }
    }

    function persistUserSession(user, shouldRemember = false) {
        const resolvedId = user.id || user._id || user.uid
        const resolvedName = user.name || user.displayName || 'User'
        const resolvedUsername = user.username || (user.email ? user.email.split('@')[0] : resolvedName.split(' ')[0].toLowerCase())

        localStorage.setItem('login', true)
        localStorage.setItem('name', resolvedName)
        if (resolvedId) localStorage.setItem('userid', resolvedId)
        localStorage.setItem('role', user.role || 'User')
        localStorage.setItem('username', resolvedUsername)

        if (user.pic) {
            localStorage.setItem('pic', user.pic)
        } else {
            localStorage.removeItem('pic')
        }

        if (shouldRemember) {
            const userToken = {
                id: resolvedId,
                username: resolvedUsername,
                name: resolvedName,
                role: user.role || 'User',
                email: user.email || '',
                pic: user.pic || ''
            }
            localStorage.setItem('userToken', JSON.stringify(userToken))
        } else {
            localStorage.removeItem('userToken')
        }
    }

    async function handleGoogleLogin() {
        setGoogleLoading(true)
        setErrorMsg("")

        try {
            const result = await signInWithPopup(auth, googleProvider)
            const firebaseUser = result.user
            const idToken = await getIdToken(firebaseUser, true)

            const response = await fetch(`${BASE_URL}/api/auth-sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idToken,
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    name: firebaseUser.displayName,
                    pic: firebaseUser.photoURL,
                    provider: 'google'
                })
            })

            const user = await response.json()

            if (!response.ok) {
                throw new Error(user?.message || 'Google sign-in failed')
            }

            persistUserSession(user, true)
            toast.success('Signed in with Google successfully.')
            navigate(user.role === 'Admin' ? '/admin-home' : '/profile')
        } catch (err) {
            console.error('Google login error:', err)
            if (err.code === 'auth/popup-closed-by-user') {
                setErrorMsg('Google sign-in was cancelled.')
                toast.warning('Google sign-in was cancelled.')
            } else if (err.code === 'auth/configuration-not-found' || err.message?.includes('Firebase') || err.message?.includes('not configured')) {
                setErrorMsg('Google login is not configured. Please contact support or try again later.')
                toast.error('Google login is not configured right now.')
            } else {
                setErrorMsg(err.message || 'Google sign-in failed. Please try again.')
                toast.error(err.message || 'Google sign-in failed. Please try again.')
            }
        } finally {
            setGoogleLoading(false)
        }
    }

    async function postData(e) {
        e.preventDefault();
        setLoading(true)
        setErrorMsg("");
        
        try {
            const user = twoFactorRequired
                ? await login2FAAPI({ username: data.username, password: data.password, otp: otpCode })
                : await loginAPI(data)
            setLoading(false)

            if (user?.requiresTwoFactor) {
                setTwoFactorRequired(true)
                setOtpHint(user?.message || 'Verification code sent to your email.')
                setErrorMsg('')
                toast.info(user?.message || 'Verification code sent. Please enter OTP to continue.')
                return
            }
            
            if (user.username) {
                // --- STANDARD LOGIN SETUP ---
                persistUserSession(user, rememberMe)

                // --- REMEMBER ME: SAVE TOKEN & CREDENTIALS ---
                if (rememberMe) {
                    localStorage.setItem("savedCredentials", JSON.stringify({
                        username: data.username,
                        password: data.password
                    }))
                } else {
                    localStorage.removeItem("savedCredentials")
                }

                toast.success('Login successful. Welcome back!')
                navigate(user.role === "Admin" ? "/admin-home" : "/profile");
            } else {
                // Check if it's a Firebase auth provider error
                if (user.requiresFirebaseAuth && user.provider) {
                    setErrorMsg(user.message || "Invalid credentials. Please try again.");
                    toast.error(user.message || "Invalid credentials. Please try again.")
                } else {
                    setErrorMsg(user.message || "Invalid credentials. Please try again.");
                    toast.error(user.message || "Invalid credentials. Please try again.")
                }
            }
        } catch (err) {
            setLoading(false)

            const status = err?.status
            const apiMessage = err?.data?.message || err?.message

            if (status === 401) {
                setErrorMsg("Invalid username/email or password.")
                toast.error("Invalid username/email or password.")
            } else if (status === 403) {
                setErrorMsg(apiMessage || "Access denied. Please try again later.")
                toast.error(apiMessage || "Access denied. Please try again later.")
            } else if (status === 429) {
                setErrorMsg("Too many attempts right now. Please wait a moment and try again.")
                toast.warning("Too many attempts right now. Please wait a moment and try again.")
            } else if (status >= 500) {
                setErrorMsg("Server issue while signing in. Please try again shortly.")
                toast.error("Server issue while signing in. Please try again shortly.")
            } else if ((err?.message || '').includes('timeout')) {
                setErrorMsg("Login request timed out. Please check connection and retry.")
                toast.warning("Login request timed out. Please check connection and retry.")
            } else {
                setErrorMsg(apiMessage || "Login failed. Please try again.")
                toast.error(apiMessage || "Login failed. Please try again.")
            }
            
            console.error("Login Error:", err);
        }
    }

    return (
        <div className="premium-login-container">
            {/* Dynamic Background */}
            <div className="luxury-bg-overlay"></div>
            <div className="luxury-orb orb-a" aria-hidden="true"></div>
            <div className="luxury-orb orb-b" aria-hidden="true"></div>
            <div className="luxury-grid" aria-hidden="true"></div>
            
            <div className="container d-flex align-items-center justify-content-center min-vh-100">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="glass-master-card"
                >
                    <div className="login-content-wrapper">
                        {/* Header Section */}
                        <div className="login-header text-center mb-5">
                            <motion.div 
                                initial={{ y: -20 }} 
                                animate={{ y: 0 }}
                                className="brand-shield mb-3"
                            >
                                <span className="shield-text">E</span>
                            </motion.div>
                            <h1 className="brand-name">ESHOPPER<span className="accent-dot">.</span></h1>
                            <p className="login-subtitle">THE EXCLUSIVE ATELIER ACCESS</p>
                        </div>

                        {/* Error Alert */}
                        <AnimatePresence>
                            {errorMsg && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="premium-error-alert"
                                >
                                    <AlertCircle size={16} className="mr-2" />
                                    <span>{errorMsg}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Form */}
                        <form onSubmit={postData} className="premium-form">
                            <div className="input-field-wrap">
                                <label>LOGIN IDENTITY</label>
                                <div className="input-box">
                                    <UserIcon size={18} className="icon" />
                                    <input type="text" name="username" placeholder="Username or Email" value={data.username} onChange={getData} required disabled={twoFactorRequired} />
                                </div>
                                <div className="input-hint">You can use your username or registered email</div>
                            </div>

                            <div className="input-field-wrap">
                                <div className="d-flex justify-content-between align-items-center">
                                    <label>PASSWORD</label>
                                    <Link to="/forget-password" style={{fontSize:'10px', color:'#17a2b8', letterSpacing:'1px', textDecoration:'none', fontWeight:'800'}}>RECOVER?</Link>
                                </div>
                                <div className="input-box">
                                    <Lock size={18} className="icon" />
                                    <input type={showPass ? "text" : "password"} name="password" placeholder="••••••••" value={data.password} onChange={getData} required disabled={twoFactorRequired} />
                                    <button type="button" className="eye-toggle" onClick={() => setShowPass(!showPass)}>
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {twoFactorRequired && (
                                <div className="input-field-wrap">
                                    <label>2FA VERIFICATION CODE</label>
                                    <div className="input-box">
                                        <ShieldCheck size={18} className="icon" />
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={6}
                                            placeholder="Enter 6-digit OTP"
                                            value={otpCode}
                                            onChange={(e) => {
                                                const clean = e.target.value.replace(/\D/g, '').slice(0, 6)
                                                setOtpCode(clean)
                                            }}
                                            required
                                        />
                                    </div>
                                    <div className="input-hint">{otpHint || 'A verification code has been sent to your email.'}</div>
                                    <button
                                        type="button"
                                        className="twofactor-back-btn"
                                        onClick={() => {
                                            setTwoFactorRequired(false)
                                            setOtpCode('')
                                            setOtpHint('')
                                            setErrorMsg('')
                                        }}
                                    >
                                        Back to password login
                                    </button>
                                </div>
                            )}

                            {/* --- REMEMBER ME CHECKBOX --- */}
                            <div className="remember-me-wrapper mb-4">
                                <input 
                                    type="checkbox" 
                                    id="rememberme" 
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="remember-checkbox"
                                />
                                <label htmlFor="rememberme" className="remember-label">
                                    <span>Keep me signed in on this device</span>
                                </label>
                            </div>

                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit" 
                                className="master-login-btn"
                                disabled={loading}
                            >
                                {loading ? (
                                    <><Loader2 className="spinner mr-2" size={20} /> SYNCHRONIZING...</>
                                ) : twoFactorRequired ? (
                                    <><ShieldCheck size={20} className="mr-2" /> VERIFY & SIGN IN <ChevronRight size={18} className="ml-auto" /></>
                                ) : (
                                    <><LogIn size={20} className="mr-2" /> ENTER PORTAL <ChevronRight size={18} className="ml-auto" /></>
                                )}
                            </motion.button>
                        </form>

                        <div className="social-login-block">
                            <div className="social-login-divider">
                                <span>OR CONTINUE WITH</span>
                            </div>

                            <motion.button
                                type="button"
                                onClick={handleGoogleLogin}
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                className="google-login-btn"
                                disabled={googleLoading}
                            >
                                {googleLoading ? (
                                    <Loader2 size={18} className="google-spinner" />
                                ) : (
                                    <span className="google-mark" aria-hidden="true">
                                        <span className="g-blue">G</span>
                                    </span>
                                )}
                                <span>Sign in with Google</span>
                            </motion.button>
                        </div>

                        {/* Footer Section */}
                        <div className="login-footer-links text-center">
                            <div className="luxury-divider">
                                <span>NEW TO THE CLUB?</span>
                            </div>
                            <Link to="/signup" className="signup-link-premium">
                                CREATE MASTER ACCOUNT
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap');

                .premium-login-container {
                    --lux-ink: #101419;
                    --lux-card: rgba(255, 252, 245, 0.9);
                    --lux-muted: #5c6670;
                    --lux-border: rgba(20, 26, 33, 0.12);
                    --lux-highlight: #0f766e;
                    --lux-gold: #b78628;
                    --lux-warn: #b91c1c;
                    position: relative;
                    min-height: 100vh;
                    overflow-x: hidden;
                    overflow-y: auto;
                    font-family: 'Manrope', sans-serif;
                    background:
                        radial-gradient(circle at 15% 10%, rgba(183, 134, 40, 0.26), transparent 42%),
                        radial-gradient(circle at 90% 85%, rgba(15, 118, 110, 0.24), transparent 38%),
                        linear-gradient(140deg, #0b1418 0%, #111f27 42%, #2b1f14 100%);
                    padding-top: env(safe-area-inset-top);
                    padding-right: env(safe-area-inset-right);
                    padding-bottom: env(safe-area-inset-bottom);
                    padding-left: env(safe-area-inset-left);
                }

                .luxury-bg-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(180deg, rgba(6, 10, 14, 0.28), rgba(6, 10, 14, 0.72));
                    pointer-events: none;
                }

                .luxury-orb {
                    position: absolute;
                    border-radius: 999px;
                    filter: blur(10px);
                    opacity: 0.55;
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

                .container {
                    position: relative;
                    z-index: 2;
                }

                .premium-login-container .container.min-vh-100 {
                    min-height: 100vh !important;
                    padding: clamp(18px, 2.4vw, 28px) 14px;
                }

                .glass-master-card {
                    position: relative;
                    width: 100%;
                    max-width: 480px;
                    background: var(--lux-card);
                    border: 1px solid rgba(255, 255, 255, 0.45);
                    backdrop-filter: blur(14px);
                    border-radius: 34px;
                    box-shadow:
                        0 30px 90px rgba(2, 8, 14, 0.48),
                        inset 0 1px 0 rgba(255, 255, 255, 0.45);
                    padding: 44px 32px;
                    animation: cardRise 0.8s ease both;
                }

                .login-content-wrapper {
                    position: relative;
                    z-index: 1;
                }

                .brand-shield {
                    width: 64px;
                    height: 64px;
                    border-radius: 20px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    background: linear-gradient(145deg, #111 0%, #273744 72%, #0f766e 100%);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
                }

                .shield-text {
                    font-family: 'Playfair Display', serif;
                    font-size: 1.65rem;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                }

                .brand-name {
                    margin-bottom: 4px;
                    color: var(--lux-ink);
                    font-family: 'Playfair Display', serif;
                    font-size: clamp(1.8rem, 4.4vw, 2.3rem);
                    letter-spacing: 3px;
                    font-weight: 700;
                }

                .accent-dot {
                    color: var(--lux-gold);
                }

                .login-subtitle {
                    margin: 0;
                    color: var(--lux-muted);
                    font-size: 0.68rem;
                    letter-spacing: 3.4px;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .premium-error-alert {
                    background: #fff2f2;
                    border: 1px solid #fecaca;
                    color: var(--lux-warn);
                    border-radius: 14px;
                    padding: 12px 14px;
                    margin-bottom: 1.1rem;
                    font-size: 0.78rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .premium-form {
                    display: grid;
                    gap: 0.95rem;
                }

                .input-field-wrap {
                    margin-bottom: 0.2rem;
                }

                .input-field-wrap label {
                    display: block;
                    font-size: 0.63rem;
                    letter-spacing: 2.1px;
                    text-transform: uppercase;
                    color: #2c3540;
                    font-weight: 800;
                    margin-bottom: 8px;
                }

                .input-box {
                    display: flex;
                    align-items: center;
                    border: 1px solid var(--lux-border);
                    border-radius: 14px;
                    background: rgba(255, 255, 255, 0.88);
                    padding: 8px 12px;
                    min-height: 50px;
                    transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
                }

                .input-box:focus-within {
                    border-color: rgba(15, 118, 110, 0.65);
                    box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
                    transform: translateY(-1px);
                }

                .icon {
                    flex-shrink: 0;
                    color: #86909a;
                    transition: color 0.2s ease;
                }

                .input-box:focus-within .icon {
                    color: var(--lux-highlight);
                }

                .input-box input {
                    width: 100%;
                    border: 0;
                    outline: 0;
                    background: transparent;
                    color: var(--lux-ink);
                    font-size: 0.96rem;
                    font-weight: 650;
                    padding: 9px 10px;
                }

                .input-box input::placeholder {
                    color: #95a1ad;
                    font-weight: 600;
                }

                .input-hint {
                    margin-top: 6px;
                    padding-left: 2px;
                    font-size: 0.72rem;
                    color: #5f6871;
                    font-weight: 600;
                }

                .eye-toggle {
                    border: 0;
                    background: transparent;
                    color: #8995a3;
                    min-width: 34px;
                    min-height: 34px;
                    border-radius: 10px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.2s ease, color 0.2s ease;
                }

                .eye-toggle:hover {
                    background: rgba(15, 118, 110, 0.1);
                    color: var(--lux-highlight);
                }

                .twofactor-back-btn {
                    margin-top: 8px;
                    border: 0;
                    background: transparent;
                    color: #0d6a63;
                    font-size: 0.7rem;
                    font-weight: 800;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    padding: 0;
                    text-align: left;
                }

                .remember-me-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 8px 0 6px;
                }

                .remember-checkbox {
                    accent-color: var(--lux-highlight);
                    cursor: pointer;
                    width: 18px;
                    height: 18px;
                }

                .remember-label {
                    margin: 0;
                    color: #36404b;
                    font-size: 0.76rem;
                    font-weight: 700;
                    cursor: pointer;
                }

                .master-login-btn {
                    width: 100%;
                    border: 0;
                    border-radius: 16px;
                    padding: 16px 18px;
                    margin-top: 0.65rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-size: 0.8rem;
                    font-weight: 800;
                    letter-spacing: 1.8px;
                    text-transform: uppercase;
                    color: #f6f8fa;
                    background: linear-gradient(132deg, #16212a, #0f766e 55%, #b78628);
                    box-shadow: 0 14px 28px rgba(15, 118, 110, 0.28);
                    transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease;
                }

                .master-login-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 18px 34px rgba(15, 118, 110, 0.36);
                    filter: brightness(1.04);
                }

                .master-login-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }

                .social-login-block {
                    margin-top: 1rem;
                }

                .social-login-divider,
                .luxury-divider {
                    position: relative;
                    text-align: center;
                    margin: 22px 0 14px;
                }

                .social-login-divider::before,
                .luxury-divider::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 0;
                    width: 100%;
                    height: 1px;
                    background: linear-gradient(90deg, transparent 0%, rgba(44, 53, 64, 0.25) 15%, rgba(44, 53, 64, 0.25) 85%, transparent 100%);
                }

                .social-login-divider span,
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

                .google-login-btn {
                    width: 100%;
                    border-radius: 14px;
                    padding: 13px 16px;
                    border: 1px solid #dce1e6;
                    background: #fff;
                    color: #1f2328;
                    font-weight: 700;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 11px;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    box-shadow: 0 10px 22px rgba(17, 24, 39, 0.08);
                }

                .google-login-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 14px 26px rgba(17, 24, 39, 0.12);
                }

                .google-login-btn:disabled {
                    opacity: 0.75;
                    cursor: not-allowed;
                    transform: none;
                }

                .google-mark {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: conic-gradient(from 0deg, #4285F4 0 25%, #34A853 25% 50%, #FBBC05 50% 75%, #EA4335 75% 100%);
                    color: #fff;
                    font-size: 14px;
                    font-weight: 900;
                    line-height: 1;
                }

                .g-blue {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: #fff;
                    color: #4285F4;
                    font-size: 13px;
                    font-weight: 700;
                    font-family: 'Manrope', sans-serif;
                }

                .google-spinner,
                .spinner {
                    animation: rotate 1s linear infinite;
                }

                .signup-link-premium {
                    text-decoration: none;
                    color: #14202b;
                    font-weight: 800;
                    letter-spacing: 1.2px;
                    font-size: 0.76rem;
                    padding-bottom: 3px;
                    border-bottom: 2px solid rgba(183, 134, 40, 0.7);
                    transition: color 0.2s ease, border-color 0.2s ease;
                }

                .signup-link-premium:hover {
                    color: var(--lux-highlight);
                    border-color: var(--lux-highlight);
                }

                @keyframes rotate {
                    to { transform: rotate(360deg); }
                }

                @keyframes floatOrb {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-14px) scale(1.06); }
                }

                @keyframes cardRise {
                    from { opacity: 0; transform: translateY(18px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @media (min-width: 1440px) {
                    .premium-login-container .container.min-vh-100 {
                        padding-top: 30px;
                        padding-bottom: 30px;
                    }

                    .glass-master-card {
                        max-width: 500px;
                        padding: 48px 36px;
                    }
                }

                @media (max-width: 1024px) {
                    .premium-login-container .container.min-vh-100 {
                        padding: 18px 12px;
                    }

                    .glass-master-card {
                        max-width: 460px;
                        padding: 38px 28px;
                    }
                }

                @media (max-width: 767px) {
                    .premium-login-container {
                        padding: 20px 14px;
                        min-height: 100svh;
                    }

                    .premium-login-container .container.min-vh-100 {
                        min-height: 100svh !important;
                        align-items: flex-start !important;
                        padding-top: 14px;
                        padding-bottom: 14px;
                    }

                    .glass-master-card {
                        max-width: 100%;
                        border-radius: 26px;
                        padding: 30px 20px;
                        max-height: none;
                        overflow: visible;
                    }

                    .login-header {
                        margin-bottom: 0.95rem !important;
                    }

                    .brand-name {
                        letter-spacing: 2.2px;
                    }

                    .login-subtitle {
                        letter-spacing: 2.3px;
                    }

                    .input-box {
                        min-height: 48px;
                    }

                    .master-login-btn {
                        min-height: 50px;
                        font-size: 0.75rem;
                        letter-spacing: 1.5px;
                    }

                    .login-content-wrapper .mb-5,
                    .login-content-wrapper .mt-5 {
                        margin-bottom: 0.9rem !important;
                        margin-top: 0.9rem !important;
                    }
                }

                @media (max-width: 420px) {
                    .premium-login-container {
                        padding: 10px 8px;
                    }

                    .premium-login-container .container.min-vh-100 {
                        padding-top: 8px;
                        padding-bottom: 8px;
                    }

                    .glass-master-card {
                        padding: 16px 12px;
                        border-radius: 22px;
                        max-height: none;
                    }

                    .login-header {
                        margin-bottom: 0.85rem !important;
                    }

                    .brand-shield {
                        width: 54px;
                        height: 54px;
                    }

                    .shield-text {
                        font-size: 1.35rem;
                    }

                    .login-subtitle {
                        font-size: 0.61rem;
                    }

                    .input-field-wrap label {
                        font-size: 0.58rem;
                        letter-spacing: 1.7px;
                    }

                    .remember-label {
                        font-size: 0.69rem;
                    }

                    .signup-link-premium {
                        font-size: 0.69rem;
                    }

                    .social-login-divider,
                    .luxury-divider {
                        margin: 14px 0 10px;
                    }

                    .input-hint {
                        font-size: 0.66rem;
                        margin-top: 4px;
                    }
                }

                @media (max-height: 520px) and (orientation: landscape) {
                    .premium-login-container {
                        padding: 14px;
                    }

                    .premium-login-container .container.min-vh-100 {
                        align-items: flex-start !important;
                        min-height: auto !important;
                    }

                    .glass-master-card {
                        padding: 22px 20px;
                    }

                    .login-header {
                        margin-bottom: 0.9rem !important;
                    }

                    .login-header .brand-shield {
                        margin-bottom: 0.75rem !important;
                    }

                    .input-field-wrap {
                        margin-bottom: 0.1rem;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .luxury-orb,
                    .glass-master-card,
                    .google-spinner,
                    .spinner {
                        animation: none !important;
                    }

                    .master-login-btn,
                    .google-login-btn,
                    .input-box {
                        transition: none !important;
                    }
                }
            `}} />
        </div>
    )
}