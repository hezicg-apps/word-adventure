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
        // תיקון: אם יש מילים, דלג על מסך הפתיחה ועבור לכרטיסיות
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
        alert('הקישור הועתק! 🔗'); // תיקון טקסט שיתוף
    });
}

// --- עזרי מערכת ---

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

    if (state.winner) {
        renderWinnerScreen(app);
        return;
    }

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

// --- מסכי אפליקציה ---

function renderWelcome(app) {
    app.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-700">
            <div class="bg-white dark-card p-10 rounded-[3rem] shadow-2xl border-b-8 border-blue-100 max-w-sm w-full">
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
            <div class="bg-white dark-card p-6 rounded-[2.5rem] shadow-xl border-4 border-blue-50">
                <label class="block text-center text-gray-400 font-black mb-2">שם היחידה</label>
                <input type="text" id="listName" value="${state.listName}" class="w-full p-4 rounded-2xl border-4 border-blue-50 text-center text-xl font-black focus:border-blue-400 outline-none transition" placeholder="למשל: חיות, פעלים...">
            </div>
            <div class="bg-white dark-card p-6 rounded-[2.5rem] shadow-xl border-4 border-blue-50">
                <label class="block text-center text-gray-400 font-black mb-2">המילים שלך (מילה - תרגום)</label>
                <textarea id="wordInput" class="w-full h-64 p-6 rounded-[2rem] border-4 border-blue-50 text-right text-xl font-bold focus:border-blue-400 outline-none transition" placeholder="Apple - תפוח\nBanana - בננה">${state.inputText}</textarea>
            </div>
            <button onclick="processInput()" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-xl transform active:scale-95 transition">צור הרפתקה! ✨</button>
        </div>`;
}

function processInput() {
    const input = document.getElementById('wordInput').value;
    const name = document.getElementById('listName').value;
    const lines = input.split('\n').filter(l => l.includes('-'));
    
    if (lines.length < 2) {
        alert('נא להזין לפחות 2 מילים בפורמט: מילה - תרגום');
        return;
    }

    state.inputText = input;
    state.listName = name || 'אוצר המילים שלי';
    state.words = lines.map(l => {
        const parts = l.split('-');
        return { eng: parts[0].trim(), heb: parts[1].trim(), known: false };
    });
    
    saveToLocal();
    state.screen = 'flashcards';
    render();
}

function renderFlashcards(app) {
    const unknown = state.words.filter(w => !w.known);
    if (unknown.length === 0) {
        state.screen = 'quiz';
        state.quizIndex = 0;
        state.correctAnswers = 0;
        render();
        return;
    }

    const current = unknown[0];
    app.innerHTML = `
        <div class="w-full max-w-md flex flex-col items-center space-y-8 animate-in zoom-in duration-300">
            <div class="text-2xl font-black text-blue-500 bg-blue-50 px-6 py-2 rounded-full">
                ${state.words.length - unknown.length + 1} / ${state.words.length}
            </div>
            
            <div class="perspective-1000 w-full h-80 cursor-pointer" onclick="this.querySelector('.card-inner').classList.toggle('card-flipped')">
                <div class="card-inner w-full h-full transition-transform duration-500">
                    <div class="card-front bg-white dark-card rounded-[3rem] shadow-2xl flex flex-col items-center justify-center p-6">
                        <div class="text-6xl font-black text-cyan-500 mb-6 eng-text">${current.eng}</div>
                        <button onclick="event.stopPropagation(); speak('${current.eng}')" class="p-4 bg-blue-50 rounded-full text-4xl hover:scale-110 transition">🔊</button>
                        <p class="mt-8 text-gray-300 font-bold">לחצו להצגת התרגום</p>
                    </div>
                    <div class="card-back bg-blue-600 rounded-[3rem] shadow-2xl flex items-center justify-center p-6 text-white">
                        <div class="text-6xl font-bold">${current.heb}</div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-6 w-full">
                <button onclick="markWordKnown('${current.eng}', true)" class="py-6 bg-green-500 text-white rounded-[2rem] text-2xl font-black shadow-lg hover:bg-green-600 transition">יודע ✅</button>
                <button onclick="markWordKnown('${current.eng}', false)" class="py-6 bg-orange-500 text-white rounded-[2rem] text-2xl font-black shadow-lg hover:bg-orange-600 transition">עוד לא ⏳</button>
            </div>
        </div>`;
}

function markWordKnown(eng, isKnown) {
    const idx = state.words.findIndex(w => w.eng === eng);
    if (isKnown) {
        state.words[idx].known = true;
    } else {
        const word = state.words.splice(idx, 1)[0];
        state.words.push(word);
    }
    render();
}

function renderQuiz(app) {
    if (state.quizIndex >= state.words.length) {
        state.masteryScore = Math.round((state.correctAnswers / state.words.length) * 100);
        state.screen = 'menu';
        if (state.masteryScore >= 70) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        render();
        return;
    }

    const current = state.words[state.quizIndex];
    let options = [current.heb];
    let others = state.words.filter(w => w.heb !== current.heb).map(w => w.heb);
    others = others.sort(() => 0.5 - Math.random()).slice(0, 3);
    options = [...options, ...others].sort(() => 0.5 - Math.random());

    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 animate-in slide-in-from-left">
            <div class="bg-white dark-card p-8 rounded-[3rem] shadow-xl border-4 border-blue-400 text-center">
                <h2 class="text-xl font-bold text-gray-400 mb-4">אתגר המילים ${state.quizIndex + 1}/${state.words.length}</h2>
                <div class="text-5xl font-black text-cyan-500 mb-10 eng-text">${current.eng}</div>
                <div class="grid gap-4">
                    ${options.map(opt => `
                        <button onclick="handleQuizAnswer('${opt}', '${current.heb}')" 
                                class="py-5 px-4 border-4 border-blue-50 rounded-2xl text-xl font-black hover:border-blue-400 hover:bg-blue-50 transition duration-200">
                            ${opt}
                        </button>
                    `).join('')}
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
            <div class="bg-white dark-card p-8 rounded-[2.5rem] shadow-xl text-center relative overflow-hidden border-b-8 border-orange-100">
                <h2 class="text-3xl font-black mb-1 unit-title-header">${state.listName}</h2>
                <p class="text-blue-500 font-bold mb-4">${isLocked ? 'השיגו 70% לפתיחת המשחקים' : 'כל המשחקים פתוחים! 🏆'}</p>
                <div class="flex items-center justify-center gap-4 mb-6">
                    <div class="bg-gray-50 dark-card px-6 py-2 rounded-full font-black text-2xl text-gray-700">ציון: ${state.masteryScore}%</div>
                </div>
                <div class="flex gap-4">
                    <button onclick="copyShareLink()" class="flex-1 py-3 bg-blue-50 text-blue-600 rounded-full font-black hover:bg-blue-100 transition">🔗 שתפו</button>
                    <button onclick="state.screen='quiz'; state.quizIndex=0; state.correctAnswers=0; render();" class="flex-1 py-3 bg-orange-600 text-white rounded-full font-black shadow-lg hover:bg-orange-700 transition">🔄 אתגר חוזר</button>
                </div>
            </div>

            <div class="grid gap-4">
                <button onclick="${isLocked ? '' : 'startMemory()'}" class="group relative p-6 bg-[#a855f7] text-white rounded-[2rem] text-2xl font-black shadow-xl ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95 transition'}">
                    <span class="flex items-center justify-center gap-3">🧠 משחק זיכרון ${isLocked ? '🔒' : ''}</span>
                </button>
                
                <button onclick="${isLocked ? '' : 'startC4(true)'}" class="group relative p-6 bg-[#3b82f6] text-white rounded-[2rem] text-2xl font-black shadow-xl ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95 transition'}">
                    <span class="flex items-center justify-center gap-3">🔴 4 בשורה ${isLocked ? '🔒' : ''}</span>
                </button>

                <button onclick="${isLocked ? '' : 'startWordQuest()'}" class="group relative p-6 bg-[#10b981] text-white rounded-[2rem] text-2xl font-black shadow-xl ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95 transition'}">
                    <span class="flex items-center justify-center gap-3">🔐 הקוד הסודי ${isLocked ? '🔒' : ''}</span>
                </button>
            </div>
            
            <button onclick="resetAllData()" class="w-full text-red-500 font-bold underline mt-4 opacity-70 hover:opacity-100">מחיקת רשימה והתחלה מחדש</button>
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
    state.screen = 'memory';
    render();
}

function renderMemory(app) {
    const m = state.memoryGame;
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6">
            <div class="flex justify-between items-center bg-white dark-card p-4 rounded-2xl shadow-lg">
                <button onclick="state.screen='menu'; render()" class="text-3xl">🏠</button>
                <div class="text-xl font-black text-purple-600">זוגות: ${m.pairs} / 8</div>
                <div class="text-xl font-black text-gray-400">צעדים: ${m.steps}</div>
            </div>
            <div class="grid grid-cols-4 gap-3">
                ${m.cards.map((card, idx) => `
                    <div onclick="handleMemoryMove(${idx})" 
                         class="h-24 rounded-2xl cursor-pointer transition-all duration-300 transform shadow-md
                         ${card.matched ? 'opacity-0 pointer-events-none' : ''} 
                         ${card.flipped ? 'bg-white dark-card border-4 border-purple-400 rotate-y-180' : 'bg-purple-600 hover:bg-purple-500'}">
                        <div class="h-full flex items-center justify-center p-2 text-center leading-tight font-bold text-sm ${card.flipped ? 'block' : 'hidden'}">
                            ${card.val}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function handleMemoryMove(idx) {
    const m = state.memoryGame;
    if (m.isProcessing || m.flipped.includes(idx) || m.cards[idx].matched) return;
    
    m.cards[idx].flipped = true;
    m.flipped.push(idx);
    
    if (m.flipped.length === 2) {
        m.steps++;
        m.isProcessing = true;
        const [i1, i2] = m.flipped;
        const c1 = m.cards[i1];
        const c2 = m.cards[i2];
        
        if (c1.val === c2.pair || c2.val === c1.pair) {
            setTimeout(() => {
                c1.matched = c2.matched = true;
                m.pairs++;
                m.flipped = [];
                m.isProcessing = false;
                if (m.pairs === 8) {
                    state.winner = { msg: "ניצחון בזיכרון! 🧠", subMsg: `סיימתם ב-${m.steps} צעדים` };
                }
                render();
            }, 500);
        } else {
            setTimeout(() => {
                c1.flipped = c2.flipped = false;
                m.flipped = [];
                m.isProcessing = false;
                render();
            }, 1000);
        }
    }
    render();
}

// --- 4 בשורה (מקוצר) ---

function startC4(isPvP) {
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, showQuestionPrompt: true, isPvP };
    state.screen = 'connect4';
    render();
}

