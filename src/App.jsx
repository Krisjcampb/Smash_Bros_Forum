import Threads from './pages/threads'
import Header from './components/Header/Header'
import Footer from './components/Footer/Footer'
import About from './pages/about'
import Contact from './pages/contact'
import SignUp from './pages/signup'
import Homepage from './pages/homepage'
import MediaPosts from './components/Media Posts/Media Posts'
import './App.css'
import { Container, Button } from 'react-bootstrap'
//import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'

export default function App() {
  return (
    <>
      <Container fluid className='p-0 row-flex'>
        <Header />
        <Router>
          <Routes>
            <Route path='/' element={<Homepage />} />
            <Route path='/about' element={<About />} />
            <Route path='/contact' element={<Contact />} />
            <Route path='/signup' element={<SignUp />} />
          </Routes>
        </Router>
        <Footer />
      </Container>
    </>
  )
}
