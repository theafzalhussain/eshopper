import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { sendOtpAPI, resetPasswordAPI } from '../Store/Services'
import { motion } from 'framer-motion'
import { KeyRound, ShieldCheck, Loader2 } from 'lucide-react'

export default function ForgetPassword() {
    const [data, setdata] = useState({ username: "", password: "", cpassword: "" })
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [userOtp, setUserOtp] = useState("")
    const navigate = useNavigate()

    async function handleRequestOTP(e) {
        e.preventDefault(); setLoading(true);
        try {
            const res = await sendOtpAPI({ email: data.username, type: 'forget' })
            if (res.result === "Done") { setStep(2); alert("Verification code sent!") }
        } catch (err) { alert("Identity not found!") }
        setLoading(false)
    }

    async function handleReset(e) {
        e.preventDefault();
        if (data.password !== data.cpassword) return alert("Passwords mismatch!")
        setLoading(true);
        try {
            const res = await resetPasswordAPI({ ...data, otp: userOtp })
            if (res.result === "Done") { alert("Credentials Updated!"); navigate("/login") }
        } catch (err) { alert("Invalid Code!") }
        setLoading(false)
    }

    return (
        <div className="container py-5 mt-5">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="col-md-5 mx-auto p-5 bg-white shadow-lg rounded-3xl">
                <div className="text-center mb-4"><KeyRound size={40} className="text-info"/></div>
                {step === 1 ? (
                    <form onSubmit={handleRequestOTP}>
                        <h3 className="text-center font-weight-bold mb-4">Find Account</h3>
                        <input type="text" placeholder="Username or Email" className="form-control mb-4 p-4 bg-light border-0" onChange={e => setdata({...data, username: e.target.value})} required />
                        <button className="btn btn-info btn-block py-3 rounded-pill font-weight-bold" disabled={loading}>{loading ? <Loader2 className="animate-spin mx-auto"/> : "SEND RESET CODE"}</button>
                    </form>
                ) : (
                    <form onSubmit={handleReset}>
                        <h3 className="text-center font-weight-bold mb-4">Reset Password</h3>
                        <input type="text" placeholder="6-Digit OTP" maxLength="6" className="form-control mb-3 text-center font-weight-bold" onChange={e => setUserOtp(e.target.value)} required />
                        <input type="password" placeholder="New Password" className="form-control mb-3" onChange={e => setdata({...data, password: e.target.value})} required />
                        <input type="password" placeholder="Confirm Password" className="form-control mb-4" onChange={e => setdata({...data, cpassword: e.target.value})} required />
                        <button className="btn btn-dark btn-block py-3 rounded-pill font-weight-bold">UPDATE PASSWORD</button>
                    </form>
                )}
                <div className="text-center mt-4"><Link to="/login" className="small text-muted">Back to Login</Link></div>
            </motion.div>
        </div>
    )
}