function renderConnect4(app) {
    const c = state.connect4;
    app.innerHTML = `
        <div class="w-full max-w-md flex flex-col items-center space-y-4">
            <div class="w-full flex justify-between items-center bg-white dark-card p-4 rounded-2xl shadow-lg">
                <button onclick="state.screen='menu'; render()" class="text-3xl">🏠</button>
                <div class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-full ${c.turn === 1 ? 'bg-red-500' : 'bg-yellow-500'}"></div>
                    <span class="font-black">תור ${c.turn === 1 ? 'אדום' : 'צהוב'}</span>
                </div>
            </div>

            <div class="c4-container bg-blue-700 p-3 rounded-2xl shadow-2xl">
                <div class="grid grid-cols-7 gap-2">
                    ${c.board.map((row, r) => row.map((cell, col) => `
                        <div onclick="handleC4Col(${col})" class="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center">
                            ${cell ? `<div class="w-8 h-8 md:w-10 md:h-10 rounded-full ${cell === 1 ? 'bg-red-500 shadow-inner' : 'bg-yellow-500 shadow-inner'}"></div>` : ''}
                        </div>
                    `).join('')).join('')}
                </div>
            </div>
            
            ${c.isAnswering ? renderC4Question() : `<p class="font-bold text-blue-600 animate-bounce">לחצו על טור כדי לשחק!</p>`}
        </div>`;
}

