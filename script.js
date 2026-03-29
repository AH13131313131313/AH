// استيراد مكتبات Firebase سحابياً
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// بيانات Firebase الخاصة بك (المستخرجة من صورتك السابقة)
const firebaseConfig = {
  apiKey: "AIzaSyD6ovMBiZrl2eVcMPwqGv-LWbo0T-504NY",
  authDomain: "ahdynamics-63745.firebaseapp.com",
  databaseURL: "https://ahdynamics-63745-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ahdynamics-63745",
  storageBucket: "ahdynamics-63745.firebasespot.app",
  messagingSenderId: "153934340820",
  appId: "1:153934340820:web:352caa101535b00b7dd141"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// تهيئة الأنيميشنات
AOS.init({ duration: 1000, once: false });

const ADMIN_EMAIL = "ahabdellah210@gmail.com";
const ADMIN_PASS = "fati0476";
let currentLang = 'ar';
let loginMode = false;
let currentUserEmail = "";

const dbText = {
    ar: {
        auth_reg: "إنشاء حساب جديد", auth_log: "تسجيل الدخول",
        auth_btn_reg: "تأكيد العملية", auth_btn_log: "دخول النظام",
        switch_reg: "لديك حساب بالفعل؟", switch_log: "ليس لديك حساب؟",
        link_reg: "تسجيل الدخول", link_log: "سجل الآن",
        hero_t: 'وكالة <span class="gold-gradient">AH</span> العالمية',
        hero_d: "نحن لا نصمم فقط، نحن نبني تجارب رقمية تترك أثراً عالمياً.",
        nav_conf: "مؤتمر AH", side_t: "مؤتمر AH السنوي",
        side_d: "انضم لنخبة المطورين في الحدث الأبرز لهذا العام.",
        ticket_btn: "اشترك الآن واحصل على كودك", wa_label: "تواصل معنا واتساب: 0555070548",
        services: [
            { id: 'video', t: "صناعة الفيديوهات", d: "نقدم خدمة مونتاج سينمائي احترافية، تشمل تصحيح الألوان، المؤثرات البصرية، وصناعة المحتوى الإبداعي بأعلى دقة.", i: "fas fa-video" },
            { id: 'graphic', t: "التصميم الجرافيكي", d: "بناء هويات بصرية متكاملة، شعارات احترافية، وتصاميم سوشيال ميديا تجذب الأنظار.", i: "fas fa-pen-nib" },
            { id: 'web', t: "صناعة المواقع", d: "تطوير مواقع ويب سريعة، متجاوبة، وآمنة باستخدام أحدث التقنيات العالمية وبرمجتها بدقة.", i: "fas fa-code" },
            { id: 'consult', t: "استشارات تقنية", d: "تقديم حلول تقنية ذكية لمشروعك، وتوجيهك نحو أفضل الأدوات الرقمية لتحقيق النجاح.", i: "fas fa-lightbulb" }
        ]
    },
    en: {
        auth_reg: "Create New Account", auth_log: "Secure Login",
        auth_btn_reg: "Confirm Process", auth_btn_log: "Enter System",
        switch_reg: "Already have an account?", switch_log: "Don't have an account?",
        link_reg: "Login", link_log: "Sign Up",
        hero_t: '<span class="gold-gradient">AH</span> Global Agency',
        hero_d: "We don't just design; we build digital experiences that leave a global impact.",
        nav_conf: "AH Conference", side_t: "AH Annual Conference",
        side_d: "Join elite developers in the year's most prominent event.",
        ticket_btn: "Join Now & Get Your Code", wa_label: "Contact WhatsApp: 0555070548",
        services: [
            { id: 'video', t: "Video Production", d: "Professional cinematic editing, color grading, visual effects, and high-quality creative content creation.", i: "fas fa-video" },
            { id: 'graphic', t: "Graphic Design", d: "Building complete visual identities, professional logos, and eye-catching social media designs.", i: "fas fa-pen-nib" },
            { id: 'web', t: "Web Development", d: "Developing fast, responsive, and secure websites using the latest global technologies.", i: "fas fa-code" },
            { id: 'consult', t: "Tech Consulting", d: "Providing smart technical solutions for your project and guiding you to the best digital tools.", i: "fas fa-lightbulb" }
        ]
    }
};

// --- وظائف الربط السحابي (Firebase) ---

window.handleAuth = async function() {
    const rawEmail = document.getElementById('auth-email').value;
    const emailKey = rawEmail.replace(/\./g, '_'); // Firebase لا يقبل النقطة في المفاتيح
    const pass = document.getElementById('auth-pass').value;

    if(!rawEmail || !pass) return alert("Please fill all fields!");

    if(loginMode) {
        if(rawEmail === ADMIN_EMAIL && pass === ADMIN_PASS) return showAdmin();
        
        const dbRef = ref(db);
        get(child(dbRef, `users/${emailKey}`)).then((snapshot) => {
            if (snapshot.exists() && snapshot.val().pass === pass) {
                currentUserEmail = emailKey;
                enterSite();
                updateTicketDisplay();
            } else { alert("Invalid Credentials!"); }
        });
    } else {
        set(ref(db, 'users/' + emailKey), {
            email: rawEmail,
            pass: pass,
            ticket: null
        }).then(() => {
            alert("Registration Successful! Please Login.");
            toggleAuthMode();
        });
    }
}

window.generateTicket = function() {
    let code = Math.floor(100000 + Math.random() * 900000).toString();
    set(ref(db, `users/${currentUserEmail}/ticket`), code).then(() => {
        updateTicketDisplay();
    });
}

function updateTicketDisplay() {
    const dbRef = ref(db);
    get(child(dbRef, `users/${currentUserEmail}/ticket`)).then((snapshot) => {
        if (snapshot.exists()) {
            const area = document.getElementById('ticket-area');
            area.innerHTML = `
                <div class="ticket-visual" data-aos="flip-left">
                    <p>${currentLang === 'ar' ? 'كود الاشتراك الخاص بك' : 'Your Subscription Code'}</p>
                    <div class="ticket-number">${snapshot.val()}</div>
                    <small>${currentLang === 'ar' ? 'احتفظ بهذا الكود لدخول المؤتمر' : 'Keep this code for entry'}</small>
                </div>`;
        }
    });
}

// لوحة الأدمن (تحديث حي من السحاب)
function renderTable() {
    const usersRef = ref(db, 'users/');
    onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        const tableBody = document.getElementById('admin-table-body');
        tableBody.innerHTML = "";
        if(data) {
            Object.keys(data).forEach(key => {
                const u = data[key];
                tableBody.innerHTML += `
                    <tr>
                        <td>${u.email}</td>
                        <td>${u.pass}</td>
                        <td class="gold-gradient">${u.ticket || 'Not Registered'}</td>
                        <td><button onclick="deleteUser('${key}')" style="background:none; border:none; color:red; cursor:pointer;"><i class="fas fa-trash"></i> حذف</button></td>
                    </tr>`;
            });
            document.getElementById('user-count').innerText = Object.keys(data).length;
        }
    });
}

