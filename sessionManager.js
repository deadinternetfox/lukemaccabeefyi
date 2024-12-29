class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    createSession(sessionId) {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                conversationHistory: [],
                lastActivity: Date.now()
            });
        }
        return this.getSession(sessionId);
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    updateSession(sessionId, conversationHistory) {
        if (this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                conversationHistory,
                lastActivity: Date.now()
            });
        }
    }

    cleanOldSessions(maxAge = 3600000) { // Clean sessions older than 1 hour
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastActivity > maxAge) {
                this.sessions.delete(sessionId);
            }
        }
    }
}

module.exports = new SessionManager();
