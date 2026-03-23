import React from 'react';

// Timeline step colors and subtexts (same as user side)
const STATUS_COLOR = {
  Ordered: '#8b6c2f',
  Packed: '#b48b2a',
  Shipped: '#d1a84a',
  'Out for Delivery': '#a89646',
  Delivered: '#1f8f54',
  Confirmed: '#0ea5e9',
  'Order Placed': '#6366f1',
};

const STATUS_SUBTEXT = {
  Ordered: 'Order confirmed and processing.',
  Packed: 'Packed with care.',
  Shipped: 'In transit via courier.',
  'Out for Delivery': 'Out for delivery today.',
  Delivered: 'Delivered at doorstep.',
  Confirmed: 'Order confirmed by admin.',
  'Order Placed': 'Order placed by customer.',
};

function normalizeStatus(value = '') {
  const raw = String(value).trim().toLowerCase();
  if (raw === 'order placed' || raw === 'ordered') return 'Ordered';
  if (raw === 'packed') return 'Packed';
  if (raw === 'shipped') return 'Shipped';
  if (raw === 'out for delivery') return 'Out for Delivery';
  if (raw === 'delivered') return 'Delivered';
  if (raw === 'confirmed') return 'Confirmed';
  return value;
}

export default function OrderTimeline({ statusHistory = [] }) {
  // Normalize and deduplicate steps
  const timeline = statusHistory.map((entry) => ({
    ...entry,
    status: normalizeStatus(entry.status),
  }));

  return (
    <div className="order-timeline-premium" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 12 }}>
      <h5 className="font-weight-bold mb-3" style={{ color: '#111', fontSize: '16px', letterSpacing: '0.5px' }}>📍 Status Timeline</h5>
      <div style={{ position: 'relative', paddingLeft: 24 }}>
        {timeline.length === 0 ? (
          <div className="text-muted">No status history</div>
        ) : (
          timeline.map((event, idx) => (
            <div key={idx} style={{ marginBottom: idx < timeline.length - 1 ? 22 : 0, position: 'relative' }}>
              {/* Timeline dot */}
              <div
                style={{
                  position: 'absolute',
                  left: -28,
                  top: 4,
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  background: STATUS_COLOR[event.status] || '#d1a84a',
                  border: '3px solid white',
                  boxShadow: `0 0 0 2px ${(STATUS_COLOR[event.status] || '#d1a84a')}33`,
                }}
              />
              {/* Timeline line */}
              {idx < timeline.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: -22,
                    top: 17,
                    width: 2,
                    height: 22,
                    background: '#e5e7eb',
                  }}
                />
              )}
              <div>
                <span className="font-weight-bold small mb-1" style={{ color: '#111', fontSize: 13 }}>{event.status}</span>
                <span className="small ml-2 text-muted" style={{ fontSize: 12 }}>
                  {event.timestamp ? new Date(event.timestamp).toLocaleString('en-IN') : ''}
                </span>
                <div className="small mb-1" style={{ color: '#6b7280', fontSize: 12 }}>
                  {STATUS_SUBTEXT[event.status] || event.message}
                </div>
                {event.message && (
                  <div className="small text-muted" style={{ fontSize: 12 }}>{event.message}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
