import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { addSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators'
import LefNav from './LefNav'

export default function AdminAddSubcategory() {
    const [name, setName] = useState("")
    const navigate = useNavigate()
    const dispatch = useDispatch()

    function postData(e) { e.preventDefault(); dispatch(addSubcategory({ name })); navigate("/admin-subcategory"); }

    return (
        <div className="container my-5 py-5"><div className="row"><div className="col-md-3"><LefNav/></div><div className="col-md-6"><div className="bg-white p-5 shadow rounded-2xl"><h3 className="mb-4">New Subcategory</h3><form onSubmit={postData}><input className="form-control mb-4" placeholder="Enter Name" onChange={(e)=>setName(e.target.value)} required/><button className="btn btn-info w-100 rounded-pill font-weight-bold">ADD SUB-CAT</button></form></div></div></div></div>
    )
}