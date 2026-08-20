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
  {
    id:"logbook",name:"Daily Logbook",icon:"☰",category:"Operations",
    desc:"Keep searchable day-to-day business notes.",
    bullets:["Daily operational notes","Problems and unusual events","Searchable history","Status tracking"],
    helper:"Create a dated operational log entry for a shift, location or workday.",
    dueLabel:"Follow-up Date",
    statuses:["Logged","Needs Follow-up","Resolved","Archived"],
    fields:[
      {key:"title",label:"Log Entry Title",type:"text",required:true,wide:true},
      {key:"logDate",label:"Log Date",type:"date",required:true},
      {key:"shift",label:"Shift / Time Period",type:"text",placeholder:"Opening, Day, Closing..."},
      {key:"location",label:"Location",type:"text"},
      {key:"people",label:"People Involved",type:"text"},
      {key:"issueFlag",label:"Issue Level",type:"select",options:["Routine","Worth Noting","Needs Attention","Urgent"]},
      {key:"nextAction",label:"Next Action",type:"textarea",wide:true,placeholder:"What needs to happen next?"}
    ]
  },
  {
    id:"employees",name:"Employees",icon:"♙",category:"Employees",
    desc:"Keep lightweight employee records and notes.",
    bullets:["Employee information","Role notes","Status","Important dates"],
    helper:"Maintain a simple employee record with contact, role and employment details.",
    dueLabel:"Review / Renewal Date",
    statuses:["Active","On Leave","Inactive","Archived"],
    fields:[
      {key:"title",label:"Employee Name",type:"text",required:true,wide:true},
      {key:"role",label:"Role / Position",type:"text",required:true},
      {key:"department",label:"Department / Team",type:"text"},
      {key:"email",label:"Email",type:"email"},
      {key:"phone",label:"Phone",type:"tel"},
      {key:"startDate",label:"Start Date",type:"date"},
      {key:"employmentType",label:"Employment Type",type:"select",options:["Full Time","Part Time","Contractor","Temporary","Seasonal","Other"]},
      {key:"emergencyContact",label:"Emergency Contact",type:"text",wide:true}
    ]
  },
  {
    id:"vehicles",name:"Vehicles",icon:"⌁",category:"Assets",
    desc:"Track company vehicles, condition and business notes.",
    bullets:["Vehicle details","Mileage notes","Condition","Service reminders"],
    helper:"Create a company vehicle record with assignment, mileage and service details.",
    dueLabel:"Next Service Date",
    statuses:["Active","Needs Service","Out of Service","Sold / Retired","Archived"],
    fields:[
      {key:"title",label:"Vehicle Name / Unit",type:"text",required:true,wide:true},
      {key:"year",label:"Year",type:"number",placeholder:"2026"},
      {key:"makeModel",label:"Make / Model",type:"text",required:true},
      {key:"vin",label:"VIN",type:"text"},
      {key:"plate",label:"License Plate",type:"text"},
      {key:"mileage",label:"Current Mileage",type:"number"},
      {key:"condition",label:"Condition",type:"select",options:["Excellent","Good","Fair","Needs Repair","Out of Service"]},
      {key:"assignedTo",label:"Assigned To",type:"text"}
    ]
  },
  {
    id:"photo-proof",name:"Photo Proof",icon:"▣",category:"Jobs",
    desc:"Organize before, after and proof-of-work records.",
    bullets:["Before/after records","Damage documentation","Job references","Timestamp-ready workflow"],
    helper:"Save a job-proof record with a photo link/reference, location and capture details.",
    dueLabel:"Review Date",
    statuses:["Captured","Needs Review","Approved","Disputed","Archived"],
    fields:[
      {key:"title",label:"Job / Proof Title",type:"text",required:true,wide:true},
      {key:"jobReference",label:"Job / Customer Reference",type:"text"},
      {key:"proofType",label:"Proof Type",type:"select",options:["Before Work","After Work","Damage","Delivery","Completion","Inspection","Other"]},
      {key:"location",label:"Location",type:"text"},
      {key:"capturedAt",label:"Captured Date & Time",type:"datetime-local"},
      {key:"capturedBy",label:"Captured By",type:"text"},
      {key:"photoUrl",label:"Photo URL / File Reference",type:"url",wide:true,placeholder:"https://..."},
      {key:"customerName",label:"Customer / Client",type:"text"}
    ]
  },
  {
    id:"vendors",name:"Vendors",icon:"◇",category:"Admin",
    desc:"Keep supplier and vendor information together.",
    bullets:["Vendor contacts","Services supplied","Account notes","Pricing history notes"],
    helper:"Maintain supplier and service-provider contact/account information.",
    dueLabel:"Review / Renewal Date",
    statuses:["Active","Preferred","On Hold","Inactive","Archived"],
    fields:[
      {key:"title",label:"Vendor / Supplier Name",type:"text",required:true,wide:true},
      {key:"contactName",label:"Contact Person",type:"text"},
      {key:"service",label:"Product / Service Supplied",type:"text",required:true},
      {key:"phone",label:"Phone",type:"tel"},
      {key:"email",label:"Email",type:"email"},
      {key:"website",label:"Website",type:"url"},
      {key:"accountNumber",label:"Account Number",type:"text"},
      {key:"paymentTerms",label:"Payment Terms",type:"text",placeholder:"Net 30, COD, card..."}
    ]
  },
  {
    id:"subscriptions",name:"Subscriptions",icon:"$",category:"Admin",
    desc:"Track recurring business software and service costs.",
    bullets:["Monthly/yearly services","Renewal dates","Costs","Cancellation notes"],
    helper:"Track recurring business services, their cost and next billing date.",
    dueLabel:"Next Billing / Renewal",
    statuses:["Active","Trial","Canceling","Canceled","Archived"],
    fields:[
      {key:"title",label:"Subscription / Service",type:"text",required:true,wide:true},
      {key:"provider",label:"Provider",type:"text",required:true},
      {key:"cost",label:"Recurring Cost",type:"number",step:"0.01",placeholder:"0.00"},
      {key:"billingCycle",label:"Billing Cycle",type:"select",options:["Monthly","Quarterly","Semiannual","Annual","Other"]},
      {key:"accountEmail",label:"Account Email",type:"email"},
      {key:"paymentMethod",label:"Payment Method / Last 4",type:"text"},
      {key:"startedDate",label:"Started Date",type:"date"},
      {key:"cancelUrl",label:"Manage / Cancel URL",type:"url",wide:true}
    ]
  },
  {
    id:"documents",name:"Documents",icon:"▤",category:"Admin",
    desc:"Track important business documents and dates.",
    bullets:["Document register","Expiration dates","Responsible person","Reference notes"],
    helper:"Register important documents, where they are stored and when they expire.",
    dueLabel:"Expiration / Review Date",
    statuses:["Current","Needs Renewal","Expired","Replaced","Archived"],
    fields:[
      {key:"title",label:"Document Name",type:"text",required:true,wide:true},
      {key:"documentType",label:"Document Type",type:"select",options:["License","Permit","Insurance","Contract","Policy","Certificate","Registration","Tax","Other"]},
      {key:"referenceNumber",label:"Document / Reference Number",type:"text"},
      {key:"issuedBy",label:"Issued By",type:"text"},
      {key:"responsiblePerson",label:"Responsible Person",type:"text"},
      {key:"issueDate",label:"Issue Date",type:"date"},
      {key:"storageLocation",label:"Storage Location / URL",type:"text",wide:true},
      {key:"confidentiality",label:"Access Level",type:"select",options:["General","Internal","Restricted","Owner Only"]}
    ]
  },
  {
    id:"training",name:"Training",icon:"◎",category:"Employees",
    desc:"Track training and employee certification items.",
    bullets:["Training assignments","Completion status","Certification dates","Renewal dates"],
    helper:"Track employee training, certification and renewal requirements.",
    dueLabel:"Renewal / Expiration Date",
    statuses:["Assigned","In Progress","Completed","Expired","Archived"],
    fields:[
      {key:"title",label:"Training / Certification",type:"text",required:true,wide:true},
      {key:"employee",label:"Employee",type:"text",required:true},
      {key:"provider",label:"Training Provider",type:"text"},
      {key:"assignedDate",label:"Assigned Date",type:"date"},
      {key:"completionDate",label:"Completion Date",type:"date"},
      {key:"certificateNumber",label:"Certificate Number",type:"text"},
      {key:"score",label:"Score / Result",type:"text"},
      {key:"requiredByRole",label:"Required For",type:"text",placeholder:"Driver, supervisor, all staff..."}
    ]
  },
  {
    id:"website-monitor",name:"Website Monitor",icon:"◉",category:"Digital",
    desc:"Keep website checks, outages and maintenance notes.",
    bullets:["Website status checks","Outage history","SSL/domain notes","Maintenance reminders"],
    helper:"Log website/domain/SSL checks and issues. This version records checks; automatic remote uptime polling can be added later with a backend.",
    dueLabel:"Next Check Date",
    statuses:["Operational","Degraded","Down","Needs Attention","Archived"],
    fields:[
      {key:"title",label:"Website / Service Name",type:"text",required:true,wide:true},
      {key:"url",label:"Website URL",type:"url",required:true,wide:true,placeholder:"https://example.com"},
      {key:"checkType",label:"Check Type",type:"select",options:["Uptime","SSL Certificate","Domain Renewal","DNS","Content / Page","Form / Checkout","Other"]},
      {key:"checkedAt",label:"Last Checked",type:"datetime-local"},
      {key:"observedStatus",label:"Observed Status",type:"select",options:["Working","Slow","Intermittent","Down","Unknown"]},
      {key:"responseNotes",label:"Check Result / Issue",type:"textarea",wide:true},
      {key:"checkedBy",label:"Checked By",type:"text"}
    ]
  },
  {
    id:"qr-assets",name:"QR Assets",icon:"⌗",category:"Digital",
    desc:"Prepare asset records that can be linked to QR labels.",
    bullets:["QR-ready asset IDs","Instructions","Maintenance history","Location information"],
    helper:"Create a QR-ready asset record with a unique ID and the destination/instructions it should open.",
    dueLabel:"Review Date",
    statuses:["Active","Needs Update","Retired","Archived"],
    fields:[
      {key:"title",label:"QR Asset Name",type:"text",required:true,wide:true},
      {key:"assetId",label:"Asset / QR ID",type:"text",required:true},
      {key:"destinationUrl",label:"Destination URL",type:"url",wide:true},
      {key:"location",label:"Physical Location",type:"text"},
      {key:"assignedTo",label:"Assigned To",type:"text"},
      {key:"instructions",label:"Instructions / QR Content",type:"textarea",wide:true},
      {key:"lastUpdatedLabel",label:"Label Last Updated",type:"date"}
    ]
  },
  {
    id:"supplies",name:"Supply Alerts",icon:"△",category:"Operations",
    desc:"Record low-stock items and restocking needs.",
    bullets:["Low-stock reports","Urgency","Restock status","Supply location"],
    helper:"Track supply quantities, reorder points and restocking needs.",
    dueLabel:"Restock By",
    statuses:["In Stock","Low Stock","Out of Stock","Ordered","Archived"],
    fields:[
      {key:"title",label:"Supply Item",type:"text",required:true,wide:true},
      {key:"sku",label:"SKU / Item Number",type:"text"},
      {key:"location",label:"Storage Location",type:"text"},
      {key:"quantity",label:"Current Quantity",type:"number",required:true},
      {key:"reorderLevel",label:"Reorder Level",type:"number"},
      {key:"unit",label:"Unit",type:"text",placeholder:"boxes, each, gallons..."},
      {key:"supplier",label:"Preferred Supplier",type:"text"},
      {key:"urgency",label:"Urgency",type:"select",options:["Normal","Soon","High","Critical"]}
    ]
  },
  {
    id:"warranties",name:"Warranties",icon:"W",category:"Assets",
    desc:"Track purchase and warranty information for business assets.",
    bullets:["Purchase date","Warranty expiration","Manufacturer","Receipt/reference notes"],
    helper:"Record warranty coverage, purchase information and claim details for an asset.",
    dueLabel:"Warranty Expiration",
    statuses:["Active","Claim Open","Expired","Archived"],
    fields:[
      {key:"title",label:"Asset / Product",type:"text",required:true,wide:true},
      {key:"manufacturer",label:"Manufacturer",type:"text"},
      {key:"model",label:"Model",type:"text"},
      {key:"serialNumber",label:"Serial Number",type:"text"},
      {key:"purchaseDate",label:"Purchase Date",type:"date"},
      {key:"retailer",label:"Purchased From",type:"text"},
      {key:"warrantyType",label:"Warranty Type",type:"select",options:["Manufacturer","Extended","Service Plan","Lifetime","Other"]},
      {key:"claimContact",label:"Warranty / Claim Contact",type:"text",wide:true}
    ]
  },
  {
    id:"complaints",name:"Complaints",icon:"!",category:"Feedback",
    desc:"Record and follow up on customer complaints.",
    bullets:["Complaint history","Resolution status","Follow-up notes","Recurring issue visibility"],
    helper:"Document customer complaints, severity, ownership and resolution.",
    dueLabel:"Follow-up Due",
    statuses:["New","In Review","Waiting on Customer","Resolved","Archived"],
    fields:[
      {key:"title",label:"Complaint Title",type:"text",required:true,wide:true},
      {key:"customer",label:"Customer / Client",type:"text",required:true},
      {key:"contact",label:"Customer Contact",type:"text"},
      {key:"receivedAt",label:"Received Date & Time",type:"datetime-local"},
      {key:"channel",label:"Received Through",type:"select",options:["Phone","Email","Website","In Person","Social Media","Review Site","Other"]},
      {key:"category",label:"Complaint Category",type:"text"},
      {key:"severity",label:"Severity",type:"select",options:["Low","Moderate","High","Critical"]},
      {key:"assignedTo",label:"Assigned To",type:"text"},
      {key:"resolution",label:"Resolution / Response",type:"textarea",wide:true}
    ]
  },
  {
    id:"suggestions",name:"Suggestions",icon:"+",category:"Feedback",
    desc:"Capture employee and business improvement ideas.",
    bullets:["Employee suggestions","Improvement ideas","Priority","Implementation status"],
    helper:"Capture an improvement idea and track it from submission through implementation.",
    dueLabel:"Review By",
    statuses:["Submitted","Under Review","Approved","Rejected","Implemented","Archived"],
    fields:[
      {key:"title",label:"Suggestion Title",type:"text",required:true,wide:true},
      {key:"submittedBy",label:"Submitted By",type:"text",placeholder:"Name or Anonymous"},
      {key:"anonymous",label:"Anonymous",type:"select",options:["No","Yes"]},
      {key:"category",label:"Category",type:"select",options:["Operations","Safety","Customer Service","Cost Savings","Employee Experience","Technology","Other"]},
      {key:"priority",label:"Priority",type:"select",options:["Low","Normal","High"]},
      {key:"expectedBenefit",label:"Expected Benefit",type:"textarea",wide:true},
      {key:"estimatedEffort",label:"Estimated Effort",type:"select",options:["Small","Medium","Large","Unknown"]}
    ]
  },
  {
    id:"visitor-log",name:"Visitor Log",icon:"V",category:"Admin",
    desc:"Record visitors, vendors and contractors on site.",
    bullets:["Visitor name","Reason for visit","Arrival/departure","Contact notes"],
    helper:"Check visitors, vendors and contractors in and out of a business location.",
    dueLabel:"Follow-up Date",
    statuses:["On Site","Checked Out","Denied","Archived"],
    fields:[
      {key:"title",label:"Visitor Name",type:"text",required:true,wide:true},
      {key:"company",label:"Company / Organization",type:"text"},
      {key:"host",label:"Person Visiting / Host",type:"text"},
      {key:"reason",label:"Reason for Visit",type:"text",required:true},
      {key:"arrival",label:"Arrival",type:"datetime-local",required:true},
      {key:"departure",label:"Departure",type:"datetime-local"},
      {key:"phone",label:"Phone",type:"tel"},
      {key:"badge",label:"Badge / Pass Number",type:"text"}
    ]
  },
  {
    id:"package-log",name:"Package Log",icon:"□",category:"Admin",
    desc:"Track packages received by the business.",
    bullets:["Carrier/sender","Recipient","Received date","Pickup status"],
    helper:"Log incoming deliveries and track who was notified and who picked them up.",
    dueLabel:"Pickup / Action By",
    statuses:["Received","Recipient Notified","Picked Up","Returned","Archived"],
    fields:[
      {key:"title",label:"Package / Tracking Number",type:"text",required:true,wide:true},
      {key:"carrier",label:"Carrier",type:"select",options:["USPS","UPS","FedEx","Amazon","DHL","Courier","Other"]},
      {key:"sender",label:"Sender",type:"text"},
      {key:"recipient",label:"Recipient",type:"text",required:true},
      {key:"receivedAt",label:"Received Date & Time",type:"datetime-local",required:true},
      {key:"receivedBy",label:"Received By",type:"text"},
      {key:"storageLocation",label:"Stored At",type:"text"},
      {key:"pickedUpBy",label:"Picked Up By",type:"text"},
      {key:"pickupDate",label:"Pickup Date & Time",type:"datetime-local"}
    ]
  }
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
  return {...base,
    fields:base.fields || [{key:"title",label:`${base.name} Record`,type:"text",required:true,wide:true}],
    helper:base.helper || base.desc,
    dueLabel:base.dueLabel || "Due Date",
    statuses:base.statuses || ["Open","In Progress","Complete","Archived"]
  };
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
const publicSite=$("publicSite"), publicFooter=$("publicFooter"), appShell=$("appShell"), ownerShell=$("ownerShell"), authModal=$("authModal"), recordModal=$("recordModal");
function switchAuthTab(tab){document.querySelectorAll("[data-auth-tab]").forEach(b=>b.classList.toggle("active",b.dataset.authTab===tab));$("loginForm").classList.toggle("hidden",tab!=="login");$("signupForm").classList.toggle("hidden",tab!=="signup");$("authMessage").textContent="";}
document.querySelectorAll("[data-open-auth]").forEach(btn=>btn.addEventListener("click",()=>{switchAuthTab(btn.dataset.openAuth);authModal.classList.remove("hidden");}));
document.querySelectorAll("[data-auth-tab]").forEach(btn=>btn.addEventListener("click",()=>switchAuthTab(btn.dataset.authTab)));
document.querySelectorAll("[data-close-modal]").forEach(btn=>btn.addEventListener("click",()=>authModal.classList.add("hidden")));
authModal.addEventListener("click",e=>{if(e.target===authModal)authModal.classList.add("hidden")});

