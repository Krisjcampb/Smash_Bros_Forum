export const refreshAccessToken = async (API) => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
        const response = await fetch(`${API}/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return null;
        const { token } = await response.json();
        localStorage.setItem('token', token);
        return token;
    } catch {
        return null;
    }
};

// replacement for authenticated fetch calls.
// Ex: authFetch(API, `${API}/userauthenticate`, { method: 'GET' })
export const authFetch = async (API, url, options = {}) => {
    let token = localStorage.getItem('token');
    let response = await fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: 'Bearer ' + token },
    });

    if (response.status === 401 || response.status === 403) {
        const newToken = await refreshAccessToken(API);
        if (newToken) {
            response = await fetch(url, {
                ...options,
                headers: { ...options.headers, Authorization: 'Bearer ' + newToken },
            });
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            sessionStorage.removeItem('privateKey');
            window.location.href = '/signin';
        }
    }

    return response;
};