import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import LefNav from './LefNav'
import { getCheckout, updateCheckout } from '../../Store/ActionCreaters/CheckoutActionCreators'
import { BASE_URL } from '../../constants'
import { ShoppingBag, Truck, AlertCircle } from 'lucide-react'

export default function AdminCheckout() {
    const checkouts = useSelector((state) => state.CheckoutStateData)
    const dispatch = useDispatch()
    const [updating, setUpdating] = React.useState(null)
    const [notification, setNotification] = React.useState(null)

    useEffect(() => { 
        dispatch(getCheckout()) 
    }, [dispatch])

    // 🔴 HANDLE STATUS UPDATE VIA SOCKET.IO API
    const handleStatusUpdate = async (item, newStatus = 'Packed') => {
        try {
            setUpdating(item.id || item._id)
            
            const response = await axios.post(`${BASE_URL}/api/update-order-status`, {
                orderId: item.id || item._id || item.orderId,
                status: newStatus
            }, { timeout: 10000 })

            if (response.data?.success) {
                // Show success notification
                setNotification({ type: 'success', message: `✅ Order updated to ${newStatus}` })
                
                // Refresh orders list
                setTimeout(() => {
                    dispatch(getCheckout())
                }, 500)

                // Clear notification after 3s
                setTimeout(() => setNotification(null), 3000)
            }
        } catch (error) {
            console.error('❌ Status update error:', error.message)
            const errorMsg = error.response?.data?.message || 'Failed to update order status'
            setNotification({ type: 'error', message: `❌ ${errorMsg}` })
            setTimeout(() => setNotification(null), 3000)
        } finally {
            setUpdating(null)
        }
    }

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        {/* NOTIFICATION */}
                        {notification && (
                            <div className={`alert alert-${notification.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show mb-4`} role="alert">
                                <AlertCircle size={16} className="d-inline mr-2" />
                                {notification.message}
                                <button type="button" className="close" onClick={() => setNotification(null)}>&times;</button>
                            </div>
                        )}

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
                                                    <button
                                                        onClick={() => handleStatusUpdate(item, 'Packed')}
                                                        disabled={updating === (item.id || item._id)}
                                                        className="btn btn-sm btn-info px-3 rounded-pill"
                                                        title="Update order status to Packed"
                                                    >
                                                        {updating === (item.id || item._id) ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                                                                Updating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Truck size={14} className="mr-1"/> Ship
                                                            </>
                                                        )}
                                                    </button>
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