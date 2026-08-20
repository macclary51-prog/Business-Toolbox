import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc,
  getDocs, deleteDoc, serverTimestamp, query, orderBy, limit
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
    statuses:["Open","In Progress","Complete","Archived"],
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
    statuses:["Ready","In Progress","Complete","Archived"],
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
    statuses:["Available","Assigned","Needs Repair","Out of Service","Archived"],
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
    statuses:["Scheduled","In Progress","Complete","Canceled","Archived"],
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
    statuses:["Current","Due Soon","Renewed","Expired","Archived"],
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
    statuses:["Open","Investigating","Follow-up","Resolved","Archived"],
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
    statuses:["Open","Acknowledged","Resolved","Archived"],
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
    statuses:["Checked Out","Returned","Overdue","Archived"],
    fields:[
      {key:"title",label:"Asset Name",type:"text",required:true,wide:true},
      {key:"assetId",label:"Asset / Tag Number",type:"text"},
      {key:"checkedOutTo",label:"Checked Out To",type:"text"},
      {key:"checkoutDate",label:"Checkout Date",type:"date"},
      {key:"conditionOut",label:"Condition When Issued",type:"select",options:["Excellent","Good","Fair","Damaged"]},
      {key:"returnDate",label:"Actual Return Date",type:"date"},
      {key:"conditionIn",label:"Condition When Returned",type:"select",options:["Excellent","Good","Fair","Damaged","Not Returned"]}
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


const defaultPlatformSite={
  heroEyebrow:"ONE TOOLBOX. YOUR BUSINESS. YOUR TOOLS.",
  heroTitle:"Keep everyday business operations organized.",
  heroCopy:"Choose the tools your company actually needs. Track tasks, equipment, maintenance, renewals, incidents, handoffs, checklists and more from one simple dashboard.",
  primaryCta:"Create Your Business Account",
  secondaryCta:"Explore the Tools",
  featuresTitle:"Find the tools that fit your business.",
  featuresCopy:"Search the toolbox or filter by category. Select a tool to see exactly what it tracks.",
  howTitle:"Simple enough to start in minutes."
};
const defaultPlatformPricing={
  label:"BUSINESS TOOLBOX",
  price:"$0.99",
  period:"/ month",
  title:"Useful business tools for 99¢ a month.",
  copy:"One affordable toolbox with modules businesses can turn on and off as they need them.",
  button:"Create Account",
  note:"Subscription checkout can be connected after the website features are finished.",
  features:["Business dashboard","Tool-specific business modules","Mobile-friendly website","Customizable active tools","Business data separated by account"]
};
const defaultPlatformSettings={
  brandName:"Silverforge Business Toolbox",
  tagline:"Simple tools for small businesses.",
  companyName:"Silverforge Digital Solutions",
  supportEmail:"",
  supportPhone:"",
  defaultPlan:"starter"
};
let platformSite={...defaultPlatformSite};
let platformPricing={...defaultPlatformPricing};
let platformSettings={...defaultPlatformSettings};
let platformFeatureConfig={};

function publicToolDefinition(tool){
  const override=platformFeatureConfig?.[tool.id]||{};
  return {...tool,desc:override.desc||tool.desc,publicVisible:override.visible!==false};
}
async function loadPlatformConfig(){
  try{
    const [siteSnap,pricingSnap,settingsSnap,featuresSnap]=await Promise.all([
      getDoc(doc(db,"platformConfig","site")),
      getDoc(doc(db,"platformConfig","pricing")),
      getDoc(doc(db,"platformConfig","settings")),
      getDoc(doc(db,"platformConfig","features"))
    ]);
    if(siteSnap.exists()) platformSite={...defaultPlatformSite,...siteSnap.data()};
    if(pricingSnap.exists()){
      const data=pricingSnap.data();
      platformPricing={...defaultPlatformPricing,...data,features:Array.isArray(data.features)?data.features:defaultPlatformPricing.features};
    }
    if(settingsSnap.exists()) platformSettings={...defaultPlatformSettings,...settingsSnap.data()};
    if(featuresSnap.exists()) platformFeatureConfig=featuresSnap.data().tools||{};
  }catch(error){
    console.warn("Platform config could not be loaded yet.",error);
  }
  applyPlatformConfig();
}
function applyPlatformConfig(){
  if($("publicHeroEyebrow"))$("publicHeroEyebrow").textContent=platformSite.heroEyebrow;
  if($("publicHeroTitle"))$("publicHeroTitle").textContent=platformSite.heroTitle;
  if($("publicHeroCopy"))$("publicHeroCopy").textContent=platformSite.heroCopy;
  if($("publicHeroPrimaryCta"))$("publicHeroPrimaryCta").textContent=platformSite.primaryCta;
  if($("publicHeroSecondaryCta"))$("publicHeroSecondaryCta").textContent=platformSite.secondaryCta;
  if($("publicFeaturesTitle"))$("publicFeaturesTitle").textContent=platformSite.featuresTitle;
  if($("publicFeaturesCopy"))$("publicFeaturesCopy").textContent=platformSite.featuresCopy;
  if($("publicHowTitle"))$("publicHowTitle").textContent=platformSite.howTitle;

  if($("publicPricingTitle"))$("publicPricingTitle").textContent=platformPricing.title;
  if($("publicPricingCopy"))$("publicPricingCopy").textContent=platformPricing.copy;
  if($("publicPlanLabel"))$("publicPlanLabel").textContent=platformPricing.label;
  if($("publicPlanPrice"))$("publicPlanPrice").textContent=platformPricing.price;
  if($("publicPlanPeriod"))$("publicPlanPeriod").textContent=platformPricing.period;
  if($("publicPricingCta"))$("publicPricingCta").textContent=platformPricing.button;
  if($("publicPricingNote"))$("publicPricingNote").textContent=platformPricing.note;
  if($("publicPlanFeatures"))$("publicPlanFeatures").innerHTML=(platformPricing.features||[]).map(x=>`<li>${safeText(x)}</li>`).join("");

  if($("publicBrandName"))$("publicBrandName").textContent=platformSettings.brandName;
  if($("publicFooterBrand"))$("publicFooterBrand").textContent=platformSettings.brandName;
  if($("publicFooterTagline"))$("publicFooterTagline").textContent=platformSettings.tagline;
  if($("publicFooterCompany"))$("publicFooterCompany").textContent=platformSettings.companyName;

  renderPublicFeatures();
  renderFeatureDetail();
}

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
  const publicTools=toolDefinitions.map(publicToolDefinition).filter(t=>t.publicVisible);
  const filtered=publicTools.filter(t=>(publicCategory==="All"||t.category===publicCategory)&&(!q||`${t.name} ${t.desc} ${t.category} ${(t.bullets||[]).join(" ")}`.toLowerCase().includes(q)));
  if(!publicTools.some(t=>t.id===selectedPublicTool) && publicTools.length) selectedPublicTool=publicTools[0].id;
  $("publicFeatureGrid").innerHTML=filtered.length?filtered.map(t=>`<button class="feature-card ${t.id===selectedPublicTool?"active":""}" data-public-tool="${t.id}"><div class="feature-card-top"><span class="feature-icon">${safeText(t.icon)}</span><span class="feature-category">${safeText(t.category.toUpperCase())}</span></div><h3>${safeText(t.name)}</h3><p>${safeText(t.desc)}</p></button>`).join(""):'<div class="no-features">No tools match that search.</div>';
  document.querySelectorAll("[data-public-tool]").forEach(btn=>btn.onclick=()=>{selectedPublicTool=btn.dataset.publicTool;renderPublicFeatures();renderFeatureDetail();});
}
function renderFeatureDetail(){
  const base=toolDefinitions.find(t=>t.id===selectedPublicTool)||toolDefinitions[0];
  const t=publicToolDefinition(base);
  $("detailIcon").textContent=t.icon; $("detailCategory").textContent=t.category.toUpperCase(); $("detailName").textContent=t.name; $("detailDescription").textContent=t.desc;
  $("detailBullets").innerHTML=(t.bullets||[]).map(b=>`<li>${safeText(b)}</li>`).join("");
}
$("featureSearch").addEventListener("input",e=>{publicSearch=e.target.value;renderPublicFeatures();});
renderFeatureCategories(); renderPublicFeatures(); renderFeatureDetail();
loadPlatformConfig();

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
    await setDoc(doc(db,"businesses",businessId),{name:businessName,ownerUid:uid,ownerName,phone:"",website:"",enabledModules:defaultEnabledModules,plan:platformSettings.defaultPlan||"starter",subscriptionStatus:"setup_required",platformStatus:"active",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
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
      await Promise.all([loadOwnerBusinesses(),loadPlatformConfig()]);
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
function showPublic(){publicSite.classList.remove("hidden");publicFooter.classList.remove("hidden");appShell.classList.add("hidden");ownerShell.classList.add("hidden");document.querySelector(".site-header").classList.remove("hidden");$("ownerPublicPreviewBar")?.classList.add("hidden");document.body.classList.remove("owner-previewing-public")}
function showApp(){publicSite.classList.add("hidden");publicFooter.classList.add("hidden");ownerShell.classList.add("hidden");document.querySelector(".site-header").classList.add("hidden");$("ownerPublicPreviewBar")?.classList.add("hidden");document.body.classList.remove("owner-previewing-public");appShell.classList.remove("hidden");$("sidebarBusinessName").textContent=business.name;$("sidebarUserEmail").textContent=currentUser.email||"";$("settingsBusinessName").value=business.name||"";$("settingsOwnerName").value=business.ownerName||userProfile.displayName||"";$("settingsPhone").value=business.phone||"";$("settingsWebsite").value=business.website||"";renderModuleOptions();renderEverything();switchView("dashboard")}


const ownerViews={
  overview:$("ownerOverviewView"),
  businesses:$("ownerBusinessesView"),
  subscriptions:$("ownerSubscriptionsView"),
  tools:$("ownerToolsView"),
  homepage:$("ownerHomepageView"),
  pricing:$("ownerPricingView"),
  features:$("ownerFeaturesView"),
  activity:$("ownerActivityView"),
  reports:$("ownerReportsView"),
  attention:$("ownerAttentionView"),
  settings:$("ownerSettingsView")
};
function switchOwnerView(name){
  Object.entries(ownerViews).forEach(([key,el])=>el?.classList.toggle("hidden",key!==name));
  document.querySelectorAll("[data-owner-view]").forEach(btn=>btn.classList.toggle("active",btn.dataset.ownerView===name));
  if(name==="homepage")populateOwnerHomepageForm();
  if(name==="pricing")populateOwnerPricingForm();
  if(name==="features")renderOwnerFeatureManager();
  if(name==="activity"&&!ownerActivityLoaded)loadOwnerActivity();
  if(name==="reports")renderOwnerReports();
  if(name==="settings")populateOwnerPlatformSettings();
}
document.querySelectorAll("[data-owner-view]").forEach(btn=>btn.addEventListener("click",()=>switchOwnerView(btn.dataset.ownerView)));
document.querySelectorAll("[data-owner-jump]").forEach(btn=>btn.addEventListener("click",()=>switchOwnerView(btn.dataset.ownerJump)));


let ownerPreviewReturnView="overview";
function ownerPreviewLabel(target){
  const labels={
    top:"Homepage",
    features:"Features",
    "business-types":"Business Examples",
    "how-it-works":"How It Works",
    pricing:"Pricing / Subscription",
    login:"Login",
    signup:"Create Account"
  };
  return labels[target]||"Public Website";
}
function openOwnerPublicPreview(target="top",authMode=null){
  ownerPreviewReturnView=document.querySelector("[data-owner-view].active")?.dataset.ownerView||"overview";
  ownerShell.classList.add("hidden");
  appShell.classList.add("hidden");
  publicSite.classList.remove("hidden");
  publicFooter.classList.remove("hidden");
  document.querySelector(".site-header").classList.remove("hidden");
  $("ownerPublicPreviewBar").classList.remove("hidden");
  $("ownerPublicPreviewLabel").textContent=`Viewing: ${ownerPreviewLabel(authMode||target)}`;
  document.body.classList.add("owner-previewing-public");

  if(authMode){
    switchAuthTab(authMode);
    authModal.classList.remove("hidden");
    window.scrollTo({top:0,behavior:"smooth"});
    return;
  }

  authModal.classList.add("hidden");
  const el=target==="top"?$("top"):$(target);
  if(el) setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"start"}),20);
}
function returnToOwnerConsole(){
  authModal.classList.add("hidden");
  publicSite.classList.add("hidden");
  publicFooter.classList.add("hidden");
  document.querySelector(".site-header").classList.add("hidden");
  appShell.classList.add("hidden");
  ownerShell.classList.remove("hidden");
  $("ownerPublicPreviewBar").classList.add("hidden");
  document.body.classList.remove("owner-previewing-public");
  switchOwnerView(ownerPreviewReturnView||"platform");
  window.scrollTo({top:0,behavior:"smooth"});
}
$("returnToOwnerBtn").addEventListener("click",returnToOwnerConsole);
document.querySelectorAll("[data-owner-public-preview]").forEach(btn=>btn.addEventListener("click",()=>openOwnerPublicPreview(btn.dataset.ownerPublicPreview)));
document.querySelectorAll("[data-owner-auth-preview]").forEach(btn=>btn.addEventListener("click",()=>openOwnerPublicPreview("top",btn.dataset.ownerAuthPreview)));


