import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser, updateUser } from '../Store/ActionCreaters/UserActionCreators'
import { motion } from 'framer-motion'
import { Save, Camera, Loader2, User, Mail, Phone, MapPin } from 'lucide-react'

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

    function getData(e) {
        setdata({ ...data, [e.target.name]: e.target.value })
    }

    function getFile(e) {
        const file = e.target.files[0]
        setdata({ ...data, pic: file })
        setPreview(URL.createObjectURL(file))
    }

    async function postData(e) {
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
        
        // Sirf tabhi pic bhejein agar user ne naya file select kiya hai
        if (data.pic && typeof data.pic !== "string") {
            formData.append("pic", data.pic)
        }

        dispatch(updateUser(formData))
        localStorage.setItem("name", data.name)

        // Give server time to process before moving back
        setTimeout(() => {
            setLoading(false)
            navigate("/profile")
        }, 3000)
    }

    return (
        <div className="container-fluid my-5 py-5 bg-light min-vh-100">
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="row justify-content-center">
                <div className="col-md-8 col-lg-6 bg-white p-5 shadow-2xl rounded-3xl border-0">
                    <h3 className="font-weight-bold mb-5 text-center text-dark ls-2">EDIT ACCOUNT PROFILE</h3>
                    
                    <form onSubmit={postData}>
                        <div className="text-center mb-5 position-relative">
                            <label htmlFor="pic" className="cursor-pointer d-inline-block">
                                <img src={preview || "/assets/images/noimage.png"} className="rounded-circle shadow-lg border-info" style={{width:"140px", height:"140px", objectFit:"cover", border:"5px solid"}} alt="User"/>
                                <div className="cam-icon bg-info text-white p-2 rounded-circle position-absolute" style={{bottom:"5px", right:"10px shadow"}}><Camera size={20}/></div>
                            </label>
                            <input type="file" id="pic" className="d-none" onChange={getFile} />
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-4">
                                <label className="small font-weight-bold">FULL NAME</label>
                                <div className="input-group border rounded-xl overflow-hidden p-1 bg-light">
                                    <span className="p-2 text-muted"><User size={18}/></span>
                                    <input type="text" name="name" className='form-control border-0 bg-transparent' value={data.name} onChange={getData} required/>
                                </div>
                            </div>
                            <div className="col-md-6 mb-4">
                                <label className="small font-weight-bold">PHONE NUMBER</label>
                                <div className="input-group border rounded-xl overflow-hidden p-1 bg-light">
                                    <span className="p-2 text-muted"><Phone size={18}/></span>
                                    <input type="text" name="phone" className='form-control border-0 bg-transparent' value={data.phone} onChange={getData}/>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="small font-weight-bold">RESIDENTIAL ADDRESS</label>
                            <div className="input-group border rounded-xl overflow-hidden p-1 bg-light">
                                <span className="p-2 text-muted"><MapPin size={18}/></span>
                                <input type="text" name="addressline1" className='form-control border-0 bg-transparent' value={data.addressline1} onChange={getData} placeholder="House No, Street, Locality"/>
                            </div>
                        </div>

                        <button className="btn btn-info btn-block py-3 rounded-pill font-weight-bold shadow-lg mt-4" disabled={loading}>
                            {loading ? <><Loader2 className="animate-spin mr-2 d-inline" /> SYNCING WITH CLOUD...</> : <><Save size={18} className="mr-2"/> SAVE CHANGES</>}
                        </button>
                    </form>
                </div>
            </motion.div>
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-3xl { border-radius: 35px !important; }
                .rounded-xl { border-radius: 15px !important; }
                .shadow-2xl { box-shadow: 0 40px 80px rgba(0,0,0,0.1) !important; }
                .ls-2 { letter-spacing: 2px; }
            `}} />
        </div>
    )
}