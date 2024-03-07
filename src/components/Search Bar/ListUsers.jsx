import React, { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

const ListUsers = () => {
    const [userList, setUserList] = useState([]);
    const [userRole, setUserRole] = useState('');
    const [user, setUser] = useState('')
    const [userId, setUserId] = useState('')
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedId, setSelectedId] = useState('')
    const [showModal, setShowModal] = useState(false);
    const [userAssigned, setUserAssigned] = useState('');
    const [buttonSelected, setbuttonSelected] = useState(null)

    const getUserList = async () => {
        try {
            const response = await fetch("http://localhost:5000/forumusers");
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

    const OpenReassignMenu = (username, currid) => {
        console.log(currid, username)
        setUserAssigned(username)
        setSelectedId(currid)
        setShowModal(true);
    };

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
        setbuttonSelected(role)
    };

    const handleRoleSubmit = () => {
        handleAssignRole()
        .then(success => {
            if (success) {
                getUserList();
                setShowModal(false);
            } else {
                console.error('Failed to assign user role');
            }
        });
    };

    const handleAssignRole = async () => {
        try {
            const response = await fetch(`http://localhost:5000/forumrole`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({selectedRole, selectedId}),
            });
            
            if (response.ok) {
                console.log('User role assigned successfully');
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
    
    const handleCloseModal = () => {
        setbuttonSelected('');   
        setShowModal(false);
    }

    const handleEditUser = async (userId, updatedUserData) => {
        try {
            // Make a PUT request to your backend API to update the user's information
            const response = await fetch(`http://localhost:5000/forumusers/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedUserData), // Provide the updated user data
            });
            
            if (response.ok) {
                // Handle success, e.g., show a success message
                console.log('User information updated successfully');
            } else {
                // Handle failure, e.g., show an error message
                console.error('Failed to update user information');
            }
        } catch (error) {
            // Handle network errors or other errors
            console.error('Error updating user information:', error);
        }
    };
    useEffect(() => {
        getUserList();
        const token = localStorage.getItem('token');
        if(token) {
            fetch('http://localhost:5000/userauthenticate', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
            })
            .then(response => response.json())
            .then(data => {
                const { id, name, role } = data;
                setUser(name);
                setUserId(id)
                setUserRole(role)
            })
            .catch(error => {
                console.error('Error fetching user role:', error);
            })
        }
    }, [userRole]);

    return (
    <>
        <table className='table mt-32'>
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Last Online</th>
                    {(userRole === 'admin' || userRole === 'moderator') && (
                        <>
                            <th>Change Permissions</th>
                            <th>Edit</th>
                        </>
                    )}
                </tr>
            </thead>
            <tbody>
                {userList.map(e => (
                    <tr key={e.id}>
                        <td>{e.username}</td>
                        <td>{e.role}</td>
                        <td>{formatLastOnline(e.last_online)}</td>
                        {(userRole === 'admin' || userRole === 'moderator') && (
                            <>
                                <td>
                                    <Button onClick={() => OpenReassignMenu(e.username, e.users_id)}>Assign Role</Button>
                                </td>
                                <td>
                                    <Button onClick={() => handleEditUser(e.id)}>Edit</Button>
                                </td>
                            </>
                        )}
                    </tr>
                ))}                   
            </tbody>
        </table>
        <Modal show={showModal} onHide={handleCloseModal}>
            <Modal.Header closeButton>
                <Modal.Title>Select Role For {userAssigned}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant={buttonSelected === 'user' ? 'secondary' : 'primary'} onClick={() => handleRoleSelect('user')}>User</Button>
                        <Button variant={buttonSelected === 'moderator' ? 'secondary' : 'primary'} onClick={() => handleRoleSelect('moderator')}>Moderator</Button>
                        {userRole === 'admin' && <Button variant={buttonSelected === 'admin' ? 'secondary' : 'primary'} onClick={() => handleRoleSelect('admin')}>Admin</Button>}
                    </div>
                </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={handleRoleSubmit}>Confirm</Button>
            </Modal.Footer>
        </Modal>
    </>
    );
};

export default ListUsers;