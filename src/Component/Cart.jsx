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
        const userId = localStorage.getItem("userid")
        var userCarts = carts.filter((item) => item.userid === userId)
        if (userCarts) {
            setcart(userCarts)
            let sum = 0
            userCarts.forEach(item => {
                sum += (Number(item.price) * Number(item.qty))
            })
            var ship = (sum > 0 && sum < 1000) ? 150 : 0
            settotal(sum); setshipping(ship); setfinal(sum + ship)
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
    }

    useEffect(() => { getAPIData() }, [carts.length])

    return (
        <section className="ftco-section">
            <div className="container">
                <table className="table">
                    <thead className="thead-primary">
                        <tr className="text-center">
                            <th>Image</th>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Qty</th>
                            <th>Total</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((item, index) => (
                            <tr key={index} className="text-center">
                                {/* SAHI LINE: Cloudinary URL directly */}
                                <td><img src={item.pic} width="80px" className="rounded" alt="" /></td>
                                <td>{item.name}</td>
                                <td>₹{item.price}</td>
                                <td>
                                    <button onClick={() => update(item.id, "dec")} className="btn btn-sm">-</button>
                                    {item.qty}
                                    <button onClick={() => update(item.id, "inc")} className="btn btn-sm">+</button>
                                </td>
                                <td>₹{item.total}</td>
                                <td><button onClick={() => dispatch(deleteCart({id: item.id}))} className="btn btn-danger">X</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="row justify-content-end p-3">
                    <div className="col-md-4 bg-light p-4">
                        <h3>Cart Totals</h3>
                        <p>Subtotal: ₹{total}</p>
                        <p>Shipping: ₹{shipping}</p>
                        <hr />
                        <h4>Total: ₹{final}</h4>
                        <Link to="/checkout" className="btn btn-primary w-100">Checkout</Link>
                    </div>
                </div>
            </div>
        </section>
    )
}