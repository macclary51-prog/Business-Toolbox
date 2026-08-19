import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc,
  getDocs, deleteDoc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (id) => document.getElementById(id);

const toolDefinitions = [
  {
    id:"tasks", name:"Tasks", icon:"✓", category:"Operations",
    desc:"Assign, prioritize and track work that needs to get done.",
    bullets:["Priority levels","Employee assignment","Recurring schedule","Due date and status"],
    helper:"Create a task with priority, assignment and a schedule.",
    dueLabel:"Due Date",
    fields:[
      {key:"title",label:"Task Name",type:"text",required:true,wide:true},
      {key:"priority",label:"Priority",type:"select",options:["Low","Medium","High","Urgent"]},
      {key:"assignedTo",label:"Assigned To",type:"text",placeholder:"Employee or team"},
      {key:"recurring",label:"Recurring",type:"select",options:["No","Daily","Weekly","Monthly","Quarterly","Yearly"]}
    ]
  },
  {
    id:"checklists", name:"Checklists", icon:"☑", category:"Operations",
    desc:"Build reusable opening, closing and recurring business checklists.",
    bullets:["Reusable checklist items","Opening or closing routines","Assign responsibility","Daily/weekly/monthly frequency"],
    helper:"Save a reusable checklist. Put one checklist item on each line.",
    dueLabel:"Next Due Date",
    fields:[
      {key:"title",label:"Checklist Name",type:"text",required:true,wide:true},
      {key:"frequency",label:"Frequency",type:"select",options:["As Needed","Daily","Weekly","Monthly","Opening","Closing"]},
      {key:"assignedTo",label:"Assigned To",type:"text",placeholder:"Employee or team"},
      {key:"items",label:"Checklist Items",type:"textarea",placeholder:"Unlock front door\nInspect work area\nCheck supplies",wide:true,help:"Enter one item per line."}
    ]
  },
  {
    id:"equipment", name:"Equipment", icon:"⚙", category:"Assets",
    desc:"Know what equipment you own, where it is and who has it.",
    bullets:["Asset and serial numbers","Condition and location","Employee assignment","Purchase and maintenance dates"],
    helper:"Create a detailed equipment record for a tool, machine or company asset.",
    dueLabel:"Next Maintenance",
    fields:[
      {key:"title",label:"Equipment Name",type:"text",required:true,wide:true},
      {key:"assetNumber",label:"Asset Number",type:"text"},
      {key:"serialNumber",label:"Serial Number",type:"text"},
      {key:"condition",label:"Condition",type:"select",options:["Excellent","Good","Fair","Needs Repair","Out of Service"]},
      {key:"assignedTo",label:"Assigned To",type:"text"},
      {key:"location",label:"Location",type:"text"},
      {key:"purchaseDate",label:"Purchase Date",type:"date"}
    ]
  },
  {
    id:"maintenance", name:"Maintenance", icon:"⌂", category:"Assets",
    desc:"Track service history and upcoming maintenance for equipment or vehicles.",
    bullets:["Last and next service","Mileage or operating hours","Service provider","Maintenance cost"],
    helper:"Record maintenance work and when the next service is due.",
    dueLabel:"Next Service Date",
    fields:[
      {key:"title",label:"Maintenance Item",type:"text",required:true,wide:true},
      {key:"asset",label:"Equipment / Vehicle",type:"text"},
      {key:"serviceType",label:"Service Type",type:"text",placeholder:"Oil change, inspection, filter..."},
      {key:"lastService",label:"Last Service Date",type:"date"},
      {key:"mileageHours",label:"Mileage / Hours",type:"text"},
      {key:"cost",label:"Cost",type:"number",step:"0.01",placeholder:"0.00"},
      {key:"provider",label:"Service Provider",type:"text"}
    ]
  },
  {
    id:"renewals", name:"Renewals", icon:"↻", category:"Admin",
    desc:"Track licenses, insurance, registrations and other expiration dates.",
    bullets:["Expiration dates","License and policy numbers","Renewal provider","Advance reminder period"],
    helper:"Add anything the business cannot afford to forget to renew.",
    dueLabel:"Expiration Date",
    fields:[
      {key:"title",label:"Renewal Name",type:"text",required:true,wide:true},
      {key:"renewalType",label:"Type",type:"select",options:["Business License","Insurance","Vehicle Registration","Domain","Certification","Contract","Permit","Other"]},
      {key:"provider",label:"Provider / Agency",type:"text"},
      {key:"referenceNumber",label:"Policy / License Number",type:"text"},
      {key:"reminderDays",label:"Remind Before",type:"select",options:["7 days","14 days","30 days","60 days","90 days"]}
    ]
  },
  {
    id:"incidents", name:"Incidents", icon:"!", category:"Safety",
    desc:"Document accidents, damage, complaints and workplace issues.",
    bullets:["Date, time and location","People and witnesses","Damage or injury details","Follow-up actions"],
    helper:"Keep a clear internal record of an accident, damage event or other incident.",
    dueLabel:"Follow-up Due",
    fields:[
      {key:"title",label:"Incident Title",type:"text",required:true,wide:true},
      {key:"incidentType",label:"Incident Type",type:"select",options:["Accident","Property Damage","Equipment Damage","Customer Issue","Safety Issue","Security Issue","Other"]},
      {key:"incidentDateTime",label:"Date & Time",type:"datetime-local"},
      {key:"location",label:"Location",type:"text"},
      {key:"peopleInvolved",label:"People Involved",type:"text"},
      {key:"witnesses",label:"Witnesses",type:"text"},
      {key:"damageInjury",label:"Damage / Injury Details",type:"textarea",wide:true},
      {key:"followUp",label:"Follow-up Action",type:"textarea",wide:true}
    ]
  },
  {
    id:"shift-handoff", name:"Shift Handoff", icon:"⇄", category:"Employees",
    desc:"Leave important information for the next employee or shift.",
    bullets:["From/to shift","Priority level","Unfinished work","Problems needing attention"],
    helper:"Pass important notes between shifts without relying on memory.",
    dueLabel:"Resolve By",
    fields:[
      {key:"title",label:"Handoff Subject",type:"text",required:true,wide:true},
      {key:"fromShift",label:"From Shift / Employee",type:"text"},
      {key:"toShift",label:"To Shift / Employee",type:"text"},
      {key:"priority",label:"Priority",type:"select",options:["Normal","Important","Urgent"]},
      {key:"handoffNotes",label:"Handoff Details",type:"textarea",wide:true,placeholder:"What does the next shift need to know?"}
    ]
  },
  {
    id:"asset-checkout", name:"Asset Checkout", icon:"↗", category:"Assets",
    desc:"Track company property that employees take and return.",
    bullets:["Employee checkout","Checkout and return dates","Asset identification","Condition when issued"],
    helper:"Record who currently has a tool, key, device or other company asset.",
    dueLabel:"Expected Return",
    fields:[
      {key:"title",label:"Asset Name",type:"text",required:true,wide:true},
      {key:"assetId",label:"Asset / Tag Number",type:"text"},
      {key:"checkedOutTo",label:"Checked Out To",type:"text"},
      {key:"checkoutDate",label:"Checkout Date",type:"date"},
      {key:"conditionOut",label:"Condition When Issued",type:"select",options:["Excellent","Good","Fair","Damaged"]}
    ]
  },
  {id:"logbook",name:"Daily Logbook",icon:"☰",category:"Operations",desc:"Keep searchable day-to-day business notes.",bullets:["Daily operational notes","Problems and unusual events","Searchable history","Status tracking"]},
  {id:"employees",name:"Employees",icon:"♙",category:"Employees",desc:"Keep lightweight employee records and notes.",bullets:["Employee information","Role notes","Status","Important dates"]},
  {id:"vehicles",name:"Vehicles",icon:"⌁",category:"Assets",desc:"Track company vehicles, condition and business notes.",bullets:["Vehicle details","Mileage notes","Condition","Service reminders"]},
  {id:"photo-proof",name:"Photo Proof",icon:"▣",category:"Jobs",desc:"Organize before, after and proof-of-work records.",bullets:["Before/after records","Damage documentation","Job references","Timestamp-ready workflow"]},
  {id:"vendors",name:"Vendors",icon:"◇",category:"Admin",desc:"Keep supplier and vendor information together.",bullets:["Vendor contacts","Services supplied","Account notes","Pricing history notes"]},
  {id:"subscriptions",name:"Subscriptions",icon:"$",category:"Admin",desc:"Track recurring business software and service costs.",bullets:["Monthly/yearly services","Renewal dates","Costs","Cancellation notes"]},
  {id:"documents",name:"Documents",icon:"▤",category:"Admin",desc:"Track important business documents and dates.",bullets:["Document register","Expiration dates","Responsible person","Reference notes"]},
  {id:"training",name:"Training",icon:"◎",category:"Employees",desc:"Track training and employee certification items.",bullets:["Training assignments","Completion status","Certification dates","Renewal dates"]},
  {id:"website-monitor",name:"Website Monitor",icon:"◉",category:"Digital",desc:"Keep website checks, outages and maintenance notes.",bullets:["Website status checks","Outage history","SSL/domain notes","Maintenance reminders"]},
  {id:"qr-assets",name:"QR Assets",icon:"⌗",category:"Digital",desc:"Prepare asset records that can be linked to QR labels.",bullets:["QR-ready asset IDs","Instructions","Maintenance history","Location information"]},
  {id:"supplies",name:"Supply Alerts",icon:"△",category:"Operations",desc:"Record low-stock items and restocking needs.",bullets:["Low-stock reports","Urgency","Restock status","Supply location"]},
  {id:"warranties",name:"Warranties",icon:"W",category:"Assets",desc:"Track purchase and warranty information for business assets.",bullets:["Purchase date","Warranty expiration","Manufacturer","Receipt/reference notes"]},
  {id:"complaints",name:"Complaints",icon:"!",category:"Feedback",desc:"Record and follow up on customer complaints.",bullets:["Complaint history","Resolution status","Follow-up notes","Recurring issue visibility"]},
  {id:"suggestions",name:"Suggestions",icon:"+",category:"Feedback",desc:"Capture employee and business improvement ideas.",bullets:["Employee suggestions","Improvement ideas","Priority","Implementation status"]},
  {id:"visitor-log",name:"Visitor Log",icon:"V",category:"Admin",desc:"Record visitors, vendors and contractors on site.",bullets:["Visitor name","Reason for visit","Arrival/departure","Contact notes"]},
  {id:"package-log",name:"Package Log",icon:"□",category:"Admin",desc:"Track packages received by the business.",bullets:["Carrier/sender","Recipient","Received date","Pickup status"]}
];

