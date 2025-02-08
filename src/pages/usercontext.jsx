import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create User Context
const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [profilePicture, setProfilePicture] = useState({ characterName: 'default', selectedSkin: '0' });
    const [userid, setUserId] = useState(null);
    const token = localStorage.getItem('token');

    // Authenticate User and Set User ID
    useEffect(() => {
        if (token) {
            fetch('http://localhost:5000/userauthenticate', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            })
                .then((response) => response.json())
                .then((data) => {
                    const { id } = data;
                    setUserId(id);
                })
                .catch((error) => {
                    console.error('Error authenticating user:', error);
                });
        }
    }, [token]);

    // Retrieve Profile Picture
    const retrieveImage = useCallback(async () => {
        if (!userid) {
            console.warn('No user ID available. Skipping profile picture retrieval.');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/retrieve-image/${userid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Error fetching profile picture: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data || data.length === 0) {
                throw new Error('No profile picture data received.');
            }

            const characterName = data[0].character_name.toLowerCase();
            const selectedSkin = data[0].selected_skin;

            setProfilePicture({ characterName, selectedSkin }); // Save base data
            console.log('Profile picture updated:', { characterName, selectedSkin });
        } catch (error) {
            console.error('Error retrieving profile picture:', error);
            setProfilePicture({ characterName: 'default', selectedSkin: '0' }); // Fallback
        }
    }, [userid]);

    useEffect(() => {
        retrieveImage();
    }, [userid, retrieveImage]);

    return (
        <UserContext.Provider value={{ profilePicture, setProfilePicture, retrieveImage, setUserId }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
};