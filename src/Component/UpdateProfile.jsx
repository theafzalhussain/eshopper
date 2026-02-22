import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser, updateUser } from '../Store/ActionCreaters/UserActionCreators'
import { motion } from 'framer-motion'
import { Save, Camera, Loader2 } from 'lucide-react'

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

    async function postData(e) {
        e.preventDefault()
        setLoading(true) // Start Animation
        
        const userId = localStorage.getItem("userid")
        let formData = new FormData()
        
        formData.append("id", userId) // 🎯 MUST: Sagas needs this
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

        // Give server 2 seconds to process image before redirect
        setTimeout(() => {
            setLoading(false)
            alert("Profile Synchronized Successfully!")
            navigate("/profile")
        }, 3000)
    }

    return (
        <div className="container-fluid my-5 py-5 bg-light min-vh-100">
            <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="row justify-content-center">
                <div className="col-md-6 bg-white p-5 shadow-2xl rounded-3xl border-0">
                    <h3 className="font-weight-bold mb-5 text-center text-dark ls-2">SECURE PROFILE UPDATE</h3>
                    
                    <form onSubmit={postData}>
                        <div className="text-center mb-5 position-relative">
                            <label htmlFor="pic" className="cursor-pointer">
                                <img src={preview || "/assets/images/noimage.png"} className="rounded-circle shadow-lg border-info" style={{width:"130px", height:"130px", objectFit:"cover", border:"4px solid"}} alt="User"/>
                                <div className="cam-icon bg-info text-white p-2 rounded-circle position-absolute" style={{bottom:0, right:"35%"}}><Camera size={16}/></div>
                            </label>
                            <input type="file" id="pic" className="d-none" onChange={getFile} />
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3"><label className="small font-weight-bold">FULL NAME</label><input type="text" className='form-control p-4 rounded-xl shadow-none border' value={data.name} onChange={(e)=>setdata({...data, name: e.target.value})} required/></div>
                            <div className="col-md-6 mb-3"><label className="small font-weight-bold">CONTACT</label><input type="text" className='form-control p-4 rounded-xl shadow-none border' value={data.phone} onChange={(e)=>setdata({...data, phone: e.target.value})}/></div>
                        </div>

                        <div className="mb-4"><label className="small font-weight-bold">LOCALITY / ADDRESS</label><input type="text" className='form-control p-4 rounded-xl border' value={data.addressline1} onChange={(e)=>setdata({...data, addressline1: e.target.value})}/></div>

                        <button className="btn btn-info btn-block py-3 rounded-pill font-weight-bold shadow-lg" disabled={loading}>
                            {loading ? <><Loader2 className="animate-spin mr-2 d-inline" /> SAVING TO CLOUD...</> : <><Save size={18} className="mr-2"/> UPDATE DATABASE</>}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}