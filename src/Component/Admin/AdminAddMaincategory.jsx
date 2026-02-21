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
        alert("Maincategory Added!")
        navigate("/admin-maincategory") // This will now work properly
    }

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-3"><LefNav /></div>
                <div className="col-lg-6">
                    <div className="bg-white p-5 shadow-lg rounded-3xl">
                        <h4 className="text-center bg-info p-2 text-light rounded mb-4">Add Maincategory</h4>
                        <form onSubmit={postData}>
                            <div className="mb-3">
                                <label className="font-weight-bold">Category Name</label>
                                <input type="text" className="form-control" onChange={(e) => setName(e.target.value)} placeholder="Enter Name" required />
                            </div>
                            <button type='submit' className='btn btn-info w-100 py-3 font-weight-bold rounded-pill shadow'>ADD CATEGORY</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}