function setOwnerMessage(id,text,success=false){
  const el=$(id); if(!el)return;
  el.textContent=text||"";
  el.className=`form-message${success?" success":""}`;
}
function populateOwnerHomepageForm(){
  $("ownerHomeEyebrow").value=platformSite.heroEyebrow||"";
  $("ownerHomeTitle").value=platformSite.heroTitle||"";
  $("ownerHomeCopy").value=platformSite.heroCopy||"";
  $("ownerHomePrimaryCta").value=platformSite.primaryCta||"";
  $("ownerHomeSecondaryCta").value=platformSite.secondaryCta||"";
  $("ownerHomeFeaturesTitle").value=platformSite.featuresTitle||"";
  $("ownerHomeFeaturesCopy").value=platformSite.featuresCopy||"";
  $("ownerHomeHowTitle").value=platformSite.howTitle||"";
  renderOwnerHomepagePreview();
}
function renderOwnerHomepagePreview(){
  $("ownerHomePreviewEyebrow").textContent=$("ownerHomeEyebrow").value||"—";
  $("ownerHomePreviewTitle").textContent=$("ownerHomeTitle").value||"—";
  $("ownerHomePreviewCopy").textContent=$("ownerHomeCopy").value||"—";
  $("ownerHomePreviewPrimary").textContent=$("ownerHomePrimaryCta").value||"—";
  $("ownerHomePreviewSecondary").textContent=$("ownerHomeSecondaryCta").value||"—";
}
["ownerHomeEyebrow","ownerHomeTitle","ownerHomeCopy","ownerHomePrimaryCta","ownerHomeSecondaryCta"].forEach(id=>$(id).addEventListener("input",renderOwnerHomepagePreview));
$("ownerHomepageResetBtn").addEventListener("click",populateOwnerHomepageForm);
$("ownerHomepageForm").addEventListener("submit",async e=>{
  e.preventDefault();
  setOwnerMessage("ownerHomepageMessage","Saving...");
  const data={
    heroEyebrow:$("ownerHomeEyebrow").value.trim(),
    heroTitle:$("ownerHomeTitle").value.trim(),
    heroCopy:$("ownerHomeCopy").value.trim(),
    primaryCta:$("ownerHomePrimaryCta").value.trim(),
    secondaryCta:$("ownerHomeSecondaryCta").value.trim(),
    featuresTitle:$("ownerHomeFeaturesTitle").value.trim(),
    featuresCopy:$("ownerHomeFeaturesCopy").value.trim(),
    howTitle:$("ownerHomeHowTitle").value.trim(),
    updatedAt:serverTimestamp(),
    updatedBy:currentUser.uid
  };
  await setDoc(doc(db,"platformConfig","site"),data,{merge:true});
  platformSite={...platformSite,...data};
  applyPlatformConfig();
  setOwnerMessage("ownerHomepageMessage","Homepage saved.",true);
});

function populateOwnerPricingForm(){
  $("ownerPricingLabel").value=platformPricing.label||"";
  $("ownerPricingPrice").value=platformPricing.price||"";
  $("ownerPricingPeriod").value=platformPricing.period||"";
  $("ownerPricingButton").value=platformPricing.button||"";
  $("ownerPricingTitle").value=platformPricing.title||"";
  $("ownerPricingCopy").value=platformPricing.copy||"";
  $("ownerPricingFeatures").value=(platformPricing.features||[]).join("\n");
  $("ownerPricingNote").value=platformPricing.note||"";
  renderOwnerPricingPreview();
}
function renderOwnerPricingPreview(){
  $("ownerPricingPreviewLabel").textContent=$("ownerPricingLabel").value||"—";
  $("ownerPricingPreviewPrice").textContent=$("ownerPricingPrice").value||"—";
  $("ownerPricingPreviewPeriod").textContent=$("ownerPricingPeriod").value||"";
  $("ownerPricingPreviewTitle").textContent=$("ownerPricingTitle").value||"—";
  $("ownerPricingPreviewCopy").textContent=$("ownerPricingCopy").value||"";
  const features=$("ownerPricingFeatures").value.split("\n").map(x=>x.trim()).filter(Boolean);
  $("ownerPricingPreviewFeatures").innerHTML=features.map(x=>`<li>${safeText(x)}</li>`).join("");
}
["ownerPricingLabel","ownerPricingPrice","ownerPricingPeriod","ownerPricingButton","ownerPricingTitle","ownerPricingCopy","ownerPricingFeatures","ownerPricingNote"].forEach(id=>$(id).addEventListener("input",renderOwnerPricingPreview));
$("ownerPricingForm").addEventListener("submit",async e=>{
  e.preventDefault();
  setOwnerMessage("ownerPricingMessage","Saving...");
  const data={
    label:$("ownerPricingLabel").value.trim(),
    price:$("ownerPricingPrice").value.trim(),
    period:$("ownerPricingPeriod").value.trim(),
    button:$("ownerPricingButton").value.trim(),
    title:$("ownerPricingTitle").value.trim(),
    copy:$("ownerPricingCopy").value.trim(),
    features:$("ownerPricingFeatures").value.split("\n").map(x=>x.trim()).filter(Boolean),
    note:$("ownerPricingNote").value.trim(),
    updatedAt:serverTimestamp(),
    updatedBy:currentUser.uid
  };
  await setDoc(doc(db,"platformConfig","pricing"),data,{merge:true});
  platformPricing={...platformPricing,...data};
  applyPlatformConfig();
  renderOwnerDashboard();
  setOwnerMessage("ownerPricingMessage","Pricing saved.",true);
});

function renderOwnerFeatureManager(){
  const q=$("ownerFeatureManageSearch")?.value.trim().toLowerCase()||"";
  const filtered=toolDefinitions.filter(t=>!q||`${t.name} ${t.category} ${t.desc}`.toLowerCase().includes(q));
  $("ownerFeatureManageSummary").textContent=`${filtered.length} tool${filtered.length===1?"":"s"} shown`;
  $("ownerFeatureManager").innerHTML=filtered.map(t=>{
    const cfg=platformFeatureConfig[t.id]||{};
    const visible=cfg.visible!==false;
    const desc=cfg.desc||t.desc;
    return `<div class="owner-feature-manage-row" data-feature-manage="${t.id}">
      <label class="owner-feature-toggle"><input type="checkbox" data-feature-visible="${t.id}" ${visible?"checked":""}/> Public</label>
      <div class="owner-feature-name"><strong>${safeText(t.icon)} ${safeText(t.name)}</strong><span>${safeText(t.category)}</span></div>
      <textarea class="input owner-feature-desc" data-feature-desc="${t.id}" rows="3">${safeText(desc)}</textarea>
    </div>`;
  }).join("");
}
$("ownerFeatureManageSearch").addEventListener("input",renderOwnerFeatureManager);
$("ownerSaveFeaturesBtn").addEventListener("click",async()=>{
  setOwnerMessage("ownerFeaturesMessage","Saving...");
  const tools={...platformFeatureConfig};
  toolDefinitions.forEach(t=>{
    const visibleEl=document.querySelector(`[data-feature-visible="${t.id}"]`);
    const descEl=document.querySelector(`[data-feature-desc="${t.id}"]`);
    if(visibleEl||descEl){
      tools[t.id]={
        visible:visibleEl?visibleEl.checked:(tools[t.id]?.visible!==false),
        desc:descEl?descEl.value.trim():(tools[t.id]?.desc||t.desc)
      };
    }
  });
  await setDoc(doc(db,"platformConfig","features"),{tools,updatedAt:serverTimestamp(),updatedBy:currentUser.uid},{merge:true});
  platformFeatureConfig=tools;
  applyPlatformConfig();
  setOwnerMessage("ownerFeaturesMessage","Feature settings saved.",true);
});

