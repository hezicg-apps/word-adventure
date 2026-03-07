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
        target: '', 
        hint: '', 
        guesses: [], 
        currentGuess: '', 
        maxAttempts: 5, 
        isGameOver: false, 
        keyStates: {}, 
        showTutorial: true, 
        roundIndex: 0, 
        pool: [], 
        completedCount: 0 
    },
    winner: null
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
    const savedWords = localStorage.getItem('wm_words');
    if (savedWords) {
        state.words = JSON.parse(savedWords);
        state.inputText = localStorage.getItem('wm_input') || '';
        state.masteryScore = parseFloat(localStorage.getItem('wm_mastery')) || 0;
        state.listName = localStorage.getItem('wm_listName') || 'אוצר המילים שלי';
        state.screen = state.masteryScore >= 70 ? 'menu' : 'flashcards';
    }
}

// --- פונקציות מסכים ---

function render() {
    document.body.classList.toggle('night-mode', state.nightMode);
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
}

function renderWelcome(app) {
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-md animate-fade-in mt-10">
            <div class="bg-white p-8 rounded-[3rem] border-4 border-blue-400 shadow-xl">
                <h1 class="text-4xl font-black text-blue-600 mb-6">WordMaster AI</h1>
                <p class="text-xl font-bold text-gray-600">מוכנים ללמוד אנגלית בכיף?</p>
            </div>
            <button onclick="state.screen='input'; render()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg">בואו נתחיל!</button>
        </div>`;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="text-center space-y-4 w-full px-2 mt-4 animate-fade-in">
            <p class="text-2xl font-black text-blue-600">הזינו מילים (מילה - תרגום)</p>
            <textarea id="wordInput" class="w-full h-64 p-6 rounded-[2rem] border-4 border-blue-200 outline-none text-right text-black bg-white shadow-inner text-xl font-bold focus:border-blue-400" placeholder="כותרת הרשימה\napple - תפוח\nbanana - בננה">${state.inputText}</textarea>
            <button onclick="processInput()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg">המשך לכרטיסיות 🌟</button>
        </div>`;
    const area = document.getElementById('wordInput');
    area.oninput = (e) => state.inputText = e.target.value;
}

function processInput() {
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
    state.screen = 'flashcards';
    render();
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
            <div class="bg-white p-6 rounded-[2rem] shadow-xl border-4 border-blue-100">
                <h1 class="text-2xl font-black">${state.listName}</h1>
                <p class="text-xl font-bold text-gray-700 mt-2">ציון: ${state.masteryScore.toFixed(0)}%</p>
                ${isLocked ? `<p class="text-red-500 text-sm font-bold">השיגו 70% במבחן כדי לפתוח את המשחקים!</p>` : ''}
            </div>
            <div class="grid gap-4">
                <button onclick="${isLocked ? '' : 'startMemory()'}" class="p-6 bg-purple-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked ? 'opacity-50' : ''}">משחק זיכרון 🧠</button>
                <button onclick="${isLocked ? '' : 'state.screen=\'c4_menu\'; render()'}" class="p-6 bg-blue-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked ? 'opacity-50' : ''}">4 בשורה 🔴🟡</button>
                <button onclick="${isLocked ? '' : 'startWordQuest()'}" class="p-6 bg-emerald-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked ? 'opacity-50' : ''}">הקוד הסודי 🔐</button>
            </div>
            <button onclick="resetAllData()" class="text-red-600 font-bold underline">מחק הכל והתחל מחדש</button>
        </div>`;
}

function resetAllData() {
    if(confirm("בטוח שרוצים למחוק הכל?")) {
        localStorage.clear();
        location.reload();
    }
}

// --- משחק הזיכרון ---

function startMemory() {
    state.screen = 'memory';
    const pairsCount = Math.min(state.words.length, 8);
    const cards = [];
    state.words.slice(0, pairsCount).forEach(w => {
        cards.push({ t: w.eng, m: w.heb, isEng: true }, { t: w.heb, m: w.eng, isEng: false });
    });
    state.memoryGame = { 
        cards: shuffle(cards).map((c, i) => ({ ...c, id: i, f: false, ok: false })), 
        flipped: [], 
        pairs: 0, 
        steps: 0, 
        isProcessing: false 
    };
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
                    <div onclick="flipMemoryCard(${c.id})" class="relative aspect-square perspective-1000 cursor-pointer ${c.f || c.ok ? 'card-flipped' : ''}">
                        <div class="card-inner">
                            <div class="card-front bg-purple-700 text-white text-3xl font-black">?</div>
                            <div class="card-back bg-white border-2 ${c.ok?'border-green-500 bg-green-50':'border-purple-300'} flex items-center justify-center p-1">
                                <div class="font-black text-[10px] text-center text-gray-800">${c.t}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function flipMemoryCard(id) {
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

// --- 4 בשורה ---

function renderC4Menu(app) {
    app.innerHTML = `
        <div class="text-center space-y-6 mt-8 animate-fade-in">
            <div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400">
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
        q: genC4Question(), 
        canDrop: false, 
        isAnswering: false, 
        showQuestionPrompt: true, 
        isAiTurn: false, 
        isPvP: isPvP 
    };
    render();
}

