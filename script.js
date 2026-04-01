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
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    document.getElementById('admin-page').classList.remove('hidden');

    const adminShowroom = document.getElementById('admin-showroom-controls');
    if(adminShowroom) {
        adminShowroom.classList.remove('hidden');
        adminShowroom.style.display = "block";
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
                    <div class="video-card-premium" data-aos="zoom-in" style="margin-bottom:20px; background:rgba(255,255,255,0.05); padding:15px; border-radius:15px; border: 1px solid rgba(245,197,24,0.2);">
                        <video src="${item.videoUrl}" controls style="width:100%; border-radius:10px;"></video>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                            <div><span class="gold-gradient" style="font-weight:bold;">${item.title}</span><p style="font-size:0.7rem; color:#aaa;">${item.category}</p></div>
                            ${isAdmin ? `<button onclick="window.deleteWork('${key}')" style="background:none; border:none; color:red; cursor:pointer;"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </div>`;
            });
        }
    });
};

// --- نظام رفع الفيديوهات (الحل النهائي) ---
window.addNewWork = function() {
    const title = document.getElementById('work-title').value.trim();
    const category = document.getElementById('work-category').value;
    const urlInput = document.getElementById('work-url').value.trim();
    const fileInput = document.getElementById('work-file-pc').files[0];

    if (!title) return alert("يرجى إدخال عنوان المشروع");

    const saveToFirebase = (source) => {
        const newRef = ref(db, 'showroom/' + Date.now());
        set(newRef, { title, category, videoUrl: source })
            .then(() => {
                alert("✅ تم نشر العمل بنجاح وحفظه في السحاب!");
                document.getElementById('work-title').value = "";
                document.getElementById('work-url').value = "";
                document.getElementById('work-file-pc').value = "";
            })
            .catch(err => alert("خطأ في الحفظ: " + err.message));
    };

    if (fileInput) {
        const reader = new FileReader();
        alert("جاري تحويل الفيديو للحفظ.. انتظر قليلاً");
        reader.onload = (e) => saveToFirebase(e.target.result);
        reader.readAsDataURL(fileInput);
    } else if (urlInput) {
        saveToFirebase(urlInput);
    } else {
        alert("يرجى اختيار فيديو أو وضع رابط");
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
// دالة الرفع مع نسبة التحميل
const uploadTask = uploadBytesResumable(storageRef, file);
const progressCont = document.getElementById('upload-progress-container');
const progressBar = document.getElementById('upload-progress-bar');
const progressText = document.getElementById('upload-percentage');

progressCont.classList.remove('hidden');

uploadTask.on('state_changed', 
  (snapshot) => {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    progressBar.style.width = progress + '%';
    progressText.innerText = Math.round(progress) + '%';
  }, 
  (error) => { /* معالجة الخطأ */ }, 
  () => {
    // اكتمل التحميل - سجل البيانات في Firestore
    progressCont.classList.add('hidden');
    // أعد تصفير الشريط للعملية القادمة
    progressBar.style.width = '0%';
  }
);

// دالة الحذف
window.deleteWork = async function(docId, fileUrl) {
    if(confirm("هل أنت متأكد من حذف هذا العمل نهائياً؟")) {
        // 1. حذف من البيانات
        await deleteDoc(doc(db, "showroom", docId));
        // 2. إذا كان ملفاً مرفوعاً (ليس رابط خارجي) احذفه من Storage
        if(fileUrl.includes("firebasestorage")) {
             const fileRef = ref(storage, fileUrl);
             await deleteObject(fileRef);
        }
        alert("تم الحذف بنجاح");
    }
}
// دالة لجلب وعرض الأعمال في لوحة التحكم
function loadAdminWorks() {
    const adminList = document.getElementById('admin-works-list');
    
    // استبدل 'showroom' باسم الـ Collection عندك
    onSnapshot(collection(db, "showroom"), (snapshot) => {
        adminList.innerHTML = ''; // تفريغ القائمة قبل التحديث
        
        if (snapshot.empty) {
            adminList.innerHTML = '<p style="color: #555; text-align: center;">لا توجد أعمال منشورة حالياً.</p>';
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const workId = doc.id;

            const item = document.createElement('div');
            item.className = 'admin-work-item'; // تأكد من إضافة تنسيق لها في CSS
            item.style = "display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; border: 1px solid #333; margin-bottom: 5px;";
            
            item.innerHTML = `
                <div style="text-align: right;">
                    <span style="color: var(--gold); font-weight: bold;">${data.title}</span>
                    <br>
                    <small style="color: #888;">${data.category}</small>
                </div>
                <button onclick="window.deleteWork('${workId}', '${data.url}')" style="background: #ff4d4d; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-trash"></i> حذف
                </button>
            `;
            adminList.appendChild(item);
        });
    });
}
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AH Dynamics | Enterprise Edition 2026</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Orbitron:wght@400;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
    <script type="module" src="script.js"></script>
</head>
<body>

    <div class="video-background">
        <video autoplay loop muted playsinline id="bg-video">
            <source src="https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-digital-connection-background-48768-large.mp4" type="video/mp4">
        </video>
        <div class="video-overlay-main"></div>
        <div class="video-overlay-grid"></div>
    </div>

    <div class="lang-container">
        <button class="lang-switch-btn" onclick="window.toggleLanguage ? window.toggleLanguage() : null">
            <i class="fas fa-globe"></i>
            <span id="lang-btn-text">English</span>
        </button>
    </div>

    <div id="auth-container" class="full-screen-center">
        <div class="auth-card" data-aos="zoom-out-up" data-aos-duration="1500">
            <div class="auth-header">
                <div class="glitch-wrapper">
                    <h1 class="logo-text-large" data-text="AH">AH</h1>
                </div>
                <p class="logo-subtext">DYNAMICS GLOBAL</p>
            </div>
            
            <div class="auth-body">
                <h2 id="auth-title">إنشاء حساب جديد</h2>
                <div class="input-group">
                    <input type="email" id="auth-email" required>
                    <label>البريد الإلكتروني</label>
                    <i class="fas fa-envelope"></i>
                </div>
                <div class="input-group">
                    <input type="password" id="auth-pass" required>
                    <label>كلمة المرور</label>
                    <i class="fas fa-lock"></i>
                </div>
                <button class="main-submit-btn" id="auth-btn-main" onclick="window.handleAuth()">
                    <span class="btn-text">تأكيد العملية</span>
                    <div class="btn-reflection"></div>
                </button>
            </div>

            <div class="auth-footer">
                <p id="auth-switch-text">لديك حساب بالفعل؟</p>
                <a href="javascript:void(0)" onclick="window.toggleAuthMode()" id="auth-link">تسجيل الدخول</a>
            </div>
        </div>
    </div>

    <div id="main-content" class="hidden">
        <nav class="navbar-glass">
            <div class="nav-logo">AH <span class="gold-gradient">DYNAMICS</span></div>
            <div class="nav-links">
                <a href="#showroom-section" class="conference-launcher" style="text-decoration: none; margin-left: 10px; background: rgba(245, 197, 24, 0.1); border: 1px solid var(--gold);">
                    <i class="fas fa-play-circle"></i>
                    <span>المعرض</span>
                </a>
                <button class="conference-launcher pulse" onclick="window.toggleSidebar()">
                    <i class="fas fa-ticket-alt"></i>
                    <span id="nav-conf-text">مؤتمر AH</span>
                </button>
                <button class="exit-btn" onclick="window.logout()"><i class="fas fa-power-off"></i></button>
            </div>
        </nav>

        <div id="conference-sidebar" class="sidebar-wrapper">
            <div class="sidebar-blur-bg" onclick="window.toggleSidebar()"></div>
            <div class="sidebar-panel">
                <button class="sidebar-close" onclick="window.toggleSidebar()">&times;</button>
                <div class="sidebar-inner">
                    <div class="conf-icon"><i class="fas fa-microchip"></i></div>
                    <h2 id="side-title" class="gold-gradient">مؤتمر AH السنوي</h2>
                    <p id="side-desc">انضم لنخبة المطورين والمصممين في الحدث الأبرز لهذا العام.</p>
                    <div id="ticket-area" class="ticket-status-container">
                        <button class="ticket-gen-btn" id="reg-conf-btn" onclick="window.generateTicket()">
                            اشترك الآن واحصل على كودك
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <header class="hero-center">
            <div class="hero-content" data-aos="fade-up" data-aos-duration="1200">
                <h1 id="hero-title">وكالة <span class="gold-gradient">AH</span> العالمية</h1>
                <div class="hero-line"></div>
                <p id="hero-desc">نحن لا نصمم فقط، نحن نبني تجارب رقمية تترك أثراً عالمياً.</p>
            </div>
        </header>

        <div class="services-grid-container" id="services-grid"></div>

        <section id="showroom-section" class="showroom-container" style="padding: 80px 5%; text-align: center;" data-aos="fade-up">
            <h2 class="gold-gradient" style="font-size: 2.5rem; margin-bottom: 10px;">AH SHOWROOM</h2>
            <p style="color: #888; margin-bottom: 40px;">استكشف أحدث أعمالنا في المونتاج والتصميم</p>
            <div id="showroom-grid" class="services-grid-container"></div>
        </section>

        <footer class="mini-footer">
            <p>&copy; 2026 AH DYNAMICS. ALL RIGHTS RESERVED.</p>
        </footer>
    </div>

    <div id="service-modal" class="modal-backdrop hidden">
        <div class="modal-content-wrapper">
            <div class="modal-card-premium">
                <button class="modal-close-btn" onclick="window.closeModal()">&times;</button>
                <div id="modal-content-dynamic"></div>
                <div class="modal-actions">
                    <a id="whatsapp-link" href="#" target="_blank" class="whatsapp-btn">
                        <i class="fab fa-whatsapp"></i>
                        <span id="wa-label">تواصل معنا واتساب: 0555070548</span>
                    </a>
                </div>
            </div>
        </div>
    </div>

    <div id="admin-page" class="hidden admin-interface">
        <div class="admin-header">
            <h1>CONTROL <span class="gold-gradient">PANEL</span></h1>
            <button class="admin-exit" style="background: var(--gold); color: black;" onclick="document.getElementById('showroom-section').scrollIntoView({behavior:'smooth'})">
                <i class="fas fa-film"></i> العودة للموقع
            </button>
        </div>

        <div class="admin-stats">
            <div class="stat-card">إجمالي المستخدمين: <span id="user-count">0</span></div>
            <div class="stat-card">الوضع: <span class="gold-gradient">مسؤول النظام</span></div>
        </div>

        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>المستخدم (Email)</th>
                        <th>كلمة المرور (Pass)</th>
                        <th>كود المؤتمر (Code)</th>
                        <th>التحكم (Control)</th>
                    </tr>
                </thead>
                <tbody id="admin-table-body"></tbody>
            </table>
        </div>

        <div class="admin-card" style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; border: 1px solid var(--gold); margin-top: 30px; backdrop-filter: blur(15px);">
            <h3 style="color: #f5c518; margin-bottom: 20px; text-align: center;">
                <i class="fas fa-plus-circle"></i> إضافة وإدارة أعمال المعرض
            </h3>

            <div style="display: flex; flex-direction: column; gap: 15px; text-align: right; border-bottom: 1px solid #333; padding-bottom: 30px; margin-bottom: 30px;">
                <label>اسم المشروع / الفيديو:</label>
                <input type="text" id="work-title" placeholder="مثال: مونتاج احترافي 2026" style="width: 100%; padding: 12px; border-radius: 8px; background: #000; color: white; border: 1px solid #333; outline: none;">

                <label>تصنيف العمل:</label>
                <select id="work-category" style="width: 100%; padding: 12px; border-radius: 8px; background: #000; color: white; border: 1px solid #333;">
                    <option value="🎬 مونتاج فيديو">🎬 مونتاج فيديو</option>
                    <option value="🎨 تصميم جرافيكي">🎨 تصميم جرافيكي</option>
                    <option value="💻 برمجة مواقع">💻 برمجة مواقع</option>
                </select>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
                    <div style="border: 1px dashed #555; padding: 15px; border-radius: 10px; background: rgba(255,255,255,0.02); text-align: center;">
                        <p style="font-size: 0.8rem; color: #aaa; margin-bottom: 10px;">رفع من الحاسوب</p>
                        <input type="file" id="work-file-pc" accept="video/*" style="font-size: 0.7rem; color: #ccc; width: 100%;">
                    </div>
                    <div style="border: 1px dashed #555; padding: 15px; border-radius: 10px; background: rgba(255,255,255,0.02); text-align: center;">
                        <p style="font-size: 0.8rem; color: #aaa; margin-bottom: 10px;">أو ضع رابط فيديو</p>
                        <input type="text" id="work-url" placeholder="https://..." style="width: 100%; padding: 8px; border-radius: 5px; background: #000; border: 1px solid #444; color: white;">
                    </div>
                </div>

                <div id="upload-progress-container" class="hidden" style="margin-top: 15px; background: #111; border-radius: 10px; height: 20px; overflow: hidden; position: relative; border: 1px solid #333;">
                    <div id="upload-progress-bar" style="width: 0%; height: 100%; background: var(--gold); transition: width 0.3s ease;"></div>
                    <span id="upload-percentage" style="position: absolute; width: 100%; text-align: center; left: 0; font-size: 0.7rem; color: #fff; line-height: 20px; font-weight: bold;">0%</span>
                </div>

                <button onclick="window.addNewWork()" id="publish-btn" style="width: 100%; padding: 15px; background: linear-gradient(45deg, #f5c518, #ffecb3); color: black; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; margin-top: 10px;">
                    🚀 نشر العمل الآن
                </button>
            </div>

            <h4 style="color: #fff; margin-bottom: 15px;"><i class="fas fa-list"></i> قائمة الأعمال المنشورة:</h4>
            <div id="admin-works-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto; padding-left: 5px;">
                <p style="color: #555; text-align: center;">جاري تحميل القائمة...</p>
            </div>
        </div>
    </div>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script>AOS.init();</script>
</body>
</html>
// استيراد الدوال اللازمة من Firebase (تأكد من وجودها في أعلى الملف)
// import { doc, deleteDoc, onSnapshot, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. دالة لجلب الأعمال وعرضها في قائمة الحذف تلقائياً
window.loadAdminInventory = function() {
    const adminList = document.getElementById('admin-works-list');
    
    // الاستماع للتغييرات في قاعدة البيانات لحظياً
    onSnapshot(collection(db, "showroom"), (snapshot) => {
        adminList.innerHTML = ''; // تفريغ القائمة الحالية

        if (snapshot.empty) {
            adminList.innerHTML = '<p style="color: #555; text-align: center; padding: 20px;">لا توجد أعمال لعرضها.</p>';
            return;
        }

        snapshot.forEach((documentSnapshot) => {
            const work = documentSnapshot.data();
            const id = documentSnapshot.id;

            const item = document.createElement('div');
            item.style = "display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border: 1px solid #222; margin-bottom: 10px;";
            
            item.innerHTML = `
                <div style="text-align: right;">
                    <strong style="color: var(--gold); display: block;">${work.title || 'بدون عنوان'}</strong>
                    <small style="color: #777;">${work.category || 'عام'}</small>
                </div>
                <button onclick="window.confirmDelete('${id}')" style="background: #ff4d4d; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-size: 0.8rem; transition: 0.3s;">
                    <i class="fas fa-trash-alt"></i> حذف نهائي
                </button>
            `;
            adminList.appendChild(item);
        });
    });
};

// 2. دالة التأكيد والحذف الفعلية
window.confirmDelete = async function(docId) {
    if (confirm("هل أنت متأكد من حذف هذا العمل؟ سيختفي من المعرض فوراً.")) {
        try {
            // حذف البيانات من Firestore
            await deleteDoc(doc(db, "showroom", docId));
            alert("تم الحذف بنجاح!");
        } catch (error) {
            console.error("خطأ أثناء الحذف:", error);
            alert("حدث خطأ، تأكد من صلاحيات Firebase (Rules)");
        }
    }
};

// تشغيل الدالة عند تحميل الصفحة للتأكد من ظهور القائمة
window.loadAdminInventory();