let currentUser=null,userProfile=null,business=null,records=[],currentPlatformAdmin=null,ownerBusinesses=[];
$("signupForm").addEventListener("submit",async e=>{
  e.preventDefault(); const message=$("authMessage"); message.className="form-message"; message.textContent="Creating account...";
  try{
    const businessName=$("signupBusinessName").value.trim(), ownerName=$("signupOwnerName").value.trim(), email=$("signupEmail").value.trim(), password=$("signupPassword").value;
    const credential=await createUserWithEmailAndPassword(auth,email,password); const uid=credential.user.uid; const businessId=crypto.randomUUID?crypto.randomUUID():`${uid}-${Date.now()}`;
    await updateProfile(credential.user,{displayName:ownerName});
    await setDoc(doc(db,"users",uid),{displayName:ownerName,email,businessId,role:"owner",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    await setDoc(doc(db,"businesses",businessId),{name:businessName,ownerUid:uid,ownerName,phone:"",website:"",enabledModules:defaultEnabledModules,plan:"starter",subscriptionStatus:"setup_required",platformStatus:"active",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    message.className="form-message success";message.textContent="Account created.";authModal.classList.add("hidden");
  }catch(error){console.error(error);message.textContent=friendlyAuthError(error.code);}
});
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();const message=$("authMessage");message.className="form-message";message.textContent="Logging in...";try{await signInWithEmailAndPassword(auth,$("loginEmail").value.trim(),$("loginPassword").value);authModal.classList.add("hidden");}catch(error){console.error(error);message.textContent=friendlyAuthError(error.code);}});
function friendlyAuthError(code=""){const map={"auth/email-already-in-use":"That email already has an account.","auth/invalid-email":"Enter a valid email address.","auth/weak-password":"Use a stronger password with at least 6 characters.","auth/invalid-credential":"Email or password is incorrect.","auth/operation-not-allowed":"Email/password Authentication has not been enabled in Firebase yet.","auth/too-many-requests":"Too many attempts. Try again later."};return map[code]||"Something went wrong. Check Firebase setup and try again.";}
$("logoutBtn").addEventListener("click",()=>signOut(auth));

onAuthStateChanged(auth,async user=>{
  currentUser=user;
  if(!user){userProfile=null;business=null;records=[];currentPlatformAdmin=null;ownerBusinesses=[];showPublic();return;}
  try{
    const adminSnap=await getDoc(doc(db,"platformAdmins",user.uid));
    if(adminSnap.exists() && adminSnap.data().active===true && adminSnap.data().role==="platform_owner"){
      currentPlatformAdmin={id:adminSnap.id,...adminSnap.data()};
      userProfile=null;business=null;records=[];
      await loadOwnerBusinesses();
      showOwnerApp();
      return;
    }

    currentPlatformAdmin=null;
    const userSnap=await getDoc(doc(db,"users",user.uid));
    if(!userSnap.exists())throw new Error("User profile not found.");
    userProfile={id:userSnap.id,...userSnap.data()};
    const businessSnap=await getDoc(doc(db,"businesses",userProfile.businessId));
    if(!businessSnap.exists())throw new Error("Business record not found or access is suspended.");
    business={id:businessSnap.id,...businessSnap.data()};
    await loadRecords();showApp();
  }catch(error){console.error(error);alert("This account could not be loaded. Check account access and Firestore setup.");await signOut(auth);}
});
function showPublic(){publicSite.classList.remove("hidden");publicFooter.classList.remove("hidden");appShell.classList.add("hidden");ownerShell.classList.add("hidden");document.querySelector(".site-header").classList.remove("hidden")}
function showApp(){publicSite.classList.add("hidden");publicFooter.classList.add("hidden");ownerShell.classList.add("hidden");document.querySelector(".site-header").classList.add("hidden");appShell.classList.remove("hidden");$("sidebarBusinessName").textContent=business.name;$("sidebarUserEmail").textContent=currentUser.email||"";$("settingsBusinessName").value=business.name||"";$("settingsOwnerName").value=business.ownerName||userProfile.displayName||"";$("settingsPhone").value=business.phone||"";$("settingsWebsite").value=business.website||"";renderModuleOptions();renderEverything();switchView("dashboard")}

async function loadOwnerBusinesses(){
  const snap=await getDocs(collection(db,"businesses"));
  ownerBusinesses=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>{
    const at=a.createdAt?.seconds||0,bt=b.createdAt?.seconds||0;return bt-at;
  });
}
function showOwnerApp(){
  publicSite.classList.add("hidden");publicFooter.classList.add("hidden");appShell.classList.add("hidden");document.querySelector(".site-header").classList.add("hidden");ownerShell.classList.remove("hidden");
  $("ownerDisplayName").textContent=currentPlatformAdmin.displayName||currentUser.displayName||"Silverforge Owner";
  $("ownerEmail").textContent=currentUser.email||currentPlatformAdmin.email||"";
  renderOwnerDashboard();
}

function timestampToDate(value){
  if(!value) return null;
  if(typeof value.toDate==="function") return value.toDate();
  if(value.seconds) return new Date(value.seconds*1000);
  const d=new Date(value); return Number.isNaN(d.getTime())?null:d;
}
function formatOwnerDate(value){
  const d=timestampToDate(value);
  return d ? d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) : "Not available";
}
function formatOwnerDateTime(value){
  const d=timestampToDate(value);
  return d ? d.toLocaleString(undefined,{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) : "Not available";
}
function renderOwnerDashboard(){
  const now=new Date();
  const sevenDaysAgo=new Date(now); sevenDaysAgo.setDate(now.getDate()-7);
  const thirtyDaysAgo=new Date(now); thirtyDaysAgo.setDate(now.getDate()-30);
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);

  const active=ownerBusinesses.filter(b=>b.subscriptionStatus==="active").length;
  const setup=ownerBusinesses.filter(b=>(b.subscriptionStatus||"setup_required")==="setup_required").length;
  const pastDue=ownerBusinesses.filter(b=>b.subscriptionStatus==="past_due").length;
  const canceled=ownerBusinesses.filter(b=>b.subscriptionStatus==="canceled").length;
  const suspended=ownerBusinesses.filter(b=>(b.platformStatus||"active")==="suspended").length;
  const last7=ownerBusinesses.filter(b=>{const d=timestampToDate(b.createdAt);return d&&d>=sevenDaysAgo;}).length;
  const last30=ownerBusinesses.filter(b=>{const d=timestampToDate(b.createdAt);return d&&d>=thirtyDaysAgo;}).length;
  const thisMonth=ownerBusinesses.filter(b=>{const d=timestampToDate(b.createdAt);return d&&d>=monthStart;}).length;
  const avgTools=ownerBusinesses.length
    ? ownerBusinesses.reduce((sum,b)=>sum+(Array.isArray(b.enabledModules)?b.enabledModules.length:0),0)/ownerBusinesses.length
    : 0;
  const mrr=active*.99;

  $("ownerStatBusinesses").textContent=ownerBusinesses.length;
  $("ownerStatActive").textContent=active;
  $("ownerStatSetup").textContent=setup;
  $("ownerStatPastDue").textContent=pastDue;
  $("ownerStatCanceled").textContent=canceled;
  $("ownerStatSuspended").textContent=suspended;
  $("ownerStat7Days").textContent=last7;
  $("ownerStat30Days").textContent=last30;
  $("ownerStatThisMonth").textContent=thisMonth;
  $("ownerStatAvgTools").textContent=avgTools.toFixed(1);
  $("ownerStatRevenue").textContent=`$${mrr.toFixed(2)}`;
  $("ownerStatAnnual").textContent=`$${(mrr*12).toFixed(2)}`;
  $("ownerStatBusinessesSub").textContent=`${active} active • ${suspended} suspended`;
  $("ownerStatActiveSub").textContent=ownerBusinesses.length?`${Math.round((active/ownerBusinesses.length)*100)}% of businesses`:"No customers yet";
  $("ownerStatRevenueSub").textContent=`$0.99 × ${active} active account${active===1?"":"s"}`;

  renderOwnerTools();
  renderOwnerBusinesses();
}
function renderOwnerTools(){
  const q=($("ownerToolSearch")?.value||"").trim().toLowerCase();
  const filtered=toolDefinitions.filter(t=>{
    const text=`${t.name||""} ${t.category||""} ${t.desc||""}`.toLowerCase();
    return !q || text.includes(q);
  });

  if($("ownerToolSummary")){
    $("ownerToolSummary").textContent=`${filtered.length} tool${filtered.length===1?"":"s"} shown`;
  }
  if(!$("ownerToolsGrid"))return;

  $("ownerToolsGrid").innerHTML=filtered.map(t=>{
    const enabledCount=ownerBusinesses.filter(b=>Array.isArray(b.enabledModules)&&b.enabledModules.includes(t.id)).length;
    const percent=ownerBusinesses.length ? Math.round((enabledCount/ownerBusinesses.length)*100) : 0;
    return `<article class="owner-tool-card" data-owner-tool-preview="${t.id}" tabindex="0" role="button" aria-label="Preview ${safeText(t.name)} form">
      <div class="owner-tool-card-top">
        <span class="owner-tool-card-icon">${safeText(t.icon)}</span>
        <span class="owner-tool-card-category">${safeText(t.category)}</span>
      </div>
      <h4>${safeText(t.name)}</h4>
      <p>${safeText(t.desc)}</p>
      <div class="owner-tool-usage">
        <span>Enabled by</span>
        <strong>${enabledCount} business${enabledCount===1?"":"es"} (${percent}%)</strong>
      </div>
      <div class="owner-tool-open-hint">Open form preview →</div>
    </article>`;
  }).join("") || '<div class="empty-state">No tools match your search.</div>';

  document.querySelectorAll("[data-owner-tool-preview]").forEach(card=>{
    const open=()=>openOwnerToolPreview(card.dataset.ownerToolPreview);
    card.addEventListener("click",open);
    card.addEventListener("keydown",e=>{
      if(e.key==="Enter"||e.key===" "){
        e.preventDefault();
        open();
      }
    });
  });
}


