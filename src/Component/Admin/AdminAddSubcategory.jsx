import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { addSubcategory, getSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators'
import { motion } from 'framer-motion'
import { Grid, ArrowLeft, PlusCircle } from 'lucide-react'

export default function AdminAddSubcategory() {
    const [name, setname] = useState("")
    const subcategory = useSelector((state) => state.SubcategoryStateData)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    useEffect(() => { dispatch(getSubcategory()) }, [dispatch])

    function postData(e) {
        e.preventDefault()
        let item = subcategory.find((x) => x.name.toLowerCase() === name.toLowerCase())
        if (item) alert("Subcategory already exists!")
        else {
            dispatch(addSubcategory({ name: name }))
            navigate("/admin-subcategory")
        }
    }

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "90vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-6">
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white shadow-xl rounded-3xl p-5 border-0">
                            <div className="d-flex align-items-center mb-4 text-dark">
                                <Link to="/admin-subcategory" className="mr-3 text-dark"><ArrowLeft /></Link>
                                <h3 className="font-weight-bold mb-0">Create New Subcategory</h3>
                            </div>
                            <form onSubmit={postData}>
                                <div className="mb-4">
                                    <label className="small font-weight-bold text-muted text-uppercase mb-2 d-block">Sub-category Label</label>
                                    <div className="input-group premium-border-fix rounded-xl border p-1 bg-white">
                                        <div className="p-2 text-info"><Grid size={22}/></div>
                                        <input type="text" className="form-control border-0 shadow-none py-4" placeholder="e.g. T-Shirts" onChange={(e)=>setname(e.target.value)} required />
                                    </div>
                                </div>
                                <button type='submit' className='btn btn-info btn-block py-3 rounded-pill font-weight-bold shadow-lg mt-4 d-flex align-items-center justify-content-center'>
                                    <PlusCircle size={20} className="mr-2" /> ADD TO REPOSITORY
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
            <style>{`.rounded-3xl{border-radius:30px !important}.rounded-xl{border-radius:15px !important}`}</style>
        </div>
    )
}