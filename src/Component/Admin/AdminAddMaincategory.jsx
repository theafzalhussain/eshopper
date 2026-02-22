import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { addMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators'
import LefNav from './LefNav'

export default function AdminAddMaincategory() {
    const [name, setName] = useState("")
    const navigate = useNavigate()
    const dispatch = useDispatch()

    function postData(e) {
        e.preventDefault()
        dispatch(addMaincategory({ name: name }))
        navigate("/admin-maincategory")
    }

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-3"><LefNav /></div>
                <div className="col-lg-6">
                    <div className="bg-white p-5 shadow rounded-2xl border-0">
                        <h4 className="text-center font-weight-bold mb-4">New Maincategory</h4>
                        <form onSubmit={postData}>
                            <input type="text" className="form-control mb-4" placeholder="Enter Name" onChange={(e) => setName(e.target.value)} required />
                            <button className="btn btn-info w-100 py-3 rounded-pill font-weight-bold">SAVE CATEGORY</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}