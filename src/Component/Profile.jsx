import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { getUser } from "../Store/ActionCreaters/UserActionCreators"
import BuyerProfile from './BuyerProfile'

export default function Profile() {
    var users = useSelector((state) => state.UserStateData)
    var [user, setuser] = useState({})
    var dispatch = useDispatch()

    useEffect(() => {
        dispatch(getUser())
        // FIX: MongoDB IDs are strings
        var data = users.find((item) => item.id === localStorage.getItem("userid"))
        if (data) setuser(data)
    }, [users.length])

    return (
        <div className='container my-5'>
            <div className="row">
                <div className="col-md-4">
                    <img src={user.pic || "/assets/images/noimage.png"} className="img-fluid rounded" alt="" />
                </div>
                <div className="col-md-8">
                    <BuyerProfile user={user} />
                </div>
            </div>
        </div>
    )
}