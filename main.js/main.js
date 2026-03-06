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
    wordQuest: { 
        target: '', hint: '', guesses: [], currentGuess: '', maxAttempts: 5, 
        isGameOver: false, keyStates: {}, showTutorial: true, 
        roundIndex: 0, pool: [], completedCount: 0 
    },
    winner: null
};

// --- ניהול זיכרון ושיתוף ---

function saveToLocal() {
    localStorage.setItem('wm_words', JSON.stringify(state.words));
    localStorage.setItem('wm_input', state.inputText);
    localStorage.setItem('wm_listName', state.listName);
}

function loadFromLocal() {
    const savedWords = localStorage.getItem('wm_words');
    const savedInput = localStorage.getItem('wm_input');
    const savedListName = localStorage.getItem('wm_listName');
    
    if (savedWords) {
        state.words = JSON.parse(savedWords);
        if (state.words.length > 0) state.screen = 'flashcards';
    }
    if (savedInput) state.inputText = savedInput;
    if (savedListName) state.listName = savedListName;
}

function copyShareLink() {
    const baseUrl = window.location.origin + window.location.pathname;
    const data = {
        n: state.listName,
        w: state.words.map(w => `${w.eng}-${w.heb}`)
    };
    const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const shareUrl = `${baseUrl}?data=${encodedData}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        const btn = document.querySelector('button[onclick="copyShareLink()"]');
        const originalText = btn.innerText;
        btn.innerText = 'הקישור הועתק! 🔗';
        setTimeout(() => btn.innerText = originalText, 2000);
    });
}

function speak(text) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    msg.rate = 0.9;
    window.speechSynthesis.speak(msg);
}

function render() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';
    if (state.winner) { renderWinnerScreen(app); return; }
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
        <div class="flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-700">
            <div class="bg-white p-10 rounded-[3rem] shadow-2xl border-b-8 border-blue-100 max-w-sm w-full">
                <div class="text-6xl mb-6">🚀</div>
                <h2 class="text-4xl font-black text-blue-600 mb-4">מוכנים?</h2>
                <p class="text-xl font-bold text-gray-500 mb-8">ההרפתקה שלכם באנגלית מתחילה כאן</p>
                <button onclick="state.screen='input'; render();" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-lg transform active:scale-95 transition">בואו נתחיל!</button>
            </div>
        </div>`;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 animate-in slide-in-from-bottom duration-500">
            <div class="bg-white p-6 rounded-[2.5rem] shadow-xl border-4 border-blue-50">
                <label class="block text-center text-gray-400 font-black mb-2 uppercase tracking-widest text-sm">שם היחידה</label>
                <input type="text" id="listName" value="${state.listName}" class="w-full p-4 rounded-2xl border-4 border-blue-50 text-center text-xl font-black focus:border-blue-400 outline-none transition">
            </div>
            <div class="bg-white p-6 rounded-[2.5rem] shadow-xl border-4 border-blue-50">
                <textarea id="wordInput" class="w-full h-64 p-6 rounded-[2rem] border-4 border-blue-50 text-right text-xl font-bold focus:border-blue-400 outline-none transition" placeholder="Apple - תפוח">${state.inputText}</textarea>
            </div>
            <button onclick="processInput()" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-xl transform active:scale-95 transition">צור הרפתקה! ✨</button>
        </div>`;
}

function processInput() {
    const input = document.getElementById('wordInput').value;
    const lines = input.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;
    state.listName = document.getElementById('listName').value || 'אוצר המילים שלי';
    state.words = lines.filter(l => l.includes('-')).map(l => {
        const parts = l.split('-');
        return { eng: parts[0].trim(), heb: parts[1].trim(), known: false };
    });
    state.inputText = input;
    saveToLocal();
    state.screen = 'flashcards';
    render();
}

function renderFlashcards(app) {
    const unknown = state.words.filter(w => !w.known);
    if (unknown.length === 0) {
        state.screen = 'quiz'; state.quizIndex = 0; state.correctAnswers = 0; render(); return;
    }
    const current = unknown[0];
    app.innerHTML = `
        <div class="w-full max-w-md flex flex-col items-center space-y-8 animate-in zoom-in">
            <h1 class="text-2xl font-black text-gray-800">${state.listName}</h1>
            <div class="text-2xl font-black text-blue-500 bg-blue-50 px-6 py-2 rounded-full">${state.words.length - unknown.length + 1} / ${state.words.length}</div>
            <div class="perspective-1000 w-full h-80 cursor-pointer" onclick="this.querySelector('.card-inner').classList.toggle('card-flipped')">
                <div class="card-inner w-full h-full transition-transform duration-500 relative transform-style-3d">
                    <div class="card-front absolute inset-0 bg-white rounded-[3rem] shadow-2xl flex flex-col items-center justify-center p-6 backface-hidden">
                        <div class="text-5xl font-black text-blue-600 mb-6 eng-text">${current.eng}</div>
                        <button onclick="event.stopPropagation(); speak('${current.eng}')" class="p-4 bg-blue-50 rounded-full text-4xl">🔊</button>
                    </div>
                    <div class="card-back absolute inset-0 bg-blue-600 rounded-[3rem] shadow-2xl flex items-center justify-center p-6 text-white backface-hidden card-flipped-back">
                        <div class="text-5xl font-bold">${current.heb}</div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-6 w-full">
                <button onclick="markWordKnown('${current.eng}', true)" class="py-6 bg-green-500 text-white rounded-[2rem] text-2xl font-black">יודע ✅</button>
                <button onclick="markWordKnown('${current.eng}', false)" class="py-6 bg-orange-500 text-white rounded-[2rem] text-2xl font-black">עוד לא ⏳</button>
            </div>
        </div>`;
}

function markWordKnown(eng, isKnown) {
    const idx = state.words.findIndex(w => w.eng === eng);
    if (isKnown) state.words[idx].known = true;
    else { const word = state.words.splice(idx, 1)[0]; state.words.push(word); }
    render();
}

function renderQuiz(app) {
    if (state.quizIndex >= state.words.length) {
        state.masteryScore = Math.round((state.correctAnswers / state.words.length) * 100);
        state.screen = 'menu';
        if (state.masteryScore >= 70) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        render(); return;
    }
    const current = state.words[state.quizIndex];
    let options = [current.heb];
    let others = state.words.filter(w => w.heb !== current.heb).map(w => w.heb);
    options = [...options, ...others.sort(() => 0.5 - Math.random()).slice(0, 3)].sort(() => 0.5 - Math.random());
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 text-center">
            <h2 class="text-xl font-bold text-gray-400 uppercase">מבחן ${state.quizIndex + 1}/${state.words.length}</h2>
            <div class="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-blue-400">
                <div class="text-5xl font-black text-blue-600 mb-10 eng-text">${current.eng}</div>
                <div class="grid gap-4">
                    ${options.map(opt => `<button onclick="handleQuizAnswer('${opt}', '${current.heb}')" class="py-5 border-4 border-blue-50 rounded-2xl text-xl font-black hover:bg-blue-50">${opt}</button>`).join('')}
                </div>
            </div>
        </div>`;
}

