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
import { Save, ArrowLeft, Image as ImageIcon, Ruler, Palette, BadgePercent, LayoutList } from 'lucide-react'
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
        <div style={{ backgroundColor: "#fcfcfc", minHeight: "100vh" }} className="py-5">
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid">
                    <div className="w-100">
                        <motion.div initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} className="bg-white p-4 p-lg-5 shadow-2xl rounded-3xl">
                            <div className="d-flex align-items-center mb-4 mb-lg-5 pb-3 border-bottom">
                                 <Link to="/admin-product" className="btn btn-light rounded-circle p-2 mr-3 shadow-sm hover-shadow d-flex transition">
                                    <ArrowLeft size={18} />
                                 </Link>
                                 <h4 className="font-weight-bold mb-0 text-dark">Overhaul Boutique Listing</h4>
                            </div>

                            <form onSubmit={postData}>
                                {/* Product Header (Large Field) */}
                                <div className="mb-4 mb-lg-5">
                                    <label className="text-muted small font-weight-bold ls-1 uppercase">Full Product Nomenclature</label>
                                    <div className="input-group luxury-input-wrap border shadow-sm rounded-xl">
                                        <div className="p-3 text-info border-right"><LayoutList size={22} /></div>
                                        <input type="text" name="name" value={data.name} className="form-control border-0 font-weight-bold py-3 py-lg-4 h-100 shadow-none" placeholder="Designer Article Name" onChange={getData} required />
                                    </div>
                                </div>

                                {/* Dropdown Matrix */}
                                <div className="row mb-4 mb-lg-3 g-2 g-md-3">
                                    {[
                                        { label: "Department", name: "maincategory", options: maincat, val: data.maincategory },
                                        { label: "Seasonality", name: "subcategory", options: subcat, val: data.subcategory },
                                        { label: "Craft Label", name: "brand", options: brand, val: data.brand },
                                        { label: "Status", name: "stock", options: [
                                            { id: 'in', name: 'Active: In Stock', value: 'In Stock' },
                                            { id: 'out', name: 'On Request: Sold Out', value: 'Out of Stock' }
                                        ], val: data.stock, isStatus: true }
                                    ].map((field, idx) => (
                                        <div key={idx} className="col-12 col-md-3 mb-3 d-flex flex-column" style={{minWidth:'200px',flex:'1 1 240px',overflow:'visible',whiteSpace:'normal'}}>
                                            <label className="text-muted small font-weight-bold uppercase mb-2 d-block">{field.label}</label>
                                            {field.isStatus ? (
                                                <select name="stock" value={data.stock} className="form-control rounded-xl p-2 p-lg-3 border-light shadow-sm admin-big-select" style={{width:'100%',whiteSpace:'normal',overflow:'visible',textOverflow:'unset',fontSize:'1.15rem',lineHeight:'1.5',minWidth:'180px',maxWidth:'100%'}} onChange={getData}>
                                                    {field.options.map(opt => <option key={opt.id} value={opt.value}>{opt.name}</option>)}
                                                </select>
                                            ) : (
                                                <select name={field.name} value={field.val} className="form-control rounded-xl p-2 p-lg-3 border-light shadow-sm admin-big-select" style={{width:'100%',whiteSpace:'normal',overflow:'visible',textOverflow:'unset',fontSize:'1.15rem',lineHeight:'1.5',minWidth:'180px',maxWidth:'100%'}} onChange={getData}>
                                                    {field.options.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
                                                </select>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Color, Price, Discount in one row */}
                                <div className="row mb-4 mb-lg-3 g-2 g-md-3">
                                    <div className="col-12 col-md-4 mb-3">
                                        <div className="spec-item">
                                            <Palette size={16} className="text-info"/>
                                            <input name="color" value={data.color} placeholder="Visual Tint" onChange={getData} className="form-control"/>
                                        </div>
                                    </div>
                                    <div className="col-6 col-md-4 mb-3">
                                        <div className="spec-item">
                                            <label>₹</label>
                                            <input type="number" name="baseprice" value={data.baseprice} onChange={getData} className="form-control font-weight-bold text-dark"/>
                                        </div>
                                    </div>
                                    <div className="col-6 col-md-4 mb-3">
                                        <div className="spec-item">
                                            <BadgePercent size={18} className="text-danger"/>
                                            <input type="number" name="discount" value={data.discount} onChange={getData} className="form-control text-danger"/>
                                        </div>
                                    </div>
                                </div>

                                {/* Size section below all */}
                                <div className="row mb-4 mb-lg-5 g-2 g-md-3">
                                    <div className="col-12">
                                        <div className="spec-item size-spec-item" style={{flexDirection:'column', alignItems:'flex-start', background:'transparent', border:'none', boxShadow:'none', padding:0}}>
                                            <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:8}}>
                                                <Ruler size={16} className="text-info"/>
                                                <span style={{fontWeight:600,fontSize:'13px'}}>Size</span>
                                            </div>
                                            <div className="size-grid-responsive">
                                                <div className="size-row">
                                                    {['XS','S','M','L','XL','XXL',26,28,30,32,34,36,38,40,'5-6','6-7','7-8','8-9','9-10','10-11','11-12','12-13','13-14','14-15','15-16'].map((sz) => (
                                                        <label key={sz} className="size-checkbox-label size-center">
                                                            <input
                                                                type="checkbox"
                                                                name="size"
                                                                value={sz.toString()}
                                                                checked={Array.isArray(data.size) ? data.size.includes(sz.toString()) : false}
                                                                onChange={getData}
                                                            />
                                                            <span>{sz}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <style>{`
                                        .size-grid-responsive {
                                            width: 100%;
                                            max-width: 100%;
                                            margin-bottom: 2px;
                                            display: flex;
                                            flex-direction: column;
                                            gap: 8px;
                                            overflow-x: auto;
                                        }
                                        .size-row {
                                            display: flex;
                                            gap: 10px;
                                            flex-wrap: wrap;
                                            justify-content: flex-start;
                                        }
                                        .size-checkbox-label {
                                            background: #f5f7fa;
                                            border-radius: 10px;
                                            padding: 10px 0;
                                            color: #1a1a1a;
                                            border: 2px solid #d1d5db;
                                            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                                            font-weight: 700;
                                            font-size: 1.08em;
                                            transition: all 0.2s;
                                            display: flex;
                                            flex-direction: column;
                                            align-items: center;
                                            justify-content: center;
                                            cursor: pointer;
                                            min-width: 60px;
                                            max-width: 80px;
                                            width: 100%;
                                            box-sizing: border-box;
                                            text-align: center;
                                            gap: 2px;
                                        }
                                        .size-checkbox-label input[type='checkbox'] {
                                            accent-color: #007bff;
                                            width: 22px;
                                            height: 22px;
                                            margin: 0 0 2px 0;
                                            display: block;
                                        }
                                        .size-checkbox-label input[type='checkbox']:checked + span {
                                            color: #007bff;
                                            font-weight: 900;
                                        }
                                        @media (max-width: 991px) {
                                            .size-row {
                                                gap: 8px;
                                            }
                                            .size-checkbox-label {
                                                padding: 8px 0;
                                                font-size: 1em;
                                            }
                                        }
                                        @media (max-width: 767px) {
                                            .size-row {
                                                gap: 7px;
                                            }
                                            .size-checkbox-label {
                                                padding: 7px 0;
                                                font-size: 0.97em;
                                            }
                                        }
                                        @media (max-width: 600px) {
                                            .size-grid-responsive {
                                                gap: 7px;
                                            }
                                            .size-row {
                                                flex-direction: row;
                                                flex-wrap: wrap;
                                                gap: 7px;
                                                justify-content: flex-start;
                                            }
                                            .size-checkbox-label {
                                                width: 100%;
                                                padding: 12px 0;
                                                font-size: 1.08em;
                                                border-radius: 14px;
                                            }
                                            .size-spec-item {
                                                margin-top: 12px;
                                            }
                                        }
                                        @media (max-width: 480px) {
                                            .size-row {
                                                gap: 6px;
                                            }
                                            .size-checkbox-label {
                                                padding: 8px 0;
                                                font-size: 0.97em;
                                            }
                                        }
                                            `}</style>
                                        </div>
                                    </div>
                                </div>

                                {/* Description Editor */}
                                <div className="mb-4 mb-lg-5">
                                    <label className="text-muted small font-weight-bold uppercase mb-2 d-block">EDITORIAL DESCRIPTION</label>
                                    <textarea name="description" value={data.description} rows="4" className="form-control border shadow-sm p-3 p-lg-4 rounded-2xl" style={{backgroundColor:"#fbfbfb"}} onChange={getData}></textarea>
                                </div>

                                {/* Digital Asset Management */}
                                <div className="row mb-4 mb-lg-5">
                                    {["pic1", "pic2", "pic3", "pic4"].map((pic, i) => (
                                        <div key={i} className="col-6 col-md-3 mb-3 text-center">
                                            <div className="asset-box bg-light rounded-2xl p-3 p-lg-4 border shadow-inner">
                                                <ImageIcon size={24} className="text-muted opacity-50 mb-2"/>
                                                <p className="xx-small text-muted font-weight-bold uppercase mb-2">Perspective {i+1}</p>
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
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .admin-big-select, .admin-big-select option {
                    font-size: 1.15rem !important;
                    line-height: 1.5 !important;
                    white-space: normal !important;
                    overflow: visible !important;
                    text-overflow: unset !important;
                    min-width: 180px !important;
                    max-width: 100% !important;
                }
                .shadow-2xl { box-shadow: 0 40px 100px -10px rgba(0,0,0,0.12) !important; }
                .rounded-2xl { border-radius: 20px !important; } .rounded-3xl { border-radius: 42px !important; }
                .spec-item { display: flex; align-items: center; gap: 10px; background: #f8f9fa; padding: 5px 15px; border-radius: 50px; border: 1.5px solid #eee; }
                .spec-item input { border: none !important; background: transparent; height: 45px; width: 100%; outline: none !important; font-size: 13px; font-weight: 700; }
                .ls-2 { letter-spacing: 2px; } .ls-1 { letter-spacing: 1px; }
                .small-file-btn { font-size: 9px; cursor: pointer; color: #17a2b8; font-weight: bold; }
                .row.g-2>[class*='col-'] { margin-bottom: 12px; }
                .row.g-2>[class*='col-'] > * { min-width: 160px; }
                @media (max-width: 991px) {
                    .row.g-2>[class*='col-'] { min-width: 100%; }
                }
                @media (max-width: 767px) {
                    .spec-item { padding: 5px 10px; }
                    .spec-item input { height: 38px; font-size: 12px; }
                    .row.g-2>[class*='col-'] { margin-bottom: 10px; min-width: 100%; }
                }
            `}} />
        </div>
    )
}