function ownerPreviewFieldHtml(field){
  const required=field.required?" • Required":" • Optional";
  const typeLabel=field.type==="select"
    ? `Select: ${(field.options||[]).join(", ")}`
    : field.type==="textarea" ? "Long text"
    : field.type==="datetime-local" ? "Date & time"
    : field.type==="date" ? "Date"
    : field.type==="number" ? "Number"
    : field.type==="email" ? "Email"
    : field.type==="tel" ? "Phone"
    : field.type==="url" ? "URL"
    : "Text";

  const attrs=`class="input" disabled ${field.placeholder?`placeholder="${safeText(field.placeholder)}"`:""}`;
  let control="";
  if(field.type==="select"){
    control=`<select ${attrs}>${(field.options||[]).map(o=>`<option>${safeText(o)}</option>`).join("")}</select>`;
  }else if(field.type==="textarea"){
    control=`<textarea ${attrs} rows="4" placeholder="${safeText(field.placeholder||"Enter details...")}"></textarea>`;
  }else{
    const inputType=["date","datetime-local","number","email","tel","url"].includes(field.type)?field.type:"text";
    control=`<input type="${inputType}" ${attrs} />`;
  }

  return {
    form:`<label class="${field.wide?"field-wide":""}">${safeText(field.label)}${field.required?" *":""}${control}${field.help?`<span class="field-help">${safeText(field.help)}</span>`:""}</label>`,
    config:`<div class="owner-tool-config-row"><strong>${safeText(field.label)}</strong><span>${safeText(typeLabel+required)}</span></div>`
  };
}