function handleQuizAnswer(selected, correct) {
    if (selected === correct) state.correctAnswers++;
    state.quizIndex++;
    render();
}

function renderMenu(app) {
    const isLocked = state.masteryScore < 70;
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 animate-in fade-in">
            <div class="bg-white p-8 rounded-[2.5rem] shadow-xl text-center border-b-8 border-orange-100">
                <h2 class="text-3xl font-black mb-1 text-blue-900">${state.listName}</h2>
                <div class="bg-gray-50 px-6 py-2 rounded-full font-black text-2xl my-4">ציון: ${state.masteryScore}%</div>
                <div class="flex gap-4">
                    <button onclick="copyShareLink()" class="flex-1 py-3 bg-blue-50 text-blue-600 rounded-full font-black">🔗 שתפו</button>
                    <button onclick="state.screen='quiz'; state.quizIndex=0; state.correctAnswers=0; render();" class="flex-1 py-3 bg-orange-600 text-white rounded-full font-black">🔄 חוזר</button>
                </div>
            </div>
            <div class="grid gap-4">
                <button onclick="${isLocked ? '' : 'startMemory()'}" class="p-6 bg-[#a855f7] text-white rounded-[2rem] text-2xl font-black shadow-xl ${isLocked ? 'opacity-50 grayscale' : ''}">🧠 משחק זיכרון ${isLocked ? '🔒' : ''}</button>
                <button onclick="${isLocked ? '' : 'startC4(true)'}" class="p-6 bg-[#3b82f6] text-white rounded-[2rem] text-2xl font-black shadow-xl ${isLocked ? 'opacity-50 grayscale' : ''}">🔴 4 בשורה ${isLocked ? '🔒' : ''}</button>
                <button onclick="${isLocked ? '' : 'startWordQuest()'}" class="p-6 bg-[#10b981] text-white rounded-[2rem] text-2xl font-black shadow-xl ${isLocked ? 'opacity-50 grayscale' : ''}">🔐 הקוד הסודי ${isLocked ? '🔒' : ''}</button>
            </div>
            <button onclick="resetAllData()" class="w-full text-red-500 font-bold underline mt-4">מחיקת רשימה</button>
        </div>`;
}

// --- משחק זיכרון ---
function startMemory() {
    let cards = [];
    let gameWords = [...state.words].sort(() => 0.5 - Math.random()).slice(0, 8);
    gameWords.forEach(w => {
        cards.push({ id: Math.random(), val: w.eng, type: 'eng', pair: w.heb, flipped: false, matched: false });
        cards.push({ id: Math.random(), val: w.heb, type: 'heb', pair: w.eng, flipped: false, matched: false });
    });
    state.memoryGame = { cards: cards.sort(() => 0.5 - Math.random()), flipped: [], pairs: 0, steps: 0, isProcessing: false };
    state.screen = 'memory'; render();
}

function renderMemory(app) {
    const m = state.memoryGame;
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6">
            <div class="flex justify-between items-center bg-white p-4 rounded-2xl shadow-lg border-b-4 border-purple-100">
                <button onclick="state.screen='menu'; render()" class="text-3xl">🏠</button>
                <div class="text-xl font-black text-purple-600">זוגות: ${m.pairs} / 8</div>
            </div>
            <div class="grid grid-cols-4 gap-3">
                ${m.cards.map((card, idx) => `
                    <div onclick="handleMemoryMove(${idx})" class="h-24 rounded-2xl shadow-md transition-all ${card.matched ? 'opacity-0 pointer-events-none' : ''} ${card.flipped ? 'bg-white border-4 border-purple-400' : 'bg-purple-600'}">
                        <div class="h-full flex items-center justify-center p-2 text-center font-bold text-sm ${card.flipped ? '' : 'hidden'}">${card.val}</div>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function handleMemoryMove(idx) {
    const m = state.memoryGame;
    if (m.isProcessing || m.flipped.includes(idx) || m.cards[idx].matched) return;
    m.cards[idx].flipped = true; m.flipped.push(idx);
    if (m.flipped.length === 2) {
        m.steps++; m.isProcessing = true;
        const [i1, i2] = m.flipped;
        if (m.cards[i1].val === m.cards[i2].pair || m.cards[i2].val === m.cards[i1].pair) {
            if (m.cards[i1].type === 'eng') speak(m.cards[i1].val); else speak(m.cards[i2].val);
            setTimeout(() => {
                m.cards[i1].matched = m.cards[i2].matched = true;
                m.pairs++; m.flipped = []; m.isProcessing = false;
                if (m.pairs === 8) state.winner = { msg: "ניצחון בזיכרון! 🧠", subMsg: `ב-${m.steps} צעדים` };
                render();
            }, 500);
        } else {
            setTimeout(() => { m.cards[i1].flipped = m.cards[i2].flipped = false; m.flipped = []; m.isProcessing = false; render(); }, 1000);
        }
    }
    render();
}

// --- משחק 4 בשורה ---
function startC4(isPvP) {
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, isAnswering: false, feedback: { status: null, selectedIdx: -1 }, isPvP: isPvP };
    state.screen = 'connect4'; render();
}

