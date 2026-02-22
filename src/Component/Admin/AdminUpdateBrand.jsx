import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import LefNav from './LefNav'
import { getBrand, updateBrand } from '../../Store/ActionCreaters/BrandActionCreators'
import { motion } from 'framer-motion'
import { Save, ArrowLeft, Tag } from 'lucide-react'

export default function AdminUpdateBrand() {
    const [name, setName] = useState("")
    const { id } = useParams() // MongoDB String ID
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const brands = useSelector((state) => state.BrandStateData)

    useEffect(() => {
        dispatch(getBrand())
        // handles MongoDB formatting automatically
        const item = brands.find((x) => (x.id || x._id) === id)
        if (item) setName(item.name)
    }, [brands.length, id, dispatch])

    function postData(e) {
        e.preventDefault()
        dispatch(updateBrand({ id: id, name: name }))
        alert("Brand assets updated in repository.")
        navigate("/admin-brand")
    }

    return (
        <div style={{ backgroundColor: "#fcfcfc", minHeight: "90vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-6">
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 shadow-xl rounded-3xl border-0">
                            <div className="d-flex align-items-center mb-5">
                                <Link to="/admin-brand" className="bg-light text-dark rounded-circle p-3 mr-3 shadow-sm d-flex align-items-center justify-content-center transition hover-bg-dark text-decoration-none">
                                    <ArrowLeft size={18} />
                                </Link>
                                <h4 className="font-weight-bold mb-0">Modify Brand Details</h4>
                            </div>

                            <form onSubmit={postData}>
                                <div className="form-group mb-5">
                                    <label className="text-muted font-weight-bold x-small uppercase ls-1 mb-2 d-block">GLOBAL BRAND NAME</label>
                                    <div className="input-group luxury-input-wrap border shadow-sm rounded-xl">
                                        <div className="p-3 bg-white text-info border-right"><Tag size={22} /></div>
                                        <input type="text" className="form-control border-0 font-weight-bold shadow-none py-4" value={name} onChange={(e) => setName(e.target.value)} required />
                                    </div>
                                </div>

                                <button className="btn btn-dark btn-block py-3 rounded-pill shadow-xl font-weight-bold text-info">
                                    <Save size={18} className="mr-2" /> SYNC CHANGES
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
            <style>{`.rounded-3xl{border-radius:35px !important} .rounded-xl{border-radius:18px !important} .shadow-xl{box-shadow: 0 30px 60px rgba(0,0,0,0.06) !important}`}</style>
        </div>
    )
}