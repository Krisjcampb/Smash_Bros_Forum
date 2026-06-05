import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Container, Image, Tabs, Tab, Modal, ButtonGroup, Dropdown, Form, Row, Col, Card } from 'react-bootstrap'
import { useParams, useNavigate } from 'react-router-dom';
import FriendOptionsDropdown from '../components/Friend Dropdown/Friend_Dropdown'
import { NavLink } from 'react-router-dom'
import { useUserContext } from './usercontext';
import { getImageUrl } from '../components/Utilities/adjusturl';
import { API } from '../components/Utilities/apiUrl';

const characterNameMap = {
        'Rosalina & Luma': 'Rosalina and Luma',
        'Mr. Game & Watch': 'Mr. Game and Watch',
        'Banjo & Kazooie': 'Banjo and Kazooie',
    };

function Userprofile() {
    const { profilePicture, setProfilePicture } = useUserContext();
    const initialProfileImage = getImageUrl(profilePicture.characterName, profilePicture.selectedSkin, 'userProfile')
    const [userProfileImageUrl, setUserProfileImageUrl] = useState(getImageUrl(profilePicture.characterName, profilePicture.selectedSkin, 'userProfile'));
    const [initiatedByCurrentUser, setInitiatedByCurrentUser] = useState(false)
    const [user, setUser] = useState('')
    const [userid, setUserId] = useState('')
    const [friendshipStatus, setFriendshipStatus] = useState(null)
    const { friendid } = useParams();
    const [blockStatus, setBlockStatus] = useState({ blocked: false, blockedByMe: false, blockedByThem: false });
    const [threadData, setThreadData] = useState([])
    const [threadPosts, setThreadPosts] = useState([])
    const [comments, setComments] = useState([]);
    const [showProfile, setShowProfile] = useState(false)
    const [username, setUsername] = useState('')
    const [location, setLocation] = useState('')
    const [description, setDescription] = useState('')
    const [searchTerm, setSearchTerm] = useState("");
    const [character, setCharacter] = useState(profilePicture.characterName);
    const [images, setImages] = useState([]);
    const [selectedImage, setSelectedImage] = useState('');
    const [clickedImage, setClickedImage] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [clickedIndex, setClickedIndex] = useState(highlightedIndex);
    const [characterName, setCharacterName] = useState(profilePicture.characterName);
    const [selectedSkin, setSelectedSkin] = useState(profilePicture.selectedSkin);
    const [friendUrl, setFriendUrl] = useState('')
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [stats, setStats] = useState(null);

    // Infinite scroll state — start by showing 10 items in each tab
    const [visibleComments, setVisibleComments] = useState(10)
    const [visiblePosts, setVisiblePosts] = useState(10)
    const commentsSentinelRef = useRef(null)
    const postsSentinelRef = useRef(null)

    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    const profileOpen = () => setShowProfile(true)
    const profileClose = () => setShowProfile(false)

    const characterNames = [
        "Mario", "Donkey Kong", "Link", "Samus", "Dark Samus", "Yoshi",
        "Kirby", "Fox", "Pikachu", "Luigi", "Ness", "Captain Falcon",
        "Jigglypuff", "Peach", "Daisy", "Bowser", "Ice Climbers", "Sheik",
        "Zelda", "Dr. Mario", "Pichu", "Falco", "Marth", "Lucina",
        "Young Link", "Ganondorf", "Mewtwo", "Roy", "Chrom",
        "Mr. Game & Watch", "Meta Knight", "Pit", "Dark Pit",
        "Zero Suit Samus", "Wario", "Snake", "Ike", "Pokémon Trainer",
        "Diddy Kong", "Lucas", "Sonic", "King Dedede", "Olimar", "Lucario",
        "ROB", "Toon Link", "Wolf", "Villager", "Mega Man", "Wii Fit Trainer",
        "Rosalina & Luma", "Little Mac", "Greninja", "Mii Brawler",
        "Mii Swordfighter", "Mii Gunner", "Palutena", "Pac-Man", "Robin",
        "Shulk", "Bowser Jr", "Duck Hunt", "Ryu", "Ken", "Cloud",
        "Corrin", "Bayonetta", "Inkling", "Ridley", "Simon", "Richter",
        "King K. Rool", "Isabelle", "Incineroar", "Piranha Plant", "Joker",
        "Hero", "Banjo & Kazooie", "Terry", "Byleth", "Min Min", "Steve",
        "Sephiroth", "Pyra and Mythra", "Kazuya", "Sora", "Squirtle", "Ivysaur", 
        "Charizard"
    ];

    // Generates all 8 skin portrait paths for a given character


    const generateImages = useCallback((character) => {
        const miis = ['mii swordfighter', 'mii brawler', 'mii gunner'];
        const isMii = miis.includes(character.toLowerCase());
        const safeName = characterNameMap[character] || character;
        return Array.from({ length: isMii ? 2 : 8 }, (_, index) =>
            `${process.env.REACT_APP_CDN_URL}/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${safeName}/chara_3_${safeName.toLowerCase()}_0${index}.png`
        );
    }, []);

    const openImagePicker = () => {
        setShowProfile(false);
        setShowImagePicker(true);
    };

    const closeImagePicker = () => {
        setShowImagePicker(false);
        setShowProfile(true);
    };

    useEffect(() => {
        setImages(generateImages(profilePicture.characterName));
    }, [profilePicture.characterName, generateImages]);

    // Falls back to the Mario portrait if the friend has no profile picture set
    const getfriendImage = useCallback(async () => {
        try {
            const response = await fetch(`${API}/get-pfp/${friendid}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await response.json()
            return `${process.env.REACT_APP_CDN_URL}/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${data.character_name}/chara_3_${data.character_name.toLowerCase()}_0${data.selected_skin}.png`;
        } catch {
            console.error('Error finding friend profile picture.')
            return `${process.env.REACT_APP_CDN_URL}/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/Mario/chara_3_mario_00.png`
        }
    }, [friendid]);

    useEffect(() => {
        setCharacterName(profilePicture.characterName);
        setSelectedSkin(profilePicture.selectedSkin);
    }, [profilePicture.characterName, profilePicture.selectedSkin]);

    useEffect(() => {
        if (!friendid) return;
        fetch(`${API}/user-stats/${friendid}`)
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error('Error fetching stats:', err));
    }, [friendid]);

    useEffect(() => {
        const fetchImage = async () => {
            const imageUrl = await getfriendImage();
            setFriendUrl(imageUrl)
        };
        fetchImage();
    }, [friendid, getfriendImage])

    // and loads 10 more when it scrolls into view
    useEffect(() => {
        if (comments.length <= 10) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleComments(prev => prev + 10)
                }
            },
            { threshold: 1.0 }
        )
        const sentinel = commentsSentinelRef.current
        if (sentinel) observer.observe(sentinel)
        return () => observer.disconnect()
    }, [comments, visibleComments])

    // Same pattern for posts tab
    useEffect(() => {
        if (threadPosts.length <= 10) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisiblePosts(prev => prev + 10)
                }
            },
            { threshold: 1.0 }
        )
        const sentinel = postsSentinelRef.current
        if (sentinel) observer.observe(sentinel)
        return () => observer.disconnect()
    }, [threadPosts, visiblePosts])

    const handleDropdownSelect = (eventKey, event) => {
        setCharacter(eventKey);
        setImages(generateImages(eventKey));
        setHighlightedIndex(0);
        setClickedIndex(0)
    };

    const handleImageClick = (index) => {
        setClickedImage(images[index])
        setClickedIndex(index)
        setHighlightedIndex(index);
    };

    useEffect(() => {
        setUserProfileImageUrl(initialProfileImage)
    }, [setUserProfileImageUrl, initialProfileImage])

    useEffect(() => {
        setSelectedImage(userProfileImageUrl);
    }, [showProfile, profilePicture, userProfileImageUrl]);

    useEffect(() => {
        if (clickedImage !== '' && userProfileImageUrl !== `${process.env.REACT_APP_CDN_URL}/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/Mario/chara_3_default_00.png`) {
            setSelectedImage(clickedImage);
        }
    }, [clickedImage, userProfileImageUrl, initialProfileImage]);

    useEffect(() => {
        const getUserProfile = async () => {
            setClickedImage(selectedImage)
        }
        getUserProfile();
    }, [userid, selectedImage, characterName])

    const handleImageSave = async () => {
        setHighlightedIndex(clickedIndex);
        setSelectedImage(clickedImage)
    };

    useEffect(() => {
        if (characterName !== 'default') {
            const newUrl = getImageUrl(characterName, selectedSkin, 'userProfile');
            setUserProfileImageUrl(newUrl);
        }
    }, [characterName, selectedSkin, profilePicture]);

    const updateProfilePicture = (newCharacterName, newSelectedSkin) => {
        setProfilePicture({ characterName: newCharacterName, selectedSkin: newSelectedSkin });
        setCharacterName(newCharacterName)
        setSelectedSkin(newSelectedSkin)
    };

    const handleProfileSave = async () => {
        try {
            const match1 = clickedImage.match(/\/chara_\d_([^_]+)_(\d+)\.png$/);
            const match2 = clickedImage.match(/Fighter Portraits\/([^/]+)/);
            const newCharacter = match2 ? match2[1] : 'Mario';

            if (match1) {
                const GetSelectedSkin = parseInt(match1[2], 10);
                updateProfilePicture(newCharacter, GetSelectedSkin)
            } else {
                console.error('Invalid URL format');
            }

            await fetch(`${API}/change-pfp/${userid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clickedImage, newCharacter }),
            })

            await fetch(`${API}/update-profile/${userid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ username, location, description }),
            })
        } catch {
            console.error('Error changing profile picture');
        }
    }

    const filteredOptions = characterNames.filter((character) =>
        character.toLowerCase().startsWith(searchTerm.toLowerCase())
    );

    const fetchFriendshipStatus = useCallback(async () => {
        if (!userid || !friendid) return;
        try {
            const response = await fetch(`${API}/get-friendship-status/${userid}/${friendid}`);
            const data = await response.json();
            setFriendshipStatus(data.status);
            // Track who sent the request so we show the right button
            if (data.user_id1) {
                setInitiatedByCurrentUser(
                    parseInt(data.user_id1, 10) === parseInt(userid, 10)
                );
            }
        } catch (error) {
            console.error("Error fetching friendship status:", error);
        }
    }, [userid, friendid]);

    const handleFriendAction = async () => {
        try {
            const response = await fetch(`${API}/add-friend/${friendid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ isRequest: true }),
            });

            if (response.status === 403) {
                alert('You cannot send a friend request to this user');
                return;
            }

            const data = await response.json();
            setFriendshipStatus(data.newStatus);
            fetchFriendshipStatus();
        } catch (error) {
            console.error('Error handling friend action:', error);
        }
    };

    const handleRemoveFriend = async () => {
        try {
            await fetch(`${API}/remove-friend/${friendid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            });
        } catch (error) {
            console.error('Error handling friend action:', error);
        }
        // Revert to not_friends so the Add Friend button shows up again
        setFriendshipStatus('not_friends')
        setInitiatedByCurrentUser(false)
    }

    const fetchBlockStatus = useCallback(async () => {
        if (!userid || !friendid) return;
        try {
            const response = await fetch(`${API}/block-status/${userid}/${friendid}`);
            const data = await response.json();
            setBlockStatus(data);
        } catch (error) {
            console.error('Error fetching block status:', error);
        }
    }, [userid, friendid]);

    useEffect(() => {
        if (userid && friendid) {
            fetchBlockStatus();
        }
    }, [userid, friendid, fetchBlockStatus]);

    const handleDirectMessage = () => {
        navigate(`/messaging/${user}/${userid}`)
    }

    const handleBlockFriend = async () => {
        try {
            await fetch(`${API}/block/${friendid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            });
            setFriendshipStatus('not_friends');
            setBlockStatus({ blocked: true, blockedByMe: true, blockedByThem: false });
        } catch (error) {
            console.error('Error blocking user:', error);
        }
    };

    const handleUnblock = async () => {
        try {
            await fetch(`${API}/unblock/${friendid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            });
            setBlockStatus({ blocked: false, blockedByMe: false, blockedByThem: false });
            fetchFriendshipStatus();
        } catch (error) {
            console.error('Error unblocking user:', error);
        }
    };

    useEffect(() => {
        if (friendid) {
            fetch(`${API}/userauthenticate`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
            })
            .then((response) => response.json())
            .then((data) => {
                const { id } = data;
                // Store as string so it matches the friendid param from useParams
                const strid = String(id)
                setUserId(strid)
            })

            fetch(`${API}/forumusers/${friendid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            })
            .then(response => response.json())
            .then(data => {
                const { name, last_online, description, location, role } = data;
                const lastOnlineDate = new Date(last_online);
                const localTime = lastOnlineDate.toLocaleString();
                setUsername(name)
                setLocation(location)
                setDescription(description)
                setUser({ name, localTime, description, location, role });
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
        }
    }, [token, friendid])

    useEffect(() => {
        fetchFriendshipStatus();
    }, [fetchFriendshipStatus]);

    useEffect(() => {
        if (friendid) {
            const fetchUserComments = async () => {
                try {
                    const response = await fetch(`${API}/usercomments/${friendid}`);
                    const data = await response.json();
                    setComments(data);
                    // Reset visible count when switching to a different profile
                    setVisibleComments(10)
                } catch (error) {
                    console.error("Error fetching user comments:", error);
                }
            };

            const fetchThreadContent = async () => {
                try {
                    const response = await fetch(`${API}/threadcontent/${friendid}`);
                    const data = await response.json();
                    setThreadData(data.map(thread => ({
                        ...thread,
                        filepath: thread.filepath || null
                    })));
                } catch (error) {
                    console.error("Error fetching thread data:", error);
                }
            };

            const fetchThreadPosts = async () => {
                try {
                    const response = await fetch(`${API}/forumuserposts/${friendid}`);
                    const data = await response.json();
                    setThreadPosts(data);
                    // Reset visible count when switching to a different profile
                    setVisiblePosts(10)
                } catch (error) {
                    console.error("error fetching thread data", error);
                }
            };

            fetchUserComments();
            fetchThreadContent();
            fetchThreadPosts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [friendid, userProfileImageUrl, userid]);

    return (
        <Container className="profile-container mt-4">
            <Row>
                <Col xs={12}>
                    {/* Dark header banner */}
                    <div className="profile-header-banner">
                        <div className="profile-header-content">
                            {/* Avatar */}
                            <div className="profile-header-avatar-wrap">
                                <Image
                                    src={userid === friendid ? userProfileImageUrl : friendUrl}
                                    alt="User Profile"
                                    className="profile-header-avatar"
                                />
                            </div>

                            {/* Name + role */}
                            <div className="profile-header-info">
                                <h3 className="profile-username">
                                    {user.name}
                                </h3>
                                {user.role && (
                                    <span className="profile-role-badge">
                                        {user.role}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* White info card below banner */}
                    <div className="profile-info-card">
                        <div className="profile-info-content">
                            {/* Info */}
                            <div className="profile-info-details">
                                <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                                    <strong>Last Online:</strong> {user.localTime}
                                </span>
                                <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                                    <strong>Location:</strong> {user.location || '—'}
                                </span>
                                <span className="text-muted profile-about-text">
                                    <strong>About:</strong> {user.description || 'No description yet.'}
                                </span>
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                                {friendid === userid ? (
                                    <button className="primary-btn" onClick={profileOpen}>
                                        Edit Profile
                                    </button>
                                ) : blockStatus.blockedByMe ? (
                                    <button className="secondary-btn themed light" onClick={handleUnblock}>
                                        Unblock User
                                    </button>
                                ) : blockStatus.blockedByThem ? (
                                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                                        Unable to interact with this user
                                    </span>
                                ) : (
                                    <>
                                        {friendshipStatus === 'pending' && initiatedByCurrentUser && (
                                            <>
                                                <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                                                    Friend Request Pending
                                                </span>
                                                <button className="secondary-btn themed light" style={{ borderColor: '#d00000', color: '#d00000' }} onClick={handleRemoveFriend}>
                                                    Cancel Request
                                                </button>
                                            </>
                                        )}
                                        {friendshipStatus === 'pending' && !initiatedByCurrentUser && (
                                            <>
                                                <button className="primary-btn" onClick={handleFriendAction}>
                                                    Accept Friend Request
                                                </button>
                                                <button className="secondary-btn themed light" style={{ borderColor: '#d00000', color: '#d00000' }} onClick={handleBlockFriend}>
                                                    Block User
                                                </button>
                                            </>
                                        )}
                                        {friendshipStatus === 'accepted' && (
                                            <FriendOptionsDropdown
                                                onRemoveFriend={handleRemoveFriend}
                                                onDirectMessage={handleDirectMessage}
                                                onBlockFriend={handleBlockFriend}
                                            />
                                        )}
                                        {friendshipStatus === 'not_friends' && String(userid) !== friendid && (
                                            <>
                                                <button className="primary-btn" onClick={handleFriendAction}>
                                                    + Add Friend
                                                </button>
                                                <button className="secondary-btn themed light" style={{ borderColor: '#d00000', color: '#d00000' }} onClick={handleBlockFriend}>
                                                    Block User
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </Col>
            </Row>

            <Row className="mt-2">
                <Col md={8}>
                    {blockStatus.blocked ? (
                        <div className="text-center text-muted mt-4">
                            Posts and comments are not available
                        </div>
                    ) : (
                        <Tabs defaultActiveKey="comments" id="user-profile-tabs" className="mb-3 profile-tabs-no-border">
                            <Tab eventKey="comments" title={`Comments (${comments.length})`}>
                                {comments.slice(0, visibleComments).map(comment => {
                                    const threadContent = threadData.find(content => content.thread_id === comment.thread_id);
                                    return (
                                        <Card key={comment.id} className="mb-3 shadow-sm rounded p-3">
                                            <NavLink to={`/threads/${comment.thread_id}`} className="text-decoration-none text-dark" state={{ forumContent: threadContent }}>
                                                <Card.Body>
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <span className="text-muted small">
                                                            {new Date(comment.timeposted).toLocaleString('en-US', {
                                                                timeZone: 'America/Los_Angeles',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                                hour: 'numeric',
                                                                minute: '2-digit',
                                                                hour12: true,
                                                            })}
                                                        </span>
                                                        <span className="badge bg-secondary text-uppercase">Comment</span>
                                                    </div>
                                                    <Card.Title className="fs-6 fw-bold">{threadContent?.title || 'Thread Title'}</Card.Title>
                                                    <Card.Text><strong>{comment.username}:</strong> {comment.comment}</Card.Text>
                                                </Card.Body>
                                            </NavLink>
                                        </Card>
                                    );
                                })}
                                {visibleComments < comments.length && (
                                    <div ref={commentsSentinelRef} className="sentinel-scroll-trigger" />
                                )}
                                {visibleComments >= comments.length && comments.length > 0 && (
                                    <div className="text-center text-muted small py-3">All comments loaded</div>
                                )}
                                {comments.length === 0 && (
                                    <div className="text-center text-muted py-4">No comments yet</div>
                                )}
                            </Tab>

                            <Tab eventKey="posts" title={`Posts (${threadPosts.length})`}>
                                {Array.isArray(threadPosts) && threadPosts.slice(0, visiblePosts).map(post => (
                                    <Card key={post.thread_id} className="mb-3 shadow-sm rounded p-3">
                                        <NavLink to={`/threads/${post.thread_id}`} className="text-decoration-none text-dark">
                                            <Card.Body>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="text-muted small">
                                                        {new Date(post.postdate).toLocaleString('en-US', {
                                                            timeZone: 'America/Los_Angeles',
                                                            month: 'long',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                            hour12: true,
                                                        })}
                                                    </span>
                                                    <span className="badge bg-primary text-uppercase">Post</span>
                                                </div>
                                                <Card.Title className="fs-6 fw-bold">{post?.title || 'Thread Title'}</Card.Title>
                                                <Card.Text>{post.content}</Card.Text>
                                                <Card.Text className="text-muted small"><strong>Likes:</strong> {post.likes}</Card.Text>
                                            </Card.Body>
                                        </NavLink>
                                    </Card>
                                ))}
                                {visiblePosts < threadPosts.length && (
                                    <div ref={postsSentinelRef} className="sentinel-scroll-trigger" />
                                )}
                                {visiblePosts >= threadPosts.length && threadPosts.length > 0 && (
                                    <div className="text-center text-muted small py-3">All posts loaded</div>
                                )}
                                {threadPosts.length === 0 && (
                                    <div className="text-center text-muted py-4">No posts yet</div>
                                )}
                            </Tab>
                        </Tabs>
                    )}
                </Col>

                <Col md={4} className='mt-40'>
                    <Card className="profile-stats-card shadow-sm border-0">
                        <Card.Body>
                            <h6 className="text-muted text-uppercase mb-3">Profile Stats</h6>
                            <div className="stat-row">
                                <span>Threads Created</span>
                                <span className="stat-value">{stats?.thread_count ?? 0}</span>
                            </div>
                            <div className="stat-row">
                                <span>Comments Posted</span>
                                <span className="stat-value">{stats?.comment_count ?? 0}</span>
                            </div>
                            <div className="stat-row">
                                <span>Total Likes</span>
                                <span className="stat-value">{stats?.total_likes ?? 0}</span>
                            </div>
                            <div className="stat-row">
                                <span>Joined</span>
                                <span className="stat-value">
                                    {new Date(stats?.join_date ?? user.joinDate).toLocaleDateString('en-US', {
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </span>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Profile picture selection modal */}
            <Modal show={showImagePicker} onHide={closeImagePicker} centered size="lg">
                <div className="settings-modal-header">
                    <div>
                        <div className="settings-modal-badge">Profile</div>
                        <h5 className="edit-modal-title">Select Profile Image</h5>
                    </div>
                    <button className="edit-modal-close" onClick={closeImagePicker}>×</button>
                </div>
                <Form onSubmit={(e) => { e.preventDefault(); handleImageSave(); }}>
                    <Modal.Body className="modal-body-padding">
                        <div className='text-center'>
                            <div className='mt-24'>
                                <ButtonGroup className='justify-content-center'>
                                    <button type="button" className="secondary-btn">Select Character</button>
                                    <Dropdown as={ButtonGroup} onSelect={handleDropdownSelect}>
                                        <Dropdown.Toggle split variant="secondary" id="dropdown-split-basic" className="secondary-btn-split-toggle custom-split-toggle" />
                                        <Dropdown.Menu className="custom-dropdown-menu">
                                            <input
                                                type="text"
                                                placeholder="Search..."
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="modal-dropdown-search-input"
                                            />
                                            <div className="modal-dropdown-scroll-area">
                                                {filteredOptions.map((character) => (
                                                    <Dropdown.Item key={character} eventKey={character}>
                                                        {character}
                                                    </Dropdown.Item>
                                                ))}
                                            </div>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </ButtonGroup>
                            </div>

                            {character && (
                                <div className="modal-image-display">
                                    <div className="d-flex justify-content-center mb-3">
                                        <Image
                                            src={clickedImage}
                                            alt="Selected portrait"
                                            className="modal-image-selected"
                                            style={{ maxHeight: '180px' }}
                                            fluid
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="modal-thumbnail-container">
                                        {images.map((src, index) => (
                                            <Image
                                                key={index}
                                                src={src}
                                                className={`modal-thumbnail-image ${clickedIndex === index ? 'active' : ''}`}
                                                onClick={() => handleImageClick(index)}
                                                fluid
                                                loading="lazy"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Modal.Body>
                    <div className="edit-modal-footer">
                        <button type="button" className="secondary-btn themed light" onClick={closeImagePicker}>
                            Cancel
                        </button>
                        <button type="submit" className="primary-btn" onClick={closeImagePicker}>
                            Save Image
                        </button>
                    </div>
                </Form>
            </Modal>

            {/* Profile info edit modal */}
            <Modal show={showProfile} onHide={profileClose} size="lg" centered>
                <div className="settings-modal-header">
                    <div>
                        <div className="settings-modal-badge">Profile</div>
                        <h5 className="edit-modal-title">Edit Profile</h5>
                    </div>
                    <button className="edit-modal-close" onClick={profileClose}>×</button>
                </div>
                <Form onSubmit={(e) => { e.preventDefault(); handleProfileSave(); }}>
                    <Modal.Body className="modal-body-padding">
                        <div className="text-center mb-4">
                            <Image
                                src={selectedImage}
                                alt="Selected portrait"
                                className="profile-edit-avatar"
                                fluid
                                rounded
                                loading="lazy"
                                style={{ maxHeight: '150px', maxWidth: '150px', width: '150px', height: '150px' }}
                            />
                            <div className="mt-3">
                                <button
                                    type="button"
                                    className="secondary-btn themed light"
                                    onClick={openImagePicker}
                                >
                                    Change Profile Image
                                </button>
                            </div>
                        </div>

                        <div className="profile-edit-form-fields">
                            <Form.Group>
                                <Form.Label className="form-label-uppercase">
                                    Username
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    value={username ?? ''}
                                    onChange={(e) => setUsername(e.target.value)}
                                    maxLength={32}
                                    placeholder="Your username"
                                />
                            </Form.Group>

                            <Form.Group>
                                <Form.Label className="form-label-uppercase">
                                    Location
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    value={location ?? ''}
                                    onChange={(e) => setLocation(e.target.value)}
                                    maxLength={50}
                                    placeholder="Where are you from?"
                                />
                            </Form.Group>

                            <Form.Group>
                                <Form.Label className="form-label-uppercase">
                                    About
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={description ?? ''}
                                    onChange={(e) => setDescription(e.target.value)}
                                    maxLength={160}
                                    placeholder="Tell others a bit about yourself..."
                                />
                                <div className="text-muted text-end small mt-1">
                                    {(description?.length || 0)}/160
                                </div>
                            </Form.Group>
                        </div>
                    </Modal.Body>
                    <div className="edit-modal-footer">
                        <button type="button" className="secondary-btn themed light" onClick={profileClose}>
                            Cancel
                        </button>
                        <button type="submit" className="primary-btn" onClick={profileClose}>
                            Save Changes
                        </button>
                    </div>
                </Form>
            </Modal>
        </Container>
    );
}

export default Userprofile