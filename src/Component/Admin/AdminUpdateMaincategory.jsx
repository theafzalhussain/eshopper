import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getMaincategory, updateMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators'
import LefNav from './LefNav'

export default function AdminUpdateMaincategory() {
    const [name, setName] = useState("")
    const { id } = useParams()
    const maincategory = useSelector((state) => state.MaincategoryStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => {
        dispatch(getMaincategory())
        const item = maincategory.find((x) => (x._id || x.id) === id)
        if (item) setName(item.name)
    }, [maincategory.length])

    function postData(e) {
        e.preventDefault()
        dispatch(updateMaincategory({ id: id, name: name }))
        navigate("/admin-maincategory")
    }

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-3"><LefNav /></div>
                <div className="col-lg-6 text-left">
                    <div className="bg-white p-5 shadow rounded-3xl">
                        <h4 className="bg-dark p-2 text-light rounded mb-4 text-center">Edit Category</h4>
                        <form onSubmit={postData}>
                            <div className="mb-3">
                                <label>New Category Name</label>
                                <input type="text" value={name} className="form-control" onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <button type='submit' className='btn btn-info w-100 rounded-pill'>SAVE CHANGES</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}