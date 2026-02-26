import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbaar from './Navbaar'
import Footer from './Footer'
import Home from './Home'
import About from './About'
import Contact from './Contact'
import Shop from './Shop'
import Cart from './Cart'
import Wishlist from './Wishlist'
import Checkout from './Checkout'
import SingleProductPage from './SingleProductPage'
import Confirmation from './confirmation'
import Login from './Login'
import SingUp from './SingUp'
import ForgetPassword from './ForgetPassword'
import Profile from './Profile'
import UpdateProfile from './UpdateProfile'
import AdminHome from './Admin/AdminHome'
import AdminUser from './Admin/AdminUser'
import AdminContact from './Admin/AdminContact'
import AdminNewsletter from './Admin/AdminNewsletter'
import AdminCheckout from './Admin/AdminCheckout'
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

const AdminRoute = ({ children }) => {
    const isLoggedIn = localStorage.getItem("login") === "true";
    const role = localStorage.getItem("role");
    if (!isLoggedIn || role !== "Admin") {
        return <Navigate to="/login" replace />;
    }
    return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Navbaar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/shop/:maincat" element={<Shop />} />
        <Route path="/single-product/:id" element={<SingleProductPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SingUp />} />
        <Route path="/forget-password" element={<ForgetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/update-profile" element={<UpdateProfile />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/admin-home" element={<AdminRoute><AdminHome /></AdminRoute>} />
        <Route path="/admin-user" element={<AdminRoute><AdminUser /></AdminRoute>} />
        <Route path="/admin-contact" element={<AdminRoute><AdminContact /></AdminRoute>} />
        <Route path="/admin-newsletter" element={<AdminRoute><AdminNewsletter /></AdminRoute>} />
        <Route path="/admin-checkout" element={<AdminRoute><AdminCheckout /></AdminRoute>} />
        <Route path="/admin-maincategory" element={<AdminRoute><AdminMaincategory /></AdminRoute>} />
        <Route path="/admin-add-maincategory" element={<AdminRoute><AdminAddMaincategory /></AdminRoute>} />
        <Route path="/admin-update-maincategory/:id" element={<AdminRoute><AdminUpdateMaincategory /></AdminRoute>} />
        <Route path="/admin-subcategory" element={<AdminRoute><AdminSubcategory /></AdminRoute>} />
        <Route path="/admin-add-subcategory" element={<AdminRoute><AdminAddSubcategory /></AdminRoute>} />
        <Route path="/admin-update-subcategory/:id" element={<AdminRoute><AdminUpdateSubcategory /></AdminRoute>} />
        <Route path="/admin-brand" element={<AdminRoute><AdminBrand /></AdminRoute>} />
        <Route path="/admin-add-brand" element={<AdminRoute><AdminAddBrand /></AdminRoute>} />
        <Route path="/admin-update-brand/:id" element={<AdminRoute><AdminUpdateBrand /></AdminRoute>} />
        <Route path="/admin-product" element={<AdminRoute><AdminProduct /></AdminRoute>} />
        <Route path="/admin-add-product" element={<AdminRoute><AdminAddProduct /></AdminRoute>} />
        <Route path="/admin-update-product/:id" element={<AdminRoute><AdminUpdateProduct /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}