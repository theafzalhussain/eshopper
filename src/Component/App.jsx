import React, { Suspense, useEffect, useState } from 'react'
import lazyWithRetry from '../utils/lazyRetry'
import RouteErrorBoundary from './RouteErrorBoundary'
import WidgetErrorBoundary from './WidgetErrorBoundary'
import { resetChunkRecoveryState } from '../utils/chunkRecovery'
import useRealtimeSocket from '../hooks/useRealtimeSocket'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastProvider } from './ToastNotification'
import ToastEventBridge from './ToastEventBridge'
import Navbaar from './Navbaar'
import { useMembership } from './MembershipContext'
import CatalogQueryBridge from './CatalogQueryBridge'
import SEO, { organizationJsonLd, websiteJsonLd } from './SEO'

/* Every route/shell chunk retries before it gives up, and a failure is
   caught by RouteErrorBoundary instead of blanking the whole app. */
const lazy = lazyWithRetry

/* Below-the-fold and on-demand shells stay out of the initial bundle */
const Footer = lazy(() => import('./Footer'))
const PremiumAuthPopup = lazy(() => import('./PremiumAuthPopup'))
const ChatBot = lazy(() => import('./ChatBot'))

const Home = lazy(() => import('./Home'))
const About = lazy(() => import('./About'))
const Contact = lazy(() => import('./Contact'))
const Faq = lazy(() => import('./Faq'))
const ReturnPolicy = lazy(() => import('./ReturnPolicy'))
const Terms = lazy(() => import('./Terms'))
const Shop = lazy(() => import('./Shop'))
const Cart = lazy(() => import('./Cart'))
const Wishlist = lazy(() => import('./Wishlist'))
const Checkout = lazy(() => import('./Checkout'))
const SingleProductPage = lazy(() => import('./SingleProductPage'))
const Confirmation = lazy(() => import('./confirmation'))
const Login = lazy(() => import('./Login'))
const SingUp = lazy(() => import('./SingUp'))
const ForgetPassword = lazy(() => import('./ForgetPassword'))
const Profile = lazy(() => import('./Profile'))
const UpdateProfile = lazy(() => import('./UpdateProfile'))
const MyOrders = lazy(() => import('./MyOrders'))
const OrderTracking = lazy(() => import('./OrderTracking'))
const AdminHome = lazy(() => import('./Admin/AdminHome'))
const AdminUser = lazy(() => import('./Admin/AdminUser'))
const AdminContact = lazy(() => import('./Admin/AdminContact'))
const AdminNewsletter = lazy(() => import('./Admin/AdminNewsletter'))
const AdminCheckout = lazy(() => import('./Admin/AdminCheckout'))
const AdminMaincategory = lazy(() => import('./Admin/AdminMaincategory'))
const AdminAddMaincategory = lazy(() => import('./Admin/AdminAddMaincategory'))
const AdminUpdateMaincategory = lazy(() => import('./Admin/AdminUpdateMaincategory'))
const AdminSubcategory = lazy(() => import('./Admin/AdminSubcategory'))
const AdminAddSubcategory = lazy(() => import('./Admin/AdminAddSubcategory'))
const AdminUpdateSubcategory = lazy(() => import('./Admin/AdminUpdateSubcategory'))
const AdminBrand = lazy(() => import('./Admin/AdminBrand'))
const AdminAddBrand = lazy(() => import('./Admin/AdminAddBrand'))
const AdminUpdateBrand = lazy(() => import('./Admin/AdminUpdateBrand'))
const AdminProduct = lazy(() => import('./Admin/AdminProduct'))
const AdminAddProduct = lazy(() => import('./Admin/AdminAddProduct'))
const AdminUpdateProduct = lazy(() => import('./Admin/AdminUpdateProduct'))
const AdminOrders = lazy(() => import('./Admin/AdminOrders'))
const AdminCoupon = lazy(() => import('./Admin/AdminCoupon'))
const AdminDeployChecks = lazy(() => import('./Admin/AdminDeployChecks'))
const AdminActivityLog = lazy(() => import('./Admin/AdminActivityLog'))

const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
    return null;
}

/* ══════════════════════════════════════════════════════════
   IDLE MOUNT
   Non-critical widgets (chat, auth nudge) wait until the main
   thread is free, so they never compete with first paint or
   make a low-end phone feel janky on load.
══════════════════════════════════════════════════════════ */
const useIdle = (delay = 1200) => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let idleId = null;
        let timerId = null;

        const go = () => { if (!cancelled) setReady(true); };

        const schedule = () => {
            if (typeof window.requestIdleCallback === 'function') {
                idleId = window.requestIdleCallback(go, { timeout: delay + 2000 });
            } else {
                timerId = setTimeout(go, delay);
            }
        };

        if (document.readyState === 'complete') timerId = setTimeout(schedule, delay);
        else window.addEventListener('load', schedule, { once: true });

        return () => {
            cancelled = true;
            if (timerId) clearTimeout(timerId);
            if (idleId && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
        };
    }, [delay]);

    return ready;
}

