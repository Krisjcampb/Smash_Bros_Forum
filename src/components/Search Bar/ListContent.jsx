import React, { useState, useEffect, useCallback } from 'react'
import Card from 'react-bootstrap/Card'
import { NavLink } from 'react-router-dom'
import { Row, Col, Button, Modal, Container } from 'react-bootstrap'
import Form from 'react-bootstrap/Form'
import { BsArrowUp, BsArrowDown, BsThreeDotsVertical } from 'react-icons/bs'
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';

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
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDescription, setReportDescription] = useState('')
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

    const CanReport = () => {
        return userid && userid !== currentThread.users_id;
    }

    const reportReasons = [
        "Sexual content",
        "Hateful or abusive content",
        "Harmful or dangerous acts",
        "Promotes terrorism",
        "Repulsive or violent content",
        "Minor abuse or sexualization",
        "Spam",
        "Misinformation",
        "Self-harm or suicide",
    ];

    const handleReport = (thread) => {
        setCurrentThread(thread);
        setShowReportModal(true);
    };

    const handleReportSubmit = async () => {
        try {
            const response = await fetch('http://localhost:5000/threadreport', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    user_id: userid,
                    thread_id: currentThread.thread_id,
                    reported_user: currentThread.users_id,
                    reason: reportReason,
                    report_desc: reportDescription,
                }),
            });

            if (response.ok) {
                console.log("Report submitted successfully");
                setShowReportModal(false);
                setReportReason('');
                // You might want to show a success message to the user
            } else {
                console.error("Failed to submit report");
            }
        } catch (err) {
            console.error("Error submitting report:", err.message);
        }
    };

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
        setSearchTerm(e.target.value);
        setPage(1);
        setHasMore(true);
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
        setPage(1);
        setHasMore(true);
    };

    const fetchPostsWithImages = useCallback(async (page) => {
        try {
            setLoading(true);
            console.log("Fetch Posts With Images")
            const limit = 24;

            const currentScrollPosition = window.scrollY || document.documentElement.scrollTop;

            // Only fetch forum content now (includes image)
            const response = await fetch(`http://localhost:5000/forumcontent?page=${page}&limit=${limit}`);
            const newPosts = await response.json();

            // Add net likes if already fetched
            if (likesdislikes.length > 0) {
            newPosts.forEach(post => {
                const likeData = likesdislikes.find(item => item.post_id === post.thread_id);
                post.likes = likeData ? likeData.net_likes : 0;
            });
            }

            if (newPosts.length === 0 || newPosts.length < limit) {
            setHasMore(false);
            }

            setOriginalList(prevList => {
            if (page === 1) return newPosts;
            // Merge while keeping unique threads
            const mergedList = [...prevList, ...newPosts];
            const uniqueList = mergedList.reduce((acc, current) => {
                if (!acc.find(item => item.thread_id === current.thread_id)) acc.push(current);
                return acc;
            }, []);
            return uniqueList;
            });

            setTimeout(() => {
            window.scrollTo(0, currentScrollPosition);
            }, 0);

        } catch (err) {
            console.error(err.message);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [likesdislikes]);

    useEffect(() => {
        fetchPostsWithImages(page);
    }, [page, currentThread, fetchPostsWithImages]);

    // const handleScroll = useCallback(() => {
    //     if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || !hasMore) {
    //         return;
    //     }

    //     setPage(prevPage => prevPage + 1);
    // }, [hasMore]);

    // useEffect(() => {
    //     window.addEventListener('scroll', handleScroll)
    //     return () => window.removeEventListener('scroll', handleScroll)
    // }, [handleScroll])

    function formatShortDate(dateString) {
        const options = { month: 'short', day: 'numeric', year: 'numeric'}; // e.g. "Jul 30"
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function formatCompactNumber(num) {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        }
        if (num >= 10000) {
            return `${Math.round(num / 1000)}k`;
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(2)}k`.replace(/\.?0+k$/, 'k');
        }
        return num.toString();
    }

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

    // const formatPostDate = (timestamp) => {
    //     const date = new Date(timestamp)
    //     return date.toLocaleString();
    // }

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
                
                setNetLikesDislikes(netLikesDislikes);

                // Update the current list with new like counts
                setOriginalList(prevList => 
                    prevList.map(post => {
                        const likeData = netLikesDislikes.find(item => item.post_id === post.thread_id);
                        return {
                            ...post,
                            likes: likeData ? likeData.net_likes : post.likes || 0
                        };
                    })
                );

            } catch (err) {
                console.error(err.message);
            }
        }
        fetchData();
    }, [likedStatus, dislikedStatus]);

    useEffect(() => {
        const fetchdata2 = async () => {
            try {
                setLoading(true);
                console.log("Fetch Data 2")
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
  <Container fluid className="d-flex justify-content-center px-0">
    <div className="content-box">
      <Row className='mt-16 mb-16'>
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

      <div className='d-flex justify-content-center flex-wrap'>
            {list.map((e, index) => (
            <div key={index} className="position-relative m-1">
            <Card style={{ width: '25rem', height: '26.5rem', transition: 'transform 0.2s' }} className="hover-card">
                <Card.Body className="d-flex flex-column justify-content-between">
                    <NavLink to={`/threads/${e.thread_id}`} className="nav-link" state={{ forumContent: e }}>
                    <Card.Img
                        height={250}
                        src={e.filepath ? e.filepath.slice(6) : 'default_image_path'}
                        className="mb-2"
                    />
                    <Card.Title style={{ fontSize: '20px', fontWeight: '600' }} className="mb-1">
                        {e.title}
                    </Card.Title>
                    <Card.Text className="text-truncate text-muted" style={{ fontSize: '15px', lineHeight: '1.3' }}>
                        {e.content}
                    </Card.Text>
                    </NavLink>

                    <div className="d-flex justify-content-between align-items-end mt-3">
                    {/* Vote buttons */}
                    <div className="vote-buttons-container">
                        <Button
                        variant={
                            likedStatus[e.thread_id] !== undefined
                            ? likedStatus[e.thread_id]
                                ? 'success'
                                : 'outline-success'
                            : initialposts.find(item => item.thread_id === e.thread_id && item.type === 'like')
                                ? 'success'
                                : 'outline-success'
                        }
                        onClick={() => handleLike(e.thread_id)}
                        className="fixed-size-button"
                        >
                        <BsArrowUp />
                        </Button>

                        <span className="vote-count">
                        {formatCompactNumber(likesdislikes.find(item => item.post_id === e.thread_id)?.net_likes || 0)}
                        </span>

                        <Button
                        variant={
                            dislikedStatus[e.thread_id] !== undefined
                            ? dislikedStatus[e.thread_id]
                                ? 'danger'
                                : 'outline-danger'
                            : initialposts.find(item => item.post_id === e.thread_id && item.type === 'dislike')
                                ? 'danger'
                                : 'outline-danger'
                        }
                        onClick={() => handleDislike(e.thread_id)}
                        className="fixed-size-button"
                        >
                        <BsArrowDown />
                        </Button>
                    </div>

                        {/* Timestamp + user */}
                        <div className="text-end" style={{ fontSize: '14px' }}>
                            <div className="text-muted">{formatShortDate(e.postdate)}</div>
                            <NavLink to={`/userprofile/${e.username}/${e.users_id}`} className="nav-link p-0 m-0" style={{ fontWeight: '600' }}>
                            {e.username}
                            </NavLink>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {(UserPermissions(userRole, e.users_id) || (userid && userid !== e.users_id)) && (
            <div className='action-menu position-absolute' style={{ top: '5px', right: '5px', zIndex: 1050 }}>
                <Button variant="light three-dot-button" onClick={() => toggleMenu(index)}>
                <BsThreeDotsVertical />
                </Button>
                {showMenu === index && (
                <div className='position-absolute bg-light border rounded p-2 dropdown-animation action-dropdown' style={{ zIndex: 1050, top: '100%', right: 0, minWidth: '8rem' }}>
                    <ul className="list-unstyled mb-0">
                    {/* Report button - show for all logged-in users who don't own the content */}
                    {userid && userid !== e.users_id && (
                        <li className="p-2">
                        <button className="btn btn-link" onClick={() => handleReport(e)}>Report</button>
                        </li>
                    )}
                    
                    {/* Edit/Delete options - only show for content owners or moderators */}
                    {UserPermissions(userRole, e.users_id) && (
                        <>
                        {(usersId === e.users_id) && (userRole !== 'admin' && userRole !== 'moderator') && (
                            <>
                            <li className="p-2">
                                <button className="btn btn-link" onClick={() => EditOpen(e)}>Edit Thread</button>
                            </li>
                            <li className="p-2">
                                <button className="btn btn-link text-danger" onClick={() => { DeleteOpen(); setCurrentThread(e); }}>Delete Thread</button>
                            </li>
                            </>
                        )}
                        {(userRole === 'moderator' || userRole === 'admin') && (
                            <>
                            <li className="p-2">
                                <button className="btn btn-link" onClick={() => { EditOpen(e); setCurrentThread(e); }}>Edit as Moderator</button>
                            </li>
                            <li className="p-2">
                                <button className="btn btn-link text-danger" onClick={() => { DeleteOpen(); setCurrentThread(e); }}>Delete as Moderator</button>
                            </li>
                            </>
                        )}
                        </>
                    )}
                    </ul>
                </div>
                )}
            </div>
            )}
            </div>
        ))}
        <div className="w-100 text-center mt-4 mb-4">
            {hasMore && !searchTerm && (
            <Button 
                variant="primary" 
                size="lg"
                onClick={() => setPage(prevPage => prevPage + 1)}
                disabled={loading}
                className="see-more-btn px-4 py-2"
                style={{ 
                minWidth: '150px',
                borderRadius: '25px',
                fontWeight: '600'
                }}
            >
                {loading ? (
                    <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Loading...
                    </>
                ) : (
                    'See More Posts'
                )}
            </Button>
            )}

            {/* No more content message */}
            {!hasMore && list.length > 0 && (
                <div className="text-muted mt-32">
                    You've reached the end of the content
                </div>
                )}
            </div>
        </div>
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
        <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="md" style={{ color: '#000000' }} centered>
            <Modal.Header className="position-relative">
                <Modal.Title className="w-100 text-center">Report Thread</Modal.Title>
                <Button 
                    variant="close" 
                    onClick={() => setShowReportModal(false)} 
                    className="position-absolute"
                    style={{ top: '18px', right: '8px' }}
                />
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group controlId="formReportReason">
                        <Form.Label>Reason for reporting:</Form.Label>
                            {reportReasons.map(reason => (                        
                                <Form.Check
                                    label={reason}
                                    name="reportReason"
                                    type='radio'
                                    key={reason}
                                    onChange={() => setReportReason(reason)}
                                />
                            ))}
                        <Form.Label className='mt-16'>Optional:</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Please describe why you are reporting this thread..."
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer className="justify-content-center">
                <Button size="lg" onClick={handleReportSubmit}>Submit Report</Button>
                <Button size="lg" variant="secondary" onClick={() => setShowReportModal(false)}>Cancel</Button>
            </Modal.Footer>
        </Modal>
    </Container>
    );
}

export default ListContent