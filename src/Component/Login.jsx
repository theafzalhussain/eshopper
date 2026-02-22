import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser } from '../Store/ActionCreaters/UserActionCreators'
import { motion } from 'framer-motion'
import { LogIn, User as UserIcon, Lock, Eye, EyeOff } from 'lucide-react'

export default function Login() {
    const [data, setdata] = useState({ username: "", password: "" })
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => { dispatch(getUser()) }, [dispatch])

    function postData(e) {
        e.preventDefault()
        setLoading(true)

        fetch("https://eshopper-ukgu.onrender.com/login", {
            method: "post",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(data)
        })
        .then(res => {
            if (res.ok) return res.json();
            throw new Error('Authentication failed');
        })
        .then((user) => {
            localStorage.setItem("login", true)
            localStorage.setItem("name", user.name)
            localStorage.setItem("username", user.username)
            localStorage.setItem("userid", user.id)
            localStorage.setItem("role", user.role)

            const backUrl = location.state?.from || (user.role === "Admin" ? "/admin-home" : "/profile")
            navigate(backUrl)
        })
        .catch(() => {
            alert("Oops! Invalid credentials or server is sleepy. Try again!")
        })
        .finally(() => setLoading(false))
    }

    return (
        <div className="login-wrapper d-flex align-items-center justify-content-center" 
             style={{ minHeight: "100vh", background: "url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=80') center/cover" }}>
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="p-5 shadow-2xl bg-glass text-center"
                style={{ width: "450px", borderRadius: "30px", border: "1px solid rgba(255,255,255,0.3)" }}
            >
                <h2 className="font-weight-bold mb-5 text-dark">ESHOPPER<span className="text-info">.</span></h2>

                <form onSubmit={postData}>
                    <div className="input-group-premium mb-4">
                        <UserIcon size={18} className="text-muted mr-3" />
                        <input type="text" name="username" placeholder="Username" className='p-input' onChange={(e)=>setdata({...data, username: e.target.value})} required />
                    </div>

                    <div className="input-group-premium mb-4">
                        <Lock size={18} className="text-muted mr-3" />
                        <input type={showPass ? "text" : "password"} name="password" placeholder="Password" className='p-input' onChange={(e)=>setdata({...data, password: e.target.value})} required />
                        <button type="button" className='pass-toggle' onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                    </div>

                    <button type="submit" className="btn btn-info btn-block py-3 rounded-pill shadow-lg font-weight-bold" disabled={loading}>
                        {loading ? "VERIFYING..." : "SIGN IN"} <LogIn size={18} className="ml-2" />
                    </button>
                </form>

                <div className='mt-5 d-flex justify-content-between'>
                    <Link to="/forget-password" size="sm" className='text-info font-weight-bold small'>Forgot Password?</Link>
                    <Link to="/signup" className='text-muted small'>New? <span className="text-info font-weight-bold border-bottom">Create Account</span></Link>
                </div>
            </motion.div>

            <style>{`
                .bg-glass { background: rgba(255,255,255,0.88); backdrop-filter: blur(25px); }
                .input-group-premium { display: flex; align-items: center; border-bottom: 2px solid #eee; padding: 10px 0; }
                .p-input { border: none; background: transparent; width: 100%; outline: none; font-size: 15px; }
                .pass-toggle { border: none; background: transparent; opacity: 0.5; }
            `}</style>
        </div>
    )
}