const IdleMount = ({ children, delay, name }) => {
    const ready = useIdle(delay);
    if (!ready) return null;
    return (
        <WidgetErrorBoundary name={name}>
            <Suspense fallback={null}>{children}</Suspense>
        </WidgetErrorBoundary>
    );
}

/* Footer is below the fold — render it only once it is close to view */
const LazyFooter = () => {
    const [show, setShow] = useState(false);
    const [node, setNode] = useState(null);

    useEffect(() => {
        if (!node || show) return;
        if (!('IntersectionObserver' in window)) { setShow(true); return; }
        const obs = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) { setShow(true); obs.disconnect(); }
        }, { rootMargin: '600px' });
        obs.observe(node);
        return () => obs.disconnect();
    }, [node, show]);

    if (show) return (
        <WidgetErrorBoundary name="Footer">
            <Suspense fallback={null}><Footer /></Suspense>
        </WidgetErrorBoundary>
    );
    return <div ref={setNode} style={{ minHeight: 1 }} aria-hidden="true" />;
}

const AppShell = ({ children }) => {
  const { pathname } = useLocation();
  const hideFooterRoutes = ['/login', '/signup'];
  const isAdminRoute = pathname.startsWith('/admin');
  const shouldShowFooter = !hideFooterRoutes.includes(pathname) && !isAdminRoute;

  return (
    <>
      <ScrollToTop />
      <WidgetErrorBoundary name="Navbaar">
        <Navbaar />
      </WidgetErrorBoundary>
      <WidgetErrorBoundary name="CatalogQueryBridge">
        <CatalogQueryBridge />
      </WidgetErrorBoundary>
      {children}
      {shouldShowFooter && <LazyFooter />}
      <IdleMount delay={900} name="PremiumAuthPopup"><PremiumAuthPopup /></IdleMount>
      <IdleMount delay={1500} name="ChatBot"><ChatBot /></IdleMount>
    </>
  );
}

const AdminRoute = ({ children }) => {
    const isLoggedIn = localStorage.getItem("login") === "true";
    const role = localStorage.getItem("role");
    if (!isLoggedIn || role !== "Admin") {
        return <Navigate to="/login" replace />;
    }
    return children;
}


/** Collapse /shop/All/ → /shop/All so crawlers and users share one URL. */
function TrailingSlashRedirect() {
  const location = useLocation()
  const { pathname, search, hash } = location
  if (pathname !== '/' && pathname.endsWith('/')) {
    return <Navigate to={`${pathname.replace(/\/+$/, '')}${search || ''}${hash || ''}`} replace />
  }
  return null
}

function PublicSeo() {
  const { pathname } = useLocation()
  // Strip trailing slash so /shop/All/ and /shop/All share one canonical
  const path = (pathname || '/').length > 1
    ? (pathname || '/').replace(/\/+$/, '')
    : (pathname || '/')

  // Private app surfaces should not be indexed
  const noindexPrefixes = [
    '/admin', '/cart', '/checkout', '/wishlist', '/profile', '/update-profile',
    '/my-orders', '/order-tracking', '/login', '/signup', '/forget-password', '/confirmation'
  ]
  const noindex = noindexPrefixes.some((p) => path === p || path.startsWith(p + '/') || path.startsWith('/admin'))

  if (path === '/') {
    return (
      <SEO
        title="Eshopper – Premium Fashion Boutique | Men, Women & Kids"
        description="Shop premium fashion at Eshopper (eshopperr.me). Luxury clothing for men, women and kids with free shipping above ₹999 and easy 30-day returns."
        path="/"
        keywords="eshopper, eshopperr, eshopperr.me, premium fashion India, luxury boutique, men women kids clothing, online shopping India"
        jsonLd={[organizationJsonLd(), websiteJsonLd()]}
      />
    )
  }
  if (path.startsWith('/shop/')) {
    const cat = decodeURIComponent(path.split('/')[2] || 'All')
    const label = cat === 'All' ? 'All Products' : cat
    return (
      <SEO
        title={`${label} Fashion Collection`}
        description={`Shop ${label} at Eshopper – premium styles, exclusive drops, free shipping above ₹999.`}
        path={path}
        keywords={`eshopper ${label}, ${label} clothing, buy ${label} online India, premium fashion`}
      />
    )
  }
  if (path.startsWith('/single-product/')) {
    // Product page sets richer SEO itself; keep a path-correct fallback for crawlers
    return (
      <SEO
        title="Product"
        description="Premium product details at Eshopper boutique."
        path={path}
      />
    )
  }
  if (path === '/about') {
    return <SEO title="About Us" description="Learn about Eshopper – a premium fashion boutique crafting elevated essentials for men, women and kids." path="/about" />
  }
  if (path === '/contact') {
    return <SEO title="Contact Us" description="Contact Eshopper support for orders, styling help and partnership enquiries." path="/contact" />
  }
  if (path === '/faq') {
    return <SEO title="FAQs" description="Frequently asked questions about shipping, returns, payments and membership at Eshopper." path="/faq" />
  }
  if (path === '/return-policy' || path === '/privacy-policy') {
    return <SEO title={path === '/privacy-policy' ? 'Privacy Policy' : 'Return Policy'} description="Eshopper policies for returns, refunds and customer privacy." path={path} />
  }
  if (path === '/terms') {
    return <SEO title="Terms & Conditions" description="Terms and conditions for shopping at Eshopper." path="/terms" />
  }
  return (
    <SEO
      title="Eshopper"
      description="Eshopper premium fashion boutique."
      path={path}
      noindex={noindex}
    />
  )
}


