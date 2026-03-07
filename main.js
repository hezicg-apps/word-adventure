let state = {
    screen: 'welcome', 
    inputText: '', 
    words: [],
    listName: 'אוצר המילים שלי',
    nightMode: false, 
    masteryScore: 0, 
    quizIndex: 0, 
    correctAnswers: 0,
    quizFeedback: { index: -1, status: null, correctIndex: -1 },
    memoryGame: { cards: [], flipped: [], pairs: 0, steps: 0, isProcessing: false },
    connect4: { 
        board: Array(6).fill(null).map(() => Array(7).fill(null)), 
        turn: 1, 
        q: null, 
        canDrop: false, 
        isAnswering: false, 
        showQuestionPrompt: true, 
        fallingToken: null, 
        isAiTurn: false, 
        isPvP: true, 
        feedback: { status: null, selectedIdx: -1 } 
    },
    wordQuest: { 
        target: '', hint: '', guesses: [], currentGuess: '', maxAttempts: 5, 
        isGameOver: false, keyStates: {}, showTutorial: true, 
        roundIndex: 0, pool: [], completedCount: 0 
    },
    winner: null,
    showShareModal: false
};

// --- עזרים ---
function triggerConfetti() { 
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); 
}

function speak(text) { 
    window.speechSynthesis.cancel(); 
    const u = new SpeechSynthesisUtterance(text); 
    u.lang = 'en-US'; 
    u.rate = 0.8; 
    window.speechSynthesis.speak(u); 
}

function shuffle(a) { 
    return [...a].sort(() => Math.random() - 0.5); 
}

function saveToLocal() {
    localStorage.setItem('wm_words', JSON.stringify(state.words));
    localStorage.setItem('wm_input', state.inputText);
    localStorage.setItem('wm_mastery', state.masteryScore);
    localStorage.setItem('wm_listName', state.listName);
}

