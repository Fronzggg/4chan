const API = '';
let user = null;
try {
    const userData = localStorage.getItem('user');
    if (userData && userData.startsWith('{')) {
        user = JSON.parse(userData);
    } else {
        localStorage.removeItem('user');
    }
} catch (e) {
    localStorage.removeItem('user');
}
let currentBoard = null;
let currentThread = null;
let allUsers = {};
let confirmCallback = null;

const ui = {
    modal(id) {
        const m = document.getElementById(id);
        m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
    },

    toggleNotifs() {
        const d = document.getElementById('notif-dropdown');
        d.classList.toggle('hidden');
        if (!d.classList.contains('hidden')) this.markRead();
    },

    async markRead() {
        if (!user) return;
        await fetch(`${API}/api/notifications/read`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({user: user.username})
        });
        document.getElementById('notif-badge').classList.add('hidden');
    },

    switchToRegister() {
        this.modal('login-modal');
        this.modal('register-modal');
    },

    switchToLogin() {
        this.modal('register-modal');
        this.modal('login-modal');
    },

    showCreateThread() {
        if (!user) {
            this.showToast('Войдите чтобы создать тред', 'error');
            this.modal('login-modal');
            return;
        }
        if (user.is_muted) {
            this.showToast('Вы замьючены и не можете создавать треды', 'error');
            return;
        }
        this.modal('create-modal');
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 3000);
    },

    confirm(title, message, callback) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        confirmCallback = callback;
        this.modal('confirm-modal');
    },

    renderBadges(badges, isPremium) {
        if (!badges || !Array.isArray(badges)) badges = [];
        let html = '';
        
        badges.forEach(badge => {
            let badgeClass = 'user-badge-tag';
            if (badge === 'ADMIN' || badge === 'OWNER') {
                badgeClass += ' badge-admin';
            } else if (badge === 'MODER' || badge === 'Community Lead') {
                badgeClass += ' badge-moder';
            }
            html += `<span class="${badgeClass}">${badge}</span>`;
        });
        
        if (isPremium) {
            html += '<span class="user-badge-tag premium-badge">PREMIUM</span>';
        }
        
        return html;
    },

    renderUsername(username, displayName, isPremium, isBanned) {
        const name = displayName || username;
        if (isBanned) {
            return `<span class="username-banned">${name}</span>`;
        }
        if (isPremium) {
            return `<span class="username-premium">${name}</span>`;
        }
        return name;
    }
};

document.getElementById('confirm-yes').onclick = () => {
    if (confirmCallback) confirmCallback();
    ui.modal('confirm-modal');
    confirmCallback = null;
};

document.getElementById('confirm-no').onclick = () => {
    ui.modal('confirm-modal');
    confirmCallback = null;
};

