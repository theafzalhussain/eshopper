import React, { useState } from 'react'
import { sendOtpAPI, createUserAPI } from '../Store/Services'
import { useNavigate } from 'react-router-dom'

export default function SingUp() {
    const [data, setdata] = useState({ name: "", username: "", email: "", password: "" })
    const [otpSent, setOtpSent] = useState(false)
    const [serverOtp, setServerOtp] = useState("")
    const [userOtp, setUserOtp] = useState("")
    const navigate = useNavigate()

    async function handleRegister(e) {
        e.preventDefault()
        const res = await sendOtpAPI({ email: data.email })
        if (res.result === "Done") {
            setServerOtp(res.otp)
            setOtpSent(true)
            alert("OTP sent to your email!")
        }
    }

    async function verifyAndSignup(e) {
        e.preventDefault()
        if (userOtp === serverOtp) {
            const res = await createUserAPI(data)
            if (res.id) {
                alert("Verified! Account Created.")
                navigate("/login")
            }
        } else {
            alert("Wrong OTP!")
        }
    }

    return (
        <div className="container py-5">
            {!otpSent ? (
                <form onSubmit={handleRegister} className="col-md-5 mx-auto shadow p-5 bg-white rounded">
                    <h3>Create Master Account</h3>
                    <input type="text" placeholder="Name" className="form-control mb-3" onChange={(e) => setdata({...data, name: e.target.value})} required />
                    <input type="email" placeholder="Email" className="form-control mb-3" onChange={(e) => setdata({...data, email: e.target.value})} required />
                    <input type="text" placeholder="Username" className="form-control mb-3" onChange={(e) => setdata({...data, username: e.target.value})} required />
                    <input type="password" placeholder="Password" className="form-control mb-4" onChange={(e) => setdata({...data, password: e.target.value})} required />
                    <button className="btn btn-info btn-block">SEND OTP</button>
                </form>
            ) : (
                <form onSubmit={verifyAndSignup} className="col-md-5 mx-auto shadow p-5 bg-white rounded text-center">
                    <h3>Verify Email</h3>
                    <p className="small text-muted">Enter 6-digit code sent to {data.email}</p>
                    <input type="text" maxLength="6" className="form-control text-center h1 font-weight-bold mb-4" onChange={(e) => setUserOtp(e.target.value)} required />
                    <button className="btn btn-info btn-block">VERIFY & CREATE ACCOUNT</button>
                </form>
            )}
        </div>
    )
}