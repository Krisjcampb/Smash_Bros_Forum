/* eslint-env worker */
/* eslint-disable no-restricted-globals */

import forge from 'node-forge';

self.onmessage = function (e) {
    if (e.data === 'generate') {
        try {
            const keypair = forge.pki.rsa.generateKeyPair(2048);
            const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
            const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
            self.postMessage({ success: true, publicKeyPem, privateKeyPem });
        } catch (err) {
            self.postMessage({ success: false, error: err.message });
        }
    }
};