// src/components/Search Bar/ListContent.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Card from 'react-bootstrap/Card'
import { NavLink } from 'react-router-dom'
import { Row, Col, Button, Modal, Container, Image, InputGroup } from 'react-bootstrap'
import Form from 'react-bootstrap/Form'
import { BsArrowUp, BsArrowDown, BsThreeDotsVertical, BsChatFill, BsSearch, BsSortDownAlt } from 'react-icons/bs'
import { toast } from 'react-toastify'
import { SkeletonGrid } from '../Utilities/skeletoncard'
import { getImageUrl } from '../Utilities/adjusturl'
import { API } from '../Utilities/apiUrl';

const ListContent = (props) => {
    const [originalList, setOriginalList] = useState([])
    const [loading, setLoading] = useState(true)
    const [initialLoad, setInitialLoad] = useState(true) // true only on first page load
    const [searchTerm, setSearchTerm] = useState('')
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
    const [showMenu, setShowMenu] = useState(null)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [showReportModal, setShowReportModal] = useState(false)
    const [reportReason, setReportReason] = useState('')
    const [reportDescription, setReportDescription] = useState('')
    const [submitting, setSubmitting] = useState(false);
    const { userRole, usersId, newThread } = props;
    const token = localStorage.getItem('token');

    // ── Modal helpers ─────────────────────────────────────────────────────────

    const DeleteOpen = () => setShowDeleteModal(true);
    const DeleteClose = () => setShowDeleteModal(false);

    const EditOpen = (thread) => {
        setCurrentThread(thread);
        setShowEditModal(true);
    };


    useEffect(() => {
        if (showEditModal) {
            setEditModalTitle(currentThread.title);
            setEditModalContent(currentThread.content);
        }
    }, [showEditModal, currentThread]);

    const EditClose = () => setShowEditModal(false);

    const UserPermissions = (userRole, users_id) =>
        userRole === 'admin' || userRole === 'moderator' || usersId === users_id;

    const reportReasons = [
        "Sexual content", "Hateful or abusive content", "Harmful or dangerous acts",
        "Promotes terrorism", "Repulsive or violent content", "Minor abuse or sexualization",
        "Spam", "Misinformation", "Self-harm or suicide",
    ];

    // ── Report ────────────────────────────────────────────────────────────────

    const handleReport = (thread) => {
        setCurrentThread(thread);
        setShowReportModal(true);
    };

    const handleReportSubmit = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const response = await fetch(`${API}/threadreport`, {
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
                setShowReportModal(false);
                setReportReason('');
                toast.success('Report submitted.');
            } else {
                toast.error('Failed to submit report.');
            }
        } catch (err) {
            console.error("Error submitting report:", err.message);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Three-dot menu ────────────────────────────────────────────────────────

    const toggleMenu = (index) => setShowMenu(showMenu === index ? null : index);

    const handleClickOutside = useCallback((event) => {
        if (showMenu !== null && !event.target.closest('.action-menu')) {
            setShowMenu(null);
        }
    }, [showMenu]);

    useEffect(() => {
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [handleClickOutside]);

    // ── Edit / Delete ─────────────────────────────────────────────────────────

    const handleEditAsModerator = async () => {
        if (!editModalContent || !editModalTitle) return;
        try {
            const response = await fetch(`${API}/forumcontent/${currentThread.thread_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editModalContent, title: editModalTitle }),
            });
            if (response.ok) {
                setOriginalList(prev =>
                    prev.map(t => t.thread_id === currentThread.thread_id
                        ? { ...t, title: editModalTitle, content: editModalContent }
                        : t
                    )
                );
                EditClose();
                toast.success('Thread updated.');
            } else {
                toast.error('Failed to update thread.');
            }
        } catch (err) {
            toast.error('Something went wrong.');
        }
    };

    const handleDelete = async (userRole) => {
        try {
            const response = await fetch(`${API}/forumcontent/${currentThread.thread_id}`, {
                method: 'DELETE',
                headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
                },
            });
            if (response.ok) {
                setOriginalList(prev => prev.filter(t => t.thread_id !== currentThread.thread_id));
                DeleteClose();
                toast.success('Thread deleted.');
            } else {
                toast.error('Failed to delete thread.');
            }
        } catch (err) {
            toast.error('Something went wrong.');
        }
    };

    // ── Likes / Dislikes ──────────────────────────────────────────────────────

    const handleLike = async (thread_id) => {
        const wasLiked = likedStatus[thread_id] || false;
        const wasDisliked = dislikedStatus[thread_id] || false;

        setLikedStatus(prev => ({ ...prev, [thread_id]: !wasLiked }));
        setDislikedStatus(prev => ({ ...prev, [thread_id]: false }));

        setNetLikesDislikes(prev => {
            const existing = prev.find(item => item.post_id === thread_id);
            if (!existing) {
                return [...prev, { post_id: thread_id, net_likes: wasLiked ? 0 : (wasDisliked ? 2 : 1) }];
            }
            return prev.map(item => {
                if (item.post_id !== thread_id) return item;
                let n = item.net_likes;
                if (wasLiked) n -= 1;
                else { n += 1; if (wasDisliked) n += 1; }
                return { ...item, net_likes: n };
            });
        });

        try {
            await fetch(`${API}/forumlikes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ thread_id }),
            });
            if (!wasLiked) toast.success('👍 Post liked!', { autoClose: 1500, hideProgressBar: true });
        } catch (err) {
            toast.error('Failed to like post.');
        }
    };

    const handleDislike = async (thread_id) => {
        const wasDisliked = dislikedStatus[thread_id] || false;
        const wasLiked = likedStatus[thread_id] || false;

        setDislikedStatus(prev => ({ ...prev, [thread_id]: !wasDisliked }));
        setLikedStatus(prev => ({ ...prev, [thread_id]: false }));

        setNetLikesDislikes(prev => {
            const existing = prev.find(item => item.post_id === thread_id);
            if (!existing) {
                return [...prev, { post_id: thread_id, net_likes: wasDisliked ? 0 : (wasLiked ? -2 : -1) }];
            }
            return prev.map(item => {
                if (item.post_id !== thread_id) return item;
                let n = item.net_likes;
                if (wasDisliked) n += 1;
                else { n -= 1; if (wasLiked) n -= 1; }
                return { ...item, net_likes: n };
            });
        });

        try {
            await fetch(`${API}/forumdislikes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ thread_id }),
            });
        } catch (err) {
            toast.error('Failed to dislike post.');
        }
    };

    // ── Data fetching ─────────────────────────────────────────────────────────

    useEffect(() => {
        if (initialposts.length > 0) {
            const likes = {}, dislikes = {};
            initialposts.forEach(post => {
                if (post.type === 'like') likes[post.thread_id] = true;
                else if (post.type === 'dislike') dislikes[post.thread_id] = true;
            });
            setLikedStatus(likes);
            setDislikedStatus(dislikes);
        }
    }, [initialposts]);

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setPage(1);
        setHasMore(true);
    };

    const handleSortChange = (e) => {
        const newSort = e.target.value;

        setSortBy(newSort);
        setPage(1);
        setHasMore(true);
        setOriginalList([]);
    };

    const list = useMemo(() => [...originalList], [originalList]);

    const fetchPostsWithImages = useCallback(async (pageNum, search = '', sort = 'newest') => {
        try {
            setLoading(true);
            const limit = 24;
            const scrollPos = window.scrollY || document.documentElement.scrollTop;
            const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
            const sortParam = `&sort=${sort}`;
            const response = await fetch(`${API}/forumcontent?page=${pageNum}&limit=${limit}${searchParam}${sortParam}`);
            const newPosts = await response.json();
            if (newPosts.length === 0 || newPosts.length < limit) setHasMore(false);
            setOriginalList(prev => {
                if (pageNum === 1) return newPosts;
                const merged = [...prev, ...newPosts];
                return merged.reduce((acc, cur) => {
                    if (!acc.find(i => i.thread_id === cur.thread_id)) acc.push(cur);
                    return acc;
                }, []);
            });
            setTimeout(() => window.scrollTo(0, scrollPos), 0);
        } catch (err) {
            console.error(err.message);
            setHasMore(false);
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    }, []);

    const searchTimeout = useRef(null);

    const skipNextFetch = useRef(false);

    useEffect(() => {
        if (!newThread) return;
        skipNextFetch.current = true;
        setOriginalList(prev => [newThread, ...prev]);
    }, [newThread]);

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            if (skipNextFetch.current) {
                skipNextFetch.current = false;
                return;
            }
            fetchPostsWithImages(page, searchTerm, sortBy);
        }, 400);
        return () => clearTimeout(searchTimeout.current);
    }, [page, searchTerm, sortBy, fetchPostsWithImages]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetch(`${API}/userauthenticate`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            }).then(r => r.json()).then(data => { setUserId(data.id); });
        }
    }, []);

    useEffect(() => {
        const fetchInitialLikes = async () => {
            try {
                const [likeRes, dislikeRes] = await Promise.all([
                    fetch(`${API}/forumlikes`),
                    fetch(`${API}/forumdislikes`),
                ]);
                const likedata = await likeRes.json();
                const dislikedata = await dislikeRes.json();
                const combined = likedata.map(l => ({ post_id: l.post_id, like_count: l.like_count, dislike_count: 0 }));
                dislikedata.forEach(d => {
                    const idx = combined.findIndex(i => i.post_id === d.post_id);
                    if (idx !== -1) combined[idx].dislike_count = d.dislike_count;
                    else combined.push({ post_id: d.post_id, like_count: 0, dislike_count: d.dislike_count });
                });
                setNetLikesDislikes(combined.map(i => ({ post_id: i.post_id, net_likes: i.like_count - i.dislike_count })));
            } catch (err) { console.error(err.message); }
        };
        fetchInitialLikes();
    }, []);

    useEffect(() => {
        if (!userid) return;
        const fetchUserLikes = async () => {
            try {
                const response = await fetch(`${API}/userlikesdislikes?userid=${userid}`, {
                    headers: { 'Content-Type': 'application/json' },
                });
                const res = await response.json();
                if (Array.isArray(res)) {
                    const likes = {}, dislikes = {};
                    res.forEach(item => {
                        if (item.type === 'like') { likes[item.thread_id] = true; dislikes[item.thread_id] = false; }
                        else if (item.type === 'dislike') { likes[item.thread_id] = false; dislikes[item.thread_id] = true; }
                    });
                    setDislikedStatus(dislikes);
                    setInitialPosts(res);
                }
            } catch (err) { console.error(err); }
        };
        fetchUserLikes();
    }, [userid]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    function formatRelativeDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatCompactNumber(num) {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 10000) return `${Math.round(num / 1000)}k`;
        if (num >= 1000) return `${(num / 1000).toFixed(2)}k`.replace(/\.?0+k$/, 'k');
        return num.toString();
    }

    // ── Skeleton on first load ────────────────────────────────────────────────

    if (initialLoad && loading) {
        return (
            <Container fluid className="d-flex justify-content-center px-0">
                <div className="content-box">
                    <div className="feed-controls search-sort-wrapper">
                        <Row className="g-3 align-items-center">
                            <Col xs={12} lg={7}>
                                <InputGroup className="feed-control">
                                    <InputGroup.Text><BsSearch /></InputGroup.Text>
                                    <Form.Control type="text" placeholder="Search threads" disabled />
                                </InputGroup>
                            </Col>
                            <Col xs={12} lg={5}>
                                <InputGroup className="feed-control">
                                    <InputGroup.Text><BsSortDownAlt /></InputGroup.Text>
                                    <Form.Select disabled>
                                        <option>Sort by Newest</option>
                                    </Form.Select>
                                </InputGroup>
                            </Col>
                        </Row>
                    </div>
                    <SkeletonGrid count={12} />
                </div>
            </Container>
        );
    }

    // ── Main render ───────────────────────────────────────────────────────────

    return (
        <Container fluid className="d-flex justify-content-center px-0">
            <div className="content-box">
                <div className="feed-controls search-sort-wrapper">
                    <Row className="g-3 align-items-center">
                        <Col xs={12} lg={7}>
                            <InputGroup className="feed-control">
                                <InputGroup.Text><BsSearch /></InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Search threads"
                                    onChange={handleSearch}
                                />
                            </InputGroup>
                        </Col>
                        <Col xs={12} lg={5}>
                            <InputGroup className="feed-control">
                                <InputGroup.Text><BsSortDownAlt /></InputGroup.Text>
                                <Form.Select value={sortBy} onChange={handleSortChange}>
                                    <option value="newest">Sort by Newest</option>
                                    <option value="oldest">Sort by Oldest</option>
                                    <option value="mostPopular">Sort by Most Popular</option>
                                    <option value="Top">Sort by Top Liked</option>
                                </Form.Select>
                            </InputGroup>
                        </Col>
                    </Row>
                </div>

                <div className="forum-grid">
                    {list.map((e, index) => (
                        <div key={index} className="position-relative thread-card-wrap">

                            {/* ── Thread Card ─────────────────────────────── */}
                            <Card className="hover-card thread-card">
                                {/* Yellow left border accent */}
                                <div className="thread-card-accent" />

                                <Card.Body className="d-flex flex-column">
                                    <NavLink
                                        to={`/threads/${e.thread_id}`}
                                        className="nav-link flex-grow-1"
                                        state={{ forumContent: e }}
                                    >
                                        {/* Image — hidden cleanly when no filepath */}
                                        {e.filepath ? (
                                            <Card.Img
                                                src={e.filepath}
                                                className="mb-2 thread-card-image"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="thread-card-image--empty mb-2" />
                                        )}

                                        <Card.Title className="thread-title">{e.title}</Card.Title>
                                        <Card.Text className="thread-preview">{e.content}</Card.Text>
                                    </NavLink>

                                    {/* ── Card footer ─────────────────────── */}
                                    <div className="d-flex justify-content-between align-items-end mt-auto">

                                        {/* Left: votes + comment count */}
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="vote-buttons-container">
                                                <Button
                                                    variant={
                                                        likedStatus[e.thread_id] !== undefined
                                                            ? likedStatus[e.thread_id] ? 'success' : 'outline-success'
                                                            : initialposts.find(i => i.thread_id === e.thread_id && i.type === 'like')
                                                                ? 'success' : 'outline-success'
                                                    }
                                                    onClick={() => handleLike(e.thread_id)}
                                                    className="fixed-size-button"
                                                >
                                                    <BsArrowUp />
                                                </Button>

                                                <span className="vote-count">
                                                    {formatCompactNumber(
                                                        likesdislikes.find(item => item.post_id === e.thread_id)?.net_likes || 0
                                                    )}
                                                </span>

                                                <Button
                                                    variant={
                                                        dislikedStatus[e.thread_id] !== undefined
                                                            ? dislikedStatus[e.thread_id] ? 'danger' : 'outline-danger'
                                                            : initialposts.find(i => i.post_id === e.thread_id && i.type === 'dislike')
                                                                ? 'danger' : 'outline-danger'
                                                    }
                                                    onClick={() => handleDislike(e.thread_id)}
                                                    className="fixed-size-button"
                                                >
                                                    <BsArrowDown />
                                                </Button>
                                            </div>

                                            {/* Comment count badge */}
                                            <div className="comment-count-badge">
                                                <BsChatFill size={13} />
                                                <span>{e.comment_count ?? 0}</span>
                                            </div>
                                        </div>

                                        {/* Right: relative date + avatar + username */}
                                        <div className="text-end thread-author">
                                            <div className="text-muted thread-author-date">
                                                {formatRelativeDate(e.postdate)}
                                            </div>
                                            <div className="d-flex align-items-center justify-content-end gap-1 mt-1">
                                                {e.character_name && (
                                                    <Image
                                                        src={getImageUrl(e.character_name, e.selected_skin, 'header')}
                                                        roundedCircle
                                                        className="thread-author-avatar"
                                                        alt={e.username}
                                                    />
                                                )}
                                                <NavLink
                                                    to={`/userprofile/${e.username}/${e.users_id}`}
                                                    className="nav-link p-0 m-0 thread-author-name"
                                                >
                                                    {e.username}
                                                </NavLink>
                                            </div>
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* ── Three-dot action menu ────────────────────── */}
                            {(UserPermissions(userRole, e.users_id) || (userid && userid !== e.users_id)) && (
                                <div className="action-menu action-menu--card">
                                    <Button variant="light" className="three-dot-button action-menu__toggle" onClick={() => toggleMenu(index)}>
                                        <BsThreeDotsVertical />
                                    </Button>
                                    {showMenu === index && (
                                        <div className="position-absolute bg-light border rounded p-2 dropdown-animation action-dropdown">
                                            <ul className="list-unstyled mb-0">
                                                {userid && userid !== e.users_id && (
                                                    <li className="p-2">
                                                        <button className="btn btn-link" onClick={() => handleReport(e)}>Report</button>
                                                    </li>
                                                )}
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
                </div>

                {/* ── Pagination ────────────────────────────────────────────── */}
                <div className="forum-footer w-100 text-center mt-4 mb-4">
                    {hasMore && (
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={() => setPage(prev => prev + 1)}
                            disabled={loading}
                            className="see-more-btn"
                        >
                            {loading
                                ? <><span className="spinner-border spinner-border-sm me-2" />Loading...</>
                                : 'See More Posts'
                            }
                        </Button>
                    )}
                    {!hasMore && list.length > 0 && (
                        <div className="text-muted mt-48 mb-64 h6">You've reached the end of the content</div>
                    )}
                </div>
            </div>

            {/* ── Modals ────────────────────────────────────────────────────── */}
            <Modal show={showDeleteModal} onHide={DeleteClose} size="md" className="thread-action-modal" centered>
                <Modal.Header className="thread-action-modal__header">
                    <Modal.Title className="thread-action-modal__title">Delete Thread</Modal.Title>
                    <Button variant="close" onClick={DeleteClose} className="thread-action-modal__close" />
                </Modal.Header>
                <Modal.Body className="thread-action-modal__body">
                    <div className='text-center'>Are you sure you would like to delete this thread?</div>
                </Modal.Body>
                <Modal.Footer className="thread-action-modal__footer">
                    <Button size="lg" className="primary-btn" onClick={() => handleDelete(userRole)}>Confirm</Button>
                    <Button size="lg" className="secondary-btn" onClick={DeleteClose}>Cancel</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showEditModal} onHide={EditClose} size="lg" className="thread-action-modal" centered>
                <Modal.Header className="thread-action-modal__header">
                    <Modal.Title className="thread-action-modal__title">Edit Thread</Modal.Title>
                    <Button variant="close" onClick={EditClose} className="thread-action-modal__close" />
                </Modal.Header>
                <Modal.Body className="thread-action-modal__body">
                    <Form>
                        <Form.Group controlId="formParagraph">
                            <Form.Control type="text" placeholder="Title" value={editModalTitle}
                                onChange={(e) => setEditModalTitle(e.target.value)} className="mb-2" />
                            <Form.Control as="textarea" rows={5} placeholder="Enter content here"
                                value={editModalContent} onChange={(e) => setEditModalContent(e.target.value)} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="thread-action-modal__footer">
                    <Button size="lg" className="primary-btn" onClick={handleEditAsModerator}>Confirm</Button>
                    <Button size="lg" className="secondary-btn" onClick={EditClose}>Cancel</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="md" className="thread-action-modal" centered>
                <Modal.Header className="thread-action-modal__header">
                    <Modal.Title className="thread-action-modal__title">Report Thread</Modal.Title>
                    <Button variant="close" onClick={() => setShowReportModal(false)} className="thread-action-modal__close" />
                </Modal.Header>
                <Modal.Body className="thread-action-modal__body">
                    <Form>
                        <Form.Group controlId="formReportReason">
                            <Form.Label>Reason for reporting:</Form.Label>
                            {reportReasons.map(reason => (
                                <Form.Check label={reason} name="reportReason" type='radio' key={reason}
                                    onChange={() => setReportReason(reason)} />
                            ))}
                            <Form.Label className='mt-16'>Optional:</Form.Label>
                            <Form.Control as="textarea" rows={3}
                                placeholder="Please describe why you are reporting this thread..."
                                value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="thread-action-modal__footer">
                    <Button size="lg" className="primary-btn" onClick={handleReportSubmit} disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Report'}
                    </Button>
                    <Button size="lg" className="secondary-btn" onClick={() => setShowReportModal(false)}>Cancel</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default ListContent;
