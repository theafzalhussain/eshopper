import React, { useState, useEffect } from 'react'
import { useToast } from '../ToastNotification'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { getProduct, updateProduct } from '../../Store/ActionCreaters/ProductActionCreators'
import { getMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators'
import { getSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators'
import { getBrand } from '../../Store/ActionCreaters/BrandActionCreators'
import { motion } from 'framer-motion'
import { Save, ArrowLeft, Image as ImageIcon, Ruler, Palette, BadgePercent, LayoutList, Package, PackagePlus, IndianRupee, Tag, Layers, AlignLeft } from 'lucide-react'
import './SystemControlCenter.css'

export default function AdminUpdateProduct() {
    const toast = useToast();
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
        color: "", size: [], baseprice: 0, discount: 0, finalprice: 0,
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
        let { name, value, type, checked } = e.target;
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
        let { name, files } = e.target
        setdata((old) => ({ ...old, [name]: files[0] }))
    }

function postData(e) {
    e.preventDefault();

    let bp = Number(data.baseprice);
    let d = Number(data.discount);
    let fp = Math.round(bp - (bp * d) / 100);

    let formData = new FormData();
    formData.append("id", id); // 🔥 Ye sabse zaroori line hai (ID backend ko jaayegi)
    formData.append("name", data.name);
    formData.append("maincategory", data.maincategory);
    formData.append("subcategory", data.subcategory);
    formData.append("brand", data.brand);
    formData.append("baseprice", bp);
    formData.append("discount", d);
    formData.append("finalprice", fp);
    formData.append("color", data.color);
    // Send all sizes as array
    if (Array.isArray(data.size)) {
        data.size.forEach((sz) => formData.append("size", sz));
    } else if (data.size) {
        formData.append("size", data.size);
    }
    formData.append("stock", data.stock);
    formData.append("description", data.description);

    // Agar image ki field mein File object hai tabhi use add karein
    if (data.pic1 && typeof data.pic1 === 'object') formData.append("pic1", data.pic1);
    if (data.pic2 && typeof data.pic2 === 'object') formData.append("pic2", data.pic2);
    if (data.pic3 && typeof data.pic3 === 'object') formData.append("pic3", data.pic3);
    if (data.pic4 && typeof data.pic4 === 'object') formData.append("pic4", data.pic4);

    dispatch(updateProduct(formData));
    toast.success("Product updated successfully!", 3500);
    navigate("/admin-product");
}
    return (
        <div className="lux-admin-page" style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid px-lg-4 py-4">
                    
                    {/* Luxury Header Banner */}
                    <motion.div 
                        className="lux-banner mb-4"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="lux-banner-content">
                            <div>
                                <div className="lux-eyebrow"><Package size={14} className="mr-1"/> Inventory</div>
                                <h1 className="lux-banner-title">Update <span>Product</span></h1>
                                <p className="lux-banner-sub">Modify details, pricing and stock for {data.name || 'this item'}.</p>
                            </div>
                            <div className="lux-banner-actions">
                                <Link to="/admin-product" className="lux-btn-ghost">
                                    <ArrowLeft size={16} className="mr-2"/> Back to Catalog
                                </Link>
                            </div>
                        </div>
                    </motion.div>

                    <div className="w-100">
                        <motion.div 
                            initial={{opacity:0, y:20}} 
                            animate={{opacity:1, y:0}} 
                            transition={{ delay: 0.2 }}
                            className="lux-card p-4 p-md-5"
                        >
                            <form onSubmit={postData}>
                                {/* Section: Basic Details */}
                                <div className="mb-4">
                                    <label className="lux-label"><AlignLeft size={14} className="mr-1"/> Product Name</label>
                                    <input type="text" name="name" value={data.name} placeholder='e.g. Premium Silk Evening Dress' className='lux-input' onChange={getData} required />
                                </div>

                                {/* Section: Categorization */}
                                <div className="row mb-4 g-3">
                                    <div className="col-sm-6 col-lg-3 mb-3 mb-lg-0">
                                        <label className="lux-label"><Layers size={14} className="mr-1"/> Main Category</label>
                                        <div className="lux-select-wrap">
                                            <select name="maincategory" value={data.maincategory} onChange={getData} className="lux-select">
                                                {maincat?.map((item, index) => <option key={index} value={item.name}>{item.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-sm-6 col-lg-3 mb-3 mb-lg-0">
                                        <label className="lux-label"><Layers size={14} className="mr-1"/> Sub Category</label>
                                        <div className="lux-select-wrap">
                                            <select name="subcategory" value={data.subcategory} onChange={getData} className="lux-select">
                                                {subcat?.map((item, index) => <option key={index} value={item.name}>{item.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-sm-6 col-lg-3 mb-3 mb-sm-0">
                                        <label className="lux-label"><Tag size={14} className="mr-1"/> Brand</label>
                                        <div className="lux-select-wrap">
                                            <select name="brand" value={data.brand} onChange={getData} className="lux-select">
                                                {brand?.map((item, index) => <option key={index} value={item.name}>{item.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-sm-6 col-lg-3">
                                        <label className="lux-label"><Package size={14} className="mr-1"/> Stock Status</label>
                                        <div className="lux-select-wrap">
                                            <select name="stock" value={data.stock} onChange={getData} className="lux-select">
                                                <option value="In Stock">In Stock</option>
                                                <option value="Out of Stock">Out of Stock</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Pricing & Attributes */}
                                <div className="row mb-4 g-3">
                                    <div className="col-md-4 mb-3 mb-md-0">
                                        <label className="lux-label"><Palette size={14} className="mr-1"/> Color Variant</label>
                                        <input type="text" name='color' value={data.color} placeholder='e.g. Midnight Blue' onChange={getData} className='lux-input' required />
                                    </div>
                                    <div className="col-sm-6 col-md-4 mb-3 mb-sm-0">
                                        <label className="lux-label"><IndianRupee size={14} className="mr-1"/> Base Price (₹)</label>
                                        <input type="number" name='baseprice' value={data.baseprice} placeholder='0.00' onChange={getData} className='lux-input' required min="0" />
                                    </div>
                                    <div className="col-sm-6 col-md-4">
                                        <label className="lux-label"><BadgePercent size={14} className="mr-1"/> Discount (%)</label>
                                        <input type="number" name='discount' value={data.discount} placeholder='0' onChange={getData} className='lux-input lux-input-highlight' required min="0" max="100" />
                                    </div>
                                </div>

                                {/* Section: Sizes */}
                                <div className="mb-4">
                                    <label className="lux-label">Available Sizes</label>
                                    <div className="lux-size-wrap">
                                        {['XS','S','M','L','XL','XXL','26','28','30','32','34','36','38','40','5-6','6-7','7-8','8-9','9-10','10-11','11-12','12-13','13-14','14-15','15-16'].map((sz) => (
                                            <label key={sz} className="lux-size-label">
                                                <input
                                                    type="checkbox"
                                                    name="size"
                                                    value={sz.toString()}
                                                    checked={Array.isArray(data.size) ? data.size.includes(sz.toString()) : false}
                                                    onChange={getData}
                                                />
                                                <span className="lux-size-pill">{sz}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Section: Description */}
                                <div className="mb-4">
                                    <label className="lux-label"><AlignLeft size={14} className="mr-1"/> Editorial Description</label>
                                    <textarea name="description" rows="4" value={data.description} onChange={getData} className='lux-textarea' placeholder="Detailed product description..."></textarea>
                                </div>

                                {/* Section: Images */}
                                <div className="mb-5">
                                    <label className="lux-label mb-3"><ImageIcon size={14} className="mr-1"/> Product Images</label>
                                    <div className="row g-3">
                                        {['pic1', 'pic2', 'pic3', 'pic4'].map((picName, index) => (
                                            <div className="col-6 col-md-3 mb-3 mb-md-0" key={picName}>
                                                <div className="lux-file-box">
                                                    <input type="file" name={picName} onChange={getFile} className="lux-file-input" accept="image/*" />
                                                    <div className="lux-file-content">
                                                        {data[picName] && typeof data[picName] === 'string' ? (
                                                            <img src={data[picName]} alt="Current" style={{height: '40px', objectFit: 'contain', marginBottom: '8px', borderRadius: '4px'}} />
                                                        ) : (
                                                            <ImageIcon size={24} className="mb-2 opacity-50" />
                                                        )}
                                                        <span>{index === 0 ? 'Main Image' : `Angle ${index + 1}`}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    type='submit'
                                    className='lux-btn-submit'
                                >
                                    <Save size={18} /> SYNC REVISIONS
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
            
            {/* Luxury Styles Embedded */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@400;500;600;700&display=swap');

                .lux-admin-page { font-family: 'Jost', sans-serif; }

                /* Banner */
                .lux-banner {
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    border-radius: 24px; padding: 32px 40px; color: white;
                    box-shadow: 0 20px 40px rgba(15,23,42,0.12);
                    border: 1px solid rgba(212,175,55,0.2);
                }
                .lux-banner-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
                .lux-eyebrow { display: inline-flex; align-items: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #D4AF37; font-weight: 600; margin-bottom: 8px; }
                .lux-banner-title { font-family: 'Playfair Display', serif; font-size: clamp(24px, 3vw, 36px); font-weight: 800; color: #ffffff; margin: 0 0 4px; }
                .lux-banner-title span { color: #D4AF37; }
                .lux-banner-sub { color: #94a3b8; margin: 0; font-size: 14px; }
                .lux-btn-ghost { display: inline-flex; align-items: center; padding: 10px 20px; border-radius: 999px; background: rgba(255,255,255,0.1); color: #fff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; text-decoration: none; transition: all 0.3s; border: 1px solid rgba(255,255,255,0.2); }
                .lux-btn-ghost:hover { background: rgba(255,255,255,0.2); color: #D4AF37; border-color: rgba(212,175,55,0.5); }

                /* Card & Forms */
                .lux-card { background: #fff; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.04); border: 1px solid rgba(212,175,55,0.1); }
                .lux-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; }
                .lux-input, .lux-select, .lux-textarea { width: 100%; padding: 14px 18px; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 14px; font-weight: 500; transition: all 0.2s; outline: none; color: #0f172a; font-family: inherit; }
                .lux-input:focus, .lux-select:focus, .lux-textarea:focus { border-color: #D4AF37; background: #fff; box-shadow: 0 0 0 4px rgba(212,175,55,0.1); }
                .lux-input-highlight { color: #ef4444 !important; font-weight: 700 !important; }
                .lux-select-wrap { position: relative; }
                .lux-select { appearance: none; -webkit-appearance: none; padding-right: 40px; cursor: pointer; }
                .lux-select-wrap::after { content: ''; position: absolute; right: 16px; top: 50%; transform: translateY(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #64748b; pointer-events: none; }

                /* Size Pills */
                .lux-size-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
                .lux-size-label { cursor: pointer; position: relative; margin: 0; }
                .lux-size-label input { position: absolute; opacity: 0; cursor: pointer; }
                .lux-size-pill { padding: 8px 16px; border-radius: 8px; background: #f1f5f9; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #64748b; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; min-width: 50px; }
                .lux-size-label:hover .lux-size-pill { border-color: #cbd5e1; background: #e2e8f0; }
                .lux-size-label input:checked ~ .lux-size-pill { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #D4AF37; border-color: #0f172a; box-shadow: 0 4px 10px rgba(15,23,42,0.2); }

                /* File Upload */
                .lux-file-box { border: 2px dashed #cbd5e1; border-radius: 16px; padding: 24px 12px; text-align: center; background: #f8fafc; transition: all 0.2s; cursor: pointer; position: relative; overflow: hidden; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .lux-file-box:hover { border-color: #D4AF37; background: #fffdf5; }
                .lux-file-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 2; }
                .lux-file-content { display: flex; flex-direction: column; align-items: center; color: #64748b; font-size: 12px; font-weight: 600; }
                
                /* Submit Button */
                .lux-btn-submit { width: 100%; padding: 18px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #D4AF37; border: none; border-radius: 14px; font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.3s; box-shadow: 0 10px 20px rgba(15,23,42,0.15); display: flex; justify-content: center; align-items: center; gap: 8px; }
                .lux-btn-submit:hover { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(15,23,42,0.25); background: #0f172a; }

                @media (max-width: 768px) {
                    .lux-banner { padding: 24px; }
                    .lux-banner-actions { margin-top: 16px; width: 100%; }
                    .lux-btn-ghost { width: 100%; justify-content: center; }
                }
            `}} />
        </div>
    )
}