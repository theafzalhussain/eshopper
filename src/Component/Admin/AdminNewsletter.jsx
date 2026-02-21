import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { getNewslatter, deleteNewslatter } from '../../Store/ActionCreaters/NewslatterActionCreators';

export default function AdminNewsletter() {
    const newsletters = useSelector((state) => state.NewslatterStateData)
    const dispatch = useDispatch()

    useEffect(() => { dispatch(getNewslatter()) }, [dispatch])

    const columns = [
        { field: 'id', headerName: 'ID', width: 250 },
        { field: 'email', headerName: 'Email Address', width: 400 },
        {
            field: "action", headerName: "Remove", width: 150,
            renderCell: ({ row }) => (
                <button className="btn btn-sm btn-danger rounded-pill px-3" onClick={() => dispatch(deleteNewslatter({ id: row.id }))}>
                    Delete
                </button>
            )
        }
    ];

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-2"><LefNav /></div>
                <div className="col-lg-10">
                    <div className="bg-white p-4 shadow rounded-2xl">
                        <h4 className="font-weight-bold mb-4 text-info">Newsletter Subscribers</h4>
                        <div style={{ height: 500, width: '100%' }}>
                            <DataGrid rows={newsletters || []} columns={columns} pageSize={10} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}