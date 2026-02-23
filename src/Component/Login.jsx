import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
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

    useEffect(() => { 
        dispatch(getUser()) 
        window.scrollTo(0, 0);
    }, [dispatch])

    function getData(e) {
        setdata({ ...data, [e.target.name]: e.target.value })
        if (errorMsg) setErrorMsg("");
    }

    function postData(e) {
        e.preventDefault();
        setLoading(true)
        fetch("https://eshopper-ukgu.onrender.com/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(user => {
            setLoading(false)
            if (user.username) {
                localStorage.setItem("login", true);
                localStorage.setItem("name", user.name);
                localStorage.setItem("userid", user.id);
                localStorage.setItem("role", user.role);
                localStorage.setItem("username", user.username);
                navigate(user.role === "Admin" ? "/admin-home" : "/profile");
            } else {
                setErrorMsg(user.message || "Access Denied: Invalid Credentials");
            }
        })
        .catch(() => {
            setLoading(false)
            setErrorMsg("Server Error: Please try after 30 seconds.");
        });
    }

    return (
        <div className="login-root">
            <div className="overlay-luxury"></div>
            <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="login-card-main shadow-premium">
                    <div className="login-inner p-4 p-md-5 text-center">
                        <h2 className="brand-logo mb-0">ESHOPPER<span className="dot">.</span></h2>
                        <p className="subtitle mb-5">SIGN IN TO ACCESS EXCLUSIVE COLLECTIONS</p>

                        <AnimatePresence>
                            {errorMsg && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="alert-premium mb-4">
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
                                    <input type="text" name="username" placeholder="enter your identity" onChange={getData} required />
                                </div>
                            </div>

                            <div className="premium-field mb-5">
                                <div className="d-flex justify-content-between align-items-center">
                                    <label className="field-label">PASSWORD</label>
                                    {/* FIXED LINK BELOW */}
                                    <Link to="/forget-password" style={{fontSize:"11px", color:"#17a2b8", fontWeight:"700", textDecoration:"none"}}>Forgotten?</Link>
                                </div>
                                <div className="input-wrap">
                                    <Lock size={18} className="field-icon" />
                                    <input type={showPass ? "text" : "password"} name="password" placeholder="········" onChange={getData} required />
                                    <button type="button" className="pass-btn" onClick={() => setShowPass(!showPass)}>
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="login-submit shadow-lg" disabled={loading}>
                                {loading ? "Verifying..." : "ENTER PORTAL"}
                            </button>
                        </form>

                        <div className="divider-premium mt-5">
                            <Link to="/signup" className="signup-call-link mt-2 d-inline-block">CREATE A MASTER ACCOUNT</Link>
                        </div>
                    </div>
                </motion.div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .login-root { position: relative; min-height: 100vh; background: url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80') center/cover; }
                .overlay-luxury { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); }
                .login-card-main { position: relative; width: 100%; max-width: 480px; background: white; border-radius: 40px; }
                .brand-logo { font-weight: 800; letter-spacing: 5px; font-size: 2rem; color: #111; }
                .dot { color: #17a2b8; }
                .subtitle { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #777; }
                .input-wrap { display: flex; align-items: center; border-bottom: 2px solid #eee; }
                .input-wrap input { border: none; width: 100%; padding: 10px; outline: none; }
                .login-submit { width: 100%; background: #000; color: white; border: none; padding: 15px; border-radius: 50px; font-weight: 800; letter-spacing: 2px; }
                .alert-premium { background: #fff5f5; color: #c53030; padding: 10px; border-radius: 10px; font-size: 12px; }
                .signup-call-link { color: #111; font-weight: 800; text-decoration: none; border-bottom: 2px solid #17a2b8; }
                .pass-btn { border: none; background: transparent; color: #ccc; }
            `}} />
        </div>
    )
}