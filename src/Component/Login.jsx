import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser } from '../Store/ActionCreaters/UserActionCreators'

export default function Login() {
    var [data, setdata] = useState({ username: "", password: "" })
    var users = useSelector((state) => state.UserStateData)
    var dispatch = useDispatch()
    var navigate = useNavigate()
    var location = useLocation() // URL history check karne ke liye

    function getData(e) {
        var { name, value } = e.target
        setdata((old) => ({ ...old, [name]: value }))
    }

    function postData(e) {
        e.preventDefault()
        var user = users.find((item) => item.username === data.username && item.password === data.password)
        if (user) {
            localStorage.setItem("login", true)
            localStorage.setItem("name", user.name)
            localStorage.setItem("username", user.username)
            localStorage.setItem("userid", user.id)
            localStorage.setItem("role", user.role)

            // Logic: Agar koi "previous path" hai toh wahan jao, warna Home page jao
            const backUrl = location.state?.from || "/"
            navigate(backUrl)
        } else {
            alert("Invalid Username or Password!!!")
        }
    }

    useEffect(() => {
        dispatch(getUser())
    }, [dispatch])

    return (
        <div className="container my-5 py-5">
            <div className="row justify-content-center">
                <div className="col-md-5 bg-light p-5 shadow rounded">
                    <h5 className='text-center bg-secondary p-2 text-light rounded'>Login Section</h5>
                    <form onSubmit={postData}>
                        <input type="text" name="username" onChange={getData} placeholder='Username' className='form-control mb-3' />
                        <input type="password" name="password" onChange={getData} placeholder='Password' className='form-control mb-3' />
                        <button className='btn btn-secondary w-100' type='submit'>Login</button>
                    </form>
                    <div className='mt-3 small d-flex justify-content-between'>
                        <Link to="#">Forget Password?</Link>
                        <Link to="/signup">Create Account</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}