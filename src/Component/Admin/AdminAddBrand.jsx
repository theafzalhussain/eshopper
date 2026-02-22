import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { addBrand } from '../../Store/ActionCreaters/BrandActionCreators'
import LefNav from './LefNav'

export default function AdminAddBrand() {
    const [name, setName] = useState("")
    const navigate = useNavigate()
    const dispatch = useDispatch()
    return (
        <div className="container my-5 py-5"><div className="row"><div className="col-md-3"><LefNav/></div><div className="col-md-6"><div className="bg-white p-5 shadow rounded-3xl"><h3 className="mb-4">Register Brand</h3><form onSubmit={(e)=>{e.preventDefault(); dispatch(addBrand({name})); navigate("/admin-brand")}}><input className="form-control mb-4" placeholder="Name" onChange={(e)=>setName(e.target.value)} required/><button className="btn btn-info w-100 rounded-pill font-weight-bold shadow-sm">REGISTER</button></form></div></div></div></div>
    )
}