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
    winner: null,
    showShareModal: false
};

// --- עזרים ---
function triggerConfetti() { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u); }
function saveToLocal() { localStorage.setItem('wa_state_v2', JSON.stringify({ words: state.words, listName: state.listName, masteryScore: state.masteryScore })); }
function loadFromLocal() {
    const saved = localStorage.getItem('wa_state_v2');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.words && parsed.words.length > 0) {
            state.words = parsed.words;
            state.listName = parsed.listName || 'אוצר המילים שלי';
            state.masteryScore = parsed.masteryScore || 0;
            // אם יש מילים, דלג ישר לתפריט המשחקים
            state.screen = 'menu'; 
        }
    }
}

function resetAllData() { if (confirm('בטוח שרוצים למחוק הכל?')) { localStorage.removeItem('wa_state_v2'); location.reload(); } }

// --- ניהול מסכים ---
function render() {
    const app = document.getElementById('app');
    if (state.screen === 'welcome') renderWelcome(app);
    else if (state.screen === 'flashcards') renderFlashcards(app);
    else if (state.screen === 'quiz') renderQuiz();
    else if (state.screen === 'menu') renderMenu(app);
    else if (state.screen === 'memory') renderMemory(app);
    else if (state.screen === 'c4_menu') renderC4Menu(app);
    else if (state.screen === 'c4_game') renderC4Game(app);
    else if (state.screen === 'wordQuest') renderWordQuest(app);
}

function renderWelcome(app) {
    app.innerHTML = `
        <div class="max-w-xl mx-auto space-y-8 animate-fade-in text-center p-4">
            <h1 class="text-5xl font-black text-gray-800">Word Adventure</h1>
            <div class="bg-white p-8 rounded-[2.5rem] shadow-2xl border-4 border-blue-50 space-y-6">
                <input type="text" id="listNameInput" placeholder="שם הרשימה" class="w-full p-4 border-2 border-gray-100 rounded-2xl text-center font-bold outline-none focus:border-blue-400">
                <textarea id="wordInput" placeholder="apple - תפוח" class="w-full h-48 p-6 border-2 border-gray-100 rounded-[2rem] outline-none focus:border-blue-400 font-mono text-lg"></textarea>
                <button onclick="processWords()" class="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] text-2xl font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-all">מתחילים! ✨</button>
            </div>
        </div>`;
}

function processWords() {
    const text = document.getElementById('wordInput').value;
    const name = document.getElementById('listNameInput').value;
    if (!text.trim() || !text.includes('-')) return alert('נא להזין מילים בפורמט: מילה - תרגום');
    state.listName = name.trim() || 'אוצר המילים שלי';
    state.words = text.split('\n').filter(l => l.includes('-')).map(l => {
        const [en, he] = l.split('-').map(s => s.trim());
        return { en, he };
    });
    state.screen = 'flashcards';
    state.cardIndex = 0;
    saveToLocal();
    render();
}

function renderFlashcards(app) {
    const word = state.words[state.cardIndex || 0];
    const progress = (((state.cardIndex || 0) + 1) / state.words.length) * 100;
    app.innerHTML = `
        <div class="max-w-md mx-auto space-y-8 animate-fade-in text-center p-4">
            <div class="flex items-center gap-4">
                <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-blue-500" style="width: ${progress}%"></div></div>
                <span class="font-bold text-gray-400">${(state.cardIndex || 0) + 1}/${state.words.length}</span>
            </div>
            <div onclick="this.classList.toggle('flipped')" class="flashcard-container h-80 w-full cursor-pointer perspective-1000">
                <div class="flashcard-inner relative w-full h-full transition-transform duration-500 transform-style-3d">
                    <div class="flashcard-front absolute w-full h-full bg-white rounded-[3rem] shadow-xl border-4 border-blue-50 flex items-center justify-center backface-hidden"><span class="text-5xl font-black">${word.en}</span></div>
                    <div class="flashcard-back absolute w-full h-full bg-blue-600 rounded-[3rem] shadow-xl flex items-center justify-center backface-hidden rotate-y-180"><span class="text-5xl font-black text-white">${word.he}</span></div>
                </div>
            </div>
            <div class="flex gap-4">
                <button onclick="speak('${word.en}')" class="p-6 bg-gray-100 rounded-2xl text-2xl hover:bg-gray-200">🔊</button>
                <button onclick="state.cardIndex++; if(state.cardIndex >= state.words.length) { state.screen='quiz'; state.quizIndex=0; state.correctAnswers=0; state.quizList=[]; } render();" class="flex-1 py-5 bg-gray-800 text-white rounded-2xl text-xl font-bold shadow-xl active:scale-95 transition-all">המשך ⮕</button>
            </div>
        </div>`;
}

