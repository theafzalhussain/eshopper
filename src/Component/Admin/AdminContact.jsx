import React, { useEffect } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import LefNav from './LefNav'
import { deleteContact, getContact } from '../../Store/ActionCreaters/ContactActionCreators';
import { Trash2 } from 'lucide-react'

export default function AdminContact() {
    const dispatch = useDispatch()
    const contactsData = useSelector((state) => state.ContactStateData)

    useEffect(() => {
        dispatch(getContact())
    }, [dispatch])

    // FIX: Mapping MongoDB _id to id inside the component
    const rows = contactsData ? contactsData.map((item) => ({
        ...item,
        id: item._id || item.id 
    })) : []

    const columns = [
        { field: 'id', headerName: 'ID', width: 100 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'subject', headerName: 'Subject', width: 150 },
        { field: 'message', headerName: 'Message', width: 300 },
        {
            field: "delete", headerName: "Delete", width: 80,
            renderCell: ({ row }) => (
                <button className="btn text-danger" onClick={() => { if(window.confirm("Delete?")) dispatch(deleteContact({ id: row.id })) }}>
                    <Trash2 size={18} />
                </button>
            )
        }
    ];

    return (
        <div className="container-fluid my-5" style={{ minHeight: "80vh" }}>
            <div className="row">
                <div className="col-lg-2"><LefNav /></div>
                <div className="col-lg-10">
                    <div className="bg-white p-4 shadow-sm rounded-lg" style={{ border: "1px solid #ddd" }}>
                        <h4 className="mb-4 font-weight-bold text-info">Customer Queries</h4>
                        <div style={{ height: 500, width: '100%' }}>
                            <DataGrid 
                                rows={rows} 
                                columns={columns} 
                                pageSize={10} 
                                disableSelectionOnClick 
                                autoHeight={false}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}