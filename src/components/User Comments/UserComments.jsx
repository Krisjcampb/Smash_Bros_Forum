// src/components/UserComments.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Dropdown, Modal, Table, Image } from 'react-bootstrap';
import { FaEdit, FaTrash, FaCog } from 'react-icons/fa';
import { PiArrowFatUpFill, PiArrowFatDownFill, PiArrowFatUp, PiArrowFatDown } from "react-icons/pi";
import Form from 'react-bootstrap/Form';
import { toast } from 'react-toastify';
import TextMentionArea from './TextMentionArea';
import { API } from '../Utilities/apiUrl';

function UserComments({ userRole, userId, forumContent }) {
    const [comments, setComments] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showBanUserModal, setShowBanUserModal] = useState(false);
    const [editHistory, setEditHistory] = useState([]);
    const [currComment, setCurrComment] = useState('');
    const [content, setContent] = useState('');
    const [commentId, setCommentId] = useState(0);
    const [expandedRows, setExpandedRows] = useState([]);
    const [banReason, setBanReason] = useState('');
    const [banDuration, setBanDuration] = useState('');
    const [isPermanentBan, setIsPermanentBan] = useState(false);
    const [likedStatus, setLikedStatus] = useState({});
    const [dislikedStatus, setDislikedStatus] = useState({});
    const [likesdislikes, setNetLikesDislikes] = useState([]);
    const [initialComments, setInitialComments] = useState([]);
    const [sortMethod, setSortMethod] = useState('newest');
    const [showReportModal, setShowReportModal] = useState(false);
    const [currentComment, setCurrentComment] = useState({});
    const [reportReason, setReportReason] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    const [editMentions, setEditMentions] = useState([]);
    const contentInputRef = useRef(null);
    const token = localStorage.getItem('token');

    const sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'top', label: 'Top Rated' },
        { value: 'controversial', label: 'Most Controversial' }
    ];

    const reportReasons = [
        "Sexual content", "Hateful or abusive content", "Harmful or dangerous acts",
        "Promotes terrorism", "Repulsive or violent content", "Minor abuse or sexualization",
        "Spam", "Misinformation", "Self-harm or suicide",
    ];

    // ── Report ────────────────────────────────────────────────────────────────

    const handleReportComment = (comment) => {
        setCurrentComment(comment);
        setShowReportModal(true);
    };

    const handleReportSubmit = async () => {
        try {
            const response = await fetch(`${API}/commentreport`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    comment_id: currentComment.comment_id,
                    reported_user: currentComment.users_id,
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
        }
    };

    // ── Mentions renderer ─────────────────────────────────────────────────────

    const renderMentions = (text, mentions = []) => {
        if (!text) return null;
        if (!mentions || mentions.length === 0) return text;

        const elements = [];
        let lastIndex = 0;
        const sortedMentions = [...mentions].sort((a, b) => a.position - b.position);

        sortedMentions.forEach((mention, index) => {
            const { position, length } = mention;
            if (typeof position !== "number" || typeof length !== "number" ||
                position < 0 || position + length > text.length) return;

            if (position > lastIndex) {
                elements.push(<span key={`text-${index}`}>{text.slice(lastIndex, position)}</span>);
            }
            elements.push(
                <span key={`mention-${index}`} className="render-mention">
                    {text.slice(position, position + length)}
                </span>
            );
            lastIndex = position + length;
        });

        if (lastIndex < text.length) {
            elements.push(<span key="text-end">{text.slice(lastIndex)}</span>);
        }
        return elements;
    };

    // ── Sort ──────────────────────────────────────────────────────────────────

    const sortComments = (comments, likesData, method) => {
        const merged = comments.map(comment => {
            const likeInfo = likesData.find(item => item.comment_id === comment.comment_id) || { net_likes: 0 };
            return { ...comment, net_likes: likeInfo.net_likes, total_votes: Math.abs(likeInfo.net_likes) };
        });
        switch (method) {
            case 'newest': return merged.sort((a, b) => new Date(b.timeposted) - new Date(a.timeposted));
            case 'oldest': return merged.sort((a, b) => new Date(a.timeposted) - new Date(b.timeposted));
            case 'top': return merged.sort((a, b) => b.net_likes - a.net_likes);
            case 'controversial': return merged.sort((a, b) => b.total_votes - a.total_votes);
            default: return merged;
        }
    };

    // ── Date formatter ────────────────────────────────────────────────────────

    const updatedNums = (time) => {
        try {
            const parsedDate = new Date(time);
            if (isNaN(parsedDate)) throw new Error('Invalid date');
            return new Intl.DateTimeFormat('en-US', {
                year: '2-digit', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: true
            }).format(parsedDate);
        } catch (error) {
            return 'Invalid date';
        }
    };

    const UserPermissions = (role) => role === 'admin' || role === 'moderator';
    const UsersCommentCheck = (users_id) => userId === users_id;

    const handleRowClick = (index) => {
        setExpandedRows(prev =>
            prev.includes(index) ? prev.filter(r => r !== index) : [...prev, index]
        );
    };

    // ── Data fetching ─────────────────────────────────────────────────────────

    const getComments = useCallback(async () => {
        try {
            const userParam = userId ? `?userid=${userId}` : '';
            const response = await fetch(`${API}/forumcomments/${forumContent.thread_id}${userParam}`);
            const jsonData = await response.json();
            setComments(jsonData);
        } catch (err) {
            console.error(err.message);
        }
    }, [forumContent.thread_id, userId]);

    const getEditHistory = async (commentId) => {
        try {
            const response = await fetch(`${API}/edithistory/${commentId}`);
            const jsonData = await response.json();
            setEditHistory(jsonData);
        } catch (err) {
            console.error(err.message);
        }
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────

    const EditComment = async () => {
        try {
            const response = await fetch(`${API}/forumcomments/${commentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ content, mentions: editMentions, userId }),

            });
            if (response.ok) {
                setShowEditModal(false);
                getComments();
                toast.success('Comment updated.');
            } else {
                toast.error('Failed to update comment.');
            }
        } catch (err) {
            console.error(err.message);
            toast.error('Something went wrong.');
        }
    };

    const DeleteComment = async () => {
        try {
            const response = await fetch(`${API}/forumcomments/${commentId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.ok) {
                setShowDeleteModal(false);
                getComments();
                toast.success('Comment deleted.');
            } else {
                toast.error('Failed to delete comment.');
            }
        } catch (err) {
            console.error(err.message);
            toast.error('Something went wrong.');
        }
    };

    const BanUser = async () => {
        try {
            const duration = isPermanentBan ? -1 : banDuration;
            const response = await fetch(`${API}/forumusers/${userId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ banReason, banDuration: duration, commentId }),
            });
            if (response.ok) {
                setShowBanUserModal(false);
                getComments();
                toast.success('User banned successfully.');
            } else {
                toast.error('Failed to ban user.');
            }
        } catch (err) {
            console.error(err.message);
            toast.error('Something went wrong.');
        }
    };

    // ── Likes / Dislikes ──────────────────────────────────────────────────────

    const fetchData = async () => {
        try {
            const [likecount, dislikecount] = await Promise.all([
                fetch(`${API}/commentlikes`),
                fetch(`${API}/commentdislikes`),
            ]);
            const likedata = await likecount.json();
            const dislikedata = await dislikecount.json();

            const netLikesToDislikes = likedata.map(like => ({
                comment_id: like.comment_id, like_count: like.like_count, dislike_count: 0,
            }));
            dislikedata.forEach(dislike => {
                const index = netLikesToDislikes.findIndex(item => item.comment_id === dislike.comment_id);
                if (index !== -1) netLikesToDislikes[index].dislike_count = dislike.dislike_count;
                else netLikesToDislikes.push({ comment_id: dislike.comment_id, like_count: 0, dislike_count: dislike.dislike_count });
            });
            setNetLikesDislikes(netLikesToDislikes.map(item => ({
                comment_id: item.comment_id,
                net_likes: item.like_count - item.dislike_count,
            })));
        } catch (err) {
            console.error(err.message);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (!userId) return;
        const fetchUserReactions = async () => {
            try {
                const response = await fetch(`${API}/commentlikesdislikes?userid=${userId}`, {
                    headers: { 'Content-Type': 'application/json' },
                });
                const res = await response.json();
                if (Array.isArray(res)) {
                    const likes = {}, dislikes = {};
                    res.forEach(item => {
                        if (item.type === 'like') { likes[item.comment_id] = true; dislikes[item.comment_id] = false; }
                        else if (item.type === 'dislike') { likes[item.comment_id] = false; dislikes[item.comment_id] = true; }
                    });
                    setLikedStatus(likes);
                    setDislikedStatus(dislikes);
                    setInitialComments(res);
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchUserReactions();
    }, [userId]);

    const handleLike = async (comment_id) => {
        const initialType = initialComments.find(c => c.comment_id === comment_id)?.type;
        const isCurrentlyLiked = likedStatus[comment_id] ?? (initialType === 'like');

        setLikedStatus(prev => ({ ...prev, [comment_id]: !isCurrentlyLiked }));
        setDislikedStatus(prev => ({ ...prev, [comment_id]: false }));
        setInitialComments(prev => {
            const exists = prev.some(c => c.comment_id === comment_id);

            if (exists) {
                return prev.map(c =>
                    c.comment_id === comment_id
                        ? { ...c, type: isCurrentlyLiked ? null : 'like' }
                        : c
                );
            }

            return [
                ...prev,
                {
                    comment_id,
                    type: isCurrentlyLiked ? null : 'like'
                }
            ];
        });

        try {
            const response = await fetch(`${API}/commentlikes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ comment_id }),
            });
            if (response.ok) {
                fetchData();
                if (!isCurrentlyLiked) toast.success('👍 Comment liked!', { autoClose: 1500, hideProgressBar: true });
            } else {
                toast.error('Failed to like comment.');
            }
        } catch (error) {
            toast.error('Failed to like comment.');
        }
    };

    const handleDislike = async (comment_id) => {
        const initialType = initialComments.find(c => c.comment_id === comment_id)?.type;
        const isCurrentlyDisliked = dislikedStatus[comment_id] ?? (initialType === 'dislike');

        setDislikedStatus(prev => ({ ...prev, [comment_id]: !isCurrentlyDisliked }));
        setLikedStatus(prev => ({ ...prev, [comment_id]: false }));
        setInitialComments(prev => {
            const exists = prev.some(c => c.comment_id === comment_id);

            if (exists) {
                return prev.map(c =>
                    c.comment_id === comment_id
                        ? { ...c, type: isCurrentlyDisliked ? null : 'dislike' }
                        : c
                );
            }

            return [
                ...prev,
                {
                    comment_id,
                    type: isCurrentlyDisliked ? null : 'dislike'
                }
            ];
        });

        try {
            const response = await fetch(`${API}/commentdislikes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ comment_id }),
            });
            if (response.ok) fetchData();
            else toast.error('Failed to dislike comment.');
        } catch (error) {
            toast.error('Failed to dislike comment.');
        }
    };

    // ── Modal helpers ─────────────────────────────────────────────────────────

    const getProfileImageUrl = (characterName, selectedSkin) => {
        if (!characterName) return `${process.env.REACT_APP_CDN_URL}/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/Mario/chara_3_mario_00.png`;
        return `${process.env.REACT_APP_CDN_URL}/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${characterName}/chara_0_${characterName.toLowerCase()}_0${selectedSkin}.png`;
    };

    const handleEditComment = (commentId, commentContent, commentMentions = []) => {
        setCommentId(commentId);
        setContent(commentContent);
        setCurrComment(commentContent);
        setEditMentions(commentMentions);
        setShowEditModal(true);
    };

    const handleDeleteComment = (id) => {
        setCommentId(id);
        setShowDeleteModal(true);
    };

    const handleModerationOption = (option, commentId, currcomment) => {
        setCommentId(commentId);
        setContent(currcomment);
        setCurrComment(currcomment);
        if (option === 'Option 1') { getEditHistory(commentId); setShowHistoryModal(true); }
        if (option === 'Option 2') setShowEditModal(true);
        if (option === 'Option 3') setShowDeleteModal(true);
        if (option === 'Option 4') setShowBanUserModal(true);
    };

    useEffect(() => { getComments(); }, [getComments]);

    useEffect(() => {
        if (typeof window !== 'undefined' && showEditModal && contentInputRef.current) {
            contentInputRef.current.focus();
        }
    }, [showEditModal]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Sort dropdown */}
            <div className="comments-container-flex">
                <Dropdown className="sort-dropdown">
                    <Dropdown.Toggle variant="outline-secondary" id="dropdown-sort">
                        <span className="me-2">Sort:</span>
                        {sortOptions.find(opt => opt.value === sortMethod)?.label || 'Newest First'}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        {sortOptions.map(option => (
                            <Dropdown.Item
                                key={option.value}
                                active={sortMethod === option.value}
                                onClick={() => setSortMethod(option.value)}
                            >
                                {option.label}
                            </Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                </Dropdown>
            </div>

            {/* Comments list */}
            <div className="comments-container">
                {comments && Array.isArray(comments)
                    ? sortComments(comments, likesdislikes || [], sortMethod).map(comment => (
                        <div key={comment.comment_id} className="comment-card">
                            <div className="comment-header">
                                <Link to={`/userprofile/${comment.username}/${comment.users_id}`}
                                    className="text-white text-decoration-none">
                                    <strong>{comment.username}</strong>
                                </Link>
                                <span className="comment-meta">{updatedNums(comment.timeposted)}</span>
                            </div>

                            <div className="comment-body">
                                <div className="vote-section">
                                    <button
                                        className={`vote-button like-button ${likedStatus[comment.comment_id] ? 'active-like' : ''}`}
                                        onClick={() => handleLike(comment.comment_id)}
                                    >
                                        {likedStatus[comment.comment_id]
                                            ? <PiArrowFatUpFill size={20} />
                                            : <PiArrowFatUp size={20} />
                                        }
                                    </button>
                                    <span className="vote-count">{comment.net_likes ?? 0}</span>
                                    <button
                                        className={`vote-button dislike-button ${dislikedStatus[comment.comment_id] ? 'active-dislike' : ''}`}
                                        onClick={() => handleDislike(comment.comment_id)}
                                    >
                                        {dislikedStatus[comment.comment_id]
                                            ? <PiArrowFatDownFill size={20} />
                                            : <PiArrowFatDown size={20} />
                                        }
                                    </button>
                                </div>

                                <div className="user-section">
                                    <Image
                                        src={getProfileImageUrl(comment.character_name, comment.selected_skin)}
                                        alt="User Profile"
                                        className="user-avatar"
                                    />
                                    <span className={`badge role-badge ${comment.role}`}>
                                        {comment.role.charAt(0).toUpperCase() + comment.role.slice(1)}
                                    </span>
                                </div>

                                <div className="comment-content">
                                    {typeof comment.comment === 'string'
                                        ? renderMentions(comment.comment, comment.mentions || [])
                                        : comment.comment
                                    }
                                </div>
                            </div>

                            <div className="comment-footer">
                                <div className="footer-content">
                                    {UsersCommentCheck(comment.users_id) && (
                                        <div className="action-buttons">
                                            <button className="action-button btn-edit"
                                                onClick={() => handleEditComment(comment.comment_id, comment.comment, comment.mentions)}>
                                                <FaEdit size={14} /> Edit
                                            </button>
                                            <button className="action-button btn-delete"
                                                onClick={() => handleDeleteComment(comment.comment_id)}>
                                                <FaTrash size={14} /> Delete
                                            </button>
                                        </div>
                                    )}
                                    {comment.users_id !== userId && (
                                        <button className="action-button report-button"
                                            onClick={() => handleReportComment(comment)}>
                                            Report
                                        </button>
                                    )}
                                    {UserPermissions(userRole) && (
                                        <div className="moderation-tools">
                                            <Dropdown>
                                                <button type="button" className="action-button mod-tools-button">
                                                    <FaCog size={14} /> Mod Tools
                                                </button>
                                                <Dropdown.Menu>
                                                    <Dropdown.Item onClick={() => handleModerationOption('Option 1', comment.comment_id, comment.comment)}>
                                                        View Edit History
                                                    </Dropdown.Item>
                                                    <Dropdown.Item onClick={() => handleModerationOption('Option 2', comment.comment_id, comment.comment)}>
                                                        Edit Comment
                                                    </Dropdown.Item>
                                                    <Dropdown.Item onClick={() => handleModerationOption('Option 3', comment.comment_id, comment.comment)}>
                                                        Delete Comment
                                                    </Dropdown.Item>
                                                    <Dropdown.Item onClick={() => handleModerationOption('Option 4', comment.users_id, comment.username)}>
                                                        Ban User
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                    : <div className="text-center py-5 text-muted">No comments found</div>
                }
            </div>

            {/* ── Edit Modal ────────────────────────────────────────────────── */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
                {/* Header */}
                <div className="edit-modal-header">
                    <div>
                        <div className="edit-modal-badge">Edit Comment</div>
                        <h5 className="edit-modal-title">Update Your Comment</h5>
                    </div>
                    <button className="edit-modal-close" onClick={() => setShowEditModal(false)}>
                        ×
                    </button>
                </div>

                <Form onSubmit={(e) => { e.preventDefault(); EditComment(); }}>
                    <Modal.Body className="edit-modal-body">
                        {/* Original comment section */}
                        <div className="original-comment-box">
                            <Form.Label className="original-comment-label">
                                Original Comment
                            </Form.Label>
                            <div className="original-comment-text">
                                {currComment}
                            </div>
                        </div>

                        {/* Edit section */}
                        <Form.Group>
                            <Form.Label className="new-comment-label">
                                New Comment
                            </Form.Label>
                            <TextMentionArea
                                value={content}
                                onChange={setContent}
                                mentions={editMentions}
                                setMentions={setEditMentions}
                                rows={4}
                                placeholder="Update your comment..."
                                maxLength={500}
                            />
                        </Form.Group>
                    </Modal.Body>

                    <Modal.Footer className="edit-modal-footer">
                        <button type="submit" className="primary-btn">
                            Save Changes
                        </button>
                        <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => setShowEditModal(false)}
                        >
                            Cancel
                        </button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* ── Delete Modal ──────────────────────────────────────────────── */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Form onSubmit={(e) => { e.preventDefault(); DeleteComment(); }}>
                    <Modal.Body>
                        <Form.Label>Are you sure you would like to delete this comment?</Form.Label>
                    </Modal.Body>
                    <Modal.Footer>
                        <button type='submit' className="primary-btn">Confirm Deletion</button>
                        <button type="button" className="secondary-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* ── Edit History Modal ────────────────────────────────────────── */}
            <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} size="xl">
                <div className="edit-modal-header">
                    <div>
                        <div className="edit-modal-badge">History</div>
                        <h5 className="edit-modal-title">Comment Edit History</h5>
                    </div>
                    <button className="edit-modal-close" onClick={() => setShowHistoryModal(false)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                    </button>
                </div>
                <Modal.Body>
                    <Table striped bordered hover>
                        <thead>
                            <tr className="text-center">
                                <th>Old Content</th>
                                <th>New Content</th>
                                <th>Edited By</th>
                                <th>Edit Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editHistory.map((history, index) => {
                                const isExpanded = expandedRows.includes(index);
                                return (
                                    <tr key={index}>
                                        <td className={isExpanded ? 'expanded-text' : 'truncate-text'} onClick={() => handleRowClick(index)}>
                                            {history.old_content}
                                        </td>
                                        <td className={isExpanded ? 'expanded-text' : 'truncate-text'} onClick={() => handleRowClick(index)}>
                                            {history.new_content}
                                        </td>
                                        <td className="text-center edited-by">{history.edited_by}</td>
                                        <td className="text-center edit-timestamp">
                                            {new Date(history.edit_timestamp).toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer className="edit-modal-footer">
                    <button type="button" className="secondary-btn" onClick={() => setShowHistoryModal(false)}>Close</button>
                </Modal.Footer>
            </Modal>

            {/* ── Ban User Modal ────────────────────────────────────────────── */}
            <Modal show={showBanUserModal} onHide={() => setShowBanUserModal(false)}>
                <Form onSubmit={(e) => { e.preventDefault(); BanUser(); }}>
                    <Modal.Body>
                        <Form.Label className="ban-user-form-label">
                            Are you sure you want to ban the following user?
                        </Form.Label>
                        <Form.Control
                            type='button' value={content} readOnly className="text-center"
                        />
                        <Form.Control
                            as='textarea' rows={3} value={banReason}
                            placeholder='Reason for banning'
                            onChange={(e) => setBanReason(e.target.value)}
                            ref={contentInputRef}
                        />
                        <Form.Group controlId="banDuration">
                            <Form.Label>Ban Duration (in days)</Form.Label>
                            <Form.Control
                                type="number" value={banDuration}
                                onChange={(e) => setBanDuration(e.target.value)}
                                placeholder="Enter the ban duration in days"
                                required disabled={isPermanentBan}
                            />
                        </Form.Group>
                        <Form.Group controlId="isPermanentBan">
                            <Form.Check
                                type="checkbox" label="Permanent Ban"
                                checked={isPermanentBan}
                                onChange={(e) => setIsPermanentBan(e.target.checked)}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <div className="edit-modal-footer">
                        <button type="button" className="secondary-btn muted" onClick={() => setShowBanUserModal(false)}>Cancel</button>
                        <button type='submit' className='primary-btn'>Confirm Ban</button>
                    </div>
                </Form>
            </Modal>

            {/* ── Report Modal ──────────────────────────────────────────────── */}
            <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="md" centered>
                <div className="settings-modal-header">
                    <div>
                        <div className="settings-modal-badge">Report</div>
                        <h5 className="edit-modal-title">Report Comment</h5>
                    </div>
                    <button className="edit-modal-close" onClick={() => setShowReportModal(false)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                    </button>
                </div>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="formReportReason">
                            <Form.Label>Reason for reporting:</Form.Label>
                            {reportReasons.map(reason => (
                                <Form.Check
                                    label={reason} name="reportReason" type='radio' key={reason}
                                    onChange={() => setReportReason(reason)}
                                />
                            ))}
                            <Form.Label className="form-label-optional">Optional:</Form.Label>
                            <Form.Control
                                as="textarea" rows={3}
                                placeholder="Please describe why you are reporting this comment..."
                                value={reportDescription}
                                onChange={(e) => setReportDescription(e.target.value)}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <div className="edit-modal-footer">
                    <button type="button" className="primary-btn" onClick={handleReportSubmit}>Submit Report</button>
                    <button type="button" className="secondary-btn" onClick={() => setShowReportModal(false)}>Cancel</button>
                </div>
            </Modal>
        </>
    );
}

export default UserComments;