const app = {
    async init() {
        await this.loadUserData();
        this.renderUser();
        this.showBoards();
        if (user) {
            this.checkNotifs();
            this.startNotifPolling();
            this.startBanCheck();
            document.getElementById('notif-wrapper').style.display = 'block';
            document.getElementById('fab-btn').style.display = 'flex';
            if (user.theme) {
                document.body.classList.toggle('dark-theme', user.theme === 'dark');
            }
        }
        this.loadBoardOptions();
        this.loadTheme();
    },

    startBanCheck() {
        if (!user) return;
        setInterval(async () => {
            const res = await fetch(`${API}/api/check-ban/${user.username}`);
            const data = await res.json();
            if (data.banned) {
                const until = data.until ? new Date(data.until).toLocaleString('ru') : 'навсегда';
                document.getElementById('ban-info-content').innerHTML = `
                    <p><strong>Причина:</strong> ${data.reason || 'Не указана'}</p>
                    <p><strong>Срок:</strong> ${until}</p>
                `;
                ui.modal('ban-info-modal');
            }
        }, 5000);
    },

    async loadUserData() {
        if (!user) return;
        try {
            const res = await fetch(`${API}/api/user/${user.username}`);
            if (res.ok) {
                const userData = await res.json();
                user = { ...user, ...userData };
                localStorage.setItem('user', JSON.stringify(user));
            }
        } catch (e) {
            console.error('Failed to load user data');
        }
    },

    async getUserInfo(username) {
        if (allUsers[username]) return allUsers[username];
        try {
            const res = await fetch(`${API}/api/user/${username}`);
            if (res.ok) {
                const userData = await res.json();
                allUsers[username] = userData;
                return userData;
            }
        } catch (e) {}
        return { username, is_verified: 0, avatar: null, display_name: null, badges: [], is_premium: 0, is_banned: 0 };
    },

    renderUser() {
        const area = document.getElementById('user-area');
        if (user) {
            const displayName = user.display_name || user.username;
            const avatarHtml = user.avatar 
                ? `<img src="${API}${user.avatar}" class="user-avatar" alt="${displayName}">` 
                : `<div class="user-avatar user-avatar-placeholder">${displayName[0].toUpperCase()}</div>`;
            const verifiedHtml = user.is_verified ? '<span class="verified-badge"></span>' : '';
            
            area.innerHTML = `
                <div class="user-menu">
                    <div class="user-info" onclick="ui.modal('profile-modal')">
                        ${avatarHtml}
                        <span class="author">${ui.renderUsername(user.username, displayName, user.is_premium, user.is_banned)}${verifiedHtml}</span>
                    </div>
                    ${user.is_verified ? `<button class="icon-btn" onclick="ui.modal('admin-modal');app.loadAdminUsers();" title="Админ-панель">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m0-6l4.2-4.2"/>
                        </svg>
                    </button>` : ''}
                </div>
            `;
            
            document.getElementById('p_display_name').value = user.display_name || '';
            if (user.avatar) {
                document.getElementById('avatar-preview').style.backgroundImage = `url(${API}${user.avatar})`;
            }
        } else {
            area.innerHTML = `<button class="primary-btn" style="width:auto;padding:8px 16px;" onclick="ui.modal('login-modal')">Войти</button>`;
        }
    },

    async showBoards() {
        currentBoard = null;
        currentThread = null;
        const res = await fetch(`${API}/api/boards`);
        const boards = await res.json();
        const feed = document.getElementById('feed');
        feed.innerHTML = `
            <div class="page-header">
                <h1>Разделы форума</h1>
                <p class="page-subtitle">Выберите раздел для просмотра тредов</p>
            </div>
            <div class="board-grid">
                ${boards.map(b => `
                    <div class="board-card" onclick="app.loadBoard('${b.code}')">
                        <div class="board-title">/${b.code}/ - ${b.name}</div>
                        <div class="board-desc">${b.description}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    async loadBoard(board) {
        currentBoard = board;
        currentThread = null;
        const res = await fetch(`${API}/api/threads/${board}`);
        let threads = await res.json();
        
        for (let thread of threads) {
            thread.userInfo = await this.getUserInfo(thread.author);
        }
        
        const feed = document.getElementById('feed');
        
        feed.innerHTML = `
            <button class="back-btn" onclick="app.showBoards()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Все разделы
            </button>
            <div class="page-header">
                <h1>/${board}/</h1>
            </div>
            <input type="text" id="search-input" placeholder="🔍 Поиск по тредам..." style="margin-bottom:16px;">
            <div id="threads-container">
                ${this.renderThreads(threads)}
            </div>
        `;
        
        document.getElementById('search-input').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = threads.filter(t => 
                (t.title && t.title.toLowerCase().includes(query)) ||
                t.content.toLowerCase().includes(query) ||
                t.author.toLowerCase().includes(query)
            );
            document.getElementById('threads-container').innerHTML = this.renderThreads(filtered);
        });
    },

    renderThreads(threads) {
        if (!threads.length) {
            return '<div class="card"><div class="card-body">Нет тредов. Создайте первый!</div></div>';
        }
        
        const viewerIsAdmin = user && (user.badges && (user.badges.includes('OWNER') || user.badges.includes('Community Lead')));
        
        return threads.map(t => {
            const userInfo = t.userInfo || { username: t.author, is_verified: 0, avatar: null, display_name: null, badges: [], is_premium: 0, is_banned: 0, is_anonymous: 0 };
            const isAnonymous = userInfo.is_anonymous && !viewerIsAdmin;
            const displayName = isAnonymous ? 'Аноним' : (userInfo.display_name || t.author);
            const avatarHtml = isAnonymous 
                ? `<div class="user-avatar user-avatar-placeholder">A</div>`
                : userInfo.avatar 
                    ? `<img src="${API}${userInfo.avatar}" class="user-avatar" alt="${displayName}" onclick="event.stopPropagation();app.showUserProfile('${t.author}')">` 
                    : `<div class="user-avatar user-avatar-placeholder" onclick="event.stopPropagation();app.showUserProfile('${t.author}')">${displayName[0].toUpperCase()}</div>`;
            const verifiedHtml = !isAnonymous && userInfo.is_verified ? '<span class="verified-badge"></span>' : '';
            const bannedBadge = !isAnonymous && userInfo.is_banned ? '<span class="user-badge-tag ban-badge">BAN</span>' : '';
            const pinnedBadge = t.is_pinned ? '<span class="pinned-badge">📌 Закреплено</span>' : '';
            
            return `
                <div class="card thread-card" onclick="app.openThread(${t.id})">
                    <div class="card-header">
                        <div class="user-badge">
                            ${avatarHtml}
                            <div>
                                <div>
                                    <span class="author" onclick="event.stopPropagation();${isAnonymous ? '' : `app.showUserProfile('${t.author}')`}">${isAnonymous ? 'Аноним' : ui.renderUsername(t.author, displayName, userInfo.is_premium, userInfo.is_banned)}${verifiedHtml}</span>
                                    ${isAnonymous ? '' : ui.renderBadges(userInfo.badges, userInfo.is_premium)}
                                    ${bannedBadge}
                                </div>
                                <span class="timestamp">${new Date(t.timestamp).toLocaleString('ru')}</span>
                            </div>
                        </div>
                        ${pinnedBadge}
                    </div>
                    ${t.file_path ? `<img src="${API}${t.file_path}" class="card-img" loading="lazy">` : ''}
                    <div class="card-body">
                        ${t.title ? `<h3 class="thread-title">${t.title}</h3>` : ''}
                        <div class="thread-content">${t.content}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    },

    loadTheme() {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    },

    logout() {
        localStorage.removeItem('user');
        location.reload();
    }
};

app.openThread = async function(id) {
    currentThread = id;
    const res = await fetch(`${API}/api/thread/${id}`);
    const t = await res.json();
    
    t.userInfo = await this.getUserInfo(t.author);
    for (let reply of t.replies) {
        reply.userInfo = await this.getUserInfo(reply.author);
    }
    
    const feed = document.getElementById('feed');
    const displayName = t.userInfo.display_name || t.author;
    const avatarHtml = t.userInfo.avatar 
        ? `<img src="${API}${t.userInfo.avatar}" class="user-avatar-large" alt="${displayName}" onclick="app.showUserProfile('${t.author}')">` 
        : `<div class="user-avatar-large user-avatar-placeholder" onclick="app.showUserProfile('${t.author}')">${displayName[0].toUpperCase()}</div>`;
    const verifiedHtml = t.userInfo.is_verified ? '<span class="verified-badge"></span>' : '';
    const bannedBadge = t.userInfo.is_banned ? '<span class="user-badge-tag ban-badge">BAN</span>' : '';
    const isAdmin = user && user.is_verified;
    const isOwner = user && user.username === t.author;
    
    feed.innerHTML = `
        <button class="back-btn" onclick="app.loadBoard('${t.board}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Назад к /${t.board}/
        </button>
        
        <div class="thread-view">
            <div class="thread-header">
                <div class="user-badge-large">
                    ${avatarHtml}
                    <div>
                        <div>
                            <span class="author-large" onclick="app.showUserProfile('${t.author}')">${ui.renderUsername(t.author, displayName, t.userInfo.is_premium, t.userInfo.is_banned)}${verifiedHtml}</span>
                            ${ui.renderBadges(t.userInfo.badges, t.userInfo.is_premium)}
                            ${bannedBadge}
                        </div>
                        <span class="timestamp">${new Date(t.timestamp).toLocaleString('ru')} • 👁 ${t.views || 0} просмотров</span>
                    </div>
                </div>
                ${isAdmin ? `
                    <div class="admin-actions">
                        ${t.is_pinned 
                            ? `<button class="icon-btn" onclick="app.unpinThread(${t.id})" title="Открепить">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2v20M17 7l-5 5-5-5"/>
                                </svg>
                            </button>`
                            : `<button class="icon-btn" onclick="app.pinThread(${t.id})" title="Закрепить">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2v20M17 17l-5-5-5 5"/>
                                </svg>
                            </button>`
                        }
                        ${isOwner || isAdmin ? `<button class="icon-btn" onclick="app.deleteThread(${t.id})" title="Удалить">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>` : ''}
                    </div>
                ` : user && !isOwner ? `
                    <button class="icon-btn" onclick="app.showReportModal('thread', ${t.id}, '${t.author}')" title="Пожаловаться">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
            
            ${t.title ? `<h2 class="thread-title-large">${t.title}</h2>` : ''}
            ${t.file_path ? `<img src="${API}${t.file_path}" class="thread-img">` : ''}
            <div class="thread-content-large">${t.content}</div>
            <div class="reactions-bar" id="reactions-thread-${t.id}"></div>
        </div>
        
        ${user && !user.is_muted ? `
        <div class="reply-form">
            <h3>Написать в обсуждение</h3>
            <textarea id="r_content" placeholder="Ваше сообщение..." rows="3"></textarea>
            <input type="file" id="r_file" accept="image/*,video/*">
            <button class="primary-btn" onclick="app.sendReply(${t.id}, '${t.author}', null)">Отправить</button>
        </div>
        ` : user && user.is_muted ? '<div class="card"><div class="card-body">Вы замьючены и не можете отвечать</div></div>' : '<div class="card"><div class="card-body">Войдите чтобы участвовать в обсуждении</div></div>'}
        
        <div class="replies-section">
            <h3>Обсуждение (${t.replies.length})</h3>
            <div id="replies-container">
                ${this.renderReplies(t.replies, isAdmin)}
            </div>
        </div>
    `;
    
    this.loadReactions('thread', t.id);
    this.startReplyPolling(id);
};

app.renderReplies = function(replies, isAdmin) {
    const repliesMap = {};
    const rootReplies = [];
    
    replies.forEach(r => {
        repliesMap[r.id] = { ...r, children: [] };
    });
    
    replies.forEach(r => {
        if (r.parent_id && repliesMap[r.parent_id]) {
            repliesMap[r.parent_id].children.push(repliesMap[r.id]);
        } else {
            rootReplies.push(repliesMap[r.id]);
        }
    });
    
    const viewerIsAdmin = user && (user.badges && (user.badges.includes('OWNER') || user.badges.includes('Community Lead')));
    
    const renderReply = (r, level = 0) => {
        const isAnonymous = r.userInfo.is_anonymous && !viewerIsAdmin;
        const rDisplayName = isAnonymous ? 'Аноним' : (r.userInfo.display_name || r.author);
        const rAvatarHtml = isAnonymous
            ? `<div class="user-avatar user-avatar-placeholder">A</div>`
            : r.userInfo.avatar 
                ? `<img src="${API}${r.userInfo.avatar}" class="user-avatar" alt="${rDisplayName}" onclick="app.showUserProfile('${r.author}')">` 
                : `<div class="user-avatar user-avatar-placeholder" onclick="app.showUserProfile('${r.author}')">${rDisplayName[0].toUpperCase()}</div>`;
        const rVerifiedHtml = !isAnonymous && r.userInfo.is_verified ? '<span class="verified-badge"></span>' : '';
        const rBannedBadge = !isAnonymous && r.userInfo.is_banned ? '<span class="user-badge-tag ban-badge">BAN</span>' : '';
        const rIsOwner = user && user.username === r.author;
        
        let html = `
            <div class="reply-card" style="margin-left: ${level * 32}px;" id="reply-${r.id}">
                <div class="card-header">
                    <div class="user-badge">
                        ${rAvatarHtml}
                        <div>
                            <div>
                                <span class="author" onclick="${isAnonymous ? '' : `app.showUserProfile('${r.author}')`}">${isAnonymous ? 'Аноним' : ui.renderUsername(r.author, rDisplayName, r.userInfo.is_premium, r.userInfo.is_banned)}${rVerifiedHtml}</span>
                                ${isAnonymous ? '' : ui.renderBadges(r.userInfo.badges, r.userInfo.is_premium)}
                                ${rBannedBadge}
                            </div>
                            <span class="timestamp">${new Date(r.timestamp).toLocaleString('ru')}</span>
                        </div>
                    </div>
                    <div class="reply-actions">
                        ${user && !user.is_muted ? `<button class="icon-btn" onclick="app.showReplyForm(${r.id})" title="Ответить">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                            </svg>
                        </button>` : ''}
                        ${user ? `<button class="icon-btn" onclick="app.showReportModal('reply', ${r.id}, '${r.author}')" title="Пожаловаться">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        </button>` : ''}
                        ${isAdmin || rIsOwner ? `<button class="icon-btn" onclick="app.deleteReply(${r.id})" title="Удалить">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>` : ''}
                    </div>
                </div>
                ${r.file_path ? `<img src="${API}${r.file_path}" class="card-img">` : ''}
                <div class="card-body">${r.content}</div>
                <div class="reactions-bar" id="reactions-reply-${r.id}"></div>
                <div id="reply-form-${r.id}"></div>
            </div>
        `;
        
        if (r.children && r.children.length > 0) {
            r.children.forEach(child => {
                html += renderReply(child, level + 1);
            });
        }
        
        return html;
    };
    
    const html = rootReplies.map(r => renderReply(r)).join('');
    
    setTimeout(() => {
        rootReplies.forEach(r => {
            this.loadReactions('reply', r.id);
            if (r.children) {
                r.children.forEach(child => this.loadReactions('reply', child.id));
            }
        });
    }, 100);
    
    return html;
};

app.showReplyForm = function(parentId) {
    const formContainer = document.getElementById(`reply-form-${parentId}`);
    if (formContainer.innerHTML) {
        formContainer.innerHTML = '';
        return;
    }
    
    formContainer.innerHTML = `
        <div class="nested-reply-form">
            <textarea id="nested_r_content_${parentId}" placeholder="Ваш ответ..." rows="2"></textarea>
            <div class="nested-reply-actions">
                <button class="primary-btn" onclick="app.sendReply(${currentThread}, null, ${parentId})">Отправить</button>
                <button class="secondary-btn" onclick="app.showReplyForm(${parentId})">Отмена</button>
            </div>
        </div>
    `;
};

app.startReplyPolling = function(threadId) {
    if (window.replyPollingInterval) {
        clearInterval(window.replyPollingInterval);
    }
    
    window.replyPollingInterval = setInterval(async () => {
        if (currentThread !== threadId) {
            clearInterval(window.replyPollingInterval);
            return;
        }
        
        const res = await fetch(`${API}/api/thread/${threadId}/replies`);
        const newReplies = await res.json();
        
        const currentRepliesCount = document.querySelectorAll('.reply-card').length;
        if (newReplies.length > currentRepliesCount) {
            for (let reply of newReplies) {
                reply.userInfo = await this.getUserInfo(reply.author);
            }
            
            const isAdmin = user && user.is_verified;
            document.getElementById('replies-container').innerHTML = this.renderReplies(newReplies, isAdmin);
            document.querySelector('.replies-section h3').textContent = `Обсуждение (${newReplies.length})`;
        }
    }, 3000);
};

app.sendReply = async function(tid, tAuthor, parentId) {
    if (!user) return ui.showToast('Войдите', 'error');
    if (user.is_muted) return ui.showToast('Вы замьючены', 'error');
    
    const contentId = parentId ? `nested_r_content_${parentId}` : 'r_content';
    const content = document.getElementById(contentId).value;
    if (!content.trim()) return ui.showToast('Введите текст', 'error');
    
    const fd = new FormData();
    fd.append('thread_id', tid);
    fd.append('author', user.username);
    fd.append('content', content);
    if (tAuthor) fd.append('thread_author', tAuthor);
    if (parentId) fd.append('parent_id', parentId);
    
    if (!parentId) {
        const file = document.getElementById('r_file').files[0];
        if (file) fd.append('file', file);
    }

    const res = await fetch(`${API}/api/replies`, { method: 'POST', body: fd });
    if (res.ok) {
        ui.showToast('Сообщение отправлено', 'success');
        document.getElementById(contentId).value = '';
        if (parentId) {
            app.showReplyForm(parentId);
        }
        
        const repliesRes = await fetch(`${API}/api/thread/${tid}/replies`);
        const newReplies = await repliesRes.json();
        for (let reply of newReplies) {
            reply.userInfo = await this.getUserInfo(reply.author);
        }
        const isAdmin = user && user.is_verified;
        document.getElementById('replies-container').innerHTML = this.renderReplies(newReplies, isAdmin);
        document.querySelector('.replies-section h3').textContent = `Обсуждение (${newReplies.length})`;
    } else {
        const data = await res.json();
        if (data.muted) {
            ui.showToast('Вы замьючены', 'error');
        } else if (data.error) {
            ui.showToast(data.error, 'error');
        }
    }
};

app.deleteThread = function(id) {
    ui.confirm('Удалить тред?', 'Это действие нельзя отменить', async () => {
        await fetch(`${API}/api/thread/${id}/delete`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: user.username, is_admin: user.is_verified })
        });
        ui.showToast('Тред удален', 'success');
        this.loadBoard(currentBoard);
    });
};

