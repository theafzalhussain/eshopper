import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { deleteWishlist, getWishlist } from "../Store/ActionCreaters/WishlistActionCreators"
import { Link, useNavigate } from 'react-router-dom'

export default function Wishlist() {
    let [wishlist, setWishlist] = useState([])
    let wishlists = useSelector((state) => state.WishlistStateData)
    let dispatch = useDispatch()
    let navigate = useNavigate()

    function getAPIData() {
        dispatch(getWishlist())
        let userId = localStorage.getItem("userid")
        let userWish = wishlists.filter((item) => item.userid === userId)
        if (userWish) setWishlist(userWish)
    }

    useEffect(() => { getAPIData() }, [wishlists.length])

    return (
        <section className="ftco-section bg-light">
            <div className="container">
                <div className="row">
                    <div className="col-md-12">
                        <h2 className="mb-4 text-center">My Wishlist</h2>
                        <div className="table-responsive shadow-sm rounded bg-white">
                            <table className="table text-center align-middle">
                                <thead className="thead-primary" style={{backgroundColor:"#b19d5e", color:"white"}}>
                                    <tr>
                                        <th>Product</th>
                                        <th>Details</th>
                                        <th>Price</th>
                                        <th>Action</th>
                                        <th>Remove</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wishlist.length > 0 ? wishlist.map((item, index) => (
                                        <tr key={index} className="border-bottom">
                                            <td className="p-3">
                                                <img src={item.pic} width="80px" height="80px" style={{objectFit:"cover"}} className="rounded" alt="" />
                                            </td>
                                            <td className="align-middle">
                                                <strong>{item.name}</strong>
                                            </td>
                                            <td className="align-middle">₹{item.price}</td>
                                            <td className="align-middle">
                                                <Link to={`/single-product/${item.productid}`} className="btn btn-info btn-sm">View & Buy</Link>
                                            </td>
                                            <td className="align-middle">
                                                <button onClick={() => dispatch(deleteWishlist({id: item.id}))} className="btn btn-sm text-danger h4">×</button>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan="5" className='p-5'><h4>Your Wishlist is Empty!</h4><Link to="/shop/All" className='btn btn-info'>Shop Now</Link></td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}