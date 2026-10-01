import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API } from '../components/Utilities/apiUrl';
import { authFetch } from '../components/Utilities/authHelpers';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [profilePicture, setProfilePicture] = useState({ characterName: 'Mario', selectedSkin: '0' });
    const [userid, setUserId] = useState(null);
    const [username, setUsername] = useState('');
    const [userrole, setUserRole] = useState('');
    const token = localStorage.getItem('token');
    const [authLoading, setAuthLoading] = useState(!!token);

    const authenticate = useCallback(async () => {
        if (!localStorage.getItem('token')) {
            setAuthLoading(false);
            return;
        }
        try {
            const response = await authFetch(API, `${API}/userauthenticate`, { method: 'GET' });
            if (!response.ok) throw new Error(`Auth failed (${response.status})`);
            const { id, name, role } = await response.json();
            setUserId(id);
            setUsername(name);
            setUserRole(role);
        } catch (error) {
            console.error('Error authenticating user:', error);
        } finally {
            setAuthLoading(false);
        }
    }, []);

    useEffect(() => {
        if (token) authenticate();
    }, [token, authenticate]);

    // If the tab sat idle and auth never completed, try again when it wakes up
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible' && !userid) authenticate();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [userid, authenticate]);

    const retrieveImage = useCallback(async () => {
        if (!userid) return;

        try {
            const response = await fetch(`${API}/retrieve-image/${userid}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) throw new Error(`Error fetching profile picture: ${response.statusText}`);

            const data = await response.json();
            if (!data || data.length === 0) throw new Error('No profile picture data received.');

            setProfilePicture({
                characterName: data[0].character_name,
                selectedSkin: data[0].selected_skin,
            });
        } catch (error) {
            console.error('Error retrieving profile picture:', error);
        }
    }, [userid]);

    useEffect(() => {
        if (userid) retrieveImage();
    }, [userid, retrieveImage]);

    return (
        <UserContext.Provider
            value={{
                profilePicture,
                setProfilePicture,
                retrieveImage,
                setUserId,
                userid,
                username,
                userrole,
                authLoading,
            }}
        >
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