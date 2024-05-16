import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Container, Row, Col, Button, Dropdown, Modal } from 'react-bootstrap';
import { FaEdit, FaTrash, FaCog } from 'react-icons/fa';
import Form from 'react-bootstrap/Form'

function UserComments(props) {
    const [comments, setComments] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [currComment, setCurrComment] = useState('')
    const [content, setContent] = useState('')
    const [commentId, setCommentId] = useState(0)
    const { userRole, userId } = props;
    const location = useLocation();
    const updatedNums = (time) => {
        const timedisplayed = new Date(time.replace(' ', 'T'));
        return timedisplayed.toString().substring(4, 25);
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

    const getComments = async () => {
        try {
            const response = await fetch(`http://localhost:5000/forumcomments/${location.state.thread_id}`);
            const jsonData = await response.json();
            setComments(jsonData);
        } catch (err) {
            console.error(err.message);
        }
    };
    const EditComment = async () => {
        try {
            const response = await fetch(`http://localhost:5000/forumcomments/${commentId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json',},
                body: JSON.stringify({ content })
            });
            
            if (response.ok){
                console.log('Comment updated successfully');
                setShowEditModal(false);
            }
            else{
                throw new Error(`Failed to update comment (status ${response.status})`);
            }
        } catch (err) {
            console.error('Error updating comment:', err.message);
        }
    };

    const handleEditComment = (commentId) => {
        setShowEditModal(true);
    };

    const handleDeleteComment = (commentId) => {
        setShowDeleteModal(true);
    };

    const handleModerationOption = (option, commentId, currcomment) => {
        setContent(currcomment)
        setCurrComment(currcomment)
        setCommentId(commentId)
        if(option === 'Option 2'){
            setShowEditModal(true)
        }
    };

    useEffect(() => {
        getComments();
        UserPermissions();
    }, []);

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
                                        <Dropdown.Item onClick={() => handleModerationOption('Option 1')}>View Edit History</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleModerationOption('Option 2', e.comment_id, e.comment)}>Edit Comment</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleModerationOption('Option 3')}>Delete Comment</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleModerationOption('Option 4')}>Ban User</Dropdown.Item>
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
            </Modal>
        </>
    );
}

export default UserComments;