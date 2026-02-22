import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbaar from './Navbaar'
import Footer from './Footer'
import Home from './Home'
import AdminHome from './Admin/AdminHome'

// Category Sections
import AdminMaincategory from './Admin/AdminMaincategory'
import AdminAddMaincategory from './Admin/AdminAddMaincategory'
import AdminUpdateMaincategory from './Admin/AdminUpdateMaincategory'

import AdminSubcategory from './Admin/AdminSubcategory'
import AdminAddSubcategory from './Admin/AdminAddSubcategory'
import AdminUpdateSubcategory from './Admin/AdminUpdateSubcategory'

import AdminBrand from './Admin/AdminBrand'
import AdminAddBrand from './Admin/AdminAddBrand'
import AdminUpdateBrand from './Admin/AdminUpdateBrand'

// Product Section
import AdminProduct from './Admin/AdminProduct'
import AdminAddProduct from './Admin/AdminAddProduct'
import AdminUpdateProduct from './Admin/AdminUpdateProduct'

// User Sections
import AdminUser from './Admin/AdminUser'
import Login from './Login'

export default function App() {
  return (
    <BrowserRouter>
      <Navbaar />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
        
        {/* Admin Logic Routes - Inhe dhyan se check karein */}
        <Route path='/admin-home' element={<AdminHome />} />
        
        {/* MAINCATEGORY */}
        <Route path='/admin-maincategory' element={<AdminMaincategory />} />
        <Route path='/admin-add-maincategory' element={<AdminAddMaincategory />} />
        <Route path='/admin-update-maincategory/:id' element={<AdminUpdateMaincategory />} />

        {/* SUBCATEGORY */}
        <Route path='/admin-subcategory' element={<AdminSubcategory />} />
        <Route path='/admin-add-subcategory' element={<AdminAddSubcategory />} />
        <Route path='/admin-update-subcategory/:id' element={<AdminUpdateSubcategory />} />

        {/* BRAND */}
        <Route path='/admin-brand' element={<AdminBrand />} />
        <Route path='/admin-add-brand' element={<AdminAddBrand />} />
        <Route path='/admin-update-brand/:id' element={<AdminUpdateBrand />} />

        {/* PRODUCT */}
        <Route path='/admin-product' element={<AdminProduct />} />
        <Route path='/admin-add-product' element={<AdminAddProduct />} />
        <Route path='/admin-update-product/:id' element={<AdminUpdateProduct />} />

        {/* USERS */}
        <Route path='/admin-user' element={<AdminUser />} />

        {/* Error Redirect logic */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}