function openOwnerToolPreview(id){
  const t=toolById(id);
  if(!t)return;

  $("ownerToolPreviewIcon").textContent=t.icon||"•";
  $("ownerToolPreviewCategory").textContent=(t.category||"Other").toUpperCase();
  $("ownerToolPreviewTitle").textContent=t.name||"Tool Preview";
  $("ownerToolPreviewDescription").textContent=t.desc||"";
  $("ownerToolPreviewHelper").textContent=t.helper||t.desc||"—";
  $("ownerToolPreviewDueLabel").textContent=t.dueLabel||"Due Date";
  $("ownerToolPreviewStatusCount").textContent=String((t.statuses||[]).length);
  $("ownerToolPreviewFieldCount").textContent=String((t.fields||[]).length);
  $("ownerPreviewToolName").value=t.name||"";

  const rendered=(t.fields||[]).map(ownerPreviewFieldHtml);
  $("ownerToolPreviewFields").innerHTML=rendered.map(x=>x.form).join("");
  $("ownerToolConfigList").innerHTML=rendered.map(x=>x.config).join("");

  $("ownerToolPreviewStatus").innerHTML=(t.statuses||["Open","In Progress","Complete","Archived"])
    .map(s=>`<option>${safeText(s)}</option>`).join("");

  $("ownerToolPreviewDueField").childNodes[0].nodeValue=`${t.dueLabel||"Due Date"} `;

  $("ownerToolPreviewBullets").innerHTML=(t.bullets||[])
    .map(item=>`<li>${safeText(item)}</li>`).join("");

  $("ownerToolPreviewModal").classList.remove("hidden");
}

