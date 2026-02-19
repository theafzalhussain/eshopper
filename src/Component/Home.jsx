import React, { useEffect } from 'react'
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import Newslatter from './Newslatter';

export default function Home() {
    var product = useSelector((state) => state.ProductStateData)
    
    // Logic for latest 8 products (Safe for MongoDB)
    let displayProducts = [...product].reverse().slice(0, 8)

    var dispatch = useDispatch()
    function getAPIData() {
        dispatch(getProduct())
    }

    useEffect(() => {
        getAPIData()
    }, [product.length])

    return (
        <>
            <section id="home-section" className="hero Myslider">
                <div id="carouselExampleFade" className="carousel slide carousel-fade" data-ride="carousel">
                    <div className="carousel-inner">
                        <div className="carousel-item active text-center mt-3 ">
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
                                <div className="icon d-flex justify-content-center align-items-center mb-4"><span className="flaticon-bag"></span></div>
                                <div className="media-body">
                                    <h3 className="heading">Free Shipping</h3>
                                    <p>Far far away, behind the word mountains, far from the countries Vokalia and Consonantia.</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-4 text-center d-flex align-self-stretch ftco-animate">
                            <div className="media block-6 services p-3 py-md-2">
                                <div className="icon d-flex justify-content-center align-items-center mb-4"><span className="flaticon-customer-service"></span></div>
                                <div className="media-body">
                                    <h3 className="heading">Support Customer</h3>
                                    <p>Far far away, behind the word mountains, far from the countries Vokalia and Consonantia.</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-4 text-center d-flex align-self-stretch ftco-animate">
                            <div className="media block-6 services p-3 py-md-2">
                                <div className="icon d-flex justify-content-center align-items-center mb-4"><span className="flaticon-payment-security"></span></div>
                                <div className="media-body">
                                    <h3 className="heading">Secure Payments</h3>
                                    <p>Far far away, behind the word mountains, far from the countries Vokalia and Consonantia.</p>
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
                                        {/* SAHI LINE: Using direct item.pic1 from Cloudinary */}
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

            {/* Rest of the attraktive sections remain untouched */}
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
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <Newslatter />
        </>
    )
}