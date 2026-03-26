import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LefNav from './LefNav'
import { useSelector, useDispatch } from 'react-redux'
import { addUser, getUser } from '../../Store/ActionCreaters/UserActionCreators'
import { motion } from 'framer-motion'
import { UserPlus, ArrowLeft, Users } from 'lucide-react'
import './SystemControlCenter.css'

export default function AdminAddUser() {
    var [name, setname] = useState("")
    var user = useSelector((state) => state.UserStateData)
    var navigate = useNavigate()
    var dispatch = useDispatch()

    function getData(e) {
        setname(e.target.value)
    }

    function postData(e) {
        e.preventDefault()
        var item = user.find((item) => item.name === name)
        if (item)
            alert("User Name is Already Exist")
        else {
            dispatch(addUser({ name: name }))
            navigate("/admin-user")
        }
    }

    useEffect(() => {
        dispatch(getUser())
    }, [])

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }} className="py-5">
            {/* Premium Sidebar */}
            <LefNav />

            {/* Main Content Area */}
            <div className="admin-main-content">
                <div className="container-fluid">
                    <div className="w-100">
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white shadow-lg rounded-2xl p-4 border-0">
                            <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between mb-4 gap-3">
                                <div className="d-flex align-items-center">
                                    <Link to="/admin-user" className="btn btn-light rounded-circle p-2 mr-3 shadow-sm">
                                        <ArrowLeft size={18} />
                                    </Link>
                                    <h4 className="font-weight-bold mb-0 d-flex align-items-center">
                                        <Users className="mr-2 text-info" /> Add New User
                                    </h4>
                                </div>
                            </div>

                            <form onSubmit={postData}>
                                <div className="mb-4">
                                    <label htmlFor='name' className="font-weight-bold text-secondary mb-2 d-block">User Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        id="name"
                                        placeholder='Enter User Name'
                                        className='form-control rounded-lg p-3'
                                        onChange={getData}
                                        required
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    type='submit'
                                    className='btn btn-info w-100 py-3 rounded-pill font-weight-bold shadow-lg d-flex align-items-center justify-content-center'
                                >
                                    <UserPlus size={20} className="mr-2" /> Add User
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}




