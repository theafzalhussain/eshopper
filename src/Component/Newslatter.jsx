import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { addNewslatter, getNewslatter } from "../Store/ActionCreaters/NewslatterActionCreators"
export default function Newslatter() {
    var [email, setemail] = useState("")
    var [show, setshow] = useState(false)
    var [msg, setmsg] = useState(false)
    var newslatter = useSelector((state) => state.NewslatterStateData)
    var dispatch = useDispatch()
    function getData(e) {
        setemail(e.target.value)
    }
    function postData(e) {
        e.preventDefault()
        var d = newslatter.find((item) => item.email === email)
        if (d) {
            setshow(true)
            setmsg("Your Email Id is Already Subscribed!!!!")
        }
        dispatch(addNewslatter({ email: email }))
        setshow(true)
        setmsg("Thanks to Subscibe our Newslatter Service!!!")
    }
    useEffect(() => {
        dispatch(getNewslatter())
    }, [newslatter.length])
    return (
        <section className="ftco-gallery">
            <div className=' mb-2' style={{backgroundColor:"aliceblue"}}>
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-md-8 heading-section text-center ftco-animate mt-2">
                            <h4 className="mb-2 p-3 bg-light" style={{ fontSize: "20px", textTransform: "uppercase", letterSpacing: "3px", fontWeight: "500", fontFamily: "time of india", }}>Subscribe Our Newslatter Service</h4>
                            {
                                show ? <div className="alert alert-success text-center alert-dismissible fade show" role="alert">
                                    {msg}
                                    <button type="button" className="close" data-dismiss="alert" aria-label="Close">
                                        <span aria-hidden="true">&times;</span>
                                    </button>
                                </div> : ""
                            }
                            <form onSubmit={postData}>
                                <div className="mb-3">
                                    <input type="email" name="email" onChange={getData} placeholder='Enter Email Address' className='form-control' />
                                </div>
                                <div className="mb-3">
                                    <button type='submit' className='btn btn-primary w-100 p-2 rounded-0'>Subscribe</button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    )
}
