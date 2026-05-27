import React from 'react';
import { useLocation, useParams, NavLink } from 'react-router-dom';
import { Form, Modal, Container } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import UserComments from '../components/User Comments/UserComments';
import TextMentionArea from '../components/User Comments/TextMentionArea';
import { API } from '../components/Utilities/apiUrl';

function Threads() {
    const [comment, setComment] = useState("");
    const { threadId } = useParams();
    const location = useLocation();
    const [forumContent, setForumContent] = useState(location.state?.forumContent);
    const [user, setUser] = useState("");
    const [userid, setUserId] = useState("");
    const [userrole, setUserRole] = useState("");
    const [mentions, setMentions] = useState([]);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    // Incrementing this key forces UserComments to re-fetch after a new comment is posted
    const [commentsKey, setCommentsKey] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const thread_id = forumContent?.thread_id || threadId
    const token = localStorage.getItem('token');

    const reportReasons = [
        "Sexual content", "Hateful or abusive content", "Harmful or dangerous acts",
        "Promotes terrorism", "Repulsive or violent content", "Minor abuse or sexualization",
        "Spam", "Misinformation", "Self-harm or suicide",
    ];
    const handleReportSubmit = async () => {
        if (!reportReason) {
            alert('Please select a reason for reporting');
            return;
        }
        setSubmitting(true);
        try {
            const response = await fetch(`${API}/threadreport`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userid,
                    thread_id: thread_id,
                    reported_user: forumContent.users_id,
                    reason: reportReason,
                    report_desc: reportDescription
                })
            });
            if (response.ok) {
                setShowReportModal(false);
                setReportReason('');
                setReportDescription('');
                alert('Report submitted successfully');
            }
        } catch (err) {
            console.error('Error submitting report:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const onSubmitForm = async (e) => {
        e.preventDefault();
        try {
            const timeposted = new Date().toISOString();
            const body = {
                thread_id,
                comment,
                user: user,
                userid: userid,
                timeposted,
                mentions: mentions.map(m => ({
                    position: m.position,
                    length: m.length,
                    username: m.username
                }))
            };
            const response = await fetch(`${API}/forumcomments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                setComment('');
                setMentions([]);
                setCommentsKey(prev => prev + 1);
            } else {
                const errorData = await response.json();
                console.error('Posting failed:', errorData.message);
            }
        } catch (err) {
            console.error('Error submitting comment:', err.message);
        }
    };
    
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetch(`${API}/userauthenticate`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token,
                },
            })
            .then((response) => response.json())
            .then((data) => {
                const { id, name, role } = data;
                setUser(name);
                setUserId(id);
                setUserRole(role);
            })
            .catch((error) => {
                console.error('Error fetching user role:', error);
            });

            // Only fetch thread data if it wasn't passed through router state
            if (!forumContent) {
                fetch(`${API}/forumcontent/${thread_id}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(res => res.json())
                .then(data => {
                    setForumContent(data);
                })
                .catch(err => console.error("Error fetching forum content:", err));
            }
        }
    }, [forumContent, thread_id]);

    if (!forumContent) {
        return <div className="text-center mt-5">Loading...</div>;
    }

    return (
        <Container style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>

            {/* Thread content card */}
            <div
                className="thread-content-body"
                style={{
                    background: '#ffffff',
                    borderRadius: '0 0 16px 16px',
                    padding: '2rem 2.5rem',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    marginBottom: '2rem',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            display: 'inline-block',
                            background: '#FFD443',
                            borderRadius: '6px',
                            padding: '3px 10px',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: '#393933',
                            marginBottom: '0.75rem',
                        }}>
                            Thread
                        </div>
                        <h2 className='thread-page-title'>
                            {forumContent.title}
                        </h2>
                    </div>

                    {/* Report button  */}
                    {user && userid !== forumContent.users_id && (
                        <button
                            className="secondary-btn muted"
                            style={{
                                fontSize: '0.75rem',
                                marginLeft: '1rem',
                                marginTop: '0.25rem',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}
                            onClick={() => setShowReportModal(true)}
                        >
                            Report
                        </button>
                    )}
                </div>
            </div>

            <div className='thread-page-background'>
                {/* Thread image */}
                {forumContent?.filepath && (
                    <img
                        src={forumContent.filepath.slice(6)}
                        alt='Thread'
                        style={{
                            display: 'block',
                            width: '100%',
                            maxHeight: '600px',
                            objectFit: 'contain',
                            borderRadius: '10px',
                            marginBottom: '1.5rem',
                            background: 'transparent',
                        }}
                    />
                )}

                {/* Thread body */}
                <p>
                    {forumContent.content}
                </p>
            </div>

            {/* Comment form */}
            <div style={{ marginBottom: '2rem' }}>
                {user ? (
                    <Form>
                        <Form.Group style={{ position: 'relative' }}>
                            <TextMentionArea
                                value={comment}
                                onChange={setComment}
                                onMentionsChange={setMentions}
                                rows={6}
                                placeholder="Write a comment..."
                                maxLength={8000}
                            />
                            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    type="submit"
                                    onClick={onSubmitForm}
                                    style={{
                                        background: '#393933',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '700',
                                        color: '#FFD443',
                                        padding: '0.5rem 1.5rem',
                                    }}
                                >
                                    Post Comment
                                </Button>
                            </div>
                        </Form.Group>
                    </Form>
                ) : (
                    // Prompt guests to sign in before commenting
                    <div className="text-center thread-signin mt-4 pb-8 pt-8 mx-auto">
                        <p>You must be signed in to post a comment.</p>
                        <NavLink to="/signin">
                            <Button
                                style={{
                                    background: '#393933',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    color: '#FFD443',
                                }}
                            >
                                Sign In
                            </Button>
                        </NavLink>
                    </div>
                )}
            </div>

            {/* Comments section */}
            <UserComments
                key={commentsKey}
                userRole={userrole}
                userId={userid}
                forumContent={forumContent}
            />
        <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="md" centered>
            <div className="settings-modal-header">
                <div>
                    <div className="settings-modal-badge">Report</div>
                    <h5 className="edit-modal-title">Report Thread</h5>
                </div>
                <button className="edit-modal-close" onClick={() => setShowReportModal(false)}>×</button>
            </div>
            <Modal.Body>
                <Form>
                    <Form.Group>
                        <Form.Label style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            Reason for reporting
                        </Form.Label>
                        {reportReasons.map(reason => (
                            <Form.Check
                                key={reason}
                                label={reason}
                                name="reportReason"
                                type='radio'
                                onChange={() => setReportReason(reason)}
                            />
                        ))}
                        <Form.Label className='mt-3' style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            Additional details (optional)
                        </Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Describe why you are reporting this thread..."
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <div className="edit-modal-footer">
                <button className="secondary-btn themed light" onClick={() => setShowReportModal(false)}>
                    Cancel
                </button>
                <button
                    className="primary-btn"
                    onClick={handleReportSubmit}
                    disabled={!reportReason}
                >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
            </div>
        </Modal>
        </Container>
    );
}

export default Threads;