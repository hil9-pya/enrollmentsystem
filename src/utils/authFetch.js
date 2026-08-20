export function getAccessToken() {
  return localStorage.getItem('token') || localStorage.getItem('applicant_token');
}

export function authFetch(url, options = {}) {
  const token = getAccessToken();
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

export function storeApplicantAccess(data) {
  if (data?.accessToken) localStorage.setItem('applicant_token', data.accessToken);
}

export function clearApplicantAccess() {
  localStorage.removeItem('applicant_token');
}
