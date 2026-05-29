import React, { useState } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, AlertCircle, CheckCircle2, Loader } from 'lucide-react'
import { BASE_URL } from '../constants'
import { useToast } from './ToastNotification'
import '../styles/ReturnRequestForm.css'

const ReturnRequestForm = ({ order, userId, isOpen, onClose, onSuccess }) => {
    const { showToast } = useToast()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        reason: '',
        condition: 'OPENED_UNUSED',
        description: ''
    })

    const returnReasons = [
        { value: 'DEFECTIVE', label: '❌ Product Defective' },
        { value: 'NOT_AS_DESCRIBED', label: '📸 Not As Described' },
        { value: 'DAMAGED', label: '📦 Damaged in Shipping' },
        { value: 'WRONG_ITEM', label: '🔄 Wrong Item Received' },
        { value: 'QUALITY_ISSUE', label: '⚠️ Quality Issue' },
        { value: 'SIZE_FIT', label: '📐 Size/Fit Issue' },
        { value: 'CHANGED_MIND', label: '💭 Changed Mind' },
        { value: 'OTHER', label: '❓ Other' }
    ]

    const conditionOptions = [
        { value: 'UNOPENED', label: 'Unopened' },
        { value: 'OPENED_UNUSED', label: 'Opened but Unused' },
        { value: 'USED', label: 'Used' },
        { value: 'DAMAGED', label: 'Damaged' }
    ]

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.reason || !formData.condition) {
            showToast('Please fill all fields', 'error')
            return
        }

        setLoading(true)
        try {
            const response = await axios.post(
                `${BASE_URL}/api/orders/${order.orderId}/return`,
                {
                    ...formData,
                    userId,
                    userid: userId
                }
            )

            if (response.data.success) {
                showToast('Return request submitted successfully!', 'success')
                setFormData({ reason: '', condition: 'OPENED_UNUSED', description: '' })
                onSuccess && onSuccess()
                setTimeout(onClose, 1500)
            }
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to submit return request', 'error')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="rrf-overlay" onClick={onClose}>
                <motion.div
                    className="rrf-modal"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Header */}
                    <div className="rrf-header">
                        <div className="rrf-title-group">
                            <h2 className="rrf-title">Return Request</h2>
                            <p className="rrf-subtitle">
                                Order {order.orderId} • ₹{order.finalAmount}
                            </p>
                        </div>
                        <button className="rrf-close" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* Info Banner */}
                    <div className="rrf-info-banner">
                        <AlertCircle size={18} className="rrf-info-icon" />
                        <div>
                            <p className="rrf-info-title">Return Within 7 Days</p>
                            <p className="rrf-info-text">
                                Complete the return process and get your refund within 24 hours of marking item received
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="rrf-form">
                        {/* Reason Selection */}
                        <div className="rrf-field">
                            <label className="rrf-label">Why do you want to return? *</label>
                            <div className="rrf-reason-grid">
                                {returnReasons.map((reason) => (
                                    <button
                                        key={reason.value}
                                        type="button"
                                        className={`rrf-reason-btn ${formData.reason === reason.value ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, reason: reason.value })}
                                    >
                                        {reason.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Product Condition */}
                        <div className="rrf-field">
                            <label className="rrf-label">Product Condition *</label>
                            <div className="rrf-condition-grid">
                                {conditionOptions.map((condition) => (
                                    <label
                                        key={condition.value}
                                        className={`rrf-condition-option ${formData.condition === condition.value ? 'active' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="condition"
                                            value={condition.value}
                                            checked={formData.condition === condition.value}
                                            onChange={(e) =>
                                                setFormData({ ...formData, condition: e.target.value })
                                            }
                                        />
                                        <span className="rrf-condition-text">{condition.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="rrf-field">
                            <label className="rrf-label">Additional Details</label>
                            <textarea
                                className="rrf-textarea"
                                placeholder="Please describe any issues or additional information (optional)..."
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                rows={4}
                            />
                        </div>

                        {/* Process Info */}
                        <div className="rrf-process-timeline">
                            <div className="rrf-step">
                                <div className="rrf-step-number">1</div>
                                <div className="rrf-step-content">
                                    <p className="rrf-step-title">Submit Request</p>
                                    <p className="rrf-step-desc">Admin reviews your return request</p>
                                </div>
                            </div>
                            <div className="rrf-step-divider"></div>
                            <div className="rrf-step">
                                <div className="rrf-step-number">2</div>
                                <div className="rrf-step-content">
                                    <p className="rrf-step-title">Pickup Scheduled</p>
                                    <p className="rrf-step-desc">Arrange item pickup</p>
                                </div>
                            </div>
                            <div className="rrf-step-divider"></div>
                            <div className="rrf-step">
                                <div className="rrf-step-number">3</div>
                                <div className="rrf-step-content">
                                    <p className="rrf-step-title">Item Received</p>
                                    <p className="rrf-step-desc">Admin inspects and receives item</p>
                                </div>
                            </div>
                            <div className="rrf-step-divider"></div>
                            <div className="rrf-step">
                                <div className="rrf-step-number">4</div>
                                <div className="rrf-step-content">
                                    <p className="rrf-step-title">Refund Processed</p>
                                    <p className="rrf-step-desc">Within 24 hours of item received</p>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="rrf-actions">
                            <button
                                type="button"
                                className="rrf-btn-cancel"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <motion.button
                                type="submit"
                                className="rrf-btn-submit"
                                disabled={loading || !formData.reason}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {loading ? (
                                    <>
                                        <Loader size={18} className="animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Submit Return Request
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </form>

                    {/* Terms */}
                    <div className="rrf-terms">
                        <p>
                            By submitting this return request, you agree to our{' '}
                            <a href="/return-policy">Return Policy</a> and acknowledge the
                            return process timeline
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

export default ReturnRequestForm
