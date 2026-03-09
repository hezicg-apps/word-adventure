let state = {
    screen: 'welcome', 
    inputText: '', 
    words: [],
    listName: 'אוצר המילים שלי',
    nightMode: false, 
    masteryScore: null, 
    quizIndex: 0, 
    cardIndex: 0,
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

// --- הזרקת CSS לכרטיסיות המסתובבות ---
const style = document.createElement('style');
style.innerHTML = `
    .flashcard-container { perspective: 1000px; width: 100%; height: 320px; cursor: pointer; position: relative; }
    .flashcard-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
    .flashcard-container.flipped .flashcard-inner { transform: rotateY(180deg); }
    .flashcard-front, .flashcard-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 2.5rem; }
    .flashcard-back { transform: rotateY(180deg); }
`;
document.head.appendChild(style);

// --- עזרים ---
function triggerConfetti() { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8; window.speechSynthesis.speak(u); }
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

function resetGameState() {
    state.quizIndex = 0;
    state.cardIndex = 0;
    state.correctAnswers = 0;
    state.masteryScore = null;
    state.quizOptions = null;
    state.quizFeedback = { index: -1, status: null, correctIndex: -1 };
    state.winner = null;
}

function saveToLocal() {
    localStorage.setItem('wm_words', JSON.stringify(state.words));
    localStorage.setItem('wm_input', state.inputText);
    localStorage.setItem('wm_mastery', state.masteryScore);
    localStorage.setItem('wm_listName', state.listName);
}

function loadFromLocal() {
    const params = new URLSearchParams(window.location.search);
    const encodedData = params.get('w');

    if (encodedData) {
        try {
            const decodedText = decodeURIComponent(escape(atob(encodedData)));
            const lines = decodedText.split('\n').filter(l => l.trim());
            
            if (lines.length > 0) {
                state.listName = lines[0].trim();
                const newWords = lines.slice(1).map((l, i) => {
                    const parts = l.split('-').map(p => p.trim());
                    return { id: Date.now() + i, eng: parts[0], heb: parts[1] || '', known: false };
                }).filter(w => w.heb);

                if (newWords.length > 0) {
                    state.words = newWords;
                    resetGameState();
                    state.screen = 'flashcards'; // מעבר ישיר לתרגול
                    saveToLocal();
                    render();
                    return;
                }
            }
        } catch (e) { console.error("Link decode error", e); }
    }

    const savedWords = localStorage.getItem('wm_words');
    if (savedWords) {
        state.words = JSON.parse(savedWords);
        state.listName = localStorage.getItem('wm_listName') || 'אוצר המילים שלי';
        state.inputText = localStorage.getItem('wm_input') || '';
        const savedScore = localStorage.getItem('wm_mastery');
        state.masteryScore = (savedScore === "null" || savedScore === null) ? null : parseFloat(savedScore);
    }
    render();
}

function processInput() {
    const lines = state.inputText.split('\n').filter(l => l.trim());
    if (lines.length === 0) return;

    const firstLine = lines[0].trim();
    if (firstLine.includes('Unit') || firstLine.includes('Part') || firstLine.length < 20) {
        state.listName = firstLine;
        lines.shift();
    }

    const newWords = lines.map((l, i) => {
        const parts = l.split('-').map(p => p.trim());
        return { id: Date.now() + i, eng: parts[0], heb: parts[1] || '', known: false };
    }).filter(w => w.heb);

    if (newWords.length > 0) {
        state.words = newWords;
        resetGameState();
        state.screen = 'flashcards';
        saveToLocal();
        render();
    }
}

function renderFlashcards(app) {
    if (!state.words || state.words.length === 0) {
        state.screen = 'welcome';
        setTimeout(() => render(), 0);
        return;
    }
    if (state.cardIndex >= state.words.length) state.cardIndex = 0;
    const cur = state.words[state.cardIndex];

    app.innerHTML = `
        <div class="text-center space-y-8 w-full max-w-sm px-4 mt-6 mx-auto animate-fade-in">
            ${renderHeader(state.listName)}
            
            <div class="flashcard-container" onclick="this.classList.toggle('flipped')">
                <div class="flashcard-inner shadow-2xl">
                    <div class="flashcard-front bg-white border-4 border-blue-400 p-10">
                        <span class="text-5xl font-black text-gray-800 eng-text">${cur.eng}</span>
                        <div class="mt-8 text-blue-300 text-sm font-bold animate-pulse">לחץ לתרגום 👆</div>
                    </div>
                    <div class="flashcard-back bg-blue-50 border-4 border-blue-600 p-10">
                        <span class="text-5xl font-black text-blue-700">${cur.heb}</span>
                        <button onclick="event.stopPropagation(); speak('${cur.eng.replace(/'/g, "\\'")}')" 
                                class="mt-6 text-4xl hover:scale-110 transition-transform">🔊</button>
                    </div>
                </div>
            </div>

            <div class="flex justify-between items-center gap-6 mt-12">
                <button onclick="changeCard(-1)" class="p-6 bg-gray-100 rounded-full shadow-md active:scale-90 transition-all">
                    <span class="text-3xl">⬅️</span>
                </button>
                <button onclick="toggleKnown()" 
                        class="flex-1 py-5 rounded-2xl text-xl font-black shadow-lg transition-all active:scale-95 ${cur.known ? 'bg-green-500 text-white' : 'bg-white text-gray-400 border-2 border-gray-100'}">
                    ${cur.known ? 'יודע! ✅' : 'עדיין לומד...'}
                </button>
                <button onclick="changeCard(1)" class="p-6 bg-gray-100 rounded-full shadow-md active:scale-90 transition-all">
                    <span class="text-3xl">➡️</span>
                </button>
            </div>
            <div class="flex flex-col gap-3">
                <button onclick="state.screen='quiz'; resetGameState(); render();" class="text-blue-600 font-black underline">עבור לבוחן מילים 📝</button>
                <button onclick="state.screen='menu'; render();" class="text-gray-400 font-bold underline text-sm">חזרה לתפריט</button>
            </div>
        </div>`;
}

function changeCard(step) {
    state.cardIndex = (state.cardIndex + step + state.words.length) % state.words.length;
    render();
}

function toggleKnown() {
    const cur = state.words[state.cardIndex];
    if (cur) {
        cur.known = !cur.known;
        saveToLocal();
        render();
    }
}

// ... שאר הפונקציות (renderQuiz, renderMenu וכו') נשארות כפי שהיו בקוד המקור שלך ...

function renderHeader(subtext) {
    return `
        <div class="mb-2">
            <h1 class="text-3xl font-black text-gray-800 tracking-tight">${state.listName}</h1>
            <p class="text-lg font-bold text-blue-600 mt-0">${state.screen === 'flashcards' ? 'כרטיסיות תרגול' : ''}</p>
        </div>`;
}

// פונקציית ה-Render הראשית המעודכנת
function render() {
    const app = document.getElementById('app');
    if (!app) return;
    if (state.winner) { renderWinScreen(app); return; }

    switch (state.screen) {
        case 'welcome': renderWelcome(app); break;
        case 'input': renderInput(app); break;
        case 'menu': renderMenu(app); break;
        case 'flashcards': renderFlashcards(app); break;
        case 'quiz': renderQuiz(app); break;
        case 'memory': renderMemory(app); break;
        case 'c4_menu': renderC4Menu(app); break;
        case 'connect4': renderConnect4(app); break;
        case 'wordquest': renderWordQuest(app); break;
    }
}

loadFromLocal();
