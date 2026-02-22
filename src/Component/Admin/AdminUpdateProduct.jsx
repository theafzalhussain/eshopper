import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { getProduct, updateProduct } from '../../Store/ActionCreaters/ProductActionCreators'
import { getMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators'
import { getSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators'
import { getBrand } from '../../Store/ActionCreaters/BrandActionCreators'
import { motion } from 'framer-motion'
import { Package, Image as ImageIcon, ArrowLeft, Save, BadgePercent, Ruler, Palette, Tags } from 'lucide-react'

export default function AdminUpdateProduct() {
    let { id } = useParams() // MongoDB ID from URL
    let [data, setdata] = useState({
        name: "", maincategory: "", subcategory: "", brand: "",
        color: "", size: "", baseprice: 0, discount: 0, stock: "In Stock",
        description: "", pic1: "", pic2: "", pic3: "", pic4: ""
    })

    let product = useSelector((state) => state.ProductStateData)
    let maincat = useSelector((state) => state.MaincategoryStateData)
    let subcat = useSelector((state) => state.SubcategoryStateData)
    let brand = useSelector((state) => state.BrandStateData)

    let navigate = useNavigate()
    let dispatch = useDispatch()

    // Populating Form with Existing Data
    useEffect(() => {
        dispatch(getProduct())
        dispatch(getMaincategory())
        dispatch(getSubcategory())
        dispatch(getBrand())
        
        // Find existing product logic (handles both id formats)
        let item = product.find((x) => (x.id || x._id) === id)
        if (item) setdata({ ...item })
    }, [product.length, id])

    function getData(e) {
        let { name, value } = e.target
        setdata((old) => ({ ...old, [name]: value }))
    }

    function getFile(e) {
        let { name, files } = e.target
        setdata((old) => ({ ...old, [name]: files[0] }))
    }

    function postData(e) {
        e.preventDefault()
        let bp = Number(data.baseprice)
        let d = Number(data.discount)
        let fp = Math.round(bp - (bp * d) / 100)

        let formData = new FormData()
        // --- 🎯 IMPORTANT: Adding the Product ID for PUT request ---
        formData.append("id", id) 
        formData.append("name", data.name)
        formData.append("maincategory", data.maincategory)
        formData.append("subcategory", data.subcategory)
        formData.append("brand", data.brand)
        formData.append("color", data.color)
        formData.append("size", data.size)
        formData.append("baseprice", bp)
        formData.append("discount", d)
        formData.append("finalprice", fp)
        formData.append("stock", data.stock)
        formData.append("description", data.description)

        // Only append new images if they are updated
        if (data.pic1 && typeof data.pic1 === "object") formData.append("pic1", data.pic1)
        if (data.pic2 && typeof data.pic2 === "object") formData.append("pic2", data.pic2)
        if (data.pic3 && typeof data.pic3 === "object") formData.append("pic3", data.pic3)
        if (data.pic4 && typeof data.pic4 === "object") formData.append("pic4", data.pic4)

        dispatch(updateProduct(formData))
        alert("Success: Database overwritten with new product data!")
        navigate("/admin-product")
    }

    return (
        <div style={{ backgroundColor: "#fcfcfc", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="col-lg-10 bg-white shadow-2xl rounded-3xl p-5 border-0">
                        <div className="d-flex align-items-center mb-5 border-bottom pb-4">
                            <Link to="/admin-product" className="bg-light text-dark rounded-circle p-2 mr-3 shadow-sm hover-shadow d-flex transition">
                                <ArrowLeft size={20} />
                            </Link>
                            <h2 className="font-weight-bold text-dark mb-0">Update Premium Listing</h2>
                        </div>

                        <form onSubmit={postData}>
                            {/* --- Product Title --- */}
                            <div className="mb-4">
                                <label className="text-muted small font-weight-bold uppercase ls-1 mb-2 d-block">Full Product Title</label>
                                <div className="input-group p-1 border rounded-xl shadow-sm bg-white transition-within">
                                    <div className="p-3 text-info"><Package size={22} /></div>
                                    <input type="text" name="name" value={data.name} className="form-control border-0 h-100 font-weight-bold shadow-none" placeholder="e.g. Italian Slim Fit Leather Jacket" onChange={getData} required />
                                </div>
                            </div>

                            {/* --- Category Grids (Row 2) --- */}
                            <div className="row mb-4">
                                <div className="col-md-3">
                                    <label className="text-muted small font-weight-bold uppercase mb-2 d-block">Maincategory</label>
                                    <select name="maincategory" value={data.maincategory} className="form-control rounded-xl shadow-sm border-light-p p-3" onChange={getData}>
                                        {maincat.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="text-muted small font-weight-bold uppercase mb-2 d-block">Subcategory</label>
                                    <select name="subcategory" value={data.subcategory} className="form-control rounded-xl shadow-sm border-light-p p-3" onChange={getData}>
                                        {subcat.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="text-muted small font-weight-bold uppercase mb-2 d-block">Brand</label>
                                    <select name="brand" value={data.brand} className="form-control rounded-xl shadow-sm border-light-p p-3" onChange={getData}>
                                        {brand.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="text-muted small font-weight-bold uppercase mb-2 d-block">Status</label>
                                    <select name="stock" value={data.stock} className="form-control rounded-xl shadow-sm border-light-p p-3" onChange={getData}>
                                        <option value="In Stock">In Stock</option>
                                        <option value="Out of Stock">Out of Stock</option>
                                    </select>
                                </div>
                            </div>

                            {/* --- Price and Meta (Row 3) --- */}
                            <div className="row mb-4">
                                <div className="col-md-3">
                                    <label className="small font-weight-bold uppercase mb-2 d-block">Color</label>
                                    <div className="d-flex align-items-center bg-light rounded-pill px-3 border"><Palette size={16} className="mr-2"/><input name="color" value={data.color} onChange={getData} className="form-control border-0 bg-transparent py-4"/></div>
                                </div>
                                <div className="col-md-3">
                                    <label className="small font-weight-bold uppercase mb-2 d-block">Size Profile</label>
                                    <div className="d-flex align-items-center bg-light rounded-pill px-3 border"><Ruler size={16} className="mr-2"/><input name="size" value={data.size} onChange={getData} className="form-control border-0 bg-transparent py-4"/></div>
                                </div>
                                <div className="col-md-3">
                                    <label className="small font-weight-bold uppercase mb-2 d-block text-info">Retail Price (₹)</label>
                                    <div className="d-flex align-items-center bg-light rounded-pill px-3 border"><Tags size={16} className="mr-2"/><input type="number" name="baseprice" value={data.baseprice} onChange={getData} className="form-control border-0 bg-transparent py-4 font-weight-bold"/></div>
                                </div>
                                <div className="col-md-3">
                                    <label className="small font-weight-bold uppercase mb-2 d-block text-danger">Seasonal Off (%)</label>
                                    <div className="d-flex align-items-center bg-light rounded-pill px-3 border"><BadgePercent size={16} className="mr-2"/><input type="number" name="discount" value={data.discount} onChange={getData} className="form-control border-0 bg-transparent py-4"/></div>
                                </div>
                            </div>

                            {/* --- Narrative/Description --- */}
                            <div className="mb-4">
                                <label className="text-muted small font-weight-bold uppercase mb-2 d-block">Editorial Narrative</label>
                                <textarea name="description" value={data.description} className="form-control rounded-2xl p-4 shadow-inner border-0" rows="5" style={{backgroundColor:"#f9f9f9"}} onChange={getData}></textarea>
                            </div>

                            {/* --- Assets Management --- */}
                            <div className="row mb-5">
                                {["pic1", "pic2", "pic3", "pic4"].map((pic, i) => (
                                    <div key={i} className="col-md-3 mb-3 text-center">
                                        <div className="bg-light p-3 rounded-2xl shadow-sm border border-secondary" style={{borderStyle:'dashed !important'}}>
                                            <ImageIcon size={22} className="text-muted mb-1" />
                                            <p className="xx-small text-muted font-weight-bold mb-2 uppercase">Angle {i+1}</p>
                                            <input type="file" name={pic} className="form-control-file small" style={{fontSize:'10px'}} onChange={getFile}/>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} type="submit" className="btn btn-dark btn-block py-3 rounded-pill shadow-xl font-weight-bold ls-1 d-flex align-items-center justify-content-center">
                                <Save size={20} className="mr-2" /> SYNCHRONIZE PRODUCT DETAILS
                            </motion.button>
                        </form>
                    </motion.div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-2xl { border-radius: 20px !important; }
                .rounded-3xl { border-radius: 40px !important; }
                .rounded-xl { border-radius: 18px !important; }
                .border-light-p { border: 1.5px solid #f1f1f1 !important; }
                .shadow-2xl { box-shadow: 0 40px 100px -20px rgba(0,0,0,0.12) !important; }
                .ls-1 { letter-spacing: 1px; }
                .xx-small { font-size: 10px; }
                .transition-within:focus-within { border-color: #17a2b8 !important; }
                .object-cover { object-fit: cover; }
            `}} />
        </div>
    )
}