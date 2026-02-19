import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteProduct, getProduct } from '../../Store/ActionCreaters/ProductActionCreators';
import Button from '@mui/material/Button';

export default function AdminProduct() {
    var product = useSelector((state) => state.ProductStateData)
    var dispatch = useDispatch()
    var navigate = useNavigate()
    const columns = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'name', headerName: 'Name', width: 200 },
        { field: 'maincategory', headerName: 'Maincategory', width: 105 },
        { field: 'subcategory', headerName: 'Subcategory', width: 105 },
        { field: 'brand', headerName: 'Brand', width: 80 },
        { field: 'color', headerName: 'Color', width: 80 },
        { field: 'size', headerName: 'Size', width: 60 },
        { field: 'baseprice', headerName: 'BasePrice', width: 90, renderCell: ({ row }) => <p>₹{row.baseprice}</p> },
        { field: 'discount', headerName: 'Discount', width: 90, renderCell: ({ row }) => <p>₹{row.discount}%</p> },
        { field: 'finalprice', headerName: 'FinalPrice', width: 90, renderCell: ({ row }) => <p>₹{row.finalprice}</p> },
        { field: 'stock', headerName: 'Stock', width: 100 },
        { field: 'pic1', headerName: 'Pic1', width: 80, renderCell: ({ row }) => <img src={`/assets/productimages/${row.pic1}`} height="50px" width="100%" className='rounded' alt='' /> },
        { field: 'pic2', headerName: 'Pic2', width: 80, renderCell: ({ row }) => <img src={`/assets/productimages/${row.pic2}`} height="50px" width="100%" className='rounded' alt='' /> },
        { field: 'pic3', headerName: 'Pic3', width: 80, renderCell: ({ row }) => <img src={`/assets/productimages/${row.pic3}`} height="50px" width="100%" className='rounded' alt='' /> },
        { field: 'pic4', headerName: 'Pic4', width: 80, renderCell: ({ row }) => <img src={`/assets/productimages/${row.pic4}`} height="50px" width="100%" className='rounded' alt='' /> },
        {
            field: "edit",
            headerName: "Edit",
            sortable: false,
            renderCell: ({ row }) =>
                <Button onClick={() => {
                    navigate("/admin-update-product/" + row.id)
                }}>
                    <span className="material-symbols-outlined">
                        edit
                    </span>
                </Button>

        },
        {
            field: "delete",
            headerName: "Delete",
            sortable: false,
            renderCell: ({ row }) =>
                <Button onClick={() => dispatch(deleteProduct({ id: row.id }))}>
                    <span className="material-symbols-outlined">
                        delete_forever
                    </span>
                </Button >

        },
    ];


    var rows = []
    for (let item of product) {
        rows.push(item)
    }
    function getAPIData() {
        dispatch(getProduct())
    }
    useEffect(() => {
        getAPIData()
    }, [])
    return (
        <>
            <div className="container-fluid my-5">
                <div className="row">
                    <div className="col-lg-2 col-12" >
                        <LefNav />
                    </div>
                    <div className="col-lg-10 col-12 mt-2">
                        <h5 className='bg-info text-center text-light p-2'>Product <Link to="/admin-add-product" className='float-right'><span className="material-symbols-outlined text-light">add</span></Link></h5>
                        <div style={{ height: 400, width: '100%' }}>
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                pageSize={5}
                                rowsPerPageOptions={[5]}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

