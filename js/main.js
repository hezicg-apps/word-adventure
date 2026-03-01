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
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, showQuestionPrompt: true, fallingToken: null, isAiTurn: false, isPvP: true, feedback: { status: null, selectedIdx: -1 } },
    wordQuest: { target: '', hint: '', guesses: [], currentGuess: '', maxAttempts: 5, isGameOver: false, keyStates: {}, showTutorial: true, roundIndex: 0, pool: [], completedCount: 0 },
    winner: null
};

// --- ניהול זיכרון ---
function saveToLocal() {
    localStorage.setItem('wm_words', JSON.stringify(state.words));
    localStorage.setItem('wm_input', state.inputText);
    localStorage.setItem('wm_listName', state.listName);
}

function loadFromLocal() {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('w');
    if (sharedData) {
        try {
            state.inputText = decodeURIComponent(escape(atob(sharedData)));
            processInput(false);
            state.screen = 'welcome';
            return;
        } catch(e) { console.error("פענוח נכשל"); }
    }
    const savedWords = localStorage.getItem('wm_words');
    if (savedWords) {
        state.words = JSON.parse(savedWords);
        state.inputText = localStorage.getItem('wm_input') || '';
        state.listName = localStorage.getItem('wm_listName') || 'אוצר המילים שלי';
        state.screen = 'menu';
        state.masteryScore = 100; 
    }
}

// --- פונקציות ליבה ---
function triggerConfetti() { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u); }
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

// --- רינדור (כולל כותרת צהובה ולוגו) ---
function render() {
    document.body.classList.toggle('night-mode', state.nightMode);
    const nightBtn = document.getElementById('toggleNight');
    if (nightBtn) nightBtn.innerText = state.nightMode ? '🌙' : '☀️';

    const titleArea = document.getElementById('header-title-area');
    const logoArea = document.getElementById('header-logo');

    if (['welcome', 'input'].includes(state.screen)) {
        titleArea.innerHTML = `<h1 class="text-3xl font-black text-blue-600">Word Adventure</h1>`;
        logoArea.innerHTML = '';
    } else {
        // הכותרת הצהובה המקורית
        titleArea.innerHTML = `
            <div id="list-header-container" class="bg-blue-600 py-2 px-8 rounded-full inline-block shadow-lg border-4 border-white transform -rotate-1">
                <h1 class="text-2xl font-black text-yellow-400">${state.listName}</h1>
            </div>`;
        logoArea.innerHTML = `<img src="logo.png" class="w-12 h-12 rounded-xl shadow-md border-2 border-white" onerror="this.style.display='none'">`;
    }

    const app = document.getElementById('app'); 
    if (state.winner) { app.innerHTML = ''; renderWinScreen(app); return; }

    app.innerHTML = '';
    const contentArea = document.createElement('div');
    contentArea.className = "w-full flex flex-col items-center";
    app.appendChild(contentArea);
    
    renderScreenContent(contentArea);
}

function renderScreenContent(container) {
    switch(state.screen) {
        case 'welcome': renderWelcome(container); break;
        case 'input': renderInput(container); break;
        case 'flashcards': renderFlashcards(container); break;
        case 'quiz': renderQuiz(container); break;
        case 'menu': renderMenu(container); break;
        case 'memory': renderMemory(container); break;
        case 'c4_menu': renderC4Menu(container); break;
        case 'connect4': renderConnect4(container); break;
        case 'wordquest': renderWordQuest(container); break;
    }
}

// --- מסכי למידה ---
function renderWelcome(app) {
    app.innerHTML = `<div class="text-center space-y-6 w-full max-w-md mt-6"><div class="bg-white p-6 rounded-[2.5rem] border-4 border-blue-400 shadow-xl welcome-card text-black"><p class="text-4xl font-black text-blue-600 mb-6">היי! 👋</p><button onclick="state.screen='input'; render()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg">בואו נתחיל! 🚀</button></div></div>`;
}

function renderInput(app) {
    app.innerHTML = `<div class="text-center space-y-4 w-full px-2 mt-4"><p class="text-2xl font-black text-blue-600">הזינו כותרת ואז מילים</p><textarea id="wordInput" class="w-full h-64 p-6 rounded-[2.5rem] border-4 border-blue-200 outline-none text-right text-black bg-white shadow-inner text-xl font-bold">${state.inputText}</textarea><button onclick="processInput(true)" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg">המשך 🌟</button></div>`;
    const area = document.getElementById('wordInput'); area.oninput = (e) => state.inputText = e.target.value; area.focus();
}

