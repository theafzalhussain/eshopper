import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addNewslatter, getNewslatter } from "../Store/ActionCreaters/NewslatterActionCreators"
import { motion } from 'framer-motion'

export default function Newslatter() {
    var [email, setemail] = useState("")
    var [show, setshow] = useState(false)
    var [msg, setmsg] = useState("")
    
    var newslatter = useSelector((state) => state.NewslatterStateData)
    var dispatch = useDispatch()

    function postData(e) {
        e.preventDefault()
        var d = newslatter.find((item) => item.email === email)
        if (d) {
            setshow(true)
            setmsg("This email is already our VIP member!")
        } else {
            dispatch(addNewslatter({ email: email }))
            setshow(true)
            setmsg("Welcome! You've successfully subscribed.")
            setemail("")
        }
    }

    useEffect(() => {
        dispatch(getNewslatter())
    }, [newslatter.length, dispatch])

    return (
        <section className="py-5" style={{ background: '#1a1a1a' }}>
            <div className="container py-4">
                <motion.div 
                    className="row justify-content-center"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                >
                    <div className="col-md-10 col-lg-8 bg-info rounded-2xl p-5 shadow-2xl position-relative overflow-hidden text-center">
                        {/* Background Decoration */}
                        <div style={{ position:'absolute', top:'-20px', right:'-20px', width:'150px', height:'150px', borderRadius:'50%', background:'rgba(255,255,255,0.1)' }}></div>
                        
                        <div className="z-index-10 position-relative">
                            <h2 className="text-white font-weight-bold mb-3">Join the VIP Circle</h2>
                            <p className="text-white-50 mb-4">Subscribe to receive first access to new arrivals, limited editions, and member-only events.</p>

                            {show && (
                                <div className="alert alert-light alert-dismissible fade show rounded-pill py-2" role="alert">
                                    <small className="font-weight-bold">{msg}</small>
                                    <button type="button" className="close" onClick={() => setshow(false)}>&times;</button>
                                </div>
                            )}

                            <form onSubmit={postData} className="d-md-flex align-items-center justify-content-center mt-4">
                                <div className="form-group mb-0 flex-grow-1 mr-md-2">
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setemail(e.target.value)} 
                                        placeholder='Your Email Address' 
                                        className='form-control form-control-lg rounded-pill border-0 px-4'
                                        style={{ height: '55px', fontSize: '15px' }}
                                        required 
                                    />
                                </div>
                                <button type='submit' className='btn btn-dark btn-lg rounded-pill px-5 shadow-lg mt-3 mt-md-0 font-weight-bold' style={{ height: '55px', letterSpacing:'1px' }}>
                                    SUBSCRIBE
                                </button>
                            </form>
                            <p className="mt-3 text-white-50 xx-small text-uppercase" style={{ fontSize: '10px', letterSpacing:'2px' }}>*No spam, only pure fashion.</p>
                        </div>
                    </div>
                </motion.div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .rounded-2xl { border-radius: 30px !important; }
                .shadow-2xl { box-shadow: 0 30px 60px rgba(0,0,0,0.2) !important; }
            `}} />
        </section>
    )
}