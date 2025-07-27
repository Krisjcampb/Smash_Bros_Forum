import React from 'react'
import {Row, Col, Container} from 'react-bootstrap'

export default function privacy() {
    return (
        <Container className="py-5">
      <Row className="justify-content-center mb-4">
        <Col md={10} lg={8}>
          <h2 className="text-center mb-4">📄 Privacy Policy</h2>
          <p><strong>Effective Date:</strong> [Insert Date]</p>

          <h4>1. Information We Collect</h4>
          <h5 className="mt-3">a. Information You Provide</h5>
          <ul>
            <li><strong>Account Info:</strong> Username, email address, password.</li>
            <li><strong>Profile Details:</strong> Selected character/avatar, profile picture.</li>
            <li><strong>Messages & Comments:</strong> Posts, messages, replies, likes/dislikes.</li>
          </ul>

          <h5 className="mt-3">b. Information Collected Automatically</h5>
          <ul>
            <li><strong>Log Data:</strong> IP address, browser type, device info, pages visited, timestamps.</li>
            <li><strong>Cookies:</strong> We use cookies and similar technologies to improve your experience and remember your preferences.</li>
          </ul>

          <h4 className="mt-4">2. How We Use Your Information</h4>
          <ul>
            <li>Create and manage your account</li>
            <li>Enable site features like posts, DMs, likes/dislikes</li>
            <li>Improve and personalize your experience</li>
            <li>Monitor activity to maintain a safe community</li>
            <li>Send relevant notifications (e.g., replies, DMs)</li>
            <li>Respond to support requests</li>
          </ul>

          <h4 className="mt-4">3. Sharing Your Information</h4>
          <p>We <strong>do not sell</strong> your data. We may share it:</p>
          <ul>
            <li>With <strong>trusted service providers</strong> (e.g., email services, hosting)</li>
            <li>If required by <strong>law</strong>, legal request, or to protect our rights</li>
            <li>In case of a <strong>business transfer</strong> (e.g., merger, sale of assets)</li>
          </ul>

          <h4 className="mt-4">4. Your Rights & Choices</h4>
          <ul>
            <li>View or update your profile information</li>
            <li>Delete your account at any time</li>
            <li>Opt-out of optional emails or notifications</li>
            <li>Request a copy of your personal data (where required by law)</li>
          </ul>

          <h4 className="mt-4">5. Data Security</h4>
          <p>
            We use industry-standard security measures (encryption, hashed passwords, HTTPS) to protect your data.
            However, no system is 100% secure, so please use strong passwords and keep your credentials safe.
          </p>

          <h4 className="mt-4">6. Third-Party Links</h4>
          <p>
            The Site may contain links to external websites we don’t control.
            We are not responsible for their privacy practices.
          </p>

          <h4 className="mt-4">7. Children’s Privacy</h4>
          <p>
            Our Site is not intended for users under the age of 13.
            We do not knowingly collect personal information from children.
          </p>

          <h4 className="mt-4">8. Changes to This Policy</h4>
          <p>
            We may update this policy periodically. If we make significant changes,
            we’ll notify you through the website or via email.
          </p>

          <h4 className="mt-4">9. Contact Us</h4>
          <p>
            If you have any questions or requests regarding your privacy, you can contact us at:
            <br />
            📧 <strong>[your-support-email@example.com]</strong>
          </p>
        </Col>
      </Row>
    </Container>
    )
}
