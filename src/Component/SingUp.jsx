import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { sendOtpAPI, createUserAPI } from '../Store/Services'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Lock, ShieldCheck, Loader2 } from 'lucide-react'

export default function SingUp() {
    const [data, setdata] = useState({ name: "", email: "", username: "", password: "" })
    const [otpSent, setOtpSent] = useState(false)
    const [loading, setLoading] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    const [serverOtp, setServerOtp] = useState("")
    const navigate = useNavigate()

    async function handleRegister(e) {
        e.preventDefault(); setLoading(true);
        try {
            const res = await sendOtpAPI({ email: data.email, type: 'signup' })
            if (res.result === "Done") {
                setServerOtp(res.otp); setOtpSent(true);
                alert("Verification code sent to " + data.email)
            }
        } catch (err) { alert("Email already exists or Server Error") }
        setLoading(false)
    }

    async function verifyAndSignup(e) {
        e.preventDefault();
        if (userOtp === serverOtp) {
            const res = await createUserAPI(data)
            if (res.id) { alert("Verified! Welcome to Eshopper."); navigate("/login") }
        } else { alert("Incorrect Code!") }
    }

    return (
        <div className="container py-5 mt-5">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="col-md-5 mx-auto p-5 bg-white shadow-lg rounded-3xl">
                {!otpSent ? (
                    <form onSubmit={handleRegister}>
                        <h2 className="text-center font-weight-bold mb-4">Create Account</h2>
                        <input type="text" placeholder="Full Name" className="form-control mb-3" onChange={e => setdata({...data, name: e.target.value})} required />
                        <input type="email" placeholder="Email Address" className="form-control mb-3" onChange={e => setdata({...data, email: e.target.value})} required />
                        <input type="text" placeholder="Username" className="form-control mb-3" onChange={e => setdata({...data, username: e.target.value})} required />
                        <input type="password" placeholder="Password" className="form-control mb-4" onChange={e => setdata({...data, password: e.target.value})} required />
                        <button className="btn btn-dark btn-block py-3 rounded-pill" disabled={loading}>{loading ? <Loader2 className="animate-spin mx-auto"/> : "SEND OTP"}</button>
                    </form>
                ) : (
                    <form onSubmit={verifyAndSignup} className="text-center">
                        <ShieldCheck size={50} className="text-info mb-3 mx-auto" />
                        <h3>Verify Email</h3>
                        <p className="small text-muted mb-4">Code sent to {data.email}</p>
                        <input type="text" maxLength="6" className="form-control text-center h1 font-weight-bold mb-4" style={{letterSpacing:'8px'}} onChange={e => setUserOtp(e.target.value)} required />
                        <button className="btn btn-info btn-block py-3 rounded-pill">COMPLETE REGISTRATION</button>
                    </form>
                )}
                <div className="text-center mt-4"><Link to="/login" className="small text-muted">Already a member? Login</Link></div>
            </motion.div>
        </div>
    )
}