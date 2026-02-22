import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { addMaincategory, getMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators'
import LefNav from './LefNav'
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
            alert("Success: New Main Category added to boutique.")
            navigate("/admin-maincategory")
        }
    }

    useEffect(() => { 
        dispatch(getMaincategory()) 
    }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "92vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3 mb-4"><LefNav /></div>
                    <div className="col-lg-7">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white shadow-xl rounded-3xl p-5 border-0">
                            <div className="d-flex align-items-center mb-5 border-bottom pb-3">
                                <Link to="/admin-maincategory" className="bg-light text-dark rounded-circle p-2 mr-3 transition-all hover-shadow">
                                    <ArrowLeft size={20} />
                                </Link>
                                <h3 className="font-weight-bold mb-0">Add Maincategory</h3>
                            </div>

                            <form onSubmit={postData}>
                                <div className="mb-5">
                                    <label className="small font-weight-bold text-info uppercase ls-2 mb-3 d-block">Department Name</label>
                                    <div className="input-group premium-input shadow-sm border rounded-xl overflow-hidden bg-white">
                                        <div className="input-group-prepend p-3 text-info border-right"><Layers size={22} /></div>
                                        <input type="text" className="form-control border-0 font-weight-bold py-4 shadow-none" placeholder="e.g. Menswear or Accessories" onChange={(e) => setname(e.target.value)} required />
                                    </div>
                                </div>

                                <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} type="submit" className="btn btn-info btn-block py-3 rounded-pill shadow-lg font-weight-bold ls-1 d-flex align-items-center justify-content-center">
                                    <PlusCircle size={20} className="mr-2" /> PUBLISH CATEGORY
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
            <style>{`.rounded-3xl{border-radius:40px !important} .rounded-xl{border-radius:20px !important} .ls-2{letter-spacing:2px} .ls-1{letter-spacing:1px}`}</style>
        </div>
    )
}