function processInput(shouldNavigate = true) {
    const lines = state.inputText.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) return;
    if (!lines[0].includes('-')) { state.listName = lines[0]; lines.shift(); } 
    state.words = lines.filter(l => l.includes('-')).map(l => {
        const parts = l.split('-');
        return { eng: parts[0].trim(), heb: parts.slice(1).join('-').trim(), known: false, id: crypto.randomUUID() };
    });
    saveToLocal();
    if (shouldNavigate) { state.screen = 'flashcards'; render(); }
}

function renderFlashcards(app) {
    const unknown = state.words.filter(w => !w.known);
    if (unknown.length === 0) { state.quizIndex = 0; state.screen = 'quiz'; render(); return; }
    const cur = unknown[0];
    app.innerHTML = `<div class="text-center space-y-4 w-full max-w-sm mt-2"><div onclick="this.classList.toggle('card-flipped')" class="relative w-full h-80 perspective-1000 cursor-pointer"><div class="card-inner"><div class="card-front bg-white border-4 border-blue-200 text-5xl font-black text-blue-600 flex-col">${cur.eng}<button onclick="event.stopPropagation(); speak('${cur.eng}')" class="text-4xl mt-4">🔊</button></div><div class="card-back bg-blue-500 text-white text-4xl font-black border-4 border-blue-600">${cur.heb}</div></div></div><div class="grid grid-cols-2 gap-4"><button onclick="state.words.find(w=>w.id==='${cur.id}').known=true; saveToLocal(); render()" class="bg-green-500 text-white py-5 rounded-2xl font-black text-2xl">יודע ✅</button><button onclick="state.words = shuffle(state.words); render()" class="bg-orange-500 text-white py-5 rounded-2xl font-black text-2xl">עוד לא ⏳</button></div></div>`;
}

function renderQuiz(app) {
    if (state.quizIndex >= state.words.length) { triggerConfetti(); state.screen = 'menu'; render(); return; }
    const cur = state.words[state.quizIndex];
    if (!state.quizOptions) state.quizOptions = shuffle([cur.heb, ...shuffle(state.words.filter(x=>x.id!==cur.id).map(x=>x.heb)).slice(0,3)]);
    app.innerHTML = `<div class="text-center space-y-6 w-full max-w-sm mt-2"><div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400 shadow-xl welcome-card text-black"><div class="text-4xl font-black mb-8 flex items-center justify-center gap-4">${cur.eng}<button onclick="speak('${cur.eng}')" class="text-3xl">🔊</button></div><div class="grid gap-4">${state.quizOptions.map((o, idx) => {
        let s = 'bg-white border-gray-200'; if(state.quizFeedback.status){ if(o===cur.heb) s='bg-green-500 text-white border-green-600'; else if(idx===state.quizFeedback.index) s='bg-red-500 text-white border-red-600'; else s='opacity-50'; }
        return `<button onclick="handleQuizAns('${o}', '${cur.heb}', ${idx})" class="py-4 border-2 rounded-2xl font-black text-2xl transition-all ${s}">${o}</button>`;
    }).join('')}</div></div></div>`;
}

function handleQuizAns(sel, corr, idx) {
    if (state.quizFeedback.status) return;
    state.quizFeedback = { status: 'done', index: idx };
    if (sel === corr) state.correctAnswers++;
    render();
    setTimeout(() => { state.quizIndex++; state.quizOptions = null; state.quizFeedback = { index: -1, status: null }; render(); }, 800);
}

function renderMenu(app) {
    app.innerHTML = `<div class="text-center space-y-6 w-full max-w-md mt-2"><div class="bg-white p-6 rounded-[2rem] shadow-xl welcome-card text-black border-4 border-blue-50"><h2 class="text-2xl font-black text-blue-600 mb-4">ציון: ${((state.correctAnswers/state.words.length)*100).toFixed(0)}%</h2><button onclick="state.quizIndex=0; state.correctAnswers=0; state.screen='quiz'; render();" class="bg-orange-500 text-white px-6 py-2 rounded-full font-black">🔄 מבחן חוזר</button></div><div class="grid gap-4"><button onclick="startMemory()" class="p-6 bg-purple-500 text-white rounded-[2rem] text-2xl font-black shadow-lg">משחק זיכרון 🧠</button><button onclick="state.screen='c4_menu'; render()" class="p-6 bg-blue-500 text-white rounded-[2rem] text-2xl font-black shadow-lg">4 בשורה 🔴🟡</button><button onclick="startWordQuest()" class="p-6 bg-emerald-500 text-white rounded-[2rem] text-2xl font-black shadow-lg">הקוד הסודי 🔐</button></div></div>`;
}

