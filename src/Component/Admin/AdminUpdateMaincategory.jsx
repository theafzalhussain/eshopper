import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getMaincategory, updateMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators'
import LefNav from './LefNav'

export default function AdminUpdateMaincategory() {
    const [name, setName] = useState("")
    const { id } = useParams()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const maincategory = useSelector((state) => state.MaincategoryStateData)

    useEffect(() => {
        dispatch(getMaincategory())
        const item = maincategory.find((x) => (x.id || x._id) === id)
        if (item) setName(item.name)
    }, [maincategory.length, id])

    function postData(e) {
        e.preventDefault()
        dispatch(updateMaincategory({ id: id, name: name }))
        navigate("/admin-maincategory")
    }

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-3"><LefNav /></div>
                <div className="col-lg-6">
                    <div className="bg-white p-5 shadow rounded-2xl">
                        <h4 className="font-weight-bold mb-4">Update Category</h4>
                        <form onSubmit={postData}>
                            <input type="text" value={name} className="form-control mb-4" onChange={(e) => setName(e.target.value)} required />
                            <button className="btn btn-dark w-100 py-3 rounded-pill font-weight-bold">UPDATE CHANGES</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}