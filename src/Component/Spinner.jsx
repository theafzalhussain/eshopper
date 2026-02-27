import React from 'react'
import { motion } from 'framer-motion'
import './Spinner.css'

export default function Spinner() {
    return (
        <div className="premium-spinner-overlay">
            <div className="spinner-container">
                {/* Ultra Premium Rotating Icon */}
                <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }} 
                    className="ultra-spinner-icon"
                >
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 19.07L16.24 16.24M19.07 4.93L16.24 7.76M4.93 19.07L7.76 16.24M4.93 4.93L7.76 7.76" 
                              stroke="#17a2b8" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"/>
                    </svg>
                </motion.div>

                {/* Elegant Text with Fade Animation */}
                <motion.h4 
                    className="spinner-title"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    Updating Your Profile
                </motion.h4>
                
                <motion.p 
                    className="spinner-subtitle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    SYNCING DATA WITH CLOUD • PLEASE WAIT
                </motion.p>
            </div>
        </div>
    )
}
