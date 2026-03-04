import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteMaincategory, getMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators';
import { motion } from 'framer-motion'
import { Plus, Edit3, Trash2, Layers } from 'lucide-react'

export default function AdminMaincategory() {
    const maincategory = useSelector((state) => state.MaincategoryStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => { dispatch(getMaincategory()) }, [dispatch])

    const rows = maincategory?.map((item) => ({
        ...item,
        id: item.id || item._id // Atlas Compatibility
    })) || []

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            <div className="container-fluid px-lg-5">
                <div className="row">
                    <div className="col-lg-3"><LefNav /></div>
                    <div className="col-lg-9">
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-white shadow-xl rounded-2xl p-4 border-0">
                            <div className="d-flex justify-content-between mb-4">
                                <h4 className="font-weight-bold d-flex align-items-center"><Layers className="mr-2 text-info"/> Maincategories</h4>
                                <Link to="/admin-add-maincategory" className='btn btn-info rounded-pill px-4 shadow-sm font-weight-bold'><Plus size={18}/> ADD NEW</Link>
                            </div>
                            <div style={{ overflowX: 'auto', width: '100%' }}>
                                <table className="table table-hover" style={{ minWidth: '700px' }}>
                                    <thead className="table-dark">
                                        <tr>
                                            <th>ID</th>
                                            <th>Category Name</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.length ? rows.map((row) => (
                                            <tr key={row.id}>
                                                <td>{row.id}</td>
                                                <td className="font-weight-bold">{row.name}</td>
                                                <td>
                                                    <button className="btn btn-sm btn-info rounded-circle mr-2" onClick={() => navigate(`/admin-update-maincategory/${row.id}`)}>
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button className="btn btn-sm btn-danger rounded-circle" onClick={() => { if (window.confirm("Delete this main category?")) dispatch(deleteMaincategory({ id: row.id })) }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="3" className="text-center text-muted py-4">No main categories found.</td>
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