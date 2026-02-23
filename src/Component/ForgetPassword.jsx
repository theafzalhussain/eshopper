import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { KeyRound, User, Lock, CheckCircle2 } from 'lucide-react'

export default function ForgetPassword() {
    const [data, setdata] = useState({ username: "", password: "", cpassword: "" })
    const navigate = useNavigate()
    const dispatch = useDispatch()

    function postData(e) {
        e.preventDefault()
        if (data.password !== data.cpassword) {
            alert("Passwords do not match!")
            return
        }
        // Dispatched to UserSaga
        dispatch({ type: "FORGET_PASSWORD", payload: data })
        alert("Reset Request Sent! If username matches, password will be updated.")
        navigate("/login")
    }

    return (
        <div className="d-flex align-items-center justify-content-center" 
             style={{ minHeight: "100vh", background: "url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=80') center/cover" }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="p-5 shadow-lg bg-white" style={{ width: "450px", borderRadius: "30px" }}>
                <div className="text-center mb-5">
                    <KeyRound size={40} className="text-info mb-3" />
                    <h2 className="font-weight-bold">Reset Password</h2>
                </div>
                <form onSubmit={postData}>
                    <div className="mb-4 border-bottom">
                        <label className="small font-weight-bold text-muted">Username</label>
                        <div className="d-flex align-items-center">
                            <User size={18} className="text-info mr-2" />
                            <input type="text" placeholder="Enter Username" className="form-control border-0 bg-transparent shadow-none" onChange={(e) => setdata({ ...data, username: e.target.value })} required />
                        </div>
                    </div>
                    <div className="mb-4 border-bottom">
                        <label className="small font-weight-bold text-muted">New Password</label>
                        <div className="d-flex align-items-center">
                            <Lock size={18} className="text-info mr-2" />
                            <input type="password" placeholder="••••••••" className="form-control border-0 bg-transparent shadow-none" onChange={(e) => setdata({ ...data, password: e.target.value })} required />
                        </div>
                    </div>
                    <div className="mb-4 border-bottom">
                        <label className="small font-weight-bold text-muted">Confirm Password</label>
                        <div className="d-flex align-items-center">
                            <CheckCircle2 size={18} className="text-info mr-2" />
                            <input type="password" placeholder="••••••••" className="form-control border-0 bg-transparent shadow-none" onChange={(e) => setdata({ ...data, cpassword: e.target.value })} required />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-info btn-block py-3 rounded-pill font-weight-bold">UPDATE PASSWORD</button>
                </form>
                <div className="text-center mt-4">
                    <Link to="/login" className="text-muted small">Back to Login</Link>
                </div>
            </motion.div>
        </div>
    )
}