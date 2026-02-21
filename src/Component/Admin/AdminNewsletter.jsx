import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import LefNav from './LefNav'
import { getNewslatter, deleteNewslatter } from '../../Store/ActionCreaters/NewslatterActionCreators'
import { Send, Trash2 } from 'lucide-react'

export default function AdminNewsletter() {
    const newsletters = useSelector((state) => state.NewslatterStateData)
    const dispatch = useDispatch()

    useEffect(() => { 
        dispatch(getNewslatter()) 
    }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <div className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <h4 className="font-weight-bold mb-4 d-flex align-items-center"><Send className="mr-2 text-info"/> Subscribers List</h4>
                            <div className="table-responsive">
                                <table className="table">
                                    <thead className="bg-light small">
                                        <tr>
                                            <th>Email Address</th>
                                            <th className="text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {newsletters.map((item, index) => (
                                            <tr key={index}>
                                                <td className="font-weight-bold p-3">{item.email}</td>
                                                <td className="text-right align-middle">
                                                    <button onClick={() => dispatch(deleteNewslatter({id: item.id || item._id}))} className="btn btn-sm btn-outline-danger px-3 rounded-pill">
                                                        <Trash2 size={14}/> Remove
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