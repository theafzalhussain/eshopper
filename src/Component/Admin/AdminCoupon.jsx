import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { TicketPercent, Plus, Trash2, Power, Save } from 'lucide-react'
import axios from 'axios'
import LefNav from './LefNav'
import { BASE_URL } from '../../constants'

const initialForm = {
    code: '',
    title: '',
    description: '',
    type: 'flat',
    value: 100,
    minCartValue: 1000,
    maxDiscount: 0,
    perUserOnce: false,
    totalUsageCap: 0,
    firstOrderOnly: false,
    isActive: true,
    startsAt: '',
    expiresAt: '',
}

export default function AdminCoupon() {
    const [coupons, setCoupons] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState(initialForm)
    const [error, setError] = useState('')

    const sortedCoupons = useMemo(() => {
        return [...coupons].sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')))
    }, [coupons])

    async function fetchCoupons() {
        setLoading(true)
        setError('')
        try {
            const res = await axios.get(`${BASE_URL}/coupon`)
            setCoupons(Array.isArray(res.data) ? res.data : [])
        } catch (e) {
            console.error('Fetch error:', e)
            setError('Failed to load coupons. Backend may be down.')
            setCoupons([])
        }
        setLoading(false)
    }

    async function createCoupon(e) {
        e.preventDefault()
        setSaving(true)
        setError('')
        try {
            await axios.post(`${BASE_URL}/coupon`, {
                ...form,
                code: String(form.code || '').trim().toUpperCase(),
                value: Number(form.value || 0),
                minCartValue: Number(form.minCartValue || 0),
                maxDiscount: Number(form.maxDiscount || 0),
                totalUsageCap: Number(form.totalUsageCap || 0),
                perUserOnce: Boolean(form.perUserOnce),
                firstOrderOnly: Boolean(form.firstOrderOnly),
                startsAt: form.startsAt || null,
                expiresAt: form.expiresAt || null,
            })
            setForm(initialForm)
            await fetchCoupons()
        } catch (e) {
            setError(e?.response?.data?.message || e?.response?.data?.error || 'Failed to create coupon.')
        }
        setSaving(false)
    }

    async function toggleActive(item) {
        try {
            await axios.put(`${BASE_URL}/coupon/${item.id || item._id}`, { isActive: !item.isActive })
            await fetchCoupons()
        } catch (e) {
            setError('Failed to update coupon status.')
        }
    }

    async function deleteCoupon(item) {
        if (!window.confirm(`Delete coupon ${item.code}?`)) return
        try {
            await axios.delete(`${BASE_URL}/coupon/${item.id || item._id}`)
            await fetchCoupons()
        } catch (e) {
            setError('Failed to delete coupon.')
        }
    }

    useEffect(() => {
        fetchCoupons()
    }, [])

    return (
        <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }} className='py-5'>
            <LefNav />
            <div className='admin-main-content'>
                <div className='container-fluid px-4'>
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className='mb-5'>
                        <div className='d-flex align-items-center mb-4'>
                            <div className='premium-icon-badge'>
                                <TicketPercent size={32} className='text-primary' />
                            </div>
                            <div className='ms-3'>
                                <h2 className='font-weight-bold mb-0'>Coupon Management</h2>
                                <small className='text-muted'>Create and manage discount coupons</small>
                            </div>
                        </div>
                    </motion.div>

                    {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='alert alert-premium mb-4' role='alert'>
                            <strong>Error!</strong> {error}
                        </motion.div>
                    )}

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='bg-white shadow-xl rounded-3xl p-5 border-0 premium-form-card mb-5'>
                        <h4 className='font-weight-bold mb-4'>📝 Create New Coupon</h4>
                        <form onSubmit={createCoupon}>
                            {/* SECTION 1: Basic Information */}
                            <div className='premium-form-section mb-5'>
                                <h5 className='font-weight-bold mb-4 section-header'>📝 Basic Information</h5>
                                <div className='row'>
                                    <div className='col-lg-4 col-md-6 col-sm-12 mb-4'>
                                        <label className='form-label-premium'>Coupon Code *</label>
                                        <input 
                                            type='text' 
                                            className='form-control form-control-premium' 
                                            placeholder='e.g., SAVE20' 
                                            value={form.code} 
                                            onChange={(e) => setForm({ ...form, code: e.target.value })} 
                                            required 
                                        />
                                        <small className='text-muted'>Unique identifier for the coupon (will be auto-converted to UPPERCASE)</small>
                                    </div>
                                    <div className='col-lg-4 col-md-6 col-sm-12 mb-4'>
                                        <label className='form-label-premium'>Title *</label>
                                        <input 
                                            type='text' 
                                            className='form-control form-control-premium' 
                                            placeholder='e.g., Summer Sale 20% Off' 
                                            value={form.title} 
                                            onChange={(e) => setForm({ ...form, title: e.target.value })} 
                                            required 
                                        />
                                        <small className='text-muted'>Display name for customers</small>
                                    </div>
                                    <div className='col-lg-4 col-md-6 col-sm-12 mb-4'>
                                        <label className='form-label-premium'>Description</label>
                                        <input 
                                            type='text' 
                                            className='form-control form-control-premium' 
                                            placeholder='e.g., Get 20% discount on all items' 
                                            value={form.description} 
                                            onChange={(e) => setForm({ ...form, description: e.target.value })} 
                                        />
                                        <small className='text-muted'>Brief description visible to customers</small>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: Discount Details */}
                            <div className='premium-form-section mb-5'>
                                <h5 className='font-weight-bold mb-4 section-header'>💰 Discount Details</h5>
                                <div className='row'>
                                    <div className='col-lg-3 col-md-6 col-sm-12 mb-4'>
                                        <label className='form-label-premium'>Type *</label>
                                        <select 
                                            className='form-control form-control-premium' 
                                            value={form.type} 
                                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                                        >
                                            <option value='flat'>Flat Amount (₹)</option>
                                            <option value='percent'>Percentage (%)</option>
                                        </select>
                                        <small className='text-muted'>Choose between fixed amount or percentage discount</small>
                                    </div>
                                    <div className='col-lg-3 col-md-6 col-sm-12 mb-4'>
                                        <label className='form-label-premium'>Value *</label>
                                        <input 
                                            type='number' 
                                            className='form-control form-control-premium' 
                                            placeholder='100' 
                                            value={form.value} 
                                            onChange={(e) => setForm({ ...form, value: e.target.value })} 
                                            required 
                                        />
                                        <small className='text-muted'>{form.type === 'percent' ? 'Percentage (0-100)' : 'Amount in Rupees'}</small>
                                    </div>
                                    <div className='col-lg-3 col-md-6 col-sm-12 mb-4'>
                                        <label className='form-label-premium'>Min Cart Value</label>
                                        <input 
                                            type='number' 
                                            className='form-control form-control-premium' 
                                            placeholder='1000' 
                                            value={form.minCartValue} 
                                            onChange={(e) => setForm({ ...form, minCartValue: e.target.value })} 
                                        />
                                        <small className='text-muted'>Minimum cart amount to apply coupon</small>
                                    </div>
                                    <div className='col-lg-3 col-md-6 col-sm-12 mb-4'>
                                        <label className='form-label-premium'>Max Discount</label>
                                        <input 
                                            type='number' 
                                            className='form-control form-control-premium' 
                                            placeholder='500' 
                                            value={form.maxDiscount} 
                                            onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} 
                                        />
                                        <small className='text-muted'>Maximum discount cap (leave 0 for unlimited)</small>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: Usage Limits */}
                            <div className='premium-form-section mb-5'>
                                <h5 className='font-weight-bold mb-4 section-header'>🔒 Usage Limits</h5>
                                <div className='row'>
                                    <div className='col-lg-3 col-md-6 col-sm-12 mb-4'>
                                        <div className='form-check form-check-premium'>
                                            <input 
                                                id='perUserOnce' 
                                                className='form-check-input' 
                                                type='checkbox' 
                                                checked={Boolean(form.perUserOnce)} 
                                                onChange={(e) => setForm({ ...form, perUserOnce: e.target.checked })} 
                                            />
                                            <label htmlFor='perUserOnce' className='form-check-label'>
                                                <span className='font-weight-bold'>Per-User Once</span>
                                            </label>
                                        </div>
                                        <small className='text-muted d-block mt-2'>Each user can use this coupon only once</small>
                                    </div>
                                    <div className='col-lg-3 col-md-6 col-sm-12 mb-4'>
                                        <label className='form-label-premium'>Total Usage Cap</label>
                                        <input 
                                            type='number' 
                                            className='form-control form-control-premium' 
                                            placeholder='100' 
                                            value={form.totalUsageCap} 
                                            onChange={(e) => setForm({ ...form, totalUsageCap: e.target.value })} 
                                        />
                                        <small className='text-muted'>Maximum times coupon can be used globally (0 = unlimited)</small>
                                    </div>
                                    <div className='col-lg-3 col-md-6 col-sm-12 mb-4'>
                                        <div className='form-check form-check-premium'>
                                            <input 
                                                id='firstOrderOnly' 
                                                className='form-check-input' 
                                                type='checkbox' 
                                                checked={Boolean(form.firstOrderOnly)} 
                                                onChange={(e) => setForm({ ...form, firstOrderOnly: e.target.checked })} 
                                            />
                                            <label htmlFor='firstOrderOnly' className='form-check-label'>
                                                <span className='font-weight-bold'>First-Order Only</span>
                                            </label>
                                        </div>
                                        <small className='text-muted d-block mt-2'>Valid only on first purchase</small>
                                    </div>
                                    <div className='col-lg-3 col-md-6 col-sm-12 mb-4'>
                                        <div className='form-check form-check-premium'>
                                            <input 
                                                id='isActive' 
                                                className='form-check-input' 
                                                type='checkbox' 
                                                checked={Boolean(form.isActive)} 
                                                onChange={(e) => setForm({ ...form, isActive: e.target.checked })} 
                                            />
                                            <label htmlFor='isActive' className='form-check-label'>
                                                <span className='font-weight-bold'>Active Status</span>
                                            </label>
                                        </div>
                                        <small className='text-muted d-block mt-2'>Enable/disable coupon</small>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4: Validity Period */}
                            <div className='premium-form-section mb-5'>
                                <h5 className='font-weight-bold mb-4 section-header'>📅 Validity Period</h5>
                                <div className='row'>
                                    <div className='col-lg-6 col-md-12 mb-4'>
                                        <label className='form-label-premium'>Valid From</label>
                                        <input 
                                            type='datetime-local' 
                                            className='form-control form-control-premium' 
                                            value={form.startsAt} 
                                            onChange={(e) => setForm({ ...form, startsAt: e.target.value })} 
                                        />
                                        <small className='text-muted'>Leave empty to start immediately</small>
                                    </div>
                                    <div className='col-lg-6 col-md-12 mb-4'>
                                        <label className='form-label-premium'>Valid Until</label>
                                        <input 
                                            type='datetime-local' 
                                            className='form-control form-control-premium' 
                                            value={form.expiresAt} 
                                            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} 
                                        />
                                        <small className='text-muted'>Leave empty to never expire</small>
                                    </div>
                                </div>
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className='d-flex gap-2'>
                                <button 
                                    type='submit' 
                                    className='btn btn-primary btn-lg px-5 rounded-pill d-inline-flex align-items-center premium-btn-create' 
                                    disabled={saving}
                                >
                                    {saving ? <Save size={18} className='mr-2' /> : <Plus size={18} className='mr-2' />}
                                    {saving ? 'Creating...' : 'Create Coupon'}
                                </button>
                                <button 
                                    type='button' 
                                    className='btn btn-outline-secondary btn-lg px-4 rounded-pill'
                                    onClick={() => setForm(initialForm)}
                                >
                                    Reset Form
                                </button>
                            </div>
                        </form>
                    </motion.div>

                    {/* ALL COUPONS TABLE */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='bg-white shadow-xl rounded-3xl p-5 border-0 premium-table-card'>
                        <div className='d-flex align-items-center mb-4'>
                            <h5 className='font-weight-bold mb-0'>📋 All Coupons</h5>
                            <span className='badge badge-info ml-3'>{sortedCoupons.length} coupons</span>
                        </div>
                        <div className='table-responsive'>
                            <table className='table table-hover table-sm'>
                                <thead className='table-dark premium-table-header'>
                                    <tr>
                                        <th className='px-3'>Code</th>
                                        <th className='px-3'>Type</th>
                                        <th className='px-3'>Value</th>
                                        <th className='px-3'>Min Cart</th>
                                        <th className='px-3'>Limits</th>
                                        <th className='px-3'>Status</th>
                                        <th className='px-3 text-center'>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan='7' className='text-center py-4'><span className='spinner-border spinner-border-sm mr-2'></span>Loading coupons...</td></tr>
                                    ) : sortedCoupons.length === 0 ? (
                                        <tr><td colSpan='7' className='text-center py-4 text-muted'>No coupons yet. Create your first one above! 🎟️</td></tr>
                                    ) : sortedCoupons.map((c) => (
                                        <tr key={c.id || c._id} className='premium-table-row'>
                                            <td className='px-3 font-weight-bold'><span className='badge badge-info'>{c.code}</span></td>
                                            <td className='px-3'><span className='badge badge-light'>{c.type === 'percent' ? '%' : '₹'}</span></td>
                                            <td className='px-3 font-weight-bold'>{c.type === 'percent' ? `${c.value}%` : `₹${c.value}`}</td>
                                            <td className='px-3'>₹{c.minCartValue || 0}</td>
                                            <td className='px-3'>
                                                <div className='small'>
                                                    {c.perUserOnce ? <span className='badge badge-info badge-sm mr-1'>🔒 Once</span> : null}
                                                    {c.firstOrderOnly ? <span className='badge badge-warning badge-sm mr-1'>🎁 First</span> : null}
                                                    {Number(c.totalUsageCap || 0) > 0 ? <span className='badge badge-dark badge-sm'>📊 {Number(c.totalUsageCap)}</span> : <span className='text-muted small'>∞ Unlimited</span>}
                                                </div>
                                            </td>
                                            <td className='px-3'>
                                                <span className={`badge ${c.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                    {c.isActive ? '✓ Active' : '✗ Inactive'}
                                                </span>
                                            </td>
                                            <td className='px-3 text-center'>
                                                <button 
                                                    className='btn btn-sm btn-outline-info rounded-circle mr-2 premium-btn-icon' 
                                                    onClick={() => toggleActive(c)} 
                                                    title='Toggle Active Status'
                                                >
                                                    <Power size={16} />
                                                </button>
                                                <button 
                                                    className='btn btn-sm btn-outline-danger rounded-circle premium-btn-icon' 
                                                    onClick={() => deleteCoupon(c)} 
                                                    title='Delete Coupon'
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </div>
            
            {/* PREMIUM STYLES */}
            <style>{`
                .premium-form-card {
                    background: linear-gradient(135deg, #ffffff 0%, #f9fbfd 100%);
                    border: 1px solid #e7ebf0;
                }
                .premium-icon-badge {
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
                    border-radius: 12px;
                }
                .premium-section-title {
                    color: #0f172a;
                    font-size: 1.3rem;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                }
                .premium-form-section {
                    padding: 24px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                }
                .section-header {
                    color: #1f2937;
                    font-size: 0.95rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 1rem !important;
                }
                .form-label-premium {
                    display: block;
                    font-weight: 700;
                    font-size: 0.85rem;
                    color: #374151;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    margin-bottom: 8px;
                }
                .form-control-premium {
                    border: 1.5px solid #e5eaf0;
                    border-radius: 8px;
                    padding: 10px 14px;
                    font-size: 0.9rem;
                    transition: all 0.3s ease;
                    background: #ffffff;
                }
                .form-control-premium:focus {
                    border-color: #0ea5b7;
                    box-shadow: 0 0 0 3px rgba(14, 165, 183, 0.1);
                    background: #ffffff;
                    color: #1f2937;
                }
                .form-check-premium {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px;
                    background: #f0faff;
                    border-radius: 8px;
                    border: 1px solid #b3e5fc;
                }
                .form-check-premium .form-check-input {
                    width: 20px;
                    height: 20px;
                    margin-top: 0;
                    cursor: pointer;
                    accent-color: #0ea5b7;
                }
                .form-check-premium .form-check-label {
                    cursor: pointer;
                    margin-bottom: 0;
                    font-weight: 600;
                    color: #1f2937;
                }
                .alert-premium {
                    background: linear-gradient(135deg, #fee2e2, #fef1f2);
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    color: #7f1d1d;
                }
                .premium-btn-create {
                    background: linear-gradient(90deg, #0ea5b7, #0284c7);
                    border: none;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    color: white;
                }
                .premium-btn-create:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px rgba(14, 165, 183, 0.3);
                    color: white;
                }
                .premium-btn-create:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .premium-table-card {
                    border: 1px solid #e7ebf0;
                    background: linear-gradient(135deg, #ffffff 0%, #f9fbfd 100%);
                }
                .premium-table-header {
                    background: linear-gradient(90deg, #1f2937, #111827);
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 0.8rem;
                    letter-spacing: 0.5px;
                }
                .premium-table-row {
                    border-bottom: 1px solid #e2e8f0;
                    transition: all 0.2s ease;
                    vertical-align: middle;
                }
                .premium-table-row:hover {
                    background-color: #f0faff;
                    box-shadow: inset 0 0 0 1px #bfdbfe;
                }
                .premium-btn-icon {
                    transition: all 0.2s ease;
                    width: 36px;
                    height: 36px;
                    padding: 0;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .premium-btn-icon:hover {
                    transform: scale(1.1);
                }
                .badge-sm {
                    font-size: 0.7rem;
                    padding: 3px 6px;
                }
                @media (max-width: 768px) {
                    .premium-form-section {
                        padding: 16px;
                        margin-bottom: 1rem !important;
                    }
                    .row > div {
                        margin-bottom: 1rem !important;
                    }
                    .table-responsive {
                        font-size: 0.8rem;
                    }
                    .premium-table-row td {
                        padding: 8px !important;
                    }
                    .premium-table-row th {
                        padding: 10px 8px !important;
                    }
                    .form-check-premium {
                        flex-direction: column;
                        align-items: flex-start;
                        padding: 10px;
                    }
                    .premium-btn-create {
                        width: 100%;
                        margin-bottom: 10px;
                    }
                    .d-flex.gap-2 {
                        flex-direction: column;
                    }
                    .d-flex.gap-2 button {
                        width: 100%;
                    }
                    .badge {
                        font-size: 0.7rem;
                        padding: 4px 8px;
                    }
                }
            `}</style>
        </div>
    )
}
