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
    
    if (savedWords) state.words = JSON.parse(savedWords);
    if (savedInput) state.inputText = savedInput;
    if (savedListName) state.listName = savedListName;

    // תיקון 1: אם יש מילים טעונות, עבור ישר לתרגול
    if (state.words.length > 0 && state.screen === 'welcome') {
        state.screen = 'flashcards';
    }
}

function copyShareLink() {
    const baseUrl = window.location.origin + window.location.pathname;
    const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify({
        n: state.listName,
        w: state.words.map(w => `${w.eng}-${w.heb}`)
    })));
    const shareUrl = `${baseUrl}?data=${encodedData}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        // תיקון 3: טקסט העתקה מקוצר
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

// --- רינדור מסכים ---

function render() {
    const app = document.getElementById('app');
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

function renderWelcome(app) {
    app.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-700">
            <div class="bg-white p-10 rounded-[3rem] shadow-2xl border-b-8 border-blue-100 max-w-sm w-full">
                <h2 class="text-4xl font-black text-blue-600 mb-4">היי! 👋</h2>
                <p class="text-xl font-bold text-gray-500 mb-8">מוכנים להרפתקת אוצר מילים?</p>
                <button onclick="state.screen='input'; render();" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-lg hover:scale-105 transition">בואו נתחיל!</button>
            </div>
        </div>`;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 animate-in slide-in-from-bottom duration-500">
            <input type="text" id="listName" value="${state.listName}" class="w-full p-4 rounded-2xl border-4 border-blue-50 text-center text-xl font-black focus:border-blue-400 outline-none" placeholder="שם הרשימה (למשל: יחידה 1)">
            <textarea id="wordInput" class="w-full h-64 p-6 rounded-[2.5rem] border-4 border-blue-100 text-right text-xl font-bold focus:border-blue-400 outline-none transition" placeholder="הדביקו כאן מילים... למשל:\nApple - תפוח\nBanana - בננה">${state.inputText}</textarea>
            <button onclick="processInput()" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-xl hover:bg-blue-700">צור הרפתקה! ✨</button>
        </div>`;
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
        <div class="w-full max-w-md flex flex-col items-center space-y-8 animate-in zoom-in duration-300">
            <div class="text-xl font-bold text-blue-500">לומדים מילים: ${state.words.length - unknown.length + 1}/${state.words.length}</div>
            <div onclick="this.classList.toggle('flipped')" class="flashcard w-full h-80 cursor-pointer">
                <div class="flashcard-inner">
                    <div class="flashcard-front bg-white flex flex-col items-center justify-center rounded-[3rem] shadow-2xl border-2 border-blue-50">
                        <div class="text-5xl font-black text-cyan-500 mb-4 eng-text">${cur.eng}</div>
                        <button onclick="event.stopPropagation(); speak('${cur.eng}')" class="text-4xl hover:scale-110 transition">🔊</button>
                    </div>
                    <div class="flashcard-back bg-blue-600 text-white flex items-center justify-center rounded-[3rem] shadow-2xl">
                        <div class="text-5xl font-bold">${cur.heb}</div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 w-full">
                <button onclick="markWordKnown('${cur.eng}', true)" class="py-5 bg-green-500 text-white rounded-3xl text-2xl font-black shadow-lg">יודע ✅</button>
                <button onclick="markWordKnown('${cur.eng}', false)" class="py-5 bg-orange-500 text-white rounded-3xl text-2xl font-black shadow-lg">עוד לא ⏳</button>
            </div>
        </div>`;
}

