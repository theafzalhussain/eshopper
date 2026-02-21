import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getUser } from '../Store/ActionCreaters/UserActionCreators'
import { motion } from 'framer-motion'
import { User, Lock, KeyRound, CheckCircle2 } from 'lucide-react'

export default function ForgetPassword() {
    const [data, setdata] = useState({ username: "", password: "", cpassword: "" })
    const users = useSelector(state => state.UserStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    function postData(e) {
        e.preventDefault()
        if (data.password !== data.cpassword) {
            alert("Passwords do not match!")
            return
        }
        
        const user = users.find(x => x.username === data.username)
        if (user) {
            // Hum directly service call ya dispatch use kar sakte hain
            fetch(`https://eshopper-ukgu.onrender.com/user/${user.id}`, {
                method: "put",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ...user, password: data.password })
            }).then(() => {
                alert("Password Changed Successfully!")
                navigate("/login")
            })
        } else {
            alert("Username not found!")
        }
    }

    return (
        <div className="login-wrapper d-flex align-items-center justify-content-center" 
             style={{ minHeight: "100vh", background: "url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=80') center/cover" }}>
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="p-5 shadow-2xl"
                style={{ width: "450px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(15px)", borderRadius: "30px" }}
            >
                <div className="text-center mb-5">
                    <KeyRound size={40} className="text-info mb-3" />
                    <h2 className="font-weight-bold text-dark">Reset Password</h2>
                    <p className="text-muted small">Enter your username to set a new password</p>
                </div>

                <form onSubmit={postData}>
                    <div className="input-lux mb-4">
                        <User size={18} className="text-muted mr-2" />
                        <input type="text" placeholder="Your Username" onChange={(e) => setdata({ ...data, username: e.target.value })} required />
                    </div>

                    <div className="input-lux mb-4">
                        <Lock size={18} className="text-muted mr-2" />
                        <input type="password" placeholder="New Password" onChange={(e) => setdata({ ...data, password: e.target.value })} required />
                    </div>

                    <div className="input-lux mb-4">
                        <CheckCircle2 size={18} className="text-muted mr-2" />
                        <input type="password" placeholder="Confirm New Password" onChange={(e) => setdata({ ...data, cpassword: e.target.value })} required />
                    </div>

                    <motion.button whileTap={{ scale: 0.98 }} className="btn btn-info btn-block py-3 rounded-pill shadow-lg font-weight-bold">
                        RESET PASSWORD
                    </motion.button>
                </form>

                <div className="text-center mt-4">
                    <Link to="/login" className="small text-dark font-weight-bold">Back to Login</Link>
                </div>
            </motion.div>
            <style dangerouslySetInnerHTML={{ __html: `
                .input-lux { display: flex; align-items: center; border-bottom: 2px solid #ddd; padding: 10px 5px; }
                .input-lux input { border: none; background: transparent; width: 100%; outline: none; }
            `}} />
        </div>
    )
}