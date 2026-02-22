import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { getProduct, updateProduct } from '../../Store/ActionCreaters/ProductActionCreators'
import { getMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators'
import { getSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators'
import { getBrand } from '../../Store/ActionCreaters/BrandActionCreators'
import { motion } from 'framer-motion'
import { Save, ArrowLeft, Image as ImageIcon, Ruler, Palette, BadgePercent, LayoutList } from 'lucide-react'

export default function AdminUpdateProduct() {
    let { id } = useParams() 
    let dispatch = useDispatch()
    let navigate = useNavigate()
    
    // REDUX STATE
    const products = useSelector((state) => state.ProductStateData)
    const maincat = useSelector((state) => state.MaincategoryStateData)
    const subcat = useSelector((state) => state.SubcategoryStateData)
    const brand = useSelector((state) => state.BrandStateData)

    let [data, setdata] = useState({
        name: "", maincategory: "", subcategory: "", brand: "",
        color: "", size: "", baseprice: 0, discount: 0, finalprice: 0, 
        stock: "In Stock", description: "", pic1: "", pic2: "", pic3: "", pic4: ""
    })

    // --- FORM DATA RE-POULATION ---
    useEffect(() => {
        dispatch(getProduct()); dispatch(getMaincategory()); dispatch(getSubcategory()); dispatch(getBrand());
        
        // Handling both standard ID and MongoDB _id
        const item = products.find((x) => (x.id || x._id) === id)
        if (item) setdata({ ...item })
    }, [products.length, id])

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
        // Logical conversion
        let bp = Number(data.baseprice)
        let d = Number(data.discount)
        let fp = Math.round(bp - (bp * d) / 100)

        let formData = new FormData()
        formData.append("id", id) // Targets original record for Overwrite
        formData.append("name", data.name)
        formData.append("maincategory", data.maincategory)
        formData.append("subcategory", data.subcategory)
        formData.append("brand", data.brand)
        formData.append("baseprice", bp)
        formData.append("discount", d)
        formData.append("finalprice", fp)
        formData.append("color", data.color)
        formData.append("size", data.size)
        formData.append("stock", data.stock)
        formData.append("description", data.description)

        // Sync Assets: Add file object only if a new file is chosen
        if (data.pic1 && typeof data.pic1 === "object") formData.append("pic1", data.pic1)
        if (data.pic2 && typeof data.pic2 === "object") formData.append("pic2", data.pic2)
        if (data.pic3 && typeof data.pic3 === "object") formData.append("pic3", data.pic3)
        if (data.pic4 && typeof data.pic4 === "object") formData.append("pic4", data.pic4)

        dispatch(updateProduct(formData))
        alert("Success: Master Product details synchronized with database!")
        navigate("/admin-product")
    }

    return (
        <div style={{ backgroundColor: "#fcfcfc", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <motion.div initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} className="col-lg-10 bg-white p-5 shadow-2xl rounded-3xl">
                        <div className="d-flex align-items-center mb-5 pb-3 border-bottom">
                             <Link to="/admin-product" className="btn btn-light rounded-circle p-2 mr-3 shadow-sm hover-shadow d-flex transition">
                                <ArrowLeft size={18} />
                             </Link>
                             <h4 className="font-weight-bold mb-0 text-dark">Overhaul Boutique Listing</h4>
                        </div>
                        
                        <form onSubmit={postData}>
                            {/* Product Header (Large Field) */}
                            <div className="mb-5">
                                <label className="text-muted small font-weight-bold ls-1 uppercase">Full Product Nomenclature</label>
                                <div className="input-group luxury-input-wrap border shadow-sm rounded-xl">
                                    <div className="p-3 text-info border-right"><LayoutList size={22} /></div>
                                    <input type="text" name="name" value={data.name} className="form-control border-0 font-weight-bold py-4 h-100 shadow-none" placeholder="Designer Article Name" onChange={getData} required />
                                </div>
                            </div>

                            {/* Dropdown Matrix */}
                            <div className="row mb-5">
                                {[
                                    { label: "Department", name: "maincategory", options: maincat, val: data.maincategory },
                                    { label: "Seasonality", name: "subcategory", options: subcat, val: data.subcategory },
                                    { label: "Craft Label", name: "brand", options: brand, val: data.brand }
                                ].map((field, idx) => (
                                    <div key={idx} className="col-md-3">
                                        <label className="text-muted small font-weight-bold uppercase mb-2 d-block">{field.label}</label>
                                        <select name={field.name} value={field.val} className="form-control rounded-xl p-3 border-light shadow-sm" onChange={getData}>
                                            {field.options.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
                                        </select>
                                    </div>
                                ))}
                                <div className="col-md-3">
                                    <label className="text-muted small font-weight-bold uppercase mb-2 d-block">Status</label>
                                    <select name="stock" value={data.stock} className="form-control rounded-xl p-3 border-light shadow-sm" onChange={getData}>
                                        <option value="In Stock">Active: In Stock</option>
                                        <option value="Out of Stock">On Request: Sold Out</option>
                                    </select>
                                </div>
                            </div>

                            {/* Specifications Row */}
                            <div className="row mb-5">
                                <div className="col-md-3"><div className="spec-item"><Palette size={16} className="text-info"/><input name="color" value={data.color} placeholder="Visual Tint" onChange={getData} className="form-control"/></div></div>
                                <div className="col-md-3"><div className="spec-item"><Ruler size={16} className="text-info"/><input name="size" value={data.size} placeholder="Metric Fit" onChange={getData} className="form-control"/></div></div>
                                <div className="col-md-3"><div className="spec-item"><label>₹</label><input type="number" name="baseprice" value={data.baseprice} onChange={getData} className="form-control font-weight-bold text-dark"/></div></div>
                                <div className="col-md-3"><div className="spec-item"><BadgePercent size={18} className="text-danger"/><input type="number" name="discount" value={data.discount} onChange={getData} className="form-control text-danger"/></div></div>
                            </div>

                            {/* Description Editor */}
                            <div className="mb-5">
                                <label className="text-muted small font-weight-bold uppercase mb-2 d-block">EDITORIAL DESCRIPTION</label>
                                <textarea name="description" value={data.description} rows="4" className="form-control border shadow-sm p-4 rounded-2xl" style={{backgroundColor:"#fbfbfb"}} onChange={getData}></textarea>
                            </div>

                            {/* Digital Asset Management */}
                            <div className="row mb-5">
                                {["pic1", "pic2", "pic3", "pic4"].map((pic, i) => (
                                    <div key={i} className="col-md-3 mb-4 text-center">
                                        <div className="asset-box bg-light rounded-2xl p-4 border shadow-inner">
                                            <ImageIcon size={30} className="text-muted opacity-50 mb-2"/>
                                            <p className="xx-small text-muted font-weight-bold uppercase">Perspective {i+1}</p>
                                            <input type="file" name={pic} className="form-control-file small-file-btn" onChange={getFile}/>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} type="submit" className="btn btn-dark btn-block py-3 rounded-pill shadow-xl font-weight-bold ls-2 mt-4 d-flex align-items-center justify-content-center">
                                <Save size={20} className="mr-2" /> PUBLISH ALL REVISIONS
                            </motion.button>
                        </form>
                    </motion.div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .shadow-2xl { box-shadow: 0 40px 100px -10px rgba(0,0,0,0.12) !important; }
                .rounded-2xl { border-radius: 20px !important; } .rounded-3xl { border-radius: 42px !important; }
                .spec-item { display: flex; align-items: center; gap: 10px; background: #f8f9fa; padding: 5px 15px; border-radius: 50px; border: 1.5px solid #eee; }
                .spec-item input { border: none !important; background: transparent; height: 45px; width: 100%; outline: none !important; font-size: 13px; font-weight: 700; }
                .ls-2 { letter-spacing: 2px; } .ls-1 { letter-spacing: 1px; }
                .small-file-btn { font-size: 9px; cursor: pointer; color: #17a2b8; font-weight: bold; }
            `}} />
        </div>
    )
}