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
        target: '', hint: '', guesses: [], currentGuess: '', maxAttempts: 6, 
        isGameOver: false, keyStates: {}, showTutorial: true 
    },
    winner: null
};

// --- עזרים ---
function saveToLocal() {
    localStorage.setItem('wm_words', JSON.stringify(state.words));
    localStorage.setItem('wm_input', state.inputText);
    localStorage.setItem('wm_listName', state.listName);
}

function loadFromLocal() {
    const savedWords = localStorage.getItem('wm_words');
    const savedInput = localStorage.getItem('wm_input');
    const savedListName = localStorage.getItem('wm_listName');
    if (savedWords) state.words = JSON.parse(savedWords);
    if (savedInput) state.inputText = savedInput;
    if (savedListName) state.listName = savedListName;
    if (state.words.length > 0) state.screen = 'flashcards';
}

function speak(text) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    msg.rate = 0.9;
    window.speechSynthesis.speak(msg);
}

// --- רינדור מסכים ---
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
        <div class="text-center py-10 animate-fade-in">
            <div class="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-blue-100 welcome-card">
                <div class="text-6xl mb-6">🚀</div>
                <h2 class="text-4xl font-black text-blue-600 mb-4">מוכנים?</h2>
                <button onclick="state.screen='input'; render();" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-lg transform active:scale-95 transition">בואו נתחיל!</button>
            </div>
        </div>`;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 animate-fade-in">
            <div class="bg-white p-6 rounded-[2.5rem] shadow-xl border-4 border-blue-50">
                <input type="text" id="listName" value="${state.listName}" class="w-full p-4 rounded-2xl border-2 border-blue-50 text-center text-xl font-black outline-none" placeholder="שם היחידה">
                <textarea id="wordInput" class="w-full h-64 p-6 mt-4 rounded-[2rem] border-2 border-blue-50 text-right text-xl font-bold outline-none" placeholder="bicycle - אופניים">${state.inputText}</textarea>
            </div>
            <button onclick="processInput()" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-xl">צור הרפתקה! ✨</button>
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
        <div class="w-full max-w-md flex flex-col items-center space-y-8 animate-fade-in">
            <h1 class="text-2xl font-black text-gray-800">${state.listName}</h1>
            <div class="perspective-1000 w-full h-80 cursor-pointer" onclick="this.classList.toggle('card-flipped')">
                <div class="card-inner">
                    <div class="card-front bg-white border-4 border-blue-100">
                        <div class="text-5xl font-black text-blue-600 eng-text">${current.eng}</div>
                        <button onclick="event.stopPropagation(); speak('${current.eng}')" class="mt-10 text-4xl">🔊</button>
                    </div>
                    <div class="card-back bg-blue-600 text-white">
                        <div class="text-5xl font-bold">${current.heb}</div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-6 w-full">
                <button onclick="markWordKnown('${current.eng}', true)" class="py-6 bg-green-600 text-white rounded-[2rem] text-2xl font-black">יודע ✅</button>
                <button onclick="markWordKnown('${current.eng}', false)" class="py-6 bg-orange-600 text-white rounded-[2rem] text-2xl font-black">עוד לא ⏳</button>
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
        if (state.masteryScore >= 70) confetti({ particleCount: 150, spread: 70 });
        render(); return;
    }
    const current = state.words[state.quizIndex];
    let options = [current.heb];
    let others = state.words.filter(w => w.heb !== current.heb).map(w => w.heb);
    options = [...options, ...others.sort(() => 0.5 - Math.random()).slice(0, 3)].sort(() => 0.5 - Math.random());

    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 text-center animate-fade-in">
            <h2 class="text-xl font-bold text-gray-400">שאלה ${state.quizIndex + 1}/${state.words.length}</h2>
            <div class="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-blue-400">
                <div class="text-5xl font-black text-blue-600 mb-10 eng-text">${current.eng}</div>
                <div class="grid gap-4">
                    ${options.map(opt => `<button onclick="handleQuizAnswer('${opt}', '${current.heb}')" class="py-5 border-2 border-blue-50 rounded-2xl text-xl font-black hover:bg-blue-50">${opt}</button>`).join('')}
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
        <div class="text-center space-y-6 w-full max-w-md animate-fade-in">
            <div class="bg-white p-8 rounded-[2rem] shadow-xl border-4 border-blue-100 welcome-card">
                <h1 class="text-3xl font-black text-gray-800">${state.listName}</h1>
                <p class="text-xl font-bold text-gray-700 mt-2">הציון שלך: ${state.masteryScore}%</p>
                <div class="flex gap-2 justify-center mt-4">
                    <button onclick="state.screen='quiz'; state.quizIndex=0; state.correctAnswers=0; render();" class="bg-orange-600 text-white px-6 py-2 rounded-full font-black shadow-md">🔄 מבחן חוזר</button>
                </div>
            </div>
            <div class="grid gap-4">
                <button onclick="${isLocked ? '' : 'startMemory()'}" class="p-6 bg-purple-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked ? 'opacity-50' : ''}">משחק זיכרון 🧠 ${isLocked ? '🔒' : ''}</button>
                <button onclick="${isLocked ? '' : 'startC4()'}" class="p-6 bg-blue-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked ? 'opacity-50' : ''}">4 בשורה 🔴🟡 ${isLocked ? '🔒' : ''}</button>
                <button onclick="${isLocked ? '' : 'startWordQuest()'}" class="p-6 bg-emerald-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked ? 'opacity-50' : ''}">הקוד הסודי 🔐 ${isLocked ? '🔒' : ''}</button>
            </div>
            <button onclick="resetAllData()" class="text-red-600 font-black underline mt-6">הזנת רשימה חדשה</button>
        </div>`;
}

