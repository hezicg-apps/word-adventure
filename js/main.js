/**
 * Word Adventure - Speech Engine (TTS)
 * פונקציות להקראת המילים במהלך המשחק
 */

const SpeechEngine = {
    // הגדרות בסיסיות
    synth: window.speechSynthesis,
    voice: null,

    // אתחול ומציאת קול מתאים (אנגלית)
    init() {
        const setVoice = () => {
            const voices = this.synth.getVoices();
            // חיפוש קול באנגלית (עדיפות ל-Google US English או Samantha)
            this.voice = voices.find(v => v.lang === 'en-US' || v.lang === 'en_US') || voices[0];
        };

        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = setVoice;
        }
        setVoice();
    },

    /**
     * הקראת טקסט
     * @param {string} text - המילה להקראה
     */
    speak(text) {
        if (!this.synth || this.synth.speaking) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.voice;
        utterance.pitch = 1.1; // קול מעט גבוה יותר וידידותי לילדים
        utterance.rate = 0.9;  // הקראה מעט איטית יותר לצורך למידה

        this.synth.speak(utterance);
    }
};

// אתחול המנוע מיד עם טעינת הקובץ
SpeechEngine.init();

/**
 * פונקציה לשילוב בתוך לוגיקת המשחק הקיימת
 * יש לקרוא לפונקציה זו בכל פעם שמוצגת מילה חדשה או כשלוקחים את הבועה
 */
function onWordDisplayed(word) {
    // הקראה אוטומטית כשהמילה מופיעה (אופציונלי)
    // SpeechEngine.speak(word);
}

// דוגמה להוספת כפתור "השמע שוב" בתוך ה-UI
function createAudioButton(word) {
    const btn = document.createElement('button');
    btn.innerHTML = '🔊';
    btn.className = 'audio-btn p-2 bg-blue-100 rounded-full hover:bg-blue-200 transition';
    btn.onclick = () => SpeechEngine.speak(word);
    return btn;
}

/**
 * עדכון לפונקציית הבדיקה הקיימת שלך (דוגמה)
 */
function checkAnswer(isCorrect, word) {
    if (isCorrect) {
        // השמעת המילה כחיזוק חיובי כשהילד צודק
        SpeechEngine.speak(word);
    }
}
