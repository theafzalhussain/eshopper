import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteProduct, getProduct } from '../../Store/ActionCreaters/ProductActionCreators';
import { motion } from 'framer-motion'
import { Plus, Edit3, Trash2, LayoutGrid, AlertTriangle, CheckCircle } from 'lucide-react'

export default function AdminProduct() {
    const productData = useSelector((state) => state.ProductStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [showAlert, setShowAlert] = useState(false)
    // Bulk selection state
    const [selectedProducts, setSelectedProducts] = useState([])
    const [selectAll, setSelectAll] = useState(false)

    useEffect(() => { dispatch(getProduct()) }, [dispatch])

    // FIX: Mapping MongoDB _id to table data
    const rows = productData?.map((item) => ({
        ...item, 
        id: item._id || item.id 
    })) || []

    const handleProductSelect = (id) => {
        setSelectedProducts((prev) =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        )
    }
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectAll(true)
            setSelectedProducts(rows.map(r => r.id))
        } else {
            setSelectAll(false)
            setSelectedProducts([])
        }
    }
    const handleBulkDelete = () => {
        if (selectedProducts.length === 0) return alert('Select at least one product!')
        if (!window.confirm(`Delete ${selectedProducts.length} products? This cannot be undone!`)) return
        selectedProducts.forEach(id => dispatch(deleteProduct({id})))
        setSelectedProducts([])
        setSelectAll(false)
    }

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid px-lg-5">
                        <div className="w-100">
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-white shadow-xl rounded-3xl p-4 border-0">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h4 className="font-weight-bold d-flex align-items-center"><LayoutGrid className="mr-2 text-info"/> Product Catalog</h4>
                                <Link to="/admin-add-product" className='btn btn-dark rounded-pill px-4 shadow-sm font-weight-bold'><Plus size={16} className="mr-1"/> CREATE ENTRY</Link>
                            </div>
                            <div style={{ overflowX: 'auto', width: '100%' }}>
                                <table className="table table-hover" style={{ minWidth: '900px' }}>
                                    <thead className="table-dark">
                                        <tr>
                                            <th>
                                                <input type="checkbox" checked={selectAll && rows.length > 0} onChange={handleSelectAll} />
                                            </th>
                                            <th>Design</th>
                                            <th>Product Title</th>
                                            <th>Collection</th>
                                            <th>Label</th>
                                            <th>Value</th>
                                            <th>Stock</th>
                                            <th>Pricing Tier</th>
                                            <th>System Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => (
                                            <tr key={row.id} className={selectedProducts.includes(row.id) ? 'table-primary' : ''}>
                                                <td>
                                                    <input type="checkbox" checked={selectedProducts.includes(row.id)} onChange={() => handleProductSelect(row.id)} />
                                                </td>
                                                <td><img src={row.pic1} height="50px" width="50px" style={{objectFit:'cover', borderRadius:'10px'}} alt="" /></td>
                                                <td className="font-weight-bold">{row.name}</td>
                                                <td>{row.maincategory}</td>
                                                <td>{row.brand}</td>
                                                <td><strong className="text-info">₹{row.finalprice}</strong></td>
                                                <td>
                                                    {Number(row.stock) <= 5 ? (
                                                        <span className="badge badge-danger d-flex align-items-center"><AlertTriangle size={14} className="mr-1" /> {row.stock || 0} Low</span>
                                                    ) : (
                                                        <span className="badge badge-success d-flex align-items-center"><CheckCircle size={14} className="mr-1" /> {row.stock || 0}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="badge badge-secondary">Retail</span>
                                                    {Number(row.baseprice) > 0 && Number(row.finalprice) < Number(row.baseprice) && (
                                                        <span className="badge badge-warning ml-2">Wholesale</span>
                                                    )}
                                                </td>
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
                            {selectedProducts.length > 0 && (
                                <button className="btn btn-danger font-weight-bold mb-3 mr-3" onClick={handleBulkDelete}>
                                    <Trash2 size={16} className="mr-1" /> Bulk Delete ({selectedProducts.length})
                                </button>
                            )}
                        </motion.div>
                        </div>
                    </div>
                </div>
            <style>{`.rounded-3xl{border-radius:28px !important} .btn-info-soft{background:#e0f7fa; color:#17a2b8} .btn-danger-soft{background:#fff1f0; color:#ff4d4f} .premium-grid{border:none !important}`}</style>
        </div>
    )
}