import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser } from '../Store/ActionCreaters/UserActionCreators'
import { motion } from 'framer-motion'
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-react'

export default function Login() {
    const [data, setdata] = useState({ username: "", password: "" })
    const [showPass, setShowPass] = useState(false)
    const users = useSelector((state) => state.UserStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const location = useLocation()

    function getData(e) {
        setdata({ ...data, [e.target.name]: e.target.value })
    }

    function postData(e) {
        e.preventDefault()
        const user = users.find(x => x.username === data.username && x.password === data.password)
        if (user) {
            localStorage.setItem("login", true)
            localStorage.setItem("name", user.name)
            localStorage.setItem("username", user.username)
            localStorage.setItem("userid", user.id)
            localStorage.setItem("role", user.role)

            // Redirect Logic: Go back to previous page or Home
            const backUrl = location.state?.from || (user.role === "Admin" ? "/admin-home" : "/profile")
            navigate(backUrl)
        } else {
            alert("Invalid Credentials!")
        }
    }

    useEffect(() => { dispatch(getUser()) }, [dispatch])

    return (
        <div className="login-wrapper d-flex align-items-center justify-content-center" 
             style={{ minHeight: "100vh", background: "url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80') center/cover" }}>
            
            {/* Glassmorphism Card */}
            <motion.div 
                initial={{ y: 50, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                className="login-card p-5 shadow-2xl"
                style={{ width: "450px", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", borderRadius: "30px", border: "1px solid rgba(255,255,255,0.3)" }}
            >
                <div className="text-center mb-5">
                    <h2 className="font-weight-bold text-dark" style={{ letterSpacing: "2px" }}>ESHOPPER<span className="text-info">.</span></h2>
                    <p className="text-muted small text-uppercase">Exclusive Member Access</p>
                </div>

                <form onSubmit={postData}>
                    <div className="input-lux mb-4">
                        <User size={18} className="text-muted mr-2" />
                        <input type="text" name="username" placeholder="Username" onChange={getData} required />
                    </div>

                    <div className="input-lux mb-4 position-relative">
                        <Lock size={18} className="text-muted mr-2" />
                        <input type={showPass ? "text" : "password"} name="password" placeholder="Password" onChange={getData} required />
                        <span className="position-absolute cursor-pointer" style={{ right: "15px" }} onClick={() => setShowPass(!showPass)}>
                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </span>
                    </div>

                    <div className="text-right mb-4">
                     <Link to="/forget-password">Forgot Password?</Link>
                    </div>

                    <motion.button 
                        whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                        className="btn btn-dark btn-block py-3 rounded-pill shadow-xl font-weight-bold"
                    >
                        SIGN IN <LogIn size={18} className="ml-2" />
                    </motion.button>
                </form>

                <div className="text-center mt-5">
                    <p className="small text-muted">New to Eshopper? <Link to="/signup" className="text-info font-weight-bold border-bottom border-info pb-1">Create Account</Link></p>
                </div>
            </motion.div>

            <style dangerouslySetInnerHTML={{ __html: `
                .input-lux { display: flex; align-items: center; border-bottom: 2px solid #eee; padding: 10px 5px; transition: 0.3s; }
                .input-lux:focus-within { border-color: #17a2b8; }
                .input-lux input { border: none; background: transparent; width: 100%; outline: none; font-size: 15px; }
                .cursor-pointer { cursor: pointer; }
                .shadow-2xl { box-shadow: 0 50px 100px rgba(0,0,0,0.2) !important; }
            `}} />
        </div>
    )
}