const defaultEnabledModules = ["tasks","checklists","equipment","maintenance","renewals","incidents","shift-handoff","asset-checkout"];
const categoryOrder = ["All","Operations","Employees","Assets","Jobs","Safety","Admin","Digital","Feedback"];

const businessExamples = [
  {id:"landscaping",name:"Landscaping",tagline:"Keep crews, tools and field work organized.",tools:["tasks","equipment","vehicles","maintenance","photo-proof","checklists","supplies","asset-checkout"]},
  {id:"moving",name:"Moving Company",tagline:"Document jobs, equipment and anything that could become a dispute.",tools:["tasks","photo-proof","vehicles","asset-checkout","incidents","checklists","shift-handoff","supplies"]},
  {id:"office",name:"Small Office",tagline:"Handle the recurring operational details that fall between bigger software systems.",tools:["tasks","employees","training","renewals","documents","visitor-log","package-log","subscriptions"]},
  {id:"detailing",name:"Auto / Detailing",tagline:"Track vehicles, before/after work, equipment and shop supplies.",tools:["tasks","photo-proof","equipment","maintenance","supplies","checklists","incidents","asset-checkout"]},
  {id:"cleaning",name:"Cleaning Service",tagline:"Manage checklists, supplies, proof of work and employee handoffs.",tools:["tasks","checklists","photo-proof","supplies","equipment","shift-handoff","incidents","asset-checkout"]}
];

