import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import LefNav from './LefNav'
import { deleteContact, getContact } from '../../Store/ActionCreaters/ContactActionCreators'
import { motion } from 'framer-motion'
import { MessageSquare, Trash2, Mail } from 'lucide-react'

export default function AdminContact() {
    const contacts = useSelector((state) => state.ContactStateData)
    const dispatch = useDispatch()

    useEffect(() => { 
        dispatch(getContact()) 
    }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2 mb-4"><LefNav /></div>
                    <div className="col-lg-10">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white shadow-lg rounded-2xl p-4 overflow-hidden border-0">
                            <h4 className="font-weight-bold mb-4 d-flex align-items-center text-dark">
                                <MessageSquare className="mr-2 text-info" /> Customer Queries ({contacts.length})
                            </h4>
                            <div className="table-responsive">
                                <table className="table table-hover border-0">
                                    <thead className="bg-light text-secondary uppercase small">
                                        <tr>
                                            <th>Name</th>
                                            <th>Contact Info</th>
                                            <th>Subject</th>
                                            <th>Message</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contacts && contacts.length > 0 ? contacts.map((item, index) => (
                                            <tr key={index} className="border-bottom">
                                                <td className="align-middle font-weight-bold">{item.name}</td>
                                                <td className="align-middle small">
                                                    <div className='d-flex align-items-center'><Mail size={12} className="mr-1"/> {item.email}</div>
                                                    <div>📞 {item.phone}</div>
                                                </td>
                                                <td className="align-middle text-muted small">{item.subject}</td>
                                                <td className="align-middle small" style={{maxWidth: "300px"}}>{item.message}</td>
                                                <td className="align-middle text-right">
                                                    <button onClick={() => {if(window.confirm("Delete?")) dispatch(deleteContact({id: item.id || item._id}))}} className="btn btn-sm text-danger">
                                                        <Trash2 size={18}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : <tr><td colSpan="5" className="text-center p-5 text-muted">No messages found in database.</td></tr>}
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