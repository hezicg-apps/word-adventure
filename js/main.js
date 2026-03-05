// --- הגדרת המצב של האפליקציה ---
let state = {
    screen: 'welcome', 
    inputText: '', 
    words: [],
    listName: 'אוצר המילים שלי',
    nightMode: false, 
    masteryScore: 0, 
    quizIndex: 0, 
    correctAnswers: 0,
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
        // תיקון: כניסה ישירה לתרגול אם יש מילים
        if (state.words.length > 0) state.screen = 'flashcards';
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
        alert('הקישור הועתק! 🔗'); // תיקון: טקסט מקוצר
    });
}

// --- פונקציות עזר ---
function speak(text) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    window.speechSynthesis.speak(msg);
}

// --- פונקציית הרינדור הראשית ---
function render() {
    const app = document.getElementById('app');
    if (!app) return; // הגנה מפני מסך לבן אם האלמנט לא נמצא
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
        default: renderWelcome(app);
    }
}

// --- מסכי האפליקציה ---

function renderWelcome(app) {
    app.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
            <div class="bg-white dark-card p-10 rounded-[3rem] shadow-2xl border-b-8 border-blue-100 max-w-sm w-full">
                <h2 class="text-4xl font-black text-blue-600 mb-4">היי! 👋</h2>
                <p class="text-xl font-bold text-gray-500 mb-8">מוכנים להרפתקה?</p>
                <button onclick="state.screen='input'; render();" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-lg hover:scale-105 transition">בואו נתחיל!</button>
            </div>
        </div>`;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 animate-fade-in">
            <input type="text" id="listName" value="${state.listName}" class="w-full p-4 rounded-2xl border-4 border-blue-50 text-center text-xl font-black focus:border-blue-400 outline-none" placeholder="שם היחידה">
            <textarea id="wordInput" class="w-full h-64 p-6 rounded-[2.5rem] border-4 border-blue-100 text-right text-xl font-bold focus:border-blue-400 outline-none transition" placeholder="Apple - תפוח\nBanana - בננה">${state.inputText}</textarea>
            <button onclick="processInput()" class="w-full py-5 bg-blue-600 text-white rounded-full text-2xl font-black shadow-xl">צור הרפתקה! ✨</button>
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
    const cur = unknown[0];
    app.innerHTML = `
        <div class="w-full max-w-md flex flex-col items-center space-y-8 animate-fade-in">
            <div class="text-xl font-bold text-blue-500">לומדים מילים: ${state.words.length - unknown.length + 1}/${state.words.length}</div>
            <div onclick="this.classList.toggle('card-flipped')" class="perspective-1000 w-full h-80 cursor-pointer">
                <div class="card-inner w-full h-full relative">
                    <div class="card-front bg-white flex flex-col items-center justify-center rounded-[3rem] shadow-2xl">
                        <div class="text-5xl font-black text-cyan-500 mb-4 eng-text">${cur.eng}</div>
                        <button onclick="event.stopPropagation(); speak('${cur.eng}')" class="text-4xl hover:scale-110 transition">🔊</button>
                    </div>
                    <div class="card-back bg-blue-600 text-white flex items-center justify-center rounded-[3rem] shadow-2xl">
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

function markWordKnown(eng, isKnown) {
    const idx = state.words.findIndex(w => w.eng === eng);
    if (isKnown) {
        state.words[idx].known = true;
    } else {
        // מעביר לסוף הרשימה
        const word = state.words.splice(idx, 1)[0];
        state.words.push(word);
    }
    render();
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
    let options = [cur.heb, ...state.words.filter(w => w.heb !== cur.heb).map(w => w.heb).sort(() => 0.5 - Math.random()).slice(0, 3)].sort(() => 0.5 - Math.random());

    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 animate-fade-in text-center">
            <div class="bg-white dark-card p-8 rounded-[3rem] shadow-xl border-4 border-blue-400">
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

function handleQuizAnswer(selected, correct) {
    if (selected === correct) state.correctAnswers++;
    state.quizIndex++;
    render();
}

function renderMenu(app) {
    const isLocked = state.masteryScore < 70;
    app.innerHTML = `
        <div class="w-full max-w-md space-y-6 animate-fade-in">
            <div class="bg-white dark-card p-8 rounded-[2.5rem] shadow-xl text-center relative overflow-hidden">
                <h2 class="text-3xl font-black mb-1 unit-title-header">${state.listName}</h2>
                <p class="text-blue-500 font-bold mb-4">${isLocked ? 'השלימו את האתגר לציון 70+ לפתיחת משחקים' : 'כל המשחקים פתוחים! 🎉'}</p>
                <div class="text-lg font-bold text-gray-600 mb-6">ציון האתגר: ${state.masteryScore}%</div>
                <div class="flex gap-4">
                    <button onclick="copyShareLink()" class="flex-1 py-3 bg-blue-50 text-blue-600 rounded-full font-bold">🔗 שתפו</button>
                    <button onclick="state.screen='quiz'; state.quizIndex=0; state.correctAnswers=0; render();" class="flex-1 py-3 bg-orange-600 text-white rounded-full font-bold shadow-lg">🔄 אתגר חוזר</button>
                </div>
            </div>

            <div class="flex flex-col gap-4">
                <button class="menu-btn p-6 bg-[#a855f7] text-white rounded-[2rem] text-2xl font-black ${isLocked ? 'opacity-50' : 'hover:scale-105'} transition">🧠 משחק זיכרון</button>
                <button class="menu-btn p-6 bg-[#3b82f6] text-white rounded-[2rem] text-2xl font-black ${isLocked ? 'opacity-50' : 'hover:scale-105'} transition">🔴 4 בשורה</button>
                <button class="menu-btn p-6 bg-[#10b981] text-white rounded-[2rem] text-2xl font-black ${isLocked ? 'opacity-50' : 'hover:scale-105'} transition">🔐 הקוד הסודי</button>
            </div>
            
            <button onclick="resetAllData()" class="w-full text-red-500 font-bold underline mt-6">מחיקת רשימה והזנה מחדש</button>
        </div>`;
}

function resetAllData() {
    if(confirm('למחוק הכל ולהתחיל מחדש?')) {
        localStorage.clear();
        location.reload();
    }
}

// --- אתחול האפליקציה ---
window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('data');
    if (sharedData) {
        try {
            const decoded = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
            state.listName = decoded.n;
            state.words = decoded.w.map(s => {
                const p = s.split('-');
                return { eng: p[0].trim(), heb: p[1].trim(), known: false };
            });
            state.screen = 'flashcards';
        } catch(e) { console.error("Error decoding shared data"); }
    } else {
        loadFromLocal();
    }
    render();
};

// כפתור מצב לילה
document.getElementById('toggleNight').onclick = () => {
    state.nightMode = !state.nightMode;
    document.body.classList.toggle('night-mode');
    document.getElementById('toggleNight').innerText = state.nightMode ? '🌙' : '☀️';
};