function renderC4Question() {
    const q = state.connect4.q;
    return `
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div class="bg-white dark-card p-8 rounded-[2.5rem] w-full max-w-sm text-center shadow-2xl">
                <h3 class="text-gray-400 font-bold mb-2 text-lg">ענו נכון כדי להניח אסימון</h3>
                <div class="text-4xl font-black text-cyan-500 mb-8 eng-text">${q.eng}</div>
                <div class="grid gap-3">
                    ${q.opts.map(opt => `
                        <button onclick="checkC4Ans('${opt}')" class="py-4 border-2 border-blue-100 rounded-2xl font-black hover:bg-blue-50 transition">${opt}</button>
                    `).join('')}
                </div>
            </div>
        </div>`;
}

function handleC4Col(col) {
    if (state.connect4.isAnswering) return;
    const qWord = state.words[Math.floor(Math.random() * state.words.length)];
    let opts = [qWord.heb, ...state.words.filter(w => w.heb !== qWord.heb).map(w => w.heb).sort(() => 0.5 - Math.random()).slice(0, 2)].sort(() => 0.5 - Math.random());
    state.connect4.q = { ...qWord, opts, col };
    state.connect4.isAnswering = true;
    render();
}

function checkC4Ans(ans) {
    const c = state.connect4;
    if (ans === c.q.heb) {
        for (let r = 5; r >= 0; r--) {
            if (!c.board[r][c.q.col]) {
                c.board[r][c.q.col] = c.turn;
                if (checkWin(r, c.q.col)) {
                    state.winner = { msg: "יש לנו מנצח! 🎉", subMsg: `השחקן ה${c.turn === 1 ? 'אדום' : 'צהוב'} ניצח!` };
                }
                c.turn = c.turn === 1 ? 2 : 1;
                break;
            }
        }
    } else {
        alert("טעות! התור עובר לשחקן הבא.");
        c.turn = c.turn === 1 ? 2 : 1;
    }
    c.isAnswering = false;
    render();
}

