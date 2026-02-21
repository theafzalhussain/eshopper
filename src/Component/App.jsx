import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import About from './About'
import Cart from './Cart'
import Checkout from './Checkout'
import Contact from './Contact'
import Footer from './Footer'
import Home from './Home'
import Login from './Login'
import Navbaar from './Navbaar'
import Shop from './Shop'
import SingleProductPage from './SingleProductPage'
import SingUp from './SingUp'
import Profile from './Profile'
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
import AdminAddUser from './Admin/AdminAddUser'
import AdminUser from './Admin/AdminUser'
import AdminUpdateUser from './Admin/AdminUpdateUser'
import Updateprofile from './UpdateProfile'
import AdminAddCart from './Admin/AdminAddCart'
import AdminCart from './Admin/AdminCart'
import AdminUpdateCart from './Admin/AdminUpdateCart'
import AdminAddWishlist from './Admin/AdminAddWishlist'
import AdminWishlist from './Admin/AdminWishlist'
import AdminUpdateWishlist from './Admin/AdminUpdateWishlist'
import Confirmation from './confirmation'
import Wishlist from './Wishlist'
import ForgetPassword from './Component/ForgetPassword'

export default function App() {
  return (
    <>
    <BrowserRouter>
    <Navbaar/>
    <Routes>
        <Route path='/' element = {<Home/>}/>
        <Route path='/about' element = {<About/>}/>
        <Route path='/shop/:maincat/' element={<Shop />} />
        <Route path='/contact' element = {<Contact/>}/>
        <Route path='/cart' element = {<Cart/>}/>
        <Route path='/checkout' element = {<Checkout/>}/>
        <Route path='/single-product/:id' element = {<SingleProductPage/>}/>
        
        {/* FIXED: Wishlist path was wrong, now corrected */}
        <Route path='/wishlist' element = {<Wishlist/>}/> 
        
        <Route path='/login' element = {<Login/>}/>
        <Route path='/signup' element = {<SingUp/>}/>
        <Route path='/forget-password' element={<ForgetPassword />} />
        <Route path='/profile' element = {<Profile/>}/>
        <Route path='/update-profile' element = {<Updateprofile/>}/>
        <Route path='/confirmation' element = {<Confirmation/>}/>

        {/* Admin Routes */}
        <Route path='/admin-home' element = {<AdminHome/>}/>
        <Route path='/admin-maincategory' element = {<AdminMaincategory/>}/>
        <Route path='/admin-add-maincategory' element = {<AdminAddMaincategory/>}/>
        <Route path='/admin-update-maincategory/:id' element = {<AdminUpdateMaincategory/>}/>
        <Route path='/admin-subcategory' element = {<AdminSubcategory/>}/>
        <Route path='/admin-add-subcategory' element = {<AdminAddSubcategory/>}/>
        <Route path='/admin-update-subcategory/:id' element = {<AdminUpdateSubcategory/>}/>
        <Route path='/admin-brand' element = {<AdminBrand/>}/>
        <Route path='/admin-add-brand' element = {<AdminAddBrand/>}/>
        <Route path='/admin-update-brand/:id' element = {<AdminUpdateBrand/>}/>
        <Route path='/admin-product' element = {<AdminProduct/>}/>
        <Route path='/admin-add-product' element = {<AdminAddProduct/>}/>
        <Route path='/admin-update-product/:id' element = {<AdminUpdateProduct/>}/>
        <Route path='/admin-user' element = {<AdminUser/>}/>
        <Route path='/admin-cart' element = {<AdminCart/>}/>
        <Route path='/admin-add-cart' element = {<AdminAddCart/>}/>
        <Route path='/admin-update-cart/:id' element = {<AdminUpdateCart/>}/>
        <Route path='/admin-wishlist' element = {<AdminWishlist/>}/>
        <Route path='/admin-add-wishlist' element = {<AdminAddWishlist/>}/>
        <Route path='/admin-update-wishlist/:id' element = {<AdminUpdateWishlist/>}/>
    </Routes>
    <Footer/>
    </BrowserRouter>
    </>
  )
}