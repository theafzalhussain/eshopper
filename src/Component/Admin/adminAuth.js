/*
 * Credentials the admin screens send with privileged requests.
 *
 * There used to be a third option here: `x-admin-secret`, read from
 * REACT_APP_ADMIN_SECRET. Create React App inlines every REACT_APP_* value into
 * the JavaScript bundle at build time, so that secret shipped to every visitor —
 * it was findable in eight files of the production build. Anyone could read it
 * and then call any admin endpoint with it. A shared secret is only a secret if
 * it stays on the server, so the browser no longer has one.
 *
 * What is left is verified server-side:
 *   • an admin JWT, checked against ADMIN_JWT_SECRET, or
 *   • the signed-in user's id plus role, which verifyAdmin looks up in the
 *     database — a client claiming role=admin for a non-admin id is rejected.
 */

export const getAdminHeaders = () => {
  const headers = {};

  try {
    const adminToken = String(localStorage.getItem('adminToken') || '').trim();
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
  } catch (error) {
    /* storage unavailable — fall through to the id/role pair */
  }

  try {
    const adminUserId = String(localStorage.getItem('userid') || '').trim();
    const role = String(localStorage.getItem('role') || '').trim();

    /* Sent alongside any token rather than instead of it: verifyAdmin tries each
       credential in turn, so a stale token cannot lock a real admin out. */
    if (adminUserId && role.toLowerCase() === 'admin') {
      headers['x-admin-userid'] = adminUserId;
      headers['x-admin-role'] = role;
    }
  } catch (error) {
    /* nothing more we can offer */
  }

  return headers;
};

export default getAdminHeaders;
