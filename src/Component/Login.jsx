import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser } from '../Store/ActionCreaters/UserActionCreators'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, User as UserIcon, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function Login() {
    const [data, setdata] = useState({ username: "", password: "" })
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")
    
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => { 
        dispatch(getUser()) 
        // Reset scrolling for the page
        window.scrollTo(0, 0);
    }, [dispatch])

    function getData(e) {
        setdata({ ...data, [e.target.name]: e.target.value })
        if (errorMsg) setErrorMsg(""); // Error ko clear karna type karte waqt
    }

    async function postData(e) {
        e.preventDefault()
        setLoading(true)
        setErrorMsg("")

        try {
            const response = await fetch("https://eshopper-ukgu.onrender.com/login", {
                method: "post",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || "Unauthorized access");
            }

            const user = await response.json();

            localStorage.setItem("login", true)
            localStorage.setItem("name", user.name)
            localStorage.setItem("username", user.username)
            localStorage.setItem("userid", user.id)
            localStorage.setItem("role", user.role)

            // Redirect logic: Jis page se aaya tha wahi jaye, ya profile par
            const backUrl = location.state?.from || (user.role === "Admin" ? "/admin-home" : "/profile")
            navigate(backUrl)

        } catch (error) {
            setErrorMsg("Access Denied: Please check your credentials or try later.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-root">
            <div className="overlay-luxury"></div>
            
            <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
                <motion.div 
                    initial={{ opacity: 0, y: 30 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="login-card-main shadow-premium"
                >
                    <div className="login-inner p-4 p-md-5 text-center">
                        <motion.div 
                            initial={{ scale: 0.8 }} 
                            animate={{ scale: 1 }}
                            className="brand-badge mb-4"
                        >
                            <h2 className="brand-logo mb-0">ESHOPPER<span className="dot">.</span></h2>
                        </motion.div>
                        
                        <p className="subtitle mb-5">SIGN IN TO ACCESS EXCLUSIVE BOUTIQUE COLLECTIONS</p>

                        <AnimatePresence>
                            {errorMsg && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="alert-premium mb-4"
                                >
                                    <AlertCircle size={16} className="mr-2" />
                                    <span>{errorMsg}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={postData} className="text-left">
                            <div className="premium-field mb-4">
                                <label className="field-label">USERNAME</label>
                                <div className="input-wrap">
                                    <UserIcon size={18} className="field-icon" />
                                    <input type="text" name="username" placeholder="enter your identity" autoComplete="off" onChange={getData} required />
                                </div>
                            </div>

                            <div className="premium-field mb-5">
                                <div className="d-flex justify-content-between align-items-center">
                                    <label className="field-label">PASSWORD</label>
                                    <Link to="/forget-password text-decoration-none" className="forgot-link">Forgotten?</Link>
                                </div>
                                <div className="input-wrap">
                                    <Lock size={18} className="field-icon" />
                                    <input type={showPass ? "text" : "password"} name="password" placeholder="········" onChange={getData} required />
                                    <button type="button" className="pass-btn" onClick={() => setShowPass(!showPass)}>
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <motion.button 
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit" 
                                className="login-submit shadow-lg"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="loader-dots">Verifying identity...</span>
                                ) : (
                                    <><LogIn size={20} className="mr-2" /> ENTER PORTAL</>
                                )}
                            </motion.button>
                        </form>

                        <div className="divider-premium mt-5">
                            <span className="line"></span>
                            <p className="mt-3">
                                <span className="text-muted">NEOPHYTE TO ESHOPPER?</span> <br />
                                <Link to="/signup" className="signup-call-link mt-2 d-inline-block">CREATE A MASTER ACCOUNT</Link>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .login-root { 
                    position: relative; 
                    min-height: 100vh; 
                    background: url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80') center/cover;
                    overflow: hidden;
                }
                .overlay-luxury { 
                    position: absolute; top:0; left:0; width:100%; height:100%; 
                    background: linear-gradient(135deg, rgba(20,20,20,0.8) 0%, rgba(10,30,40,0.7) 100%);
                    backdrop-filter: blur(8px);
                }
                .login-card-main { 
                    position: relative; width: 100%; max-width: 480px; 
                    background: rgba(255, 255, 255, 0.94); 
                    border-radius: 40px; overflow: hidden;
                }
                .brand-logo { font-weight: 800; letter-spacing: 5px; font-size: 2.2rem; color: #111; }
                .dot { color: #17a2b8; }
                .subtitle { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #777; margin-top: -15px; }
                
                .premium-field .field-label { font-size: 11px; font-weight: 800; color: #222; margin-bottom: 8px; letter-spacing: 1px; }
                .input-wrap { display: flex; align-items: center; border-bottom: 2px solid #ddd; padding: 5px 0; transition: 0.3s; }
                .input-wrap:focus-within { border-color: #17a2b8; }
                .input-wrap input { border: none; background: transparent; width: 100%; outline: none; font-size: 16px; padding: 10px; color: #111; }
                .field-icon { color: #888; }
                
                .login-submit { 
                    width: 100%; background: #000; color: white; border: none; 
                    padding: 18px; border-radius: 50px; font-weight: 800; font-size: 14px;
                    letter-spacing: 3px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                }
                .forgot-link { font-size: 11px; color: #17a2b8; font-weight: 700; text-decoration: none !important; }
                .signup-call-link { color: #111; font-weight: 800; letter-spacing: 1.5px; font-size: 12px; border-bottom: 2px solid #17a2b8; text-decoration: none !important; }
                .alert-premium { background: #fff5f5; color: #c53030; border-radius: 12px; padding: 12px; font-size: 12px; display: flex; align-items: center; justify-content: center; }
                .pass-btn { border: none; background: transparent; color: #aaa; padding: 5px; }
                .line { width: 100%; height: 1px; background: #eee; display: block; }
                
                @media (max-width: 576px) { .login-card-main { border-radius: 0; min-height: 100vh; } }
            `}} />
        </div>
    )
}