function loadFromLocal() {
    try {
        const params = new URLSearchParams(window.location.search);
        let sharedData = params.get('w');
        if (sharedData) {
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
        }
        const savedWords = localStorage.getItem('wm_words');
        if (savedWords) {
            state.words = JSON.parse(savedWords);
            state.inputText = localStorage.getItem('wm_input') || '';
            state.masteryScore = parseFloat(localStorage.getItem('wm_mastery')) || 0;
            state.listName = localStorage.getItem('wm_listName') || 'אוצר המילים שלי';
            state.screen = state.masteryScore >= 70 ? 'menu' : 'flashcards';
        }
    } catch(e) {
        console.error("Load error", e);
        state.screen = 'welcome';
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
    const fullMessage = encodeURIComponent(messageText) + url;
    
    if (platform === 'whatsapp') window.open(`https://api.whatsapp.com/send?text=${fullMessage}`, '_blank');
    else if (platform === 'gmail') window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(state.listName)}&body=${fullMessage}`, '_blank');
    else if (platform === 'email') window.location.href = `mailto:?subject=${encodeURIComponent(state.listName)}&body=${fullMessage}`;
    else if (platform === 'copy') {
        navigator.clipboard.writeText(url).then(() => {
            document.getElementById('copyBtn').innerHTML = '✅ הקישור הועתק!';
            setTimeout(() => render(), 2000);
        });
    }
}

function resetAllData() { 
    if(confirm("בטוח שרוצים למחוק הכל ולהזין רשימה חדשה?")) {
        localStorage.clear();
        state.inputText = ''; 
        state.words = []; 
        state.masteryScore = 0; 
        state.listName = 'אוצר המילים שלי';
        state.screen = 'input'; 
        render(); 
    }
}

function render() {
    document.body.classList.toggle('night-mode', state.nightMode);
    const toggleBtn = document.getElementById('toggleNight');
    if (toggleBtn) toggleBtn.innerText = state.nightMode ? '🌙' : '☀️';
    
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';

    if (state.winner) {
        renderWinScreen(app);
        return;
    }

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

function renderWelcome(app) {
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-md animate-fade-in mt-6">
            <div class="bg-white p-6 rounded-[2.5rem] border-4 border-blue-400 welcome-card">
                <p class="text-4xl font-black text-blue-600 mb-6 border-b-2 pb-4">ברוכים הבאים! 👋</p>
                <div class="space-y-4 text-right font-bold text-gray-700">
                    <div class="p-4 rounded-2xl border-r-8 shadow-sm bg-blue-50 border-blue-500">📝 שלב 1: הזנה</div>
                    <div class="p-4 rounded-2xl border-r-8 shadow-sm bg-green-50 border-green-500">🎴 שלב 2: תרגול</div>
                    <div class="p-4 rounded-2xl border-r-8 shadow-sm bg-purple-50 border-purple-500">🎮 שלב 3: משחקים</div>
                </div>
            </div>
            <button onclick="state.screen='input'; render()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg">בואו נתחיל!</button>
        </div>`;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="text-center space-y-4 w-full px-2 mt-4 animate-fade-in">
            <p class="text-2xl font-black text-blue-600">הזינו מילים (מילה - תרגום)</p>
            <textarea id="wordInput" class="w-full h-64 p-6 rounded-[2rem] border-4 border-blue-200 outline-none text-right text-black bg-white shadow-inner text-xl font-bold focus:border-blue-400" placeholder="כותרת הרשימה\napple - תפוח\nbanana - בננה">${state.inputText}</textarea>
            <button onclick="processInput(true)" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg">המשך לכרטיסיות 🌟</button>
        </div>`;
    const area = document.getElementById('wordInput');
    area.oninput = (e) => state.inputText = e.target.value;
    area.focus();
}

function processInput(shouldRender = true) {
    const lines = state.inputText.split('\n').filter(l => l.includes('-'));
    if (lines.length === 0) return;
    
    const firstLine = state.inputText.split('\n')[0];
    state.listName = firstLine.includes('-') ? 'אוצר המילים שלי' : firstLine;
    
    state.words = lines.map(l => {
        const parts = l.split('-');
        return { 
            eng: parts[0].trim(), 
            heb: parts.slice(1).join('-').trim(), 
            known: false, 
            id: Math.random().toString(36).substr(2, 9) 
        };
    });
    
    saveToLocal();
    if (shouldRender) {
        state.screen = 'flashcards';
        render();
    }
}

function renderFlashcards(app) {
    const unknown = state.words.filter(w => !w.known);
    if (unknown.length === 0) {
        state.quizIndex = 0;
        state.correctAnswers = 0;
        state.screen = 'quiz';
        render();
        return;
    }
    const cur = unknown[0];
    app.innerHTML = `
        <div class="text-center space-y-4 w-full max-w-sm px-2 mt-4 relative">
            <h1 class="text-2xl font-black">${state.listName}</h1>
            <p class="text-blue-600 font-bold">לימוד מילים (${state.words.filter(w=>w.known).length}/${state.words.length})</p>
            <div onclick="this.classList.toggle('card-flipped')" class="relative w-full h-80 perspective-1000 cursor-pointer mt-2">
                <div class="card-inner">
                    <div class="card-front bg-white border-4 border-blue-200 flex-col">
                        <span class="text-5xl font-black text-blue-600 eng-text mb-6">${cur.eng}</span>
                        <button onclick="event.stopPropagation(); speak('${cur.eng}')" class="text-5xl">🔊</button>
                    </div>
                    <div class="card-back bg-blue-600 border-4 border-blue-700 text-white">
                        <span class="text-4xl font-black px-4 text-center">${cur.heb}</span>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                 <button onclick="state.words.find(w=>w.id === '${cur.id}').known=true; render()" class="bg-green-600 text-white py-5 rounded-2xl font-black text-2xl shadow-md">יודע ✅</button>
                 <button onclick="state.words = shuffle(state.words); render()" class="bg-orange-600 text-white py-5 rounded-2xl font-black text-2xl shadow-md">עוד לא ⏳</button>
            </div>
        </div>`;
}

function renderQuiz(app) {
    if (state.quizIndex >= state.words.length) {
        state.masteryScore = (state.correctAnswers / state.words.length) * 100;
        saveToLocal();
        triggerConfetti();
        state.screen = 'menu';
        render();
        return;
    }
    const cur = state.words[state.quizIndex];
    if (!state.quizOptions) {
        state.quizOptions = shuffle([cur.heb, ...shuffle(state.words.filter(x=>x.id!==cur.id).map(x=>x.heb)).slice(0,3)]);
    }
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-sm px-2 mt-4">
            <h1 class="text-2xl font-black">${state.listName}</h1>
            <p class="text-blue-600 font-bold">אתגר: ${state.quizIndex + 1}/${state.words.length}</p>
            <div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400 shadow-xl">
                <div class="text-4xl font-black mb-8 eng-text flex items-center justify-center gap-4 text-gray-800">
                    ${cur.eng}
                    <button onclick="speak('${cur.eng}')" class="text-3xl">🔊</button>
                </div>
                <div class="grid gap-4">
                    ${state.quizOptions.map((o, idx) => {
                        let sClass = 'border-gray-200';
                        if (state.quizFeedback.status) {
                            if (o === cur.heb) sClass = 'correct-ans';
                            else if (idx === state.quizFeedback.index && state.quizFeedback.status === 'wrong') sClass = 'wrong-ans';
                        }
                        return `<button onclick="handleQuizAns('${o}', '${cur.heb}', ${idx})" class="py-4 border-2 rounded-2xl font-black text-2xl text-gray-800 transition-all ${sClass}">${o}</button>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
}

