import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser } from '../Store/ActionCreaters/UserActionCreators'

export default function Login() {
    var [data, setdata] = useState({ username: "", password: "" })
    var users = useSelector((state) => state.UserStateData)
    var dispatch = useDispatch()
    var navigate = useNavigate()

    function postData(e) {
        e.preventDefault()
        var user = users.find((item) => item.username === data.username && item.password === data.password)
        if (user) {
            localStorage.setItem("login", true)
            localStorage.setItem("name", user.name)
            localStorage.setItem("username", user.username)
            localStorage.setItem("userid", user.id) // MongoDB String ID
            localStorage.setItem("role", user.role)
            if (user.role === "Admin") navigate("/admin-home")
            else navigate("/profile")
        } else {
            alert("Invalid Username or Password!!!")
        }
    }

    useEffect(() => { dispatch(getUser()) }, [dispatch])

    return (
        <div className="container my-5 py-5">
            <div className="row justify-content-center">
                <div className="col-md-5 bg-light p-4 rounded shadow">
                    <h5 className='text-center bg-info p-2 text-light rounded'>Login to Eshopper</h5>
                    <form onSubmit={postData}>
                        <input type="text" name="username" onChange={(e) => setdata({ ...data, username: e.target.value })} placeholder='Username' className='form-control mb-3' required />
                        <input type="password" name="password" onChange={(e) => setdata({ ...data, password: e.target.value })} placeholder='Password' className='form-control mb-3' required />
                        <button className='btn btn-info w-100 mb-3' type='submit'>Login</button>
                    </form>
                    <div className='d-flex justify-content-between small'>
                        <Link to="#">Forgot Password?</Link>
                        <Link to="/signup">New User? Create Account</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}