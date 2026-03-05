// ניהול מצב האפליקציה
let state = {
    screen: 'welcome',
    inputText: 'Apple - תפוח\nBanana - בננה\nCat - חתול\nDog - כלב',
    words: [],
    nightMode: false,
    score: 0,
    quiz: { idx: 0, correct: 0, options: [] },
    memory: { cards: [], flipped: [], pairs: 0, steps: 0, lock: false },
    c4: { board: Array(6).fill(0).map(() => Array(7).fill(0)), turn: 1, isAi: true, canDrop: false, q: null },
    wq: { target: '', hint: '', guesses: [], current: '' },
    winner: null
};

// פונקציות עזר
const speak = (t) => { 
    window.speechSynthesis.cancel(); 
    const u = new SpeechSynthesisUtterance(t); 
    u.lang = 'en-US'; 
    window.speechSynthesis.speak(u); 
};

const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

// רינדור ראשי
function render() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';

    if (state.winner) return renderWin(app);

    switch (state.screen) {
        case 'welcome': renderWelcome(app); break;
        case 'input': renderInput(app); break;
        case 'flashcards': renderFlash(app); break;
        case 'quiz': renderQuiz(app); break;
        case 'menu': renderMenu(app); break;
        case 'memory': renderMem(app); break;
        case 'connect4': renderC4(app); break;
        case 'wordquest': renderWQ(app); break;
    }
}

// --- מסכי האפליקציה ---