app.deleteReply = function(id) {
    ui.confirm('Удалить ответ?', 'Это действие нельзя отменить', async () => {
        await fetch(`${API}/api/reply/${id}/delete`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: user.username, is_admin: user.is_verified })
        });
        ui.showToast('Ответ удален', 'success');
        this.openThread(currentThread);
    });
};

app.pinThread = async function(id) {
    await fetch(`${API}/api/thread/${id}/pin`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ is_admin: user.is_verified })
    });
    ui.showToast('Тред закреплен', 'success');
    this.openThread(id);
};

app.unpinThread = async function(id) {
    await fetch(`${API}/api/thread/${id}/unpin`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ is_admin: user.is_verified })
    });
    ui.showToast('Тред откреплен', 'success');
    this.openThread(id);
};

app.showUserProfile = async function(username) {
    const res = await fetch(`${API}/api/user/${username}`);
    const userData = await res.json();
    
    const displayName = userData.display_name || username;
    const avatarHtml = userData.avatar 
        ? `<img src="${API}${userData.avatar}" class="profile-avatar" alt="${displayName}">` 
        : `<div class="profile-avatar user-avatar-placeholder">${displayName[0].toUpperCase()}</div>`;
    const verifiedHtml = userData.is_verified ? '<span class="verified-badge"></span>' : '';
    const bannedInfo = userData.is_banned ? `
        <div class="ban-info">
            <h4>🚫 Пользователь забанен</h4>
            <p><strong>Причина:</strong> ${userData.ban_reason || 'Не указана'}</p>
            ${userData.ban_until ? `<p><strong>До:</strong> ${new Date(userData.ban_until).toLocaleString('ru')}</p>` : '<p><strong>Навсегда</strong></p>'}
        </div>
    ` : '';
    
    const mutedInfo = userData.is_muted ? `
        <div class="mute-info">
            <h4>🔇 Пользователь замьючен</h4>
            ${userData.mute_until ? `<p><strong>До:</strong> ${new Date(userData.mute_until).toLocaleString('ru')}</p>` : ''}
        </div>
    ` : '';
    
    const isAdmin = user && user.is_verified;
    const isSelf = user && user.username === username;
    
    document.getElementById('user-profile-content').innerHTML = `
        <div class="profile-header">
            ${avatarHtml}
            <div class="profile-info">
                <h2>${ui.renderUsername(username, displayName, userData.is_premium, userData.is_banned)}${verifiedHtml}</h2>
                <div class="profile-badges">
                    ${ui.renderBadges(userData.badges, userData.is_premium)}
                    ${userData.is_banned ? '<span class="user-badge-tag ban-badge">BAN</span>' : ''}
                </div>
                <p class="profile-joined">На форуме с ${new Date(userData.created_at).toLocaleDateString('ru')}</p>
            </div>
        </div>
        
        ${bannedInfo}
        ${mutedInfo}
        
        <div class="profile-stats">
            <div class="stat-item">
                <div class="stat-value">${userData.thread_count}</div>
                <div class="stat-label">Тредов</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${userData.reply_count}</div>
                <div class="stat-label">Ответов</div>
            </div>
        </div>
        
        ${isAdmin && !isSelf ? `
            <div class="admin-profile-actions">
                <h3>Действия администратора</h3>
                <button class="secondary-btn" onclick="app.showBadgesModal('${username}', ${JSON.stringify(userData.badges || [])})">Управление бейджами</button>
                ${userData.is_banned 
                    ? `<button class="secondary-btn" onclick="app.unbanUser('${username}')">Разбанить</button>`
                    : `<button class="secondary-btn" onclick="app.showBanModal('${username}')">Забанить</button>`
                }
                ${userData.is_muted 
                    ? `<button class="secondary-btn" onclick="app.unmuteUser('${username}')">Размьютить</button>`
                    : `<button class="secondary-btn" onclick="app.showMuteModal('${username}')">Замьютить</button>`
                }
                ${userData.is_premium 
                    ? `<button class="secondary-btn" onclick="app.removePremium('${username}')">Убрать Premium</button>`
                    : `<button class="secondary-btn" onclick="app.givePremium('${username}')">Дать Premium</button>`
                }
            </div>
        ` : ''}
    `;
    
    ui.modal('user-profile-modal');
};

