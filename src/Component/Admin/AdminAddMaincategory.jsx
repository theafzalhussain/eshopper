import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { addMaincategory, getMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators'
import { motion } from 'framer-motion'
import { Layers, ArrowLeft, PlusCircle } from 'lucide-react'

export default function AdminAddMaincategory() {
    const [name, setname] = useState("")
    const maincategory = useSelector((state) => state.MaincategoryStateData)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    function postData(e) {
        e.preventDefault()
        // Duplicate check logic
        let item = maincategory.find((x) => x.name.toLowerCase() === name.toLowerCase())
        if (item) {
            alert("This Main Category already exists!")
        } else {
            dispatch(addMaincategory({ name: name }))
            alert("Category added successfully!")
            navigate("/admin-maincategory")
        }
    }

    useEffect(() => { dispatch(getMaincategory()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "90vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-6">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white shadow-xl rounded-3xl p-5 border-0">
                            <div className="d-flex align-items-center mb-4">
                                <Link to="/admin-maincategory" className="text-dark mr-3"><ArrowLeft /></Link>
                                <h3 className="font-weight-bold mb-0">New Main Category</h3>
                            </div>

                            <form onSubmit={postData}>
                                <div className="mb-4">
                                    <label className="text-muted small font-weight-bold text-uppercase ml-1">Category Name</label>
                                    <div className="input-group premium-input-group shadow-sm">
                                        <div className="input-group-prepend">
                                            <span className="input-group-text bg-white border-0 text-info"><Layers size={20}/></span>
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="Enter name (e.g. Menswear)" 
                                            className="form-control border-0 py-4" 
                                            onChange={(e) => setname(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>

                                <motion.button 
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    type="submit" 
                                    className="btn btn-info btn-block py-3 rounded-pill shadow-lg font-weight-bold d-flex align-items-center justify-content-center"
                                >
                                    <PlusCircle size={20} className="mr-2" /> CREATE CATEGORY
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
            <style>{`
                .rounded-3xl { border-radius: 30px !important; }
                .premium-input-group { border: 1px solid #eee; border-radius: 15px; overflow: hidden; transition: 0.3s; }
                .premium-input-group:focus-within { border-color: #17a2b8; box-shadow: 0 10px 20px rgba(23,162,184,0.1) !important; }
                .shadow-xl { box-shadow: 0 30px 60px rgba(0,0,0,0.08) !important; }
            `}</style>
        </div>
    )
}