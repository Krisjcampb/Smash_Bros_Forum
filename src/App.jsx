import Header from './components/Header/Header'
import Footer from './components/Footer/Footer'
import About from './pages/about'
import Contact from './pages/contact'
import SignIn from './pages/signin'
import Homepage from './pages/homepage'
import Register from './pages/register'
import Userlist from './pages/userlist'
import Userprofile from './pages/userprofile'
import Threads from './pages/threads'
import ForgotPassword from './pages/forgotpassword'
import Messaging from './pages/messaging'
import './App.css'
import { Container } from 'react-bootstrap'
//import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

export default function App() {
    return (
        <>
            <Container fluid className='p-0 row-flex'>
                <Container fluid className='p-0 row-flex Container-home'>
                    <Router>
                        <Header />
                        <Routes>
                        <Route path='/' element={<Homepage />} />
                        <Route path='/about' element={<About />} />
                        <Route path='/contact' element={<Contact />} />
                        <Route path='/signin' element={<SignIn />} />
                        <Route path='/register' element={<Register />} />
                        <Route path='/userlist' element={<Userlist />} />
                        <Route path='/userprofile/:username/:friendid' element={<Userprofile />} />
                        <Route path='/threads/:threadId' element={<Threads />} />
                        <Route path='/forgotpassword' element={<ForgotPassword />} />
                        <Route path='/messaging/:user/:userid' element={<Messaging/>}/>
                        </Routes>
                    </Router>
                </Container>
                <Footer />
            </Container>
        </>
    )
}
