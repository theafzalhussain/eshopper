import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import { getMaincategory } from '../Store/ActionCreaters/MaincategoryActionCreators';
import { getSubcategory } from '../Store/ActionCreaters/SubcategoryActionCreators';
import { getBrand } from '../Store/ActionCreaters/BrandActionCreators';
import { motion } from 'framer-motion'; // For Premium Animations

export default function Shop() {
    var { maincat } = useParams()
    var [mc, setmc] = useState(maincat)
    var [sc, setsc] = useState("All")
    var [br, setbr] = useState("All")
    var [min, setmin] = useState(1)
    var [max, setmax] = useState(5000)
    var [shopproduct, setshopproduct] = useState([])

    var product = useSelector((state) => state.ProductStateData)
    var maincategory = useSelector((state) => state.MaincategoryStateData)
    var subcategory = useSelector((state) => state.SubcategoryStateData)
    var brand = useSelector((state) => state.BrandStateData)

    var dispatch = useDispatch()

    function getSelected(mc, sc, br) {
        let filtered = [...product];
        if (mc !== 'All') filtered = filtered.filter((item) => item.maincategory === mc)
        if (sc !== 'All') filtered = filtered.filter((item) => item.subcategory === sc)
        if (br !== 'All') filtered = filtered.filter((item) => item.brand === br)
        setshopproduct(filtered.reverse())
    }

    function getFilter(input) {
        if (input.mc) { setmc(input.mc); getSelected(input.mc, sc, br); }
        else if (input.sc) { setsc(input.sc); getSelected(mc, input.sc, br); }
        else { setbr(input.br); getSelected(mc, sc, input.br); }
    }

    function getPriceFilter(e) {
        let { name, value } = e.target
        if (name === "min") setmin(value)
        else setmax(value)
        
        setshopproduct(product.filter((item) => item.finalprice >= min && item.finalprice <= max))
    }

    function getAPIData() {
        dispatch(getProduct())
        dispatch(getMaincategory())
        dispatch(getSubcategory())
        dispatch(getBrand())
    }

    useEffect(() => {
        getAPIData()
    }, [dispatch])

    useEffect(() => {
        // Initial filter based on URL category
        if (maincat === "All") setshopproduct([...product].reverse())
        else setshopproduct(product.filter((item) => item.maincategory === maincat).reverse())
    }, [product, maincat])

    return (
        <>
            {/* --- PREMIUM BREADCRUMB BANNER --- */}
            <div className="hero-wrap hero-bread py-5" style={{ background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("/assets/images/bg_6.jpg")', backgroundSize: 'cover' }}>
                <div className="container">
                    <div className="row no-gutters slider-text align-items-center justify-content-center">
                        <div className="col-md-9 text-center">
                            <h1 className="mb-0 bread text-white font-weight-bold display-4">Our Shop</h1>
                            <p className="breadcrumbs text-white-50"><Link to="/" className="text-white">Home</Link> / <span>Products</span></p>
                        </div>
                    </div>
                </div>
            </div>

            <section className="ftco-section bg-light">
                <div className="container">
                    <div className="row">
                        {/* --- SIDEBAR FILTERS --- */}
                        <div className="col-md-4 col-lg-3">
                            <div className="sidebar shadow-sm p-4 bg-white rounded-lg">
                                <h4 className="font-weight-bold mb-4 border-bottom pb-2">Filters</h4>
                                
                                <div className="mb-4">
                                    <h6 className="text-info font-weight-bold uppercase">Main Category</h6>
                                    <ul className="list-unstyled">
                                        <li><button className={`btn btn-link text-dark ${mc==='All'?'font-weight-bold':''}`} onClick={() => getFilter({ mc: 'All' })}>All Categories</button></li>
                                        {maincategory.map((item, i) => (
                                            <li key={i}><button className="btn btn-link text-muted p-0 mb-1" onClick={() => getFilter({ mc: item.name })}>{item.name}</button></li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mb-4 border-top pt-3">
                                    <h6 className="text-info font-weight-bold">Brands</h6>
                                    <div className="d-flex flex-wrap">
                                        {brand.map((item, i) => (
                                            <button key={i} className="btn btn-sm btn-outline-secondary m-1 rounded-pill" onClick={() => getFilter({ br: item.name })}>{item.name}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-4 border-top pt-3">
                                    <h6 className="text-info font-weight-bold">Price Range</h6>
                                    <div className="row">
                                        <div className="col-6"><input type="number" name="min" value={min} onChange={getPriceFilter} className="form-control form-control-sm" placeholder="Min"/></div>
                                        <div className="col-6"><input type="number" name="max" value={max} onChange={getPriceFilter} className="form-control form-control-sm" placeholder="Max"/></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- PRODUCT GRID --- */}
                        <div className="col-md-8 col-lg-9">
                            <div className="row">
                                {shopproduct.length > 0 ? shopproduct.map((item, index) => (
                                    <motion.div 
                                        key={index} 
                                        className="col-md-6 col-lg-4 d-flex"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <div className="product shadow-sm border-0 w-100 mb-4 bg-white rounded-lg overflow-hidden transition-all hover-up">
                                            {/* SAHI LINE: Direct Cloudinary URL from item.pic1 */}
                                            <Link to={`/single-product/${item.id}`} className="img-prod d-block overflow-hidden">
                                                <img 
                                                    className="img-fluid" 
                                                    src={item.pic1} 
                                                    style={{ height: "280px", width: "100%", objectFit: "cover" }} 
                                                    alt={item.name} 
                                                />
                                                <div className="overlay"></div>
                                                {item.discount > 0 && <span className="status bg-danger">{item.discount}% Off</span>}
                                            </Link>
                                            <div className="text py-3 px-3 text-center">
                                                <h3 className="h6 font-weight-bold"><Link to={`/single-product/${item.id}`} className="text-dark">{item.name}</Link></h3>
                                                <div className="pricing">
                                                    <p className="price text-info font-weight-bold h5">
                                                        ₹{item.finalprice} <del className="text-muted small ml-2">₹{item.baseprice}</del>
                                                    </p>
                                                </div>
                                                <Link to={`/single-product/${item.id}`} className="btn btn-info btn-sm rounded-pill px-4 mt-2">View Details</Link>
                                            </div>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div className="col-12 text-center py-5">
                                        <h3 className="text-muted">No Products Found!</h3>
                                        <button className="btn btn-info mt-3" onClick={() => window.location.reload()}>Reset Filters</button>
                                    </div>
                                )}
                            </div>

                            {/* Pagination (Simplified for UI) */}
                            <div className="row mt-5">
                                <div className="col text-center">
                                    <div className="block-27">
                                        <ul>
                                            <li className="active"><span>1</span></li>
                                            <li><span>2</span></li>
                                            <li><span>3</span></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Custom CSS for Hover Effects */}
            <style dangerouslySetInnerHTML={{ __html: `
                .hover-up:hover { transform: translateY(-10px); transition: 0.3s ease; box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
                .rounded-lg { border-radius: 15px !important; }
                .img-prod img { transition: 0.5s all; }
                .product:hover .img-prod img { transform: scale(1.1); }
            `}} />
        </>
    )
}