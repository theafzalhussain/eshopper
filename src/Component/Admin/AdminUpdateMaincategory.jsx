import React,{ useState , useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import LefNav from './LefNav'
import {  updateMaincategory, getMaincategory } from '../../Store/ActionCreaters/MaincategoryActionCreators'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'

export default function AdminUpdateMaincategory() {
    var [name, setname] = useState("")
    var {id} = useParams()
    var maincategory = useSelector((state) => state.MaincategoryStateData)
    var navigate = useNavigate()
    var dispatch = useDispatch()
    function getData(e) {
        setname(e.target.value)
    }
    function postData(e) {
        e.preventDefault()
        var item = maincategory.find((item) => item.name === name)
        if (item)
            alert("Maincategory Name is Already Exist")
        else {
            dispatch(updateMaincategory({ id:id, name: name }))
            navigate("/admin-maincategory")
        }
    }
     useEffect(()=>{
        dispatch(getMaincategory())
        var item = maincategory.find((item)=> item.id===Number(id))
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
                        <h5 className='bg-info text-center text-light p-2'>Maincategory <Link to="/admin-add-maincategory" className='float-right'><span className="material-symbols-outlined text-light">add</span></Link></h5>
                        <form className='p-3' onSubmit={postData}>
                            <div className="mb-3 p-3">
                                <label htmlFor='name'>Name</label>
                                <input type="text" name="name" id="name" placeholder='Enter Maincategory Name :' className='form-control' onChange={getData} value={name} />
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




