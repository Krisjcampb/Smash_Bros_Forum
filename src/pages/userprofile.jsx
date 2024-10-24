import React, {useState, useEffect, useCallback} from 'react'
import ListGroup from 'react-bootstrap/ListGroup';
import { Container, Image, Tabs, Tab, Modal, Button, ButtonGroup, Dropdown, Form, Row, Col, Card } from 'react-bootstrap'
import { useParams, useNavigate } from 'react-router-dom';
import FriendOptionsDropdown from '../components/Friend Dropdown/Friend_Dropdown'
import { NavLink } from 'react-router-dom'

function Userprofile() {
    const [initiatedByCurrentUser, setInitiatedByCurrentUser] = useState(false)
    const [user, setUser] = useState('')
    const [userid, setUserId] = useState('')
    const [friendshipStatus, setFriendshipStatus] = useState(null)
    const { friendid } = useParams();
    const [threadData, setThreadData] = useState([])
    // const [posts, setPosts] = useState([]);
    const [comments, setComments] = useState([]);
    // const [likes, setLikes] = useState([]);
    const [show, setShow] = useState(false)
    const [searchTerm, setSearchTerm] = useState("");
    const [character, setCharacter] = useState("Mario");
    const [selectedImage, setSelectedImage] = useState(`/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${character}/chara_3_${character.toLowerCase()}_00.png`);
    const [clickedImage, setClickedImage] = useState(selectedImage);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [clickedIndex, setClickedIndex] = useState(highlightedIndex)
    const token = localStorage.getItem('token')
    const navigate = useNavigate()

    const changeOpen = () => setShow(true)
    const changeClose = () => setShow(false)

    const currentuserstatus = () => {
        // console.log(initiatedByCurrentUser)
    }

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

    const images = [
    `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${character}/chara_3_${character.toLowerCase()}_00.png`,
    `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${character}/chara_3_${character.toLowerCase()}_01.png`,
    `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${character}/chara_3_${character.toLowerCase()}_02.png`,
    `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${character}/chara_3_${character.toLowerCase()}_03.png`,
    `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${character}/chara_3_${character.toLowerCase()}_04.png`,
    `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${character}/chara_3_${character.toLowerCase()}_05.png`,
    `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${character}/chara_3_${character.toLowerCase()}_06.png`,
    `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${character}/chara_3_${character.toLowerCase()}_07.png`,
  ];
    //SEARCH > Main Image > Alts > Save

    
    const handleDropdownSelect = (eventKey, event) => {
        setCharacter(eventKey);
        setHighlightedIndex(0);
        setClickedIndex(0)
    };

    const handleImageClick = (index) => {
        setClickedImage(images[index])
        setClickedIndex(index)
        setHighlightedIndex(index);
        console.log(clickedImage, index)
    };

    const handleImageSave = async () => {
        try {
            setSelectedImage(clickedImage);
            setHighlightedIndex(clickedIndex);
            console.log("Save Profile Picture: ", clickedImage)
            console.log("Save Profile Image: ", selectedImage)
            await fetch(`http://localhost:5000/change-pfp/${userid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({clickedImage, character}),
            })
            retrieveImage();
        } catch {
            console.error('Error changing profile picture');
        }
    };

    const retrieveImage = useCallback(async () => {
        if(!userid) {
            console.error("userid is not defined.");
            return;
        }
        try {
            console.log("user id: ", userid)
            const response = await fetch(`http://localhost:5000/retrieve-image/${userid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
            })
            const data = await response.json();
            console.log(data[0].character_name, data[0].selected_skin);

            if (data[0].character_name) {
                setCharacter(data[0].character_name);
                setSelectedImage(`/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${data[0].character_name}/chara_3_${data[0].character_name.toLowerCase()}_0${data[0].selected_skin}.png`);
            } else {
                console.error("character_name is undefined in the response.");
            }

        } catch (error) {
            console.error('Error retrieving profile picture', error);
        }
    }, [userid]);

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
        if(token) {
            fetch('http://localhost:5000/userauthenticate', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
            })
            .then(response => response.json())
            .then(data => {
                const { id, name } = data;
                setUserId(id);
                setUser(name);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
        }
    }, [user, token])

    useEffect(() => {
        if(userid && friendid) {
            const fetchFriendshipStatus = async () => {
                try {
                    const response = await fetch(
                    `http://localhost:5000/get-friendship-status/${userid}/${friendid}`
                    )
                    const data = await response.json()
                    setFriendshipStatus(data.status.status)
                    const requestid = parseInt(data.userid, 10)
                    setInitiatedByCurrentUser(requestid === userid)
                } catch (error) {
                    console.error("Error fetching friendship status:", error);
                }
            };
            fetchFriendshipStatus();
        }
    }, [userid, friendid, initiatedByCurrentUser]);

    useEffect(() => {
        if(userid) {
            const fetchUserComments = async () => {
                try {
                    const response = await fetch(`http://localhost:5000/usercomments/${userid}`)
                    const data = await response.json()
                    setComments(data)
                }catch (error) {
                    console.error("Error fetching user comments:", error);
                }
            }
            fetchUserComments();
            const fetchThreadContent = async () => {
                try {
                    const response = await fetch(`http://localhost:5000/threadcontent/${userid}`)
                    const data = await response.json()
                    setThreadData(data)
                    // console.log("Thread Data: ", data);
                } catch (error) {
                    console.error("Error fetching thread data:", error);
                }
            }
            fetchThreadContent();
            retrieveImage();
        }
    }, [userid, retrieveImage])

    return (
        <Container className="profile-page mt-4">
            <Row>
                <Col xs={12}>
                    <Card className="p-3 profile-header">
                        <div className="d-flex align-items-center">
                            <Image src={selectedImage} alt="User Profile" className='profile-image' rounded/>
                            <div className="ms-3">
                                <h3>{user.username}</h3>
                                <p>{user.description}</p>
                                <Button onClick={currentuserstatus}>User Status</Button>
                                <Button variant="warning" onClick={changeOpen}>Change Profile Picture</Button>
                            </div>
                        </div>
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
                        <Tab eventKey="likes" title="Likes">
                            {/* Display user's liked posts */}
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
                        {friendshipStatus === null && (
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
        </Container>
    );
}

export default Userprofile
