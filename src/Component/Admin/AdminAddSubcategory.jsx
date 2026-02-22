import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { addSubcategory, getSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators'
import LefNav from './LefNav'
import { motion } from 'framer-motion'
import { Grid, ArrowLeft, Save } from 'lucide-react'

export default function AdminAddSubcategory() {
    const [name, setname] = useState("")
    const subcategory = useSelector((state) => state.SubcategoryStateData)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    function postData(e) {
        e.preventDefault()
        let item = subcategory.find((x) => x.name.toLowerCase() === name.toLowerCase())
        if (item) {
            alert("This Sub-category already exists!")
        } else {
            dispatch(addSubcategory({ name: name }))
            alert("Sub-category catalog updated.")
            navigate("/admin-subcategory")
        }
    }

    useEffect(() => { 
        dispatch(getSubcategory()) 
    }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "92vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3 mb-4"><LefNav /></div>
                    <div className="col-lg-7">
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white shadow-xl rounded-3xl p-5 border-0">
                            <div className="d-flex align-items-center mb-5 border-bottom pb-3">
                                <Link to="/admin-subcategory" className="bg-light text-dark rounded-circle p-2 mr-3"><ArrowLeft size={20} /></Link>
                                <h3 className="font-weight-bold mb-0">Define Sub-category</h3>
                            </div>

                            <form onSubmit={postData}>
                                <div className="mb-5">
                                    <label className="small font-weight-bold text-info uppercase ls-2 mb-3 d-block">Collection Name</label>
                                    <div className="input-group premium-input shadow-sm border rounded-xl overflow-hidden bg-white">
                                        <div className="input-group-prepend p-3 text-info border-right"><Grid size={22} /></div>
                                        <input type="text" className="form-control border-0 font-weight-bold py-4 shadow-none" placeholder="e.g. T-Shirts or Watches" onChange={(e) => setname(e.target.value)} required />
                                    </div>
                                </div>

                                <motion.button whileHover={{ scale: 1.01 }} type="submit" className="btn btn-dark btn-block py-3 rounded-pill shadow-lg font-weight-bold ls-1 d-flex align-items-center justify-content-center">
                                    <Save size={18} className="mr-2" /> RECORD ENTITY
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
            <style>{`.rounded-3xl{border-radius:40px !important} .rounded-xl{border-radius:20px !important}`}</style>
        </div>
    )
}