// --- משחק 4 בשורה (הלוגיקה ששיפרנו היום) ---
function renderC4Menu(app) {
    app.innerHTML = `<div class="text-center space-y-6 w-full max-w-sm mt-4"><div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400 shadow-xl welcome-card text-black"><h2 class="text-3xl font-black text-blue-600 mb-6">4 בשורה 🔴🟡</h2><button onclick="startC4(true)" class="p-6 bg-blue-700 text-white rounded-2xl w-full mb-4 font-black text-xl">משחק זוגי 👥</button><button onclick="startC4(false)" class="p-6 bg-orange-600 text-white rounded-2xl w-full font-black text-xl">נגד המחשב 🤖</button></div></div>`;
}

function startC4(isPvP) {
    state.screen = 'connect4'; state.winner = null;
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: genC4Q(), canDrop: false, isAnswering: true, isPvP: isPvP, feedback: { status: null, selectedIdx: -1 } };
    render();
}

function genC4Q() {
    const w = state.words[Math.floor(Math.random()*state.words.length)];
    const opts = shuffle([w.heb, ...shuffle(state.words.filter(x=>x.id!==w.id).map(x=>x.heb)).slice(0,3)]);
    return { prompt: w.eng, correct: w.heb, opts };
}

function renderConnect4(app) {
    const c = state.connect4;
    app.innerHTML = `<div class="flex flex-col items-center w-full px-2"><div class="bg-white p-4 rounded-xl shadow mb-4 flex justify-between w-full max-w-xs text-black welcome-card"><button onclick="state.screen='menu'; render()" class="text-red-500 font-black">יציאה</button><div class="font-black">תור: ${c.turn===1?'אדום 🔴':'צהוב 🟡'}</div></div><div class="grid grid-cols-7 gap-1 bg-blue-800 p-2 rounded-xl shadow-2xl border-4 border-blue-900">${c.board.map((row, r) => row.map((cell, col) => `<div onclick="dropC4(${col})" class="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center cursor-pointer">${cell ? `<div class="w-8 h-8 rounded-full ${cell===1?'bg-red-500':'bg-yellow-400'}"></div>` : ''}</div>`).join('')).join('')}</div>${c.isAnswering ? `<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4"><div class="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center text-black welcome-card"><h3 class="text-3xl font-black mb-6 text-blue-600">${c.q.prompt}</h3><div class="grid gap-4">${c.q.opts.map((o, idx) => `<button onclick="ansC4('${o}', ${idx})" class="p-4 border-2 rounded-xl font-black text-xl">${o}</button>`).join('')}</div></div></div>` : ''}</div>`;
}

function dropC4(col) {
    const c = state.connect4; if (!c.canDrop) return;
    for (let r=5; r>=0; r--) {
        if (!c.board[r][col]) {
            c.board[r][col] = c.turn;
            if (checkWin(c.board)) { triggerConfetti(); state.winner = { msg: 'ניצחון!' }; }
            else { c.turn = c.turn === 1 ? 2 : 1; c.canDrop = false; c.isAnswering = true; c.q = genC4Q(); if(!c.isPvP && c.turn===2) setTimeout(aiMove, 600); }
            render(); break;
        }
    }
}

function aiMove() {
    const c = state.connect4; if (c.isPvP || c.turn !== 2) return;
    const validCols = [0,1,2,3,4,5,6].filter(col => !c.board[0][col]);
    if (validCols.length > 0) {
        const col = validCols[Math.floor(Math.random()*validCols.length)];
        c.board[5][col] = 2; // פשטות למחשב
        if (checkWin(c.board)) { state.winner = { msg: 'המחשב ניצח!' }; }
        else { c.turn = 1; c.isAnswering = true; c.q = genC4Q(); }
        render();
    }
}

function ansC4(o, idx) {
    const c = state.connect4; if (o === c.q.correct) { c.canDrop = true; c.isAnswering = false; }
    else { c.turn = c.turn === 1 ? 2 : 1; c.q = genC4Q(); if(!c.isPvP && c.turn===2) setTimeout(aiMove, 600); }
    render();
}

function checkWin(b) {
    for (let r=0; r<6; r++) for (let c=0; c<4; c++) if (b[r][c] && b[r][c]==b[r][c+1] && b[r][c]==b[r][c+2] && b[r][c]==b[r][c+3]) return true;
    for (let r=0; r<3; r++) for (let c=0; c<7; c++) if (b[r][c] && b[r][c]==b[r+1][c] && b[r][c]==b[r+2][c] && b[r][c]==b[r+3][c]) return true;
    return false;
}

// --- שאר המשחקים ---
function startMemory() {
    state.screen = 'memory'; state.winner = null;
    const cards = [];
    state.words.slice(0, 8).forEach(w => { cards.push({ t: w.eng, m: w.heb, isEng: true }, { t: w.heb, m: w.eng, isEng: false }); });
    state.memoryGame = { cards: shuffle(cards).map((c, i) => ({ ...c, id: i, f: false, ok: false })), flipped: [], pairs: 0, steps: 0, isProcessing: false };
    render();
}