function renderConnect4(app) {
    const c = state.connect4;
    app.innerHTML = `
        <div class="w-full max-w-md flex flex-col items-center space-y-4">
            <div class="w-full flex justify-between items-center bg-white p-4 rounded-2xl shadow-lg border-b-4 border-blue-100">
                <button onclick="state.screen='menu'; render()" class="text-3xl">🏠</button>
                <div class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-full ${c.turn === 1 ? 'bg-red-500' : 'bg-yellow-500'}"></div>
                    <span class="font-black">תור ${c.turn === 1 ? 'אדום' : 'צהוב'}</span>
                </div>
            </div>
            <div class="bg-blue-700 p-3 rounded-2xl shadow-2xl">
                <div class="grid grid-cols-7 gap-2">
                    ${c.board.map((row, r) => row.map((cell, col) => `
                        <div onclick="handleC4Action(${col})" class="w-10 h-10 md:w-12 md:h-12 bg-blue-900/50 rounded-full flex items-center justify-center">
                            ${cell ? `<div class="w-8 h-8 md:w-10 md:h-10 rounded-full ${cell === 1 ? 'bg-red-500' : 'bg-yellow-500'} shadow-inner"></div>` : ''}
                        </div>
                    `).join('')).join('')}
                </div>
            </div>
            ${c.isAnswering ? renderC4Question() : `<div class="bg-blue-50 px-6 py-3 rounded-full text-blue-600 font-black animate-pulse">בחרו טור להנחת אסימון</div>`}
        </div>`;
}

