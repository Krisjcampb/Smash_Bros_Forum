import React, { useState, useEffect, useRef } from 'react';
import { Nav, Navbar, NavDropdown, Image } from 'react-bootstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import Logo from '../Images/pnw-smash-hub-high-resolution-color-logo.png';

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
    const [characterName, setCharacterName] = useState("")
    const [selectedSkin, setSelectedSkin] = useState(0)
    const dropdownRef = useRef(null);
    const userprofile = `/userprofile/${user}/${userid}`;
    const navigate = useNavigate();

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

    useEffect(() => {
        const getUserProfile = async () => {
            try {               
                const response = await fetch(`http://localhost:5000/get-pfp/${userid}`, {
                    method: 'GET',             
                })
                const data = await response.json()
                console.log(data)
                setSelectedSkin(data.selected_skin)
                setCharacterName(data.character_name)
            } catch (error) {
                console.error("Error fetching user profile picture", error);
            }
        }
        getUserProfile();
    }, [userid])

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

    const getProfileImageUrl = (characterName, selectedSkin) => {
        if (!characterName) {
            return '/path/to/default/profile_image.png';
        }
        return `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${characterName}/chara_0_${characterName.toLowerCase()}_0${selectedSkin}.png`;
    };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <Navbar bg='primary' variant='dark'>
      <img className='img-fluid' style={{ width: 150 }} alt='Logo' src={Logo} />
      <Navbar.Brand as={NavLink} to='/'>Navbar</Navbar.Brand>
      <Nav className='container-fluid'>
        <Nav.Item>
          <Nav.Link as={NavLink} to='/'>Home</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link as={NavLink} to='/resetpassword'>Features</Nav.Link>
        </Nav.Item>
        {loginstate === true && (
          <Nav.Item className='ms-auto' style={{ position: 'relative' }} ref={dropdownRef}>
            <div onClick={handleBellClick} style={{ position: 'relative' }}>
              <FaBell className={hasUnread ? 'highlight' : ''} size={24} />
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
          </Nav.Item>
        )}
        <Nav.Item className='me'>
          {loginstate === false && (
            <Nav.Link as={NavLink} to='/signin'>Sign In</Nav.Link>
          )}
          {loginstate === true && (
            <div>
                <Image
                    src={getProfileImageUrl(characterName, selectedSkin)}
                    alt="User Profile"
                    rounded
                    style={{ width: '80px', height: '80px' }}
                />
                <NavDropdown title={user} align='end'>
                    <NavDropdown.Item as={NavLink} to={userprofile}>Profile</NavDropdown.Item>
                    <NavDropdown.Item onClick={() => navigate(`/messaging/${user}/${userid}`)}>Direct Messages</NavDropdown.Item>
                    <NavDropdown.Item onClick={() => navigate('/usersettings')}>Settings</NavDropdown.Item>
                    <NavDropdown.Item onClick={Logout}>Log Out</NavDropdown.Item>
                </NavDropdown>
            </div>
          )}
        </Nav.Item>
      </Nav>
    </Navbar>
  );
}

export default Header;
