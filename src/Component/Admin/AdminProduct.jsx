import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteProduct, getProduct } from '../../Store/ActionCreaters/ProductActionCreators';
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'

export default function AdminProduct() {
    const product = useSelector((state) => state.ProductStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const columns = [
        { field: 'pic1', headerName: 'Image', width: 80, renderCell: ({ row }) => <img src={row.pic1} height="45px" width="45px" style={{objectFit:'cover', borderRadius:'8px'}} alt='' /> },
        { field: 'name', headerName: 'Product Name', width: 180, renderCell: ({row}) => <span className="small font-weight-bold">{row.name}</span> },
        { field: 'maincategory', headerName: 'Category', width: 110 },
        { field: 'brand', headerName: 'Brand', width: 100 },
        { field: 'finalprice', headerName: 'Price', width: 100, renderCell: ({ row }) => <span className="text-info font-weight-bold">₹{row.finalprice}</span> },
        { field: 'stock', headerName: 'Stock', width: 110, renderCell: ({row}) => <span className={`badge ${row.stock === 'In Stock' ? 'badge-success' : 'badge-danger'}`}>{row.stock}</span> },
        {
            field: "actions",
            headerName: "Actions",
            width: 150,
            renderCell: ({ row }) => (
                <div className="d-flex">
                    <button className="btn btn-sm btn-outline-info mr-2 rounded-circle" onClick={() => navigate("/admin-update-product/" + row.id)}><Edit size={14} /></button>
                    <button className="btn btn-sm btn-outline-danger rounded-circle" onClick={() => {if(window.confirm("Delete Product?")) dispatch(deleteProduct({ id: row.id }))}}><Trash2 size={14} /></button>
                </div>
            )
        },
    ];

    useEffect(() => { dispatch(getProduct()) }, [dispatch])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-4">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-2"><LefNav /></div>
                    <div className="col-lg-10">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-sm rounded-2xl p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h4 className="font-weight-bold">Inventory Management</h4>
                                <Link to="/admin-add-product" className='btn btn-info rounded-pill px-4 shadow-sm'><Plus size={18} className="mr-2"/> ADD PRODUCT</Link>
                            </div>
                            <div style={{ height: 600, width: '100%' }}>
                                <DataGrid rows={product} columns={columns} pageSize={10} disableSelectionOnClick density="comfortable" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-2xl { border-radius: 20px !important; }
                .MuiDataGrid-root { border: none !important; font-family: 'Inter', sans-serif !important; }
                .MuiDataGrid-columnHeaders { background-color: #fcfcfc; border-bottom: 2px solid #f0f0f0 !important; font-weight: 800 !important; }
            `}} />
        </div>
    )
}