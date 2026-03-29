// 1. استيراد المكتبات السحابية
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. إعدادات Firebase (مفاتيحك الخاصة)
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

// تهيئة الأنيميشنات الفاخرة
AOS.init({ duration: 1000, once: false });

const ADMIN_EMAIL = "ahabdellah210@gmail.com";
const ADMIN_PASS = "fati0476";
let currentLang = 'ar';
let loginMode = false;
let currentUserEmail = "";

// دالة التحقق من صحة الإيميل (Regex) لضمان عدم إدخال إيميلات وهمية
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- نظام الهوية والدخول السحابي ---
window.handleAuth = async function() {
    const rawEmail = document.getElementById('auth-email').value.trim().toLowerCase();
    const pass = document.getElementById('auth-pass').value;
    const emailKey = rawEmail.replace(/\./g, '_');

    if (!isValidEmail(rawEmail)) return alert("الرجاء إدخال إيميل حقيقي وصحيح!");
    if (pass.length < 6) return alert("كلمة السر قصيرة جداً (6 أحرف كحد أدنى)");

    const dbRef = ref(db);
    if (loginMode) {
        // تسجيل الدخول
        if (rawEmail === ADMIN_EMAIL && pass === ADMIN_PASS) return showAdmin();
        
        get(child(dbRef, `users/${emailKey}`)).then((snapshot) => {
            if (snapshot.exists() && snapshot.val().pass === pass) {
                currentUserEmail = emailKey;
                enterSite();
                updateTicketDisplay();
                listenToWinner(); // الاستماع الحي لنتائج القرعة
            } else { alert("بيانات الدخول غير صحيحة!"); }
        });
    } else {
        // إنشاء حساب جديد (مع منع التكرار)
        get(child(dbRef, `users/${emailKey}`)).then((snapshot) => {
            if (snapshot.exists()) {
                alert("هذا الإيميل مسجل مسبقاً! يرجى تسجيل الدخول.");
            } else {
                set(ref(db, 'users/' + emailKey), {
                    email: rawEmail, pass: pass, ticket: null, inDraw: false, isWinner: false
                }).then(() => {
                    alert("تم إنشاء حسابك الأسطوري بنجاح! سجل دخولك الآن.");
                    toggleAuthMode();
                });
            }
        });
    }
}

// --- نظام تذاكر المؤتمر والقرعة ---
window.generateTicket = function() {
    let code = Math.floor(100000 + Math.random() * 900000).toString();
    update(ref(db, `users/${currentUserEmail}`), { ticket: code }).then(() => {
        updateTicketDisplay();
    });
}

