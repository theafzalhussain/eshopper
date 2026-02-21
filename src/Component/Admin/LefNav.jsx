import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
    Home, Users, Layers, Grid, Tag, 
    ShoppingBag, MessageSquare, Send, CheckSquare 
} from 'lucide-react'

export default function LefNav() {
    const location = useLocation()
    const isActive = (path) => location.pathname === path

    const menuItems = [
        { name: "Dashboard", path: "/admin-home", icon: <Home size={18}/> },
        { name: "Users", path: "/admin-user", icon: <Users size={18}/> },
        { name: "Maincategories", path: "/admin-maincategory", icon: <Layers size={18}/> },
        { name: "Subcategories", path: "/admin-subcategory", icon: <Grid size={18}/> },
        { name: "Brands", path: "/admin-brand", icon: <Tag size={18}/> },
        { name: "Products", path: "/admin-product", icon: <ShoppingBag size={18}/> },
        { name: "Contact Us", path: "/admin-contact", icon: <MessageSquare size={18}/> },
        { name: "Newsletters", path: "/admin-newsletter", icon: <Send size={18}/> },
        { name: "Checkouts", path: "/admin-checkout", icon: <CheckSquare size={18}/> },
    ]

    return (
        <div className="admin-sidebar py-3">
            <div className="list-group list-group-flush rounded-2xl overflow-hidden shadow-sm border">
                {menuItems.map((item, index) => (
                    <Link 
                        key={index}
                        to={item.path} 
                        className={`list-group-item list-group-item-action d-flex align-items-center py-3 border-0 transition ${isActive(item.path) ? 'bg-info text-white shadow-sm' : 'text-secondary'}`}
                    >
                        <span className="mr-3">{item.icon}</span>
                        <span className="font-weight-bold small text-uppercase" style={{letterSpacing:'1px'}}>{item.name}</span>
                        {isActive(item.path) && (
                            <motion.div layoutId="sidebar-dot" className="ml-auto bg-white rounded-circle" style={{width:'6px', height:'6px'}} />
                        )}
                    </Link>
                ))}
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .admin-sidebar .list-group-item:hover:not(.bg-info) {
                    background-color: #f0faff;
                    color: #17a2b8;
                    padding-left: 25px;
                }
                .transition { transition: 0.3s all ease-in-out; }
            `}} />
        </div>
    )
}