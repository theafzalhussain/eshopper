import React from 'react'
import './Spinner.css'

export default function Spinner() {
    return (
        <div className="premium-spinner-overlay">
            <div className="spinner-container">
                <div className="spinner-ring"></div>
                <p className="spinner-text">Syncing your data...</p>
            </div>
        </div>
    )
}