let ownerActivity=[],ownerActivityLoaded=false;
async function loadOwnerActivity(){
  ownerActivityLoaded=true;
  $("ownerActivityList").innerHTML='<div class="empty-state">Loading recent customer activity...</div>';
  try{
    const batches=await Promise.all(ownerBusinesses.map(async b=>{
      try{
        const snap=await getDocs(query(collection(db,"businesses",b.id,"records"),orderBy("updatedAt","desc"),limit(20)));
        return snap.docs.map(d=>({id:d.id,businessId:b.id,businessName:b.name||"Unnamed Business",...d.data()}));
      }catch(error){
        console.warn("Could not load activity for",b.id,error);
        return [];
      }
    }));
    ownerActivity=batches.flat().sort((a,b)=>(ownerDate(b.updatedAt)?.getTime()||0)-(ownerDate(a.updatedAt)?.getTime()||0)).slice(0,250);
    renderOwnerActivity();
  }catch(error){
    console.error(error);
    $("ownerActivityList").innerHTML='<div class="empty-state">Activity could not be loaded.</div>';
  }
}
function renderOwnerActivity(){
  const q=$("ownerActivitySearch").value.trim().toLowerCase();
  const toolFilter=$("ownerActivityToolFilter").value;
  const filtered=ownerActivity.filter(a=>{
    const t=toolById(a.module);
    return (!q||`${a.businessName} ${a.title||""} ${a.status||""} ${t.name}`.toLowerCase().includes(q))
      &&(toolFilter==="all"||a.module===toolFilter);
  });
  const businessCount=new Set(ownerActivity.map(a=>a.businessId)).size;
  const tools=new Set(ownerActivity.map(a=>a.module).filter(Boolean));
  $("ownerActivityCount").textContent=ownerActivity.length;
  $("ownerActivityBusinesses").textContent=businessCount;
  $("ownerActivityTools").textContent=tools.size;
  $("ownerActivityLast").textContent=ownerActivity.length?formatOwnerDate(ownerActivity[0].updatedAt):"—";
  $("ownerActivityList").innerHTML=filtered.length?filtered.map(a=>{
    const t=toolById(a.module);
    return `<div class="owner-activity-row">
      <div><strong>${safeText(a.businessName)} — ${safeText(a.title||"Untitled")}</strong><span>${safeText(t.name)} • ${safeText(a.status||"No status")}</span></div>
      <div class="owner-activity-time">${safeText(formatOwnerDate(a.updatedAt))}</div>
    </div>`;
  }).join(""):'<div class="empty-state">No activity matches the current filters.</div>';
}
$("ownerActivityRefreshBtn").addEventListener("click",()=>{ownerActivityLoaded=false;loadOwnerActivity()});
$("ownerActivitySearch").addEventListener("input",renderOwnerActivity);
$("ownerActivityToolFilter").innerHTML=`<option value="all">All tools</option>${toolDefinitions.map(t=>`<option value="${t.id}">${safeText(t.name)}</option>`).join("")}`;
$("ownerActivityToolFilter").addEventListener("change",renderOwnerActivity);

function renderOwnerReports(){
  const now=new Date(),months=[];
  for(let offset=5;offset>=0;offset--){
    const d=new Date(now.getFullYear(),now.getMonth()-offset,1),key=ownerMonthKey(d);
    months.push({label:d.toLocaleDateString(undefined,{month:"short"}),count:ownerBusinesses.filter(b=>{const created=ownerDate(b.createdAt);return created&&ownerMonthKey(created)===key}).length});
  }
  const max=Math.max(1,...months.map(x=>x.count));
  $("ownerReportsGrowthChart").innerHTML=months.map(m=>`<div class="owner-growth-column"><div class="owner-growth-bar-wrap"><div class="owner-growth-bar" style="height:${Math.max(4,Math.round(m.count/max*120))}px"></div></div><strong>${m.count}</strong><span>${safeText(m.label)}</span></div>`).join("");

  const subStatuses=["active","setup_required","past_due","canceled"];
  $("ownerReportsSubscriptions").innerHTML=subStatuses.map(s=>{
    const count=ownerBusinesses.filter(b=>(b.subscriptionStatus||"setup_required")===s).length;
    return `<div class="owner-report-row"><strong>${safeText(s.replaceAll("_"," "))}</strong><span>${count}</span></div>`;
  }).join("");

  const toolRows=toolDefinitions.map(t=>({tool:t,count:ownerBusinesses.filter(b=>Array.isArray(b.enabledModules)&&b.enabledModules.includes(t.id)).length}))
    .sort((a,b)=>b.count-a.count).slice(0,12);
  $("ownerReportsTools").innerHTML=toolRows.map(({tool,count})=>{
    const pct=ownerBusinesses.length?Math.round(count/ownerBusinesses.length*100):0;
    return `<div class="owner-report-tool-row"><strong>${safeText(tool.name)}</strong><span>${count} businesses</span><span>${pct}%</span></div>`;
  }).join("");

  const health=[
    ["Active access",ownerBusinesses.filter(b=>(b.platformStatus||"active")==="active").length],
    ["Suspended",ownerBusinesses.filter(b=>(b.platformStatus||"active")==="suspended").length],
    ["Needs attention",ownerBusinesses.filter(b=>businessAttentionReasons(b).length).length],
    ["Complete contact info",ownerBusinesses.filter(b=>b.ownerName&&(b.phone||b.website)).length]
  ];
  $("ownerReportsHealth").innerHTML=health.map(([label,count])=>`<div class="owner-report-row"><strong>${safeText(label)}</strong><span>${count}</span></div>`).join("");
}
function ownerCsvEscape(value){
  const s=String(value??"").replaceAll("\r"," ").replaceAll("\n"," ");
  return `"${s.replaceAll('"','""')}"`;
}
$("ownerExportCustomersBtn").addEventListener("click",()=>{
  if(!ownerBusinesses.length){alert("No customer businesses to export.");return;}
  const header=["Business","Owner","Email/Owner UID","Phone","Website","Plan","Subscription","Access","Tools Enabled","Created"];
  const lines=[header.map(ownerCsvEscape).join(",")];
  ownerBusinesses.forEach(b=>lines.push([
    b.name||"",b.ownerName||"",b.ownerUid||"",b.phone||"",b.website||"",b.plan||"starter",
    b.subscriptionStatus||"setup_required",b.platformStatus||"active",
    Array.isArray(b.enabledModules)?b.enabledModules.length:0,formatOwnerDate(b.createdAt)
  ].map(ownerCsvEscape).join(",")));
  const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="silverforge-business-toolbox-customers.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
});

function populateOwnerPlatformSettings(){
  $("ownerPlatformBrandName").value=platformSettings.brandName||"";
  $("ownerPlatformTagline").value=platformSettings.tagline||"";
  $("ownerPlatformCompany").value=platformSettings.companyName||"";
  $("ownerPlatformSupportEmail").value=platformSettings.supportEmail||"";
  $("ownerPlatformSupportPhone").value=platformSettings.supportPhone||"";
  $("ownerPlatformDefaultPlan").value=platformSettings.defaultPlan||"starter";
}
$("ownerPlatformSettingsForm").addEventListener("submit",async e=>{
  e.preventDefault();
  setOwnerMessage("ownerPlatformSettingsMessage","Saving...");
  const data={
    brandName:$("ownerPlatformBrandName").value.trim(),
    tagline:$("ownerPlatformTagline").value.trim(),
    companyName:$("ownerPlatformCompany").value.trim(),
    supportEmail:$("ownerPlatformSupportEmail").value.trim(),
    supportPhone:$("ownerPlatformSupportPhone").value.trim(),
    defaultPlan:$("ownerPlatformDefaultPlan").value.trim()||"starter",
    updatedAt:serverTimestamp(),
    updatedBy:currentUser.uid
  };
  await setDoc(doc(db,"platformConfig","settings"),data,{merge:true});
  platformSettings={...platformSettings,...data};
  applyPlatformConfig();
  setOwnerMessage("ownerPlatformSettingsMessage","Platform settings saved.",true);
});

function ownerMonthKey(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}
function ownerDate(value){
  if(!value)return null;
  if(typeof value.toDate==="function")return value.toDate();
  if(value.seconds)return new Date(value.seconds*1000);
  const d=new Date(value);
  return Number.isNaN(d.getTime())?null:d;
}
function businessAttentionReasons(b){
  const reasons=[];
  const sub=b.subscriptionStatus||"setup_required";
  const access=b.platformStatus||"active";
  if(sub==="setup_required")reasons.push({text:"Setup required",tone:"warn"});
  if(sub==="past_due")reasons.push({text:"Past due",tone:"bad"});
  if(sub==="canceled")reasons.push({text:"Canceled",tone:"bad"});
  if(access==="suspended")reasons.push({text:"Suspended",tone:"bad"});
  if(!b.ownerName)reasons.push({text:"Missing owner",tone:"warn"});
  if(!b.phone&&!b.website)reasons.push({text:"Limited contact info",tone:"warn"});
  return reasons;
}

function renderOwnerSubscriptions(){
  if(!$("ownerSubActive"))return;
  const active=ownerBusinesses.filter(b=>b.subscriptionStatus==="active").length;
  const setup=ownerBusinesses.filter(b=>(b.subscriptionStatus||"setup_required")==="setup_required").length;
  const pastDue=ownerBusinesses.filter(b=>b.subscriptionStatus==="past_due").length;
  const canceled=ownerBusinesses.filter(b=>b.subscriptionStatus==="canceled").length;
  const mrr=active*.99;

  $("ownerSubActive").textContent=active;
  $("ownerSubSetup").textContent=setup;
  $("ownerSubPastDue").textContent=pastDue;
  $("ownerSubCanceled").textContent=canceled;
  $("ownerSubMrr").textContent=`$${mrr.toFixed(2)}`;
  $("ownerSubAnnual").textContent=`$${(mrr*12).toFixed(2)}`;

  const filter=$("ownerSubscriptionPageFilter")?.value||"all";
  const filtered=ownerBusinesses.filter(b=>{
    const status=b.subscriptionStatus||"setup_required";
    return filter==="all"||status===filter;
  });
  $("ownerSubscriptionAccountCount").textContent=`${filtered.length} business${filtered.length===1?"":"es"}`;
  $("ownerSubscriptionBusinessList").innerHTML=filtered.length?filtered.map(b=>{
    const status=b.subscriptionStatus||"setup_required";
    const access=b.platformStatus||"active";
    return `<div class="owner-business-row detailed">
      <div class="owner-business-main">
        <strong>${safeText(b.name||"Unnamed Business")}</strong>
        <span>${safeText(b.ownerName||"No owner name")}</span>
        <div class="owner-business-contact">
          ${b.phone?`<span>${safeText(b.phone)}</span>`:""}
          ${b.website?`<span>${safeText(b.website)}</span>`:""}
        </div>
      </div>
      <div class="owner-business-meta">
        <strong>Subscription</strong>
        <span class="owner-status ${ownerStatusClass(status)}">${safeText(status.replaceAll("_"," "))}</span>
        <span>Plan: ${safeText(b.plan||"starter")}</span>
      </div>
      <div class="owner-business-meta">
        <strong>Platform Access</strong>
        <span class="owner-status ${ownerStatusClass(access)}">${safeText(access)}</span>
        <span>Joined ${safeText(formatOwnerDate(b.createdAt))}</span>
      </div>
      <div class="owner-actions">
        <button class="mini-btn" data-owner-sub-view="${b.id}">View Details</button>
        <select class="input" data-owner-sub-page-status="${b.id}">
          ${["setup_required","active","past_due","canceled"].map(v=>`<option value="${v}" ${v===status?"selected":""}>${v.replaceAll("_"," ")}</option>`).join("")}
        </select>
      </div>
    </div>`;
  }).join(""):'<div class="empty-state">No businesses match this subscription filter.</div>';

  document.querySelectorAll("[data-owner-sub-view]").forEach(btn=>btn.onclick=()=>openOwnerBusinessDetails(btn.dataset.ownerSubView));
  document.querySelectorAll("[data-owner-sub-page-status]").forEach(select=>select.onchange=async()=>{
    const id=select.dataset.ownerSubPageStatus;
    await updateDoc(doc(db,"businesses",id),{subscriptionStatus:select.value,updatedAt:serverTimestamp()});
    const found=ownerBusinesses.find(b=>b.id===id);
    if(found)found.subscriptionStatus=select.value;
    renderOwnerDashboard();
  });
}

