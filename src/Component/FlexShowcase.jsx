import React from "react";
import "./FlexShowcase.css";

// Image imports (update these paths as per your assets folder)
import manImg from "../assets/images/image_32.png";
import girlImg from "../assets/images/elegant_modern_girl.png";
import kidsLabBanner from "../assets/images/kids_lab_banner.png";

const FlexShowcase = () => (
  <div className="flex-shell">
    {/* Left Side: Man Image */}
    <div className="flex-left">
      <div className="img-overlay">
        <img src={manImg} alt="Manifesto Man" className="main-img" />
        <div className="overlay-text">
          <span className="title">MANIFESTO MAN</span>
          <button className="showcase-btn">EXPLORE SHOP</button>
        </div>
      </div>
    </div>
    {/* Right Side: 50-50 Split */}
    <div className="flex-right">
      <div className="img-overlay flex-half top-half">
        <img src={girlImg} alt="Elegant Modern" className="main-img" />
        <div className="overlay-text">
          <span className="title">ELEGANT MODERN</span>
          <span className="subtitle">VIEW DETAILS</span>
        </div>
      </div>
      <div className="img-overlay flex-half bottom-half">
        <img src={kidsLabBanner} alt="Kids Lab" className="main-img" />
        <div className="overlay-text">
          <span className="subtitle">Exclusives</span>
          <span className="title">KIDS LAB</span>
          <button className="showcase-btn">DISCOVER ALL</button>
        </div>
      </div>
    </div>
  </div>
);

export default FlexShowcase;