function renderWelcome(app) {
    app.innerHTML = `
        <div class="flex flex-col items-center justify-center mt-20 animate-pulse-soft">
            <div class="bg-white p-10 rounded-[3rem] shadow-2xl border-b-8 border-blue-100 text-center max-w-sm">
                <h2 class="text-4xl font-black text-blue-600 mb-4">מוכנים להרפתקה?</h2>
                <p class="text-xl font-bold text-gray-500 mb-8">בואו נלמד אנגלית בכיף</p>
                <button onclick="state.screen='input'; render()" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-lg hover:bg-blue-700 transition-all">בואו נתחיל!</button>
            </div>
        </div>`;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6">
            <h2 class="text-2xl font-black text-center text-blue-800">הזינו מילים (מילה - תרגום)</h2>
            <textarea id="wordInput" class="w-full h-64 p-6 rounded-[2.5rem] border-4 border-blue-100 text-right text-xl font-bold focus:border-blue-400 outline-none transition-all shadow-inner">${state.inputText}</textarea>
            <button onclick="processInput()" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-xl hover:scale-105 transition-transform">המשך לכרטיסיות 🌟</button>
        </div>`;
    document.getElementById('wordInput').addEventListener('input', (e) => state.inputText = e.target.value);
}

function processInput() {
    const lines = state.inputText.split('\n').filter(l => l.includes('-'));
    if (lines.length === 0) return alert('נא להזין מילים בפורמט: מילה - תרגום');
    state.words = lines.map(l => {
        const [eng, heb] = l.split('-').map(s => s.trim());
        return { eng, heb, known: false, id: Math.random() };
    });
    state.screen = 'flashcards';
    render();
}

function renderFlash(app) {
    const unknown = state.words.filter(w => !w.known);
    if (unknown.length === 0) {
        state.screen = 'quiz';
        state.quiz = { idx: 0, correct: 0 };
        render();
        return;
    }
    const cur = unknown[0];
    app.innerHTML = `
        <div class="flex flex-col items-center space-y-8 w-full">
            <h2 class="text-xl font-bold text-blue-500">כרטיסיית לימוד (${state.words.length - unknown.length}/${state.words.length})</h2>
            <div onclick="this.classList.toggle('card-flipped')" class="perspective w-full h-80 cursor-pointer">
                <div class="card-inner w-full h-full relative">
                    <div class="card-front bg-white flex flex-col items-center justify-center">
                        <span class="text-5xl font-black text-blue-600">${cur.eng}</span>
                        <button onclick="event.stopPropagation(); speak('${cur.eng}')" class="mt-6 text-4xl hover:scale-125 transition">🔊</button>
                    </div>
                    <div class="card-back flex items-center justify-center text-4xl font-bold">
                        ${cur.heb}
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 w-full">
                <button onclick="markKnown('${cur.id}')" class="py-5 bg-green-500 text-white rounded-3xl text-2xl font-black shadow-lg">יודע ✅</button>
                <button onclick="nextCard()" class="py-5 bg-orange-500 text-white rounded-3xl text-2xl font-black shadow-lg">עוד לא ⏳</button>
            </div>
        </div>`;
}

function markKnown(id) {
    const word = state.words.find(w => w.id == id);
    if (word) word.known = true;
    render();
}

function nextCard() {
    state.words.push(state.words.shift());
    render();
}

function renderQuiz(app) {
    if (state.quiz.idx >= state.words.length) {
        state.score = (state.quiz.correct / state.words.length) * 100;
        confetti();
        state.screen = 'menu';
        render();
        return;
    }
    const cur = state.words[state.quiz.idx];
    if (!state.quiz.options || state.quiz.options.length === 0) {
        let others = state.words.filter(w => w.id !== cur.id).map(w => w.heb);
        state.quiz.options = shuffle([cur.heb, ...shuffle(others).slice(0, 3)]);
    }

    app.innerHTML = `
        <div class="w-full max-w-md text-center space-y-6">
            <div class="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-blue-400">
                <h2 class="text-xl font-bold text-gray-400 mb-2">מבחן ידע ${state.quiz.idx + 1}/${state.words.length}</h2>
                <div class="text-4xl font-black text-blue-600 mb-8">${cur.eng}</div>
                <div class="grid gap-4">
                    ${state.quiz.options.map(opt => `
                        <button onclick="handleQuizAns('${opt}', '${cur.heb}')" class="py-4 border-2 border-blue-100 rounded-2xl text-xl font-bold hover:bg-blue-50 transition-colors">${opt}</button>
                    `).join('')}
                </div>
            </div>
        </div>`;
}

function handleQuizAns(selected, correct) {
    if (selected === correct) state.quiz.correct++;
    state.quiz.idx++;
    state.quiz.options = null;
    render();
}

function renderMenu(app) {
    const isLocked = state.score < 70;
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 animate-fade-in">
            <div class="bg-white p-8 rounded-[2.5rem] shadow-xl text-center">
                <h2 class="text-3xl font-black text-slate-800 mb-2">Magical Unit 1</h2>
                <p class="text-blue-500 font-bold mb-4">${isLocked ? 'המשיכו להתאמן כדי לפתוח משחקים!' : 'המשחקים פתוחים!'}</p>
                <div class="text-lg font-bold text-slate-600 mb-6">הציון הנוכחי: ${state.score.toFixed(0)}%</div>
                <div class="flex gap-4">
                    <button class="flex-1 py-3 bg-blue-50 text-blue-600 rounded-full font-bold border border-blue-100">🔗 שתפו רשימה</button>
                    <button onclick="state.screen='quiz'; state.quiz={idx:0, correct:0}; render()" class="flex-1 py-3 bg-orange-600 text-white rounded-full font-bold shadow-lg">🔄 תרגול חוזר</button>
                </div>
            </div>

            <div class="flex flex-col gap-4">
                <button onclick="${isLocked ? '' : 'startMemory()'}" class="py-6 bg-[#a855f7] text-white rounded-[2rem] text-2xl font-black shadow-xl flex items-center justify-center gap-3 ${isLocked ? 'opacity-50 grayscale' : 'hover:scale-105 transition'}">
                    🧠 משחק זיכרון
                </button>
                <button onclick="${isLocked ? '' : 'startC4()'}" class="py-6 bg-[#3b82f6] text-white rounded-[2rem] text-2xl font-black shadow-xl flex items-center justify-center gap-3 ${isLocked ? 'opacity-50 grayscale' : 'hover:scale-105 transition'}">
                    🟡 🔴 4 בשורה
                </button>
                <button onclick="${isLocked ? '' : 'startWQ()'}" class="py-6 bg-[#10b981] text-white rounded-[2rem] text-2xl font-black shadow-xl flex items-center justify-center gap-3 ${isLocked ? 'opacity-50 grayscale' : 'hover:scale-105 transition'}">
                    🔐 הקוד הסודי
                </button>
            </div>
            
            <button onclick="location.reload()" class="w-full text-red-500 font-bold underline mt-4">הזנת רשימה חדשה</button>
        </div>`;
}

