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
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('w');
    if (sharedData) {
        try {
            state.inputText = decodeURIComponent(escape(atob(sharedData)));
            processInput(false);
            state.screen = 'welcome';
            return;
        } catch(e) { console.error("שגיאה בפענוח הקישור"); }
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

function shareList() {
    const encodedData = btoa(unescape(encodeURIComponent(state.inputText)));
    const shareUrl = `${window.location.origin}${window.location.pathname}?w=${encodedData}`;
    navigator.clipboard.writeText(shareUrl).then(() => alert(`הקישור הועתק!`));
}

// --- פונקציות ליבה ---
function triggerConfetti() { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u); }
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

// פונקציית הרינדור המרכזית
function render() {
    document.body.classList.toggle('night-mode', state.nightMode);
    const nightBtn = document.getElementById('toggleNight');
    if (nightBtn) nightBtn.innerText = state.nightMode ? '🌙' : '☀️';

    const titleEl = document.getElementById('header-title');
    const logoContainer = document.getElementById('header-logo-container');

    // עדכון כותרת ולוגו
    if (titleEl && logoContainer) {
        if (['welcome', 'input'].includes(state.screen)) {
            titleEl.innerText = "Word Adventure";
            titleEl.className = "text-3xl font-black text-blue-600 drop-shadow-md";
            logoContainer.innerHTML = '';
        } else {
            // הכותרת הצהובה הקריאה לתלמידי יסודי
            titleEl.innerText = state.listName;
            titleEl.className = "text-3xl font-black text-yellow-400 bg-blue-600 py-2 px-8 rounded-full inline-block shadow-lg border-4 border-white transform -rotate-1";
            logoContainer.innerHTML = `<img src="logo.png" class="w-12 h-12 rounded-xl shadow-md border-2 border-white">`;
        }
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

// --- מסכי האפליקציה ---
function renderWelcome(app) {
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-md animate-fade-in mt-6">
            <div class="bg-white p-6 rounded-[2.5rem] border-4 border-blue-400 shadow-xl welcome-card text-black">
                <p class="text-4xl font-black text-blue-600 mb-6 border-b-2 pb-4">ברוכים הבאים! 👋</p>
                <div class="space-y-4 text-right font-bold">
                    <div class="bg-blue-50 p-4 rounded-2xl border-r-8 border-blue-500"><p class="text-xl font-black text-blue-900 mb-1">📝 שלב 1: הזנה</p><p class="text-lg">מדביקים רשימת מילים.</p></div>
                    <div class="bg-green-50 p-4 rounded-2xl border-r-8 border-green-500"><p class="text-xl font-black text-green-900 mb-1">🎴 שלב 2: תרגול</p><p class="text-lg">לומדים ובודקים ידע.</p></div>
                    <div class="bg-purple-50 p-4 rounded-2xl border-r-8 border-purple-500"><p class="text-xl font-black text-purple-900 mb-1">🎮 שלב 3: משחקים</p><p class="text-lg">משחקים באנגלית!</p></div>
                </div>
            </div>
            <button onclick="state.screen='input'; render()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg active:scale-95 transition-transform">בואו נתחיל! 🚀</button>
        </div>`;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="text-center space-y-4 w-full px-2 mt-4 animate-fade-in">
            <p class="text-2xl font-black text-blue-600">הזינו כותרת ואז מילים</p>
            <textarea id="wordInput" class="w-full h-64 p-6 rounded-[2rem] border-4 border-blue-200 outline-none text-right text-black bg-white shadow-inner text-xl font-bold" placeholder="שם הרשימה\napple - תפוח">${state.inputText}</textarea>
            <button onclick="processInput(true)" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg">המשך לכרטיסיות 🌟</button>
        </div>`;
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
    app.innerHTML = `
        <div class="text-center space-y-4 w-full max-w-sm mt-2">
            <h2 class="text-2xl font-black text-gray-600">שלב הלימוד (${state.words.filter(w=>w.known).length}/${state.words.length})</h2>
            <div onclick="this.classList.toggle('card-flipped')" class="relative w-full h-80 perspective-1000 cursor-pointer">
                <div class="card-inner">
                    <div class="card-front bg-white border-4 border-blue-200 flex flex-col items-center justify-center">
                        <span class="text-5xl font-black text-blue-600 mb-6">${cur.eng}</span>
                        <button onclick="event.stopPropagation(); speak('${cur.eng}')" class="text-4xl">🔊</button>
                    </div>
                    <div class="card-back bg-blue-500 border-4 border-blue-600 text-white flex items-center justify-center">
                        <span class="text-4xl font-black">${cur.heb}</span>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                 <button onclick="state.words.find(w=>w.id==='${cur.id}').known=true; saveToLocal(); render()" class="bg-green-500 text-white py-5 rounded-2xl font-black text-2xl shadow-md">יודע ✅</button>
                 <button onclick="state.words = shuffle(state.words); render()" class="bg-orange-500 text-white py-5 rounded-2xl font-black text-2xl shadow-md">עוד לא ⏳</button>
            </div>
        </div>`;
}

function renderQuiz(app) {
    if (state.quizIndex >= state.words.length) { triggerConfetti(); state.screen = 'menu'; render(); return; }
    const cur = state.words[state.quizIndex];
    if (!state.quizOptions) state.quizOptions = shuffle([cur.heb, ...shuffle(state.words.filter(x=>x.id!==cur.id).map(x=>x.heb)).slice(0,3)]);
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-sm mt-2">
            <h2 class="text-xl font-black text-blue-600">מבחן: ${state.quizIndex + 1}/${state.words.length}</h2>
            <div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400 shadow-xl text-black">
                <div class="text-4xl font-black mb-8 flex items-center justify-center gap-4">${cur.eng}<button onclick="speak('${cur.eng}')" class="text-3xl">🔊</button></div>
                <div class="grid gap-4">
                    ${state.quizOptions.map((o, idx) => {
                        let s = ''; if(state.quizFeedback.status){ s = (o===cur.heb)?'bg-green-500 text-white border-green-600':'bg-white border-gray-200 opacity-50'; if(o===state.quizOptions[state.quizFeedback.index] && !state.quizFeedback.isCorrect) s='bg-red-500 text-white border-red-600'; }
                        return `<button onclick="handleQuizAns('${o}', '${cur.heb}', ${idx})" class="py-4 border-2 rounded-2xl font-black text-2xl transition-all ${s}">${o}</button>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
}

function handleQuizAns(sel, corr, idx) {
    if (state.quizFeedback.status) return;
    const isCorrect = sel === corr;
    state.quizFeedback = { status: 'done', index: idx, isCorrect };
    if (isCorrect) state.correctAnswers++;
    render();
    setTimeout(() => { state.quizIndex++; state.quizOptions = null; state.quizFeedback = { index: -1, status: null }; render(); }, 800);
}

function renderMenu(app) {
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-md mt-2">
            <div class="bg-white p-6 rounded-[2rem] shadow-xl border-4 border-blue-100 text-black">
                <div class="flex justify-center gap-2 mb-4">
                    <button onclick="shareList()" class="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-black text-sm">🔗 שתף</button>
                    <button onclick="resetAllData()" class="bg-red-100 text-red-600 px-4 py-2 rounded-full font-black text-sm">🗑️ מחק</button>
                </div>
                <h2 class="text-2xl font-black text-blue-600">הציון שלך: ${((state.correctAnswers/state.words.length)*100).toFixed(0)}%</h2>
                <button onclick="state.quizIndex=0; state.correctAnswers=0; state.screen='quiz'; render();" class="mt-4 bg-orange-500 text-white px-6 py-2 rounded-full font-black shadow-md">🔄 מבחן חוזר</button>
            </div>
            <div class="grid gap-4">
                <button onclick="startMemory()" class="p-6 bg-purple-500 text-white rounded-[2rem] text-2xl font-black shadow-lg">משחק זיכרון 🧠</button>
                <button onclick="state.screen='c4_menu'; render()" class="p-6 bg-blue-500 text-white rounded-[2rem] text-2xl font-black shadow-lg">4 בשורה 🔴🟡</button>
                <button onclick="startWordQuest()" class="p-6 bg-emerald-500 text-white rounded-[2rem] text-2xl font-black shadow-lg">הקוד הסודי 🔐</button>
            </div>
        </div>`;
}

// שאר הפונקציות (משחקי זיכרון, 4 בשורה וכו')
function startMemory() {
    state.screen = 'memory'; state.winner = null;
    const cards = [];
    state.words.slice(0, 8).forEach(w => { 
        cards.push({ t: w.eng, m: w.heb, isEng: true }, { t: w.heb, m: w.eng, isEng: false }); 
    });
    state.memoryGame = { cards: shuffle(cards).map((c, i) => ({ ...c, id: i, f: false, ok: false })), flipped: [], pairs: 0, steps: 0, isProcessing: false };
    render();
}

function renderMemory(app) {
    const g = state.memoryGame;
    app.innerHTML = `
        <div class="flex flex-col items-center w-full max-w-sm mt-2">
            <div class="flex justify-between items-center w-full mb-4 bg-white p-4 rounded-2xl shadow-md text-black">
                <button onclick="state.screen='menu'; render()" class="text-red-500 font-black">יציאה</button>
                <span class="text-lg font-black">זוגות: ${g.pairs} / ${g.cards.length / 2}</span>
            </div>
            <div class="grid grid-cols-4 gap-2 w-full">
                ${g.cards.map(c => `
                    <div onclick="flipM(${c.id})" class="relative aspect-square perspective-1000 cursor-pointer ${c.f || c.ok ? 'card-flipped' : ''}">
                        <div class="card-inner">
                            <div class="card-front bg-purple-600 text-white text-3xl font-black">?</div>
                            <div class="card-back bg-white border-2 ${c.ok?'border-green-400 bg-green-50':'border-purple-200'} text-black flex items-center justify-center p-1 text-center">
                                <span class="font-black text-xs">${c.t}</span>
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
        g.isProcessing = true; const [c1, c2] = g.flipped;
        if (c1.t === c2.m || c1.m === c2.t) {
            setTimeout(() => { c1.ok = c2.ok = true; g.pairs++; g.flipped = []; g.isProcessing = false; if (g.pairs >= g.cards.length / 2) triggerConfetti(); render(); }, 400);
        } else { setTimeout(() => { c1.f = c2.f = false; g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

function renderWinScreen(app) {
    app.innerHTML = `<div class="fixed inset-0 flex items-center justify-center bg-black/80 z-[300] p-4"><div class="bg-white p-10 rounded-[3rem] text-center shadow-2xl"><h2 class="text-4xl font-black text-blue-600 mb-6">כל הכבוד! 🎉</h2><button onclick="state.winner=null; state.screen='menu'; render()" class="bg-blue-600 text-white py-4 px-10 rounded-2xl text-2xl font-black">חזרה לתפריט</button></div></div>`;
}

function resetAllData() { if(confirm('למחוק הכל?')) { localStorage.clear(); location.reload(); } }

// מאזין לכפתור לילה - הגדרה מחדש בכל רינדור
document.addEventListener('click', (e) => {
    if (e.target.id === 'toggleNight') {
        state.nightMode = !state.nightMode;
        render();
    }
});

loadFromLocal();
render();
