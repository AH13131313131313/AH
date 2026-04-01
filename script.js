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
window.isValidEmail = function(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

window.logout = function() { 
    localStorage.removeItem('ah_user_session'); 
    location.reload(); 
};

window.closeModal = function() { 
    document.getElementById('service-modal').classList.add('hidden'); 
};

window.toggleSidebar = function() { 
    document.getElementById('conference-sidebar').classList.toggle('active'); 
};

window.toggleAuthMode = function() { 
    loginMode = !loginMode; 
    updateAuthUI(); 
};

function updateAuthUI() {
    const title = document.getElementById('auth-title');
    const link = document.getElementById('auth-link');
    const switchText = document.getElementById('auth-switch-text');
    if (loginMode) {
        title.innerText = "تسجيل الدخول";
        link.innerText = "إنشاء حساب";
        switchText.innerText = "ليس لديك حساب؟";
    } else {
        title.innerText = "إنشاء حساب جديد";
        link.innerText = "تسجيل الدخول";
        switchText.innerText = "لديك حساب بالفعل؟";
    }
}

// --- نظام الهوية والدخول ---
window.handleAuth = async function() {
    const rawEmail = document.getElementById('auth-email').value.trim().toLowerCase();
    const pass = document.getElementById('auth-pass').value;
    const emailKey = rawEmail.replace(/\./g, '_');

    if (!window.isValidEmail(rawEmail)) return alert("الرجاء إدخال إيميل حقيقي وصحيح!");
    if (pass.length < 6) return alert("كلمة السر قصيرة جداً (6 أحرف كحد أدنى)");

    const dbRef = ref(db);
    if (loginMode) {
        if (rawEmail === ADMIN_EMAIL && pass === ADMIN_PASS) {
            currentUserEmail = emailKey;
            localStorage.setItem('ah_user_session', emailKey);
            return window.showAdmin();
        }
        
        get(child(dbRef, `users/${emailKey}`)).then((snapshot) => {
            if (snapshot.exists() && snapshot.val().pass === pass) {
                currentUserEmail = emailKey;
                localStorage.setItem('ah_user_session', emailKey);
                enterSite();
            } else { alert("بيانات الدخول غير صحيحة!"); }
        });
    } else {
        get(child(dbRef, `users/${emailKey}`)).then((snapshot) => {
            if (snapshot.exists()) {
                alert("هذا الإيميل مسجل مسبقاً!");
            } else {
                set(ref(db, 'users/' + emailKey), {
                    email: rawEmail, pass: pass, ticket: null, inDraw: false, isWinner: false
                }).then(() => {
                    alert("تم إنشاء الحساب بنجاح!");
                    window.toggleAuthMode();
                });
            }
        });
    }
};

// --- إدارة لوحة الأدمن ---
function renderTable() {
    onValue(ref(db, 'users/'), (snapshot) => {
        const data = snapshot.val();
        const tableBody = document.getElementById('admin-table-body');
        if(!tableBody) return;
        tableBody.innerHTML = "";
        if(data) {
            Object.keys(data).forEach(key => {
                const u = data[key];
                tableBody.innerHTML += `<tr><td>${u.email}</td><td>${u.pass}</td><td class="gold-gradient">${u.ticket || '---'}</td><td><button onclick="deleteUser('${key}')" style="color:red; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button></td></tr>`;
            });
            document.getElementById('user-count').innerText = Object.keys(data).length;
        }
    });
}

window.showAdmin = function() {
    // 1. إظهار العناصر المخفية
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    document.getElementById('admin-page').classList.remove('hidden');
    
    // 2. تفعيل لوحة تحكم المعرض (CRITICAL FIX)
    const adminShowroom = document.getElementById('admin-showroom-controls');
    if(adminShowroom) {
        adminShowroom.classList.remove('hidden');
        adminShowroom.style.display = "block"; // تأكيد الظهور
    }

    const adminArea = document.getElementById('admin-page');
    if(!document.getElementById('draw-btn-admin')){
        const logoutBtn = document.createElement('button');
        logoutBtn.innerHTML = "🚪 تسجيل خروج الأدمن";
        logoutBtn.className = "gold-btn";
        logoutBtn.style.background = "red";
        logoutBtn.style.margin = "10px auto";
        logoutBtn.style.display = "block";
        logoutBtn.onclick = window.logout;
        adminArea.prepend(logoutBtn);

        const btn = document.createElement('button');
        btn.id = "draw-btn-admin";
        btn.innerHTML = "🎲 سحب القرعة الآن";
        btn.className = "gold-btn";
        btn.style.margin = "20px auto";
        btn.style.display = "block";
        btn.onclick = window.runDraw;
        adminArea.prepend(btn);
    }
    renderTable();
    window.listenToShowroom();
    window.renderServices();
};

window.deleteUser = function(key) { if(confirm("حذف المستخدم؟")) remove(ref(db, 'users/' + key)); };

// --- نظام التذاكر والقرعة ---
window.generateTicket = function() {
    let code = Math.floor(100000 + Math.random() * 900000).toString();
    update(ref(db, `users/${currentUserEmail}`), { ticket: code }).then(() => {
        updateTicketDisplay();
    });
};

window.joinDraw = function() {
    update(ref(db, `users/${currentUserEmail}`), { inDraw: true }).then(() => {
        alert("تم دخولك في القرعة بنجاح! ✨");
        updateTicketDisplay();
    });
};

function updateTicketDisplay() {
    get(child(ref(db), `users/${currentUserEmail}`)).then((snapshot) => {
        const u = snapshot.val();
        const area = document.getElementById('ticket-area');
        if (u && u.ticket) {
            area.innerHTML = `
                <div class="ticket-visual" data-aos="flip-up">
                    <div class="ticket-number">${u.ticket}</div>
                    <p style="margin:5px 0;">كود المؤتمر</p>
                </div>
                ${!u.inDraw ? `<button onclick="window.joinDraw()" class="gold-btn" style="margin-top:15px; width:100%;">🎁 دخول القرعة</button>` : `<p style="color:var(--gold); margin-top:10px; font-weight:bold;">✅ أنت مشارك</p>`}
            `;
        }
    });
}

window.runDraw = function() {
    get(ref(db, 'users/')).then((snapshot) => {
        const users = snapshot.val();
        if (!users) return;
        const participants = Object.keys(users).filter(key => users[key].inDraw === true);
        if (participants.length === 0) return alert("لا يوجد مشاركون!");
        const winnerKey = participants[Math.floor(Math.random() * participants.length)];
        update(ref(db, `users/${winnerKey}`), { isWinner: true }).then(() => {
            alert("تم اختيار الفائز: " + users[winnerKey].email);
        });
    });
};

window.listenToWinner = function() {
    onValue(ref(db, `users/${currentUserEmail}/isWinner`), (snapshot) => {
        if (snapshot.val() === true) showWinnerModal();
    });
};

function showWinnerModal() {
    const modal = document.getElementById('modal-content-dynamic');
    modal.innerHTML = `<div style="text-align:center;"><i class="fas fa-trophy" style="font-size:4rem; color:var(--gold);"></i><h1 class="gold-gradient">مبروك فزت!</h1><button onclick="window.confirmGift()" class="gold-btn" style="width:100%;">استلام الهدية</button></div>`;
    document.getElementById('service-modal').classList.remove('hidden');
}

window.confirmGift = function() {
    window.open(`https://wa.me/213555070548?text=${encodeURIComponent("فزت في القرعة!")}`, '_blank');
};

// --- قسم الخدمات والمعرض ---
window.renderServices = function() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;
    const services = [
        {id:'video', t:'صناعة الفيديوهات', i:'fas fa-video', img: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1200"},
        {id:'graphic', t:'التصميم الجرافيكي', i:'fas fa-pen-nib', img: "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1200"},
        {id:'web', t:'صناعة المواقع', i:'fas fa-code', img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200"},
        {id:'consult', t:'استشارات تقنية', i:'fas fa-lightbulb', img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200"}
    ];
    grid.innerHTML = services.map(s => `
        <div class="service-card-wrapper" data-aos="fade-up">
            <div class="service-card" onclick="window.openService('${s.id}')">
                <img src="${s.img}" class="service-img">
                <div class="service-overlay-content"><i class="${s.i}"></i><h3>${s.t}</h3></div>
            </div>
        </div>`).join('');
};

window.openService = function(id) { 
    const serviceNames = { video: 'مونتاج فيديو', graphic: 'تصميم جرافيكي', web: 'برمجة موقع', consult: 'استشارة تقنية' };
    const name = serviceNames[id];
    const msg = encodeURIComponent(`مرحباً AH، أود الاستفسار عن خدمة: ${name}`);
    document.getElementById('whatsapp-link').href = `https://wa.me/213555070548?text=${msg}`;
    document.getElementById('modal-content-dynamic').innerHTML = `<h3>طلب خدمة ${name}</h3><p>تواصل معنا لتحديد التفاصيل.</p>`;
    document.getElementById('service-modal').classList.remove('hidden'); 
};

window.listenToShowroom = function() {
    const showroomGrid = document.getElementById('showroom-grid');
    if (!showroomGrid) return;

    onValue(ref(db, 'showroom/'), (snapshot) => {
        const data = snapshot.val();
        showroomGrid.innerHTML = "";
        if (data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                const isAdmin = (currentUserEmail === ADMIN_EMAIL.replace(/\./g, '_'));
                showroomGrid.innerHTML += `
                    <div class="video-card-premium" data-aos="zoom-in" style="margin-bottom:20px; background:rgba(0,0,0,0.4); padding:10px; border-radius:15px;">
                        <video src="${item.videoUrl}" controls style="width:100%; border-radius:10px;"></video>
                        <div class="card-info-overlay" style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding:0 10px;">
                            <div><span class="gold-gradient" style="font-weight:bold;">${item.title}</span><p style="font-size:0.7rem; color:#aaa;">${item.category}</p></div>
                            <div style="display:flex; gap:15px; align-items:center;">
                                <a href="${item.videoUrl}" download style="color:var(--gold); font-size:1.2rem;"><i class="fas fa-download"></i></a>
                                ${isAdmin ? `<button onclick="window.deleteWork('${key}')" style="background:none; border:none; color:red; cursor:pointer;"><i class="fas fa-trash"></i></button>` : ''}
                            </div>
                        </div>
                    </div>`;
            });
        }
    });
};

window.addNewWork = function() {
    const title = document.getElementById('work-title').value;
    const urlInput = document.getElementById('work-url').value;
    const fileInput = document.getElementById('work-file-pc').files[0];
    const category = document.getElementById('work-category').value;

    if (!title) return alert("يرجى إدخال عنوان المشروع");

    const saveToDB = (videoPath) => {
        set(ref(db, 'showroom/' + Date.now()), { title, videoUrl: videoPath, category }).then(() => {
            alert("✅ تم رفع ونشر العمل بنجاح!");
            document.getElementById('work-title').value = "";
            document.getElementById('work-url').value = "";
            document.getElementById('work-file-pc').value = "";
        });
    };

    if (fileInput) {
        const reader = new FileReader();
        reader.onload = (e) => saveToDB(e.target.result);
        reader.readAsDataURL(fileInput);
    } else if (urlInput) {
        saveToDB(urlInput);
    } else {
        alert("يرجى وضع رابط فيديو أو اختيار ملف من الحاسوب");
    }
};

window.deleteWork = function(key) { if(confirm("حذف العمل؟")) remove(ref(db, 'showroom/' + key)); };

// --- بدء التشغيل ---
function enterSite() { 
    document.getElementById('auth-container').classList.add('hidden'); 
    document.getElementById('main-content').classList.remove('hidden'); 
    window.renderServices(); 
    window.listenToShowroom(); 
    updateTicketDisplay();
    window.listenToWinner();
}

window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('ah_user_session');
    if (savedUser) {
        currentUserEmail = savedUser;
        if (currentUserEmail === ADMIN_EMAIL.replace(/\./g, '_')) {
            window.showAdmin();
        } else {
            enterSite();
        }
    }
});