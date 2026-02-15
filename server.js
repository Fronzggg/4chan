const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const db = new sqlite3.Database('./forum.db');

const ENC_KEY = crypto.randomBytes(32);
const ENC_IV = crypto.randomBytes(16);

const encrypt = (text) => {
    const cipher = crypto.createCipheriv('aes-256-cbc', ENC_KEY, ENC_IV);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

const decrypt = (text) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, ENC_IV);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

const banWords = [
    'наркота', 'наркотик', 'наркотические вещества', 'героин', 'кокаин', 'мефедрон',
    'оружие', 'пистолет', 'автомат', 'взрывчатка', 'граната',
    'поддельные документы', 'поддельный паспорт', 'фальшивые документы',
    'поддельные банковские карты', 'клоны карт', 'дропы'
];

const checkContent = (content, username) => {
    const lowerContent = content.toLowerCase();
    for (const word of banWords) {
        if (lowerContent.includes(word)) {
            db.run("INSERT INTO moderation_log (username, violation_type, content) VALUES (?, ?, ?)", 
                [username, 'banword', content]);
            
            db.get("SELECT COUNT(*) as count FROM moderation_log WHERE username = ? AND timestamp > datetime('now', '-1 hour')", 
                [username], (err, row) => {
                if (row && row.count >= 3) {
                    const banUntil = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
                    db.run("UPDATE users SET is_banned = 1, ban_reason = ?, ban_until = ? WHERE username = ?", 
                        ['Автобан: нарушение правил (запрещенный контент)', banUntil, username]);
                }
            });
            
            return { blocked: true, reason: 'Сообщение содержит запрещенный контент' };
        }
    }
    return { blocked: false };
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static('.'));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        is_verified INTEGER DEFAULT 0,
        avatar TEXT DEFAULT NULL,
        display_name TEXT DEFAULT NULL,
        badges TEXT DEFAULT NULL,
        is_premium INTEGER DEFAULT 0,
        is_banned INTEGER DEFAULT 0,
        ban_reason TEXT DEFAULT NULL,
        ban_until DATETIME DEFAULT NULL,
        is_muted INTEGER DEFAULT 0,
        mute_until DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS boards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        name TEXT,
        description TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board TEXT,
        author TEXT,
        title TEXT,
        content TEXT,
        file_path TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_pinned INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER,
        parent_id INTEGER DEFAULT NULL,
        author TEXT,
        content TEXT,
        file_path TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_user TEXT,
        from_user TEXT,
        thread_id INTEGER,
        type TEXT,
        is_read INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS moderation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        violation_type TEXT,
        content TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS thread_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER,
        user_ip TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_type TEXT,
        target_id INTEGER,
        user TEXT,
        reaction TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(target_type, target_id, user, reaction)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter TEXT,
        target_type TEXT,
        target_id INTEGER,
        target_author TEXT,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        admin_action TEXT DEFAULT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    const stmt = db.prepare("INSERT OR IGNORE INTO users (username, password, is_verified, badges, is_premium) VALUES (?, ?, ?, ?, ?)");
    stmt.run("frnz", "123", 1, JSON.stringify(["OWNER", "ADMIN"]), 1);
    stmt.run("Gnrl", "123", 1, JSON.stringify(["Community Lead", "ADMIN"]), 1);
    stmt.finalize();

    const bstmt = db.prepare("INSERT OR IGNORE INTO boards (code, name, description) VALUES (?, ?, ?)");
    bstmt.run("b", "Random", "Случайное");
    bstmt.run("tech", "Technology", "Технологии и программирование");
    bstmt.run("art", "Art", "Творчество и искусство");
    bstmt.run("pol", "Politics", "Политика");
    bstmt.run("g", "Gaming", "Игры");
    bstmt.finalize();
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], function(err) {
        if (err) return res.status(400).json({ error: 'User exists' });
        res.json({ id: this.lastID, username, is_verified: 0, avatar: null, display_name: null });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) {
            if (row.is_banned) {
                const banUntil = row.ban_until ? new Date(row.ban_until) : null;
                const now = new Date();
                if (banUntil && banUntil > now) {
                    return res.status(403).json({ 
                        banned: true, 
                        reason: row.ban_reason, 
                        until: row.ban_until 
                    });
                } else if (banUntil && banUntil <= now) {
                    db.run("UPDATE users SET is_banned = 0, ban_reason = NULL, ban_until = NULL WHERE id = ?", [row.id]);
                    row.is_banned = 0;
                }
            }
            if (row.badges) {
                row.badges = JSON.parse(row.badges);
            }
            res.json(row);
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

app.get('/api/boards', (req, res) => {
    db.all("SELECT * FROM boards", [], (err, rows) => {
        res.json(rows);
    });
});

app.get('/api/threads/:board', (req, res) => {
    const q = req.params.board === 'all' 
        ? "SELECT * FROM threads ORDER BY is_pinned DESC, id DESC" 
        : "SELECT * FROM threads WHERE board = ? ORDER BY is_pinned DESC, id DESC";
    const p = req.params.board === 'all' ? [] : [req.params.board];
    db.all(q, p, (err, rows) => res.json(rows));
});

app.get('/api/thread/:id', (req, res) => {
    db.get("SELECT * FROM threads WHERE id = ?", [req.params.id], (err, thread) => {
        if (!thread) return res.status(404).send();
        
        const userIp = req.ip || req.connection.remoteAddress;
        db.run("INSERT INTO thread_views (thread_id, user_ip) VALUES (?, ?)", [req.params.id, userIp]);
        
        db.all("SELECT * FROM replies WHERE thread_id = ? ORDER BY id ASC", [req.params.id], (err, replies) => {
            db.get("SELECT COUNT(DISTINCT user_ip) as views FROM thread_views WHERE thread_id = ?", [req.params.id], (err, viewCount) => {
                res.json({ ...thread, replies, views: viewCount.views });
            });
        });
    });
});

app.get('/api/thread/:id/replies', (req, res) => {
    db.all("SELECT * FROM replies WHERE thread_id = ? ORDER BY id ASC", [req.params.id], (err, replies) => {
        res.json(replies);
    });
});

app.post('/api/boards/create', (req, res) => {
    const { is_admin, code, name, description } = req.body;
    if (!is_admin) return res.status(403).send();
    
    db.run("INSERT INTO boards (code, name, description) VALUES (?, ?, ?)", [code, name, description], function(err) {
        if (err) return res.status(400).json({ error: 'Board already exists' });
        res.json({ success: true, id: this.lastID });
    });
});

app.delete('/api/boards/:code', (req, res) => {
    const { is_admin } = req.body;
    if (!is_admin) return res.status(403).send();
    
    db.run("DELETE FROM boards WHERE code = ?", [req.params.code], () => {
        db.run("DELETE FROM threads WHERE board = ?", [req.params.code], () => {
            res.json({ success: true });
        });
    });
});

app.post('/api/reactions', (req, res) => {
    const { target_type, target_id, user, reaction } = req.body;
    
    db.run("INSERT OR REPLACE INTO reactions (target_type, target_id, user, reaction) VALUES (?, ?, ?, ?)", 
        [target_type, target_id, user, reaction], function(err) {
        if (err) {
            db.run("DELETE FROM reactions WHERE target_type = ? AND target_id = ? AND user = ? AND reaction = ?",
                [target_type, target_id, user, reaction], () => {
                res.json({ success: true, action: 'removed' });
            });
        } else {
            res.json({ success: true, action: 'added' });
        }
    });
});

app.get('/api/reactions/:type/:id', (req, res) => {
    db.all("SELECT reaction, COUNT(*) as count FROM reactions WHERE target_type = ? AND target_id = ? GROUP BY reaction", 
        [req.params.type, req.params.id], (err, rows) => {
        const reactions = {};
        rows.forEach(r => {
            reactions[r.reaction] = r.count;
        });
        res.json(reactions);
    });
});

app.get('/api/reactions/:type/:id/user/:username', (req, res) => {
    db.all("SELECT reaction FROM reactions WHERE target_type = ? AND target_id = ? AND user = ?", 
        [req.params.type, req.params.id, req.params.username], (err, rows) => {
        res.json(rows.map(r => r.reaction));
    });
});

app.post('/api/reports', (req, res) => {
    const { reporter, target_type, target_id, target_author, reason } = req.body;
    
    db.run("INSERT INTO reports (reporter, target_type, target_id, target_author, reason) VALUES (?, ?, ?, ?, ?)", 
        [reporter, target_type, target_id, target_author, reason], function() {
        res.json({ success: true, id: this.lastID });
    });
});

app.get('/api/admin/reports', (req, res) => {
    db.all("SELECT * FROM reports WHERE status = 'pending' ORDER BY timestamp DESC", [], (err, rows) => {
        res.json(rows);
    });
});

app.get('/api/admin/report/:id', (req, res) => {
    db.get("SELECT * FROM reports WHERE id = ?", [req.params.id], (err, report) => {
        if (!report) return res.status(404).send();
        
        if (report.target_type === 'thread') {
            db.get("SELECT * FROM threads WHERE id = ?", [report.target_id], (err, thread) => {
                res.json({ ...report, content: thread });
            });
        } else {
            db.get("SELECT * FROM replies WHERE id = ?", [report.target_id], (err, reply) => {
                res.json({ ...report, content: reply });
            });
        }
    });
});

app.post('/api/admin/report/:id/resolve', (req, res) => {
    const { is_admin, action } = req.body;
    if (!is_admin) return res.status(403).send();
    
    db.run("UPDATE reports SET status = 'resolved', admin_action = ? WHERE id = ?", [action, req.params.id], () => {
        res.json({ success: true });
    });
});

app.post('/api/threads', upload.single('file'), (req, res) => {
    const { board, author, title, content } = req.body;
    
    const modCheck = checkContent(content, author);
    if (modCheck.blocked) {
        return res.status(403).json({ error: modCheck.reason });
    }
    
    db.get("SELECT is_muted, mute_until FROM users WHERE username = ?", [author], (err, user) => {
        if (user && user.is_muted) {
            const muteUntil = user.mute_until ? new Date(user.mute_until) : null;
            const now = new Date();
            if (!muteUntil || muteUntil > now) {
                return res.status(403).json({ muted: true, until: user.mute_until });
            }
        }
        
        const filePath = req.file ? `/uploads/${req.file.filename}` : null;
        db.run("INSERT INTO threads (board, author, title, content, file_path) VALUES (?, ?, ?, ?, ?)", 
            [board, author, title, content, filePath], function() {
            res.json({ id: this.lastID });
        });
    });
});

app.post('/api/replies', upload.single('file'), (req, res) => {
    const { thread_id, parent_id, author, content, thread_author } = req.body;
    
    const modCheck = checkContent(content, author);
    if (modCheck.blocked) {
        return res.status(403).json({ error: modCheck.reason });
    }
    
    db.get("SELECT is_muted, mute_until FROM users WHERE username = ?", [author], (err, user) => {
        if (user && user.is_muted) {
            const muteUntil = user.mute_until ? new Date(user.mute_until) : null;
            const now = new Date();
            if (!muteUntil || muteUntil > now) {
                return res.status(403).json({ muted: true, until: user.mute_until });
            }
        }
        
        const filePath = req.file ? `/uploads/${req.file.filename}` : null;
        
        db.run("INSERT INTO replies (thread_id, parent_id, author, content, file_path) VALUES (?, ?, ?, ?, ?)", 
            [thread_id, parent_id || null, author, content, filePath], function() {
            if (author !== thread_author) {
                db.run("INSERT INTO notifications (target_user, from_user, thread_id, type) VALUES (?, ?, ?, ?)",
                    [thread_author, author, thread_id, 'reply']);
            }
            
            if (parent_id) {
                db.get("SELECT author FROM replies WHERE id = ?", [parent_id], (err, parentReply) => {
                    if (parentReply && parentReply.author !== author) {
                        db.run("INSERT INTO notifications (target_user, from_user, thread_id, type) VALUES (?, ?, ?, ?)",
                            [parentReply.author, author, thread_id, 'mention']);
                    }
                });
            }
            
            res.json({ id: this.lastID });
        });
    });
});

app.get('/api/notifications/:user', (req, res) => {
    db.all("SELECT * FROM notifications WHERE target_user = ? ORDER BY id DESC LIMIT 50", [req.params.user], (err, rows) => {
        res.json(rows);
    });
});

app.post('/api/notifications/read', (req, res) => {
    db.run("UPDATE notifications SET is_read = 1 WHERE target_user = ?", [req.body.user], () => res.send());
});

app.get('/api/user/:username', (req, res) => {
    db.get("SELECT id, username, is_verified, avatar, display_name, badges, is_premium, is_banned, ban_reason, ban_until, is_muted, mute_until, created_at FROM users WHERE username = ?", [req.params.username], (err, row) => {
        if (row) {
            if (row.badges) {
                row.badges = JSON.parse(row.badges);
            }
            db.get("SELECT COUNT(*) as thread_count FROM threads WHERE author = ?", [req.params.username], (err, threads) => {
                db.get("SELECT COUNT(*) as reply_count FROM replies WHERE author = ?", [req.params.username], (err, replies) => {
                    res.json({ 
                        ...row, 
                        thread_count: threads.thread_count, 
                        reply_count: replies.reply_count 
                    });
                });
            });
        } else {
            res.status(404).send();
        }
    });
});

app.post('/api/user/update', upload.single('avatar'), (req, res) => {
    const { username, display_name } = req.body;
    const avatar = req.file ? `/uploads/${req.file.filename}` : null;
    
    if (avatar) {
        db.run("UPDATE users SET display_name = ?, avatar = ? WHERE username = ?", [display_name, avatar, username], () => {
            res.json({ success: true });
        });
    } else {
        db.run("UPDATE users SET display_name = ? WHERE username = ?", [display_name, username], () => {
            res.json({ success: true });
        });
    }
});

app.post('/api/thread/:id/delete', (req, res) => {
    const { username, is_admin } = req.body;
    db.get("SELECT author FROM threads WHERE id = ?", [req.params.id], (err, thread) => {
        if (!thread) return res.status(404).send();
        if (thread.author !== username && !is_admin) return res.status(403).send();
        
        db.run("DELETE FROM threads WHERE id = ?", [req.params.id], () => {
            db.run("DELETE FROM replies WHERE thread_id = ?", [req.params.id], () => {
                res.json({ success: true });
            });
        });
    });
});

app.post('/api/reply/:id/delete', (req, res) => {
    const { username, is_admin } = req.body;
    db.get("SELECT author FROM replies WHERE id = ?", [req.params.id], (err, reply) => {
        if (!reply) return res.status(404).send();
        if (reply.author !== username && !is_admin) return res.status(403).send();
        
        db.run("DELETE FROM replies WHERE id = ?", [req.params.id], () => {
            res.json({ success: true });
        });
    });
});

app.post('/api/thread/:id/pin', (req, res) => {
    const { is_admin } = req.body;
    if (!is_admin) return res.status(403).send();
    
    db.run("UPDATE threads SET is_pinned = 1 WHERE id = ?", [req.params.id], () => {
        res.json({ success: true });
    });
});

app.post('/api/thread/:id/unpin', (req, res) => {
    const { is_admin } = req.body;
    if (!is_admin) return res.status(403).send();
    
    db.run("UPDATE threads SET is_pinned = 0 WHERE id = ?", [req.params.id], () => {
        res.json({ success: true });
    });
});

app.post('/api/admin/ban', (req, res) => {
    const { is_admin, target_user, reason, duration } = req.body;
    if (!is_admin) return res.status(403).send();
    
    const banUntil = duration ? new Date(Date.now() + duration * 60 * 60 * 1000).toISOString() : null;
    db.run("UPDATE users SET is_banned = 1, ban_reason = ?, ban_until = ? WHERE username = ?", 
        [reason, banUntil, target_user], () => {
        res.json({ success: true });
    });
});

app.post('/api/admin/unban', (req, res) => {
    const { is_admin, target_user } = req.body;
    if (!is_admin) return res.status(403).send();
    
    db.run("UPDATE users SET is_banned = 0, ban_reason = NULL, ban_until = NULL WHERE username = ?", 
        [target_user], () => {
        res.json({ success: true });
    });
});

app.post('/api/admin/mute', (req, res) => {
    const { is_admin, target_user, duration } = req.body;
    if (!is_admin) return res.status(403).send();
    
    const muteUntil = duration ? new Date(Date.now() + duration * 60 * 60 * 1000).toISOString() : null;
    db.run("UPDATE users SET is_muted = 1, mute_until = ? WHERE username = ?", 
        [muteUntil, target_user], () => {
        res.json({ success: true });
    });
});

app.post('/api/admin/unmute', (req, res) => {
    const { is_admin, target_user } = req.body;
    if (!is_admin) return res.status(403).send();
    
    db.run("UPDATE users SET is_muted = 0, mute_until = NULL WHERE username = ?", 
        [target_user], () => {
        res.json({ success: true });
    });
});

app.post('/api/admin/premium', (req, res) => {
    const { is_admin, target_user, enable } = req.body;
    if (!is_admin) return res.status(403).send();
    
    db.run("UPDATE users SET is_premium = ? WHERE username = ?", [enable ? 1 : 0, target_user], () => {
        res.json({ success: true });
    });
});

app.get('/api/admin/users', (req, res) => {
    db.all("SELECT id, username, is_verified, is_premium, is_banned, is_muted, created_at FROM users ORDER BY id DESC", [], (err, rows) => {
        res.json(rows);
    });
});

app.post('/api/admin/badges', (req, res) => {
    const { is_admin, target_user, badges } = req.body;
    if (!is_admin) return res.status(403).send();
    
    db.run("UPDATE users SET badges = ? WHERE username = ?", [JSON.stringify(badges), target_user], () => {
        res.json({ success: true });
    });
});

app.get('/api/check-ban/:username', (req, res) => {
    db.get("SELECT is_banned, ban_reason, ban_until FROM users WHERE username = ?", [req.params.username], (err, row) => {
        if (row && row.is_banned) {
            const banUntil = row.ban_until ? new Date(row.ban_until) : null;
            const now = new Date();
            if (!banUntil || banUntil > now) {
                return res.json({ 
                    banned: true, 
                    reason: row.ban_reason, 
                    until: row.ban_until 
                });
            } else {
                db.run("UPDATE users SET is_banned = 0, ban_reason = NULL, ban_until = NULL WHERE username = ?", [req.params.username]);
                return res.json({ banned: false });
            }
        }
        res.json({ banned: false });
    });
});

app.get('/api/admin/stats', (req, res) => {
    db.get("SELECT COUNT(*) as users FROM users", [], (err, users) => {
        db.get("SELECT COUNT(*) as threads FROM threads", [], (err, threads) => {
            db.get("SELECT COUNT(*) as replies FROM replies", [], (err, replies) => {
                res.json({ 
                    users: users.users, 
                    threads: threads.threads, 
                    replies: replies.replies 
                });
            });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));