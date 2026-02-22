import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser, updateUser } from '../Store/ActionCreaters/UserActionCreators'
import { motion } from 'framer-motion'
import { Save, Camera, User, Mail, Phone, MapPin, Loader2 } from 'lucide-react'

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
        const current = users.find((item) => (item.id || item._id) === userId)
        if (current) {
            setdata(current)
            if(current.pic) setPreview(current.pic)
        }
    }, [users.length])

    function getFile(e) {
        const file = e.target.files[0]
        setdata({ ...data, pic: file })
        setPreview(URL.createObjectURL(file))
    }

    function postData(e) {
        e.preventDefault()
        setLoading(true)
        
        const userId = localStorage.getItem("userid")
        let formData = new FormData()
        
        formData.append("id", userId)
        formData.append("name", data.name)
        formData.append("email", data.email)
        formData.append("phone", data.phone)
        formData.append("addressline1", data.addressline1 || "")
        formData.append("city", data.city || "")
        formData.append("state", data.state || "")
        formData.append("pin", data.pin || "")
        
        if (data.pic && typeof data.pic !== "string") {
            formData.append("pic", data.pic)
        }

        dispatch(updateUser(formData))
        localStorage.setItem("name", data.name)

        // Redirect after delay for server processing
        setTimeout(() => {
            setLoading(false)
            navigate("/profile")
        }, 2500)
    }

    return (
        <div className="container-fluid py-5 bg-light" style={{ minHeight: "100vh" }}>
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="row justify-content-center">
                <div className="col-md-8 col-lg-6 bg-white p-5 shadow-2xl rounded-3xl">
                    <h2 className="font-weight-bold text-center mb-5 text-dark">DASHBOARD SETTINGS</h2>
                    
                    <form onSubmit={postData}>
                        {/* Profile Picture */}
                        <div className="text-center mb-5 position-relative">
                            <label htmlFor="pic" className="cursor-pointer d-inline-block">
                                <img src={preview || "/assets/images/noimage.png"} className="rounded-circle shadow-lg" style={{width:"140px", height:"140px", objectFit:"cover", border:"4px solid #17a2b8"}} alt="User"/>
                                <div className="bg-info text-white p-2 rounded-circle position-absolute" style={{bottom:0, right:"10px"}}><Camera size={18}/></div>
                            </label>
                            <input type="file" id="pic" className="d-none" onChange={getFile} />
                        </div>

                        {/* Input Fields */}
                        <div className="row">
                            <div className="col-md-6 mb-4">
                                <label className="small font-weight-bold text-muted uppercase">Full Name</label>
                                <div className="input-group border rounded-xl p-2 bg-light">
                                    <span className="p-2"><User size={18} className="text-info"/></span>
                                    <input type="text" className='form-control border-0 bg-transparent' value={data.name} onChange={(e)=>setdata({...data, name: e.target.value})} required/>
                                </div>
                            </div>
                            <div className="col-md-6 mb-4">
                                <label className="small font-weight-bold text-muted uppercase">Phone Number</label>
                                <div className="input-group border rounded-xl p-2 bg-light">
                                    <span className="p-2"><Phone size={18} className="text-info"/></span>
                                    <input type="text" className='form-control border-0 bg-transparent' value={data.phone} onChange={(e)=>setdata({...data, phone: e.target.value})}/>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="small font-weight-bold text-muted uppercase">Email Address</label>
                            <div className="input-group border rounded-xl p-2 bg-light">
                                <span className="p-2"><Mail size={18} className="text-info"/></span>
                                <input type="email" className='form-control border-0 bg-transparent' value={data.email} onChange={(e)=>setdata({...data, email: e.target.value})}/>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="small font-weight-bold text-muted uppercase">Residential Address</label>
                            <div className="input-group border rounded-xl p-2 bg-light">
                                <span className="p-2"><MapPin size={18} className="text-info"/></span>
                                <input type="text" className='form-control border-0 bg-transparent' value={data.addressline1} onChange={(e)=>setdata({...data, addressline1: e.target.value})} placeholder="House No, Street, Landmark"/>
                            </div>
                        </div>

                        <button className="btn btn-info btn-block py-3 rounded-pill font-weight-bold shadow-lg mt-4 d-flex align-items-center justify-content-center" disabled={loading}>
                            {loading ? <><Loader2 className="mr-2 animate-spin" /> SYNCING...</> : <><Save className="mr-2" size={20}/> SAVE PROFILE</>}
                        </button>
                    </form>
                </div>
            </motion.div>
            <style>{`.rounded-3xl{border-radius:35px !important} .rounded-xl{border-radius:15px !important} .shadow-2xl{box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1) !important}`}</style>
        </div>
    )
}