document.querySelectorAll("[data-close-owner-tool-preview]").forEach(btn=>{
  btn.addEventListener("click",()=>$("ownerToolPreviewModal").classList.add("hidden"));
});
$("ownerToolPreviewModal").addEventListener("click",e=>{
  if(e.target===$("ownerToolPreviewModal")) $("ownerToolPreviewModal").classList.add("hidden");
});

function ownerStatusClass(value=""){return String(value).toLowerCase().replaceAll(" ","_")}
function renderOwnerBusinesses(){
  const q=($("ownerBusinessSearch").value||"").trim().toLowerCase();
  const subscriptionFilter=$("ownerSubscriptionFilter")?.value||"all";
  const accessFilter=$("ownerAccessFilter")?.value||"all";

  const filtered=ownerBusinesses.filter(b=>{
    const text=`${b.name||""} ${b.ownerName||""} ${b.website||""} ${b.phone||""} ${b.subscriptionStatus||""} ${b.id||""}`.toLowerCase();
    const subscription=b.subscriptionStatus||"setup_required";
    const access=b.platformStatus||"active";
    return (!q||text.includes(q))
      && (subscriptionFilter==="all"||subscription===subscriptionFilter)
      && (accessFilter==="all"||access===accessFilter);
  });

  $("ownerResultCount").textContent=`${filtered.length} business${filtered.length===1?"":"es"}`;
  $("ownerBusinessList").innerHTML=filtered.length?filtered.map(b=>{
    const subscription=b.subscriptionStatus||"setup_required";
    const access=b.platformStatus||"active";
    const tools=Array.isArray(b.enabledModules)?b.enabledModules.length:0;
    return `<div class="owner-business-row detailed">
      <div class="owner-business-main">
        <strong>${safeText(b.name||"Unnamed Business")}</strong>
        <span>${safeText(b.ownerName||"No owner name")}</span>
        <div class="owner-business-contact">
          ${b.phone?`<span>${safeText(b.phone)}</span>`:""}
          ${b.website?`<span>${safeText(b.website)}</span>`:""}
          <span class="owner-business-id">ID: ${safeText(b.id)}</span>
        </div>
      </div>
      <div class="owner-business-meta">
        <strong>Toolbox Usage</strong>
        <span class="owner-tool-count">${tools} enabled tool${tools===1?"":"s"}</span>
        <span class="owner-date">Joined ${safeText(formatOwnerDate(b.createdAt))}</span>
      </div>
      <div class="owner-business-meta">
        <strong>Subscription</strong>
        <span class="owner-status ${ownerStatusClass(subscription)}">${safeText(subscription.replaceAll("_"," "))}</span>
        <span>Plan: ${safeText(b.plan||"starter")}</span>
      </div>
      <div class="owner-business-meta">
        <strong>Platform Access</strong>
        <span class="owner-status ${ownerStatusClass(access)}">${safeText(access)}</span>
        <span>Updated ${safeText(formatOwnerDate(b.updatedAt))}</span>
      </div>
      <div class="owner-actions">
        <button class="mini-btn view-details-btn" data-owner-view="${b.id}">View Details</button>
        <select class="input" data-owner-subscription="${b.id}" aria-label="Subscription status for ${safeText(b.name||"business")}">
          ${["setup_required","active","past_due","canceled"].map(v=>`<option value="${v}" ${v===subscription?"selected":""}>${v.replaceAll("_"," ")}</option>`).join("")}
        </select>
        <button class="mini-btn ${access==="suspended"?"":"danger"}" data-owner-access="${b.id}" data-next-access="${access==="suspended"?"active":"suspended"}">${access==="suspended"?"Restore Access":"Suspend Access"}</button>
      </div>
    </div>`;
  }).join(""):'<div class="empty-state">No business accounts match the current filters.</div>';

  document.querySelectorAll("[data-owner-view]").forEach(btn=>btn.onclick=()=>openOwnerBusinessDetails(btn.dataset.ownerView));
  document.querySelectorAll("[data-owner-subscription]").forEach(select=>select.onchange=async()=>{
    const id=select.dataset.ownerSubscription;
    await updateDoc(doc(db,"businesses",id),{subscriptionStatus:select.value,updatedAt:serverTimestamp()});
    const found=ownerBusinesses.find(b=>b.id===id);if(found)found.subscriptionStatus=select.value;
    renderOwnerDashboard();
  });
  document.querySelectorAll("[data-owner-access]").forEach(btn=>btn.onclick=async()=>{
    const id=btn.dataset.ownerAccess,next=btn.dataset.nextAccess;
    const label=next==="suspended"?"Suspend this business's platform access?":"Restore this business's platform access?";
    if(!confirm(label))return;
    await updateDoc(doc(db,"businesses",id),{platformStatus:next,updatedAt:serverTimestamp()});
    const found=ownerBusinesses.find(b=>b.id===id);if(found)found.platformStatus=next;
    renderOwnerDashboard();
  });
}

