import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

import Navbaar from './Navbaar'
import Footer from './Footer'
import Home from './Home'
import About from './About'
import Contact from './Contact'
import Shop from './Shop'
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
import AdminUser from './Admin/AdminUser'
import AdminMaincategory from './Admin/AdminMaincategory'
import AdminAddMaincategory from './Admin/AdminAddMaincategory'
import AdminSubcategory from './Admin/AdminSubcategory'
import AdminBrand from './Admin/AdminBrand'
import AdminProduct from './Admin/AdminProduct'
import AdminAddProduct from './Admin/AdminAddProduct'
import AdminContact from './Admin/AdminContact'
import AdminNewsletter from './Admin/AdminNewsletter'
import AdminCheckout from './Admin/AdminCheckout'

function ScrollToTop() {
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
        {/* Sabse pehle static pages rakhte hain redirects hatane ke liye */}
        <Route path='/' element={<Home />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/about' element={<About />} />
        <Route path='/shop/:maincat' element={<Shop />} />
        <Route path='/single-product/:id' element={<SingleProductPage />} />
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<SingUp />} />
        <Route path='/forget-password' element={<ForgetPassword />} />
        <Route path='/wishlist' element={<Wishlist />} />
        <Route path='/cart' element={<Cart />} />
        <Route path='/checkout' element={<Checkout />} />
        <Route path='/profile' element={<Profile />} />
        <Route path='/update-profile' element={<Updateprofile />} />
        <Route path='/confirmation' element={<Confirmation />} />

        {/* Admin Routes */}
        <Route path='/admin-home' element={<AdminHome />} />
        <Route path='/admin-user' element={<AdminUser />} />
        <Route path='/admin-maincategory' element={<AdminMaincategory />} />
        <Route path='/admin-add-maincategory' element={<AdminAddMaincategory />} />
        <Route path='/admin-subcategory' element={<AdminSubcategory />} />
        <Route path='/admin-brand' element={<AdminBrand />} />
        <Route path='/admin-product' element={<AdminProduct />} />
        <Route path='/admin-add-product' element={<AdminAddProduct />} />
        <Route path='/admin-contact' element={<AdminContact />} />
        <Route path='/admin-newsletter' element={<AdminNewsletter />} />
        <Route path='/admin-checkout' element={<AdminCheckout />} />
        
        {/* Default redirect (Only if NO match found) */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}