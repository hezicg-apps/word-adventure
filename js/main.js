let state = {
    screen: 'welcome', inputText: '', words: [],
    nightMode: false, masteryScore: 0, quizIndex: 0, correctAnswers: 0,
    quizFeedback: { index: -1, status: null, correctIndex: -1 },
    memoryGame: { cards: [], flipped: [], pairs: 0, steps: 0, isProcessing: false },
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, showQuestionPrompt: true, fallingToken: null },
    wordQuest: { 
        target: '', hint: '', guesses: [], currentGuess: '', maxAttempts: 5, 
        isGameOver: false, keyStates: {}, showTutorial: true, 
        roundIndex: 0, pool: [], completedCount: 0 
    },
    winner: null
};

function triggerConfetti() { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8; window.speechSynthesis.speak(u); }
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

function render() {
    document.body.classList.toggle('night-mode', state.nightMode);
    document.getElementById('toggleNight').innerText = state.nightMode ? '🌙' : '☀️';
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
        case 'connect4': renderConnect4(app); break;
        case 'wordquest': renderWordQuest(app); break;
    }
}

function renderWelcome(app) {
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-md animate-fade-in mt-6">
            <div class="bg-white p-6 rounded-[2.5rem] border-4 border-blue-400 shadow-xl welcome-card">
                <p class="text-4xl font-black text-blue-600 mb-6 border-b-2 pb-4">ברוכים הבאים! 👋</p>
                <div class="space-y-4 text-right font-bold">
                    <div class="bg-blue-50 p-4 rounded-2xl border-r-8 border-blue-500 step-blue"><p class="text-xl font-black text-blue-900 mb-1">📝 שלב 1: הזנה</p><p class="text-lg">מדביקים רשימת מילים.</p></div>
                    <div class="bg-green-50 p-4 rounded-2xl border-r-8 border-green-500 step-green"><p class="text-xl font-black text-green-900 mb-1">🎴 שלב 2: תרגול</p><p class="text-lg">לומדים ובודקים ידע.</p></div>
                    <div class="bg-purple-50 p-4 rounded-2xl border-r-8 border-purple-500 step-purple"><p class="text-xl font-black text-purple-900 mb-1">🎮 שלב 3: משחקים</p><p class="text-lg">משחקים באנגלית!</p></div>
                </div>
            </div>
            <button onclick="state.screen='input'; render()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg active:scale-95 transition-transform">בואו נתחיל! 🚀</button>
        </div>`;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="text-center space-y-4 w-full px-2 mt-4 animate-fade-in">
            <p class="text-2xl font-black text-blue-600">הזינו מילים (מילה - תרגום)</p>
            <textarea id="wordInput" class="w-full h-64 p-6 rounded-[2rem] border-4 border-blue-200 outline-none text-right text-black bg-white shadow-inner text-xl font-bold focus:border-blue-400" placeholder="apple - תפוח">${state.inputText}</textarea>
            <button onclick="processInput()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg active:scale-95 transition-transform">המשך לכרטיסיות 🌟</button>
        </div>`;
    const area = document.getElementById('wordInput'); area.oninput = (e) => state.inputText = e.target.value; area.focus();
}

function processInput() {
    const lines = state.inputText.split('\n').filter(l => l.includes('-'));
    state.words = lines.map(l => {
        const parts = l.split('-');
        return { eng: parts[0].trim(), heb: parts.slice(1).join('-').trim(), known: false, id: crypto.randomUUID() };
    });
    if (state.words.length < 2) return;
    state.screen = 'flashcards'; render();
}