// --- לוגיקת המשחקים (מימוש בסיסי יציב) ---

function startMemory() {
    state.screen = 'memory';
    let pool = [];
    state.words.slice(0, 8).forEach(w => {
        pool.push({ val: w.eng, pair: w.heb, type: 'eng', id: Math.random() });
        pool.push({ val: w.heb, pair: w.eng, type: 'heb', id: Math.random() });
    });
    state.memory.cards = shuffle(pool).map(c => ({ ...c, flipped: false, solved: false }));
    state.memory.flipped = [];
    state.memory.pairs = 0;
    state.memory.steps = 0;
    render();
}

function renderMem(app) {
    app.innerHTML = `
        <div class="w-full max-w-md">
            <div class="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm">
                <button onclick="state.screen='menu'; render()" class="text-red-500 font-bold">❌ יציאה</button>
                <div class="font-black text-blue-600 text-xl">צעדים: ${state.memory.steps}</div>
            </div>
            <div class="grid grid-cols-4 gap-3">
                ${state.memory.cards.map((card, idx) => `
                    <div onclick="flipCard(${idx})" class="aspect-square perspective cursor-pointer">
                        <div class="card-inner w-full h-full relative ${card.flipped || card.solved ? 'card-flipped' : ''}">
                            <div class="card-front bg-purple-600 rounded-xl shadow-lg flex items-center justify-center text-white text-3xl font-bold">?</div>
                            <div class="card-back bg-white rounded-xl shadow-lg border-2 ${card.solved ? 'border-green-400' : 'border-purple-200'} flex items-center justify-center p-1 text-center font-bold text-[10px] sm:text-sm">
                                ${card.val}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function flipCard(idx) {
    const m = state.memory;
    if (m.lock || m.cards[idx].flipped || m.cards[idx].solved) return;

    m.cards[idx].flipped = true;
    m.flipped.push(idx);
    render();

    if (m.flipped.length === 2) {
        m.steps++;
        m.lock = true;
        const [i1, i2] = m.flipped;
        if (m.cards[i1].val === m.cards[i2].pair) {
            if (m.cards[i1].type === 'eng') speak(m.cards[i1].val);
            else speak(m.cards[i2].val);
            
            setTimeout(() => {
                m.cards[i1].solved = true;
                m.cards[i2].solved = true;
                m.pairs++;
                m.flipped = [];
                m.lock = false;
                if (m.pairs === m.cards.length / 2) {
                    confetti();
                    state.winner = { msg: `כל הכבוד! סיימת ב-${m.steps} צעדים` };
                }
                render();
            }, 500);
        } else {
            setTimeout(() => {
                m.cards[i1].flipped = false;
                m.cards[i2].flipped = false;
                m.flipped = [];
                m.lock = false;
                render();
            }, 1000);
        }
    }
}

// 4 בשורה ו-WordQuest ימומשו בהמשך או שתוכל להוסיף אותם על בסיס זה
function startC4() { state.winner = {msg: "משחק 4 בשורה בטעינה..."}; render(); }
function startWQ() { state.winner = {msg: "משחק הקוד הסודי בטעינה..."}; render(); }

function renderWin(app) {
    app.innerHTML = `
        <div class="text-center space-y-8 mt-20">
            <h2 class="text-6xl font-black text-yellow-500 drop-shadow-lg">${state.winner.msg}</h2>
            <button onclick="state.winner=null; state.screen='menu'; render()" class="px-12 py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-2xl hover:scale-110 transition">חזרה לתפריט</button>
        </div>`;
}

function toggleNight() {
    state.nightMode = !state.nightMode;
    document.body.classList.toggle('night-mode', state.nightMode);
    document.getElementById('toggleNight').innerText = state.nightMode ? '🌙' : '☀️';
}

// הפעלה ראשונית
document.getElementById('toggleNight').addEventListener('click', toggleNight);
render();