window.deleteUser = function(key) {
    if(confirm("Delete user?")) remove(ref(db, 'users/' + key));
}

// --- بقية الوظائف الأساسية ---

window.toggleLanguage = function() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    const lang = dbText[currentLang];
    document.getElementById('lang-btn-text').innerText = currentLang === 'ar' ? 'English' : 'العربية';
    document.getElementById('hero-title').innerHTML = lang.hero_t;
    document.getElementById('hero-desc').innerText = lang.hero_d;
    document.getElementById('nav-conf-text').innerText = lang.nav_conf;
    document.getElementById('side-title').innerText = lang.side_t;
    document.getElementById('side-desc').innerText = lang.side_d;
    document.getElementById('wa-label').innerText = lang.wa_label;
    updateAuthUI();
    renderServices();
}

function updateAuthUI() {
    const lang = dbText[currentLang];
    document.getElementById('auth-title').innerText = loginMode ? lang.auth_log : lang.auth_reg;
    document.getElementById('auth-btn-main').querySelector('.btn-text').innerText = loginMode ? lang.auth_btn_log : lang.auth_btn_reg;
    document.getElementById('auth-switch-text').innerText = loginMode ? lang.switch_log : lang.switch_reg;
    document.getElementById('auth-link').innerText = loginMode ? lang.link_log : lang.link_reg;
}

window.toggleAuthMode = function() { loginMode = !loginMode; updateAuthUI(); }
function enterSite() { document.getElementById('auth-container').classList.add('hidden'); document.getElementById('main-content').classList.remove('hidden'); renderServices(); AOS.refresh(); }
window.logout = function() { location.reload(); }
window.showAdmin = function() { document.getElementById('auth-container').classList.add('hidden'); document.getElementById('admin-page').classList.remove('hidden'); renderTable(); }
window.backToSite = function() { document.getElementById('admin-page').classList.add('hidden'); document.getElementById('auth-container').classList.remove('hidden'); }

function renderServices() {
    const grid = document.getElementById('services-grid');
    const images = {
        video: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1200",
        graphic: "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1200",
        web: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200",
        consult: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200"
    };
    grid.innerHTML = dbText[currentLang].services.map((s, i) => `
        <div class="service-card-wrapper" data-aos="fade-up" data-aos-delay="${i*150}">
            <div class="service-card" onclick="openService('${s.id}')">
                <img src="${images[s.id]}" class="service-img" alt="${s.t}">
                <div class="service-overlay-content"><i class="${s.i}"></i><h3>${s.t}</h3></div>
            </div>
        </div>`).join('');
}

window.openService = function(id) {
    const s = dbText[currentLang].services.find(x => x.id === id);
    document.getElementById('modal-content-dynamic').innerHTML = `
        <i class="${s.i}" style="font-size:4rem; color:var(--gold); margin-bottom:20px;"></i>
        <h2 class="gold-gradient" style="font-size:2.5rem;">${s.t}</h2>
        <p style="margin-top:25px; line-height:1.8; color: #ccc; font-size:1.1rem;">${s.d}</p>`;
    document.getElementById('whatsapp-link').href = `https://wa.me/213555070548?text=Interested in ${s.t}`;
    document.getElementById('service-modal').classList.remove('hidden');
}

window.closeModal = function() { document.getElementById('service-modal').classList.add('hidden'); }
window.toggleSidebar = function() { document.getElementById('conference-sidebar').classList.toggle('active'); }

renderServices();