function renderOwnerGrowthChart(){
  if(!$("ownerGrowthChart"))return;
  const now=new Date();
  const months=[];
  for(let offset=5;offset>=0;offset--){
    const d=new Date(now.getFullYear(),now.getMonth()-offset,1);
    const key=ownerMonthKey(d);
    const count=ownerBusinesses.filter(b=>{
      const created=ownerDate(b.createdAt);
      return created&&ownerMonthKey(created)===key;
    }).length;
    months.push({label:d.toLocaleDateString(undefined,{month:"short"}),count});
  }
  const max=Math.max(1,...months.map(m=>m.count));
  $("ownerGrowthChart").innerHTML=months.map(m=>{
    const h=Math.max(4,Math.round((m.count/max)*120));
    return `<div class="owner-growth-column">
      <div class="owner-growth-bar-wrap"><div class="owner-growth-bar" style="height:${h}px" title="${safeText(m.label)}: ${m.count} signups"></div></div>
      <strong>${m.count}</strong><span>${safeText(m.label)}</span>
    </div>`;
  }).join("");
}
function renderOwnerTopTools(){
  if(!$("ownerTopTools"))return;
  const rows=toolDefinitions.map(t=>{
    const count=ownerBusinesses.filter(b=>Array.isArray(b.enabledModules)&&b.enabledModules.includes(t.id)).length;
    return {tool:t,count};
  }).sort((a,b)=>b.count-a.count).slice(0,6);
  $("ownerTopTools").innerHTML=rows.length?rows.map(({tool,count})=>`
    <div class="owner-top-tool-row">
      <div><strong>${safeText(tool.icon)} ${safeText(tool.name)}</strong><span>${safeText(tool.category)}</span></div>
      <span class="owner-top-tool-count">${count}</span>
    </div>`).join(""):'<div class="empty-state">No tool usage yet.</div>';
}
function renderOwnerNewestBusinesses(){
  if(!$("ownerNewestBusinesses"))return;
  const newest=ownerBusinesses.slice().sort((a,b)=>{
    const ad=ownerDate(a.createdAt)?.getTime()||0;
    const bd=ownerDate(b.createdAt)?.getTime()||0;
    return bd-ad;
  }).slice(0,6);
  $("ownerNewestBusinesses").innerHTML=newest.length?newest.map(b=>`
    <div class="owner-new-business-row">
      <div><strong>${safeText(b.name||"Unnamed Business")}</strong><span>${safeText(b.ownerName||"No owner")} • ${safeText(formatOwnerDate(b.createdAt))}</span></div>
      <button class="mini-btn" data-owner-view-business="${b.id}">View</button>
    </div>`).join(""):'<div class="empty-state">No businesses yet.</div>';
  document.querySelectorAll("[data-owner-view-business]").forEach(btn=>btn.onclick=()=>openOwnerBusinessDetails(btn.dataset.ownerViewBusiness));
}
function renderOwnerAttention(){
  const attention=ownerBusinesses.map(b=>({business:b,reasons:businessAttentionReasons(b)})).filter(x=>x.reasons.length);
  if($("ownerAttentionSetup"))$("ownerAttentionSetup").textContent=ownerBusinesses.filter(b=>(b.subscriptionStatus||"setup_required")==="setup_required").length;
  if($("ownerAttentionPastDue"))$("ownerAttentionPastDue").textContent=ownerBusinesses.filter(b=>b.subscriptionStatus==="past_due").length;
  if($("ownerAttentionCanceled"))$("ownerAttentionCanceled").textContent=ownerBusinesses.filter(b=>b.subscriptionStatus==="canceled").length;
  if($("ownerAttentionSuspended"))$("ownerAttentionSuspended").textContent=ownerBusinesses.filter(b=>(b.platformStatus||"active")==="suspended").length;

  const html=attention.length?attention.map(({business:b,reasons})=>`
    <div class="owner-attention-row">
      <div><strong>${safeText(b.name||"Unnamed Business")}</strong><span>${safeText(b.ownerName||"No owner name")}</span></div>
      <div class="owner-attention-reason">
        ${reasons.map(r=>`<span class="owner-attention-chip ${r.tone}">${safeText(r.text)}</span>`).join("")}
        <button class="mini-btn" data-owner-attention-open="${b.id}">Open</button>
      </div>
    </div>`).join(""):'<div class="empty-state">No accounts currently need attention.</div>';

  if($("ownerAttentionList"))$("ownerAttentionList").innerHTML=html;
  if($("ownerAttentionPreview")){
    $("ownerAttentionPreview").innerHTML=attention.length
      ? attention.slice(0,5).map(({business:b,reasons})=>`
        <div class="owner-attention-row">
          <div><strong>${safeText(b.name||"Unnamed Business")}</strong><span>${safeText(b.ownerName||"No owner name")}</span></div>
          <div class="owner-attention-reason">${reasons.slice(0,2).map(r=>`<span class="owner-attention-chip ${r.tone}">${safeText(r.text)}</span>`).join("")}</div>
        </div>`).join("")
      : '<div class="empty-state">No accounts currently need attention.</div>';
  }
  document.querySelectorAll("[data-owner-attention-open]").forEach(btn=>btn.onclick=()=>openOwnerBusinessDetails(btn.dataset.ownerAttentionOpen));
}

async function loadOwnerBusinesses(){
  const snap=await getDocs(collection(db,"businesses"));
  ownerBusinesses=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>{
    const at=a.createdAt?.seconds||0,bt=b.createdAt?.seconds||0;return bt-at;
  });
}
function showOwnerApp(){
  publicSite.classList.add("hidden");publicFooter.classList.add("hidden");appShell.classList.add("hidden");document.querySelector(".site-header").classList.add("hidden");$("ownerPublicPreviewBar")?.classList.add("hidden");document.body.classList.remove("owner-previewing-public");ownerShell.classList.remove("hidden");
  $("ownerDisplayName").textContent=currentPlatformAdmin.displayName||currentUser.displayName||"Silverforge Owner";
  $("ownerEmail").textContent=currentUser.email||currentPlatformAdmin.email||"";
  renderOwnerDashboard();
  switchOwnerView("overview");
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

  $("ownerRevenueCurrent").textContent=`$${mrr.toFixed(2)}`;
  renderOwnerGrowthChart();
  renderOwnerSubscriptions();
  renderOwnerReports();
  renderOwnerTopTools();
  renderOwnerNewestBusinesses();
  renderOwnerAttention();
  renderOwnerTools();
  renderOwnerBusinesses();
}