function renderQuiz() {
    const app = document.getElementById('app');
    if (!state.quizList || state.quizList.length === 0) {
        state.quizList = [...state.words].sort(() => Math.random() - 0.5);
        state.quizIndex = 0; state.correctAnswers = 0;
    }
    if (state.quizIndex >= state.quizList.length) {
        const score = Math.round((state.correctAnswers / state.quizList.length) * 100);
        state.masteryScore = score; saveToLocal();
        if (score >= 70) triggerConfetti();
        app.innerHTML = `
            <div class="max-w-md mx-auto bg-white min-h-[70vh] rounded-3xl shadow-2xl p-8 flex flex-col text-center border-4 border-blue-50">
                <div class="text-6xl mb-4">${score >= 70 ? '🏆' : '💪'}</div>
                <h2 class="text-3xl font-black text-gray-800 mb-2">סיימת! הציון: ${score}%</h2>
                <div id="reportSection" class="my-6 space-y-4 text-right" dir="rtl">
                    <input type="text" id="studentName" placeholder="שם מלא" class="w-full p-3 border-2 rounded-xl outline-none">
                    <input type="text" id="studentClass" placeholder="כיתה" class="w-full p-3 border-2 rounded-xl outline-none">
                    <button onclick="submitFinalReport(${score})" class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">שליחת דיווח 📤</button>
                </div>
                <button onclick="state.screen='menu'; render();" class="py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold">חזרה לתפריט 🏠</button>
            </div>`;
        return;
    }
    const currentWord = state.quizList[state.quizIndex];
    if (state.quizFeedback.index === -1 && (!state.quizOptions || state.quizOptions.length === 0)) {
        const distractors = state.words.filter(w => w.en !== currentWord.en).sort(() => Math.random() - 0.5).slice(0, 3);
        state.quizOptions = [currentWord, ...distractors].sort(() => Math.random() - 0.5);
    }
    app.innerHTML = `
        <div class="max-w-md mx-auto bg-white min-h-[80vh] rounded-3xl shadow-2xl p-6 flex flex-col border-4 border-blue-50">
            <h2 class="text-5xl font-black text-gray-800 text-center my-12">${currentWord.he}</h2>
            <div class="grid gap-4 w-full">
                ${state.quizOptions.map((opt, i) => {
                    let status = "border-gray-100 hover:border-blue-200";
                    if (state.quizFeedback.index !== -1) {
                        if (opt.en === currentWord.en) status = "bg-green-100 border-green-500 text-green-700";
                        else if (state.quizFeedback.index === i) status = "bg-red-100 border-red-500 text-red-700";
                        else status = "opacity-40";
                    }
                    return `<button onclick="checkQuizAnswer(${i})" ${state.quizFeedback.index !== -1 ? 'disabled' : ''} class="py-5 px-6 border-2 rounded-2xl font-bold text-xl transition-all ${status}">${opt.en.toLowerCase()}</button>`;
                }).join('')}
            </div>
            ${state.quizFeedback.index !== -1 ? `<button onclick="nextQuizStep()" class="mt-8 py-4 bg-gray-800 text-white rounded-2xl font-bold">המשך ⮕</button>` : ''}
        </div>`;
}

window.checkQuizAnswer = (idx) => {
    if (state.quizFeedback.index !== -1) return;
    const isCorrect = state.quizOptions[idx].en === state.quizList[state.quizIndex].en;
    state.quizFeedback = { index: idx, status: isCorrect ? 'correct' : 'wrong' };
    if (isCorrect) { state.correctAnswers++; speak(state.quizOptions[idx].en); }
    render();
};
window.nextQuizStep = () => { state.quizIndex++; state.quizFeedback = { index: -1, status: null }; state.quizOptions = []; render(); };

