import React,{ useState , useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import LefNav from './LefNav'
import {  updateWishlist, getWishlist } from '../../Store/ActionCreaters/WishlistActionCreators'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'

export default function AdminUpdateWishlist() {
    var [name, setname] = useState("")
    var {id} = useParams()
    var wishlist = useSelector((state) => state.WishlistStateData)
    var navigate = useNavigate()
    var dispatch = useDispatch()
    function getData(e) {
        setname(e.target.value)
    }
    function postData(e) {
        e.preventDefault()
        var item = wishlist.find((item) => item.name === name)
        if (item)
            alert("Wishlist Name is Already Exist")
        else {
            dispatch(updateWishlist({ id:id, name: name }))
            navigate("/admin-wishlist")
        }
    }
     useEffect(()=>{
        dispatch(getWishlist())
        var item = wishlist.find((item)=> item.id===Number(id))
        setname(item.name)
     },[])
    return (
        <>
            <div className="container-fluid my-5">
                <div className="row">
                    <div className="col-lg-2 col-12" >
                        <LefNav />
                    </div>
                    <div className="col-lg-10 col-12 mt-2">
                        <h5 className='bg-info text-center text-light p-2'>Wishlist <Link to="/admin-add-wishlist" className='float-right'><span className="material-symbols-outlined text-light">add</span></Link></h5>
                        <form className='p-3' onSubmit={postData}>
                            <div className="mb-3 p-3">
                                <label htmlFor='name'>Name</label>
                                <input type="text" name="name" id="name" placeholder='Enter Wishlist Name :' className='form-control' onChange={getData} value={name} />
                            </div>
                            <div className="mb-3">
                                <button type='submit' className='btn btn-info w-100  btn-lg'>Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}




