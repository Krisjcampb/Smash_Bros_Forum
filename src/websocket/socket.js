import { io } from "socket.io-client";
import { API } from "../components/Utilities/apiUrl";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;

const isTokenExpired = (token) => {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Treat as expired slightly early (30s buffer) to avoid edge-of-expiry races
        return payload.exp * 1000 < Date.now() + 30000;
    } catch {
        return true;
    }
};

const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
        const res = await fetch(`${API}/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        if (!res.ok) return null;

        const { token } = await res.json();
        localStorage.setItem('token', token);
        return token;
    } catch (err) {
        console.error('Socket token refresh failed:', err);
        return null;
    }
};

const socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    withCredentials: true,
    auth: async (cb) => {
        let token = localStorage.getItem('token');

        if (isTokenExpired(token)) {
            token = await refreshAccessToken();
        }

        cb({ token });
    }
});

socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
    if (reason === "io server disconnect") {
        socket.connect();
    }
});

export default socket;