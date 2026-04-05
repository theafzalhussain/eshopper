import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShoppingCart, BellRing, BellOff, CheckCheck } from 'lucide-react';
import { getSocket } from './socket';

const MAX_ITEMS = 8;

const toOrderCode = (order = {}) => {
  const code = order.orderId || order.orderid || order._id || order.id;
  if (!code) return 'N/A';
  const text = String(code);
  return text.length > 10 ? text.slice(-10) : text;
};

const toCustomerName = (order = {}) => {
  return order.userName || order.name || order.customerName || order.userEmail || 'Customer';
};

const toTimeAgo = (value) => {
  if (!value) return 'just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'just now';

  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
};

const buildInitialFeed = ({ orders = [], products = [] }) => {
  const orderItems = (orders || [])
    .slice(0, 6)
    .map((order) => ({
      id: `order-${order._id || order.id || Math.random()}`,
      type: 'order',
      title: `New order #${toOrderCode(order)}`,
      detail: `${toCustomerName(order)} placed an order`,
      at: order.updatedAt || order.createdAt || new Date().toISOString()
    }));

  const stockItems = (products || [])
    .filter((product) => Number(product?.stock) > 0 && Number(product?.stock) <= 5)
    .slice(0, 4)
    .map((product) => ({
      id: `stock-${product._id || product.id || Math.random()}`,
      type: 'stock',
      title: 'Low stock alert',
      detail: `${product.name || 'Product'} is at ${product.stock} units`,
      at: product.updatedAt || new Date().toISOString()
    }));

  return [...orderItems, ...stockItems]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, MAX_ITEMS);
};

export default function RecentActivityFeed({
  orders = [],
  products = [],
  lowStockCount = 0,
  activityData = null,
  isConnected = true
}) {
  const seededFeed = useMemo(() => {
    const recentOrders = activityData?.recentOrders || orders;
    const lowStockProducts = activityData?.lowStock || products;
    return buildInitialFeed({ orders: recentOrders, products: lowStockProducts });
  }, [activityData, orders, products]);
  const [feed, setFeed] = useState(seededFeed);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef(null);

  const playNotificationSound = () => {
    if (isMuted) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.14);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.18);
    } catch (error) {
      // Ignore sound errors to avoid interrupting dashboard updates.
    }
  };

  useEffect(() => {
    setFeed(seededFeed);
  }, [seededFeed]);

  useEffect(() => {
    const socket = getSocket('admin-dashboard');

    const pushItem = (item, incrementUnread = false) => {
      setFeed((prev) => {
        const next = [item, ...prev.filter((entry) => entry.id !== item.id)];
        return next.slice(0, MAX_ITEMS);
      });

      if (incrementUnread) {
        setUnreadCount((prev) => prev + 1);
        playNotificationSound();
      }
    };

    const onNewOrder = (payload) => {
      pushItem({
        id: `order-live-${payload?._id || payload?.orderid || Date.now()}`,
        type: 'order',
        title: `New order #${toOrderCode(payload || {})}`,
        detail: `${toCustomerName(payload || {})} placed an order`,
        at: payload?.updatedAt || payload?.createdAt || new Date().toISOString()
      }, true);
    };

    socket.on('newOrder', onNewOrder);

    return () => {
      socket.off('newOrder', onNewOrder);
    };
  }, [lowStockCount]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <motion.div
      className="scc-recent-activity"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <div className="scc-recent-activity-head">
        <div className="scc-recent-activity-title-wrap">
          <div className="scc-recent-activity-icon">
            <BellRing size={18} />
          </div>
          <div>
            <h3 className="scc-recent-activity-title">Recent Activity</h3>
            <p className="scc-recent-activity-subtitle">
              {isConnected ? 'Live updates from database' : 'Reconnecting to backend...'}
            </p>
          </div>
        </div>
        <div className="scc-recent-activity-actions">
          <button
            type="button"
            className="scc-activity-btn"
            onClick={() => setIsMuted((prev) => !prev)}
            aria-label={isMuted ? 'Unmute activity sound' : 'Mute activity sound'}
          >
            {isMuted ? <BellOff size={14} /> : <BellRing size={14} />}
            <span>{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>
          <button
            type="button"
            className="scc-activity-btn"
            onClick={() => setUnreadCount(0)}
          >
            <CheckCheck size={14} />
            <span>Mark Read</span>
          </button>
          {unreadCount > 0 && <span className="scc-activity-unread">{unreadCount}</span>}
        </div>
      </div>

      <div className="scc-recent-activity-list">
        <AnimatePresence initial={false}>
          {feed.length === 0 && (
            <motion.div
              key="empty"
              className="scc-recent-activity-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              No activity yet. Live events will appear here.
            </motion.div>
          )}

          {feed.map((item) => (
            <motion.div
              key={item.id}
              className="scc-activity-item"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.24 }}
            >
              <div className={`scc-activity-dot ${item.type === 'stock' ? 'is-stock' : 'is-order'}`}>
                {item.type === 'stock' ? <AlertTriangle size={13} /> : <ShoppingCart size={13} />}
              </div>
              <div className="scc-activity-copy">
                <div className="scc-activity-title">{item.title}</div>
                <div className="scc-activity-detail">{item.detail}</div>
              </div>
              <div className="scc-activity-time">{toTimeAgo(item.at)}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