function genC4Question() {
    const w = state.words[Math.floor(Math.random()*state.words.length)];
    const opts = shuffle([w.heb, ...shuffle(state.words.filter(x=>x.id!==w.id).map(x=>x.heb)).slice(0,3)]);
    return { prompt: w.eng, correct: w.heb, opts };
}

function renderConnect4(app) {
    const c = state.connect4;
    app.innerHTML = `
        <div class="flex flex-col items-center w-full px-2 mt-4">
            <div class="w-full flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-md max-w-sm">
                <button onclick="state.screen='menu'; render()" class="text-red-600 font-black">יציאה</button>
                <div class="font-black">תור: ${c.turn===1?'אדום 🔴':'צהוב 🟡'}</div>
            </div>
            <div class="h-16 mb-2">
                ${c.showQuestionPrompt && !c.isAiTurn ? 
                    `<button onclick="state.connect4.showQuestionPrompt=false;state.connect4.isAnswering=true;render();" class="bg-blue-600 text-white px-8 py-3 rounded-full text-xl font-black shadow-lg">שאלה לאסימון</button>` : 
                    `<div class="text-blue-700 font-black text-2xl">${c.isAiTurn ? 'המחשב חושב...' : 'בחר עמודה 👇'}</div>`
                }
            </div>
            <div class="c4-container">
                <div class="c4-board">
                    ${c.board.map((row, rIdx) => row.map((cell, cIdx) => `
                        <div onclick="dropC4Token(${cIdx})" class="c4-slot">
                            ${cell ? `<div class="token-fixed ${cell===1?'token-red':'token-yellow'}"></div>` : ''}
                        </div>
                    `).join('')).join('')}
                </div>
            </div>
            ${c.isAnswering ? renderC4QuestionOverlay(c.q) : ''}
        </div>`;
}

function renderC4QuestionOverlay(q) {
    return `
        <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] px-4">
            <div class="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center">
                <h3 class="text-4xl font-black mb-8 text-blue-700">${q.prompt}</h3>
                <div class="grid gap-4">
                    ${q.opts.map(o => `<button onclick="answerC4Question('${o}')" class="p-4 border-2 rounded-xl font-black text-gray-800 text-2xl">${o}</button>`).join('')}
                </div>
            </div>
        </div>`;
}

function answerC4Question(o) {
    const c = state.connect4;
    if (o === c.q.correct) {
        c.canDrop = true;
        c.isAnswering = false;
    } else {
        c.turn = c.turn === 1 ? 2 : 1;
        c.showQuestionPrompt = true;
        c.isAnswering = false;
        c.q = genC4Question();
    }
    render();
}

function dropC4Token(col) {
    const c = state.connect4;
    if (!c.canDrop) return;
    
    let targetRow = -1;
    for (let r=5; r>=0; r--) {
        if (!c.board[r][col]) { targetRow = r; break; }
    }
    if (targetRow === -1) return;
    
    c.board[targetRow][col] = c.turn;
    c.canDrop = false;
    
    if (checkC4Win(c.board)) {
        triggerConfetti();
        state.winner = { type: 'c4', msg: c.turn===1?"אדום ניצח!":"צהוב ניצח!", glowClass: c.turn===1?'win-glow-red':'win-glow-yellow' };
    } else {
        c.turn = c.turn === 1 ? 2 : 1;
        c.showQuestionPrompt = true;
        c.q = genC4Question();
    }
    render();
}