function renderQuiz(app) {
    if (state.quizIndex >= state.words.length) {
        state.masteryScore = Math.round((state.correctAnswers / state.words.length) * 100);
        state.screen = 'menu';
        if (state.masteryScore >= 70) confetti();
        render();
        return;
    }
    const cur = state.words[state.quizIndex];
    let options = state.words.filter(w => w.eng !== cur.eng).map(w => w.heb);
    options = [cur.heb, ...options.sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);

    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 animate-in fade-in">
            <div class="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-blue-400 text-center">
                <h2 class="text-xl font-bold text-gray-400 mb-4">אתגר המילים ${state.quizIndex + 1}/${state.words.length}</h2>
                <div class="text-4xl font-black text-cyan-500 mb-8 eng-text">${cur.eng}</div>
                <div class="grid gap-4">
                    ${options.map(opt => `
                        <button onclick="handleQuizAnswer('${opt}', '${cur.heb}')" class="py-4 border-2 border-blue-100 rounded-2xl text-xl font-bold hover:bg-blue-50 transition">${opt}</button>
                    `).join('')}
                </div>
            </div>
        </div>`;
}

function renderMenu(app) {
    const isLocked = state.masteryScore < 70;
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 animate-in slide-in-from-bottom duration-500">
            <div class="bg-white dark-card p-8 rounded-[2.5rem] shadow-xl text-center relative overflow-hidden mb-6">
                <h2 class="text-3xl font-black mb-1 unit-title-header">${state.listName}</h2>
                <p class="text-blue-500 font-bold mb-4">${isLocked ? 'השלימו את האתגר כדי לפתוח משחקים' : 'כל המשחקים פתוחים! 🎉'}</p>
                <div class="text-lg font-bold text-gray-600 mb-6">ציון האתגר: ${state.masteryScore}%</div>
                <div class="flex gap-4">
                    <button onclick="copyShareLink()" class="flex-1 py-3 bg-blue-50 text-blue-600 rounded-full font-bold border border-blue-100">🔗 שתפו רשימה</button>
                    <button onclick="state.screen='quiz'; state.quizIndex=0; state.correctAnswers=0; render();" class="flex-1 py-3 bg-orange-600 text-white rounded-full font-bold shadow-lg">🔄 אתגר חוזר</button>
                </div>
            </div>

            <div class="flex flex-col gap-4">
                <button onclick="${isLocked ? '' : 'startMemory()'}" class="menu-card bg-[#a855f7] ${isLocked ? 'opacity-50 grayscale' : 'hover:scale-102 transition shadow-lg'}">
                    <div class="text-4xl mb-2">🧠</div>
                    <div class="text-2xl font-black text-white">משחק זיכרון</div>
                </button>
                <button onclick="${isLocked ? '' : 'startC4(true)'}" class="menu-card bg-[#3b82f6] ${isLocked ? 'opacity-50 grayscale' : 'hover:scale-102 transition shadow-lg'}">
                    <div class="text-4xl mb-2">🔴</div>
                    <div class="text-2xl font-black text-white">4 בשורה</div>
                </button>
                <button onclick="${isLocked ? '' : 'startWordQuest()'}" class="menu-card bg-[#10b981] ${isLocked ? 'opacity-50 grayscale' : 'hover:scale-102 transition shadow-lg'}">
                    <div class="text-4xl mb-2">🔐</div>
                    <div class="text-2xl font-black text-white">הקוד הסודי</div>
                </button>
            </div>
            
            <button onclick="resetAllData()" class="w-full text-red-500 font-bold underline mt-6">מחיקת רשימה והזנה מחדש</button>
        </div>`;
}

// --- לוגיקת עיבוד ונתונים ---

function processInput() {
    const input = document.getElementById('wordInput').value;
    const name = document.getElementById('listName').value;
    const lines = input.split('\n').filter(l => l.includes('-'));
    
    if (lines.length < 4) {
        alert('נא להזין לפחות 4 מילים כדי להתחיל');
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

function markWordKnown(eng, isKnown) {
    if (isKnown) {
        const word = state.words.find(w => w.eng === eng);
        if (word) word.known = true;
    } else {
        const word = state.words.shift();
        state.words.push(word);
    }
    render();
}

function handleQuizAnswer(selected, correct) {
    if (selected === correct) state.correctAnswers++;
    state.quizIndex++;
    render();
}

// (המשך פונקציות המשחקים נשאר זהה למה שהיה לך...)
// השמטתי כאן את לוגיקת המשחקים הארוכה (זיכרון, 4 בשורה) כדי לא להעמיס על ההודעה, 
// אבל בקובץ שלך פשוט תשאיר אותן כפי שהן.

// --- אתחול ---
window.onload = () => {
    // בדיקת נתוני שיתוף ב-URL
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('data');
    if (sharedData) {
        try {
            const decoded = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
            state.listName = decoded.n;
            state.words = decoded.w.map(s => {
                const p = s.split('-');
                return { eng: p[0], heb: p[1], known: false };
            });
            state.screen = 'flashcards';
        } catch(e) { console.error("Error decoding shared data"); }
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
