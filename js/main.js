let state = {
    screen: 'welcome', 
    inputText: '', 
    words: [],
    listName: 'אוצר המילים שלי',
    nightMode: false, 
    masteryScore: 0, 
    quizIndex: 0, 
    correctAnswers: 0,
    quizFeedback: { index: -1, status: null },
    memoryGame: { cards: [], flipped: [], pairs: 0, steps: 0, isProcessing: false },
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, showQuestionPrompt: true, isAiTurn: false, isPvP: true, feedback: { status: null, selectedIdx: -1 } },
    wordQuest: { target: '', hint: '', guesses: [], currentGuess: '', maxAttempts: 5, isGameOver: false, keyStates: {}, roundIndex: 0, pool: [] },
    winner: null
};

// --- עזרים ---
function triggerConfetti() { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8; window.speechSynthesis.speak(u); }
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

// --- ניהול נתונים ---
function saveToLocal() {
    localStorage.setItem('wm_words', JSON.stringify(state.words));
    localStorage.setItem('wm_input', state.inputText);
    localStorage.setItem('wm_mastery', state.masteryScore);
}

function loadFromLocal() {
    const savedWords = localStorage.getItem('wm_words');
    if (savedWords) {
        state.words = JSON.parse(savedWords);
        state.inputText = localStorage.getItem('wm_input') || '';
        state.masteryScore = parseFloat(localStorage.getItem('wm_mastery')) || 0;
        state.screen = state.masteryScore >= 70 ? 'menu' : 'flashcards';
    }
}

// --- רינדור מסכים ---
function render() {
    document.body.classList.toggle('night-mode', state.nightMode);
    const app = document.getElementById('app');
    if(!app) return;
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
}

function renderWelcome(app) {
    app.innerHTML = `<div class="text-center space-y-6 animate-fade-in mt-10"><div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400 welcome-card shadow-xl"><p class="text-4xl font-black text-blue-600 mb-6">ברוכים הבאים! 👋</p><p class="text-xl font-bold text-gray-700">בואו נלמד אנגלית בכיף.</p></div><button onclick="state.screen='input'; render()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg">בואו נתחיל!</button></div>`;
}

function renderInput(app) {
    app.innerHTML = `<div class="text-center space-y-4 animate-fade-in"><p class="text-2xl font-black text-blue-600">הזינו מילים (מילה - תרגום)</p><textarea id="wordInput" class="w-full h-64 p-6 rounded-[2rem] border-4 border-blue-200 text-right text-xl font-bold">${state.inputText}</textarea><button onclick="processInput()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg">המשך לכרטיסיות 🌟</button></div>`;
    document.getElementById('wordInput').oninput = (e) => state.inputText = e.target.value;
}

function processInput() {
    const lines = state.inputText.split('\n').filter(l => l.includes('-'));
    if (lines.length === 0) return;
    state.words = lines.map(l => { const parts = l.split('-'); return { eng: parts[0].trim(), heb: parts[1].trim(), known: false, id: Math.random() }; });
    saveToLocal(); state.screen = 'flashcards'; render();
}

function renderFlashcards(app) {
    const unknown = state.words.filter(w => !w.known);
    if (unknown.length === 0) { state.quizIndex = 0; state.correctAnswers = 0; state.screen = 'quiz'; render(); return; }
    const cur = unknown[0];
    app.innerHTML = `<div class="text-center space-y-6"><h2 class="text-2xl font-black">לימוד (${state.words.filter(w=>w.known).length}/${state.words.length})</h2><div onclick="this.classList.toggle('card-flipped')" class="relative w-full h-80 perspective-1000 cursor-pointer"><div class="card-inner"><div class="card-front flex-col"><span class="text-5xl font-black text-blue-600 mb-4">${cur.eng}</span><button onclick="event.stopPropagation(); speak('${cur.eng}')" class="text-4xl">🔊</button></div><div class="card-back"><span class="text-4xl font-black px-4">${cur.heb}</span></div></div></div><div class="grid grid-cols-2 gap-4"><button onclick="state.words.find(w=>w.id===${cur.id}).known=true; render()" class="bg-green-600 text-white py-5 rounded-2xl font-black text-2xl shadow-md">יודע ✅</button><button onclick="state.words = shuffle(state.words); render()" class="bg-orange-600 text-white py-5 rounded-2xl font-black text-2xl shadow-md">עוד לא ⏳</button></div></div>`;
}

