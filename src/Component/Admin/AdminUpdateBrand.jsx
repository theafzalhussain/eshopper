import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getBrand, updateBrand } from '../../Store/ActionCreaters/BrandActionCreators'
import LefNav from './LefNav'

export default function AdminUpdateBrand() {
    const [name, setName] = useState("")
    const { id } = useParams()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const brand = useSelector((state) => state.BrandStateData)

    useEffect(() => {
        dispatch(getBrand())
        const item = brand.find((x) => (x.id || x._id) === id)
        if (item) setName(item.name)
    }, [brand.length, id])

    function postData(e) { e.preventDefault(); dispatch(updateBrand({ id, name })); navigate("/admin-brand"); }

    return (
        <div className="container-fluid my-5"><div className="row"><div className="col-lg-3"><LefNav /></div><div className="col-lg-6"><div className="bg-white p-5 shadow rounded-2xl"><h4 className="mb-4">Modify Brand</h4><form onSubmit={postData}><input type="text" value={name} className="form-control mb-4" onChange={(e) => setName(e.target.value)} required /><button className="btn btn-dark w-100 rounded-pill font-weight-bold">SAVE CHANGES</button></form></div></div></div></div>
    )
}