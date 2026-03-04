import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteSubcategory, getSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators';
import { motion } from 'framer-motion'
import { Edit3, Trash2, Plus, Grid } from 'lucide-react'

export default function AdminSubcategory() {
    const subcategory = useSelector((state) => state.SubcategoryStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => { dispatch(getSubcategory()) }, [dispatch])

    const rows = subcategory?.map((item) => ({ ...item, id: item.id || item._id })) || []

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-9">
                        <div className="bg-white p-4 shadow rounded-2xl">
                            <div className="d-flex justify-content-between mb-4">
                                <h4 className="font-weight-bold d-flex align-items-center mb-0"><Grid size={22} className="mr-2"/> Subcategories</h4>
                                <Link to="/admin-add-subcategory" className='btn btn-info px-4 rounded-pill font-weight-bold'>+ ADD NEW</Link>
                            </div>
                            <div style={{ overflowX: 'auto', width: '100%' }}>
                                <table className="table table-hover" style={{ minWidth: '700px' }}>
                                    <thead className="table-dark">
                                        <tr>
                                            <th>ID</th>
                                            <th>Subcategory</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.length ? rows.map((row) => (
                                            <tr key={row.id}>
                                                <td>{row.id}</td>
                                                <td className="font-weight-bold">{row.name}</td>
                                                <td>
                                                    <button className="btn btn-sm btn-info rounded-circle mr-2" onClick={() => navigate(`/admin-update-subcategory/${row.id}`)}>
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button className="btn btn-sm btn-danger rounded-circle" onClick={() => { if (window.confirm("Delete this subcategory?")) dispatch(deleteSubcategory({ id: row.id })) }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="3" className="text-center text-muted py-4">No subcategories found.</td>
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