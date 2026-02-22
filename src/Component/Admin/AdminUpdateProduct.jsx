import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getProduct, updateProduct } from '../../Store/ActionCreaters/ProductActionCreators'
import LefNav from './LefNav'

export default function AdminUpdateProduct() {
    let [data, setdata] = useState({})
    const { id } = useParams()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const product = useSelector((state) => state.ProductStateData)

    useEffect(() => {
        dispatch(getProduct())
        // FIX: Remove Number() for Atlas
        const item = product.find((x) => (x.id || x._id) === id)
        if (item) setdata(item)
    }, [product.length, id])

    function postData(e) {
        e.preventDefault()
        // Simple Update (Without adding new images logic here to keep it easy)
        dispatch(updateProduct({ ...data, id: id }))
        alert("Product Updated!")
        navigate("/admin-product")
    }

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-3"><LefNav /></div>
                <div className="col-lg-6">
                    <div className="bg-white p-5 shadow rounded-3xl">
                        <h4 className="mb-4">Edit: {data.name}</h4>
                        <form onSubmit={postData}>
                            <input className="form-control mb-3" value={data.name || ''} onChange={(e) => setdata({ ...data, name: e.target.value })} required />
                            <input type="number" className="form-control mb-3" value={data.finalprice || ''} onChange={(e) => setdata({ ...data, finalprice: e.target.value })} required />
                            <button className="btn btn-dark w-100 rounded-pill py-2">SAVE PRODUCT</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}