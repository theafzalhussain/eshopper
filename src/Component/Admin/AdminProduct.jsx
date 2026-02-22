import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DataGrid } from '@mui/x-data-grid';
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

    // FIX: Mapping MongoDB _id to DataGrid 'id'
    const rows = productData?.map((item) => ({
        ...item, 
        id: item._id || item.id 
    })) || []

    const columns = [
        { field: 'pic1', headerName: 'Design', width: 100, renderCell: (p) => <img src={p.value} height="50px" width="50px" style={{objectFit:'cover', borderRadius:'10px'}} alt="" /> },
        { field: 'name', headerName: 'Product Title', width: 220, renderCell: (p) => <span className="font-weight-bold">{p.value}</span> },
        { field: 'maincategory', headerName: 'Collection', width: 130 },
        { field: 'brand', headerName: 'Label', width: 100 },
        { field: 'finalprice', headerName: 'Value', width: 100, renderCell: (p) => <strong className="text-info">₹{p.value}</strong> },
        {
            field: "actions", headerName: "System Actions", width: 180,
            renderCell: ({ row }) => (
                <div className="d-flex align-items-center">
                    {/* Ye Edit Button aapka Naya Premium Form kholega */}
                    <button className="btn btn-info-soft rounded-circle mr-3" onClick={() => navigate("/admin-update-product/" + row.id)}>
                        <Edit3 size={16} />
                    </button>
                    <button className="btn btn-danger-soft rounded-circle" onClick={() => { if(window.confirm("Overwrite: Delete record?")) dispatch(deleteProduct({id: row.id})) }}>
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        },
    ];

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
                            <div style={{ height: 600, width: '100%' }}>
                                <DataGrid rows={rows} columns={columns} pageSize={10} disableSelectionOnClick className="premium-grid" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
            <style>{`.rounded-3xl{border-radius:28px !important} .btn-info-soft{background:#e0f7fa; color:#17a2b8} .btn-danger-soft{background:#fff1f0; color:#ff4d4f} .premium-grid{border:none !important}`}</style>
        </div>
    )
}