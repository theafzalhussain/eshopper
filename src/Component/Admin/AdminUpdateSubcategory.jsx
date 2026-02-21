import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import LefNav from './LefNav'
import { getSubcategory, updateSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators'
import { motion } from 'framer-motion'
import { Grid, ArrowLeft, Save } from 'lucide-react'

export default function AdminUpdateSubcategory() {
    const [name, setName] = useState("")
    const { id } = useParams() // Ye MongoDB ki String ID hai
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const subcategory = useSelector((state) => state.SubcategoryStateData)

    useEffect(() => {
        if (subcategory.length === 0) {
            dispatch(getSubcategory())
        } else {
            // FIX: String comparison, No Number() conversion needed for MongoDB
            const item = subcategory.find((x) => (x.id || x._id) === id)
            if (item) setName(item.name)
        }
    }, [subcategory.length, id])

    function postData(e) {
        e.preventDefault()
        dispatch(updateSubcategory({ id: id, name: name }))
        alert("Sub-Category Updated Successfully!")
        navigate("/admin-subcategory")
    }

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "90vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white shadow-xl rounded-3xl p-5 border-0">
                            <div className="d-flex align-items-center mb-4">
                                <Link to="/admin-subcategory" className="text-dark mr-3 shadow-sm rounded-circle p-2 bg-light d-flex"><ArrowLeft size={20}/></Link>
                                <h3 className="font-weight-bold mb-0">Update Sub-Category</h3>
                            </div>
                            <form onSubmit={postData}>
                                <div className="mb-4 text-left">
                                    <label className="text-muted small font-weight-bold ml-1 text-uppercase">Subcategory ID: <span className="text-info">{id}</span></label>
                                    <div className="input-group p-1 border rounded-2xl shadow-sm mt-2">
                                        <div className="input-group-prepend p-2 text-info"><Grid size={22}/></div>
                                        <input type="text" value={name} className="form-control border-0 bg-transparent py-4 shadow-none font-weight-bold" onChange={(e)=>setName(e.target.value)} required />
                                    </div>
                                </div>
                                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} type="submit" className="btn btn-info btn-block py-3 rounded-pill shadow-lg font-weight-bold">
                                    <Save size={18} className="mr-2"/> SAVE CHANGES
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}