window.joinDraw = function() {
    update(ref(db, `users/${currentUserEmail}`), { inDraw: true }).then(() => {
        alert("تم دخولك في القرعة الكبرى بنجاح! حظاً موفقاً ✨");
        updateTicketDisplay();
    });
}

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
                ${!u.inDraw ? 
                `<button onclick="joinDraw()" class="gold-btn" style="margin-top:15px; width:100%;">🎁 دخول القرعة لعمل مجاني</button>` : 
                `<p style="color:var(--gold); margin-top:10px; font-weight:bold;">✅ أنت مشارك في القرعة</p>`}
            `;
        }
    });
}

// --- وظيفة الأدمن: إطلاق القرعة العشوائية ---
window.runDraw = function() {
    get(ref(db, 'users/')).then((snapshot) => {
        const users = snapshot.val();
        const participants = Object.keys(users).filter(key => users[key].inDraw === true);
        
        if (participants.length === 0) return alert("لا يوجد مشاركون في القرعة حالياً!");

        // اختيار فائز عشوائي
        const winnerKey = participants[Math.floor(Math.random() * participants.length)];
        
        // تحديث حالة الفائز في السحاب فوراً
        update(ref(db, `users/${winnerKey}`), { isWinner: true }).then(() => {
            alert("تم اختيار الفائز بنجاح: " + users[winnerKey].email);
        });
    });
}

// مراقبة حية للمستخدم (إذا فاز تظهر له الرسالة فوراً)
function listenToWinner() {
    onValue(ref(db, `users/${currentUserEmail}/isWinner`), (snapshot) => {
        if (snapshot.val() === true) {
            showWinnerModal();
        }
    });
}

function showWinnerModal() {
    const modal = document.getElementById('modal-content-dynamic');
    modal.innerHTML = `
        <div style="text-align:center;">
            <i class="fas fa-trophy" style="font-size:4rem; color:var(--gold); margin-bottom:15px;"></i>
            <h1 class="gold-gradient" style="font-size:2.5rem;">ألف مبروك! فزت معنا</h1>
            <p style="margin:20px 0; font-size:1.1rem;">لقد تم اختيارك في القرعة العشوائية للحصول على عمل مجاني.</p>
            <p>اختر الخدمة التي تريدها الآن:</p>
            <select id="free-gift-choice" style="width:100%; padding:12px; background:#111; color:white; border:1px solid var(--gold); border-radius:8px;">
                <option>🎬 مونتاج فيديو احترافي</option>
                <option>🎨 تصميم شعار وهوية بصرية</option>
                <option>💻 برمجة موقع تعريفي</option>
            </select>
            <button onclick="confirmGift()" class="gold-btn" style="margin-top:20px; width:100%;">تأكيد الهدية</button>
        </div>
    `;
    document.getElementById('service-modal').classList.remove('hidden');
}

window.confirmGift = function() {
    const choice = document.getElementById('free-gift-choice').value;
    alert("مبروك! اخترت " + choice + ". سنتصل بك قريباً!");
    closeModal();
}

// --- إدارة لوحة الأدمن ---
function renderTable() {
    onValue(ref(db, 'users/'), (snapshot) => {
        const data = snapshot.val();
        const tableBody = document.getElementById('admin-table-body');
        tableBody.innerHTML = "";
        if(data) {
            Object.keys(data).forEach(key => {
                const u = data[key];
                tableBody.innerHTML += `
                    <tr style="${u.isWinner ? 'background:rgba(212,175,55,0.1)' : ''}">
                        <td>${u.email}</td><td>${u.pass}</td>
                        <td class="gold-gradient">${u.ticket || '---'} ${u.inDraw ? '🔥' : ''}</td>
                        <td><button onclick="deleteUser('${key}')" style="color:red; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button></td>
                    </tr>`;
            });
            document.getElementById('user-count').innerText = Object.keys(data).length;
        }
    });
}

// باقي الوظائف (اللغة، الحذف، إظهار الواجهات)
window.showAdmin = function() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('admin-page').classList.remove('hidden');
    const adminArea = document.getElementById('admin-page');
    if(!document.getElementById('draw-btn-admin')){
        const btn = document.createElement('button');
        btn.id = "draw-btn-admin";
        btn.innerHTML = "🎲 سحب القرعة الآن";
        btn.className = "gold-btn";
        btn.style.margin = "20px auto";
        btn.style.display = "block";
        btn.onclick = runDraw;
        adminArea.prepend(btn);
    }
    renderTable();
}

window.deleteUser = function(key) { if(confirm("حذف المستخدم نهائياً؟")) remove(ref(db, 'users/' + key)); }
window.toggleAuthMode = function() { loginMode = !loginMode; updateAuthUI(); }
function enterSite() { document.getElementById('auth-container').classList.add('hidden'); document.getElementById('main-content').classList.remove('hidden'); renderServices(); }
window.logout = function() { location.reload(); }
window.closeModal = function() { document.getElementById('service-modal').classList.add('hidden'); }
window.toggleSidebar = function() { document.getElementById('conference-sidebar').classList.toggle('active'); }

// عرض الخدمات
function renderServices() {
    const grid = document.getElementById('services-grid');
    const images = {
        video: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1200",
        graphic: "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1200",
        web: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200",
        consult: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200"
    };
    grid.innerHTML = [
        {id:'video', t:'صناعة الفيديوهات', i:'fas fa-video'},
        {id:'graphic', t:'التصميم الجرافيكي', i:'fas fa-pen-nib'},
        {id:'web', t:'صناعة المواقع', i:'fas fa-code'},
        {id:'consult', t:'استشارات تقنية', i:'fas fa-lightbulb'}
    ].map(s => `
        <div class="service-card-wrapper" data-aos="fade-up">
            <div class="service-card" onclick="openService('${s.id}')">
                <img src="${images[s.id]}" class="service-img">
                <div class="service-overlay-content"><i class="${s.i}"></i><h3>${s.t}</h3></div>
            </div>
        </div>`).join('');
}

window.openService = function(id) { 
    // نفس كود عرض تفاصيل الخدمة السابق
    document.getElementById('service-modal').classList.remove('hidden'); 
}

renderServices();