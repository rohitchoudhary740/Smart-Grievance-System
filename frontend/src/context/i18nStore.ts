import { create } from 'zustand';

export type Lang = 'en' | 'hi';

interface I18nState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

// ── Translations ──────────────────────────────────────────────────────────────
const translations: Record<string, Record<Lang, string>> = {

  // ── Navigation ──────────────────────────────────────────────────────────────
  'nav.myComplaints':    { en: 'My Complaints',       hi: 'मेरी शिकायतें'       },
  'nav.newComplaint':    { en: 'New Complaint',        hi: 'नई शिकायत'           },
  'nav.myTasks':         { en: 'My Tasks',             hi: 'मेरे कार्य'           },
  'nav.performance':     { en: 'Performance',          hi: 'प्रदर्शन'             },
  'nav.commandCenter':   { en: 'Command Center',       hi: 'कमांड सेंटर'          },
  'nav.allComplaints':   { en: 'All Complaints',       hi: 'सभी शिकायतें'         },
  'nav.analytics':       { en: 'Analytics',            hi: 'विश्लेषण'             },
  'nav.departments':     { en: 'Departments',          hi: 'विभाग'                },
  'nav.users':           { en: 'Users',                hi: 'उपयोगकर्ता'           },
  'nav.auditLog':        { en: 'Audit Log',            hi: 'लेखापरीक्षा लॉग'      },
  'nav.signOut':         { en: 'Sign Out',             hi: 'साइन आउट'            },

  // ── Login ───────────────────────────────────────────────────────────────────
  'login.title':         { en: 'Sign In to Portal',   hi: 'पोर्टल में लॉग इन करें' },
  'login.orgCode':       { en: 'Organisation / City Code', hi: 'संस्था / शहर कोड' },
  'login.email':         { en: 'Official Email / User ID', hi: 'आधिकारिक ईमेल / यूज़र आईडी' },
  'login.password':      { en: 'Password',            hi: 'पासवर्ड'              },
  'login.signIn':        { en: 'Sign In Securely',    hi: 'सुरक्षित लॉग इन करें'  },
  'login.newCitizen':    { en: 'New citizen?',        hi: 'नए नागरिक हैं?'        },
  'login.registerHere':  { en: 'Register here',       hi: 'यहाँ पंजीकरण करें'     },
  'login.demoAccess':    { en: 'Quick Demo Access',   hi: 'त्वरित डेमो एक्सेस'    },
  'login.demoNote':      { en: 'Select a role to log in instantly', hi: 'तुरंत लॉग इन के लिए भूमिका चुनें' },
  'login.securityNotice':{ en: 'Security Notice',     hi: 'सुरक्षा सूचना'         },

  // ── Citizen dashboard ────────────────────────────────────────────────────────
  'citizen.welcome':     { en: 'Welcome back',        hi: 'वापसी पर स्वागत है'   },
  'citizen.filed':       { en: 'complaints filed with your municipality', hi: 'शिकायतें नगरपालिका में दर्ज' },
  'citizen.newComplaint':{ en: '+ New Complaint',     hi: '+ नई शिकायत'          },
  'citizen.active':      { en: 'Active',              hi: 'सक्रिय'               },
  'citizen.resolved':    { en: 'Resolved',            hi: 'निराकृत'              },
  'citizen.breached':    { en: 'Breached',            hi: 'उल्लंघित'             },
  'citizen.allTab':      { en: 'All',                 hi: 'सभी'                  },
  'citizen.openTab':     { en: 'Open',                hi: 'खुली'                 },
  'citizen.inProgressTab':{ en: 'In Progress',        hi: 'प्रक्रियाधीन'          },
  'citizen.resolvedTab': { en: 'Resolved',            hi: 'निराकृत'              },
  'citizen.reopenedTab': { en: 'Re-opened',           hi: 'पुनः खोली गई'         },
  'citizen.noComplaints':{ en: 'No complaints found', hi: 'कोई शिकायत नहीं मिली' },
  'citizen.submitFirst': { en: 'Submit your first complaint to get started.', hi: 'शुरू करने के लिए पहली शिकायत दर्ज करें।' },
  'citizen.submitBtn':   { en: 'Submit a complaint',  hi: 'शिकायत दर्ज करें'     },
  'citizen.assignedTo':  { en: 'Assigned to',         hi: 'सौंपा गया'            },

  // ── Submit complaint ─────────────────────────────────────────────────────────
  'submit.title':        { en: 'Submit a Complaint',  hi: 'शिकायत दर्ज करें'     },
  'submit.subtitle':     { en: 'AI will classify and route your complaint automatically in seconds', hi: 'AI कुछ सेकंड में आपकी शिकायत को स्वतः वर्गीकृत करेगा' },
  'submit.stepDetails':  { en: 'Details',             hi: 'विवरण'                },
  'submit.stepLocation': { en: 'Location',            hi: 'स्थान'                },
  'submit.stepPhotos':   { en: 'Photos',              hi: 'फ़ोटो'                 },
  'submit.stepReview':   { en: 'Review',              hi: 'समीक्षा'              },
  'submit.complaintTitle':{ en: 'Complaint Title',    hi: 'शिकायत का शीर्षक'     },
  'submit.description':  { en: 'Description',         hi: 'विवरण'                },
  'submit.voiceInput':   { en: 'Voice Input',         hi: 'आवाज़ इनपुट'           },
  'submit.hideVoice':    { en: 'Hide Voice',          hi: 'आवाज़ छुपाएं'           },
  'submit.multilingual': { en: '🌐 Multilingual supported — Hindi, English, Hinglish', hi: '🌐 बहुभाषी समर्थित — हिंदी, अंग्रेज़ी, हिंग्लिश' },
  'submit.category':     { en: 'Category (optional — AI will suggest)', hi: 'श्रेणी (वैकल्पिक — AI सुझाएगा)' },
  'submit.address':      { en: 'Address',             hi: 'पता'                  },
  'submit.ward':         { en: 'Ward (optional)',     hi: 'वार्ड (वैकल्पिक)'      },
  'submit.photos':       { en: 'Photos (optional, max 5)', hi: 'फ़ोटो (वैकल्पिक, अधिकतम 5)' },
  'submit.back':         { en: '← Back',             hi: '← वापस'              },
  'submit.next':         { en: 'Next →',             hi: 'आगे →'               },
  'submit.submitBtn':    { en: '🚀 Submit Complaint', hi: '🚀 शिकायत दर्ज करें'  },
  'submit.submitting':   { en: 'Submitting & Analysing…', hi: 'दर्ज हो रहा है…'  },
  'submit.success':      { en: 'Complaint Submitted!',hi: 'शिकायत दर्ज हो गई!'   },
  'submit.registered':   { en: 'Your complaint has been registered', hi: 'आपकी शिकायत दर्ज कर ली गई है' },
  'submit.trackStatus':  { en: 'Track Status',        hi: 'स्थिति जानें'          },
  'submit.submitAnother':{ en: 'Submit Another',      hi: 'और शिकायत दर्ज करें'  },
  'submit.aiAnalysis':   { en: '🤖 AI Analysis Complete', hi: '🤖 AI विश्लेषण पूर्ण' },
  'submit.aiClassified': { en: 'AI will classify and assign your complaint automatically', hi: 'AI स्वचालित रूप से आपकी शिकायत वर्गीकृत करेगा' },
  'submit.reviewTitle':  { en: 'Review your complaint', hi: 'अपनी शिकायत की जाँच करें' },

  // ── Status labels ─────────────────────────────────────────────────────────────
  'status.NEW':          { en: 'Registered',          hi: 'पंजीकृत'              },
  'status.ACCEPTED':     { en: 'Accepted',            hi: 'स्वीकृत'              },
  'status.IN_PROGRESS':  { en: 'Under Process',       hi: 'प्रक्रियाधीन'          },
  'status.RESOLVED':     { en: 'Redressed',           hi: 'निराकृत'              },
  'status.CLOSED':       { en: 'Closed',              hi: 'बंद'                  },
  'status.REJECTED':     { en: 'Rejected',            hi: 'अस्वीकृत'             },
  'status.REOPENED':     { en: 'Re-opened',           hi: 'पुनः खोला गया'        },
  'status.SLA_BREACHED': { en: 'SLA Breached',        hi: 'SLA उल्लंघन'          },

  // ── Priority labels ───────────────────────────────────────────────────────────
  'priority.LOW':        { en: 'Low',                 hi: 'कम'                   },
  'priority.MEDIUM':     { en: 'Medium',              hi: 'मध्यम'                },
  'priority.HIGH':       { en: 'High',                hi: 'उच्च'                 },
  'priority.CRITICAL':   { en: 'Critical',            hi: 'अत्यंत आवश्यक'        },

  // ── Officer dashboard ─────────────────────────────────────────────────────────
  'officer.taskBoard':   { en: 'Task Board',          hi: 'कार्य बोर्ड'           },
  'officer.activeTasks': { en: 'active tasks assigned to you', hi: 'सक्रिय कार्य आपको सौंपे गए' },
  'officer.accept':      { en: 'Accept',              hi: 'स्वीकार करें'          },
  'officer.startWork':   { en: 'Start Work',          hi: 'कार्य शुरू करें'       },
  'officer.resolve':     { en: 'Resolve ✓',           hi: 'निराकृत करें ✓'        },
  'officer.reaccept':    { en: 'Re-accept',           hi: 'पुनः स्वीकार करें'     },
  'officer.view':        { en: 'View',                hi: 'देखें'                 },
  'officer.allClear':    { en: 'All clear ✓',         hi: 'सब ठीक है ✓'          },
  'officer.resolved':    { en: 'Recently Resolved',   hi: 'हाल ही में निराकृत'    },

  // ── Admin dashboard ───────────────────────────────────────────────────────────
  'admin.commandCenter': { en: 'Command Center',      hi: 'कमांड सेंटर'          },
  'admin.liveMonitor':   { en: 'Live civic grievance monitoring', hi: 'नागरिक शिकायत लाइव निगरानी' },
  'admin.total':         { en: 'Total Complaints',    hi: 'कुल शिकायतें'          },
  'admin.slaBreaches':   { en: 'SLA Breaches',        hi: 'SLA उल्लंघन'          },
  'admin.avgResolution': { en: 'Avg Resolution',      hi: 'औसत समाधान'           },
  'admin.satisfaction':  { en: 'Citizen Satisfaction',hi: 'नागरिक संतोष'          },
  'admin.recentComplaints':{ en: 'Recent Complaints', hi: 'हालिया शिकायतें'       },
  'admin.viewAll':       { en: 'View all →',          hi: 'सभी देखें →'           },
  'admin.criticalZone':  { en: 'Critical Zone Detected', hi: 'गंभीर क्षेत्र चिह्नित' },
  'admin.live':          { en: 'Live',                hi: 'लाइव'                  },

  // ── Common ───────────────────────────────────────────────────────────────────
  'common.loading':      { en: 'Loading…',            hi: 'लोड हो रहा है…'       },
  'common.ticket':       { en: 'Ticket No.',          hi: 'टिकट संख्या'           },
  'common.department':   { en: 'Department',          hi: 'विभाग'                },
  'common.officer':      { en: 'Nodal Officer',       hi: 'नोडल अधिकारी'          },
  'common.filed':        { en: 'Filed',               hi: 'दर्ज तिथि'             },
  'common.location':     { en: 'Location',            hi: 'स्थान'                },
  'common.priority':     { en: 'Priority',            hi: 'प्राथमिकता'            },
  'common.status':       { en: 'Grievance Status',    hi: 'शिकायत की स्थिति'      },
  'common.slaDue':       { en: 'SLA Due',             hi: 'SLA अंतिम तिथि'       },
  'common.activity':     { en: 'Activity',            hi: 'गतिविधि'              },
  'common.escalated':    { en: 'Escalated',           hi: 'एस्केलेटेड'           },
  'common.category':     { en: 'Category',            hi: 'श्रेणी'               },
  'common.helpline':     { en: 'Toll Free Helpline',  hi: 'टोल फ्री हेल्पलाइन'   },
  'common.available247': { en: 'Available 24×7',      hi: '24×7 उपलब्ध'          },
  'common.backToList':   { en: '← Back to complaints', hi: '← शिकायतों पर वापस' },
};

export const useI18n = create<I18nState>((set, get) => ({
  lang: (localStorage.getItem('ps_crm_lang') as Lang) ?? 'en',

  setLang(l: Lang) {
    localStorage.setItem('ps_crm_lang', l);
    set({ lang: l });
  },

  t(key: string): string {
    const { lang } = get();
    const entry = translations[key];
    if (!entry) return key; // fallback to key if missing
    return entry[lang] ?? entry['en'] ?? key;
  },
}));

// Convenience hook shorthand
export function useT() {
  return useI18n(s => s.t);
}