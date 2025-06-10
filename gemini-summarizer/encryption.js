// encryption.js - Simple encryption utilities for API keys
// This provides basic encryption for Chrome extension storage

class Encryption {
    constructor() {
        // Generate or retrieve a consistent key for this browser/extension
        this.encryptionKey = null;
    }

    // Initialize encryption key (call this once when extension loads)
    async init() {
        try {
            // Try to get existing key from storage
            const result = await chrome.storage.local.get(['_encKey']);
            
            if (result._encKey) {
                this.encryptionKey = result._encKey;
            } else {
                // Generate new key and store it
                this.encryptionKey = this.generateKey();
                await chrome.storage.local.set({ '_encKey': this.encryptionKey });
            }
        } catch (error) {
            console.error('Failed to initialize encryption:', error);
            // Fallback to session-based key (less secure but better than nothing)
            this.encryptionKey = this.generateKey();
        }
    }

    // Generate a simple encryption key
    generateKey() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Simple XOR-based encryption (lightweight but adequate for this use case)
    encrypt(text) {
        if (!this.encryptionKey) {
            throw new Error('Encryption not initialized');
        }
        
        const textBytes = new TextEncoder().encode(text);
        const keyBytes = new Uint8Array(this.encryptionKey.match(/.{2}/g).map(byte => parseInt(byte, 16)));
        
        const encrypted = new Uint8Array(textBytes.length);
        for (let i = 0; i < textBytes.length; i++) {
            encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        // Convert to base64 for storage
        return btoa(String.fromCharCode(...encrypted));
    }

    // Decrypt the data
    decrypt(encryptedData) {
        if (!this.encryptionKey) {
            throw new Error('Encryption not initialized');
        }
        
        try {
            // Convert from base64
            const encrypted = new Uint8Array(atob(encryptedData).split('').map(char => char.charCodeAt(0)));
            const keyBytes = new Uint8Array(this.encryptionKey.match(/.{2}/g).map(byte => parseInt(byte, 16)));
            
            const decrypted = new Uint8Array(encrypted.length);
            for (let i = 0; i < encrypted.length; i++) {
                decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
            }
            
            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }

    // Secure storage methods
    async secureSet(key, value) {
        if (!value) {
            // If value is empty, just remove the key
            await chrome.storage.local.remove([key]);
            return;
        }
        
        const encrypted = this.encrypt(value);
        const storageObj = {};
        storageObj[key] = {
            encrypted: true,
            data: encrypted,
            timestamp: Date.now()
        };
        await chrome.storage.local.set(storageObj);
    }

    async secureGet(key) {
        const result = await chrome.storage.local.get([key]);
        const storedData = result[key];
        
        if (!storedData) {
            return null;
        }
        
        // Handle legacy unencrypted data
        if (!storedData.encrypted) {
            // This is legacy unencrypted data, encrypt it and store it back
            if (typeof storedData === 'string') {
                await this.secureSet(key, storedData);
                return storedData;
            }
            return null;
        }
        
        // Decrypt the data
        return this.decrypt(storedData.data);
    }

    // Helper method to migrate existing unencrypted keys
    async migrateKey(keyName) {
        try {
            const result = await chrome.storage.local.get([keyName]);
            const value = result[keyName];
            
            if (value && typeof value === 'string') {
                // This looks like legacy unencrypted data, migrate it
                console.log(`Migrating ${keyName} to encrypted storage`);
                await this.secureSet(keyName, value);
                return value;
            }
        } catch (error) {
            console.error(`Failed to migrate ${keyName}:`, error);
        }
        return null;
    }
}

// Create a singleton instance
const encryption = new Encryption();

// Export for use in other files
export { encryption };