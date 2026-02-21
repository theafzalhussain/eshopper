import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { getNewslatter, deleteNewslatter } from '../../Store/ActionCreaters/NewslatterActionCreators';
import { Trash2 } from 'lucide-react'

export default function AdminNewsletter() {
    const dispatch = useDispatch()
    const newslettersData = useSelector((state) => state.NewslatterStateData)

    useEffect(() => {
        dispatch(getNewslatter())
    }, [dispatch])

    // FIX: Mapping MongoDB _id to id
    const rows = newslettersData ? newslettersData.map((item) => ({
        ...item,
        id: item._id || item.id
    })) : []

    const columns = [
        { field: 'id', headerName: 'Subscriber ID', width: 250 },
        { field: 'email', headerName: 'Email Address', width: 400 },
        {
            field: "action", headerName: "Remove", width: 120,
            renderCell: ({ row }) => (
                <button className="btn text-danger" onClick={() => dispatch(deleteNewslatter({ id: row.id }))}>
                    <Trash2 size={18} />
                </button>
            )
        }
    ];

    return (
        <div className="container-fluid my-5">
            <div className="row">
                <div className="col-lg-2"><LefNav /></div>
                <div className="col-lg-10">
                    <div className="bg-white p-4 shadow-sm rounded-lg border">
                        <h4 className="mb-4 font-weight-bold text-info">Newsletter List</h4>
                        <div style={{ height: 500, width: '100%' }}>
                            <DataGrid rows={rows} columns={columns} pageSize={10} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}