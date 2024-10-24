import React, { useState, useEffect } from 'react';
import { Container, Form, Button } from 'react-bootstrap';
import { saveAs } from 'file-saver';

function UserSettings({ toggleTheme }) {
  const [theme, setTheme] = useState('light-theme');
  const [privateKey, setPrivateKey] = useState('');

  useEffect(() => {
    const currentTheme = localStorage.getItem('theme') || 'light-theme';
    setTheme(currentTheme);
    document.body.className = currentTheme;
  }, []);

  const downloadPrivateKey = () => {
    const storedPrivateKey = localStorage.getItem('privateKey');
    if (storedPrivateKey) {
      setPrivateKey(storedPrivateKey);
      const blob = new Blob([storedPrivateKey], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, 'privateKey.txt');
    } else {
      alert('Private key not found!');
    }
  };

  const uploadPrivateKey = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const uploadedKey = event.target.result;
        setPrivateKey(uploadedKey);
        localStorage.setItem('privateKey', uploadedKey);
        alert('Private key uploaded successfully!');
      };
      reader.readAsText(file);
    }
  };

  return (
    <Container>
      <h2>User Settings</h2>
      <Form>
        <Form.Group controlId="formThemeToggle">
          <Form.Label>Toggle Theme</Form.Label>
          <Button onClick={toggleTheme} variant="secondary" className="mb-3">
            {localStorage.getItem('theme') === 'light-theme' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          </Button>
        </Form.Group>
        <Form.Group controlId="formDownloadPrivateKey">
          <Form.Label>Download Private Key</Form.Label>
          <Button onClick={downloadPrivateKey} variant="primary" className="mb-3">
            Download Private Key
          </Button>
        </Form.Group>
        <Form.Group controlId="formUploadPrivateKey">
          <Form.Label>Upload Private Key</Form.Label>
          <Form.Control
            type="file"
            accept=".txt"
            onChange={uploadPrivateKey}
            className="mb-3"
            style={{ width: '300px' }}
          />
        </Form.Group>
      </Form>
    </Container>
  );
}

export default UserSettings;