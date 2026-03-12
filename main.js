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
    wordQuest: { target: '', hint: '', guesses: [], currentGuess: '', maxAttempts: 5, isGameOver: false, keyStates: {}, showTutorial: true, roundIndex: 0, pool: [], completedCount: 0 },
    winner: null,
    showShareModal: false
};

function triggerConfetti() { if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u); }

function saveToLocal() { localStorage.setItem('wordGame_state', JSON.stringify({ words: state.words, listName: state.listName, masteryScore: state.masteryScore })); }
function loadFromLocal() { const saved = localStorage.getItem('wordGame_state'); if (saved) { const parsed = JSON.parse(saved); state.words = parsed.words || []; state.listName = parsed.listName || 'אוצר המילים שלי'; state.masteryScore = parsed.masteryScore || 0; } }

function render() {
    // עדכון מצב לילה
    document.body.classList.toggle('night-mode', state.nightMode);
    var toggleBtn = document.getElementById('toggleNight');
    if (toggleBtn) {
        toggleBtn.innerText = state.nightMode ? '🌙' : '☀️';
        toggleBtn.onclick = () => { state.nightMode = !state.nightMode; render(); };
    }

    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';

    // תיקון שקיפות רמקולים
    setTimeout(() => {
        document.querySelectorAll('button').forEach(btn => {
            if (btn.innerText.includes('🔊') || btn.innerHTML.includes('speak')) {
                btn.style.backgroundColor = 'transparent';
                btn.style.border = 'none';
                btn.style.boxShadow = 'none';
            }
        });
    }, 0);

    if (state.winner) { renderWinScreen(app); return; }

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
        <div class="welcome-card p-8 rounded-3xl shadow-2xl text-center max-w-sm mx-auto animate-fade-in mt-10">
            <h1 class="text-4xl font-black mb-6 text-blue-600">ברוכים הבאים!</h1>
            <button onclick="state.screen='input'; render();" class="bg-blue-600 text-white px-10 py-4 rounded-full text-xl font-bold hover:bg-blue-700 transition-all shadow-lg">התחל כאן</button>
        </div>
    `;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="p-6 max-w-lg mx-auto">
            <h2 class="text-2xl font-bold mb-4">הכנס רשימת מילים (אנגלית: עברית)</h2>
            <textarea id="wordInput" class="w-full h-40 p-4 border rounded-xl mb-4 text-right" placeholder="apple: תפוח\nbanana: בננה"></textarea>
            <button onclick="processWords()" class="w-full bg-green-500 text-white py-3 rounded-xl font-bold">שמור והמשך</button>
        </div>
    `;
}

function processWords() {
    const text = document.getElementById('wordInput').value;
    const lines = text.split('\n');
    state.words = lines.map(line => {
        const [eng, heb] = line.split(':').map(s => s.trim());
        if (eng && heb) return { eng, heb };
    }).filter(Boolean);
    if (state.words.length > 0) {
        saveToLocal();
        state.screen = 'menu';
        render();
    } else {
        alert('נא להכניס מילים בפורמט הנכון');
    }
}

function renderMenu(app) {
    app.innerHTML = `
        <div class="grid grid-cols-2 gap-4 p-6">
            <button onclick="state.screen='flashcards'; render();" class="bg-purple-500 text-white p-6 rounded-2xl font-bold shadow-md">כרטיסיות</button>
            <button onclick="state.screen='quiz'; render();" class="bg-yellow-500 text-white p-6 rounded-2xl font-bold shadow-md">בחן את עצמך</button>
            <button onclick="state.screen='memory'; render();" class="bg-red-500 text-white p-6 rounded-2xl font-bold shadow-md">משחק הזיכרון</button>
            <button onclick="state.screen='wordquest'; startWordQuest();" class="bg-blue-500 text-white p-6 rounded-2xl font-bold shadow-md">הקוד הסודי</button>
        </div>
        <div class="text-center mt-6">
            <button onclick="state.screen='input'; render();" class="text-gray-500 underline">ערוך מילים</button>
        </div>
    `;
}

// פונקציות נוספות למשחקים (מימוש בסיסי למניעת קריסה)
function renderFlashcards(app) { app.innerHTML = '<h2>Flashcards</h2><button onclick="state.screen=\'menu\';render()">Back</button>'; }
function renderQuiz(app) { app.innerHTML = '<h2>Quiz</h2><button onclick="state.screen=\'menu\';render()">Back</button>'; }
function renderMemory(app) { app.innerHTML = '<h2>Memory</h2><button onclick="state.screen=\'menu\';render()">Back</button>'; }
function renderConnect4(app) { app.innerHTML = '<h2>Connect4</h2><button onclick="state.screen=\'menu\';render()">Back</button>'; }
function renderWordQuest(app) { app.innerHTML = '<h2>Word Quest</h2><button onclick="state.screen=\'menu\';render()">Back</button>'; }
function startWordQuest() { state.screen = 'wordquest'; render(); }
function renderWinScreen(app) { app.innerHTML = '<h2>ניצחת!</h2><button onclick="state.winner=null;state.screen=\'menu\';render()">חזרה</button>'; }

loadFromLocal();
render();
