import React from 'react'
import { Link } from 'react-router-dom'
import LefNav from './LefNav'
export default function AdminHome() {
    return (
        <>
            <div className="container-fluid my-5">
                <div className="row">
                    <div className="col-lg-2 col-12" >
                        <LefNav />
                    </div>
                    <div className="col-lg-10 col-12">
                        <div className="row">
                            <div className="col-md-5 my-2">
                                <img src="assets/images/bg_1.jpg" height="450px" width="85%"  alt="" />
                      </div>
                      <div className="col-md-7 my-2">
                      <h5 className='text-center p-2 bg-info text-light'>Admin Home</h5>
                      <div className="d-flex">
                        <div className='border p-3 w-50'>Name</div>
                        <div className='border p-3 w-50'>Afzal Hussain</div>
                      </div>
                      <div className="d-flex">
                        <div className='border p-3 w-50'>User Name</div>
                        <div className='border p-3 w-50'>Admin</div>
                      </div>
                      <div className="d-flex">
                        <div className='border p-3 w-50'>Email</div>
                        <div className='border p-3 w-50'>Admain@gmail.com</div>
                      </div>
                      <div className="d-flex">
                        <div className='border p-3 w-50'>Phone </div>
                        <div className='border p-3 w-50'>8447859784</div>
                      </div>
                      <div className="d-flex">
                        <div className='border p-3 w-50'>Role</div>
                        <div className='border p-3 w-50'>Admin</div>
                      </div>
                      <div>
                        <Link to="/update-profile" className='btn btn-info w-100 mt-2 p-2'>Update Profile</Link>
                      </div>
                      </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
