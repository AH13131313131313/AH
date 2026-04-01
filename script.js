// 1. استيراد المكتبات من CDN (تأكد من استخدام النسخة 10.7.1)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, child, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. إعدادات Firebase الخاصة بمشروعك
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

// تهيئة AOS للأنيميشن
if (window.AOS) { AOS.init({ duration: 1000, once: false }); }

const ADMIN_EMAIL = "ahabdellah210@gmail.com";
const ADMIN_PASS = "fati0476";
let loginMode = false;
let currentUserEmail = "";

// --- وظائف الهوية (Login/Register) ---
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
        // تسجيل دخول الأدمن أو المستخدم
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
        // إنشاء حساب
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

// 1. إضافة عمل جديد
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

// 2. عرض الفيديوهات للزوار
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

// 3. إدارة الحذف للأدمن
function loadAdminWorksList() {
    const list = document.getElementById('admin-works-list');
    onValue(ref(db, 'showroom/'), (snapshot) => {
        if (!list) return;
        list.innerHTML = "";
        const data = snapshot.val();
        if (!data) { list.innerHTML = "<p>لا توجد أعمال.</p>"; return; }

        Object.keys(data).forEach(key => {
            const item = data[key];
            const row = document.createElement('div');
            row.className = "admin-work-item";
            row.style = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:12px; margin-bottom:10px; border-radius:10px; border:1px solid #333;";
            row.innerHTML = `
                <div style="text-align:right;">
                    <span style="color:var(--gold); font-weight:bold;">${item.title}</span><br>
                    <small style="color:#666;">${item.category}</small>
                </div>
                <button onclick="window.deleteWork('${key}')" style="background:#ff4d4d; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">حذف</button>
            `;
            list.appendChild(row);
        });
    });
}

window.deleteWork = function(key) {
    if (confirm("هل أنت متأكد من حذف هذا الفيديو؟")) {
        remove(ref(db, 'showroom/' + key))
            .then(() => alert("تم الحذف!"))
            .catch(err => alert("خطأ: " + err.message));
    }
};

// --- التحكم في الصفحات ---
function enterSite() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    window.listenToShowroom();
}

function showAdminPanel() {
    enterSite();
    document.getElementById('admin-page').classList.remove('hidden');
    loadAdminWorksList();
}

window.logout = function() {
    localStorage.removeItem('ah_user_session');
    location.reload();
};

// تشغيل عند التحميل
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('ah_user_session');
    if (saved) {
        currentUserEmail = saved;
        if (saved === ADMIN_EMAIL.replace(/\./g, '_')) { showAdminPanel(); } 
        else { enterSite(); }
    }
});
