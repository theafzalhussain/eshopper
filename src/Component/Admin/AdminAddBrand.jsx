import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { addBrand, getBrand } from '../../Store/ActionCreaters/BrandActionCreators'
import LefNav from './LefNav'
import { motion } from 'framer-motion'
import { Tag, ArrowLeft, ShieldPlus } from 'lucide-react'

export default function AdminAddBrand() {
    const [name, setname] = useState("")
    const brand = useSelector((state) => state.BrandStateData)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    function postData(e) {
        e.preventDefault()
        let item = brand.find((x) => x.name.toLowerCase() === name.toLowerCase())
        if (item) {
            alert("This brand is already registered!")
        } else {
            dispatch(addBrand({ name: name }))
            alert("New Brand identity created.")
            navigate("/admin-brand")
        }
    }

    useEffect(() => { 
        dispatch(getBrand()) 
    }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "92vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3 mb-4"><LefNav /></div>
                    <div className="col-lg-7">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white shadow-xl rounded-3xl p-5 border-0">
                            <div className="d-flex align-items-center mb-5 border-bottom pb-3">
                                <Link to="/admin-brand" className="bg-light text-dark rounded-circle p-2 mr-3"><ArrowLeft size={20} /></Link>
                                <h3 className="font-weight-bold mb-0 text-dark">Brand Enrollment</h3>
                            </div>

                            <form onSubmit={postData}>
                                <div className="mb-5 text-left">
                                    <label className="small font-weight-bold text-info uppercase ls-2 mb-3 d-block text-left">Official Brand Label</label>
                                    <div className="input-group premium-input shadow-sm border rounded-xl overflow-hidden bg-white">
                                        <div className="input-group-prepend p-3 text-info border-right"><Tag size={22} /></div>
                                        <input type="text" className="form-control border-0 font-weight-bold py-4 shadow-none" placeholder="e.g. Gucci, Adidas" onChange={(e) => setname(e.target.value)} required />
                                    </div>
                                </div>

                                <motion.button whileHover={{ y: -2 }} type="submit" className="btn btn-info btn-block py-3 rounded-pill shadow-xl font-weight-bold ls-1 d-flex align-items-center justify-content-center">
                                    <ShieldPlus size={18} className="mr-2" /> REGISTER BRAND
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
            <style>{`.rounded-3xl{border-radius:40px !important} .rounded-xl{border-radius:20px !important} .btn-info{background:#17a2b8; border:none} .btn-info:hover{background:#138496}`}</style>
        </div>
    )
}