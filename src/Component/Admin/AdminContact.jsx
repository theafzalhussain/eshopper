import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { getContact, deleteContact } from '../../Store/ActionCreaters/ContactActionCreators';
import { Trash2, MailOpen } from 'lucide-react'

export default function AdminContact() {
    const contacts = useSelector((state) => state.ContactStateData)
    const dispatch = useDispatch()

    useEffect(() => { dispatch(getContact()) }, [dispatch])

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'name', headerName: 'Customer', width: 150 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'subject', headerName: 'Subject', width: 150 },
        { field: 'message', headerName: 'Message', width: 250 },
        {
            field: "action", headerName: "Delete", width: 100,
            renderCell: ({ row }) => (
                <button className="btn text-danger" onClick={() => { if(window.confirm("Delete?")) dispatch(deleteContact({ id: row.id })) }}>
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
                    <div className="bg-white p-4 shadow rounded-2xl">
                        <h4 className="font-weight-bold mb-4 d-flex align-items-center"><MailOpen className="mr-2 text-info"/> Customer Queries</h4>
                        <div style={{ height: 500, width: '100%' }}>
                            <DataGrid rows={contacts || []} columns={columns} pageSize={10} disableSelectionOnClick />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}