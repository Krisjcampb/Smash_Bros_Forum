import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Container, Image, Tabs, Tab, Modal, Button, ButtonGroup, Dropdown, Form, Row, Col, Card } from 'react-bootstrap'
import { useParams, useNavigate } from 'react-router-dom';
import FriendOptionsDropdown from '../components/Friend Dropdown/Friend_Dropdown'
import { NavLink } from 'react-router-dom'
import { useUserContext } from './usercontext';
import { getImageUrl } from '../components/Utilities/adjusturl';
import { API } from '../components/Utilities/apiUrl';

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
        "R.O.B.", "Toon Link", "Wolf", "Villager", "Mega Man", "Wii Fit Trainer",
        "Rosalina & Luma", "Little Mac", "Greninja", "Mii Brawler",
        "Mii Swordfighter", "Mii Gunner", "Palutena", "Pac-Man", "Robin",
        "Shulk", "Bowser Jr", "Duck Hunt", "Ryu", "Ken", "Cloud",
        "Corrin", "Bayonetta", "Inkling", "Ridley", "Simon", "Richter",
        "King K. Rool", "Isabelle", "Incineroar", "Piranha Plant", "Joker",
        "Hero", "Banjo & Kazooie", "Terry", "Byleth", "Min Min", "Steve",
        "Sephiroth", "Pyra and Mythra", "Kazuya", "Sora"
    ];

    // Generates all 8 skin portrait paths for a given character
    const generateImages = (character) => {
        const miis = ['mii swordfighter', 'mii brawler', 'mii gunner'];
        const isMii = miis.includes(character.toLowerCase());
        return Array.from({ length: isMii ? 2 : 8 }, (_, index) =>
            `${process.env.REACT_APP_CDN_URL}/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${character}/chara_3_${character.toLowerCase()}_0${index}.png`
        );
    };

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
    }, [profilePicture.characterName]);

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
                headers: { 'Content-Type': 'application/json' },
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
                    <Card
                        className="p-8 profile-header shadow-sm border-0 bg-light rounded-3"
                        style={{ borderTop: '4px solid #FFD443' }}
                    >
                        <Row className="d-flex flex-nowrap pb-8">
                            <Col xs="auto" className="text-center">
                                {/* Show your own live profile pic when viewing your own page */}
                                {userid === friendid ? (
                                    <Image
                                        src={userProfileImageUrl}
                                        alt="User Profile"
                                        className="profile-image"
                                        roundedCircle
                                        style={{ objectFit: 'cover', objectPosition: '50% 5%' }}
                                    />
                                ) : (
                                    <Image
                                        src={friendUrl}
                                        alt="User Profile"
                                        className="profile-image"
                                        roundedCircle
                                        style={{ objectFit: 'cover', objectPosition: '50% 5%' }}
                                    />
                                )}
                                <div className="mt-2 text-muted" style={{ fontStyle: 'italic' }}>
                                    {user.role}
                                </div>
                            </Col>

                            <Col className="ms-3 d-flex flex-column min-w-0">
                                <Row className="align-items-start flex-wrap">
                                    <Col xs={12} md className="flex-grow-1 min-w-0">
                                        <h3 className="mb-1 text-truncate">{user.name}</h3>
                                        <p className="text-muted mb-1">
                                            <strong>Last Online:</strong> {user.localTime}
                                        </p>
                                        <p className="text-muted mb-1">
                                            <strong>Location:</strong> {user.location}
                                        </p>
                                        <p className="text-muted" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                            <strong>About:</strong>{' '}
                                            {user.description || 'No description yet.'}
                                        </p>
                                    </Col>

                                    <Col xs="auto" className="mt-2 mt-md-0">
                                        {friendid === userid ? (
                                            <Button variant="primary" onClick={profileOpen}>
                                                Change Profile
                                            </Button>
                                        ) : blockStatus.blockedByMe ? (
                                            <Button variant="outline-secondary" size="sm" onClick={handleUnblock}>
                                                Unblock User
                                            </Button>
                                        ) : blockStatus.blockedByThem ? (
                                            <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                                                Unable to interact with this user
                                            </span>
                                        ) : (
                                            <div>
                                                {friendshipStatus === 'pending' && (initiatedByCurrentUser ? (
                                                    <div className="d-flex flex-column align-items-start gap-2">
                                                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                                                            Friend Request Pending
                                                        </span>
                                                        <Button variant="outline-danger" size="sm" onClick={handleRemoveFriend}>
                                                            Cancel Request
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="d-flex flex-column align-items-start gap-2">
                                                        <Button onClick={handleFriendAction}>Accept Friend Request</Button>
                                                        <Button variant="outline-danger" size="sm" onClick={handleBlockFriend}>
                                                            Block User
                                                        </Button>
                                                    </div>
                                                ))}
                                                {friendshipStatus === 'accepted' && (
                                                    <FriendOptionsDropdown
                                                        onRemoveFriend={handleRemoveFriend}
                                                        onDirectMessage={handleDirectMessage}
                                                        onBlockFriend={handleBlockFriend}
                                                    />
                                                )}
                                                {friendshipStatus === 'not_friends' && String(userid) !== friendid && (
                                                    <div className="d-flex flex-column align-items-start gap-2">
                                                        <Button onClick={handleFriendAction}>Add Friend</Button>
                                                        <Button variant="outline-danger" size="sm" onClick={handleBlockFriend}>
                                                            Block User
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>

            <Row className="mt-4">
                <Col md={8}>
                    {blockStatus.blocked ? (
                        <div className="text-center text-muted mt-4">
                            Posts and comments are not available
                        </div>
                    ) : (
                        <Tabs defaultActiveKey="comments" id="user-profile-tabs" className="mb-3" style={{ borderBottom: 'none' }}>
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
                                {/* Invisible sentinel — scrolling this into view loads the next 10 comments */}
                                {visibleComments < comments.length && (
                                    <div ref={commentsSentinelRef} style={{ height: '1px' }} />
                                )}
                                {visibleComments >= comments.length && comments.length > 0 && (
                                    <div className="text-center text-muted small py-3">
                                        All comments loaded
                                    </div>
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
                                {/* Invisible sentinel — scrolling this into view loads the next 10 posts */}
                                {visiblePosts < threadPosts.length && (
                                    <div ref={postsSentinelRef} style={{ height: '1px' }} />
                                )}
                                {visiblePosts >= threadPosts.length && threadPosts.length > 0 && (
                                    <div className="text-center text-muted small py-3">
                                        All posts loaded
                                    </div>
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
                <Modal.Header closeButton>
                    <Modal.Title>Profile Image Selection</Modal.Title>
                </Modal.Header>
                <Form onSubmit={(e) => { e.preventDefault(); handleImageSave(); }}>
                    <div className='text-center'>
                        <div className='mt-24'>
                            <ButtonGroup className='justify-content-center'>
                                <Button variant="secondary" onSelect={handleDropdownSelect}>Select Character</Button>
                                <Dropdown as={ButtonGroup} onSelect={handleDropdownSelect}>
                                    <Dropdown.Toggle split variant="secondary" className="custom-split-toggle" />
                                    <Dropdown.Menu className="custom-dropdown-menu">
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ margin: "8px 10px", width: "calc(100% - 20px)", borderRadius: "5px" }}
                                        />
                                        {filteredOptions.map((character) => (
                                            <Dropdown.Item key={character} eventKey={character}>
                                                {character}
                                            </Dropdown.Item>
                                        ))}
                                    </Dropdown.Menu>
                                </Dropdown>
                            </ButtonGroup>
                        </div>
                        {character && (
                            <div style={{ marginTop: "10px", marginLeft: "5px" }}>
                                <span style={{ marginRight: "5px" }}>Selected Character: </span>
                                <div className="d-flex justify-content-center" style={{ marginRight: "5px" }}>
                                    <Image
                                        src={clickedImage}
                                        alt="Selected portrait"
                                        style={{ height: "300px" }}
                                        fluid
                                        loading="lazy"
                                    />
                                </div>
                                <div style={{ display: "flex", marginTop: "30px" }} className='justify-content-center'>
                                    {images.map((src, index) => (
                                        <Image
                                            key={index}
                                            src={src}
                                            style={{
                                                height: "60px",
                                                maxWidth: "85px",
                                                marginRight: "5px",
                                                border: clickedIndex === index ? "2px solid blue" : "none",
                                                cursor: "pointer",
                                            }}
                                            onClick={() => handleImageClick(index)}
                                            fluid
                                            loading="lazy"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className='mt-40 mb-32'>
                            <Button type="submit" onClick={closeImagePicker}>Save Profile Picture</Button>
                        </div>
                    </div>
                </Form>
            </Modal>

            {/* Profile info edit modal */}
            <Modal show={showProfile} onHide={profileClose} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Profile</Modal.Title>
                </Modal.Header>
                <Form onSubmit={(e) => { e.preventDefault(); handleProfileSave(); }}>
                    <Modal.Body>
                        <div className="text-center mb-4">
                            <Image
                                src={selectedImage}
                                alt="Selected portrait"
                                style={{ height: '300px' }}
                                fluid
                                rounded
                                loading="lazy"
                            />
                            <div className="mt-16 mb-24">
                                <Button variant="outline-primary" onClick={openImagePicker}>
                                    Change Profile Image
                                </Button>
                            </div>
                        </div>

                        <Form.Group as={Row} className="mb-4 align-items-center justify-content-center">
                            <Form.Label column sm="2">Username</Form.Label>
                            <Col sm="9">
                                <Form.Control
                                    type="text"
                                    value={username ?? ''}
                                    onChange={(e) => setUsername(e.target.value)}
                                    maxLength={32}
                                />
                            </Col>
                        </Form.Group>

                        <Form.Group as={Row} className="mb-4 align-items-center justify-content-center">
                            <Form.Label column sm="2">Location</Form.Label>
                            <Col sm="9">
                                <Form.Control
                                    type="text"
                                    value={location ?? ''}
                                    onChange={(e) => setLocation(e.target.value)}
                                    maxLength={50}
                                />
                            </Col>
                        </Form.Group>

                        <Form.Group as={Row} className="align-items-start justify-content-center">
                            <Form.Label column sm="2">Description</Form.Label>
                            <Col sm="9">
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={description ?? ''}
                                    onChange={(e) => setDescription(e.target.value)}
                                    maxLength={160}
                                />
                                <div className="text-muted text-end small mt-4">
                                    {(description?.length || 0)}/160
                                </div>
                            </Col>
                        </Form.Group>
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="secondary" onClick={profileClose}>Cancel</Button>
                        <Button type="submit" variant="primary" onClick={profileClose}>Save Changes</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
}

export default Userprofile