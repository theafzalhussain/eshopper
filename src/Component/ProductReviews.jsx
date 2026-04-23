import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Star, User, BadgeCheck, ThumbsUp, X, Loader2, Camera, Sparkles, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './ToastNotification';
import { BASE_URL } from '../constants';

export default function ProductReviews({ productId, onStatsUpdate }) {
    const toast = useToast();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [highlightedReviewId, setHighlightedReviewId] = useState(null);
    const [visibleCount, setVisibleCount] = useState(4);
    const [previewImgs, setPreviewImgs] = useState([]);
    const [newReview, setNewReview] = useState({ rating: 5, title: '', comment: '', pics: [] });
    const [sortBy, setSortBy] = useState('newest');
    const [lightbox, setLightbox] = useState({ isOpen: false, images: [], index: 0 });
    const currentUserId = localStorage.getItem('userid');
    
    useEffect(() => {
        let isMounted = true;
        async function fetchReviews() {
            if (!productId) {
                if (isMounted) setLoading(false);
                return;
            }
            console.log("🔍 Fetching Real Reviews for Product ID:", productId);
            try {
            // Add a cache-busting parameter to ensure fresh data is always fetched
            const response = await axios.get(`${BASE_URL}/api/review/${productId}`, {
                params: { _t: new Date().getTime() }
            });
                console.log("📦 Database Response:", response.data);
                if (isMounted && response.data.success) {
                setReviews(prev => {
                    const dbReviews = response.data.reviews || [];
                    // Safely merge existing UI state with DB state to prevent disappearing reviews
                    const reviewMap = new Map();
                    prev.forEach(r => reviewMap.set(String(r._id), r)); // Keep what's already on screen
                    dbReviews.forEach(r => reviewMap.set(String(r._id), r)); // Overwrite/add fresh data
                    return Array.from(reviewMap.values());
                });
                }
            } catch (error) {
                console.error("Failed to fetch reviews", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchReviews();
        return () => { isMounted = false; };
    }, [productId, refresh]);

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + newReview.pics.length + (newReview.existingPics?.length || 0) > 5) {
            toast.error('You can upload up to 5 images.');
            return;
        }
        const validFiles = [];
        const newPreviews = [];
        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`Image ${file.name} is too large (max 5MB)`);
            } else {
                validFiles.push(file);
                newPreviews.push(URL.createObjectURL(file));
            }
        });
        setNewReview(prev => ({ ...prev, pics: [...prev.pics, ...validFiles] }));
        setPreviewImgs(prev => [...prev, ...newPreviews]);
    };

    const removeImage = (index) => {
        const existingLen = (newReview.existingPics || []).length;
        if (index < existingLen) {
            setNewReview(prev => ({
                ...prev,
                existingPics: prev.existingPics.filter((_, i) => i !== index)
            }));
        } else {
            const fileIndex = index - existingLen;
            setNewReview(prev => ({ ...prev, pics: prev.pics.filter((_, i) => i !== fileIndex) }));
        }
        setPreviewImgs(prev => prev.filter((_, i) => i !== index));
    };

    const handleHelpfulClick = async (reviewId) => {
        const userId = localStorage.getItem('userid');
        if (!userId) {
            toast.error('Please login to mark as helpful.');
            return;
        }

        // Prevent voting on a review that is still syncing with the server
        if (String(reviewId).startsWith('new-')) {
            toast.info('Please wait a moment for this review to sync before voting.');
            return;
        }

        // Optimistic UI update (instantly update UI before server responds)
        setReviews(prev => prev.map(r => {
            if (r._id === reviewId) {
                const votes = Array.isArray(r.helpfulVotes) ? [...r.helpfulVotes] : [];
                const hasVoted = votes.includes(userId);
                return { ...r, helpfulVotes: hasVoted ? votes.filter(id => id !== userId) : [...votes, userId] };
            }
            return r;
        }));

        try {
            await axios.put(`${BASE_URL}/api/review/${reviewId}/helpful`, { userId });
        } catch (error) {
            toast.error('Could not save your vote. Please try again.');
            setRefresh(prev => prev + 1); // Revert UI if DB fails
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Are you sure you want to delete this review?")) return;
        try {
            await axios.delete(`${BASE_URL}/api/review/${reviewId}?userId=${currentUserId}`);
            setReviews(prev => prev.filter(r => r._id !== reviewId));
            toast.success('Review deleted successfully');
            setRefresh(prev => prev + 1);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to delete review');
        }
    };

    const openEditModal = (review) => {
        setEditingReviewId(review._id);
        setNewReview({
            rating: review.rating,
            title: review.title,
            comment: review.comment,
            pics: [],
            existingPics: review.pics && review.pics.length > 0 ? review.pics : (review.pic ? [review.pic] : [])
        });
        setPreviewImgs(review.pics && review.pics.length > 0 ? review.pics : (review.pic ? [review.pic] : []));
        setShowModal(true);
    };

    const handleReviewSubmit = async () => {
        const userId = localStorage.getItem('userid');
        if (!userId) {
            toast.error('Please login to write a review.');
            return;
        }
        if (!newReview.title.trim() || !newReview.comment.trim()) {
            toast.error('Please provide a title and comment.');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('products', JSON.stringify([productId]));
            formData.append('userId', userId);
            formData.append('rating', newReview.rating);
            formData.append('title', newReview.title);
            formData.append('comment', newReview.comment);
            if (newReview.pics && newReview.pics.length > 0) {
                newReview.pics.forEach(file => {
                    formData.append('pics', file); 
                });
            }

            let response;
            if (editingReviewId) {
                response = await axios.put(`${BASE_URL}/api/review/${editingReviewId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Review updated successfully! ✨');
            } else {
                response = await axios.post(`${BASE_URL}/api/review`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Review submitted successfully! ⭐');
            }
            
            // 🔴 OPTIMISTIC UI UPDATE: Inject directly into state for 100% instant display
            const serverReview = response.data?.review || response.data?.data || {};
            const newOptimisticReview = {
                ...serverReview,
                _id: serverReview._id || editingReviewId || ('new-' + Date.now()),
                userName: serverReview.userName || localStorage.getItem('name') || 'Verified Buyer',
                userPic: serverReview.userPic || localStorage.getItem('pic') || '',
                rating: Number(newReview.rating),
                title: newReview.title,
                comment: newReview.comment,
                pics: previewImgs.length > 0 ? previewImgs : (serverReview.pics || serverReview.pic ? [serverReview.pic] : []), 
                createdAt: serverReview.createdAt || new Date().toISOString(),
                helpfulVotes: serverReview.helpfulVotes || []
            };

            if (editingReviewId) {
                setReviews(prev => prev.map(r => r._id === editingReviewId ? { ...r, ...newOptimisticReview } : r));
            } else {
                setReviews(prev => [newOptimisticReview, ...prev]);
            }

            // Highlight the newly added review for 4 seconds
            setHighlightedReviewId(newOptimisticReview._id);
            setTimeout(() => setHighlightedReviewId(null), 4000);

            // Instantly close and reset the modal
            setShowModal(false);
            setEditingReviewId(null);
            setNewReview({ rating: 5, title: '', comment: '', pics: [], existingPics: [] });
            setPreviewImgs([]);
            
            setTimeout(() => {
                setRefresh(prev => prev + 1);
            }, 800);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not submit your review. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const closeModal = () => {
        if (!submitting) {
            setShowModal(false);
            setEditingReviewId(null);
            setNewReview({ rating: 5, title: '', comment: '', pics: [], existingPics: [] });
            setPreviewImgs([]);
        }
    };

    // Keyboard Navigation for Lightbox
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!lightbox.isOpen) return;
            if (e.key === 'Escape') {
                setLightbox(prev => ({ ...prev, isOpen: false }));
                return;
            }
            if (lightbox.images.length <= 1) return;
            
            if (e.key === 'ArrowRight') {
                setLightbox(prev => ({ ...prev, index: (prev.index + 1) % prev.images.length }));
            } else if (e.key === 'ArrowLeft') {
                setLightbox(prev => ({ ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightbox.isOpen, lightbox.images.length]);

    // 🔴 REAL DATABASE ANALYTICS (Dynamic Average Rating & Breakdown)
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 
        ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / totalReviews).toFixed(1) 
        : 0;
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
        const star = Math.round(Number(r.rating) || 5);
        if (ratingCounts[star] !== undefined) ratingCounts[star]++;
    });
    
    // 🔴 Pass stats up to parent component
    useEffect(() => {
        if (onStatsUpdate) {
            onStatsUpdate({ count: totalReviews, average: parseFloat(avgRating) });
        }
    }, [totalReviews, avgRating, onStatsUpdate]);

    // 🔴 Sort reviews dynamically based on user selection
    const sortedReviews = [...reviews].sort((a, b) => {
        if (sortBy === 'highest') {
            const diff = (Number(b.rating) || 0) - (Number(a.rating) || 0);
            if (diff !== 0) return diff;
        } else if (sortBy === 'lowest') {
            const diff = (Number(a.rating) || 0) - (Number(b.rating) || 0);
            if (diff !== 0) return diff;
        }
        
        // Fallback to Newest First (Also acts as tie-breaker for same ratings)
        const getTime = (r) => {
            const t = new Date(r.createdAt || r.date || r.timestamp).getTime();
            return isNaN(t) ? 0 : t;
        };
        return getTime(b) - getTime(a);
    });
    
    const visibleReviews = sortedReviews.slice(0, visibleCount);

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-warning" role="status"></div>
                <p className="mt-2 text-muted">Loading luxury reviews...</p>
            </div>
        );
    }

    return (
        <div className="mt-5 pt-5 border-top review-premium-section">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                <h3 className="mb-0" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#0A0A0A", fontSize: "2rem" }}>
                    Customer Reviews
                </h3>
                <button className="btn premium-write-review-btn d-flex align-items-center gap-2" onClick={() => {
                    if (!localStorage.getItem('userid')) toast.error('Please login to write a review.');
                    else setShowModal(true);
                }}>
                    <Sparkles size={16} /> Write a Review
                </button>
            </div>
            
            {/* 🔴 REAL DATABASE AVERAGE RATING SUMMARY */}
            <div className="mb-5 p-4 bg-white shadow-sm d-flex flex-wrap align-items-center justify-content-center gap-5" style={{ border: "1px solid rgba(212,175,55,0.2)", borderRadius: "20px" }}>
                <div className="text-center">
                    <div style={{fontSize:'3.5rem',fontWeight:700,color:'#D4AF37',lineHeight: 1, fontFamily: "'Playfair Display', serif"}}>
                        {avgRating > 0 ? avgRating : '0.0'}
                    </div>
                    <div className="d-flex justify-content-center my-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} size={20} fill={star <= Math.round(avgRating) ? "#D4AF37" : "none"} color={star <= Math.round(avgRating) ? "#D4AF37" : "#e2e8f0"} />
                        ))}
                    </div>
                    <div style={{fontSize:'13px',color:'#64748b', fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px"}}>
                        Based on {totalReviews} Review{totalReviews !== 1 ? 's' : ''}
                    </div>
                </div>
                
                {totalReviews > 0 && (
                    <div style={{ flex: "1", minWidth: "280px", maxWidth: "400px" }}>
                        {[5,4,3,2,1].map(star => {
                            const count = ratingCounts[star];
                            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                            return (
                                <div key={star} className="d-flex align-items-center mb-2" style={{gap:'1rem'}}>
                                    <span style={{width:'40px', fontWeight: 600, color: '#475569', fontSize: '13px'}}>{star} Star</span>
                                    <div style={{flex:1,background:'#f1f5f9',borderRadius:10,overflow:'hidden',height:8}}>
                                        <div style={{width:`${percentage}%`,background:'linear-gradient(90deg, #D4AF37, #f6e27a)',height:'100%', transition: 'width 1s ease-in-out', borderRadius: 10}}></div>
                                    </div>
                                    <span style={{fontSize:'12px',color:'#94a3b8', width: '55px', textAlign: 'right', fontWeight: 600}}>{percentage.toFixed(0)}% ({count})</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {reviews.length === 0 ? (
                <div className="p-5 text-center bg-light" style={{ borderRadius: "20px", border: "1px solid rgba(201,168,76,0.2)" }}>
                    <Star size={48} className="text-muted mb-3 opacity-50" />
                    <h5 className="text-dark font-weight-bold">No reviews yet</h5>
                    <p className="small text-secondary mb-0">Be the first to share your premium experience with this product.</p>
                    <button className="btn premium-write-review-btn mt-3" onClick={() => {
                        if (!localStorage.getItem('userid')) toast.error('Please login to write a review.');
                        else setShowModal(true);
                    }}>
                        Write a Review
                    </button>
                </div>
            ) : (
                <div className="pr-reviews-list-container">
                    <div className="d-flex justify-content-between align-items-center mb-4 pb-3" style={{ borderBottom: "1px dashed rgba(212,175,55,0.3)" }}>
                        <span style={{ fontWeight: 700, color: '#0A0A0A', fontSize: '15px' }}>
                            Showing {totalReviews} Review{totalReviews !== 1 ? 's' : ''}
                        </span>
                        <div className="premium-filter-wrapper">
                            <span className="filter-label d-none d-sm-flex"><SlidersHorizontal size={14} className="mr-1" /> Sort by:</span>
                            <div className="select-container">
                                <select 
                                    className="pr-sort-select"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="newest">Top & Newest</option>
                                    <option value="highest">Highest Rated</option>
                                    <option value="lowest">Lowest Rated</option>
                                </select>
                                <ChevronDown size={14} className="select-icon" />
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        {visibleReviews.map((review, index) => (
                        <motion.div 
                            key={review._id || review.id || `review-${index}`} 
                            className="col-md-6 mb-4"
                            initial={{ opacity: 0, y: 25 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.12, ease: "easeOut" }}
                        >
                            <div className={`p-4 h-100 bg-white review-card-hover ${review._id === highlightedReviewId ? 'highlight-new-review' : ''}`} style={{ borderRadius: "20px", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", transition: "all 0.3s ease" }}>
                                <div className="d-flex align-items-start mb-3">
                                    <div className="rounded-circle d-flex align-items-center justify-content-center mr-3 overflow-hidden" style={{ width: '50px', height: '50px', background: "#f8f9fa", border: "1px solid rgba(212,175,55,0.3)", color: "#D4AF37", flexShrink: 0 }}>
                                        {review.userPic ? (
                                            <img src={review.userPic} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        ) : (
                                            <User size={24} />
                                        )}
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className="d-flex align-items-center gap-2">
                                                <h6 className="mb-0" style={{ fontWeight: 700, color: "#111", fontSize: "16px", textTransform: "capitalize" }}>
                                                    {review.userName || 'Verified Customer'}
                                                </h6>
                                                {review._id === highlightedReviewId && (
                                                    <motion.span 
                                                        initial={{ scale: 0, opacity: 0 }} 
                                                        animate={{ scale: 1, opacity: 1 }} 
                                                        className="d-flex align-items-center text-white shadow-sm" 
                                                        style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", fontSize: "10px", padding: "4px 8px", borderRadius: "12px", fontWeight: 700, letterSpacing: "0.5px" }}>
                                                        <Sparkles size={10} className="mr-1" /> Just Added
                                                    </motion.span>
                                                )}
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="text-muted small" style={{ fontSize: "12px" }}>
                                                    {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                                {currentUserId === String(review.userId) && (
                                                    <div className="d-flex gap-1 ml-2 pl-2" style={{borderLeft: "1px solid rgba(0,0,0,0.1)"}}>
                                                        <button className="rev-action-btn edit-btn" onClick={() => openEditModal(review)} title="Edit Review"><Pencil size={14} /></button>
                                                        <button className="rev-action-btn delete-btn" onClick={() => handleDeleteReview(review._id)} title="Delete Review"><Trash2 size={14} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center mt-1 gap-2">
                                            <div className="d-flex">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star 
                                                        key={star} 
                                                        size={14} 
                                                        fill={star <= review.rating ? "#D4AF37" : "none"} 
                                                        color={star <= review.rating ? "#D4AF37" : "#e2e8f0"} 
                                                    />
                                                ))}
                                            </div>
                                            <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700, background: "rgba(22,163,74,0.1)", padding: "2px 8px", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                <BadgeCheck size={12} /> Verified Buyer
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                {review.title && (
                                    <h6 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#0A0A0A", marginBottom: "10px", fontSize: "18px", wordBreak: "break-word" }}>
                                        {review.title}
                                    </h6>
                                )}

                                <p style={{ fontSize: "14px", lineHeight: "1.7", color: "#4b5563", marginBottom: (review.pics || review.pic) ? "16px" : "12px", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                                    {review.comment}
                                </p>

                                {((Array.isArray(review.pics) ? review.pics : (review.pic ? [review.pic] : []))).length > 0 && (
                                    <div className="mt-2 mb-3 d-flex flex-wrap gap-2">
                                        {(Array.isArray(review.pics) ? review.pics : (review.pic ? [review.pic] : [])).map((imgUrl, i, arr) => (
                                            <div key={i} className="d-inline-block position-relative overflow-hidden review-img-container" style={{ borderRadius: "12px", border: "1px solid rgba(0,0,0,0.08)", cursor: "zoom-in" }} onClick={() => setLightbox({ isOpen: true, images: arr, index: i })}>
                                                <img src={imgUrl} alt={`Review attachment ${i+1}`} style={{ height: "90px", width: "90px", objectFit: "cover", transition: "transform 0.3s ease" }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="d-flex align-items-center mt-auto pt-3 border-top" style={{ borderColor: "rgba(0,0,0,0.05) !important" }}>
                                    <button 
                                        className="btn btn-link p-0 d-flex align-items-center" 
                                        style={{ 
                                            fontSize: "12px", 
                                            textDecoration: "none", 
                                            fontWeight: 600,
                                            color: (review.helpfulVotes || []).includes(localStorage.getItem('userid')) ? "#D4AF37" : "#6c757d",
                                            transition: "color 0.2s ease"
                                        }}
                                        onClick={() => handleHelpfulClick(review._id)}
                                    >
                                        <ThumbsUp 
                                            size={14} 
                                            className="mr-1" 
                                            fill={(review.helpfulVotes || []).includes(localStorage.getItem('userid')) ? "#D4AF37" : "none"} 
                                        /> 
                                        Helpful {(review.helpfulVotes && review.helpfulVotes.length > 0) ? `(${review.helpfulVotes.length})` : ''}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    </div>
                    
                    {visibleCount < sortedReviews.length && (
                        <div className="text-center mt-4 mb-2">
                            <button 
                                className="btn premium-load-more-btn"
                                onClick={() => setVisibleCount(prev => prev + 4)}
                            >
                                Load More Reviews <ChevronDown size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 🔴 WRITE A REVIEW MODAL */}
            <AnimatePresence>
                {showModal && (
                    <div className="pr-modal-overlay" onClick={closeModal}>
                        <motion.div 
                            className="pr-modal-card" 
                            onClick={e => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                        >
                            <div className="pr-modal-header">
                                <button className="pr-modal-close" onClick={closeModal} disabled={submitting}>
                                    <X size={20} />
                                </button>
                                <h3 className="pr-modal-title">{editingReviewId ? 'Edit Review' : 'Write a Review'}</h3>
                                <p className="text-muted small mb-0">Share your experience with this premium product</p>
                            </div>

                            <div className="pr-modal-body">
                                <div className="text-center mb-4">
                                    <label className="pr-form-label">Your Overall Rating</label>
                                    <div className="d-flex justify-content-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                className={`pr-star-btn ${star <= newReview.rating ? 'active' : ''}`}
                                                onClick={() => setNewReview({...newReview, rating: star})}
                                            >
                                                <Star size={32} fill={star <= newReview.rating ? "currentColor" : "none"} />
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-2 mb-0" style={{fontSize: "13px", fontWeight: 600, color: "#D4AF37"}}>
                                        {['Terrible', 'Poor', 'Average', 'Good', 'Excellent'][newReview.rating - 1]}
                                    </p>
                                </div>

                                <div className="mb-3">
                                    <label className="pr-form-label">Review Headline</label>
                                    <input 
                                        type="text" 
                                        className="pr-input" 
                                        placeholder="What's most important to know?"
                                        value={newReview.title}
                                        onChange={(e) => setNewReview({...newReview, title: e.target.value})}
                                        disabled={submitting}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="pr-form-label">Your Review</label>
                                    <textarea 
                                        className="pr-textarea" 
                                        placeholder="Tell us what you loved, or where we can improve..."
                                        value={newReview.comment}
                                        onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                                        disabled={submitting}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="pr-form-label">Add Photos (Optional, up to 5)</label>
                                    <div className="pr-image-upload-wrap" style={{ flexDirection: previewImgs.length > 0 ? 'row' : 'column', flexWrap: 'wrap', padding: previewImgs.length > 0 ? '12px' : '30px', justifyContent: previewImgs.length > 0 ? 'flex-start' : 'center', gap: '10px' }}>
                                        {previewImgs.map((imgSrc, idx) => (
                                            <div key={idx} className="pr-image-preview-multi">
                                                <img src={imgSrc} alt={`Preview ${idx}`} />
                                                <button type="button" className="pr-image-remove-multi" onClick={() => removeImage(idx)}>
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        {previewImgs.length < 5 && (
                                            <label className="pr-image-upload-btn-multi" style={{ flex: previewImgs.length > 0 ? '0 0 auto' : '1', width: previewImgs.length > 0 ? '80px' : '100%', height: previewImgs.length > 0 ? '80px' : '100%' }}>
                                                <Camera size={previewImgs.length > 0 ? 20 : 24} strokeWidth={1.5} />
                                                {previewImgs.length === 0 && <span>Upload Images</span>}
                                                {previewImgs.length === 0 && <span style={{fontSize: "10px", textTransform: "none", color: "#94a3b8"}}>Max 5MB per image</span>}
                                                <input type="file" accept="image/*" multiple onChange={handleImageChange} hidden disabled={submitting} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-top" style={{ backgroundColor: "#f8f9fa", borderBottomLeftRadius: "20px", borderBottomRightRadius: "20px" }}>
                                <button className="pr-submit-btn" onClick={handleReviewSubmit} disabled={submitting}>
                                    {submitting ? <><Loader2 size={16} className="spin-anim" /> {editingReviewId ? 'Updating...' : 'Submitting...'}</> : <><Sparkles size={16} /> {editingReviewId ? 'Update Review' : 'Submit Review'}</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 🔴 IMAGE LIGHTBOX MODAL */}
            <AnimatePresence>
                {lightbox.isOpen && (
                    <div className="pr-lightbox-overlay" onClick={() => setLightbox({ ...lightbox, isOpen: false })}>
                        <button className="pr-lightbox-close" onClick={() => setLightbox({ ...lightbox, isOpen: false })}>
                            <X size={24} />
                        </button>
                        
                        {lightbox.images.length > 1 && (
                            <button 
                                className="pr-lightbox-nav pr-lightbox-prev" 
                                onClick={(e) => { e.stopPropagation(); setLightbox(prev => ({ ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length })); }}
                            >
                                <ChevronLeft size={32} />
                            </button>
                        )}

                        <motion.img 
                            key={lightbox.index}
                            src={lightbox.images[lightbox.index]} 
                            alt="Enlarged review" 
                            className="pr-lightbox-img"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        />

                        {lightbox.images.length > 1 && (
                            <button 
                                className="pr-lightbox-nav pr-lightbox-next" 
                                onClick={(e) => { e.stopPropagation(); setLightbox(prev => ({ ...prev, index: (prev.index + 1) % prev.images.length })); }}
                            >
                                <ChevronRight size={32} />
                            </button>
                        )}
                        
                        {lightbox.images.length > 1 && (
                            <div className="pr-lightbox-counter">
                                {lightbox.index + 1} / {lightbox.images.length}
                            </div>
                        )}
                    </div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{__html: `
                .review-card-hover:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 30px rgba(0,0,0,0.06) !important;
                    border-color: rgba(212,175,55,0.4) !important;
                }
                .highlight-new-review {
                    border: 2px solid #D4AF37 !important;
                    background: linear-gradient(145deg, #ffffff, #fffbf0) !important;
                    animation: new-review-pulse 2s infinite;
                }
                @keyframes new-review-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(212,175,55,0.4); }
                    70% { box-shadow: 0 0 0 12px rgba(212,175,55,0); }
                    100% { box-shadow: 0 0 0 0 rgba(212,175,55,0); }
                }
                .rev-action-btn { background: transparent; border: none; color: #94a3b8; padding: 4px 6px; border-radius: 6px; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
                .rev-action-btn.edit-btn:hover { background: rgba(212,175,55,0.1); color: #D4AF37; transform: translateY(-1px); }
                .rev-action-btn.delete-btn:hover { background: rgba(239,68,68,0.1); color: #ef4444; transform: translateY(-1px); }
                .premium-filter-wrapper { display: flex; align-items: center; gap: 10px; }
                .filter-label { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                .select-container { position: relative; display: flex; align-items: center; }
                .select-icon { position: absolute; right: 12px; pointer-events: none; color: #D4AF37; }
                .pr-sort-select {
                    appearance: none; -webkit-appearance: none;
                    padding: 8px 36px 8px 16px; border-radius: 999px;
                    border: 1px solid rgba(212,175,55,0.4);
                    font-size: 13px; font-weight: 700; color: #111;
                    background: linear-gradient(135deg, #ffffff 0%, #fffbf0 100%);
                    cursor: pointer; box-shadow: 0 4px 12px rgba(212,175,55,0.08);
                    outline: none; transition: all 0.3s ease;
                }
                .pr-sort-select:focus, .pr-sort-select:hover {
                    border-color: #D4AF37; box-shadow: 0 6px 16px rgba(212,175,55,0.15); transform: translateY(-1px);
                }
                .pr-reviews-scroll-container {
                    max-height: 650px; overflow-y: auto; overflow-x: hidden;
                    scrollbar-width: thin; scrollbar-color: rgba(212,175,55,0.6) rgba(0,0,0,0.03);
                    padding: 10px 4px;
                }
                .pr-reviews-scroll-container::-webkit-scrollbar { width: 6px; }
                .pr-reviews-scroll-container::-webkit-scrollbar-track { background: rgba(0,0,0,0.03); border-radius: 8px; }
                .pr-reviews-scroll-container::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.5); border-radius: 8px; }
                .pr-reviews-scroll-container::-webkit-scrollbar-thumb:hover { background: rgba(212,175,55,0.8); }
                .review-img-container img:hover {
                    transform: scale(1.08);
                }
                .review-pagination-btn {
                    width: 40px; height: 40px; 
                    border: 1px solid rgba(212,175,55,0.4); 
                    background: #fff; color: #0A0A0A; 
                    transition: all 0.3s ease;
                }
                .review-pagination-btn:hover:not(:disabled) {
                    background: #D4AF37;
                    color: #fff;
                    border-color: #D4AF37;
                }
                .review-pagination-btn:disabled {
                    background: #f8f9fa;
                    color: #adb5bd;
                    border-color: #e9ecef;
                    box-shadow: none !important;
                }
                .premium-write-review-btn {
                    background: #0A0A0A; color: #D4AF37; border: 1px solid #D4AF37; 
                    border-radius: 999px; padding: 10px 24px; font-size: 13px; 
                    font-weight: 700; text-transform: uppercase; letter-spacing: 1px; 
                    transition: all 0.3s ease;
                }
                .premium-write-review-btn:hover {
                    background: #D4AF37; color: #fff; box-shadow: 0 8px 20px rgba(212,175,55,0.3); transform: translateY(-2px);
                }
                .premium-load-more-btn {
                    background: #0A0A0A; color: #D4AF37; border: 1px solid rgba(212,175,55,0.4); 
                    border-radius: 999px; padding: 12px 32px; font-size: 12px; 
                    font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; 
                    transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
                    display: inline-flex; align-items: center; gap: 8px;
                    position: relative; overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                }
                .premium-load-more-btn::before {
                    content: ''; position: absolute; top: 0; left: -100%;
                    width: 100%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.15), transparent);
                    transition: left 0.6s ease;
                }
                .premium-load-more-btn:hover {
                    background: #1a1a1a; color: #fff; border-color: #D4AF37;
                    box-shadow: 0 10px 25px rgba(212, 175, 55, 0.25); transform: translateY(-2px);
                }
                .premium-load-more-btn:hover::before { left: 100%; }
                .premium-load-more-btn svg { transition: transform 0.3s ease; }
                .premium-load-more-btn:hover svg { transform: translateY(3px); }
                .pr-modal-overlay {
                    position: fixed; inset: 0; z-index: 9999;
                    background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);
                    display: flex; align-items: center; justify-content: center; padding: 20px;
                }
                .pr-modal-card {
                    background: #ffffff; border: 1px solid rgba(212,175,55,0.3);
                    border-radius: 20px; width: 100%; max-width: 540px; padding: 0;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.15), 0 0 40px rgba(212,175,55,0.05);
                    max-height: 90vh; display: flex; flex-direction: column;
                }
                .pr-modal-header { padding: 24px 28px; border-bottom: 1px solid rgba(0,0,0,0.06); text-align: center; position: relative; }
                .pr-modal-title { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: #0A0A0A; margin: 0 0 4px; }
                .pr-modal-close { position: absolute; top: 20px; right: 20px; background: #f8f9fa; border: 1px solid rgba(0,0,0,0.05); border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; color: #64748b; cursor: pointer; transition: all 0.2s; }
                .pr-modal-close:hover { background: #e2e8f0; color: #0f172a; transform: rotate(90deg); }
                
                .pr-lightbox-overlay {
                    position: fixed; inset: 0; z-index: 10000;
                    background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(5px);
                    display: flex; align-items: center; justify-content: center; padding: 20px;
                }
                .pr-lightbox-img {
                    max-width: 90vw; max-height: 90vh; border-radius: 8px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3); object-fit: contain; cursor: zoom-out;
                }
                .pr-lightbox-close { position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.1); border: none; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; transition: all 0.2s; z-index: 10001; }
                .pr-lightbox-close:hover { background: rgba(255,255,255,0.25); transform: rotate(90deg); }
                
                .pr-lightbox-nav {
                    position: absolute; top: 50%; transform: translateY(-50%);
                    background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 50%; width: 56px; height: 56px;
                    display: flex; align-items: center; justify-content: center;
                    color: #fff; cursor: pointer; transition: all 0.2s; z-index: 10001;
                    backdrop-filter: blur(8px);
                }
                .pr-lightbox-nav:hover { background: rgba(212,175,55,0.85); border-color: #D4AF37; transform: translateY(-50%) scale(1.1); }
                .pr-lightbox-prev { left: 30px; }
                .pr-lightbox-next { right: 30px; }
                .pr-lightbox-counter {
                    position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%);
                    background: rgba(0,0,0,0.6); padding: 8px 18px; border-radius: 20px;
                    color: #fff; font-size: 13px; font-weight: 700; letter-spacing: 1px;
                    backdrop-filter: blur(8px); z-index: 10001; border: 1px solid rgba(255,255,255,0.1);
                }

                .pr-modal-body { padding: 24px 28px; overflow-y: auto; flex: 1; }
                .pr-form-label { display: block; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 8px; }
                .pr-star-btn { background: none; border: none; padding: 0; cursor: pointer; color: #e2e8f0; transition: transform 0.2s, color 0.2s; }
                .pr-star-btn:hover { transform: scale(1.15); }
                .pr-star-btn.active { color: #D4AF37; filter: drop-shadow(0 0 8px rgba(212,175,55,0.4)); }
                .pr-input, .pr-textarea { width: 100%; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 14px 16px; font-size: 14px; color: #0A0A0A; background: #f8f9fa; outline: none; transition: all 0.2s; }
                .pr-input:focus, .pr-textarea:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.15); background: #fff; }
                .pr-textarea { min-height: 120px; resize: vertical; }
                .pr-image-upload-wrap { position: relative; width: 100%; min-height: 140px; border: 1px dashed rgba(212,175,55,0.4); border-radius: 12px; background: rgba(212,175,55,0.03); display: flex; align-items: center; justify-content: center; overflow: hidden; transition: all 0.2s ease; }
                .pr-image-upload-wrap:hover { background: rgba(212,175,55,0.08); border-color: rgba(212,175,55,0.6); }
                .pr-image-preview-multi { position: relative; width: 80px; height: 80px; flex: 0 0 auto; border-radius: 8px; border: 1px solid rgba(212,175,55,0.4); box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden; }
                .pr-image-preview-multi img { width: 100%; height: 100%; object-fit: cover; }
                .pr-image-remove-multi { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; color: #fff; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; z-index: 5; }
                .pr-image-remove-multi:hover { background: #ef4444; border-color: #ef4444; transform: scale(1.1); }
                .pr-image-upload-btn-multi { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #64748b; cursor: pointer; margin: 0; transition: color 0.2s ease, background 0.2s ease; border-radius: 8px; border: 1px dashed rgba(212,175,55,0.4); background: rgba(255,255,255,0.5); }
                .pr-image-upload-btn-multi:hover { color: #D4AF37; background: rgba(212,175,55,0.08); }
                .pr-submit-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 16px 24px; background: linear-gradient(135deg, #D4AF37 0%, #9A7A20 100%); color: #fff; border: none; border-radius: 12px; font-size: 13px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; box-shadow: 0 8px 20px rgba(212,175,55,0.25); }
                .pr-submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(212,175,55,0.35); }
                .pr-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
                @media (max-width: 768px) {
                    .pr-lightbox-nav { width: 40px; height: 40px; }
                    .pr-lightbox-prev { left: 10px; }
                    .pr-lightbox-next { right: 10px; }
                }
                .spin-anim { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}} />
        </div>
    );
}
