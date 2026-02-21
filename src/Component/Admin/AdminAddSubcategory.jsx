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

    function postData(e) {
        e.preventDefault()
        let item = subcategory.find((x) => x.name.toLowerCase() === name.toLowerCase())
        if (item) {
            alert("Subcategory already exists!")
        } else {
            dispatch(addSubcategory({ name: name }))
            navigate("/admin-subcategory")
        }
    }

    useEffect(() => { dispatch(getSubcategory()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "90vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-6">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white shadow-xl rounded-3xl p-5 border-0">
                            <div className="d-flex align-items-center mb-4">
                                <Link to="/admin-subcategory" className="text-dark mr-3"><ArrowLeft /></Link>
                                <h3 className="font-weight-bold mb-0 text-dark">Add Sub-Category</h3>
                            </div>

                            <form onSubmit={postData}>
                                <div className="mb-4 text-left">
                                    <label className="text-muted small font-weight-bold ml-1">SUB-CATEGORY NAME</label>
                                    <div className="input-group p-1 border rounded-xl shadow-sm bg-light-soft">
                                        <div className="input-group-prepend p-2 text-info"><Grid size={22}/></div>
                                        <input type="text" className="form-control border-0 bg-transparent py-4 shadow-none" placeholder="Type here..." onChange={(e)=>setname(e.target.value)} required />
                                    </div>
                                </div>

                                <motion.button whileHover={{ y: -2 }} type="submit" className="btn btn-info btn-block py-3 rounded-pill shadow-lg font-weight-bold mt-4">
                                    SAVE SUB-CATEGORY
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}