let ownerDetailBusinessId=null;
async function openOwnerBusinessDetails(id){
  const b=ownerBusinesses.find(item=>item.id===id);
  if(!b)return;
  ownerDetailBusinessId=id;
  const access=b.platformStatus||"active";
  const subscription=b.subscriptionStatus||"setup_required";
  const tools=Array.isArray(b.enabledModules)?b.enabledModules:[];

  $("ownerBusinessModalTitle").textContent=b.name||"Unnamed Business";
  $("ownerBusinessModalSubtitle").textContent=b.ownerName?`Owned by ${b.ownerName}`:"Business account";
  $("ownerDetailAccessBadge").textContent=access;
  $("ownerDetailAccessBadge").className=`owner-status ${ownerStatusClass(access)}`;
  $("ownerDetailSubscription").value=subscription;
  $("ownerDetailToggleAccess").textContent=access==="suspended"?"Restore Access":"Suspend Access";
  $("ownerDetailToggleAccess").className=`btn ${access==="suspended"?"btn-secondary":"btn-ghost"}`;

  const businessInfo=[
    ["Business ID",b.id],
    ["Business Name",b.name||"Not set"],
    ["Owner Name",b.ownerName||"Not set"],
    ["Owner UID",b.ownerUid||"Not available"],
    ["Phone",b.phone||"Not set"],
    ["Website",b.website||"Not set"]
  ];
  $("ownerDetailBusinessInfo").innerHTML=businessInfo.map(([k,v])=>`<div class="owner-detail-item"><span>${safeText(k)}</span><strong>${safeText(v)}</strong></div>`).join("");

  const accountInfo=[
    ["Plan",b.plan||"starter"],
    ["Subscription",subscription.replaceAll("_"," ")],
    ["Platform Access",access],
    ["Created",formatOwnerDateTime(b.createdAt)],
    ["Last Updated",formatOwnerDateTime(b.updatedAt)],
    ["Enabled Tools",String(tools.length)]
  ];
  $("ownerDetailAccountInfo").innerHTML=accountInfo.map(([k,v])=>`<div class="owner-detail-item"><span>${safeText(k)}</span><strong>${safeText(v)}</strong></div>`).join("");

  $("ownerDetailToolCount").textContent=`${tools.length} enabled`;
  $("ownerDetailTools").innerHTML=tools.length
    ? tools.map(id=>{const t=toolById(id);return `<span class="owner-detail-tool">${safeText(t.icon)} ${safeText(t.name)}</span>`}).join("")
    : '<span class="owner-detail-tool">No tools enabled</span>';

  $("ownerDetailRecordCount").textContent="Loading records...";
  $("ownerDetailActivity").innerHTML='<div class="empty-state">Loading toolbox activity...</div>';
  $("ownerBusinessModal").classList.remove("hidden");

  try{
    const snap=await getDocs(collection(db,"businesses",id,"records"));
    const detailRecords=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>{
      const at=a.createdAt?.seconds||a.updatedAt?.seconds||0;
      const bt=b.createdAt?.seconds||b.updatedAt?.seconds||0;
      return bt-at;
    });
    $("ownerDetailRecordCount").textContent=`${detailRecords.length} total record${detailRecords.length===1?"":"s"}`;
    $("ownerDetailActivity").innerHTML=detailRecords.length
      ? detailRecords.slice(0,8).map(r=>{
          const t=toolById(r.module);
          return `<div class="owner-activity-row"><div><strong>${safeText(r.title||"Untitled")}</strong><span>${safeText(t.name)} • ${safeText(r.status||"Open")}</span></div><span>${safeText(formatOwnerDate(r.updatedAt||r.createdAt))}</span></div>`;
        }).join("")
      : '<div class="empty-state">This business has not created any toolbox records yet.</div>';
  }catch(error){
    console.error(error);
    $("ownerDetailRecordCount").textContent="Could not load records";
    $("ownerDetailActivity").innerHTML='<div class="empty-state">Record activity could not be loaded. Check owner Firestore permissions.</div>';
  }
}

