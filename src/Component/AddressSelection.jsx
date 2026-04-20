import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../constants';
import axios from 'axios';
import { MapPin, Edit2, Trash2, Plus, CheckCircle2 } from 'lucide-react';

export default function AddressSelection({ userId, selectedAddressId, setSelectedAddressId, onEdit, onDelete, onAdd, onAddressesLoaded }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    axios.get(`${BASE_URL}/api/user/${userId}/addresses`)
      .then(res => {
        if (res.data.addresses && res.data.addresses.length > 0) {
          setAddresses(res.data.addresses);
          if (onAddressesLoaded) onAddressesLoaded(res.data.addresses);
          setSelectedAddressId(prev => prev || res.data.addresses[0]._id);
        } else {
          throw new Error("No addresses found, falling back to default");
        }
      })
      .catch(() => {
        // Fallback: If multiple address API returns 404, fetch standard user profile
        axios.get(`${BASE_URL}/user/${userId}`)
          .then(userRes => {
            const u = userRes.data?.user || userRes.data;
            if (u && (u.addressline1 || u.city)) {
              const defaultAddr = {
                _id: 'default-1', 
                label: 'Default Address', 
                type: 'Home',
                fullName: u.name || '', 
                phone: u.phone || '',
                addressline1: u.addressline1 || u.streetAddress || '',
                addressline2: u.addressline2 || '',
                landmark: u.landmark || '',
                city: u.city || '', 
                state: u.state || '', 
                pin: u.pin || u.postalCode || ''
              };
              setAddresses([defaultAddr]);
              setSelectedAddressId('default-1');
            } else { setAddresses([]); }
          }).catch(() => setAddresses([]));
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="lux-address-wrapper">
      <div className="lux-address-header">
        <h4 className="lux-address-title">Select Delivery Address</h4>
        <button type="button" className="lux-address-add-btn" onClick={onAdd}>
          <Plus size={14} strokeWidth={2.5} /> Add New Address
        </button>
      </div>
      
      {loading ? (
        <div className="lux-address-loading">
          <div className="spinner-border text-warning mb-2" role="status"></div>
          <div>Securing your address book...</div>
        </div>
      ) : addresses.length === 0 ? (
        <div className="lux-address-empty">
          <MapPin size={32} className="mb-3" style={{ color: '#d4af37', opacity: 0.5 }} />
          <p>No saved addresses found. Please add a destination for your luxury items.</p>
          <button type="button" className="lux-address-add-btn mt-2" onClick={onAdd}>Add Address</button>
        </div>
      ) : (
        <div className="lux-address-grid">
          {addresses.map(addr => (
            <div 
              key={addr._id} 
              className={`lux-address-card ${selectedAddressId === addr._id ? 'selected' : ''}`}
              onClick={() => setSelectedAddressId(addr._id)}
            >
              <div className="lux-address-radio-wrap">
                {selectedAddressId === addr._id ? (
                  <CheckCircle2 size={24} className="lux-address-radio-active" fill="#D4AF37" color="#fff" />
                ) : (
                  <div className="lux-address-radio" />
                )}
              </div>
              <div className="lux-address-content">
                <div className="lux-address-name">
                  <span>{addr.fullName || addr.label || 'Customer'}</span>
                  <span className="lux-address-type">{addr.type || 'Home'}</span>
                </div>
                <div className="lux-address-text">
                  {addr.addressline1}
                  {addr.addressline2 ? `, ${addr.addressline2}` : ''} <br />
                  {addr.landmark ? <span className="d-block mb-1" style={{ fontSize: '12px', color: '#8b7c66' }}>Landmark: {addr.landmark}</span> : null}
                  {addr.city && addr.state ? `${addr.city}, ${addr.state}` : ''} {addr.pin ? `- ${addr.pin}` : ''}
                </div>
                
                <div className="lux-address-actions">
                  <button type="button" className="lux-action-btn lux-btn-edit" onClick={(e) => { e.stopPropagation(); onEdit(addr); }}>
                    <Edit2 size={14} /> Edit
                  </button>
                  <button type="button" className="lux-action-btn lux-btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(addr._id); }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .lux-address-wrapper {
            font-family: 'Jost', sans-serif;
            margin-bottom: 32px;
        }
        .lux-address-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e7ebf0;
        }
        .lux-address-title {
            font-family: 'Playfair Display', serif;
            font-weight: 700;
            font-size: 1.5rem;
            color: #0f172a;
            margin: 0;
        }
        .lux-address-add-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #111 0%, #2a2a2a 100%);
            color: #D4AF37;
            border: 1px solid #111;
            padding: 8px 16px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .lux-address-add-btn:hover {
            background: #D4AF37;
            color: #111;
            border-color: #D4AF37;
            box-shadow: 0 8px 16px rgba(212, 175, 55, 0.25);
        }
        .lux-address-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
        }
        .lux-address-card {
            background: #ffffff;
            border: 1.5px solid #e2e8f0;
            border-radius: 16px;
            padding: 18px;
            position: relative;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            gap: 14px;
            align-items: flex-start;
        }
        .lux-address-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06);
            border-color: #cbd5e1;
        }
        .lux-address-card.selected {
            border-color: #D4AF37;
            background: linear-gradient(145deg, #ffffff 0%, #fffcf3 100%);
            box-shadow: 0 12px 24px rgba(212, 175, 55, 0.12);
        }
        .lux-address-radio-wrap {
            flex-shrink: 0;
            margin-top: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
        }
        .lux-address-radio {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid #cbd5e1;
            transition: all 0.25s ease;
        }
        .lux-address-card.selected .lux-address-radio {
            border-color: #D4AF37;
        }
        .lux-address-radio-active {
            animation: popInRadio 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes popInRadio {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
        .lux-address-content { flex: 1; }
        .lux-address-name {
            font-weight: 800;
            color: #0f172a;
            font-size: 15px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            letter-spacing: 0.2px;
        }
        .lux-address-type {
            font-size: 10px;
            font-weight: 800;
            background: #f1f5f9;
            color: #475569;
            padding: 4px 10px;
            border-radius: 999px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            border: 1px solid #e2e8f0;
            transition: all 0.3s ease;
        }
        .lux-address-card.selected .lux-address-type {
            background: #fff8e1;
            color: #92400e;
            border-color: #fde68a;
        }
        .lux-address-text {
            font-size: 13px;
            color: #64748b;
            line-height: 1.6;
            margin-bottom: 14px;
        }
        .lux-address-actions {
            display: flex;
            gap: 10px;
            border-top: 1px dashed #e2e8f0;
            padding-top: 12px;
        }
        .lux-action-btn {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            padding: 6px 12px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }
        .lux-btn-edit { color: #0f766e; border-color: #ccfbf1; background: #f0fdfa; }
        .lux-btn-edit:hover { background: #ccfbf1; border-color: #99f6e4; transform: translateY(-1px); }
        .lux-btn-delete { color: #b91c1c; border-color: #fee2e2; background: #fef2f2; }
        .lux-btn-delete:hover { background: #fee2e2; border-color: #fecaca; transform: translateY(-1px); }
        .lux-address-loading, .lux-address-empty {
            text-align: center;
            padding: 40px 20px;
            color: #64748b;
            font-size: 14px;
            background: #f8fafc;
            border-radius: 16px;
            border: 1px dashed #cbd5e1;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
      `}} />
    </div>
  );
}
