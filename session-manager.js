class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.ipRotation = [
            '192.168.1.1',
            '10.0.0.1',
            '172.16.0.1',
            '127.0.0.1',
            '203.0.113.0',
            '198.51.100.0'
        ];
    }

    generateSessionId() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    createSession(userId) {
        const sessionId = this.generateSessionId();
        const fakeIp = this.getRandomIP();
        this.sessions.set(sessionId, {
            userId,
            fakeIp,
            created: Date.now(),
            lastActivity: Date.now()
        });
        return { sessionId, fakeIp };
    }

    getRandomIP() {
        return this.ipRotation[Math.floor(Math.random() * this.ipRotation.length)];
    }

    validateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        
        if (Date.now() - session.lastActivity > 3600000) {
            this.sessions.delete(sessionId);
            return null;
        }
        
        session.lastActivity = Date.now();
        return session;
    }

    destroySession(sessionId) {
        this.sessions.delete(sessionId);
    }

    cleanupExpired() {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastActivity > 3600000) {
                this.sessions.delete(sessionId);
            }
        }
    }
}

const sessionManager = new SessionManager();
setInterval(() => sessionManager.cleanupExpired(), 300000);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = sessionManager;
}
