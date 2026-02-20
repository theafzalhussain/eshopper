import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { addContact } from "../Store/ActionCreaters/ContactActionCreators"
import { motion } from 'framer-motion' // For smooth premium animations

export default function Contact() {
    var dispatch = useDispatch()
    var [show, setshow] = useState(false)
    var [data, setdata] = useState({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: ""
    })

    function getData(e) {
        var { name, value } = e.target
        setdata((old) => ({ ...old, [name]: value }))
    }

    function postData(e) {
        e.preventDefault()
        var item = {
            name: data.name,
            email: data.email,
            phone: data.phone,
            subject: data.subject,
            message: data.message,
            status: "Active",
            time: new Date()
        }
        dispatch(addContact(item))
        setshow(true)
        // Form clear logic
        setdata({ name: "", email: "", phone: "", subject: "", message: "" })
    }

    // Animation Variants
    const fadeInUp = {
        initial: { y: 40, opacity: 0 },
        animate: { y: 0, opacity: 1, transition: { duration: 0.6 } }
    }

    return (
        <div style={{ backgroundColor: "#f8f9fa" }}>
            {/* --- PREMIUM BREADCRUMB BANNER --- */}
            <div className="hero-wrap hero-bread py-5" style={{ background: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("/assets/images/bg_6.jpg")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="container">
                    <div className="row no-gutters slider-text align-items-center justify-content-center">
                        <div className="col-md-9 text-center">
                            <motion.h1 initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-0 bread text-white font-weight-bold display-3">Get In Touch</motion.h1>
                            <p className="text-white-50 mt-2">We'd love to hear from you. Send us a message!</p>
                        </div>
                    </div>
                </div>
            </div>

            <section className="ftco-section contact-section">
                <div className="container">
                    {/* --- CONTACT INFO CARDS --- */}
                    <div className="row d-flex mb-5 contact-info">
                        {[
                            { icon: "icon-map-marker", label: "Address", text: "A-43 Sector 16 Noida, UP, India", link: "#" },
                            { icon: "icon-phone", label: "Phone", text: "+91 8447859784", link: "tel://8447859784" },
                            { icon: "icon-paper-plane", label: "Email", text: "info@eshopper.com", link: "mailto:info@eshopper.com" },
                            { icon: "icon-globe", label: "Website", text: "eshopper.vercel.app", link: "#" }
                        ].map((item, i) => (
                            <motion.div key={i} className="col-md-3 d-flex" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                                <div className="info bg-white p-4 shadow-sm rounded-lg border-0 w-100 text-center transition-all hover-info">
                                    <div className="icon-circle mb-3 mx-auto shadow-sm">
                                        <span className={`icon ${item.icon} text-info`}></span>
                                    </div>
                                    <p><span className="font-weight-bold d-block text-dark small text-uppercase mb-1">{item.label}</span> 
                                       <Link to={item.link} className="text-muted">{item.text}</Link>
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="row">
                        {/* --- CONTACT FORM: PREMIUM LOOK --- */}
                        <motion.div className="col-md-6 order-md-last d-flex" variants={fadeInUp} initial="initial" whileInView="animate">
                            <div className="bg-white p-5 contact-form shadow rounded-lg w-100">
                                {show && (
                                    <div className="alert alert-success alert-dismissible fade show border-0 shadow-sm" role="alert">
                                        <strong>Success!</strong> Your query has been sent. We'll contact you soon.
                                        <button type="button" className="close" onClick={() => setshow(false)}>
                                            <span>&times;</span>
                                        </button>
                                    </div>
                                )}
                                <h3 className="mb-4 font-weight-bold">Write to Us</h3>
                                <form onSubmit={postData}>
                                    <div className="form-group">
                                        <input type="text" className="form-control premium-input" name='name' value={data.name} onChange={getData} placeholder="Full Name" required />
                                    </div>
                                    <div className="form-group">
                                        <input type="email" className="form-control premium-input" name='email' value={data.email} onChange={getData} placeholder="Email Address" required />
                                    </div>
                                    <div className="form-group">
                                        <input type="text" className="form-control premium-input" name='phone' value={data.phone} onChange={getData} placeholder="Phone Number" required />
                                    </div>
                                    <div className="form-group">
                                        <input type="text" className="form-control premium-input" name='subject' value={data.subject} onChange={getData} placeholder="Subject" required />
                                    </div>
                                    <div className="form-group">
                                        <textarea rows="4" className="form-control premium-input" name='message' value={data.message} onChange={getData} placeholder="Your Message" required></textarea>
                                    </div>
                                    <div className="form-group">
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="btn btn-info py-3 px-5 rounded-pill shadow-lg w-100 font-weight-bold">
                                            SEND MESSAGE
                                        </motion.button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>

                        {/* --- GOOGLE MAP: MODERN STYLED --- */}
                        <motion.div className="col-md-6 d-flex" initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                            <div className="w-100 shadow rounded-lg overflow-hidden border" style={{ height: "550px" }}>
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    id="gmap_canvas" 
                                    src="https://maps.google.com/maps?q=A-43%20Sector%2016%20Noida&t=&z=14&ie=UTF8&iwloc=&output=embed" 
                                    frameBorder="0" 
                                    scrolling="no" 
                                    style={{ filter: "grayscale(0.2) contrast(1.1)" }}
                                    title="Office Location"
                                ></iframe>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* --- CUSTOM CSS FOR PREMIUM FEEL --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                .premium-input {
                    border: 1px solid #eee !important;
                    border-radius: 10px !important;
                    padding: 25px 20px !important;
                    background: #fdfdfd !important;
                    transition: 0.3s;
                }
                .premium-input:focus {
                    border-color: #17a2b8 !important;
                    background: #fff !important;
                    box-shadow: 0 5px 15px rgba(23,162,184,0.1) !important;
                }
                .icon-circle {
                    width: 60px; height: 60px;
                    background: #eefbff;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 24px;
                }
                .hover-info:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 30px rgba(0,0,0,0.08) !important;
                }
                .rounded-lg { border-radius: 20px !important; }
            `}} />
        </div>
    )
}