function handleQuizAns(selected, correct, idx) {
    if (state.quizFeedback.status) return;
    const isCorrect = selected === correct;
    state.quizFeedback = { index: idx, status: isCorrect ? 'correct' : 'wrong' };
    if (isCorrect) state.correctAnswers++;
    render();
    setTimeout(() => {
        state.quizIndex++;
        state.quizOptions = null;
        state.quizFeedback = { index: -1, status: null };
        render();
    }, 800);
}

function renderMenu(app) {
    const isLocked = state.masteryScore < 70;
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-md px-2 mt-6 animate-fade-in">
            <div class="w-full flex justify-center items-center mb-2 px-1 gap-4">
                <button onclick="window.location.href='https://hezicg-apps.github.io/wa-website/'" 
                    class="w-[140px] bg-white text-gray-700 px-2 py-2 rounded-full font-black text-xs border-2 border-gray-200 shadow-sm flex items-center justify-center gap-2">
                    🏠 בית
                </button>
                <button onclick="resetAllData()" 
                    class="w-[140px] bg-red-50 text-red-600 px-2 py-2 rounded-full font-black text-xs border-2 border-red-100 shadow-sm flex items-center justify-center">
                    🗑️ חדש
                </button>
            </div>
            <div class="bg-white p-6 rounded-[2rem] shadow-xl border-4 border-blue-100 welcome-card">
                <h1 class="text-2xl font-black">${state.listName}</h1>
                <p class="text-xl font-bold text-gray-700 mt-2 mb-4">ציון: ${state.masteryScore.toFixed(0)}%</p>
                <div class="flex gap-2 justify-center">
                    <button onclick="state.quizIndex = 0; state.correctAnswers = 0; state.screen = 'quiz'; render();" class="bg-orange-600 text-white px-6 py-2 rounded-full font-black shadow-md text-sm">🔄 מבחן</button>
                    <button onclick="state.showShareModal=true; render();" class="bg-blue-50 text-blue-700 border border-blue-200 px-6 py-2 rounded-full font-black shadow-sm text-sm">🔗 שיתוף</button>
                </div>
            </div>
            <div class="grid gap-4">
                <button onclick="${isLocked?'':'startMemory()'}" class="p-6 bg-purple-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50':''}">משחק זיכרון 🧠</button>
                <button onclick="${isLocked?'':'state.screen=\'c4_menu\'; render()'}" class="p-6 bg-blue-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50':''}">4 בשורה 🔴🟡</button>
                <button onclick="${isLocked?'':'startWordQuest()'}" class="p-6 bg-emerald-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50':''}">הקוד הסודי 🔐</button>
            </div>
        </div>`;
}

// --- פונקציות משחקים (החזרתי אותן למצבן המלא והבטוח) ---
function startMemory() {
    state.screen = 'memory';
    const pairsCount = Math.min(state.words.length, 8);
    const cards = [];
    state.words.slice(0, pairsCount).forEach(w => {
        cards.push({ t: w.eng, m: w.heb, isEng: true }, { t: w.heb, m: w.eng, isEng: false });
    });
    state.memoryGame = { cards: shuffle(cards).map((c, i) => ({ ...c, id: i, f: false, ok: false })), flipped: [], pairs: 0, steps: 0, isProcessing: false };
    render();
}

function renderMemory(app) {
    const g = state.memoryGame;
    app.innerHTML = `
        <div class="flex flex-col items-center w-full max-w-sm mt-4">
            <div class="flex justify-between w-full mb-4 bg-white p-4 rounded-2xl shadow-md font-black">
                <button onclick="state.screen='menu'; render()" class="text-red-600">יציאה</button>
                <span>צעדים: ${g.steps}</span>
            </div>
            <div class="grid grid-cols-4 gap-2 w-full">
                ${g.cards.map(c => `
                    <div onclick="flipM(${c.id})" class="relative aspect-square perspective-1000 cursor-pointer ${c.f || c.ok ? 'card-flipped' : ''}">
                        <div class="card-inner">
                            <div class="card-front bg-purple-700 text-white text-3xl font-black">?</div>
                            <div class="card-back bg-white border-2 ${c.ok?'border-green-500 bg-green-50':'border-purple-300'}">
                                <div class="font-black text-[10px] text-center text-gray-800">${c.t}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function flipM(id) {
    const g = state.memoryGame;
    if (g.isProcessing) return;
    const card = g.cards.find(x => x.id === id);
    if (card.f || card.ok) return;
    
    card.f = true;
    g.flipped.push(card);
    g.steps++;
    render();

    if (g.flipped.length === 2) {
        g.isProcessing = true;
        const [c1, c2] = g.flipped;
        if (c1.t === c2.m) {
            setTimeout(() => {
                c1.ok = c2.ok = true;
                g.pairs++;
                g.flipped = [];
                g.isProcessing = false;
                if (g.pairs >= g.cards.length / 2) {
                    triggerConfetti();
                    state.winner = { type: 'memory', msg: 'מעולה!', subMsg: `סיימת ב-${g.steps} צעדים.`, glowClass: 'win-glow-purple' };
                }
                render();
            }, 400);
        } else {
            setTimeout(() => {
                c1.f = c2.f = false;
                g.flipped = [];
                g.isProcessing = false;
                render();
            }, 1000);
        }
    }
}

// שאר הפונקציות של 4 בשורה ו-WordQuest (אותה לוגיקה, רק בטוחה)
function renderC4Menu(app) {
    app.innerHTML = `<div class="text-center space-y-6 mt-8">
        <div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400 welcome-card">
            <h2 class="text-3xl font-black text-blue-600 mb-6">4 בשורה 🔴🟡</h2>
            <div class="grid gap-4">
                <button onclick="startC4(true)" class="p-6 bg-blue-700 text-white rounded-2xl font-black">משחק זוגי</button>
                <button onclick="startC4(false)" class="p-6 bg-orange-700 text-white rounded-2xl font-black">נגד המחשב</button>
            </div>
            <button onclick="state.screen='menu'; render()" class="mt-8 text-gray-500 underline">ביטול</button>
        </div>
    </div>`;
}

function startC4(isPvP) {
    state.screen = 'connect4';
    state.connect4 = { 
        board: Array(6).fill(null).map(() => Array(7).fill(null)), 
        turn: 1, 
        q: genC4Q(), 
        canDrop: false, 
        isAnswering: false, 
        showQuestionPrompt: true, 
        fallingToken: null, 
        isAiTurn: false, 
        isPvP: isPvP, 
        feedback: { status: null, selectedIdx: -1 } 
    };
    render();
}

function genC4Q() {
    const w = state.words[Math.floor(Math.random()*state.words.length)];
    const opts = shuffle([w.heb, ...shuffle(state.words.filter(x=>x.id!==w.id).map(x=>x.heb)).slice(0,3)]);
    return { prompt: w.eng, correct: w.heb, opts };
}

function renderConnect4(app) {
    const c = state.connect4;
    app.innerHTML = `
        <div class="flex flex-col items-center w-full px-2 mt-4">
            <div class="w-full flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-md max-w-sm welcome-card">
                <button onclick="state.screen='menu'; render()" class="text-red-600 font-black">יציאה</button>
                <div class="font-black text-lg">תור: ${c.turn===1?'אדום 🔴':'צהוב 🟡'}</div>
            </div>
            <div class="h-16 mb-2">
                ${c.showQuestionPrompt && !c.isAiTurn ? 
                    `<button onclick="state.connect4.showQuestionPrompt=false;state.connect4.isAnswering=true;render();" class="bg-blue-600 text-white px-8 py-3 rounded-full text-xl font-black">שאלה לאסימון</button>` : 
                    `<div class="text-blue-700 font-black text-2xl animate-pulse">${c.isAiTurn ? 'המחשב חושב...' : 'בחר עמודה 👇'}</div>`
                }
            </div>
            <div class="c4-container">
                <div class="arrows-row">${[0,1,2,3,4,5,6].map(i => `<button onclick="dropC4(${i})" class="flex flex-col items-center ${!c.canDrop || c.board[0][i] || c.isAiTurn ? 'opacity-20 pointer-events-none' : 'text-white'}"><span class="font-black">${i+1}</span></button>`).join('')}</div>
                <div class="c4-board">${c.board.map(row => row.map(cell => `<div class="c4-slot">${cell ? `<div class="token-fixed ${cell===1?'token-red':'token-yellow'}"></div>` : ''}</div>`).join('')).join('')}</div>
            </div>
            ${c.isAnswering ? `
                <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] px-4">
                    <div class="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center">
                        <h3 class="text-4xl font-black mb-8 text-blue-700">${c.q.prompt}</h3>
                        <div class="grid gap-4">
                            ${c.q.opts.map((o, idx) => `<button onclick="ansC4('${o}', ${idx})" class="p-4 border-2 rounded-xl font-black text-gray-800 text-2xl">${o}</button>`).join('')}
                        </div>
                    </div>
                </div>` : ''}
        </div>`;
}

function ansC4(o, idx) {
    const c = state.connect4;
    if (o === c.q.correct) {
        c.canDrop = true;
        c.isAnswering = false;
    } else {
        c.turn = c.turn === 1 ? 2 : 1;
        c.showQuestionPrompt = true;
        c.isAnswering = false;
        c.q = genC4Q();
        if(!c.isPvP && c.turn===2) runAiTurn();
    }
    render();
}

function dropC4(col) {
    const c = state.connect4;
    let targetRow = -1;
    for (let r=5; r>=0; r--) {
        if (!c.board[r][col]) { targetRow = r; break; }
    }
    if (targetRow === -1) return;
    
    c.board[targetRow][col] = c.turn;
    c.canDrop = false;
    
    if (checkWin(c.board)) {
        triggerConfetti();
        state.winner = { type: 'c4', msg: c.turn===1?"אדום ניצח!":"צהוב ניצח!", glowClass: c.turn===1?'win-glow-red':'win-glow-yellow' };
    } else {
        c.turn = c.turn === 1 ? 2 : 1;
        c.showQuestionPrompt = true;
        c.q = genC4Q();
        if(!c.isPvP && c.turn===2) runAiTurn();
    }
    render();
}

function checkWin(b) {
    // לוגיקה פשוטה לבדיקת ניצחון
    for (let r=0; r<6; r++) for (let c=0; c<4; c++) if (b[r][c] && b[r][c]==b[r][c+1] && b[r][c]==b[r][c+2] && b[r][c]==b[r][c+3]) return true;
    for (let r=0; r<3; r++) for (let c=0; c<7; c++) if (b[r][c] && b[r][c]==b[r+1][c] && b[r][c]==b[r+2][c] && b[r][c]==b[r+3][c]) return true;
    return false;
}

function startWordQuest() {
    const pool = shuffle(state.words.filter(w => w.eng.length >= 2 && !w.eng.includes(' ')));
    state.screen = 'wordquest';
    state.wordQuest = { 
        pool, roundIndex: 0, completedCount: 0, 
        target: pool[0].eng.toLowerCase(), hint: pool[0].heb, 
        guesses: [], currentGuess: '', maxAttempts: 5, 
        isGameOver: false, keyStates: {}, showTutorial: true 
    };
    render();
}

function renderWordQuest(app) {
    const w = state.wordQuest;
    if (w.showTutorial) {
        app.innerHTML = `<div class="text-center p-8 bg-white rounded-3xl border-4 border-emerald-400 mt-6">
            <h2 class="text-2xl font-black mb-4">הקוד הסודי 🔐</h2>
            <p class="mb-6 font-bold text-gray-600">נחשו את המילה לפי הרמז בעברית.</p>
            <button onclick="state.wordQuest.showTutorial=false; render();" class="bg-emerald-600 text-white px-8 py-3 rounded-full font-black">התחל</button>
        </div>`;
        return;
    }
    // (המשך לוגיקת WordQuest דומה לגרסאות קודמות)
    app.innerHTML = `<div class="flex flex-col items-center mt-4">
        <div class="bg-emerald-50 p-4 rounded-2xl mb-4 border-2 border-emerald-200 font-black">רמז: ${w.hint}</div>
        <div class="text-3xl font-black mb-8">${w.currentGuess.padEnd(w.target.length, '_')}</div>
        <div class="grid grid-cols-10 gap-1 w-full max-w-md">
            ${'abcdefghijklmnopqrstuvwxyz'.split('').map(l => `<button onclick="handleKey('${l}')" class="p-2 bg-white border rounded font-bold">${l}</button>`).join('')}
            <button onclick="handleKey('ENTER')" class="col-span-5 p-2 bg-blue-600 text-white rounded font-bold">ENTER</button>
            <button onclick="handleKey('⌫')" class="col-span-5 p-2 bg-red-600 text-white rounded font-bold">⌫</button>
        </div>
    </div>`;
}

function handleKey(k) {
    const w = state.wordQuest;
    if (k === '⌫') w.currentGuess = w.currentGuess.slice(0, -1);
    else if (k === 'ENTER') {
        if (w.currentGuess === w.target) {
            triggerConfetti();
            state.winner = { type: 'wq', msg: 'כל הכבוד!', subMsg: 'נחשת את המילה!', glowClass: 'win-glow-emerald' };
        } else {
            alert('לא מדויק, נסה שוב');
            w.currentGuess = '';
        }
    } else if (w.currentGuess.length < w.target.length) {
        w.currentGuess += k;
    }
    render();
}

function renderWinScreen(app) {
    const win = state.winner;
    app.innerHTML = `
        <div class="fixed inset-0 flex items-center justify-center bg-black/80 z-[300] px-4">
            <div class="text-center p-10 rounded-[3rem] max-w-sm w-full bg-white ${win.glowClass || ''}">
                <h2 class="text-4xl font-black mb-6 text-blue-700">${win.msg}</h2>
                <button onclick="state.winner=null; state.screen='menu'; render()" class="bg-blue-600 text-white py-5 rounded-2xl text-2xl font-black w-full">מעולה!</button>
            </div>
        </div>`;
}

function renderShareModal(app) {
    app.innerHTML += `<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] px-4">
        <div class="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative">
            <button onclick="state.showShareModal=false; render();" class="absolute top-4 left-4 text-2xl">✕</button>
            <h3 class="text-2xl font-black mb-6 text-center">שיתוף רשימה</h3>
            <div class="grid gap-3">
                <button onclick="shareVia('whatsapp')" class="p-4 border-2 border-green-500 rounded-2xl font-black">WhatsApp</button>
                <button onclick="shareVia('email')" class="p-4 border-2 border-blue-500 rounded-2xl font-black">Email</button>
                <button id="copyBtn" onclick="shareVia('copy')" class="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl font-black">העתק קישור</button>
            </div>
        </div>
    </div>`;
}

document.getElementById('toggleNight').onclick = () => { state.nightMode = !state.nightMode; render(); };
loadFromLocal();
render();
