import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getProduct } from '../Store/ActionCreaters/ProductActionCreators';
import { getUser } from '../Store/ActionCreaters/UserActionCreators';
import { getWishlist, addWishlist, deleteWishlist } from '../Store/ActionCreaters/WishlistActionCreators'; // Wishlist actions added
import Newslatter from './Newslatter';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeCloudinaryUrl, optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper';

export default function Home() {
    const product = useSelector((state) => state.ProductStateData)
    const wishlist = useSelector((state) => state.WishlistStateData) // Selected Wishlist State
    const dispatch = useDispatch()
    const navigate = useNavigate()
    
    const [currentSlide, setCurrentSlide] = useState(0);
    const [welcomeUser, setWelcomeUser] = useState("")
    const [wishlistToast, setWishlistToast] = useState({ show: false, text: "" })
    // ...existing code...
}
