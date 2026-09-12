export interface PortalGuideStep {
  step: number;
  instruction: string;
  hindi?: string;
  tip?: string;
}

export interface Portal {
  id: string;
  name: string;
  hindiName: string;
  url: string;
  category: string;
  tasks: string[];
  /** Structured walkthroughs the agent can narrate step by step. */
  guides?: Record<string, PortalGuideStep[]>;
}

export const PORTALS: Portal[] = [
  {
    id: "irctc",
    name: "IRCTC",
    hindiName: "आईआरसीटीसी",
    url: "https://www.irctc.co.in/nget/train-search",
    category: "Travel",
    tasks: ["Book train tickets", "Cancel tickets", "Check PNR status", "Tatkal booking"],
    guides: {
      "book-train-ticket": [
        {
          step: 1,
          instruction:
            "On the IRCTC homepage, find the booking box on the left. Click the 'From' field and type your departure station, then pick it from the dropdown.",
          hindi: "IRCTC होमपेज पर बाईं ओर बुकिंग बॉक्स में 'From' में अपना प्रस्थान स्टेशन लिखें और सूची से चुनें।",
          tip: "Station names can be typed in English; the dropdown shows the station code too.",
        },
        {
          step: 2,
          instruction: "Click the 'To' field and type your destination station, then select it from the dropdown.",
          hindi: "'To' में अपना गंतव्य स्टेशन लिखें और सूची से चुनें।",
        },
        {
          step: 3,
          instruction: "Click the date field and choose your journey date from the calendar.",
          hindi: "तारीख वाले बॉक्स पर क्लिक करके कैलेंडर से यात्रा की तारीख चुनें।",
        },
        {
          step: 4,
          instruction: "Choose the class (Sleeper, 3A, 2A…) and quota (General/Tatkal/Ladies), then click the blue 'Search' button.",
          hindi: "क्लास (स्लीपर, 3A, 2A…) और कोटा चुनें, फिर नीले 'Search' बटन पर क्लिक करें।",
        },
        {
          step: 5,
          instruction:
            "In the train list, check availability for your class, then click 'Book Now' on the train you want. You will be asked to log in if you haven't.",
          hindi: "ट्रेन सूची में उपलब्धता देखें और अपनी ट्रेन पर 'Book Now' दबाएँ। लॉगिन माँगा जाए तो लॉगिन करें।",
          tip: "New users must create a free IRCTC account first — I can guide you through registration too.",
        },
        {
          step: 8,
          instruction:
            "Fill passenger details: name (as on ID), age, gender, and berth preference. I can give you the exact text to copy for each field.",
          hindi: "यात्री विवरण भरें: नाम (पहचान पत्र जैसा), उम्र, लिंग और बर्थ पसंद। मैं हर फ़ील्ड के लिए कॉपी करने लायक टेक्स्ट दे सकती हूँ।",
        },
        {
          step: 9,
          instruction: "Enter your mobile number, verify the captcha, and proceed to payment (UPI is easiest).",
          hindi: "मोबाइल नंबर भरें, कैप्चा भरें और भुगतान करें (UPI सबसे आसान है)।",
        },
        {
          step: 10,
          instruction: "After payment, your e-ticket is shown and sent by SMS/email. You can download the PDF — no printout needed for travel.",
          hindi: "भुगतान के बाद ई-टिकट SMS/ईमेल पर आ जाएगा। यात्रा के लिए प्रिंट ज़रूरी नहीं है।",
        },
      ],
    },
  },
  {
    id: "sample-income-tax",
    name: "Sample Income Tax Form (Demo)",
    hindiName: "नमूना आयकर फॉर्म",
    url: "/demo/income-tax",
    category: "Demo",
    tasks: ["Practice filling a form with JanSewak", "Hackathon demo", "Sample income tax form"],
    guides: {
      "fill-sample-form": [
        {
          step: 1,
          instruction: "Click the 'Full Name (as per PAN)' field and type or paste the name. I will give you the exact text to copy.",
          hindi: "'Full Name' वाले बॉक्स पर क्लिक करें — मैं कॉपी करने के लिए नाम दे दूँगी।",
        },
        {
          step: 2,
          instruction: "Click the 'PAN Number' field and enter the 10-character PAN (e.g. ABCDE1234F).",
          hindi: "'PAN Number' बॉक्स में 10 अक्षरों का PAN भरें।",
        },
        {
          step: 3,
          instruction: "Click the 'Mobile Number' field and enter the 10-digit mobile number.",
          hindi: "'Mobile Number' बॉक्स में 10 अंकों का मोबाइल नंबर भरें।",
        },
        {
          step: 4,
          instruction: "Click the blue 'Submit' button. A green success message confirms the demo form was submitted.",
          hindi: "नीले 'Submit' बटन पर क्लिक करें — हरा संदेश दिखेगा कि फॉर्म जमा हो गया।",
        },
      ],
    },
  },
  {
    id: "epfo",
    name: "EPFO",
    hindiName: "ईपीएफओ",
    url: "https://unifiedportal-mem.epfindia.gov.in/memberinterface/",
    category: "Pension & PF",
    tasks: ["Check PF balance", "Withdraw PF", "Transfer PF", "Update KYC"],
  },
  {
    id: "incometax",
    name: "Income Tax e-Filing",
    hindiName: "आयकर ई-फाइलिंग",
    url: "https://www.incometax.gov.in/iec/foportal/",
    category: "Taxes",
    tasks: ["File ITR", "Check refund status", "Link PAN with Aadhaar", "e-Verify return"],
  },
  {
    id: "digilocker",
    name: "DigiLocker",
    hindiName: "डिजिलॉकर",
    url: "https://www.digilocker.gov.in/",
    category: "Documents",
    tasks: ["Store documents", "Get driving licence", "Get marksheets", "Share documents"],
  },
  {
    id: "uidai",
    name: "Aadhaar (UIDAI)",
    hindiName: "आधार",
    url: "https://myaadhaar.uidai.gov.in/",
    category: "Identity",
    tasks: ["Download Aadhaar", "Update address", "Book appointment", "Verify Aadhaar"],
  },
  {
    id: "passport",
    name: "Passport Seva",
    hindiName: "पासपोर्ट सेवा",
    url: "https://www.passportindia.gov.in/",
    category: "Identity",
    tasks: ["Apply for passport", "Renew passport", "Track application", "Book appointment"],
  },
  {
    id: "pmkisan",
    name: "PM-Kisan",
    hindiName: "पीएम-किसान",
    url: "https://pmkisan.gov.in/",
    category: "Schemes",
    tasks: ["Check beneficiary status", "Register as farmer", "e-KYC", "Check installment"],
  },
  {
    id: "cowin-abha",
    name: "ABHA Health ID",
    hindiName: "आभा हेल्थ आईडी",
    url: "https://abha.abdm.gov.in/",
    category: "Health",
    tasks: ["Create health ID", "Link health records"],
  },
  {
    id: "voter",
    name: "Voter Services (ECI)",
    hindiName: "मतदाता सेवा",
    url: "https://voters.eci.gov.in/",
    category: "Identity",
    tasks: ["Apply for Voter ID", "Correct voter details", "Find polling booth", "Download e-EPIC"],
  },
  {
    id: "pgportal",
    name: "CPGRAMS Grievances",
    hindiName: "जन शिकायत",
    url: "https://pgportal.gov.in/",
    category: "Grievances",
    tasks: ["File a complaint against any government department", "Track grievance status"],
  },
  {
    id: "cybercrime",
    name: "National Cyber Crime Reporting Portal",
    hindiName: "राष्ट्रीय साइबर अपराध पोर्टल",
    url: "https://cybercrime.gov.in/",
    category: "Safety",
    tasks: [
      "Report online financial fraud (UPI, bank, card, OTP scam)",
      "Report cyber crime (hacking, fake profile, sextortion, harassment)",
      "File cyber crime complaint on the portal step by step",
      "Call 1930 cyber fraud helpline",
      "Track cyber complaint status",
    ],
    guides: {
      "report-financial-fraud": [
        {
          step: 1,
          instruction:
            "URGENT FIRST, before the portal: call 1930 (national cyber fraud helpline) immediately — money reported within the first few 'golden hours' can often be frozen before it leaves the fraudster's account.",
          hindi: "सबसे पहले 1930 पर तुरंत कॉल करें — पहले कुछ घंटों में शिकायत करने पर पैसा फ्रीज़ होने की संभावना सबसे ज़्यादा होती है।",
          tip: "1930 is free and works 24x7. If money just left the account, this call matters more than anything else.",
        },
        {
          step: 2,
          instruction:
            "Also call your bank's customer care (number on the back of your card / official app) and ask them to freeze the account or block the card/UPI immediately, and to raise a fraud dispute on the transaction.",
          hindi: "अपने बैंक के कस्टमर केयर को कॉल करके खाता/कार्ड/UPI तुरंत block या freeze करवाएँ और transaction पर fraud dispute दर्ज कराएँ।",
          tip: "Never call numbers from SMS or Google search results — use the number on the card or the official bank app.",
        },
        {
          step: 3,
          instruction:
            "Preserve evidence: take screenshots of the fraud SMS/WhatsApp/UPI request, note the transaction ID / UTR number, amount, date-time, and the fraudster's number or UPI ID. Do not delete anything.",
          hindi: "सबूत सँभालें: SMS/WhatsApp/UPI के screenshot, transaction ID (UTR), रकम, समय और ठग का नंबर/UPI ID नोट करें। कुछ भी delete न करें।",
        },
        {
          step: 4,
          instruction:
            "Now open cybercrime.gov.in and click 'File a Complaint' → accept the terms → choose 'Report Cyber Crime' (financial fraud category). Register/login with your mobile number and OTP.",
          hindi: "अब cybercrime.gov.in खोलें — 'File a Complaint' पर क्लिक करें, शर्तें स्वीकारें, financial fraud चुनें और मोबाइल नंबर + OTP से लॉगिन करें।",
        },
        {
          step: 5,
          instruction:
            "Fill the complaint form with the evidence you saved (transaction details, screenshots as attachments). Submit and save the Acknowledgement Number to track status later.",
          hindi: "फॉर्म में transaction की जानकारी भरें, screenshot attach करें, submit करके Acknowledgement Number सँभाल कर रखें।",
          tip: "The same portal tracks complaint status under 'Check Status' with this number.",
        },
        {
          step: 6,
          instruction:
            "Remind the user: no bank, police or government officer ever asks for OTP, PIN, CVV or 'digital arrest' payments on a call. If pressured on a live call, hang up.",
          hindi: "याद रखें: कोई बैंक/पुलिस/सरकारी अधिकारी कभी OTP, PIN, CVV या 'digital arrest' के पैसे नहीं माँगता। ऐसा कॉल आए तो तुरंत काट दें।",
        },
      ],
      // Page-by-page map of the live portal. Labels/layout change over time —
      // the agent must read the actual on-screen text and follow the frame,
      // using this only to know what comes next.
      "file-complaint-portal-walkthrough": [
        {
          step: 1,
          instruction:
            "On the financial-fraud landing page (cybercrime.gov.in/Webform/Index.aspx), the first action is 'Register a Complaint on Financial Fraud'. Read and highlight that exact visible label. Do not send the user to Citizen Login from this landing page.",
          hindi: "financial fraud वाले पेज पर सबसे पहले 'Register a Complaint on Financial Fraud' चुनें — Citizen Login नहीं। स्क्रीन पर दिख रहा वही label highlight करें।",
        },
        {
          step: 2,
          instruction:
            "After the financial-fraud registration page loads, find and highlight 'File a Complaint'. Do not repeat the previous financial-fraud registration step once this label is visible.",
          hindi: "अगले पेज पर 'File a Complaint' दिखे तो उसे highlight करें। पिछला registration step दोहराएँ नहीं।",
        },
        {
          step: 3,
          instruction:
            "The Terms & Conditions screen follows. Highlight the exact acceptance control visible on screen, normally 'I Accept'.",
          hindi: "Terms & Conditions में जो acceptance control दिखे, आम तौर पर 'I Accept', उसी को highlight करें।",
        },
        {
          step: 4,
          instruction:
            "Only after terms are accepted, guide the visible login/registration page. For matching fields, offer the saved profile values with provide_text: full name 'Shivam Kumar Pathak' and mobile '7413020731'. Highlight each field and its exact screen label before offering text.",
          hindi: "Terms accept करने के बाद ही login/registration fields भरें। नाम 'Shivam Kumar Pathak' और मोबाइल '7413020731' को matching visible fields में copy suggestion से दें।",
        },
        {
          step: 5,
          instruction:
            "When the visible button says 'Get OTP', highlight it after the mobile field is filled. The user checks their own phone and enters the OTP privately; never ask them to say or show the OTP.",
          hindi: "मोबाइल भरने के बाद 'Get OTP' दिखे तो उसे highlight करें। OTP यूज़र अपने फोन से खुद भरेंगे।",
        },
        {
          step: 6,
          instruction:
            "After OTP verification fields appear, wait for the screenshot, then guide the CAPTCHA exactly as it is displayed on that page. Do not invent CAPTCHA text or ask the user to say it aloud. When the visible control says 'Login', highlight it to continue.",
          hindi: "OTP के बाद screenshot में दिख रहे CAPTCHA को ही भरवाएँ। फिर 'Login' दिखे तो उसी को highlight करें।",
        },
        {
          step: 7,
          instruction:
            "The complaint form is a multi-step wizard, usually: Incident Details → Suspect Details → Complainant (your) Details → Preview & Submit. Go tab by tab, one field at a time, always reading the actual field label from the screen.",
          hindi: "शिकायत फॉर्म कई हिस्सों में है: घटना का विवरण → संदिग्ध का विवरण → शिकायतकर्ता का विवरण → Preview और Submit। एक बार में एक ही field भरवाएँ।",
        },
        {
          step: 6,
          instruction:
            "Incident Details: category + sub-category of the crime (e.g. UPI fraud, debit/credit card fraud), approximate date and time it happened, where it happened (SMS, WhatsApp, website…), and upload evidence (screenshots, each file small — the portal states its size limit). The description box needs a detailed account (about 200 characters minimum) — compose it for the user with provide_text: what happened, when, amount, transaction ID/UTR, fraudster's number or UPI ID.",
          hindi: "घटना विवरण में: अपराध की category/sub-category, तारीख-समय, कहाँ हुआ, और सबूत upload करें। Description box में करीब 200 अक्षरों का विवरण चाहिए — यह टेक्स्ट आप provide_text से तैयार करके दें।",
          tip: "If a screenshot is too large to upload, open the built-in file tool to compress it.",
        },
        {
          step: 7,
          instruction:
            "Suspect Details: fill whatever is known — mobile number, UPI ID, bank account, email, website or profile link. It is okay to leave unknown fields blank; unknown suspect is a valid choice.",
          hindi: "संदिग्ध का विवरण: जो पता है वही भरें — नंबर, UPI ID, खाता, email। बाकी खाली छोड़ना ठीक है।",
        },
        {
          step: 8,
          instruction:
            "Complainant Details: the user's own name, address and ID details, exactly as asked on screen. Use their saved profile with provide_text so they paste instead of typing.",
          hindi: "शिकायतकर्ता का विवरण: यूज़र का नाम, पता आदि — saved profile से provide_text देकर paste करवाएँ।",
        },
        {
          step: 11,
          instruction:
            "Preview & Submit: ask the user to check the summary, then submit. An Acknowledgement Number appears (also sent by SMS/email) — tell them to save it and download the complaint PDF if offered. Status can be tracked later on the same portal with this number.",
          hindi: "Preview देखकर Submit करवाएँ। Acknowledgement Number आएगा — उसे सँभालकर रखने और PDF download करने को कहें। इसी नंबर से बाद में status देख सकते हैं।",
        },
      ],
    },
  },
];

