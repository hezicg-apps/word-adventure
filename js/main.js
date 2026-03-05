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
        if (state.words.length > 0) state.screen = 'flashcards'; // כניסה ישירה לתרגול
    }
    if (savedInput) state.inputText = savedInput;
    if (savedListName) state.listName = savedListName;
}

function copyShareLink() {
    const baseUrl = window.location.origin + window.location.pathname;
    const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify({
        n: state.listName,
        w: state.words.map(w => `${w.eng}-${w.heb}`)
    })));
    const shareUrl = `${baseUrl}?data=${encodedData}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('הקישור הועתק! 🔗');
    });
}

// --- פונקציות עזר ---
function speak(text) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
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
        // כאן צריכות להיות הפונקציות של המשחקים ששלחת קודם
    }
}

function renderWelcome(app) {
    app.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 text-center animate-in fade-in">
            <div class="bg-white p-10 rounded-[3rem] shadow-2xl border-b-8 border-blue-100 max-w-sm w-full">
                <h2 class="text-4xl font-black text-blue-600 mb-4">היי! 👋</h2>
                <button onclick="state.screen='input'; render();" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-lg">בואו נתחיל!</button>
            </div>
        </div>`;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 animate-in slide-in-from-bottom">
            <input type="text" id="listName" value="${state.listName}" class="w-full p-4 rounded-2xl border-4 border-blue-50 text-center text-xl font-black" placeholder="שם היחידה">
            <textarea id="wordInput" class="w-full h-64 p-6 rounded-[2.5rem] border-4 border-blue-100 text-right text-xl font-bold" placeholder="Apple - תפוח">${state.inputText}</textarea>
            <button onclick="processInput()" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black">צור הרפתקה! ✨</button>
        </div>`;
}

function processInput() {
    const input = document.getElementById('wordInput').value;
    const name = document.getElementById('listName').value;
    const lines = input.split('\n').filter(l => l.includes('-'));
    if (lines.length < 2) return alert('נא להזין מילים בפורמט: מילה - תרגום');
    
    state.inputText = input;
    state.listName = name || 'אוצר המילים שלי';
    state.words = lines.map(l => {
        const p = l.split('-');
        return { eng: p[0].trim(), heb: p[1].trim(), known: false };
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
    const cur = unknown[0];
    app.innerHTML = `
        <div class="w-full max-w-md flex flex-col items-center space-y-8 animate-in zoom-in">
            <div class="flashcard w-full h-80" onclick="this.classList.toggle('flipped')">
                <div class="flashcard-inner">
                    <div class="flashcard-front bg-white rounded-[3rem] shadow-2xl flex flex-col items-center justify-center">
                        <div class="text-5xl font-black text-cyan-500 mb-4">${cur.eng}</div>
                        <button onclick="event.stopPropagation(); speak('${cur.eng}')" class="text-4xl">🔊</button>
                    </div>
                    <div class="flashcard-back bg-blue-600 text-white rounded-[3rem] flex items-center justify-center">
                        <div class="text-5xl font-bold">${cur.heb}</div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 w-full">
                <button onclick="markWordKnown('${cur.eng}', true)" class="py-5 bg-green-500 text-white rounded-3xl text-2xl font-black">יודע ✅</button>
                <button onclick="markWordKnown('${cur.eng}', false)" class="py-5 bg-orange-500 text-white rounded-3xl text-2xl font-black">עוד לא ⏳</button>
            </div>
        </div>`;
}

function markWordKnown(eng, known) {
    const idx = state.words.findIndex(w => w.eng === eng);
    if (known) state.words[idx].known = true;
    else {
        const item = state.words.splice(idx, 1)[0];
        state.words.push(item);
    }
    render();
}

function renderQuiz(app) {
    if (state.quizIndex >= state.words.length) {
        state.masteryScore = Math.round((state.correctAnswers / state.words.length) * 100);
        state.screen = 'menu';
        render();
        return;
    }
    const cur = state.words[state.quizIndex];
    let opts = [cur.heb, ...state.words.filter(w => w.heb !== cur.heb).map(w => w.heb).sort(() => 0.5 - Math.random()).slice(0, 3)].sort(() => 0.5 - Math.random());

    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 text-center">
            <div class="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-blue-400">
                <h2 class="text-xl font-bold text-gray-400 mb-4">אתגר המילים ${state.quizIndex + 1}/${state.words.length}</h2>
                <div class="text-4xl font-black text-cyan-500 mb-8">${cur.eng}</div>
                <div class="grid gap-4">
                    ${opts.map(opt => `<button onclick="handleAns('${opt}', '${cur.heb}')" class="py-4 border-2 border-blue-100 rounded-2xl text-xl font-bold">${opt}</button>`).join('')}
                </div>
            </div>
        </div>`;
}

function handleAns(sel, cor) {
    if (sel === cor) state.correctAnswers++;
    state.quizIndex++;
    render();
}

function renderMenu(app) {
    const lock = state.masteryScore < 70;
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6">
            <div class="bg-white dark-card p-8 rounded-[2.5rem] shadow-xl text-center">
                <h2 class="text-3xl font-black mb-1 unit-title-header">${state.listName}</h2>
                <p class="text-gray-600 font-bold mb-4">ציון האתגר: ${state.masteryScore}%</p>
                <div class="flex gap-4">
                    <button onclick="copyShareLink()" class="flex-1 py-3 bg-blue-50 text-blue-600 rounded-full font-bold">שתפו רשימה</button>
                    <button onclick="state.screen='quiz'; state.quizIndex=0; state.correctAnswers=0; render();" class="flex-1 py-3 bg-orange-600 text-white rounded-full font-bold">אתגר חוזר</button>
                </div>
            </div>
            <div class="flex flex-col gap-4">
                <button class="p-6 bg-[#a855f7] text-white rounded-[2rem] text-2xl font-black ${lock ? 'opacity-50' : ''}">משחק זיכרון</button>
                <button class="p-6 bg-[#3b82f6] text-white rounded-[2rem] text-2xl font-black ${lock ? 'opacity-50' : ''}">4 בשורה</button>
            </div>
        </div>`;
}

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    if (data) {
        try {
            const decoded = JSON.parse(decodeURIComponent(escape(atob(data))));
            state.listName = decoded.n;
            state.words = decoded.w.map(s => { const p = s.split('-'); return {eng: p[0], heb: p[1], known: false}; });
            state.screen = 'flashcards';
        } catch(e) {}
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
