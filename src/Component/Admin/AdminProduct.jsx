import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useToast } from '../ToastNotification';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav';
import { deleteProduct, getProduct } from '../../Store/ActionCreaters/ProductActionCreators';
import { motion } from 'framer-motion';
import { Plus, Edit3, Trash2, LayoutGrid, AlertTriangle, CheckCircle, Search, Package } from 'lucide-react';
import { getSocket } from './socket';
import './SystemControlCenter.css';

export default function AdminProduct() {
    const toast = useToast();
    const productData = useSelector((state) => state.ProductStateData);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showAlert, setShowAlert] = useState(false);
    // Bulk selection state
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    // Socket ref to persist across renders
    const socketRef = useRef();

    // Always fetch products on mount
    useEffect(() => {
        dispatch(getProduct());
        // Setup socket only once
        if (!socketRef.current) {
            const socket = getSocket('admin-dashboard');
            socketRef.current = socket;
            const handleDashboardUpdate = () => {
                dispatch(getProduct());
            };
            socket.on('dashboardUpdate', handleDashboardUpdate);
        }
        // No cleanup to keep socket persistent for admin
    }, [dispatch]);

    // FIX: Mapping MongoDB _id to table data
    const rows = productData?.map((item) => ({
        ...item, 
        id: item._id || item.id 
    })) || []

    const filteredRows = useMemo(() => {
        let result = [...rows]
        if (searchTerm.trim()) {
            const lowerQuery = searchTerm.toLowerCase()
            result = result.filter(r => 
                (r.name && r.name.toLowerCase().includes(lowerQuery)) ||
                (r.brand && r.brand.toLowerCase().includes(lowerQuery)) ||
                (r.maincategory && r.maincategory.toLowerCase().includes(lowerQuery))
            )
        }
        return result
    }, [rows, searchTerm])

    const handleProductSelect = (id) => {
        setSelectedProducts((prev) =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        )
    }
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectAll(true)
            setSelectedProducts(filteredRows.map(r => r.id))
        } else {
            setSelectAll(false)
            setSelectedProducts([])
        }
    }
    const handleBulkDelete = () => {
        if (selectedProducts.length === 0) {
            toast.error('Select at least one product!', 3500);
            return;
        }
        toast.warning(`Deleting ${selectedProducts.length} products...`, 2500);
        selectedProducts.forEach(id => dispatch(deleteProduct({id})));
        setTimeout(() => {
            dispatch(getProduct());
            setSelectedProducts([]);
            setSelectAll(false);
            toast.success('Products deleted successfully!', 3500);
        }, 900);
    }

    return (
        <div className="lux-admin-page" style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid px-lg-4 py-4">
                    
                    {/* Luxury Header Banner */}
                    <motion.div 
                        className="lux-banner mb-4"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="lux-banner-content">
                            <div>
                                <div className="lux-eyebrow"><Package size={14} className="mr-1"/> Inventory</div>
                                <h1 className="lux-banner-title">Product <span>Catalog</span></h1>
                                <p className="lux-banner-sub">Manage boutique listings, pricing, and stock status.</p>
                            </div>
                            <div className="lux-banner-stats">
                                <div className="lux-stat-box">
                                    <span>Total Products</span>
                                    <strong>{filteredRows.length}</strong>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                        <div className="w-100">
                        <motion.div 
                            initial={{opacity:0, y:20}} 
                            animate={{opacity:1, y:0}} 
                            transition={{ delay: 0.2 }}
                            className="lux-card"
                        >
                            {/* Toolbar: Search, Bulk Delete & Add */}
                            <div className="lux-toolbar">
                                <div className="lux-search-box">
                                    <Search size={16} className="lux-search-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Search by name, brand or category..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                
                                <div className="d-flex gap-2 flex-wrap">
                                    {selectedProducts.length > 0 && (
                                        <button className="lux-btn-add lux-btn-bulk" onClick={handleBulkDelete}>
                                            <Trash2 size={16} className="mr-1" /> Remove ({selectedProducts.length})
                                        </button>
                                    )}
                                    <Link to="/admin-add-product" className="lux-btn-add">
                                        <Plus size={16} className="mr-1"/> NEW PRODUCT
                                    </Link>
                                </div>
                            </div>
                            <div className="lux-table-responsive">
                                <table className="lux-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}>
                                                <input type="checkbox" checked={selectAll && filteredRows.length > 0} onChange={handleSelectAll} />
                                            </th>
                                            <th>Design</th>
                                            <th>Product Identity</th>
                                            <th>Collection</th>
                                            <th>Label</th>
                                            <th>Value</th>
                                            <th>Stock</th>
                                            <th>Pricing Tier</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRows.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" className="text-center py-5">
                                                    <div className="text-muted d-flex flex-column align-items-center">
                                                        <LayoutGrid size={32} className="mb-2 opacity-50" />
                                                        <span>No products found matching your criteria.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                        filteredRows.map((row) => (
                                            <tr key={row.id} className={`lux-table-row ${selectedProducts.includes(row.id) ? 'lux-row-selected' : ''}`}>
                                                <td>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedProducts.includes(row.id)} 
                                                        onChange={() => handleProductSelect(row.id)} 
                                                    />
                                                </td>
                                                <td><img src={row.pic1} height="50px" width="50px" style={{objectFit:'cover', borderRadius:'10px'}} alt="" /></td>
                                                <td className="font-weight-bold color-ink">{row.name}</td>
                                                <td className="color-muted">{row.maincategory}</td>
                                                <td className="color-muted">{row.brand}</td>
                                                <td><strong className="lux-price-tag">₹{row.finalprice}</strong></td>
                                                <td>
                                                    {Number(row.stock) <= 5 ? (
                                                        <span className="lux-badge lux-badge-danger d-inline-flex align-items-center"><AlertTriangle size={12} className="mr-1" /> {row.stock || 0} Low</span>
                                                    ) : (
                                                        <span className="lux-badge lux-badge-success d-inline-flex align-items-center"><CheckCircle size={12} className="mr-1" /> {row.stock || 0}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="lux-badge lux-badge-secondary">Retail</span>
                                                    {Number(row.baseprice) > 0 && Number(row.finalprice) < Number(row.baseprice) && (
                                                        <span className="lux-badge lux-badge-warning ml-2">Wholesale</span>
                                                    )}
                                                </td>
                                                <td className="text-right">
                                                    <div className="lux-action-cell">
                                                    <button className="lux-btn-edit" onClick={() => navigate("/admin-update-product/" + row.id)} title="Edit Product">
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button className="lux-btn-delete" onClick={() => {
                                                        if(!window.confirm(`Delete product "${row.name}"?`)) return;
                                                        toast.warning('Deleting product...', 2000);
                                                        dispatch(deleteProduct({id: row.id}));
                                                        setTimeout(() => {
                                                            dispatch(getProduct());
                                                            toast.success('Product deleted successfully!', 3500);
                                                        }, 900);
                                                    }} title="Delete Product">
                                                        <Trash2 size={14} />
                                                    </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
            {/* Luxury Styles Embedded */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@400;500;600;700&display=swap');
                .lux-admin-page { font-family: 'Jost', sans-serif; }
                .lux-banner { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 24px; padding: 32px 40px; color: white; box-shadow: 0 20px 40px rgba(15,23,42,0.12); border: 1px solid rgba(212,175,55,0.2); }
                .lux-banner-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
                .lux-eyebrow { display: inline-flex; align-items: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #D4AF37; font-weight: 600; margin-bottom: 8px; }
                .lux-banner-title { font-family: 'Playfair Display', serif; font-size: clamp(24px, 3vw, 36px); font-weight: 800; color: #ffffff; margin: 0 0 4px; }
                .lux-banner-title span { color: #D4AF37; }
                .lux-banner-sub { color: #94a3b8; margin: 0; font-size: 14px; }
                .lux-banner-stats { display: flex; gap: 16px; }
                .lux-stat-box { background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05)); border: 1px solid rgba(212,175,55,0.3); border-radius: 16px; padding: 12px 20px; display: flex; flex-direction: column; }
                .lux-stat-box span { font-size: 11px; text-transform: uppercase; color: #D4AF37; letter-spacing: 0.5px; }
                .lux-stat-box strong { font-size: 24px; font-weight: 700; color: #fff; line-height: 1.2; }
                .lux-card { background: #fff; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.04); border: 1px solid rgba(212,175,55,0.1); overflow: hidden; }
                .lux-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; padding: 24px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
                .lux-search-box { position: relative; flex: 1; min-width: 260px; max-width: 400px; }
                .lux-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .lux-search-box input { width: 100%; padding: 10px 16px 10px 40px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; transition: all 0.2s; outline: none; }
                .lux-search-box input:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
                .lux-btn-add { display: inline-flex; align-items: center; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #D4AF37; padding: 10px 20px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-decoration: none; transition: all 0.3s ease; border: 1px solid #0f172a; cursor: pointer;}
                .lux-btn-add:hover { background: #fff; color: #0f172a; border-color: #0f172a; transform: translateY(-2px); box-shadow: 0 8px 16px rgba(15,23,42,0.15); }
                .lux-btn-bulk { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
                .lux-btn-bulk:hover { background: #ef4444; color: #fff; border-color: #ef4444; }
                .lux-table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
                .lux-table { width: 100%; border-collapse: collapse; min-width: 900px; }
                .lux-table th { background: #fff; padding: 16px 24px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; text-align: left; }
                .lux-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-size: 14px; }
                .lux-table-row:hover td { background: #fafbfc; }
                .lux-row-selected td { background: #eff6ff !important; }
                .lux-price-tag { color: #0f766e; }
                .color-ink { color: #0f172a; }
                .color-muted { color: #64748b; }
                .lux-badge { display: inline-flex; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                .lux-badge-danger { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
                .lux-badge-success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
                .lux-badge-warning { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
                .lux-badge-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
                .lux-action-cell { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
                .lux-btn-edit, .lux-btn-delete { width: 32px; height: 32px; border-radius: 8px; border: 1px solid transparent; background: #f8fafc; color: #94a3b8; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .lux-btn-edit:hover { background: #eff6ff; color: #3b82f6; border-color: #bfdbfe; }
                .lux-btn-delete:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }
                @media (max-width: 768px) { .lux-table { min-width: 100%; } .lux-banner { padding: 24px; } .lux-toolbar { flex-direction: column; align-items: stretch; } .lux-search-box { max-width: 100%; } .lux-btn-add { justify-content: center; width: 100%; } }
            `}} />
        </div>
    )
}