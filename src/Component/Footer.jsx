import React from 'react'
import { Link } from 'react-router-dom'
export default function Footer() {
  return (
    <>
      <footer className="ftco-footer ftco-section ">
        <div className="container">
          <div className="row">
            <div className="mouse">
              <a href="#" className="mouse-icon">
                <div className="mouse-wheel"><span className="ion-ios-arrow-up"></span></div>
              </a>
            </div>
          </div>
          <div className="row mb-5">
            <div className="col-lg-2">
              <div className="ftco-footer-widget mb-4">
                <h2 className="ftco-heading-2 ">Eshopper</h2>
                <p>Far far away, behind the word mountains, far from the countries Vokalia and Consonantia.</p>
                <ul className="ftco-footer-social list-unstyled float-md-left float-lft mt-5">
                  <li className="ftco-animate"><a href="#"><span className="icon-twitter"></span></a></li>
                  <li className="ftco-animate"><a href="#"><span className="icon-facebook"></span></a></li>
                  <li className="ftco-animate"><a href="#"><span className="icon-instagram"></span></a></li>
                </ul>
              </div>
            </div>
            <div className="col-lg-3">
              <div className="ftco-footer-widget mb-4 ml-md-5">
                <h2 className="ftco-heading-2">Menu</h2>
                <ul className="list-unstyled">
                  <li><Link to="/about" className="py-2 d-block">About</Link></li>
                  <li><Link to="/contact" className="py-2 d-block">Contact Us</Link></li>
                  <li><Link to="/faq" className="py-2 d-block">FAQs</Link></li>
                  <li><Link to="/return-policy" className="py-2 d-block">Return Policy</Link></li>
                </ul>
              </div>
            </div>
            <div className="col-lg-3">
              <div className="ftco-footer-widget mb-4">
                <h2 className="ftco-heading-2">Help</h2>
                <div className="d-flex">
                  <ul className="list-unstyled mr-l-5 pr-l-3 mr-4">
                    <li><Link to="/faq" className="py-2 d-block">Shipping Information</Link></li>
                    <li><Link to="/return-policy" className="py-2 d-block">Returns &amp; Exchange</Link></li>
                    <li><Link to="/return-policy" className="py-2 d-block">Terms &amp; Conditions</Link></li>
                    <li><Link to="/return-policy" className="py-2 d-block">Privacy Policy</Link></li>
                  </ul>
                  <ul className="list-unstyled">
                    <li><Link to="/faq" className="py-2 d-block">FAQs</Link></li>
                    <li><Link to="/contact" className="py-2 d-block">Contact</Link></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="ftco-footer-widget mb-4">
                <h2 className="ftco-heading-2">Have a Questions?</h2>
                <div className="block-23 mb-3">
                  <ul>
                    <li><span className="icon icon-map-marker"></span><span className="text">A-43, Ducat Noida, Sector 16, Noida, 201301,Up, India</span></li>
                    <li><a href="#"><span className="icon icon-phone"></span><span className="text">+91 844 785 9784</span></a></li>
                    <li><a href="#"><span className="icon icon-envelope"></span><span className="text">theafzalhussain786@gmail.com</span></a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-12 text-center">

              <p>
                <script>
                </script> All rights reserved | This template 
               is made with <i className="icon-heart color-danger" aria-hidden="true"></i> by <a 
               href="https://colorlib.com" target="_blank">Colorlib</a>

              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
