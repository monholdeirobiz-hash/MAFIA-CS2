
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, getDocs, addDoc, setDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./style.css";

const cfg = {
 apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
 authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
 projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
 storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
 messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
 appId: import.meta.env.VITE_FIREBASE_APP_ID
};
const app = initializeApp(cfg), auth = getAuth(app), db = getFirestore(app), storage = getStorage(app);
const provider = new GoogleAuthProvider();
const ADMINS = ["monholdeirobiz@gmail.com","tsenguunnnee@gmail.com"];
let currentUser=null, teams=[], players=[], news=[], settings={}, page="home", editingPlayer=null, editingTeam=null;
const $=s=>document.querySelector(s), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const isAdmin=()=>!!currentUser&&ADMINS.includes(currentUser.email?.toLowerCase());
const teamName=id=>teams.find(t=>t.id===id)?.name||"Free Agent";
const placeholder="https://placehold.co/640x400/171c26/e32935?text=MAFIA+CS2";
async function load(){
 const [t,p,n,s]=await Promise.all([
  getDocs(collection(db,"teams")),getDocs(collection(db,"players")),
  getDocs(query(collection(db,"news"),orderBy("createdAt","desc"))),getDocs(collection(db,"settings"))
 ]);
 teams=t.docs.map(x=>({id:x.id,...x.data()}));players=p.docs.map(x=>({id:x.id,...x.data()}));news=n.docs.map(x=>({id:x.id,...x.data()}));
 settings=Object.fromEntries(s.docs.map(x=>[x.id,x.data()]));
 render();
}
function shell(){ $("#app").innerHTML=`
 <header><div class="bar"><a class="logo" href="#" data-page="home">MAFIA<span> CS2</span></a><div id="auth-area"></div></div>
 <nav>${["home","teams","players","rankings","news","profile","admin"].map(x=>`<button data-page="${x}">${({home:"HOME",teams:"TEAMS",players:"PLAYERS",rankings:"RANKINGS",news:"NEWS",profile:"MY PROFILE",admin:"ADMIN"})[x]}</button>`).join("")}</nav></header>
 <main id="view"></main><footer>MAFIA CS2 · COUNTER-STRIKE 2 COMMUNITY</footer>`;
 document.querySelectorAll("[data-page]").forEach(b=>b.onclick=e=>{e.preventDefault();page=b.dataset.page;render()});
}
function playerCard(p){return `<article class="card"><img class="playerpic" src="${esc(p.photoURL||placeholder)}"><div class="pad"><h3>${esc(p.displayName||"Player")}</h3><p class="muted">${esc(teamName(p.teamId))} · ${esc(p.country||"—")}</p><div class="chips"><span>Rank #${p.rank||"—"}</span><span>★ ${p.rating??"—"}</span></div><button class="secondary" data-player="${p.id}">VIEW PROFILE</button></div></article>`}
function teamCard(t){return `<article class="card pad"><div class="teamhead"><img class="teamlogo" src="${esc(t.logoURL||placeholder)}"><div><h3>${esc(t.name)}</h3><p class="muted">${players.filter(p=>p.teamId===t.id).length} players</p></div></div><div class="rankgrid"><span>Valve <b>#${t.valveRank||"—"}</b></span><span>Asia <b>#${t.asiaRank||"—"}</b></span><span>World <b>#${t.worldRank||"—"}</b></span></div><h4>ROSTER</h4>${players.filter(p=>p.teamId===t.id).map(p=>`<p class="roster">${esc(p.displayName)} <small>#${p.rank||"—"}</small></p>`).join("")}</article>`}
function home(){return `<section class="hero"><div><span class="eyebrow">COUNTER-STRIKE 2 ESPORTS</span><h1>MAFIA <em>CS2</em></h1><p>THE HOME OF COMPETITIVE CS2</p><button class="primary" data-page="teams">EXPLORE TEAMS →</button></div><div class="bigm">M</div></section><div class="stats"><div><small>TEAMS</small><b>${teams.length}</b></div><div><small>PLAYERS</small><b>${players.length}</b></div><div><small>NEWS</small><b>${news.length}</b></div></div><section><div class="sectiontitle"><h2>FEATURED TEAMS</h2><button class="secondary" data-page="teams">VIEW ALL</button></div><div class="grid">${teams.slice(0,3).map(teamCard).join("")||"No teams added yet."}</div></section><section><div class="sectiontitle"><h2>TOP PLAYERS</h2><button class="secondary" data-page="players">VIEW ALL</button></div><div class="grid">${[...players].sort((a,b)=>(a.rank||9999)-(b.rank||9999)).slice(0,4).map(playerCard).join("")||"No players yet."}</div></section><section><h2>LATEST NEWS</h2>${news.slice(0,3).map(newsCard).join("")}</section>`}
function newsCard(n){return `<article class="news card pad">${n.imageURL?`<img class="newsimg" src="${esc(n.imageURL)}">`:""}<h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><small class="muted">${n.createdAt?.toDate?.().toLocaleDateString?.()||""}</small><div id="comments-${n.id}"></div><form class="commentform" data-comment="${n.id}"><input name="text" maxlength="1000" placeholder="${currentUser?"Write a comment...":"Sign in to comment"}" ${currentUser?"":"disabled"}><button ${currentUser?"":"disabled"}>POST</button></form></article>`}
function rankings(){return `<section><h2>GLOBAL RANKINGS</h2><div class="card pad"><label>Category <select id="ranktype"><option value="valveRank">Valve</option><option value="asiaRank">Asia</option><option value="worldRank">World</option></select></label><h3>TEAM RANKINGS</h3><div id="teamrank"></div><h3>PLAYER RANKINGS</h3><div id="playerrank"></div></div></section>`}
function tableRows(items,key,name){return `<div class="tablewrap"><table><thead><tr><th>#</th><th>NAME</th><th>RANK</th></tr></thead><tbody>${items.sort((a,b)=>(a[key]||9999)-(b[key]||9999)).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x[name])}</td><td>#${x[key]||"—"}</td></tr>`).join("")}</tbody></table></div>`}
function profile(){if(!currentUser)return `<section class="card pad narrow"><h2>MY PROFILE</h2><p>Google account-аараа нэвтэрнэ үү.</p><button class="primary" id="login">CONTINUE WITH GOOGLE</button></section>`;
 const p=players.find(x=>x.uid===currentUser.uid);
 return `<section class="card pad narrow"><h2>MY PROFILE</h2><p>${esc(currentUser.email)}</p>${p?`<img class="avatar" src="${esc(p.photoURL||currentUser.photoURL||placeholder)}"><h3>${esc(p.displayName)}</h3><p>Team: ${esc(teamName(p.teamId))} · Rank #${p.rank||"—"}</p>`:"<p>Player profile not created yet.</p>"}<button class="secondary" id="edit-own">${p?"EDIT MY PROFILE":"CREATE PLAYER PROFILE"}</button><button class="secondary" id="logout">SIGN OUT</button><div id="ownform"></div></section>`}
function adminPanel(){if(!isAdmin())return `<section class="card pad narrow"><h2>ADMIN ACCESS</h2><p>Зөвхөн зөвшөөрөгдсөн хоёр Gmail админ нэвтэрнэ.</p><button class="primary" id="login">CONTINUE WITH GOOGLE</button></section>`;
 return `<section><div class="sectiontitle"><h2>ADMIN CONTROL</h2><span class="badge">ADMIN VERIFIED</span></div><div class="adminlayout"><div class="card pad"><h3>TEAM MANAGEMENT</h3><form id="teamform"><input name="name" placeholder="Team name" required><input name="logoURL" placeholder="Logo URL"><input name="valveRank" type="number" placeholder="Valve rank"><input name="asiaRank" type="number" placeholder="Asia rank"><input name="worldRank" type="number" placeholder="World rank"><button class="primary">SAVE TEAM</button></form><div class="manage">${teams.map(t=>`<div>${esc(t.name)} <span><button data-edit-team="${t.id}">EDIT</button><button data-delete-team="${t.id}">DELETE</button></span></div>`).join("")}</div></div>
 <div class="card pad"><h3>PLAYER MANAGEMENT</h3><form id="playerform"><input name="displayName" placeholder="Player nickname" required><select name="teamId"><option value="">Free Agent</option>${teams.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("")}</select><input name="country" placeholder="Country"><input name="steamUrl" placeholder="Steam profile URL"><input name="rank" type="number" placeholder="Player rank"><input name="asiaRank" type="number" placeholder="Asia rank"><input name="worldRank" type="number" placeholder="World rank"><input name="valveRank" type="number" placeholder="Valve rank"><input name="rating" type="number" step=".1" placeholder="Rating / 10"><input name="value" type="number" placeholder="Player value USD"><label>Player photo <input name="photo" type="file" accept="image/*"></label><button class="primary">SAVE PLAYER</button></form><div class="manage">${players.map(p=>`<div>${esc(p.displayName)} <span><button data-edit-player="${p.id}">EDIT</button><button data-delete-player="${p.id}">DELETE</button></span></div>`).join("")}</div></div>
 <div class="card pad"><h3>NEWS</h3><form id="newsform"><input name="title" placeholder="Headline" required><textarea name="body" placeholder="News content" required></textarea><label>News image <input name="image" type="file" accept="image/*"></label><button class="primary">PUBLISH</button></form>${news.map(n=>`<div class="manage">${esc(n.title)} <button data-delete-news="${n.id}">DELETE</button></div>`).join("")}</div>
 <div class="card pad"><h3>WEBSITE APPEARANCE</h3><form id="bgform"><input name="backgroundURL" placeholder="Background image URL" value="${esc(settings.site?.backgroundURL||"")}"><button class="primary">SAVE BACKGROUND</button></form></div></div></section>`}
function render(){
 shell();const authArea=$("#auth-area");authArea.innerHTML=currentUser?`<span class="signed">${esc(currentUser.displayName||currentUser.email)}</span><button id="logout-top" class="secondary">SIGN OUT</button>`:`<button id="login" class="primary">SIGN IN</button>`;
 $("#view").innerHTML=page==="home"?home():page==="teams"?`<h2>TEAMS</h2><div class="grid">${teams.map(teamCard).join("")}</div>`:page==="players"?`<h2>PLAYERS</h2><input id="search" class="search" placeholder="Search player..."><div class="grid" id="playergrid">${players.map(playerCard).join("")}</div>`:page==="rankings"?rankings():page==="news"?`<h2>NEWS & UPDATES</h2>${news.map(newsCard).join("")}`:page==="profile"?profile():adminPanel();
 if(settings.site?.backgroundURL) document.body.style.backgroundImage=`linear-gradient(#090b10dd,#090b10ee),url("${settings.site.backgroundURL}")`;
 document.querySelectorAll("[data-page]").forEach(b=>b.onclick=e=>{e.preventDefault();page=b.dataset.page;render()});
 $("#login")?.addEventListener("click",login);$("#logout")?.addEventListener("click",logout);$("#logout-top")?.addEventListener("click",logout);
 $("#search")?.addEventListener("input",e=>{$("#playergrid").innerHTML=players.filter(p=>(p.displayName||"").toLowerCase().includes(e.target.value.toLowerCase())).map(playerCard).join("")});
 if(page==="rankings"){const update=()=>{$("#teamrank").innerHTML=tableRows([...teams],$("#ranktype").value,"name");$("#playerrank").innerHTML=tableRows([...players],$("#ranktype").value,"displayName")};$("#ranktype").onchange=update;update()}
 bindForms();
}
async function login(){try{await signInWithPopup(auth,provider)}catch(e){alert("Нэвтрэхэд алдаа гарлаа: "+e.message)}}
async function logout(){await signOut(auth)}
async function upload(file,path){if(!file)return "";const r=ref(storage,path);await uploadBytes(r,file);return getDownloadURL(r)}
function formObj(form){return Object.fromEntries(new FormData(form).entries())}
function bindForms(){
 document.querySelectorAll(".commentform").forEach(f=>f.onsubmit=async e=>{e.preventDefault();if(!currentUser)return;const text=formObj(f).text.trim();if(!text)return;await addDoc(collection(db,"news",f.dataset.comment,"comments"),{uid:currentUser.uid,user:currentUser.displayName||currentUser.email,text,createdAt:serverTimestamp()});f.reset();alert("Comment posted.")});
 $("#teamform")?.addEventListener("submit",async e=>{e.preventDefault();const d=formObj(e.target);for(const k of ["valveRank","asiaRank","worldRank"])d[k]=Number(d[k])||null;await addDoc(collection(db,"teams"),d);await load()});
 $("#playerform")?.addEventListener("submit",async e=>{e.preventDefault();const d=formObj(e.target);const file=d.photo;delete d.photo;for(const k of ["rank","asiaRank","worldRank","valveRank","rating","value"])d[k]=Number(d[k])||null;d.teamId=d.teamId||null;if(file?.size)d.photoURL=await upload(file,`players/${Date.now()}-${file.name}`);await addDoc(collection(db,"players"),{...d,uid:null,createdAt:serverTimestamp()});await load()});
 $("#newsform")?.addEventListener("submit",async e=>{e.preventDefault();const d=formObj(e.target),file=d.image;delete d.image;if(file?.size)d.imageURL=await upload(file,`news/${Date.now()}-${file.name}`);await addDoc(collection(db,"news"),{...d,createdAt:serverTimestamp()});await load()});
 $("#bgform")?.addEventListener("submit",async e=>{e.preventDefault();await setDoc(doc(db,"settings","site"),formObj(e.target));await load()});
 $("#edit-own")?.addEventListener("click",()=>ownForm());
 document.querySelectorAll("[data-delete-team]").forEach(b=>b.onclick=async()=>{if(confirm("Delete team?")){await deleteDoc(doc(db,"teams",b.dataset.deleteTeam));await load()}});
 document.querySelectorAll("[data-delete-player]").forEach(b=>b.onclick=async()=>{if(confirm("Delete player?")){await deleteDoc(doc(db,"players",b.dataset.deletePlayer));await load()}});
 document.querySelectorAll("[data-delete-news]").forEach(b=>b.onclick=async()=>{if(confirm("Delete news?")){await deleteDoc(doc(db,"news",b.dataset.deleteNews));await load()}});
 document.querySelectorAll("[data-edit-team]").forEach(b=>b.onclick=()=>editTeamForm(b.dataset.editTeam));
 document.querySelectorAll("[data-edit-player]").forEach(b=>b.onclick=()=>editPlayerForm(b.dataset.editPlayer));
}
async function ownForm(){let p=players.find(x=>x.uid===currentUser.uid);$("#ownform").innerHTML=`<form id="own-edit"><input name="displayName" placeholder="Player nickname" value="${esc(p?.displayName||currentUser.displayName||"")}" required><input name="country" placeholder="Country" value="${esc(p?.country||"")}"><input name="steamUrl" placeholder="Steam URL" value="${esc(p?.steamUrl||"")}"><label>Profile photo <input name="photo" type="file" accept="image/*"></label><button class="primary">SAVE PROFILE</button></form>`;$("#own-edit").onsubmit=async e=>{e.preventDefault();let d=formObj(e.target),file=d.photo;delete d.photo;if(file?.size)d.photoURL=await upload(file,`players/${currentUser.uid}/${Date.now()}`);d.uid=currentUser.uid;d.updatedAt=serverTimestamp();if(p)await setDoc(doc(db,"players",p.id),{...p,...d});else await addDoc(collection(db,"players"),{...d,rank:null,asiaRank:null,worldRank:null,valveRank:null,rating:null,value:null,teamId:null,createdAt:serverTimestamp()});await load();page="profile";render()}}
async function editTeamForm(id){const t=teams.find(x=>x.id===id);const name=prompt("Team name",t.name);if(name===null)return;const logoURL=prompt("Logo URL",t.logoURL||"")??t.logoURL;await setDoc(doc(db,"teams",id),{...t,name,logoURL});await load()}
async function editPlayerForm(id){const p=players.find(x=>x.id===id);const displayName=prompt("Player nickname",p.displayName);if(displayName===null)return;const rank=Number(prompt("Player rank",p.rank||""))||null;await setDoc(doc(db,"players",id),{...p,displayName,rank});await load()}
onAuthStateChanged(auth,async u=>{currentUser=u;if(u){await load().catch(e=>alert("Firebase тохиргоог шалгана уу: "+e.message))}else render()});
if(settings.site?.backgroundURL)document.body.style.backgroundImage=`linear-gradient(#090b10dd,#090b10ee),url("${settings.site.backgroundURL}")`;
