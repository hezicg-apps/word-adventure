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
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8; window.speechSynthesis.speak(u); }
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

function saveToLocal() {
    localStorage.setItem('wm_words', JSON.stringify(state.words));
    localStorage.setItem('wm_input', state.inputText);
    localStorage.setItem('wm_mastery', state.masteryScore);
    localStorage.setItem('wm_listName', state.listName);
}

function loadFromLocal() {
    const params = new URLSearchParams(window.location.search);
    let sharedData = params.get('w');
    if (sharedData) {
        try {
            sharedData = sharedData.replace(/-/g, '+').replace(/_/g, '/');
            const decoded = decodeURIComponent(escape(atob(sharedData)));
            if (decoded && decoded.includes('-')) {
                state.inputText = decoded;
                processInput(false); 
                state.masteryScore = 0; 
                state.screen = 'flashcards';
                window.history.replaceState({}, document.title, window.location.pathname);
                render();
                return;
            }
        } catch(e) { console.error("Link decode error", e); }
    }
    const savedWords = localStorage.getItem('wm_words');
    if (savedWords) {
        state.words = JSON.parse(savedWords);
        state.inputText = localStorage.getItem('wm_input') || '';
        state.masteryScore = parseFloat(localStorage.getItem('wm_mastery')) || 0;
        state.listName = localStorage.getItem('wm_listName') || 'אוצר המילים שלי';
        state.screen = state.masteryScore >= 70 ? 'menu' : 'flashcards';
    }
}

function getShareUrl() {
    if (!state.inputText || !state.inputText.includes('-')) return null;
    let encodedData = btoa(unescape(encodeURIComponent(state.inputText)));
    encodedData = encodedData.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${window.location.origin}${window.location.pathname}?w=${encodedData}`;
}

function shareVia(platform) {
    const url = getShareUrl();
    if (!url) return;
    
    const messageText = `הנה רשימת המילים שלי באנגלית:\n${state.listName}\n\n`;
    const encodedText = encodeURIComponent(messageText);
    const fullMessage = encodedText + url;
    
    switch(platform) {
        case 'whatsapp':
            window.open(`https://api.whatsapp.com/send?text=${fullMessage}`, '_blank');
            break;
        case 'gmail':
            window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(state.listName)}&body=${fullMessage}`, '_blank');
            break;
        case 'email':
            window.location.href = `mailto:?subject=${encodeURIComponent(state.listName)}&body=${fullMessage}`;
            break;
        case 'copy':
            navigator.clipboard.writeText(url).then(() => {
                const btn = document.getElementById('copyBtn');
                const originalContent = btn.innerHTML;
                btn.innerHTML = '✅ הקישור הועתק!';
                btn.classList.add('bg-green-100', 'text-green-700', 'border-green-300');
                setTimeout(() => {
                    btn.innerHTML = originalContent;
                    btn.classList.remove('bg-green-100', 'text-green-700', 'border-green-300');
                }, 2000);
            });
            break;
    }
}

function renderShareModal(app) {
    if (!state.showShareModal) return;
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-[500] px-4 animate-fade-in';
    modal.innerHTML = `
        <div class="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border-4 border-blue-400 relative">
            <button onclick="state.showShareModal=false; render();" class="absolute top-4 left-4 text-3xl text-gray-300 hover:text-gray-500 transition-colors">✕</button>
            <h3 class="text-3xl font-black text-blue-700 mb-2 text-center">איך לשתף?</h3>
            <p class="text-gray-600 font-bold text-center mb-6 text-sm">בחרו איך לשלוח את המילים:</p>
            
            <div class="grid gap-3">
                <button onclick="shareVia('whatsapp')" class="flex items-center gap-4 p-4 bg-white text-gray-800 border-2 border-[#25D366] rounded-2xl font-black shadow-sm active:scale-95 transition-transform text-lg">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" class="w-8 h-8" alt="WhatsApp">
                    <span>שלחו ב-WhatsApp</span>
                </button>
                
                <button onclick="shareVia('gmail')" class="flex items-center gap-4 p-4 bg-white text-gray-800 border-2 border-[#EA4335] rounded-2xl font-black shadow-sm active:scale-95 transition-transform text-lg">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" class="w-8 h-8" alt="Gmail">
                    <span>שלחו ב-Gmail</span>
                </button>

                <button onclick="shareVia('email')" class="flex items-center gap-4 p-4 bg-white text-gray-800 border-2 border-blue-400 rounded-2xl font-black shadow-sm active:scale-95 transition-transform text-lg">
                    <span class="text-3xl">✉️</span>
                    <span>שלחו בדוא"ל אחר</span>
                </button>
                
                <button id="copyBtn" onclick="shareVia('copy')" class="flex items-center gap-4 p-4 bg-blue-50 text-blue-700 border-2 border-blue-200 rounded-2xl font-black shadow-sm active:scale-95 transition-transform text-lg mt-2">
                    <span class="text-2xl">📋</span>
                    <span>העתיקו קישור</span>
                </button>
            </div>
        </div>
    `;
    app.appendChild(modal);
}

function resetAllData() { 
    if(confirm("בטוח שרוצים למחוק הכל ולהזין רשימה חדשה?")) {
        localStorage.clear();
        state.inputText = ''; state.words = []; state.masteryScore = 0; state.listName = 'אוצר המילים שלי';
        state.screen = 'input'; render(); 
    }
}

function render() {
    document.body.classList.toggle('night-mode', state.nightMode);
    const toggleBtn = document.getElementById('toggleNight');
    if (toggleBtn) toggleBtn.innerText = state.nightMode ? '🌙' : '☀️';
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

    if (state.showShareModal) renderShareModal(app);
}

function renderHeader(subtext) {
    return `
        <div class="mb-4">
            <h1 class="text-3xl font-black text-gray-800 tracking-tight">${state.listName}</h1>
            ${subtext ? `<p class="text-lg font-bold text-blue-600 mt-1">${subtext}</p>` : ''}
        </div>`;
}

function renderWelcome(app) {
    const isDark = state.nightMode;
    const cardClass = isDark ? 'bg-transparent border-gray-700 shadow-none' : 'bg-white border-blue-400 shadow-xl';
    const titleColor = isDark ? 'text-yellow-500' : 'text-blue-600';
    const stepBoxBase = isDark ? 'bg-transparent border-gray-700' : 'p-4 rounded-2xl border-r-8 shadow-sm';

    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-md animate-fade-in mt-6">
            <div class="${cardClass} p-6 rounded-[2.5rem] border-4 welcome-card">
                <p class="text-4xl font-black ${titleColor} mb-6 border-b-2 pb-4">ברוכים הבאים! 👋</p>
                <div class="space-y-4 text-right font-bold">
                    <div class="${stepBoxBase} ${isDark ? '' : 'bg-blue-50 border-blue-500'}">
                        <p class="text-xl font-black ${isDark ? 'text-yellow-500' : 'text-blue-900'} mb-1">📝 שלב 1: הזנה</p>
                        <p class="text-lg ${isDark ? 'text-yellow-400/90' : 'text-gray-800'}">מדביקים רשימת מילים.</p>
                    </div>
                    <div class="${stepBoxBase} ${isDark ? '' : 'bg-green-50 border-green-500'}">
                        <p class="text-xl font-black ${isDark ? 'text-yellow-500' : 'text-green-900'} mb-1">🎴 שלב 2: תרגול</p>
                        <p class="text-lg ${isDark ? 'text-yellow-400/90' : 'text-gray-800'}">לומדים ובודקים ידע.</p>
                    </div>
                    <div class="${stepBoxBase} ${isDark ? '' : 'bg-purple-50 border-purple-500'}">
                        <p class="text-xl font-black ${isDark ? 'text-yellow-500' : 'text-purple-900'} mb-1">🎮 שלב 3: משחקים</p>
                        <p class="text-lg ${isDark ? 'text-yellow-400/90' : 'text-gray-800'}">משחקים באנגלית!</p>
                    </div>
                </div>
            </div>
            <button onclick="state.screen='input'; render()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg active:scale-95 transition-transform">בואו נתחיל!</button>
        </div>`;
}

