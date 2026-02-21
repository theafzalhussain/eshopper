import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser, addUser } from '../Store/ActionCreaters/UserActionCreators'
import { motion } from 'framer-motion'
import { User, Mail, Phone, Lock, Camera, ArrowRight } from 'lucide-react'

export default function Signup() {
    const [data, setdata] = useState({
        name: "", username: "", email: "", phone: "", password: "", cpassword: "", pic: ""
    })
    const [preview, setPreview] = useState(null)
    const users = useSelector((state) => state.UserStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    function getData(e) {
        const { name, value } = e.target
        setdata((old) => ({ ...old, [name]: value }))
    }

    function getFile(e) {
        const file = e.target.files[0]
        setdata((old) => ({ ...old, pic: file }))
        setPreview(URL.createObjectURL(file))
    }

    function postData(e) {
        e.preventDefault()
        if (data.password !== data.cpassword) {
            alert("Passwords do not match!")
            return
        }
        if (users.find(x => x.username === data.username)) {
            alert("Username already taken!")
            return
        }

        // --- FormData for Cloudinary/Backend ---
        let formData = new FormData()
        formData.append("name", data.name)
        formData.append("username", data.username)
        formData.append("email", data.email)
        formData.append("phone", data.phone)
        formData.append("password", data.password)
        formData.append("role", "User")
        if (data.pic) formData.append("pic", data.pic)

        dispatch(addUser(formData))
        alert("Account Created! Redirecting to Login...")
        navigate("/login")
    }

    useEffect(() => { dispatch(getUser()) }, [dispatch])

    return (
        <div className="signup-container py-5" style={{ background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", minHeight: "100vh" }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="container bg-white shadow-2xl rounded-3xl overflow-hidden p-0"
                style={{ maxWidth: "900px" }}
            >
                <div className="row no-gutters">
                    <div className="col-md-5 bg-info p-5 text-white d-flex flex-column justify-content-center text-center">
                        <h2 className="font-weight-bold display-4 mb-4">Welcome!</h2>
                        <p className="lead opacity-75">Join our premium community and start your luxury shopping journey today.</p>
                        <div className="mt-5">
                            <p>Already a member?</p>
                            <Link to="/login" className="btn btn-outline-light rounded-pill px-4">LOGIN HERE</Link>
                        </div>
                    </div>
                    <div className="col-md-7 p-5">
                        <form onSubmit={postData}>
                            <h3 className="font-weight-bold text-dark mb-4">Create Account</h3>
                            
                            {/* Profile Pic Upload */}
                            <div className="text-center mb-4 position-relative">
                                <label htmlFor="pic" className="cursor-pointer">
                                    <div className="profile-preview border-dashed shadow-sm mx-auto d-flex align-items-center justify-content-center overflow-hidden" 
                                         style={{ width: "100px", height: "100px", borderRadius: "50%", background: "#f8f9fa", border: "2px dashed #ddd" }}>
                                      {preview ? <img src={preview} className="w-100 h-100 object-cover" alt="Profile Preview" /> : <Camera className="text-muted" />}
                                    </div>
                                </label>
                                <input type="file" id="pic" name="pic" onChange={getFile} className="d-none" />
                                <small className="text-muted d-block mt-1">Upload Profile Pic</small>
                            </div>

                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <div className="input-group-premium">
                                        <User size={18} className="icon-p" />
                                        <input type="text" name="name" onChange={getData} placeholder="Full Name" required />
                                    </div>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <div className="input-group-premium">
                                        <User size={18} className="icon-p" />
                                        <input type="text" name="username" onChange={getData} placeholder="Username" required />
                                    </div>
                                </div>
                            </div>

                            <div className="input-group-premium mb-3">
                                <Mail size={18} className="icon-p" />
                                <input type="email" name="email" onChange={getData} placeholder="Email Address" required />
                            </div>

                            <div className="input-group-premium mb-3">
                                <Phone size={18} className="icon-p" />
                                <input type="text" name="phone" onChange={getData} placeholder="Phone Number" required />
                            </div>

                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <div className="input-group-premium">
                                        <Lock size={18} className="icon-p" />
                                        <input type="password" name="password" onChange={getData} placeholder="Password" required />
                                    </div>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <div className="input-group-premium">
                                        <Lock size={18} className="icon-p" />
                                        <input type="password" name="cpassword" onChange={getData} placeholder="Confirm" required />
                                    </div>
                                </div>
                            </div>

                            <motion.button 
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                type="submit" className="btn btn-info btn-block py-3 rounded-pill shadow-lg font-weight-bold mt-4"
                            >
                                SIGN UP NOW <ArrowRight size={18} className="ml-2" />
                            </motion.button>
                        </form>
                    </div>
                </div>
            </motion.div>
            <style dangerouslySetInnerHTML={{ __html: `
                .input-group-premium { position: relative; display: flex; align-items: center; background: #f8f9fa; border-radius: 12px; padding: 5px 15px; border: 1px solid #eee; transition: 0.3s; }
                .input-group-premium:focus-within { border-color: #17a2b8; background: white; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
                .input-group-premium input { border: none; background: transparent; padding: 10px; width: 100%; font-size: 14px; outline: none; }
                .icon-p { color: #aaa; }
                .shadow-2xl { box-shadow: 0 40px 100px rgba(0,0,0,0.1) !important; }
                .object-cover { object-fit: cover; }
            `}} />
        </div>
    )
}