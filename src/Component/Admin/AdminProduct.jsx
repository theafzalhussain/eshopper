import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteProduct, getProduct } from '../../Store/ActionCreaters/ProductActionCreators';
import { motion } from 'framer-motion'
import { Plus, Edit3, Trash2, LayoutGrid } from 'lucide-react'

export default function AdminProduct() {
    const productData = useSelector((state) => state.ProductStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => { dispatch(getProduct()) }, [dispatch])

    // FIX: Mapping MongoDB _id to table data
    const rows = productData?.map((item) => ({
        ...item, 
        id: item._id || item.id 
    })) || []

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-white shadow-xl rounded-3xl p-4 border-0">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h4 className="font-weight-bold d-flex align-items-center"><LayoutGrid className="mr-2 text-info"/> Product Catalog</h4>
                                <Link to="/admin-add-product" className='btn btn-dark rounded-pill px-4 shadow-sm font-weight-bold'><Plus size={16} className="mr-1"/> CREATE ENTRY</Link>
                            </div>
                            <div style={{ overflowX: 'auto', width: '100%' }}>
                                <table className="table table-hover" style={{ minWidth: '900px' }}>
                                    <thead className="table-dark">
                                        <tr>
                                            <th>Design</th>
                                            <th>Product Title</th>
                                            <th>Collection</th>
                                            <th>Label</th>
                                            <th>Value</th>
                                            <th>System Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => (
                                            <tr key={row.id}>
                                                <td><img src={row.pic1} height="50px" width="50px" style={{objectFit:'cover', borderRadius:'10px'}} alt="" /></td>
                                                <td className="font-weight-bold">{row.name}</td>
                                                <td>{row.maincategory}</td>
                                                <td>{row.brand}</td>
                                                <td><strong className="text-info">₹{row.finalprice}</strong></td>
                                                <td>
                                                    <button className="btn btn-sm btn-info rounded-circle mr-2" onClick={() => navigate("/admin-update-product/" + row.id)}>
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button className="btn btn-sm btn-danger rounded-circle" onClick={() => { if(window.confirm("Overwrite: Delete record?")) dispatch(deleteProduct({id: row.id})) }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
            <style>{`.rounded-3xl{border-radius:28px !important} .btn-info-soft{background:#e0f7fa; color:#17a2b8} .btn-danger-soft{background:#fff1f0; color:#ff4d4f} .premium-grid{border:none !important}`}</style>
        </div>
    )
}