document.querySelectorAll("[data-close-owner-business]").forEach(btn=>btn.addEventListener("click",()=>$("ownerBusinessModal").classList.add("hidden")));
$("ownerBusinessModal").addEventListener("click",e=>{if(e.target===$("ownerBusinessModal"))$("ownerBusinessModal").classList.add("hidden")});
$("ownerDetailSaveSubscription").addEventListener("click",async()=>{
  if(!ownerDetailBusinessId)return;
  const value=$("ownerDetailSubscription").value;
  await updateDoc(doc(db,"businesses",ownerDetailBusinessId),{subscriptionStatus:value,updatedAt:serverTimestamp()});
  const found=ownerBusinesses.find(b=>b.id===ownerDetailBusinessId);if(found)found.subscriptionStatus=value;
  renderOwnerDashboard();
  await openOwnerBusinessDetails(ownerDetailBusinessId);
});
$("ownerDetailToggleAccess").addEventListener("click",async()=>{
  if(!ownerDetailBusinessId)return;
  const found=ownerBusinesses.find(b=>b.id===ownerDetailBusinessId);if(!found)return;
  const current=found.platformStatus||"active";
  const next=current==="suspended"?"active":"suspended";
  if(!confirm(next==="suspended"?"Suspend this business's platform access?":"Restore this business's platform access?"))return;
  await updateDoc(doc(db,"businesses",ownerDetailBusinessId),{platformStatus:next,updatedAt:serverTimestamp()});
  found.platformStatus=next;
  renderOwnerDashboard();
  await openOwnerBusinessDetails(ownerDetailBusinessId);
});

