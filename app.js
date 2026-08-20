import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, deleteUser
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc,
  getDocs, deleteDoc, serverTimestamp, query, orderBy, limit, where
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyDACoQU74FIxuCApDJxQUP-rcXhsDIorAs",
  authDomain: "business-toolbox-c938a.firebaseapp.com",
  projectId: "business-toolbox-c938a",
  storageBucket: "business-toolbox-c938a.firebasestorage.app",
  messagingSenderId: "353839785877",
  appId: "1:353839785877:web:b35f3d7fb738848edd389c",
  measurementId: "G-RBGXYYGTQ9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// A secondary Firebase Auth instance lets a signed-in business owner create
// employee accounts without replacing the owner's own login session.
const employeeCreatorApp = initializeApp(firebaseConfig,"businessToolboxEmployeeCreator");
const employeeCreatorAuth = getAuth(employeeCreatorApp);
const $ = (id) => document.getElementById(id);

window.addEventListener("error",event=>{
  console.error("Business Toolbox startup/runtime error:",event.error||event.message);
});
window.addEventListener("unhandledrejection",event=>{
  console.error("Business Toolbox unhandled promise rejection:",event.reason);
});

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


const toolExperienceConfig={
  "tasks":{
    mode:"taskBoard",addLabel:"+ New Task",notes:"Task Notes",
    formIntro:"Create focused work with a clear owner, priority and schedule.",
    sections:[
      {title:"Task",hint:"What needs to happen?",keys:["title","priority"]},
      {title:"Ownership & Schedule",hint:"Who owns it and does it repeat?",keys:["assignedTo","recurring"]}
    ]
  },
  "checklists":{
    mode:"checklistLibrary",addLabel:"+ New Checklist",notes:"Checklist Instructions",
    formIntro:"Build a reusable routine, then run it as a live checklist.",
    sections:[
      {title:"Checklist Setup",hint:"Name the routine and decide when it is used.",keys:["title","frequency","assignedTo"]},
      {title:"Checklist Builder",hint:"Enter one step per line.",keys:["items"]}
    ]
  },
  "equipment":{
    mode:"assetInventory",addLabel:"+ Add Equipment",notes:"Asset Notes",
    formIntro:"Register a physical asset and keep assignment, condition and service information together.",
    sections:[
      {title:"Asset Identity",hint:"Identify the equipment.",keys:["title","assetNumber","serialNumber"]},
      {title:"Current State",hint:"Where is it and who has it?",keys:["condition","assignedTo","location"]},
      {title:"Ownership",hint:"Purchase information.",keys:["purchaseDate"]}
    ]
  },
  "maintenance":{
    mode:"serviceTimeline",addLabel:"+ Log Service",notes:"Service Notes",
    formIntro:"Record maintenance around the asset being serviced, not just a generic entry.",
    sections:[
      {title:"Service Job",hint:"What was serviced and why?",keys:["title","asset","serviceType"]},
      {title:"Service Details",hint:"When, how much and at what usage?",keys:["lastService","mileageHours","cost"]},
      {title:"Provider",hint:"Who performed the work?",keys:["provider"]}
    ]
  },
  "renewals":{
    mode:"renewalRadar",addLabel:"+ Track Renewal",notes:"Renewal Notes",
    formIntro:"Track the things the business cannot afford to let expire.",
    sections:[
      {title:"Renewal",hint:"What is expiring?",keys:["title","renewalType","provider"]},
      {title:"Reference",hint:"Policy, license or account information.",keys:["referenceNumber","reminderDays"]}
    ]
  },
  "incidents":{
    mode:"incidentCases",addLabel:"+ Report Incident",notes:"Full Incident Narrative",
    formIntro:"Capture an incident in sections so the report stays clear and reviewable.",
    sections:[
      {title:"Incident Information",hint:"What happened, where and when?",keys:["title","incidentType","incidentDateTime","location"]},
      {title:"People",hint:"Who was involved or witnessed it?",keys:["peopleInvolved","witnesses"]},
      {title:"Impact",hint:"Damage, injury and consequences.",keys:["damageInjury"]},
      {title:"Follow-Up",hint:"What needs to happen next?",keys:["followUp"]}
    ]
  },
  "shift-handoff":{
    mode:"handoffFeed",addLabel:"+ Leave Handoff",notes:"Additional Handoff Notes",
    formIntro:"Pass information from one person or shift to the next like a message, not a database row.",
    sections:[
      {title:"Route",hint:"Who is handing off to whom?",keys:["fromShift","toShift","priority"]},
      {title:"Message",hint:"What does the next shift need to know?",keys:["title","handoffNotes"]}
    ]
  },
  "asset-checkout":{
    mode:"checkoutDesk",addLabel:"+ Check Out Asset",notes:"Checkout Notes",
    formIntro:"Issue an asset to a person and track the return lifecycle.",
    sections:[
      {title:"Asset",hint:"What is being issued?",keys:["title","assetId","conditionOut"]},
      {title:"Checkout",hint:"Who has it and when is it due back?",keys:["checkedOutTo","checkoutDate"]},
      {title:"Return",hint:"Fill this when the asset comes back.",keys:["returnDate","conditionIn"]}
    ]
  },
  "logbook":{
    mode:"logbookTimeline",addLabel:"+ New Log Entry",notes:"Log Details",
    formIntro:"Write a dated operational entry that reads like a business journal.",
    sections:[
      {title:"Entry",hint:"When and where did this happen?",keys:["title","logDate","shift","location"]},
      {title:"People & Attention",hint:"Who was involved and how important is it?",keys:["people","issueFlag"]},
      {title:"Next Step",hint:"Follow-up if needed.",keys:["nextAction"]}
    ]
  },
  "employees":{
    mode:"employeeDirectory",addLabel:"+ Add Employee Record",notes:"Internal Employee Notes",
    formIntro:"Maintain an employee directory record separate from login/account permissions.",
    sections:[
      {title:"Employee Profile",hint:"Basic identity and work role.",keys:["title","role","department","employmentType"]},
      {title:"Contact",hint:"Business contact information.",keys:["email","phone"]},
      {title:"Employment",hint:"Key dates and emergency contact.",keys:["startDate","emergencyContact"]}
    ]
  },
  "vehicles":{
    mode:"fleetDashboard",addLabel:"+ Add Vehicle",notes:"Vehicle Notes",
    formIntro:"Manage vehicles like a fleet with condition, driver and service visibility.",
    sections:[
      {title:"Vehicle Identity",hint:"Identify the unit.",keys:["title","year","makeModel","vin","plate"]},
      {title:"Operating State",hint:"Mileage, condition and assignment.",keys:["mileage","condition","assignedTo"]}
    ]
  },
  "photo-proof":{
    mode:"proofGallery",addLabel:"+ Add Proof",notes:"Proof Notes",
    formIntro:"Capture evidence around a job with the image/reference at the center.",
    sections:[
      {title:"Job Reference",hint:"What work does this proof belong to?",keys:["title","jobReference","customerName"]},
      {title:"Proof",hint:"Type, location and capture details.",keys:["proofType","location","capturedAt","capturedBy"]},
      {title:"Photo",hint:"Add the image URL or file reference.",keys:["photoUrl"]}
    ]
  },
  "vendors":{
    mode:"vendorDirectory",addLabel:"+ Add Vendor",notes:"Vendor Notes",
    formIntro:"Keep supplier relationships organized like a business contact directory.",
    sections:[
      {title:"Vendor",hint:"Company and service.",keys:["title","service"]},
      {title:"Primary Contact",hint:"Who do you call or email?",keys:["contactName","phone","email","website"]},
      {title:"Account",hint:"Business terms and account reference.",keys:["accountNumber","paymentTerms"]}
    ]
  },
  "subscriptions":{
    mode:"subscriptionLedger",addLabel:"+ Add Subscription",notes:"Subscription Notes",
    formIntro:"Track recurring services with cost and billing information front and center.",
    sections:[
      {title:"Service",hint:"What recurring service is this?",keys:["title","provider"]},
      {title:"Billing",hint:"Cost and billing cycle.",keys:["cost","billingCycle","paymentMethod"]},
      {title:"Account",hint:"Where is the subscription managed?",keys:["accountEmail","startedDate","cancelUrl"]}
    ]
  },
  "documents":{
    mode:"documentRegister",addLabel:"+ Register Document",notes:"Document Notes",
    formIntro:"Register important business documents with ownership, reference and expiration data.",
    sections:[
      {title:"Document",hint:"What is the document?",keys:["title","documentType","referenceNumber"]},
      {title:"Responsibility",hint:"Who issued it and who owns it internally?",keys:["issuedBy","responsiblePerson"]},
      {title:"Storage & Access",hint:"Where is it and how sensitive is it?",keys:["issueDate","storageLocation","confidentiality"]}
    ]
  },
  "training":{
    mode:"trainingMatrix",addLabel:"+ Assign Training",notes:"Training Notes",
    formIntro:"Track training against the employee and completion/renewal requirements.",
    sections:[
      {title:"Assignment",hint:"Who needs what training?",keys:["title","employee","requiredByRole"]},
      {title:"Provider & Result",hint:"Who provides it and how did it go?",keys:["provider","score","certificateNumber"]},
      {title:"Timeline",hint:"Assignment and completion dates.",keys:["assignedDate","completionDate"]}
    ]
  },
  "website-monitor":{
    mode:"websiteStatus",addLabel:"+ Add Website Check",notes:"Monitoring Notes",
    formIntro:"Treat each website as a status monitor with check type and observed condition.",
    sections:[
      {title:"Website",hint:"What site or service is being watched?",keys:["title","url"]},
      {title:"Check",hint:"What are you checking and what did you observe?",keys:["checkType","checkedAt","observedStatus","checkedBy"]},
      {title:"Result",hint:"Describe the outage, issue or result.",keys:["responseNotes"]}
    ]
  },
  "qr-assets":{
    mode:"qrLabels",addLabel:"+ Add QR Asset",notes:"QR Asset Notes",
    formIntro:"Prepare a label-ready asset with a destination and physical context.",
    sections:[
      {title:"Label Identity",hint:"What does this QR represent?",keys:["title","assetId","location"]},
      {title:"Destination",hint:"What should the QR open or explain?",keys:["destinationUrl","instructions"]},
      {title:"Assignment",hint:"Who owns the asset and when was the label updated?",keys:["assignedTo","lastUpdatedLabel"]}
    ]
  },
  "supplies":{
    mode:"supplyInventory",addLabel:"+ Add Supply",notes:"Supply Notes",
    formIntro:"Track inventory around quantity and reorder levels, not just a record title.",
    sections:[
      {title:"Item",hint:"What is being stocked?",keys:["title","sku","unit","location"]},
      {title:"Inventory",hint:"Current quantity and reorder threshold.",keys:["quantity","reorderLevel","urgency"]},
      {title:"Supplier",hint:"Preferred restock source.",keys:["supplier"]}
    ]
  },
  "warranties":{
    mode:"warrantyCoverage",addLabel:"+ Add Warranty",notes:"Warranty / Claim Notes",
    formIntro:"See what is covered, by whom, and how long coverage remains.",
    sections:[
      {title:"Covered Asset",hint:"Identify the product.",keys:["title","manufacturer","model","serialNumber"]},
      {title:"Purchase",hint:"When and where was it bought?",keys:["purchaseDate","retailer"]},
      {title:"Coverage",hint:"What kind of warranty and who handles claims?",keys:["warrantyType","claimContact"]}
    ]
  },
  "complaints":{
    mode:"complaintPipeline",addLabel:"+ New Complaint",notes:"Complaint & Resolution Notes",
    formIntro:"Handle customer complaints like cases moving through a resolution workflow.",
    sections:[
      {title:"Customer Case",hint:"Who complained and how did it arrive?",keys:["title","customer","contact","receivedAt","channel"]},
      {title:"Triage",hint:"Classify and assign the issue.",keys:["category","severity","assignedTo"]},
      {title:"Resolution",hint:"Document the response or outcome.",keys:["resolution"]}
    ]
  },
  "suggestions":{
    mode:"ideaBoard",addLabel:"+ Submit Idea",notes:"Suggestion Notes",
    formIntro:"Capture improvements as ideas that move from submitted to implemented.",
    sections:[
      {title:"Idea",hint:"What should change?",keys:["title","category","submittedBy","anonymous"]},
      {title:"Value",hint:"Why is it worth doing?",keys:["priority","expectedBenefit","estimatedEffort"]}
    ]
  },
  "visitor-log":{
    mode:"receptionDesk",addLabel:"+ Check In Visitor",notes:"Visitor Notes",
    formIntro:"Run reception around who is currently on site and who they are visiting.",
    sections:[
      {title:"Visitor",hint:"Who arrived?",keys:["title","company","phone"]},
      {title:"Visit",hint:"Who are they seeing and why?",keys:["host","reason","badge"]},
      {title:"Check-In / Out",hint:"Arrival and departure time.",keys:["arrival","departure"]}
    ]
  },
  "package-log":{
    mode:"packageQueue",addLabel:"+ Receive Package",notes:"Package Notes",
    formIntro:"Track packages around recipient notification and pickup.",
    sections:[
      {title:"Delivery",hint:"Identify the package and carrier.",keys:["title","carrier","sender"]},
      {title:"Recipient",hint:"Who is it for and where is it being stored?",keys:["recipient","storageLocation"]},
      {title:"Receipt & Pickup",hint:"Who received and who picked it up?",keys:["receivedAt","receivedBy","pickedUpBy","pickupDate"]}
    ]
  }
};
function toolExperience(id){return toolExperienceConfig[id]||{mode:"list",addLabel:"+ Add",notes:"Notes",formIntro:toolById(id).desc,sections:[{title:"Details",hint:"Record details.",keys:toolById(id).fields.map(f=>f.key)}]}}

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

let currentUser=null,userProfile=null,business=null,records=[],currentPlatformAdmin=null,ownerBusinesses=[],businessEmployees=[],businessOrgUnits=[],businessRoles=[],businessMembers=[],teamMessages=[],collaborationEvents=[];
let teamHubTab="work",teamMessageBox="inbox",activeRecordCollaborationId=null;

function isBusinessOwnerAccount(){return userProfile?.role==="owner"}
function isEmployeeAccount(){return userProfile?.role==="employee"}
function employeePermissions(){return userProfile?.permissions||{}}
function canCreateRecords(){return isBusinessOwnerAccount()||employeePermissions().canCreateRecords===true}
function canEditRecords(){return isBusinessOwnerAccount()||employeePermissions().canEditRecords===true}
function canDeleteRecords(){return isBusinessOwnerAccount()||employeePermissions().canDeleteRecords===true}
function canViewMonthly(){return isBusinessOwnerAccount()||employeePermissions().canViewMonthly===true}
function canExportRecords(){return isBusinessOwnerAccount()||employeePermissions().canExportRecords===true}
function canAssignRecords(){return isBusinessOwnerAccount()||employeePermissions().canAssignRecords===true||employeePermissions().canEditRecords===true}
function canManageEmployees(){return isBusinessOwnerAccount()||employeePermissions().canManageEmployees===true}
function canManageOrganization(){return isBusinessOwnerAccount()||employeePermissions().canManageOrganization===true}
function canManageTools(){return isBusinessOwnerAccount()||employeePermissions().canManageTools===true}
function canManageSettings(){return isBusinessOwnerAccount()||employeePermissions().canManageSettings===true}
function hasManagementPermissions(profileOrPermissions){
  const p=profileOrPermissions?.permissions||profileOrPermissions||{};
  return p.canManageEmployees===true||p.canManageOrganization===true||p.canManageTools===true||p.canManageSettings===true;
}
function canManageEmployeeTarget(employee){
  return isBusinessOwnerAccount()||!hasManagementPermissions(employee);
}
function fullBusinessEnabledModules(){return Array.isArray(business?.enabledModules)?business.enabledModules:defaultEnabledModules}
function accessibleModules(){
  const businessModules=fullBusinessEnabledModules();
  if(isBusinessOwnerAccount())return businessModules;
  const allowed=Array.isArray(employeePermissions().allowedModules)?employeePermissions().allowedModules:[];
  return businessModules.filter(id=>allowed.includes(id));
}
function canAccessModule(moduleId){return accessibleModules().includes(moduleId)}
function canAccessBusinessView(name){
  if(isBusinessOwnerAccount())return true;
  if(name==="tools")return canManageTools();
  if(name==="employees")return canManageEmployees();
  if(name==="organization")return canManageOrganization();
  if(name==="roles")return false;
  if(name==="settings")return canManageSettings();
  if(name==="monthly")return canViewMonthly();
  if(name==="toolWorkspace")return !!activeToolWorkspaceId&&canAccessModule(activeToolWorkspaceId);
  if(name==="teamHub")return true;
  return ["dashboard","records"].includes(name);
}

