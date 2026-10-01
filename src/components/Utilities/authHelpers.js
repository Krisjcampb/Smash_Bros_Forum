let refreshPromise = null;

async function doRefresh(API) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return { status: 'rejected' };
    try {
        const response = await fetch(`${API}/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        if (response.status === 401 || response.status === 403) return { status: 'rejected' };
        if (!response.ok) return { status: 'error' };
        const { token, refreshToken: newRefresh } = await response.json();
        localStorage.setItem('token', token);
        if (newRefresh) localStorage.setItem('refreshToken', newRefresh); // in case the server rotates
        return { status: 'ok', token };
    } catch {
        return { status: 'error' }; // network problem, not an auth decision
    }
}

// All concurrent callers share one in-flight refresh
export const refreshAccessToken = (API) => {
    if (!refreshPromise) {
        refreshPromise = doRefresh(API).finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const authFetch = async (API, url, options = {}) => {
    // Guests have no token: send the request as-is and never redirect
    if (!localStorage.getItem('token')) {
        return fetch(url, options);
    }

    const send = async (token, attempts = 3) => {
        for (let i = 0; ; i++) {
            try {
                return await fetch(url, {
                    ...options,
                    headers: { ...options.headers, Authorization: 'Bearer ' + token },
                });
            } catch (err) {
                if (i >= attempts - 1) throw err;
                await sleep(500 * 2 ** i); // retry network failures (e.g. waking from sleep)
            }
        }
    };

    const usedToken = localStorage.getItem('token');
    let response = await send(usedToken);

    // The server returns 403 for an expired/invalid JWT and 401 for a missing one,
    // so both trigger a refresh. A genuine 403 just costs one refresh and a retry.
    if (response.status !== 401 && response.status !== 403) return response;

    // Another request may have already refreshed while this one was in flight
    const currentToken = localStorage.getItem('token');
    if (currentToken && currentToken !== usedToken) return send(currentToken);

    const result = await refreshAccessToken(API);
    if (result.status === 'ok') return send(result.token);

    if (result.status === 'rejected') {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('privateKey');
        window.location.href = '/signin';
    }
    // 'error' = couldn't reach the server; keep the session and return the original response
    return response;
};