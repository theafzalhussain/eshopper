import React from 'react'
import { Link } from 'react-router-dom'

const policyPoints = [
  {
    title: 'Return Window',
    description:
      'Eligible products can be returned within 7 days from delivery date. Return request should be raised from My Orders or Contact support with order details.'
  },
  {
    title: 'Product Condition',
    description:
      'Items must be unused, unwashed, with original tags, invoice, and brand packaging. Any signs of wear, perfume, stains, or tampering may lead to rejection.'
  },
  {
    title: 'Pickup & Quality Check',
    description:
      'After approval, reverse pickup is scheduled in serviceable pincodes. Once item reaches quality desk and passes inspection, refund or exchange is processed.'
  },
  {
    title: 'Refund Timeline',
    description:
      'Prepaid orders are refunded to original method in 3-7 business days after QC pass. COD refunds are transferred to verified bank account or UPI.'
  }
]

const nonReturnable = [
  'Innerwear, socks, and hygiene-sensitive categories',
  'Beauty or grooming products with broken seals',
  'Gift cards and promotional freebies',
  'Products marked as Final Sale or Non-Returnable on product page'
]

export default function ReturnPolicy() {
  const brandName = process.env.REACT_APP_BRAND_NAME || 'Eshopper'

  return (
    <div className="return-policy-wrap">
      <section className="return-policy-hero">
        <div className="container">
          <p className="return-kicker">Policy & Protection</p>
          <h1>Premium Return Policy</h1>
          <p>
            Transparent, customer-first and designed for a smooth shopping experience at {brandName}.
          </p>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mb-4 mb-lg-0">
              <div className="policy-main-card">
                <h2>How Returns Work</h2>
                <p className="policy-intro">
                  We keep returns simple and fair. Follow the timeline and condition rules below to ensure faster approval and refund.
                </p>

                <div className="policy-grid">
                  {policyPoints.map((point) => (
                    <article key={point.title} className="policy-point">
                      <h3>{point.title}</h3>
                      <p>{point.description}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="policy-main-card mt-4">
                <h2>Exchange Policy</h2>
                <div className="exchange-estimate-chip">Estimated Exchange Delivery: 3-5 Business Days</div>
                <p>
                  Size and color exchange is subject to stock availability. If requested variant is unavailable, instant refund option will be shared.
                </p>
                <ul className="exchange-policy-list mb-0">
                  <li>Exchange request can be raised within 7 days of successful delivery.</li>
                  <li>One free exchange is available for eligible products in serviceable pincodes.</li>
                  <li>Reverse pickup and quality check process remains same as return policy.</li>
                  <li>Premium members get priority exchange dispatch where inventory is available.</li>
                  <li>If exchanged variant is out of stock, refund is auto-initiated to original payment mode.</li>
                </ul>
              </div>
            </div>

            <div className="col-lg-4">
              <aside className="policy-side-card">
                <h3>Non-Returnable Items</h3>
                <ul>
                  {nonReturnable.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <div className="policy-support-box">
                  <h4>Need Manual Help?</h4>
                  <p>Our support specialists can raise return requests for you.</p>
                  <div className="policy-actions">
                    <Link to="/contact" className="policy-btn policy-btn-dark">Contact Support</Link>
                    <Link to="/faq" className="policy-btn policy-btn-light">View FAQs</Link>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .return-policy-wrap {
          min-height: 100vh;
          background: linear-gradient(180deg, #f8f6f2 0%, #fcfbf8 45%, #f7f3ea 100%);
        }
        .return-policy-hero {
          background: radial-gradient(circle at 15% 20%, rgba(212, 175, 55, 0.22), transparent 35%), linear-gradient(135deg, #0f0f0f 0%, #1f1f1f 60%, #313131 100%);
          color: #fff;
          padding: 72px 0 52px;
        }
        .return-kicker {
          margin: 0 0 10px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 11px;
         color: #d4b567;
        }
        .return-policy-hero h1 {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-weight: 500;
          letter-spacing: 0.02em;
          font-size: clamp(2rem, 4vw, 3.1rem);
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          text-shadow: 0 10px 24px rgba(0, 0, 0, 0.34), 0 0 20px rgba(212, 180, 103, 0.16);
        }
        .return-policy-hero p {
          margin: 12px 0 0;
          max-width: 620px;
          color: rgba(255,255,255,0.94);
          text-shadow: 0 4px 12px rgba(0,0,0,0.24);
        }
        .policy-main-card,
        .policy-side-card {
          background: #fff;
          border: 1px solid #ece4d3;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 14px 28px rgba(20, 20, 20, 0.06);
        }
        .policy-main-card h2 {
          font-family: 'Playfair Display', serif;
          margin: 0 0 8px;
          font-size: 1.7rem;
          color: #1c1c1c;
        }
        .policy-intro {
          color: #595959;
          margin-bottom: 18px;
        }
        .exchange-policy-list {
          margin-top: 12px;
          padding-left: 18px;
        }
        .exchange-estimate-chip {
          display: inline-flex;
          align-items: center;
          margin: 4px 0 12px;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid #dcc48d;
          background: linear-gradient(135deg, #111111 0%, #2b2b2b 70%, #c39d3f 100%);
          color: #f6e4b5;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
          box-shadow: 0 8px 18px rgba(17,17,17,0.12);
        }
        .exchange-policy-list li {
          color: #525252;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 8px;
        }
        .policy-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .policy-point {
          border: 1px solid #f1eadc;
          border-radius: 14px;
          padding: 14px;
          background: linear-gradient(180deg, #fff 0%, #fffcf6 100%);
        }
        .policy-point h3 {
          margin: 0 0 8px;
          font-size: 1rem;
          color: #7f6114;
        }
        .policy-point p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          color: #5b5b5b;
        }
        .policy-side-card h3 {
          margin: 0 0 12px;
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
        }
        .policy-side-card ul {
          margin: 0;
          padding-left: 18px;
        }
        .policy-side-card li {
          margin-bottom: 10px;
          color: #525252;
          line-height: 1.5;
          font-size: 14px;
        }
        .policy-support-box {
          margin-top: 18px;
          border-top: 1px dashed #eadfca;
          padding-top: 16px;
        }
        .policy-support-box h4 {
          margin: 0 0 6px;
          font-size: 1.05rem;
          color: #1f1f1f;
        }
        .policy-support-box p {
          font-size: 13px;
          color: #606060;
          margin-bottom: 12px;
        }
        .policy-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .policy-btn {
          text-decoration: none;
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
          transition: all 0.2s ease;
        }
        .policy-btn-dark {
          background: linear-gradient(135deg, #d4b567 0%, #c39d3f 100%);
          color: #101010;
        }
        .policy-btn-dark:hover {
          color: #101010;
          transform: translateY(-1px);
        }
        .policy-btn-light {
          border: 1px solid #d9c5a3;
          color: #7a5f1d;
          background: #fffaf0;
        }
        .policy-btn-light:hover {
          color: #6a5012;
          border-color: #c39d3f;
        }
        @media (max-width: 991px) {
          .policy-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 767px) {
          .return-policy-hero {
            padding: 56px 0 36px;
          }
          .policy-main-card,
          .policy-side-card {
            padding: 18px;
            border-radius: 14px;
          }
        }
      `}} />
    </div>
  )
}
