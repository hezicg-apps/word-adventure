let state = {
    screen: 'welcome', 
    inputText: '', 
    words: [],
    listName: 'אוצר המילים שלי',
    nightMode: false, 
    masteryScore: 0, 
    quizIndex: 0, 
    correctAnswers: 0,
    quizOptions: null, // חשוב: מאתחל את האפשרויות
    quizFeedback: { index: -1, status: null, correctIndex: -1 },
    memoryGame: { cards: [], flipped: [], pairs: 0, steps: 0, isProcessing: false },
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, showQuestionPrompt: true, fallingToken: null, isAiTurn: false, isPvP: true, feedback: { status: null, selectedIdx: -1 } },
    wordQuest: { 
        target: '', hint: '', guesses: [], currentGuess: '', maxAttempts: 5, 
        isGameOver: false, keyStates: {}, showTutorial: true, 
        roundIndex: 0, pool: [], completedCount: 0 
    },
    winner: null,
    showShareModal: false
};

// --- עזרים ---
function triggerConfetti() { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8; window.speechSynthesis.speak(u); }
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

function saveToLocal() {
    localStorage.setItem('wm_words', JSON.stringify(state.words));
    localStorage.setItem('wm_input', state.inputText);
    localStorage.setItem('wm_mastery', state.masteryScore);
    localStorage.setItem('wm_listName', state.listName);
}

function loadFromLocal() {
    const params = new URLSearchParams(window.location.search);
    let sharedData = params.get('w');
    if (sharedData) {
        try {
            sharedData = sharedData.replace(/-/g, '+').replace(/_/g, '/');
            const decoded = decodeURIComponent(escape(atob(sharedData)));
            if (decoded && decoded.includes('-')) {
                state.inputText = decoded;
                processInput(false); 
                state.masteryScore = 0; 
                state.screen = 'flashcards';
                window.history.replaceState({}, document.title, window.location.pathname);
                render();
                return;
            }
        } catch(e) { console.error("Link decode error", e); }
    }
    const savedWords = localStorage.getItem('wm_words');
    if (savedWords) {
        state.words = JSON.parse(savedWords);
        state.inputText = localStorage.getItem('wm_input') || '';
        state.masteryScore = parseFloat(localStorage.getItem('wm_mastery')) || 0;
        state.listName = localStorage.getItem('wm_listName') || 'אוצר המילים שלי';
        state.screen = state.masteryScore >= 70 ? 'menu' : 'flashcards';
    }
}

