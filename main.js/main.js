let state = {
    screen: 'welcome',
    words: [],
    listName: 'הרשימה שלי'
};

function render() {
    const app = document.getElementById('app');
    if (!app) return;
    
    if (state.screen === 'welcome') {
        app.innerHTML = `
            <div class="bg-white p-10 rounded-3xl shadow-xl text-center border-4 border-blue-100">
                <h2 class="text-3xl font-bold mb-6">ברוכים הבאים! 🚀</h2>
                <button onclick="state.screen='input'; render();" class="bg-blue-600 text-white px-8 py-4 rounded-full text-xl font-bold">התחל עכשיו</button>
            </div>`;
    } else if (state.screen === 'input') {
        app.innerHTML = `
            <div class="w-full max-w-md bg-white p-6 rounded-3xl shadow-lg">
                <textarea id="wordInput" class="w-full h-40 p-4 border-2 rounded-xl mb-4 text-right" placeholder="מילה - תרגום"></textarea>
                <button onclick="processInput()" class="w-full bg-green-500 text-white py-4 rounded-xl font-bold">צור משחק</button>
            </div>`;
    }
}

function processInput() {
    const val = document.getElementById('wordInput').value;
    if (!val.includes('-')) return alert('כתוב בפורמט: מילה - תרגום');
    alert('הצלחת! הקוד עובד. עכשיו אפשר להמשיך למשחקים.');
}

window.onload = render;
