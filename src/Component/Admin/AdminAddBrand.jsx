import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { addBrand, getBrand } from '../../Store/ActionCreaters/BrandActionCreators'
import { motion } from 'framer-motion'
import { Tag, ArrowLeft, BookmarkPlus } from 'lucide-react'

export default function AdminAddBrand() {
    const [name, setname] = useState("")
    const brand = useSelector((state) => state.BrandStateData)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    function postData(e) {
        e.preventDefault()
        let item = brand.find((x) => x.name.toLowerCase() === name.toLowerCase())
        if (item) alert("This Brand already exists!")
        else {
            dispatch(addBrand({ name: name }))
            navigate("/admin-brand")
        }
    }

    useEffect(() => { dispatch(getBrand()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "90vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-6">
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white shadow-2xl rounded-3xl p-5 border-0">
                            <div className="d-flex align-items-center mb-4">
                                <Link to="/admin-brand" className="text-info-dark mr-3 shadow-sm rounded-circle p-2 bg-light d-flex"><ArrowLeft size={20}/></Link>
                                <h3 className="font-weight-bold mb-0">Register New Brand</h3>
                            </div>

                            <form onSubmit={postData}>
                                <div className="mb-4">
                                    <label className="text-muted font-weight-bold small text-uppercase mb-2 d-block">Brand Identity Name</label>
                                    <div className="input-group luxury-input p-1 border rounded-2xl bg-white shadow-inner">
                                        <div className="input-group-prepend text-info p-2"><Tag size={20}/></div>
                                        <input type="text" className="form-control border-0 py-4 shadow-none" placeholder="e.g. Adidas, Gucci..." onChange={(e)=>setname(e.target.value)} required />
                                    </div>
                                </div>

                                <motion.button whileTap={{ scale: 0.95 }} type="submit" className="btn btn-dark btn-block py-3 rounded-pill font-weight-bold ls-2 shadow-xl mt-4">
                                    <BookmarkPlus size={18} className="mr-2"/> CONFIRM BRAND
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}