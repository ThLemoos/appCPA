
/* =====================================================
   1) COLE AQUI A CONFIGURAÇÃO DO SEU FIREBASE (veja LEIAME.md)
   ===================================================== */
const firebaseConfig = {
    apiKey: "AIzaSyBebkVHFUV5kF0J5FDWP-mvi8W18bioRzs",
    authDomain: "appcpa-fbdc9.firebaseapp.com",
    projectId: "appcpa-fbdc9",
    storageBucket: "appcpa-fbdc9.firebasestorage.app",
    messagingSenderId: "479015093779",
    appId: "1:479015093779:web:ca850dcc15b8417ad721e6"
};

const V = "10.14.1";
const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
const A = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
const F = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);

const app = initializeApp(firebaseConfig);
const auth = A.getAuth(app);
const db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });

const TOPICS = ["Sistema Financeiro Nacional", "Ética e regulação", "Princípios de investimento", "Economia e finanças", "Estatística", "Matemática financeira", "Renda fixa", "Renda variável", "Fundos de investimento", "Derivativos", "Previdência", "Tributação", "Risco e compliance", "Outro"];
const $ = id => document.getElementById(id);
const esc = s => (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let notes = [], tab = "todos", editing = null, unsub = null, fav = false;

TOPICS.forEach(t => { $("fTopic").add(new Option(t, t)); $("fTopicSel").add(new Option(t, t)); });

function toast(m) { const t = document.createElement("div"); t.className = "toast"; t.textContent = m; document.body.append(t); setTimeout(() => t.remove(), 2000); }

/* ---------- Login ---------- */
const loginErr = e => $("loginErr").textContent = ({
    "auth/invalid-credential": "E-mail ou senha incorretos.", "auth/email-already-in-use": "Este e-mail já tem conta. Use Entrar.",
    "auth/weak-password": "A senha precisa de pelo menos 6 caracteres.", "auth/invalid-email": "E-mail inválido.",
    "auth/popup-closed-by-user": "Login cancelado.", "auth/unauthorized-domain": "Domínio não autorizado no Firebase (veja o LEIAME)."
}[e.code] || ("Erro: " + (e.code || e.message)));

$("gBtn").onclick = async () => { try { await A.signInWithPopup(auth, new A.GoogleAuthProvider()); } catch (e) { loginErr(e); } };
$("inBtn").onclick = async () => { try { await A.signInWithEmailAndPassword(auth, $("email").value, $("pass").value); } catch (e) { loginErr(e); } };
$("upBtn").onclick = async () => { try { await A.createUserWithEmailAndPassword(auth, $("email").value, $("pass").value); } catch (e) { loginErr(e); } };
$("outBtn").onclick = () => A.signOut(auth);

A.onAuthStateChanged(auth, user => {
    if (unsub) { unsub(); unsub = null; }
    $("login").classList.toggle("hidden", !!user);
    $("app").classList.toggle("hidden", !user);
    if (!user) return;
    const q = F.query(F.collection(db, "users", user.uid, "notes"), F.orderBy("updatedAt", "desc"));
    unsub = F.onSnapshot(q, { includeMetadataChanges: true }, snap => {
        notes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        $("sync").textContent = snap.metadata.hasPendingWrites ? "● salvando…" : (snap.metadata.fromCache ? "● offline" : "● sincronizado");
        render();
    }, e => toast("Erro ao sincronizar: " + e.code));
});

/* ---------- Lista ---------- */
function render() {
    const q = $("q").value.toLowerCase(), topic = $("fTopic").value;
    const out = notes.filter(n =>
        (tab === "todos" || (tab === "fav" ? n.fav : n.type === tab)) &&
        (!topic || n.topic === topic) &&
        (!q || [n.title, n.text, (n.tags || []).join(" ")].join(" ").toLowerCase().includes(q)));
    $("empty").classList.toggle("hidden", out.length > 0);
    $("list").innerHTML = out.map(n => `
    <article class="note ${n.type === "resumo" ? "resumo" : ""}" data-id="${n.id}" tabindex="0">
      <h3>${n.fav ? "★ " : ""}${esc(n.title)}</h3>
      <div class="meta"><span class="chip">${n.type === "resumo" ? "Resumo" : "Anotação"}</span><span class="chip">${esc(n.topic)}</span>${n.time ? `<span class="chip">⏱ ${esc(n.time)}</span>` : ""}${(n.tags || []).map(t => `<span class="chip">#${esc(t)}</span>`).join("")}</div>
      <p>${esc(n.text)}</p>
    </article>`).join("");
}
$("q").oninput = render; $("fTopic").onchange = render;
$("tabs").onclick = e => { const b = e.target.closest(".tab"); if (!b) return; tab = b.dataset.t; document.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-pressed", x === b)); render(); };
$("list").onclick = e => { const c = e.target.closest(".note"); if (c) openEditor(notes.find(n => n.id === c.dataset.id)); };
$("list").onkeydown = e => { if (e.key === "Enter") e.target.click(); };

/* ---------- Editor ---------- */
function setFav(v) { fav = v; $("favBtn").textContent = v ? "★ Favorito" : "☆ Favoritar"; }
function openEditor(n) {
    editing = n || null;
    $("fTitle").value = n?.title || ""; $("fType").value = n?.type || "anotacao";
    $("fTopicSel").value = n?.topic || $("fTopic").value || TOPICS[0];
    $("fUrl").value = n?.url || ""; $("fTime").value = n?.time || ""; $("fText").value = n?.text || "";
    $("fTags").value = (n?.tags || []).join(", "); setFav(!!n?.fav);
    $("delBtn").classList.toggle("hidden", !n);
    $("dlg").showModal(); $("fTitle").focus();
}
$("newBtn").onclick = () => openEditor(null);
$("cancelBtn").onclick = () => $("dlg").close();
$("favBtn").onclick = () => setFav(!fav);
$("openBtn").onclick = () => {
    const u = $("fUrl").value.trim(); if (!u) return toast("Cole o link do vídeo primeiro");
    const t = $("fTime").value.trim().split(":").map(Number).filter(x => !isNaN(x));
    const s = t.length === 3 ? t[0] * 3600 + t[1] * 60 + t[2] : t.length === 2 ? t[0] * 60 + t[1] : t.length === 1 ? t[0] * 60 : 0;
    let url = u; try { const x = new URL(u); if (s) x.searchParams.set("t", s + "s"); url = x.href; } catch { }
    window.open(url, "_blank", "noopener");
};
$("form").onsubmit = async e => {
    e.preventDefault();
    const uid = auth.currentUser.uid;
    const data = {
        title: $("fTitle").value.trim(), type: $("fType").value, topic: $("fTopicSel").value,
        url: $("fUrl").value.trim(), time: $("fTime").value.trim(), text: $("fText").value,
        tags: $("fTags").value.split(",").map(t => t.trim()).filter(Boolean), fav,
        updatedAt: F.serverTimestamp()
    };
    $("dlg").close();
    try {
        if (editing) await F.updateDoc(F.doc(db, "users", uid, "notes", editing.id), data);
        else await F.addDoc(F.collection(db, "users", uid, "notes"), { ...data, createdAt: F.serverTimestamp() });
        toast("Salvo");
    } catch (err) { toast("Erro ao salvar: " + err.code); }
};
$("delBtn").onclick = async () => {
    if (!confirm("Excluir esta nota?")) return;
    $("dlg").close();
    await F.deleteDoc(F.doc(db, "users", auth.currentUser.uid, "notes", editing.id)); toast("Excluído");
};

/* ---------- Backup ---------- */
$("exportBtn").onclick = () => {
    const rows = notes.map(({ id, ...n }) => ({ ...n, createdAt: n.createdAt?.toDate?.().toISOString(), updatedAt: n.updatedAt?.toDate?.().toISOString() }));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }));
    a.download = "cpa-notas-backup.json"; a.click();
};

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