function renderC4Question() {
    const q = state.connect4.q; const f = state.connect4.feedback;
    return `
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div class="bg-white p-8 rounded-[2.5rem] w-full max-w-sm text-center">
                <div class="text-4xl font-black text-blue-600 mb-8 eng-text">${q.eng}</div>
                <div class="grid gap-3">
                    ${q.opts.map((opt, idx) => {
                        let cls = "py-4 border-2 border-blue-100 rounded-2xl font-black text-xl";
                        if (f.status && f.selectedIdx === idx) cls = f.status === 'correct' ? "py-4 bg-green-500 text-white rounded-2xl font-black text-xl" : "py-4 bg-red-500 text-white rounded-2xl font-black text-xl";
                        return `<button onclick="checkC4Answer('${opt}', ${idx})" class="${cls}">${opt}</button>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
}

function handleC4Action(col) {
    const c = state.connect4; if (c.isAnswering || c.board[0][col]) return;
    const qWord = state.words[Math.floor(Math.random() * state.words.length)];
    let opts = [qWord.heb]; let others = state.words.filter(w => w.heb !== qWord.heb).map(w => w.heb);
    opts = [...opts, ...others.sort(() => 0.5 - Math.random()).slice(0, 2)].sort(() => 0.5 - Math.random());
    c.q = { ...qWord, opts, col }; c.isAnswering = true; render();
}

function checkC4Answer(ans, idx) {
    const c = state.connect4; c.feedback = { status: ans === c.q.heb ? 'correct' : 'wrong', selectedIdx: idx }; render();
    setTimeout(() => {
        if (ans === c.q.heb) dropToken(c.q.col);
        else { c.turn = c.turn === 1 ? 2 : 1; c.isAnswering = false; c.feedback = { status: null, selectedIdx: -1 }; render(); }
    }, 800);
}

function dropToken(col) {
    const c = state.connect4;
    for (let r = 5; r >= 0; r--) {
        if (!c.board[r][col]) {
            c.board[r][col] = c.turn;
            if (checkWin(r, col)) state.winner = { msg: "ניצחון ב-4 בשורה! 🎉", subMsg: `השחקן ה${c.turn === 1 ? 'אדום' : 'צהוב'} ניצח!` };
            c.turn = c.turn === 1 ? 2 : 1; break;
        }
    }
    c.isAnswering = false; c.feedback = { status: null, selectedIdx: -1 }; render();
}

function checkWin(r, col) {
    const b = state.connect4.board; const v = b[r][col]; const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let [dr, dc] of dirs) {
        let count = 1;
        for (let s of [1, -1]) {
            let nr = r + dr*s, nc = col + dc*s;
            while(nr>=0 && nr<6 && nc>=0 && nc<7 && b[nr][nc] === v) { count++; nr += dr*s; nc += dc*s; }
        }
        if (count >= 4) return true;
    }
    return false;
}

// --- משחק WordQuest (Wordle) ---
function startWordQuest() {
    const validWords = state.words.filter(w => w.eng.length >= 3 && w.eng.length <= 8);
    if (validWords.length === 0) { alert("צריך מילים באורך 3-8 אותיות."); return; }
    const targetWord = validWords[Math.floor(Math.random() * validWords.length)];
    state.wordQuest = { target: targetWord.eng.toUpperCase(), hint: targetWord.heb, guesses: [], currentGuess: '', maxAttempts: 6, isGameOver: false };
    state.screen = 'wordquest'; render();
}

