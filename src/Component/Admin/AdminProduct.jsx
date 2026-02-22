import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import LefNav from './LefNav'
import { motion } from 'framer-motion'
import { Image as ImageIcon, PlusCircle, ArrowLeft, LayoutDashboard } from 'lucide-react'

// Essential Actions (Confirm name match with yours)
import { getProduct, addProduct } from '../../Store/ActionCreaters/ProductActionCreators'

export default function AdminAddProduct() {
    const [data, setdata] = useState({ name:"", baseprice:0, discount:0, finalprice:0, color:"", size:"", stock:"In Stock", description:"", pic1:"", pic2:"", pic3:"", pic4:"" })
    
    const navigate = useNavigate()
    const dispatch = useDispatch()

    function getFile(e) { setdata(old => ({ ...old, [e.target.name]: e.target.files[0] })) }

    function postData(e) {
        e.preventDefault()
        let fp = Math.round(data.baseprice - (data.baseprice * data.discount / 100))
        let formData = new FormData()
        formData.append("name", data.name); formData.append("finalprice", fp);
        formData.append("pic1", data.pic1); if(data.pic2) formData.append("pic2", data.pic2)
        // Add others as needed...
        
        dispatch(addProduct(formData))
        navigate("/admin-product")
    }

    return (
        <div style={{ backgroundColor: "#fbfbfb", minHeight: "100vh" }} className="py-5 text-dark">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="col-lg-10 bg-white p-5 shadow rounded-3xl">
                        <div className="d-flex align-items-center mb-5 pb-3 border-bottom">
                             <Link to="/admin-product" className="mr-3 text-info"><ArrowLeft /></Link>
                             <h4 className="font-weight-bold mb-0">Craft New High-Fashion Product</h4>
                        </div>
                        
                        <form onSubmit={postData}>
                            <div className="row">
                                <div className="col-md-7">
                                    <div className="form-group mb-4"><label className="small-label">Product Name</label><input type="text" className="form-control rounded-pill p-3 border-info" onChange={(e)=>setdata({...data, name:e.target.value})} required /></div>
                                    <div className="row">
                                        <div className="col-6 mb-4"><label className="small-label">Base Price</label><input type="number" className="form-control" onChange={(e)=>setdata({...data, baseprice:e.target.value})} /></div>
                                        <div className="col-6 mb-4"><label className="small-label">Discount %</label><input type="number" className="form-control" onChange={(e)=>setdata({...data, discount:e.target.value})} /></div>
                                    </div>
                                    <div className="form-group mb-4"><label className="small-label">Curated Description</label><textarea className="form-control rounded-xl" rows="4" onChange={(e)=>setdata({...data, description:e.target.value})}></textarea></div>
                                </div>
                                <div className="col-md-5">
                                    <div className="bg-light p-4 rounded-3xl border-dashed h-100 text-center d-flex flex-column align-items-center justify-content-center">
                                        <ImageIcon className="text-info mb-3" size={40}/>
                                        <span className="small text-muted font-weight-bold">Primary Hero Shot (pic1)</span>
                                        <input type="file" name="pic1" onChange={getFile} className="form-control-file mt-3" required />
                                        <div className="mt-4 opacity-50 d-flex gap-2">
                                            <div className="p-2 border bg-white">pic2</div>
                                            <div className="p-2 border bg-white">pic3</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-dark btn-block mt-5 py-3 rounded-pill font-weight-bold ls-1 shadow-lg">CREATE PRESET PRODUCT</button>
                        </form>
                    </motion.div>
                </div>
            </div>
            <style>{`.small-label { text-transform: uppercase; font-size: 10px; font-weight: 800; color: #17a2b8; letter-spacing: 1px; }`}</style>
        </div>
    )
}