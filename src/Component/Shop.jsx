import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';

export default function Shop() {
    var { maincat } = useParams()
    var [shopproduct, setshopproduct] = useState([])
    var product = useSelector((state) => state.ProductStateData)
    var dispatch = useDispatch()

    useEffect(() => {
        dispatch(getProduct())
    }, [dispatch])

    useEffect(() => {
        if (maincat === "All") setshopproduct(product)
        else setshopproduct(product.filter((item) => item.maincategory === maincat))
    }, [product, maincat])

    return (
        <section className="ftco-section">
            <div className="container">
                <div className="row">
                    {shopproduct.map((item, index) => (
                        <div key={index} className="col-md-4">
                            <div className="product">
                                {/* FIX: Direct Cloudinary URL */}
                                <Link to={`/single-product/${item.id}`} className="img-prod">
                                    <img className="img-fluid" src={item.pic1} style={{ height: "300px", width: "100%", objectFit: "cover" }} alt="" />
                                </Link>
                                <div className="text p-3 text-center">
                                    <h3>{item.name}</h3>
                                    <p className="price"><span>₹{item.finalprice}</span></p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}