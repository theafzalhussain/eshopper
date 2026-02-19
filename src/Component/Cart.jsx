import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { deleteCart, getCart, updateCart } from "../Store/ActionCreaters/CartActionCreators"
import { Link } from 'react-router-dom'

export default function Cart() {
    var [cart, setcart] = useState([])
    var [total, settotal] = useState(0)
    var [shipping, setshipping] = useState(0)
    var [final, setfinal] = useState(0)
    var carts = useSelector((state) => state.CartStateData)
    var dispatch = useDispatch()

    function getAPIData() {
        dispatch(getCart())
        var data = carts.filter((item) => item.userid === localStorage.getItem("userid"))
        if (data) {
            setcart(data)
            var sum = 0
            for (let item of data) {
                sum = sum + Number(item.total) // FIX: Convert to Number
            }
            var ship = (sum > 0 && sum <= 1000) ? 150 : 0
            settotal(sum)
            setshipping(ship)
            setfinal(sum + ship)
        }
    }

    function update(id, op) {
        var item = carts.find((item) => item.id === id)
        if (op === "dec" && item.qty === 1) return
        
        if (op === "dec") {
            item.qty -= 1
            item.total -= item.price
        } else {
            item.qty += 1
            item.total = Number(item.total) + Number(item.price)
        }
        dispatch(updateCart(item))
        getAPIData()
    }

    function deleteItem(id) {
        dispatch(deleteCart({ id: id }))
        getAPIData()
    }

    useEffect(() => {
        getAPIData()
    }, [carts.length])

    return (
        <section className="ftco-section ftco-cart">
            <div className="container">
                <div className="table-responsive">
                    <table className="mytable">
                        <thead className="thead-primary">
                            <tr className="text-center">
                                <th>Image</th>
                                <th>Product</th>
                                <th>Price</th>
                                <th>Quantity</th>
                                <th>Total</th>
                                <th>Remove</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.map((item, index) => (
                                <tr key={index} className="text-center">
                                    <td className="image-prod">
                                        {/* FIX: Use item.pic directly for Cloudinary */}
                                        <img src={item.pic} height="75px" width="90px" className='img rounded' alt="" />
                                    </td>
                                    <td className="product-name"><h3>{item.name}</h3></td>
                                    <td className="price">₹{item.price}</td>
                                    <td className="quantity">
                                        <button onClick={() => update(item.id, "dec")} className='btn btn-sm'>-</button>
                                        {item.qty}
                                        <button onClick={() => update(item.id, "inc")} className='btn btn-sm'>+</button>
                                    </td>
                                    <td className="total">₹{item.total}</td>
                                    <td><button onClick={() => deleteItem(item.id)} className='btn btn-link'><i className="icon ion-ios-trash"></i></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="row justify-content-end mt-3">
                    <div className="col-md-4 cart-wrap ftco-animate">
                        <div className="cart-total mb-3 p-3 bg-light">
                            <h3>Cart Totals</h3>
                            <p className="d-flex"><span>Subtotal</span> <span>₹{total}</span></p>
                            <p className="d-flex"><span>Shipping</span> <span>₹{shipping}</span></p>
                            <hr />
                            <p className="d-flex total-price"><span>Final Amount</span> <span>₹{final}</span></p>
                        </div>
                        <Link to="/checkout" className="btn btn-primary w-100">Proceed to Checkout</Link>
                    </div>
                </div>
            </div>
        </section>
    )
}