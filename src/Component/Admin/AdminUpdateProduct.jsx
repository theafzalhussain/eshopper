import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import LefNav from './LefNav'
import { addProduct } from '../../Store/ActionCreaters/ProductActionCreators'
import { getMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators'
import { getSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators'
import { getBrand } from '../../Store/ActionCreaters/BrandActionCreators'
import { motion } from 'framer-motion'
import { PlusCircle, ArrowLeft, Package, Image as ImageIcon } from 'lucide-react'

export default function AdminAddProduct() {
    const [data, setdata] = useState({ name: "", color: "", size: "", baseprice: 0, discount: 0, finalprice: 0, stock: "In Stock", description: "Standard quality...", pic1: "", pic2: "", pic3: "", pic4: "" })
    
    const maincat = useSelector(state => state.MaincategoryStateData)
    const subcat = useSelector(state => state.SubcategoryStateData)
    const brand = useSelector(state => state.BrandStateData)
    
    const dispatch = useDispatch()
    const navigate = useNavigate()

    function getFile(e) {
        setdata(old => ({ ...old, [e.target.name]: e.target.files[0] }))
    }

    function postData(e) {
        e.preventDefault()
        let fp = Math.round(Number(data.baseprice) - (Number(data.baseprice) * Number(data.discount) / 100))
        
        let formData = new FormData()
        formData.append("name", data.name)
        formData.append("maincategory", data.maincategory || maincat[0]?.name)
        formData.append("subcategory", data.subcategory || subcat[0]?.name)
        formData.append("brand", data.brand || brand[0]?.name)
        formData.append("baseprice", data.baseprice)
        formData.append("discount", data.discount)
        formData.append("finalprice", fp)
        formData.append("color", data.color)
        formData.append("size", data.size)
        formData.append("stock", data.stock)
        formData.append("description", data.description)
        formData.append("pic1", data.pic1)
        if(data.pic2) formData.append("pic2", data.pic2)
        if(data.pic3) formData.append("pic3", data.pic3)
        if(data.pic4) formData.append("pic4", data.pic4)

        dispatch(addProduct(formData))
        navigate("/admin-product")
    }

    useEffect(() => { dispatch(getMaincategory()); dispatch(getSubcategory()); dispatch(getBrand()); }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="col-lg-10 bg-white shadow-xl rounded-3xl p-5">
                        <div className="d-flex align-items-center mb-5 border-bottom pb-3">
                            <Link to="/admin-product" className="text-dark mr-3"><ArrowLeft /></Link>
                            <h3 className="font-weight-bold mb-0">List Premium Product</h3>
                        </div>

                        <form onSubmit={postData}>
                            <div className="row">
                                <div className="col-md-8">
                                    <div className="form-group mb-4">
                                        <label className="small font-weight-bold uppercase ls-1">Product Title</label>
                                        <input type="text" className="form-control premium-input" onChange={(e) => setdata({...data, name: e.target.value})} required />
                                    </div>
                                    <div className="row">
                                        <div className="col-md-4 mb-4">
                                            <label className="small font-weight-bold uppercase ls-1">Category</label>
                                            <select name="maincategory" className="form-control" onChange={(e) => setdata({...data, maincategory: e.target.value})}>
                                                {maincat.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-4 mb-4">
                                            <label className="small font-weight-bold uppercase ls-1">Price (₹)</label>
                                            <input type="number" className="form-control" onChange={(e) => setdata({...data, baseprice: e.target.value})} required />
                                        </div>
                                        <div className="col-md-4 mb-4">
                                            <label className="small font-weight-bold uppercase ls-1">Discount (%)</label>
                                            <input type="number" className="form-control" onChange={(e) => setdata({...data, discount: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="bg-light p-3 rounded-2xl h-100 text-center d-flex flex-column justify-content-center">
                                        <ImageIcon className="text-info mx-auto mb-2" size={40} />
                                        <label className="small font-weight-bold">Primary Hero Image</label>
                                        <input type="file" name="pic1" onChange={getFile} className="form-control-file mt-2" required />
                                    </div>
                                </div>
                            </div>

                            <button className="btn btn-info btn-block py-3 mt-5 rounded-pill font-weight-bold shadow-lg"><PlusCircle size={20} className="mr-2" /> PUBLISH PRODUCT</button>
                        </form>
                    </motion.div>
                </div>
            </div>
            <style>{`.rounded-3xl{border-radius:35px !important}.premium-input{border: 1.5px solid #eee; height:50px; font-weight:700}.shadow-xl{box-shadow: 0 30px 60px rgba(0,0,0,0.05) !important}`}</style>
        </div>
    )
}