function getShareUrl() {
    if (!state.inputText || !state.inputText.includes('-')) return null;
    let encodedData = btoa(unescape(encodeURIComponent(state.inputText)));
    encodedData = encodedData.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${window.location.origin}${window.location.pathname}?w=${encodedData}`;
}

function shareVia(platform) {
    const url = getShareUrl();
    if (!url) return;
    const messageText = `הנה רשימת המילים שלי באנגלית:\n${state.listName}\n\n`;
    const encodedText = encodeURIComponent(messageText);
    const fullMessage = encodedText + url;
    switch(platform) {
        case 'whatsapp': window.open(`https://api.whatsapp.com/send?text=${fullMessage}`, '_blank'); break;
        case 'gmail': window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(state.listName)}&body=${fullMessage}`, '_blank'); break;
        case 'email': window.location.href = `mailto:?subject=${encodeURIComponent(state.listName)}&body=${fullMessage}`; break;
        case 'copy':
            navigator.clipboard.writeText(url).then(() => {
                const btn = document.getElementById('copyBtn');
                btn.innerHTML = '✅ הקישור הועתק!';
                setTimeout(() => { btn.innerHTML = '<span class="text-2xl">📋</span><span>העתיקו קישור</span>'; }, 2000);
            });
            break;
    }
}

function renderShareModal(app) {
    if (!state.showShareModal) return;
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-[500] px-4 animate-fade-in';
    modal.innerHTML = `
        <div class="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border-4 border-blue-400 relative">
            <button onclick="state.showShareModal=false; render();" class="absolute top-4 left-4 text-3xl text-gray-300 hover:text-gray-500 transition-colors">✕</button>
            <h3 class="text-3xl font-black text-blue-700 mb-2 text-center">איך לשתף?</h3>
            <p class="text-gray-600 font-bold text-center mb-6 text-sm">בחרו איך לשלוח את המילים:</p>
            <div class="grid gap-3">
                <button onclick="shareVia('whatsapp')" class="flex items-center gap-4 p-4 bg-white text-gray-800 border-2 border-[#25D366] rounded-2xl font-black shadow-sm active:scale-95 transition-transform text-lg"><img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" class="w-8 h-8"><span>שלחו ב-WhatsApp</span></button>
                <button onclick="shareVia('gmail')" class="flex items-center gap-4 p-4 bg-white text-gray-800 border-2 border-[#EA4335] rounded-2xl font-black shadow-sm active:scale-95 transition-transform text-lg"><img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" class="w-8 h-8"><span>שלחו ב-Gmail</span></button>
                <button id="copyBtn" onclick="shareVia('copy')" class="flex items-center gap-4 p-4 bg-blue-50 text-blue-700 border-2 border-blue-200 rounded-2xl font-black shadow-sm active:scale-95 transition-transform text-lg mt-2"><span>📋</span><span>העתיקו קישור</span></button>
            </div>
        </div>`;
    app.appendChild(modal);
}

function resetAllData() { 
    if(confirm("בטוח שרוצים למחוק הכל ולהזין רשימה חדשה?")) {
        localStorage.clear();
        state.inputText = ''; state.words = []; state.masteryScore = 0; state.listName = 'אוצר המילים שלי';
        state.screen = 'input'; render(); 
    }
}

function render() {
    document.body.classList.toggle('night-mode', state.nightMode);
    const toggleBtn = document.getElementById('toggleNight');
    if (toggleBtn) toggleBtn.innerText = state.nightMode ? '🌙' : '☀️';
    const app = document.getElementById('app');
    app.innerHTML = '';
    if (state.winner) { renderWinScreen(app); return; }
    switch(state.screen) {
        case 'welcome': renderWelcome(app); break;
        case 'input': renderInput(app); break;
        case 'flashcards': renderFlashcards(app); break;
        case 'quiz': renderQuiz(app); break;
        case 'menu': renderMenu(app); break;
        case 'memory': renderMemory(app); break;
        case 'c4_menu': renderC4Menu(app); break;
        case 'connect4': renderConnect4(app); break;
        case 'wordquest': renderWordQuest(app); break;
    }
    if (state.showShareModal) renderShareModal(app);
}

function renderHeader(subtext) {
    return `<div class="mb-4"><h1 class="text-3xl font-black text-gray-800 tracking-tight">${state.listName}</h1>${subtext ? `<p class="text-lg font-bold text-blue-600 mt-1">${subtext}</p>` : ''}</div>`;
}

function renderWelcome(app) {
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-md animate-fade-in mt-6">
            <div class="bg-white border-blue-400 shadow-xl p-6 rounded-[2.5rem] border-4 welcome-card">
                <p class="text-4xl font-black text-blue-600 mb-6 border-b-2 pb-4">ברוכים הבאים! 👋</p>
                <div class="space-y-4 text-right font-bold">
                    <div class="p-4 rounded-2xl border-r-8 shadow-sm bg-blue-50 border-blue-500"><p class="text-xl font-black text-blue-900 mb-1">📝 שלב 1: הזנה</p><p class="text-gray-800">מדביקים רשימת מילים.</p></div>
                    <div class="p-4 rounded-2xl border-r-8 shadow-sm bg-green-50 border-green-500"><p class="text-xl font-black text-green-900 mb-1">🎴 שלב 2: תרגול</p><p class="text-gray-800">לומדים ובודקים ידע.</p></div>
                    <div class="p-4 rounded-2xl border-r-8 shadow-sm bg-purple-50 border-purple-500"><p class="text-xl font-black text-purple-900 mb-1">🎮 שלב 3: משחקים</p><p class="text-gray-800">משחקים באנגלית!</p></div>
                </div>
            </div>
            <button onclick="state.screen='input'; render()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg active:scale-95 transition-transform">בואו נתחיל!</button>
        </div>`;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="text-center space-y-4 w-full px-2 mt-4 animate-fade-in">
            <p class="text-2xl font-black text-blue-600">הזינו מילים (מילה - תרגום)</p>
            <textarea id="wordInput" class="w-full h-64 p-6 rounded-[2rem] border-4 border-blue-200 outline-none text-right text-black bg-white shadow-inner text-xl font-bold focus:border-blue-400" placeholder="כותרת הרשימה\napple - תפוח\nbanana - בננה">${state.inputText}</textarea>
            <button onclick="processInput(true)" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg active:scale-95 transition-transform">המשך לכרטיסיות 🌟</button>
        </div>`;
    const area = document.getElementById('wordInput'); area.oninput = (e) => state.inputText = e.target.value; area.focus();
}

function processInput(shouldRender = true) {
    const lines = state.inputText.split('\n').filter(l => l.includes('-'));
    if (lines.length === 0) return;
    const firstLine = state.inputText.split('\n')[0];
    state.listName = firstLine.includes('-') ? 'אוצר המילים שלי' : firstLine;
    state.words = lines.map(l => {
        const parts = l.split('-');
        return { eng: parts[0].trim(), heb: parts.slice(1).join('-').trim(), known: false, id: crypto.randomUUID() };
    });
    if (state.words.length < 2) return;
    saveToLocal();
    if (shouldRender) { state.screen = 'flashcards'; render(); }
}

function renderFlashcards(app) {
    const unknown = state.words.filter(w => !w.known);
    if (unknown.length === 0) { state.quizIndex = 0; state.correctAnswers = 0; state.screen = 'quiz'; state.quizOptions = null; render(); return; }
    const cur = unknown[0];
    app.innerHTML = `
        <div class="text-center space-y-4 w-full max-sm px-2 mt-4 relative">
            ${renderHeader(`לימוד מילים (${state.words.filter(w=>w.known).length}/${state.words.length})`)}
            <div onclick="this.classList.toggle('card-flipped')" class="relative w-full h-80 perspective-1000 cursor-pointer mt-2">
                <div class="card-inner">
                    <div class="card-front bg-white border-4 border-blue-200 flex-col"><span class="text-5xl font-black text-blue-600 eng-text mb-6">${cur.eng}</span><button onclick="event.stopPropagation(); speak('${cur.eng}')" class="text-5xl bg-transparent border-none p-0 cursor-pointer">🔊</button></div>
                    <div class="card-back bg-blue-600 border-4 border-blue-700 text-white"><span class="text-4xl font-black px-4 text-center">${cur.heb}</span></div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                 <button onclick="state.words.find(w=>w.id === '${cur.id}').known=true; render()" class="bg-green-600 text-white py-5 rounded-2xl font-black text-2xl shadow-md active:scale-95 transition-transform">יודע ✅</button>
                 <button onclick="state.words = shuffle(state.words); render()" class="bg-orange-600 text-white py-5 rounded-2xl font-black text-2xl shadow-md active:scale-95 transition-transform">עוד לא ⏳</button>
            </div>
        </div>`;
}

// --- אתגר (QUIZ) - מתוקן ---
// 1. אתחול המשחק
function startWordQuest() {
    if (!state.words || state.words.length === 0) {
        alert("אוצר המילים ריק.");
        state.screen = 'menu';
        render();
        return;
    }

    const pool = state.words.filter(w => {
        const word = (w.eng || w.en || "").trim();
        return word.length >= 2 && !word.includes(' ');
    });

    if (pool.length === 0) {
        alert("לא נמצאו מילים תקינות.");
        state.screen = 'menu';
        render();
        return;
    }

    const item = pool[Math.floor(Math.random() * pool.length)];
    
    state.screen = 'wordquest'; 
    state.winner = null; 
    state.wordQuest = {
        target: (item.eng || item.en).toLowerCase().trim(),
        hint: (item.heb || item.he || "רמז חסר"),
        guesses: [],
        currentGuess: '',
        maxAttempts: 6,
        isGameOver: false
    };

    render();
}

// 2. תצוגת המשחק - ניקוי רקעים למצב לילה
function renderWordQuest(app) {
    const w = state.wordQuest;
    if (!w) return;
    
    const wordLen = w.target.length;
    const isDark = document.body.classList.contains('dark-mode'); 

    let gridHtml = `<div class="word-grid" style="display: grid; grid-template-columns: repeat(${wordLen}, 1fr); gap: 6px; direction: ltr; margin: 15px auto; width: fit-content;">`;
    
    for (let i = 0; i < w.maxAttempts; i++) {
        const guess = w.guesses[i] || (i === w.guesses.length ? w.currentGuess : '');
        for (let j = 0; j < wordLen; j++) {
            const char = guess[j] || '';
            // עיצוב הריבועים - רקע שקוף במצב לילה
            let style = isDark ? "border-2 border-gray-600 text-white bg-transparent" : "border-2 border-gray-300 text-gray-800 bg-white";
            
            if (w.guesses[i]) {
                if (char === w.target[j]) style = "bg-[#FFD700] border-[#D4AF37] text-white"; 
                else if (w.target.includes(char)) style = "bg-[#C0C0C0] border-[#A9A9A9] text-white"; 
                else style = "bg-[#4B5563] border-[#374151] text-white opacity-40";
            }
            gridHtml += `<div class="w-10 h-10 flex items-center justify-center rounded-lg font-black uppercase transition-all ${style}">${char}</div>`;
        }
    }
    gridHtml += `</div>`;

    // עיצוב תיבת הרמז - ללא רקע במצב לילה
    const hintBoxStyle = isDark ? "bg-transparent border-b border-gray-700 pb-4" : "bg-blue-50 border-2 border-blue-100 p-3 rounded-2xl";

    app.innerHTML = `
        <div class="max-w-md mx-auto p-4 text-center">
            <div class="flex justify-between items-center mb-4">
                 <button onclick="state.screen='menu'; render()" class="text-gray-400">✕</button>
                 <h2 class="text-xl font-black ${isDark ? 'text-blue-300' : 'text-blue-800'} italic">THE SECRET CODE</h2>
                 <div class="w-8"></div>
            </div>

            <div class="${hintBoxStyle} mb-4">
                <p class="text-lg font-bold">רמז: ${w.hint}</p>
                <div class="flex justify-center gap-3 mt-2 text-[10px] font-bold opacity-80">
                    <span class="flex items-center gap-1"><span class="w-2 h-2 bg-[#FFD700] rounded-full"></span> בול</span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 bg-[#C0C0C0] rounded-full"></span> פוגע</span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 bg-[#4B5563] rounded-full"></span> לא בסט</span>
                </div>
            </div>

            ${gridHtml}
            <div class="mt-6">${renderQwerty(isDark)}</div>
        </div>
    `;
}

// 3. מקלדת - רקע שקוף לגמרי במצב לילה
function renderQwerty(isDark) { 
    const rows = [['q','w','e','r','t','y','u','i','o','p'], ['a','s','d','f','g','h','j','k','l', '⌫'], ['z','x','c','v','b','n','m', 'ENTER']]; 
    
    const keyStyle = isDark 
        ? "bg-transparent border border-gray-700 text-white" 
        : "bg-gray-200 text-gray-800";

    return rows.map(r => `
        <div class="qwerty-row" style="direction: ltr; display: flex; justify-content: center; gap: 4px; margin-bottom: 5px;">
            ${r.map(k => {
                const isWide = k === 'ENTER' || k === '⌫';
                return `<button onclick="handleKey('${k}')" 
                    class="${isWide ? 'px-2 py-3 text-[10px]' : 'w-8 h-10'} rounded font-bold uppercase ${keyStyle}">
                    ${k === 'ENTER' ? 'OK' : k}
                </button>`;
            }).join('')}
        </div>
    `).join(''); 
}

// 4. לוגיקה
function handleKey(k) {
    const w = state.wordQuest;
    if (!w || w.isGameOver) return;
    if (k === 'ENTER') {
        if (w.currentGuess.length === w.target.length) submitGuess();
    } else if (k === '⌫') {
        w.currentGuess = w.currentGuess.slice(0, -1);
    } else if (w.currentGuess.length < w.target.length && /^[a-z]$/i.test(k)) {
        w.currentGuess += k.toLowerCase();
    }
    render();
}

// 5. בדיקת ניחוש - תיקון כפתור "המשך"
function submitGuess() {
    const w = state.wordQuest;
    const guess = w.currentGuess;
    w.guesses.push(guess);

    if (guess === w.target || w.guesses.length >= w.maxAttempts) {
        w.isGameOver = true;
        const isWin = guess === w.target;
        
        setTimeout(() => {
            if (isWin && typeof triggerConfetti === 'function') triggerConfetti();
            
            // הגדרת המנצח והפעולה הבאה
            state.winner = { 
                type: 'wq', 
                msg: isWin ? 'בול פגיעה!' : 'הזמן נגמר', 
                subMsg: `המילה היא: ${w.target.toUpperCase()}`,
                // הקוד הזה יופעל כשיתבצע קליק על הכפתור במסך הניצחון
                action: 'startWordQuest()' 
            };
            render();
        }, 500);
    }
    w.currentGuess = '';
    render();
}

window.addEventListener('keydown', (e) => { if (state.screen === 'wordquest' && !state.wordQuest.showTutorial) { if (e.key === 'Enter') handleKey('ENTER'); else if (e.key === 'Backspace') handleKey('⌫'); else if (/^[a-z]$/i.test(e.key)) handleKey(e.key.toLowerCase()); } });

loadFromLocal();
render();













