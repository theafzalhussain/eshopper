import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'

export default function BuyerProfile({ user }) {
    const profileDetails = [
        { label: 'Full Name', value: user.name || 'N/A', icon: '👤' },
        { label: 'Username', value: user.username || 'N/A', icon: '@' },
        { label: 'Email Address', value: user.email || 'N/A', icon: '📧' },
        { label: 'Phone Number', value: user.phone || 'N/A', icon: '📱' },
        { label: 'Street Address', value: user.addressline1 || 'N/A', icon: '📍' },
        { label: 'City', value: user.city || 'N/A', icon: '🏙️' },
        { label: 'State', value: user.state || 'N/A', icon: '🗺️' },
        { label: 'Postal Code', value: user.pin || 'N/A', icon: '📬' }
    ]

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.06,
                delayChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, x: -15 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
    }

    return (
        <div>
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="row"
            >
                {profileDetails.map((detail, idx) => (
                    <motion.div 
                        key={idx}
                        variants={itemVariants}
                        className="col-12 col-md-6 mb-3"
                    >
                        <motion.div
                            whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(212,175,55,0.15)' }}
                            className="p-4 rounded-2xl"
                            style={{
                                background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
                                border: '1.5px solid rgba(212,175,55,0.1)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'default'
                            }}
                        >
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#999', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
                                {detail.icon} {detail.label}
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0A0A0A', letterSpacing: '0.2px', wordBreak: 'break-word' }}>
                                {detail.value}
                            </div>
                        </motion.div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Action Button - Glass Morphism */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mt-6"
            >
                <Link 
                    to="/update-profile"
                    className="d-block w-100"
                    style={{ textDecoration: 'none' }}
                >
                    <motion.button
                        whileHover={{ 
                            scale: 1.02,
                            y: -2
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            width: '100%',
                            padding: '14px 24px',
                            background: 'linear-gradient(135deg, #17a2b8, #138496)',
                            color: '#fff',
                            border: '1.5px solid rgba(23,162,184,0.35)',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '14px',
                            letterSpacing: '0.5px',
                            cursor: 'pointer',
                            boxShadow: 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        ✏️ Update Profile Information
                    </motion.button>
                </Link>
            </motion.div>
        </div>
    )
}
