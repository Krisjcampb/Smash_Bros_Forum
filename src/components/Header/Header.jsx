import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Nav, Navbar, NavDropdown, Image } from 'react-bootstrap';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
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

    // Auth and notification fetch chained so we have the user id before requesting notifications
    // Empty dependency array so this only runs once on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetch(`${API}/userauthenticate`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token,
                },
            })
                .then(response => response.json())
                .then(data => {
                    const { id, name } = data;
                    setUser(name);
                    setUserId(id);

                    fetch(`${API}/notifications/${id}`, {
                        method: 'GET',
                        headers: { 'Authorization': 'Bearer ' + token },
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data) {
                                setNotifications(data);
                                setHasUnread(data.some(notification => !notification.is_read));
                            } else {
                                console.error('No notifications data received');
                            }
                        })
                        .catch(err => console.error('Error fetching notifications', err));
                })
                .then(() => {
                    setLoginState(true);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Error authenticating user', err);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

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

    // Route to the right page based on notification type rather than checking for a thread id
    const handleNotifications = (notification) => {
        if (notification.type === 'directmessage') {
            navigateToDirectMessage(notification.entity_id);
        } else {
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
        <Navbar bg='primary' variant='dark' style={{ padding: '0px', height: '72px', position: 'relative', zIndex: 2000 }}>
            <Link to="/">
                <img className='flex' style={{ marginLeft: '12px', width: 290 }} alt='Logo' src={Logo} />
            </Link>
            <Nav className='container-fluid'>
                {/* Banner hidden on small screens to prevent overlap with logo and icons */}
                <Nav.Item className="centered-banner d-none d-md-block">
                    <RotatingBanner banners={banners} />
                </Nav.Item>
                <Nav.Item
                    className='ms-auto d-flex align-items-center justify-content-between'
                    style={{ position: 'relative', gap: '24px' }}
                    ref={dropdownRef}
                >
                    {/* Highlight calendar icon when on that page */}
                    <div
                        onClick={() => navigate(`/calendar`)}
                        style={{
                            cursor: 'pointer',
                            position: 'relative',
                            color: location.pathname === '/calendar' ? '#FFD443' : 'inherit'
                        }}
                    >
                        <FaCalendarAlt size={24} style={{ marginBottom: '2px' }} />
                    </div>

                    {loading ? (
                        // Placeholder while auth resolves so the header doesn't jump around
                        <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    ) : loginstate && (
                        <>
                            <div onClick={handleBellClick} style={{ cursor: 'pointer', position: 'relative' }}>
                                <FaBell className={hasUnread || showDropdown ? 'highlight' : ''} size={25} />
                                {hasUnread && <span className="notification-dot"></span>}
                            </div>

                            {/* Bootstrap needs the show class added manually since we control visibility with React state */}
                            {showDropdown && (
                                <div
                                    className='dropdown-menu show'
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '100%',
                                        minWidth: '250px',
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        zIndex: 1051
                                    }}
                                >
                                    {notifications.length > 0 ? (
                                        notifications.map((notification, index) => (
                                            <div
                                                key={index}
                                                onClick={() => handleNotifications(notification)}
                                                className="dropdown-item"
                                            >
                                                {notification.message}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="dropdown-item">No new notifications</div>
                                    )}
                                </div>
                            )}

                            {/* Highlight messaging icon when on the messaging page */}
                            <div
                                onClick={() => navigate(`/messaging/${user}/${userid}`)}
                                style={{
                                    cursor: 'pointer',
                                    position: 'relative',
                                    color: location.pathname.startsWith('/messaging') ? '#FFD443' : 'inherit'
                                }}
                            >
                                <FaEnvelope size={25} />
                            </div>

                            <NavDropdown
                                title={
                                    // Falls back to Mario portrait if the profile image fails to load
                                    <Image
                                        src={imgError ? FALLBACK_IMAGE : headerImageUrl}
                                        alt="User Profile"
                                        roundedCircle
                                        onError={() => setImgError(true)}
                                        style={{ width: '38px', height: '38px', cursor: 'pointer' }}
                                    />
                                }
                                align='end'
                                className="no-padding-dropdown"
                                style={{ marginRight: '32px' }}
                            >
                                <NavDropdown.Item className='no-highlight'>{user}</NavDropdown.Item>
                                <hr className="dropdown-divider" />
                                <NavDropdown.Item as={NavLink} to={userprofile}>Profile</NavDropdown.Item>
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
                                <NavDropdown.Item onClick={handleLogout}>Log Out</NavDropdown.Item>
                            </NavDropdown>
                        </>
                    )}
                </Nav.Item>

                {!loginstate && !loading && (
                    <Nav.Item>
                        <Nav.Link as={NavLink} to='/signin'>Sign In</Nav.Link>
                    </Nav.Item>
                )}
            </Nav>
        </Navbar>
    );
}

export default Header;