function renderInput(app) {
    app.innerHTML = `
        <div class="text-center space-y-4 w-full px-2 mt-4 animate-fade-in">
            <p class="text-2xl font-black text-blue-600">הזינו מילים (מילה - תרגום)</p>
            <textarea id="wordInput" class="w-full h-64 p-6 rounded-[2rem] border-4 border-blue-200 outline-none text-right text-black bg-white shadow-inner text-xl font-bold focus:border-blue-400" placeholder="כותרת הרשימה\napple - תפוח\nbanana - בננה">${state.inputText}</textarea>
            <button onclick="processInput(true)" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg active:scale-95 transition-transform">המשך לכרטיסיות 🌟</button>
        </div>`;
    const area = document.getElementById('wordInput'); area.oninput = (e) => state.inputText = e.target.value; area.focus();
}

function processInput(shouldRender = true) {
    const lines = state.inputText.split('\n').filter(l => l.includes('-'));
    if (lines.length === 0) return;
    const firstLine = state.inputText.split('\n')[0];
    state.listName = firstLine.includes('-') ? 'אוצר המילים שלי' : firstLine;
    state.words = lines.map(l => {
        const parts = l.split('-');
        return { eng: parts[0].trim(), heb: parts.slice(1).join('-').trim(), known: false, id: crypto.randomUUID() };
    });
    if (state.words.length < 2) return;
    saveToLocal();
    if (shouldRender) { state.screen = 'flashcards'; render(); }
}

function renderFlashcards(app) {
    const unknown = state.words.filter(w => !w.known);
    if (unknown.length === 0) { state.quizIndex = 0; state.correctAnswers = 0; state.screen = 'quiz'; render(); return; }
    const cur = unknown[0];
    const tutorialColor = state.nightMode ? 'bg-white text-black' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    app.innerHTML = `
        <div class="text-center space-y-4 w-full max-sm px-2 mt-4 relative">
            ${renderHeader(`לימוד מילים (${state.words.filter(w=>w.known).length}/${state.words.length})`)}
            <div class="${tutorialColor} py-2 px-6 rounded-full inline-flex items-center gap-2 font-black border mb-2 shadow-sm transition-colors">
                <span>לחצו על הכרטיסייה לסיבוב</span>
                <span class="text-xl">🔄</span>
            </div>
            <div onclick="this.classList.toggle('card-flipped')" class="relative w-full h-80 perspective-1000 cursor-pointer mt-2">
                <div class="card-inner">
                    <div class="card-front bg-white border-4 border-blue-200 flex-col"><span class="text-5xl font-black text-blue-600 eng-text mb-6">${cur.eng}</span><button onclick="event.stopPropagation(); speak('${cur.eng}')" class="text-5xl bg-transparent border-none p-0 cursor-pointer">🔊</button></div>
                    <div class="card-back bg-blue-600 border-4 border-blue-700 text-white"><span class="text-4xl font-black px-4 text-center">${cur.heb}</span></div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                 <button onclick="state.words.find(w=>w.id === '${cur.id}').known=true; render()" class="bg-green-600 text-white py-5 rounded-2xl font-black text-2xl shadow-md active:scale-95 transition-transform">יודע ✅</button>
                 <button onclick="state.words = shuffle(state.words); render()" class="bg-orange-600 text-white py-5 rounded-2xl font-black text-2xl shadow-md active:scale-95 transition-transform">עוד לא ⏳</button>
            </div>
        </div>`;
}

