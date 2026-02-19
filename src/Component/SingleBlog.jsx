import React from 'react'
import { Link } from 'react-router-dom'
export default function SingleBlog() {
  return (
    <>
    <div className="hero-wrap hero-bread" style={{backgroundImage: "url('assets/images/bg_6.jpg')"}}>
      <div className="container">
        <div className="row no-gutters slider-text align-items-center justify-content-center">
          <div className="col-md-9 ftco-animate text-center">
          	<p className="breadcrumbs"><span className="mr-2"><Link to="/">Home</Link></span> <span>Blog</span></p>
            <h1 className="mb-0 bread">Single Blog</h1>
          </div>
        </div>
      </div>
    </div>

		<section className="ftco-section ftco-degree-bg">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 ftco-animate">
						<h2 className="mb-3">8 Tips For Shopping</h2>
            <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Reiciendis, eius mollitia suscipit, quisquam doloremque distinctio perferendis et doloribus unde architecto optio laboriosam porro adipisci sapiente officiis nemo accusamus ad praesentium? Esse minima nisi et. Dolore perferendis, enim praesentium omnis, iste doloremque quia officia optio deserunt molestiae voluptates soluta architecto tempora.</p>
            <p>
              <img src="assets/images/image_1.jpg" alt="" className="img-fluid"/>
            </p>
            <p>Molestiae cupiditate inventore animi, maxime sapiente optio, illo est nemo veritatis repellat sunt doloribus nesciunt! Minima laborum magni reiciendis qui voluptate quisquam voluptatem soluta illo eum ullam incidunt rem assumenda eveniet eaque sequi deleniti tenetur dolore amet fugit perspiciatis ipsa, odit. Nesciunt dolor minima esse vero ut ea, repudiandae suscipit!</p>
            <h2 className="mb-3 mt-5">#2. Creative WordPress Themes</h2>
            <p>Temporibus ad error suscipit exercitationem hic molestiae totam obcaecati rerum, eius aut, in. Exercitationem atque quidem tempora maiores ex architecto voluptatum aut officia doloremque. Error dolore voluptas, omnis molestias odio dignissimos culpa ex earum nisi consequatur quos odit quasi repellat qui officiis reiciendis incidunt hic non? Debitis commodi aut, adipisci.</p>
            <p>
              <img src="assets/images/image_2.jpg" alt="" className="img-fluid"/>
            </p>
            <p>Quisquam esse aliquam fuga distinctio, quidem delectus veritatis reiciendis. Nihil explicabo quod, est eos ipsum. Unde aut non tenetur tempore, nisi culpa voluptate maiores officiis quis vel ab consectetur suscipit veritatis nulla quos quia aspernatur perferendis, libero sint. Error, velit, porro. Deserunt minus, quibusdam iste enim veniam, modi rem maiores.</p>
            <p>Odit voluptatibus, eveniet vel nihil cum ullam dolores laborum, quo velit commodi rerum eum quidem pariatur! Quia fuga iste tenetur, ipsa vel nisi in dolorum consequatur, veritatis porro explicabo soluta commodi libero voluptatem similique id quidem? Blanditiis voluptates aperiam non magni. Reprehenderit nobis odit inventore, quia laboriosam harum excepturi ea.</p>
            <p>Adipisci vero culpa, eius nobis soluta. Dolore, maxime ullam ipsam quidem, dolor distinctio similique asperiores voluptas enim, exercitationem ratione aut adipisci modi quod quibusdam iusto, voluptates beatae iure nemo itaque laborum. Consequuntur et pariatur totam fuga eligendi vero dolorum provident. Voluptatibus, veritatis. Beatae numquam nam ab voluptatibus culpa, tenetur recusandae!</p>
            <p>Voluptas dolores dignissimos dolorum temporibus, autem aliquam ducimus at officia adipisci quasi nemo a perspiciatis provident magni laboriosam repudiandae iure iusto commodi debitis est blanditiis alias laborum sint dolore. Dolores, iure, reprehenderit. Error provident, pariatur cupiditate soluta doloremque aut ratione. Harum voluptates mollitia illo minus praesentium, rerum ipsa debitis, inventore?</p>
            <div className="tag-widget post-tag-container mb-5 mt-5">
              <div className="tagcloud">
                <Link to="#" className="tag-cloud-link">Life</Link>
                <Link to="#" className="tag-cloud-link">Sport</Link>
                <Link to="#" className="tag-cloud-link">Tech</Link>
                <Link to="#" className="tag-cloud-link">Travel</Link>
              </div>
            </div>
            
            <div className="about-author d-flex p-4 bg-light">
              <div className="bio align-self-md-center mr-4">
                <img src="assets/images/person_1.jpg" alt="Image placeholder" className="img-fluid mb-4"/>
              </div>
              <div className="desc align-self-md-center">
                <h3>Lance Smith</h3>
                <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ducimus itaque, autem necessitatibus voluptate quod mollitia delectus aut, sunt placeat nam vero culpa sapiente consectetur similique, inventore eos fugit cupiditate numquam!</p>
              </div>
            </div>


            <div className="pt-5 mt-5">
              <h3 className="mb-5">6 Comments</h3>
              <ul className="comment-list">
                <li className="comment">
                  <div className="vcard bio">
                    <img src="assets/images/person_1.jpg" alt="Image placeholder"/>
                  </div>
                  <div className="comment-body">
                    <h3>John Doe</h3>
                    <div className="meta">June 27, 2018 at 2:21pm</div>
                    <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Pariatur quidem laborum necessitatibus, ipsam impedit vitae autem, eum officia, fugiat saepe enim sapiente iste iure! Quam voluptas earum impedit necessitatibus, nihil?</p>
                    <p><Link to="#" className="reply">Reply</Link></p>
                  </div>
                </li>

                <li className="comment">
                  <div className="vcard bio">
                    <img src="assets/images/person_1.jpg" alt="Image placeholder"/>
                  </div>
                  <div className="comment-body">
                    <h3>John Doe</h3>
                    <div className="meta">June 27, 2018 at 2:21pm</div>
                    <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Pariatur quidem laborum necessitatibus, ipsam impedit vitae autem, eum officia, fugiat saepe enim sapiente iste iure! Quam voluptas earum impedit necessitatibus, nihil?</p>
                    <p><Link to="#" className="reply">Reply</Link></p>
                  </div>

                  <ul className="children">
                    <li className="comment">
                      <div className="vcard bio">
                        <img src="assets/images/person_1.jpg" alt="Image placeholder"/>
                      </div>
                      <div className="comment-body">
                        <h3>John Doe</h3>
                        <div className="meta">June 27, 2018 at 2:21pm</div>
                        <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Pariatur quidem laborum necessitatibus, ipsam impedit vitae autem, eum officia, fugiat saepe enim sapiente iste iure! Quam voluptas earum impedit necessitatibus, nihil?</p>
                        <p><Link to="#" className="reply">Reply</Link></p>
                      </div>


                      <ul className="children">
                        <li className="comment">
                          <div className="vcard bio">
                            <img src="assets/images/person_1.jpg" alt="Image placeholder"/>
                          </div>
                          <div className="comment-body">
                            <h3>John Doe</h3>
                            <div className="meta">June 27, 2018 at 2:21pm</div>
                            <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Pariatur quidem laborum necessitatibus, ipsam impedit vitae autem, eum officia, fugiat saepe enim sapiente iste iure! Quam voluptas earum impedit necessitatibus, nihil?</p>
                            <p><Link to="#" className="reply">Reply</Link></p>
                          </div>

                            <ul className="children">
                              <li className="comment">
                                <div className="vcard bio">
                                  <img src="assets/images/person_1.jpg" alt="Image placeholder"/>
                                </div>
                                <div className="comment-body">
                                  <h3>John Doe</h3>
                                  <div className="meta">June 27, 2018 at 2:21pm</div>
                                  <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Pariatur quidem laborum necessitatibus, ipsam impedit vitae autem, eum officia, fugiat saepe enim sapiente iste iure! Quam voluptas earum impedit necessitatibus, nihil?</p>
                                  <p><Link to="#" className="reply">Reply</Link></p>
                                </div>
                              </li>
                            </ul>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>

                <li className="comment">
                  <div className="vcard bio">
                    <img src="assets/images/person_1.jpg" alt="Image placeholder"/>
                  </div>
                  <div className="comment-body">
                    <h3>John Doe</h3>
                    <div className="meta">June 27, 2018 at 2:21pm</div>
                    <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Pariatur quidem laborum necessitatibus, ipsam impedit vitae autem, eum officia, fugiat saepe enim sapiente iste iure! Quam voluptas earum impedit necessitatibus, nihil?</p>
                    <p><Link to="#" className="reply">Reply</Link></p>
                  </div>
                </li>
              </ul>
              
              <div className="comment-form-wrap pt-5">
                <h3 className="mb-5">Leave a comment</h3>
                <form action="#" className="p-5 bg-light">
                  <div className="form-group">
                    <label for="name">Name *</label>
                    <input type="text" className="form-control" id="name"/>
                  </div>
                  <div className="form-group">
                    <label for="email">Email *</label>
                    <input type="email" className="form-control" id="email/"/>
                  </div>
                  <div className="form-group">
                    <label for="website">Website</label>
                    <input type="url" className="form-control" id="website"/>
                  </div>

                  <div className="form-group">
                    <label for="message">Message</label>
                    <textarea name="" id="message" cols="30" rows="10" className="form-control"></textarea>
                  </div>
                  <div className="form-group">
                    <input type="submit" value="Post Comment" className="btn py-3 px-4 btn-primary"/>
                  </div>

                </form>
              </div>
            </div>
          </div> 
          <div className="col-lg-4 sidebar ftco-animate">
            <div className="sidebar-box">
              <form action="#" className="search-form">
                <div className="form-group">
                  <span className="icon ion-ios-search"></span>
                  <input type="text" className="form-control" placeholder="Type a keyword and hit enter"/>
                </div>
              </form>
            </div>
            <div className="sidebar-box ftco-animate">
            	<h3 CLASSNclassName="heading">Categories</h3>
              <ul className="categories">
                <li><Link to="#">Bags <span>(12)</span></Link></li>
                <li><Link to="#">Shoes <span>(22)</span></Link></li>
                <li><Link to="#">Dress <span>(37)</span></Link></li>
                <li><Link to="#">Accessories <span>(42)</span></Link></li>
                <li><Link to="#">Makeup <span>(14)</span></Link></li>
                <li><Link to="#">Beauty <span>(140)</span></Link></li>
              </ul>
            </div>

            <div className="sidebar-box ftco-animate">
              <h3 CLASSNclassName="heading">Recent Blog</h3>
              <div className="block-21 mb-4 d-flex">
                <Link className="blog-img mr-4" style={{backgroundImage: "url('assets/images/image_1.jpg')"}}></Link>
                <div className="text">
                  <h3 className="heading-1"><Link to="#">Even the all-powerful Pointing has no control about the blind texts</Link></h3>
                  <div className="meta">
                    <div><Link to="#"><span className="icon-calendar"></span> April 09, 2019</Link></div>
                    <div><Link to="#"><span className="icon-person"></span> Admin</Link></div>
                    <div><Link to="#"><span className="icon-chat"></span> 19</Link></div>
                  </div>
                </div>
              </div>
              <div className="block-21 mb-4 d-flex">
                <Link className="blog-img mr-4" style={{backgroundImage: "url('assets/images/image_2.jpg')"}}></Link>
                <div className="text">
                  <h3 className="heading-1"><Link to="#">Even the all-powerful Pointing has no control about the blind texts</Link></h3>
                  <div className="meta">
                    <div><Link to="#"><span className="icon-calendar"></span> April 09, 2019</Link></div>
                    <div><Link to="#"><span className="icon-person"></span> Admin</Link></div>
                    <div><Link to="#"><span className="icon-chat"></span> 19</Link></div>
                  </div>
                </div>
              </div>
              <div className="block-21 mb-4 d-flex">
                <Link className="blog-img mr-4" style={{backgroundImage: "url('assets/images/image_3.jpg')"}}></Link>
                <div className="text">
                  <h3 className="heading-1"><Link to="#">Even the all-powerful Pointing has no control about the blind texts</Link></h3>
                  <div className="meta">
                    <div><Link to="#"><span className="icon-calendar"></span> April 09, 2019</Link></div>
                    <div><Link to="#"><span className="icon-person"></span> Admin</Link></div>
                    <div><Link to="#"><span className="icon-chat"></span> 19</Link></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sidebar-box ftco-animate">
              <h3 CLASSNclassName="heading">Tag Cloud</h3>
              <div className="tagcloud">
                <Link to="#" className="tag-cloud-link">shop</Link>
                <Link to="#" className="tag-cloud-link">products</Link>
                <Link to="#" className="tag-cloud-link">shirt</Link>
                <Link to="#" className="tag-cloud-link">jeans</Link>
                <Link to="#" className="tag-cloud-link">shoes</Link>
                <Link to="#" className="tag-cloud-link">dress</Link>
                <Link to="#" className="tag-cloud-link">coats</Link>
                <Link to="#" className="tag-cloud-link">jumpsuits</Link>
              </div>
            </div>

            <div className="sidebar-box ftco-animate">
              <h3 className="heading">Paragraph</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ducimus itaque, autem necessitatibus voluptate quod mollitia delectus aut, sunt placeat nam vero culpa sapiente consectetur similique, inventore eos fugit cupiditate numquam!</p>
            </div>
          </div>

        </div>
      </div>
    </section> 

    <section className="ftco-gallery">
    	<div className="container">
    		<div className="row justify-content-center">
    			<div className="col-md-8 heading-section text-center mb-4 ftco-animate">
            <h2 className="mb-4">Follow Us On Instagram</h2>
            <p>Far far away, behind the word mountains, far from the countries Vokalia and Consonantia, there live the blind texts. Separated they live in</p>
          </div>
    		</div>
    	</div>
    	<div className="container-fluid px-0">
    		<div className="row no-gutters">
					<div className="col-md-4 col-lg-2 ftco-animate">
						<Link to="assets/images/gallery-1.jpg" className="gallery image-popup img d-flex align-items-center" style={{backgroundImage: "url('assets/images/gallery-1.jpg')"}}>
							<div className="icon mb-4 d-flex align-items-center justify-content-center">
    						<span className="icon-instagram"></span>
    					</div>
						</Link>
					</div>
					<div className="col-md-4 col-lg-2 ftco-animate">
						<Link to="assets/images/gallery-2.jpg" className="gallery image-popup img d-flex align-items-center" style={{backgroundImage: "url('assets/images/gallery-2.jpg')"}}>
							<div className="icon mb-4 d-flex align-items-center justify-content-center">
    						<span className="icon-instagram"></span>
    					</div>
						</Link>
					</div>
					<div className="col-md-4 col-lg-2 ftco-animate">
						<Link to="assets/images/gallery-3.jpg" className="gallery image-popup img d-flex align-items-center" style={{backgroundImage: "url('assets/images/gallery-3.jpg')"}}>
							<div className="icon mb-4 d-flex align-items-center justify-content-center">
    						<span className="icon-instagram"></span>
    					</div>
						</Link>
					</div>
					<div className="col-md-4 col-lg-2 ftco-animate">
						<Link to="assets/images/gallery-4.jpg" className="gallery image-popup img d-flex align-items-center" style={{backgroundImage: "url('assets/images/gallery-4.jpg')"}}>
							<div className="icon mb-4 d-flex align-items-center justify-content-center">
    						<span className="icon-instagram"></span>
    					</div>
						</Link>
					</div>
					<div className="col-md-4 col-lg-2 ftco-animate">
						<Link to="assets/images/gallery-5.jpg" className="gallery image-popup img d-flex align-items-center" style={{backgroundImage: "url('assets/images/gallery-5.jpg')"}}>
							<div className="icon mb-4 d-flex align-items-center justify-content-center">
    						<span className="icon-instagram"></span>
    					</div>
						</Link>
					</div>
					<div className="col-md-4 col-lg-2 ftco-animate">
						<Link to="assets/images/gallery-6.jpg" className="gallery image-popup img d-flex align-items-center" style={{backgroundImage: "url('assets/images/gallery-6.jpg')"}}>
							<div className="icon mb-4 d-flex align-items-center justify-content-center">
    						<span className="icon-instagram"></span>
    					</div>
						</Link>
					</div>
        </div>
    	</div>
    </section>
    </>
  )
}
