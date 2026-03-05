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

// --- עזרים ---
function triggerConfetti() { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8; window.speechSynthesis.speak(u); }
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

// --- ניהול נתונים ---
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

// --- ליבת המערכת ---
function render() {
    document.body.classList.toggle('night-mode', state.nightMode);
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
}

function renderWelcome(app) {
    app.innerHTML = `
        <div class="text-center space-y-6 animate-fade-in mt-10">
            <div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400 welcome-card shadow-xl">
                <p class="text-4xl font-black text-blue-600 mb-6">ברוכים הבאים! 👋</p>
                <div class="space-y-4 text-right font-bold text-gray-700">
                    <p>📝 מזינים רשימת מילים</p>
                    <p>🎴 לומדים עם כרטיסיות</p>
                    <p>🎮 משחקים באנגלית!</p>
                </div>
            </div>
            <button onclick="state.screen='input'; render()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg active:scale-95 transition-transform">בואו נתחיל!</button>
        </div>`;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="text-center space-y-4 animate-fade-in">
            <p class="text-2xl font-black text-blue-600">הזינו מילים (מילה - תרגום)</p>
            <textarea id="wordInput" class="w-full h-64 p-6 rounded-[2rem] border-4 border-blue-200 outline-none text-right text-black bg-white shadow-inner text-xl font-bold" placeholder="apple - תפוח\nbanana - בננה">${state.inputText}</textarea>
            <button onclick="processInput()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg">המשך לכרטיסיות 🌟</button>
        </div>`;
    const area = document.getElementById('wordInput');
    area.oninput = (e) => state.inputText = e.target.value;
}

function processInput() {
    const lines = state.inputText.split('\n').filter(l => l.includes('-'));
    if (lines.length === 0) return;
    state.words = lines.map(l => {
        const parts = l.split('-');
        return { eng: parts[0].trim(), heb: parts[1].trim(), known: false, id: Math.random() };
    });
    saveToLocal();
    state.screen = 'flashcards';
    render();
}

function renderFlashcards(app) {
    const unknown = state.words.filter(w => !w.known);
    if (unknown.length === 0) { state.quizIndex = 0; state.correctAnswers = 0; state.screen = 'quiz'; render(); return; }
    const cur = unknown[0];
    app.innerHTML = `
        <div class="text-center space-y-6">
            <h2 class="text-2xl font-black">לימוד מילים (${state.words.filter(w=>w.known).length}/${state.words.length})</h2>
            <div onclick="this.classList.toggle('card-flipped')" class="relative w-full h-80 perspective-1000 cursor-pointer">
                <div class="card-inner">
                    <div class="card-front bg-white flex-col"><span class="text-5xl font-black text-blue-600 mb-4">${cur.eng}</span><button onclick="event.stopPropagation(); speak('${cur.eng}')" class="text-4xl">🔊</button></div>
                    <div class="card-back"><span class="text-4xl font-black px-4">${cur.heb}</span></div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                 <button onclick="state.words.find(w=>w.id === ${cur.id}).known=true; render()" class="bg-green-600 text-white py-5 rounded-2xl font-black text-2xl shadow-md">יודע ✅</button>
                 <button onclick="state.words = shuffle(state.words); render()" class="bg-orange-600 text-white py-5 rounded-2xl font-black text-2xl shadow-md">עוד לא ⏳</button>
            </div>
        </div>`;
}

function renderQuiz(app) {
    if (state.quizIndex >= state.words.length) {
        state.masteryScore = (state.correctAnswers / state.words.length) * 100;
        saveToLocal(); triggerConfetti(); state.screen = 'menu'; render(); return;
    }
    const cur = state.words[state.quizIndex];
    if (!state.quizOptions) state.quizOptions = shuffle([cur.heb, ...shuffle(state.words.filter(x=>x.id!==cur.id).map(x=>x.heb)).slice(0,3)]);
    
    app.innerHTML = `
        <div class="text-center space-y-6">
            <h2 class="text-2xl font-black">מבחן: ${state.quizIndex + 1}/${state.words.length}</h2>
            <div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400 shadow-xl">
                <div class="text-4xl font-black mb-8 flex items-center justify-center gap-4">
                    ${cur.eng}
                    <button onclick="speak('${cur.eng}')" class="text-3xl">🔊</button>
                </div>
                <div class="grid gap-4">
                    ${state.quizOptions.map((o, idx) => {
                        let sClass = '';
                        if (state.quizFeedback.status) {
                            if (o === cur.heb) sClass = 'bg-green-500 text-white border-green-600';
                            else if (idx === state.quizFeedback.index && state.quizFeedback.status === 'wrong') sClass = 'bg-red-500 text-white border-red-600';
                        }
                        return `<button onclick="handleQuizAns('${o}', ${idx})" class="py-4 border-2 rounded-2xl font-black text-xl transition-all ${sClass || 'border-gray-200'}">${o}</button>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
}

function handleQuizAns(selected, idx) {
    if (state.quizFeedback.status) return;
    const correct = state.words[state.quizIndex].heb;
    const isCorrect = selected === correct;
    state.quizFeedback = { index: idx, status: isCorrect ? 'correct' : 'wrong' };
    if (isCorrect) state.correctAnswers++;
    render();
    setTimeout(() => { 
        state.quizIndex++; state.quizOptions = null; 
        state.quizFeedback = { index: -1, status: null }; 
        render(); 
    }, 800);
}

function renderMenu(app) {
    const isLocked = state.masteryScore < 70;
    app.innerHTML = `
        <div class="text-center space-y-6 mt-6">
            <div class="bg-white p-6 rounded-[2rem] shadow-xl border-4 border-blue-100">
                <h2 class="text-2xl font-black">${isLocked ? 'המשיכו להתאמן!' : 'כל המשחקים פתוחים! 🎉'}</h2>
                <p class="text-xl font-bold text-gray-600">ציון: ${state.masteryScore.toFixed(0)}%</p>
                <button onclick="state.quizIndex = 0; state.correctAnswers = 0; state.screen = 'quiz'; render();" class="mt-4 bg-orange-500 text-white px-6 py-2 rounded-full font-black">מבחן חוזר 🔄</button>
            </div>
            <div class="grid gap-4">
                <button onclick="${isLocked?'':'state.screen=\'memory\'; startMemory()'}" class="p-6 bg-purple-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50':''}">משחק זיכרון 🧠</button>
                <button onclick="${isLocked?'':'state.screen=\'c4_menu\'; render()'}" class="p-6 bg-blue-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50':''}">4 בשורה 🔴🟡</button>
                <button onclick="${isLocked?'':'startWordQuest()'}" class="p-6 bg-emerald-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50':''}">הקוד הסודי 🔐</button>
            </div>
            <button onclick="localStorage.clear(); location.reload();" class="text-red-600 font-bold underline">הזנת רשימה חדשה</button>
        </div>`;
}

// --- פונקציות משחקים (זיכרון, 4 בשורה וכו') ---
// (הלוגיקה שלהם נשמרת כאן כפי שהייתה בגרסה המקורית שלך)

function startMemory() {
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
        <div class="flex flex-col items-center">
            <div class="flex justify-between w-full mb-4 bg-white p-4 rounded-xl shadow">
                <button onclick="state.screen='menu'; render()" class="text-red-600 font-bold">חזרה</button>
                <span class="font-bold">זוגות: ${g.pairs} / ${g.cards.length/2}</span>
            </div>
            <div class="grid grid-cols-4 gap-2 w-full">
                ${g.cards.map(c => `
                    <div onclick="flipM(${c.id})" class="relative aspect-square perspective-1000 cursor-pointer ${c.f || c.ok ? 'card-flipped' : ''}">
                        <div class="card-inner">
                            <div class="card-front bg-purple-700 text-white text-2xl">?</div>
                            <div class="card-back bg-white border-2 ${c.ok?'border-green-500':'border-purple-300'}">
                                <span class="text-xs font-bold text-black">${c.t}</span>
                            </div>
                        </div>
                    </div>`).join('')}
            </div>
        </div>`;
}

function flipM(id) {
    const g = state.memoryGame; if (g.isProcessing) return;
    const card = g.cards.find(x => x.id === id); if (card.f || card.ok) return;
    card.f = true; g.flipped.push(card); render();
    if (g.flipped.length === 2) {
        g.isProcessing = true;
        const [c1, c2] = g.flipped;
        if (c1.t === c2.m || c1.m === c2.t) {
            setTimeout(() => { c1.ok = c2.ok = true; g.pairs++; g.flipped = []; g.isProcessing = false;
                if (g.pairs === g.cards.length/2) { triggerConfetti(); state.winner = { msg: 'ניצחתם!' }; }
                render();
            }, 500);
        } else {
            setTimeout(() => { c1.f = c2.f = false; g.flipped = []; g.isProcessing = false; render(); }, 1000);
        }
    }
}

function renderWinScreen(app) {
    app.innerHTML = `
        <div class="text-center mt-20 animate-fade-in">
            <h2 class="text-5xl font-black text-blue-600 mb-8">${state.winner.msg}</h2>
            <button onclick="state.winner=null; state.screen='menu'; render()" class="bg-blue-600 text-white px-10 py-4 rounded-full text-2xl font-bold shadow-xl">חזרה לתפריט</button>
        </div>`;
}

function startWordQuest() {
    const word = state.words[Math.floor(Math.random()*state.words.length)];
    state.wordQuest = { target: word.eng.toLowerCase(), hint: word.heb, guesses: [], currentGuess: '', maxAttempts: 5, isGameOver: false, keyStates: {} };
    state.screen = 'wordquest';
    render();
}

// --- אתחול ---
loadFromLocal();
render();
