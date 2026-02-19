import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from "../Store/ActionCreaters/ProductActionCreators"
import { addCart } from "../Store/ActionCreaters/CartActionCreators"

export default function SingleProductPage() {
    var [p, setp] = useState({})
    var { id } = useParams()
    var product = useSelector((state) => state.ProductStateData)
    var dispatch = useDispatch()
    var navigate = useNavigate()

    useEffect(() => {
        dispatch(getProduct())
        let data = product.find((item) => item.id === id) // Removed Number() for MongoDB
        if (data) setp(data)
    }, [product.length, id])

    const addToCart = () => {
        const item = { ...p, productid: p.id, userid: localStorage.getItem("userid"), qty: 1 }
        dispatch(addCart(item))
        navigate("/cart")
    }

    return (
        <div className="container my-5">
            <div className="row">
                <div className="col-md-6">
                    <img src={p.pic1} className="img-fluid" alt="" />
                    <div className="row mt-2">
                        {p.pic2 && <div className="col-4"><img src={p.pic2} className="img-fluid" /></div>}
                        {p.pic3 && <div className="col-4"><img src={p.pic3} className="img-fluid" /></div>}
                        {p.pic4 && <div className="col-4"><img src={p.pic4} className="img-fluid" /></div>}
                    </div>
                </div>
                <div className="col-md-6 text-center">
                    <h2>{p.name}</h2>
                    <p className="price">Price: ₹{p.finalprice}</p>
                    <button onClick={addToCart} className="btn btn-primary">Add to Cart</button>
                </div>
            </div>
        </div>
    )
}