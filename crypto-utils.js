const CryptoUtils = {
    async generateKey() {
        return await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    },

    async encrypt(text, key) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
        );
        
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);
        
        return btoa(String.fromCharCode(...combined));
    },

    async decrypt(encryptedText, key) {
        const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    },

    hash(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    },

    obfuscateIP() {
        const fakeIPs = [
            '192.168.1.1',
            '10.0.0.1',
            '172.16.0.1',
            '127.0.0.1'
        ];
        return fakeIPs[Math.floor(Math.random() * fakeIPs.length)];
    },

    generateFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
        return this.hash(canvas.toDataURL());
    },

    spoofFingerprint() {
        const randomFingerprint = Math.random().toString(36).substring(7);
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => Math.floor(Math.random() * 8) + 2
        });
        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => [2, 4, 8][Math.floor(Math.random() * 3)]
        });
        Object.defineProperty(screen, 'width', {
            get: () => [1920, 1366, 1440][Math.floor(Math.random() * 3)]
        });
        Object.defineProperty(screen, 'height', {
            get: () => [1080, 768, 900][Math.floor(Math.random() * 3)]
        });
        return randomFingerprint;
    }
};

CryptoUtils.spoofFingerprint();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoUtils;
}
