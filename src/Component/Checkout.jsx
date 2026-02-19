import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser } from "../Store/ActionCreaters/UserActionCreators"
import { getCart, deleteCart } from "../Store/ActionCreaters/CartActionCreators"
import { addCheckout } from "../Store/ActionCreaters/CheckoutActionCreators"
import BuyerProfile from './BuyerProfile'

export default function Checkout() {
    var [mode, setMode] = useState("COD")
    var [user, setuser] = useState({})
    var [cart, setcart] = useState([])
    var [total, settotal] = useState(0)
    var [shipping, setshipping] = useState(0)
    var [final, setfinal] = useState(0)

    var users = useSelector((state) => state.UserStateData)
    var carts = useSelector((state) => state.CartStateData)
    
    var dispatch = useDispatch()
    var navigate = useNavigate()

    function getAPIData() {
        dispatch(getUser())
        dispatch(getCart())
        const userId = localStorage.getItem("userid")
        
        var userData = users.find((item) => item.id === userId)
        if (userData) setuser(userData)

        var userCart = carts.filter((item) => item.userid === userId)
        setcart(userCart)
        let sum = 0
        userCart.forEach(i => sum += Number(i.total))
        let ship = (sum > 0 && sum < 1000) ? 150 : 0
        settotal(sum); setshipping(ship); setfinal(sum + ship)
    }

    useEffect(() => { getAPIData() }, [users.length, carts.length])

    return (
        <section className="ftco-section">
            <div className="container">
                <div className="row">
                    <div className="col-md-6"><BuyerProfile user={user} /></div>
                    <div className="col-md-6">
                        <h3 className="mb-4">Order Summary</h3>
                        <table className="table">
                            {cart.map((item, index) => (
                                <tr key={index}>
                                    {/* SAHI LINE: Cloudinary URL */}
                                    <td><img src={item.pic} width="50px" className="rounded" /></td>
                                    <td>{item.name}</td>
                                    <td>₹{item.total}</td>
                                </tr>
                            ))}
                        </table>
                        <div className="bg-light p-3">
                            <p>Subtotal: ₹{total}</p>
                            <p>Shipping: ₹{shipping}</p>
                            <h4>Total: ₹{final}</h4>
                            <button className="btn btn-primary w-100" onClick={() => {
                                dispatch(addCheckout({ userid: localStorage.getItem("userid"), finalAmount: final, products: cart, paymentmode: mode }));
                                cart.forEach(i => dispatch(deleteCart({id: i.id})));
                                navigate("/confirmation");
                            }}>Place Order</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}