import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import LefNav from './LefNav'
import { getMaincategory, updateMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators'
import { motion } from 'framer-motion'
import { Save, ArrowLeft, Layers } from 'lucide-react'

export default function AdminUpdateMaincategory() {
    const [name, setName] = useState("")
    const { id } = useParams()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const maincategories = useSelector((state) => state.MaincategoryStateData)

    useEffect(() => {
        dispatch(getMaincategory())
        const item = maincategories.find((x) => (x.id || x._id) === id)
        if (item) setName(item.name)
    }, [maincategories.length, id])

    function postData(e) {
        e.preventDefault()
        dispatch(updateMaincategory({ id: id, name: name }))
        alert("System Updated: Main Category Refreshed")
        navigate("/admin-maincategory")
    }

    return (
        <div style={{ backgroundColor: "#fcfcfc", minHeight: "90vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-6">
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 shadow-xl rounded-3xl">
                            <div className="d-flex align-items-center mb-5">
                                <Link to="/admin-maincategory" className="bg-light text-dark rounded-circle p-3 mr-3 shadow-sm d-flex align-items-center justify-content-center transition hover-bg-dark"><ArrowLeft size={18} /></Link>
                                <h4 className="font-weight-bold mb-0">Recalibrate Category</h4>
                            </div>

                            <form onSubmit={postData}>
                                <div className="form-group mb-5">
                                    <label className="text-muted font-weight-bold x-small uppercase ls-1 mb-2 d-block">CATEGORY TITLE</label>
                                    <div className="input-group luxury-input-wrap border shadow-sm rounded-xl">
                                        <div className="p-3 bg-white text-info border-right"><Layers size={22} /></div>
                                        <input type="text" className="form-control border-0 font-weight-bold shadow-none py-4" value={name} onChange={(e) => setName(e.target.value)} required />
                                    </div>
                                </div>

                                <button className="btn btn-info btn-block py-3 rounded-pill shadow-xl font-weight-bold">
                                    <Save size={18} className="mr-2" /> OVERWRITE DATABASE
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
            <style>{`.luxury-input-wrap{background:#fff}.rounded-xl{border-radius:18px !important}`}</style>
        </div>
    )
}