function toolById(id){
  const base = toolDefinitions.find(t=>t.id===id);
  if(!base) return {id,name:id,icon:"•",category:"Other",desc:"Business record.",bullets:[],fields:[{key:"title",label:"Title",type:"text",required:true,wide:true}]};
  return {...base, fields:base.fields || [{key:"title",label:`${base.name} Record`,type:"text",required:true,wide:true}], helper:base.helper || base.desc, dueLabel:base.dueLabel || "Due Date"};
}
function safeText(value=""){return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function prettyValue(value){if(value===undefined||value===null||value==="")return "";return String(value).replaceAll("\n",", ")}

/* PUBLIC FEATURES */
let publicCategory="All", publicSearch="", selectedPublicTool="tasks";
function renderFeatureCategories(){
  $("featureCategories").innerHTML=categoryOrder.map(c=>`<button class="category-pill ${c===publicCategory?"active":""}" data-category="${c}">${c}</button>`).join("");
  document.querySelectorAll("[data-category]").forEach(btn=>btn.onclick=()=>{publicCategory=btn.dataset.category;renderFeatureCategories();renderPublicFeatures();});
}
function renderPublicFeatures(){
  const q=publicSearch.trim().toLowerCase();
  const filtered=toolDefinitions.filter(t=>(publicCategory==="All"||t.category===publicCategory)&&(!q||`${t.name} ${t.desc} ${t.category} ${(t.bullets||[]).join(" ")}`.toLowerCase().includes(q)));
  $("publicFeatureGrid").innerHTML=filtered.length?filtered.map(t=>`<button class="feature-card ${t.id===selectedPublicTool?"active":""}" data-public-tool="${t.id}"><div class="feature-card-top"><span class="feature-icon">${safeText(t.icon)}</span><span class="feature-category">${safeText(t.category.toUpperCase())}</span></div><h3>${safeText(t.name)}</h3><p>${safeText(t.desc)}</p></button>`).join(""):'<div class="no-features">No tools match that search.</div>';
  document.querySelectorAll("[data-public-tool]").forEach(btn=>btn.onclick=()=>{selectedPublicTool=btn.dataset.publicTool;renderPublicFeatures();renderFeatureDetail();});
}
function renderFeatureDetail(){
  const t=toolById(selectedPublicTool);
  $("detailIcon").textContent=t.icon; $("detailCategory").textContent=t.category.toUpperCase(); $("detailName").textContent=t.name; $("detailDescription").textContent=t.desc;
  $("detailBullets").innerHTML=(t.bullets||[]).map(b=>`<li>${safeText(b)}</li>`).join("");
}
$("featureSearch").addEventListener("input",e=>{publicSearch=e.target.value;renderPublicFeatures();});
renderFeatureCategories(); renderPublicFeatures(); renderFeatureDetail();

/* BUSINESS EXAMPLES */
let selectedExample=businessExamples[0].id;
function renderBusinessExamples(){
  $("businessExampleTabs").innerHTML=businessExamples.map(e=>`<button class="business-tab ${e.id===selectedExample?"active":""}" data-example="${e.id}">${safeText(e.name)}</button>`).join("");
  const example=businessExamples.find(e=>e.id===selectedExample)||businessExamples[0];
  $("businessExamplePanel").innerHTML=`<div class="business-example-copy"><span class="eyebrow">${safeText(example.name.toUpperCase())}</span><h3>A useful starting toolbox</h3><p>${safeText(example.tagline)}</p><p>These are only suggestions. The business can turn any module on or off later.</p></div><div class="example-tool-grid">${example.tools.map(id=>{const t=toolById(id);return `<div class="example-tool"><strong>${safeText(t.icon)} ${safeText(t.name)}</strong><span>${safeText(t.desc)}</span></div>`}).join("")}</div>`;
  document.querySelectorAll("[data-example]").forEach(btn=>btn.onclick=()=>{selectedExample=btn.dataset.example;renderBusinessExamples();});
}
renderBusinessExamples();

/* NAV + AUTH MODALS */
$("year").textContent=new Date().getFullYear();
$("navToggle").addEventListener("click",()=>{const open=$("navLinks").classList.toggle("open");$("navToggle").setAttribute("aria-expanded",String(open));});
const publicSite=$("publicSite"), publicFooter=$("publicFooter"), appShell=$("appShell"), authModal=$("authModal"), recordModal=$("recordModal");
function switchAuthTab(tab){document.querySelectorAll("[data-auth-tab]").forEach(b=>b.classList.toggle("active",b.dataset.authTab===tab));$("loginForm").classList.toggle("hidden",tab!=="login");$("signupForm").classList.toggle("hidden",tab!=="signup");$("authMessage").textContent="";}
document.querySelectorAll("[data-open-auth]").forEach(btn=>btn.addEventListener("click",()=>{switchAuthTab(btn.dataset.openAuth);authModal.classList.remove("hidden");}));
document.querySelectorAll("[data-auth-tab]").forEach(btn=>btn.addEventListener("click",()=>switchAuthTab(btn.dataset.authTab)));
document.querySelectorAll("[data-close-modal]").forEach(btn=>btn.addEventListener("click",()=>authModal.classList.add("hidden")));
authModal.addEventListener("click",e=>{if(e.target===authModal)authModal.classList.add("hidden")});

let currentUser=null,userProfile=null,business=null,records=[];
$("signupForm").addEventListener("submit",async e=>{
  e.preventDefault(); const message=$("authMessage"); message.className="form-message"; message.textContent="Creating account...";
  try{
    const businessName=$("signupBusinessName").value.trim(), ownerName=$("signupOwnerName").value.trim(), email=$("signupEmail").value.trim(), password=$("signupPassword").value;
    const credential=await createUserWithEmailAndPassword(auth,email,password); const uid=credential.user.uid; const businessId=crypto.randomUUID?crypto.randomUUID():`${uid}-${Date.now()}`;
    await updateProfile(credential.user,{displayName:ownerName});
    await setDoc(doc(db,"users",uid),{displayName:ownerName,email,businessId,role:"owner",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    await setDoc(doc(db,"businesses",businessId),{name:businessName,ownerUid:uid,ownerName,phone:"",website:"",enabledModules:defaultEnabledModules,plan:"starter",subscriptionStatus:"setup_required",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    message.className="form-message success";message.textContent="Account created.";authModal.classList.add("hidden");
  }catch(error){console.error(error);message.textContent=friendlyAuthError(error.code);}
});
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();const message=$("authMessage");message.className="form-message";message.textContent="Logging in...";try{await signInWithEmailAndPassword(auth,$("loginEmail").value.trim(),$("loginPassword").value);authModal.classList.add("hidden");}catch(error){console.error(error);message.textContent=friendlyAuthError(error.code);}});
function friendlyAuthError(code=""){const map={"auth/email-already-in-use":"That email already has an account.","auth/invalid-email":"Enter a valid email address.","auth/weak-password":"Use a stronger password with at least 6 characters.","auth/invalid-credential":"Email or password is incorrect.","auth/operation-not-allowed":"Email/password Authentication has not been enabled in Firebase yet.","auth/too-many-requests":"Too many attempts. Try again later."};return map[code]||"Something went wrong. Check Firebase setup and try again.";}
$("logoutBtn").addEventListener("click",()=>signOut(auth));

onAuthStateChanged(auth,async user=>{
  currentUser=user;
  if(!user){userProfile=null;business=null;records=[];showPublic();return;}
  try{
    const userSnap=await getDoc(doc(db,"users",user.uid)); if(!userSnap.exists())throw new Error("User profile not found."); userProfile={id:userSnap.id,...userSnap.data()};
    const businessSnap=await getDoc(doc(db,"businesses",userProfile.businessId)); if(!businessSnap.exists())throw new Error("Business record not found."); business={id:businessSnap.id,...businessSnap.data()};
    await loadRecords();showApp();
  }catch(error){console.error(error);alert("Your business account could not be loaded. Check Firestore rules and setup.");await signOut(auth);}
});
function showPublic(){publicSite.classList.remove("hidden");publicFooter.classList.remove("hidden");appShell.classList.add("hidden");document.querySelector(".site-header").classList.remove("hidden")}
function showApp(){publicSite.classList.add("hidden");publicFooter.classList.add("hidden");document.querySelector(".site-header").classList.add("hidden");appShell.classList.remove("hidden");$("sidebarBusinessName").textContent=business.name;$("sidebarUserEmail").textContent=currentUser.email||"";$("settingsBusinessName").value=business.name||"";$("settingsOwnerName").value=business.ownerName||userProfile.displayName||"";$("settingsPhone").value=business.phone||"";$("settingsWebsite").value=business.website||"";renderModuleOptions();renderEverything();switchView("dashboard")}
async function loadRecords(){const ref=collection(db,"businesses",userProfile.businessId,"records");const snap=await getDocs(query(ref,orderBy("createdAt","desc")));records=snap.docs.map(d=>({id:d.id,...d.data()}));}
function enabledModules(){return Array.isArray(business.enabledModules)?business.enabledModules:defaultEnabledModules}
function renderEverything(){renderStats();renderDashboardTools();renderModuleSettings();renderRecords();renderRecentRecords()}
function renderStats(){const now=new Date(),soon=new Date();soon.setDate(now.getDate()+7);$("statOpen").textContent=records.filter(r=>!["Complete","Archived"].includes(r.status)).length;$("statDue").textContent=records.filter(r=>{if(!r.dueDate||["Complete","Archived"].includes(r.status))return false;const d=new Date(`${r.dueDate}T23:59:59`);return d>=now&&d<=soon}).length;$("statTools").textContent=enabledModules().length;$("statTotal").textContent=records.length;}
function renderDashboardTools(){const enabled=new Set(enabledModules());$("dashboardToolGrid").innerHTML=toolDefinitions.filter(t=>enabled.has(t.id)).slice(0,12).map(t=>`<button class="tool-card" data-tool-open="${t.id}"><span>${safeText(t.icon)}</span><strong>${safeText(t.name)}</strong></button>`).join("")||'<div class="empty-state">Enable at least one tool.</div>';document.querySelectorAll("[data-tool-open]").forEach(btn=>btn.onclick=()=>{switchView("records");$("recordModuleFilter").value=btn.dataset.toolOpen;renderRecords();});}
function renderModuleOptions(){const opts=toolDefinitions.map(t=>`<option value="${t.id}">${safeText(t.name)}</option>`).join("");$("recordModule").innerHTML=opts;$("recordModuleFilter").innerHTML=`<option value="all">All tools</option>${opts}`;}
function renderModuleSettings(){const enabled=new Set(enabledModules());$("moduleSettingsGrid").innerHTML=toolDefinitions.map(t=>`<div class="module-setting"><div><strong>${safeText(t.icon)} ${safeText(t.name)}</strong><small>${enabled.has(t.id)?"Enabled":"Disabled"}</small></div><button class="toggle ${enabled.has(t.id)?"on":""}" data-module-toggle="${t.id}" aria-label="Toggle ${safeText(t.name)}"></button></div>`).join("");document.querySelectorAll("[data-module-toggle]").forEach(btn=>btn.onclick=async()=>{const id=btn.dataset.moduleToggle,next=new Set(enabledModules());next.has(id)?next.delete(id):next.add(id);business.enabledModules=[...next];await updateDoc(doc(db,"businesses",business.id),{enabledModules:business.enabledModules,updatedAt:serverTimestamp()});renderEverything();});}

function recordFieldPreview(record){const t=toolById(record.module),values=record.fields||{};return t.fields.filter(f=>f.key!=="title"&&values[f.key]).slice(0,3).map(f=>`<span>${safeText(f.label)}: ${safeText(prettyValue(values[f.key]))}</span>`).join("");}
function recordHtml(r){const t=toolById(r.module);return `<div class="record-item"><div class="record-main"><strong>${safeText(r.title||"Untitled")}</strong><p>${safeText(r.details||t.desc)}</p><div class="record-meta"><span class="tag">${safeText(t.name)}</span><span class="tag">${safeText(r.status||"Open")}</span>${r.dueDate?`<span class="tag">${safeText(t.dueLabel)}: ${safeText(r.dueDate)}</span>`:""}</div><div class="record-fields-preview">${recordFieldPreview(r)}</div></div><div class="record-actions"><button class="mini-btn" data-edit-record="${r.id}">Edit</button><button class="mini-btn danger" data-delete-record="${r.id}">Delete</button></div></div>`;}
function renderRecords(){const search=$("recordSearch").value.trim().toLowerCase(),filter=$("recordModuleFilter").value;const filtered=records.filter(r=>{const extra=Object.values(r.fields||{}).join(" ");const textMatch=!search||`${r.title||""} ${r.details||""} ${r.status||""} ${extra}`.toLowerCase().includes(search);return textMatch&&(filter==="all"||r.module===filter)});$("allRecords").innerHTML=filtered.length?filtered.map(recordHtml).join(""):'<div class="empty-state">No records found.</div>';bindRecordActions();}
function renderRecentRecords(){const recent=records.slice(0,5);$("recentRecords").innerHTML=recent.length?recent.map(recordHtml).join(""):'<div class="empty-state">No records yet.</div>';bindRecordActions();}
function bindRecordActions(){document.querySelectorAll("[data-edit-record]").forEach(btn=>btn.onclick=()=>openRecordModal(records.find(r=>r.id===btn.dataset.editRecord)));document.querySelectorAll("[data-delete-record]").forEach(btn=>btn.onclick=async()=>{if(!confirm("Delete this record?"))return;await deleteDoc(doc(db,"businesses",business.id,"records",btn.dataset.deleteRecord));records=records.filter(r=>r.id!==btn.dataset.deleteRecord);renderEverything();});}
$("recordSearch").addEventListener("input",renderRecords);$("recordModuleFilter").addEventListener("change",renderRecords);

function fieldHtml(field,value=""){
  const attrs=`id="toolField_${field.key}" class="input" ${field.required?"required":""} ${field.step?`step="${field.step}"`:""} ${field.placeholder?`placeholder="${safeText(field.placeholder)}"`:""}`;
  let control="";
  if(field.type==="select") control=`<select ${attrs}>${(field.options||[]).map(o=>`<option value="${safeText(o)}" ${String(value)===String(o)?"selected":""}>${safeText(o)}</option>`).join("")}</select>`;
  else if(field.type==="textarea") control=`<textarea ${attrs} rows="5">${safeText(value)}</textarea>`;
  else control=`<input type="${field.type||"text"}" ${attrs} value="${safeText(value)}" />`;
  return `<label class="${field.wide?"field-wide":""}">${safeText(field.label)}${control}${field.help?`<span class="field-help">${safeText(field.help)}</span>`:""}</label>`;
}
function renderDynamicFields(moduleId,record=null){const t=toolById(moduleId);$("recordEyebrow").textContent=t.category.toUpperCase();$("recordModalHelper").textContent=t.helper;$("dynamicFields").innerHTML=t.fields.map(f=>fieldHtml(f,f.key==="title"?(record?.title||""):(record?.fields?.[f.key]||""))).join("");$("dueDateLabel").childNodes[0].nodeValue=`${t.dueLabel} `;}
function openRecordModal(record=null){$("recordForm").reset();$("recordMessage").textContent="";$("recordId").value=record?.id||"";let moduleId=record?.module||($("recordModuleFilter").value!=="all"?$("recordModuleFilter").value:enabledModules()[0]||"tasks");$("recordModule").value=moduleId;$("recordModalTitle").textContent=record?`Edit ${toolById(moduleId).name}`:`Add ${toolById(moduleId).name}`;renderDynamicFields(moduleId,record);$("recordStatus").value=record?.status||"Open";$("recordDueDate").value=record?.dueDate||"";$("recordDetails").value=record?.details||"";recordModal.classList.remove("hidden");}
$("recordModule").addEventListener("change",()=>{$("recordModalTitle").textContent=`Add ${toolById($("recordModule").value).name}`;renderDynamicFields($("recordModule").value,null)});
$("addRecordBtn").addEventListener("click",()=>openRecordModal());$("quickAddBtn").addEventListener("click",()=>openRecordModal());document.querySelectorAll("[data-close-record]").forEach(btn=>btn.addEventListener("click",()=>recordModal.classList.add("hidden")));recordModal.addEventListener("click",e=>{if(e.target===recordModal)recordModal.classList.add("hidden")});
$("recordForm").addEventListener("submit",async e=>{
  e.preventDefault();const id=$("recordId").value,moduleId=$("recordModule").value,t=toolById(moduleId),fields={};let title="";
  for(const f of t.fields){const el=$(`toolField_${f.key}`);const value=el?.value?.trim?el.value.trim():el?.value||"";if(f.key==="title")title=value;else fields[f.key]=value;}
  const payload={module:moduleId,title,status:$("recordStatus").value,dueDate:$("recordDueDate").value||"",details:$("recordDetails").value.trim(),fields,updatedAt:serverTimestamp(),updatedBy:currentUser.uid};
  try{if(id)await updateDoc(doc(db,"businesses",business.id,"records",id),payload);else await addDoc(collection(db,"businesses",business.id,"records"),{...payload,createdAt:serverTimestamp(),createdBy:currentUser.uid});await loadRecords();renderEverything();recordModal.classList.add("hidden");}catch(error){console.error(error);$("recordMessage").textContent="Could not save this item. Check Firestore rules.";}
});

$("businessSettingsForm").addEventListener("submit",async e=>{e.preventDefault();const updates={name:$("settingsBusinessName").value.trim(),ownerName:$("settingsOwnerName").value.trim(),phone:$("settingsPhone").value.trim(),website:$("settingsWebsite").value.trim(),updatedAt:serverTimestamp()};await updateDoc(doc(db,"businesses",business.id),updates);Object.assign(business,updates);$("sidebarBusinessName").textContent=business.name;alert("Business settings saved.");});
const views={dashboard:[$("dashboardView"),"OVERVIEW","Dashboard"],tools:[$("toolsView"),"MODULES","Tools"],records:[$("recordsView"),"BUSINESS DATA","All Records"],settings:[$("settingsView"),"ACCOUNT","Settings"]};
function switchView(name){Object.entries(views).forEach(([key,[el]])=>el.classList.toggle("hidden",key!==name));document.querySelectorAll("[data-view]").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===name));$("viewEyebrow").textContent=views[name][1];$("viewTitle").textContent=views[name][2];if(window.innerWidth<=780)$("sidebar").classList.remove("open");}
document.querySelectorAll("[data-view]").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));document.querySelectorAll("[data-go-tools]").forEach(btn=>btn.addEventListener("click",()=>switchView("tools")));$("sidebarToggle").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
