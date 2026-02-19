import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
    var navigate = useNavigate()
    function logout() {
        localStorage.clear()
        navigate("/login")
    }
    return (
        <>
            <div className="py-1 bg-black">
                <div className="container">
                    <div className="row no-gutters d-flex align-items-center">
                        <div className="col-lg-12 d-block">
                            <div className="row d-flex">
                                <div className="col-md pr-4 d-flex topper align-items-center">
                                    <span className="text">+91 8447859784</span>
                                </div>
                                <div className="col-md pr-4 d-flex topper align-items-center">
                                    <span className="text">theafzalhussain786@gmail.com</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <nav className="navbar navbar-expand-lg navbar-dark ftco_navbar bg-dark ftco-navbar-light" id="ftco-navbar">
                <div className="container">
                    <Link className="navbar-brand" to="/">Eshopper</Link>
                    <div className="collapse navbar-collapse" id="ftco-nav">
                        <ul className="navbar-nav ml-auto">
                            <li className="nav-item"><Link to="/" className="nav-link">Home</Link></li>
                            <li className="nav-item"><Link to="/shop/All/" className="nav-link">Shop</Link></li>
                            <li className="nav-item"><Link to="/contact" className="nav-link">Contact</Link></li>
                            
                            {/* FIX: Admin link visible only for Admin role */}
                            {localStorage.getItem("role") === "Admin" ? 
                                <li className="nav-item"><Link to="/admin-home" className="nav-link">Admin</Link></li> : ""
                            }

                            <li className="nav-item cta cta-colored"><Link to="/cart" className="nav-link"><span className="icon-shopping_cart"></span></Link></li>
                            
                            {
                                localStorage.getItem("login") ?
                                    <li className="nav-item dropdown">
                                        <Link className="nav-link dropdown-toggle" to="#" id="dropdown04" data-toggle="dropdown">{localStorage.getItem("name")}</Link>
                                        <div className="dropdown-menu">
                                            <Link className="dropdown-item" to="/profile">Profile</Link>
                                            <button className="dropdown-item" onClick={logout}>Logout</button>
                                        </div>
                                    </li> :
                                    <li className="nav-item"><Link to="/login" className="nav-link">Login</Link></li>
                            }
                        </ul>
                    </div>
                </div>
            </nav>
        </>
    )
}