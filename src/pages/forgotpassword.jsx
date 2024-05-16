import React, {useState} from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Container} from 'react-bootstrap'
import bcrypt from 'bcryptjs'

function ForgotPassword() {
    const [confirmpass, setConfirmPass] = useState("")
    const [email, setEmail] = useState("");
    const [validated, setValidated] = useState(false)
    const [step, setStep] = useState(1);
    const [verificationcode, setVerificationCode] = useState("")
    const [newpassword, setNewPassword] = useState("")
    const re =
       /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

    const handleVerificationSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/passwordverify', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: verificationcode })
            })
            const jsondata = await response.json();
            console.log(jsondata)
        } catch (err) {
            console.error(err)
        }
        setStep(3);
    }

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if(newpassword === confirmpass && !!newpassword){
            try{
                const hashedpassword = bcrypt.hashSync(newpassword, 10)
                const body = { email, hashedpassword }
                const response = await fetch(
                'http://localhost:5000/forumusers',
                {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                }
            )
            console.log(response)          
            } catch (err) {
            console.log(err.message)
            }
        }
    }
    const handleEmailSubmit = async (e) => {
        e.preventDefault()
        if(re.test(email)){
            setStep(2);
            try {
                const response = await fetch("http://localhost:5000/passwordreset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });
                const data = await response.json();
                console.log(data)
            } catch (err) {
                console.error(err)
        }
        }
        setValidated(true)
    }

    return (
      <Container>
        <div className='text-primary'>Reset Password</div>
        {step === 1 && (
          <Form
            noValidate
            validated={validated}
            className='rounded bg-secondary p-40'
            onSubmit={handleEmailSubmit}
          >
            <Form.Group className='mb-1'>
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type='email'
                placeholder='Enter email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Form.Control.Feedback type='invalid'>
                Please input a valid email.
              </Form.Control.Feedback>
            </Form.Group>
            <Button variant='primary' type='submit'>
              Submit
            </Button>
          </Form>
        )}
        {step === 2 && (
          <Form
            noValidate
            validated={validated}
            className='rounded bg-secondary p-40'
            onSubmit={handleVerificationSubmit}
          >
            <Form.Group className='mb-1'>
              <Form.Label>Verification Code</Form.Label>
              <Form.Control
                type='text'
                placeholder='Enter code'
                value={verificationcode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
              />
              <Form.Control.Feedback type='invalid'>
                Please input a valid code
              </Form.Control.Feedback>
            </Form.Group>
            <Button variant='primary' type='submit'>
              Submit
            </Button>
          </Form>
        )}
        {step === 3 && (
          <Form
            noValidate
            validated={validated}
            className='rounded bg-secondary p-40'
            onSubmit={handlePasswordReset}
          >
            <Form.Group className='mb-1'>
              <Form.Label>Set New Password</Form.Label>
              <Form.Control
                type='password'
                placeholder='Enter new password'
                value={newpassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Form.Control.Feedback type='invalid'>
                Please input a valid password
              </Form.Control.Feedback>
              <Form.Control
                type='password'
                placeholder='Confirm new password'
                value={confirmpass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
              />
              <Form.Control.Feedback type='invalid'>
                Please confirm password is matching
              </Form.Control.Feedback>
            </Form.Group>
            <Button variant='primary' type='submit'>
              Submit
            </Button>
          </Form>
        )}
      </Container>
    )
}

export default ForgotPassword
