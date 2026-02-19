import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser, updateUser } from '../Store/ActionCreaters/UserActionCreators'

export default function Updateprofile() {
    var [data, setdata] = useState({ name: "", email: "", phone: "", pic: null })
    var users = useSelector((state) => state.UserStateData)
    var dispatch = useDispatch()
    var navigate = useNavigate()

    useEffect(() => {
        dispatch(getUser())
        var d = users.find((item) => item.id === localStorage.getItem("userid"))
        if (d) setdata(d)
    }, [users.length])

    function postData(e) {
        e.preventDefault()
        var formData = new FormData()
        for (let key in data) {
            formData.append(key, data[key])
        }
        dispatch(updateUser(formData))
        navigate("/profile")
    }

    return (
        <div className="container my-5">
            <form onSubmit={postData} className="w-50 m-auto">
                <h5>Update Profile</h5>
                <input type="text" className="form-control mb-2" value={data.name} onChange={(e)=>setdata({...data, name: e.target.value})} />
                <input type="file" className="form-control mb-2" onChange={(e)=>setdata({...data, pic: e.target.files[0]})} />
                <button className="btn btn-secondary w-100">Update</button>
            </form>
        </div>
    )
}