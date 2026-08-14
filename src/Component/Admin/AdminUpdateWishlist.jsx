import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import LefNav from './LefNav'
import { updateWishlist, getWishlist } from '../../Store/ActionCreaters/WishlistActionCreators'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { Heart, ArrowLeft, Save } from 'lucide-react'
import './SystemControlCenter.css'

export default function AdminUpdateWishlist() {
    var [name, setname] = useState("")
    var {id} = useParams()
    var wishlist = useSelector((state) => state.WishlistStateData)
    var navigate = useNavigate()
    var dispatch = useDispatch()

    function getData(e) {
        setname(e.target.value)
    }

    function postData(e) {
        e.preventDefault()
        var item = wishlist.find((item) => item.name === name)
        if (item && item.id !== Number(id))
            alert("Wishlist Name is Already Exist")
        else {
            dispatch(updateWishlist({ id:id, name: name }))
            navigate("/admin-wishlist")
        }
    }

    useEffect(()=>{
        dispatch(getWishlist())
        var item = wishlist.find((item)=> item.id===Number(id))
        if(item) setname(item.name)
    },[wishlist.length, id])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid">
                    <div className="w-100">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between mb-4 gap-3">
                                <div className="d-flex align-items-center">
                                    <Link to="/admin-wishlist" className="btn btn-light rounded-circle p-2 mr-3 shadow-sm">
                                        <ArrowLeft size={18} />
                                    </Link>
                                    <h4 className="font-weight-bold mb-0 d-flex align-items-center">
                                        <Heart className="mr-2 text-danger" fill="#ff4757" /> Update Wishlist
                                    </h4>
                                </div>
                            </div>

                            <form onSubmit={postData}>
                                <div className="mb-4">
                                    <label htmlFor='name' className="font-weight-bold text-secondary mb-2 d-block">Wishlist Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        id="name"
                                        placeholder='Enter Wishlist Name'
                                        className='form-control rounded-lg p-3'
                                        onChange={getData}
                                        value={name}
                                        required
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    type='submit'
                                    className='btn btn-success w-100 py-3 rounded-pill font-weight-bold shadow-lg d-flex align-items-center justify-content-center'
                                >
                                    <Save size={20} className="mr-2" /> Update Wishlist
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}




