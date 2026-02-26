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
                setdata({ ...current, password: "" })
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
    e.preventDefault();
    setLoading(true);
    
    let formData = new FormData();
    formData.append("id", localStorage.getItem("userid"));
    formData.append("name", data.name);
    formData.append("email", data.email);
    formData.append("phone", data.phone);
    formData.append("addressline1", data.addressline1 || "");
    formData.append("city", data.city || "");
    formData.append("state", data.state || "");
    formData.append("pin", data.pin || "");
    
    if (data.pic && typeof data.pic !== "string") formData.append("pic", data.pic);

    dispatch(updateUser(formData));

    // Wait for DB and Cloudinary
    setTimeout(() => {
        setLoading(false);
        navigate("/profile");
    }, 2500);
}

    return (
        <div className="container-fluid py-5 bg-light min-vh-100">
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="row justify-content-center">
                <div className="col-md-8 col-lg-6 bg-white p-5 shadow-lg rounded-3xl border-0">
                    <div className="d-flex align-items-center mb-5">
                        <Link to="/profile" className="text-dark mr-3"><ArrowLeft size={24}/></Link>
                        <h2 className="font-weight-bold mb-0 text-dark">PROFILE SETTINGS</h2>
                    </div>
                    <form onSubmit={postData}>
                        <div className="text-center mb-5">
                            <label htmlFor="pic" className="cursor-pointer d-inline-block position-relative">
                                <img src={preview || "/assets/images/noimage.png"} className="rounded-circle shadow-lg" style={{width:"150px", height:"150px", objectFit:"cover", border:"5px solid #17a2b8"}} alt="User"/>
                                <div className="bg-info text-white p-2 rounded-circle position-absolute" style={{bottom:"5px", right:"10px"}}><Camera size={20}/></div>
                            </label>
                            <input type="file" id="pic" className="d-none" onChange={getFile} />
                        </div>
                        <div className="row">
                            <div className="col-md-6 mb-4">
                                <label className="small font-weight-bold text-muted uppercase ml-2">Name</label>
                                <input type="text" name="name" className='form-control rounded-xl p-4 bg-light border-0' value={data.name} onChange={getData} required/>
                            </div>
                            <div className="col-md-6 mb-4">
                                <label className="small font-weight-bold text-muted uppercase ml-2">Phone</label>
                                <input type="text" name="phone" className='form-control rounded-xl p-4 bg-light border-0' value={data.phone} onChange={getData}/>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="small font-weight-bold text-muted uppercase ml-2">E-mail</label>
                            <input type="email" name="email" className='form-control rounded-xl p-4 bg-light border-0' value={data.email} onChange={getData}/>
                        </div>
                        <div className="mb-5">
                            <label className="small font-weight-bold text-muted uppercase ml-2">Address</label>
                            <input type="text" name="addressline1" className='form-control rounded-xl p-4 bg-light border-0' value={data.addressline1} onChange={getData}/>
                        </div>
                        <button className="btn btn-info btn-block py-3 rounded-pill font-weight-bold shadow-lg" disabled={loading}>
                            {loading ? <><Loader2 className="mr-2 animate-spin" /> SAVING...</> : "UPDATE ACCOUNT"}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}