app.showBanModal = function(username) {
    document.getElementById('ban-username').textContent = `Пользователь: ${username}`;
    document.getElementById('ban-reason').value = '';
    document.getElementById('ban-duration').value = '';
    window.banTargetUser = username;
    ui.modal('user-profile-modal');
    ui.modal('ban-modal');
};

app.executeBan = async function() {
    const reason = document.getElementById('ban-reason').value;
    const duration = document.getElementById('ban-duration').value;
    
    if (!reason) return ui.showToast('Укажите причину', 'error');
    
    await fetch(`${API}/api/admin/ban`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            is_admin: user.is_verified,
            target_user: window.banTargetUser,
            reason,
            duration: duration ? parseInt(duration) : null
        })
    });
    
    ui.modal('ban-modal');
    ui.showToast('Пользователь забанен', 'success');
};

app.unbanUser = async function(username) {
    await fetch(`${API}/api/admin/unban`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ is_admin: user.is_verified, target_user: username })
    });
    ui.modal('user-profile-modal');
    ui.showToast('Пользователь разбанен', 'success');
};

app.showMuteModal = function(username) {
    document.getElementById('mute-username').textContent = `Пользователь: ${username}`;
    document.getElementById('mute-duration').value = '';
    window.muteTargetUser = username;
    ui.modal('user-profile-modal');
    ui.modal('mute-modal');
};

