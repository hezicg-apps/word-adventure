// בדיקה מיידית - מדפיס לקונסול של הדפדפן
console.log("Script loaded successfully!");

function init() {
    const app = document.getElementById('app');
    
    if (!app) {
        document.body.innerHTML = '<h1 style="color:red; text-align:center; margin-top:50px;">שגיאה: לא נמצא אלמנט עם id="app"</h1>';
        return;
    }

    app.innerHTML = `
        <div style="text-align:center; padding:50px; font-family:sans-serif;">
            <div style="font-size: 50px;">🚀</div>
            <h2 style="color: #2563eb;">הקשר נוצר בהצלחה!</h2>
            <p>ה-JavaScript שלכם עובד.</p>
            <button onclick="location.reload()" style="padding:15px 30px; cursor:pointer; background:#2563eb; color:white; border:none; border-radius:10px; font-weight:bold;">
                לחצו כאן לרענון (Refresh)
            </button>
        </div>
    `;
}

// מפעיל את הפונקציה מיד כשהדף נטען
window.onload = init;
