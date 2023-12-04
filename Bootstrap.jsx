import React from 'react'

export default function Bootstrap() {
  return (
    <>
      <nav className="navbar navbar-expand-lg background">
        <div className="container-fluid">
          <a className="navbar-brand text-light" href="#">MyShop</a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <a className="nav-link text-light  active" aria-current="page" href="#">Home</a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-light " href="#">About</a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-light " href="#">Contact</a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-light " href="#">Shop</a>
              </li>
            </ul>
            <form className="d-flex w-100" role="search">
             <input className="form-control me-2" type="search" placeholder="Search for Product, Brands and More" aria-label="Search"/>
              <button className="btn btn-outline-light" type="submit">Search</button>
              
            </form>
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item dropdown">
                <a className="nav-link text-light  dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  Afzal Hussain
                </a>
                <ul className="dropdown-menu">
                  <li><a className="dropdown-item" href="#">Profile</a></li>
                  <li><a className="dropdown-item" href="#">Cart</a></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><a className="dropdown-item" href="#">About Setting</a></li>
                  <li><a className="dropdown-item" href="#">Log Out</a></li>
                </ul>
              </li>

            </ul>
          </div>
        </div>
      </nav>
      <div id="carouselExampleIndicators" class="carousel slide" data-bs-ride="true">
        <div class="carousel-indicators">
          <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Slide 1"></button>
          <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="1" aria-label="Slide 2"></button>
          <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="2" aria-label="Slide 3"></button>
          <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="3" class="active" aria-current="true" aria-label="Slide 4"></button>
          <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="4" aria-label="Slide 5"></button>
          <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="5" aria-label="Slide 6"></button>
          <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="6" class="active" aria-current="true" aria-label="Slide 7"></button>
          <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="7" aria-label="Slide 8"></button>
          <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="8" aria-label="Slide 9"></button>
          <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="9" aria-label="Slide 10"></button>

        </div>
        <div class="carousel-inner">
          <div class="carousel-item active">
            <img src="assets/image/pr1.jpg" height='600px' class="d-block w-100" alt="..." />
          </div>
          <div class="carousel-item">
            <img src="assets/image/pr2.jpg" height="600px" class="d-block w-100" alt="..." />
          </div>
          <div class="carousel-item">
            <img src="assets/image/pr3.jpg" height="600px" class="d-block w-100" alt="..." />
          </div>
          <div class="carousel-item">
            <img src="assets/image/pr4.jpg" height="600px" class="d-block w-100" alt="..." />
          </div>
          <div class="carousel-item">
            <img src="assets/image/pr5.jpg" height="600px" class="d-block w-100" alt="..." />
          </div>
          <div class="carousel-item">
            <img src="assets/image/pr6.jpg" height="600px" class="d-block w-100" alt="..." />
          </div>
          <div class="carousel-item">
            <img src="assets/image/pr7.jpg" height="600px" class="d-block w-100" alt="..." />
          </div>
          <div class="carousel-item">
            <img src="assets/image/pr8.jpg" height="600px" class="d-block w-100" alt="..." />
          </div>
          <div class="carousel-item">
            <img src="assets/image/pr9.jpg" height="600px" class="d-block w-100" alt="..." />
          </div>
          <div class="carousel-item">
            <img src="assets/image/pr10.jpg" height="600px" class="d-block w-100" alt="..." />
          </div>
        </div>
        <button class="carousel-control-prev" type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Previous</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Next</span>
        </button>
      </div>
      <h4 className='background1 text-center p-1 my-2'>Letest Product Section</h4>
      <div className="container-fluid">
        <div className="row">
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p1.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>5000</del><sub><b>3500</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p2.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>5000</del><sub><b>3500</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p3.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>5000</del><sub><b>3500</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p4.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>5000</del><sub><b>3500</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p5.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>5000</del><sub><b>3500</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p6.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>5000</del><sub><b>3500</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p7.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>4500</del><sub><b>3000</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p8.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>4500</del><sub><b>3000</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p9.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>4500</del><sub><b>3000</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p10.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>4500</del><sub><b>3000</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p11.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>4500</del><sub><b>3000</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p12.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>4500</del><sub><b>3000</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p13.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>3000</del><sub><b>2700</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p14.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>3000</del><sub><b>2700</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p15.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>3000</del><sub><b>2700</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p16.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>3000</del><sub><b>2700</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p17.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>3000</del><sub><b>2700</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
          <div className="col-xxl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="card">
              <img src="assets/image/p18.jpg" height="250px" className="card-img-top" alt="..." />
              <div className="card-body">
                <h5 className="card-title">Product Title 1</h5>
                <p className="card-text">Price : ₹<del>3000</del><sub><b>2700</b></sub></p>
                <p className="card-text">Discount : 60% off</p>
                <a href="#" className="btn btn-primary w-100 btn-sm">Add To Cart</a>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  )
}
