import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { KeyRound, User, Lock, CheckCircle2 } from 'lucide-react'
import { BASE_URL } from '../constants'

export default function ForgetPassword() {
    const [data, setdata] = useState({ username: "", password: "", cpassword: "" })
    const users = useSelector(state => state.UserStateData)
    const navigate = useNavigate()

    async function postData(e) {
        e.preventDefault()
        if (data.password !== data.cpassword) {
            alert("Passwords do not match!")
            return
        }
        
        const user = users.find(x => x.username === data.username)
        if (user) {
            // Password update logic directly to live backend
            let response = await fetch(`${BASE_URL}/user/${user.id}`, {
                method: "put",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ...user, password: data.password })
            })
            if(response.ok){
                alert("Password Updated Successfully! Please Login.")
                navigate("/login")
            }
        } else {
            alert("Username not found in our database!")
        }
    }

    return (
        <div className="d-flex align-items-center justify-content-center" 
             style={{ minHeight: "100vh", background: "url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=80') center/cover" }}>
            
            <motion.div 
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                className="p-5 shadow-lg"
                style={{ width: "450px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(15px)", borderRadius: "30px", border: "1px solid rgba(255,255,255,0.3)" }}
            >
                <div className="text-center mb-5">
                    <div className="bg-info-light d-inline-block p-3 rounded-circle mb-3">
                        <KeyRound size={40} className="text-info" />
                    </div>
                    <h2 className="font-weight-bold text-dark">Reset Password</h2>
                    <p className="text-muted small">Update your account security</p>
                </div>

                <form onSubmit={postData}>
                    <div className="form-group mb-4 border-bottom">
                        <label className="small font-weight-bold text-muted mb-0">Username</label>
                        <div className="d-flex align-items-center">
                            <User size={18} className="text-info mr-2" />
                            <input type="text" placeholder="Enter Username" className="form-control border-0 bg-transparent shadow-none" onChange={(e) => setdata({ ...data, username: e.target.value })} required />
                        </div>
                    </div>

                    <div className="form-group mb-4 border-bottom">
                        <label className="small font-weight-bold text-muted mb-0">New Password</label>
                        <div className="d-flex align-items-center">
                            <Lock size={18} className="text-info mr-2" />
                            <input type="password" placeholder="••••••••" className="form-control border-0 bg-transparent shadow-none" onChange={(e) => setdata({ ...data, password: e.target.value })} required />
                        </div>
                    </div>

                    <div className="form-group mb-4 border-bottom">
                        <label className="small font-weight-bold text-muted mb-0">Confirm Password</label>
                        <div className="d-flex align-items-center">
                            <CheckCircle2 size={18} className="text-info mr-2" />
                            <input type="password" placeholder="••••••••" className="form-control border-0 bg-transparent shadow-none" onChange={(e) => setdata({ ...data, cpassword: e.target.value })} required />
                        </div>
                    </div>

                    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} type="submit" className="btn btn-info btn-block py-3 rounded-pill shadow-lg font-weight-bold mt-2">
                        UPDATE PASSWORD
                    </motion.button>
                </form>

                <div className="text-center mt-4">
                    <Link to="/login" className="text-muted small">Back to Login</Link>
                </div>
            </motion.div>
        </div>
    )
}