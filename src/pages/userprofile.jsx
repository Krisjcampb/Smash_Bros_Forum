import React, {useState, useEffect} from 'react'
import ListGroup from 'react-bootstrap/ListGroup';
import { Container, Image, Tabs, Tab, Modal, Button, ButtonGroup, Dropdown, Form, Row, Col, Card } from 'react-bootstrap'
import { useParams, useNavigate } from 'react-router-dom';
import FriendOptionsDropdown from '../components/Friend Dropdown/Friend_Dropdown'
import { NavLink } from 'react-router-dom'
import { useUserContext } from './usercontext';
import { getImageUrl } from '../components/Utilities/adjusturl';

function Userprofile() {
    const { profilePicture, setProfilePicture } = useUserContext();
    const initialProfileImage = getImageUrl(profilePicture.characterName, profilePicture.selectedSkin, 'userProfile')
    const [userProfileImageUrl, setUserProfileImageUrl] = useState(getImageUrl(profilePicture.characterName, profilePicture.selectedSkin, 'userProfile'));
    const [initiatedByCurrentUser, setInitiatedByCurrentUser] = useState(false)
    const [user, setUser] = useState('')
    const [userid, setUserId] = useState('')
    const [friendshipStatus, setFriendshipStatus] = useState(null)
    const { friendid } = useParams();
    const [threadData, setThreadData] = useState([])
    const [threadPosts, setThreadPosts] = useState([])
    // const [posts, setPosts] = useState([]);
    const [comments, setComments] = useState([]);
    // const [likes, setLikes] = useState([]);
    const [show, setShow] = useState(false)
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
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    const changeOpen = () => setShow(true)
    const changeClose = () => setShow(false)

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
        "Shulk", "Bowser Jr.", "Duck Hunt", "Ryu", "Ken", "Cloud", 
        "Corrin", "Bayonetta", "Inkling", "Ridley", "Simon", "Richter", 
        "King K. Rool", "Isabelle", "Incineroar", "Piranha Plant", "Joker", 
        "Hero", "Banjo & Kazooie", "Terry", "Byleth", "Min Min", "Steve", 
        "Sephiroth", "Pyra / Mythra", "Kazuya", "Sora"
    ];

    const generateImages = (character) => {
        return Array.from({ length: 8 }, (_, index) =>
            `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${character}/chara_3_${character.toLowerCase()}_0${index}.png`
        );
    };
    //SEARCH > Main Image > Alts > Save

    useEffect(() => {
        setImages(generateImages(profilePicture.characterName));

    }, [profilePicture.characterName]);
    
    const getfriendImage = async () =>{
        try{
            const response = await fetch(`http://localhost:5000/get-pfp/${friendid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }            
            })
            const data = await response.json()
            console.log("DATA: ", data)
            return `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${data.character_name}/chara_3_${data.character_name}_0${data.selected_skin}.png`;
        }catch{
            console.error('Error finding friend profile picture.')
            return `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/Mario/chara_3_mario_00.png`
        }
    }

    useEffect(() => {
        const fetchImage = async () => {
            const imageUrl = await getfriendImage();
            setFriendUrl(imageUrl)
        };
        fetchImage();
    }, [friendid])

    const handleDropdownSelect = (eventKey, event) => {
        console.log("DropDown: ", eventKey, event)
        setCharacter(eventKey);
        setImages(generateImages(eventKey));
        setHighlightedIndex(0);
        setClickedIndex(0)
    };

    const handleImageClick = (index) => {
        setClickedImage(images[index])
        setClickedIndex(index)
        setHighlightedIndex(index);
        console.log(clickedImage, index)
    };
    
    useEffect(() => {
        setUserProfileImageUrl(initialProfileImage)
    }, [setUserProfileImageUrl, initialProfileImage])

    useEffect(() => {
        setSelectedImage(userProfileImageUrl);
    }, [showProfile, profilePicture, userProfileImageUrl]);

    useEffect(() => {
        if(clickedImage !== '' && userProfileImageUrl !== '/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/default/chara_3_default_00.png'){
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
        if(characterName !== 'default'){       
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

            if (match1) {
                const GetCharacterName = match1[1];
                const GetSelectedSkin = parseInt(match1[2], 10);
                console.log("Before: ", profilePicture)
                updateProfilePicture(GetCharacterName, GetSelectedSkin)
                console.log("After: ", profilePicture)
                console.log({ characterName, selectedSkin });
            } else {
                console.error('Invalid URL format');
            }
            const match2 = clickedImage.match(/Fighter Portraits\/([^/]+)/);
            const newCharacter = match2 ? match2[1] : 'Mario';
            console.log("New Selected Character: ", newCharacter)

            await fetch(`http://localhost:5000/change-pfp/${userid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({clickedImage, newCharacter}),
            })

            await fetch(`http://localhost:5000/update-profile/${userid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({username, location, description}),                
            })

            // retrieveImage();
        } catch {
            console.error('Error changing profile picture');
        }
    }

    const filteredOptions = characterNames.filter((character) =>
        character.toLowerCase().startsWith(searchTerm.toLowerCase())
    );
    
    const handleFriendAction = async () => {
        try {
            if (friendshipStatus === 'pending') {
                await fetch(`http://localhost:5000/add-friend/${userid}/${friendid}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                setFriendshipStatus('accepted');
            } else {
                await fetch(`http://localhost:5000/add-friend/${userid}/${friendid}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                        body: JSON.stringify({ isRequest: true }),
                });
                setFriendshipStatus('pending');
            }
        } catch (error) {
            console.error('Error handling friend action:', error);
        }
    };

    const handleRemoveFriend = async () => {
        try {
            await fetch(`http://localhost:5000/remove-friend/${userid}/${friendid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            console.error('Error handling friend action:', error);
        }
        setFriendshipStatus(null)
        setInitiatedByCurrentUser(true)
    }
    const handleDirectMessage = () => {
        navigate(`/messaging/${user}/${userid}`)
    }
    const handleBlockFriend = () => {

    }

    useEffect(() => {
        if(friendid) {
            fetch('http://localhost:5000/userauthenticate', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
            })
            .then((response) => response.json())
            .then((data) => {
                const { id } = data;
                const strid = String(id)
                setUserId(strid)
            })

            fetch(`http://localhost:5000/forumusers/${friendid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            })
            .then(response => response.json())
            .then(data => {
                const { name, last_online, description, location } = data;
                console.log("Data: ", data)
                const lastOnlineDate = new Date(last_online);
                const localTime = lastOnlineDate.toLocaleString();
                setUsername(name)
                setLocation(location)
                setDescription(description)
                setUser({name, localTime, description, location});
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
        }
    }, [token])

    useEffect(() => {
        console.log("USER: ", user);
    }, [user]);

    useEffect(() => {
        if(userid && friendid) {
            const fetchFriendshipStatus = async () => {
                try {
                    const response = await fetch(
                    `http://localhost:5000/get-friendship-status/${userid}/${friendid}`
                    )
                    const data = await response.json()
                    setFriendshipStatus(data.status)
                    const requestid = parseInt(data.user_id1, 10)
                    setInitiatedByCurrentUser(requestid === userid)
                } catch (error) {
                    console.error("Error fetching friendship status:", error);
                }
            };
            fetchFriendshipStatus();
        }
    }, [userid, friendid, initiatedByCurrentUser]);

    useEffect(() => {
        if(friendid) {
            const fetchUserComments = async () => {
                try {
                    const response = await fetch(`http://localhost:5000/usercomments/${friendid}`)
                    const data = await response.json()
                    setComments(data)
                }catch (error) {
                    console.error("Error fetching user comments:", error);
                }
            }
            fetchUserComments();
            const fetchThreadContent = async () => {
                try {
                    const response = await fetch(`http://localhost:5000/threadcontent/${friendid}`)
                    const data = await response.json()
                    setThreadData(data)
                } catch (error) {
                    console.error("Error fetching thread data:", error);
                }
            }
            fetchThreadContent();
            const fetchThreadPosts = async () => {
                try {
                    const response = await fetch(`http://localhost:5000/forumuserposts/${friendid}`)
                    const data = await response.json()
                    setThreadPosts(data);
                    console.log("Thread Posts: ", threadPosts, friendid)
                } catch (error) {
                    console.error("error fetching thread data", error);
                }
            }
            fetchThreadPosts();
            // retrieveImage();
        }
    }, [friendid, userProfileImageUrl, userid])

    return (
        <Container className="profile-page mt-4">
            <Row>
                <Col xs={12}>
                    <Card className="p-3 profile-header">
                        <Row className="d-flex">
                            <Col xs="auto" className="text-center">
                                {userid === friendid ? (
                                    <Image 
                                        src={userProfileImageUrl} 
                                        alt="User Profile" 
                                        className="profile-image" 
                                        rounded 
                                        style={{ 
                                            objectFit: 'cover',
                                            objectPosition: '50% 5%',
                                        }}
                                    />
                                ) : (
                                    <Image 
                                        src={friendUrl} 
                                        alt="User Profile" 
                                        className="profile-image" 
                                        rounded 
                                        style={{ 
                                            objectFit: 'cover',
                                            objectPosition: '50% 5%',
                                        }}
                                    />
                                )}
                            </Col>
                            <Col className="ms-3" style={{height:'100%'}}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{fontSize: 28}}>{user.name}</span>
                                    {friendid === userid && (                                    
                                        <span>
                                            <Button variant="warning" onClick={profileOpen}>Change Profile Picture</Button>
                                        </span>
                                    )}
                                </div>
                                <div>Last Online: {user.localTime}</div>
                                <div>Location: {user.location}</div>
                                <div>User Description: {user.description}</div>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>

            <Row className="mt-4">
                <Col md={8}>
                    <Tabs defaultActiveKey="comments" id="user-profile-tabs">
                        <Tab eventKey="comments" title="Comments">
                            <ListGroup>
                                {comments.map(comment => {
                                    const threadContent = threadData.find(content => content.thread_id === comment.thread_id);
                                    return (
                                        <NavLink to={`/threads/${comment.thread_id}`} className='nav-link' state={{ forumContent: threadContent }} key={comment.id}>
                                            <ListGroup.Item>
                                                <div>
                                                    <p><strong>{threadContent?.title || 'Thread Title'}</strong></p>
                                                    <p><strong>{comment.username}:</strong> {comment.comment}</p>
                                                </div>
                                            </ListGroup.Item>
                                        </NavLink>
                                    );
                                })}
                            </ListGroup>
                        </Tab>
                        <Tab eventKey="posts" title="Posts">
                            <ListGroup>
                                {Array.isArray(threadPosts) && threadPosts.map(post => {
                                    const likeContent = threadPosts.find(content => content.user_id === post.user_id)
                                    return (
                                        <NavLink to={`/threads/${post.thread_id}`} className='nav-link'>
                                            <ListGroup.Item>
                                                <div>
                                                    <p><strong>{post?.title || 'Thread Title'}</strong></p>
                                                    <p>{post.content}:</p>
                                                    <p><strong>Likes:</strong> {post.likes}</p>
                                                </div>
                                            </ListGroup.Item>
                                        </NavLink>
                                    );
                                })}
                            </ListGroup>
                        </Tab>
                    </Tabs>
                </Col>

                <Col md={4}>
                    <Card className="p-3">
                        {friendshipStatus === 'pending' && (
                            initiatedByCurrentUser ? (
                                <p>Friend Request Pending</p>
                            ) : (
                                <Button onClick={handleFriendAction}>Accept Friend Request</Button>
                            )
                        )}
                        {friendshipStatus === 'accepted' && (
                            <FriendOptionsDropdown
                                onRemoveFriend={handleRemoveFriend}
                                onDirectMessage={handleDirectMessage}
                                onBlockFriend={handleBlockFriend}
                            />
                        )}
                        {friendshipStatus === 'not_friends' && (
                            String(userid) !== friendid && (
                                <Button onClick={handleFriendAction}>Add Friend</Button>
                            )
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Modal for profile picture selection */}
            <Modal show={show} onHide={changeClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Profile Image Selection</Modal.Title>
                </Modal.Header>
                <Form onSubmit={(e) => {e.preventDefault(); handleImageSave();}}>
                    <div className='text-center'>
                        <div className='mt-24'>
                            <ButtonGroup className='justify-content-center'>
                                <Button variant="warning">Select Character</Button>
                                <Dropdown as={ButtonGroup} onSelect={handleDropdownSelect}>
                                <Dropdown.Toggle split variant="warning" className="custom-split-toggle" />
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
                                        style={{ height: "300px"}}
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
                            <Button type="submit" onClick={changeClose}>Save Profile Picture</Button>
                        </div>
                    </div>
                </Form>
            </Modal>

            {/* Modal for profile edit*/}
            <Modal show={showProfile} onHide={profileClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Profile Image Selection</Modal.Title>
                </Modal.Header>
                <Form onSubmit={(e) => {e.preventDefault(); handleProfileSave();}}>
                    <div className='text-center'>
                        <div className='mt-24'>
                            <ButtonGroup className='justify-content-center'>
                                <Image
                                        src={selectedImage}
                                        alt="Selected portrait"
                                        style={{ height: "300px"}}
                                        fluid
                                        loading="lazy"
                                />
                                <Button variant="warning" onClick={changeOpen}>Change Profile Image</Button>
                            </ButtonGroup>
                        <Form.Group className='mb-3'>
                            <Form.Label>Username</Form.Label>
                            <Form.Control 
                                type='text'
                                value = {username}
                                onChange={e => setUsername(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group className='mb-3'>
                            <Form.Label>Location</Form.Label>
                            <Form.Control 
                                type='text' 
                                value = {location}
                                onChange={e => setLocation(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group className='mb-3'>
                            <Form.Label>Description</Form.Label>
                            <Form.Control 
                                type='text' 
                                value = {description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </Form.Group>
                        </div>
                        <div className='mt-40 mb-32'>
                            <Button type="submit" onClick={profileClose}>Confirm Changes</Button>
                        </div>
                    </div>
                </Form>
            </Modal>
        </Container>
    );
}

export default Userprofile