export default function App() {
  useMembership()

  /* The app mounted, so whatever stale-build reload happened earlier is
     resolved — clear the counter so the next deploy gets fresh attempts. */
  useEffect(() => {
    const id = setTimeout(resetChunkRecoveryState, 4000)
    return () => clearTimeout(id)
  }, [])

  /* Realtime socket: connects once idle and reconnects on login/logout
     so the handshake always carries the current user id. */
  useRealtimeSocket()

  const routeLoader = (
    <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#94A3B8' }}>
      Loading page...
    </div>
  )

  return (
    <ToastProvider>
      <ToastEventBridge />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TrailingSlashRedirect />
        <PublicSeo />
        <AppShell>
          <RouteErrorBoundary>
            <Suspense fallback={routeLoader}>
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/privacy-policy" element={<ReturnPolicy />} />
              <Route path="/return-policy" element={<ReturnPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/shop/:maincat" element={<Shop />} />
              <Route path="/single-product/:id" element={<SingleProductPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SingUp />} />
              <Route path="/forget-password" element={<ForgetPassword />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/update-profile" element={<UpdateProfile />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/order-tracking/:orderId" element={<OrderTracking />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/confirmation" element={<Confirmation />} />
              <Route path="/admin-home" element={<AdminRoute><AdminHome /></AdminRoute>} />
              <Route path="/admin-user" element={<AdminRoute><AdminUser /></AdminRoute>} />
              <Route path="/admin-contact" element={<AdminRoute><AdminContact /></AdminRoute>} />
              <Route path="/admin-newsletter" element={<AdminRoute><AdminNewsletter /></AdminRoute>} />
              <Route path="/admin-checkout" element={<AdminRoute><AdminCheckout /></AdminRoute>} />
              <Route path="/admin-orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
              <Route path="/admin-activities" element={<AdminRoute><AdminActivityLog /></AdminRoute>} />
              <Route path="/admin-deploy-checks" element={<AdminRoute><AdminDeployChecks /></AdminRoute>} />
              <Route path="/admin-coupon" element={<AdminRoute><AdminCoupon /></AdminRoute>} />
              <Route path="/admin-maincategory" element={<AdminRoute><AdminMaincategory /></AdminRoute>} />
              <Route path="/admin-add-maincategory" element={<AdminRoute><AdminAddMaincategory /></AdminRoute>} />
              <Route path="/admin-update-maincategory/:id" element={<AdminRoute><AdminUpdateMaincategory /></AdminRoute>} />
              <Route path="/admin-subcategory" element={<AdminRoute><AdminSubcategory /></AdminRoute>} />
              <Route path="/admin-add-subcategory" element={<AdminRoute><AdminAddSubcategory /></AdminRoute>} />
              <Route path="/admin-update-subcategory/:id" element={<AdminRoute><AdminUpdateSubcategory /></AdminRoute>} />
              <Route path="/admin-brand" element={<AdminRoute><AdminBrand /></AdminRoute>} />
              <Route path="/admin-add-brand" element={<AdminRoute><AdminAddBrand /></AdminRoute>} />
              <Route path="/admin-update-brand/:id" element={<AdminRoute><AdminUpdateBrand /></AdminRoute>} />
              <Route path="/admin-product" element={<AdminRoute><AdminProduct /></AdminRoute>} />
              <Route path="/admin-add-product" element={<AdminRoute><AdminAddProduct /></AdminRoute>} />
              <Route path="/admin-update-product/:id" element={<AdminRoute><AdminUpdateProduct /></AdminRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </RouteErrorBoundary>
        </AppShell>
      </BrowserRouter>
    </ToastProvider>
  )
}