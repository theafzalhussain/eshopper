import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from "../Store/ActionCreaters/ProductActionCreators"
import { getCart, addCart } from "../Store/ActionCreaters/CartActionCreators"
import { getWishlist, addWishlist } from "../Store/ActionCreaters/WishlistActionCreators"
import { Link } from 'react-router-dom';
export default function SingleProductPage() {
    var [p, setp] = useState({
        pic1:"",
        pic2:"",
        pic3:"",
        pic4:"",
    })
    var [qty, setqty] = useState(1)
    var product = useSelector((state) => state.ProductStateData)
    var cart = useSelector((state) => state.CartStateData)
    var wishlist = useSelector((state) => state.WishlistStateData)
    var navigate = useNavigate()

    var { id } = useParams()
    var dispatch = useDispatch()
    function getAPIData() {
        dispatch(getProduct())
        dispatch(getCart())
        dispatch(getWishlist())
        var data = product.find((item) => item.id === Number(id))
        if (data)
            setp(data)
    }
    function addToCart() {
        var d = cart.find((item) => item.productid === Number(id) && item.userid === localStorage.getItem("userid"))
        console.log(d);
        if (d)
            navigate("/cart")
        else {
            var item = {
                productid: p.id,
                userid: localStorage.getItem("userid"),
                name: p.name,
                color: p.color,
                size: p.size,
                price: p.finalprice,
                qty: qty,
                total: p.finalprice * qty,
                pic: p.pic1,
            }
            dispatch(addCart(item))
            navigate("/cart")
        }
    }
    function addToWishlist() {
        var d = wishlist.find((item) => item.productid ===Number(id) && item.userid === localStorage.getItem("userid"))
        if (d)
            navigate("/profile")
        else {
            var item = {
                productid: p.id,
                userid: localStorage.getItem("userid"),
                name: p.name,
                color: p.color,
                size: p.size,
                price: p.finalprice,
                pic: p.pic1,
            }
            dispatch(addWishlist(item))
            navigate("/profile")
        }
    }
    useEffect(() => {
        getAPIData()
    }, [product.length])
    return (
        <>
     {/* <div className="hero-wrap hero-bread" style={{backgroundImage: "url('assets/images/bg_6.jpg')"}}>
      <div className="container">
        <div className="row no-gutters slider-text align-items-center justify-content-center">
          <div className="col-md-9 ftco-animate text-center">
          	<p className="breadcrumbs"><span className="mr-2"><Link to="/">Home</Link></span> <span>Shop</span></p>
            <h1 className="mb-0 bread">Shop</h1>
          </div>
        </div>
      </div>
    </div> */}

    <section className="ftco-section">
    	<div className="container">
    		<div className="row">
    			<div className="col-lg-6 mb-5 ftco-animate">
				<div id="carouselExampleFade" className="carousel slide carousel-fade" data-ride="carousel">
					<div className="carousel-inner">
						<div className="carousel-item  active text-center ">
							<img src={`/assets/productimages/${p.pic1}`} height="600px" className="d-block w-100" alt="..." />
						</div>
						<div className="carousel-item text-center">
							<img src={`/assets/productimages/${p.pic2}`} height="600px" className="d-block w-100" alt="..." />
						</div>
						<div className="carousel-item text-center">
							<img src={`/assets/productimages/${p.pic3}`} height="600px" className="d-block w-100" alt="..." />
						</div>
						<div className="carousel-item text-center">
							<img src={`/assets/productimages/${p.pic4}`} height="600px" className="d-block w-100" alt="..." />
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
    			</div>
				<div className="col-lg-6 product-details pl-md-5 ftco-animate text-center">
                            <h3 className='mb-3 bg-secondary text-light'>{p.name}</h3>
                            <div className='d-flex'>
                                <div className='border  p-3 w-50'>Category</div>
                                <div className='border  p-3 w-50'>{p.maincategory}/{p.subcategory}</div>
                            </div>
                            <div className='d-flex'>
                                <div className='border  p-3 w-50'>Brand</div>
                                <div className='border  p-3 w-50'>{p.brand}</div>
                            </div>
                            <div className='d-flex'>
                                <div className='border  p-3 w-50'>Price</div>
                                <div className='border  p-3 w-50'><del>&#8377;{p.baseprice}</del><sup>&#8377;{p.finalprice}</sup> &nbsp;&nbsp;&nbsp;{p.discount}% Off</div>
                            </div>
                            <div className='d-flex'>
                                <div className='border  p-3 w-50'>Color</div>
                                <div className='border  p-3 w-50'>{p.color}</div>
                            </div>
                            <div className='d-flex'>
                                <div className='border  p-3 w-50'>Size</div>
                                <div className='border  p-3 w-50'>{p.size}</div>
                            </div>
                            <div className='d-flex'>
                                <div className='border  p-3 w-50'>Stock</div>
                                <div className='border  p-3 w-50'>{p.stock}</div>
                            </div>
                            <div className='d-flex'>
                                <div className='border  p-3 w-50'>Description</div>
                                <div className='border  p-3 w-50'>{p.description}</div>
                            </div>


                            <div className='mt-3 '>
                                <div className="m-auto text-center" style={{ width: "120%" }}>
                                    <div className="input-group col-md-6 mb-3">
                                        <span className="input-group-btn mr-2">
                                            <button type="button" className="quantity-left-minus btn mr-3" data-type="minus" data-field="" onClick={()=>{
                                                if(qty>1)
                                                setqty(qty-1)
                                            }}>
                                                <i className="ion-ios-remove"></i>
                                            </button>
                                        </span>
                                        <input type="text" id="qty" name="qty" className="quantity form-control input-number" value={qty} min="1" max="100" />
                                        <span className="input-group-btn ml-2">
                                            <button type="button" className="quantity-right-plus btn ml-3" data-type="plus" data-field="" onClick={()=>setqty(qty+1)}>
                                                <i className="ion-ios-add"></i>
                                            </button>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className='d-flex'>
                                <button  onClick={addToCart} className="btn text-dark bg-light w-50 mr-2">Add to Cart</button>
                                <button  onClick={addToWishlist} className="btn text-dark bg-light w-50">Add to Wishlist</button>
                            </div>
                        </div>
                    </div>
   		<div className="row mt-5">
          <div className="col-md-12 nav-link-wrap">
            <div className="nav nav-pills d-flex text-center" id="v-pills-tab" role="tablist" aria-orientation="vertical">
              <Link className="nav-link ftco-animate active mr-lg-1" id="v-pills-1-tab" data-toggle="pill" to="#v-pills-1" role="tab" aria-controls="v-pills-1" aria-selected="true">Description</Link>

              <Link className="nav-link ftco-animate mr-lg-1" id="v-pills-2-tab" data-toggle="pill" to="#v-pills-2" role="tab" aria-controls="v-pills-2" aria-selected="false">Manufacturer</Link>

              <Link className="nav-link ftco-animate" id="v-pills-3-tab" data-toggle="pill" to="#v-pills-3" role="tab" aria-controls="v-pills-3" aria-selected="false">Reviews</Link>

            </div>
          </div>
          <div className="col-md-12 tab-wrap">
            
            <div className="tab-content bg-light" id="v-pills-tabContent">

              <div className="tab-pane fade show active" id="v-pills-1" role="tabpanel" aria-labelledby="day-1-tab">
              	<div className="p-4">
	              	<h3 className="mb-4">{p.name}</h3>
	              	<p>On her way she met a copy. The copy warned the Little Blind Text, that where it came from it would have been rewritten a thousand times and everything that was left from its origin would be the word "and" and the Little Blind Text should turn around and return to its own, safe country. But nothing the copy said could convince her and so it didn’t take long until a few insidious Copy Writers ambushed her, made her drunk with Longe and Parole and dragged her into their agency, where they abused her for their.</p>
              	</div>
              </div>

              <div className="tab-pane fade" id="v-pills-2" role="tabpanel" aria-labelledby="v-pills-day-2-tab">
              	<div className="p-4">
	              	<h3 className="mb-4">Manufactured By Nike</h3>
	              	<p>On her way she met a copy. The copy warned the Little Blind Text, that where it came from it would have been rewritten a thousand times and everything that was left from its origin would be the word "and" and the Little Blind Text should turn around and return to its own, safe country. But nothing the copy said could convince her and so it didn’t take long until a few insidious Copy Writers ambushed her, made her drunk with Longe and Parole and dragged her into their agency, where they abused her for their.</p>
              	</div>
              </div>
              <div className="tab-pane fade" id="v-pills-3" role="tabpanel" aria-labelledby="v-pills-day-3-tab">
              	<div className="row p-4">
						   		<div className="col-md-7">
						   			<h3 className="mb-4">23 Reviews</h3>
						   			<div className="review">
								   		<div className="user-img" style={{backgroundImage: "url('assets/images/person_1.jpg')"}}></div>
								   		<div className="desc">
								   			<h4>
								   				<span className="text-left">Jacob Webb</span>
								   				<span className="text-right">14 March 2018</span>
								   			</h4>
								   			<p className="star">
								   				<span>
								   					<i className="ion-ios-star-outline"></i>
								   					<i className="ion-ios-star-outline"></i>
								   					<i className="ion-ios-star-outline"></i>
								   					<i className="ion-ios-star-outline"></i>
								   					<i className="ion-ios-star-outline"></i>
							   					</span>
							   					<span className="text-right"><Link to="#" className="reply"><i className="icon-reply"></i></Link></span>
								   			</p>
								   			<p>When she reached the first hills of the Italic Mountains, she had a last view back on the skyline of her hometown Bookmarksgrov</p>
								   		</div>
								   	</div>
								   	<div className="review">
								   		<div className="user-img" style={{backgroundImage: "url('assets/images/person_2.jpg')"}}></div>
								   		<div className="desc">
								   			<h4>
								   				<span className="text-left">Jacob Webb</span>
								   				<span className="text-right">14 March 2018</span>
								   			</h4>
								   			<p className="star">
								   				<span>
								   					<i className="ion-ios-star-outline"></i>
								   					<i className="ion-ios-star-outline"></i>
								   					<i className="ion-ios-star-outline"></i>
								   					<i className="ion-ios-star-outline"></i>
								   					<i className="ion-ios-star-outline"></i>
							   					</span>
							   					<span className="text-right"><Link to="#" className="reply"><i className="icon-reply"></i></Link></span>
								   			</p>
								   			<p>When she reached the first hills of the Italic Mountains, she had a last view back on the skyline of her hometown Bookmarksgrov</p>
								   		</div>
								   	</div>
								   	<div className="review">
								   		<div className="user-img" style={{backgroundImage: "url('assets/images/person_3.jpg')"}}></div>
								   		<div className="desc">
								   			<h4>
								   				<span className="text-left">Jacob Webb</span>
								   				<span className="text-right">14 March 2018</span>
								   			</h4>
								   			<p className="star">
								   				<span>
								   					<i className="ion-ios-star-outline"></i>
								   					<i className="ion-ios-star-outline"></i>
								   					<i className="ion-ios-star-outline"></i>
								   					<i className="ion-ios-star-outline"></i>
								   					<i className="ion-ios-star-outline"></i>
							   					</span>
							   					<span className="text-right"><Link to="#" className="reply"><i className="icon-reply"></i></Link></span>
								   			</p>
								   			<p>When she reached the first hills of the Italic Mountains, she had a last view back on the skyline of her hometown Bookmarksgrov</p>
								   		</div>
								   	</div>
						   		</div>
						   		<div className="col-md-4">
						   			<div className="rating-wrap">
							   			<h3 className="mb-4">Give a Review</h3>
							   			<p className="star">
							   				<span>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					(98%)
						   					</span>
						   					<span>20 Reviews</span>
							   			</p>
							   			<p className="star">
							   				<span>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					(85%)
						   					</span>
						   					<span>10 Reviews</span>
							   			</p>
							   			<p className="star">
							   				<span>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					(98%)
						   					</span>
						   					<span>5 Reviews</span>
							   			</p>
							   			<p className="star">
							   				<span>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					(98%)
						   					</span>
						   					<span>0 Reviews</span>
							   			</p>
							   			<p className="star">
							   				<span>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					<i className="ion-ios-star-outline"></i>
							   					(98%)
						   					</span>
						   					<span>0 Reviews</span>
							   			</p>
							   		</div>
						   		</div>
						   	</div>
              </div>
            </div>
          </div>
        </div>
    	</div>
    </section>
   </>
  )
}
