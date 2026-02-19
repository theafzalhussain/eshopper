import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { addProduct } from '../../Store/ActionCreaters/ProductActionCreators'
import { getMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators'
import { getSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators'
import { getBrand } from '../../Store/ActionCreaters/BrandActionCreators'

export default function AdminAddProduct() {
    var [data, setdata] = useState({
        name: "",
        maincategory: "",
        subcategory: "",
        brand: "",
        color: "",
        size: "",
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
        var { name, value } = e.target
        setdata((old) => {
            return {
                ...old,
                [name]: value
            }
        })
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
        formData.append("size", data.size)
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
        navigate("/admin-product")
    }

    useEffect(() => {
        dispatch(getMaincategory())
        dispatch(getSubcategory())
        dispatch(getBrand())
    }, [dispatch])

    return (
        <>
            <div className="container-fluid my-5">
                <div className="row">
                    <div className="col-lg-2 col-12" >
                        <LefNav />
                    </div>
                    <div className="col-lg-10 col-12 mt-2">
                        <h5 className='bg-info text-center text-light p-2'>Add Product <Link to="/admin-product" className='float-right'><span className="material-symbols-outlined text-light">list</span></Link></h5>
                        <form className='p-3' onSubmit={postData}>
                            <div className="mb-3">
                                <label>Name</label>
                                <input type="text" name="name" placeholder='Product Name' className='form-control' onChange={getData} required />
                            </div>
                            
                            <div className="row mb-3">
                                <div className="col-md-3">
                                    <label>Maincategory</label>
                                    <select name="maincategory" onChange={getData} className="form-control">
                                        {maincategory?.map((item, index) => <option key={index} value={item.name}>{item.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label>Subcategory</label>
                                    <select name="subcategory" onChange={getData} className="form-control">
                                        {subcategory?.map((item, index) => <option key={index} value={item.name}>{item.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label>Brand</label>
                                    <select name="brand" onChange={getData} className="form-control">
                                        {brand?.map((item, index) => <option key={index} value={item.name}>{item.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label>Stock</label>
                                    <select name="stock" onChange={getData} className="form-control">
                                        <option value="In Stock">In Stock</option>
                                        <option value="Out of Stock">Out of Stock</option>
                                    </select>
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label>Color</label>
                                    <input type="text" name='color' placeholder='Color' onChange={getData} className='form-control' required />
                                </div>
                                <div className="col-md-6">
                                    <label>Size</label>
                                    <input type="text" name='size' placeholder='Size' onChange={getData} className='form-control' required />
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label>Base Price</label>
                                    <input type="number" name='baseprice' placeholder='Base Price' onChange={getData} className='form-control' required />
                                </div>
                                <div className="col-md-6">
                                    <label>Discount (%)</label>
                                    <input type="number" name='discount' placeholder='Discount' onChange={getData} className='form-control' required />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label>Description</label>
                                <textarea name="description" rows="4" onChange={getData} className='form-control' defaultValue={data.description}></textarea>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-3"><label>Pic1</label><input type="file" name='pic1' onChange={getFile} className='form-control' required /></div>
                                <div className="col-md-3"><label>Pic2</label><input type="file" name='pic2' onChange={getFile} className='form-control' /></div>
                                <div className="col-md-3"><label>Pic3</label><input type="file" name='pic3' onChange={getFile} className='form-control' /></div>
                                <div className="col-md-3"><label>Pic4</label><input type="file" name='pic4' onChange={getFile} className='form-control' /></div>
                            </div>

                            <button type='submit' className='btn btn-info w-100'>Add Product</button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}