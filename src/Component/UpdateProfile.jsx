import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser, updateUser } from '../Store/ActionCreaters/UserActionCreators'

export default function Updateprofile() {
    var [data, setdata] = useState({
        name: "",
        email: "",
        phone: "",
        addressline1: "",
        addressline2: "",
        addressline3: "",
        pin: "",
        city: "",
        state: "",
        pic: null 
    })
    var users = useSelector((state) => state.UserStateData)
    var dispatch = useDispatch()
    var navigate = useNavigate()

    function getData(e) {
        var { name, value } = e.target
        setdata((old) => ({ ...old, [name]: value }))
    }

    function getFile(e) {
        setdata((old) => ({ ...old, pic: e.target.files[0] }))
    }

    function postData(e) {
        e.preventDefault()
        var formData = new FormData()
        formData.append("id", localStorage.getItem("userid"))
        formData.append("name", data.name)
        formData.append("email", data.email)
        formData.append("phone", data.phone)
        formData.append("addressline1", data.addressline1)
        formData.append("addressline2", data.addressline2)
        formData.append("addressline3", data.addressline3)
        formData.append("pin", data.pin)
        formData.append("city", data.city)
        formData.append("state", data.state)
        if (data.pic) formData.append("pic", data.pic)

        dispatch(updateUser(formData))
        
        // Zaroori: LocalStorage ko naye naam se update karein
        localStorage.setItem("name", data.name)
        
        alert("Profile Updated Successfully!")
        navigate("/profile")
    }

    useEffect(() => {
        dispatch(getUser())
        var currentUserId = localStorage.getItem("userid")
        var d = users.find((item) => item.id === currentUserId)
        if (d) setdata(d)
    }, [users.length])

    return (
        <div className="container-fluid my-5">
            <div className="row justify-content-center">
                <div className="col-md-8 bg-light p-4 shadow-sm">
                    <h5 className='text-center bg-info p-2 text-light'>Update Your Profile</h5>
                    <form onSubmit={postData}>
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label>Full Name</label>
                                <input type="text" name="name" onChange={getData} className='form-control' value={data.name} />
                            </div>
                            <div className="col-md-6">
                                <label>Profile Picture</label>
                                <input type="file" name="pic" onChange={getFile} className='form-control' />
                            </div>
                        </div>
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label>Email</label>
                                <input type="email" name="email" onChange={getData} className='form-control' value={data.email} />
                            </div>
                            <div className="col-md-6">
                                <label>Phone</label>
                                <input type="text" name="phone" onChange={getData} className='form-control' value={data.phone} />
                            </div>
                        </div>
                        <div className="mb-3">
                            <label>Address Line 1</label>
                            <input type="text" name="addressline1" onChange={getData} className='form-control' value={data.addressline1} />
                        </div>
                        <div className="row mb-3">
                            <div className="col-md-4">
                                <label>City</label>
                                <input type="text" name="city" onChange={getData} className='form-control' value={data.city} />
                            </div>
                            <div className="col-md-4">
                                <label>State</label>
                                <input type="text" name="state" onChange={getData} className='form-control' value={data.state} />
                            </div>
                            <div className="col-md-4">
                                <label>Pin Code</label>
                                <input type="text" name="pin" onChange={getData} className='form-control' value={data.pin} />
                            </div>
                        </div>
                        <button className='btn btn-info w-100 btn-lg' type='submit'>Update Profile</button>
                    </form>
                </div>
            </div>
        </div>
    )
}