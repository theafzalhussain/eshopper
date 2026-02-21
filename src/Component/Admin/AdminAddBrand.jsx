import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { addBrand, getBrand } from '../../Store/ActionCreaters/BrandActionCreators'
import { motion } from 'framer-motion'
import { Tag, ArrowLeft, ShieldPlus } from 'lucide-react'

export default function AdminAddBrand() {
    const [name, setname] = useState("")
    const brand = useSelector((state) => state.BrandStateData)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    function postData(e) {
        e.preventDefault()
        let item = brand.find((x) => x.name.toLowerCase() === name.toLowerCase())
        if (item) {
            alert("This brand already exists in database!")
        } else {
            dispatch(addBrand({ name: name }))
            navigate("/admin-brand")
        }
    }

    useEffect(() => {
        dispatch(getBrand())
    }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "90vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3">
                        <LefNav />
                    </div>
                    <div className="col-lg-6">
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="bg-white shadow-lg rounded-2xl p-5 border-0"
                        >
                            <div className="d-flex align-items-center mb-4">
                                <Link to="/admin-brand" className="mr-3 text-dark bg-light rounded-pill p-2 d-flex">
                                    <ArrowLeft size={20}/>
                                </Link>
                                <h3 className="font-weight-bold mb-0">Partner Brand Enrollment</h3>
                            </div>

                            <form onSubmit={postData}>
                                <div className="mb-4">
                                    <label className="text-muted small font-weight-bold uppercase mb-2 d-block">
                                        Global Brand Name
                                    </label>
                                    <div className="input-group p-1 border rounded-2xl bg-white shadow-sm">
                                        <div className="input-group-prepend text-info p-2">
                                            <Tag size={20}/>
                                        </div>
                                        <input 
                                            type="text" 
                                            className="form-control border-0 py-4 shadow-none" 
                                            placeholder="Enter Brand Name (e.g. Adidas)" 
                                            onChange={(e) => setname(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>

                                <button 
                                    type='submit' 
                                    className='btn btn-dark btn-block py-3 rounded-pill shadow-xl font-weight-bold ls-1 mt-4'
                                >
                                    <ShieldPlus size={18} className="mr-2" /> REGISTER BRAND
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
            {/* Embedded styles for specific corners */}
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-2xl { border-radius: 20px !important; }
                .ls-1 { letter-spacing: 1px; }
            `}} />
        </div>
    )
}