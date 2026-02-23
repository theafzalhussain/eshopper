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
        e.preventDefault();
        
        // 1. Password Matching Check
        if (data.password !== data.cpassword) {
            alert("Password & Confirm Password doesn't match!");
            return;
        }

        // 2. Dispatch Action to Saga
        // Note: Ye userSaga mein "FORGET_PASSWORD" ko trigger karega
        dispatch({ type: "FORGET_PASSWORD", payload: data });

        // 3. Success Feedback
        alert("If the username exists, your password has been updated. Redirecting to Login...");
        navigate("/login");
    }

    return (
        <div className="d-flex align-items-center justify-content-center" 
             style={{ minHeight: "100vh", background: "url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=80') center/cover" }}>
            
            <motion.div 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }}
                className="p-5 shadow-lg bg-white"
                style={{ width: "450px", backdropFilter: "blur(15px)", borderRadius: "30px", border: "1px solid rgba(0,0,0,0.1)" }}
            >
                <div className="text-center mb-5">
                    <div className="bg-light d-inline-block p-3 rounded-circle mb-3">
                        <KeyRound size={40} className="text-info" />
                    </div>
                    <h2 className="font-weight-bold text-dark">Reset Password</h2>
                    <p className="text-muted small">Update your account security</p>
                </div>

                <form onSubmit={postData}>
                    <div className="form-group mb-4 border-bottom pb-2">
                        <label className="small font-weight-bold text-muted mb-0">Username</label>
                        <div className="d-flex align-items-center">
                            <User size={18} className="text-info mr-2" />
                            <input 
                                type="text" 
                                placeholder="Enter Username" 
                                className="form-control border-0 bg-transparent shadow-none" 
                                onChange={(e) => setdata({ ...data, username: e.target.value })} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="form-group mb-4 border-bottom pb-2">
                        <label className="small font-weight-bold text-muted mb-0">New Password</label>
                        <div className="d-flex align-items-center">
                            <Lock size={18} className="text-info mr-2" />
                            <input 
                                type="password" 
                                placeholder="••••••••" 
                                className="form-control border-0 bg-transparent shadow-none" 
                                onChange={(e) => setdata({ ...data, password: e.target.value })} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="form-group mb-4 border-bottom pb-2">
                        <label className="small font-weight-bold text-muted mb-0">Confirm Password</label>
                        <div className="d-flex align-items-center">
                            <CheckCircle2 size={18} className="text-info mr-2" />
                            <input 
                                type="password" 
                                placeholder="••••••••" 
                                className="form-control border-0 bg-transparent shadow-none" 
                                onChange={(e) => setdata({ ...data, cpassword: e.target.value })} 
                                required 
                            />
                        </div>
                    </div>

                    <motion.button 
                        whileHover={{ y: -2 }} 
                        whileTap={{ scale: 0.95 }} 
                        type="submit" 
                        className="btn btn-info btn-block py-3 rounded-pill shadow-lg font-weight-bold mt-2"
                    >
                        UPDATE PASSWORD
                    </motion.button>
                </form>

                <div className="text-center mt-4">
                    <Link to="/login" className="text-info font-weight-bold small">Back to Login</Link>
                </div>
            </motion.div>
        </div>
    )
}