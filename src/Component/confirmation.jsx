import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { CheckCircle2, ShoppingBag, Download, User, MessageCircle, Truck, MapPin, Calendar } from 'lucide-react';
import { clearCart } from '../Store/ActionCreaters/CartActionCreators';
import { API_ENDPOINTS, BASE_URL, BRAND_LOGO_URL, BRAND_WATERMARK_URL, FRONTEND_URL } from '../constants';

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

  const safeNum = (value) => Number(value || 0);
  const money = (value) => `₹${safeNum(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const toWordsBelowThousand = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    let text = '';
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;

    if (hundred) {
      text += `${ones[hundred]} Hundred`;
      if (remainder) text += ' ';
    }

    if (remainder >= 10 && remainder < 20) {
      text += teens[remainder - 10];
    } else {
      const ten = Math.floor(remainder / 10);
      const one = remainder % 10;
      if (ten) text += tens[ten];
      if (ten && one) text += ' ';
      if (one) text += ones[one];
    }

    return text.trim();
  };

  const amountInWordsINR = (amount) => {
    const number = Math.round(safeNum(amount));
    if (!number) return 'Rupees Zero Only';

    const crore = Math.floor(number / 10000000);
    const lakh = Math.floor((number % 10000000) / 100000);
    const thousand = Math.floor((number % 100000) / 1000);
    const hundredPart = number % 1000;

    const parts = [];
    if (crore) parts.push(`${toWordsBelowThousand(crore)} Crore`);
    if (lakh) parts.push(`${toWordsBelowThousand(lakh)} Lakh`);
    if (thousand) parts.push(`${toWordsBelowThousand(thousand)} Thousand`);
    if (hundredPart) parts.push(toWordsBelowThousand(hundredPart));

    return `Rupees ${parts.join(' ')} Only`;
  };

  const getAbsoluteUrl = (source) => {
    if (!source) return '';
    if (/^https?:\/\//i.test(source)) return source;
    if (source.startsWith('/')) return `${window.location.origin}${source}`;
    return `${window.location.origin}/${source}`;
  };

  const loadImageAsDataUrl = async (source) => {
    try {
      const response = await fetch(getAbsoluteUrl(source));
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      return '';
    }
  };

  const getOrderContext = async () => {
    const shipping = order?.shippingAddress || {};
    const customerName = shipping.fullName || order?.userName || 'Customer';
    const addressLine1 = shipping.addressline1 || shipping.address || '-';
    const city = shipping.city || '-';
    const state = shipping.state || '-';
    const pin = shipping.pin || shipping.zipCode || '-';
    const phone = shipping.phone || '-';
    const country = shipping.country || 'India';
    const customerEmail = order?.email || shipping.email || '-';
    const orderDate = order?.orderDate ? new Date(order.orderDate) : new Date();
    const dateText = orderDate.toLocaleDateString('en-IN');
    const timeText = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const paymentMethod = order?.paymentMethod || 'COD';
    const paymentMode = /cod/i.test(paymentMethod) ? 'COD' : 'Paid';
    const paymentStatus = order?.paymentStatus || (paymentMode === 'Paid' ? 'Paid' : 'Pending');
    const trackingUrl = `${FRONTEND_URL}/order-tracking/${encodeURIComponent(order?.orderId || '')}`;

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(trackingUrl, {
        width: 220,
        margin: 1,
        color: { dark: '#111111', light: '#ffffff' }
      });
    } catch (error) {
      console.error('QR generation failed:', error?.message || error);
    }

    const logoDataUrl = await loadImageAsDataUrl(BRAND_LOGO_URL || '/logo192.png');
    const watermarkDataUrl = await loadImageAsDataUrl(BRAND_WATERMARK_URL || BRAND_LOGO_URL || '/logo192.png');
    const signatureDataUrl = await loadImageAsDataUrl(process.env.REACT_APP_DIGITAL_SIGNATURE_URL || BRAND_WATERMARK_URL || BRAND_LOGO_URL || '/logo192.png');

    const subtotal = safeNum(order?.totalAmount);
    const shippingFee = safeNum(order?.shippingAmount);
    const grandTotal = safeNum(order?.finalAmount || subtotal + shippingFee);
    const estimatedDelivery = new Date(order?.estimatedArrival || new Date().setDate(new Date().getDate() + 5));

    return {
      shipping,
      customerName,
      addressLine1,
      city,
      state,
      pin,
      phone,
      country,
      customerEmail,
      dateText,
      timeText,
      paymentMethod,
      paymentMode,
      paymentStatus,
      trackingUrl,
      qrDataUrl,
      logoDataUrl,
      watermarkDataUrl,
      signatureDataUrl,
      subtotal,
      shippingFee,
      grandTotal,
      estimatedDelivery,
      invoiceNo: `INV-${order?.orderId || `ESHP-${Date.now()}`}`,
      proformaNo: `PRO-${order?.orderId || `ESHP-${Date.now()}`}`,
      receiptNo: `REC-${order?.orderId || `ESHP-${Date.now()}`}`
    };
  };

  const drawA4Frame = (doc) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setDrawColor(232, 214, 165);
    doc.setLineWidth(0.6);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');
  };

  const buildReceiptPdf = async () => {
    if (!order) return;
    const ctx = await getOrderContext();
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    drawA4Frame(doc);

    if (ctx.logoDataUrl) {
      doc.addImage(ctx.logoDataUrl, 'PNG', 14, 12, 34, 14);
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(18);
    doc.text('ORDER RECEIPT', pageWidth - 14, 20, { align: 'right' });
    doc.setTextColor(70, 70, 70);
    doc.setFontSize(10);
    doc.text(`Receipt No: ${ctx.receiptNo}`, pageWidth - 14, 26, { align: 'right' });

    doc.setDrawColor(234, 234, 234);
    doc.roundedRect(14, 34, pageWidth - 28, 22, 2, 2, 'S');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Order ID', 18, 41);
    doc.text('Date', 18, 49);
    doc.text('Payment Mode', 110, 41);
    doc.text('Payment Method', 110, 49);
    doc.setFont('helvetica', 'normal');
    doc.text(order.orderId || '-', 47, 41);
    doc.text(`${ctx.dateText} ${ctx.timeText}`, 47, 49);
    doc.text(ctx.paymentMode, 146, 41);
    doc.text(ctx.paymentMethod, 146, 49);

    doc.setDrawColor(234, 234, 234);
    doc.roundedRect(14, 61, pageWidth - 28, 30, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(212, 175, 55);
    doc.text('Shipping To', 18, 69);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const addressLines = [
      ctx.customerName,
      ctx.addressLine1,
      `${ctx.city}, ${ctx.state} ${ctx.pin}`,
      `Phone: ${ctx.phone} | Email: ${ctx.customerEmail}`
    ];
    addressLines.forEach((line, index) => doc.text(line, 18, 75 + index * 5));

    const receiptRows = (order.products || []).map((product) => {
      const qty = safeNum(product.qty || 1);
      const price = safeNum(product.price);
      const variant = [product.size ? `Size: ${product.size}` : '', product.color ? `Color: ${product.color}` : '']
        .filter(Boolean)
        .join(' | ');
      return [
        variant ? `${product.name || 'Product'}\n${variant}` : `${product.name || 'Product'}`,
        `${qty}`,
        money(price),
        money(qty * price)
      ];
    });

    autoTable(doc, {
      startY: 97,
      margin: { left: 14, right: 14 },
      head: [['Item Description', 'Quantity', 'Unit Price', 'Sub-total']],
      body: receiptRows,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, textColor: [55, 55, 55], cellPadding: 3 },
      headStyles: { fillColor: [245, 245, 245], textColor: [40, 40, 40], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 96 },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 28, halign: 'right' }
      }
    });

    let y = (doc.lastAutoTable?.finalY || 140) + 8;
    if (y + 36 > pageHeight - 22) {
      doc.addPage();
      drawA4Frame(doc);
      y = 20;
    }

    doc.roundedRect(pageWidth - 90, y, 76, 30, 2, 2, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.text('Subtotal', pageWidth - 86, y + 7);
    doc.text(money(ctx.subtotal), pageWidth - 18, y + 7, { align: 'right' });
    doc.text('Shipping', pageWidth - 86, y + 14);
    doc.text(ctx.shippingFee === 0 ? 'Free' : money(ctx.shippingFee), pageWidth - 18, y + 14, { align: 'right' });
    doc.setDrawColor(220, 220, 220);
    doc.line(pageWidth - 86, y + 18, pageWidth - 18, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(12);
    doc.text('Grand Total', pageWidth - 86, y + 26);
    doc.text(money(ctx.grandTotal), pageWidth - 18, y + 26, { align: 'right' });

    const footerY = Math.min(pageHeight - 16, y + 38);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(115, 115, 115);
    doc.setFontSize(8.3);
    doc.text('Thank you for your selection. Your items are being prepared by our artisans. This is a computer-generated receipt.', 14, footerY, {
      maxWidth: pageWidth - 28
    });

    doc.save(`Order_Receipt_${order.orderId || Date.now()}.pdf`);
  };

  const buildProformaPdf = async () => {
    if (!order) return;
    const ctx = await getOrderContext();
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    drawA4Frame(doc);
    if (ctx.logoDataUrl) {
      doc.addImage(ctx.logoDataUrl, 'PNG', 14, 12, 34, 14);
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(17);
    doc.text('ORDER CONFIRMATION PROFORMA', pageWidth - 14, 20, { align: 'right' });
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Proforma No: ${ctx.proformaNo}`, pageWidth - 14, 26, { align: 'right' });

    doc.setTextColor(234, 234, 234);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('VERIFIED & CONFIRMED', pageWidth / 2, 50, { align: 'center', angle: -18 });
    if (ctx.watermarkDataUrl) {
      doc.addImage(ctx.watermarkDataUrl, 'PNG', pageWidth / 2 - 20, 34, 40, 20);
    }

    doc.setFillColor(248, 248, 248);
    doc.roundedRect(14, 58, pageWidth - 28, 24, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(12);
    doc.text('EXPECTED DELIVERY', 18, 66);
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.text(ctx.estimatedDelivery.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }), 18, 73);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Delivery Partner: ${order.deliveryPartner || order.courierName || 'Delhivery'}`, 18, 79);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.4);
    doc.setTextColor(70, 70, 70);
    doc.text(`Order ID: ${order.orderId || '-'}   |   Date: ${ctx.dateText} ${ctx.timeText}   |   Payment: ${ctx.paymentMethod}`, 14, 88);

    const rows = (order.products || []).map((product) => {
      const qty = safeNum(product.qty || 1);
      const unitPrice = safeNum(product.price);
      const variant = [product.size ? `Size: ${product.size}` : '', product.color ? `Color: ${product.color}` : '']
        .filter(Boolean)
        .join(' | ');
      return [
        variant ? `${product.name || 'Product'}\n${variant}\nQuality Inspected: Yes` : `${product.name || 'Product'}\nQuality Inspected: Yes`,
        `${qty}`,
        money(unitPrice),
        money(unitPrice * qty)
      ];
    });

    autoTable(doc, {
      startY: 93,
      margin: { left: 14, right: 14 },
      head: [['Itemized Detail', 'Quantity', 'Unit Price', 'Sub-total']],
      body: rows,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, textColor: [55, 55, 55], cellPadding: 3 },
      headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 247, 247] },
      columnStyles: {
        0: { cellWidth: 95 },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 29, halign: 'right' }
      }
    });

    let y = (doc.lastAutoTable?.finalY || 150) + 8;
    if (y + 44 > pageHeight - 16) {
      doc.addPage();
      drawA4Frame(doc);
      y = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    doc.text('Cancellation & Return Policy', 14, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    doc.setTextColor(100, 100, 100);
    doc.text('Orders can be cancelled before dispatch. Returns are accepted as per published policy timelines for eligible items in original condition.', 14, y + 12, {
      maxWidth: pageWidth - 58
    });

    if (ctx.qrDataUrl) {
      doc.addImage(ctx.qrDataUrl, 'PNG', pageWidth - 40, y + 4, 22, 22);
      doc.setFontSize(7.8);
      doc.text('Scan for', pageWidth - 29, y + 29, { align: 'center' });
      doc.text('Order Tracking', pageWidth - 29, y + 33, { align: 'center' });
    }

    doc.save(`Order_Confirmation_Proforma_${order.orderId || Date.now()}.pdf`);
  };

  const buildFinalTaxInvoicePdf = async () => {
    if (!order) return;
    const ctx = await getOrderContext();
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const seller = {
      company: 'eShopper Boutique Pvt. Ltd.',
      gstin: '07ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      address: 'Regd. Office: New Delhi, India - 110001',
      support: 'support@eshopperr.me'
    };

    drawA4Frame(doc);

    doc.setFont('times', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(21);
    doc.text('TAX INVOICE', pageWidth / 2, 18, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(50, 50, 50);
    doc.text('Seller Details', pageWidth - 14, 14, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.1);
    doc.text(`GSTIN: ${seller.gstin}`, pageWidth - 14, 19, { align: 'right' });
    doc.text(`PAN: ${seller.pan}`, pageWidth - 14, 23, { align: 'right' });
    doc.text(seller.address, pageWidth - 14, 27, { align: 'right' });
    doc.text(`Support: ${seller.support}`, pageWidth - 14, 31, { align: 'right' });

    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(14, 36, 88, 30, 2, 2, 'S');
    doc.roundedRect(108, 36, 88, 30, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(10);
    doc.text('Bill To', 18, 43);
    doc.text('Ship To', 112, 43);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8.8);
    const billToLines = [
      ctx.customerName,
      ctx.customerEmail,
      `Phone: ${ctx.phone}`,
      `${ctx.city}, ${ctx.state} ${ctx.pin}`
    ];
    billToLines.forEach((line, idx) => doc.text(line, 18, 49 + idx * 4.6));
    const shipToLines = [
      ctx.customerName,
      ctx.addressLine1,
      `${ctx.city}, ${ctx.state} ${ctx.pin}`,
      ctx.country
    ];
    shipToLines.forEach((line, idx) => doc.text(line, 112, 49 + idx * 4.6));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    doc.setTextColor(70, 70, 70);
    doc.text(`Invoice No: ${ctx.invoiceNo} | Order ID: ${order.orderId || '-'} | Date: ${ctx.dateText} ${ctx.timeText}`, 14, 71);

    const taxRows = (order.products || []).map((product, index) => {
      const qty = safeNum(product.qty || 1);
      const unitPrice = safeNum(product.price);
      const gross = qty * unitPrice;
      const discount = safeNum(product.discount || 0);
      const taxable = Math.max(0, gross - discount);
      const gstRate = safeNum(product.gstRate || order.gstRate || 18);
      const isDomestic = (ctx.country || 'India').toLowerCase() === 'india';
      const gstBreakdown = isDomestic
        ? `CGST ${(gstRate / 2).toFixed(1)}% + SGST ${(gstRate / 2).toFixed(1)}%`
        : `IGST ${gstRate.toFixed(1)}%`;
      const gstAmount = taxable * gstRate / 100;
      const total = taxable + gstAmount;
      return [
        `${index + 1}`,
        product.name || 'Product',
        product.hsnCode || order.hsnCode || '6109',
        product.sku || product.productid || product.id || product._id || 'NA',
        `${qty}`,
        money(gross),
        money(discount),
        money(taxable),
        gstBreakdown,
        money(total)
      ];
    });

    autoTable(doc, {
      startY: 75,
      margin: { left: 10, right: 10 },
      head: [['S.No', 'Description', 'HSN Code', 'SKU', 'Qty', 'Gross Amount', 'Discount', 'Taxable Value', 'GST Rate (CGST/SGST/IGST)', 'Total']],
      body: taxRows,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 7.2, textColor: [50, 50, 50], cellPadding: 2.2, overflow: 'linebreak' },
      headStyles: { fillColor: [238, 238, 238], textColor: [20, 20, 20], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 249, 249] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 23 },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 20 },
        4: { cellWidth: 9, halign: 'center' },
        5: { cellWidth: 18, halign: 'right' },
        6: { cellWidth: 15, halign: 'right' },
        7: { cellWidth: 18, halign: 'right' },
        8: { cellWidth: 33 },
        9: { cellWidth: 20, halign: 'right' }
      }
    });

    let y = (doc.lastAutoTable?.finalY || 145) + 6;
    const computedTaxable = taxRows.reduce((sum, row) => sum + safeNum(String(row[7]).replace(/[₹,]/g, '')), 0);
    const computedGross = taxRows.reduce((sum, row) => sum + safeNum(String(row[5]).replace(/[₹,]/g, '')), 0);
    const computedDiscount = taxRows.reduce((sum, row) => sum + safeNum(String(row[6]).replace(/[₹,]/g, '')), 0);
    const totalTaxAmount = Math.max(0, ctx.grandTotal - computedTaxable);
    const cgst = totalTaxAmount / 2;
    const sgst = totalTaxAmount / 2;

    if (y + 62 > pageHeight - 16) {
      doc.addPage();
      drawA4Frame(doc);
      y = 18;
    }

    doc.roundedRect(10, y, 102, 34, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(40, 40, 40);
    doc.text('Financial Totals', 14, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.text(`Gross Amount: ${money(computedGross)}`, 14, y + 12);
    doc.text(`Discount: ${money(computedDiscount)}`, 14, y + 17);
    doc.text(`Taxable Value: ${money(computedTaxable)}`, 14, y + 22);
    doc.text(`CGST: ${money(cgst)} | SGST: ${money(sgst)}`, 14, y + 27);
    doc.setFont('helvetica', 'bold');
    doc.text(`Grand Total: ${money(ctx.grandTotal)}`, 14, y + 32);

    doc.roundedRect(116, y, 80, 34, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.text('Payment Information', 120, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.text(`Transaction ID: ${order.transactionId || order.paymentId || '-'}`, 120, y + 12);
    doc.text(`Payment Date: ${ctx.dateText} ${ctx.timeText}`, 120, y + 17);
    doc.text(`Bank Name: ${order.bankName || (/cod/i.test(ctx.paymentMethod) ? 'N/A (COD)' : 'Online Gateway')}`, 120, y + 22);
    doc.text(`Payment Mode: ${ctx.paymentMethod}`, 120, y + 27);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(60, 60, 60);
    doc.text(`Amount in Words: ${amountInWordsINR(ctx.grandTotal)}`, 10, y + 40, { maxWidth: pageWidth - 20 });

    const authY = y + 44;
    if (authY + 20 > pageHeight - 12) {
      doc.addPage();
      drawA4Frame(doc);
    }
    const authBaseY = Math.min(authY, pageHeight - 30);
    doc.setTextColor(210, 244, 220);
    doc.setFontSize(30);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID', pageWidth / 2, authBaseY + 6, { align: 'center', angle: -24 });

    if (ctx.signatureDataUrl) {
      doc.addImage(ctx.signatureDataUrl, 'PNG', pageWidth - 64, authBaseY - 3, 42, 14);
    }
    doc.setDrawColor(150, 150, 150);
    doc.line(pageWidth - 64, authBaseY + 13, pageWidth - 22, authBaseY + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    doc.setTextColor(90, 90, 90);
    doc.text('Authorized Signatory', pageWidth - 43, authBaseY + 18, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(110, 110, 110);
    doc.text('Returns handled via https://eshopperr.me/returns. HSN codes as per GST Law.', 10, pageHeight - 10, { maxWidth: pageWidth - 20 });

    doc.save(`Final_Tax_Invoice_${order.orderId || Date.now()}.pdf`);
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
            onClick={buildReceiptPdf}
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
            Download Receipt
          </button>

          <button
            onClick={buildProformaPdf}
            style={{
              backgroundColor: '#2c2c2c',
              color: '#ffffff',
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
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#1a1a1a')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#2c2c2c')}
          >
            <Download size={20} />
            Download Proforma
          </button>

          <button
            onClick={buildFinalTaxInvoicePdf}
            style={{
              backgroundColor: '#ffffff',
              color: '#2c2c2c',
              padding: '15px 30px',
              borderRadius: '8px',
              border: '2px solid #2c2c2c',
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
              e.target.style.backgroundColor = '#2c2c2c';
              e.target.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.color = '#2c2c2c';
            }}
          >
            <Download size={20} />
            Download Tax Invoice
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