app.executeMute = async function() {
    const duration = document.getElementById('mute-duration').value;
    
    if (!duration) return ui.showToast('Укажите длительность', 'error');
    
    await fetch(`${API}/api/admin/mute`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            is_admin: user.is_verified,
            target_user: window.muteTargetUser,
            duration: parseInt(duration)
        })
    });
    
    ui.modal('mute-modal');
    ui.showToast('Пользователь замьючен', 'success');
};

app.unmuteUser = async function(username) {
    await fetch(`${API}/api/admin/unmute`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ is_admin: user.is_verified, target_user: username })
    });
    ui.modal('user-profile-modal');
    ui.showToast('Пользователь размьючен', 'success');
};

app.givePremium = async function(username) {
    await fetch(`${API}/api/admin/premium`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ is_admin: user.is_verified, target_user: username, enable: true })
    });
    ui.modal('user-profile-modal');
    ui.showToast('Premium выдан', 'success');
};

app.removePremium = async function(username) {
    await fetch(`${API}/api/admin/premium`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ is_admin: user.is_verified, target_user: username, enable: false })
    });
    ui.modal('user-profile-modal');
    ui.showToast('Premium убран', 'success');
};

app.loadAdminPanel = async function() {
    const statsRes = await fetch(`${API}/api/admin/stats`);
    const stats = await statsRes.json();
    
    const usersRes = await fetch(`${API}/api/admin/users`);
    let allUsersList = await usersRes.json();
    
    document.getElementById('admin-stats').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.users}</div>
                <div class="stat-label">Пользователей</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.threads}</div>
                <div class="stat-label">Тредов</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.replies}</div>
                <div class="stat-label">Ответов</div>
            </div>
        </div>
    `;
    
    const renderUsersList = (users) => {
        document.getElementById('admin-users').innerHTML = `
            <h3>Пользователи (${users.length})</h3>
            <div class="users-list">
                ${users.map(u => `
                    <div class="user-item" onclick="app.showUserProfile('${u.username}')">
                        <span>${u.username}</span>
                        <div class="user-item-badges">
                            ${u.is_verified ? '<span class="user-badge-tag badge-admin">ADMIN</span>' : ''}
                            ${u.is_premium ? '<span class="user-badge-tag premium-badge">PREMIUM</span>' : ''}
                            ${u.is_banned ? '<span class="user-badge-tag ban-badge">BAN</span>' : ''}
                            ${u.is_muted ? '<span class="user-badge-tag">MUTE</span>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    };
    
    renderUsersList(allUsersList);
    
    document.getElementById('admin-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allUsersList.filter(u => u.username.toLowerCase().includes(query));
        renderUsersList(filtered);
    });
};

app.showBadgesModal = function(username, currentBadges) {
    document.getElementById('badges-username').textContent = `Пользователь: ${username}`;
    window.badgesTargetUser = username;
    
    const checkboxes = document.querySelectorAll('.badges-selector input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = currentBadges && currentBadges.includes(cb.value);
    });
    
    ui.modal('user-profile-modal');
    ui.modal('badges-modal');
};

app.saveBadges = async function() {
    const checkboxes = document.querySelectorAll('.badges-selector input[type="checkbox"]:checked');
    const badges = Array.from(checkboxes).map(cb => cb.value);
    
    await fetch(`${API}/api/admin/badges`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            is_admin: user.is_verified,
            target_user: window.badgesTargetUser,
            badges
        })
    });
    
    ui.modal('badges-modal');
    ui.showToast('Бейджи обновлены', 'success');
    delete allUsers[window.badgesTargetUser];
};

app.checkNotifs = async function() {
    const res = await fetch(`${API}/api/notifications/${user.username}`);
    const data = await res.json();
    const unread = data.filter(n => !n.is_read).length;
    if (unread > 0) {
        const b = document.getElementById('notif-badge');
        b.innerText = unread;
        b.classList.remove('hidden');
    }
    const drop = document.getElementById('notif-dropdown');
    drop.innerHTML = data.length ? data.map(n => `
        <div class="notif-item ${!n.is_read ? 'unread' : ''}" onclick="app.openThread(${n.thread_id});ui.toggleNotifs();">
            <b>${n.from_user}</b> ответил в вашем треде
        </div>
    `).join('') : '<div class="notif-item">Нет уведомлений</div>';
};

app.startNotifPolling = function() {
    if (!user) return;
    setInterval(() => {
        this.checkNotifs();
    }, 30000);
};

app.loadBoardOptions = async function() {
    const res = await fetch(`${API}/api/boards`);
    const boards = await res.json();
    const select = document.getElementById('t_board');
    select.innerHTML = boards.map(b => `<option value="${b.code}">/${b.code}/ - ${b.name}</option>`).join('');
};

document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('l_user').value;
    const password = document.getElementById('l_pass').value;
    const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    });
    if (res.ok) {
        const u = await res.json();
        localStorage.setItem('user', JSON.stringify(u));
        location.reload();
    } else {
        const data = await res.json();
        if (data.banned) {
            const until = data.until ? new Date(data.until).toLocaleString('ru') : 'навсегда';
            ui.showToast(`Вы забанены до ${until}. Причина: ${data.reason}`, 'error');
        } else {
            ui.showToast('Неверный логин или пароль', 'error');
        }
    }
};

document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('r_user').value;
    const password = document.getElementById('r_pass').value;
    const res = await fetch(`${API}/api/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    });
    if (res.ok) {
        const u = await res.json();
        localStorage.setItem('user', JSON.stringify(u));
        location.reload();
    } else {
        ui.showToast('Пользователь уже существует', 'error');
    }
};