function ownerToolCardsHtml(searchValue=""){
  const q=(searchValue||"").trim().toLowerCase();
  const filtered=toolDefinitions.filter(t=>{
    const text=`${t.name||""} ${t.category||""} ${t.desc||""}`.toLowerCase();
    return !q||text.includes(q);
  });
  const html=filtered.map(t=>{
    const enabledCount=ownerBusinesses.filter(b=>Array.isArray(b.enabledModules)&&b.enabledModules.includes(t.id)).length;
    const percent=ownerBusinesses.length?Math.round((enabledCount/ownerBusinesses.length)*100):0;
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
  }).join("")||'<div class="empty-state">No tools match your search.</div>';
  return {filtered,html};
}
function bindOwnerToolPreviewCards(){
  document.querySelectorAll("[data-owner-tool-preview]").forEach(card=>{
    if(card.dataset.previewBound==="true")return;
    card.dataset.previewBound="true";
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
function renderOwnerTools(){
  const page=ownerToolCardsHtml($("ownerToolSearch")?.value||"");
  if($("ownerToolSummary"))$("ownerToolSummary").textContent=`${page.filtered.length} tool${page.filtered.length===1?"":"s"} shown`;
  if($("ownerToolsGrid"))$("ownerToolsGrid").innerHTML=page.html;

  const overview=ownerToolCardsHtml($("ownerOverviewToolSearch")?.value||"");
  if($("ownerOverviewToolSummary"))$("ownerOverviewToolSummary").textContent=`${overview.filtered.length} tool${overview.filtered.length===1?"":"s"} shown`;
  if($("ownerOverviewToolsGrid"))$("ownerOverviewToolsGrid").innerHTML=overview.html;

  bindOwnerToolPreviewCards();
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

function ownerBusinessRowsHtml(searchValue="",subscriptionFilter="all",accessFilter="all"){
  const q=(searchValue||"").trim().toLowerCase();
  const filtered=ownerBusinesses.filter(b=>{
    const text=`${b.name||""} ${b.ownerName||""} ${b.website||""} ${b.phone||""} ${b.subscriptionStatus||""} ${b.id||""}`.toLowerCase();
    const subscription=b.subscriptionStatus||"setup_required";
    const access=b.platformStatus||"active";
    return (!q||text.includes(q))
      && (subscriptionFilter==="all"||subscription===subscriptionFilter)
      && (accessFilter==="all"||access===accessFilter);
  });

  const html=filtered.length?filtered.map(b=>{
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

  return {filtered,html};
}
function bindOwnerBusinessActions(){
  document.querySelectorAll("[data-owner-view]").forEach(btn=>{
    if(btn.dataset.businessViewBound==="true")return;
    btn.dataset.businessViewBound="true";
    btn.onclick=()=>openOwnerBusinessDetails(btn.dataset.ownerView);
  });

  document.querySelectorAll("[data-owner-subscription]").forEach(select=>{
    if(select.dataset.subscriptionBound==="true")return;
    select.dataset.subscriptionBound="true";
    select.onchange=async()=>{
      const id=select.dataset.ownerSubscription;
      await updateDoc(doc(db,"businesses",id),{subscriptionStatus:select.value,updatedAt:serverTimestamp()});
      const found=ownerBusinesses.find(b=>b.id===id);
      if(found)found.subscriptionStatus=select.value;
      renderOwnerDashboard();
    };
  });

  document.querySelectorAll("[data-owner-access]").forEach(btn=>{
    if(btn.dataset.accessBound==="true")return;
    btn.dataset.accessBound="true";
    btn.onclick=async()=>{
      const id=btn.dataset.ownerAccess,next=btn.dataset.nextAccess;
      const label=next==="suspended"?"Suspend this business's platform access?":"Restore this business's platform access?";
      if(!confirm(label))return;
      await updateDoc(doc(db,"businesses",id),{platformStatus:next,updatedAt:serverTimestamp()});
      const found=ownerBusinesses.find(b=>b.id===id);
      if(found)found.platformStatus=next;
      renderOwnerDashboard();
    };
  });
}
function renderOwnerBusinesses(){
  const dedicated=ownerBusinessRowsHtml(
    $("ownerBusinessSearch")?.value||"",
    $("ownerSubscriptionFilter")?.value||"all",
    $("ownerAccessFilter")?.value||"all"
  );
  if($("ownerResultCount"))$("ownerResultCount").textContent=`${dedicated.filtered.length} business${dedicated.filtered.length===1?"":"es"}`;
  if($("ownerBusinessList"))$("ownerBusinessList").innerHTML=dedicated.html;

  const overview=ownerBusinessRowsHtml(
    $("ownerOverviewBusinessSearch")?.value||"",
    $("ownerOverviewSubscriptionFilter")?.value||"all",
    $("ownerOverviewAccessFilter")?.value||"all"
  );
  if($("ownerOverviewResultCount"))$("ownerOverviewResultCount").textContent=`${overview.filtered.length} business${overview.filtered.length===1?"":"es"}`;
  if($("ownerOverviewBusinessList"))$("ownerOverviewBusinessList").innerHTML=overview.html;

  bindOwnerBusinessActions();
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
$("ownerOverviewToolSearch").addEventListener("input",renderOwnerTools);
$("ownerBusinessSearch").addEventListener("input",renderOwnerBusinesses);
$("ownerSubscriptionFilter").addEventListener("change",renderOwnerBusinesses);
$("ownerAccessFilter").addEventListener("change",renderOwnerBusinesses);
$("ownerOverviewBusinessSearch").addEventListener("input",renderOwnerBusinesses);
$("ownerOverviewSubscriptionFilter").addEventListener("change",renderOwnerBusinesses);
$("ownerOverviewAccessFilter").addEventListener("change",renderOwnerBusinesses);
$("ownerSubscriptionPageFilter").addEventListener("change",renderOwnerSubscriptions);
$("ownerRefreshBtn").addEventListener("click",async()=>{
  $("ownerRefreshBtn").disabled=true;
  $("ownerRefreshBtn").textContent="Refreshing...";
  try{await loadOwnerBusinesses();renderOwnerDashboard();}
  finally{$("ownerRefreshBtn").disabled=false;$("ownerRefreshBtn").textContent="Refresh Data";}
});
$("ownerLogoutBtn").addEventListener("click",()=>signOut(auth));

async function loadRecords(){const ref=collection(db,"businesses",userProfile.businessId,"records");const snap=await getDocs(query(ref,orderBy("createdAt","desc")));records=snap.docs.map(d=>({id:d.id,...d.data()}));}

function recordDateForMonthly(record){
  const value=record.createdAt||record.updatedAt;
  if(!value)return null;
  if(typeof value.toDate==="function")return value.toDate();
  if(value.seconds)return new Date(value.seconds*1000);
  const d=new Date(value); return Number.isNaN(d.getTime())?null:d;
}
function monthKeyFromDate(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;}
function monthLabel(key){const [y,m]=key.split("-").map(Number);return new Date(y,m-1,1).toLocaleDateString(undefined,{month:"long",year:"numeric"});}
function isCompletedLike(status=""){return ["complete","completed","resolved","approved","implemented","picked up","checked out","operational","current"].includes(String(status).toLowerCase());}
function selectedMonthKey(){return $("monthlyPicker")?.value||monthKeyFromDate(new Date());}
function setMonthKey(key){if($("monthlyPicker"))$("monthlyPicker").value=key;renderMonthlyOverview();}
function shiftMonth(delta){const [y,m]=selectedMonthKey().split("-").map(Number);setMonthKey(monthKeyFromDate(new Date(y,m-1+delta,1)));}
function numberField(record,key){
  const raw=record?.fields?.[key];
  const n=Number(raw);
  return Number.isFinite(n)?n:0;
}
function recordDueDate(record){
  if(!record?.dueDate)return null;
  const d=new Date(`${record.dueDate}T23:59:59`);
  return Number.isNaN(d.getTime())?null:d;
}
function recordsForMonth(key){
  return records.filter(r=>{
    const d=recordDateForMonthly(r);
    return d&&monthKeyFromDate(d)===key;
  });
}
function previousMonthKey(key){
  const [year,month]=key.split("-").map(Number);
  return monthKeyFromDate(new Date(year,month-2,1));
}
function compareText(current,previous,label){
  const diff=current-previous;
  if(diff===0)return `Same as previous month`;
  return `${diff>0?"+":""}${diff} vs previous month`;
}
function renderDashboardMonthSnapshot(){
  if(!$("dashMonthCreated"))return;
  const now=new Date();
  const key=monthKeyFromDate(now);
  const monthRecords=recordsForMonth(key);
  const today=new Date(); today.setHours(0,0,0,0);
  const soon=new Date(today); soon.setDate(today.getDate()+7);
  const overdue=records.filter(r=>{
    const d=recordDueDate(r);
    return d&&d<today&&!isCompletedLike(r.status);
  }).length;
  const dueSoon=records.filter(r=>{
    const d=recordDueDate(r);
    return d&&d>=today&&d<=soon&&!isCompletedLike(r.status);
  }).length;
  $("dashMonthCreated").textContent=monthRecords.length;
  $("dashMonthCompleted").textContent=monthRecords.filter(r=>isCompletedLike(r.status)).length;
  $("dashMonthOverdue").textContent=overdue;
  $("dashMonthDueSoon").textContent=dueSoon;
}
function renderMonthlyOverview(){
  if(!$("monthlyPicker"))return;
  const key=selectedMonthKey();
  const prevKey=previousMonthKey(key);
  const monthRecords=recordsForMonth(key);
  const prevRecords=recordsForMonth(prevKey);

  const completed=monthRecords.filter(r=>isCompletedLike(r.status)).length;
  const prevCompleted=prevRecords.filter(r=>isCompletedLike(r.status)).length;
  const open=monthRecords.length-completed;
  const prevOpen=prevRecords.length-prevCompleted;
  const toolsUsed=[...new Set(monthRecords.map(r=>r.module).filter(Boolean))];
  const prevTools=[...new Set(prevRecords.map(r=>r.module).filter(Boolean))];

  $("monthlyStatCreated").textContent=monthRecords.length;
  $("monthlyStatCompleted").textContent=completed;
  $("monthlyStatOpen").textContent=open;
  $("monthlyStatTools").textContent=toolsUsed.length;
  $("monthlyCreatedCompare").textContent=compareText(monthRecords.length,prevRecords.length);
  $("monthlyCompletedCompare").textContent=compareText(completed,prevCompleted);
  $("monthlyOpenCompare").textContent=compareText(open,prevOpen);
  $("monthlyToolsCompare").textContent=compareText(toolsUsed.length,prevTools.length);
  $("monthlyRecordTitle").textContent=`${monthLabel(key)} Records`;

  // Costs tracked from modules that currently have cost fields.
  const maintenanceCost=monthRecords.filter(r=>r.module==="maintenance")
    .reduce((sum,r)=>sum+numberField(r,"cost"),0);
  const subscriptionCost=monthRecords.filter(r=>r.module==="subscriptions")
    .reduce((sum,r)=>sum+numberField(r,"cost"),0);
  $("monthlyMaintenanceCost").textContent=`$${maintenanceCost.toFixed(2)}`;
  $("monthlySubscriptionCost").textContent=`$${subscriptionCost.toFixed(2)}`;
  $("monthlyTrackedCost").textContent=`$${(maintenanceCost+subscriptionCost).toFixed(2)}`;

  // Attention items (all current records, not just created this month).
  const [year,month]=key.split("-").map(Number);
  const monthStart=new Date(year,month-1,1);
  const monthEnd=new Date(year,month,0,23,59,59);
  const attention=records.filter(r=>{
    const d=recordDueDate(r);
    return d&&!isCompletedLike(r.status)&&d<=monthEnd;
  }).sort((a,b)=>(recordDueDate(a)?.getTime()||0)-(recordDueDate(b)?.getTime()||0)).slice(0,8);

  $("monthlyAttentionList").innerHTML=attention.length?attention.map(r=>{
    const d=recordDueDate(r);
    const overdue=d<monthStart;
    const t=toolById(r.module);
    return `<div class="monthly-attention-item">
      <div><strong>${safeText(r.title||"Untitled")}</strong><span>${safeText(t.name)} • Due ${safeText(r.dueDate||"")}</span></div>
      <span class="monthly-attention-badge ${overdue?"overdue":"soon"}">${overdue?"Overdue":"Due this month"}</span>
    </div>`;
  }).join(""):'<div class="empty-state">Nothing overdue or due during this month.</div>';

  // Tool-specific KPIs.
  const kpis=[
    ["Tasks Completed",monthRecords.filter(r=>r.module==="tasks"&&isCompletedLike(r.status)).length,"Completed task records"],
    ["Incidents",monthRecords.filter(r=>r.module==="incidents").length,"Incidents recorded"],
    ["Maintenance",monthRecords.filter(r=>r.module==="maintenance").length,"Service records"],
    ["Training Completed",monthRecords.filter(r=>r.module==="training"&&isCompletedLike(r.status)).length,"Training items completed"],
    ["Complaints",monthRecords.filter(r=>r.module==="complaints").length,"Customer complaints logged"],
    ["Complaints Resolved",monthRecords.filter(r=>r.module==="complaints"&&isCompletedLike(r.status)).length,"Complaints resolved"],
    ["Low / Out Supplies",monthRecords.filter(r=>r.module==="supplies"&&["low stock","out of stock"].includes(String(r.status||"").toLowerCase())).length,"Supply alerts"],
    ["Visitors",monthRecords.filter(r=>r.module==="visitor-log").length,"Visitor log entries"],
    ["Packages",monthRecords.filter(r=>r.module==="package-log").length,"Package records"],
    ["Renewals",monthRecords.filter(r=>r.module==="renewals").length,"Renewal records created"],
    ["Photo Proof",monthRecords.filter(r=>r.module==="photo-proof").length,"Proof records captured"],
    ["Shift Handoffs",monthRecords.filter(r=>r.module==="shift-handoff").length,"Handoff records"]
  ];
  $("monthlyKpiGrid").innerHTML=kpis.map(([label,value,sub])=>`
    <div class="monthly-kpi-card"><span>${safeText(label)}</span><strong>${value}</strong><small>${safeText(sub)}</small></div>
  `).join("");

  // 6-month trend.
  const trend=[];
  const [cy,cm]=key.split("-").map(Number);
  for(let offset=5;offset>=0;offset--){
    const d=new Date(cy,cm-1-offset,1);
    const k=monthKeyFromDate(d);
    trend.push({key:k,label:d.toLocaleDateString(undefined,{month:"short"}),count:recordsForMonth(k).length});
  }
  const max=Math.max(1,...trend.map(x=>x.count));
  $("monthlyTrendChart").innerHTML=trend.map(x=>{
    const h=Math.max(4,Math.round((x.count/max)*120));
    return `<div class="monthly-trend-column">
      <div class="monthly-trend-bar-wrap"><div class="monthly-trend-bar" style="height:${h}px" title="${safeText(x.label)}: ${x.count} records"></div></div>
      <strong>${x.count}</strong><span>${safeText(x.label)}</span>
    </div>`;
  }).join("");

  const byTool=toolsUsed.map(id=>({
    tool:toolById(id),
    count:monthRecords.filter(r=>r.module===id).length
  })).sort((a,b)=>b.count-a.count);
  $("monthlyToolActivity").innerHTML=byTool.length?byTool.map(({tool,count})=>`
    <div class="monthly-tool-row">
      <div><strong>${safeText(tool.icon)} ${safeText(tool.name)}</strong><span>${safeText(tool.category)}</span></div>
      <span class="monthly-tool-count">${count}</span>
    </div>`).join(""):'<div class="empty-state">No tool activity in this month.</div>';

  const counts={};
  monthRecords.forEach(r=>{const s=r.status||"Open";counts[s]=(counts[s]||0)+1});
  const statusRows=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  $("monthlyStatusBreakdown").innerHTML=statusRows.length?statusRows.map(([status,count])=>`
    <div class="monthly-status-row">
      <div><strong>${safeText(status)}</strong><span>${isCompletedLike(status)?"Completed / resolved":"Open / in progress"}</span></div>
      <span class="monthly-status-count">${count}</span>
    </div>`).join(""):'<div class="empty-state">No statuses to show for this month.</div>';

  $("monthlyRecords").innerHTML=monthRecords.length?monthRecords.slice().sort((a,b)=>{
    const ad=recordDateForMonthly(a)?.getTime()||0;
    const bd=recordDateForMonthly(b)?.getTime()||0;
    return bd-ad;
  }).map(recordHtml).join(""):`<div class="empty-state">No records were created in ${safeText(monthLabel(key))}.</div>`;
  bindRecordActions();
  renderDashboardMonthSnapshot();
}

function enabledModules(){return Array.isArray(business.enabledModules)?business.enabledModules:defaultEnabledModules}
function renderEverything(){renderStats();renderDashboardTools();renderModuleSettings();renderRecords();renderRecentRecords();renderMonthlyOverview();renderDashboardMonthSnapshot()}
function renderStats(){const now=new Date(),soon=new Date();soon.setDate(now.getDate()+7);$("statOpen").textContent=records.filter(r=>!completedStatus(r)).length;$("statDue").textContent=records.filter(r=>{if(!r.dueDate||completedStatus(r))return false;const d=new Date(`${r.dueDate}T23:59:59`);return d>=now&&d<=soon}).length;$("statTools").textContent=enabledModules().length;$("statTotal").textContent=records.length;}
function renderDashboardTools(){const enabled=new Set(enabledModules());$("dashboardToolGrid").innerHTML=toolDefinitions.filter(t=>enabled.has(t.id)).slice(0,12).map(t=>`<button class="tool-card" data-tool-open="${t.id}"><span>${safeText(t.icon)}</span><strong>${safeText(t.name)}</strong></button>`).join("")||'<div class="empty-state">Enable at least one tool.</div>';document.querySelectorAll("[data-tool-open]").forEach(btn=>btn.onclick=()=>{switchView("records");$("recordModuleFilter").value=btn.dataset.toolOpen;renderRecords();});}
function renderModuleOptions(){const opts=toolDefinitions.map(t=>`<option value="${t.id}">${safeText(t.name)}</option>`).join("");$("recordModule").innerHTML=opts;$("recordModuleFilter").innerHTML=`<option value="all">All tools</option>${opts}`;}
function renderModuleSettings(){const enabled=new Set(enabledModules());$("moduleSettingsGrid").innerHTML=toolDefinitions.map(t=>`<div class="module-setting"><div><strong>${safeText(t.icon)} ${safeText(t.name)}</strong><small>${enabled.has(t.id)?"Enabled":"Disabled"}</small></div><button class="toggle ${enabled.has(t.id)?"on":""}" data-module-toggle="${t.id}" aria-label="Toggle ${safeText(t.name)}"></button></div>`).join("");document.querySelectorAll("[data-module-toggle]").forEach(btn=>btn.onclick=async()=>{const id=btn.dataset.moduleToggle,next=new Set(enabledModules());next.has(id)?next.delete(id):next.add(id);business.enabledModules=[...next];await updateDoc(doc(db,"businesses",business.id),{enabledModules:business.enabledModules,updatedAt:serverTimestamp()});renderEverything();});}


function recordFieldPreview(record){
  const t=toolById(record.module),values=record.fields||{};
  return t.fields.filter(f=>f.key!=="title"&&values[f.key]).slice(0,3)
    .map(f=>`<span>${safeText(f.label)}: ${safeText(prettyValue(values[f.key]))}</span>`).join("");
}
function completedStatus(record){
  const s=String(record.status||"").toLowerCase();
  return ["complete","completed","resolved","approved","implemented","picked up","checked out","returned","renewed","current","operational","archived"].includes(s);
}
function recordDueHealth(record){
  if(completedStatus(record)) return {key:"complete",label:"Completed"};
  if(!record.dueDate) return {key:"current",label:"No due date"};
  const today=new Date(); today.setHours(0,0,0,0);
  const due=new Date(`${record.dueDate}T23:59:59`);
  if(Number.isNaN(due.getTime())) return {key:"current",label:"Current"};
  if(due<today) return {key:"overdue",label:"Overdue"};
  const soon=new Date(today); soon.setDate(today.getDate()+7);
  if(due<=soon) return {key:"soon",label:"Due soon"};
  return {key:"current",label:"Upcoming"};
}
function todayDateInput(){
  const d=new Date();
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}
function nowDateTimeInput(){
  const d=new Date();
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
}
function addPeriodToDate(dateString,frequency){
  const base=dateString?new Date(`${dateString}T12:00:00`):new Date();
  if(Number.isNaN(base.getTime()))return "";
  const f=String(frequency||"").toLowerCase();
  if(f==="daily")base.setDate(base.getDate()+1);
  else if(f==="weekly")base.setDate(base.getDate()+7);
  else if(f==="monthly")base.setMonth(base.getMonth()+1);
  else if(f==="quarterly")base.setMonth(base.getMonth()+3);
  else if(f==="yearly")base.setFullYear(base.getFullYear()+1);
  else return "";
  return `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,"0")}-${String(base.getDate()).padStart(2,"0")}`;
}
function getRecordAction(record){
  const s=String(record.status||"").toLowerCase();
  const f=record.fields||{};
  switch(record.module){
    case "tasks":
      return completedStatus(record)
        ? {key:"reopen",label:"Reopen"}
        : {key:"complete",label:"Complete",success:true};
    case "checklists":
      return {key:"run_checklist",label:"Run Checklist",primary:true};
    case "equipment":
      return f.assignedTo
        ? {key:"return_equipment",label:"Return"}
        : {key:"assign_equipment",label:"Assign"};
    case "maintenance":
      return completedStatus(record)
        ? {key:"reschedule_maintenance",label:"Reschedule"}
        : {key:"service_complete",label:"Mark Serviced",success:true};
    case "renewals":
      return {key:"renew",label:"Renew",success:true};
    case "incidents":
      return s==="resolved"?{key:"reopen_incident",label:"Reopen"}:{key:"resolve",label:"Resolve",success:true};
    case "shift-handoff":
      if(s==="resolved")return {key:"reopen_handoff",label:"Reopen"};
      return s==="acknowledged"?{key:"resolve_handoff",label:"Resolve",success:true}:{key:"acknowledge",label:"Acknowledge"};
    case "asset-checkout":
      return s==="returned"?{key:"checkout_again",label:"Check Out Again"}:{key:"return_asset",label:"Return",success:true};
    case "logbook":
      return s==="resolved"?null:{key:"resolve_log",label:"Resolve Follow-up",success:true};
    case "employees":
      return s==="on leave"?{key:"activate_employee",label:"Return Active",success:true}:{key:"employee_leave",label:"Put On Leave"};
    case "vehicles":
      return s==="needs service"?{key:"vehicle_active",label:"Return Active",success:true}:{key:"vehicle_service",label:"Needs Service"};
    case "photo-proof":
      return s==="approved"?null:{key:"approve_proof",label:"Approve",success:true};
    case "vendors":
      return s==="preferred"?{key:"vendor_active",label:"Set Active"}:{key:"vendor_preferred",label:"Make Preferred",success:true};
    case "subscriptions":
      return s==="canceled"?{key:"activate_subscription",label:"Reactivate",success:true}:{key:"cancel_subscription",label:"Cancel"};
    case "documents":
      return s==="current"?null:{key:"document_current",label:"Mark Current",success:true};
    case "training":
      return s==="completed"?null:{key:"complete_training",label:"Complete",success:true};
    case "website-monitor":
      return {key:"open_website",label:"Open Website",primary:true};
    case "qr-assets":
      return f.destinationUrl?{key:"open_qr_link",label:"Open Link",primary:true}:{key:"copy_asset_id",label:"Copy Asset ID"};
    case "supplies":
      return {key:"restock",label:"Restock",success:true};
    case "warranties":
      return s==="claim open"?{key:"close_claim",label:"Close Claim",success:true}:{key:"open_claim",label:"Open Claim"};
    case "complaints":
      return s==="resolved"?{key:"reopen_complaint",label:"Reopen"}:{key:"resolve_complaint",label:"Resolve",success:true};
    case "suggestions":
      if(s==="implemented")return null;
      if(s==="approved")return {key:"implement_suggestion",label:"Implement",success:true};
      return {key:"approve_suggestion",label:"Approve",success:true};
    case "visitor-log":
      return s==="checked out"?null:{key:"checkout_visitor",label:"Check Out",success:true};
    case "package-log":
      if(s==="picked up")return null;
      return s==="recipient notified"
        ? {key:"pickup_package",label:"Picked Up",success:true}
        : {key:"notify_recipient",label:"Notify Recipient"};
    default:
      return null;
  }
}
function quickActionButton(record){
  const a=getRecordAction(record);
  if(!a)return "";
  return `<button class="mini-btn ${a.primary?"record-action-primary":""} ${a.success?"record-action-success":""}" data-record-action="${a.key}" data-record-id="${record.id}">${safeText(a.label)}</button>`;
}
function recurringNextButton(record){
  if(record.module!=="tasks"||!completedStatus(record))return "";
  const recurring=record.fields?.recurring;
  if(!recurring||recurring==="No")return "";
  return `<button class="mini-btn" data-record-action="create_next_task" data-record-id="${record.id}">Create Next</button>`;
}
function recordHtml(r){
  const t=toolById(r.module),health=recordDueHealth(r);
  return `<div class="record-item">
    <div class="record-main">
      <strong>${safeText(r.title||"Untitled")}</strong>
      <p>${safeText(r.details||t.desc)}</p>
      <div class="record-meta">
        <span class="tag">${safeText(t.name)}</span>
        <span class="tag">${safeText(r.status||t.statuses?.[0]||"Open")}</span>
        ${r.dueDate?`<span class="tag">${safeText(t.dueLabel)}: ${safeText(r.dueDate)}</span>`:""}
        <span class="record-health ${health.key}">${safeText(health.label)}</span>
      </div>
      <div class="record-fields-preview">${recordFieldPreview(r)}</div>
    </div>
    <div class="record-actions">
      ${quickActionButton(r)}
      ${recurringNextButton(r)}
      <button class="mini-btn" data-view-record="${r.id}">View</button>
      <button class="mini-btn" data-duplicate-record="${r.id}">Duplicate</button>
      <button class="mini-btn" data-edit-record="${r.id}">Edit</button>
      <button class="mini-btn danger" data-delete-record="${r.id}">Delete</button>
    </div>
  </div>`;
}
let currentFilteredRecords=[];
function allRecordStatuses(){
  return [...new Set(records.map(r=>r.status).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}
function refreshRecordStatusFilter(){
  const select=$("recordStatusFilter");
  if(!select)return;
  const current=select.value||"all";
  select.innerHTML=`<option value="all">All statuses</option>${allRecordStatuses().map(s=>`<option value="${safeText(s)}">${safeText(s)}</option>`).join("")}`;
  select.value=[...select.options].some(o=>o.value===current)?current:"all";
}
function recordMatchesDueFilter(record,filter){
  if(filter==="all")return true;
  const health=recordDueHealth(record);
  if(filter==="overdue")return health.key==="overdue";
  if(filter==="due_soon")return health.key==="soon";
  if(filter==="no_date")return !record.dueDate;
  if(filter==="completed")return completedStatus(record);
  return true;
}
function renderRecords(){
  refreshRecordStatusFilter();
  const search=$("recordSearch").value.trim().toLowerCase();
  const moduleFilter=$("recordModuleFilter").value;
  const statusFilter=$("recordStatusFilter")?.value||"all";
  const dueFilter=$("recordDueFilter")?.value||"all";
  currentFilteredRecords=records.filter(r=>{
    const extra=Object.values(r.fields||{}).join(" ");
    const textMatch=!search||`${r.title||""} ${r.details||""} ${r.status||""} ${extra}`.toLowerCase().includes(search);
    return textMatch
      &&(moduleFilter==="all"||r.module===moduleFilter)
      &&(statusFilter==="all"||r.status===statusFilter)
      &&recordMatchesDueFilter(r,dueFilter);
  });
  $("allRecords").innerHTML=currentFilteredRecords.length?currentFilteredRecords.map(recordHtml).join(""):'<div class="empty-state">No records found.</div>';

  const overdue=currentFilteredRecords.filter(r=>recordDueHealth(r).key==="overdue").length;
  const soon=currentFilteredRecords.filter(r=>recordDueHealth(r).key==="soon").length;
  const completed=currentFilteredRecords.filter(completedStatus).length;
  $("recordsSummary").innerHTML=`
    <span class="records-summary-chip"><strong>${currentFilteredRecords.length}</strong> shown</span>
    <span class="records-summary-chip"><strong>${overdue}</strong> overdue</span>
    <span class="records-summary-chip"><strong>${soon}</strong> due soon</span>
    <span class="records-summary-chip"><strong>${completed}</strong> completed / resolved</span>`;
  bindRecordActions();
}
function renderRecentRecords(){
  const recent=records.slice(0,5);
  $("recentRecords").innerHTML=recent.length?recent.map(recordHtml).join(""):'<div class="empty-state">No records yet.</div>';
  bindRecordActions();
}
function csvEscape(value){
  const s=String(value??"").replaceAll("\r"," ").replaceAll("\n"," | ");
  return `"${s.replaceAll('"','""')}"`;
}
function exportRecordsCsv(){
  const rows=currentFilteredRecords.length?currentFilteredRecords:records;
  if(!rows.length){alert("There are no records to export.");return;}
  const allFieldKeys=[...new Set(rows.flatMap(r=>Object.keys(r.fields||{})))];
  const header=["Tool","Title","Status","Due Date","Notes",...allFieldKeys];
  const lines=[header.map(csvEscape).join(",")];
  rows.forEach(r=>{
    const t=toolById(r.module);
    lines.push([
      t.name,r.title||"",r.status||"",r.dueDate||"",r.details||"",
      ...allFieldKeys.map(k=>r.fields?.[k]||"")
    ].map(csvEscape).join(","));
  });
  const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=`${(business.name||"business").replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-toolbox-records.csv`;
  document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
async function patchRecord(record,updates){
  await updateDoc(doc(db,"businesses",business.id,"records",record.id),{
    ...updates,
    updatedAt:serverTimestamp(),
    updatedBy:currentUser.uid
  });
  await loadRecords();
  renderEverything();
}
async function duplicateRecord(record){
  const payload={
    module:record.module,
    title:`${record.title||"Untitled"} Copy`,
    status:toolById(record.module).statuses?.[0]||"Open",
    dueDate:record.dueDate||"",
    details:record.details||"",
    fields:{...(record.fields||{})},
    createdAt:serverTimestamp(),
    createdBy:currentUser.uid,
    updatedAt:serverTimestamp(),
    updatedBy:currentUser.uid
  };
  if(record.module==="checklists")payload.fields.checkedItems="[]";
  await addDoc(collection(db,"businesses",business.id,"records"),payload);
  await loadRecords();renderEverything();
}
function parseCheckedItems(record){
  try{
    const parsed=JSON.parse(record.fields?.checkedItems||"[]");
    return Array.isArray(parsed)?parsed.map(Number).filter(Number.isFinite):[];
  }catch{return []}
}
let activeChecklistRecordId=null;
function openChecklistRunner(record){
  activeChecklistRecordId=record.id;
  const items=String(record.fields?.items||"").split("\n").map(x=>x.trim()).filter(Boolean);
  const checked=new Set(parseCheckedItems(record));
  $("checklistRunnerTitle").textContent=record.title||"Run Checklist";
  $("checklistRunnerHelper").textContent=`${items.length} checklist item${items.length===1?"":"s"} • ${record.fields?.assignedTo||"Unassigned"}`;
  $("checklistRunnerItems").innerHTML=items.length?items.map((item,i)=>`
    <label class="checklist-runner-item">
      <input type="checkbox" data-checklist-index="${i}" ${checked.has(i)?"checked":""}/>
      <span>${safeText(item)}</span>
    </label>`).join(""):'<div class="empty-state">This checklist has no items yet. Edit it to add checklist items.</div>';
  $("checklistRunnerMessage").textContent="";
  updateChecklistProgressPreview();
  document.querySelectorAll("[data-checklist-index]").forEach(cb=>cb.addEventListener("change",updateChecklistProgressPreview));
  $("checklistRunnerModal").classList.remove("hidden");
}
function updateChecklistProgressPreview(){
  const boxes=[...document.querySelectorAll("[data-checklist-index]")];
  const done=boxes.filter(b=>b.checked).length,total=boxes.length;
  const pct=total?Math.round(done/total*100):0;
  $("checklistProgressText").textContent=`${done} of ${total} complete`;
  $("checklistProgressPercent").textContent=`${pct}%`;
  $("checklistProgressBar").style.width=`${pct}%`;
}
async function saveChecklistProgress(reset=false){
  const record=records.find(r=>r.id===activeChecklistRecordId);
  if(!record)return;
  const boxes=[...document.querySelectorAll("[data-checklist-index]")];
  const checked=reset?[]:boxes.filter(b=>b.checked).map(b=>Number(b.dataset.checklistIndex));
  const total=boxes.length;
  const status=checked.length===0?"Ready":checked.length===total&&total>0?"Complete":"In Progress";
  await patchRecord(record,{
    status,
    fields:{...(record.fields||{}),checkedItems:JSON.stringify(checked)}
  });
  $("checklistRunnerModal").classList.add("hidden");
}
function recordDetailFieldRows(record){
  const t=toolById(record.module),values=record.fields||{};
  return t.fields.filter(f=>f.key!=="title").map(f=>{
    let value=values[f.key];
    if(f.key==="items"){
      const items=String(value||"").split("\n").map(x=>x.trim()).filter(Boolean);
      const checked=new Set(parseCheckedItems(record));
      value=items.length?items.map((x,i)=>`${checked.has(i)?"✓":"○"} ${x}`).join("\n"):"—";
    }
    return `<div class="record-detail-field"><span>${safeText(f.label)}</span><strong>${safeText(prettyValue(value)||"—")}</strong></div>`;
  }).join("");
}
function openRecordDetail(record){
  const t=toolById(record.module),health=recordDueHealth(record);
  $("recordDetailEyebrow").textContent=t.category.toUpperCase();
  $("recordDetailTitle").textContent=record.title||"Untitled";
  $("recordDetailSubtitle").textContent=t.name;
  $("recordDetailHealth").textContent=health.label;
  $("recordDetailHealth").className=`record-health-badge record-health ${health.key}`;
  $("recordDetailMeta").innerHTML=`
    <div><span>Status</span><strong>${safeText(record.status||"—")}</strong></div>
    <div><span>${safeText(t.dueLabel)}</span><strong>${safeText(record.dueDate||"Not set")}</strong></div>
    <div><span>Tool</span><strong>${safeText(t.name)}</strong></div>`;
  $("recordDetailFields").innerHTML=recordDetailFieldRows(record);
  $("recordDetailNotes").innerHTML=record.details?`<strong>Notes</strong><br>${safeText(record.details)}`:"No additional notes.";
  const a=getRecordAction(record);
  $("recordDetailActions").innerHTML=`
    ${a?`<button class="btn btn-primary" data-detail-record-action="${a.key}" data-record-id="${record.id}">${safeText(a.label)}</button>`:""}
    ${recurringNextButton(record).replaceAll("data-record-action=","data-detail-record-action=")}
    <button class="btn btn-secondary" data-detail-edit="${record.id}">Edit</button>
    <button class="btn btn-secondary" data-detail-duplicate="${record.id}">Duplicate</button>`;
  document.querySelectorAll("[data-detail-record-action]").forEach(btn=>btn.onclick=async()=>{
    $("recordDetailModal").classList.add("hidden");
    await handleRecordQuickAction(records.find(r=>r.id===btn.dataset.recordId),btn.dataset.detailRecordAction);
  });
  document.querySelectorAll("[data-detail-edit]").forEach(btn=>btn.onclick=()=>{
    $("recordDetailModal").classList.add("hidden");
    openRecordModal(records.find(r=>r.id===btn.dataset.detailEdit));
  });
  document.querySelectorAll("[data-detail-duplicate]").forEach(btn=>btn.onclick=async()=>{
    $("recordDetailModal").classList.add("hidden");
    await duplicateRecord(records.find(r=>r.id===btn.dataset.detailDuplicate));
  });
  $("recordDetailModal").classList.remove("hidden");
}
function calculateSupplyStatus(fields){
  const quantity=Number(fields.quantity);
  const reorder=Number(fields.reorderLevel);
  if(Number.isFinite(quantity)&&quantity<=0)return "Out of Stock";
  if(Number.isFinite(quantity)&&Number.isFinite(reorder)&&quantity<=reorder)return "Low Stock";
  return "In Stock";
}
async function handleRecordQuickAction(record,action){
  if(!record)return;
  const fields={...(record.fields||{})};
  switch(action){
    case "complete": return patchRecord(record,{status:"Complete"});
    case "reopen": return patchRecord(record,{status:"Open"});
    case "create_next_task":{
      const nextDue=addPeriodToDate(record.dueDate,fields.recurring);
      await addDoc(collection(db,"businesses",business.id,"records"),{
        module:"tasks",title:record.title,status:"Open",dueDate:nextDue,details:record.details||"",
        fields:{...fields},createdAt:serverTimestamp(),createdBy:currentUser.uid,
        updatedAt:serverTimestamp(),updatedBy:currentUser.uid
      });
      await loadRecords();renderEverything();return;
    }
    case "run_checklist": return openChecklistRunner(record);
    case "assign_equipment":{
      const name=prompt("Assign this equipment to:");
      if(!name)return;
      fields.assignedTo=name.trim();
      return patchRecord(record,{status:"Assigned",fields});
    }
    case "return_equipment":
      fields.assignedTo="";
      return patchRecord(record,{status:"Available",fields});
    case "service_complete":
      fields.lastService=todayDateInput();
      return patchRecord(record,{status:"Complete",fields});
    case "reschedule_maintenance":{
      const next=prompt("Enter the next service date (YYYY-MM-DD):",record.dueDate||"");
      if(!next)return;
      return patchRecord(record,{status:"Scheduled",dueDate:next});
    }
    case "renew":{
      const next=prompt("Enter the new expiration date (YYYY-MM-DD):",record.dueDate||"");
      if(!next)return;
      return patchRecord(record,{status:"Current",dueDate:next});
    }
    case "resolve": return patchRecord(record,{status:"Resolved"});
    case "reopen_incident": return patchRecord(record,{status:"Open"});
    case "acknowledge": return patchRecord(record,{status:"Acknowledged"});
    case "resolve_handoff": return patchRecord(record,{status:"Resolved"});
    case "reopen_handoff": return patchRecord(record,{status:"Open"});
    case "return_asset":
      fields.returnDate=todayDateInput();
      if(!fields.conditionIn||fields.conditionIn==="Not Returned")fields.conditionIn="Good";
      return patchRecord(record,{status:"Returned",fields});
    case "checkout_again":
      fields.returnDate="";fields.conditionIn="Not Returned";
      return patchRecord(record,{status:"Checked Out",fields});
    case "resolve_log": return patchRecord(record,{status:"Resolved"});
    case "employee_leave": return patchRecord(record,{status:"On Leave"});
    case "activate_employee": return patchRecord(record,{status:"Active"});
    case "vehicle_service": return patchRecord(record,{status:"Needs Service"});
    case "vehicle_active": return patchRecord(record,{status:"Active"});
    case "approve_proof": return patchRecord(record,{status:"Approved"});
    case "vendor_preferred": return patchRecord(record,{status:"Preferred"});
    case "vendor_active": return patchRecord(record,{status:"Active"});
    case "cancel_subscription":
      if(confirm("Mark this business subscription/service as canceled?"))return patchRecord(record,{status:"Canceled"});
      return;
    case "activate_subscription": return patchRecord(record,{status:"Active"});
    case "document_current": return patchRecord(record,{status:"Current"});
    case "complete_training":
      fields.completionDate=todayDateInput();
      return patchRecord(record,{status:"Completed",fields});
    case "open_website":{
      const url=fields.url;
      if(!url){alert("Add a website URL to this record first.");return;}
      window.open(url,"_blank","noopener");
      return;
    }
    case "open_qr_link":{
      const url=fields.destinationUrl;
      if(!url){alert("Add a destination URL first.");return;}
      window.open(url,"_blank","noopener");
      return;
    }
    case "copy_asset_id":{
      const value=fields.assetId||record.title;
      try{await navigator.clipboard.writeText(value);alert("Asset ID copied.");}
      catch{prompt("Copy this asset ID:",value);}
      return;
    }
    case "restock":{
      const amount=prompt("How many units are you adding?","1");
      if(amount===null)return;
      const add=Number(amount);
      if(!Number.isFinite(add)||add<=0){alert("Enter a valid quantity greater than 0.");return;}
      const current=Number(fields.quantity)||0;
      fields.quantity=String(current+add);
      return patchRecord(record,{status:calculateSupplyStatus(fields),fields});
    }
    case "open_claim": return patchRecord(record,{status:"Claim Open"});
    case "close_claim": return patchRecord(record,{status:"Active"});
    case "resolve_complaint": return patchRecord(record,{status:"Resolved"});
    case "reopen_complaint": return patchRecord(record,{status:"In Review"});
    case "approve_suggestion": return patchRecord(record,{status:"Approved"});
    case "implement_suggestion": return patchRecord(record,{status:"Implemented"});
    case "checkout_visitor":
      fields.departure=nowDateTimeInput();
      return patchRecord(record,{status:"Checked Out",fields});
    case "notify_recipient": return patchRecord(record,{status:"Recipient Notified"});
    case "pickup_package":
      fields.pickupDate=nowDateTimeInput();
      if(!fields.pickedUpBy){
        const who=prompt("Who picked up the package?","");
        if(who!==null)fields.pickedUpBy=who.trim();
      }
      return patchRecord(record,{status:"Picked Up",fields});
  }
}
function bindRecordActions(){
  document.querySelectorAll("[data-edit-record]").forEach(btn=>btn.onclick=()=>openRecordModal(records.find(r=>r.id===btn.dataset.editRecord)));
  document.querySelectorAll("[data-view-record]").forEach(btn=>btn.onclick=()=>openRecordDetail(records.find(r=>r.id===btn.dataset.viewRecord)));
  document.querySelectorAll("[data-duplicate-record]").forEach(btn=>btn.onclick=async()=>duplicateRecord(records.find(r=>r.id===btn.dataset.duplicateRecord)));
  document.querySelectorAll("[data-record-action]").forEach(btn=>btn.onclick=async()=>handleRecordQuickAction(records.find(r=>r.id===btn.dataset.recordId),btn.dataset.recordAction));
  document.querySelectorAll("[data-delete-record]").forEach(btn=>btn.onclick=async()=>{
    if(!confirm("Delete this record?"))return;
    await deleteDoc(doc(db,"businesses",business.id,"records",btn.dataset.deleteRecord));
    records=records.filter(r=>r.id!==btn.dataset.deleteRecord);
    renderEverything();
  });
}
$("recordSearch").addEventListener("input",renderRecords);
$("recordModuleFilter").addEventListener("change",renderRecords);
$("recordStatusFilter").addEventListener("change",renderRecords);
$("recordDueFilter").addEventListener("change",renderRecords);
$("exportRecordsBtn").addEventListener("click",exportRecordsCsv);

document.querySelectorAll("[data-close-record-detail]").forEach(btn=>btn.addEventListener("click",()=>$("recordDetailModal").classList.add("hidden")));
$("recordDetailModal").addEventListener("click",e=>{if(e.target===$("recordDetailModal"))$("recordDetailModal").classList.add("hidden")});
document.querySelectorAll("[data-close-checklist-runner]").forEach(btn=>btn.addEventListener("click",()=>$("checklistRunnerModal").classList.add("hidden")));
$("checklistRunnerModal").addEventListener("click",e=>{if(e.target===$("checklistRunnerModal"))$("checklistRunnerModal").classList.add("hidden")});
$("saveChecklistProgressBtn").addEventListener("click",()=>saveChecklistProgress(false));
$("resetChecklistBtn").addEventListener("click",()=>{document.querySelectorAll("[data-checklist-index]").forEach(cb=>cb.checked=false);updateChecklistProgressPreview();$("checklistRunnerMessage").textContent="Checklist reset. Save Progress to keep the reset.";});

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
  let smartStatus=$("recordStatus").value;
  if(moduleId==="supplies") smartStatus=calculateSupplyStatus(fields);
  if(moduleId==="visitor-log" && fields.departure) smartStatus="Checked Out";
  if(moduleId==="package-log" && fields.pickupDate) smartStatus="Picked Up";
  if(moduleId==="asset-checkout" && fields.returnDate) smartStatus="Returned";
  if(moduleId==="training" && fields.completionDate && smartStatus==="Assigned") smartStatus="Completed";
  const payload={module:moduleId,title,status:smartStatus,dueDate:$("recordDueDate").value||"",details:$("recordDetails").value.trim(),fields,updatedAt:serverTimestamp(),updatedBy:currentUser.uid};
  try{if(id)await updateDoc(doc(db,"businesses",business.id,"records",id),payload);else await addDoc(collection(db,"businesses",business.id,"records"),{...payload,createdAt:serverTimestamp(),createdBy:currentUser.uid});await loadRecords();renderEverything();recordModal.classList.add("hidden");}catch(error){console.error(error);$("recordMessage").textContent="Could not save this item. Check Firestore rules.";}
});

$("businessSettingsForm").addEventListener("submit",async e=>{e.preventDefault();const updates={name:$("settingsBusinessName").value.trim(),ownerName:$("settingsOwnerName").value.trim(),phone:$("settingsPhone").value.trim(),website:$("settingsWebsite").value.trim(),updatedAt:serverTimestamp()};await updateDoc(doc(db,"businesses",business.id),updates);Object.assign(business,updates);$("sidebarBusinessName").textContent=business.name;alert("Business settings saved.");});
if($("monthlyPicker")){$("monthlyPicker").value=monthKeyFromDate(new Date());$("monthlyPicker").addEventListener("change",renderMonthlyOverview);$("monthlyPrevBtn").addEventListener("click",()=>shiftMonth(-1));$("monthlyNextBtn").addEventListener("click",()=>shiftMonth(1));}
const views={dashboard:[$("dashboardView"),"OVERVIEW","Dashboard"],monthly:[$("monthlyView"),"BUSINESS HISTORY","Monthly Overview"],tools:[$("toolsView"),"MODULES","Tools"],records:[$("recordsView"),"BUSINESS DATA","All Records"],settings:[$("settingsView"),"ACCOUNT","Settings"]};
function switchView(name){Object.entries(views).forEach(([key,[el]])=>el.classList.toggle("hidden",key!==name));document.querySelectorAll("[data-view]").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===name));$("viewEyebrow").textContent=views[name][1];$("viewTitle").textContent=views[name][2];if(window.innerWidth<=780)$("sidebar").classList.remove("open");}
document.querySelectorAll("[data-view]").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));document.querySelectorAll("[data-go-tools]").forEach(btn=>btn.addEventListener("click",()=>switchView("tools")));$("sidebarToggle").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
