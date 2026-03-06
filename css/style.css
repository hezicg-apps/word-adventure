@import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&family=Comic+Neue:wght@400;700&display=swap');
        
        body { 
            font-family: 'Comic Neue', 'Assistant', 'Arial', sans-serif; 
            transition: background-color 0.3s; 
            overflow-x: hidden; 
            touch-action: manipulation; 
        }
        
        .eng-text { font-family: 'Comic Neue', 'Arial', sans-serif; font-weight: 800; }

        /* Night Mode Base */
        body.night-mode { background-color: #1a202c !important; color: #facc15 !important; }
        .night-mode .text-black, .night-mode .text-gray-800, .night-mode .text-gray-700,
        .night-mode .text-blue-900, .night-mode .text-green-900, .night-mode .text-purple-900,
        .night-mode .text-blue-600, .night-mode h1, .night-mode h2, .night-mode h3, 
        .night-mode p, .night-mode span:not(.eng-text) { 
            color: #facc15 !important; 
            font-weight: 800;
        }
        .night-mode .bg-white { background-color: #2d3748 !important; }
        .night-mode .welcome-card { background-color: #2d3748 !important; border-color: #4a5568 !important; }
        
        /* Neon Glow Effects for Win Screens */
        .win-card-base {
            border: 5px solid white !important;
            background-color: white;
            position: relative;
        }
        .night-mode .win-card-base {
            background-color: #1a202c !important;
        }

        .win-glow-emerald { box-shadow: 0 0 20px #fff, 0 0 40px #10b981, 0 0 60px #10b981 !important; }
        .win-glow-purple { box-shadow: 0 0 20px #fff, 0 0 40px #a855f7, 0 0 60px #a855f7 !important; }
        .win-glow-red { box-shadow: 0 0 20px #fff, 0 0 40px #ef4444, 0 0 60px #ef4444 !important; }
        .win-glow-yellow { box-shadow: 0 0 20px #fff, 0 0 40px #facc15, 0 0 60px #facc15 !important; }

        /* Step styles */
        .night-mode .step-blue { background-color: #1e3a8a !important; border-color: #3b82f6 !important; }
        .night-mode .step-green { background-color: #064e3b !important; border-color: #10b981 !important; }
        .night-mode .step-purple { background-color: #4c1d95 !important; border-color: #8b5cf6 !important; }

        /* Card Flip Styles */
        .perspective-1000 { perspective: 1000px; }
        .card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
        .card-flipped .card-inner { transform: rotateY(180deg); }
        .card-front, .card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 1.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); top: 0; left: 0; }
        .card-back { transform: rotateY(180deg); }

        /* Connect 4 Board */
        .c4-container { display: inline-block; background-color: #1e40af; padding: 12px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); position: relative; }
        .arrows-row { display: grid; grid-template-columns: repeat(7, 42px); gap: 6px; margin-bottom: 8px; justify-items: center; }
        .c4-board { display: grid; grid-template-columns: repeat(7, 42px); grid-template-rows: repeat(6, 42px); gap: 6px; }
        @media (min-width: 640px) { .arrows-row { grid-template-columns: repeat(7, 60px); gap: 10px; } .c4-board { grid-template-columns: repeat(7, 60px); grid-template-rows: repeat(6, 60px); gap: 10px; } }
        .c4-slot { width: 100%; height: 100%; background-color: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: inset 2px 2px 5px rgba(0,0,0,0.1); }
        .night-mode .c4-slot { background-color: #4a5568; }
        .token-fixed { width: 85%; height: 85%; border-radius: 50%; box-shadow: inset 0 -4px 4px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.3); }
        .token-red { background-color: #ef4444; }
        .token-yellow { background-color: #facc15; }

        /* Word Quest (Wordle Style) - Colors and Glow */
        .word-quest-container { direction: ltr; }
        .word-grid { display: grid; gap: 12px; margin: 10px auto; }
        .word-cell { 
            width: 44px; height: 44px; 
            border: 2px solid #cbd5e1; 
            border-radius: 50%; 
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; font-weight: 900; text-transform: uppercase;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
        }
        @media (min-width: 640px) { .word-cell { width: 56px; height: 56px; } }
        .night-mode .word-cell { border-color: #4a5568; }

        /* DAY MODE - Solid Fill */
        body:not(.night-mode) .word-cell.correct { background-color: #38bdf8 !important; border-color: #0ea5e9 !important; color: white !important; }
        body:not(.night-mode) .word-cell.present { background-color: #a855f7 !important; border-color: #9333ea !important; color: white !important; }
        body:not(.night-mode) .word-cell.absent { background-color: #94a3b8 !important; border-color: #64748b !important; color: white !important; }

        /* NIGHT MODE - Neon Glow & Bold */
        .night-mode .word-cell.correct { 
            background-color: #0ea5e9 !important; border-color: #7dd3fc !important; color: white !important;
            box-shadow: 0 0 15px #0ea5e9, 0 0 5px #fff;
            text-shadow: 0 0 5px rgba(255,255,255,0.8);
            font-weight: 900;
        }
        .night-mode .word-cell.present { 
            background-color: #9333ea !important; border-color: #d8b4fe !important; color: white !important;
            box-shadow: 0 0 15px #9333ea, 0 0 5px #fff;
            text-shadow: 0 0 5px rgba(255,255,255,0.8);
            font-weight: 900;
        }
        .night-mode .word-cell.absent { background-color: #334155 !important; border-color: #475569 !important; color: #94a3b8 !important; }

        /* Keyboard Styles */
        .qwerty-row { display: flex; justify-content: center; gap: 4px; margin-bottom: 8px; width: 100%; }
        .key { 
            background: #e2e8f0; border: none; border-radius: 6px; padding: 15px 0; flex: 1;
            font-weight: 800; cursor: pointer; transition: background 0.2s; font-size: 1.1rem;
            display: flex; align-items: center; justify-content: center; min-height: 55px;
        }
        .night-mode .key { background: #4a5568; color: white; }
        .key.correct { background-color: #0ea5e9 !important; color: white !important; }
        .key.present { background-color: #9333ea !important; color: white !important; }
        .key.absent { background-color: #1e293b !important; opacity: 0.4; color: white !important; }
        .key-wide { flex: 1.6; font-size: 0.85rem; }

        .correct-ans { background-color: #10b981 !important; color: white !important; }
        .wrong-ans { background-color: #ef4444 !important; color: white !important; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }

/* תיקון בריחת אותיות מהמסך */
#letters-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    width: 100%;
    max-width: 100vw;
    padding: 10px;
    box-sizing: border-box;
    overflow: hidden;
}

.letter-bubble {
    /* גודל גמיש המבוסס על רוחב המסך */
    width: min(12vw, 60px) !important;
    height: min(12vw, 60px) !important;
    font-size: min(6vw, 28px) !important;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}
        
#game-branding img {
    max-width: 150px;
    width: 40vw;
    height: auto;
    display: block;
    margin: 0 auto;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}

#game-branding img {
    max-width: 150px;
    width: 40vw;
    height: auto;
    display: block;
    margin: 0 auto;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}

/* עיצוב כותרת משולבת לוגו */
.eng-text {
    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
}

.night-mode .text-yellow-500 {
    color: #facc15 !important; /* צהוב בוהק למצב לילה */
    text-shadow: 0 0 10px rgba(250, 204, 21, 0.4);
}

#game-branding img {
    display: none; /* מסתיר את הלוגו הישן אם נשאר */
}

/* תיקון לוגו וטקסט */
.eng-text {
    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
}

.night-mode .text-yellow-500 {
    color: #facc15 !important;
    text-shadow: 0 0 10px rgba(250, 204, 21, 0.4);
}

/* מוודא שהלוגו לא מקבל רקע לבן בטעות */
header img {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
}

/* במצב לילה, אם יש רקע לבן דק בתמונה, mix-blend-screen עשוי לעזור */
.night-mode header img {
    filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));
}
