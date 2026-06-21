import React from 'react';
import { useLocation, useParams, NavLink } from 'react-router-dom';
import { Form, Modal, Container } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import UserComments from '../components/User Comments/UserComments';
import TextMentionArea from '../components/User Comments/TextMentionArea';
import { API } from '../components/Utilities/apiUrl';
import { toast } from 'react-toastify';
import { PiArrowFatUpFill, PiArrowFatDownFill, PiArrowFatUp, PiArrowFatDown } from "react-icons/pi";

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
    const [threadLikedStatus, setThreadLikedStatus] = useState({});
    const [threadDislikedStatus, setThreadDislikedStatus] = useState({});
    const [threadLikesDislikes, setThreadNetLikesDislikes] = useState([]);
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
                toast.success('Report submitted successfully');
            } else {
                toast.error('Failed to submit report.');
            }
        } catch (err) {
            console.error('Error submitting report:', err);
            toast.error('Something went wrong. Please try again.');
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

    // ── Likes / Dislikes ──────────────────────────────────────────────────────

    const fetchThreadLikesData = async () => {
        try {
            const [likeRes, dislikeRes] = await Promise.all([
                fetch(`${API}/forumlikes`),
                fetch(`${API}/forumdislikes`),
            ]);
            const likedata = await likeRes.json();
            const dislikedata = await dislikeRes.json();

            const combined = likedata.map(l => ({ thread_id: l.thread_id, like_count: l.like_count, dislike_count: 0 }));
            dislikedata.forEach(d => {
                const idx = combined.findIndex(i => i.thread_id === d.thread_id);
                if (idx !== -1) combined[idx].dislike_count = d.dislike_count;
                else combined.push({ thread_id: d.thread_id, like_count: 0, dislike_count: d.dislike_count });
            });
            setThreadNetLikesDislikes(combined.map(i => ({ thread_id: i.thread_id, net_likes: i.like_count - i.dislike_count })));
        } catch (err) { console.error(err.message); }
    };

    useEffect(() => {
        fetchThreadLikesData();
    }, []);

    useEffect(() => {
        if (!userid) return;
        const fetchUserThreadLikes = async () => {
            try {
                const response = await fetch(`${API}/userlikesdislikes?userid=${userid}&thread_id=${thread_id}`, {
                    headers: { 'Content-Type': 'application/json' },
                });
                const res = await response.json();
                if (Array.isArray(res)) {
                    const likes = {}, dislikes = {};
                    res.forEach(item => {
                        if (item.type === 'like') { likes[item.thread_id] = true; dislikes[item.thread_id] = false; }
                        else if (item.type === 'dislike') { likes[item.thread_id] = false; dislikes[item.thread_id] = true; }
                    });
                    setThreadLikedStatus(likes);
                    setThreadDislikedStatus(dislikes);
                }
            } catch (err) { console.error(err); }
        };
        fetchUserThreadLikes();
    }, [userid, thread_id]);

    const handleThreadLike = async () => {
        const wasLiked = threadLikedStatus[thread_id] || false;
        const wasDisliked = threadDislikedStatus[thread_id] || false;

        setThreadLikedStatus(prev => ({ ...prev, [thread_id]: !wasLiked }));
        setThreadDislikedStatus(prev => ({ ...prev, [thread_id]: false }));

        setThreadNetLikesDislikes(prev => {
            const existing = prev.find(item => item.thread_id === thread_id);
            if (!existing) {
                return [...prev, { thread_id: thread_id, net_likes: wasLiked ? 0 : (wasDisliked ? 2 : 1) }];
            }
            return prev.map(item => {
                if (item.thread_id !== thread_id) return item;
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
            if (!wasLiked) toast.success('👍 Thread liked!', { autoClose: 1500, hideProgressBar: true });
        } catch (err) {
            toast.error('Failed to like thread.');
        }
    };

    const handleThreadDislike = async () => {
        const wasDisliked = threadDislikedStatus[thread_id] || false;
        const wasLiked = threadLikedStatus[thread_id] || false;

        setThreadDislikedStatus(prev => ({ ...prev, [thread_id]: !wasDisliked }));
        setThreadLikedStatus(prev => ({ ...prev, [thread_id]: false }));

        setThreadNetLikesDislikes(prev => {
            const existing = prev.find(item => item.thread_id === thread_id);
            if (!existing) {
                return [...prev, { thread_id: thread_id, net_likes: wasDisliked ? 0 : (wasLiked ? -2 : -1) }];
            }
            return prev.map(item => {
                if (item.thread_id !== thread_id) return item;
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
            toast.error('Failed to dislike thread.');
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    function formatCompactNumber(num) {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 10000) return `${Math.round(num / 1000)}k`;
        if (num >= 1000) return `${(num / 1000).toFixed(2)}k`.replace(/\.?0+k$/, 'k');
        return num.toString();
    }

    if (!forumContent) {
        return <div className="text-center mt-5">Loading...</div>;
    }

    return (
        <Container className="thread-page-container">

            {/* Thread content card */}
            <div className="thread-content-card">
                <div className="thread-badge-label">
                    Thread
                </div>
                <h2 className='thread-page-title'>
                    {forumContent.title}
                </h2>
            </div>

            <div className='thread-page-background'>
                <div className="thread-body-with-votes">
                    {/* Sidebar — votes */}
                    {user && (
                        <div className="thread-vote-sidebar">
                            <button
                                className={`vote-button like-button ${threadLikedStatus[thread_id] ? 'active-like' : ''}`}
                                onClick={handleThreadLike}
                            >
                                {threadLikedStatus[thread_id]
                                    ? <PiArrowFatUpFill size={24} />
                                    : <PiArrowFatUp size={24} />
                                }
                            </button>
                            <span className="vote-count">
                                {formatCompactNumber(
                                    threadLikesDislikes.find(item => item.thread_id === thread_id)?.net_likes || 0
                                )}
                            </span>
                            <button
                                className={`vote-button dislike-button ${threadDislikedStatus[thread_id] ? 'active-dislike' : ''}`}
                                onClick={handleThreadDislike}
                            >
                                {threadDislikedStatus[thread_id]
                                    ? <PiArrowFatDownFill size={24} />
                                    : <PiArrowFatDown size={24} />
                                }
                            </button>
                        </div>
                    )}

                    {/* Main content */}
                    <div className="thread-body-content">
                        {forumContent?.filepath && (
                            <img
                                src={forumContent.filepath.slice(6)}
                                alt='Thread'
                                className="thread-image-display"
                            />
                        )}

                        <p>
                            {forumContent.content}
                        </p>

                        {/* Report button stays here, bottom right of content */}
                        {user && userid !== forumContent.users_id && (
                            <div className="d-flex justify-content-end">
                                <button
                                    className="secondary-btn muted thread-report-button"
                                    onClick={() => setShowReportModal(true)}
                                >
                                    Report
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Comment form */}
            <div className="thread-comment-form-wrap">
                {user ? (
                    <Form>
                        <Form.Group className="comment-form-group">
                            <TextMentionArea
                                value={comment}
                                onChange={setComment}
                                onMentionsChange={setMentions}
                                rows={6}
                                placeholder="Write a comment..."
                                maxLength={8000}
                            />
                            <div className="comment-post-button-wrap">
                                <button type="submit" onClick={onSubmitForm} className="comment-post-button">
                                    Post Comment
                                </button>
                            </div>
                        </Form.Group>
                    </Form>
                ) : (
                    // Prompt guests to sign in before commenting
                    <div className="text-center guest-signin-prompt mt-4 pb-8 pt-8 mx-auto">
                        <p>You must be signed in to post a comment.</p>
                        <NavLink to="/signin">
                            <button type="button" className="guest-signin-button">
                                Sign In
                            </button>
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
                    <button className="edit-modal-close" onClick={() => setShowReportModal(false)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                    </button>
                </div>
                <Modal.Body>
                    <Form>
                        <Form.Group>
                            <Form.Label className="form-label-uppercase">
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
                            <Form.Label className="form-label-optional form-label-uppercase">
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
                        disabled={!reportReason || submitting}
                    >
                        {submitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                </div>
            </Modal>
        </Container>
    );
}

export default Threads;