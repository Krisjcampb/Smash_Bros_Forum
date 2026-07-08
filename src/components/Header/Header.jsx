import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Nav, Navbar, NavDropdown, Image } from 'react-bootstrap';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import socket from '../../websocket/socket';
import { FaBell, FaEnvelope, FaCalendarAlt } from 'react-icons/fa';
import Logo from '../Images/smash-point-high-resolution-logo.png';
import RotatingBanner from './RotatingBanner';
import { useUserContext } from '../../pages/usercontext';
import { getImageUrl } from '../Utilities/adjusturl';
import { API } from '../Utilities/apiUrl';

const FALLBACK_IMAGE = '/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/Mario/chara_3_mario_00.png';

// Defined outside the component so it doesn't get recreated on every render
const handleLogout = () => {
    localStorage.clear();
    window.location.reload(false);
};

function Header() {
    const [user, setUser] = useState('');
    const [userid, setUserId] = useState('');
    const [loginstate, setLoginState] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [imgError, setImgError] = useState(false);
    const dropdownRef = useRef(null);
    const userprofile = `/userprofile/${user}/${userid}`;
    const navigate = useNavigate();
    const location = useLocation();
    const { profilePicture } = useUserContext();
    const { characterName, selectedSkin } = profilePicture;
    const headerImageUrl = getImageUrl(characterName, selectedSkin, 'header');

    // Reset the error flag whenever the profile picture changes so a valid new image shows correctly
    useEffect(() => {
        setImgError(false);
    }, [headerImageUrl]);

    const banners = [
        "Welcome to Smash Point!",
        "Check out the latest threads!",
        "Join our upcoming tournaments!",
        "New messages? Check your inbox!",
    ];

    const registerPushNotifications = async (userId) => {
        console.log('Attempting push registration for user:', userId);
        
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push not supported on this browser/device');
            return;
        }

        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        if (permission !== 'granted') return;

        try {
            const registration = await navigator.serviceWorker.ready;
            console.log('Service worker ready:', registration);

            // Convert base64 VAPID key to Uint8Array — required by the PushManager API
            const urlBase64ToUint8Array = (base64String) => {
                const padding = '='.repeat((4 - base64String.length % 4) % 4);
                const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
                const rawData = window.atob(base64);
                return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
            };
            
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY)
            });
            console.log('Subscription created:', subscription);

            const response = await fetch(`${API}/push-subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify({ subscription })
            });
            console.log('Subscription saved:', response.ok);
        } catch (err) {
            console.error('Push registration failed:', err);
        }
    };

    // Empty dependency array so this only runs once on mount
    useEffect(() => {
        if (userid) {
            console.log("User ID available, triggering push registration flow...");
            registerPushNotifications(userid);
        }
    }, [userid]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        // Authenticate user
        fetch(`${API}/userauthenticate`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
            },
        })
        .then(response => {
            if (!response.ok) throw new Error('Authentication failed');
            return response.json();
        })
        .then(userData => {
            const { id, name } = userData;
            setUser(name);
            setUserId(id);

            return fetch(`${API}/notifications/${id}`, {
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + token },
            });
        })
        .then(response => {
            if (!response) return null; // If auth failed early
            if (!response.ok) throw new Error('Failed to fetch notifications');
            return response.json();
        })
        .then(notificationData => {
            if (notificationData) {
                setNotifications(notificationData);
                setHasUnread(notificationData.some(notification => !notification.is_read));
            } else {
                console.error('No notifications data received');
            }
        })
        .catch(err => {
            console.error('Error in auth or notification initialization:', err);
        })
        .finally(() => {
            // This ensures loading ends and login state updates only AFTER everything finishes trying to load
            if (localStorage.getItem('token')) {
                setLoginState(true);
            }
            setLoading(false);
        });
    }, []); // Empty dependency array means this runs strictly once on mount

    useEffect(() => {
        if (!userid) return;

        const handleNewNotification = (notification) => {
            console.log('Received new real-time notification:', notification);
            // Prepend new notification to the list
            setNotifications(prevNotifications => [notification, ...prevNotifications]);
            setHasUnread(true); // Always set to true when a new notification arrives
        };

        socket.on('newNotification', handleNewNotification);

        return () => {
            socket.off('newNotification', handleNewNotification);
        };
    }, [userid]); // Re-run effect if userid changes

    // Thread notifications need forum content passed via router state so the thread page loads instantly
    const navigateToThread = async (threadID) => {
        try {
            const response = await fetch(`${API}/forumcontent/${threadID}`, { method: 'GET' });
            if (!response.ok) throw new Error('Failed to fetch forum content');
            const data = await response.json();
            navigate(`/threads/${threadID}`, { state: { forumContent: data } });
        } catch (error) {
            console.error('Error fetching forum content:', error);
        }
    };

    const navigateToDirectMessage = (entityID) => {
        navigate(`/messaging/${user}/${userid}`, { state: { entityID } });
    };

    const navigateToUserProfile = (entityID) => {
        navigate(`/userprofile/${user}/${entityID}`);
    };

    // Route to the right page based on notification type
    const handleNotifications = (notification) => {
        if (notification.type === 'directmessage') {
            navigateToDirectMessage(notification.entity_id);
        } else if (notification.type === 'friendRequest') {
            navigateToUserProfile(notification.entity_id); // Navigate to sender's profile
        } else {
            // Default for thread-related notifications
            navigateToThread(notification.entity_id);
        }
    };

    // Mark everything as read as soon as the bell is opened rather than waiting for an explicit action
    const handleBellClick = async () => {
        setShowDropdown(!showDropdown);
        try {
            const token = localStorage.getItem('token');
            if (token) {
                await fetch(`${API}/notifications/mark-read`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ userid }),
                });
            }
            setHasUnread(false);
        } catch (err) {
            console.error('Error marking notifications as read', err);
        }
    };

    // Wrapped in useCallback so the event listener always references the same function instance
    const handleClickOutside = useCallback((event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setShowDropdown(false);
        }
    }, []);

    // dropdownRef wraps all nav icons so clicks anywhere outside that group close the dropdown
    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);

    return (
        <Navbar className="site-header">
            <Link to="/" className="site-header__brand">
                <img className="site-header__logo" alt="Smash Point" src={Logo} />
            </Link>

            <Nav className="site-header__nav">
                <Nav.Item className="site-header__banner d-none d-xl-flex">
                    <RotatingBanner banners={banners} />
                </Nav.Item>

                <Nav.Item className="site-header__actions" ref={dropdownRef}>
                    <button
                        type="button"
                        aria-label="Calendar"
                        onClick={() => navigate('/calendar')}
                        className={`site-header__icon-button ${location.pathname === '/calendar' ? 'is-active' : ''}`}
                    >
                        <FaCalendarAlt size={20} />
                    </button>

                    {loading ? (
                        <div className="site-header__avatar-skeleton" />
                    ) : loginstate && (
                        <>
                            <button
                                type="button"
                                aria-label="Notifications"
                                onClick={handleBellClick}
                                className={`site-header__icon-button ${hasUnread || showDropdown ? 'is-active' : ''}`}
                            >
                                <FaBell size={20} />
                                {hasUnread && <span className="notification-dot"></span>}
                            </button>

                            {showDropdown && (
                                <div className="dropdown-menu show notification-panel">
                                    {notifications.length > 0 ? (
                                        notifications.map((notification, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleNotifications(notification)}
                                                className="dropdown-item notification-panel__item"
                                            >
                                                {notification.message}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="dropdown-item notification-panel__empty">No new notifications</div>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                aria-label="Messages"
                                onClick={() => navigate(`/messaging/${user}/${userid}`)}
                                className={`site-header__icon-button ${location.pathname.startsWith('/messaging') ? 'is-active' : ''}`}
                            >
                                <FaEnvelope size={20} />
                            </button>

                            <NavDropdown
                                title={
                                    <Image
                                        src={imgError ? FALLBACK_IMAGE : headerImageUrl}
                                        alt="User Profile"
                                        roundedCircle
                                        onError={() => setImgError(true)}
                                        className="site-header__avatar"
                                    />
                                }
                                align="end"
                                className="no-padding-dropdown site-header__profile"
                            >
                                <NavDropdown.Item className="no-highlight">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.25rem 0' }}>
                                        <Image
                                            src={imgError ? FALLBACK_IMAGE : headerImageUrl}
                                            roundedCircle
                                            onError={() => setImgError(true)}
                                            style={{ width: '32px', height: '32px', border: '1.5px solid #FFD443', objectFit: 'cover' }}
                                        />
                                        <span style={{ fontWeight: '700', color: '#393933' }}>{user}</span>
                                    </div>
                                </NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item as={NavLink} to={userprofile}>
                                    Profile
                                </NavDropdown.Item>
                                <NavDropdown.Item
                                    onClick={() => navigate('/usersettings')}
                                    active={location.pathname === '/usersettings'}
                                >
                                    Settings
                                </NavDropdown.Item>
                                <NavDropdown.Item
                                    onClick={() => navigate('/feedback')}
                                    active={location.pathname === '/feedback'}
                                >
                                    Give Feedback
                                </NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item onClick={handleLogout} style={{ color: '#d00000', fontWeight: '700' }}>
                                    Log Out
                                </NavDropdown.Item>
                            </NavDropdown>
                        </>
                    )}
                </Nav.Item>

                {!loginstate && !loading && (
                    <Nav.Item className="site-header__signin">
                        <Nav.Link as={NavLink} to="/signin">Sign In</Nav.Link>
                    </Nav.Item>
                )}
            </Nav>
        </Navbar>
    );
}

export default Header;
