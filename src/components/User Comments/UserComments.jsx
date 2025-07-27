import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Button, Dropdown, Modal, Table, Image } from 'react-bootstrap';
import { FaEdit, FaTrash, FaCog } from 'react-icons/fa';
import { PiArrowFatUpFill, PiArrowFatDownFill, PiArrowFatUp, PiArrowFatDown } from "react-icons/pi";
import Form from 'react-bootstrap/Form';

function UserComments({ userRole, userId, forumContent, renderMentions }) {
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
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const contentInputRef = useRef(null);

    const sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'top', label: 'Top Rated' },
        { value: 'controversial', label: 'Most Controversial' }
    ];

    const sortComments = (comments, likesData, method) => {
        const merged = comments.map(comment => {
            const likeInfo = likesData.find(item => item.comment_id === comment.comment_id) || { net_likes: 0 };
            return {
                ...comment,
                net_likes: likeInfo.net_likes,
                total_votes: Math.abs(likeInfo.net_likes)
            };
        });

        switch(method) {
            case 'newest':
                return merged.sort((a, b) => new Date(b.timeposted) - new Date(a.timeposted));
            case 'oldest':
                return merged.sort((a, b) => new Date(a.timeposted) - new Date(b.timeposted));
            case 'top':
                return merged.sort((a, b) => b.net_likes - a.net_likes);
            case 'controversial':
                return merged.sort((a, b) => b.total_votes - a.total_votes);
            default:
                return merged;
        }
    };

    const updatedNums = (time) => {
        try {
            const parsedDate = new Date(time);
            if (isNaN(parsedDate)) {
                throw new Error('Invalid date format');
            }
            return new Intl.DateTimeFormat('en-US', {
                year: '2-digit',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(parsedDate);
        } catch (error) {
            console.error('Error formatting date:', error.message);
            return 'Invalid date';
        }
    };

    const UserPermissions = (userRole) => {
        return userRole === 'admin' || userRole === 'moderator';
    };

    const UsersCommentCheck = (users_id) => {
        return userId === users_id;
    };

    const handleRowClick = (index) => {
        setExpandedRows(prevExpandedRows => {
            if (prevExpandedRows.includes(index)) {
                return prevExpandedRows.filter(row => row !== index);
            } else {
                return [...prevExpandedRows, index];
            }
        });
    };

    const getComments = useCallback(async () => {
        try {
            const response = await fetch(`http://localhost:5000/forumcomments/${forumContent.thread_id}`);
            const jsonData = await response.json();
            setComments(jsonData);
        } catch (err) {
            console.error(err.message);
        }
    }, [forumContent.thread_id]);

    const getEditHistory = async (commentId) => {
        try {
            const response = await fetch(`http://localhost:5000/edithistory/${commentId}`);
            const jsonData = await response.json();
            setEditHistory(jsonData);
        } catch (err) {
            console.error(err.message);
        }
    };
    const EditComment = async () => {
        try {
            const response = await fetch(`http://localhost:5000/forumcomments/${commentId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json',},
                body: JSON.stringify({ content, userId })
            });
            
            if (response.ok){
                console.log('Comment updated successfully');
                setShowEditModal(false);
                getComments();
            }
            else{
                throw new Error(`Failed to update comment (status ${response.status})`);
            }
        } catch (err) {
            console.error('Error updating comment:', err.message);
        }
    };
    const DeleteComment = async () => {
        console.log(commentId)
        try {
            const response = await fetch(`http://localhost:5000/forumcomments/${commentId}`, {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
            });
            
            if (response.ok){
                console.log('Comment deleted successfully');
                setShowDeleteModal(false);
                getComments();
            }
            else{
                throw new Error(`Failed to delete comment (status ${response.status})`);
            }
        } catch (err) {
            console.error('Error updating comment:', err.message);
        }
    }
    const BanUser = async () => {
        try {
            const duration = isPermanentBan ? -1 : banDuration;
            const response = await fetch(`http://localhost:5000/forumusers/${userId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ banReason, banDuration: duration, commentId }),
            });

            if (response.ok) {
                console.log('User banned successfully');
                setShowBanUserModal(false);
                getComments();
            } else {
                throw new Error(`Failed to ban user (status ${response.status})`);
            }
        } catch (err) {
            console.error('Error banning user:', err.message);
        }
    };

    const fetchData = async () => {
        try {
            const [likecount, dislikecount] = await Promise.all([
                fetch('http://localhost:5000/commentlikes'),
                fetch('http://localhost:5000/commentdislikes'),
            ])
            const likedata = await likecount.json();
            const dislikedata = await dislikecount.json();

            const netLikesToDislikes = likedata.map((like) => ({
                comment_id: like.comment_id,
                like_count: like.like_count,
                dislike_count: 0,
            }));
            dislikedata.forEach((dislike) => {
                const index = netLikesToDislikes.findIndex((item) => item.comment_id === dislike.comment_id);
                if (index !== -1) {
                    netLikesToDislikes[index].dislike_count = dislike.dislike_count;
                } else {
                    netLikesToDislikes.push({
                        comment_id: dislike.comment_id,
                        like_count: 0,
                        dislike_count: dislike.dislike_count,
                    });
                }
            });
            const netLikesDislikes = netLikesToDislikes.map((item) => ({
                comment_id: item.comment_id,
                net_likes: item.like_count - item.dislike_count,
            }));
            setNetLikesDislikes(netLikesDislikes)
            console.log("likes: ", likedata)
            console.log("likes and dislikes: ", netLikesDislikes)
        }
        catch (err) {
            console.error(err.message)
        }
    }

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchData();
        }, 100);

        return () => clearTimeout(timeout);
    }, [likedStatus, dislikedStatus]);

    useEffect(() => {
        const fetchdata2 = async () => {
            try {
                // setLoading(true);
                const response = await fetch(`http://localhost:5000/commentlikesdislikes?userid=${userId}`, {
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
                            initialLikedStatus[item.comment_id] = true;
                            initialDislikedStatus[item.comment_id] = false;
                        } else if (item.type === 'dislike') {
                            initialLikedStatus[item.comment_id] = false;
                            initialDislikedStatus[item.comment_id] = true;
                        }
                    });

                    console.log("Initial Liked Status: ", initialLikedStatus);
                    console.log("Initial Disliked Status: ", initialDislikedStatus);

                    setLikedStatus(initialLikedStatus);
                    setDislikedStatus(initialDislikedStatus);

                    setInitialComments(res);
                } else {
                    console.error('Response is not an array:', res);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                // setLoading(false);
            }
        };

        if (userId) {
            fetchdata2();
        }
    }, [userId]);
    

    const handleLike = async (comment_id) => {
        try {
            const initialType = initialComments.find(c => c.comment_id === comment_id)?.type;
            const isCurrentlyLiked = likedStatus[comment_id] ?? (initialType === 'like');

            setLikedStatus(prevStatus => ({
                ...prevStatus,
                [comment_id]: !isCurrentlyLiked
            }));

            setDislikedStatus(prevStatus => ({
                ...prevStatus,
                [comment_id]: false
            }));

            setInitialComments(prevComments =>
                prevComments.map(comment =>
                    comment.comment_id === comment_id
                        ? { ...comment, type: isCurrentlyLiked ? null : 'like' }
                        : comment
                )
            );

            const response = await fetch('http://localhost:5000/commentlikes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, comment_id }),
            });

            if (!response.ok) {
                console.error('Error liking post:', await response.json().error);
            } else {
                fetchData();
            }
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const handleDislike = async (comment_id) => {
        try {
            const initialType = initialComments.find(c => c.comment_id === comment_id)?.type;
            const isCurrentlyDisliked = dislikedStatus[comment_id] ?? (initialType === 'dislike');

            setDislikedStatus(prevStatus => ({
                ...prevStatus,
                [comment_id]: !isCurrentlyDisliked
            }));
            
            setLikedStatus(prevStatus => ({
                ...prevStatus,
                [comment_id]: false
            }));

            setInitialComments(prevComments =>
                prevComments.map(comment =>
                    comment.comment_id === comment_id
                        ? { ...comment, type: isCurrentlyDisliked ? null : 'dislike' }
                        : comment
                )
            );

            const response = await fetch('http://localhost:5000/commentdislikes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, comment_id }),
            });

            if (!response.ok) {
                console.error('Error disliking post:', await response.json().error);
            }
            else {
                fetchData();
            }
        } catch (error) {
            console.error('Error disliking post:', error);
        }
    };

    const getProfileImageUrl = (characterName, selectedSkin) => {
        if (!characterName) {
            return '/path/to/default/profile_image.png';
        }
        return `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${characterName}/chara_0_${characterName.toLowerCase()}_0${selectedSkin}.png`;
    };

    const handleEditComment = (commentId) => {
        setShowEditModal(true);
    };

    const handleDeleteComment = (commentId) => {
        setShowDeleteModal(true);
    };

    const handleModerationOption = (option, commentId, currcomment) => {
        setCommentId(commentId)
        setContent(currcomment)
        setCurrComment(currcomment)
        if(option === 'Option 1'){
            getEditHistory(commentId)
            setShowHistoryModal(true)
        }
        if(option === 'Option 2'){
            setShowEditModal(true)
        }
        if(option === 'Option 3'){
            setShowDeleteModal(true)
        }
        if(option === 'Option 4'){
            setShowBanUserModal(true)
        }
    };

    useEffect(() => {
        getComments();
        UserPermissions();
    }, [getComments]);

    useEffect(() => {
        if (typeof window !== 'undefined' && showEditModal && contentInputRef.current) {
            contentInputRef.current.focus();
        }
    }, [showEditModal]);

