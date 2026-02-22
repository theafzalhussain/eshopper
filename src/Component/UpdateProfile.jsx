import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser, updateUser } from '../Store/ActionCreaters/UserActionCreators'
import { motion } from 'framer-motion'
import { Save, Camera, User, Mail, Phone, MapPin, Loader2, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Updateprofile() {
    const [data, setdata] = useState({
        name: "", email: "", phone: "", addressline1: "",
        pin: "", city: "", state: "", pic: null
    })
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState(null)
    
    const users = useSelector((state) => state.UserStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => {
        dispatch(getUser())
        const userId = localStorage.getItem("userid")
        if (users.length > 0) {
            const current = users.find((item) => (item.id || item._id) === userId)
            if (current) {
                setdata({
                    ...current,
                    password: "" // Security: Password ko update fields me nahi dikhate
                })
                if(current.pic) setPreview(current.pic)
            }
        }
    }, [users.length, dispatch])

    function getData(e) {
        setdata({ ...data, [e.target.name]: e.target.value })
    }

    function getFile(e) {
        const file = e.target.files[0]
        if (file) {
            setdata({ ...data, pic: file })
            setPreview(URL.createObjectURL(file))
        }
    }

    async function postData(e) {
        e.preventDefault()
        setLoading(true)
        
        const userId = localStorage.getItem("userid")
        let formData = new FormData()
        
        // --- 🎯 MASTER MAPPING: Redux aur Backend dono ke liye ---
        formData.append("id", userId) 
        formData.append("name", data.name)
        formData.append("email", data.email)
        formData.append("phone", data.phone)
        formData.append("addressline1", data.addressline1 || "")
        formData.append("city", data.city || "")
        formData.append("state", data.state || "")
        formData.append("pin", data.pin || "")
        
        // Nayi photo update logic
        if (data.pic && typeof data.pic !== "string") {
            formData.append("pic", data.pic)
        }

        dispatch(updateUser(formData))
        localStorage.setItem("name", data.name) // Sync Navbar name

        // Buffer for Cloudinary and DB processing
        setTimeout(() => {
            setLoading(false)
            alert("Success: Profile Synchronized!")
            navigate("/profile")
        }, 3000)
    }

    return (
        <div className="container-fluid py-5 bg-light min-vh-100">
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="row justify-content-center">
                <div className="col-md-8 col-lg-6 bg-white p-5 shadow-2xl rounded-3xl border-0">
                    
                    <div className="d-flex align-items-center mb-5">
                        <Link to="/profile" className="text-dark mr-3 transition hover-scale"><ArrowLeft size={24}/></Link>
                        <h2 className="font-weight-bold mb-0 text-dark ls-1">PROFILE SETTINGS</h2>
                    </div>
                    
                    <form onSubmit={postData}>
                        {/* Profile Picture Header */}
                        <div className="text-center mb-5 position-relative">
                            <label htmlFor="pic" className="cursor-pointer d-inline-block position-relative">
                                <img src={preview || "/assets/images/noimage.png"} className="rounded-circle shadow-lg" style={{width:"150px", height:"150px", objectFit:"cover", border:"5px solid #17a2b8"}} alt="User"/>
                                <div className="bg-info text-white p-2 rounded-circle position-absolute shadow" style={{bottom:"5px", right:"10px"}}><Camera size={20}/></div>
                            </label>
                            <input type="file" id="pic" className="d-none" onChange={getFile} />
                            <p className="mt-2 text-muted small font-weight-bold">Change Avatar</p>
                        </div>

                        {/* Input Grid */}
                        <div className="row">
                            <div className="col-md-6 mb-4">
                                <label className="small font-weight-bold text-muted uppercase ml-2">Display Name</label>
                                <div className="input-group premium-field border rounded-xl p-2 bg-light">
                                    <span className="p-2"><User size={18} className="text-info"/></span>
                                    <input type="text" name="name" className='form-control border-0 bg-transparent font-weight-bold' value={data.name} onChange={getData} required/>
                                </div>
                            </div>
                            <div className="col-md-6 mb-4">
                                <label className="small font-weight-bold text-muted uppercase ml-2">Phone</label>
                                <div className="input-group premium-field border rounded-xl p-2 bg-light">
                                    <span className="p-2"><Phone size={18} className="text-info"/></span>
                                    <input type="text" name="phone" className='form-control border-0 bg-transparent font-weight-bold' value={data.phone} onChange={getData}/>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="small font-weight-bold text-muted uppercase ml-2">E-mail</label>
                            <div className="input-group premium-field border rounded-xl p-2 bg-light">
                                <span className="p-2"><Mail size={18} className="text-info"/></span>
                                <input type="email" name="email" className='form-control border-0 bg-transparent font-weight-bold' value={data.email} onChange={getData}/>
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="small font-weight-bold text-muted uppercase ml-2">Location Address</label>
                            <div className="input-group premium-field border rounded-xl p-2 bg-light">
                                <span className="p-2"><MapPin size={18} className="text-info"/></span>
                                <input type="text" name="addressline1" className='form-control border-0 bg-transparent font-weight-bold' value={data.addressline1} onChange={getData} placeholder="House No, Street, City"/>
                            </div>
                        </div>

                        <button className="btn btn-info btn-block py-3 rounded-pill font-weight-bold shadow-lg transition-all d-flex align-items-center justify-content-center" disabled={loading}>
                            {loading ? <><Loader2 className="mr-2 animate-spin" /> SYNCING CLOUD...</> : <><Save className="mr-2" size={20}/> UPDATE ACCOUNT</>}
                        </button>
                    </form>
                </div>
            </motion.div>
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-3xl { border-radius: 40px !important; }
                .rounded-xl { border-radius: 18px !important; }
                .shadow-2xl { box-shadow: 0 40px 80px rgba(0,0,0,0.1) !important; }
                .ls-1 { letter-spacing: 1.5px; }
                .premium-field { transition: 0.3s; border: 1px solid #eee !important; }
                .premium-field:focus-within { border-color: #17a2b8 !important; background: #fff !important; box-shadow: 0 5px 15px rgba(23,162,184,0.1); }
                .hover-scale:hover { transform: scale(1.1); }
            `}} />
        </div>
    )
}