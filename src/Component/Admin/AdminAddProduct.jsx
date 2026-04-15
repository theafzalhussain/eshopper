import React, { useState, useEffect } from 'react'
import { useToast } from '../ToastNotification'
import { Link, useNavigate } from 'react-router-dom'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { addProduct } from '../../Store/ActionCreaters/ProductActionCreators'
import { getMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators'
import { getSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators'
import { getBrand } from '../../Store/ActionCreaters/BrandActionCreators'
import { motion } from 'framer-motion'
import { Save, ArrowLeft, Plus, Package } from 'lucide-react'
import './SystemControlCenter.css'

export default function AdminAddProduct() {
    const toast = useToast();
    var [data, setdata] = useState({
        name: "",
        maincategory: "",
        subcategory: "",
        brand: "",
        color: "",
        size: [], // Array for multi-size
        baseprice: 0,
        discount: 0,
        stock: "In Stock",
        description: "This is Sample Product",
        pic1: "",
        pic2: "",
        pic3: "",
        pic4: "",
    })

    var maincategory = useSelector((state) => state.MaincategoryStateData)
    var subcategory = useSelector((state) => state.SubcategoryStateData)
    var brand = useSelector((state) => state.BrandStateData)
    var navigate = useNavigate()
    var dispatch = useDispatch()

    function getData(e) {
        var { name, value, type, checked } = e.target
        if (name === 'size') {
            setdata((old) => {
                let newSizes = Array.isArray(old.size) ? [...old.size] : [];
                if (checked) {
                    if (!newSizes.includes(value)) newSizes.push(value);
                } else {
                    newSizes = newSizes.filter((s) => s !== value);
                }
                return { ...old, size: newSizes };
            });
        } else {
            setdata((old) => ({ ...old, [name]: value }));
        }
    }

    function getFile(e) {
        var { name, files } = e.target
        setdata((old) => {
            return {
                ...old,
                // Pure file object ko save karein, sirf name ko nahi
                [name]: files[0]
            }
        })
    }

    function postData(e) {
        e.preventDefault()

        // Prices calculation
        var bp = Number(data.baseprice)
        var d = Number(data.discount)
        var fp = Math.round(bp - (bp * d) / 100)

        // Dropdown validation (Agar user ne select nahi kiya toh first item le lo)
        var mc = data.maincategory || (maincategory.length > 0 ? maincategory[0].name : "")
        var sc = data.subcategory || (subcategory.length > 0 ? subcategory[0].name : "")
        var br = data.brand || (brand.length > 0 ? brand[0].name : "")

        // --- FormData for File Upload ---
        var formData = new FormData()
        formData.append("name", data.name)
        formData.append("maincategory", mc)
        formData.append("subcategory", sc)
        formData.append("brand", br)
        formData.append("color", data.color)
        // Send all sizes as array
        data.size.forEach((sz) => formData.append("size", sz))
        formData.append("baseprice", bp)
        formData.append("discount", d)
        formData.append("finalprice", fp)
        formData.append("stock", data.stock)
        formData.append("description", data.description)

        // Files append (Agar user ne select ki hain)
        if (data.pic1) formData.append("pic1", data.pic1)
        if (data.pic2) formData.append("pic2", data.pic2)
        if (data.pic3) formData.append("pic3", data.pic3)
        if (data.pic4) formData.append("pic4", data.pic4)

        dispatch(addProduct(formData))
        toast.success("Product added successfully!", 3500);
        navigate("/admin-product")
    }

    useEffect(() => {
        dispatch(getMaincategory())
        dispatch(getSubcategory())
        dispatch(getBrand())
    }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid">
                    <div className="w-100">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between mb-4 gap-3">
                                <div className="d-flex align-items-center">
                                    <Link to="/admin-product" className="btn btn-light rounded-circle p-2 mr-3 shadow-sm">
                                        <ArrowLeft size={18} />
                                    </Link>
                                    <h4 className="font-weight-bold mb-0 d-flex align-items-center">
                                        <Package className="mr-2 text-info" /> Add New Product
                                    </h4>
                                </div>
                            </div>

                            <form onSubmit={postData}>
                                <div className="mb-4">
                                    <label className="font-weight-bold text-secondary mb-2">Product Name</label>
                                    <input type="text" name="name" placeholder='Product Name' className='form-control rounded-lg p-3' onChange={getData} required />
                                </div>

                                <div className="row mb-4">
                                    <div className="col-6 col-md-3 mb-3">
                                        <label className="font-weight-bold text-secondary mb-2">Maincategory</label>
                                        <select name="maincategory" onChange={getData} className="form-control rounded-lg p-2">
                                            {maincategory?.map((item, index) => <option key={index} value={item.name}>{item.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-6 col-md-3 mb-3">
                                        <label className="font-weight-bold text-secondary mb-2">Subcategory</label>
                                        <select name="subcategory" onChange={getData} className="form-control rounded-lg p-2">
                                            {subcategory?.map((item, index) => <option key={index} value={item.name}>{item.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-6 col-md-3 mb-3">
                                        <label className="font-weight-bold text-secondary mb-2">Brand</label>
                                        <select name="brand" onChange={getData} className="form-control rounded-lg p-2">
                                            {brand?.map((item, index) => <option key={index} value={item.name}>{item.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-6 col-md-3 mb-3">
                                        <label className="font-weight-bold text-secondary mb-2">Stock</label>
                                        <select name="stock" onChange={getData} className="form-control rounded-lg p-2">
                                            <option value="In Stock">In Stock</option>
                                            <option value="Out of Stock">Out of Stock</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="row mb-4">
                                    <div className="col-md-6 mb-3">
                                        <label className="font-weight-bold text-secondary mb-2">Color</label>
                                        <input type="text" name='color' placeholder='Color' onChange={getData} className='form-control rounded-lg p-3' required />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="font-weight-bold text-secondary mb-2">Size</label>
                                        <div className="d-flex flex-wrap gap-2 premium-size-wrap">
                                            {['XS','S','M','L','XL','XXL',26,28,30,32,34,36,38,40].map((sz) => (
                                                <label key={sz} className="mr-2 mb-1 premium-size-label" style={{fontWeight:700, background:'#f5f7fa', borderRadius:'8px', padding:'6px 14px', color:'#1a1a1a', border:'2px solid #d1d5db', boxShadow:'0 2px 8px rgba(0,0,0,0.04)', transition:'all 0.2s'}}>
                                                    <input
                                                        type="checkbox"
                                                        name="size"
                                                        value={sz.toString()}
                                                        checked={data.size.includes(sz.toString())}
                                                        onChange={getData}
                                                        style={{marginRight:6, accentColor:'#007bff', width:'18px', height:'18px'}}
                                                    />
                                                    <span style={{verticalAlign:'middle', fontWeight:700, fontSize:'1.08em', color:'#222'}}>{sz}</span>
                                                </label>
                                            ))}
                                        </div>
                                            <style>{`
                                                .premium-size-wrap { gap: 10px 12px !important; }
                                                .premium-size-label {
                                                    background: #f5f7fa !important;
                                                    border-radius: 8px !important;
                                                    padding: 6px 14px !important;
                                                    color: #1a1a1a !important;
                                                    border: 2px solid #d1d5db !important;
                                                    box-shadow: 0 2px 8px rgba(0,0,0,0.04) !important;
                                                    font-weight: 700 !important;
                                                    font-size: 1.08em !important;
                                                    transition: all 0.2s;
                                                    display: inline-flex; align-items: center;
                                                }
                                                .premium-size-label input[type='checkbox'] {
                                                    accent-color: #007bff !important;
                                                    width: 18px !important;
                                                    height: 18px !important;
                                                    margin-right: 6px !important;
                                                }
                                                .premium-size-label input[type='checkbox']:checked + span {
                                                    color: #007bff !important;
                                                    font-weight: 900 !important;
                                                }
                                            `}</style>
                                    </div>
                                </div>

                                <div className="row mb-4">
                                    <div className="col-md-6 mb-3">
                                        <label className="font-weight-bold text-secondary mb-2">Base Price</label>
                                        <input type="number" name='baseprice' placeholder='Base Price' onChange={getData} className='form-control rounded-lg p-3' required />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="font-weight-bold text-secondary mb-2">Discount (%)</label>
                                        <input type="number" name='discount' placeholder='Discount' onChange={getData} className='form-control rounded-lg p-3' required />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="font-weight-bold text-secondary mb-2">Description</label>
                                    <textarea name="description" rows="4" onChange={getData} className='form-control rounded-lg p-3' defaultValue={data.description}></textarea>
                                </div>

                                <div className="row mb-4">
                                    <div className="col-6 col-md-3 mb-3">
                                        <label className="font-weight-bold text-secondary mb-2">Pic1 (Required)</label>
                                        <input type="file" name='pic1' onChange={getFile} className='form-control rounded-lg p-2' required />
                                    </div>
                                    <div className="col-6 col-md-3 mb-3">
                                        <label className="font-weight-bold text-secondary mb-2">Pic2</label>
                                        <input type="file" name='pic2' onChange={getFile} className='form-control rounded-lg p-2' />
                                    </div>
                                    <div className="col-6 col-md-3 mb-3">
                                        <label className="font-weight-bold text-secondary mb-2">Pic3</label>
                                        <input type="file" name='pic3' onChange={getFile} className='form-control rounded-lg p-2' />
                                    </div>
                                    <div className="col-6 col-md-3 mb-3">
                                        <label className="font-weight-bold text-secondary mb-2">Pic4</label>
                                        <input type="file" name='pic4' onChange={getFile} className='form-control rounded-lg p-2' />
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    type='submit'
                                    className='btn btn-info w-100 py-3 rounded-pill font-weight-bold shadow-lg d-flex align-items-center justify-content-center'
                                >
                                    <Plus size={20} className="mr-2" /> Add Product
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}