function renderQuiz(app) {
    if (state.quizIndex >= state.words.length) { state.masteryScore = (state.correctAnswers/state.words.length)*100; saveToLocal(); triggerConfetti(); state.screen = 'menu'; render(); return; }
    const cur = state.words[state.quizIndex];
    if (!state.quizOptions) state.quizOptions = shuffle([cur.heb, ...shuffle(state.words.filter(x=>x.id!==cur.id).map(x=>x.heb)).slice(0,3)]);
    app.innerHTML = `<div class="text-center space-y-6"><h2 class="text-2xl font-black">מבחן: ${state.quizIndex+1}/${state.words.length}</h2><div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400 shadow-xl"><div class="text-4xl font-black mb-8 flex items-center justify-center gap-4">${cur.eng}<button onclick="speak('${cur.eng}')" class="text-3xl">🔊</button></div><div class="grid gap-4">${state.quizOptions.map((o, i) => `<button onclick="handleQuizAns('${o}', ${i})" class="py-4 border-2 rounded-2xl font-black text-xl border-gray-200">${o}</button>`).join('')}</div></div></div>`;
}

function handleQuizAns(sel, idx) {
    if (sel === state.words[state.quizIndex].heb) state.correctAnswers++;
    state.quizIndex++; state.quizOptions = null; render();
}

function renderMenu(app) {
    const isLocked = state.masteryScore < 70;
    app.innerHTML = `<div class="text-center space-y-6 mt-6"><div class="bg-white p-6 rounded-[2rem] shadow-xl border-4 border-blue-100"><h2 class="text-2xl font-black">${isLocked?'המשיכו להתאמן':'המשחקים פתוחים!'}</h2><p class="text-xl font-bold text-gray-600">ציון: ${state.masteryScore.toFixed(0)}%</p></div><div class="grid gap-4"><button onclick="${isLocked?'':'startMemory()'}" class="p-6 bg-purple-600 text-white rounded-[2rem] text-2xl font-black ${isLocked?'opacity-50':''}">משחק זיכרון 🧠</button><button onclick="${isLocked?'':'state.screen=\'c4_menu\'; render()'}" class="p-6 bg-blue-600 text-white rounded-[2rem] text-2xl font-black ${isLocked?'opacity-50':''}">4 בשורה 🔴🟡</button><button onclick="${isLocked?'':'startWordQuest()'}" class="p-6 bg-emerald-600 text-white rounded-[2rem] text-2xl font-black ${isLocked?'opacity-50':''}">הקוד הסודי 🔐</button></div></div>`;
}

// --- משחק זיכרון עם דיבור וספירה ---
function startMemory() {
    state.screen = 'memory';
    const pairs = state.words.slice(0, 8);
    const cards = [];
    pairs.forEach(w => { cards.push({t: w.eng, m: w.heb, isEng: true, voice: w.eng}, {t: w.heb, m: w.eng, isEng: false, voice: w.eng}); });
    state.memoryGame = { cards: shuffle(cards).map((c, i) => ({...c, id: i, f: false, ok: false})), flipped: [], pairs: 0, steps: 0, isProcessing: false };
    render();
}

function renderMemory(app) {
    const g = state.memoryGame;
    app.innerHTML = `<div class="flex flex-col items-center"><div class="flex justify-between w-full mb-4 bg-white p-4 rounded-xl shadow"><button onclick="state.screen='menu'; render()" class="text-red-600 font-bold">יציאה</button><span class="font-bold">צעדים: ${g.steps} | זוגות: ${g.pairs}</span></div><div class="grid grid-cols-4 gap-2 w-full">${g.cards.map(c => `<div onclick="flipM(${c.id})" class="relative aspect-square perspective-1000 cursor-pointer ${c.f || c.ok ? 'card-flipped' : ''}"><div class="card-inner"><div class="card-front bg-purple-700 text-white text-2xl">?</div><div class="card-back bg-white border-2 ${c.ok?'border-green-500':'border-purple-300'}"><span class="text-[10px] font-bold text-black">${c.t}</span></div></div></div>`).join('')}</div></div>`;
}

