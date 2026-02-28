import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { getUser } from '../Store/ActionCreaters/UserActionCreators'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, User as UserIcon, Lock, Eye, EyeOff, AlertCircle, ChevronRight, Loader2 } from 'lucide-react'
import { loginAPI } from '../Store/Services'

export default function Login() {
    const [data, setdata] = useState({ username: "", password: "" })
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")
    const [rememberMe, setRememberMe] = useState(false)
    const [autoLoginAttempted, setAutoLoginAttempted] = useState(false)
    
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
    }

    async function postData(e) {
        e.preventDefault();
        setLoading(true)
        try {
            const user = await loginAPI(data)
            setLoading(false)
            if (user.username) {
                // --- STANDARD LOGIN SETUP ---
                localStorage.setItem("login", true);
                localStorage.setItem("name", user.name);
                localStorage.setItem("userid", user.id);
                localStorage.setItem("role", user.role);
                localStorage.setItem("username", user.username);

                // --- REMEMBER ME: SAVE TOKEN & CREDENTIALS ---
                if (rememberMe) {
                    // Save full user object as token for auto-login
                    const userToken = {
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        role: user.role,
                        email: user.email
                    }
                    localStorage.setItem("userToken", JSON.stringify(userToken))
                    
                    // Also save credentials for form pre-fill
                    localStorage.setItem("savedCredentials", JSON.stringify({
                        username: data.username,
                        password: data.password
                    }))
                } else {
                    // Clear saved credentials if "Remember Me" is unchecked
                    localStorage.removeItem("userToken")
                    localStorage.removeItem("savedCredentials")
                }

                navigate(user.role === "Admin" ? "/admin-home" : "/profile");
            } else {
                setErrorMsg(user.message || "Invalid credentials. Please try again.");
            }
        } catch (err) {
            setLoading(false)
            setErrorMsg(err.message || "Login failed. Please try again.");
        }
    }

    return (
        <div className="premium-login-container">
            {/* Dynamic Background */}
            <div className="luxury-bg-overlay"></div>
            
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
                                    <input type="text" name="username" placeholder="Username or Email" value={data.username} onChange={getData} required />
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
                                    <input type={showPass ? "text" : "password"} name="password" placeholder="••••••••" value={data.password} onChange={getData} required />
                                    <button type="button" className="eye-toggle" onClick={() => setShowPass(!showPass)}>
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

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
                                ) : (
                                    <><LogIn size={20} className="mr-2" /> ENTER PORTAL <ChevronRight size={18} className="ml-auto" /></>
                                )}
                            </motion.button>
                        </form>

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
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Montserrat:wght@300;400;700;800&display=swap');

                .premium-login-container {
                    position: relative;
                    min-height: 100vh;
                    background: url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=80') center/cover;
                    font-family: 'Montserrat', sans-serif;
                    overflow: hidden;
                }

                .luxury-bg-overlay {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(23,162,184,0.3) 100%);
                    backdrop-filter: blur(5px);
                }

                .glass-master-card {
                    position: relative;
                    width: 100%;
                    max-width: 480px;
                    background: rgba(255, 255, 255, 0.92);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    border-radius: 40px;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.4);
                    padding: 60px 40px;
                }

                .brand-shield {
                    width: 60px; height: 60px;
                    background: #111;
                    color: white;
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto;
                    border-radius: 18px;
                    font-family: 'Cinzel', serif;
                    font-size: 1.5rem;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                }

                .brand-name {
                    font-family: 'Montserrat', sans-serif;
                    font-weight: 800;
                    letter-spacing: 6px;
                    font-size: 2rem;
                    color: #111;
                    margin-bottom: 5px;
                }

                .accent-dot { color: #17a2b8; }

                .login-subtitle {
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 3px;
                    color: #888;
                }

                .input-field-wrap { margin-bottom: 25px; }
                .input-field-wrap label {
                    font-size: 10px;
                    font-weight: 800;
                    color: #222;
                    margin-bottom: 10px;
                    display: block;
                    letter-spacing: 2px;
                }

                .input-box {
                    display: flex;
                    align-items: center;
                    background: #f4f7f8;
                    border: 2px solid transparent;
                    border-radius: 15px;
                    padding: 8px 15px;
                    transition: 0.4s;
                }

                .input-box:focus-within {
                    border-color: #17a2b8;
                    background: white;
                    box-shadow: 0 5px 15px rgba(23,162,184,0.1);
                }

                .input-box input {
                    border: none;
                    background: transparent;
                    width: 100%;
                    outline: none;
                    font-size: 15px;
                    font-weight: 600;
                    padding: 10px;
                    color: #111;
                }

                .icon { color: #bbb; transition: 0.3s; }
                .input-box:focus-within .icon { color: #17a2b8; }

                .input-hint {
                    font-size: 11px;
                    color: #666;
                    margin-top: 6px;
                    margin-left: 4px;
                    font-weight: 500;
                }

                .eye-toggle { border: none; background: transparent; color: #bbb; cursor: pointer; }

                /* --- REMEMBER ME CHECKBOX STYLING --- */
                .remember-me-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 20px;
                }

                .remember-checkbox {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                    accent-color: #17a2b8;
                    border-radius: 4px;
                }

                .remember-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: #333;
                    cursor: pointer;
                    user-select: none;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .remember-label:hover {
                    color: #17a2b8;
                }

                .master-login-btn {
                    width: 100%;
                    background: #111;
                    color: white;
                    border: none;
                    padding: 20px;
                    border-radius: 20px;
                    font-weight: 800;
                    font-size: 14px;
                    letter-spacing: 2px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    margin-top: 30px;
                    transition: 0.4s;
                }

                .master-login-btn:hover {
                    background: #17a2b8;
                    transform: translateY(-3px);
                    box-shadow: 0 15px 30px rgba(23,162,184,0.3);
                }

                .premium-error-alert {
                    background: #fff0f0;
                    color: #e53e3e;
                    padding: 15px;
                    border-radius: 15px;
                    margin-bottom: 25px;
                    font-size: 12px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    border-left: 4px solid #e53e3e;
                }

                .luxury-divider {
                    margin: 40px 0 25px;
                    position: relative;
                    text-align: center;
                }

                .luxury-divider::before {
                    content: '';
                    position: absolute;
                    top: 50%; left: 0; width: 100%; height: 1px;
                    background: #eee;
                    z-index: 1;
                }

                .luxury-divider span {
                    background: rgba(255, 255, 255, 0.92);
                    padding: 0 15px;
                    position: relative;
                    z-index: 2;
                    font-size: 10px;
                    font-weight: 700;
                    color: #aaa;
                    letter-spacing: 2px;
                }

                .signup-link-premium {
                    color: #111;
                    font-weight: 800;
                    letter-spacing: 1.5px;
                    font-size: 12px;
                    text-decoration: none;
                    padding-bottom: 5px;
                    border-bottom: 2px solid #17a2b8;
                    transition: 0.3s;
                }

                .signup-link-premium:hover {
                    color: #17a2b8;
                }

                .spinner { animation: rotate 2s linear infinite; }
                @keyframes rotate { 100% { transform: rotate(360deg); } }

                /* === 📱 PREMIUM FULL RESPONSIVE DESIGN === */
                
                /* Extra Large Devices (1200px and up) */
                @media (min-width: 1200px) {
                    .glass-master-card { 
                        max-width: 520px; 
                        padding: 70px 50px;
                        box-shadow: 0 50px 120px rgba(0,0,0,0.5);
                    }
                    .brand-name { font-size: 2.2rem; }
                    .input-box input { font-size: 16px; }
                }

                /* Large Devices (992px to 1199px) */
                @media (max-width: 1199px) and (min-width: 992px) {
                    .premium-login-container { padding: 50px 30px; }
                    .glass-master-card { max-width: 500px; padding: 60px 45px; }
                }

                /* Medium Devices - Tablets (768px to 991px) */
                @media (max-width: 991px) and (min-width: 768px) {
                    .premium-login-container { padding: 40px 20px; }
                    .glass-master-card { max-width: 480px; padding: 50px 35px; border-radius: 35px; }
                    .brand-name { font-size: 1.75rem; letter-spacing: 5px; }
                    .login-subtitle { font-size: 9px; letter-spacing: 2.5px; }
                    .input-box input { font-size: 15px; }
                    .master-login-btn { padding: 18px; font-size: 13px; }
                }

                /* Small Tablets & Large Phones (576px to 767px) */
                @media (max-width: 767px) and (min-width: 576px) {
                    .glass-master-card { 
                        max-width: 92%; 
                        padding: 45px 32px; 
                        border-radius: 32px; 
                    }
                    .brand-shield { width: 56px; height: 56px; font-size: 1.35rem; }
                    .brand-name { font-size: 1.65rem; letter-spacing: 4.5px; }
                    .login-subtitle { font-size: 8.5px; letter-spacing: 2.3px; }
                    .input-field-wrap label { font-size: 9.5px; }
                    .input-box { padding: 10px 16px; }
                    .input-box input { padding: 11px; font-size: 14.5px; }
                    .master-login-btn { padding: 17px; font-size: 12.5px; }
                    .input-hint { font-size: 10.5px; }
                }

                /* Standard Mobile (480px to 575px) */
                @media (max-width: 575px) and (min-width: 480px) {
                    .premium-login-container { padding: 25px 18px; }
                    .glass-master-card { 
                        border-radius: 28px; 
                        padding: 42px 28px; 
                        max-width: 94%;
                        box-shadow: 0 25px 70px rgba(0,0,0,0.35);
                    }
                    .brand-shield { width: 52px; height: 52px; font-size: 1.25rem; border-radius: 16px; }
                    .brand-name { font-size: 1.5rem; letter-spacing: 3.5px; }
                    .login-subtitle { font-size: 7.5px; letter-spacing: 2.2px; }
                    .input-field-wrap label { font-size: 9px; letter-spacing: 1.7px; }
                    .input-box { 
                        padding: 9px 14px;
                        border-radius: 14px;
                    }
                    .input-box input { 
                        padding: 11px; 
                        font-size: 14px;
                    }
                    .master-login-btn { 
                        padding: 16px; 
                        font-size: 12px; 
                        letter-spacing: 2.2px;
                        border-radius: 18px;
                    }
                    .input-hint { font-size: 10px; }
                    .remember-label { font-size: 11.5px; }
                    .signup-link-premium { font-size: 11.5px; }
                }

                /* Compact Mobile (375px to 479px) */
                @media (max-width: 479px) and (min-width: 375px) {
                    .premium-login-container { padding: 20px 15px; }
                    .glass-master-card { 
                        border-radius: 25px; 
                        padding: 38px 24px; 
                        max-width: 95%;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    }
                    .brand-shield { width: 48px; height: 48px; font-size: 1.15rem; border-radius: 14px; }
                    .brand-name { font-size: 1.35rem; letter-spacing: 3px; margin-bottom: 3px; }
                    .login-subtitle { font-size: 7px; letter-spacing: 2px; }
                    .input-field-wrap label { font-size: 8.5px; letter-spacing: 1.5px; }
                    .input-box { 
                        padding: 8px 13px;
                        border-radius: 13px;
                    }
                    .input-box input { 
                        padding: 10px; 
                        font-size: 13.5px;
                    }
                    .master-login-btn { 
                        padding: 15px; 
                        font-size: 11.5px; 
                        letter-spacing: 2px;
                        border-radius: 16px;
                    }
                    .input-hint { font-size: 10px; margin-top: 5px; }
                    .remember-label { font-size: 11px; }
                    .remember-checkbox { width: 17px; height: 17px; }
                    .luxury-divider { margin: 35px 0 20px; }
                    .signup-link-premium { font-size: 11px; }
                }

                /* Extra Small Mobile (320px to 374px) */
                @media (max-width: 374px) {
                    .premium-login-container { 
                        padding: 15px 12px; 
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                    }
                    .glass-master-card { 
                        padding: 32px 20px; 
                        border-radius: 22px;
                        max-width: 96%;
                        box-shadow: 0 15px 50px rgba(0,0,0,0.25);
                    }
                    .brand-shield { width: 44px; height: 44px; font-size: 1.05rem; border-radius: 13px; }
                    .brand-name { font-size: 1.2rem; letter-spacing: 2.5px; margin-bottom: 2px; }
                    .login-subtitle { font-size: 6.5px; letter-spacing: 1.8px; }
                    .input-field-wrap { margin-bottom: 20px; }
                    .input-field-wrap label { font-size: 8px; letter-spacing: 1.3px; margin-bottom: 8px; }
                    .input-box { 
                        padding: 7px 12px;
                        border-radius: 12px;
                    }
                    .input-box input { 
                        padding: 9px; 
                        font-size: 13px;
                    }
                    .icon { width: 16px; height: 16px; }
                    .master-login-btn { 
                        padding: 14px; 
                        font-size: 11px; 
                        letter-spacing: 1.8px;
                        border-radius: 15px;
                        margin-top: 25px;
                    }
                    .input-hint { font-size: 9.5px; margin-top: 5px; }
                    .remember-me-wrapper { gap: 8px; margin-bottom: 18px; }
                    .remember-checkbox { width: 16px; height: 16px; }
                    .remember-label { font-size: 10.5px; gap: 7px; }
                    .luxury-divider { margin: 30px 0 18px; }
                    .luxury-divider span { font-size: 9px; padding: 0 12px; }
                    .signup-link-premium { font-size: 10.5px; letter-spacing: 1.2px; }
                    .premium-error-alert { 
                        padding: 12px; 
                        font-size: 11px;
                        border-radius: 12px;
                        margin-bottom: 20px;
                    }
                }

                /* Tall Screens - Center Content */
                @media (min-height: 900px) {
                    .premium-login-container { 
                        align-items: center !important;
                        justify-content: center !important;
                    }
                }

                /* Touch-Friendly Enhancements for Mobile */
                @media (max-width: 767px) {
                    .input-box {
                        min-height: 48px; /* Touch-friendly minimum */
                    }
                    .master-login-btn {
                        min-height: 50px; /* Easier to tap */
                        touch-action: manipulation; /* Prevent double-tap zoom */
                    }
                    .remember-checkbox {
                        min-width: 20px;
                        min-height: 20px;
                    }
                    .eye-toggle {
                        padding: 8px;
                        min-width: 36px;
                        min-height: 36px;
                    }
                }

                /* Landscape Mode Optimizations */
                @media (max-height: 500px) and (orientation: landscape) {
                    .premium-login-container { 
                        padding: 20px 15px;
                        align-items: flex-start !important;
                    }
                    .glass-master-card { 
                        padding: 30px 35px;
                        margin: 20px auto;
                    }
                    .brand-shield { width: 40px; height: 40px; font-size: 1rem; }
                    .brand-name { font-size: 1.3rem; margin-bottom: 2px; }
                    .login-subtitle { font-size: 7px; margin-bottom: 15px; }
                    .input-field-wrap { margin-bottom: 18px; }
                    .master-login-btn { margin-top: 20px; padding: 14px; }
                    .luxury-divider { margin: 25px 0 15px; }
                }
            `}} />
        </div>
    )
}