import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import LefNav from './LefNav'
import { getCheckout, updateCheckout } from '../../Store/ActionCreaters/CheckoutActionCreators'
import { ShoppingBag, Truck } from 'lucide-react'

export default function AdminCheckout() {
    const checkouts = useSelector((state) => state.CheckoutStateData)
    const dispatch = useDispatch()

    useEffect(() => { 
        dispatch(getCheckout()) 
    }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <div className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <h4 className="font-weight-bold mb-4 d-flex align-items-center"><ShoppingBag className="mr-2 text-info"/> Manage All Orders</h4>
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead className="bg-light small">
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Customer ID</th>
                                            <th>Status</th>
                                            <th>Amount</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {checkouts.map((item, index) => (
                                            <tr key={index}>
                                                <td className="align-middle font-weight-bold small text-info">{item.id || item._id}</td>
                                                <td className="align-middle small">{item.userid}</td>
                                                <td className="align-middle">
                                                    <span className={`badge px-3 py-2 rounded-pill ${item.orderstatus === 'Order Placed' ? 'badge-warning' : 'badge-success'}`}>
                                                        {item.orderstatus}
                                                    </span>
                                                </td>
                                                <td className="align-middle font-weight-bold">₹{item.finalAmount}</td>
                                                <td className="align-middle text-right">
                                                    <button onClick={() => dispatch(updateCheckout({...item, orderstatus:'Packed'}))} className="btn btn-sm btn-info px-3 rounded-pill"><Truck size={14}/> Ship</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}