import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import LefNav from './LefNav'
import { getBrand, updateBrand } from '../../Store/ActionCreaters/BrandActionCreators'
import { motion } from 'framer-motion'
import { Tag, ArrowLeft, RotateCw } from 'lucide-react'

export default function AdminUpdateBrand() {
    const [name, setName] = useState("")
    const { id } = useParams()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const brand = useSelector((state) => state.BrandStateData)

    useEffect(() => {
        if (brand.length === 0) {
            dispatch(getBrand())
        } else {
            const item = brand.find((x) => (x.id || x._id) === id)
            if (item) setName(item.name)
        }
    }, [brand.length, id])

    function postData(e) {
        e.preventDefault()
        dispatch(updateBrand({ id: id, name: name }))
        alert("Brand Info Updated!")
        navigate("/admin-brand")
    }

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "90vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white shadow-2xl rounded-3xl p-5 border-0">
                            <div className="d-flex align-items-center mb-4">
                                <Link to="/admin-brand" className="text-info mr-3 shadow-sm rounded-circle p-2 bg-light d-flex"><ArrowLeft size={20}/></Link>
                                <h3 className="font-weight-bold mb-0">Modify Brand Details</h3>
                            </div>
                            <form onSubmit={postData}>
                                <div className="mb-4">
                                    <label className="text-muted font-weight-bold small text-uppercase mb-2 d-block">Current Brand Name</label>
                                    <div className="input-group p-1 border rounded-2xl bg-white shadow-inner">
                                        <div className="input-group-prepend text-info p-2"><Tag size={20}/></div>
                                        <input type="text" value={name} className="form-control border-0 py-4 shadow-none h5 font-weight-bold" onChange={(e)=>setName(e.target.value)} required />
                                    </div>
                                </div>
                                <motion.button whileHover={{ scale: 1.02 }} type="submit" className="btn btn-dark btn-block py-3 rounded-pill font-weight-bold shadow-xl mt-4">
                                    <RotateCw size={18} className="mr-2"/> UPDATE DATABASE
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}