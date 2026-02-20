import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
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
    let location = useLocation() // Current URL track karne ke liye (Update)

    let product = useSelector((state) => state.ProductStateData)
    let cart = useSelector((state) => state.CartStateData)
    let wishlist = useSelector((state) => state.WishlistStateData)

    function getAPIData() {
        dispatch(getProduct())
        dispatch(getCart())
        dispatch(getWishlist())
        let data = product.find((item) => item.id === id)
        if (data) {
            setp(data)
            setMainImage(data.pic1)
        }
    }

    function addToCart() {
        // Check if user is logged in
        if (!localStorage.getItem("login")) {
            // Login ke baad wapas isi page par aane ke liye state pass ki hai
            navigate("/login", { state: { from: location.pathname } })
        } else {
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
                    price: Number(p.finalprice), // Ensure Number to avoid NaN
                    qty: Number(qty),
                    total: Number(p.finalprice) * Number(qty),
                    pic: p.pic1,
                }
                dispatch(addCart(item))
                navigate("/cart")
            }
        }
    }

    function addToWishlist() {
        if (!localStorage.getItem("login")) {
            navigate("/login", { state: { from: location.pathname } })
        } else {
            let d = wishlist.find((item) => item.productid === id && item.userid === localStorage.getItem("userid"))
            if (d) {
                navigate("/wishlist")
            } else {
                let item = {
                    productid: p.id,
                    userid: localStorage.getItem("userid"),
                    name: p.name,
                    color: p.color,
                    size: p.size,
                    price: Number(p.finalprice),
                    pic: p.pic1,
                }
                dispatch(addWishlist(item))
                navigate("/wishlist")
            }
        }
    }

    useEffect(() => {
        getAPIData()
    }, [product.length, id])

    return (
        <div className="container my-5 py-5">
            <div className="row">
                {/* Left Side: Images Section */}
                <div className="col-lg-6">
                    <div className="main-img-container shadow-sm border rounded mb-3 bg-white">
                        <img 
                            src={mainImage || p.pic1} 
                            className="img-fluid w-100" 
                            style={{ height: "500px", objectFit: "contain" }} 
                            alt={p.name} 
                        />
                    </div>
                    <div className="row">
                        {[p.pic1, p.pic2, p.pic3, p.pic4].map((img, index) => (
                            img ? (
                                <div key={index} className="col-3">
                                    <img 
                                        src={img} 
                                        onClick={() => setMainImage(img)} 
                                        className={`img-thumbnail ${mainImage === img ? 'border-info border-2' : ''}`} 
                                        style={{ height: "80px", width: "100%", objectFit: "cover", cursor: "pointer" }} 
                                        alt="thumbnail"
                                    />
                                </div>
                            ) : null
                        ))}
                    </div>
                </div>

                {/* Right Side: Product Details Section */}
                <div className="col-lg-6 pl-lg-5">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb bg-transparent p-0">
                            <li className="breadcrumb-item"><a href="/" className="text-decoration-none">Home</a></li>
                            <li className="breadcrumb-item active text-capitalize">{p.maincategory}</li>
                        </ol>
                    </nav>
                    
                    <h1 className="display-5 font-weight-bold text-dark text-capitalize">{p.name}</h1>
                    
                    <div className="d-flex align-items-center mb-3">
                        <span className="badge badge-success px-3 py-2 mr-3">{p.discount}% OFF</span>
                        <span className="text-muted">Brand: <strong className="text-dark">{p.brand}</strong></span>
                    </div>
                    
                    <h2 className="text-info mb-4">
                        ₹{p.finalprice} 
                        {p.baseprice > p.finalprice && <del className="text-muted h4 ml-3">₹{p.baseprice}</del>}
                    </h2>

                    <div className="mb-4">
                        <h6 className="font-weight-bold">Description:</h6>
                        <p className="text-secondary">{p.description}</p>
                    </div>

                    <div className="row mb-4">
                        <div className="col-md-6"><strong>Color:</strong> <span className="ml-2 text-capitalize">{p.color}</span></div>
                        <div className="col-md-6"><strong>Size:</strong> <span className="ml-2">{p.size}</span></div>
                    </div>

                    <div className="d-flex align-items-center mb-4">
                        <div className="input-group shadow-sm" style={{ width: "140px" }}>
                            <div className="input-group-prepend">
                                <button className="btn btn-outline-secondary border-right-0" onClick={() => qty > 1 && setqty(qty - 1)}>-</button>
                            </div>
                            <input type="text" className="form-control text-center bg-white border-left-0 border-right-0" value={qty} readOnly />
                            <div className="input-group-append">
                                <button className="btn btn-outline-secondary border-left-0" onClick={() => setqty(qty + 1)}>+</button>
                            </div>
                        </div>
                        <span className="ml-3 text-muted small">Availability: <span className={p.stock === "In Stock" ? "text-success" : "text-danger"}>{p.stock}</span></span>
                    </div>

                    <div className="row">
                        <div className="col-sm-6">
                            <button onClick={addToCart} className="btn btn-info btn-lg btn-block mb-2 shadow-sm">
                                <i className="fa fa-shopping-cart mr-2"></i> ADD TO CART
                            </button>
                        </div>
                        <div className="col-sm-6">
                            <button onClick={addToWishlist} className="btn btn-outline-danger btn-lg btn-block mb-2 shadow-sm">
                                <i className="fa fa-heart mr-2"></i> WISHLIST
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}