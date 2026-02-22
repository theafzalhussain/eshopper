import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getSubcategory, updateSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators'
import LefNav from './LefNav'

export default function AdminUpdateSubcategory() {
    const [name, setName] = useState("")
    const { id } = useParams()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const subcategory = useSelector((state) => state.SubcategoryStateData)

    useEffect(() => {
        dispatch(getSubcategory())
        const item = subcategory.find((x) => (x.id || x._id) === id)
        if (item) setName(item.name)
    }, [subcategory.length, id])

    function postData(e) { e.preventDefault(); dispatch(updateSubcategory({ id, name })); navigate("/admin-subcategory"); }

    return (
        <div className="container-fluid my-5"><div className="row"><div className="col-lg-3"><LefNav /></div><div className="col-lg-6"><div className="bg-white p-5 shadow rounded-2xl"><h4 className="mb-4">Edit Subcategory</h4><form onSubmit={postData}><input type="text" value={name} className="form-control mb-4" onChange={(e) => setName(e.target.value)} required /><button className="btn btn-dark w-100 rounded-pill font-weight-bold">UPDATE</button></form></div></div></div></div>
    )
}