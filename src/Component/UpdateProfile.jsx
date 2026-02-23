import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUser, updateUser } from '../Store/ActionCreaters/UserActionCreators'

export default function Updateprofile() {
    const [data, setdata] = useState({ name: "", email: "", phone: "", addressline1: "", pic: null })
    const [loading, setLoading] = useState(false)
    const users = useSelector((state) => state.UserStateData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => {
        dispatch(getUser())
        const current = users.find(i => (i.id || i._id) === localStorage.getItem("userid"))
        if (current) setdata({ ...current, password: "" })
    }, [users.length])

    async function postData(e) {
        e.preventDefault(); setLoading(true);
        let fd = new FormData();
        fd.append("id", localStorage.getItem("userid"));
        fd.append("name", data.name);
        fd.append("email", data.email);
        fd.append("phone", data.phone);
        if (data.pic && typeof data.pic !== "string") fd.append("pic", data.pic);

        dispatch(updateUser(fd));
        setTimeout(() => { setLoading(false); navigate("/profile"); }, 2500);
    }

    return (
        <div className="container py-5">
            <form onSubmit={postData} className="bg-white p-5 shadow rounded">
                <h2>Update Profile</h2>
                <input type="text" name="name" className="form-control mb-3" value={data.name} onChange={(e) => setdata({...data, name: e.target.value})} />
                <input type="file" onChange={(e) => setdata({...data, pic: e.target.files[0]})} className="mb-3" />
                <button className="btn btn-info btn-block">{loading ? "Syncing..." : "Update Account"}</button>
            </form>
        </div>
    )
}