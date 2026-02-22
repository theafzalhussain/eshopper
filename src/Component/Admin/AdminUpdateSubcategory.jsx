import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import LefNav from './LefNav'
import { getSubcategory, updateSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators'
import { motion } from 'framer-motion'
import { Save, ArrowLeft, Grid } from 'lucide-react'

export default function AdminUpdateSubcategory() {
    const [name, setName] = useState("")
    const { id } = useParams() // MongoDB String ID
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const subcategories = useSelector((state) => state.SubcategoryStateData)

    useEffect(() => {
        dispatch(getSubcategory())
        // logic for MongoDB: Checking both id and _id
        const item = subcategories.find((x) => (x.id || x._id) === id)
        if (item) setName(item.name)
    }, [subcategories.length, id, dispatch])

    function postData(e) {
        e.preventDefault()
        dispatch(updateSubcategory({ id: id, name: name }))
        alert("System Synchronized: Subcategory updated!")
        navigate("/admin-subcategory")
    }

    return (
        <div style={{ backgroundColor: "#fcfcfc", minHeight: "90vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-6">
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 shadow-xl rounded-3xl border-0">
                            <div className="d-flex align-items-center mb-5">
                                <Link to="/admin-subcategory" className="bg-light text-dark rounded-circle p-3 mr-3 shadow-sm d-flex align-items-center justify-content-center transition hover-bg-dark text-decoration-none">
                                    <ArrowLeft size={18} />
                                </Link>
                                <h4 className="font-weight-bold mb-0">Update Sub-Category</h4>
                            </div>

                            <form onSubmit={postData}>
                                <div className="form-group mb-5">
                                    <label className="text-muted font-weight-bold x-small uppercase ls-1 mb-2 d-block">SUBCATEGORY TITLE</label>
                                    <div className="input-group luxury-input-wrap border shadow-sm rounded-xl">
                                        <div className="p-3 bg-white text-info border-right"><Grid size={22} /></div>
                                        <input type="text" className="form-control border-0 font-weight-bold shadow-none py-4" value={name} onChange={(e) => setName(e.target.value)} required />
                                    </div>
                                    <small className="text-muted mt-2 d-block">ID Reference: {id}</small>
                                </div>

                                <button className="btn btn-info btn-block py-3 rounded-pill shadow-xl font-weight-bold">
                                    <Save size={18} className="mr-2" /> OVERWRITE DATABASE
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
            <style>{`.luxury-input-wrap{background:#fff} .rounded-xl{border-radius:18px !important} .rounded-3xl{border-radius:35px !important}`}</style>
        </div>
    )
}