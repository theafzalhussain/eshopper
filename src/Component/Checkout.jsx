import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser } from "../Store/ActionCreaters/UserActionCreators"
import { deleteCart, getCart } from "../Store/ActionCreaters/CartActionCreators"
import { addCheckout } from "../Store/ActionCreaters/CheckoutActionCreators"
import BuyerProfile from './BuyerProfile'

export default function Checkout() {
    var [mode, setMode] = useState("COD")
    var users = useSelector((state) => state.UserStateData)
    var [user, setuser] = useState({})
    var carts = useSelector((state) => state.CartStateData)
    var [cart, setcart] = useState([])
    var [total, settotal] = useState(0)
    var [shipping, setshipping] = useState(0)
    var [final, setfinal] = useState(0)
    
    var dispatch = useDispatch()
    var navigate = useNavigate()

    function getAPIData() {
        dispatch(getUser())
        dispatch(getCart())

        // FIX: Removed Number() for MongoDB ID
        var currentUserId = localStorage.getItem("userid")
        var userData = users.find((item) => item.id === currentUserId)
        if (userData) setuser(userData)

        var userCart = carts.filter((item) => item.userid === currentUserId)
        if (userCart) {
            setcart(userCart)
            var sum = 0
            for (let item of userCart) { sum += Number(item.total) }
            var ship = (sum > 0 && sum <= 1000) ? 150 : 0
            settotal(sum); setshipping(ship); setfinal(sum + ship)
        }
    }

    function placeOrder() {
        var item = {
            userid: localStorage.getItem("userid"),
            paymentmode: mode,
            orderstatus: "Order Placed",
            paymentstatus: "Pending",
            time: new Date(),
            totalAmount: total,
            shippingAmount: shipping,
            finalAmount: final,
            products: cart
        }
        dispatch(addCheckout(item))
        for (let c of cart) { dispatch(deleteCart({ id: c.id })) }
        navigate("/confirmation")
    }

    useEffect(() => {
        getAPIData()
    }, [users.length, carts.length])

    return (
        <section className="ftco-section">
            <div className="container">
                <div className="row">
                    <div className="col-md-6"><BuyerProfile user={user} /></div>
                    <div className="col-md-6">
                        <table className="table bg-light">
                            {cart.map((item, index) => (
                                <tr key={index}>
                                    <td><img src={item.pic} width="50px" alt="" /></td>
                                    <td>{item.name}</td>
                                    <td>{item.qty} x ₹{item.price}</td>
                                    <td>₹{item.total}</td>
                                </tr>
                            ))}
                        </table>
                        <div className="cart-total p-3 bg-light">
                            <p className="d-flex"><span>Subtotal:</span> <span>₹{total}</span></p>
                            <p className="d-flex"><span>Shipping:</span> <span>₹{shipping}</span></p>
                            <h3>Total: ₹{final}</h3>
                            <button className="btn btn-primary w-100 mt-2" onClick={placeOrder}>Place Order</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}