$("signupForm").addEventListener("submit",async e=>{
  e.preventDefault(); const message=$("authMessage"); message.className="form-message"; message.textContent="Creating account...";
  try{
    const businessName=$("signupBusinessName").value.trim(), ownerName=$("signupOwnerName").value.trim(), email=$("signupEmail").value.trim(), password=$("signupPassword").value;
    const credential=await createUserWithEmailAndPassword(auth,email,password); const uid=credential.user.uid; const businessId=crypto.randomUUID?crypto.randomUUID():`${uid}-${Date.now()}`;
    await updateProfile(credential.user,{displayName:ownerName});
    await setDoc(doc(db,"users",uid),{displayName:ownerName,email,businessId,role:"owner",active:true,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
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
    if(userProfile.role==="employee" && userProfile.active!==true)throw new Error("Employee account is inactive.");
    const businessSnap=await getDoc(doc(db,"businesses",userProfile.businessId));
    if(!businessSnap.exists())throw new Error("Business record not found or access is suspended.");
    business={id:businessSnap.id,...businessSnap.data()};
    await Promise.all([loadRecords(),loadBusinessOrgUnits(),loadBusinessRoles(),loadBusinessMembers()]);
    businessEmployees=businessMembers.filter(member=>member.role==="employee");
    await Promise.all([loadTeamMessages(),loadCollaborationEvents()]);
    showApp();
  }catch(error){console.error(error);alert("This account could not be loaded. Check account access and Firestore setup.");await signOut(auth);}
});
function showPublic(){publicSite.classList.remove("hidden");publicFooter.classList.remove("hidden");appShell.classList.add("hidden");ownerShell.classList.add("hidden");document.querySelector(".site-header").classList.remove("hidden");$("ownerPublicPreviewBar")?.classList.add("hidden");document.body.classList.remove("owner-previewing-public")}
function showApp(){
  publicSite.classList.add("hidden");publicFooter.classList.add("hidden");ownerShell.classList.add("hidden");document.querySelector(".site-header").classList.add("hidden");$("ownerPublicPreviewBar")?.classList.add("hidden");document.body.classList.remove("owner-previewing-public");appShell.classList.remove("hidden");
  $("sidebarBusinessName").textContent=business.name;
  $("sidebarUserEmail").textContent=currentUser.email||"";
  $("sidebarUserRole").textContent=isBusinessOwnerAccount()
    ?"Business Owner"
    :(userProfile.roleName||userProfile.jobTitle||"Employee");
  $("settingsBusinessName").value=business.name||"";
  $("settingsOwnerName").value=business.ownerName||userProfile.displayName||"";
  $("settingsOwnerName").disabled=!isBusinessOwnerAccount();
  $("settingsPhone").value=business.phone||"";
  $("settingsWebsite").value=business.website||"";
  applyBusinessAccountRoleUI();
  renderModuleOptions();
  renderEverything();
  if(canManageEmployees())renderEmployeeAccounts();
  if(canManageOrganization())renderOrganization();
  if(isBusinessOwnerAccount())renderRoles();
  switchView("dashboard");
}
function applyBusinessAccountRoleUI(){
  const owner=isBusinessOwnerAccount();
  document.querySelectorAll("[data-business-owner-only]").forEach(el=>el.classList.toggle("hidden",!owner));
  document.querySelectorAll("[data-can-manage-employees]").forEach(el=>el.classList.toggle("hidden",!canManageEmployees()));
  document.querySelectorAll("[data-can-manage-organization]").forEach(el=>el.classList.toggle("hidden",!canManageOrganization()));
  document.querySelectorAll("[data-can-manage-tools]").forEach(el=>el.classList.toggle("hidden",!canManageTools()));
  document.querySelectorAll("[data-can-manage-settings]").forEach(el=>el.classList.toggle("hidden",!canManageSettings()));
  document.querySelectorAll("[data-go-tools]").forEach(el=>el.classList.toggle("hidden",!canManageTools()));
  $("monthlyNavBtn").classList.toggle("hidden",!canViewMonthly());
  $("quickAddBtn").classList.toggle("hidden",!canCreateRecords());
  $("addRecordBtn").classList.toggle("hidden",!canCreateRecords());
  $("exportRecordsBtn").classList.toggle("hidden",!canExportRecords());
}


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


function ownerMockDate(offsetDays=0){
  const d=new Date();
  d.setDate(d.getDate()+offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function ownerMockDateTime(offsetDays=0,hour=9,minute=0){
  return `${ownerMockDate(offsetDays)}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`;
}
function ownerMockRecord(module,id,title,status,dueDate="",fields={},details=""){
  return {module,id:`preview-${module}-${id}`,title,status,dueDate,fields,details};
}
function ownerToolPreviewSampleRecords(id){
  const R=(n,title,status,due,fields,details="")=>ownerMockRecord(id,n,title,status,due,fields,details);
  switch(id){
    case "tasks": return [
      R(1,"Send revised proposal","Open",ownerMockDate(1),{priority:"High",assignedTo:"Jordan Lee",recurring:"No"}),
      R(2,"Update inventory counts","In Progress",ownerMockDate(3),{priority:"Medium",assignedTo:"Operations",recurring:"Weekly"}),
      R(3,"Close monthly books","Complete",ownerMockDate(-2),{priority:"High",assignedTo:"Alex Morgan",recurring:"Monthly"})
    ];
    case "checklists": return [
      R(1,"Opening Checklist","In Progress",ownerMockDate(),{frequency:"Daily",assignedTo:"Opening Shift",items:"Unlock front entrance\nTurn on register\nCheck lobby\nReview appointments",checkedItems:"[0,1]"}),
      R(2,"Vehicle Closeout","Ready",ownerMockDate(1),{frequency:"Daily",assignedTo:"Drivers",items:"Remove trash\nRecord mileage\nCheck fuel\nLock vehicle",checkedItems:"[]"}),
      R(3,"Weekly Safety Walk","Complete",ownerMockDate(5),{frequency:"Weekly",assignedTo:"Supervisor",items:"Emergency exits\nFire extinguishers\nWalkways\nFirst aid kit",checkedItems:"[0,1,2,3]"})
    ];
    case "equipment": return [
      R(1,"Commercial Pressure Washer","Assigned",ownerMockDate(20),{assetNumber:"EQ-1042",serialNumber:"PW-88421",condition:"Good",assignedTo:"Crew A",location:"Henderson Yard"}),
      R(2,"Portable Generator","Available",ownerMockDate(45),{assetNumber:"EQ-1008",serialNumber:"GN-44109",condition:"Excellent",assignedTo:"",location:"Warehouse"}),
      R(3,"Floor Buffer","Needs Repair",ownerMockDate(-2),{assetNumber:"EQ-1120",serialNumber:"FB-90992",condition:"Damaged",assignedTo:"",location:"Main Office"})
    ];
    case "maintenance": return [
      R(1,"Oil & Filter Service","Complete",ownerMockDate(85),{asset:"Truck 12",serviceType:"Preventive",lastService:ownerMockDate(-5),mileageHours:"48,220 mi",cost:"184.50",provider:"Silver State Auto"}),
      R(2,"Generator Inspection","Scheduled",ownerMockDate(7),{asset:"Portable Generator",serviceType:"Inspection",lastService:ownerMockDate(-80),mileageHours:"312 hrs",cost:"",provider:"In-house"}),
      R(3,"Hydraulic Hose Repair","In Progress",ownerMockDate(1),{asset:"Lift 3",serviceType:"Repair",lastService:ownerMockDate(),mileageHours:"1,082 hrs",cost:"325",provider:"Desert Equipment"})
    ];
    case "renewals": return [
      R(1,"City Business License","Due Soon",ownerMockDate(12),{renewalType:"Business License",provider:"City of Henderson",referenceNumber:"BL-482104",reminderDays:"30"}),
      R(2,"General Liability Policy","Current",ownerMockDate(94),{renewalType:"Insurance",provider:"Example Insurance",referenceNumber:"GL-204991",reminderDays:"60"}),
      R(3,"Equipment Certification","Expired",ownerMockDate(-6),{renewalType:"Certification",provider:"Safety Board",referenceNumber:"CERT-0098",reminderDays:"30"})
    ];
    case "incidents": return [
      R(1,"Minor slip near loading area","Investigating",ownerMockDate(2),{incidentType:"Safety",incidentDateTime:ownerMockDateTime(-1,14,25),location:"Warehouse Bay 2",peopleInvolved:"Taylor R.",witnesses:"Chris M.",damageInjury:"Minor ankle soreness",followUp:"Inspect floor drainage"}),
      R(2,"Vehicle mirror damaged","Follow-up",ownerMockDate(4),{incidentType:"Property Damage",incidentDateTime:ownerMockDateTime(-3,10,5),location:"Client site",peopleInvolved:"Driver 7",witnesses:"None",damageInjury:"Passenger mirror cracked",followUp:"Repair quote requested"}),
      R(3,"Unauthorized door access","Resolved","",{incidentType:"Security",incidentDateTime:ownerMockDateTime(-8,19,10),location:"Rear Office",peopleInvolved:"Unknown visitor",witnesses:"Front desk",damageInjury:"None",followUp:"Badge access updated"})
    ];
    case "shift-handoff": return [
      R(1,"Customer pickup waiting","Open",ownerMockDate(),{fromShift:"Morning Shift",toShift:"Evening Shift",priority:"High",handoffNotes:"Customer will arrive after 5 PM for completed order."}),
      R(2,"Printer issue at front desk","Acknowledged",ownerMockDate(),{fromShift:"Office",toShift:"Closing Staff",priority:"Medium",handoffNotes:"Temporary printer is connected; service ticket is open."}),
      R(3,"Warehouse count finished","Resolved","",{fromShift:"Night Shift",toShift:"Morning Shift",priority:"Normal",handoffNotes:"Cycle count completed with two discrepancies noted."})
    ];
    case "asset-checkout": return [
      R(1,"Thermal Camera","Checked Out",ownerMockDate(2),{assetId:"AS-044",checkedOutTo:"Morgan D.",checkoutDate:ownerMockDate(-1),conditionOut:"Excellent"}),
      R(2,"Tablet 03","Overdue",ownerMockDate(-2),{assetId:"IT-003",checkedOutTo:"Crew B",checkoutDate:ownerMockDate(-8),conditionOut:"Good"}),
      R(3,"Laser Measure","Returned","",{assetId:"AS-019",checkedOutTo:"Jordan L.",checkoutDate:ownerMockDate(-5),returnDate:ownerMockDate(-3),conditionOut:"Good",conditionIn:"Good"})
    ];
    case "logbook": return [
      R(1,"Morning operations opened normally","Logged","",{logDate:ownerMockDate(),shift:"Morning",location:"Main Office",people:"Opening staff",issueFlag:"Routine",nextAction:"None"},"Doors, systems and work areas checked."),
      R(2,"Delivery arrived early","Needs Follow-up",ownerMockDate(1),{logDate:ownerMockDate(),shift:"Morning",location:"Warehouse",people:"Receiving team",issueFlag:"Follow-up",nextAction:"Verify quantity against PO"},"Carrier arrived before scheduled window."),
      R(3,"Power interruption","Resolved","",{logDate:ownerMockDate(-2),shift:"Evening",location:"Henderson Location",people:"Evening staff",issueFlag:"Important",nextAction:"Completed"},"Brief outage; equipment restarted normally.")
    ];
    case "employees": return [
      R(1,"Jordan Lee","Active","",{role:"Operations Manager",department:"Operations",email:"jordan@example.com",phone:"(702) 555-0180",startDate:ownerMockDate(-400),employmentType:"Full Time"}),
      R(2,"Taylor Reed","Active","",{role:"Technician",department:"Field Team",email:"taylor@example.com",phone:"(702) 555-0132",startDate:ownerMockDate(-150),employmentType:"Full Time"}),
      R(3,"Morgan Diaz","On Leave","",{role:"Coordinator",department:"Office",email:"morgan@example.com",phone:"(702) 555-0120",startDate:ownerMockDate(-620),employmentType:"Full Time"})
    ];
    case "vehicles": return [
      R(1,"Truck 12","Active",ownerMockDate(24),{year:"2024",makeModel:"Ford F-250",vin:"1FT••••1208",plate:"NV 84K2",mileage:"48,220",condition:"Good",assignedTo:"Crew A"}),
      R(2,"Van 4","Needs Service",ownerMockDate(-1),{year:"2022",makeModel:"Ram ProMaster",vin:"3C6••••0401",plate:"NV 33P9",mileage:"72,190",condition:"Fair",assignedTo:"Delivery"}),
      R(3,"Truck 7","Active",ownerMockDate(61),{year:"2025",makeModel:"Chevrolet Silverado",vin:"2GC••••0704",plate:"NV 18D7",mileage:"12,804",condition:"Excellent",assignedTo:"Crew B"})
    ];
    case "photo-proof": return [
      R(1,"Completed storefront cleanup","Approved","",{jobReference:"JOB-1042",customerName:"Example Retail",proofType:"After",location:"Henderson",capturedAt:ownerMockDateTime(-1,15,40),capturedBy:"Crew A",photoUrl:""}),
      R(2,"Pre-work condition","Captured","",{jobReference:"JOB-1051",customerName:"Sample Property",proofType:"Before",location:"Las Vegas",capturedAt:ownerMockDateTime(0,8,15),capturedBy:"Taylor R.",photoUrl:""}),
      R(3,"Damage documentation","Needs Review","",{jobReference:"JOB-1038",customerName:"ABC Office",proofType:"Damage",location:"Loading Area",capturedAt:ownerMockDateTime(-2,11,10),capturedBy:"Jordan L.",photoUrl:""})
    ];
    case "vendors": return [
      R(1,"Desert Office Supply","Preferred","",{service:"Office Supplies",contactName:"Jamie Cole",phone:"(702) 555-0114",email:"orders@example.com",website:"example.com",accountNumber:"AC-4412",paymentTerms:"Net 30"}),
      R(2,"Silver State Auto","Active","",{service:"Fleet Maintenance",contactName:"Service Desk",phone:"(702) 555-0194",email:"service@example.com",website:"example.com",accountNumber:"FL-9081",paymentTerms:"Due on service"}),
      R(3,"Metro Safety Co.","Active","",{service:"Safety Equipment",contactName:"Robin K.",phone:"(702) 555-0147",email:"sales@example.com",website:"example.com",accountNumber:"SA-1102",paymentTerms:"Net 15"})
    ];
    case "subscriptions": return [
      R(1,"Adobe Creative Cloud","Active",ownerMockDate(14),{provider:"Adobe",cost:"59.99",billingCycle:"Monthly",accountEmail:"design@example.com",paymentMethod:"Card •••• 4580"}),
      R(2,"Business Phone Service","Active",ownerMockDate(21),{provider:"Example Telecom",cost:"89.00",billingCycle:"Monthly",accountEmail:"admin@example.com",paymentMethod:"ACH"}),
      R(3,"Domain Renewal","Active",ownerMockDate(160),{provider:"Namecheap",cost:"18.98",billingCycle:"Annual",accountEmail:"owner@example.com",paymentMethod:"Card •••• 4580"})
    ];
    case "documents": return [
      R(1,"General Liability Certificate","Current",ownerMockDate(94),{documentType:"Insurance",referenceNumber:"COI-20941",issuedBy:"Example Insurance",responsiblePerson:"Office Manager",storageLocation:"Drive / Insurance",confidentiality:"Internal"}),
      R(2,"City Business License","Needs Review",ownerMockDate(12),{documentType:"License",referenceNumber:"BL-482104",issuedBy:"City of Henderson",responsiblePerson:"Owner",storageLocation:"Drive / Licenses",confidentiality:"Internal"}),
      R(3,"Employee Handbook","Current","",{documentType:"Policy",referenceNumber:"HR-2026-01",issuedBy:"Company",responsiblePerson:"HR",storageLocation:"Drive / HR",confidentiality:"Employees"})
    ];
    case "training": return [
      R(1,"Workplace Safety","Completed",ownerMockDate(300),{employee:"Taylor Reed",provider:"Safety Board",completionDate:ownerMockDate(-65),certificateNumber:"SAFE-2041",score:"96%",requiredByRole:"Field Staff"}),
      R(2,"Forklift Certification","Assigned",ownerMockDate(18),{employee:"Chris Morgan",provider:"Metro Training",assignedDate:ownerMockDate(-2),certificateNumber:"",score:"",requiredByRole:"Warehouse"}),
      R(3,"Customer Service Refresher","In Progress",ownerMockDate(5),{employee:"Jordan Lee",provider:"Internal",assignedDate:ownerMockDate(-7),certificateNumber:"",score:"",requiredByRole:"Managers"})
    ];
    case "website-monitor": return [
      R(1,"Main Website","Operational","",{url:"https://example.com",checkType:"Uptime",checkedAt:ownerMockDateTime(0,14,18),observedStatus:"Operational",checkedBy:"Office"}),
      R(2,"Customer Portal","Degraded","",{url:"https://portal.example.com",checkType:"Performance",checkedAt:ownerMockDateTime(0,14,10),observedStatus:"Slow",checkedBy:"Admin"}),
      R(3,"Booking Page","Down","",{url:"https://book.example.com",checkType:"Uptime",checkedAt:ownerMockDateTime(0,13,55),observedStatus:"Down",checkedBy:"Admin"})
    ];
    case "qr-assets": return [
      R(1,"Front Desk Review QR","Active","",{assetId:"QR-001",destinationUrl:"https://example.com/review",location:"Front Desk",assignedTo:"Office",instructions:"Scan to leave a review"}),
      R(2,"Equipment Manual QR","Active","",{assetId:"QR-014",destinationUrl:"https://example.com/manual",location:"Warehouse",assignedTo:"Equipment",instructions:"Scan for operating manual"}),
      R(3,"Visitor Wi-Fi QR","Active","",{assetId:"QR-022",destinationUrl:"https://example.com/wifi",location:"Lobby",assignedTo:"Reception",instructions:"Guest Wi-Fi instructions"})
    ];
    case "supplies": return [
      R(1,"Nitrile Gloves","Low Stock","",{sku:"GLV-100",location:"Warehouse",quantity:"18",reorderLevel:"25",unit:"boxes",supplier:"Metro Safety",urgency:"High"}),
      R(2,"Printer Paper","In Stock","",{sku:"PPR-20",location:"Main Office",quantity:"42",reorderLevel:"10",unit:"reams",supplier:"Desert Office Supply",urgency:"Normal"}),
      R(3,"Packing Tape","Out of Stock","",{sku:"TAPE-3",location:"Shipping",quantity:"0",reorderLevel:"12",unit:"rolls",supplier:"Supply House",urgency:"Urgent"})
    ];
    case "warranties": return [
      R(1,"Office Copier","Active",ownerMockDate(210),{manufacturer:"Canon",model:"DX-500",serialNumber:"CN-84012",purchaseDate:ownerMockDate(-420),retailer:"Office Supplier",warrantyType:"Extended",claimContact:"(800) 555-0100"}),
      R(2,"Truck 12 Bed Cover","Active",ownerMockDate(42),{manufacturer:"Example Auto",model:"ProCover",serialNumber:"PC-12902",purchaseDate:ownerMockDate(-680),retailer:"Auto Shop",warrantyType:"Manufacturer",claimContact:"claims@example.com"}),
      R(3,"Warehouse Scanner","Claim Open",ownerMockDate(75),{manufacturer:"Zebra",model:"TC-Series",serialNumber:"ZB-23011",purchaseDate:ownerMockDate(-300),retailer:"Tech Vendor",warrantyType:"Replacement",claimContact:"Support Portal"})
    ];
    case "complaints": return [
      R(1,"Late service arrival","New",ownerMockDate(2),{customer:"Example Customer",contact:"customer@example.com",receivedAt:ownerMockDateTime(0,9,15),channel:"Email",category:"Service",severity:"Moderate",assignedTo:"Office"}),
      R(2,"Invoice amount question","In Review",ownerMockDate(1),{customer:"ABC Property",contact:"(702) 555-0102",receivedAt:ownerMockDateTime(-1,14,30),channel:"Phone",category:"Billing",severity:"Low",assignedTo:"Manager"}),
      R(3,"Damaged item report","Resolved","",{customer:"Sample Retail",contact:"manager@example.com",receivedAt:ownerMockDateTime(-4,11,5),channel:"Website",category:"Damage",severity:"High",assignedTo:"Operations",resolution:"Replacement completed"})
    ];
    case "suggestions": return [
      R(1,"Add barcode labels","Submitted","",{submittedBy:"Warehouse Team",anonymous:"No",category:"Operations",priority:"Medium",expectedBenefit:"Faster inventory counts",estimatedEffort:"Medium"}),
      R(2,"Move morning meeting to 8:15","Under Review","",{submittedBy:"Crew A",anonymous:"No",category:"Scheduling",priority:"Low",expectedBenefit:"Less traffic delay",estimatedEffort:"Low"}),
      R(3,"Create mobile equipment checklist","Approved","",{submittedBy:"Supervisor",anonymous:"No",category:"Safety",priority:"High",expectedBenefit:"Consistent inspections",estimatedEffort:"Medium"}),
      R(4,"Digital visitor log","Implemented","",{submittedBy:"Office",anonymous:"No",category:"Administration",priority:"Medium",expectedBenefit:"Better visitor tracking",estimatedEffort:"Low"})
    ];
    case "visitor-log": return [
      R(1,"Jamie Collins","On Site","",{company:"Metro Supply",host:"Jordan Lee",reason:"Vendor meeting",arrival:ownerMockDateTime(0,13,42),phone:"(702) 555-0192",badge:"V-014"}),
      R(2,"Robin Chen","On Site","",{company:"Independent",host:"Office Manager",reason:"Interview",arrival:ownerMockDateTime(0,14,5),phone:"(702) 555-0155",badge:"V-015"}),
      R(3,"Alex Parker","Checked Out","",{company:"Example Telecom",host:"IT",reason:"Service visit",arrival:ownerMockDateTime(0,9,20),departure:ownerMockDateTime(0,10,45),badge:"V-010"})
    ];
    case "package-log": return [
      R(1,"1Z84X03...4412","Received","",{carrier:"UPS",sender:"Office Supplier",recipient:"Jordan Lee",receivedAt:ownerMockDateTime(0,11,42),receivedBy:"Front Desk",storageLocation:"Mail Room"}),
      R(2,"9405...8821","Recipient Notified","",{carrier:"USPS",sender:"Client Services",recipient:"Morgan Diaz",receivedAt:ownerMockDateTime(0,10,18),receivedBy:"Front Desk",storageLocation:"Shelf B"}),
      R(3,"7734...0192","Picked Up","",{carrier:"FedEx",sender:"Tech Vendor",recipient:"IT Department",receivedAt:ownerMockDateTime(-1,15,9),receivedBy:"Office",storageLocation:"Mail Room",pickedUpBy:"Chris M.",pickupDate:ownerMockDateTime(0,8,40)})
    ];
    default: return [
      R(1,`${toolById(id).name} Example 1`,toolById(id).statuses?.[0]||"Open",ownerMockDate(3),{}),
      R(2,`${toolById(id).name} Example 2`,toolById(id).statuses?.[1]||"In Progress",ownerMockDate(7),{})
    ];
  }
}
function ownerPreviewWorkspaceName(mode){
  return ({
    taskBoard:"Task Board",checklistLibrary:"Checklist Library",assetInventory:"Asset Inventory",
    serviceTimeline:"Service Timeline",renewalRadar:"Renewal Radar",incidentCases:"Incident Case Manager",
    handoffFeed:"Shift Handoff Feed",checkoutDesk:"Checkout Desk",logbookTimeline:"Daily Log Timeline",
    employeeDirectory:"Employee Directory",fleetDashboard:"Fleet Dashboard",proofGallery:"Photo Proof Gallery",
    vendorDirectory:"Vendor Directory",subscriptionLedger:"Subscription Ledger",documentRegister:"Document Register",
    trainingMatrix:"Training Matrix",websiteStatus:"Website Status Dashboard",qrLabels:"QR Asset Labels",
    supplyInventory:"Supply Inventory",warrantyCoverage:"Warranty Coverage",complaintPipeline:"Complaint Pipeline",
    ideaBoard:"Idea Board",receptionDesk:"Reception Desk",packageQueue:"Package Queue"
  })[mode]||"Custom Workspace";
}
function switchOwnerPreviewTab(name){
  document.querySelectorAll("[data-owner-preview-tab]").forEach(btn=>btn.classList.toggle("active",btn.dataset.ownerPreviewTab===name));
  $("ownerPreviewWorkspacePanel").classList.toggle("hidden",name!=="workspace");
  $("ownerPreviewFormPanel").classList.toggle("hidden",name!=="form");
  $("ownerPreviewSetupPanel").classList.toggle("hidden",name!=="setup");
}
document.querySelectorAll("[data-owner-preview-tab]").forEach(btn=>btn.addEventListener("click",()=>switchOwnerPreviewTab(btn.dataset.ownerPreviewTab)));

function openOwnerToolPreview(id){
  const t=toolById(id),cfg=toolExperience(id);
  if(!t)return;

  const workspaceName=ownerPreviewWorkspaceName(cfg.mode);
  $("ownerToolPreviewIcon").textContent=t.icon||"•";
  $("ownerToolPreviewCategory").textContent=(t.category||"Other").toUpperCase();
  $("ownerToolPreviewTitle").textContent=t.name||"Tool Preview";
  $("ownerToolPreviewDescription").textContent=t.desc||"";
  $("ownerToolPreviewHelper").textContent=workspaceName;
  $("ownerToolPreviewDueLabel").textContent=t.dueLabel||"Due Date";
  $("ownerToolPreviewStatusCount").textContent=String((t.statuses||[]).length);
  $("ownerToolPreviewFieldCount").textContent=String((t.fields||[]).length);
  $("ownerWorkspacePreviewName").textContent=workspaceName;
  $("ownerWorkspacePreviewAddBtn").textContent=cfg.addLabel||"+ Add";
  $("ownerPreviewToolName").value=t.name;

  // Realistic customer workspace using the SAME renderer as the live customer tool.
  const samples=ownerToolPreviewSampleRecords(id);
  const complete=samples.filter(completedStatus).length;
  const overdue=samples.filter(r=>recordDueHealth(r).key==="overdue").length;
  const dueSoon=samples.filter(r=>recordDueHealth(r).key==="soon").length;
  $("ownerWorkspacePreviewStats").innerHTML=[
    workspaceStat("Sample Records",samples.length),
    workspaceStat("Active",samples.length-complete),
    workspaceStat("Due / Attention",overdue+dueSoon),
    workspaceStat("Completed",complete)
  ].join("");
  $("ownerWorkspacePreviewStage").innerHTML=renderToolWorkspaceContent(id,samples,cfg);

  // Add/Edit form is still available, but only on the second tab.
  const fieldMap=new Map((t.fields||[]).map(f=>[f.key,f]));
  const used=new Set();
  const configRows=[];
  const sectionHtml=(cfg.sections||[]).map(section=>{
    const fields=(section.keys||[]).map(key=>fieldMap.get(key)).filter(Boolean);
    fields.forEach(f=>used.add(f.key));
    if(!fields.length)return "";
    const rendered=fields.map(ownerPreviewFieldHtml);
    configRows.push(`<div class="owner-preview-workflow-config"><strong>${safeText(section.title)}</strong><span>${safeText(section.hint||"")}</span></div>`,...rendered.map(x=>x.config));
    return `<section class="owner-preview-unique-section">
      <div class="owner-preview-unique-section-head"><strong>${safeText(section.title)}</strong><span>${safeText(section.hint||"")}</span></div>
      <div class="owner-preview-unique-fields">${rendered.map(x=>x.form).join("")}</div>
    </section>`;
  }).join("");

  const leftovers=(t.fields||[]).filter(f=>!used.has(f.key));
  let leftoverHtml="";
  if(leftovers.length){
    const rendered=leftovers.map(ownerPreviewFieldHtml);
    configRows.push(...rendered.map(x=>x.config));
    leftoverHtml=`<section class="owner-preview-unique-section">
      <div class="owner-preview-unique-section-head"><strong>Additional Details</strong><span>Other information tracked by this tool.</span></div>
      <div class="owner-preview-unique-fields">${rendered.map(x=>x.form).join("")}</div>
    </section>`;
  }

  $("ownerToolPreviewFields").className="dynamic-fields owner-preview-dynamic-fields owner-preview-unique-form";
  $("ownerToolPreviewFields").innerHTML=`
    <div class="owner-preview-workflow-banner">
      <span class="tool-form-context-icon">${safeText(t.icon)}</span>
      <div><small>DATA ENTRY</small><strong>${safeText(cfg.addLabel||"+ Add")}</strong><span>${safeText(cfg.formIntro||t.desc||"")}</span></div>
    </div>
    ${sectionHtml}${leftoverHtml}`;

  $("ownerToolPreviewStatus").innerHTML=(t.statuses||["Open","In Progress","Complete","Archived"]).map(s=>`<option>${safeText(s)}</option>`).join("");
  $("ownerToolPreviewDueField").childNodes[0].nodeValue=`${t.dueLabel||"Due Date"} `;

  $("ownerToolConfigList").innerHTML=`
    <div class="owner-preview-workflow-config highlight"><strong>${safeText(workspaceName)}</strong><span>Primary customer workspace</span></div>
    <div class="owner-preview-workflow-config highlight"><strong>${safeText(cfg.addLabel||"+ Add")}</strong><span>Primary create action</span></div>
    ${configRows.join("")}`;

  $("ownerToolPreviewBullets").innerHTML=[
    `Customer workspace: ${workspaceName}`,
    `Create action: ${cfg.addLabel||"+ Add"}`,
    `Form sections: ${(cfg.sections||[]).map(s=>s.title).join(" • ")}`,
    ...(t.bullets||[])
  ].map(item=>`<li>${safeText(item)}</li>`).join("");

  switchOwnerPreviewTab("workspace");
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



async function loadBusinessMembers(){
  if(!business){businessMembers=[];return;}
  const snap=await getDocs(query(collection(db,"users"),where("businessId","==",business.id)));
  businessMembers=snap.docs.map(d=>({id:d.id,...d.data()})).filter(m=>m.role==="owner"||m.active===true).sort((a,b)=>a.role==="owner"?-1:b.role==="owner"?1:(a.displayName||a.email||"").localeCompare(b.displayName||b.email||""));
}
function memberById(id){return businessMembers.find(m=>m.id===id)}
function memberDisplayName(id){return memberById(id)?.displayName||memberById(id)?.email||(id===currentUser?.uid?"You":"Team Member")}
function groupDisplayName(id){return orgUnitById(id)?.name||"Group"}
function currentUserOrgIds(){return Array.isArray(userProfile?.orgUnitIds)?userProfile.orgUnitIds:[]}
function recordAssignedUserIds(r){return Array.isArray(r?.assignedUserIds)?r.assignedUserIds:[]}
function recordAssignedGroupIds(r){return Array.isArray(r?.assignedOrgUnitIds)?r.assignedOrgUnitIds:[]}
function isRecordAssignedDirectly(r){return recordAssignedUserIds(r).includes(currentUser?.uid)}
function isRecordAssignedToMyGroups(r){const mine=new Set(currentUserOrgIds());return recordAssignedGroupIds(r).some(id=>mine.has(id))}
function recordAssignmentLabels(r){return [...recordAssignedUserIds(r).map(id=>({type:"person",label:memberDisplayName(id)})),...recordAssignedGroupIds(r).map(id=>({type:"group",label:groupDisplayName(id)}))]}
function collaborationTimestampDate(v){if(!v)return null;if(v instanceof Date)return v;if(typeof v.toDate==="function")return v.toDate();if(typeof v.seconds==="number")return new Date(v.seconds*1000);const d=new Date(v);return Number.isNaN(d.getTime())?null:d}
function collaborationDateLabel(v){const d=collaborationTimestampDate(v);return d?d.toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"Just now"}
function currentActorName(){return userProfile?.displayName||currentUser?.displayName||currentUser?.email||"Team Member"}

async function loadBusinessOrgUnits(){
  if(!business){businessOrgUnits=[];return;}
  try{
    const snap=await getDocs(collection(db,"businesses",business.id,"orgUnits"));
    businessOrgUnits=snap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(a.name||"").localeCompare(b.name||""));
  }catch(error){
    console.warn("Could not load organization groups.",error);
    businessOrgUnits=[];
  }
}
async function loadBusinessRoles(){
  if(!business){businessRoles=[];return;}
  try{
    const snap=await getDocs(collection(db,"businesses",business.id,"roles"));
    businessRoles=snap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(a.name||"").localeCompare(b.name||""));
  }catch(error){
    console.warn("Could not load role templates.",error);
    businessRoles=[];
  }
}
function orgUnitById(id){return businessOrgUnits.find(x=>x.id===id)}
function roleById(id){return businessRoles.find(x=>x.id===id)}
function employeeOrgUnits(employee){
  const ids=Array.isArray(employee?.orgUnitIds)?employee.orgUnitIds:[];
  return ids.map(orgUnitById).filter(Boolean);
}
function orgEmployeeCount(orgId){
  return businessEmployees.filter(e=>Array.isArray(e.orgUnitIds)&&e.orgUnitIds.includes(orgId)).length;
}
function orgDescendantIds(id){
  const result=new Set();
  const visit=parent=>{
    businessOrgUnits.filter(x=>x.parentId===parent).forEach(child=>{
      if(!result.has(child.id)){result.add(child.id);visit(child.id)}
    });
  };
  visit(id);
  return result;
}
function renderOrganization(){
  if(!$("orgTree")||!canManageOrganization())return;
  const q=$("orgSearch").value.trim().toLowerCase();
  const assigned=new Set(businessEmployees.flatMap(e=>Array.isArray(e.orgUnitIds)?e.orgUnitIds:[]));
  $("orgStatTotal").textContent=businessOrgUnits.length;
  $("orgStatTopLevel").textContent=businessOrgUnits.filter(x=>!x.parentId).length;
  $("orgStatNested").textContent=businessOrgUnits.filter(x=>x.parentId).length;
  $("orgStatAssigned").textContent=businessEmployees.filter(e=>(e.orgUnitIds||[]).length).length;
  $("orgResultCount").textContent=`${businessOrgUnits.length} group${businessOrgUnits.length===1?"":"s"}`;

  if(!businessOrgUnits.length){
    $("orgTree").innerHTML='<div class="empty-state">No structure yet — and that is completely valid. Add a group only when the business needs one.</div>';
    return;
  }

  const matches=id=>{
    const u=orgUnitById(id); if(!u)return false;
    const self=`${u.name||""} ${u.type||""} ${u.description||""}`.toLowerCase().includes(q);
    return !q||self||businessOrgUnits.filter(x=>x.parentId===id).some(c=>matches(c.id));
  };
  const nodeHtml=(unit,depth=0)=>{
    if(!matches(unit.id))return "";
    const children=businessOrgUnits.filter(x=>x.parentId===unit.id);
    const count=orgEmployeeCount(unit.id);
    return `<div class="org-node">
      <div class="org-node-row">
        <div class="org-node-main">
          <span class="org-depth-mark">${depth===0?"●":"↳"}</span>
          <div>
            <strong>${safeText(unit.name||"Unnamed Group")}</strong>
            <span>${safeText(unit.type||"Custom")}${unit.description?` • ${safeText(unit.description)}`:""}</span>
            <span class="org-employee-count">${count} assigned employee${count===1?"":"s"}</span>
          </div>
        </div>
        <div class="org-node-actions">
          <button class="mini-btn" data-edit-org="${unit.id}">Edit</button>
          <button class="mini-btn danger" data-delete-org="${unit.id}">Delete</button>
        </div>
      </div>
      ${children.length?`<div class="org-node-children">${children.map(c=>nodeHtml(c,depth+1)).join("")}</div>`:""}
    </div>`;
  };

  const roots=businessOrgUnits.filter(x=>!x.parentId||!orgUnitById(x.parentId));
  $("orgTree").innerHTML=roots.map(r=>nodeHtml(r,0)).join("")||'<div class="empty-state">No groups match your search.</div>';
  document.querySelectorAll("[data-edit-org]").forEach(btn=>btn.onclick=()=>openOrgUnitModal(orgUnitById(btn.dataset.editOrg)));
  document.querySelectorAll("[data-delete-org]").forEach(btn=>btn.onclick=()=>deleteOrgUnit(btn.dataset.deleteOrg));
}
function populateOrgParentOptions(currentId=""){
  const blocked=new Set(currentId?[currentId,...orgDescendantIds(currentId)]:[]);
  $("orgUnitParent").innerHTML=`<option value="">No parent — top level</option>${businessOrgUnits
    .filter(x=>!blocked.has(x.id))
    .map(x=>`<option value="${x.id}">${safeText(x.name)} (${safeText(x.type||"Custom")})</option>`).join("")}`;
}
function openOrgUnitModal(unit=null){
  if(!canManageOrganization())return;
  $("orgUnitForm").reset();$("orgUnitMessage").textContent="";
  $("orgUnitId").value=unit?.id||"";
  $("orgUnitName").value=unit?.name||"";
  const knownTypes=["Team","Department","Location","Crew","Division","Project","Office","Warehouse","Branch"];
  const custom=unit?.type&&!knownTypes.includes(unit.type);
  $("orgUnitType").value=custom?"Custom":(unit?.type||"Team");
  $("orgUnitCustomType").value=custom?unit.type:"";
  $("orgUnitCustomTypeLabel").classList.toggle("hidden",$("orgUnitType").value!=="Custom");
  populateOrgParentOptions(unit?.id||"");
  $("orgUnitParent").value=unit?.parentId||"";
  $("orgUnitDescription").value=unit?.description||"";
  $("orgUnitModalTitle").textContent=unit?"Edit Group":"Add Group";
  $("orgUnitSaveBtn").textContent=unit?"Save Changes":"Create Group";
  $("orgUnitModal").classList.remove("hidden");
}
async function deleteOrgUnit(id){
  if(!canManageOrganization())return;
  const unit=orgUnitById(id); if(!unit)return;
  if(!confirm(`Delete "${unit.name}"? Employees will simply become unassigned from this group, and child groups will move to the top level.`))return;
  const childUpdates=businessOrgUnits.filter(x=>x.parentId===id).map(x=>
    updateDoc(doc(db,"businesses",business.id,"orgUnits",x.id),{parentId:"",updatedAt:serverTimestamp(),updatedBy:currentUser.uid})
  );
  const employeeUpdates=businessEmployees.filter(e=>(e.orgUnitIds||[]).includes(id)).map(e=>
    updateDoc(doc(db,"users",e.id),{orgUnitIds:e.orgUnitIds.filter(x=>x!==id),updatedAt:serverTimestamp(),updatedBy:currentUser.uid})
  );
  await Promise.all([...childUpdates,...employeeUpdates]);
  await deleteDoc(doc(db,"businesses",business.id,"orgUnits",id));
  await Promise.all([loadBusinessOrgUnits(),(canManageEmployees()||canManageOrganization())?loadBusinessEmployees():Promise.resolve()]);
  renderOrganization();if(canManageEmployees())renderEmployeeAccounts();
}
$("orgSearch").addEventListener("input",renderOrganization);
$("addOrgUnitBtn").addEventListener("click",()=>openOrgUnitModal());
$("orgUnitType").addEventListener("change",()=>$("orgUnitCustomTypeLabel").classList.toggle("hidden",$("orgUnitType").value!=="Custom"));
document.querySelectorAll("[data-close-org-unit]").forEach(btn=>btn.addEventListener("click",()=>$("orgUnitModal").classList.add("hidden")));
$("orgUnitModal").addEventListener("click",e=>{if(e.target===$("orgUnitModal"))$("orgUnitModal").classList.add("hidden")});
$("orgUnitForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!canManageOrganization())return;
  const id=$("orgUnitId").value;
  const type=$("orgUnitType").value==="Custom"?$("orgUnitCustomType").value.trim():$("orgUnitType").value;
  if(!type){$("orgUnitMessage").textContent="Enter a custom group type.";return;}
  const payload={
    name:$("orgUnitName").value.trim(),type,parentId:$("orgUnitParent").value||"",
    description:$("orgUnitDescription").value.trim(),active:true,
    updatedAt:serverTimestamp(),updatedBy:currentUser.uid
  };
  if(id)await updateDoc(doc(db,"businesses",business.id,"orgUnits",id),payload);
  else await addDoc(collection(db,"businesses",business.id,"orgUnits"),{...payload,createdAt:serverTimestamp(),createdBy:currentUser.uid});
  await loadBusinessOrgUnits();renderOrganization();$("orgUnitModal").classList.add("hidden");
});

function rolePermissions(role){return role?.permissions||{}}
function roleHasAdmin(role){return hasManagementPermissions(rolePermissions(role))}
function roleAssignedCount(id){return businessEmployees.filter(e=>e.roleId===id).length}
function renderRoles(){
  if(!$("roleTemplateGrid")||!isBusinessOwnerAccount())return;
  const q=$("roleSearch").value.trim().toLowerCase();
  const filtered=businessRoles.filter(r=>!q||`${r.name||""} ${r.description||""}`.toLowerCase().includes(q));
  $("roleStatTotal").textContent=businessRoles.length;
  $("roleStatAssigned").textContent=businessEmployees.filter(e=>e.roleId).length;
  $("roleStatAdmin").textContent=businessRoles.filter(roleHasAdmin).length;
  $("roleStatStandard").textContent=businessRoles.filter(r=>!roleHasAdmin(r)).length;
  $("roleResultCount").textContent=`${filtered.length} role${filtered.length===1?"":"s"}`;
  $("roleTemplateGrid").innerHTML=filtered.length?filtered.map(role=>{
    const p=rolePermissions(role),tools=Array.isArray(p.allowedModules)?p.allowedModules:[];
    const badges=[
      p.canCreateRecords&&"Create",p.canEditRecords&&"Edit",p.canDeleteRecords&&"Delete",
      p.canViewMonthly&&"Monthly",p.canExportRecords&&"Export"
    ].filter(Boolean);
    const admin=[
      p.canManageEmployees&&"Employees",p.canManageOrganization&&"Organization",
      p.canManageTools&&"Tools",p.canManageSettings&&"Settings"
    ].filter(Boolean);
    return `<article class="role-card">
      <div class="role-card-head"><div><h4>${safeText(role.name||"Unnamed Role")}</h4><p>${safeText(role.description||"No description")}</p></div><span class="owner-status ${roleHasAdmin(role)?"active":"setup_required"}">${roleHasAdmin(role)?"Admin-capable":"Standard"}</span></div>
      <div class="role-badges">${badges.map(x=>`<span class="role-badge">${safeText(x)}</span>`).join("")}${admin.map(x=>`<span class="role-badge admin">Manage ${safeText(x)}</span>`).join("")}</div>
      <p>${tools.length} default tool${tools.length===1?"":"s"} • ${roleAssignedCount(role.id)} assigned employee${roleAssignedCount(role.id)===1?"":"s"}</p>
      <div class="role-card-actions"><button class="mini-btn" data-edit-role="${role.id}">Edit Template</button><button class="mini-btn danger" data-delete-role="${role.id}">Delete</button></div>
    </article>`;
  }).join(""):'<div class="empty-state">No role templates yet. Employees can still be configured individually without roles.</div>';
  document.querySelectorAll("[data-edit-role]").forEach(btn=>btn.onclick=()=>openRoleModal(roleById(btn.dataset.editRole)));
  document.querySelectorAll("[data-delete-role]").forEach(btn=>btn.onclick=()=>deleteRole(btn.dataset.deleteRole));
}
function renderRoleToolAccess(selected=[]){
  const selectedSet=new Set(selected);
  $("roleToolAccessGrid").innerHTML=toolDefinitions.filter(t=>fullBusinessEnabledModules().includes(t.id)).map(t=>`
    <label class="employee-tool-access"><input type="checkbox" data-role-tool="${t.id}" ${selectedSet.has(t.id)?"checked":""}/><span>${safeText(t.icon)} ${safeText(t.name)}</span></label>
  `).join("")||'<div class="empty-state">Enable business tools before creating tool-based role defaults.</div>';
}
function selectedRoleTools(){return [...document.querySelectorAll("[data-role-tool]:checked")].map(x=>x.dataset.roleTool)}
function openRoleModal(role=null){
  if(!isBusinessOwnerAccount())return;
  $("roleForm").reset();$("roleMessage").textContent="";
  $("roleId").value=role?.id||"";$("roleName").value=role?.name||"";$("roleDescription").value=role?.description||"";
  const p=rolePermissions(role);
  $("roleCanCreate").checked=role?p.canCreateRecords===true:true;
  $("roleCanEdit").checked=role?p.canEditRecords===true:true;
  $("roleCanDelete").checked=role?p.canDeleteRecords===true:false;
  $("roleCanMonthly").checked=role?p.canViewMonthly===true:true;
  $("roleCanExport").checked=role?p.canExportRecords===true:false;
  $("roleCanAssign").checked=role?p.canAssignRecords!==false:true;
  $("roleCanManageEmployees").checked=role?p.canManageEmployees===true:false;
  $("roleCanManageOrganization").checked=role?p.canManageOrganization===true:false;
  $("roleCanManageTools").checked=role?p.canManageTools===true:false;
  $("roleCanManageSettings").checked=role?p.canManageSettings===true:false;
  renderRoleToolAccess(role?(p.allowedModules||[]):fullBusinessEnabledModules());
  $("roleModalTitle").textContent=role?"Edit Role":"Create Role";$("roleSaveBtn").textContent=role?"Save Template":"Create Role";
  $("roleModal").classList.remove("hidden");
}
async function deleteRole(id){
  if(!isBusinessOwnerAccount())return;
  const role=roleById(id);if(!role)return;
  if(!confirm(`Delete role template "${role.name}"? Employees keep their current permissions; only the role label/template assignment is removed.`))return;
  const updates=businessEmployees.filter(e=>e.roleId===id).map(e=>updateDoc(doc(db,"users",e.id),{roleId:"",roleName:"",updatedAt:serverTimestamp(),updatedBy:currentUser.uid}));
  await Promise.all(updates);
  await deleteDoc(doc(db,"businesses",business.id,"roles",id));
  await Promise.all([loadBusinessRoles(),loadBusinessEmployees()]);
  renderRoles();renderEmployeeAccounts();
}
$("roleSearch").addEventListener("input",renderRoles);
$("addRoleBtn").addEventListener("click",()=>openRoleModal());
$("roleSelectAllTools").addEventListener("click",()=>document.querySelectorAll("[data-role-tool]").forEach(cb=>cb.checked=true));
$("roleClearTools").addEventListener("click",()=>document.querySelectorAll("[data-role-tool]").forEach(cb=>cb.checked=false));
document.querySelectorAll("[data-close-role]").forEach(btn=>btn.addEventListener("click",()=>$("roleModal").classList.add("hidden")));
$("roleModal").addEventListener("click",e=>{if(e.target===$("roleModal"))$("roleModal").classList.add("hidden")});
$("roleForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!isBusinessOwnerAccount())return;
  const id=$("roleId").value;
  const permissions={
    canCreateRecords:$("roleCanCreate").checked,canEditRecords:$("roleCanEdit").checked,
    canDeleteRecords:$("roleCanDelete").checked,canViewMonthly:$("roleCanMonthly").checked,
    canExportRecords:$("roleCanExport").checked,canAssignRecords:$("roleCanAssign").checked,canManageEmployees:$("roleCanManageEmployees").checked,
    canManageOrganization:$("roleCanManageOrganization").checked,canManageTools:$("roleCanManageTools").checked,
    canManageSettings:$("roleCanManageSettings").checked,allowedModules:selectedRoleTools()
  };
  const payload={name:$("roleName").value.trim(),description:$("roleDescription").value.trim(),permissions,updatedAt:serverTimestamp(),updatedBy:currentUser.uid};
  if(id)await updateDoc(doc(db,"businesses",business.id,"roles",id),payload);
  else await addDoc(collection(db,"businesses",business.id,"roles"),{...payload,createdAt:serverTimestamp(),createdBy:currentUser.uid});
  await loadBusinessRoles();renderRoles();$("roleModal").classList.add("hidden");
});

async function loadBusinessEmployees(){
  if(!business){businessEmployees=[];return;}
  await loadBusinessMembers();
  businessEmployees=businessMembers.filter(member=>member.role==="employee");
}

function employeeAllowedTools(employee){
  const allowed=Array.isArray(employee.permissions?.allowedModules)?employee.permissions.allowedModules:[];
  return fullBusinessEnabledModules().filter(id=>allowed.includes(id));
}
function renderEmployeeStats(){
  if(!$("employeeStatTotal"))return;
  const total=businessEmployees.length;
  const active=businessEmployees.filter(e=>e.active===true).length;
  const inactive=total-active;
  const avg=total?Math.round(businessEmployees.reduce((sum,e)=>sum+employeeAllowedTools(e).length,0)/total):0;
  $("employeeStatTotal").textContent=total;
  $("employeeStatActive").textContent=active;
  $("employeeStatInactive").textContent=inactive;
  $("employeeStatToolAccess").textContent=avg;
}
function employeePermissionLabels(employee){
  const p=employee.permissions||{},labels=[];
  if(p.canCreateRecords)labels.push("Create");
  if(p.canEditRecords)labels.push("Edit");
  if(p.canDeleteRecords)labels.push("Delete");
  if(p.canViewMonthly)labels.push("Monthly");
  if(p.canExportRecords)labels.push("Export");
  if(p.canAssignRecords)labels.push("Assign Work");
  if(p.canManageEmployees)labels.push("Manage Employees");
  if(p.canManageOrganization)labels.push("Manage Org");
  if(p.canManageTools)labels.push("Manage Tools");
  if(p.canManageSettings)labels.push("Manage Settings");
  return labels;
}
function renderEmployeeAccounts(){
  if(!canManageEmployees()||!$("employeeAccountList"))return;
  renderEmployeeStats();
  const q=$("employeeSearch").value.trim().toLowerCase();
  const filtered=businessEmployees.filter(e=>!q||`${e.displayName||""} ${e.email||""} ${e.jobTitle||""}`.toLowerCase().includes(q));
  $("employeeResultCount").textContent=`${filtered.length} employee${filtered.length===1?"":"s"}`;
  $("employeeAccountList").innerHTML=filtered.length?filtered.map(e=>{
    const tools=employeeAllowedTools(e),permissions=employeePermissionLabels(e);
    return `<div class="employee-account-row">
      <div class="employee-account-main">
        <strong>${safeText(e.displayName||"Unnamed Employee")}</strong>
        <span>${safeText(e.email||"")}</span>
        <span>${safeText(e.jobTitle||"No job title")}</span>
      </div>
      <div class="employee-account-meta">
        <strong>Account</strong>
        <span class="owner-status ${e.active===true?"active":"suspended"}">${e.active===true?"Active":"Inactive"}</span>
        <span>Created ${safeText(formatOwnerDate(e.createdAt))}</span>
      </div>
      <div class="employee-account-meta">
        <strong>${tools.length} Allowed Tool${tools.length===1?"":"s"}</strong>
        <span>${tools.length?tools.slice(0,4).map(id=>toolById(id).name).join(", "):"No tool access"}${tools.length>4?` +${tools.length-4} more`:""}</span>
        <div class="employee-role-line">
          ${e.roleName?`<span class="employee-role-chip">${safeText(e.roleName)}</span>`:""}
          ${employeeOrgUnits(e).slice(0,3).map(u=>`<span class="employee-org-chip">${safeText(u.name)}</span>`).join("")}
          ${employeeOrgUnits(e).length>3?`<span class="employee-org-chip">+${employeeOrgUnits(e).length-3}</span>`:""}
        </div>
        <div class="employee-permission-chips">${permissions.map(p=>`<span class="employee-permission-chip">${safeText(p)}</span>`).join("")||'<span class="employee-permission-chip">View only</span>'}</div>
      </div>
      <div class="employee-account-actions">
        ${canManageEmployeeTarget(e)?`<button class="mini-btn" data-edit-employee="${e.id}">Edit Access</button>
        <button class="mini-btn" data-reset-employee="${e.id}">Reset Password</button>
        <button class="mini-btn ${e.active===true?"danger":""}" data-toggle-employee="${e.id}" data-next-active="${e.active===true?"false":"true"}">${e.active===true?"Deactivate":"Reactivate"}</button>`:'<span class="owner-status active">Owner-managed admin</span>'}
      </div>
    </div>`;
  }).join(""):'<div class="empty-state">No employee accounts match this search.</div>';

  document.querySelectorAll("[data-edit-employee]").forEach(btn=>btn.onclick=()=>openEmployeeModal(businessEmployees.find(e=>e.id===btn.dataset.editEmployee)));
  document.querySelectorAll("[data-reset-employee]").forEach(btn=>btn.onclick=()=>sendEmployeePasswordReset(businessEmployees.find(e=>e.id===btn.dataset.resetEmployee)));
  document.querySelectorAll("[data-toggle-employee]").forEach(btn=>btn.onclick=async()=>{
    const employee=businessEmployees.find(e=>e.id===btn.dataset.toggleEmployee);
    if(!employee)return;
    const next=btn.dataset.nextActive==="true";
    const question=next?`Reactivate ${employee.displayName||employee.email}?`:`Deactivate ${employee.displayName||employee.email}? They will immediately lose business access.`;
    if(!confirm(question))return;
    await updateDoc(doc(db,"users",employee.id),{active:next,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});
    employee.active=next;
    renderEmployeeAccounts();
  });
}

function assignableRoles(){
  return isBusinessOwnerAccount()?businessRoles:businessRoles.filter(r=>!roleHasAdmin(r));
}
function assignableTools(){
  return isBusinessOwnerAccount()?fullBusinessEnabledModules():accessibleModules();
}
function renderEmployeeRoleOptions(selectedId=""){
  const roles=assignableRoles();
  $("employeeRoleTemplate").innerHTML=`<option value="">No role template — customize manually</option>${roles.map(r=>`<option value="${r.id}">${safeText(r.name)}</option>`).join("")}`;
  $("employeeRoleTemplate").value=roles.some(r=>r.id===selectedId)?selectedId:"";
}
function renderEmployeeOrgAccess(selected=[]){
  const selectedSet=new Set(selected);
  $("employeeOrgAccessGrid").innerHTML=businessOrgUnits.length?businessOrgUnits.map(u=>`
    <label class="employee-org-access">
      <input type="checkbox" data-employee-org="${u.id}" ${selectedSet.has(u.id)?"checked":""}/>
      <span><strong>${safeText(u.name)}</strong><small>${safeText(u.type||"Custom")}${u.parentId&&orgUnitById(u.parentId)?` • inside ${safeText(orgUnitById(u.parentId).name)}`:""}</small></span>
    </label>`).join(""):'<div class="empty-state">No organization groups exist. This employee can remain ungrouped.</div>';
}
function selectedEmployeeOrgUnits(){return [...document.querySelectorAll("[data-employee-org]:checked")].map(x=>x.dataset.employeeOrg)}
function applyRoleTemplateToEmployee(roleId){
  const role=roleById(roleId);if(!role)return;
  const p=rolePermissions(role);
  $("employeeCanCreate").checked=p.canCreateRecords===true;
  $("employeeCanEdit").checked=p.canEditRecords===true;
  $("employeeCanDelete").checked=p.canDeleteRecords===true;
  $("employeeCanMonthly").checked=p.canViewMonthly===true;
  $("employeeCanExport").checked=p.canExportRecords===true;
  $("employeeCanAssign").checked=p.canAssignRecords!==false;
  if(isBusinessOwnerAccount()){
    $("employeeCanManageEmployees").checked=p.canManageEmployees===true;
    $("employeeCanManageOrganization").checked=p.canManageOrganization===true;
    $("employeeCanManageTools").checked=p.canManageTools===true;
    $("employeeCanManageSettings").checked=p.canManageSettings===true;
  }
  renderEmployeeToolAccess((p.allowedModules||[]).filter(id=>assignableTools().includes(id)));
}
$("employeeRoleTemplate").addEventListener("change",()=>{if($("employeeRoleTemplate").value)applyRoleTemplateToEmployee($("employeeRoleTemplate").value)});

function renderEmployeeToolAccess(selected=[]){
  const enabled=assignableTools();
  const selectedSet=new Set(selected);
  $("employeeToolAccessGrid").innerHTML=toolDefinitions.filter(t=>enabled.includes(t.id)).map(t=>`
    <label class="employee-tool-access">
      <input type="checkbox" data-employee-tool="${t.id}" ${selectedSet.has(t.id)?"checked":""}/>
      <span>${safeText(t.icon)} ${safeText(t.name)}</span>
    </label>`).join("")||'<div class="empty-state">Enable business tools before assigning employee access.</div>';
}
function selectedEmployeeTools(){
  return [...document.querySelectorAll("[data-employee-tool]:checked")].map(el=>el.dataset.employeeTool);
}
function openEmployeeModal(employee=null){
  if(!canManageEmployees())return;
  if(employee&&!canManageEmployeeTarget(employee)){alert("Only the business owner can edit management-level employee accounts.");return;}
  $("employeeForm").reset();
  $("employeeMessage").textContent="";
  $("employeeUid").value=employee?.id||"";
  $("employeeName").value=employee?.displayName||"";
  $("employeeJobTitle").value=employee?.jobTitle||"";
  $("employeeEmail").value=employee?.email||"";
  $("employeeEmail").disabled=!!employee;
  $("employeePassword").value="";
  $("employeePassword").required=!employee;
  $("employeePasswordLabel").classList.toggle("hidden",!!employee);
  $("employeeResetPasswordBtn").classList.toggle("hidden",!employee);
  $("employeeModalTitle").textContent=employee?"Edit Employee Access":"Add Employee";
  $("employeeModalHelper").textContent=employee
    ?"Change this employee's role template, optional group membership, individual permissions and tool access."
    :"Create a login. Roles and organization groups are optional, so this works for a flat startup or a larger structured business.";
  $("employeeSaveBtn").textContent=employee?"Save Employee Access":"Create Employee";

  const p=employee?.permissions||{};
  $("employeeCanCreate").checked=employee?p.canCreateRecords===true:true;
  $("employeeCanEdit").checked=employee?p.canEditRecords===true:true;
  $("employeeCanDelete").checked=employee?p.canDeleteRecords===true:false;
  $("employeeCanMonthly").checked=employee?p.canViewMonthly===true:true;
  $("employeeCanExport").checked=employee?p.canExportRecords===true:false;
  $("employeeCanAssign").checked=employee?p.canAssignRecords!==false:true;
  $("employeeCanManageEmployees").checked=employee?p.canManageEmployees===true:false;
  $("employeeCanManageOrganization").checked=employee?p.canManageOrganization===true:false;
  $("employeeCanManageTools").checked=employee?p.canManageTools===true:false;
  $("employeeCanManageSettings").checked=employee?p.canManageSettings===true:false;
  $("employeeAdminPermissions").classList.toggle("hidden",!isBusinessOwnerAccount());

  renderEmployeeRoleOptions(employee?.roleId||"");
  renderEmployeeOrgAccess(employee?.orgUnitIds||[]);
  renderEmployeeToolAccess(employee?employeeAllowedTools(employee):assignableTools());
  $("employeeModal").classList.remove("hidden");
}
async function sendEmployeePasswordReset(employee){
  if(!employee?.email)return;
  try{
    await sendPasswordResetEmail(auth,employee.email);
    alert(`Password reset email sent to ${employee.email}.`);
  }catch(error){
    console.error(error);
    alert(friendlyAuthError(error.code));
  }
}
$("employeeSearch").addEventListener("input",renderEmployeeAccounts);
$("addEmployeeBtn").addEventListener("click",()=>{if(canManageEmployees())openEmployeeModal()});
document.querySelectorAll("[data-close-employee]").forEach(btn=>btn.addEventListener("click",()=>$("employeeModal").classList.add("hidden")));
$("employeeModal").addEventListener("click",e=>{if(e.target===$("employeeModal"))$("employeeModal").classList.add("hidden")});
$("employeeSelectAllTools").addEventListener("click",()=>document.querySelectorAll("[data-employee-tool]").forEach(cb=>cb.checked=true));
$("employeeClearTools").addEventListener("click",()=>document.querySelectorAll("[data-employee-tool]").forEach(cb=>cb.checked=false));
$("employeeResetPasswordBtn").addEventListener("click",()=>{
  const employee=businessEmployees.find(e=>e.id===$("employeeUid").value);
  if(employee)sendEmployeePasswordReset(employee);
});
$("employeeForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!canManageEmployees())return;
  const id=$("employeeUid").value;
  const existing=businessEmployees.find(x=>x.id===id);
  if(existing&&!canManageEmployeeTarget(existing)){alert("Only the business owner can edit that account.");return;}
  const displayName=$("employeeName").value.trim();
  const jobTitle=$("employeeJobTitle").value.trim();
  const email=$("employeeEmail").value.trim().toLowerCase();
  const roleId=$("employeeRoleTemplate").value||"";
  const role=roleById(roleId);
  const owner=isBusinessOwnerAccount();
  const permissions={
    canCreateRecords:$("employeeCanCreate").checked,
    canEditRecords:$("employeeCanEdit").checked,
    canDeleteRecords:$("employeeCanDelete").checked,
    canViewMonthly:$("employeeCanMonthly").checked,
    canExportRecords:$("employeeCanExport").checked,
    canAssignRecords:$("employeeCanAssign").checked,
    canManageEmployees:owner?$("employeeCanManageEmployees").checked:false,
    canManageOrganization:owner?$("employeeCanManageOrganization").checked:false,
    canManageTools:owner?$("employeeCanManageTools").checked:false,
    canManageSettings:owner?$("employeeCanManageSettings").checked:false,
    allowedModules:selectedEmployeeTools().filter(moduleId=>assignableTools().includes(moduleId))
  };
  const orgUnitIds=selectedEmployeeOrgUnits().filter(id=>businessOrgUnits.some(u=>u.id===id));
  $("employeeMessage").className="form-message";
  $("employeeMessage").textContent=id?"Saving employee access...":"Creating employee login...";

  try{
    if(id){
      await updateDoc(doc(db,"users",id),{
        displayName,jobTitle,roleId,roleName:role?.name||"",orgUnitIds,permissions,
        updatedAt:serverTimestamp(),updatedBy:currentUser.uid
      });
    }else{
      const password=$("employeePassword").value;
      if(password.length<6){$("employeeMessage").textContent="Temporary password must be at least 6 characters.";return;}
      let credential=null;
      try{
        credential=await createUserWithEmailAndPassword(employeeCreatorAuth,email,password);
        await updateProfile(credential.user,{displayName});
        await setDoc(doc(db,"users",credential.user.uid),{
          displayName,email,jobTitle,roleId,roleName:role?.name||"",orgUnitIds,
          businessId:business.id,role:"employee",active:true,permissions,
          createdBy:currentUser.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:currentUser.uid
        });
      }catch(error){
        if(credential?.user)await deleteUser(credential.user).catch(()=>{});
        throw error;
      }finally{
        await signOut(employeeCreatorAuth).catch(()=>{});
      }
    }
    await loadBusinessEmployees();
    renderEmployeeAccounts();
    renderOrganization();
    renderRoles();
    $("employeeModal").classList.add("hidden");
  }catch(error){
    console.error(error);
    $("employeeMessage").textContent=friendlyAuthError(error.code)||"Could not save employee account.";
  }
});

