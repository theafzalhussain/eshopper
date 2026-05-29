export const getAdminSecret = () => {
  try {
    return String(process.env.REACT_APP_ADMIN_SECRET || '').trim();
  } catch (error) {
    return '';
  }
};

export const getAdminHeaders = () => {
  try {
    const adminToken = String(localStorage.getItem('adminToken') || '').trim();
    if (adminToken) {
      return { Authorization: `Bearer ${adminToken}` };
    }
  } catch (error) {
    // fall back to secret-based auth below
  }

  const adminSecret = getAdminSecret();
  const adminUserId = String(localStorage.getItem('userid') || '').trim();
  const role = String(localStorage.getItem('role') || '').trim();

  if (adminSecret) return { 'x-admin-secret': adminSecret };
  if (adminUserId && role.toLowerCase() === 'admin') {
    return { 'x-admin-userid': adminUserId, 'x-admin-role': role };
  }
  return {};
};