function checkWin(r, c) {
    const b = state.connect4.board;
    const v = b[r][c];
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let [dr, dc] of dirs) {
        let count = 1;
        for (let s of [1, -1]) {
            let nr = r + dr*s, nc = c + dc*s;
            while(nr>=0 && nr<6 && nc>=0 && nc<7 && b[nr][nc] === v) {
                count++; nr += dr*s; nc += dc*s;
            }
        }
        if (count >= 4) return true;
    }
    return false;
}

// --- הקוד הסודי (WordQuest) ---

function startWordQuest() {
    const validWords = state.words.filter(w => w.eng.length >= 3 && w.eng.length <= 6);
    if (validWords.length === 0) {
        alert("צריך מילים באורך 3-6 אותיות למשחק זה.");
        state.screen = 'menu';
        render();
        return;
    }
    const targetWord = validWords[Math.floor(Math.random() * validWords.length)];
    state.wordQuest = {
        target: targetWord.eng.toUpperCase(),
        hint: targetWord.heb,
        guesses: [],
        currentGuess: '',
        maxAttempts: 6,
        isGameOver: false
    };
    state.screen = 'wordquest';
    render();
}

function renderWordQuest(app) {
    const w = state.wordQuest;
    app.innerHTML = `
        <div class="w-full max-w-md flex flex-col items-center space-y-6 animate-in zoom-in">
            <div class="bg-white dark-card p-4 rounded-2xl shadow-md w-full flex justify-between items-center">
                <button onclick="state.screen='menu'; render()" class="text-3xl">🏠</button>
                <div class="text-lg font-black text-green-600">רמז: ${w.hint}</div>
            </div>

            <div class="grid gap-2" style="grid-template-rows: repeat(${w.maxAttempts}, 1fr);">
                ${Array(w.maxAttempts).fill(0).map((_, i) => {
                    const guess = w.guesses[i] || (i === w.guesses.length ? w.currentGuess : '');
                    return `<div class="flex gap-2">
                        ${Array(w.target.length).fill(0).map((_, j) => {
                            const char = guess[j] || '';
                            let statusClass = "border-2 border-gray-200";
                            if (i < w.guesses.length) {
                                if (char === w.target[j]) statusClass = "bg-green-500 border-green-500 text-white";
                                else if (w.target.includes(char)) statusClass = "bg-yellow-500 border-yellow-500 text-white";
                                else statusClass = "bg-gray-400 border-gray-400 text-white";
                            }
                            return `<div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black uppercase ${statusClass}">${char}</div>`;
                        }).join('')}
                    </div>`;
                }).join('')}
            </div>

            <div class="grid grid-cols-7 gap-2 w-full pt-4">
                ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map(letter => `
                    <button onclick="handleWQKey('${letter}')" class="p-2 bg-gray-100 rounded-lg font-bold hover:bg-gray-200 active:scale-90 transition">${letter}</button>
                `).join('')}
                <button onclick="handleWQKey('BACKSPACE')" class="col-span-2 p-2 bg-red-100 text-red-600 rounded-lg font-bold">מחק</button>
                <button onclick="handleWQKey('ENTER')" class="col-span-5 p-2 bg-blue-600 text-white rounded-lg font-bold">אשר ניחוש</button>
            </div>
        </div>`;
}