return (
  <>
    <div className="d-flex justify-content-end mb-4">
      <Dropdown className="sort-dropdown">
        <Dropdown.Toggle variant="outline-secondary" id="dropdown-sort">
          <span className="me-2">Sort:</span> 
          {sortOptions.find(opt => opt.value === sortMethod)?.label || 'Newest First'}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {sortOptions.map((option) => (
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

    <div className="comments-container">
      {comments && Array.isArray(comments) 
        ? sortComments(comments, likesdislikes || [], sortMethod).map((comment) => (
            <div key={comment.comment_id} className="comment-card">
              <div className="comment-header">
                <Link 
                  to={`/userprofile/${comment.username}/${comment.users_id}`} 
                  className="text-white text-decoration-none"
                >
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
                    {likedStatus[comment.comment_id] ? (
                      <PiArrowFatUpFill size={20} />
                    ) : (
                      <PiArrowFatUp size={20} />
                    )}
                  </button>
                  <span className="vote-count">{comment.net_likes ?? 0}</span>
                  <button
                    className={`vote-button dislike-button ${dislikedStatus[comment.comment_id] ? 'active-dislike' : ''}`}
                    onClick={() => handleDislike(comment.comment_id)}
                  >
                    {dislikedStatus[comment.comment_id] ? (
                      <PiArrowFatDownFill size={20} />
                    ) : (
                      <PiArrowFatDown size={20} />
                    )}
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
                  {renderMentions && typeof comment.comment === 'string' ? 
                    renderMentions(comment.comment, comment.mentions || []) : 
                    comment.comment
                  }
                </div>
              </div>

<div className="comment-footer">
  <div className="footer-content">
    {UsersCommentCheck(comment.users_id) && (
      <div className="action-buttons">
        <button 
          className="action-button btn-edit"
          onClick={() => handleEditComment(comment.comment_id)}
        >
          <FaEdit size={14} /> Edit
        </button>
        <button
          className="action-button btn-delete"
          onClick={() => handleDeleteComment(comment.comment_id)}
        >
          <FaTrash size={14} /> Delete
        </button>
      </div>
    )}
    
    {UserPermissions(userRole) && (
      <div className="moderation-tools">
        <Dropdown>
          <Dropdown.Toggle as={Button} variant="link" className="action-button">
            <FaCog size={14} /> Mod Tools
          </Dropdown.Toggle>
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
            {/* Edit Comment Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Form onSubmit={(e) => {
                    e.preventDefault();
                    EditComment();
                }}>
                    <Modal.Body>
                        <Form.Label>Original Comment</Form.Label>
                        <br />
                        <Form.Control
                            type='text'
                            value={currComment}
                            readOnly
                        />
                        <br/>
                        <Form.Label>Editing Comment</Form.Label>
                        <Form.Control
                            type='text'
                            value={content}
                            placeholder='Editing Comment'
                            onChange={(e) => setContent(e.target.value)}
                            ref={contentInputRef}
                        />
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type='submit' onClick={() => setShowEditModal(false)}>
                            Confirm Changes
                        </Button>
                        <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Delete Comment Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Form onSubmit={(e) => {
                    e.preventDefault();
                    DeleteComment();
                }}>
                    <Modal.Body>
                        <Form.Label>Are you sure you would like to delete this comment?</Form.Label>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type='submit' onClick={() => setShowDeleteModal(false)}>
                            Confirm Deletion
                        </Button>
                        <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                            Cancel
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/*Edit History Modal */}
            <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>Edit History</Modal.Title>
                </Modal.Header>
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
                                    <td
                                        className={isExpanded ? 'expanded-text' : 'truncate-text'}
                                        onClick={() => handleRowClick(index)}
                                    >
                                        {history.old_content}
                                    </td>
                                    <td
                                        className={isExpanded ? 'expanded-text' : 'truncate-text'}
                                        onClick={() => handleRowClick(index)}
                                    >
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
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
            
            {/* Ban User Modal */}
            <Modal show={showBanUserModal} onHide={() => setShowBanUserModal(false)}>
                <Form onSubmit={(e) => {
                    e.preventDefault();
                    BanUser();
                }}>
                    <Modal.Body>
                        <Form.Label className="text-center" style={{width: "100%"}}>Are you sure you want to ban the following user?</Form.Label>
                        <Form.Control
                            type='button'
                            value={content}
                            readOnly
                            className="text-center"
                            style={{ width: '50%', margin: 'auto' }}
                        />
                        <br/>
                        <Form.Control
                            as='textarea'
                            rows={3}
                            value={banReason}
                            placeholder='Reason for banning'
                            onChange={(e) => setBanReason(e.target.value)}
                            ref={contentInputRef}
                        />
                        <Form.Group controlId="banDuration">
                            <Form.Label>Ban Duration (in days)</Form.Label>
                            <Form.Control
                                type="number"
                                value={banDuration}
                                onChange={(e) => setBanDuration(e.target.value)}
                                placeholder="Enter the ban duration in days"
                                required
                                disabled={isPermanentBan}
                            />
                        </Form.Group>
                        <Form.Group controlId="isPermanentBan">
                            <Form.Check
                                type="checkbox"
                                label="Permanent Ban"
                                checked={isPermanentBan}
                                onChange={(e) => setIsPermanentBan(e.target.checked)}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="justify-content-center">
                        <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowBanUserModal(false)}>
                            Cancel
                        </Button>
                        <Button type='submit' variant='danger' style={{ flex: 1 }}>
                            Confirm Ban
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </>
    );
}

export default UserComments;