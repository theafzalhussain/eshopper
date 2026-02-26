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
    
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => { 
        dispatch(getUser()) 
        window.scrollTo(0, 0);
    }, [dispatch])

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
                localStorage.setItem("login", true);
                localStorage.setItem("name", user.name);
                localStorage.setItem("userid", user.id);
                localStorage.setItem("role", user.role);
                localStorage.setItem("username", user.username);
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
                                    <input type="text" name="username" placeholder="Username" onChange={getData} required />
                                </div>
                            </div>

                            <div className="input-field-wrap">
                                <div className="d-flex justify-content-between align-items-center">
                                    <label>PASSWORD</label>
                                    <Link to="/forget-password" style={{fontSize:'10px', color:'#17a2b8', letterSpacing:'1px', textDecoration:'none', fontWeight:'800'}}>RECOVER?</Link>
                                </div>
                                <div className="input-box">
                                    <Lock size={18} className="icon" />
                                    <input type={showPass ? "text" : "password"} name="password" placeholder="••••••••" onChange={getData} required />
                                    <button type="button" className="eye-toggle" onClick={() => setShowPass(!showPass)}>
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
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

                .eye-toggle { border: none; background: transparent; color: #bbb; cursor: pointer; }

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

                @media (max-width: 576px) {
                    .glass-master-card { border-radius: 0; padding: 40px 20px; }
                }
            `}} />
        </div>
    )
}