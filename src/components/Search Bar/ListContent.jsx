import React, { useState, useEffect, useCallback } from 'react'
import Card from 'react-bootstrap/Card'
import { NavLink } from 'react-router-dom'
import { Row, Col, Button, Modal, Container } from 'react-bootstrap'
import Form from 'react-bootstrap/Form'
import { BsArrowUp, BsArrowDown, BsThreeDotsVertical } from 'react-icons/bs'

const ListContent = (props) => {
    const [list, setList] = useState([])
    const [originalList, setOriginalList] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filteredPosts, setFilteredPosts] = useState([])
    const [user, setUser] = useState("")
    const [userid, setUserId] = useState("")
    const [likedStatus, setLikedStatus] = useState({})
    const [dislikedStatus, setDislikedStatus] = useState({})
    const [likesdislikes, setNetLikesDislikes] = useState([])
    const [initialposts, setInitialPosts] = useState([])
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editModalTitle, setEditModalTitle] = useState('')
    const [editModalContent, setEditModalContent] = useState('')
    const [currentThread, setCurrentThread] = useState({})
    const [sortBy, setSortBy] = useState('newest')
    const [showMenu, setShowMenu] = useState(null);
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const { userRole, usersId } = props;

    const DeleteOpen = () => {setShowDeleteModal(true); console.log(currentThread)}
    const DeleteClose = () => setShowDeleteModal(false)

    const EditOpen = (thread) => {
        setCurrentThread(thread);
        console.log("thread: ", thread)
        setShowEditModal(true);
    };

    useEffect(() => {
        if (showEditModal) {
            setEditModalTitle(currentThread.title);
            setEditModalContent(currentThread.content);
        }
    }, [showEditModal, currentThread]);

    const EditClose = () => setShowEditModal(false);

    const UserPermissions = (userRole, users_id) => {
        if(userRole === 'admin' || userRole === 'moderator' || usersId === users_id){
            return true;
        }
        return false;
    }
    
    const toggleMenu = (index) => {
        setShowMenu(showMenu === index ? null : index);
    };

    const handleClickOutside = useCallback((event, index) => {
        if (showMenu === index && !event.target.closest('.action-menu')) {
        setShowMenu(null);
        }
    }, [showMenu])

    // const handleEdit = async (userRole, users_id) => {
    //     if(userRole === 'admin' || userRole === 'moderator' || usersId === users_id){
    //         return true;
    //     }
    //     return false;
    // }

    const handleEditAsModerator = async () => {
        try {
            if (!editModalContent || !editModalTitle) {
                console.error("Title or content is missing.");
                return;
            }

            console.log(editModalContent, editModalTitle, currentThread.thread_id);

            const response = await fetch(`http://localhost:5000/forumcontent/${currentThread.thread_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editModalContent, title: editModalTitle }),
            });

            if (response.ok) {
                setList(prevList =>
                    prevList.map(thread =>
                        thread.thread_id === currentThread.thread_id
                            ? { ...thread, title: editModalTitle, content: editModalContent }
                            : thread
                    )
                );

                setOriginalList(prevOriginalList =>
                    prevOriginalList.map(thread =>
                        thread.thread_id === currentThread.thread_id
                            ? { ...thread, title: editModalTitle, content: editModalContent }
                            : thread
                    )
                );

                setShowEditModal(false);
            } else {
                console.error("Failed to update forum content");
            }
        } catch (err) {
            console.error("Error updating thread:", err.message);
        }
    };

    // const handleDelete = (userRole, users_id) => {
    //     if(userRole === 'admin' || userRole === 'moderator' || usersId === users_id){
    //         return true;
    //     }
    //     return false;
    // }

    // const handleDeleteAsModerator = (userRole, users_id) => {
    //     if(userRole === 'admin' || userRole === 'moderator' || usersId === users_id){
    //         return true;
    //     }
    //     return false;
    // }

    useEffect(() => {
        const handleClick = (event) => handleClickOutside(event, showMenu);
        document.addEventListener('click', handleClick);

        return () => {
            document.removeEventListener('click', handleClick);
        };
    }, [showMenu, handleClickOutside]);
    
    const handleLike = async (thread_id) => {
        try {
            let isCurrentlyLiked = likedStatus[thread_id] || false;

            console.log("Is Currently Liked?: ", likedStatus[thread_id])

            setLikedStatus(prevStatus => {
                console.log("Previous Status:", prevStatus);
                return {
                    ...prevStatus,
                    [thread_id]: !isCurrentlyLiked
                };
            });
            console.log(likedStatus[thread_id])
            
            setDislikedStatus(prevStatus => ({
                ...prevStatus,
                [thread_id]: false
            }));

            setInitialPosts(prevPosts =>
                prevPosts.map(post =>
                    post.thread_id === thread_id
                        ? { ...post, type: isCurrentlyLiked ? null : 'like' }
                        : post
                )
            );
            console.log("Initial Posts: ", initialposts)

            const response = await fetch('http://localhost:5000/forumlikes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userid, thread_id }),
            });

            if (!response.ok) {
                console.error('Error liking post:', await response.json().error);
            }
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const handleDislike = async (thread_id) => {
        try {
            let isCurrentlyDisliked = dislikedStatus[thread_id] || false;

            setDislikedStatus(prevStatus => ({
                ...prevStatus,
                [thread_id]: !isCurrentlyDisliked
            }));
            
            setLikedStatus(prevStatus => ({
                ...prevStatus,
                [thread_id]: false
            }));

            setInitialPosts(prevPosts =>
                prevPosts.map(post =>
                    post.thread_id === thread_id
                        ? { ...post, type: isCurrentlyDisliked ? null : 'dislike' }
                        : post
                )
            );

            const response = await fetch('http://localhost:5000/forumdislikes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userid, thread_id }),
            });

            if (!response.ok) {
                console.error('Error disliking post:', await response.json().error);
            }
        } catch (error) {
            console.error('Error disliking post:', error);
        }
    };

    useEffect(() => {
        if (initialposts && initialposts.length > 0) {
            const initialLikes = {};
            const initialDislikes = {};

            initialposts.forEach(post => {
                if (post.type === 'like') {
                    initialLikes[post.thread_id] = true;
                } else if (post.type === 'dislike') {
                    initialDislikes[post.thread_id] = true;
                }
            });

            setLikedStatus(initialLikes);
            setDislikedStatus(initialDislikes);
        }
    }, [initialposts]);

    useEffect(() => {
        console.log("likedStatus updated:", likedStatus);
    }, [likedStatus]);

    const filterPosts = useCallback(() => {
        const filteredPosts = originalList.filter(item =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredPosts(filteredPosts)
    }, [searchTerm, originalList]);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value)
    }

    const sortByNewest = (a, b) => new Date(b.postdate) - new Date(a.postdate);

    const sortByOldest = (a, b) => new Date(a.postdate) - new Date(b.postdate);

    const sortByPopularityAndRecency = (a, b) => {
        const popularityA = a.likes;
        const popularityB = b.likes;

        const recencyA = (new Date() - new Date(a.postdate)) / (1000 * 60 * 60 * 24);
        const recencyB = (new Date() - new Date(b.postdate)) / (1000 * 60 * 60 * 24);

        const popularityWeight = 1;
        const recencyWeight = 0.05;

        const combinedScoreA = (popularityA * popularityWeight) - (recencyA * recencyWeight);
        const combinedScoreB = (popularityB * popularityWeight) - (recencyB * recencyWeight);

        return combinedScoreB - combinedScoreA;
    };

    const sortByTop = (a, b) => b.likes - a.likes

    const handleSortChange = (e) => {
        setSortBy(e.target.value);
    };

    const fetchPosts = async (page) => {
        try {
            setLoading(true);
            const limit = 24;
            const response = await fetch(`http://localhost:5000/forumcontent?page=${page}&limit=${limit}`);
            const newPosts = await response.json();

            if (newPosts.length < limit) {
                setHasMore(false);
            }

            setOriginalList(prevList => {
                const mergedList = [...prevList, ...newPosts];
                const deduplicatedList = mergedList.filter((post, index, self) => index === self.findIndex(p => p.thread_id === post.thread_id));
                return deduplicatedList;
            });

        } catch (err) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts(page)
    }, [page, currentThread])

    const handleScroll = useCallback(() => {
        if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || !hasMore) {
            return;
        }

        setPage(prevPage => prevPage + 1);
    }, [hasMore]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [handleScroll])

    useEffect(() => {
        let sortedList = [...filteredPosts];
        if (sortBy === 'newest') {
            sortedList.sort(sortByNewest);
        } else if (sortBy === 'oldest') {
            sortedList.sort(sortByOldest);
        } else if (sortBy === 'mostPopular') {
            sortedList.sort(sortByPopularityAndRecency);
        } else if (sortBy === 'Top') {
            sortedList.sort(sortByTop)
        }
        setList(sortedList);
    }, [sortBy, filteredPosts]);

    const formatPostDate = (timestamp) => {
        const date = new Date(timestamp)
        return date.toLocaleString();
    }

    useEffect(() => {
        filterPosts();
    }, [searchTerm, originalList, filterPosts])

    useEffect(() => {
        setList(searchTerm ? [...filteredPosts] : [...originalList]);
    }, [searchTerm, filteredPosts, originalList])

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
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
                    setUser(name);
                    setUserId(id)
                })
        }
    }, [user])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [likecount, dislikecount] = await Promise.all([
                    fetch('http://localhost:5000/forumlikes'),
                    fetch('http://localhost:5000/forumdislikes'),
                ])
                const likedata = await likecount.json();
                const dislikedata = await dislikecount.json();

                const netLikesToDislikes = likedata.map((like) => ({
                    post_id: like.post_id,
                    like_count: like.like_count,
                    dislike_count: 0,
                }));
                dislikedata.forEach((dislike) => {
                    const index = netLikesToDislikes.findIndex((item) => item.post_id === dislike.post_id);
                    if (index !== -1) {
                        netLikesToDislikes[index].dislike_count = dislike.dislike_count;
                    } else {
                        netLikesToDislikes.push({
                            post_id: dislike.post_id,
                            like_count: 0,
                            dislike_count: dislike.dislike_count,
                        });
                    }
                });
                const netLikesDislikes = netLikesToDislikes.map((item) => ({
                    post_id: item.post_id,
                    net_likes: item.like_count - item.dislike_count,
                }));
                setNetLikesDislikes(netLikesDislikes)
            }
            catch (err) {
                console.error(err.message)
            }
        }
        fetchData();

    }, [likedStatus, dislikedStatus])

    useEffect(() => {
    const fetchData = async () => {
        try {
            const [listResponse, imageResponse] = await Promise.all([
                fetch('http://localhost:5000/forumcontent'),
                fetch('http://localhost:5000/forumimages'),
            ]);
            const listData = await listResponse.json();
            const imageData = await imageResponse.json();

            const postsWithData = listData.map((post) => {
                const correspondingImage = imageData.find((image) => image.thread_id === post.thread_id);
                return {
                    ...post,
                    filepath: correspondingImage ? correspondingImage.filepath : null,
                };
            });

            if (likesdislikes.length > 0) {
                Object.keys(postsWithData).forEach(key => {
                    const threadId = postsWithData[key].thread_id;

                    Object.keys(likesdislikes).forEach(key2 => {
                        if (threadId === likesdislikes[key2].post_id) {
                            postsWithData[key].likes = likesdislikes[key2].net_likes;
                        }
                    });
                });
            }

            setOriginalList(postsWithData);
            setList(postsWithData);
            console.log(list)
        } catch (err) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
}, [likesdislikes]);

    useEffect(() => {
        const fetchdata2 = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://localhost:5000/userlikesdislikes?userid=${userid}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                const res = await response.json();
                console.log("res: ", res)
                if (Array.isArray(res)) {
                    const initialLikedStatus = {};
                    const initialDislikedStatus = {};

                    res.forEach(item => {
                        if (item.type === 'like') {
                            initialLikedStatus[item.thread_id] = true;
                            initialDislikedStatus[item.thread_id] = false;
                        } else if (item.type === 'dislike') {
                            initialLikedStatus[item.thread_id] = false;
                            initialDislikedStatus[item.thread_id] = true;
                        }
                    });

                    console.log("Initial Liked Status: ", initialLikedStatus);
                    console.log("Initial Disliked Status: ", initialDislikedStatus);

                    // setLikedStatus(initialLikedStatus);
                    setDislikedStatus(initialDislikedStatus);

                    setInitialPosts(res);
                } else {
                    console.error('Response is not an array:', res);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (userid) {
            fetchdata2();
        }
    }, [userid]);

    if (loading) {
        return <div className='fs-4 text-center mt-16'>Loading...</div>
    }

    return (
    <Container style={{ maxWidth: '80%'}} classname='mx-auto'>
        <Row className='mt-16 ms-auto me-auto mb-16 mw-25'>
            <Col>
            <Form.Control
                type='text'
                placeholder='Search'
                className='text-center'
                onChange={handleSearch}
            />
            </Col>
            <Col>
            <Form.Select value={sortBy} onChange={handleSortChange} className='text-center'>
                <option value='newest'>Sort by Newest</option>
                <option value='oldest'>Sort by Oldest</option>
                <option value='mostPopular'>Sort by Most Popular</option>
                <option value='Top'>Sort by Top Liked</option>
            </Form.Select>
            </Col>
        </Row>
        <div className='justify-content-center' style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap'}}>
            {list.map((e, index) => (
            <div key={index} className="position-relative" style={{ marginBottom: '8px', marginLeft: '4px', marginRight: '4px' }}>
                <Card style={{ width: '25rem', height: '26.5rem', transition: 'transform 0.2s', zIndex: 0 }} className="hover-card">
                    <Card.Body>
                        <NavLink to={`/threads/${e.thread_id}`} className='nav-link' state={{ forumContent: e }}>
                            <Card.Img
                                height={250}
                                src={e.filepath ? e.filepath.slice(6) : 'default_image_path'}
                            />
                            <Card.Title style={{ fontSize: '22px' }}>{e.title}</Card.Title>
                            <Card.Text className='text-truncate-container' style={{fontSize: '16px', lineHeight: '1.3'}}>
                                {e.content}
                            </Card.Text>
                        </NavLink>
                        <div className='position-absolute bottom-0 end-0 pe-4' style={{ fontWeight: 'bold', fontSize: '15px' }}>
                            {formatPostDate(e.postdate)} 
                            <NavLink to={`/userprofile/${e.username}/${e.users_id}`} className="nav-link">{e.username}</NavLink>
                        </div>
                        <div className='position-absolute right-0 bottom-0 pb-4' style={{ display: 'flex', alignItems: 'center', zIndex: 1 }}>
                            <Button
                                variant={
                                    likedStatus[e.thread_id] !== undefined
                                        ? likedStatus[e.thread_id] 
                                            ? "success"
                                            : "outline-success"
                                        : initialposts.find(item => item.thread_id === e.thread_id && item.type === 'like')
                                            ? "success"
                                            : "outline-success"
                                }
                                className={likedStatus[e.thread_id] ? "success" : "outline-success"}
                                onClick={() => handleLike(e.thread_id)}
                            >
                                <BsArrowUp />
                            </Button>

                            <span style={{ margin: '0 5px' }}>
                                {likesdislikes.find(item => item.post_id === e.thread_id)?.net_likes || 0}
                            </span>

                            <Button
                                variant={
                                    dislikedStatus[e.thread_id] !== undefined 
                                        ? dislikedStatus[e.thread_id] 
                                            ? "danger"
                                            : "outline-danger"
                                        : initialposts.find(item => item.post_id === e.thread_id && item.type === 'dislike') 
                                            ? "danger"
                                            : "outline-danger"
                                }
                                onClick={() => handleDislike(e.thread_id)}
                            >
                                <BsArrowDown />
                            </Button>
                        </div>
                    </Card.Body>
                </Card>
                {
                    UserPermissions(userRole, e.users_id) && (
                        <div className='action-menu position-absolute' style={{ top: '5px', right: '5px', zIndex: 1050 }}>
                            <Button variant="light" onClick={() => toggleMenu(index)}>
                                <BsThreeDotsVertical />
                            </Button>
                            {showMenu === index && (
                                <div 
                                    className='position-absolute bg-light border rounded p-2' 
                                    style={{ zIndex: 1050, top: '100%', right: 0, minWidth: '8rem' }}
                                >
                                    <ul className="list-unstyled mb-0">
                                        {(usersId === e.users_id) && (userRole !== 'admin' && userRole !== 'moderator') && (
                                            <>
                                                <li className="p-2">
                                                    <button className="btn btn-link" onClick={() => EditOpen(e)}>Edit Thread</button>
                                                </li>
                                                <li className="p-2">
                                                    <button className="btn btn-link text-danger" onClick={() => {DeleteOpen(); setCurrentThread(e)}}>Delete Thread</button>
                                                </li>
                                            </>
                                        )}
                                        {(userRole === 'moderator' || userRole === 'admin') && (
                                            <>
                                                <li className="p-2">
                                                    <button className="btn btn-link" onClick={() => {EditOpen(e); setCurrentThread(e)}}>Edit as Moderator</button>
                                                </li>
                                                <li className="p-2">
                                                    <button className="btn btn-link text-danger" onClick={() => {DeleteOpen(); setCurrentThread(e)}}>Delete as Moderator</button>
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )
                }
            </div>
            ))}
            {loading && <div>Loading...</div>}
        </div>
        {/* Delete Thread Modal */}
        <Modal show={showDeleteModal} onHide={DeleteClose} size="md" style={{ color: '#000000' }} centered>
            <Modal.Header className="position-relative">
                <Modal.Title className="w-100 text-center">Deleting Modal</Modal.Title>
                <Button 
                variant="close" 
                onClick={DeleteClose} 
                className="position-absolute"
                style={{ top: '18px', right: '8px' }}
                />
            </Modal.Header>
            <Modal.Body>
                <div className='text-center'>Are you sure you would like to delete this thread?</div>
            </Modal.Body>
            <Modal.Footer className="justify-content-center">
                <Button size="lg">Confirm</Button>
                <Button size="lg" className="ps-22 pe-22" onClick={DeleteClose}>Cancel</Button>
            </Modal.Footer>
        </Modal>

        {/* Edit Thread Modal */}
        <Modal show={showEditModal} onHide={EditClose} size="lg" style={{ color: '#000000' }} centered>
            <Modal.Header className="position-relative">
                <Modal.Title className="w-100 text-center">Editing Modal</Modal.Title>
                <Button 
                variant="close" 
                onClick={EditClose} 
                className="position-absolute"
                style={{ top: '18px', right: '8px' }}
                />
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group controlId="formParagraph">
                        <Form.Control
                        type="text"
                        placeholder="Title"
                        value={editModalTitle}
                        onChange={(e) => setEditModalTitle(e.target.value)}
                        />
                        <Form.Control
                        as="textarea"
                        rows={5}
                        placeholder="Enter your paragraph here"
                        value={editModalContent}
                        onChange={(e) => setEditModalContent(e.target.value)}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer className="justify-content-center">
                <Button size="lg" onClick={handleEditAsModerator}>Confirm</Button>
                <Button size="lg" className="ps-22 pe-22" onClick={EditClose}>Cancel</Button>
            </Modal.Footer>
        </Modal>
    </Container>
    );
}

export default ListContent