document.getElementById('threadForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!user) return ui.showToast('Войдите', 'error');
    if (user.is_muted) return ui.showToast('Вы замьючены', 'error');
    const content = document.getElementById('t_content').value;
    if (!content.trim()) return ui.showToast('Введите текст', 'error');
    
    const selectedBoard = document.getElementById('t_board').value;
    
    const fd = new FormData();
    fd.append('board', selectedBoard);
    fd.append('title', document.getElementById('t_title').value);
    fd.append('content', content);
    fd.append('author', user.username);
    const file = document.getElementById('t_file').files[0];
    if (file) fd.append('file', file);

    const res = await fetch(`${API}/api/threads`, { method: 'POST', body: fd });
    if (res.ok) {
        ui.modal('create-modal');
        ui.showToast('Тред создан', 'success');
        document.getElementById('t_content').value = '';
        document.getElementById('t_title').value = '';
        if (currentBoard && currentBoard === selectedBoard) {
            app.loadBoard(currentBoard);
        } else {
            app.loadBoard(selectedBoard);
        }
    } else {
        const data = await res.json();
        if (data.muted) {
            ui.showToast('Вы замьючены', 'error');
        } else if (data.error) {
            ui.showToast(data.error, 'error');
        }
    }
};

document.getElementById('profileForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    const fd = new FormData();
    fd.append('username', user.username);
    fd.append('display_name', document.getElementById('p_display_name').value);
    const file = document.getElementById('p_avatar').files[0];
    if (file) fd.append('avatar', file);

    const res = await fetch(`${API}/api/user/update`, { method: 'POST', body: fd });
    if (res.ok) {
        const userRes = await fetch(`${API}/api/user/${user.username}`);
        const updatedUser = await userRes.json();
        localStorage.setItem('user', JSON.stringify(updatedUser));
        ui.showToast('Профиль обновлен', 'success');
        setTimeout(() => location.reload(), 1000);
    }
};

document.getElementById('p_avatar').onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('avatar-preview').style.backgroundImage = `url(${ev.target.result})`;
        };
        reader.readAsDataURL(file);
    }
};

app.init();


app.switchAdminTab = function(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'users') {
        this.loadAdminUsers();
    } else if (tab === 'boards') {
        this.loadAdminBoards();
    } else if (tab === 'stats') {
        this.loadAdminStats();
    }
};

app.loadAdminUsers = async function() {
    const usersRes = await fetch(`${API}/api/admin/users`);
    let allUsersList = await usersRes.json();
    
    const renderUsersList = (users) => {
        document.getElementById('admin-content').innerHTML = `
            <input type="text" id="admin-search" placeholder="🔍 Поиск пользователей..." style="margin-bottom:16px;">
            <h3>Пользователи (${users.length})</h3>
            <div class="users-list">
                ${users.map(u => `
                    <div class="user-item" onclick="app.showUserProfile('${u.username}')">
                        <span>${u.username}</span>
                        <div class="user-item-badges">
                            ${u.is_verified ? '<span class="user-badge-tag badge-admin">ADMIN</span>' : ''}
                            ${u.is_premium ? '<span class="user-badge-tag premium-badge">PREMIUM</span>' : ''}
                            ${u.is_banned ? '<span class="user-badge-tag ban-badge">BAN</span>' : ''}
                            ${u.is_muted ? '<span class="user-badge-tag">MUTE</span>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.getElementById('admin-search').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = allUsersList.filter(u => u.username.toLowerCase().includes(query));
            renderUsersList(filtered);
        });
    };
    
    renderUsersList(allUsersList);
};

app.loadAdminBoards = async function() {
    const res = await fetch(`${API}/api/boards`);
    const boards = await res.json();
    
    document.getElementById('admin-content').innerHTML = `
        <button class="primary-btn" onclick="ui.modal('create-board-modal')" style="margin-bottom:16px;">Создать раздел</button>
        <h3>Разделы (${boards.length})</h3>
        <div class="boards-list">
            ${boards.map(b => `
                <div class="board-item">
                    <div>
                        <strong>/${b.code}/</strong> - ${b.name}
                        <p style="color:var(--text-dim);font-size:13px;margin-top:4px;">${b.description}</p>
                    </div>
                    <button class="icon-btn" onclick="app.deleteBoard('${b.code}')" title="Удалить">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
};

