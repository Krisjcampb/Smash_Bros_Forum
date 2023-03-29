import React, { useRef } from 'react';
import bcrypt from 'bcryptjs';

const PasswordEncrypt = () => {
    const emailInputRef = useRef();
    const passwordInputRef = useRef();
    
    const SignUpForm = (e) => {
        e.preventDefault();
        const email = emailInputRef.current.value;
        const password = passwordInputRef.current.value;
        const hashedPassword = bcrypt.hashSync(password, 10);

        console.log(hashedPassword)


    }

    const loginForm = (e) => {
        e.preventDefault()
        const email = emailInputRef.current.value
        const password = passwordInputRef.current.value

        const getHashedPassword = JSON.parse(window.localStorage.getItem('login')).hashedPassword

        console.log(getHashedPassword)

        bcrypt.compare(password, getHashedPassword, function(err, isMatch){
            if(err){
                throw err;
            
            }else if(!isMatch){
                console.log('Password doesnt match!')
            }else{
                console.log('Password Matches!')
            }
        })

    }

    return (
      <Form>
        <input
          type='email'
          placeholder='email'
          ref={emailInputRef}
          style={{ padding: '15px', borderRaidus: '10px', margin: '10px' }}
        />
        <input
          type='password'
          placeholder='password'
          ref={passwordInputRef}
          style={{ padding: '15px', borderRaidus: '10px', margin: '10px' }}
        />
        <button
          type='submit'
          onClick={() => SignUpForm(e)}
          style={{ padding: '15px', borderRaidus: '10px', margin: '10px' }}
        >
          Sign up
        </button>
        <button
          type='submit'
          onClick={() => loginForm(e)}
          style={{ padding: '15px', borderRaidus: '10px', margin: '10px' }}
        >
          Login
        </button>
      </Form>
    )
};

export default PasswordEncrypt;