import React, { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { Form, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { BsPersonFill, BsGeoAltFill, BsChatFill, BsSearch } from 'react-icons/bs';
import { API } from '../Utilities/apiUrl';

const roleBadgeStyle = (role) => {
    const colors = {
        admin: { background: '#d00000', color: '#fff' },
        moderator: { background: '#388FD6', color: '#fff' },
        user: { background: '#6c757d', color: '#fff' },
    };
    const style = colors[role] || colors.user;
    return {
        ...style,
        borderRadius: '5px',
        padding: '2px 8px',
        fontSize: '0.75rem',
        fontWeight: '700',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        display: 'inline-block',
    };
};

const inputStyle = {
    border: '1.5px solid #e0e0dc',
    borderLeft: 'none',
    background: '#f5f5f3',
    fontSize: '0.9rem',
    padding: '0.6rem 0.9rem',
};

const iconGroupStyle = {
    background: '#f5f5f3',
    border: '1.5px solid #e0e0dc',
    borderRight: 'none',
    color: '#393933',
};

const labelStyle = {
    fontWeight: '600',
    fontSize: '0.85rem',
    color: '#393933',
};

const ListUsers = () => {
    const [userList, setUserList] = useState([]);
    const [userRole, setUserRole] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Role assignment state
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedId, setSelectedId] = useState('')
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [userAssigned, setUserAssigned] = useState('');
    const [buttonSelected, setbuttonSelected] = useState(null)

    // Edit user state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editTargetId, setEditTargetId] = useState(null);
    const [editTargetName, setEditTargetName] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState(false);

    const navigate = useNavigate();

    const filteredUsers = userList.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getUserList = async () => {
        try {
            const response = await fetch(`${API}/forumusers`);
            const jsonData = await response.json();
            setUserList(jsonData);
        } catch (err) {
            console.error(err.message);
        }
    };

    const formatLastOnline = (timestamp) => {
        const date = new Date(timestamp)
        return date.toLocaleString();
    }

    // — Role assignment —

    const openReassignMenu = (username, currid) => {
        setUserAssigned(username)
        setSelectedId(currid)
        setShowRoleModal(true);
    };

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
        setbuttonSelected(role)
    };

    const handleRoleSubmit = () => {
        handleAssignRole().then(success => {
            if (success) {
                getUserList();
                setShowRoleModal(false);
            } else {
                console.error('Failed to assign user role');
            }
        });
    };

    const handleAssignRole = async () => {
        try {
            const response = await fetch(`${API}/forumrole`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selectedRole, selectedId }),
            });
            if (response.ok) {
                return true;
            } else {
                console.error('Failed to assign user role');
                return false;
            }
        } catch (error) {
            console.error('Error assigning user role:', error);
            return false;
        }
    };

    const handleCloseRoleModal = () => {
        setbuttonSelected(null);
        setSelectedRole('');
        setSelectedId('');
        setUserAssigned('');
        setShowRoleModal(false);
    };

    // — Edit user —

    const openEditModal = (user) => {
        setEditTargetId(user.users_id);
        setEditTargetName(user.username);
        setEditUsername(user.username || '');
        setEditLocation(user.location || '');
        setEditDescription(user.description || '');
        setEditError('');
        setEditSuccess(false);
        setShowEditModal(true);
    };

    const handleEditSubmit = async () => {
        setEditError('');
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API}/forumusers/edit/${editTargetId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token,
                },
                body: JSON.stringify({
                    username: editUsername,
                    location: editLocation,
                    description: editDescription,
                }),
            });

            if (response.status === 409) {
                setEditError('That username is already taken');
                return;
            }

            if (!response.ok) {
                setEditError('Failed to update user');
                return;
            }

            setEditSuccess(true);
            getUserList();
            setTimeout(() => setShowEditModal(false), 1000);
        } catch (err) {
            console.error('Error updating user:', err);
            setEditError('Something went wrong. Please try again.');
        }
    };

    useEffect(() => {
        getUserList();
        const token = localStorage.getItem('token');
        if (token) {
            fetch(`${API}/userauthenticate`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
            })
            .then(response => response.json())
            .then(data => {
                const { role } = data;
                setUserRole(role);
            })
            .catch(error => {
                console.error('Error fetching user role:', error);
            })
        }
    }, []);

    const isPrivileged = userRole === 'admin' || userRole === 'moderator';

    return (
        <>
            {/* Search bar */}
            <div style={{ marginBottom: '1rem' }}>
                <InputGroup style={{ maxWidth: '320px' }}>
                    <InputGroup.Text style={iconGroupStyle}>
                        <BsSearch size={14} />
                    </InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={inputStyle}
                    />
                </InputGroup>
            </div>

            {filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '2rem', fontSize: '0.9rem' }}>
                    {searchTerm ? `No users found matching "${searchTerm}"` : 'No users found'}
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e0e0dc' }}>
                                {['Username', 'Role', 'Last Online', ...(isPrivileged ? ['Change Permissions', 'Edit'] : [])].map(col => (
                                    <th key={col} style={{
                                        padding: '0.75rem 1rem',
                                        textAlign: 'left',
                                        fontSize: '0.78rem',
                                        fontWeight: '700',
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase',
                                        color: '#888',
                                    }}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((e, index) => (
                                <tr
                                    key={e.users_id}
                                    style={{
                                        borderBottom: '1px solid #f0f0ee',
                                        background: index % 2 === 0 ? '#ffffff' : '#fafaf8',
                                        transition: 'background 0.15s ease',
                                    }}
                                    onMouseEnter={el => el.currentTarget.style.background = '#fff8e1'}
                                    onMouseLeave={el => el.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#fafaf8'}
                                >
                                    <td
                                        onClick={() => navigate(`/userprofile/${e.username}/${e.users_id}`)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            color: '#393933',
                                            fontSize: '0.9rem',
                                        }}
                                    >
                                        {e.username}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <span style={roleBadgeStyle(e.role)}>{e.role}</span>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#888' }}>
                                        {formatLastOnline(e.last_online)}
                                    </td>
                                    {isPrivileged && (
                                        <>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <Button
                                                    size="sm"
                                                    onClick={() => openReassignMenu(e.username, e.users_id)}
                                                    style={{
                                                        background: '#393933',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontWeight: '600',
                                                        fontSize: '0.78rem',
                                                        color: '#FFD443',
                                                        padding: '4px 12px',
                                                    }}
                                                >
                                                    Assign Role
                                                </Button>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <Button
                                                    size="sm"
                                                    variant="outline-secondary"
                                                    onClick={() => openEditModal(e)}
                                                    style={{ borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}
                                                >
                                                    Edit
                                                </Button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Role assignment modal */}
            <Modal show={showRoleModal} onHide={handleCloseRoleModal} centered>
                <Modal.Header closeButton style={{ borderBottom: '4px solid #FFD443', background: '#393933' }}>
                    <Modal.Title style={{ color: '#ffffff', fontWeight: '800', fontSize: '1.1rem' }}>
                        Assign Role —{' '}
                        <span style={{ color: '#FFD443' }}>{userAssigned}</span>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '1.5rem' }}>
                    <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
                        Select a role to assign to this user
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {['user', 'moderator', ...(userRole === 'admin' ? ['admin'] : [])].map(role => (
                            <button
                                key={role}
                                onClick={() => handleRoleSelect(role)}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '8px',
                                    border: buttonSelected === role ? '2px solid #393933' : '2px solid #e0e0dc',
                                    background: buttonSelected === role ? '#393933' : '#f5f5f3',
                                    color: buttonSelected === role ? '#FFD443' : '#393933',
                                    fontWeight: '700',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </Modal.Body>
                <Modal.Footer style={{ borderTop: '1px solid #e0e0dc' }}>
                    <Button variant="outline-secondary" onClick={handleCloseRoleModal} style={{ borderRadius: '8px', fontWeight: '600' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRoleSubmit}
                        disabled={!selectedRole}
                        style={{
                            background: '#393933',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            color: '#FFD443',
                            padding: '0.5rem 1.5rem',
                        }}
                    >
                        Confirm
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit user modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header closeButton style={{ borderBottom: '4px solid #FFD443', background: '#393933' }}>
                    <Modal.Title style={{ color: '#ffffff', fontWeight: '800', fontSize: '1.1rem' }}>
                        Edit User —{' '}
                        <span style={{ color: '#FFD443' }}>{editTargetName}</span>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '1.5rem' }}>
                    {editSuccess ? (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                            <p style={{ fontWeight: '600', color: '#393933', margin: 0 }}>User updated successfully</p>
                        </div>
                    ) : (
                        <>
                            {editError && (
                                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fff0f0', border: '1.5px solid #d00000', borderRadius: '8px', fontSize: '0.85rem', color: '#d00000', fontWeight: '500' }}>
                                    {editError}
                                </div>
                            )}

                            <Form.Group className="mb-3">
                                <Form.Label style={labelStyle}>Username</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text style={iconGroupStyle}><BsPersonFill size={14} /></InputGroup.Text>
                                    <Form.Control
                                        type='text'
                                        value={editUsername}
                                        onChange={e => setEditUsername(e.target.value)}
                                        maxLength={20}
                                        style={inputStyle}
                                    />
                                </InputGroup>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label style={labelStyle}>Location</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text style={iconGroupStyle}><BsGeoAltFill size={14} /></InputGroup.Text>
                                    <Form.Control
                                        type='text'
                                        value={editLocation}
                                        onChange={e => setEditLocation(e.target.value)}
                                        maxLength={50}
                                        style={inputStyle}
                                    />
                                </InputGroup>
                            </Form.Group>

                            <Form.Group className="mb-1">
                                <Form.Label style={labelStyle}>Description</Form.Label>
                                <InputGroup style={{ alignItems: 'flex-start' }}>
                                    <InputGroup.Text style={{ ...iconGroupStyle, paddingTop: '0.65rem' }}><BsChatFill size={14} /></InputGroup.Text>
                                    <Form.Control
                                        as='textarea'
                                        rows={3}
                                        value={editDescription}
                                        onChange={e => setEditDescription(e.target.value)}
                                        maxLength={160}
                                        style={{ ...inputStyle, resize: 'none' }}
                                    />
                                </InputGroup>
                                <div style={{ textAlign: 'right', fontSize: '0.78rem', color: editDescription.length >= 140 ? '#e39647' : '#bbb', marginTop: '0.25rem' }}>
                                    {editDescription.length}/160
                                </div>
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                {!editSuccess && (
                    <Modal.Footer style={{ borderTop: '1px solid #e0e0dc' }}>
                        <Button variant="outline-secondary" onClick={() => setShowEditModal(false)} style={{ borderRadius: '8px', fontWeight: '600' }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditSubmit}
                            style={{
                                background: '#393933',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                color: '#FFD443',
                                padding: '0.5rem 1.5rem',
                            }}
                        >
                            Save Changes
                        </Button>
                    </Modal.Footer>
                )}
            </Modal>
        </>
    );
};

export default ListUsers;