function checkC4Win(b) {
    for (let r=0; r<6; r++) for (let c=0; c<4; c++) if (b[r][c] && b[r][c]==b[r][c+1] && b[r][c]==b[r][c+2] && b[r][c]==b[r][c+3]) return true;
    for (let r=0; r<3; r++) for (let c=0; c<7; c++) if (b[r][c] && b[r][c]==b[r+1][c] && b[r][c]==b[r+2][c] && b[r][c]==b[r+3][c]) return true;
    return false;
}

// --- הקוד הסודי (WordQuest / Wordle) ---

function startWordQuest() {
    const pool = shuffle(state.words.filter(w => w.eng.length >= 2 && !w.eng.includes(' ')));
    if (pool.length === 0) {
        alert("צריך מילים ללא רווחים כדי לשחק במשחק הזה.");
        return;
    }
    state.screen = 'wordquest';
    state.wordQuest = { 
        pool, roundIndex: 0, completedCount: 0, 
        target: pool[0].eng.toLowerCase(), hint: pool[0].heb, 
        guesses: [], currentGuess: '', maxAttempts: 5, 
        isGameOver: false, keyStates: {}, showTutorial: false 
    };
    render();
}

function renderWordQuest(app) {
    const w = state.wordQuest;
    const wordLen = w.target.length;
    
    // חישוב גודל התיבות לפי אורך המילה
    const baseBoxSize = wordLen <= 5 ? 60 : Math.min(Math.floor((window.innerWidth * 0.9) / wordLen), 50);
    
    // מקרא צבעים (Legend)
    const legendHtml = `
        <div class="flex justify-center gap-4 mb-4 p-3 bg-white/50 rounded-2xl border-2 border-dashed border-emerald-200">
            <div class="legend-item" style="display:flex; align-items:center; gap:5px;">
                <div class="correct" style="width:15px; height:15px; border-radius:3px;"></div> 
                <span class="text-xs font-black">במקום!</span>
            </div>
            <div class="legend-item" style="display:flex; align-items:center; gap:5px;">
                <div class="present" style="width:15px; height:15px; border-radius:3px;"></div> 
                <span class="text-xs font-black">אות קיימת</span>
            </div>
            <div class="legend-item" style="display:flex; align-items:center; gap:5px;">
                <div class="absent" style="width:15px; height:15px; border-radius:3px; border:1px solid #ddd; background:white;"></div> 
                <span class="text-xs font-black">טעות</span>
            </div>
        </div>
    `;

    // בניית גריד הניחושים
    let gridHtml = `<div class="word-grid" style="grid-template-columns: repeat(${wordLen}, 1fr); width: fit-content; gap: 5px; margin: 0 auto; display: grid;">`;
    for (let i = 0; i < w.maxAttempts; i++) {
        const g = w.guesses[i];
        for (let j = 0; j < wordLen; j++) {
            const commonStyle = `width: ${baseBoxSize}px; height: ${baseBoxSize}px; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-weight: 900; font-size: 1.5rem; transition: all 0.3s;`;
            
            if (g) {
                const status = getLetterStatus(g, j, w.target);
                gridHtml += `<div class="word-cell ${status}" style="${commonStyle}">${g[j].toUpperCase()}</div>`;
            } else if (i === w.guesses.length && !w.isGameOver) {
                const char = w.currentGuess[j] || '';
                gridHtml += `<div class="word-cell border-2 border-emerald-200 bg-white text-gray-800" style="${commonStyle}">${char.toUpperCase()}</div>`;
            } else {
                gridHtml += `<div class="word-cell border-2 border-gray-100 bg-gray-50/30" style="${commonStyle}"></div>`;
            }
        }
    }
    gridHtml += `</div>`;

    app.innerHTML = `
        <div class="flex flex-col items-center w-full px-2 mt-2 animate-fade-in">
            <div class="w-full flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-md max-w-sm welcome-card" style="direction:rtl">
                <button onclick="state.screen='menu'; render()" class="text-red-600 font-black">יציאה</button>
                <div class="text-right">
                    <div class="font-black text-xl text-emerald-700">רמז: ${w.hint}</div>
                    <div class="text-xs font-bold text-gray-400">ניסיון ${w.guesses.length + 1} מתוך ${w.maxAttempts}</div>
                </div>
            </div>
            
            ${legendHtml}
            
            <div class="mb-6">${gridHtml}</div>
            
            <div class="w-full max-w-md">${renderQwerty()}</div>
        </div>`;
}

