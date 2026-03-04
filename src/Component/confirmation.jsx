import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { CheckCircle2, ShoppingBag, Download, User, MessageCircle, Truck, MapPin, Calendar } from 'lucide-react';
import { clearCart } from '../Store/ActionCreaters/CartActionCreators';
import { API_ENDPOINTS, BASE_URL, FRONTEND_URL } from '../constants';

const Confirmation = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const users = useSelector((state) => state.UserStateData || []);

  const localUserId = localStorage.getItem('userid');
  const userId =
    order?.userid ||
    localUserId ||
    users.find((item) => String(item.id || item.userid || item._id) === String(localUserId))?.userid ||
    users[0]?.userid ||
    '';

  // Retrieve order from state or localStorage
  useEffect(() => {
    const syncOrder = async () => {
      const locationState = window.history.state?.usr;
      let fallbackOrder = null;

      if (locationState?.order) {
        fallbackOrder = locationState.order;
      } else {
        const storedOrder = localStorage.getItem('lastPlacedOrder');
        if (storedOrder) {
          try {
            fallbackOrder = JSON.parse(storedOrder);
          } catch (e) {
            console.error('Failed to parse stored order:', e);
          }
        }
      }

      if (fallbackOrder) {
        setOrder(fallbackOrder);
      }

      const orderId = fallbackOrder?.orderId;
      const currentUserId = localStorage.getItem('userid');

      try {
        if (orderId && currentUserId) {
          const { data } = await axios.get(`${BASE_URL}/api/order/${encodeURIComponent(orderId)}?userId=${encodeURIComponent(currentUserId)}`, { timeout: 15000 });
          if (data?.orderId) {
            setOrder(data);
            localStorage.setItem('lastPlacedOrder', JSON.stringify(data));
          }
        }
      } catch (err) {
        console.error('Failed to sync order from backend:', err?.message || err);
      } finally {
        setLoading(false);
      }
    };

    syncOrder();
  }, []);

  // Fire success animation on mount
  useEffect(() => {
    if (order) {
      console.log('✅ Order confirmation received');
    }
  }, [order]);

  // Clear cart from Redux and backend
  useEffect(() => {
    if (order && userId) {
      // Clear from Redux
      dispatch(clearCart({ userid: userId }));
      
      // Clear from backend - optional for safety
      axios
        .post(`${BASE_URL}${API_ENDPOINTS.CLEAR_CART}/${userId}`)
        .catch((err) => console.log('Cart already cleared or error:', err));
    }
  }, [order, userId, dispatch]);

  // Generate PDF invoice
  const downloadInvoice = async () => {
    if (!order) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    const safeNum = (value) => Number(value || 0);
    const money = (value) => `₹${safeNum(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const shipping = order.shippingAddress || {};
    const customerName = shipping.fullName || order.userName || 'Customer';
    const addressLine1 = shipping.addressline1 || shipping.address || '-';
    const city = shipping.city || '-';
    const state = shipping.state || '-';
    const pin = shipping.pin || shipping.zipCode || '-';
    const phone = shipping.phone || '-';
    const country = shipping.country || 'India';

    const orderDate = order.orderDate ? new Date(order.orderDate) : new Date();
    const invoiceDateText = orderDate.toLocaleDateString('en-IN');
    const invoiceTimeText = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const invoiceNo = `INV-${order.orderId || `ESHP-${Date.now()}`}`;
    const trackingUrl = `${FRONTEND_URL}/order-tracking/${encodeURIComponent(order.orderId || '')}`;

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(trackingUrl, {
        width: 220,
        margin: 1,
        color: {
          dark: '#111111',
          light: '#ffffff'
        }
      });
    } catch (e) {
      console.error('Failed to generate QR code:', e?.message || e);
    }

    const subtotal = safeNum(order.totalAmount);
    const shippingFee = safeNum(order.shippingAmount);
    const grandTotal = safeNum(order.finalAmount || subtotal + shippingFee);
    const computedTax = Math.max(0, grandTotal - subtotal - shippingFee);
    const cgst = computedTax / 2;
    const sgst = computedTax / 2;

    // Subtle brand watermark (diagonal)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(42);
    doc.setTextColor(245, 245, 245);
    doc.text('ESHOPPER BOUTIQUE', pageWidth / 2, pageHeight / 2 + 10, {
      align: 'center',
      angle: 32
    });

    // Premium Top Bar
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, pageWidth, 22, 'F');

    // Vector logo emblem
    doc.setFillColor(12, 12, 12);
    doc.roundedRect(14, 5, 9, 9, 1.4, 1.4, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('E', 18.5, 11.4, { align: 'center' });

    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.8);
    doc.line(24.8, 6, 24.8, 13);

    doc.setTextColor(212, 175, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('eShopper Boutique Luxe', 27, 14);

    // Invoice Meta Right
    doc.setTextColor(35, 35, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('TAX INVOICE', pageWidth - 14, 33, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoiceNo}`, pageWidth - 14, 39, { align: 'right' });
    doc.text(`Order ID: ${order.orderId || '-'}`, pageWidth - 14, 44, { align: 'right' });
    doc.text(`Date: ${invoiceDateText} ${invoiceTimeText}`, pageWidth - 14, 49, { align: 'right' });

    // Seller + Buyer Blocks
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, 55, pageWidth - 28, 45, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(212, 175, 55);
    doc.text('Sold By', 18, 63);
    doc.text('Bill To / Ship To', 110, 63);

    doc.setTextColor(70, 70, 70);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const soldByLines = [
      'eShopper Boutique Pvt. Ltd.',
      'New Delhi, India',
      'GSTIN: 07ABCDE1234F1Z5',
      'Support: support@eshopperr.me'
    ];
    soldByLines.forEach((line, idx) => doc.text(line, 18, 69 + idx * 5));

    const buyerLines = [
      customerName,
      addressLine1,
      `${city}, ${state} ${pin}`,
      `Phone: ${phone} | ${country}`
    ];
    buyerLines.forEach((line, idx) => doc.text(line, 110, 69 + idx * 5));

    // Payment Summary strip
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 104, pageWidth - 28, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    doc.text(`Payment Method: ${order.paymentMethod || 'COD'}`, 18, 113);
    doc.text(`Payment Status: ${order.paymentStatus || 'Pending'}`, 92, 113);
    doc.text(`Order Status: ${order.orderStatus || 'Order Placed'}`, pageWidth - 18, 113, { align: 'right' });

    // Products Table
    const tableData = (order.products || []).map((product, index) => {
      const qty = safeNum(product.qty || 1);
      const price = safeNum(product.price);
      const lineTotal = qty * price;
      const sku = product.productid || product.id || product._id || 'NA';
      const variant = [product.size ? `Size: ${product.size}` : '', product.color ? `Color: ${product.color}` : '']
        .filter(Boolean)
        .join(' | ');
      const description = variant ? `${product.name || 'Product'}\nSKU: ${sku} | ${variant}` : `${product.name || 'Product'}\nSKU: ${sku}`;
      return [
        `${index + 1}`,
        description,
        `${qty}`,
        money(price),
        money(lineTotal)
      ];
    });

    autoTable(doc, {
      startY: 124,
      head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'grid',
      margin: { left: 14, right: 14 },
      headStyles: {
        fillColor: [212, 175, 55],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9.5,
        textColor: [70, 70, 70],
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [252, 252, 252]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 90 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 34, halign: 'right' },
        4: { cellWidth: 34, halign: 'right' }
      },
      didDrawPage: () => {
        const currentPage = doc.getCurrentPageInfo().pageNumber;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(145, 145, 145);
        doc.text(`Page ${currentPage}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
      }
    });

    // Totals Block
    let finalY = (doc.lastAutoTable?.finalY || 130) + 8;
    if (finalY + 52 > pageHeight - 20) {
      doc.addPage();
      finalY = 20;
    }
    const totalsX = pageWidth - 84;
    doc.setDrawColor(235, 235, 235);
    doc.roundedRect(totalsX, finalY, 70, 42, 2, 2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(70, 70, 70);
    doc.text('Subtotal', totalsX + 4, finalY + 7);
    doc.text(money(subtotal), totalsX + 66, finalY + 7, { align: 'right' });

    doc.text('Shipping', totalsX + 4, finalY + 13);
    doc.text(money(shippingFee), totalsX + 66, finalY + 13, { align: 'right' });

    doc.text('CGST', totalsX + 4, finalY + 19);
    doc.text(money(cgst), totalsX + 66, finalY + 19, { align: 'right' });

    doc.text('SGST', totalsX + 4, finalY + 25);
    doc.text(money(sgst), totalsX + 66, finalY + 25, { align: 'right' });

    doc.setDrawColor(220, 220, 220);
    doc.line(totalsX + 4, finalY + 29, totalsX + 66, finalY + 29);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(212, 175, 55);
    doc.text('Grand Total', totalsX + 4, finalY + 37);
    doc.text(money(grandTotal), totalsX + 66, finalY + 37, { align: 'right' });

    // Terms + Signature blocks
    let notesY = finalY + 8;
    if (notesY + 54 > pageHeight - 20) {
      doc.addPage();
      notesY = 20;
    }
    doc.setDrawColor(235, 235, 235);
    doc.roundedRect(14, notesY, 100, 34, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(80, 80, 80);
    doc.text('Important Notes', 18, notesY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(115, 115, 115);
    doc.text('• Goods once sold will only be replaced as per policy.', 18, notesY + 13);
    doc.text('• Keep this invoice for warranty and returns support.', 18, notesY + 18);
    doc.text('• This invoice is valid for all official payment records.', 18, notesY + 23);

    doc.roundedRect(120, notesY, pageWidth - 134, 34, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(80, 80, 80);
    doc.text('For eShopper Boutique', pageWidth - 18, notesY + 7, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(130, 130, 130);
    doc.text('Authorized Signatory', pageWidth - 18, notesY + 28, { align: 'right' });
    doc.line(pageWidth - 58, notesY + 24, pageWidth - 18, notesY + 24);

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 123, notesY + 10, 18, 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(120, 120, 120);
      doc.text('Scan to track', 144, notesY + 17);
      doc.text('your order', 144, notesY + 21);
    }

    // Footer Note
    const footerY = Math.min(pageHeight - 14, notesY + 44);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(135, 135, 135);
    doc.text('This is a computer-generated invoice and does not require a physical signature.', 14, footerY);
    doc.text('Need help? Contact support@eshopperr.me', 14, footerY + 5);

    // Save PDF
    doc.save(`Eshopper_Invoice_${order.orderId || Date.now()}.pdf`);
  };

  if (loading || !order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', color: '#d4af37', marginBottom: '10px' }}>✓</div>
          <p style={{ color: '#666', fontSize: '18px' }}>Loading your order...</p>
        </div>
      </div>
    );
  }

  const estimatedArrival = new Date(order.estimatedArrival || new Date().setDate(new Date().getDate() + 7));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9f7f4', paddingTop: '80px', paddingBottom: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Hero Section */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '60px',
            padding: '40px',
            background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)',
            borderRadius: '12px',
            color: 'white',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <CheckCircle2 size={80} style={{ margin: '0 auto', color: '#d4af37' }} />
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '10px', color: '#d4af37' }}>
            Order Confirmed!
          </h1>
          <p style={{ fontSize: '16px', color: '#ccc', marginBottom: '5px' }}>
            Thank you for your purchase from eShopper Boutique
          </p>
          <p style={{ fontSize: '14px', color: '#999' }}>
            A confirmation email has been sent to your registered email address
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '40px' }}>
          
          {/* Order ID & ETA Card */}
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '2px solid #d4af37',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <ShoppingBag size={32} style={{ color: '#d4af37', marginRight: '12px' }} />
              <div>
                <p style={{ fontSize: '12px', color: '#999', margin: '0' }}>ORDER ID</p>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                  {order.orderId}
                </h3>
              </div>
            </div>
            <div style={{ paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
              <p style={{ fontSize: '12px', color: '#999', margin: '8px 0' }}>PAYMENT METHOD</p>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                {order.paymentMethod || 'Card'}
              </p>
            </div>
          </div>

          {/* ETA Card */}
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '2px solid #d4af37',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <Truck size={32} style={{ color: '#d4af37', marginRight: '12px' }} />
              <div>
                <p style={{ fontSize: '12px', color: '#999', margin: '0' }}>ESTIMATED DELIVERY</p>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                  {estimatedArrival.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </h3>
              </div>
            </div>
            <div style={{ paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
              <p style={{ fontSize: '12px', color: '#999', margin: '8px 0' }}>STATUS</p>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#27ae60', margin: '0' }}>
                Confirmed & Processing
              </p>
            </div>
          </div>

          {/* Shipping Address Card */}
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '2px solid #d4af37',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '15px' }}>
              <MapPin size={32} style={{ color: '#d4af37', marginRight: '12px', marginTop: '3px' }} />
              <div>
                <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px 0' }}>SHIPPING TO</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                  {order.shippingAddress?.fullName}
                </p>
                <p style={{ fontSize: '13px', color: '#666', margin: '5px 0 0 0' }}>
                  {order.shippingAddress?.addressline1 || order.shippingAddress?.address || '-'}
                </p>
                <p style={{ fontSize: '13px', color: '#666', margin: '0' }}>
                  {order.shippingAddress?.city || '-'}, {order.shippingAddress?.state || '-'} {order.shippingAddress?.pin || order.shippingAddress?.zipCode || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c2c2c', marginBottom: '20px' }}>
            Order Items
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px',
            }}
          >
            {order.products?.map((product, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: '1px solid #e0e0e0',
                }}
              >
                {product.pic && (
                  <img
                    src={product.pic}
                    alt={product.name}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      backgroundColor: '#f5f5f5',
                    }}
                  />
                )}
                <div style={{ padding: '15px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c2c2c', margin: '0 0 8px 0', minHeight: '40px' }}>
                    {product.name}
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#666', margin: '0' }}>
                      Qty: <span style={{ fontWeight: 'bold' }}>{product.qty}</span>
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#d4af37', margin: '0' }}>
                      ₹{(product.total || product.qty * product.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Summary */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            marginBottom: '40px',
            border: '1px solid #e0e0e0',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '500px', marginLeft: 'auto' }}>
            <div>
              <p style={{ fontSize: '13px', color: '#999', margin: '0 0 5px 0' }}>Subtotal</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                ₹{(order.totalAmount || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#999', margin: '0 0 5px 0' }}>Shipping</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c2c2c', margin: '0' }}>
                ₹{(order.shippingAmount || 0).toFixed(2)}
              </p>
            </div>
            <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #e0e0e0', paddingTop: '15px' }}>
              <p style={{ fontSize: '13px', color: '#999', margin: '0 0 5px 0' }}>Total Amount</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#d4af37', margin: '0' }}>
                ₹{(order.finalAmount || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '30px',
          }}
        >
          <button
            onClick={downloadInvoice}
            style={{
              backgroundColor: '#d4af37',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#c9a961')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#d4af37')}
          >
            <Download size={20} />
            Download Invoice
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: '#2c2c2c',
              color: '#d4af37',
              padding: '15px 30px',
              borderRadius: '8px',
              border: '2px solid #d4af37',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#d4af37';
              e.target.style.color = '#2c2c2c';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#2c2c2c';
              e.target.style.color = '#d4af37';
            }}
          >
            <ShoppingBag size={20} />
            Continue Shopping
          </button>

          <button
            onClick={() => navigate('/profile')}
            style={{
              backgroundColor: '#f5f5f5',
              color: '#2c2c2c',
              padding: '15px 30px',
              borderRadius: '8px',
              border: '2px solid #e0e0e0',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e0e0e0';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#f5f5f5';
            }}
          >
            <User size={20} />
            Track in Profile
          </button>

          <button
            onClick={() => navigate('/?openChat=1')}
            style={{
              backgroundColor: '#d4af37',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#c9a961')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#d4af37')}
          >
            <MessageCircle size={20} />
            Ask AI Stylist
          </button>
        </div>

        {/* Footer Note */}
        <div
          style={{
            backgroundColor: '#f9f7f4',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #e0e0e0',
          }}
        >
          <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
            Questions? Contact us at <strong>support@eshopperboutique.com</strong> or call our customer service team
          </p>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;