// --- משחקים ---
function startMemory() {
    let cards = [];
    let gameWords = [...state.words].sort(() => 0.5 - Math.random()).slice(0, 6);
    gameWords.forEach(w => {
        cards.push({ val: w.eng, type: 'eng', pair: w.heb, flipped: false, matched: false });
        cards.push({ val: w.heb, type: 'heb', pair: w.eng, flipped: false, matched: false });
    });
    state.memoryGame = { cards: cards.sort(() => 0.5 - Math.random()), flipped: [], pairs: 0, steps: 0, isProcessing: false };
    state.screen = 'memory'; render();
}

function renderMemory(app) {
    const m = state.memoryGame;
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6">
            <div class="flex justify-between items-center bg-white p-4 rounded-2xl shadow-lg">
                <button onclick="state.screen='menu'; render()" class="text-3xl">🏠</button>
                <div class="text-xl font-black text-purple-600">זוגות: ${m.pairs} / 6</div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                ${m.cards.map((card, idx) => `
                    <div onclick="handleMemoryMove(${idx})" class="h-28 rounded-2xl shadow-md flex items-center justify-center cursor-pointer transition-all ${card.matched ? 'opacity-0' : (card.flipped ? 'bg-white border-4 border-purple-400' : 'bg-purple-600')}">
                        <span class="font-bold text-center p-2 ${card.flipped ? '' : 'hidden'}">${card.val}</span>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function handleMemoryMove(idx) {
    const m = state.memoryGame;
    if (m.isProcessing || m.flipped.includes(idx) || m.cards[idx].matched) return;
    m.cards[idx].flipped = true; m.flipped.push(idx); render();
    if (m.flipped.length === 2) {
        m.isProcessing = true;
        const [i1, i2] = m.flipped;
        if (m.cards[i1].val === m.cards[i2].pair || m.cards[i2].val === m.cards[i1].pair) {
            setTimeout(() => {
                m.cards[i1].matched = m.cards[i2].matched = true;
                m.pairs++; m.flipped = []; m.isProcessing = false;
                if (m.pairs === 6) state.winner = { msg: "ניצחתם בזיכרון! 🧠" };
                render();
            }, 600);
        } else {
            setTimeout(() => { m.cards[i1].flipped = m.cards[i2].flipped = false; m.flipped = []; m.isProcessing = false; render(); }, 1000);
        }
    }
}

function startC4() {
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, isAnswering: false };
    state.screen = 'connect4'; render();
}

function renderConnect4(app) {
    const c = state.connect4;
    app.innerHTML = `
        <div class="w-full max-w-md flex flex-col items-center space-y-4">
            <div class="w-full flex justify-between items-center bg-white p-4 rounded-2xl shadow-lg">
                <button onclick="state.screen='menu'; render()" class="text-3xl">🏠</button>
                <div class="font-black text-lg">תור: ${c.turn === 1 ? '🔴 אדום' : '🟡 צהוב'}</div>
            </div>
            <div class="c4-container">
                <div class="c4-board">
                    ${c.board.map((row, r) => row.map((cell, col) => `
                        <div onclick="handleC4ColClick(${col})" class="c4-slot">
                            ${cell ? `<div class="token-fixed ${cell === 1 ? 'token-red' : 'token-yellow'}"></div>` : ''}
                        </div>
                    `).join('')).join('')}
                </div>
            </div>
            ${c.isAnswering ? renderC4Q() : '<div class="text-blue-600 font-black animate-pulse">לחץ על טור להנחת אסימון</div>'}
        </div>`;
}

function renderC4Q() {
    const q = state.connect4.q;
    return `
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div class="bg-white p-8 rounded-[2.5rem] w-full max-w-sm text-center">
                <div class="text-4xl font-black text-blue-600 mb-8 eng-text">${q.eng}</div>
                <div class="grid gap-3">
                    ${q.opts.map(opt => `<button onclick="checkC4Ans('${opt}')" class="py-4 border-2 border-blue-100 rounded-2xl font-black text-xl">${opt}</button>`).join('')}
                </div>
            </div>
        </div>`;
}

function handleC4ColClick(col) {
    const c = state.connect4; if (c.isAnswering || c.board[0][col]) return;
    const qWord = state.words[Math.floor(Math.random() * state.words.length)];
    let opts = [qWord.heb];
    let others = state.words.filter(w => w.heb !== qWord.heb).map(w => w.heb);
    opts = [...opts, ...others.sort(() => 0.5 - Math.random()).slice(0, 2)].sort(() => 0.5 - Math.random());
    c.q = { ...qWord, opts, col }; c.isAnswering = true; render();
}

function checkC4Ans(ans) {
    const c = state.connect4;
    if (ans === c.q.heb) {
        for (let r = 5; r >= 0; r--) {
            if (!c.board[r][c.q.col]) {
                c.board[r][c.q.col] = c.turn;
                if (checkWin(r, c.q.col)) state.winner = { msg: `השחקן ה${c.turn === 1 ? 'אדום' : 'צהוב'} ניצח! 🏆` };
                c.turn = c.turn === 1 ? 2 : 1; break;
            }
        }
    } else { alert("טעות! התור עובר."); c.turn = c.turn === 1 ? 2 : 1; }
    c.isAnswering = false; render();
}

function checkWin(r, c) {
    const b = state.connect4.board; const v = b[r][c];
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let [dr, dc] of dirs) {
        let count = 1;
        for (let s of [1, -1]) {
            let nr = r + dr*s, nc = c + dc*s;
            while(nr>=0 && nr<6 && nc>=0 && nc<7 && b[nr][nc] === v) { count++; nr += dr*s; nc += dc*s; }
        }
        if (count >= 4) return true;
    }
    return false;
}

function startWordQuest() {
    const valid = state.words.filter(w => w.eng.length >= 3 && w.eng.length <= 8);
    const target = valid[Math.floor(Math.random() * valid.length)];
    state.wordQuest = { target: target.eng.toUpperCase(), hint: target.heb, guesses: [], currentGuess: '', maxAttempts: 6 };
    state.screen = 'wordquest'; render();
}

function renderWordQuest(app) {
    const w = state.wordQuest;
    app.innerHTML = `
        <div class="w-full max-w-md flex flex-col items-center space-y-6 word-quest-container">
            <div class="bg-white p-4 rounded-2xl shadow-md w-full flex justify-between items-center">
                <button onclick="state.screen='menu'; render()" class="text-3xl">🏠</button>
                <div class="text-lg font-black text-green-600">רמז: ${w.hint}</div>
            </div>
            <div class="word-grid" style="grid-template-rows: repeat(${w.maxAttempts}, 1fr);">
                ${Array(w.maxAttempts).fill(0).map((_, i) => {
                    const guess = w.guesses[i] || (i === w.guesses.length ? w.currentGuess : '');
                    return `<div class="flex gap-2">${Array(w.target.length).fill(0).map((_, j) => {
                        const char = guess[j] || '';
                        let cls = "word-cell";
                        if (i < w.guesses.length) {
                            if (char === w.target[j]) cls += " correct";
                            else if (w.target.includes(char)) cls += " present";
                            else cls += " absent";
                        }
                        return `<div class="${cls}">${char}</div>`;
                    }).join('')}</div>`;
                }).join('')}
            </div>
            <div class="w-full grid grid-cols-7 gap-1">
                ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map(l => `<button onclick="handleKey('${l}')" class="key">${l}</button>`).join('')}
                <button onclick="handleKey('DEL')" class="key key-wide bg-red-100">מחק</button>
                <button onclick="handleKey('ENTER')" class="key key-wide bg-blue-600 text-white">אשר</button>
            </div>
        </div>`;
}

function handleKey(k) {
    const w = state.wordQuest;
    if (k === 'DEL') w.currentGuess = w.currentGuess.slice(0, -1);
    else if (k === 'ENTER') {
        if (w.currentGuess.length === w.target.length) {
            w.guesses.push(w.currentGuess);
            if (w.currentGuess === w.target) {
                confetti(); state.winner = { msg: "הקוד פוצח! 🔐", subMsg: `המילה הייתה: ${w.target}` };
            } else if (w.guesses.length >= w.maxAttempts) {
                alert(`הפסדתם! המילה הייתה ${w.target}`); state.screen = 'menu';
            }
            w.currentGuess = '';
        }
    } else if (w.currentGuess.length < w.target.length) w.currentGuess += k;
    render();
}

function renderWinnerScreen(app) {
    app.innerHTML = `
        <div class="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-2xl text-center border-b-8 border-green-100 win-card-base win-glow-emerald">
            <div class="text-7xl mb-6">🏆</div>
            <h2 class="text-4xl font-black text-green-600 mb-4">${state.winner.msg}</h2>
            <p class="text-xl font-bold mb-10 text-gray-700">${state.winner.subMsg || ''}</p>
            <button onclick="state.winner=null; state.screen='menu'; render()" class="bg-blue-600 text-white py-5 rounded-2xl text-2xl font-black w-full shadow-lg">חזרה לתפריט 🏠</button>
        </div>`;
}

function resetAllData() { if(confirm('למחוק הכל?')) { localStorage.clear(); location.href = window.location.pathname; } }

document.getElementById('toggleNight').onclick = () => { 
    state.nightMode = !state.nightMode;
    document.body.classList.toggle('night-mode');
    document.getElementById('toggleNight').innerText = state.nightMode ? '🌙' : '☀️';
};

// --- טעינה ראשונית מקישור ---
window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const sharedWords = params.get('w');
    if (sharedWords) {
        try {
            const decodedText = decodeURIComponent(escape(atob(sharedWords)));
            const lines = decodedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length > 0) {
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
        } catch(e) { console.error("Link Error", e); loadFromLocal(); }
    } else { loadFromLocal(); }
    render();
};
