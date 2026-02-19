import React, { useEffect } from 'react'
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import Newslatter from './Newslatter';

export default function Home() {
    var product = useSelector((state) => state.ProductStateData)
    
    // Logic to get latest 8 products safely from MongoDB data
    let displayProducts = [...product].reverse().slice(0, 8)

    var dispatch = useDispatch()
    
    function getAPIData() {
        dispatch(getProduct())
    }

    useEffect(() => {
        getAPIData()
    }, [product.length]) // Dependency added so it updates when data comes

    return (
        <>
            <section id="home-section" className="hero Myslider">
                <div id="carouselExampleFade" className="carousel slide carousel-fade" data-ride="carousel">
                    <div className="carousel-inner">
                        <div className="carousel-item  active text-center mt-3 ">
                            <img src="/assets/images/banner-1.png" height="740px" width="80%" alt="..." />
                        </div>
                        <div className="carousel-item text-center mt-3">
                            <img src="/assets/images/banner-2.png" height="740px" width="80%" alt="..." />
                        </div>
                        <div className="carousel-item text-center mt-5">
                            <img src="/assets/images/banner-3.png" height="708px" width="40%" alt="..." />
                        </div>
                    </div>
                    <a className="carousel-control-prev" href="#carouselExampleFade" role="button" data-slide="prev">
                        <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                        <span className="sr-only">Previous</span>
                    </a>
                    <a className="carousel-control-next" href="#carouselExampleFade" role="button" data-slide="next">
                        <span className="carousel-control-next-icon" aria-hidden="true"></span>
                        <span className="sr-only">Next</span>
                    </a>
                </div>
            </section>

            <section className="ftco-section ftco-no-pt ftco-no-pb">
                <div className="container">
                    <div className="row no-gutters ftco-services">
                        <div className="col-lg-4 text-center d-flex align-self-stretch ftco-animate">
                            <div className="media block-6 services p-3 py-md-2">
                                <div className="icon d-flex justify-content-center align-items-center mb-4">
                                    <span className="flaticon-bag"></span>
                                </div>
                                <div className="media-body">
                                    <h3 className="heading">Free Shipping</h3>
                                    <p>Far far away, behind the word mountains, far from the countries Vokalia and Consonantia, there live the blind texts.</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-4 text-center d-flex align-self-stretch ftco-animate">
                            <div className="media block-6 services p-3 py-md-2">
                                <div className="icon d-flex justify-content-center align-items-center mb-4">
                                    <span className="flaticon-customer-service"></span>
                                </div>
                                <div className="media-body">
                                    <h3 className="heading">Support Customer</h3>
                                    <p>Far far away, behind the word mountains, far from the countries Vokalia and Consonantia, there live the blind texts.</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-4 text-center d-flex align-self-stretch ftco-animate">
                            <div className="media block-6 services p-3 py-md-2">
                                <div className="icon d-flex justify-content-center align-items-center mb-4">
                                    <span className="flaticon-payment-security"></span>
                                </div>
                                <div className="media-body">
                                    <h3 className="heading">Secure Payments</h3>
                                    <p>Far far away, behind the word mountains, far from the countries Vokalia and Consonantia, there live the blind texts.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="ftco-section bg-light p-1">
                <div className="container">
                    <div className="row justify-content-center mb-1 pb-1">
                        <div className="col-md-12 heading-section text-center ftco-animate">
                            <h2 className=" mb-1">Latest Products</h2>
                        </div>
                    </div>
                </div>
                <div className="container">
                    <div className="row">
                        {
                            displayProducts.map((item, index) => {
                                return <div key={index} className="col-sm-12 col-md-6 col-lg-3 ftco-animate d-flex">
                                    <div className="product d-flex flex-column">
                                        {/* FIXED: Removed /assets/productimages/ path, using direct Cloudinary URL from item.pic1 */}
                                        <Link to={`/single-product/${item.id}`} className="img-prod">
                                            <img className="img-fluid" src={item.pic1} style={{ height: "300px", width: "100%", objectFit: "cover" }} alt={item.name} />
                                            <span className="status">{item.discount}% Off</span>
                                            <div className="overlay"></div>
                                        </Link>
                                        <div className="text py-3 pb-4 px-3">
                                            <h3><Link to={`/single-product/${item.id}`}>{item.name}</Link></h3>
                                            <div className="pricing">
                                                <p className="price"><span className="mr-2 price-dc">₹{item.baseprice}</span><span className="price-sale">₹{item.finalprice}</span></p>
                                            </div>
                                            <p className="bottom-area d-flex px-3">
                                                <Link to={`/single-product/${item.id}`} className="add-to-cart text-center py-2 mr-1"><span>Add to cart <i className="ion-ios-add ml-1"></i></span></Link>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            })
                        }
                    </div>
                </div>
            </section>

            <section className="ftco-section ftco-choose ftco-no-pb ftco-no-pt">
                <div className="container">
                    <div className="row no-gutters">
                        <div className="col-lg-4">
                            <div className="choose-wrap divider-one img p-5 d-flex align-items-end" style={{ backgroundImage: "url('assets/images/choose-1.jpg')" }}>
                                <div className="text text-center text-white px-2">
                                    <h2>Men's Collection</h2>
                                    <p><Link to="/shop/Male" className="btn btn-black px-3 py-2">Shop now</Link></p>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-8">
                            <div className="row no-gutters choose-wrap divider-two align-items-stretch">
                                <div className="col-md-12">
                                    <div className="choose-wrap full-wrap img align-self-stretch d-flex align-item-center justify-content-end" style={{ backgroundImage: "url('assets/images/choose-2.jpg')" }}>
                                        <div className="col-md-7 d-flex align-items-center">
                                            <div className="text text-white px-5">
                                                <h2>Women's Collection</h2>
                                                <p><Link to="/shop/Female" className="btn btn-black px-3 py-2">Shop now</Link></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-12">
                                    <div className="row no-gutters">
                                        <div className="col-md-6">
                                            <div className="choose-wrap wrap img align-self-stretch bg-light d-flex align-items-center">
                                                <div className="text text-center px-5">
                                                    <span className="subheading">Sale</span>
                                                    <h2>More Then 90% Off</h2>
                                                    <p><Link to="/shop/All" className="btn btn-black px-3 py-2">Shop now</Link></p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="choose-wrap wrap img align-self-stretch d-flex align-items-center" style={{ backgroundImage: "url('/assets/images/bg_2.png')" }}>
                                                <div className="text text-center text-white mt-5 px-5">
                                                    <h2>Kids Collection</h2>
                                                    <p><Link to="/shop/Kids" className="btn btn-black px-3 py-2">Shop now</Link></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="ftco-section ftco-deal bg-primary mt-2 p-3">
                <div className="container">
                    <div className="row">
                        <div className="col-md-6">
                            <img src="/assets/images/bn-3.png" className="img-fluid" alt="" />
                        </div>
                        <div className="col-md-6">
                            <div className="heading-section heading-section-white">
                                <span className="subheading">Deal of the month</span>
                                <h2 className="mb-3">Deal of the month</h2>
                            </div>
                            <div id="timer" className="d-flex mb-4">
                                <div className="time" id="days"></div>
                                <div className="time pl-4" id="hours"></div>
                                <div className="time pl-4" id="minutes"></div>
                                <div className="time pl-4" id="seconds"></div>
                            </div>
                            <div className="text-deal">
                                <h2><a href="#">ZaRa Free RN 2023 iD</a></h2>
                                <p className="price"><span className="mr-2 price-dc">₹5000.00</span><span className="price-sale">₹2500.00</span></p>
                                <ul className="thumb-deal d-flex mt-5">
                                    <li className="img" style={{ backgroundImage: "url('/assets/images/bn-2.png')" }}></li>
                                    <li className="img" style={{ backgroundImage: "url('/assets/images/bn-1.png')" }}></li>
                                    <li className="img" style={{ backgroundImage: "url('/assets/images/bn-5.png')" }}></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="ftco-section testimony-section p-2">
                <div className="container">
                    <div className="services-flow row">
                        <div className="services-2 p-5 d-flex col-lg-3 col-md-6 col-12">
                            <div className="icon"><span className="flaticon-bag"></span></div>
                            <div className="text">
                                <h3>Free Shipping</h3>
                                <p className="mb-0 ">Separated they live in. A small river named Duden flows</p>
                            </div>
                        </div>
                        <div className="services-2 p-5 d-flex col-lg-3 col-md-6 col-12">
                            <div className="icon"><span className="flaticon-heart-box"></span></div>
                            <div className="text">
                                <h3>Valuable Gifts</h3>
                                <p className="mb-0">Separated they live in. A small river named Duden flows</p>
                            </div>
                        </div>
                        <div className="services-2 p-5 d-flex col-lg-3 col-md-6 col-12">
                            <div className="icon"><span className="flaticon-payment-security"></span></div>
                            <div className="text">
                                <h3>All Day Support</h3>
                                <p className="mb-0">Separated they live in. A small river named Duden flows</p>
                            </div>
                        </div>
                        <div className="services-2 p-5 d-flex col-lg-3 col-md-6 col-12">
                            <div className="icon"><span className="flaticon-customer-service"></span></div>
                            <div className="text">
                                <h3>All Day Support</h3>
                                <p className="mb-0">Separated they live in. A small river named Duden flows</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="ftco-gallery ">
                <Newslatter/>
                <div className="container-fluid px-0">
                    <div className="row no-gutters">
                        <div className="col-md-4 col-lg-2 ftco-animate">
                            <a href="/assets/images/gallery-1.jpg" className="gallery image-popup img d-flex align-items-center" style={{ backgroundImage: "url('/assets/images/gallery-1.jpg')" }}>
                                <div className="icon mb-4 d-flex align-items-center justify-content-center">
                                    <span className="icon-instagram"></span>
                                </div>
                            </a>
                        </div>
                        <div className="col-md-4 col-lg-2 ftco-animate">
                            <a href="/assets/images/gallery-2.jpg" className="gallery image-popup img d-flex align-items-center" style={{ backgroundImage: "url('/assets/images/gallery-2.jpg')" }}>
                                <div className="icon mb-4 d-flex align-items-center justify-content-center">
                                    <span className="icon-instagram"></span>
                                </div>
                            </a>
                        </div>
                        <div className="col-md-4 col-lg-2 ftco-animate">
                            <a href="/assets/images/gallery-3.jpg" className="gallery image-popup img d-flex align-items-center" style={{ backgroundImage: "url('/assets/images/gallery-3.jpg')" }}>
                                <div className="icon mb-4 d-flex align-items-center justify-content-center">
                                    <span className="icon-instagram"></span>
                                </div>
                            </a>
                        </div>
                        <div className="col-md-4 col-lg-2 ftco-animate">
                            <a href="/assets/images/gallery-4.jpg" className="gallery image-popup img d-flex align-items-center" style={{ backgroundImage: "url('/assets/images/gallery-4.jpg')" }}>
                                <div className="icon mb-4 d-flex align-items-center justify-content-center">
                                    <span className="icon-instagram"></span>
                                </div>
                            </a>
                        </div>
                        <div className="col-md-4 col-lg-2 ftco-animate">
                            <a href="/assets/images/gallery-5.jpg" className="gallery image-popup img d-flex align-items-center" style={{ backgroundImage: "url('/assets/images/gallery-5.jpg')" }}>
                                <div className="icon mb-4 d-flex align-items-center justify-content-center">
                                    <span className="icon-instagram"></span>
                                </div>
                            </a>
                        </div>
                        <div className="col-md-4 col-lg-2 ftco-animate">
                            <a href="/assets/images/gallery-6.jpg" className="gallery image-popup img d-flex align-items-center" style={{ backgroundImage: "url('/assets/images/gallery-6.jpg')" }}>
                                <div className="icon mb-4 d-flex align-items-center justify-content-center">
                                    <span className="icon-instagram"></span>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}