app.loadAdminStats = async function() {
    const statsRes = await fetch(`${API}/api/admin/stats`);
    const stats = await statsRes.json();
    
    document.getElementById('admin-content').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.users}</div>
                <div class="stat-label">Пользователей</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.threads}</div>
                <div class="stat-label">Тредов</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.replies}</div>
                <div class="stat-label">Сообщений</div>
            </div>
        </div>
    `;
};

app.deleteBoard = function(code) {
    ui.confirm('Удалить раздел?', 'Все треды в этом разделе будут удалены', async () => {
        await fetch(`${API}/api/boards/${code}`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ is_admin: user.is_verified })
        });
        ui.showToast('Раздел удален', 'success');
        this.loadAdminBoards();
    });
};

document.getElementById('createBoardForm').onsubmit = async (e) => {
    e.preventDefault();
    const code = document.getElementById('board_code').value;
    const name = document.getElementById('board_name').value;
    const description = document.getElementById('board_desc').value;
    
    const res = await fetch(`${API}/api/boards/create`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ is_admin: user.is_verified, code, name, description })
    });
    
    if (res.ok) {
        ui.modal('create-board-modal');
        ui.showToast('Раздел создан', 'success');
        app.loadAdminBoards();
        app.loadBoardOptions();
    } else {
        ui.showToast('Раздел уже существует', 'error');
    }
};


app.loadReactions = async function(type, id) {
    const res = await fetch(`${API}/api/reactions/${type}/${id}`);
    const reactions = await res.json();
    
    let userReactions = [];
    if (user) {
        const userRes = await fetch(`${API}/api/reactions/${type}/${id}/user/${user.username}`);
        userReactions = await userRes.json();
    }
    
    const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
    const container = document.getElementById(`reactions-${type}-${id}`);
    if (!container) return;
    
    container.innerHTML = `
        <div class="reactions-list">
            ${reactionEmojis.map(emoji => {
                const count = reactions[emoji] || 0;
                const isActive = userReactions.includes(emoji);
                return `
                    <button class="reaction-btn ${isActive ? 'active' : ''}" 
                            onclick="app.toggleReaction('${type}', ${id}, '${emoji}')"
                            ${!user ? 'disabled' : ''}>
                        ${emoji} ${count > 0 ? count : ''}
                    </button>
                `;
            }).join('')}
        </div>
    `;
};

app.toggleReaction = async function(type, id, reaction) {
    if (!user) return ui.showToast('Войдите чтобы реагировать', 'error');
    
    await fetch(`${API}/api/reactions`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ target_type: type, target_id: id, user: user.username, reaction })
    });
    
    this.loadReactions(type, id);
};

app.showReportModal = function(type, id, author) {
    document.getElementById('report-target').textContent = `Жалоба на ${type === 'thread' ? 'тред' : 'сообщение'} от ${author}`;
    window.reportTarget = { type, id, author };
    ui.modal('report-modal');
};

app.submitReport = async function() {
    if (!user) return ui.showToast('Войдите', 'error');
    const reason = document.getElementById('report-reason').value;
    if (!reason.trim()) return ui.showToast('Укажите причину', 'error');
    
    await fetch(`${API}/api/reports`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            reporter: user.username,
            target_type: window.reportTarget.type,
            target_id: window.reportTarget.id,
            target_author: window.reportTarget.author,
            reason
        })
    });
    
    ui.modal('report-modal');
    ui.showToast('Жалоба отправлена', 'success');
    document.getElementById('report-reason').value = '';
};

app.loadAdminReports = async function() {
    const res = await fetch(`${API}/api/admin/reports`);
    const reports = await res.json();
    
    document.getElementById('admin-content').innerHTML = `
        <h3>Жалобы (${reports.length})</h3>
        ${reports.length === 0 ? '<p style="color:var(--text-dim);text-align:center;padding:40px;">Нет активных жалоб</p>' : `
        <div class="reports-list">
            ${reports.map(r => `
                <div class="report-item" onclick="app.showReportDetail(${r.id})">
                    <div class="report-header">
                        <span class="report-type">${r.target_type === 'thread' ? '📝 Тред' : '💬 Сообщение'}</span>
                        <span class="timestamp">${new Date(r.timestamp).toLocaleString('ru')}</span>
                    </div>
                    <div class="report-body">
                        <p><strong>От:</strong> ${r.reporter} → <strong>На:</strong> ${r.target_author}</p>
                        <p><strong>Причина:</strong> ${r.reason}</p>
                    </div>
                </div>
            `).join('')}
        </div>
        `}
    `;
};

app.showReportDetail = async function(reportId) {
    const res = await fetch(`${API}/api/admin/report/${reportId}`);
    const report = await res.json();
    
    document.getElementById('report-detail-content').innerHTML = `
        <h2>Детали жалобы</h2>
        <div class="report-detail">
            <div class="report-info">
                <p><strong>Тип:</strong> ${report.target_type === 'thread' ? 'Тред' : 'Сообщение'}</p>
                <p><strong>Жалобщик:</strong> ${report.reporter}</p>
                <p><strong>Нарушитель:</strong> ${report.target_author}</p>
                <p><strong>Дата:</strong> ${new Date(report.timestamp).toLocaleString('ru')}</p>
                <p><strong>Причина:</strong> ${report.reason}</p>
            </div>
            
            <div class="report-content">
                <h3>Содержимое:</h3>
                <div class="content-preview">
                    ${report.content.title ? `<h4>${report.content.title}</h4>` : ''}
                    <p>${report.content.content}</p>
                    ${report.content.file_path ? `<img src="${API}${report.content.file_path}" style="max-width:100%;margin-top:12px;">` : ''}
                </div>
            </div>
            
            <div class="report-actions">
                <h3>Действия:</h3>
                <button class="secondary-btn" onclick="app.resolveReport(${reportId}, 'ban', '${report.target_author}')">Забанить пользователя</button>
                <button class="secondary-btn" onclick="app.resolveReport(${reportId}, 'mute', '${report.target_author}')">Замьютить пользователя</button>
                <button class="secondary-btn" onclick="app.resolveReport(${reportId}, 'delete', null)">Удалить контент</button>
                <button class="secondary-btn" onclick="app.resolveReport(${reportId}, 'ignore', null)">Отклонить жалобу</button>
            </div>
        </div>
    `;
    
    ui.modal('admin-modal');
    ui.modal('report-detail-modal');
};

app.resolveReport = async function(reportId, action, targetUser) {
    if (action === 'ban' && targetUser) {
        app.showBanModal(targetUser);
        window.currentReportId = reportId;
    } else if (action === 'mute' && targetUser) {
        app.showMuteModal(targetUser);
        window.currentReportId = reportId;
    } else if (action === 'delete') {
        ui.confirm('Удалить контент?', 'Это действие нельзя отменить', async () => {
            await fetch(`${API}/api/admin/report/${reportId}/resolve`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ is_admin: user.is_verified, action: 'deleted' })
            });
            ui.modal('report-detail-modal');
            ui.showToast('Контент удален', 'success');
            app.loadAdminReports();
        });
    } else {
        await fetch(`${API}/api/admin/report/${reportId}/resolve`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ is_admin: user.is_verified, action: 'ignored' })
        });
        ui.modal('report-detail-modal');
        ui.showToast('Жалоба отклонена', 'success');
        app.loadAdminReports();
    }
};

app.switchAdminTab = function(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'users') {
        this.loadAdminUsers();
    } else if (tab === 'boards') {
        this.loadAdminBoards();
    } else if (tab === 'reports') {
        this.loadAdminReports();
    } else if (tab === 'stats') {
        this.loadAdminStats();
    }
};


app.switchSettingsTab = function(tab) {
    document.querySelectorAll('.settings-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    const buttons = document.querySelectorAll('.settings-tabs .tab-btn');
    if (tab === 'security') {
        buttons[0].classList.add('active');
        this.loadSecuritySettings();
    } else if (tab === 'auth') {
        buttons[1].classList.add('active');
        this.loadAuthSettings();
    } else if (tab === 'appearance') {
        buttons[2].classList.add('active');
        this.loadAppearanceSettings();
    }
};

app.loadSecuritySettings = function() {
    const isAnonymous = user.is_anonymous || false;
    
    document.getElementById('settings-content').innerHTML = `
        <div class="settings-section">
            <h3>Анонимность</h3>
            <p class="settings-desc">В режиме анонима ваш ник и аватарка скрыты от обычных пользователей. Только администраторы с бейджами OWNER и Community Lead видят вашу настоящую личность.</p>
            <div class="toggle-setting">
                <label class="toggle-label">
                    <span>Режим анонима</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="anonymous-toggle" ${isAnonymous ? 'checked' : ''} onchange="app.toggleAnonymous()">
                        <span class="toggle-slider"></span>
                    </label>
                </label>
            </div>
        </div>
    `;
};

app.loadAuthSettings = function() {
    document.getElementById('settings-content').innerHTML = `
        <div class="settings-section">
            <h3>Смена пароля</h3>
            <input type="password" id="new-password" placeholder="Новый пароль" style="margin-bottom:12px;">
            <input type="password" id="confirm-password" placeholder="Подтвердите пароль" style="margin-bottom:12px;">
            <button class="primary-btn" onclick="app.changePassword()">Сменить пароль</button>
        </div>
        
        <div class="settings-section">
            <h3>Email для восстановления</h3>
            <p class="settings-desc">Добавьте email для двухфакторной аутентификации и восстановления доступа.</p>
            <input type="email" id="user-email" placeholder="Email" value="${user.email || ''}" style="margin-bottom:12px;">
            <button class="primary-btn" onclick="app.updateEmail()">Сохранить email</button>
        </div>
    `;
};

app.loadAppearanceSettings = function() {
    const currentTheme = user.theme || 'light';
    
    document.getElementById('settings-content').innerHTML = `
        <div class="settings-section">
            <h3>Тема интерфейса</h3>
            <div class="theme-selector">
                <label class="theme-option ${currentTheme === 'light' ? 'active' : ''}" onclick="app.setTheme('light')">
                    <div class="theme-preview light-preview"></div>
                    <span>Светлая</span>
                </label>
                <label class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" onclick="app.setTheme('dark')">
                    <div class="theme-preview dark-preview"></div>
                    <span>Темная</span>
                </label>
            </div>
        </div>
    `;
};

app.toggleAnonymous = async function() {
    const isAnonymous = document.getElementById('anonymous-toggle').checked;
    
    await fetch(`${API}/api/user/settings`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username: user.username, setting: 'anonymous', value: isAnonymous })
    });
    
    user.is_anonymous = isAnonymous ? 1 : 0;
    localStorage.setItem('user', JSON.stringify(user));
    ui.showToast(isAnonymous ? 'Режим анонима включен' : 'Режим анонима выключен', 'success');
};

app.changePassword = async function() {
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    
    if (!newPass || !confirmPass) return ui.showToast('Заполните все поля', 'error');
    if (newPass !== confirmPass) return ui.showToast('Пароли не совпадают', 'error');
    if (newPass.length < 3) return ui.showToast('Пароль слишком короткий', 'error');
    
    await fetch(`${API}/api/user/settings`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username: user.username, setting: 'password', value: newPass })
    });
    
    ui.showToast('Пароль изменен', 'success');
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
};

app.updateEmail = async function() {
    const email = document.getElementById('user-email').value;
    
    if (email && !email.includes('@')) return ui.showToast('Неверный email', 'error');
    
    await fetch(`${API}/api/user/settings`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username: user.username, setting: 'email', value: email })
    });
    
    user.email = email;
    localStorage.setItem('user', JSON.stringify(user));
    ui.showToast('Email сохранен', 'success');
};

app.setTheme = async function(theme) {
    await fetch(`${API}/api/user/settings`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username: user.username, setting: 'theme', value: theme })
    });
    
    user.theme = theme;
    localStorage.setItem('user', JSON.stringify(user));
    document.body.classList.toggle('dark-theme', theme === 'dark');
    ui.showToast('Тема изменена', 'success');
    this.loadAppearanceSettings();
};
