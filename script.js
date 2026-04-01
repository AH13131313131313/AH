// 1. استيراد المكتبات من CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. إعدادات Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD6ovMBiZrl2eVcMPwqGv-LWbo0T-504NY",
    authDomain: "ahdynamics-63745.firebaseapp.com",
    databaseURL: "https://ahdynamics-63745-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "ahdynamics-63745",
    storageBucket: "ahdynamics-63745.firebasespot.app",
    messagingSenderId: "153934340820",
    appId: "1:153934340820:web:352caa101535b00b7dd141"
};

// 3. تهيئة التطبيق
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// تهيئة AOS
if (window.AOS) { AOS.init({ duration: 1000, once: false }); }

const ADMIN_EMAIL = "ahabdellah210@gmail.com";
const ADMIN_PASS = "fati0476";
let loginMode = false;
let currentUserEmail = "";

// --- وظائف الهوية ---
window.toggleAuthMode = function() {
    loginMode = !loginMode;
    document.getElementById('auth-title').innerText = loginMode ? "تسجيل الدخول" : "إنشاء حساب جديد";
    document.getElementById('auth-link').innerText = loginMode ? "إنشاء حساب" : "تسجيل الدخول";
};

window.handleAuth = async function() {
    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const pass = document.getElementById('auth-pass').value;
    const emailKey = email.replace(/\./g, '_');

    if (!email || pass.length < 6) return alert("يرجى إدخال بيانات صحيحة!");

    if (loginMode) {
        if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
            saveSession(emailKey);
            showAdminPanel();
        } else {
            const userRef = ref(db, 'users/' + emailKey);
            get(userRef).then((snapshot) => {
                if (snapshot.exists() && snapshot.val().pass === pass) {
                    saveSession(emailKey);
                    enterSite();
                } else { alert("خطأ في كلمة السر أو الإيميل"); }
            });
        }
    } else {
        set(ref(db, 'users/' + emailKey), { email, pass }).then(() => {
            alert("تم التسجيل بنجاح!"); window.toggleAuthMode();
        });
    }
};

function saveSession(key) {
    currentUserEmail = key;
    localStorage.setItem('ah_user_session', key);
}

// --- نظام المعرض (Showroom) ---
window.addNewWork = function() {
    const title = document.getElementById('work-title').value.trim();
    const category = document.getElementById('work-category').value;
    const url = document.getElementById('work-url').value.trim();
    const file = document.getElementById('work-file-pc').files[0];

    if (!title) return alert("أدخل عنوان الفيديو!");

    const publish = (videoSrc) => {
        const workId = Date.now();
        set(ref(db, 'showroom/' + workId), { title, category, videoUrl: videoSrc })
            .then(() => {
                alert("✅ تم النشر!");
                document.getElementById('work-title').value = "";
                document.getElementById('work-url').value = "";
                document.getElementById('work-file-pc').value = "";
            });
    };

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => publish(e.target.result);
        reader.readAsDataURL(file);
    } else if (url) {
        publish(url);
    } else {
        alert("يرجى اختيار فيديو!");
    }
};

window.listenToShowroom = function() {
    const grid = document.getElementById('showroom-grid');
    if (!grid) return;

    onValue(ref(db, 'showroom/'), (snapshot) => {
        grid.innerHTML = "";
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                grid.innerHTML += `
                    <div class="video-card-premium" data-aos="fade-up">
                        <video src="${item.videoUrl}" controls style="width:100%; border-radius:12px;"></video>
                        <div style="padding:15px; text-align:right;">
                            <h4 class="gold-gradient">${item.title}</h4>
                            <p style="color:#888; font-size:0.8rem;">${item.category}</p>
                        </div>
                    </div>`;
            });
        }
    });
};

function loadAdminWorksList() {
    const list = document.getElementById('admin-works-list');
    onValue(ref(db, 'showroom/'), (snapshot) => {
        if (!list) return;
        list.innerHTML = "";
        const data = snapshot.val();
        if (!data) { list.innerHTML = "<p style='color: #555; text-align: center;'>لا توجد أعمال منشورة.</p>"; return; }

        Object.keys(data).forEach(key => {
            const item = data[key];
            const row = document.createElement('div');
            row.style = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:12px; margin-bottom:10px; border-radius:10px; border:1px solid #333;";
            row.innerHTML = `
                <div style="text-align:right;">
                    <span style="color:var(--gold); font-weight:bold;">${item.title}</span><br>
                    <small style="color:#666;">${item.category}</small>
                </div>
                <button onclick="window.deleteWork('${key}')" style="background:#ff4d4d; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold;">حذف</button>
            `;
            list.appendChild(row);
        });
    });
}

window.deleteWork = function(key) {
    if (confirm("هل أنت متأكد من حذف هذا الفيديو نهائياً؟")) {
        remove(ref(db, 'showroom/' + key))
            .then(() => alert("تم الحذف بنجاح!"))
            .catch(err => alert("خطأ في الحذف: " + err.message));
    }
};

// --- التحكم في الصفحات ولوحة الإدارة ---
function enterSite() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    window.listenToShowroom();
}

function showAdminPanel() {
    enterSite(); 
    const adminPage = document.getElementById('admin-page');
    adminPage.classList.remove('hidden');

    // التأكد من إضافة زر تسجيل الخروج مرة واحدة فقط
    if (!document.getElementById('admin-logout-btn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'admin-logout-btn';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> تسجيل خروج المسؤول';
        // تنسيق الزر ليكون واضحاً في الأعلى
        logoutBtn.style = "background: #ff4d4d; color: white; margin: 10px auto 20px auto; display: block; border: none; padding: 12px 25px; border-radius: 8px; cursor: pointer; font-weight: bold; border: 1px solid rgba(255,255,255,0.2); shadow: 0 4px 15px rgba(255, 77, 77, 0.3);";
        
        logoutBtn.onclick = window.logout;
        adminPage.prepend(logoutBtn); // وضعه في أول قسم الأدمن
    }

    loadAdminWorksList();
}

window.logout = function() {
    if(confirm("هل تريد تسجيل الخروج والعودة لصفحة الدخول؟")) {
        localStorage.removeItem('ah_user_session');
        location.reload(); // إعادة تحميل الصفحة لتصفير كل شيء
    }
};

// --- التحقق من الجلسة عند التحميل ---
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('ah_user_session');
    if (saved) {
        currentUserEmail = saved;
        const adminKey = ADMIN_EMAIL.replace(/\./g, '_');
        if (saved === adminKey) { 
            showAdminPanel(); 
        } else { 
            enterSite(); 
        }
    }
});
