// בדיקה בסיסית - האם הקוד רץ?
console.log("JS is running!");

let state = {
    screen: 'welcome'
};

function render() {
    const app = document.getElementById('app');
    if (!app) {
        console.error("Could not find element with id 'app'");
        return;
    }

    if (state.screen === 'welcome') {
        app.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center;">
                <h2 style="font-size: 24px; margin-bottom: 20px;">הקוד עובד! 🎉</h2>
                <p style="margin-bottom: 20px;">אם אתם רואים את זה, הקשר בין הקבצים תקין.</p>
                <button onclick="alert('מעולה!')" style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">לחצו עליי</button>
            </div>
        `;
    }
}

// הפעלה ברגע שהדף נטען
window.onload = render;
