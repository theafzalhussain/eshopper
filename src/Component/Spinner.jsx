import React, { memo } from 'react'
import { motion } from 'framer-motion'
import './Spinner.css'

const Spinner = ({ 
    title = "Curating Your Experience", 
    subtitle = "SECURE CONNECTION • PLEASE WAIT" 
}) => {
    return (
        <div className="lux-global-spinner-overlay">
            <div className="lux-global-spinner-container">
                {/* Luxury Multi-Ring Animation */}
                <div className="lux-spinner-graphics">
                    <motion.div 
                        animate={{ rotate: 360 }} 
                        transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }} 
                        className="lux-spinner-ring lux-ring-outer"
                    />
                    <motion.div 
                        animate={{ rotate: -360 }} 
                        transition={{ repeat: Infinity, duration: 3, ease: "linear" }} 
                        className="lux-spinner-ring lux-ring-inner"
                    />
                    <motion.div 
                        animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.6, 1, 0.6] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="lux-spinner-center"
                    >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="#D4AF37"/>
                        </svg>
                    </motion.div>
                </div>

                {/* Elegant Text with Fade Animation */}
                <motion.h4 
                    className="lux-global-spinner-title"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {title}
                </motion.h4>
                
                <motion.p 
                    className="lux-global-spinner-subtitle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                    {subtitle}
                </motion.p>
            </div>

            {/* Self-contained premium styling to guarantee luxury look everywhere */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@400;600;700&display=swap');
                
                .lux-global-spinner-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999; /* Ensure it stays on top of everything */
                    font-family: 'Jost', sans-serif;
                }
                .lux-global-spinner-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    background: linear-gradient(135deg, rgba(20, 25, 35, 0.85), rgba(10, 15, 25, 0.95));
                    padding: 45px 60px;
                    border-radius: 24px;
                    border: 1px solid rgba(212, 175, 55, 0.25);
                    box-shadow: 0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
                    text-align: center;
                }
                .lux-spinner-graphics {
                    position: relative;
                    width: 72px;
                    height: 72px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 28px;
                }
                .lux-spinner-ring {
                    position: absolute;
                    border-radius: 50%;
                    border: 2px solid transparent;
                }
                .lux-ring-outer {
                    width: 100%;
                    height: 100%;
                    border-top-color: #D4AF37;
                    border-right-color: rgba(212, 175, 55, 0.4);
                    opacity: 0.9;
                }
                .lux-ring-inner {
                    width: 65%;
                    height: 65%;
                    border-bottom-color: #b8860b;
                    border-left-color: rgba(184, 134, 11, 0.3);
                    opacity: 0.7;
                }
                .lux-spinner-center {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    filter: drop-shadow(0 0 10px rgba(212, 175, 55, 0.6));
                }
                .lux-global-spinner-title {
                    font-family: 'Playfair Display', serif;
                    color: #ffffff;
                    font-size: 22px;
                    font-weight: 600;
                    margin: 0 0 10px 0;
                    letter-spacing: 0.5px;
                }
                .lux-global-spinner-subtitle {
                    color: #D4AF37;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 3px;
                    margin: 0;
                    text-transform: uppercase;
                }
            `}} />
        </div>
    )
}

export default memo(Spinner);
