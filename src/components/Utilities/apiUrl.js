// src/components/Utilities/apiUrl.js
// Central place for backend URL.

// Usage:
//   import { API } from '../utils/apiUrl';
//   fetch(`${API}/forumcontent`)
//   fetch(`${API}/forumusers/${id}`)

export const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';