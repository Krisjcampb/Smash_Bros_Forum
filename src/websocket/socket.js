import { io } from "socket.io-client";
import { API } from "../components/Utilities/apiUrl";
import { refreshAccessToken } from "../components/Utilities/authHelpers";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;

const isTokenExpired = (token) => {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now() + 30000;
    } catch {
        return true;
    }
};

const socket = io(SOCKET_URL, {
    autoConnect: false, // only connect when there's a token (see below)
    transports: ["websocket", "polling"],
    withCredentials: true,
    auth: async (cb) => {
        let token = localStorage.getItem('token');

        if (isTokenExpired(token)) {
            const result = await refreshAccessToken(API);
            if (result.status === 'ok') token = result.token;
        }

        cb({ token });
    }
});

// Guests have no token, so they never open a socket
if (localStorage.getItem('token')) {
    socket.connect();
}

// The server accepts the connection and then kicks it, which arrives here as
// "io server disconnect". Reconnect after a delay, and only when logged in.
let reconnectTimer = null;
socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
    if (reason === "io server disconnect" && localStorage.getItem('token')) {
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => socket.connect(), 3000);
    }
});

// Network-level failures (socket.io normally retries these itself)
let retryTimer = null;
socket.on("connect_error", (err) => {
    console.error("Socket connect error:", err.message);
    if (!socket.active && localStorage.getItem('token')) {
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => socket.connect(), 3000);
    }
});

// Reconnect when the tab wakes up if the socket died while idle
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !socket.connected && localStorage.getItem('token')) {
        socket.connect();
    }
});

export default socket;