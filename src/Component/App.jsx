import React, { lazy, Suspense, useEffect } from 'react'
import { io } from 'socket.io-client'
import { BASE_URL, SOCKET_TRANSPORTS } from '../constants'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastProvider } from './ToastNotification'
import ToastEventBridge from './ToastEventBridge'
import Navbaar from './Navbaar'
import Footer from './Footer'
import { useMembership } from './MembershipContext'
import PremiumAuthPopup from './PremiumAuthPopup'
import CatalogQueryBridge from './CatalogQueryBridge'

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

const AppShell = ({ children }) => {
  const { pathname } = useLocation();
  const hideFooterRoutes = ['/login', '/signup'];
  const isAdminRoute = pathname.startsWith('/admin');
  const shouldShowFooter = !hideFooterRoutes.includes(pathname) && !isAdminRoute;

  return (
    <>
      <ScrollToTop />
      <Navbaar />
      <PremiumAuthPopup />
      <CatalogQueryBridge />
      <Suspense fallback={null}>
        <ChatBot />
      </Suspense>
      {children}
      {shouldShowFooter && <Footer />}
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

export default function App() {
  useMembership()

  useEffect(() => {
    try {
      // Prefer a sane BASE_URL. Only use REACT_APP_API_URL if it does not point to localhost
      const envSocket = process.env.REACT_APP_API_URL || '';
      const SOCKET_ENDPOINT = (envSocket && !envSocket.includes('localhost') && !envSocket.includes('127.0.0.1'))
        ? envSocket
        : (BASE_URL || window.location.origin);
      const transports = (process.env.REACT_APP_SOCKET_TRANSPORTS && process.env.REACT_APP_SOCKET_TRANSPORTS.split(',')) || SOCKET_TRANSPORTS || ['polling', 'websocket'];
      const isAdmin = (localStorage.getItem('isAdmin') === 'true' || (localStorage.getItem('role') || '').toLowerCase() === 'admin');
      const socketAuthUser = isAdmin ? 'admin-dashboard' : (localStorage.getItem('userid') || null);
      const socket = io(SOCKET_ENDPOINT, {
        auth: { userId: socketAuthUser },
        transports
      });

      socket.on('connect', () => {
        console.log('Realtime socket connected', socket.id);
      });

      socket.on('dbChange', (data) => {
        console.log('Realtime dbChange received', data);
        try { window.dispatchEvent(new CustomEvent('realtime:dbChange', { detail: data })); } catch (e) {}
      });

      // Forward userPasswordReset events to window so individual pages can react
      socket.on('userPasswordReset', (payload) => {
        try { window.dispatchEvent(new CustomEvent('realtime:userPasswordReset', { detail: payload })); } catch (e) {}
      });

      socket.on('connect_error', (err) => console.warn('Socket connect_error:', err && err.message));

      return () => { try { socket.disconnect(); } catch (e) {} };
    } catch (e) {
      console.warn('Realtime socket init failed', e && e.message);
    }
  }, []);

  const routeLoader = (
    <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#94A3B8' }}>
      Loading page...
    </div>
  )

  return (
    <ToastProvider>
      <ToastEventBridge />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppShell>
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
        </AppShell>
      </BrowserRouter>
    </ToastProvider>
  )
}