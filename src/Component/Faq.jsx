import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(0)

  const faqs = useMemo(
    () => [
      {
        q: 'How long does delivery take?',
        a: 'Most metro city orders are delivered in 2-4 business days. Tier-2 and Tier-3 locations typically take 4-7 business days. During sale events, timelines can extend by 1-2 days.'
      },
      {
        q: 'Can I return or exchange a product?',
        a: 'Yes. We offer easy returns for eligible products within 7 days of delivery. Products must be unused, with original tags and packaging intact. Visit our Return Policy page for complete details.'
      },
      {
        q: 'How do I track my order?',
        a: 'Open My Orders from your account and select the order you want to track. You can view latest shipment status and estimated delivery updates in real time.'
      },
      {
        q: 'When will I get my refund?',
        a: 'Once quality check is completed at pickup warehouse, refunds are initiated to original payment source. Prepaid orders usually reflect in 3-7 business days. COD refunds are processed to bank account or UPI.'
      },
      {
        q: 'Is Cash on Delivery available?',
        a: 'COD availability depends on pincode and order value. You will see the option at checkout if your location is serviceable for COD.'
      },
      {
        q: 'How can I contact support quickly?',
        a: 'You can raise a query from the Contact page, chat on WhatsApp support, or call our customer care number listed in Contact. Our team responds fastest between 10 AM and 8 PM.'
      }
    ],
    []
  )

  return (
    <div className="faq-page-wrap">
      <section className="faq-hero">
        <div className="container text-center">
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="faq-kicker">
            Support Center
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="faq-title">
            Frequently Asked Questions
          </motion.h1>
          <p className="faq-subtitle">
            Fast answers for orders, delivery, returns, refunds, and account help.
          </p>
        </div>
      </section>

      <section className="faq-main-section py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-9">
              <div className="faq-card-shell">
                {faqs.map((item, idx) => {
                  const active = openIndex === idx
                  return (
                    <div className="faq-item" key={item.q}>
                      <button
                        type="button"
                        className={`faq-trigger ${active ? 'active' : ''}`}
                        onClick={() => setOpenIndex(active ? -1 : idx)}
                        aria-expanded={active}
                      >
                        <span>{item.q}</span>
                        <span className="faq-plus">{active ? '-' : '+'}</span>
                      </button>
                      <div className={`faq-panel ${active ? 'open' : ''}`}>
                        <p>{item.a}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="faq-cta-box mt-4">
                <h3>Still need help?</h3>
                <p>Our support team is ready to assist you with priority handling.</p>
                <div className="faq-cta-actions">
                  <Link to="/contact" className="faq-btn faq-btn-dark">Contact Support</Link>
                  <Link to="/return-policy" className="faq-btn faq-btn-outline">View Return Policy</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .faq-page-wrap {
          background: radial-gradient(circle at 20% 15%, rgba(201, 168, 76, 0.15), transparent 48%), #faf8f3;
          min-height: 100vh;
        }
        .faq-hero {
          padding: 70px 0 48px;
          background: linear-gradient(135deg, #101010 0%, #1f1f1f 60%, #2b2b2b 100%);
          color: #fff;
        }
        .faq-kicker {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 11px;
          color: #d8bd72;
          margin-bottom: 8px;
        }
        .faq-title {
          font-family: 'Playfair Display', serif;
          font-weight: 500;
          letter-spacing: 0.02em;
          font-size: clamp(1.8rem, 4vw, 3rem);
          margin-bottom: 10px;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          text-shadow: 0 10px 24px rgba(0, 0, 0, 0.34), 0 0 20px rgba(212, 180, 103, 0.14);
        }
        .faq-subtitle {
          color: rgba(255,255,255,0.95);
          margin: 0 auto;
          max-width: 640px;
          font-size: 15px;
          text-shadow: 0 4px 12px rgba(0,0,0,0.26);
        }
        .faq-card-shell {
          background: #fff;
          border: 1px solid #ece4d3;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 14px 30px rgba(15, 15, 15, 0.06);
        }
        .faq-item + .faq-item {
          border-top: 1px solid #f1ebdd;
        }
        .faq-trigger {
          width: 100%;
          text-align: left;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 0;
          background: #fff;
          padding: 18px 18px;
          font-weight: 700;
          color: #232323;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .faq-trigger:hover,
        .faq-trigger.active {
          background: #fffcf5;
          color: #8d6a12;
        }
        .faq-plus {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: 1px solid #e7dcc6;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          line-height: 1;
          flex-shrink: 0;
        }
        .faq-panel {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.25s ease;
          background: #fffdfa;
        }
        .faq-panel.open {
          max-height: 220px;
        }
        .faq-panel p {
          margin: 0;
          padding: 0 18px 18px;
          color: #555;
          line-height: 1.65;
          font-size: 14px;
        }
        .faq-cta-box {
          background: linear-gradient(135deg, #101010 0%, #2d2d2d 100%);
          border: 1px solid #2f2f2f;
          border-radius: 16px;
          padding: 24px;
          color: #fff;
          box-shadow: 0 20px 30px rgba(0,0,0,0.18);
        }
        .faq-cta-box h3 {
          margin: 0 0 8px;
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
        }
        .faq-cta-box p {
          color: rgba(255,255,255,0.78);
          margin: 0 0 16px;
        }
        .faq-cta-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .faq-btn {
          border-radius: 999px;
          padding: 10px 18px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .faq-btn-dark {
          background: linear-gradient(135deg, #d4b467 0%, #c39d40 100%);
          color: #121212;
        }
        .faq-btn-dark:hover {
          color: #121212;
          transform: translateY(-1px);
        }
        .faq-btn-outline {
          border: 1px solid rgba(255,255,255,0.35);
          color: #fff;
        }
        .faq-btn-outline:hover {
          color: #fff;
          border-color: #d4b467;
        }
        @media (max-width: 767px) {
          .faq-hero {
            padding: 56px 0 36px;
          }
          .faq-trigger {
            font-size: 14px;
            padding: 14px;
          }
          .faq-panel p {
            padding: 0 14px 14px;
          }
        }
      `}} />
    </div>
  )
}
