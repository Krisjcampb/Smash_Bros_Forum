import { Container } from "react-bootstrap"
import React from "react";


function About() {
    return (
      <Container>
        <div className='h4 d-flex justify-content-center p-32'>About Us</div>
        <div className='d-flex pe-120 ps-120'>
          Welcome to the PNW Smash Hub website. Here, we aim to create a central
          site for people in the PNW smash scene to keep in touch with the
          latest updates on events, players, and other important developments in
          the communities. We do this as an alternative to other sites to foster
          a close-knit community that stretches from Oregon, Washington, British
          Columbia, and Idaho.
        </div>
        <div className='d-flex mt-16 pe-120 ps-120'>
          The PNW scene is a special scene to many, with so much to do and see,
          especially with regards to smash. From Smash 64 to Ultimate and
          everything in between, there is something so special with every person
          that chooses to compete, hang out, or even just watch online. Everyone
          that has been a part of that has made an impact on someone somehow in
          the scene, and we want to give back to all those people that have made
          us grow as a community. As such, this website was born. We want to
          give everyone an even bigger opportunity to grow the scene through any
          means they can, and what better way then a streamlined place to
          interact with the people that play one of our favorite games in one of
          our favorite regions.
        </div>
        <div className='d-flex mt-16 pe-120 ps-120'>
        If you think that this website is great and want to support our website
        and scene, make sure to continue to use and recommend it to everyone!
        Also, make sure to follow @PNWSmashHub on twitter and give feedback so
        we can improve the site for the future. Hope you enjoy using the PNW
        Smash Hub!
        </div>
      </Container>
    )
}
export default About