function renderFlashcards(app) {
    const unknown = state.words.filter(w => !w.known);
    if (unknown.length === 0) { state.quizIndex = 0; state.correctAnswers = 0; state.screen = 'quiz'; render(); return; }
    const cur = unknown[0];
    app.innerHTML = `
        <div class="text-center space-y-4 w-full max-sm px-2 mt-4 relative">
            <h2 class="text-2xl font-black">לימוד מילים (${state.words.filter(w=>w.known).length}/${state.words.length})</h2>
            
            <div class="bg-blue-100 text-blue-700 py-2 px-6 rounded-full inline-flex items-center gap-2 font-black animate-pulse-soft border border-blue-200">
                <span>לחצו על הכרטיסייה לסיבוב</span>
                <span class="text-xl">🔄</span>
            </div>

            <div onclick="this.classList.toggle('card-flipped')" class="relative w-full h-80 perspective-1000 cursor-pointer mt-2">
                <div class="card-inner">
                    <div class="card-front bg-white border-4 border-blue-200 flex-col"><span class="text-5xl font-black text-blue-600 eng-text mb-6">${cur.eng}</span><button onclick="event.stopPropagation(); speak('${cur.eng}')" class="text-5xl">🔊</button></div>
                    <div class="card-back bg-blue-500 border-4 border-blue-600 text-white"><span class="text-4xl font-black px-4 text-center">${cur.heb}</span></div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                 <button onclick="state.words.find(w=>w.id === '${cur.id}').known=true; render()" class="bg-green-500 text-white py-5 rounded-2xl font-black text-2xl shadow-md">יודע ✅</button>
                 <button onclick="state.words = shuffle(state.words); render()" class="bg-orange-500 text-white py-5 rounded-2xl font-black text-2xl shadow-md">עוד לא ⏳</button>
            </div>
        </div>`;
}

