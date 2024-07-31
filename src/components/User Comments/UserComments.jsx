import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Container, Row, Col, Button, Dropdown, Modal, Table } from 'react-bootstrap';
import { FaEdit, FaTrash, FaCog } from 'react-icons/fa';
import Form from 'react-bootstrap/Form'

function UserComments(props) {
    const [comments, setComments] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showBanUserModal, setShowBanUserModal] = useState(false);
    const [editHistory, setEditHistory] = useState([])
    const [currComment, setCurrComment] = useState('')
    const [content, setContent] = useState('')
    const [commentId, setCommentId] = useState(0)
    const [expandedRows, setExpandedRows] = useState([]);
    const [banReason, setBanReason] = useState('')
    const [banDuration, setBanDuration] = useState('');
    const [isPermanentBan, setIsPermanentBan] = useState(false);
    const { userRole, userId } = props;
    const location = useLocation();
    const contentInputRef = useRef(null)
    
    const updatedNums = (time) => {
    try {
        const parsedDate = new Date(time);

        if (isNaN(parsedDate)) {
            throw new Error('Invalid date format');
        }

        // Format the date to the user's local timezone
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
        if(userRole === 'admin' || userRole === 'moderator'){
            return true;
        }
        return false;
    }

    const UsersCommentCheck = (users_id) => {
        if(userId === users_id){
            return true;
        }
        return false;
    }

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
            const response = await fetch(`http://localhost:5000/forumcomments/${location.state.forumContent.thread_id}`);
            const jsonData = await response.json();
            setComments(jsonData);
        } catch (err) {
            console.error(err.message);
        }
    }, [location.state.forumContent.thread_id]);

    const getEditHistory = async (commentId) => {
        console.log(commentId)
        try {
            const response = await fetch (`http://localhost:5000/edithistory/${commentId}`)
            const jsonData = await response.json();
            setEditHistory(jsonData)
            console.log(editHistory)
        } catch (err) {
            console.error(err.message);
        }
    }
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
        if(showEditModal && contentInputRef.current) {
            contentInputRef.current.focus();
        }
    }, [showEditModal])
    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                {comments.sort((a, b) => a.comment_id - b.comment_id).map((e) => (
                    <Container key={e.comment_id} className='square bg-secondary rounded ps-40 pb-4 pt-16 m-24 ms-128 me-128'>
                        <Row>
                            <Col className='fw-bold top-left'>
                                <Link to={`/userprofile/${e.username}/${e.users_id}`} className="text-decoration-none text-dark">
                                    {e.username}
                                </Link>
                            </Col>
                            <Col className='top-right text-end pe-24'>{updatedNums(e.timeposted)}</Col>
                        </Row>
                        <Row>
                            <Col className='pt-8'>{e.comment}</Col>
                        </Row>
                        <Row className="mt-3 pt-24">
                            <Col className="d-flex align-items-center">
                                {UsersCommentCheck(e.users_id) === true && (
                                <div>
                                    <Button variant="link" className="btn-edit" onClick={() => handleEditComment(e.comment_id)}>
                                        <FaEdit className="edit-icon" /> Edit
                                    </Button>
                                    <Button variant="link" className="btn-delete" onClick={() => handleDeleteComment(e.comment_id)}>
                                        <FaTrash className="delete-icon" /> Delete
                                    </Button>
                                </div>
                                )}
                                {UserPermissions(userRole) === true && (
                                <Dropdown>
                                    <Dropdown.Toggle variant="link" id="dropdown-moderation">
                                        <FaCog className="moderation-icon" /> Moderation Tools
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        <Dropdown.Item onClick={() => handleModerationOption('Option 1', e.comment_id, e.comment)}>View Edit History</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleModerationOption('Option 2', e.comment_id, e.comment)}>Edit Comment</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleModerationOption('Option 3', e.comment_id, e.comment)}>Delete Comment</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleModerationOption('Option 4', e.users_id, e.username)}>Ban User</Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                                )}
                            </Col>
                        </Row>
                    </Container>
                ))}
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