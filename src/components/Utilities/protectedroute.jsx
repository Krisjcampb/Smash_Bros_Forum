import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');

    if (!token) return <Navigate to="/signin" />;

    try {
        const decoded = jwtDecode(token);
        console.log("token: ", decoded)
        if (!allowedRoles.includes(decoded.role)) {
            return <Navigate to="/" />;
        }

        return children;
    } catch (err) {
        console.error('JWT decode failed:', err);
        return <Navigate to="/signin" />;
    }
};

export default ProtectedRoute;