class SecretManager {
  constructor() {
    this.characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    this.secretLength = 16;
  }

  generateSecret() {
    let secret = '';
    for (let i = 0; i < this.secretLength; i++) {
      secret += this.characters.charAt(Math.floor(Math.random() * this.characters.length));
    }
    return secret;
  }

  async encrypt(secret, password) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const secretBuffer = encoder.encode(secret);
  
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
  
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
  
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedSecret = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      secretBuffer
    );
  
    return {
      salt: new Uint8Array(salt).toString(),
      iv: new Uint8Array(iv).toString(),
      encryptedSecret: new Uint8Array(encryptedSecret).toString(),
    };
  }

  async decrypt(encryptedData, password) {
    const { salt, iv, encryptedSecret } = encryptedData;

    const decoder = new TextDecoder();
    const passwordBuffer = new TextEncoder().encode(password);
  
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
  
    const saltBuffer = new Uint8Array(salt.split(',').map(Number));
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBuffer, iterations: 100000, hash: 'SHA-256' },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  
    const ivBuffer = new Uint8Array(iv.split(',').map(Number));
    const encryptedSecretBuffer = new Uint8Array(encryptedSecret.split(',').map(Number));
  
    const decryptedSecretBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      encryptedSecretBuffer
    );
  
    return decoder.decode(decryptedSecretBuffer);
  }

  async storeSecret(encryptedSecret) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ encryptedSecret }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async getSecret() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('encryptedSecret', (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.encryptedSecret);
        }
      });
    });
  }

  showView(viewId) {
    const views = document.querySelectorAll('.view');
    views.forEach((view) => {
      if (view.id === viewId) {
        view.classList.remove('hide');
      } else {
        view.classList.add('hide');
      }
    });
  }

  async initialize() {
    const storedSecret = await this.getSecret();

    if (!storedSecret) {
      // Show secret generation view
      this.showView('generateSecret');
      const generatedSecret = this.generateSecret();
      document.getElementById('generatedSecret').textContent = generatedSecret;

      document.getElementById('proceedToPassword').addEventListener('click', () => {
        this.showView('initialize');

        document.getElementById('initializeForm').addEventListener('submit', async (e) => {
          e.preventDefault();

          const password = document.getElementById('password').value;
          const confirmPassword = document.getElementById('confirmPassword').value;

          if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
          } else {
            const generatedSecret = document.getElementById('generatedSecret').textContent;
            const encryptedSecret = await this.encrypt(generatedSecret, password);
            await this.storeSecret(encryptedSecret);

            location.reload();
          }
        });
      });
    } else {
      // Show login view
      this.showView('login');

      document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('loginPassword').value;
        try {
          const storedSecretAfterRegenerate = await this.getSecret();
          const decryptedSecret = await this.decrypt(storedSecretAfterRegenerate, password);
          document.getElementById('secret').textContent = decryptedSecret;
          this.showView('main');
        } catch (err) {
          alert('Incorrect password');
        }
      });

      document.getElementById('resetExtension').addEventListener('click', async () => {
        // Remove the encrypted secret from storage
        await new Promise((resolve, reject) => {
          chrome.storage.local.remove('encryptedSecret', () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });

        // Reload the extension popup
        location.reload();
      });
    }

    document.getElementById('regenerateSecret').addEventListener('click', async () => {
      const newSecret = this.generateSecret();
      const newPassword = document.getElementById('loginPassword').value;
      const newEncryptedSecret = await this.encrypt(newSecret, newPassword);
      await this.storeSecret(newEncryptedSecret);
      document.getElementById('secret').textContent = newSecret;
    });

    document.getElementById('logout').addEventListener('click', () => {
      this.showView('login');
    });
  }
}

// Instantiate the class
const secretManager = new SecretManager();

// Initialize the extension
document.addEventListener('DOMContentLoaded', async () => {
  secretManager.initialize();
});
