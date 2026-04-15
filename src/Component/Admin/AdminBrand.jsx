import React, { useEffect } from 'react'
import { useToast } from '../ToastNotification'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteBrand, getBrand } from '../../Store/ActionCreaters/BrandActionCreators';
import { Tag, Edit, Trash2, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import './SystemControlCenter.css'

export default function AdminBrand() {
    const toast = useToast();
    const brand = useSelector((state) => state.BrandStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => { dispatch(getBrand()) }, [dispatch])
    const rows = brand?.map(item => ({ ...item, id: item.id || item._id })) || []

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid">
                    <div className="w-100">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white shadow-xl rounded-3xl p-4 border-0">
                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
                                <h4 className="font-weight-bold d-flex align-items-center mb-0"><Tag className="mr-2 text-info" /> Brand Catalog</h4>
                                <Link to="/admin-add-brand" className='btn btn-info rounded-pill px-4 shadow-sm font-weight-bold d-flex align-items-center'>
                                    <Plus size={16} className="mr-2" /> ADD BRAND
                                </Link>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead className="table-dark">
                                        <tr>
                                            <th>Brand ID</th>
                                            <th>Brand Name</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.length ? rows.map((row) => (
                                            <tr key={row.id}>
                                                <td>{row.id}</td>
                                                <td className="font-weight-bold">{row.name}</td>
                                                <td>
                                                    <button className="btn btn-sm btn-info rounded-circle mr-2" onClick={() => navigate(`/admin-update-brand/${row.id}`)}>
                                                        <Edit size={14} />
                                                    </button>
                                                    <button className="btn btn-sm btn-danger rounded-circle" onClick={async () => {
                                                        toast.info("Deleting brand...");
                                                        await dispatch(deleteBrand({ id: row.id }));
                                                        dispatch(getBrand());
                                                        toast.success("Brand deleted successfully!");
                                                    }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="3" className="text-center text-muted py-4">No brands found.</td>
                                            </tr>
                                        )}
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