/** Plain-text knowledge lookup the model calls as a tool. */
export function lookupKnowledge(query: string): string {
  const q = query.toLowerCase();
  const scored = PORTALS.map((p) => {
    let score = 0;
    const hay = `${p.id} ${p.name} ${p.category} ${p.tasks.join(" ")}`.toLowerCase();
    for (const word of q.split(/\s+/)) {
      if (word.length > 2 && hay.includes(word)) score++;
    }
    return { portal: p, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) {
    return "No seeded guide found for this query. Use your own knowledge and Google Search, and rely on the shared screen to guide the user step by step.";
  }

  const caveat =
    "IMPORTANT: the steps below are only a MAP of what usually comes next — portal layouts and labels change. While a screen is shared, never speak a step until you have found its element on the CURRENT frame and highlighted it with its exact visible_text. If the frame shows something different, the frame wins.\n\n";

  return caveat + scored
    .map(({ portal }) => {
      let text = `PORTAL: ${portal.name} (${portal.hindiName}) — ${portal.url}\nCategory: ${portal.category}\nCommon tasks: ${portal.tasks.join(", ")}`;
      if (portal.guides) {
        for (const [task, steps] of Object.entries(portal.guides)) {
          text += `\n\nSTEP-BY-STEP GUIDE (${task}):\n`;
          text += steps.map((s) => `${s.step}. ${s.instruction}${s.tip ? ` (Tip: ${s.tip})` : ""}`).join("\n");
        }
      }
      return text;
    })
    .join("\n\n---\n\n");
}
