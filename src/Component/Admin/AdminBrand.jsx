import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteBrand, getBrand } from '../../Store/ActionCreaters/BrandActionCreators';
import { Tag, Edit, Trash2, Plus } from 'lucide-react'

export default function AdminBrand() {
    const brand = useSelector((state) => state.BrandStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => { dispatch(getBrand()) }, [dispatch])
    const rows = brand?.map(item => ({ ...item, id: item.id || item._id })) || []

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <div className="bg-white shadow-xl rounded-3xl p-4 border-0">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h4 className="font-weight-bold d-flex align-items-center mb-0"><Tag className="mr-2 text-info" /> Brand Catalog</h4>
                                <Link to="/admin-add-brand" className='btn btn-info rounded-pill px-4 shadow-sm font-weight-bold d-flex align-items-center'>
                                    <Plus size={16} className="mr-2" /> ADD BRAND
                                </Link>
                            </div>

                            <div style={{ overflowX: 'auto', width: '100%' }}>
                                <table className="table table-hover" style={{ minWidth: '700px' }}>
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
                                                    <button className="btn btn-sm btn-danger rounded-circle" onClick={() => { if (window.confirm("Delete this brand?")) dispatch(deleteBrand({ id: row.id })) }}>
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}