import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

// Layout
import Navbaar from './Navbaar'
import Footer from './Footer'
import Home from './Home'
import About from './About'
import Contact from './Contact'

// Product & Shopping
import Shop from './Shop'
import Cart from './Cart'
import Wishlist from './Wishlist'
import Checkout from './Checkout'
import SingleProductPage from './SingleProductPage'
import Confirmation from './confirmation'

// Auth & User Profile
import Login from './Login'
import SingUp from './SingUp'
import ForgetPassword from './ForgetPassword'
import Profile from './Profile'
import UpdateProfile from './UpdateProfile' 

// Admin Sections
import AdminHome from './Admin/AdminHome'
import AdminUser from './Admin/AdminUser'
import AdminContact from './Admin/AdminContact'
import AdminNewsletter from './Admin/AdminNewsletter'
import AdminCheckout from './Admin/AdminCheckout'

// Admin CRUD Imports (Checking case sensitivity)
import AdminMaincategory from './Admin/AdminMaincategory'
import AdminAddMaincategory from './Admin/AdminAddMaincategory'
import AdminUpdateMaincategory from './Admin/AdminUpdateMaincategory'
import AdminSubcategory from './Admin/AdminSubcategory'
import AdminAddSubcategory from './Admin/AdminAddSubcategory'
import AdminUpdateSubcategory from './Admin/AdminUpdateSubcategory'
import AdminBrand from './Admin/AdminBrand'
import AdminAddBrand from './Admin/AdminAddBrand'
import AdminUpdateBrand from './Admin/AdminUpdateBrand'
import AdminProduct from './Admin/AdminProduct'
import AdminAddProduct from './Admin/AdminAddProduct'
import AdminUpdateProduct from './Admin/AdminUpdateProduct'

const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
    return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop /> 
      <Navbaar />
      
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/shop/:maincat" element={<Shop />} />
        <Route path="/single-product/:id" element={<SingleProductPage />} />
        
        {/* AUTH (Fixed path matching) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SingUp />} />
        <Route path="/forget-password" element={<ForgetPassword />} />

        {/* CUSTOMER */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/update-profile" element={<UpdateProfile />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/confirmation" element={<Confirmation />} />

        {/* ADMIN CONTROL */}
        <Route path="/admin-home" element={<AdminHome />} />
        <Route path="/admin-user" element={<AdminUser />} />
        <Route path="/admin-contact" element={<AdminContact />} />
        <Route path="/admin-newsletter" element={<AdminNewsletter />} />
        <Route path="/admin-checkout" element={<AdminCheckout />} />

        {/* ADMIN CRUD */}
        <Route path="/admin-maincategory" element={<AdminMaincategory />} />
        <Route path="/admin-add-maincategory" element={<AdminAddMaincategory />} />
        <Route path="/admin-update-maincategory/:id" element={<AdminUpdateMaincategory />} />
        <Route path="/admin-subcategory" element={<AdminSubcategory />} />
        <Route path="/admin-add-subcategory" element={<AdminAddSubcategory />} />
        <Route path="/admin-update-subcategory/:id" element={<AdminUpdateSubcategory />} />
        <Route path="/admin-brand" element={<AdminBrand />} />
        <Route path="/admin-add-brand" element={<AdminAddBrand />} />
        <Route path="/admin-update-brand/:id" element={<AdminUpdateBrand />} />
        <Route path="/admin-product" element={<AdminProduct />} />
        <Route path="/admin-add-product" element={<AdminAddProduct />} />
        <Route path="/admin-update-product/:id" element={<AdminUpdateProduct />} />

        {/* CATCH ALL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  )
}