async function loadTeamMessages(){
  if(!business||!currentUser){teamMessages=[];return;}
  try{const ref=collection(db,"businesses",business.id,"messages");const [a,b]=await Promise.all([getDocs(query(ref,where("recipientUserIds","array-contains",currentUser.uid))),getDocs(query(ref,where("senderUid","==",currentUser.uid)))]);const m=new Map();[...a.docs,...b.docs].forEach(d=>m.set(d.id,{id:d.id,...d.data()}));teamMessages=[...m.values()].sort((x,y)=>(collaborationTimestampDate(y.createdAt)?.getTime()||0)-(collaborationTimestampDate(x.createdAt)?.getTime()||0));}catch(e){console.error(e);teamMessages=[]}
}
async function loadCollaborationEvents(){if(!business){collaborationEvents=[];return;}try{const s=await getDocs(query(collection(db,"businesses",business.id,"collaborationEvents"),orderBy("createdAt","desc"),limit(100)));collaborationEvents=s.docs.map(d=>({id:d.id,...d.data()}));}catch(e){console.error(e);collaborationEvents=[]}}
async function logCollaborationEvent(type,recordId,moduleId,summary,targetUserIds=[],targetOrgUnitIds=[]){try{await addDoc(collection(db,"businesses",business.id,"collaborationEvents"),{type,recordId:recordId||"",module:moduleId||"",summary:summary||"",actorUid:currentUser.uid,actorName:currentActorName(),targetUserIds,targetOrgUnitIds,createdAt:serverTimestamp()})}catch(e){console.warn(e)}}
function teamTargetOptions(selected=""){const p=businessMembers.filter(m=>m.id!==currentUser.uid).map(m=>`<option value="user:${m.id}" ${selected===`user:${m.id}`?"selected":""}>Person — ${safeText(m.displayName||m.email||"Team Member")}${m.role==="owner"?" (Owner)":""}</option>`).join("");const g=businessOrgUnits.map(x=>`<option value="group:${x.id}" ${selected===`group:${x.id}`?"selected":""}>Group — ${safeText(x.name)}</option>`).join("");return `<option value="">Choose a person or group…</option>${p}${g}`}
function recipientsForTarget(target){if(!target)return[];const [k,id]=target.split(":");if(k==="user")return[id];return businessMembers.filter(m=>m.role==="employee"&&Array.isArray(m.orgUnitIds)&&m.orgUnitIds.includes(id)&&m.id!==currentUser.uid).map(m=>m.id)}
function selectedTargetLabel(target){const[k,id]=target.split(":");return k==="user"?memberDisplayName(id):groupDisplayName(id)}
function teamMessageIsUnread(m){return (m.recipientUserIds||[]).includes(currentUser.uid)&&!(m.readBy||[]).includes(currentUser.uid)}
function teamWorkDirect(){return records.filter(r=>!completedStatus(r)&&isRecordAssignedDirectly(r))}
function teamWorkGroups(){return records.filter(r=>!completedStatus(r)&&!isRecordAssignedDirectly(r)&&isRecordAssignedToMyGroups(r))}
function updateTeamHubBadge(){const n=teamMessages.filter(teamMessageIsUnread).length+teamWorkDirect().length+teamWorkGroups().length;$("teamHubBadge").textContent=n>99?"99+":String(n);$("teamHubBadge").classList.toggle("hidden",n===0)}
function teamWorkItemHtml(r){const t=toolById(r.module),h=recordDueHealth(r);return `<article class="team-work-item"><div class="team-work-item-top"><div><span class="eyebrow">${safeText(t.name.toUpperCase())}</span><h4>${safeText(r.title||"Untitled")}</h4></div><span class="record-health ${h.key}">${safeText(h.label)}</span></div><p>${safeText(r.details||t.desc)}</p><div class="team-work-assignees">${recordAssignmentLabels(r).map(a=>`<span class="collab-chip ${a.type}">${safeText(a.label)}</span>`).join("")}</div><div class="record-actions" style="margin-top:9px"><button class="mini-btn" data-view-record="${r.id}">Open Work</button>${quickActionButton(r)}</div></article>`}
function renderTeamHub(){if(!business)return;const d=teamWorkDirect(),g=teamWorkGroups(),u=teamMessages.filter(teamMessageIsUnread).length;$("teamStatAssigned").textContent=d.length;$("teamStatGroup").textContent=g.length;$("teamStatUnread").textContent=u;$("teamStatActivity").textContent=collaborationEvents.length;$("teamDirectCount").textContent=d.length;$("teamGroupCount").textContent=g.length;$("teamDirectWork").innerHTML=d.length?d.map(teamWorkItemHtml).join(""):'<div class="empty-state">Nothing is assigned directly to you.</div>';$("teamGroupWork").innerHTML=g.length?g.map(teamWorkItemHtml).join(""):'<div class="empty-state">No open work is assigned to your groups.</div>';renderTeamMessages();renderTeamActivity();updateTeamHubBadge();bindRecordActions()}
function switchTeamHubTab(n){teamHubTab=n;document.querySelectorAll("[data-team-hub-tab]").forEach(b=>b.classList.toggle("active",b.dataset.teamHubTab===n));$("teamHubWorkPanel").classList.toggle("hidden",n!=="work");$("teamHubMessagesPanel").classList.toggle("hidden",n!=="messages");$("teamHubActivityPanel").classList.toggle("hidden",n!=="activity")}
function renderTeamMessages(){if(!$("teamMessageList"))return;const q=$("teamMessageSearch").value.trim().toLowerCase();let rows=teamMessages.filter(m=>teamMessageBox==="sent"?m.senderUid===currentUser.uid:(m.recipientUserIds||[]).includes(currentUser.uid));rows=rows.filter(m=>!q||`${m.subject||""} ${m.body||""} ${m.senderName||""} ${(m.recipientNames||[]).join(" ")}`.toLowerCase().includes(q));$("teamMessageResultCount").textContent=`${rows.length} message${rows.length===1?"":"s"}`;$("teamMessageList").innerHTML=rows.length?rows.map(m=>{const unread=teamMessageIsUnread(m),direction=m.senderUid===currentUser.uid?`To ${(m.recipientNames||[]).join(", ")||"Team"}`:`From ${m.senderName||"Team Member"}`;return `<article class="team-message-card ${unread?"unread":""}"><div><div class="team-message-meta">${safeText(direction)} • ${safeText(collaborationDateLabel(m.createdAt))}</div><h4>${safeText(m.subject||"No subject")}</h4><p>${safeText(m.body||"")}</p>${m.relatedRecordTitle?`<span class="collab-chip">Related: ${safeText(m.relatedRecordTitle)}</span>`:""}</div><div class="team-message-actions">${unread?`<button class="mini-btn" data-mark-message-read="${m.id}">Mark Read</button>`:""}${m.relatedRecordId?`<button class="mini-btn" data-message-record="${m.relatedRecordId}">Open Work</button>`:""}</div></article>`}).join(""):'<div class="empty-state">No messages here yet.</div>';document.querySelectorAll("[data-mark-message-read]").forEach(b=>b.onclick=()=>markTeamMessageRead(b.dataset.markMessageRead));document.querySelectorAll("[data-message-record]").forEach(b=>b.onclick=()=>{const r=records.find(x=>x.id===b.dataset.messageRecord);if(r)openRecordDetail(r);else alert("That record is outside your current tool access.")})}
async function markTeamMessageRead(id){const m=teamMessages.find(x=>x.id===id);if(!m)return;const readBy=[...new Set([...(m.readBy||[]),currentUser.uid])];await updateDoc(doc(db,"businesses",business.id,"messages",id),{readBy,updatedAt:serverTimestamp()});m.readBy=readBy;renderTeamHub()}
function collaborationEventIcon(t){return({record_created:"＋",record_updated:"✎",handoff:"→",comment:"☵",message:"✉"})[t]||"•"}
function renderTeamActivity(){$("teamActivityList").innerHTML=collaborationEvents.length?collaborationEvents.map(e=>`<div class="team-activity-row"><span class="team-activity-icon">${safeText(collaborationEventIcon(e.type))}</span><div><strong>${safeText(e.actorName||"Team Member")}</strong><span>${safeText(e.summary||"Team activity")}</span></div><span>${safeText(collaborationDateLabel(e.createdAt))}</span></div>`).join(""):'<div class="empty-state">No collaboration activity yet.</div>'}
function openTeamMessageModal(record=null,target=""){$("teamMessageForm").reset();$("teamMessageFormMessage").textContent="";$("teamMessageTarget").innerHTML=teamTargetOptions(target);$("teamMessageRecord").innerHTML=`<option value="">No related record</option>${records.map(r=>`<option value="${r.id}">${safeText(toolById(r.module).name)} — ${safeText(r.title||"Untitled")}</option>`).join("")}`;if(record){$("teamMessageRecord").value=record.id;$("teamMessageSubject").value=`${toolById(record.module).name}: ${record.title||"Work Item"}`}$("teamMessageModal").classList.remove("hidden")}
async function sendTeamMessage(){const target=$("teamMessageTarget").value,recipientUserIds=recipientsForTarget(target);if(!target||!recipientUserIds.length){$("teamMessageFormMessage").textContent="Choose a person or a group with members.";return;}const related=records.find(r=>r.id===$("teamMessageRecord").value);const payload={senderUid:currentUser.uid,senderName:currentActorName(),recipientUserIds,recipientNames:recipientUserIds.map(memberDisplayName),targetLabel:selectedTargetLabel(target),subject:$("teamMessageSubject").value.trim(),body:$("teamMessageBody").value.trim(),relatedRecordId:related?.id||"",relatedRecordTitle:related?.title||"",relatedModule:related?.module||"",readBy:[],createdAt:serverTimestamp(),updatedAt:serverTimestamp()};await addDoc(collection(db,"businesses",business.id,"messages"),payload);await logCollaborationEvent("message",related?.id||"",related?.module||"",`sent a message to ${payload.targetLabel}: ${payload.subject}`,recipientUserIds,[]);await Promise.all([loadTeamMessages(),loadCollaborationEvents()]);renderTeamHub();$("teamMessageModal").classList.add("hidden")}
document.querySelectorAll("[data-team-hub-tab]").forEach(b=>b.addEventListener("click",()=>switchTeamHubTab(b.dataset.teamHubTab)));document.querySelectorAll("[data-message-box]").forEach(b=>b.addEventListener("click",()=>{teamMessageBox=b.dataset.messageBox;document.querySelectorAll("[data-message-box]").forEach(x=>x.classList.toggle("active",x===b));renderTeamMessages()}));$("teamMessageSearch").addEventListener("input",renderTeamMessages);$("teamHubMessageBtn").addEventListener("click",()=>openTeamMessageModal());$("teamActivityRefreshBtn").addEventListener("click",async()=>{await Promise.all([loadCollaborationEvents(),loadTeamMessages()]);renderTeamHub()});document.querySelectorAll("[data-close-team-message]").forEach(b=>b.addEventListener("click",()=>$("teamMessageModal").classList.add("hidden")));$("teamMessageModal").addEventListener("click",e=>{if(e.target===$("teamMessageModal"))$("teamMessageModal").classList.add("hidden")});$("teamMessageForm").addEventListener("submit",async e=>{e.preventDefault();$("teamMessageFormMessage").textContent="Sending...";try{await sendTeamMessage()}catch(err){console.error(err);$("teamMessageFormMessage").textContent="Could not send message. Check Firestore rules."}});
function renderRecordCollaborationInputs(record=null){const u=new Set(recordAssignedUserIds(record)),g=new Set(recordAssignedGroupIds(record));$("recordAssigneeUsers").innerHTML=businessMembers.map(m=>`<label class="record-assignee-option"><input type="checkbox" data-record-assignee-user="${m.id}" ${u.has(m.id)?"checked":""}/><span><strong>${safeText(m.displayName||m.email||"Team Member")}${m.id===currentUser.uid?" (You)":""}</strong><span>${safeText(m.role==="owner"?"Business Owner":m.roleName||m.jobTitle||"Employee")}</span></span></label>`).join("");$("recordAssigneeGroups").innerHTML=businessOrgUnits.length?businessOrgUnits.map(x=>`<label class="record-assignee-option"><input type="checkbox" data-record-assignee-group="${x.id}" ${g.has(x.id)?"checked":""}/><span><strong>${safeText(x.name)}</strong><span>${safeText(x.type||"Custom Group")}</span></span></label>`).join(""):'<div class="empty-state">No groups created.</div>';const disabled=!canAssignRecords();document.querySelectorAll("[data-record-assignee-user],[data-record-assignee-group]").forEach(x=>x.disabled=disabled);$("recordAssignMeBtn").disabled=disabled;$("recordClearAssignmentsBtn").disabled=disabled}
function selectedRecordCollaboration(){return{assignedUserIds:[...document.querySelectorAll("[data-record-assignee-user]:checked")].map(x=>x.dataset.recordAssigneeUser),assignedOrgUnitIds:[...document.querySelectorAll("[data-record-assignee-group]:checked")].map(x=>x.dataset.recordAssigneeGroup)}}
$("recordAssignMeBtn").addEventListener("click",()=>{if(canAssignRecords()){const b=document.querySelector(`[data-record-assignee-user="${currentUser.uid}"]`);if(b)b.checked=true}});$("recordClearAssignmentsBtn").addEventListener("click",()=>{if(canAssignRecords())document.querySelectorAll("[data-record-assignee-user],[data-record-assignee-group]").forEach(x=>x.checked=false)});
async function loadRecordComments(id){try{const s=await getDocs(query(collection(db,"businesses",business.id,"records",id,"comments"),orderBy("createdAt","asc")));return s.docs.map(d=>({id:d.id,...d.data()}))}catch(e){console.error(e);return[]}}
function renderRecordAssignmentSummary(r){const labels=recordAssignmentLabels(r);$("recordAssignmentSummary").innerHTML=labels.length?labels.map(a=>`<span class="collab-chip ${a.type}">${safeText(a.label)}</span>`).join(""):'<span class="collab-chip">Unassigned</span>';$("recordCollaborationSummary").textContent=labels.length?`${labels.length} assignment${labels.length===1?"":"s"}`:"Open collaboration";$("recordHandoffTarget").innerHTML=teamTargetOptions();$("recordHandoffBar").classList.toggle("hidden",!canAssignRecords())}
async function renderRecordConversation(id){const c=await loadRecordComments(id);$("recordConversationList").innerHTML=c.length?c.map(x=>`<article class="record-comment"><div class="record-comment-head"><strong>${safeText(x.authorName||"Team Member")}</strong><span>${safeText(collaborationDateLabel(x.createdAt))}</span></div><p>${safeText(x.message||"")}</p></article>`).join(""):'<div class="empty-state">No comments yet. Start the conversation.</div>'}
async function handoffRecord(r){const target=$("recordHandoffTarget").value;if(!r||!canAssignRecords()||!target)return;const[k,id]=target.split(":"),assignedUserIds=k==="user"?[id]:[],assignedOrgUnitIds=k==="group"?[id]:[],label=selectedTargetLabel(target);await updateDoc(doc(db,"businesses",business.id,"records",r.id),{assignedUserIds,assignedOrgUnitIds,lastHandoffFromUid:currentUser.uid,lastHandoffFromName:currentActorName(),lastHandoffTo:label,handoffAt:serverTimestamp(),collaborationUpdatedAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:currentUser.uid});await logCollaborationEvent("handoff",r.id,r.module,`handed off "${r.title}" to ${label}`,assignedUserIds,assignedOrgUnitIds);await Promise.all([loadRecords(),loadCollaborationEvents()]);const updated=records.find(x=>x.id===r.id);renderEverything();if(updated){renderRecordAssignmentSummary(updated);await renderRecordConversation(updated.id)}}
$("recordHandoffBtn").addEventListener("click",async()=>{const r=records.find(x=>x.id===activeRecordCollaborationId);try{await handoffRecord(r)}catch(e){console.error(e);alert("Could not hand off this work. Check permissions and rules.")}});$("recordCommentForm").addEventListener("submit",async e=>{e.preventDefault();const r=records.find(x=>x.id===activeRecordCollaborationId),message=$("recordCommentText").value.trim();if(!r||!message)return;try{await addDoc(collection(db,"businesses",business.id,"records",r.id,"comments"),{authorUid:currentUser.uid,authorName:currentActorName(),message,createdAt:serverTimestamp()});await logCollaborationEvent("comment",r.id,r.module,`commented on "${r.title}"`,recordAssignedUserIds(r),recordAssignedGroupIds(r));$("recordCommentText").value="";await Promise.all([renderRecordConversation(r.id),loadCollaborationEvents()]);renderTeamHub()}catch(err){console.error(err);$("recordCommentMessage").textContent="Could not send comment. Check Firestore rules."}});