function renderMemory(app) {
    const g = state.memoryGame;
    app.innerHTML = `<div class="flex flex-col items-center w-full max-w-sm mt-2"><div class="flex justify-between items-center w-full mb-4 bg-white p-4 rounded-2xl shadow-md text-black welcome-card"><button onclick="state.screen='menu'; render()" class="text-red-500 font-black">יציאה</button><span class="text-lg font-black">זוגות: ${g.pairs}</span></div><div class="grid grid-cols-4 gap-2 w-full">${g.cards.map(c => `<div onclick="flipM(${c.id})" class="relative aspect-square perspective-1000 cursor-pointer ${c.f || c.ok ? 'card-flipped' : ''}"><div class="card-inner"><div class="card-front bg-purple-600 text-white text-3xl font-black">?</div><div class="card-back bg-white border-2 ${c.ok?'border-green-400 bg-green-50':'border-purple-200'} text-black flex items-center justify-center p-1 text-center"><span class="font-black text-xs">${c.t}</span></div></div></div>`).join('')}</div></div>`;
}

function flipM(id) {
    const g = state.memoryGame; if (g.isProcessing) return;
    const card = g.cards.find(x => x.id === id); if (card.f || card.ok) return;
    card.f = true; g.flipped.push(card); render();
    if (g.flipped.length === 2) {
        g.isProcessing = true;
        if (g.flipped[0].t === g.flipped[1].m || g.flipped[0].m === g.flipped[1].t) {
            setTimeout(() => { g.flipped[0].ok = g.flipped[1].ok = true; g.pairs++; g.flipped = []; g.isProcessing = false; if (g.pairs >= g.cards.length / 2) { triggerConfetti(); state.winner = { msg: 'ניצחון!' }; } render(); }, 400);
        } else { setTimeout(() => { g.flipped[0].f = g.flipped[1].f = false; g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

function startWordQuest() {
    state.screen = 'wordquest'; state.winner = null;
    const word = state.words[Math.floor(Math.random()*state.words.length)].eng.toLowerCase();
    state.wordQuest = { target: word, hint: state.words.find(w=>w.eng.toLowerCase()===word).heb, guesses: [], currentGuess: '', maxAttempts: 5, isGameOver: false };
    render();
}

function renderWordQuest(app) {
    const w = state.wordQuest;
    app.innerHTML = `<div class="flex flex-col items-center w-full max-w-sm mt-2 text-black"><div class="bg-white p-4 rounded-xl shadow mb-4 w-full flex justify-between welcome-card"><button onclick="state.screen='menu'; render()" class="text-red-500 font-black">יציאה</button><div class="font-black text-emerald-600">רמז: ${w.hint}</div></div><div class="grid gap-2 mb-6">${Array(w.maxAttempts).fill().map((_, i) => `<div class="flex gap-2">${Array(w.target.length).fill().map((_, j) => `<div class="w-10 h-10 border-2 rounded flex items-center justify-center font-bold bg-white">${(w.guesses[i]||(i===w.guesses.length?w.currentGuess:''))[j] || ''}</div>`).join('')}</div>`).join('')}</div><input id="wqInput" type="text" maxlength="${w.target.length}" class="p-3 border-2 rounded-xl text-center font-black" placeholder="הקלידו כאן"></div>`;
    const input = document.getElementById('wqInput');
    if(input) {
        input.oninput = (e) => { w.currentGuess = e.target.value.toLowerCase(); render(); };
        input.onkeydown = (e) => { if(e.key==='Enter' && w.currentGuess.length===w.target.length){ w.guesses.push(w.currentGuess); if(w.currentGuess===w.target){ triggerConfetti(); state.winner={msg:'כל הכבוד!'}; } else if(w.guesses.length>=w.maxAttempts) state.winner={msg:'הפסד', subMsg:w.target}; w.currentGuess=''; render(); } };
        input.focus();
    }
}

function renderWinScreen(app) {
    app.innerHTML = `<div class="fixed inset-0 flex items-center justify-center bg-black/80 z-[300] p-4 text-black"><div class="bg-white p-10 rounded-[3rem] text-center shadow-2xl"><h2 class="text-4xl font-black text-blue-600 mb-6">${state.winner.msg}</h2><button onclick="state.winner=null; state.screen='menu'; render()" class="bg-blue-600 text-white py-4 px-10 rounded-2xl text-2xl font-black">המשך</button></div></div>`;
}

function resetAllData() { if(confirm('למחוק?')) { localStorage.clear(); location.reload(); } }

document.addEventListener('click', (e) => { if (e.target.closest('#toggleNight')) { state.nightMode = !state.nightMode; render(); } });

loadFromLocal();
render();
