import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from "../Store/ActionCreaters/ProductActionCreators"
import { getCart, addCart } from "../Store/ActionCreaters/CartActionCreators"
import { getWishlist, addWishlist } from "../Store/ActionCreaters/WishlistActionCreators"

export default function SingleProductPage() {
    let [p, setp] = useState({ pic1: "", pic2: "", pic3: "", pic4: "" })
    let [qty, setqty] = useState(1)
    let [mainImage, setMainImage] = useState("")

    let { id } = useParams()
    let dispatch = useDispatch()
    let navigate = useNavigate()

    let product = useSelector((state) => state.ProductStateData)
    let cart = useSelector((state) => state.CartStateData)
    let wishlist = useSelector((state) => state.WishlistStateData)

    function getAPIData() {
        dispatch(getProduct())
        dispatch(getCart())
        dispatch(getWishlist())
        // FIX: MongoDB ID is a string, removed Number()
        let data = product.find((item) => item.id === id)
        if (data) {
            setp(data)
            setMainImage(data.pic1)
        }
    }

    function addToCart() {
        let d = cart.find((item) => item.productid === id && item.userid === localStorage.getItem("userid"))
        if (d) {
            navigate("/cart")
        } else {
            let item = {
                productid: p.id,
                userid: localStorage.getItem("userid"),
                name: p.name,
                color: p.color,
                size: p.size,
                price: Number(p.finalprice),
                qty: Number(qty),
                total: Number(p.finalprice) * Number(qty),
                pic: p.pic1,
            }
            dispatch(addCart(item))
            navigate("/cart")
        }
    }

    useEffect(() => {
        getAPIData()
    }, [product.length, id])

    return (
        <div className="container my-5 py-5">
            <div className="row">
                {/* Left Side: Image Gallery */}
                <div className="col-lg-6">
                    <div className="main-img-container shadow-sm border rounded mb-3">
                        <img src={mainImage || p.pic1} className="img-fluid w-100" style={{ height: "500px", objectFit: "contain" }} alt={p.name} />
                    </div>
                    <div className="row">
                        {[p.pic1, p.pic2, p.pic3, p.pic4].map((img, index) => (
                            img ? (
                                <div key={index} className="col-3">
                                    <img 
                                        src={img} 
                                        onClick={() => setMainImage(img)} 
                                        className={`img-thumbnail cursor-pointer ${mainImage === img ? 'border-info' : ''}`} 
                                        style={{ height: "80px", width: "100%", objectFit: "cover", cursor: "pointer" }} 
                                    />
                                </div>
                            ) : null
                        ))}
                    </div>
                </div>

                {/* Right Side: Product Details */}
                <div className="col-lg-6 pl-lg-5">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb bg-transparent p-0">
                            <li className="breadcrumb-item"><a href="/">Home</a></li>
                            <li className="breadcrumb-item active">{p.maincategory}</li>
                        </ol>
                    </nav>
                    <h1 className="display-5 font-weight-bold text-dark text-capitalize">{p.name}</h1>
                    <div className="d-flex align-items-center mb-3">
                        <span className="badge badge-success px-3 py-2 mr-2">{p.discount}% OFF</span>
                        <span className="text-muted">Brand: <strong>{p.brand}</strong></span>
                    </div>
                    
                    <h2 className="text-info mb-4">
                        ₹{p.finalprice} <del className="text-muted h4 ml-2">₹{p.baseprice}</del>
                    </h2>

                    <div className="mb-4">
                        <p className="text-secondary">{p.description}</p>
                    </div>

                    <div className="row mb-4">
                        <div className="col-md-6">
                            <strong>Color:</strong> <span className="ml-2">{p.color}</span>
                        </div>
                        <div className="col-md-6">
                            <strong>Size:</strong> <span className="ml-2">{p.size}</span>
                        </div>
                    </div>

                    <div className="d-flex align-items-center mb-4">
                        <div className="input-group" style={{ width: "140px" }}>
                            <div className="input-group-prepend">
                                <button className="btn btn-outline-secondary" onClick={() => qty > 1 && setqty(qty - 1)}>-</button>
                            </div>
                            <input type="text" className="form-control text-center bg-white" value={qty} readOnly />
                            <div className="input-group-append">
                                <button className="btn btn-outline-secondary" onClick={() => setqty(qty + 1)}>+</button>
                            </div>
                        </div>
                        <span className="ml-3 text-muted">{p.stock}</span>
                    </div>

                    <div className="row">
                        <div className="col-sm-6">
                            <button onClick={addToCart} className="btn btn-info btn-lg btn-block mb-2">
                                <i className="icon-shopping_cart mr-2"></i> ADD TO CART
                            </button>
                        </div>
                        <div className="col-sm-6">
                            <button onClick={() => navigate("/profile")} className="btn btn-outline-danger btn-lg btn-block mb-2">
                                <i className="icon-heart mr-2"></i> WISHLIST
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}