function renderWordQuest(app) {
    const w = state.wordQuest;
    app.innerHTML = `
        <div class="w-full max-w-md flex flex-col items-center space-y-6">
            <div class="bg-white p-4 rounded-2xl shadow-md w-full flex justify-between items-center">
                <button onclick="state.screen='menu'; render()" class="text-3xl">🏠</button>
                <div class="text-lg font-black text-green-600">רמז: ${w.hint}</div>
            </div>
            <div class="grid gap-2">
                ${Array(w.maxAttempts).fill(0).map((_, i) => {
                    const guess = w.guesses[i] || (i === w.guesses.length ? w.currentGuess : '');
                    return `<div class="flex gap-2">${Array(w.target.length).fill(0).map((_, j) => {
                        const char = guess[j] || ''; let cls = "w-10 h-10 border-2 rounded-full flex items-center justify-center font-black uppercase";
                        if (i < w.guesses.length) {
                            if (char === w.target[j]) cls += " bg-green-500 border-green-500 text-white";
                            else if (w.target.includes(char)) cls += " bg-yellow-500 border-yellow-500 text-white";
                            else cls += " bg-gray-400 border-gray-400 text-white";
                        }
                        return `<div class="${cls}">${char}</div>`;
                    }).join('')}</div>`;
                }).join('')}
            </div>
            <div class="bg-gray-50 p-4 rounded-[2rem] w-full grid grid-cols-7 gap-2">
                ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map(l => `<button onclick="handleWordQuestKey('${l}')" class="p-2 bg-white rounded shadow text-sm font-bold">${l}</button>`).join('')}
                <button onclick="handleWordQuestKey('BACKSPACE')" class="col-span-2 p-2 bg-red-100 text-red-600 rounded font-bold">מחק</button>
                <button onclick="handleWordQuestKey('ENTER')" class="col-span-5 p-2 bg-blue-600 text-white rounded font-bold">אשר</button>
            </div>
        </div>`;
}

function handleWordQuestKey(key) {
    const w = state.wordQuest; if (w.isGameOver) return;
    if (key === 'BACKSPACE') w.currentGuess = w.currentGuess.slice(0, -1);
    else if (key === 'ENTER') {
        if (w.currentGuess.length === w.target.length) {
            w.guesses.push(w.currentGuess);
            if (w.currentGuess === w.target) {
                w.isGameOver = true;
                setTimeout(() => { confetti(); state.winner = { msg: "קוד פוצח! 🔐", subMsg: `המילה: ${w.target}` }; render(); }, 500);
            } else if (w.guesses.length >= w.maxAttempts) { alert(`נגמר! המילה הייתה ${w.target}`); state.screen = 'menu'; }
            w.currentGuess = '';
        }
    } else if (w.currentGuess.length < w.target.length && /^[A-Z]$/.test(key)) w.currentGuess += key;
    render();
}

function renderWinnerScreen(app) {
    app.innerHTML = `
        <div class="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-2xl text-center border-b-8 border-green-100">
            <div class="text-7xl mb-6">🏆</div>
            <h2 class="text-4xl font-black text-green-600 mb-4">${state.winner.msg}</h2>
            <p class="text-xl font-black mb-10 text-gray-700">${state.winner.subMsg || ''}</p>
            <button onclick="state.winner=null; state.screen='menu'; render()" class="bg-blue-600 text-white py-5 rounded-2xl text-2xl font-black w-full">חזרה לתפריט 🏠</button>
        </div>`;
}

function resetAllData() { if(confirm('למחוק הכל?')) { localStorage.clear(); location.reload(); } }

document.getElementById('toggleNight').onclick = () => { 
    state.nightMode = !state.nightMode; document.body.classList.toggle('night-mode');
    document.getElementById('toggleNight').innerText = state.nightMode ? '🌙' : '☀️';
};

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const sharedWords = params.get('w');
    const sharedData = params.get('data');
    
    if (sharedWords) {
        try {
            const decodedText = decodeURIComponent(escape(atob(sharedWords)));
            const lines = decodedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length > 0) {
                // בדיקה אם השורה הראשונה היא כותרת (אין בה מקף)
                if (!lines[0].includes('-')) {
                    state.listName = lines[0];
                    state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
                        const p = l.split('-');
                        return { eng: p[0].trim(), heb: p[1].trim(), known: false };
                    });
                } else {
                    state.words = lines.filter(l => l.includes('-')).map(l => {
                        const p = l.split('-');
                        return { eng: p[0].trim(), heb: p[1].trim(), known: false };
                    });
                }
                state.screen = 'flashcards'; saveToLocal();
            }
        } catch(e) { console.error("URL Error", e); }
    } else if (sharedData) {
        try {
            const decoded = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
            state.listName = decoded.n;
            state.words = decoded.w.map(s => {
                const [eng, heb] = s.split('-');
                return { eng: eng.trim(), heb: heb.trim(), known: false };
            });
            state.screen = 'flashcards'; saveToLocal();
        } catch(e) { console.error("URL Data Error", e); }
    } else { loadFromLocal(); }
    render();
};
