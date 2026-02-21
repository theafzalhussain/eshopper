import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

// Layout & Static
import Navbaar from './Navbaar'
import Footer from './Footer'
import Home from './Home'
import About from './About'
import Contact from './Contact'

// User Sections
import Cart from './Cart'
import Checkout from './Checkout'
import SingleProductPage from './SingleProductPage'
import Login from './Login'
import SingUp from './SingUp'
import Profile from './Profile'
import Updateprofile from './UpdateProfile'
import Confirmation from './confirmation'
import Wishlist from './Wishlist'
import ForgetPassword from './ForgetPassword'

// Admin Sections
import AdminHome from './Admin/AdminHome'
import AdminAddMaincategory from './Admin/AdminAddMaincategory'
import AdminMaincategory from './Admin/AdminMaincategory'
import AdminUpdateMaincategory from './Admin/AdminUpdateMaincategory'
import AdminAddSubcategory from './Admin/AdminAddSubcategory'
import AdminSubcategory from './Admin/AdminSubcategory'
import AdminUpdateSubcategory from './Admin/AdminUpdateSubcategory'
import AdminAddBrand from './Admin/AdminAddBrand'
import AdminBrand from './Admin/AdminBrand'
import AdminUpdateBrand from './Admin/AdminUpdateBrand'
import AdminAddProduct from './Admin/AdminAddProduct'
import AdminProduct from './Admin/AdminProduct'
import AdminUpdateProduct from './Admin/AdminUpdateProduct'
import AdminUser from './Admin/AdminUser'
import Shop from './Shop'

// --- HELPER: Scroll to top on Route Change ---
function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}

// --- HELPER: Admin Protection ---
const AdminProtected = ({ children }) => {
    return localStorage.getItem("role") === "Admin" ? children : <Navigate to="/login" />;
}

// --- HELPER: Login Protection (For Cart/Profile) ---
const Protected = ({ children }) => {
    return localStorage.getItem("login") ? children : <Navigate to="/login" />;
}

export default function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <Navbaar />
            <Routes>
                {/* Public Routes */}
                <Route path='/' element={<Home />} />
                <Route path='/about' element={<About />} />
                <Route path='/shop/:maincat/' element={<Shop />} />
                <Route path='/contact' element={<Contact />} />
                <Route path='/login' element={<Login />} />
                <Route path='/signup' element={<SingUp />} />
                <Route path='/forget-password' element={<ForgetPassword />} />
                <Route path='/single-product/:id' element={<SingleProductPage />} />

                {/* User Protected Routes */}
                <Route path='/profile' element={<Protected><Profile /></Protected>} />
                <Route path='/update-profile' element={<Protected><Updateprofile /></Protected>} />
                <Route path='/cart' element={<Protected><Cart /></Protected>} />
                <Route path='/wishlist' element={<Protected><Wishlist /></Protected>} />
                <Route path='/checkout' element={<Protected><Checkout /></Protected>} />
                <Route path='/confirmation' element={<Protected><Confirmation /></Protected>} />

                {/* Admin Only Routes (Ultra Secure) */}
                <Route path='/admin-home' element={<AdminProtected><AdminHome /></AdminProtected>} />
                <Route path='/admin-user' element={<AdminProtected><AdminUser /></AdminProtected>} />
                <Route path='/admin-maincategory' element={<AdminProtected><AdminMaincategory /></AdminProtected>} />
                <Route path='/admin-add-maincategory' element={<AdminProtected><AdminAddMaincategory /></AdminProtected>} />
                <Route path='/admin-update-maincategory/:id' element={<AdminProtected><AdminUpdateMaincategory /></AdminProtected>} />
                
                <Route path='/admin-subcategory' element={<AdminProtected><AdminSubcategory /></AdminProtected>} />
                <Route path='/admin-add-subcategory' element={<AdminProtected><AdminAddSubcategory /></AdminProtected>} />
                <Route path='/admin-update-subcategory/:id' element={<AdminProtected><AdminUpdateSubcategory /></AdminProtected>} />
                
                <Route path='/admin-brand' element={<AdminProtected><AdminBrand /></AdminProtected>} />
                <Route path='/admin-add-brand' element={<AdminProtected><AdminAddBrand /></AdminProtected>} />
                <Route path='/admin-update-brand/:id' element={<AdminProtected><AdminUpdateBrand /></AdminProtected>} />
                
                <Route path='/admin-product' element={<AdminProtected><AdminProduct /></AdminProtected>} />
                <Route path='/admin-add-product' element={<AdminProtected><AdminAddProduct /></AdminProtected>} />
                <Route path='/admin-update-product/:id' element={<AdminProtected><AdminUpdateProduct /></AdminProtected>} />
                
                {/* Fallback to Home if page doesn't exist */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            <Footer />
        </BrowserRouter>
    )
}