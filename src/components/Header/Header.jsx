import React, { useState, useEffect, useRef } from 'react';
import { Nav, Navbar, NavDropdown, Image } from 'react-bootstrap';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { FaBell, FaEnvelope, FaCalendarAlt } from 'react-icons/fa';
import Logo from '../Images/smash-point-high-resolution-logo.png';
import RotatingBanner from './RotatingBanner';
import { useUserContext } from '../../pages/usercontext';
import { getImageUrl } from '../Utilities/adjusturl';

const Logout = () => {
    localStorage.clear();
    window.location.reload(false);
};

function Header() {
    const [user, setUser] = useState('');
    const [userid, setUserId] = useState('');
    const [loginstate, setLoginState] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const userprofile = `/userprofile/${user}/${userid}`;
    const navigate = useNavigate();
    const { profilePicture } = useUserContext();
    const { characterName, selectedSkin } = profilePicture;
    const headerImageUrl = getImageUrl(characterName, selectedSkin, 'header');

    const banners = [
        "Welcome to Smash Point!",
        "Check out the latest threads!",
        "Join our upcoming tournament!",
        "New messages? Check your inbox!",
    ];

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
        fetch('http://localhost:5000/userauthenticate', {
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

            fetch(`http://localhost:5000/notifications/${id}`, {
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + token },
            })
                .then(response => response.json())
                .then(data => {
                if (data) {
                    console.log(data)
                    setNotifications(data);
                    setHasUnread(data.some(notification => !notification.is_read));
                } else {
                    console.error('No notifications data received');
                }
                })
                .catch(err => console.error('Error fetching notifications', err));
            })
            .then(() => setLoginState(true))
            .catch(err => console.error('Error authenticating user', err));
        }
    }, [user]);

    const navigateToThread = async (threadID) => {
        try {
        const response = await fetch(`http://localhost:5000/forumcontent/${threadID}`, {
            method: 'GET',
        });
        if (!response.ok) {
            throw new Error('Failed to fetch forum content');
        }
        const data = await response.json();
        navigate(`/threads/${threadID}`, { state: { forumContent: data } });
        } catch (error) {
        console.error('Error fetching forum content:', error);
        }
    };

    const navigateToDirectMessage = (entityID) => {
        navigate(`/messaging/${user}/${userid}`, { state: { entityID } });
    };

    const handleNotifications = (threadID, entityID) => {

        if (threadID) {
        navigateToThread(threadID);
        } else if (entityID) {
        navigateToDirectMessage(entityID);
        } else {
        console.error('Invalid notification data:', { threadID, entityID });
        }
    };

    const handleBellClick = async () => {
        setShowDropdown(!showDropdown);
        console.log(userid)
        try {
        const token = localStorage.getItem('token');
        if (token) {
            await fetch('http://localhost:5000/notifications/mark-read', {
            method: 'POST',
            headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token 
            },
            body: JSON.stringify({userid}),
            });
        }
        setHasUnread(false);
        } catch (err) {
        console.error('Error marking notifications as read', err);
        }
    };

    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setShowDropdown(false);
        }
    }

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
        <Navbar bg='primary' variant='dark' style={{padding: '0px', height: '72px'}}    >
            <Link to="/">
                <img className='flex' style={{ marginLeft: '12px', width: 290 }} alt='Logo' src={Logo}/>
            </Link>
            <Nav className='container-fluid'>
                <Nav.Item className="centered-banner">
                    <RotatingBanner banners={banners} />
                </Nav.Item>
                <Nav.Item className='ms-auto d-flex align-items-center justify-content-between' style={{ position: 'relative', gap: '24px'}} ref={dropdownRef}>
                    <div onClick={() => navigate(`/calendar`)} style={{ cursor: 'pointer', position: 'relative' }}>
                        <FaCalendarAlt size={24} style={{marginBottom:'2px'}}/>
                    </div>
                    {loginstate === true && (
                    <>
                        <div onClick={handleBellClick} style={{ cursor: 'pointer', position: 'relative' }}>
                        <FaBell className={hasUnread ? 'highlight' : ''} size={25} />
                        {hasUnread && <span className="notification-dot"></span>}
                        </div>
                        {showDropdown && (
                        <div className='dropdown-menu show' style={{ position: 'absolute', right: 0, top: '100%', minWidth: '200px', zIndex: 1000 }}>
                        {notifications.length > 0 ? (
                            notifications.map((notification, index) => (
                            <div
                                key={index}
                                onClick={() => handleNotifications(notification.thread_id, notification.entity_id)}
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
                        <div onClick={() => navigate(`/messaging/${user}/${userid}`)} style={{ cursor: 'pointer', position: 'relative' }}>
                            <FaEnvelope size={25}/>
                        </div>
                        <NavDropdown
                            title={
                            <Image
                                src={headerImageUrl}
                                alt="User Profile"
                                roundedCircle
                                style={{ width: '38px', height: '38px', cursor: 'pointer'}}
                            />
                            }
                            align='end'
                            className="no-padding-dropdown"
                            style={{ marginRight: '32px'}}
                        >
                        <NavDropdown.Item className='no-highlight'>{user}</NavDropdown.Item>
                        <hr className="dropdown-divider" />
                        <NavDropdown.Item as={NavLink} to={userprofile}>Profile</NavDropdown.Item>
                        <NavDropdown.Item onClick={() => navigate('/usersettings')}>Settings</NavDropdown.Item>
                        <NavDropdown.Item onClick={() => navigate('/feedback')}>Give Feedback</NavDropdown.Item>
                        <NavDropdown.Item onClick={Logout}>Log Out</NavDropdown.Item>
                        </NavDropdown>
                    </>                    
                    )}
                </Nav.Item>

                {!loginstate && (
                <Nav.Item>
                    <Nav.Link as={NavLink} to='/signin'>Sign In</Nav.Link>
                </Nav.Item>
                )}
            </Nav>
        </Navbar>
    );
}

export default Header;