function getLetterStatus(guess, index, target) {
    const letter = guess[index];
    if (letter === target[index]) return 'correct';
    if (target.includes(letter)) return 'present';
    return 'absent';
}

function renderQwerty() { 
    const rows = [
        ['q','w','e','r','t','y','u','i','o','p'], 
        ['a','s','d','f','g','h','j','k','l'], 
        ['ENTER','z','x','c','v','b','n','m', '⌫']
    ]; 
    return rows.map(r => `
        <div class="qwerty-row" style="display:flex; justify-content:center; gap:4px; margin-bottom:5px;">
            ${r.map(k => {
                let keyClass = "bg-white border-b-4 border-gray-300";
                const status = state.wordQuest.keyStates[k];
                if (status === 'correct') keyClass = "correct";
                else if (status === 'present') keyClass = "present";
                else if (status === 'absent') keyClass = "opacity-30";
                
                const isWide = k === 'ENTER' || k === '⌫';
                return `<button onclick="handleKey('${k}')" 
                    class="key ${keyClass} ${isWide ? 'px-4 text-xs' : 'w-8'} h-12 rounded-lg font-black transition-all active:translate-y-1">
                    ${k === 'ENTER' ? 'OK' : k.toUpperCase()}
                </button>`;
            }).join('')}
        </div>`).join(''); 
}

function handleKey(k) {
    const w = state.wordQuest;
    if (w.isGameOver) return;

    if (k === '⌫') {
        w.currentGuess = w.currentGuess.slice(0, -1);
    } else if (k === 'ENTER') {
        if (w.currentGuess.length === w.target.length) {
            submitGuess();
        }
    } else if (w.currentGuess.length < w.target.length && k.length === 1) {
        w.currentGuess += k.toLowerCase();
    }
    render();
}

function submitGuess() {
    const w = state.wordQuest;
    const guess = w.currentGuess;
    w.guesses.push(guess);
    
    // עדכון מצב המקלדת
    for (let i = 0; i < guess.length; i++) {
        const char = guess[i];
        const status = getLetterStatus(guess, i, w.target);
        if (!w.keyStates[char] || status === 'correct' || (status === 'present' && w.keyStates[char] !== 'correct')) {
            w.keyStates[char] = status;
        }
    }

    if (guess === w.target) {
        triggerConfetti();
        state.winner = { type: 'wq', msg: 'כל הכבוד!', subMsg: `נחשת את המילה: ${w.target.toUpperCase()}`, glowClass: 'win-glow-emerald' };
    } else if (w.guesses.length >= w.maxAttempts) {
        state.winner = { type: 'wq', msg: 'לא נורא...', subMsg: `המילה הייתה: ${w.target.toUpperCase()}`, glowClass: '' };
    }

    w.currentGuess = '';
}

function renderWinScreen(app) {
    const win = state.winner;
    app.innerHTML = `
        <div class="fixed inset-0 flex items-center justify-center bg-black/80 z-[300] px-4">
            <div class="text-center p-10 rounded-[3rem] max-w-sm w-full animate-fade-in win-card-base ${win.glowClass || ''} bg-white">
                <h2 class="text-4xl font-black mb-6 text-blue-700">${win.msg}</h2>
                <p class="text-xl font-black mb-10 text-gray-800">${win.subMsg || ''}</p>
                <div class="space-y-4">
                    <button onclick="state.winner=null; if(state.screen==='memory')startMemory();else if(state.screen==='connect4')startC4(state.connect4.isPvP);else startWordQuest();" class="bg-blue-600 text-white py-5 rounded-2xl text-2xl font-black w-full shadow-lg">שחק שוב 🔄</button>
                    <button onclick="state.winner=null; state.screen='menu'; render()" class="bg-white text-gray-800 py-4 rounded-2xl text-xl font-black w-full shadow">חזרה לתפריט 🏠</button>
                </div>
            </div>
        </div>`;
}

// אתחול
loadFromLocal();
render();

document.getElementById('toggleNight').onclick = () => { 
    state.nightMode = !state.nightMode; 
    render(); 
};
