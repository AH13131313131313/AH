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
if (window.AOS) { AOS.init({ duration: 1000, once: false }); }

const ADMIN_EMAIL = "ahabdellah210@gmail.com";
const ADMIN_PASS = "fati0476";
let loginMode = false;
let currentUserEmail = "";

// --- الدوال المساعدة ---
window.isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

window.logout = function() { 
    if(confirm("هل تريد تسجيل الخروج؟")) {
        localStorage.removeItem('ah_user_session'); 
        location.reload(); 
    }
};

window.closeModal = () => document.getElementById('service-modal').classList.add('hidden');
window.toggleSidebar = () => document.getElementById('conference-sidebar').classList.toggle('active');

window.toggleAuthMode = function() { 
    loginMode = !loginMode; 
    document.getElementById('auth-title').innerText = loginMode ? "تسجيل الدخول" : "إنشاء حساب جديد";
    document.getElementById('auth-link').innerText = loginMode ? "إنشاء حساب" : "تسجيل الدخول";
    const st = document.getElementById('auth-switch-text');
    if(st) st.innerText = loginMode ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟";
};

// --- نظام الهوية والدخول ---
window.handleAuth = async function() {
    const rawEmail = document.getElementById('auth-email').value.trim().toLowerCase();
    const pass = document.getElementById('auth-pass').value;
    const emailKey = rawEmail.replace(/\./g, '_');

    if (!window.isValidEmail(rawEmail)) return alert("الرجاء إدخال إيميل صحيح!");
    if (pass.length < 6) return alert("كلمة السر قصيرة جداً");

    if (loginMode) {
        if (rawEmail === ADMIN_EMAIL && pass === ADMIN_PASS) {
            saveSession(emailKey);
            window.showAdmin();
        } else {
            get(child(ref(db), `users/${emailKey}`)).then((snapshot) => {
                if (snapshot.exists() && snapshot.val().pass === pass) {
                    saveSession(emailKey);
                    enterSite();
                } else { alert("بيانات الدخول خاطئة!"); }
            });
        }
    } else {
        get(child(ref(db), `users/${emailKey}`)).then((snapshot) => {
            if (snapshot.exists()) return alert("الإيميل مسجل مسبقاً!");
            set(ref(db, 'users/' + emailKey), { email: rawEmail, pass, ticket: null, inDraw: false, isWinner: false })
                .then(() => { alert("تم التسجيل!"); window.toggleAuthMode(); });
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
        alert("يرجى اختيار فيديو أو وضع رابط!");
    }
};

// عرض الفيديوهات للزوار
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
                    <div class="video-card-premium" data-aos="zoom-in">
                        <video src="${item.videoUrl}" controls style="width:100%; border-radius:12px;"></video>
                        <div style="padding:15px; text-align:right; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <h4 class="gold-gradient">${item.title}</h4>
                                <p style="color:#888; font-size:0.8rem;">${item.category}</p>
                            </div>
                            <a href="${item.videoUrl}" download style="color:var(--gold); font-size:1.2rem;"><i class="fas fa-download"></i></a>
                        </div>
                    </div>`;
            });
        }
    });
};

// --- القائمة المبسطة جداً للمسح (للمسؤول) ---
function loadAdminWorksList() {
    const list = document.getElementById('admin-works-list');
    if (!list) return;

    onValue(ref(db, 'showroom/'), (snapshot) => {
        list.innerHTML = ""; 
        const data = snapshot.val();
        
        if (!data) {
            list.innerHTML = "<p style='color: #666; text-align: center; padding: 20px;'>لا توجد فيديوهات حالياً.</p>";
            return;
        }

        Object.keys(data).forEach(key => {
            const item = data[key];
            const row = document.createElement('div');
            row.style = "display:flex; justify-content:space-between; align-items:center; background:#111; padding:10px 15px; margin-bottom:5px; border-radius:5px; border-right:3px solid var(--gold);";
            
            row.innerHTML = `
                <span style="color:#fff; font-size:0.9rem;">${item.title}</span>
                <button onclick="window.deleteWork('${key}')" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-size:1.1rem;">
                    <i class="fas fa-trash-alt"></i> مسح
                </button>
            `;
            list.appendChild(row);
        });
    });
}

window.deleteWork = function(key) {
    if (confirm("هل تريد مسح هذا الفيديو؟")) {
        remove(ref(db, 'showroom/' + key))
            .then(() => console.log("تم المسح"))
            .catch((err) => alert("خطأ: " + err.message));
    }
};

// --- نظام القرعة والتذاكر ---
window.generateTicket = function() {
    let code = Math.floor(100000 + Math.random() * 900000).toString();
    update(ref(db, `users/${currentUserEmail}`), { ticket: code }).then(() => updateTicketDisplay());
};

window.joinDraw = function() {
    update(ref(db, `users/${currentUserEmail}`), { inDraw: true }).then(() => {
        alert("تم دخولك في القرعة! ✨");
        updateTicketDisplay();
    });
};

function updateTicketDisplay() {
    get(child(ref(db), `users/${currentUserEmail}`)).then((snapshot) => {
        const u = snapshot.val();
        const area = document.getElementById('ticket-area');
        if (area && u && u.ticket) {
            area.innerHTML = `
                <div class="ticket-visual" data-aos="flip-up">
                    <div class="ticket-number">${u.ticket}</div>
                    <p>كود المؤتمر</p>
                </div>
                ${!u.inDraw ? `<button onclick="window.joinDraw()" class="gold-btn" style="margin-top:15px; width:100%;">🎁 دخول القرعة</button>` : `<p style="color:var(--gold); margin-top:10px; font-weight:bold;">✅ أنت مشارك</p>`}
            `;
        }
    });
}

window.runDraw = function() {
    get(ref(db, 'users/')).then((snapshot) => {
        const users = snapshot.val();
        const participants = Object.keys(users || {}).filter(key => users[key].inDraw === true);
        if (participants.length === 0) return alert("لا يوجد مشاركون!");
        const winnerKey = participants[Math.floor(Math.random() * participants.length)];
        update(ref(db, `users/${winnerKey}`), { isWinner: true }).then(() => alert("الفائز: " + users[winnerKey].email));
    });
};

// --- واجهات التحكم والدخول ---
function enterSite() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    window.renderServices();
    window.listenToShowroom();
    updateTicketDisplay();
    onValue(ref(db, `users/${currentUserEmail}/isWinner`), (s) => { if(s.val()) showWinnerModal(); });
}

window.showAdmin = function() {
    enterSite();
    const adminPage = document.getElementById('admin-page');
    adminPage.classList.remove('hidden');
    
    // إضافة أزرار الأدمن إذا لم تكن موجودة
    if(!document.getElementById('admin-ctrls')){
        const div = document.createElement('div');
        div.id = "admin-ctrls";
        div.innerHTML = `
            <button onclick="window.logout()" style="background:#ff4d4d; color:white; width:200px; margin:10px auto; display:block; padding:10px; border-radius:8px; border:none; cursor:pointer;">🚪 خروج المسؤول</button>
            <button onclick="window.runDraw()" style="background:var(--gold); color:black; width:200px; margin:10px auto; display:block; padding:10px; border-radius:8px; border:none; cursor:pointer; font-weight:bold;">🎲 سحب القرعة</button>
        `;
        adminPage.prepend(div);
    }

    loadAdminWorksList(); // القائمة المبسطة جداً للمسح
    renderUserTable();    // جدول المستخدمين
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

// --- الخدمات والمودال ---
window.renderServices = function() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;
    const services = [
        {id:'video', t:'صناعة الفيديوهات', i:'fas fa-video', img: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1200"},
        {id:'graphic', t:'التصميم الجرافيكي', i:'fas fa-pen-nib', img: "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1200"},
        {id:'web', t:'صناعة المواقع', i:'fas fa-code', img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200"}
    ];
    grid.innerHTML = services.map(s => `
        <div class="service-card-wrapper" data-aos="fade-up">
            <div class="service-card" onclick="window.openService('${s.id}')">
                <img src="${s.img}" class="service-img">
                <div class="service-overlay-content"><i class="${s.i}"></i><h3>${s.t}</h3></div>
            </div>
        </div>`).join('');
};

window.openService = (id) => {
    const names = { video: 'مونتاج فيديو', graphic: 'تصميم جرافيكي', web: 'برمجة موقع' };
    document.getElementById('whatsapp-link').href = `https://wa.me/213555070548?text=طلب خدمة ${names[id]}`;
    document.getElementById('modal-content-dynamic').innerHTML = `<h3>طلب خدمة ${names[id]}</h3><p>تواصل معنا لتحديد التفاصيل.</p>`;
    document.getElementById('service-modal').classList.remove('hidden'); 
};

function showWinnerModal() {
    document.getElementById('modal-content-dynamic').innerHTML = `<div style="text-align:center;"><i class="fas fa-trophy" style="font-size:4rem; color:var(--gold);"></i><h1 class="gold-gradient">مبروك فزت!</h1><button onclick="window.open('https://wa.me/213555070548?text=فزت في القرعة')" class="gold-btn">استلام الهدية</button></div>`;
    document.getElementById('service-modal').classList.remove('hidden');
}

// --- التحقق من الجلسة عند التشغيل ---
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('ah_user_session');
    if (saved) {
        currentUserEmail = saved;
        if (saved === ADMIN_EMAIL.replace(/\./g, '_')) window.showAdmin();
        else enterSite();
    }
});