function flipM(id) {
    const g = state.memoryGame; if (g.isProcessing) return;
    const card = g.cards.find(x => x.id === id); if (card.f || card.ok) return;
    card.f = true; g.flipped.push(card); g.steps++; render();
    if (g.flipped.length === 2) {
        g.isProcessing = true;
        const [c1, c2] = g.flipped;
        if (c1.t === c2.m || c2.t === c1.m) {
            setTimeout(() => { c1.ok = c2.ok = true; g.pairs++; g.flipped = []; g.isProcessing = false; speak(c1.voice); if(g.pairs === g.cards.length/2){ triggerConfetti(); state.winner = {msg:'ניצחון ב-'+g.steps+' צעדים!'}; } render(); }, 500);
        } else { setTimeout(() => { c1.f = c2.f = false; g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

// --- 4 בשורה (כולל נגד מחשב) ---
function renderC4Menu(app) {
    app.innerHTML = `<div class="text-center space-y-6 mt-10"><div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400 welcome-card shadow-xl"><h2 class="text-3xl font-black text-blue-600 mb-6">4 בשורה</h2><button onclick="startC4(true)" class="w-full p-4 bg-blue-600 text-white rounded-xl mb-4 font-bold">נגד חבר (PvP)</button><button onclick="startC4(false)" class="w-full p-4 bg-orange-500 text-white rounded-xl font-bold">נגד המחשב</button></div></div>`;
}

function startC4(isPvP) {
    state.screen = 'connect4';
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, isPvP: isPvP, canDrop: false, isAnswering: false, q: genC4Q() };
    render();
}

function genC4Q() {
    const w = state.words[Math.floor(Math.random()*state.words.length)];
    return { prompt: w.eng, correct: w.heb, opts: shuffle([w.heb, ...shuffle(state.words.filter(x=>x.id!==w.id).map(x=>x.heb)).slice(0,3)]) };
}

function renderConnect4(app) {
    const c = state.connect4;
    app.innerHTML = `<div class="flex flex-col items-center"><div class="mb-4 bg-white p-4 rounded-xl shadow w-full text-center font-bold">תור: ${c.turn===1?'אדום':'צהוב'}</div><div class="c4-container"><div class="arrows-row">${[0,1,2,3,4,5,6].map(i => `<button onclick="dropC4(${i})" class="text-white font-bold">↓</button>`).join('')}</div><div class="c4-board">${c.board.map(row => row.map(cell => `<div class="c4-slot">${cell?`<div class="token-fixed ${cell===1?'token-red':'token-yellow'}"></div>`:''}</div>`).join('')).join('')}</div></div>${!c.canDrop ? `<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4"><div class="bg-white p-6 rounded-2xl text-center w-full max-w-xs"><h3 class="text-2xl font-bold mb-4">${c.q.prompt}</h3><div class="grid gap-2">${c.q.opts.map(o => `<button onclick="ansC4('${o}')" class="p-3 border rounded-xl font-bold">${o}</button>`).join('')}</div></div></div>` : ''}</div>`;
}

function ansC4(sel) {
    const c = state.connect4;
    if (sel === c.q.correct) { c.canDrop = true; render(); }
    else { c.turn = c.turn===1?2:1; c.q = genC4Q(); render(); if(!c.isPvP && c.turn===2) setTimeout(aiC4, 1000); }
}

function dropC4(col) {
    const c = state.connect4; if(!c.canDrop) return;
    for (let r=5; r>=0; r--) { if(!c.board[r][col]) { c.board[r][col] = c.turn; break; } }
    if(checkWin(c.board)) { triggerConfetti(); state.winner = {msg:'ניצחון!'}; }
    else { c.turn = c.turn===1?2:1; c.canDrop = false; c.q = genC4Q(); if(!c.isPvP && c.turn===2) setTimeout(aiC4, 1000); }
    render();
}

function aiC4() {
    const c = state.connect4; if(c.turn!==2) return;
    const cols = [0,1,2,3,4,5,6].filter(i => !c.board[0][i]);
    const col = cols[Math.floor(Math.random()*cols.length)];
    for (let r=5; r>=0; r--) { if(!c.board[r][col]) { c.board[r][col] = 2; break; } }
    if(checkWin(c.board)) { state.winner = {msg:'המחשב ניצח!'}; }
    else { c.turn = 1; c.q = genC4Q(); }
    render();
}

function checkWin(b) {
    for(let r=0; r<6; r++) for(let c=0; c<4; c++) if(b[r][c] && b[r][c]==b[r][c+1] && b[r][c]==b[r][c+2] && b[r][c]==b[r][c+3]) return true;
    for(let r=0; r<3; r++) for(let c=0; c<7; c++) if(b[r][c] && b[r][c]==b[r+1][c] && b[r][c]==b[r+2][c] && b[r][c]==b[r+3][c]) return true;
    return false;
}

// --- משחק האיות (הקוד הסודי) ---
function startWordQuest() {
    const w = state.words[Math.floor(Math.random()*state.words.length)];
    state.wordQuest = { target: w.eng.toLowerCase(), hint: w.heb, guesses: [], currentGuess: '', maxAttempts: 5, keyStates: {} };
    state.screen = 'wordquest'; render();
}

function renderWordQuest(app) {
    const w = state.wordQuest;
    app.innerHTML = `<div class="flex flex-col items-center"><div class="bg-white p-4 rounded-xl shadow w-full mb-4 text-center font-bold">רמז: ${w.hint}</div><div class="grid gap-2 mb-6">${Array(w.maxAttempts).fill().map((_, i) => `<div class="flex gap-1">${Array(w.target.length).fill().map((_, j) => `<div class="word-cell ${getWS(i, j)}">${w.guesses[i]?w.guesses[i][j] : (i===w.guesses.length?w.currentGuess[j]||'':'')}</div>`).join('')}</div>`).join('')}</div><input id="hiddenInput" type="text" class="opacity-0 absolute" autofocus><div class="grid grid-cols-10 gap-1">${"qwertyuiopasdfghjklzxcvbnm".split('').map(l => `<button onclick="handleK('${l}')" class="p-2 bg-white rounded shadow font-bold uppercase">${l}</button>`).join('')}<button onclick="handleK('Enter')" class="col-span-2 bg-blue-600 text-white rounded font-bold">ENTER</button></div></div>`;
    document.getElementById('hiddenInput').oninput = (e) => { state.wordQuest.currentGuess = e.target.value.slice(0, w.target.length); render(); };
}
function handleK(l) { 
    const w = state.wordQuest;
    if(l==='Enter') { if(w.currentGuess.length === w.target.length) { w.guesses.push(w.currentGuess); if(w.currentGuess === w.target){ triggerConfetti(); state.winner = {msg:'פיצחת את הקוד!'}; } w.currentGuess = ''; } }
    else { if(w.currentGuess.length < w.target.length) w.currentGuess += l; }
    render();
}
function getWS(r, c) {
    const w = state.wordQuest; if(!w.guesses[r]) return '';
    const char = w.guesses[r][c];
    if(char === w.target[c]) return 'correct';
    if(w.target.includes(char)) return 'present';
    return 'absent';
}

function renderWinScreen(app) {
    app.innerHTML = `<div class="text-center mt-20 animate-fade-in"><h2 class="text-4xl font-black text-blue-600 mb-8">${state.winner.msg}</h2><button onclick="state.winner=null; state.screen='menu'; render()" class="bg-blue-600 text-white px-10 py-4 rounded-full text-2xl font-bold shadow-xl">חזרה לתפריט</button></div>`;
}

loadFromLocal();
render();
