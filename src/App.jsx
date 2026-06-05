import Header from './components/Header/Header'
import Footer from './components/Footer/Footer'
import About from './pages/about'
import Contact from './pages/contact'
import Privacy from './pages/privacy'
import Terms from './pages/terms'
import SignIn from './pages/signin'
import Homepage from './pages/homepage'
import Register from './pages/register'
import Userlist from './pages/userlist'
import Userprofile from './pages/userprofile'
import Threads from './pages/threads'
import ForgotPassword from './pages/forgotpassword'
import Messaging from './pages/messaging'
import Calendar from './pages/calendar'
import UserSettings from './pages/usersettings'
import Feedback from './pages/feedback'
import ReportPage from './pages/reportpage'
import NotFound from './pages/notfound'
import SetupKeys from './pages/setup-keys'
import ErrorBoundary from './components/Error Boundary/errorboundary'
import './App.css'
import { UserProvider } from './pages/usercontext';
import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/Utilities/protectedroute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light-theme');

    useEffect(() => {
        document.body.className = theme;
    }, [theme]);

    const toggleTheme = () => {
        const newTheme = theme === 'light-theme' ? 'dark-theme' : 'light-theme';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <div className={`Container-home ${theme}`}>
            <ToastContainer position="bottom-right" autoClose={3000} />
            <Router>
                <UserProvider>
                    <ErrorBoundary>
                        <Header />
                        <div style={{ flex: 1 }}>
                            <Routes>
                                <Route path='/' element={<Homepage />} />
                                <Route path='/about' element={<About />} />
                                <Route path='/contact' element={<Contact />} />
                                <Route path='/privacy' element={<Privacy />} />
                                <Route path='/terms' element={<Terms />} />
                                <Route path='/signin' element={<SignIn />} />
                                <Route path='/register' element={<Register />} />
                                <Route path='/userlist' element={<Userlist />} />
                                <Route path='/userprofile/:username/:friendid' element={<Userprofile />} />
                                <Route path='/threads/:threadId' element={<Threads />} />
                                <Route path='/forgotpassword' element={<ForgotPassword />} />
                                <Route path='/messaging/:user/:userid' element={<Messaging />} />
                                <Route path='/calendar' element={<Calendar />} />
                                <Route path='/setup-keys' element={<SetupKeys />} />
                                <Route path='/usersettings' element={<UserSettings toggleTheme={toggleTheme} />} />
                                <Route
                                    path='/reportpage'
                                    element={
                                        <ProtectedRoute allowedRoles={['admin', 'moderator']}>
                                            <ReportPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route path='/feedback' element={<Feedback />} />
                                <Route path='*' element={<NotFound />} />
                            </Routes>
                        </div>
                        <Footer />
                    </ErrorBoundary>
                </UserProvider>
            </Router>
        </div>
    )
}