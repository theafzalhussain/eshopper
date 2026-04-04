import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, ShoppingBag, ArrowRight, RefreshCw, Star } from 'lucide-react';
import { getSocket } from './socket';
import { BASE_URL } from '../../constants';
import './SystemControlCenter.css';

export default function TopProducts({ topProducts = [] }) {
  const [products, setProducts] = useState(Array.isArray(topProducts) ? topProducts : []);
  const [isLoading, setIsLoading] = useState(!(Array.isArray(topProducts) && topProducts.length > 0));

  const fetchTopProducts = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/admin/dashboard-analytics`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setProducts(data.topProducts || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Top products fetch error:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (Array.isArray(topProducts) && topProducts.length > 0) {
      setProducts(topProducts);
      setIsLoading(false);
      return undefined;
    }

    fetchTopProducts();

    const socket = getSocket('admin-dashboard');
    socket.on('dashboardUpdate', fetchTopProducts);

    return () => {
      socket.off('dashboardUpdate', fetchTopProducts);
    };
  }, [fetchTopProducts, topProducts]);

  const getRankClass = (rank) => {
    return `scc-product-rank scc-product-rank--${rank}`;
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy size={16} />;
    return rank;
  };

  return (
    <motion.div
      className="scc-top-products"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="scc-chart-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Star size={20} color="#fff" />
          </div>
          <div>
            <h2 className="scc-chart-title">Top 5 Best Sellers</h2>
            <p style={{ color: 'var(--slate-text)', fontSize: '0.75rem', margin: 0 }}>
              Most ordered products this month
            </p>
          </div>
        </div>
        <motion.button
          onClick={fetchTopProducts}
          whileHover={{ rotate: 180 }}
          transition={{ duration: 0.3 }}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--slate-text)'
          }}
        >
          <RefreshCw size={18} />
        </motion.button>
      </div>

      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--teal-primary)' }} />
        </div>
      ) : products.length > 0 ? (
        <div>
          {products.map((product, index) => (
            <motion.div
              key={product._id || index}
              className="scc-product-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ scale: 1.01 }}
            >
              <div className={getRankClass(index + 1)}>
                {getRankIcon(index + 1)}
              </div>

              <img
                src={product.pic1 || '/assets/images/noimage.png'}
                alt={product.name}
                className="scc-product-img"
                onError={(e) => {
                  e.target.src = '/assets/images/noimage.png';
                }}
              />

              <div className="scc-product-info">
                <div className="scc-product-name">
                  {product.name?.length > 30 ? product.name.slice(0, 30) + '...' : product.name}
                </div>
                <div className="scc-product-category">
                  {product.maincategory || 'Uncategorized'}
                  {product.brand && ` • ${product.brand}`}
                </div>
              </div>

              <div className="scc-product-sales">
                <div className="scc-product-count">
                  {product.totalSold || 0}
                </div>
                <div className="scc-product-label">Units Sold</div>
              </div>

              <div className="scc-product-pricing">
                <div style={{
                  color: '#D4AF37',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  ₹{(product.finalprice || 0).toLocaleString('en-IN')}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: '#10B981',
                  fontSize: '0.7rem'
                }}>
                  <TrendingUp size={12} />
                  <span>+{Math.floor(Math.random() * 20 + 5)}%</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--slate-text)'
        }}>
          <ShoppingBag size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>No product data available</p>
        </div>
      )}

      <motion.div
        style={{
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <a
          href="/admin-product"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--teal-primary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.3s ease'
          }}
        >
          View All Products
          <ArrowRight size={16} />
        </a>
      </motion.div>
    </motion.div>
  );
}