async function loadRecords(){
  const ref=collection(db,"businesses",userProfile.businessId,"records");
  if(isBusinessOwnerAccount()){
    const snap=await getDocs(query(ref,orderBy("createdAt","desc")));
    records=snap.docs.map(d=>({id:d.id,...d.data()}));
    return;
  }
  const modules=accessibleModules();
  if(!modules.length){records=[];return;}
  const snapshots=await Promise.all(modules.map(moduleId=>getDocs(query(ref,where("module","==",moduleId)))));
  records=snapshots.flatMap(snap=>snap.docs.map(d=>({id:d.id,...d.data()}))).sort((a,b)=>{
    const ad=recordDateForMonthly(a)?.getTime()||0;
    const bd=recordDateForMonthly(b)?.getTime()||0;
    return bd-ad;
  });
}

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

function enabledModules(){return accessibleModules()}

let activeToolWorkspaceId=null;
function recordsForTool(id){return records.filter(r=>r.module===id)}
function valueOf(record,key,fallback="—"){const v=record?.fields?.[key];return v===undefined||v===null||v===""?fallback:v}
function shortDate(value){
  if(!value)return "—";
  const d=new Date(value.includes("T")?value:`${value}T12:00:00`);
  return Number.isNaN(d.getTime())?value:d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}
