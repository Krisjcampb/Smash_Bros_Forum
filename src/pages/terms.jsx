import React from 'react'
import { Container, Row, Col } from 'react-bootstrap'

export default function terms() {
  return (
    <Container className="mt-5 mb-5">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <h1 className="mb-4 text-center">Terms of Service</h1>

          <h4>1. Acceptance of Terms</h4>
          <p>
            By creating an account or using this website, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use the site.
          </p>

          <h4>2. Eligibility</h4>
          <p>
            You must be at least 13 years old to use this website. By registering, you confirm that you meet this requirement.
          </p>

          <h4>3. Account Responsibility</h4>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. You are also responsible for all activities under your account.
          </p>

          <h4>4. Prohibited Conduct</h4>
          <p>
            You agree not to engage in any conduct that is harmful, illegal, harassing, or disruptive. This includes spamming, impersonation, or violating any laws.
          </p>

          <h4>5. Content Ownership</h4>
          <p>
            You retain ownership of any content you post, but you grant us a license to use, display, and distribute it on our platform.
          </p>

          <h4>6. Termination</h4>
          <p>
            We reserve the right to suspend or terminate your account at our discretion for violating these terms or for any other reason.
          </p>

          <h4>7. Modifications</h4>
          <p>
            We may update these Terms of Service at any time. Changes will be effective upon posting. Continued use of the site indicates your acceptance of the updated terms.
          </p>

          <h4>8. Contact</h4>
          <p>
            If you have any questions about these Terms, please contact us through the website’s support system or designated email.
          </p>
        </Col>
      </Row>
    </Container>
  )
}