function handleWQKey(key) {
    const w = state.wordQuest;
    if (w.isGameOver) return;

    if (key === 'BACKSPACE') {
        w.currentGuess = w.currentGuess.slice(0, -1);
    } else if (key === 'ENTER') {
        if (w.currentGuess.length === w.target.length) {
            w.guesses.push(w.currentGuess);
            if (w.currentGuess === w.target) {
                w.isGameOver = true;
                state.winner = { msg: "קוד פוצח! 🔐", subMsg: `המילה הייתה: ${w.target}` };
            } else if (w.guesses.length >= w.maxAttempts) {
                w.isGameOver = true;
                alert(`המשחק נגמר. המילה הייתה ${w.target}`);
                state.screen = 'menu';
            }
            w.currentGuess = '';
        }
    } else if (w.currentGuess.length < w.target.length) {
        w.currentGuess += key;
    }
    render();
}

// --- סגירת המערכת ---

function renderWinnerScreen(app) {
    app.innerHTML = `
        <div class="w-full max-w-md animate-in zoom-in duration-500">
            <div class="bg-white dark-card p-10 rounded-[3rem] shadow-2xl text-center border-b-8 border-green-100">
                <div class="text-7xl mb-6">🏆</div>
                <h2 class="text-4xl font-black text-green-600 mb-4">${state.winner.msg}</h2>
                <p class="text-xl font-bold text-gray-500 mb-10">${state.winner.subMsg}</p>
                <button onclick="state.winner=null; state.screen='menu'; render()" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-lg">חזרה לתפריט</button>
            </div>
        </div>`;
}

function resetAllData() {
    if(confirm('למחוק הכל?')) {
        localStorage.clear();
        state.words = [];
        state.screen = 'input';
        render();
    }
}

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('data');
    if (sharedData) {
        try {
            const decoded = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
            state.listName = decoded.n;
            state.words = decoded.w.map(s => {
                const [eng, heb] = s.split('-');
                return { eng: eng.trim(), heb: heb.trim(), known: false };
            });
            state.screen = 'flashcards';
        } catch(e) { console.error("URL Data Error"); }
    } else {
        loadFromLocal();
    }
    render();
};

document.getElementById('toggleNight').onclick = () => {
    state.nightMode = !state.nightMode;
    document.body.classList.toggle('night-mode');
    document.getElementById('toggleNight').innerText = state.nightMode ? '🌙' : '☀️';
};
