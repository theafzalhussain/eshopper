import React, { useEffect } from 'react'
import { useToast } from '../ToastNotification'
import { useSelector, useDispatch } from 'react-redux'
import LefNav from './LefNav'
import { getNewslatter, deleteNewslatter } from '../../Store/ActionCreaters/NewslatterActionCreators'
import { Send, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import './SystemControlCenter.css'

export default function AdminNewsletter() {
    const newsletters = useSelector((state) => state.NewslatterStateData)
    const dispatch = useDispatch()
    const toast = useToast()

    useEffect(() => {
        dispatch(getNewslatter())
    }, [dispatch])

    const handleDelete = (id) => {
        toast.info("Removing subscriber...", 1200)
        dispatch(deleteNewslatter({ id }))
        setTimeout(() => {
            dispatch(getNewslatter())
            toast.success("Subscriber removed successfully!", 2000)
        }, 1200)
    }

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid">
                    <div className="w-100">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <h4 className="font-weight-bold mb-4 d-flex align-items-center"><Send className="mr-2 text-info"/> Subscribers List ({newsletters.length})</h4>
                            <div className="table-responsive">
                                <table className="table">
                                    <thead className="bg-light small">
                                        <tr>
                                            <th>Email Address</th>
                                            <th className="text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {newsletters && newsletters.length > 0 ? newsletters.map((item, index) => (
                                            <tr key={index}>
                                                <td className="font-weight-bold p-3">{item.email}</td>
                                                <td className="text-right align-middle">
                                                    <button onClick={() => handleDelete(item.id || item._id)} className="btn btn-sm btn-outline-danger px-3 rounded-pill">
                                                        <Trash2 size={14}/> <span className="d-none d-sm-inline">Remove</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : <tr><td colSpan="2" className="text-center p-5 text-muted">No subscribers found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}