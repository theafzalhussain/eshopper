{/* --- SECTION 1: WHY CHOOSE US (Image 1 Fix) --- */}
<section className="py-5 my-5">
    <div className="container">
        <div className="row align-items-center">
            {/* Image Container Fixed */}
            <div className="col-lg-6 mb-5 mb-lg-0">
                <motion.div 
                    className="why-choose-img-wrapper shadow-2xl overflow-hidden rounded-3xl position-relative"
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                >
                    {/* Background decorative element to stop image feeling "outside" */}
                    <div className="bg-info position-absolute w-100 h-100 opacity-10"></div>
                    <img 
                        src="assets/images/choose-2.jpg" // Aap apni blue wali image ka path yahan check karein
                        className="img-fluid w-100 d-block" 
                        style={{ height: "550px", objectFit: "cover", transition: "transform 0.5s" }} 
                        alt="Quality"
                    />
                </motion.div>
            </div>

            {/* Content Fixed with Better Fonts */}
            <div className="col-lg-5 offset-lg-1">
                <h6 className="text-info font-weight-bold text-uppercase mb-3 letter-spacing-2" style={{ fontSize: '14px' }}>Why Choose Us</h6>
                <h2 className="display-4 font-weight-bold text-dark mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Uncompromising <br/> Quality & Style
                </h2>
                <p className="text-muted mb-5 lead" style={{ fontSize: '1.1rem' }}>
                    We don't just sell clothes; we curate pieces that tell a story. From the selection of the finest threads to the final stitch, our quality control process is world-class.
                </p>
                
                <div className="feature-list">
                    {[
                        "Eco-Friendly Production Materials",
                        "Global Designer Collaborations",
                        "Direct-to-Consumer Fair Pricing"
                    ].map((text, index) => (
                        <motion.div 
                            key={index} 
                            className="d-flex align-items-center mb-4 p-3 rounded-xl bg-white shadow-sm border-left border-info"
                            whileHover={{ x: 10 }}
                        >
                            <div className="bg-info-light rounded-circle p-2 mr-3">
                                <i className="fa fa-check text-info"></i>
                            </div>
                            <span className="font-weight-bold text-dark">{text}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    </div>
</section>

{/* --- SECTION 2: PRODUCTION EXCELLENCE (Image 2 Fix - 4 Image Premium Grid) --- */}
<section className="py-5 bg-light">
    <div className="container">
        <div className="text-center mb-5">
            <h2 className="display-4 font-weight-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Production Excellence</h2>
            <div className="luxury-divider mx-auto my-3"></div>
            <p className="text-muted">Precision in every thread, excellence in every design.</p>
        </div>

        {/* 4-Image Grid with Fixed Heights and Hover Effects */}
        <div className="row g-3">
            <div className="col-md-3">
                <div className="gallery-item-premium rounded-2xl overflow-hidden shadow-sm">
                    <img src="assets/images/choose-1.jpg" className="w-100 h-100 object-fit-cover" style={{ height: "400px" }} alt="P1" />
                    <div className="gallery-caption">
                        <span className="small uppercase font-weight-bold">Fabric Sourcing</span>
                    </div>
                </div>
            </div>
            <div className="col-md-3">
                <div className="gallery-item-premium rounded-2xl overflow-hidden shadow-sm">
                    {/* Fixed Height Image */}
                    <img src="assets/images/choose-2.jpg" className="w-100 h-100 object-fit-cover" style={{ height: "400px" }} alt="P2" />
                    <div className="gallery-caption">
                        <span className="small uppercase font-weight-bold">Precision Cut</span>
                    </div>
                </div>
            </div>
            <div className="col-md-3">
                <div className="gallery-item-premium rounded-2xl overflow-hidden shadow-sm">
                    <img src="/assets/productimages/kid.jpg" className="w-100 h-100 object-fit-cover" style={{ height: "400px" }} alt="P3" />
                    <div className="gallery-caption">
                        <span className="small uppercase font-weight-bold">Quality Control</span>
                    </div>
                </div>
            </div>
            {/* Added 4th Feature Box to balance the layout */}
            <div className="col-md-3">
                <div className="bg-info text-white rounded-2xl p-4 d-flex flex-column justify-content-center h-100 shadow-sm" style={{ height: "400px" }}>
                    <h3 className="font-weight-bold mb-3">Our Mastery</h3>
                    <p className="small opacity-80 mb-4">Every garment undergoes 24 quality checkpoints before reaching your doorstep.</p>
                    <Link to="/shop/All" className="btn btn-outline-light rounded-pill btn-sm py-2">View Production →</Link>
                </div>
            </div>
        </div>
    </div>
</section>

{/* --- Updated CSS for these Sections --- */}
<style dangerouslySetInnerHTML={{ __html: `
    .rounded-2xl { border-radius: 20px !important; }
    .rounded-3xl { border-radius: 40px !important; }
    .rounded-xl { border-radius: 12px !important; }
    .letter-spacing-2 { letter-spacing: 2px; }
    .shadow-2xl { box-shadow: 0 30px 60px rgba(0,0,0,0.12) !important; }
    
    .bg-info-light { background-color: rgba(23, 162, 184, 0.1); }
    
    .why-choose-img-wrapper:hover img {
        transform: scale(1.05);
    }

    .gallery-item-premium {
        position: relative;
        height: 400px;
        transition: 0.4s ease;
    }
    
    .gallery-item-premium img {
        transition: 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
    }

    .gallery-item-premium:hover img {
        transform: scale(1.1);
    }

    .gallery-caption {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        padding: 20px;
        background: linear-gradient(transparent, rgba(0,0,0,0.7));
        color: white;
        opacity: 0;
        transition: 0.4s;
    }

    .gallery-item-premium:hover .gallery-caption {
        opacity: 1;
    }

    .luxury-divider {
        width: 60px;
        height: 4px;
        background: #17a2b8;
        border-radius: 10px;
    }
    
    .uppercase { text-transform: uppercase; }
`}} />