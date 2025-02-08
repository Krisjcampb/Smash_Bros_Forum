import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL
// Initialize WebSocket connection
const socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    withCredentials: true,
});

export default socket;