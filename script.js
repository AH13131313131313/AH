// 1. استيراد المكتبات السحابية
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// تهيئة الأنيميشنات
AOS.init({ duration: 1000, once: false });

const ADMIN_EMAIL = "ahabdellah210@gmail.com";
const ADMIN_PASS = "fati0476";
let loginMode = false;
let currentUserEmail = "";

// --- الدوال العامة والمساعدة ---
window.isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

window.logout = () => { 
    localStorage.removeItem('ah_user_session'); 
    location.reload(); 
};

window.closeModal = () => document.getElementById('service-modal').classList.add('hidden');

window.toggleSidebar = () => document.getElementById('conference-sidebar').classList.toggle('active');

window.toggleAuthMode = () => { loginMode = !loginMode; updateAuthUI(); };

function updateAuthUI() {
    const title = document.getElementById('auth-title'), link = document.getElementById('auth-link'), switchText = document.getElementById('auth-switch-text');
    title.innerText = loginMode ? "تسجيل الدخول" : "إنشاء حساب جديد";
    link.innerText = loginMode ? "إنشاء حساب" : "تسجيل الدخول";
    switchText.innerText = loginMode ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟";
}

// --- نظام الدخول ---
window.handleAuth = async function() {
    const rawEmail = document.getElementById('auth-email').value.trim().toLowerCase();
    const pass = document.getElementById('auth-pass').value;
    const emailKey = rawEmail.replace(/\./g, '_');

    if (!window.isValidEmail(rawEmail)) return alert("الإيميل غير صحيح!");
    if (pass.length < 6) return alert("كلمة السر ضعيفة!");

    if (loginMode) {
        if (rawEmail === ADMIN_EMAIL && pass === ADMIN_PASS) {
            currentUserEmail = emailKey;
            localStorage.setItem('ah_user_session', emailKey);
            return window.showAdmin();
        }
        get(child(ref(db), `users/${emailKey}`)).then((s) => {
            if (s.exists() && s.val().pass === pass) {
                currentUserEmail = emailKey;
                localStorage.setItem('ah_user_session', emailKey);
                enterSite();
            } else alert("خطأ في البيانات!");
        });
    } else {
        get(child(ref(db), `users/${emailKey}`)).then((s) => {
            if (s.exists()) alert("مسجل مسبقاً!");
            else set(ref(db, 'users/' + emailKey), { email: rawEmail, pass, ticket: null }).then(() => {
                alert("تم التسجيل!"); window.toggleAuthMode();
            });
        });
    }
};

// --- لوحة الأدمن (إدارة المعرض والمستخدمين) ---
window.showAdmin = function() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    document.getElementById('admin-page').classList.remove('hidden');
    
    // عرض قائمة الفيديوهات في لوحة التحكم للحذف
    loadAdminInventory();
    renderUserTable();
    window.listenToShowroom();
};

function renderUserTable() {
    onValue(ref(db, 'users/'), (snapshot) => {
        const tableBody = document.getElementById('admin-table-body');
        if(!tableBody) return;
        tableBody.innerHTML = "";
        const data = snapshot.val();
        if(data) {
            Object.keys(data).forEach(key => {
                const u = data[key];
                tableBody.innerHTML += `<tr><td>${u.email}</td><td>${u.pass}</td><td class="gold-gradient">${u.ticket || '---'}</td><td><button onclick="deleteUser('${key}')" style="color:red; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button></td></tr>`;
            });
            document.getElementById('user-count').innerText = Object.keys(data).length;
        }
    });
}

window.deleteUser = (key) => { if(confirm("حذف المستخدم؟")) remove(ref(db, 'users/' + key)); };

// --- إدارة أعمال المعرض (Showroom) ---
window.addNewWork = function() {
    const title = document.getElementById('work-title').value.trim();
    const category = document.getElementById('work-category').value;
    const urlInput = document.getElementById('work-url').value.trim();
    const fileInput = document.getElementById('work-file-pc').files[0];

    if (!title) return alert("أدخل العنوان!");

    const save = (url) => {
        const id = Date.now();
        set(ref(db, 'showroom/' + id), { title, category, videoUrl: url })
            .then(() => { alert("تم النشر!"); location.reload(); });
    };

    if (fileInput) {
        const reader = new FileReader();
        reader.onload = (e) => save(e.target.result);
        reader.readAsDataURL(fileInput);
    } else if (urlInput) save(urlInput);
    else alert("اختر فيديو!");
};

// دالة حذف العمل للآدمن
window.deleteWork = function(key) {
    if(confirm("هل تريد حذف هذا العمل نهائياً؟")) {
        remove(ref(db, 'showroom/' + key))
            .then(() => alert("تم الحذف بنجاح"))
            .catch(err => alert("خطأ: " + err.message));
    }
};

// عرض الفيديوهات في لوحة التحكم (قائمة الحذف)
function loadAdminInventory() {
    const adminList = document.getElementById('admin-works-list');
    onValue(ref(db, 'showroom/'), (snapshot) => {
        adminList.innerHTML = '';
        const data = snapshot.val();
        if (!data) { adminList.innerHTML = '<p>لا توجد أعمال.</p>'; return; }
        
        Object.keys(data).forEach(key => {
            const item = data[key];
            const div = document.createElement('div');
            div.style = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; margin-bottom:5px; border-radius:8px;";
            div.innerHTML = `
                <div><b style="color:var(--gold)">${item.title}</b><br><small>${item.category}</small></div>
                <button onclick="window.deleteWork('${key}')" style="background:#ff4d4d; border:none; color:white; padding:5px 10px; border-radius:5px; cursor:pointer;">حذف</button>
            `;
            adminList.appendChild(div);
        });
    });
}

// --- العرض في الموقع للزوار ---
window.listenToShowroom = function() {
    const grid = document.getElementById('showroom-grid');
    onValue(ref(db, 'showroom/'), (snapshot) => {
        grid.innerHTML = "";
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                grid.innerHTML += `
                    <div class="video-card-premium" data-aos="zoom-in">
                        <video src="${item.videoUrl}" controls style="width:100%; border-radius:10px;"></video>
                        <div style="padding:10px; text-align:right">
                            <span class="gold-gradient" style="font-weight:bold">${item.title}</span>
                            <p style="color:#777; font-size:0.8rem">${item.category}</p>
                        </div>
                    </div>`;
            });
        }
    });
};

function enterSite() { 
    document.getElementById('auth-container').classList.add('hidden'); 
    document.getElementById('main-content').classList.remove('hidden'); 
    window.listenToShowroom();
    window.renderServices();
}

window.renderServices = function() { /* الأكواد السابقة لشبكة الخدمات */ };

// التفعيل عند التحميل
window.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('ah_user_session');
    if (session) {
        currentUserEmail = session;
        session === ADMIN_EMAIL.replace(/\./g, '_') ? window.showAdmin() : enterSite();
    }
});
