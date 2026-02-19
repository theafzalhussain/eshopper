import React from 'react'
import { Link } from 'react-router-dom'
export default function LefNav() {
  return (
<>
<div className="list-group mt-2">
  <Link to="/admin-home" className="list-group-item list-group-item-action">Home</Link>
  <Link to="/admin-user" className="list-group-item list-group-item-action">Users</Link>
  <Link to="/admin-maincategory" className="list-group-item list-group-item-action">Maincategories</Link>
  <Link to="/admin-subcategory" className="list-group-item list-group-item-action">Subcategories</Link>
  <Link to="/admin-brand" className="list-group-item list-group-item-action">Brands</Link>
  <Link to="/admin-product" className="list-group-item list-group-item-action">Products</Link>
  <Link to="/admin-contact" className="list-group-item list-group-item-action">Contact Us</Link>
  <Link to="/admin-newsletter" className="list-group-item list-group-item-action">Newsletters</Link>
  <Link to="/admin-checkout" className="list-group-item list-group-item-action">Checkouts</Link>

</div>
</>
  )
}
