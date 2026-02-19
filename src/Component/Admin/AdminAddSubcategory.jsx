import React,{ useState , useEffect } from 'react'
import { Link } from 'react-router-dom'
import LefNav from './LefNav'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { addSubcategory, getSubcategory } from '../../Store/ActionCreaters/SubcategoryActionCreators'


export default function AdminAddSubcategory() {
    var [name, setname] = useState("")
    var subcategory = useSelector((state) => state.SubcategoryStateData)
    var navigate = useNavigate()
    var dispatch = useDispatch()
    function getData(e) {
        setname(e.target.value)
    }
    function postData(e) {
        e.preventDefault()
        var item = subcategory.find((item) => item.name === name)
        if (item)
            alert("Subcategory Name is Already Exist")
        else {
            dispatch(addSubcategory({ name: name }))
            navigate("/admin-subcategory")
        }
    }
     useEffect(()=>{
        dispatch(getSubcategory())
     },[])
    return (
        <>
            <div className="container-fluid my-5">
                <div className="row">
                    <div className="col-lg-2 col-12" >
                        <LefNav />
                    </div>
                    <div className="col-lg-10 col-12 mt-2">
                        <h5 className='bg-info text-center text-light p-2'>Subcategory <Link to="/admin-add-subcategory" className='float-right'><span className="material-symbols-outlined text-light">add</span></Link></h5>
                        <form className='p-3' onSubmit={postData}>
                            <div className="mb-3 p-3">
                                <label htmlFor='name'>Name</label>
                                <input type="text" name="name" id="name" placeholder='Enter Subcategory Name :' className='form-control' onChange={getData} />
                            </div>
                            <div className="mb-3">
                                <button type='submit' className='btn btn-info w-100  btn-lg'>Add</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}




