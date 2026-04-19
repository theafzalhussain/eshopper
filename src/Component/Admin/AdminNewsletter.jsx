import React, { useEffect, useMemo, useState } from 'react'
import { useToast } from '../ToastNotification'
import { useSelector, useDispatch } from 'react-redux'
import LefNav from './LefNav'
import { getNewslatter, deleteNewslatter } from '../../Store/ActionCreaters/NewslatterActionCreators'
import { Send, Trash2, Search, Mail } from 'lucide-react'
import { motion } from 'framer-motion'
import './SystemControlCenter.css'

export default function AdminNewsletter() {
    const newsletters = useSelector((state) => state.NewslatterStateData)
    const dispatch = useDispatch()
    const toast = useToast()
    const [searchTerm, setSearchTerm] = useState('')

    const filteredNewsletters = useMemo(() => {
        let result = newsletters || []
        if (searchTerm.trim()) {
            const lowerQuery = searchTerm.toLowerCase()
            result = result.filter(n => n.email && n.email.toLowerCase().includes(lowerQuery))
        }
        return result
    }, [newsletters, searchTerm])

    useEffect(() => {
        dispatch(getNewslatter())
    }, [dispatch])

    const handleDelete = (id) => {
        toast.info("Removing subscriber...", 1200)
        dispatch(deleteNewslatter({ id }))
        setTimeout(() => {
            dispatch(getNewslatter())
            toast.success("Subscriber removed successfully!", 2000)
        }, 1200)
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
                                <div className="lux-eyebrow"><Send size={14} className="mr-1"/> Audience</div>
                                <h1 className="lux-banner-title">Subscribers <span>List</span></h1>
                                <p className="lux-banner-sub">Manage email subscribers for boutique newsletters.</p>
                            </div>
                            <div className="lux-banner-stats">
                                <div className="lux-stat-box">
                                    <span>Total Audience</span>
                                    <strong>{filteredNewsletters.length}</strong>
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
                            {/* Toolbar: Search */}
                            <div className="lux-toolbar">
                                <div className="lux-search-box">
                                    <Search size={16} className="lux-search-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Search subscribers by email..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            {/* Responsive Table */}
                            <div className="lux-table-responsive">
                                <table className="lux-table">
                                    <thead>
                                        <tr>
                                            <th>Email Address</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredNewsletters.length === 0 ? (
                                            <tr>
                                                <td colSpan="2" className="text-center py-5">
                                                    <div className="text-muted d-flex flex-column align-items-center">
                                                        <Mail size={32} className="mb-2 opacity-50" />
                                                        <span>No subscribers found matching your criteria.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                        filteredNewsletters.map((item, index) => (
                                            <tr key={item.id || item._id || index} className="lux-table-row">
                                                <td className="font-weight-bold color-ink">{item.email}</td>
                                                <td className="text-right">
                                                    <div className="lux-action-cell">
                                                        <button 
                                                            className="lux-btn-delete" 
                                                            onClick={() => { if(window.confirm(`Remove ${item.email} from list?`)) handleDelete(item.id || item._id) }}
                                                            title="Delete Subscriber"
                                                        >
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
                .lux-table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
                .lux-table { width: 100%; border-collapse: collapse; min-width: 400px; }
                .lux-table th { background: #fff; padding: 16px 24px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; text-align: left; }
                .lux-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-size: 14px; }
                .lux-table-row:hover td { background: #fafbfc; }
                .color-ink { color: #0f172a; }
                .lux-action-cell { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
                .lux-btn-delete { width: 32px; height: 32px; border-radius: 8px; border: 1px solid transparent; background: #f8fafc; color: #94a3b8; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .lux-btn-delete:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }
                @media (max-width: 768px) { .lux-table { min-width: 100%; } .lux-banner { padding: 24px; } .lux-toolbar { flex-direction: column; align-items: stretch; } .lux-search-box { max-width: 100%; } }
            `}} />
        </div>
    )
}