function renderQuiz(app) {
    if (state.quizIndex >= state.words.length) {
        state.masteryScore = (state.correctAnswers / state.words.length) * 100;
        triggerConfetti(); state.screen = 'menu'; render(); return;
    }
    const cur = state.words[state.quizIndex];
    if (!state.quizOptions) state.quizOptions = shuffle([cur.heb, ...shuffle(state.words.filter(x=>x.id!==cur.id).map(x=>x.heb)).slice(0,3)]);
    
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-sm px-2 mt-4">
            <h2 class="text-xl font-black text-blue-600">מבחן: ${state.quizIndex + 1}/${state.words.length}</h2>
            <div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400 shadow-xl welcome-card">
                <div class="text-4xl font-black mb-8 eng-text">${cur.eng}</div>
                <div class="grid gap-4">
                    ${state.quizOptions.map((o, idx) => {
                        let statusClass = '';
                        if (state.quizFeedback.status) {
                            if (idx === state.quizFeedback.correctIndex) statusClass = 'correct-ans';
                            else if (idx === state.quizFeedback.index && state.quizFeedback.status === 'wrong') statusClass = 'wrong-ans';
                        }
                        return `<button onclick="handleQuizAns('${o}', '${cur.heb}', ${idx})" class="py-4 border-2 rounded-2xl font-black text-2xl transition-all ${statusClass}">${o}</button>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
}

function handleQuizAns(selected, correct, idx) {
    if (state.quizFeedback.status) return;
    const isCorrect = selected === correct;
    state.quizFeedback = { 
        index: idx, 
        status: isCorrect ? 'correct' : 'wrong',
        correctIndex: state.quizOptions.indexOf(correct)
    };
    if (isCorrect) state.correctAnswers++;
    render();
    setTimeout(() => { 
        state.quizIndex++; 
        state.quizOptions = null; 
        state.quizFeedback = { index: -1, status: null, correctIndex: -1 }; 
        render(); 
    }, 1500);
}

function renderMenu(app) {
    const isLocked = state.masteryScore < 70;
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-md px-2 mt-6">
            <div class="bg-white p-8 rounded-[2rem] shadow-xl border-4 border-blue-100 welcome-card">
                <h2 class="text-3xl font-black text-blue-600 mb-2">הציון שלך: ${state.masteryScore.toFixed(0)}%</h2>
                <p class="font-black text-gray-500">${isLocked ? 'צריך 70% כדי לפתוח משחקים' : 'המשחקים פתוחים!'}</p>
                <button onclick="state.quizIndex = 0; state.correctAnswers = 0; state.screen = 'quiz'; render();" 
                        class="mt-4 bg-orange-500 text-white px-6 py-2 rounded-full font-black shadow-md hover:bg-orange-600 transition-colors">
                    🔄 תרגול חוזר (שיפור ציון)
                </button>
            </div>
            <div class="grid gap-4">
                <button onclick="${isLocked?'':'startMemory()'}" class="p-6 bg-purple-500 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50 cursor-not-allowed':''}">
                    ${isLocked ? '🔒 ' : ''}משחק זיכרון 🧠
                </button>
                <button onclick="${isLocked?'':'startC4()'}" class="p-6 bg-blue-500 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50 cursor-not-allowed':''}">
                    ${isLocked ? '🔒 ' : ''}4 בשורה 🔴🟡
                </button>
                <button onclick="${isLocked?'':'startWordQuest()'}" class="p-6 bg-emerald-500 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50 cursor-not-allowed':''}">
                    ${isLocked ? '🔒 ' : ''}הקוד הסודי 🔐
                </button>
            </div>
            <button onclick="resetAllData()" class="text-red-500 font-black underline mt-6">הזנת רשימה חדשה</button>
        </div>`;
}

function startMemory() {
    state.screen = 'memory'; state.winner = null;
    const pairsCount = Math.min(state.words.length, 8);
    const cards = [];
    state.words.slice(0, pairsCount).forEach(w => { cards.push({ t: w.eng, m: w.heb, isEng: true, voice: w.eng }, { t: w.heb, m: w.eng, isEng: false, voice: w.eng }); });
    state.memoryGame = { cards: shuffle(cards).map((c, i) => ({ ...c, id: i, f: false, ok: false })), flipped: [], pairs: 0, steps: 0, isProcessing: false };
    render();
}

function renderMemory(app) {
    const g = state.memoryGame;
    app.innerHTML = `
        <div class="flex flex-col items-center w-full max-w-sm px-2 mt-4">
            <div class="flex justify-between items-center w-full mb-4 bg-white p-4 rounded-2xl shadow-md welcome-card">
                <button onclick="state.screen='menu'; render()" class="text-red-500 font-black">יציאה</button>
                <span class="text-lg font-black">צעדים: ${g.steps} | זוגות: ${g.pairs} / ${g.cards.length / 2}</span>
            </div>
            <div class="grid grid-cols-4 gap-2 w-full">
                ${g.cards.map(c => `
                    <div onclick="flipM(${c.id})" class="relative aspect-square perspective-1000 cursor-pointer ${c.f || c.ok ? 'card-flipped' : ''}">
                        <div class="card-inner">
                            <div class="card-front bg-purple-600 text-white text-3xl font-black">?</div>
                            <div class="card-back bg-white border-2 ${c.ok?'border-green-400 bg-green-50':'border-purple-200'}">
                                <div class="font-black text-[10px] sm:text-xs text-center leading-tight ${c.isEng ? 'eng-text' : ''}">${c.t}</div>
                            </div>
                        </div>
                    </div>`).join('')}
            </div>
        </div>`;
}

function flipM(id) {
    const g = state.memoryGame; if (g.isProcessing || state.winner) return;
    const card = g.cards.find(x => x.id === id); if (card.f || card.ok) return;
    card.f = true; g.flipped.push(card); g.steps++; render();
    if (g.flipped.length === 2) {
        g.isProcessing = true; const [c1, c2] = g.flipped;
        if (c1.t === c2.m || c1.m === c2.t) {
            setTimeout(() => { c1.ok = c2.ok = true; g.pairs++; g.flipped = []; g.isProcessing = false;
                if (g.pairs >= g.cards.length / 2) { triggerConfetti(); state.winner = { type: 'memory', msg: 'מעולה!', subMsg: `סיימת ב-${g.steps} צעדים.`, glowClass: 'win-glow-purple' }; }
                render(); speak(c1.isEng ? c1.t : c2.t);
            }, 400);
        } else { setTimeout(() => { c1.f = c2.f = false; g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

function startC4() {
    state.screen = 'connect4'; state.winner = null;
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: genC4Q(), canDrop: false, isAnswering: false, showQuestionPrompt: true, fallingToken: null };
    render();
}

function genC4Q() {
    const w = state.words[Math.floor(Math.random()*state.words.length)];
    const opts = shuffle([w.heb, ...shuffle(state.words.filter(x=>x.id!==w.id).map(x=>x.heb)).slice(0,3)]);
    return { prompt: w.eng, correct: w.heb, eng: w.eng, opts };
}

function renderConnect4(app) {
    const c = state.connect4;
    app.innerHTML = `
        <div class="flex flex-col items-center w-full px-2 mt-4">
            <div class="w-full flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-md max-w-sm welcome-card">
                <button onclick="state.screen='menu'; render()" class="text-red-500 font-black">יציאה</button>
                <div class="font-black text-lg">תור: ${c.turn===1?'אדום 🔴':'צהוב 🟡'}</div>
            </div>
            <div class="h-16 mb-2">
                ${c.showQuestionPrompt ? `<button onclick="state.connect4.showQuestionPrompt=false;state.connect4.isAnswering=true;render();speak(state.connect4.q.eng);" class="bg-blue-600 text-white px-8 py-3 rounded-full text-xl font-black shadow-lg">שאלה לאסימון</button>` : `<div class="text-blue-600 font-black text-2xl animate-pulse">בחר עמודה 👇</div>`}
            </div>
            <div class="c4-container">
                <div class="arrows-row">${[0,1,2,3,4,5,6].map(i => `<button onclick="dropC4(${i})" class="flex flex-col items-center ${!c.canDrop || c.board[0][i] ? 'opacity-20 pointer-events-none' : 'text-white'}"><span class="text-lg font-black">${i+1}</span><div class="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-white mt-1"></div></button>`).join('')}</div>
                <div class="c4-board">${c.board.map((row, r) => row.map((cell, col) => `<div class="c4-slot">${cell ? `<div class="token-fixed ${cell===1?'token-red':'token-yellow'}"></div>` : ''}${c.fallingToken && c.fallingToken.row === r && c.fallingToken.col === col ? `<div class="token-fixed ${c.fallingToken.color === 1 ? 'token-red' : 'token-yellow'}"></div>` : ''}</div>`).join('')).join('')}</div>
            </div>
            ${c.isAnswering ? `<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] px-4"><div class="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center welcome-card"><h3 class="text-4xl font-black mb-8 text-blue-600 eng-text">${c.q.prompt}</h3><div class="grid gap-4">${c.q.opts.map(o => `<button onclick="ansC4('${o}')" class="p-4 border-2 rounded-xl font-black text-black text-2xl hover:bg-blue-50">${o}</button>`).join('')}</div></div></div>` : ''}
        </div>`;
}

function ansC4(o) { const c = state.connect4; if (o === c.q.correct) { c.canDrop = true; c.isAnswering = false; render(); } else { c.turn = c.turn === 1 ? 2 : 1; c.showQuestionPrompt = true; c.isAnswering = false; c.q = genC4Q(); render(); } }

function dropC4(col) {
    const c = state.connect4; if (!c.canDrop) return;
    let targetRow = -1; for (let r=5; r>=0; r--) { if (!c.board[r][col]) { targetRow = r; break; } }
    if (targetRow === -1) return;
    c.canDrop = false; let currentRow = 0; const dropColor = c.turn;
    const dropInterval = setInterval(() => {
        c.fallingToken = { row: currentRow, col: col, color: dropColor }; render();
        if (currentRow === targetRow) { clearInterval(dropInterval); c.board[targetRow][col] = dropColor; c.fallingToken = null;
            if (checkWin(c.board)) { triggerConfetti(); setTimeout(() => { state.winner = { type: 'c4', msg: dropColor===1?"אדום ניצח!":"צהוב ניצח!", glowClass: dropColor===1?'win-glow-red':'win-glow-yellow' }; render(); }, 400); }
            else { c.turn = c.turn === 1 ? 2 : 1; c.showQuestionPrompt = true; c.q = genC4Q(); render(); }
        } currentRow++;
    }, 80);
}

function checkWin(b) {
    for (let r=0; r<6; r++) for (let c=0; c<4; c++) if (b[r][c] && b[r][c]==b[r][c+1] && b[r][c]==b[r][c+2] && b[r][c]==b[r][c+3]) return true;
    for (let r=0; r<3; r++) for (let c=0; c<7; c++) if (b[r][c] && b[r][c]==b[r+1][c] && b[r][c]==b[r+2][c] && b[r][c]==b[r+3][c]) return true;
    for (let r=0; r<3; r++) for (let c=0; c<4; c++) {
        if (b[r][c] && b[r][c]==b[r+1][c+1] && b[r][c]==b[r+2][c+2] && b[r][c]==b[r+3][c+3]) return true;
        if (b[r][c+3] && b[r][c+3]==b[r+1][c+2] && b[r][c+3]==b[r+2][c+1] && b[r][c+3]==b[r+3][c]) return true;
    } return false;
}

function startWordQuest() {
    const pool = shuffle(state.words.filter(w => w.eng.length >= 2 && !w.eng.includes(' ')));
    state.screen = 'wordquest'; state.winner = null;
    state.wordQuest = { pool, roundIndex: 0, completedCount: 0, target: pool[0].eng.toLowerCase(), hint: pool[0].heb, guesses: [], currentGuess: '', maxAttempts: 5, isGameOver: false, keyStates: {}, showTutorial: true };
    render();
}

function renderWordQuest(app) {
    const w = state.wordQuest;
    if (w.showTutorial) {
        app.innerHTML = `<div class="text-center space-y-6 w-full max-w-md animate-fade-in mt-6"><div class="bg-white p-8 rounded-[2.5rem] border-4 border-emerald-400 shadow-xl welcome-card"><h2 class="text-3xl font-black text-emerald-600 mb-6">איך משחקים? 🔐</h2><div class="space-y-4 text-right"><p class="text-lg font-bold">נחשו את המילה לפי הרמז.</p><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-[#38bdf8]"></div> <p>אות נכונה ובמקום (תכלת)</p></div><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-[#a855f7]"></div> <p>אות נכונה במקום הלא נכון (סגול)</p></div></div><button onclick="state.wordQuest.showTutorial=false; render();" class="mt-8 bg-emerald-600 text-white px-8 py-4 rounded-full text-xl font-black w-full shadow-lg">בואו נתחיל!</button></div></div>`;
        return;
    }
    const wordLen = w.target.length;
    let gridHtml = `<div class="word-grid" style="grid-template-columns: repeat(${wordLen}, 1fr); max-width: ${wordLen * 65}px;">`;
    for (let i = 0; i < w.maxAttempts; i++) {
        const g = w.guesses[i];
        for (let j = 0; j < wordLen; j++) {
            if (g) gridHtml += `<div class="word-cell ${getLetterStatus(g.text, j, w.target)}">${g.text[j]}</div>`;
            else if (i === w.guesses.length && !w.isGameOver) gridHtml += `<div class="word-cell border-blue-400">${w.currentGuess[j] || ''}</div>`;
            else gridHtml += `<div class="word-cell opacity-40"></div>`;
        }
    }
    gridHtml += `</div>`;
    app.innerHTML = `<div class="flex flex-col items-center w-full px-2 mt-2 word-quest-container"><div class="w-full flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-md max-w-sm welcome-card" style="direction:rtl"><button onclick="state.screen='menu'; render()" class="text-red-500 font-black">יציאה</button><div class="flex flex-col items-end"><div class="font-black text-lg text-emerald-600">רמז: ${w.hint}</div><div class="text-xs font-bold text-gray-400">${w.roundIndex+1}/${w.pool.length} | ניסיון ${w.guesses.length+1}/${w.maxAttempts}</div></div></div>${gridHtml}<div class="w-full max-w-md mt-6">${renderQwerty()}</div></div>`;
}

function getLetterStatus(guess, idx, target) {
    if (guess[idx] === target[idx]) return 'correct';
    if (target.includes(guess[idx])) return 'present';
    return 'absent';
}

function renderQwerty() {
    const rows = [['q','w','e','r','t','y','u','i','o','p'], ['a','s','d','f','g','h','j','k','l', '⌫'], ['z','x','c','v','b','n','m', 'ENTER']];
    return rows.map(r => `<div class="qwerty-row">${r.map(k => `<button onclick="handleKey('${k}')" class="key ${state.wordQuest.keyStates[k] || ''} ${k==='ENTER'||k==='⌫'?'key-wide !bg-blue-600 !text-white':''}">${k==='ENTER'?'ENT':k}</button>`).join('')}</div>`).join('');
}

function handleKey(k) {
    const w = state.wordQuest; if (w.isGameOver) return;
    if (k === '⌫') w.currentGuess = w.currentGuess.slice(0, -1);
    else if (k === 'ENTER') { if (w.currentGuess.length === w.target.length) submitGuess(); }
    else if (w.currentGuess.length < w.target.length && k.length === 1) w.currentGuess += k.toLowerCase();
    render();
}

function submitGuess() {
    const w = state.wordQuest; const g = w.currentGuess; w.guesses.push({ text: g });
    for (let i = 0; i < g.length; i++) {
        const s = getLetterStatus(g, i, w.target); if (w.keyStates[g[i]] !== 'correct') w.keyStates[g[i]] = s;
    }
    if (g === w.target) {
        w.isGameOver = true; w.completedCount++; triggerConfetti();
        setTimeout(() => { 
            w.roundIndex++; 
            if (w.roundIndex >= w.pool.length) { state.winner = { type:'wq', msg:'ניצחון!', subMsg:'סיימת הכל!', glowClass:'win-glow-emerald' }; }
            else { const next = w.pool[w.roundIndex]; w.target = next.eng.toLowerCase(); w.hint = next.heb; w.guesses = []; w.keyStates = {}; w.isGameOver = false; }
            render();
        }, 1200);
    } else if (w.guesses.length >= w.maxAttempts) {
        w.isGameOver = true; setTimeout(() => { state.winner = { type:'wq', msg:'הפסד', subMsg:`המילה: ${w.target.toUpperCase()}`, glowClass:'win-glow-red' }; render(); }, 500);
    }
    w.currentGuess = ''; render();
}

function renderWinScreen(app) {
    const win = state.winner;
    app.innerHTML = `
        <div class="fixed inset-0 flex items-center justify-center bg-black z-[300] px-4">
            <div class="text-center p-10 rounded-[3rem] max-w-sm w-full animate-fade-in win-card-base ${win.glowClass || ''}">
                <h2 class="text-4xl font-black mb-6 text-blue-600">${win.msg}</h2>
                <p class="text-xl font-black mb-10 text-gray-700">${win.subMsg || ''}</p>
                <div class="space-y-4">
                    <button onclick="state.winner=null; if(state.screen==='memory')startMemory();else if(state.screen==='connect4')startC4();else startWordQuest();" class="bg-blue-600 text-white py-5 rounded-2xl text-2xl font-black w-full shadow-lg">שחק שוב 🔄</button>
                    <button onclick="state.winner=null; state.screen='menu'; render()" class="bg-gray-100 text-gray-700 py-4 rounded-2xl text-xl font-black w-full shadow">חזרה לתפריט 🏠</button>
                </div>
            </div>
        </div>`;
}

function resetAllData() { state.inputText = ''; state.words = []; state.masteryScore = 0; state.screen = 'input'; render(); }
document.getElementById('toggleNight').onclick = () => { state.nightMode = !state.nightMode; render(); };
window.addEventListener('keydown', (e) => {
    if (state.screen === 'wordquest' && !state.wordQuest.showTutorial) {
        if (e.key === 'Enter') handleKey('ENTER'); else if (e.key === 'Backspace') handleKey('⌫'); else if (/^[a-z]$/i.test(e.key)) handleKey(e.key.toLowerCase());
    }
});
render();