function daysUntil(dateString){
  if(!dateString)return null;
  const today=new Date();today.setHours(0,0,0,0);
  const d=new Date(`${dateString}T12:00:00`);d.setHours(0,0,0,0);
  return Number.isNaN(d.getTime())?null:Math.ceil((d-today)/86400000);
}
function workspaceActionHtml(r){return `<div class="record-actions">${quickActionButton(r)}<button class="mini-btn" data-view-record="${r.id}">View</button>${canEditRecords()?`<button class="mini-btn" data-edit-record="${r.id}">Edit</button>`:""}</div>`}
function workspaceStat(label,value){return `<div class="tool-workspace-stat"><span>${safeText(label)}</span><strong>${safeText(value)}</strong></div>`}
function renderToolWorkspace(id){
  if(!id||!canAccessModule(id)){switchView("dashboard");return;}
  activeToolWorkspaceId=id;
  const t=toolById(id),cfg=toolExperience(id),items=recordsForTool(id);
  $("toolWorkspaceIcon").textContent=t.icon;
  $("toolWorkspaceCategory").textContent=t.category.toUpperCase();
  $("toolWorkspaceTitle").textContent=t.name;
  $("toolWorkspaceDescription").textContent=t.desc;
  $("toolWorkspaceAddBtn").textContent=cfg.addLabel;
  $("toolWorkspaceAddBtn").classList.toggle("hidden",!canCreateRecords());

  const complete=items.filter(completedStatus).length;
  const overdue=items.filter(r=>recordDueHealth(r).key==="overdue").length;
  const dueSoon=items.filter(r=>recordDueHealth(r).key==="soon").length;
  $("toolWorkspaceStats").innerHTML=[
    workspaceStat("Total",items.length),
    workspaceStat("Active",items.length-complete),
    workspaceStat("Due / Attention",overdue+dueSoon),
    workspaceStat("Completed",complete)
  ].join("");

  $("toolWorkspaceContent").innerHTML=renderToolWorkspaceContent(id,items,cfg);
  bindRecordActions();
}
function renderToolWorkspaceContent(id,items,cfg){
  if(!items.length)return `<div class="tool-empty">No ${safeText(toolById(id).name.toLowerCase())} records yet. Use <strong>${safeText(cfg.addLabel)}</strong> to start.</div>`;
  switch(cfg.mode){
    case "taskBoard": return renderTaskBoard(items);
    case "checklistLibrary": return renderChecklistLibrary(items);
    case "assetInventory": return renderAssetInventory(items);
    case "serviceTimeline": return renderServiceTimeline(items);
    case "renewalRadar": return renderRenewalRadar(items);
    case "incidentCases": return renderIncidentCases(items);
    case "handoffFeed": return renderHandoffFeed(items);
    case "checkoutDesk": return renderCheckoutDesk(items);
    case "logbookTimeline": return renderLogbookTimeline(items);
    case "employeeDirectory": return renderEmployeeDirectory(items);
    case "fleetDashboard": return renderFleetDashboard(items);
    case "proofGallery": return renderProofGallery(items);
    case "vendorDirectory": return renderVendorDirectory(items);
    case "subscriptionLedger": return renderSubscriptionLedger(items);
    case "documentRegister": return renderDocumentRegister(items);
    case "trainingMatrix": return renderTrainingMatrix(items);
    case "websiteStatus": return renderWebsiteStatus(items);
    case "qrLabels": return renderQrLabels(items);
    case "supplyInventory": return renderSupplyInventory(items);
    case "warrantyCoverage": return renderWarrantyCoverage(items);
    case "complaintPipeline": return renderComplaintPipeline(items);
    case "ideaBoard": return renderIdeaBoard(items);
    case "receptionDesk": return renderReceptionDesk(items);
    case "packageQueue": return renderPackageQueue(items);
    default: return `<div class="record-list">${items.map(recordHtml).join("")}</div>`;
  }
}
function renderTaskBoard(items){
  const groups=[
    ["Open",items.filter(r=>["open","ready"].includes(String(r.status||"").toLowerCase()))],
    ["In Progress",items.filter(r=>["in progress","acknowledged"].includes(String(r.status||"").toLowerCase()))],
    ["Complete",items.filter(completedStatus)]
  ];
  const known=new Set(groups.flatMap(g=>g[1].map(r=>r.id)));
  groups[0][1].push(...items.filter(r=>!known.has(r.id)));
  return `<div class="task-board">${groups.map(([label,rows])=>`<section class="task-column">
    <div class="task-column-head"><strong>${label}</strong><span>${rows.length}</span></div>
    <div class="task-column-body">${rows.length?rows.map(r=>`<article class="task-work-card">
      <h4>${safeText(r.title||"Untitled Task")}</h4>
      <div class="task-card-meta"><span class="task-priority ${String(valueOf(r,"priority","")).toLowerCase()}">${safeText(valueOf(r,"priority","Normal"))}</span>${valueOf(r,"assignedTo","")?`<span class="tag">${safeText(valueOf(r,"assignedTo",""))}</span>`:""}${r.dueDate?`<span class="tag">${safeText(shortDate(r.dueDate))}</span>`:""}</div>
      ${workspaceActionHtml(r)}
    </article>`).join(""):'<div class="tool-empty">Nothing here.</div>'}</div>
  </section>`).join("")}</div>`;
}
function renderChecklistLibrary(items){
  return `<div class="checklist-library">${items.map(r=>{
    const list=String(valueOf(r,"items","")).split("\n").map(x=>x.trim()).filter(Boolean);
    const checked=new Set(parseCheckedItems(r)),pct=list.length?Math.round(checked.size/list.length*100):0;
    return `<article class="checklist-library-card"><div class="record-meta"><span class="tag">${safeText(valueOf(r,"frequency","As Needed"))}</span><span class="tag">${pct}% complete</span></div>
      <h4>${safeText(r.title)}</h4>
      <div class="checklist-preview-items">${list.slice(0,4).map((x,i)=>`<span><i>${checked.has(i)?"✓":"○"}</i>${safeText(x)}</span>`).join("")}${list.length>4?`<span>+ ${list.length-4} more steps</span>`:""}</div>
      <div class="mini-progress-track"><div class="mini-progress-fill" style="width:${pct}%"></div></div>
      <div class="record-actions" style="margin-top:10px">${quickActionButton(r)}<button class="mini-btn" data-view-record="${r.id}">View</button>${canEditRecords()?`<button class="mini-btn" data-edit-record="${r.id}">Edit Builder</button>`:""}</div>
    </article>`;
  }).join("")}</div>`;
}
function renderAssetInventory(items){
  return `<div class="asset-inventory-grid">${items.map(r=>`<article class="asset-card">
    <div class="asset-card-head"><div><small>${safeText(valueOf(r,"assetNumber","NO ASSET #"))}</small><h4>${safeText(r.title)}</h4></div><span class="owner-status ${ownerStatusClass(r.status||"")}">${safeText(r.status||"")}</span></div>
    <div class="asset-data-grid"><div><span>Condition</span><strong>${safeText(valueOf(r,"condition"))}</strong></div><div><span>Assigned To</span><strong>${safeText(valueOf(r,"assignedTo","Unassigned"))}</strong></div><div><span>Location</span><strong>${safeText(valueOf(r,"location"))}</strong></div><div><span>Serial</span><strong>${safeText(valueOf(r,"serialNumber"))}</strong></div></div>
    ${workspaceActionHtml(r)}
  </article>`).join("")}</div>`;
}
function renderServiceTimeline(items){
  const sorted=items.slice().sort((a,b)=>String(valueOf(b,"lastService","")).localeCompare(String(valueOf(a,"lastService",""))));
  return `<div class="service-timeline">${sorted.map(r=>`<article class="service-entry">
    <div class="service-date">${safeText(shortDate(valueOf(r,"lastService",r.dueDate||"")))}</div>
    <div><h4>${safeText(r.title)}</h4><p>${safeText(valueOf(r,"asset","Unlinked asset"))} • ${safeText(valueOf(r,"serviceType","Service"))}</p><div class="record-meta">${valueOf(r,"cost","")?`<span class="tag">$${safeText(valueOf(r,"cost"))}</span>`:""}${valueOf(r,"provider","")?`<span class="tag">${safeText(valueOf(r,"provider"))}</span>`:""}${r.dueDate?`<span class="tag">Next ${safeText(shortDate(r.dueDate))}</span>`:""}</div></div>
    ${workspaceActionHtml(r)}
  </article>`).join("")}</div>`;
}
function renderRenewalRadar(items){
  const sorted=items.slice().sort((a,b)=>(daysUntil(a.dueDate)??99999)-(daysUntil(b.dueDate)??99999));
  return `<div class="renewal-radar">${sorted.map(r=>{
    const d=daysUntil(r.dueDate),pct=d===null?100:Math.max(2,Math.min(100,d/365*100)),cls=d!==null&&d<0?"danger":d!==null&&d<=30?"warn":"";
    const label=d===null?"No expiration":d<0?`${Math.abs(d)} days expired`:d===0?"Expires today":`${d} days remaining`;
    return `<div class="renewal-row"><div><strong>${safeText(r.title)}</strong><span>${safeText(valueOf(r,"renewalType","Renewal"))} • ${safeText(valueOf(r,"provider","No provider"))}</span></div><div><div class="expiry-days ${cls}">${safeText(label)}</div><div class="expiry-meter"><span style="width:${pct}%"></span></div></div>${workspaceActionHtml(r)}</div>`;
  }).join("")}</div>`;
}
function renderIncidentCases(items){
  return `<div class="incident-case-list">${items.map(r=>`<article class="case-card">
    <span class="case-severity ${String(valueOf(r,"incidentType","")).toLowerCase().replaceAll(" ","-")}"></span>
    <div><div class="record-meta"><span class="tag">${safeText(valueOf(r,"incidentType","Incident"))}</span><span class="tag">${safeText(r.status||"Open")}</span></div><h4>${safeText(r.title)}</h4><p>${safeText(valueOf(r,"location","No location"))} • ${safeText(valueOf(r,"incidentDateTime","No date"))}</p><small>${safeText(valueOf(r,"peopleInvolved","No people listed"))}</small></div>
    ${workspaceActionHtml(r)}
  </article>`).join("")}</div>`;
}
function renderHandoffFeed(items){
  return `<div class="handoff-feed">${items.map(r=>`<article class="handoff-message">
    <div class="handoff-route"><strong>${safeText(valueOf(r,"fromShift","Unspecified"))}</strong><span>→</span><strong>${safeText(valueOf(r,"toShift","Unspecified"))}</strong><span class="tag">${safeText(valueOf(r,"priority","Normal"))}</span></div>
    <h4>${safeText(r.title)}</h4><p>${safeText(valueOf(r,"handoffNotes",r.details||"No handoff details"))}</p>${workspaceActionHtml(r)}
  </article>`).join("")}</div>`;
}
function renderCheckoutDesk(items){
  const active=items.filter(r=>String(r.status||"").toLowerCase()!=="returned"),returned=items.filter(r=>String(r.status||"").toLowerCase()==="returned");
  const list=(rows,empty)=>rows.length?rows.map(r=>`<div class="checkout-item"><div><h4>${safeText(r.title)}</h4><span>${safeText(valueOf(r,"checkedOutTo","Unassigned"))} • Due ${safeText(shortDate(r.dueDate||""))}</span></div>${workspaceActionHtml(r)}</div>`).join(""):`<div class="tool-empty">${empty}</div>`;
  return `<div class="checkout-desk"><section class="checkout-active"><div class="panel-heading"><div><small>OUT NOW</small><h3>Currently Checked Out</h3></div></div>${list(active,"No assets currently checked out.")}</section><section class="checkout-returned"><div class="panel-heading"><div><small>RETURNED</small><h3>Recent Returns</h3></div></div>${list(returned.slice(0,8),"No returned assets yet.")}</section></div>`;
}
function renderLogbookTimeline(items){
  const sorted=items.slice().sort((a,b)=>String(valueOf(b,"logDate","")).localeCompare(String(valueOf(a,"logDate",""))));
  return `<div class="logbook-timeline">${sorted.map(r=>`<article class="logbook-entry"><div class="logbook-date">${safeText(shortDate(valueOf(r,"logDate","")))}</div><div><h4>${safeText(r.title)}</h4><p>${safeText(r.details||valueOf(r,"nextAction",""))}</p><div class="record-meta"><span class="tag">${safeText(valueOf(r,"shift","Any shift"))}</span><span class="tag">${safeText(valueOf(r,"issueFlag","Routine"))}</span></div></div>${workspaceActionHtml(r)}</article>`).join("")}</div>`;
}
function renderEmployeeDirectory(items){
  return `<div class="employee-directory-grid">${items.map(r=>{
    const initials=(r.title||"?").split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase();
    return `<article class="directory-card"><div class="directory-card-head"><span class="directory-avatar">${safeText(initials)}</span><div><h4>${safeText(r.title)}</h4><span>${safeText(valueOf(r,"role","Employee"))}${valueOf(r,"department","")?` • ${safeText(valueOf(r,"department"))}`:""}</span></div></div><div class="directory-contact">${valueOf(r,"email","")?`<span>✉ ${safeText(valueOf(r,"email"))}</span>`:""}${valueOf(r,"phone","")?`<span>☎ ${safeText(valueOf(r,"phone"))}</span>`:""}<span>Started ${safeText(shortDate(valueOf(r,"startDate","")))}</span></div>${workspaceActionHtml(r)}</article>`;
  }).join("")}</div>`;
}
function renderFleetDashboard(items){
  return `<div class="fleet-grid">${items.map(r=>`<article class="fleet-card"><div class="fleet-card-head"><div><small>${safeText(valueOf(r,"plate","NO PLATE"))}</small><h4>${safeText(r.title)}</h4><span>${safeText(valueOf(r,"year",""))} ${safeText(valueOf(r,"makeModel",""))}</span></div><span class="owner-status ${ownerStatusClass(r.status||"")}">${safeText(r.status||"")}</span></div><div class="fleet-data-grid"><div><span>Mileage</span><strong>${safeText(valueOf(r,"mileage","—"))}</strong></div><div><span>Condition</span><strong>${safeText(valueOf(r,"condition"))}</strong></div><div><span>Driver</span><strong>${safeText(valueOf(r,"assignedTo","Unassigned"))}</strong></div><div><span>Next Service</span><strong>${safeText(shortDate(r.dueDate||""))}</strong></div></div>${workspaceActionHtml(r)}</article>`).join("")}</div>`;
}
function renderProofGallery(items){
  return `<div class="proof-gallery">${items.map(r=>{
    const url=valueOf(r,"photoUrl","");
    return `<article class="proof-card"><div class="proof-visual">${url&&/^https?:\/\//i.test(url)?`<img src="${safeText(url)}" alt="${safeText(r.title)}" onerror="this.parentElement.innerHTML='▣'"/>`:"▣"}</div><div class="proof-body"><span class="tag">${safeText(valueOf(r,"proofType","Proof"))}</span><h4>${safeText(r.title)}</h4><p>${safeText(valueOf(r,"customerName",valueOf(r,"jobReference","No job reference")))}</p>${workspaceActionHtml(r)}</div></article>`;
  }).join("")}</div>`;
}
function renderVendorDirectory(items){
  return `<div class="vendor-directory-grid">${items.map(r=>`<article class="directory-card"><div class="directory-card-head"><span class="directory-avatar">${safeText((r.title||"V")[0].toUpperCase())}</span><div><h4>${safeText(r.title)}</h4><span>${safeText(valueOf(r,"service","Vendor"))}</span></div></div><div class="directory-contact"><span>${safeText(valueOf(r,"contactName","No contact"))}</span>${valueOf(r,"phone","")?`<span>☎ ${safeText(valueOf(r,"phone"))}</span>`:""}${valueOf(r,"email","")?`<span>✉ ${safeText(valueOf(r,"email"))}</span>`:""}${valueOf(r,"paymentTerms","")?`<span>Terms: ${safeText(valueOf(r,"paymentTerms"))}</span>`:""}</div>${workspaceActionHtml(r)}</article>`).join("")}</div>`;
}
function renderSubscriptionLedger(items){
  const monthly=items.reduce((sum,r)=>{
    const cost=Number(valueOf(r,"cost",0))||0,cycle=String(valueOf(r,"billingCycle","Monthly")).toLowerCase();
    return sum+(cycle==="annual"?cost/12:cycle==="quarterly"?cost/3:cycle==="semiannual"?cost/6:cost);
  },0);
  return `<div class="panel" style="margin-bottom:12px"><div class="panel-heading"><div><small>ESTIMATED RECURRING COST</small><h3>$${monthly.toFixed(2)} / month</h3></div><strong>$${(monthly*12).toFixed(2)} / year</strong></div></div><div class="subscription-ledger">${items.map(r=>`<div class="subscription-row"><div><strong>${safeText(r.title)}</strong><span>${safeText(valueOf(r,"provider",""))}</span></div><div><span class="money-amount">$${safeText(valueOf(r,"cost","0.00"))}</span><span class="billing-cycle">${safeText(valueOf(r,"billingCycle","Monthly"))}</span></div><div><small>Next / renewal</small><strong>${safeText(shortDate(r.dueDate||""))}</strong></div>${workspaceActionHtml(r)}</div>`).join("")}</div>`;
}
function renderDocumentRegister(items){
  return `<div class="document-register">${items.map(r=>`<div class="document-row"><div><strong>${safeText(r.title)}</strong><small>${safeText(valueOf(r,"documentType","Document"))}</small></div><div><small>Reference</small>${safeText(valueOf(r,"referenceNumber"))}</div><div><small>Responsible</small>${safeText(valueOf(r,"responsiblePerson"))}</div><div><small>Expires / Review</small>${safeText(shortDate(r.dueDate||""))}</div>${workspaceActionHtml(r)}</div>`).join("")}</div>`;
}
function renderTrainingMatrix(items){
  return `<div class="training-matrix"><table class="training-table"><thead><tr><th>Employee</th><th>Training</th><th>Status</th><th>Provider</th><th>Completed</th><th>Renewal</th><th>Action</th></tr></thead><tbody>${items.map(r=>`<tr><td>${safeText(valueOf(r,"employee","Unassigned"))}</td><td><strong>${safeText(r.title)}</strong></td><td>${safeText(r.status||"")}</td><td>${safeText(valueOf(r,"provider"))}</td><td>${safeText(shortDate(valueOf(r,"completionDate","")))}</td><td>${safeText(shortDate(r.dueDate||""))}</td><td>${workspaceActionHtml(r)}</td></tr>`).join("")}</tbody></table></div>`;
}
function renderWebsiteStatus(items){
  return `<div class="website-status-grid">${items.map(r=>{
    const s=String(valueOf(r,"observedStatus",r.status||"Working")).toLowerCase(),dot=s.includes("down")?"down":s.includes("slow")||s.includes("intermittent")||s.includes("degraded")?"degraded":"";
    return `<article class="website-status-card"><div class="website-status-line"><div><span class="status-dot ${dot}"></span><strong>${safeText(r.title)}</strong></div><span class="owner-status ${ownerStatusClass(r.status||"")}">${safeText(valueOf(r,"observedStatus",r.status||"Unknown"))}</span></div><p>${safeText(valueOf(r,"url","No URL"))}</p><div class="asset-data-grid"><div><span>Check Type</span><strong>${safeText(valueOf(r,"checkType","Uptime"))}</strong></div><div><span>Last Checked</span><strong>${safeText(valueOf(r,"checkedAt","—"))}</strong></div></div>${workspaceActionHtml(r)}</article>`;
  }).join("")}</div>`;
}
function renderQrLabels(items){
  return `<div class="qr-label-grid">${items.map(r=>`<article class="qr-label-card"><div class="qr-placeholder">QR</div><div><small>${safeText(valueOf(r,"assetId","NO ID"))}</small><h4>${safeText(r.title)}</h4><p>${safeText(valueOf(r,"location","No location"))}</p><div class="record-actions">${quickActionButton(r)}<button class="mini-btn" data-view-record="${r.id}">Details</button></div></div></article>`).join("")}</div>`;
}
function renderSupplyInventory(items){
  return `<div class="supply-inventory">${items.map(r=>{
    const qty=Number(valueOf(r,"quantity",0))||0,re=Number(valueOf(r,"reorderLevel",0))||0,max=Math.max(qty,re*2,1),pct=Math.max(0,Math.min(100,qty/max*100)),cls=qty<=0?"out":qty<=re?"low":"";
    return `<div class="supply-row"><div><strong>${safeText(r.title)}</strong><span>${safeText(valueOf(r,"location","No location"))} • ${safeText(valueOf(r,"supplier","No supplier"))}</span></div><div><div><strong>${qty} ${safeText(valueOf(r,"unit","units"))}</strong><small>Reorder at ${re}</small></div><div class="stock-meter"><span class="${cls}" style="width:${pct}%"></span></div></div><span class="owner-status ${ownerStatusClass(r.status||"")}">${safeText(r.status||"")}</span>${workspaceActionHtml(r)}</div>`;
  }).join("")}</div>`;
}
function renderWarrantyCoverage(items){
  return `<div class="warranty-grid">${items.map(r=>{
    const d=daysUntil(r.dueDate),coverage=d===null?"No expiration":d<0?"Expired":`${d} days left`;
    return `<article class="warranty-card"><div class="warranty-card-head"><div><small>${safeText(valueOf(r,"manufacturer","Manufacturer"))}</small><h4>${safeText(r.title)}</h4><span>${safeText(valueOf(r,"model",""))}</span></div><span class="owner-status ${d!==null&&d<0?"canceled":"active"}">${safeText(coverage)}</span></div><div class="asset-data-grid"><div><span>Serial</span><strong>${safeText(valueOf(r,"serialNumber"))}</strong></div><div><span>Type</span><strong>${safeText(valueOf(r,"warrantyType","Warranty"))}</strong></div><div><span>Purchased</span><strong>${safeText(shortDate(valueOf(r,"purchaseDate","")))}</strong></div><div><span>Claim Contact</span><strong>${safeText(valueOf(r,"claimContact"))}</strong></div></div>${workspaceActionHtml(r)}</article>`;
  }).join("")}</div>`;
}
function renderComplaintPipeline(items){
  const groups=["New","In Review","Waiting on Customer","Resolved"];
  return `<div class="complaint-ticket-list">${groups.map(status=>{
    const rows=items.filter(r=>String(r.status||"New").toLowerCase()===status.toLowerCase());
    return `<section class="panel"><div class="panel-heading"><div><small>CASE STAGE</small><h3>${status}</h3></div><span>${rows.length}</span></div>${rows.length?rows.map(r=>`<article class="complaint-ticket"><span class="case-severity ${String(valueOf(r,"severity","")).toLowerCase()}"></span><div><h4>${safeText(r.title)}</h4><p>${safeText(valueOf(r,"customer","Unknown customer"))} • ${safeText(valueOf(r,"channel",""))}</p><span class="tag">${safeText(valueOf(r,"severity","Moderate"))}</span></div>${workspaceActionHtml(r)}</article>`).join(""):'<div class="tool-empty">No cases in this stage.</div>'}</section>`;
  }).join("")}</div>`;
}
function renderIdeaBoard(items){
  const groups=["Submitted","Under Review","Approved","Implemented"];
  return `<div class="idea-board">${groups.map(status=>{const rows=items.filter(r=>String(r.status||"Submitted").toLowerCase()===status.toLowerCase());return `<section class="idea-column"><h4>${status} (${rows.length})</h4>${rows.map(r=>`<article class="idea-card"><strong>${safeText(r.title)}</strong><p>${safeText(valueOf(r,"expectedBenefit",""))}</p><div class="record-meta"><span class="tag">${safeText(valueOf(r,"priority","Normal"))}</span></div>${workspaceActionHtml(r)}</article>`).join("")}</section>`}).join("")}</div>`;
}
function renderReceptionDesk(items){
  const onsite=items.filter(r=>String(r.status||"").toLowerCase()==="on site"),history=items.filter(r=>String(r.status||"").toLowerCase()!=="on site");
  const card=r=>`<div class="reception-card"><strong>${safeText(r.title)}</strong><span>${safeText(valueOf(r,"company",""))} • Visiting ${safeText(valueOf(r,"host",""))}</span><small>Arrived ${safeText(valueOf(r,"arrival","—"))}</small>${workspaceActionHtml(r)}</div>`;
  return `<div class="reception-layout"><section class="reception-panel"><div class="panel-heading"><div><small>LIVE</small><h3>Currently On Site</h3></div><strong>${onsite.length}</strong></div>${onsite.length?onsite.map(card).join(""):'<div class="tool-empty">No visitors currently on site.</div>'}</section><section class="reception-panel"><div class="panel-heading"><div><small>HISTORY</small><h3>Checked Out</h3></div></div>${history.slice(0,10).map(card).join("")||'<div class="tool-empty">No visitor history yet.</div>'}</section></div>`;
}
function renderPackageQueue(items){
  const waiting=items.filter(r=>!["picked up","returned"].includes(String(r.status||"").toLowerCase())),done=items.filter(r=>["picked up","returned"].includes(String(r.status||"").toLowerCase()));
  const card=r=>`<div class="package-card"><div class="record-meta"><span class="tag">${safeText(valueOf(r,"carrier","Carrier"))}</span><span class="tag">${safeText(r.status||"Received")}</span></div><strong>${safeText(r.title)}</strong><span>For ${safeText(valueOf(r,"recipient","Unknown recipient"))}</span><small>Received ${safeText(valueOf(r,"receivedAt","—"))}</small>${workspaceActionHtml(r)}</div>`;
  return `<div class="package-layout"><section class="package-panel"><div class="panel-heading"><div><small>ACTION NEEDED</small><h3>Waiting for Pickup</h3></div><strong>${waiting.length}</strong></div>${waiting.length?waiting.map(card).join(""):'<div class="tool-empty">No packages waiting.</div>'}</section><section class="package-panel"><div class="panel-heading"><div><small>COMPLETED</small><h3>Picked Up / Returned</h3></div></div>${done.slice(0,12).map(card).join("")||'<div class="tool-empty">No completed packages yet.</div>'}</section></div>`;
}

function renderEverything(){renderStats();renderDashboardTools();renderModuleSettings();renderRecords();renderRecentRecords();renderMonthlyOverview();renderDashboardMonthSnapshot();renderTeamHub();if(activeToolWorkspaceId&&views?.toolWorkspace&&!$("toolWorkspaceView").classList.contains("hidden"))renderToolWorkspace(activeToolWorkspaceId)}
function renderStats(){const now=new Date(),soon=new Date();soon.setDate(now.getDate()+7);$("statOpen").textContent=records.filter(r=>!completedStatus(r)).length;$("statDue").textContent=records.filter(r=>{if(!r.dueDate||completedStatus(r))return false;const d=new Date(`${r.dueDate}T23:59:59`);return d>=now&&d<=soon}).length;$("statTools").textContent=enabledModules().length;$("statTotal").textContent=records.length;}
function renderDashboardTools(){const enabled=new Set(enabledModules());$("dashboardToolGrid").innerHTML=toolDefinitions.filter(t=>enabled.has(t.id)).slice(0,24).map(t=>`<button class="tool-card" data-tool-open="${t.id}"><span>${safeText(t.icon)}</span><strong>${safeText(t.name)}</strong><small>${safeText(toolExperience(t.id).mode.replace(/([A-Z])/g," $1").trim())}</small></button>`).join("")||'<div class="empty-state">Enable at least one tool.</div>';document.querySelectorAll("[data-tool-open]").forEach(btn=>btn.onclick=()=>{activeToolWorkspaceId=btn.dataset.toolOpen;switchView("toolWorkspace");renderToolWorkspace(activeToolWorkspaceId);});}
function renderModuleOptions(){const opts=toolDefinitions.map(t=>`<option value="${t.id}">${safeText(t.name)}</option>`).join("");$("recordModule").innerHTML=opts;$("recordModuleFilter").innerHTML=`<option value="all">All tools</option>${opts}`;}
function renderModuleSettings(){
  if(!canManageTools()){$("moduleSettingsGrid").innerHTML="";return;}
  const enabled=new Set(fullBusinessEnabledModules());
  $("moduleSettingsGrid").innerHTML=toolDefinitions.map(t=>`<div class="module-setting"><div><strong>${safeText(t.icon)} ${safeText(t.name)}</strong><small>${enabled.has(t.id)?"Enabled":"Disabled"}</small></div><button class="toggle ${enabled.has(t.id)?"on":""}" data-module-toggle="${t.id}" aria-label="Toggle ${safeText(t.name)}"></button></div>`).join("");
  document.querySelectorAll("[data-module-toggle]").forEach(btn=>btn.onclick=async()=>{
    const id=btn.dataset.moduleToggle,next=new Set(fullBusinessEnabledModules());
    next.has(id)?next.delete(id):next.add(id);
    business.enabledModules=[...next];
    await updateDoc(doc(db,"businesses",business.id),{enabledModules:business.enabledModules,updatedAt:serverTimestamp()});
    renderModuleOptions();renderEverything();
    if(canManageEmployees())renderEmployeeAccounts();
    if(isBusinessOwnerAccount())renderRoles();
  });
}


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
function recordActionRequiresEdit(action){
  return !["open_website","open_qr_link","copy_asset_id"].includes(action);
}
function quickActionButton(record){
  const a=getRecordAction(record);
  if(!a)return "";
  if(recordActionRequiresEdit(a.key)&&!canEditRecords())return "";
  return `<button class="mini-btn ${a.primary?"record-action-primary":""} ${a.success?"record-action-success":""}" data-record-action="${a.key}" data-record-id="${record.id}">${safeText(a.label)}</button>`;
}
function recurringNextButton(record){
  if(!canCreateRecords()||record.module!=="tasks"||!completedStatus(record))return "";
  const recurring=record.fields?.recurring;
  if(!recurring||recurring==="No")return "";
  return `<button class="mini-btn" data-record-action="create_next_task" data-record-id="${record.id}">Create Next</button>`;
}
function recordAssignmentChipHtml(r){const labels=recordAssignmentLabels(r);return labels.length?`<div class="team-work-assignees">${labels.slice(0,4).map(a=>`<span class="collab-chip ${a.type}">${safeText(a.label)}</span>`).join("")}${labels.length>4?`<span class="collab-chip">+${labels.length-4}</span>`:""}</div>`:""}
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
      ${recordAssignmentChipHtml(r)}
    </div>
    <div class="record-actions">
      ${quickActionButton(r)}
      ${recurringNextButton(r)}
      <button class="mini-btn" data-view-record="${r.id}">View</button>
      ${canCreateRecords()?`<button class="mini-btn" data-duplicate-record="${r.id}">Duplicate</button>`:""}
      ${canEditRecords()?`<button class="mini-btn" data-edit-record="${r.id}">Edit</button>`:""}
      ${canDeleteRecords()?`<button class="mini-btn danger" data-delete-record="${r.id}">Delete</button>`:""}
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
  if(!canExportRecords()){alert("Your employee account does not have permission to export records.");return;}
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
  if(!canEditRecords())throw new Error("This account cannot edit records.");
  await updateDoc(doc(db,"businesses",business.id,"records",record.id),{
    ...updates,
    updatedAt:serverTimestamp(),
    updatedBy:currentUser.uid
  });
  await logCollaborationEvent("record_updated",record.id,record.module,`updated "${record.title}"`,recordAssignedUserIds(record),recordAssignedGroupIds(record));
  await Promise.all([loadRecords(),loadCollaborationEvents()]);
  renderEverything();
}
async function duplicateRecord(record){
  if(!canCreateRecords()){alert("Your account cannot create records.");return;}
  const payload={
    module:record.module,
    title:`${record.title||"Untitled"} Copy`,
    status:toolById(record.module).statuses?.[0]||"Open",
    dueDate:record.dueDate||"",
    details:record.details||"",
    fields:{...(record.fields||{})},
    assignedUserIds:[...(record.assignedUserIds||[])],assignedOrgUnitIds:[...(record.assignedOrgUnitIds||[])],collaborationUpdatedAt:serverTimestamp(),
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
  return t.fields.filter(f=>f.key!=="title"&&f.key!=="assignedTo").map(f=>{
    let value=values[f.key];
    if(f.key==="items"){
      const items=String(value||"").split("\n").map(x=>x.trim()).filter(Boolean);
      const checked=new Set(parseCheckedItems(record));
      value=items.length?items.map((x,i)=>`${checked.has(i)?"✓":"○"} ${x}`).join("\n"):"—";
    }
    return `<div class="record-detail-field"><span>${safeText(f.label)}</span><strong>${safeText(prettyValue(value)||"—")}</strong></div>`;
  }).join("");
}
async function openRecordDetail(record){
  const t=toolById(record.module),health=recordDueHealth(record);
  activeRecordCollaborationId=record.id;
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
  renderRecordAssignmentSummary(record);$("recordCommentText").value="";$("recordCommentMessage").textContent="";await renderRecordConversation(record.id);
  const a=getRecordAction(record);
  const canRunAction=a&&(!recordActionRequiresEdit(a.key)||canEditRecords());
  $("recordDetailActions").innerHTML=`
    ${canRunAction?`<button class="btn btn-primary" data-detail-record-action="${a.key}" data-record-id="${record.id}">${safeText(a.label)}</button>`:""}
    ${recurringNextButton(record).replaceAll("data-record-action=","data-detail-record-action=")}
    ${canEditRecords()?`<button class="btn btn-secondary" data-detail-edit="${record.id}">Edit</button>`:""}
    <button class="btn btn-secondary" data-detail-message="${record.id}">Message Team</button>
    ${canCreateRecords()?`<button class="btn btn-secondary" data-detail-duplicate="${record.id}">Duplicate</button>`:""}`;
  document.querySelectorAll("[data-detail-record-action]").forEach(btn=>btn.onclick=async()=>{
    $("recordDetailModal").classList.add("hidden");
    await handleRecordQuickAction(records.find(r=>r.id===btn.dataset.recordId),btn.dataset.detailRecordAction);
  });
  document.querySelectorAll("[data-detail-edit]").forEach(btn=>btn.onclick=()=>{
    $("recordDetailModal").classList.add("hidden");
    openRecordModal(records.find(r=>r.id===btn.dataset.detailEdit));
  });
  document.querySelectorAll("[data-detail-message]").forEach(btn=>btn.onclick=()=>openTeamMessageModal(records.find(r=>r.id===btn.dataset.detailMessage)));
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
  if(action==="create_next_task"&&!canCreateRecords()){alert("Your employee account cannot create records.");return;}
  if(recordActionRequiresEdit(action)&&!canEditRecords()){alert("Your employee account cannot edit records.");return;}
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
    if(!canDeleteRecords()){alert("Your employee account cannot delete records.");return;}
    if(!confirm("Delete this record?"))return;
    await deleteDoc(doc(db,"businesses",business.id,"records",btn.dataset.deleteRecord));
    records=records.filter(r=>r.id!==btn.dataset.deleteRecord);
    renderEverything();
  });
}
$("toolWorkspaceBackBtn").addEventListener("click",()=>switchView("dashboard"));
$("toolWorkspaceAllRecordsBtn").addEventListener("click",()=>{
  if(activeToolWorkspaceId){$("recordModuleFilter").value=activeToolWorkspaceId;renderRecords();}
  switchView("records");
});
$("toolWorkspaceAddBtn").addEventListener("click",()=>openRecordModal());
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
  const t=toolById(moduleId),cfg=toolExperience(moduleId);
  $("recordEyebrow").textContent=t.category.toUpperCase();
  $("recordModalHelper").textContent=t.helper;
  document.querySelector(".record-modal-card").dataset.toolForm=moduleId;
  $("toolFormContext").innerHTML=`<span class="tool-form-context-icon">${safeText(t.icon)}</span><div><strong>${safeText(t.name)} workflow</strong><span>${safeText(cfg.formIntro)}</span></div>`;
  $("toolNotesLabel").textContent=cfg.notes||"Notes";
  $("recordSaveBtn").textContent=record?`Save ${t.name}`:cfg.addLabel.replace(/^\+\s*/,"");
  const fieldMap=new Map(t.fields.filter(f=>f.key!=="assignedTo").map(f=>[f.key,f]));
  const used=new Set();
  const sections=(cfg.sections||[]).map(section=>{
    const fields=(section.keys||[]).map(key=>fieldMap.get(key)).filter(Boolean);
    fields.forEach(f=>used.add(f.key));
    if(!fields.length)return "";
    return `<section class="tool-form-section"><div class="tool-form-section-head"><strong>${safeText(section.title)}</strong><span>${safeText(section.hint||"")}</span></div>${fields.map(f=>fieldHtml(f,f.key==="title"?(record?.title||""):(record?.fields?.[f.key]||""))).join("")}</section>`;
  }).join("");
  const leftovers=t.fields.filter(f=>f.key!=="assignedTo"&&!used.has(f.key));
  $("dynamicFields").className="dynamic-fields tool-sectioned-fields";
  $("dynamicFields").innerHTML=sections+(leftovers.length?`<section class="tool-form-section"><div class="tool-form-section-head"><strong>Additional Details</strong><span>Other information for this ${safeText(t.name.toLowerCase())} record.</span></div>${leftovers.map(f=>fieldHtml(f,f.key==="title"?(record?.title||""):(record?.fields?.[f.key]||""))).join("")}</section>`:"");
  $("dueDateLabel").childNodes[0].nodeValue=`${t.dueLabel} `;
  const currentStatus=record?.status||t.statuses[0];
  $("recordStatus").innerHTML=t.statuses.map(s=>`<option value="${safeText(s)}">${safeText(s)}</option>`).join("");
  $("recordStatus").value=currentStatus;
}
function openRecordModal(record=null){
  if(record&&!canEditRecords()){alert("Your employee account cannot edit records.");return;}
  if(!record&&!canCreateRecords()){alert("Your employee account cannot create records.");return;}
  $("recordForm").reset();$("recordMessage").textContent="";$("recordId").value=record?.id||"";let moduleId=record?.module||(activeToolWorkspaceId&&canAccessModule(activeToolWorkspaceId)?activeToolWorkspaceId:($("recordModuleFilter").value!=="all"?$("recordModuleFilter").value:enabledModules()[0]||"tasks"));$("recordModule").value=moduleId;$("recordModalTitle").textContent=record?`Edit ${toolById(moduleId).name}`:toolExperience(moduleId).addLabel.replace(/^\+\s*/,"");renderDynamicFields(moduleId,record);if(record?.status && [...$("recordStatus").options].some(o=>o.value===record.status)) $("recordStatus").value=record.status;$("recordDueDate").value=record?.dueDate||"";$("recordDetails").value=record?.details||"";renderRecordCollaborationInputs(record);recordModal.classList.remove("hidden");}
$("recordModule").addEventListener("change",()=>{$("recordModalTitle").textContent=toolExperience($("recordModule").value).addLabel.replace(/^\+\s*/,"");renderDynamicFields($("recordModule").value,null)});
$("addRecordBtn").addEventListener("click",()=>openRecordModal());$("quickAddBtn").addEventListener("click",()=>openRecordModal());document.querySelectorAll("[data-close-record]").forEach(btn=>btn.addEventListener("click",()=>recordModal.classList.add("hidden")));recordModal.addEventListener("click",e=>{if(e.target===recordModal)recordModal.classList.add("hidden")});
$("recordForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const id=$("recordId").value,moduleId=$("recordModule").value,t=toolById(moduleId),fields={};let title="";
  if(!canAccessModule(moduleId)){$("recordMessage").textContent="Your account does not have access to this tool.";return;}
  if(id&&!canEditRecords()){$("recordMessage").textContent="Your account cannot edit records.";return;}
  if(!id&&!canCreateRecords()){$("recordMessage").textContent="Your account cannot create records.";return;}
  for(const f of t.fields){
    if(f.key==="assignedTo")continue;
    const el=$(`toolField_${f.key}`);
    const value=el?.value?.trim?el.value.trim():el?.value||"";
    if(f.required && !value){$("recordMessage").textContent=`${f.label} is required.`;el?.focus();return;}
    if(f.key==="title")title=value;else fields[f.key]=value;
  }
  const collaboration=selectedRecordCollaboration();
  if(t.fields.some(f=>f.key==="assignedTo"))fields.assignedTo=[...collaboration.assignedUserIds.map(memberDisplayName),...collaboration.assignedOrgUnitIds.map(groupDisplayName)].join(", ");
  let smartStatus=$("recordStatus").value;
  if(moduleId==="supplies") smartStatus=calculateSupplyStatus(fields);
  if(moduleId==="visitor-log" && fields.departure) smartStatus="Checked Out";
  if(moduleId==="package-log" && fields.pickupDate) smartStatus="Picked Up";
  if(moduleId==="asset-checkout" && fields.returnDate) smartStatus="Returned";
  if(moduleId==="training" && fields.completionDate && smartStatus==="Assigned") smartStatus="Completed";
  const payload={module:moduleId,title,status:smartStatus,dueDate:$("recordDueDate").value||"",details:$("recordDetails").value.trim(),fields,assignedUserIds:collaboration.assignedUserIds,assignedOrgUnitIds:collaboration.assignedOrgUnitIds,collaborationUpdatedAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:currentUser.uid};
  try{let savedId=id;if(id){await updateDoc(doc(db,"businesses",business.id,"records",id),payload);await logCollaborationEvent("record_updated",id,moduleId,`updated "${title}"`,collaboration.assignedUserIds,collaboration.assignedOrgUnitIds);}else{const created=await addDoc(collection(db,"businesses",business.id,"records"),{...payload,createdAt:serverTimestamp(),createdBy:currentUser.uid});savedId=created.id;await logCollaborationEvent("record_created",savedId,moduleId,`created "${title}"`,collaboration.assignedUserIds,collaboration.assignedOrgUnitIds);}await Promise.all([loadRecords(),loadCollaborationEvents()]);renderEverything();recordModal.classList.add("hidden");}catch(error){console.error(error);$("recordMessage").textContent="Could not save this item. Check Firestore rules.";}
});

$("businessSettingsForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!canManageSettings()){alert("Your account cannot change business settings.");return;}
  const updates={
    name:$("settingsBusinessName").value.trim(),
    phone:$("settingsPhone").value.trim(),
    website:$("settingsWebsite").value.trim(),
    updatedAt:serverTimestamp()
  };
  if(isBusinessOwnerAccount())updates.ownerName=$("settingsOwnerName").value.trim();
  await updateDoc(doc(db,"businesses",business.id),updates);
  Object.assign(business,updates);$("sidebarBusinessName").textContent=business.name;alert("Business settings saved.");
});
if($("monthlyPicker")){$("monthlyPicker").value=monthKeyFromDate(new Date());$("monthlyPicker").addEventListener("change",renderMonthlyOverview);$("monthlyPrevBtn").addEventListener("click",()=>shiftMonth(-1));$("monthlyNextBtn").addEventListener("click",()=>shiftMonth(1));}
const views={dashboard:[$("dashboardView"),"OVERVIEW","Dashboard"],teamHub:[$("teamHubView"),"COLLABORATION","Team Hub"],monthly:[$("monthlyView"),"BUSINESS HISTORY","Monthly Overview"],tools:[$("toolsView"),"MODULES","Tools"],toolWorkspace:[$("toolWorkspaceView"),"BUSINESS TOOL","Tool Workspace"],records:[$("recordsView"),"BUSINESS DATA","All Records"],employees:[$("employeesView"),"TEAM ACCESS","Employee Accounts"],organization:[$("organizationView"),"FREEDOM STRUCTURE","Organization"],roles:[$("rolesView"),"ACCESS TEMPLATES","Roles & Access"],settings:[$("settingsView"),"ACCOUNT","Settings"]};
function switchView(name){
  if(!views[name])return;
  if(!canAccessBusinessView(name)){name="dashboard";}
  Object.entries(views).forEach(([key,[el]])=>el.classList.toggle("hidden",key!==name));
  document.querySelectorAll("[data-view]").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===name));
  $("viewEyebrow").textContent=name==="toolWorkspace"&&activeToolWorkspaceId?toolById(activeToolWorkspaceId).category.toUpperCase():views[name][1];
  $("viewTitle").textContent=name==="toolWorkspace"&&activeToolWorkspaceId?toolById(activeToolWorkspaceId).name:views[name][2];
  if(name==="teamHub")renderTeamHub();
  if(name==="employees"&&canManageEmployees())renderEmployeeAccounts();
  if(name==="organization"&&canManageOrganization())renderOrganization();
  if(name==="roles"&&isBusinessOwnerAccount())renderRoles();
  if(window.innerWidth<=780)$("sidebar").classList.remove("open");
}
document.querySelectorAll("[data-view]").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));document.querySelectorAll("[data-go-tools]").forEach(btn=>btn.addEventListener("click",()=>switchView("tools")));$("sidebarToggle").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