function renderMenu(app) {
    const isLocked = state.masteryScore < 70;
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-md mx-auto mt-6 animate-fade-in">
            <div class="w-full flex justify-between mb-2">
                <button onclick="window.location.href='https://hezicg-apps.github.io/wa-website/'" class="bg-white px-4 py-2 rounded-full border-2 text-xs font-black shadow-sm">🏠 בית</button>
                <button onclick="resetAllData()" class="bg-red-50 text-red-600 px-4 py-2 rounded-full border-2 border-red-100 text-xs font-black shadow-sm">🗑️ חדש</button>
            </div>
            <div class="bg-white p-6 rounded-[2rem] shadow-xl border-4 border-blue-100">
                <h1 class="text-3xl font-black text-gray-800 mb-2">${isLocked ? 'המבחן לא הושלם' : 'המשחקים פתוחים!'}</h1>
                <p class="text-xl font-bold text-gray-700 mb-4">הציון שלך: ${state.masteryScore}%</p>
                <button onclick="state.quizIndex=0; state.correctAnswers=0; state.screen='quiz'; render();" class="bg-orange-600 text-white px-6 py-2 rounded-full font-black text-sm">🔄 תרגול חוזר</button>
            </div>
            <div class="grid gap-4">
                <button onclick="${isLocked?'':'startMemory()'}" class="p-6 bg-purple-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50':''}">משחק זיכרון 🧠</button>
                <button onclick="${isLocked?'':'state.screen=\'c4_menu\'; render()'}" class="p-6 bg-blue-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50':''}">4 בשורה 🔴🟡</button>
            </div>
        </div>`;
}

function startMemory() {
    const gameWords = state.words.sort(() => Math.random() - 0.5).slice(0, 8);
    let cards = [];
    gameWords.forEach(w => {
        cards.push({ val: w.en, type: 'en', pairId: w.en });
        cards.push({ val: w.he, type: 'he', pairId: w.en });
    });
    state.memoryGame = { cards: cards.sort(() => Math.random() - 0.5), flipped: [], pairs: 0, steps: 0, isProcessing: false };
    state.screen = 'memory';
    render();
}

function renderMemory(app) {
    app.innerHTML = `
        <div class="w-full max-w-2xl mx-auto px-4 py-6 text-center">
            <div class="flex justify-between items-center mb-8">
                <button onclick="state.screen='menu'; render();" class="text-3xl">✕</button>
                <div class="font-bold bg-white p-3 rounded-xl border-2">זוגות: ${state.memoryGame.pairs}/${Math.min(8, state.words.length)}</div>
            </div>
            <div class="grid grid-cols-4 gap-3">
                ${state.memoryGame.cards.map((card, i) => {
                    const flipped = state.memoryGame.flipped.includes(i) || card.matched;
                    return `<div onclick="handleMemoryFlip(${i})" class="h-24 rounded-xl cursor-pointer transition-all duration-300 transform-style-3d ${flipped ? 'rotate-y-180' : ''}">
                        <div class="absolute inset-0 bg-purple-600 rounded-xl flex items-center justify-center text-white backface-hidden shadow-md font-black">?</div>
                        <div class="absolute inset-0 bg-white rounded-xl flex items-center justify-center border-2 border-purple-200 font-bold text-xs rotate-y-180 backface-hidden shadow-md p-1">${card.val}</div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
}

window.handleMemoryFlip = (i) => {
    const g = state.memoryGame;
    if (g.isProcessing || g.flipped.includes(i) || g.cards[i].matched) return;
    g.flipped.push(i);
    if (g.flipped.length === 2) {
        g.isProcessing = true;
        const [i1, i2] = g.flipped;
        if (g.cards[i1].pairId === g.cards[i2].pairId && g.cards[i1].type !== g.cards[i2].type) {
            g.cards[i1].matched = true; g.cards[i2].matched = true; g.pairs++; g.flipped = []; g.isProcessing = false;
            if (g.pairs === Math.min(8, state.words.length)) triggerConfetti();
        } else {
            setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1000);
        }
    }
    render();
};

window.submitFinalReport = (score) => {
    const name = document.getElementById('studentName').value;
    const sClass = document.getElementById('studentClass').value;
    if (!name || !sClass) return alert("נא למלא שם וכיתה");
    
    const scriptURL = 'YOUR_GOOGLE_SCRIPT_URL_HERE'; // כאן שמים את הלינק של גוגל
    const data = { name, class: sClass, unit: state.listName, score: score + "%", date: new Date().toLocaleString('he-IL') };
    
    fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) })
        .then(() => { document.getElementById('reportSection').innerHTML = '<div class="p-4 bg-green-100 text-green-700 rounded-xl font-bold text-center">הדיווח נשלח! ✅</div>'; });
};

loadFromLocal();
render();