$("ownerToolSearch").addEventListener("input",renderOwnerTools);
$("ownerBusinessSearch").addEventListener("input",renderOwnerBusinesses);
$("ownerSubscriptionFilter").addEventListener("change",renderOwnerBusinesses);
$("ownerAccessFilter").addEventListener("change",renderOwnerBusinesses);
$("ownerRefreshBtn").addEventListener("click",async()=>{
  $("ownerRefreshBtn").disabled=true;
  $("ownerRefreshBtn").textContent="Refreshing...";
  try{await loadOwnerBusinesses();renderOwnerDashboard();}
  finally{$("ownerRefreshBtn").disabled=false;$("ownerRefreshBtn").textContent="Refresh Data";}
});
$("ownerLogoutBtn").addEventListener("click",()=>signOut(auth));

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
function renderDynamicFields(moduleId,record=null){
  const t=toolById(moduleId);
  $("recordEyebrow").textContent=t.category.toUpperCase();
  $("recordModalHelper").textContent=t.helper;
  $("dynamicFields").innerHTML=t.fields.map(f=>fieldHtml(f,f.key==="title"?(record?.title||""):(record?.fields?.[f.key]||""))).join("");
  $("dueDateLabel").childNodes[0].nodeValue=`${t.dueLabel} `;
  const currentStatus=record?.status||t.statuses[0];
  $("recordStatus").innerHTML=t.statuses.map(s=>`<option value="${safeText(s)}">${safeText(s)}</option>`).join("");
  $("recordStatus").value=currentStatus;
}
function openRecordModal(record=null){$("recordForm").reset();$("recordMessage").textContent="";$("recordId").value=record?.id||"";let moduleId=record?.module||($("recordModuleFilter").value!=="all"?$("recordModuleFilter").value:enabledModules()[0]||"tasks");$("recordModule").value=moduleId;$("recordModalTitle").textContent=record?`Edit ${toolById(moduleId).name}`:`Add ${toolById(moduleId).name}`;renderDynamicFields(moduleId,record);if(record?.status && [...$("recordStatus").options].some(o=>o.value===record.status)) $("recordStatus").value=record.status;$("recordDueDate").value=record?.dueDate||"";$("recordDetails").value=record?.details||"";recordModal.classList.remove("hidden");}
$("recordModule").addEventListener("change",()=>{$("recordModalTitle").textContent=`Add ${toolById($("recordModule").value).name}`;renderDynamicFields($("recordModule").value,null)});
$("addRecordBtn").addEventListener("click",()=>openRecordModal());$("quickAddBtn").addEventListener("click",()=>openRecordModal());document.querySelectorAll("[data-close-record]").forEach(btn=>btn.addEventListener("click",()=>recordModal.classList.add("hidden")));recordModal.addEventListener("click",e=>{if(e.target===recordModal)recordModal.classList.add("hidden")});
$("recordForm").addEventListener("submit",async e=>{
  e.preventDefault();const id=$("recordId").value,moduleId=$("recordModule").value,t=toolById(moduleId),fields={};let title="";
  for(const f of t.fields){
    const el=$(`toolField_${f.key}`);
    const value=el?.value?.trim?el.value.trim():el?.value||"";
    if(f.required && !value){
      $("recordMessage").textContent=`${f.label} is required.`;
      el?.focus();
      return;
    }
    if(f.key==="title")title=value;else fields[f.key]=value;
  }
  const payload={module:moduleId,title,status:$("recordStatus").value,dueDate:$("recordDueDate").value||"",details:$("recordDetails").value.trim(),fields,updatedAt:serverTimestamp(),updatedBy:currentUser.uid};
  try{if(id)await updateDoc(doc(db,"businesses",business.id,"records",id),payload);else await addDoc(collection(db,"businesses",business.id,"records"),{...payload,createdAt:serverTimestamp(),createdBy:currentUser.uid});await loadRecords();renderEverything();recordModal.classList.add("hidden");}catch(error){console.error(error);$("recordMessage").textContent="Could not save this item. Check Firestore rules.";}
});

$("businessSettingsForm").addEventListener("submit",async e=>{e.preventDefault();const updates={name:$("settingsBusinessName").value.trim(),ownerName:$("settingsOwnerName").value.trim(),phone:$("settingsPhone").value.trim(),website:$("settingsWebsite").value.trim(),updatedAt:serverTimestamp()};await updateDoc(doc(db,"businesses",business.id),updates);Object.assign(business,updates);$("sidebarBusinessName").textContent=business.name;alert("Business settings saved.");});
const views={dashboard:[$("dashboardView"),"OVERVIEW","Dashboard"],tools:[$("toolsView"),"MODULES","Tools"],records:[$("recordsView"),"BUSINESS DATA","All Records"],settings:[$("settingsView"),"ACCOUNT","Settings"]};
function switchView(name){Object.entries(views).forEach(([key,[el]])=>el.classList.toggle("hidden",key!==name));document.querySelectorAll("[data-view]").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===name));$("viewEyebrow").textContent=views[name][1];$("viewTitle").textContent=views[name][2];if(window.innerWidth<=780)$("sidebar").classList.remove("open");}
document.querySelectorAll("[data-view]").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));document.querySelectorAll("[data-go-tools]").forEach(btn=>btn.addEventListener("click",()=>switchView("tools")));$("sidebarToggle").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