function renderQuiz(app) {
    if (state.quizIndex >= state.words.length) {
        const finalScore = Math.round((state.correctAnswers / state.words.length) * 100);
        state.masteryScore = finalScore;
        saveToLocal();
        triggerConfetti();

        app.innerHTML = `
            <div class="text-center space-y-8 w-full max-w-sm px-4 mx-auto mt-10 animate-fade-in">
                <div class="bg-white border-4 border-yellow-400 rounded-[3rem] p-10 shadow-2xl relative">
                    <h2 class="text-3xl font-black text-gray-800 mb-2">כל הכבוד! ✨</h2>
                    <p class="text-lg text-gray-500 font-bold mb-6">${state.listName}</p>
                    <div class="text-7xl font-black text-yellow-400 mb-4">${finalScore}%</div>
                    <p class="text-xl font-bold text-gray-700">ענית נכון על ${state.correctAnswers} מתוך ${state.words.length}</p>
                </div>

                <div id="reportSection" class="bg-blue-50 p-6 rounded-[2rem] border-2 border-blue-200 space-y-4 shadow-inner text-right" dir="rtl">
                    <p class="font-bold text-blue-800 text-center">דיווח למורה:</p>
                    <input type="text" id="studentName" placeholder="שם מלא" 
                        class="w-full p-4 rounded-xl border-2 border-white text-center font-bold outline-none focus:border-blue-400 shadow-sm">
                    
                    <select id="studentClass" class="w-full p-4 rounded-xl border-2 border-white text-center font-bold outline-none focus:border-blue-400 bg-white shadow-sm">
                        <option value="">בחר כיתה...</option>
                        <option value="ג'1">ג'1</option><option value="ד'1">ד'1</option>
                        <option value="ה'1">ה'1</option><option value="ה'2">ה'2</option>
                        <option value="ו'1">ו'1</option><option value="ו'2">ו'2</option>
                    </select>

                    <button id="sendBtn" class="w-full py-4 bg-green-500 text-white rounded-xl font-black shadow-md hover:bg-green-600 transition-all text-xl">שלח תוצאה ✅</button>
                </div>

                <div class="grid gap-4 pb-10">
                    <button onclick="state.quizIndex=0; state.correctAnswers=0; state.masteryScore=0; render();" 
                        class="py-5 bg-blue-600 text-white rounded-2xl text-xl font-black shadow-lg">תרגול חוזר 🔄</button>
                    <button onclick="state.screen='menu'; render();" 
                        class="py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold">חזרה לתפריט 🏠</button>
                </div>
            </div>`;

        document.getElementById('sendBtn').onclick = function() {
            const name = document.getElementById('studentName').value;
            const sClass = document.getElementById('studentClass').value;
            if (!name || !sClass) { alert("נא למלא שם ולבחור כיתה"); return; }
            this.innerText = "מעבד... ✨";
            this.disabled = true;

            const iframe = document.createElement('iframe');
            iframe.name = 'hidden_iframe';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            const form = document.createElement('form');
            form.action = "https://docs.google.com/forms/d/e/1FAIpQLSe5yaCbYBN4wTU0VCw9TXi3nawnT4fg_fhtVl4Uw0jD2X_T3g/formResponse";
            form.method = "POST";
            form.target = "hidden_iframe";

            const fields = {
                'entry.627334846': name,
                'entry.737005448': sClass,
                'entry.803256071': state.listName,
                'entry.1607469246': finalScore
            };

            for (let key in fields) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = fields[key];
                form.appendChild(input);
            }
            document.body.appendChild(form);
            form.submit();

            // --- כאן התיקון הקריטי: הזרקת כפתור ההמשך למשחקים ---
            setTimeout(() => {
                document.getElementById('reportSection').innerHTML = `
                    <div class="space-y-4 animate-fade-in text-center">
                        <div class="p-4 bg-green-100 text-green-700 rounded-xl font-bold border-2 border-green-200">
                            הדיווח נשלח בהצלחה למורה 🕊️
                        </div>
                        <button onclick="state.screen='menu'; render();" 
                            class="w-full py-5 bg-blue-600 text-white rounded-2xl text-2xl font-black shadow-xl hover:bg-blue-700 active:scale-95 transition-all">
                            המשך למשחקים 🎮 ⮕
                        </button>
                    </div>`;
                if (form.parentNode) document.body.removeChild(form);
            }, 1000);
        };
        return;
    }

    const cur = state.words[state.quizIndex];
    if (!state.quizOptions) {
        state.quizOptions = shuffle([cur.heb, ...shuffle(state.words.filter(x => x.id !== cur.id).map(x => x.heb)).slice(0, 3)]);
    }
    
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-sm px-2 mt-4 mx-auto animate-fade-in min-h-[450px]">
            ${renderHeader(`אתגר: ${state.quizIndex + 1}/${state.words.length}`)}
            <div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400 shadow-xl relative">
                <div class="text-4xl font-black mb-8 eng-text flex items-center justify-center gap-4 text-gray-800">
                    ${cur.eng}
                    <button onclick="speak('${cur.eng.replace(/'/g, "\\'")}')" class="text-3xl bg-transparent border-none p-0 cursor-pointer">🔊</button>
                </div>
                <div class="grid gap-4">
                    ${state.quizOptions.map((o, idx) => {
                        return `<button 
                            onclick="handleQuizAns('${o.replace(/'/g, "\\'")}', '${cur.heb.replace(/'/g, "\\'")}', ${idx})" 
                            class="quiz-option-btn py-4 border-2 rounded-2xl font-black text-2xl transition-all text-gray-800 border-gray-200 active:scale-95">
                            ${o}
                        </button>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
}

function handleQuizAns(selected, correct, idx) {
    if (state.quizFeedback.status) return; // מונע לחיצות נוספות בזמן ההשהיה

    // מוצאים את כל הכפתורים של התשובות
    const buttons = document.querySelectorAll('.quiz-option-btn');
    const isCorrect = selected === correct;
    
    state.quizFeedback = {
        status: isCorrect ? 'correct' : 'wrong',
        index: idx,
        correctIndex: state.quizOptions.indexOf(correct)
    };

    if (isCorrect) state.correctAnswers++;

    // צביעה מיידית של הכפתורים ללא ריצוד
    buttons.forEach((btn, i) => {
        btn.style.transition = "all 0.2s ease"; // אנימציה חלקה לצבע
        
        if (i === state.quizFeedback.correctIndex) {
            // צובע את התשובה הנכונה בירוק
            btn.style.backgroundColor = "#dcfce7"; // bg-green-100
            btn.style.borderColor = "#22c55e";     // border-green-500
            btn.style.color = "#166534";           // text-green-800
        } else if (i === idx && !isCorrect) {
            // אם השחקן טעה - צובע את הבחירה שלו באדום
            btn.style.backgroundColor = "#fee2e2"; // bg-red-100
            btn.style.borderColor = "#ef4444";     // border-red-500
            btn.style.color = "#991b1b";           // text-red-800
        }
    });

    // השהייה של 1.2 שניות כדי שהשחקן יראה את הטעות/הצלחה
    setTimeout(() => {
        state.quizIndex++;
        state.quizOptions = null;
        state.quizFeedback = { status: null, index: null, correctIndex: null };
        render(); // רק עכשיו עוברים לשאלה הבאה
    }, 1200);
}

function renderMenu(app) {
    const isLocked = state.masteryScore < 70;
    const shareBtnStyle = state.nightMode ? 'bg-white text-black border-gray-200' : 'bg-blue-50 text-blue-700 border-blue-200';

    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-md px-2 mt-6 animate-fade-in">
            <div class="w-full flex justify-between items-center mb-2 px-1">
                <button onclick="window.location.href='https://hezicg-apps.github.io/wa-website/'" 
                    class="bg-white text-gray-700 px-4 py-2 rounded-full font-black text-xs border-2 border-gray-200 shadow-sm flex items-center gap-2 active:scale-95">
                    <span>🏠</span> בית
                </button>
                <button onclick="resetAllData()" 
                    class="bg-red-50 text-red-600 px-4 py-2 rounded-full font-black text-xs border-2 border-red-100 shadow-sm active:scale-95">
                    🗑️ רשימה חדשה
                </button>
            </div>

            <div class="bg-white p-6 rounded-[2rem] shadow-xl border-4 border-blue-100 welcome-card">
                ${renderHeader(isLocked ? 'צריך 70% כדי לפתוח משחקים' : 'המשחקים פתוחים!')}
                <p class="text-xl font-bold text-gray-700 mb-4">הציון הנוכחי: ${state.masteryScore.toFixed(0)}%</p>
                <div class="flex gap-2 justify-center">
                    <button onclick="state.quizIndex = 0; state.correctAnswers = 0; state.screen = 'quiz'; render();" class="bg-orange-600 text-white px-6 py-2 rounded-full font-black shadow-md text-sm">🔄 תרגול חוזר</button>
                    <button onclick="state.showShareModal=true; render();" class="${shareBtnStyle} border px-6 py-2 rounded-full font-black shadow-sm text-sm flex items-center gap-2">🔗 שיתוף</button>
                </div>
            </div>
            <div class="grid gap-4">
                <button onclick="${isLocked?'':'startMemory()'}" class="p-6 bg-purple-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50':''}">משחק זיכרון 🧠</button>
                <button onclick="${isLocked?'':'state.screen=\'c4_menu\'; render()'}" class="p-6 bg-blue-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50':''}">4 בשורה 🔴🟡</button>
                <button onclick="${isLocked?'':'startWordQuest()'}" class="p-6 bg-emerald-600 text-white rounded-[2rem] text-2xl font-black shadow-lg ${isLocked?'opacity-50':''}">הקוד הסודי 🔐</button>
            </div>
        </div>`;
}

// --- משחקים ---
function startMemory() {
    state.screen = 'memory'; state.winner = null;
    const pairsCount = Math.min(state.words.length, 8);
    const cards = [];
    state.words.slice(0, pairsCount).forEach(w => { cards.push({ t: w.eng, m: w.heb, isEng: true, voice: w.eng }, { t: w.heb, m: w.eng, isEng: false, voice: w.eng }); });
    state.memoryGame = { cards: shuffle(cards).map((c, i) => ({ ...c, id: i, f: false, ok: false })), flipped: [], pairs: 0, steps: 0, isProcessing: false };
    render();
}

function renderMemory(app) {
    const g = state.memoryGame;
    app.innerHTML = `
        <div class="flex flex-col items-center w-full max-w-sm px-2 mt-4">
            <div class="flex justify-between items-center w-full mb-4 bg-white p-4 rounded-2xl shadow-md welcome-card">
                <button onclick="state.screen='menu'; render()" class="text-red-600 font-black px-4 py-1 rounded-full border border-red-100 bg-red-50 text-sm">יציאה</button>
                <span class="text-lg font-black text-gray-800">צעדים: ${g.steps} | זוגות: ${g.pairs}</span>
            </div>
            <div class="grid grid-cols-4 gap-2 w-full">
                ${g.cards.map(c => `
                    <div onclick="flipM(${c.id})" class="relative aspect-square perspective-1000 cursor-pointer ${c.f || c.ok ? 'card-flipped' : ''}">
                        <div class="card-inner">
                            <div class="card-front bg-purple-700 text-white text-3xl font-black">?</div>
                            <div class="card-back bg-white border-2 ${c.ok?'border-green-500 bg-green-50':'border-purple-300'}">
                                <div class="font-black text-[10px] sm:text-xs text-center leading-tight text-gray-800 ${c.isEng ? 'eng-text' : ''}">${c.t}</div>
                            </div>
                        </div>
                    </div>`).join('')}
            </div>
        </div>`;
}

function flipM(id) {
    const g = state.memoryGame; if (g.isProcessing || state.winner) return;
    const card = g.cards.find(x => x.id === id); if (card.f || card.ok) return;
    card.f = true; g.flipped.push(card); g.steps++; render();
    if (g.flipped.length === 2) {
        g.isProcessing = true; const [c1, c2] = g.flipped;
        if (c1.t === c2.m || c1.m === c2.t) {
            setTimeout(() => { c1.ok = c2.ok = true; g.pairs++; g.flipped = []; g.isProcessing = false;
                if (g.pairs >= g.cards.length / 2) { triggerConfetti(); state.winner = { type: 'memory', msg: 'מעולה!', subMsg: `סיימת ב-${g.steps} צעדים.`, glowClass: 'win-glow-purple' }; }
                render(); speak(c1.isEng ? c1.t : c2.t);
            }, 400);
        } else { setTimeout(() => { c1.f = c2.f = false; g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

function renderC4Menu(app) {
    app.innerHTML = `
        <div class="text-center space-y-6 w-full max-w-sm px-2 mt-8 animate-fade-in">
            <div class="bg-white p-8 rounded-[2.5rem] border-4 border-blue-400 shadow-xl welcome-card">
                <h2 class="text-3xl font-black text-blue-600 mb-6">4 בשורה 🔴🟡</h2>
                <div class="grid gap-4">
                    <button onclick="startC4(true)" class="p-6 bg-blue-700 text-white rounded-2xl shadow-lg flex flex-col items-center justify-center">
                        <span class="text-xl font-black">משחק זוגי</span>
                    </button>
                    <button onclick="startC4(false)" class="p-6 bg-orange-700 text-white rounded-2xl text-xl font-black shadow-lg flex items-center justify-center">
                        <span>נגד המחשב</span>
                    </button>
                </div>
                <button onclick="state.screen='menu'; render()" class="mt-8 text-gray-500 font-bold underline">חזרה לתפריט</button>
            </div>
        </div>`;
}

function startC4(isPvP) {
    state.screen = 'connect4'; state.winner = null;
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: genC4Q(), canDrop: false, isAnswering: false, showQuestionPrompt: true, fallingToken: null, isAiTurn: false, isPvP: isPvP, feedback: { status: null, selectedIdx: -1 } };
    render();
}

function genC4Q() {
    const w = state.words[Math.floor(Math.random()*state.words.length)];
    const opts = shuffle([w.heb, ...shuffle(state.words.filter(x=>x.id!==w.id).map(x=>x.heb)).slice(0,3)]);
    return { prompt: w.eng, correct: w.heb, eng: w.eng, opts };
}

function renderConnect4(app) {
    const c = state.connect4;
    app.innerHTML = `
        <div class="flex flex-col items-center w-full px-2 mt-4">
            <div class="w-full flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-md max-w-sm welcome-card">
                <button onclick="state.screen='menu'; render()" class="text-red-600 font-black px-4 py-1 rounded-full border border-red-100 bg-red-50 text-sm">יציאה</button>
                <div class="font-black text-lg text-gray-800">תור: ${c.turn===1?'אדום 🔴':'צהוב 🟡'}</div>
            </div>
            <div class="h-16 mb-2">
                ${c.showQuestionPrompt && !c.isAiTurn ? `<button onclick="state.connect4.showQuestionPrompt=false;state.connect4.isAnswering=true;render();" class="bg-blue-600 text-white px-8 py-3 rounded-full text-xl font-black shadow-lg">שאלה לאסימון</button>` : `<div class="text-blue-700 font-black text-2xl animate-pulse">${c.isAiTurn ? 'המחשב חושב...' : 'בחר עמודה 👇'}</div>`}
            </div>
            <div class="c4-container">
                <div class="arrows-row">${[0,1,2,3,4,5,6].map(i => `<button onclick="dropC4(${i})" class="flex flex-col items-center ${!c.canDrop || c.board[0][i] || c.isAiTurn ? 'opacity-20 pointer-events-none' : 'text-white'}"><span class="text-lg font-black">${i+1}</span><div class="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-white mt-1"></div></button>`).join('')}</div>
                <div class="c4-board">${c.board.map((row, r) => row.map((cell, col) => `<div class="c4-slot">${cell ? `<div class="token-fixed ${cell===1?'token-red':'token-yellow'}"></div>` : ''}${c.fallingToken && c.fallingToken.row === r && c.fallingToken.col === col ? `<div class="token-fixed ${c.fallingToken.color === 1 ? 'token-red' : 'token-yellow'}"></div>` : ''}</div>`).join('')).join('')}</div>
            </div>
            ${c.isAnswering ? `<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] px-4"><div class="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center welcome-card"><h3 class="text-4xl font-black mb-8 text-blue-700 eng-text flex items-center justify-center gap-4">${c.q.prompt}<button onclick="speak('${c.q.eng}')" class="text-3xl bg-transparent border-none p-0 cursor-pointer">🔊</button></h3><div class="grid gap-4">${c.q.opts.map((o, idx) => { let sClass = ''; if (c.feedback.status) { if (o === c.q.correct) sClass = 'correct-ans'; else if (idx === c.feedback.selectedIdx && c.feedback.status === 'wrong') sClass = 'wrong-ans'; } return `<button onclick="ansC4('${o}', ${idx})" class="p-4 border-2 rounded-xl font-black text-gray-800 text-2xl hover:bg-blue-50 transition-all ${sClass}">${o}</button>`; }).join('')}</div></div></div>` : ''}
        </div>`;
}

function ansC4(o, idx) { 
    const c = state.connect4; if (c.feedback.status) return; 
    const isCorrect = o === c.q.correct; c.feedback = { status: isCorrect ? 'correct' : 'wrong', selectedIdx: idx }; render();
    setTimeout(() => { c.feedback = { status: null, selectedIdx: -1 }; if (isCorrect) { c.canDrop = true; c.isAnswering = false; } else { c.turn = c.turn === 1 ? 2 : 1; c.showQuestionPrompt = true; c.isAnswering = false; c.q = genC4Q(); if(!c.isPvP && c.turn===2) runAiTurn(); } render(); }, 800);
}

function dropC4(col) {
    const c = state.connect4; if (!c.canDrop && !c.isAiTurn) return;
    let targetRow = -1; for (let r=5; r>=0; r--) { if (!c.board[r][col]) { targetRow = r; break; } }
    if (targetRow === -1) return;
    c.canDrop = false; let currentRow = 0; const dropColor = c.turn;
    const dropInterval = setInterval(() => {
        c.fallingToken = { row: currentRow, col: col, color: dropColor }; render();
        if (currentRow === targetRow) { 
            clearInterval(dropInterval); c.board[targetRow][col] = dropColor; c.fallingToken = null;
            if (checkWin(c.board)) { triggerConfetti(); setTimeout(() => { state.winner = { type: 'c4', msg: dropColor===1?"אדום ניצח!":"צהוב ניצח!", glowClass: dropColor===1?'win-glow-red':'win-glow-yellow' }; render(); }, 400); }
            else { c.turn = c.turn === 1 ? 2 : 1; c.showQuestionPrompt = true; c.q = genC4Q(); c.isAiTurn = false; render(); if(!c.isPvP && c.turn===2) runAiTurn(); }
        } currentRow++;
    }, 80);
}

function runAiTurn() {
    state.connect4.isAiTurn = true;
    setTimeout(() => { const board = state.connect4.board; let col = -1; for (let c=0; c<7; c++) { if (canWinAt(board, c, 2)) { col = c; break; } } if (col === -1) { for (let c=0; c<7; c++) { if (canWinAt(board, c, 1)) { col = c; break; } } } if (col === -1) { const valid = [0,1,2,3,4,5,6].filter(c => !board[0][c]); col = valid[Math.floor(Math.random()*valid.length)]; } dropC4(col); }, 1000);
}

function canWinAt(b, col, color) { if (b[0][col]) return false; let r = 5; while (r >= 0 && b[r][col]) r--; const temp = b.map(row => [...row]); temp[r][col] = color; return checkWin(temp); }
function checkWin(b) {
    for (let r=0; r<6; r++) for (let c=0; c<4; c++) if (b[r][c] && b[r][c]==b[r][c+1] && b[r][c]==b[r][c+2] && b[r][c]==b[r][c+3]) return true;
    for (let r=0; r<3; r++) for (let c=0; c<7; c++) if (b[r][c] && b[r][c]==b[r+1][c] && b[r][c]==b[r+2][c] && b[r][c]==b[r+3][c]) return true;
    for (let r=0; r<3; r++) for (let c=0; c<4; c++) { if (b[r][c] && b[r][c]==b[r+1][c+1] && b[r][c]==b[r+2][c+2] && b[r][c]==b[r+3][c+3]) return true; if (b[r][c+3] && b[r][c+3]==b[r+1][c+2] && b[r][c+3]==b[r+2][c+1] && b[r][c+3]==b[r+3][c]) return true; } return false;
}

// --- WORD QUEST ---
function startWordQuest() {
    const pool = shuffle(state.words.filter(w => w.eng.length >= 2 && !w.eng.includes(' ')));
    state.screen = 'wordquest'; state.winner = null;
    state.wordQuest = { pool, roundIndex: 0, completedCount: 0, target: pool[0].eng.toLowerCase(), hint: pool[0].heb, guesses: [], currentGuess: '', maxAttempts: 5, isGameOver: false, keyStates: {}, showTutorial: true };
    render();
}

function renderWordQuest(app) {
    const w = state.wordQuest;
    if (w.showTutorial) { 
        app.innerHTML = `
            <div class="text-center space-y-6 w-full max-w-md animate-fade-in mt-6">
                <div class="bg-white p-8 rounded-[2.5rem] border-4 border-emerald-400 shadow-xl welcome-card">
                    <h2 class="text-3xl font-black text-emerald-600 mb-6">איך משחקים? 🔐</h2>
                    <div class="space-y-4 text-right">
                        <p class="text-lg font-bold text-gray-800">נחשו את המילה לפי הרמז.</p>
                        <div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-[#ffd700] border shadow-sm"></div> <p class="text-gray-800">אות נכונה ובמקום (זהב)</p></div>
                        <div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-[#c0c0c0] border shadow-sm"></div> <p class="text-gray-800">אות נכונה במקום הלא נכון (כסף)</p></div>
                    </div>
                    <button onclick="state.wordQuest.showTutorial=false; render();" class="mt-8 bg-emerald-600 text-white px-8 py-4 rounded-full text-xl font-black w-full shadow-lg">בואו נתחיל!</button>
                </div>
            </div>`; 
        return; 
    }

    const wordLen = w.target.length;
    const baseBoxSize = wordLen <= 5 ? 62 : Math.min(Math.floor((window.innerWidth * 0.9) / wordLen), 55);
    const gapSize = wordLen > 10 ? 2 : 5;
    
    let fontSizeClass = 'text-2xl';
    if (wordLen <= 5) fontSizeClass = 'text-3xl';
    else if (baseBoxSize < 30) fontSizeClass = 'text-[10px]';
    else if (baseBoxSize < 40) fontSizeClass = 'text-sm';
    else if (baseBoxSize < 50) fontSizeClass = 'text-lg';

    const legendHtml = `
        <div class="flex justify-center gap-3 mb-4 p-3 bg-white/50 rounded-2xl border border-emerald-100 shadow-sm w-full max-w-sm">
            <div class="flex items-center gap-1 text-sm font-black text-gray-700">
                <div class="w-4 h-4 bg-[#ffd700] rounded-sm border border-yellow-600"></div> זהב: בול
            </div>
            <div class="flex items-center gap-1 text-sm font-black text-gray-700">
                <div class="w-4 h-4 bg-[#c0c0c0] rounded-sm border border-gray-400"></div> כסף: במילה
            </div>
             <div class="flex items-center gap-1 text-sm font-black text-gray-400">
                <div class="w-4 h-4 border border-gray-200 rounded-sm"></div> שקוף: לא פה
            </div>
        </div>
    `;

    let gridHtml = `<div class="word-grid" style="grid-template-columns: repeat(${wordLen}, 1fr); width: fit-content; max-width: 100%; gap: ${gapSize}px; margin: 0 auto; display: grid;">`;
    for (let i = 0; i < w.maxAttempts; i++) {
        const g = w.guesses[i];
        for (let j = 0; j < wordLen; j++) {
            const commonStyle = `width: ${baseBoxSize}px; height: ${baseBoxSize}px; display: flex; align-items: center; justify-content: center; border-width: 2px; border-radius: 12px; font-weight: 900;`;
            if (g) {
                const status = getLetterStatus(g.text, j, w.target);
                let bgColor = ''; let borderColor = ''; let textColor = 'black';
                if (status === 'correct') { bgColor = '#ffd700'; borderColor = '#d4af37'; }
                else if (status === 'present') { bgColor = '#c0c0c0'; borderColor = '#a9a9a9'; }
                else { bgColor = 'transparent'; borderColor = '#e2e8f0'; textColor = '#4a5568'; }
                gridHtml += `<div class="word-cell ${fontSizeClass}" style="${commonStyle} background-color: ${bgColor}; border-color: ${borderColor}; color: ${textColor};">${g.text[j]}</div>`;
            }
            else if (i === w.guesses.length && !w.isGameOver) gridHtml += `<div class="word-cell border-blue-400 text-gray-800 ${fontSizeClass}" style="${commonStyle}">${w.currentGuess[j] || ''}</div>`;
            else gridHtml += `<div class="word-cell border-gray-100 opacity-20" style="${commonStyle}"></div>`;
        }
    }
    gridHtml += `</div>`;

    app.innerHTML = `
        <div class="flex flex-col items-center w-full px-2 mt-2 word-quest-container">
            <div class="w-full flex justify-between items-center mb-2 bg-white p-3 rounded-2xl shadow-sm max-w-sm welcome-card" style="direction:rtl">
                <button onclick="state.screen='menu'; render()" class="bg-red-50 text-red-600 px-4 py-1 rounded-full font-black text-xs border border-red-100">יציאה</button>
                <div class="text-xs font-bold text-gray-500">${w.roundIndex+1}/${w.pool.length} | ניסיון ${w.guesses.length+1}/${w.maxAttempts}</div>
            </div>

            ${legendHtml}

            <div class="w-full bg-emerald-50 p-4 rounded-2xl mb-4 border-2 border-emerald-200 max-w-sm shadow-inner">
                <div class="font-black text-xl text-emerald-800 text-center flex items-center justify-center gap-3">
                    רמז: ${w.hint} 
                    <button onclick="speak('${w.target}')" class="text-3xl bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-sm cursor-pointer">🔊</button>
                </div>
            </div>

            <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
                ${gridHtml}
            </div>
            <div class="w-full max-w-md mt-6">${renderQwerty()}</div>
        </div>`;
}

function getLetterStatus(guess, idx, target) { 
    if (guess[idx] === target[idx]) return 'correct'; 
    if (target.includes(guess[idx])) return 'present'; 
    return 'absent'; 
}

function renderQwerty() { 
    const rows = [['q','w','e','r','t','y','u','i','o','p'], ['a','s','d','f','g','h','j','k','l', '⌫'], ['z','x','c','v','b','n','m', 'ENTER']]; 
    return rows.map(r => `<div class="qwerty-row">${r.map(k => {
        let keyClass = state.wordQuest.keyStates[k] || '';
        let style = "";
        if (keyClass === 'correct') style = "background-color: #ffd700 !important; color: black;";
        else if (keyClass === 'present') style = "background-color: #c0c0c0 !important; color: black;";
        else if (keyClass === 'absent') style = "background-color: #e2e8f0 !important; color: #a0aec0; opacity: 0.6;";
        
        return `<button onclick="handleKey('${k}')" class="key ${keyClass} ${k==='ENTER'||k==='⌫'?'key-wide !bg-blue-600 !text-white':''} text-gray-800" style="${style}">${k==='ENTER'?'ENT':k}</button>`;
    }).join('')}</div>`).join(''); 
}

function handleKey(k) { const w = state.wordQuest; if (w.isGameOver) return; if (k === '⌫') w.currentGuess = w.currentGuess.slice(0, -1); else if (k === 'ENTER') { if (w.currentGuess.length === w.target.length) submitGuess(); } else if (w.currentGuess.length < w.target.length && k.length === 1) w.currentGuess += k.toLowerCase(); render(); }
function submitGuess() { const w = state.wordQuest; const g = w.currentGuess; w.guesses.push({ text: g }); for (let i = 0; i < g.length; i++) { const s = getLetterStatus(g, i, w.target); if (w.keyStates[g[i]] !== 'correct') w.keyStates[g[i]] = s; } if (g === w.target) { w.isGameOver = true; w.completedCount++; triggerConfetti(); setTimeout(() => { w.roundIndex++; if (w.roundIndex >= w.pool.length) { state.winner = { type:'wq', msg:'ניצחון!', subMsg:'סיימת הכל!', glowClass:'win-glow-emerald' }; } else { const next = w.pool[w.roundIndex]; w.target = next.eng.toLowerCase(); w.hint = next.heb; w.guesses = []; w.keyStates = {}; w.isGameOver = false; } render(); }, 1200); } else if (w.guesses.length >= w.maxAttempts) { w.isGameOver = true; setTimeout(() => { state.winner = { type:'wq', msg:'הפסד', subMsg:`המילה: ${w.target.toUpperCase()}`, glowClass:'win-glow-red' }; render(); }, 500); } w.currentGuess = ''; render(); }

function renderWinScreen(app) {
    const win = state.winner;
    app.innerHTML = `
        <div class="fixed inset-0 flex items-center justify-center bg-black/80 z-[300] px-4">
            <div class="text-center p-10 rounded-[3rem] max-w-sm w-full animate-fade-in win-card-base ${win.glowClass || ''}">
                <h2 class="text-4xl font-black mb-6 text-blue-700">${win.msg}</h2>
                <p class="text-xl font-black mb-10 text-gray-800">${win.subMsg || ''}</p>
                <div class="space-y-4">
                    <button onclick="state.winner=null; if(state.screen==='memory')startMemory();else if(state.screen==='connect4')startC4(state.connect4.isPvP);else startWordQuest();" class="bg-blue-600 text-white py-5 rounded-2xl text-2xl font-black w-full shadow-lg">שחק שוב 🔄</button>
                    <button onclick="state.winner=null; state.screen='menu'; render()" class="bg-white text-gray-800 py-4 rounded-2xl text-xl font-black w-full shadow">חזרה לתפריט 🏠</button>
                </div>
            </div>
        </div>`;
}

const toggleBtn = document.getElementById('toggleNight');
if (toggleBtn) toggleBtn.onclick = () => { state.nightMode = !state.nightMode; render(); };

window.addEventListener('keydown', (e) => { if (state.screen === 'wordquest' && !state.wordQuest.showTutorial) { if (e.key === 'Enter') handleKey('ENTER'); else if (e.key === 'Backspace') handleKey('⌫'); else if (/^[a-z]$/i.test(e.key)) handleKey(e.key.toLowerCase()); } });

loadFromLocal();
render();

// הגדרה ישירה של הפונקציה
function submitFinalReport(score) {
    console.log("--- התחלת דיווח ---");
    
    const nameInput = document.getElementById('studentName');
    const classInput = document.getElementById('studentClass');
    const reportArea = document.getElementById('reportSection');

    if (!nameInput || !classInput) {
        console.error("לא נמצאו שדות קלט!");
        return;
    }

    // שמירת הציון מיד כדי לפתוח משחקים
    state.masteryScore = score;
    saveToLocal();

    // שינוי המסך לכפתור המשך - מיד בלי לחכות
    if (reportArea) {
        reportArea.innerHTML = `
            <div style="background:#e6fffa; padding:20px; border-radius:15px; border:2px solid #38b2ac; margin-top:20px; text-align:center;">
                <p style="color:#2c7a7b; font-weight:bold; margin-bottom:15px;">הדיווח מוכן לשליחה!</p>
                <button onclick="state.screen='menu'; render();" 
                        style="background:#3182ce; color:white; border:none; padding:15px 30px; border-radius:10px; font-weight:bold; cursor:pointer; width:100%;">
                    המשך למשחקים 🎮
                </button>
            </div>
        `;
    }

    // שליחה שקטה ברקע
    const data = {
        name: nameInput.value,
        class: classInput.value,
        unit: state.listName,
        score: score + "%"
    };
    
    console.log("שולח נתונים:", data);
    
    fetch('YOUR_GOOGLE_SCRIPT_URL_HERE', {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(data)
    }).catch(e => console.log("שליחה נכשלה ברקע, לא נורא."));
}

// חיבור הפונקציה לחלון הגלובלי
window.submitFinalReport = submitFinalReport;


