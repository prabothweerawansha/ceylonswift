/**
 * CeylonSwift - Smart & Fast Delivery Management Application Engine
 * Pure Vanilla JavaScript Client-side Multi-Role Operations Engine
 */

// Global Application State Object
let state = {
  packages: [],
  employees: [],
  hubs: [],
  activities: [],
  customerRequests: [],
  activeRole: null, // Portals: 'Owner', 'Office', 'Rider', 'Customer', or null (Public Landing)
  activeTab: 'public-home',
  currentUser: null, // Hold active session user details
  pendingSignups: [], // Queue for rider and office approvals
  tempOTP: null, // Generated Owner OTP verification code
  pendingLoginSession: null, // Holds session during OTP verification
  simulationInterval: null,
  isSimulating: false,
  loggedInRider: null, // Simulated logged-in rider in Rider mode
  authStatus: 'initializing',
  workspaceSelectionPending: false,
  activeWorkspace: null,
  capabilities: null,
  capabilityStatus: 'idle',
  allowedNavigationSections: []
};

const isApiAuthMode = () => (window.CEYLONSWIFT_RUNTIME_CONFIG?.authMode || 'api') === 'api';
window.applyBackendAuthCompatibility = function(snapshot) {
  if (snapshot.mode !== 'api' && snapshot.status !== 'authenticated') return;
  state.authStatus = snapshot.status;
  state.workspaceSelectionPending = snapshot.workspaceSelectionPending === true;
  state.activeWorkspace = snapshot.workspace || null;
  state.capabilities = snapshot.capabilities || null;
  state.capabilityStatus = snapshot.capabilityStatus || 'idle';
  state.activeRole = snapshot.status === 'authenticated' ? snapshot.role : null;
  state.currentUser = snapshot.status === 'authenticated' && snapshot.user ? {
    id: snapshot.user.id,
    name: snapshot.user.profile?.displayName || snapshot.user.normalizedEmail || 'CeylonSwift User',
    email: snapshot.user.normalizedEmail || '',
    phone: snapshot.user.normalizedPhone || '',
    role: snapshot.role || 'Restricted',
    type: snapshot.role === 'Rider' ? 'Field' : snapshot.role === 'Customer' ? 'Customer' : 'Office'
  } : null;
  state.loggedInRider = snapshot.role === 'Rider' ? state.currentUser?.name || null : null;
  applyRoleRouting();
};

// API-mode compatibility is memory-only. It keeps the remaining Phase 7 operational
// prototype able to display rider names without treating legacy localStorage as truth.
window.applyBackendWorkforceCompatibility = function({ employees = [], riders = [] } = {}) {
  if (!isApiAuthMode()) return;
  const byUser = new Map(riders.map(rider => [rider.user?.id, rider]));
  state.employees = employees.map(employee => {
    const rider = byUser.get(employee.user?.id);
    return {
      id: employee.employeeNumber || employee.id,
      backendId: employee.id,
      backendUserId: employee.user?.id,
      backendRiderId: rider?.id || employee.user?.riderProfile?.id || null,
      name: employee.user?.profile?.displayName || 'CeylonSwift teammate',
      role: employee.jobTitle || employee.user?.roles?.[0]?.name || 'Team member',
      type: rider ? 'Field' : 'Office',
      hub: employee.primaryBranch?.name || 'Unassigned',
      phone: employee.user?.normalizedPhone || '',
      rating: 5,
      ...(rider ? { status: rider.riderStatus === 'AVAILABLE' ? 'Available' : rider.riderStatus === 'ASSIGNED' ? 'Out for Delivery' : 'Off Duty' } : {})
    };
  });
  state.pendingSignups = [];
};
window.getAvailableBackendRider = function() { return state.employees.find(item => item.backendRiderId && item.status === 'Available') || null; };

// Phase 7 API-mode operational records are adapted in memory only. The legacy
// localStorage keys remain untouched for explicit legacy-demo mode.
window.applyBackendOperationsCompatibility = function({ packages = [], customerRequests = [], hubs = [], activities = [] } = {}) {
  if (!isApiAuthMode()) return;
  state.packages = packages;
  state.customerRequests = customerRequests;
  state.hubs = hubs;
  state.activities = activities;
  renderPackagesTable();
  renderCustomerRequestsList();
  renderHubs();
  renderHomeHubs();
  renderDashboard();
};

window.showBackendOtpChallenge = function(challenge) {
  state.pendingLoginSession = { backend: true, challengeId: challenge.challengeId };
};
window.getBackendOtpChallengeId = () => state.pendingLoginSession?.backend ? state.pendingLoginSession.challengeId : null;
window.showBackendWorkspaceSelector = function(workspaces, selectWorkspace) {
  const modal = document.getElementById('workspaceSelectorModal');
  const list = document.getElementById('workspace-selector-list');
  if (!modal || !list) return;
  list.replaceChildren(...workspaces.map(workspace => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-secondary';
    button.textContent = `${workspace.displayName} · ${workspace.type === 'PERSONAL' ? 'Personal' : 'Organization'}`;
    button.addEventListener('click', async () => { button.disabled = true; try { await selectWorkspace(workspace.id); closeModal('workspaceSelectorModal'); } finally { button.disabled = false; } });
    return button;
  }));
  openModal('workspaceSelectorModal');
};

// Initial Mock Datasets representing real Sri Lankan hubs & logistics data
const INITIAL_HUBS = [
  { id: 'Colombo', name: 'Colombo Main Hub', district: 'Colombo', capacity: 1500, activePkgs: 0, riders: 0, speed: '100%' },
  { id: 'Kandy', name: 'Kandy Central Hub', district: 'Kandy', capacity: 800, activePkgs: 0, riders: 0, speed: '100%' },
  { id: 'Galle', name: 'Galle Coast Hub', district: 'Galle', capacity: 600, activePkgs: 0, riders: 0, speed: '100%' },
  { id: 'Jaffna', name: 'Jaffna Northern Hub', district: 'Jaffna', capacity: 500, activePkgs: 0, riders: 0, speed: '100%' },
  { id: 'Gampaha', name: 'Gampaha Sorting Hub', district: 'Gampaha', capacity: 1000, activePkgs: 0, riders: 0, speed: '100%' },
  { id: 'Kurunegala', name: 'Kurunegala Hub', district: 'Kurunegala', capacity: 700, activePkgs: 0, riders: 0, speed: '100%' }
];

const INITIAL_EMPLOYEES = [
  { id: 'EMP-001', name: 'Praboth Weerasinghe', role: 'System Owner', type: 'Office', hub: 'Colombo', phone: '0770000001', email: 'prabothweerawansha@gmail.com', rating: 5.0 }
];

const INITIAL_PACKAGES = [];
const INITIAL_ACTIVITIES = [];
const INITIAL_CUST_REQUESTS = [];

const STORAGE_FIELDS = {
  packages: { storageKey: 'ceylonswift_packages', initialValue: INITIAL_PACKAGES },
  employees: { storageKey: 'ceylonswift_employees', initialValue: INITIAL_EMPLOYEES },
  hubs: { storageKey: 'ceylonswift_hubs', initialValue: INITIAL_HUBS },
  activities: { storageKey: 'ceylonswift_activities', initialValue: INITIAL_ACTIVITIES },
  customerRequests: { storageKey: 'ceylonswift_custrequests', initialValue: INITIAL_CUST_REQUESTS },
  pendingSignups: { storageKey: 'ceylonswift_pending_signups', initialValue: [] }
};

const STATE_KEY_ALIASES = {
  custrequests: 'customerRequests',
  pendingsignups: 'pendingSignups'
};

const SUPPORTED_LANGUAGES = ['en', 'si', 'ta'];
const LANGUAGE_STORAGE_KEY = 'ceylonswift_language';
const PERFORMANCE_STORAGE_KEY = 'ceylonswift_performance';
const PERFORMANCE_MODES = ['auto', 'full', 'lite'];
const NAVIGATION_STORAGE_KEY = 'ceylonswift_active_section';
const PUBLIC_NAVIGATION_SECTION = 'public-home';
const ROLE_NAVIGATION_SECTIONS = Object.freeze({
  Owner: Object.freeze(['dashboard', 'packages', 'hubs', 'employees', 'accesscontrol', 'simulator']),
  Office: Object.freeze(['dashboard', 'packages', 'hubs', 'accesscontrol', 'simulator']),
  Rider: Object.freeze(['packages', 'simulator']),
  Customer: Object.freeze(['customertrack', 'customerrequest', 'hubs'])
});
const ROLE_DEFAULT_SECTIONS = Object.freeze({ Owner: 'dashboard', Office: 'dashboard', Rider: 'packages', Customer: 'customertrack' });

function readSavedNavigationSection() {
  try {
    return localStorage.getItem(NAVIGATION_STORAGE_KEY);
  } catch (_) {
    return null;
  }
}

function resolveNavigationSection(role, savedSection = readSavedNavigationSection(), capabilitySections = null) {
  const allowedSections = Array.isArray(capabilitySections) ? capabilitySections : (ROLE_NAVIGATION_SECTIONS[role] || []);
  return allowedSections.includes(savedSection) ? savedSection : (allowedSections[0] || ROLE_DEFAULT_SECTIONS[role] || PUBLIC_NAVIGATION_SECTION);
}

function persistNavigationSection(sectionId) {
  if (sectionId === 'access-unavailable') return false;
  const allowedSections = isApiAuthMode() && state.authStatus === 'authenticated' ? state.allowedNavigationSections : (state.activeRole ? (ROLE_NAVIGATION_SECTIONS[state.activeRole] || []) : [PUBLIC_NAVIGATION_SECTION]);
  if (!allowedSections.includes(sectionId)) return false;
  try {
    localStorage.setItem(NAVIGATION_STORAGE_KEY, sectionId);
    return true;
  } catch (_) {
    return false;
  }
}

function resetSavedNavigationSection() {
  try {
    localStorage.setItem(NAVIGATION_STORAGE_KEY, PUBLIC_NAVIGATION_SECTION);
  } catch (_) {}
}

function shouldResetSavedNavigationSection(role = state.activeRole, authStatus = state.authStatus, workspaceSelectionPending = state.workspaceSelectionPending) {
  return role === null && authStatus !== 'initializing' && !workspaceSelectionPending;
}

const TRANSLATIONS = {
  en: {
    navTrack: 'Track', navServices: 'Services', navHubs: 'Hubs', navHelp: 'Help', navAbout: 'About',
    getStarted: 'Get Started', heroBadge: "Sri Lanka's Premium Speed Courier",
    heroTitle: 'Lightning Fast Deliveries Across Sri Lanka',
    heroSubtitle: "CeylonSwift is Sri Lanka's smartest, fastest, and most reliable logistics ecosystem. With 6 ultra-capacity sorting centers and live GPS tracked courier dispatches, we deliver your promises on time, every time.",
    getStartedNow: 'Get Started Now', trackShipment: 'Track Shipment',
    trackerTitle: 'Global Quick Shipment Tracker', trackerSubtitle: "Enter your unique CeylonSwift reference code below to see your package's real-time journey.",
    trackingPlaceholder: 'Enter Tracking ID (e.g., CS-4821)...',
    servicesTitle: 'Delivery Services Built Around Your Schedule', servicesSubtitle: 'Choose the right delivery speed, then calculate the live fee using the connected CeylonSwift rate engine.',
    hubsTitle: 'Our Active Sorting Hubs Network', hubsSubtitle: 'Real-time status, processing speed, and rider density of our Sri Lankan regional centers.',
    supportKicker: 'Support center', supportTitle: 'Need help with a delivery?', supportCopy: 'Track an active parcel first, or open your account workspace for shipment, rider, billing, and delivery support.',
    trackParcel: 'Track a Parcel', supportPortal: 'Open Support Portal', aboutKicker: 'About CeylonSwift',
    aboutTitle: 'One connected delivery network, built for Sri Lanka.', aboutCopy: 'CeylonSwift connects customer requests, office operations, sorting hubs, riders, tracking, and delivery pricing in one logistics workspace. Every public tool on this page uses the same application data and operational workflows available inside the portal.',
    seoTitle: "CeylonSwift | Sri Lanka's Smartest & Fastest Delivery Service",
    seoDescription: 'Track parcels, compare delivery services, calculate rates, and connect with CeylonSwift across Sri Lanka.',
    settingsTitle: 'Website settings', settingsSubtitle: 'Personalize your experience', themeSetting: 'Appearance', languageSetting: 'Language', languageHint: 'Choose your preferred language', performanceSetting: 'Performance', performanceAuto: 'Auto', performanceFull: 'Full quality', performanceLite: 'Optimized', themeDark: 'Dark theme', themeLight: 'Light theme', statusFull: 'Full quality active', statusLite: 'Optimized for this device', statusAutoFull: 'Auto · Full quality', statusAutoLite: 'Auto · Optimized'
  },
  si: {
    navTrack: 'හඹායන්න', navServices: 'සේවා', navHubs: 'මධ්‍යස්ථාන', navHelp: 'උදව්', navAbout: 'අප ගැන',
    getStarted: 'ආරම්භ කරන්න', heroBadge: 'ශ්‍රී ලංකාවේ ප්‍රමුඛ වේගවත් කුරියර් සේවාව',
    heroTitle: 'ශ්‍රී ලංකාව පුරා අකුණු වේගයෙන් බෙදාහැරීම්',
    heroSubtitle: 'CeylonSwift යනු ශ්‍රී ලංකාවේ බුද්ධිමත්, වේගවත් සහ විශ්වාසදායක සැපයුම් ජාලයකි. සජීවී GPS හඹායෑම සහ සම්බන්ධිත වර්ගීකරණ මධ්‍යස්ථාන සමඟ ඔබේ භාණ්ඩ නියමිත වේලාවට ලබා දෙමු.',
    getStartedNow: 'දැන් ආරම්භ කරන්න', trackShipment: 'භාණ්ඩය හඹායන්න',
    trackerTitle: 'ඉක්මන් භාණ්ඩ හඹායෑම', trackerSubtitle: 'ඔබේ භාණ්ඩයේ සජීවී ගමන බැලීමට CeylonSwift යොමු අංකය ඇතුළත් කරන්න.',
    trackingPlaceholder: 'හඹායෑම් අංකය ඇතුළත් කරන්න (උදා: CS-4821)...',
    servicesTitle: 'ඔබේ කාලසටහනට ගැළපෙන බෙදාහැරීමේ සේවා', servicesSubtitle: 'සුදුසු බෙදාහැරීමේ වේගය තෝරා සජීවී ගාස්තුව ගණනය කරන්න.',
    hubsTitle: 'අපගේ සක්‍රීය වර්ගීකරණ මධ්‍යස්ථාන', hubsSubtitle: 'ශ්‍රී ලංකාව පුරා මධ්‍යස්ථානවල සජීවී තත්ත්වය, සැකසුම් වේගය සහ ධාවක ඝනත්වය.',
    supportKicker: 'සහාය මධ්‍යස්ථානය', supportTitle: 'බෙදාහැරීමක් සම්බන්ධයෙන් උදව් අවශ්‍යද?', supportCopy: 'පළමුව සක්‍රීය භාණ්ඩයක් හඹායන්න, නැතිනම් සහාය සඳහා ඔබේ ගිණුම් අවකාශය විවෘත කරන්න.',
    trackParcel: 'භාණ්ඩයක් හඹායන්න', supportPortal: 'සහාය ද්වාරය විවෘත කරන්න', aboutKicker: 'CeylonSwift ගැන',
    aboutTitle: 'ශ්‍රී ලංකාව සඳහා නිර්මාණය කළ එකම සම්බන්ධිත බෙදාහැරීමේ ජාලයක්.', aboutCopy: 'CeylonSwift පාරිභෝගික ඉල්ලීම්, කාර්යාල මෙහෙයුම්, මධ්‍යස්ථාන, ධාවකයන්, හඹායෑම සහ මිල ගණනය එකම සැපයුම් අවකාශයක සම්බන්ධ කරයි.',
    seoTitle: 'CeylonSwift | ශ්‍රී ලංකාවේ වේගවත් බෙදාහැරීමේ සේවාව',
    seoDescription: 'ශ්‍රී ලංකාව පුරා භාණ්ඩ හඹායන්න, සේවා සසඳන්න සහ බෙදාහැරීමේ ගාස්තු ගණනය කරන්න.',
    settingsTitle: 'වෙබ් අඩවි සැකසුම්', settingsSubtitle: 'ඔබේ අත්දැකීම සකසන්න', themeSetting: 'පෙනුම', languageSetting: 'භාෂාව', languageHint: 'ඔබ කැමති භාෂාව තෝරන්න', performanceSetting: 'කාර්ය සාධනය', performanceAuto: 'ස්වයංක්‍රීය', performanceFull: 'උසස් ගුණාත්මක', performanceLite: 'ප්‍රශස්ත', themeDark: 'අඳුරු තේමාව', themeLight: 'ආලෝක තේමාව', statusFull: 'උසස් ගුණාත්මකභාවය සක්‍රීයයි', statusLite: 'මෙම උපාංගයට ප්‍රශස්තයි', statusAutoFull: 'ස්වයංක්‍රීය · උසස් ගුණාත්මක', statusAutoLite: 'ස්වයංක්‍රීය · ප්‍රශස්ත'
  },
  ta: {
    navTrack: 'கண்காணிப்பு', navServices: 'சேவைகள்', navHubs: 'மையங்கள்', navHelp: 'உதவி', navAbout: 'எங்களைப் பற்றி',
    getStarted: 'தொடங்குங்கள்', heroBadge: 'இலங்கையின் முன்னணி விரைவு கூரியர் சேவை',
    heroTitle: 'இலங்கை முழுவதும் மின்னல் வேக விநியோகம்',
    heroSubtitle: 'CeylonSwift இலங்கையின் புத்திசாலித்தனமான, வேகமான மற்றும் நம்பகமான தளவாட வலையமைப்பு. நேரடி GPS கண்காணிப்பு மற்றும் இணைக்கப்பட்ட வரிசைப்படுத்தல் மையங்களுடன் உங்கள் பொதிகளை சரியான நேரத்தில் வழங்குகிறோம்.',
    getStartedNow: 'இப்போது தொடங்குங்கள்', trackShipment: 'பொதியைக் கண்காணிக்கவும்',
    trackerTitle: 'விரைவு பொதி கண்காணிப்பு', trackerSubtitle: 'உங்கள் பொதியின் நேரடி பயணத்தைப் பார்க்க CeylonSwift குறிப்பு எண்ணை உள்ளிடவும்.',
    trackingPlaceholder: 'கண்காணிப்பு எண்ணை உள்ளிடவும் (உதா: CS-4821)...',
    servicesTitle: 'உங்கள் நேர அட்டவணைக்கு ஏற்ற விநியோக சேவைகள்', servicesSubtitle: 'சரியான விநியோக வேகத்தைத் தேர்ந்தெடுத்து நேரடி கட்டணத்தைக் கணக்கிடுங்கள்.',
    hubsTitle: 'எங்கள் செயலில் உள்ள வரிசைப்படுத்தல் மையங்கள்', hubsSubtitle: 'இலங்கை பிராந்திய மையங்களின் நேரடி நிலை, செயலாக்க வேகம் மற்றும் ஓட்டுநர் அடர்த்தி.',
    supportKicker: 'உதவி மையம்', supportTitle: 'விநியோகத்திற்கு உதவி தேவையா?', supportCopy: 'முதலில் செயலில் உள்ள பொதியைக் கண்காணிக்கவும் அல்லது உதவிக்காக உங்கள் கணக்கு பணியிடத்தைத் திறக்கவும்.',
    trackParcel: 'பொதியைக் கண்காணிக்கவும்', supportPortal: 'உதவி தளத்தைத் திறக்கவும்', aboutKicker: 'CeylonSwift பற்றி',
    aboutTitle: 'இலங்கைக்காக உருவாக்கப்பட்ட ஒரே இணைந்த விநியோக வலையமைப்பு.', aboutCopy: 'CeylonSwift வாடிக்கையாளர் கோரிக்கைகள், அலுவலக செயல்பாடுகள், மையங்கள், ஓட்டுநர்கள், கண்காணிப்பு மற்றும் விலையிடலை ஒரே தளவாட பணியிடத்தில் இணைக்கிறது.',
    seoTitle: 'CeylonSwift | இலங்கையின் விரைவு விநியோக சேவை',
    seoDescription: 'இலங்கை முழுவதும் பொதிகளைக் கண்காணித்து, சேவைகளை ஒப்பிட்டு, விநியோக கட்டணங்களைக் கணக்கிடுங்கள்.',
    settingsTitle: 'இணையதள அமைப்புகள்', settingsSubtitle: 'உங்கள் அனுபவத்தை தனிப்பயனாக்குங்கள்', themeSetting: 'தோற்றம்', languageSetting: 'மொழி', languageHint: 'விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்', performanceSetting: 'செயல்திறன்', performanceAuto: 'தானியங்கி', performanceFull: 'முழுத் தரம்', performanceLite: 'உகந்தது', themeDark: 'இருண்ட தீம்', themeLight: 'ஒளி தீம்', statusFull: 'முழுத் தரம் செயலில்', statusLite: 'இந்த சாதனத்திற்கு உகந்தது', statusAutoFull: 'தானியங்கி · முழுத் தரம்', statusAutoLite: 'தானியங்கி · உகந்தது'
  }
};

/* Initialize Application & LocalStorage */
window.addEventListener('DOMContentLoaded', () => {
  initLocalStorage();
  updateLiveClock();
  setInterval(updateLiveClock, 1000);
  initTheme();
  initLanguage();
  initPerformanceMode();
  initSettingsMenu();
  
  // Set default view on load
  applyRoleRouting();
  initFloatingNavbar();
});

function initFloatingNavbar() {
  const navbar = document.querySelector('.public-navbar');
  if (!navbar) return;

  const sectionLinks = [...navbar.querySelectorAll('.nav-links a')];
  let frameId = 0;
  let isScrolled = null;
  let scrollEndTimer = 0;
  let scrollActive = false;
  let lastScrollY = Math.max(0, window.scrollY);
  let targetProgress = Math.min(1, lastScrollY / 160);
  let currentProgress = targetProgress;
  let springVelocity = 0;
  let directionalVelocity = 0;
  let lastFrameTime = performance.now();

  const renderNavbar = () => {
    const directionalLift = directionalVelocity * -0.65;
    const scale = 1 - (currentProgress * 0.035);
    const shift = (-6 * currentProgress) + directionalLift;
    navbar.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0) scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
  };

  const animateNavbar = now => {
    const deltaFrames = Math.min(2, Math.max(0.5, (now - lastFrameTime) / 16.667));
    lastFrameTime = now;

    const springForce = (targetProgress - currentProgress) * 0.18 * deltaFrames;
    springVelocity = (springVelocity + springForce) * Math.pow(0.68, deltaFrames);
    currentProgress += springVelocity * deltaFrames;
    directionalVelocity *= Math.pow(0.82, deltaFrames);
    renderNavbar();

    const progressSettled = Math.abs(targetProgress - currentProgress) < 0.0005;
    const velocitySettled = Math.abs(springVelocity) < 0.0005 && Math.abs(directionalVelocity) < 0.004;
    if (progressSettled && velocitySettled) {
      currentProgress = targetProgress;
      springVelocity = 0;
      directionalVelocity = 0;
      renderNavbar();
      frameId = 0;
      return;
    }

    frameId = window.requestAnimationFrame(animateNavbar);
  };

  const syncScrollTarget = (addImpulse = true) => {
    const y = Math.max(0, window.scrollY);
    const nextScrolled = y > 12;
    targetProgress = Math.min(1, y / 160);

    if (addImpulse) {
      const scrollDelta = y - lastScrollY;
      const impulse = Math.max(-1, Math.min(1, scrollDelta / 36));
      directionalVelocity += (impulse - directionalVelocity) * 0.28;
    }
    lastScrollY = y;

    if (nextScrolled !== isScrolled) {
      navbar.classList.toggle('is-scrolled', nextScrolled);
      isScrolled = nextScrolled;
    }

    if (!frameId) {
      lastFrameTime = performance.now();
      frameId = window.requestAnimationFrame(animateNavbar);
    }
  };

  window.addEventListener('scroll', () => {
    if (!scrollActive) {
      document.body.classList.add('is-scrolling');
      scrollActive = true;
    }
    syncScrollTarget(true);
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(() => {
      document.body.classList.remove('is-scrolling');
      scrollActive = false;
    }, 120);
  }, { passive: true });

  const observedSections = ['home-hero', 'home-tracking', 'home-services', 'home-hubs', 'home-help', 'home-about']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  const sectionObserver = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    sectionLinks.forEach(link => {
      const target = link.getAttribute('onclick') || '';
      link.classList.toggle('active', target.includes(`'${visible.target.id}'`));
    });
  }, { rootMargin: '-32% 0px -55%', threshold: [0, 0.15, 0.45] });

  observedSections.forEach(section => sectionObserver.observe(section));
  renderNavbar();
  syncScrollTarget(false);
}

function initLocalStorage() {
  Object.entries(STORAGE_FIELDS).forEach(([stateKey, config]) => {
    if (isApiAuthMode() && ['employees', 'pendingSignups', 'packages', 'customerRequests', 'hubs', 'activities'].includes(stateKey)) {
      state[stateKey] = [];
      return;
    }
    const storedValue = localStorage.getItem(config.storageKey);
    if (storedValue === null) {
      state[stateKey] = structuredClone(config.initialValue);
      localStorage.setItem(config.storageKey, JSON.stringify(state[stateKey]));
      return;
    }

    try {
      const parsedValue = JSON.parse(storedValue);
      state[stateKey] = Array.isArray(parsedValue)
        ? parsedValue
        : structuredClone(config.initialValue);
    } catch {
      state[stateKey] = structuredClone(config.initialValue);
      localStorage.setItem(config.storageKey, JSON.stringify(state[stateKey]));
    }
  });
}

function saveState(key) {
  const stateKey = STATE_KEY_ALIASES[key] || key;
  if (isApiAuthMode() && ['employees', 'pendingSignups', 'packages', 'customerRequests', 'hubs', 'activities'].includes(stateKey)) return;
  const config = STORAGE_FIELDS[stateKey];
  if (!config) return;
  localStorage.setItem(config.storageKey, JSON.stringify(state[stateKey]));
}

function detectBrowserLanguage() {
  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  const detected = browserLanguages
    .map(language => language.toLowerCase().split('-')[0])
    .find(language => SUPPORTED_LANGUAGES.includes(language));
  return detected || 'en';
}

function initLanguage() {
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const language = SUPPORTED_LANGUAGES.includes(savedLanguage) ? savedLanguage : detectBrowserLanguage();
  applyLanguage(language, { persist: false });
}

function changeLanguage(language) {
  if (!SUPPORTED_LANGUAGES.includes(language)) return;
  applyLanguage(language, { persist: true });
}

function applyLanguage(language, { persist = false } = {}) {
  const translations = TRANSLATIONS[language] || TRANSLATIONS.en;
  document.documentElement.lang = language;

  document.querySelectorAll('[data-i18n]').forEach(element => {
    const value = translations[element.dataset.i18n];
    if (value) element.textContent = value;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const value = translations[element.dataset.i18nPlaceholder];
    if (value) element.placeholder = value;
  });

  const selector = document.getElementById('language-selector');
  if (selector) selector.value = language;

  document.title = translations.seoTitle;
  const description = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (description) description.content = translations.seoDescription;
  if (ogTitle) ogTitle.content = translations.seoTitle;
  if (ogDescription) ogDescription.content = translations.seoDescription;
  updateSettingsUI();

  if (!persist) return;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  saveUserLanguagePreference(language);
}

function saveUserLanguagePreference(language) {
  if (!state.currentUser) return;
  state.currentUser.language = language;
  const employee = state.employees.find(item => item.id === state.currentUser.id);
  if (employee) {
    employee.language = language;
    saveState('employees');
  }
}

function isLowEndDevice() {
  const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2;
  const lowCpu = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2;
  const saveData = navigator.connection?.saveData === true;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  return lowMemory || lowCpu || saveData || reducedMotion;
}

function initPerformanceMode() {
  const savedMode = localStorage.getItem(PERFORMANCE_STORAGE_KEY);
  const mode = PERFORMANCE_MODES.includes(savedMode) ? savedMode : 'auto';
  applyPerformanceMode(mode, { persist: false });
}

function changePerformanceMode(mode) {
  if (!PERFORMANCE_MODES.includes(mode)) return;
  applyPerformanceMode(mode, { persist: true });
}

function applyPerformanceMode(mode, { persist = false } = {}) {
  const useLiteMode = mode === 'lite' || (mode === 'auto' && isLowEndDevice());
  document.body.classList.toggle('performance-lite', useLiteMode);
  document.body.dataset.performanceMode = mode;

  const selector = document.getElementById('performance-selector');
  if (selector) selector.value = mode;
  updateSettingsUI();
  window.dispatchEvent(new Event('scroll'));

  if (!persist) return;
  localStorage.setItem(PERFORMANCE_STORAGE_KEY, mode);
  saveUserPreference('performanceMode', mode);
}

function saveUserPreference(key, value) {
  if (!state.currentUser) return;
  state.currentUser[key] = value;
  const employee = state.employees.find(item => item.id === state.currentUser.id);
  if (employee) {
    employee[key] = value;
    saveState('employees');
  }
}

function toggleSettingsMenu(forceOpen) {
  const menu = document.getElementById('settings-menu');
  const trigger = document.getElementById('settings-trigger');
  if (!menu || !trigger) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : menu.hidden;
  menu.hidden = !shouldOpen;
  trigger.setAttribute('aria-expanded', String(shouldOpen));
}

function initSettingsMenu() {
  document.addEventListener('click', event => {
    const menu = document.getElementById('settings-menu');
    const trigger = document.getElementById('settings-trigger');
    if (!menu || menu.hidden || menu.contains(event.target) || trigger.contains(event.target)) return;
    toggleSettingsMenu(false);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') toggleSettingsMenu(false);
  });

  window.addEventListener('scroll', event => {
    if (!event.isTrusted) return;
    const menu = document.getElementById('settings-menu');
    if (menu && !menu.hidden) toggleSettingsMenu(false);
  }, { passive: true });
}

function updateSettingsUI() {
  const language = SUPPORTED_LANGUAGES.includes(document.documentElement.lang) ? document.documentElement.lang : 'en';
  const translations = TRANSLATIONS[language];
  const isLight = document.body.classList.contains('light-theme');
  const mode = document.body.dataset.performanceMode || 'auto';
  const isLite = document.body.classList.contains('performance-lite');
  const themeLabel = document.getElementById('settings-theme-label');
  const performanceStatus = document.getElementById('performance-status');
  if (themeLabel) themeLabel.textContent = isLight ? translations.themeLight : translations.themeDark;
  if (performanceStatus) {
    performanceStatus.textContent = mode === 'auto'
      ? (isLite ? translations.statusAutoLite : translations.statusAutoFull)
      : (isLite ? translations.statusLite : translations.statusFull);
  }
}

/* ==================== 🔑 MULTI-ROLE PORTAL SWITCHING ENGINE ==================== */

function applyRoleRouting() {
  if (state.currentUser?.theme === 'light' || state.currentUser?.theme === 'dark') {
    document.body.classList.toggle('light-theme', state.currentUser.theme === 'light');
    localStorage.setItem('ceylonswift_theme', state.currentUser.theme);
    updateThemeUI();
  }
  if (state.currentUser?.language && SUPPORTED_LANGUAGES.includes(state.currentUser.language)) {
    applyLanguage(state.currentUser.language, { persist: false });
  }
  if (state.currentUser?.performanceMode && PERFORMANCE_MODES.includes(state.currentUser.performanceMode)) {
    applyPerformanceMode(state.currentUser.performanceMode, { persist: false });
  }

  const menuContainer = document.getElementById('sidebar-nav-menu');
  if (!menuContainer) return;
  menuContainer.innerHTML = '';
  
  const body = document.body;
  const sessionBar = document.getElementById('session-control-bar');
  
  if (state.activeRole === null) {
    // Guest Welcome Mode
    body.classList.add('public-view');
    if (sessionBar) sessionBar.style.display = 'none';
    
    state.activeTab = PUBLIC_NAVIGATION_SECTION;
    if (shouldResetSavedNavigationSection()) resetSavedNavigationSection();
    displayTabSection(PUBLIC_NAVIGATION_SECTION, { persist: false });
    return;
  }
  
  // Authenticated Workspace Mode
  body.classList.remove('public-view');
  if (sessionBar) {
    sessionBar.style.display = 'flex';
    
    // Update badge and username
    const activeBadge = document.getElementById('session-active-badge');
    const userInfo = document.getElementById('session-user-info');
    
    if (activeBadge) {
      activeBadge.className = `role-tag ${state.activeRole.toLowerCase()}`;
      let emoji = '👤';
      if (state.activeRole === 'Owner') emoji = '👑';
      if (state.activeRole === 'Office') emoji = '🏢';
      if (state.activeRole === 'Rider') emoji = '🏍️';
      activeBadge.textContent = `${state.activeRole} Portal ${emoji}`;
    }
    
    if (userInfo && state.currentUser) {
      userInfo.textContent = state.currentUser.name || state.currentUser.phone || state.currentUser.email || 'Active Operator';
    }
  }

  // Navigation Menu Maps depending on Roles
  if (isApiAuthMode() && window.ceylonSwiftNavigation?.render) {
    const navigation = window.ceylonSwiftNavigation.render(menuContainer, { capabilities: state.capabilities, capabilityStatus: state.capabilityStatus }, section => displayTabSection(section));
    state.allowedNavigationSections = navigation.allowedSections.length ? navigation.allowedSections : ['access-unavailable'];
    state.activeTab = resolveNavigationSection(state.activeRole, readSavedNavigationSection(), state.allowedNavigationSections);
    window.ceylonSwiftNavigation.activate(menuContainer, state.activeTab);
    displayTabSection(state.activeTab, { persist: state.activeTab !== 'access-unavailable' });
    applyCapabilityVisibility();
    return;
  }

  let navItemsHtml = '';
  
  if (state.activeRole === 'Owner') {
    navItemsHtml = `
      <div class="nav-item active" data-tab="dashboard">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
        <span class="nav-text">Dashboard</span>
      </div>
      <div class="nav-item" data-tab="packages">
        <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        <span class="nav-text">Packages</span>
      </div>
      <div class="nav-item" data-tab="hubs">
        <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span class="nav-text">Hubs & Rates</span>
      </div>
      <div class="nav-item" data-tab="employees">
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span class="nav-text">Employees</span>
      </div>
      <div class="nav-item" data-tab="accesscontrol">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span class="nav-text">Verifications 🔐</span>
      </div>
      <div class="nav-item" data-tab="simulator">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <span class="nav-text">Speed Sim ⚡</span>
      </div>
    `;
  } 
  else if (state.activeRole === 'Office') {
    navItemsHtml = `
      <div class="nav-item active" data-tab="dashboard">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
        <span class="nav-text">Dashboard</span>
      </div>
      <div class="nav-item" data-tab="packages">
        <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        <span class="nav-text">Packages</span>
      </div>
      <div class="nav-item" data-tab="hubs">
        <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span class="nav-text">Hubs & Rates</span>
      </div>
      <div class="nav-item" data-tab="accesscontrol">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span class="nav-text">Verifications 🔐</span>
      </div>
      <div class="nav-item" data-tab="simulator">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <span class="nav-text">Speed Sim ⚡</span>
      </div>
    `;
  } 
  else if (state.activeRole === 'Rider') {
    navItemsHtml = `
      <div class="nav-item active" data-tab="packages">
        <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        <span class="nav-text">My Deliveries 🏍️</span>
      </div>
      <div class="nav-item" data-tab="simulator">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <span class="nav-text">Speed Sim ⚡</span>
      </div>
    `;
  } 
  else if (state.activeRole === 'Customer') {
    navItemsHtml = `
      <div class="nav-item active" data-tab="customertrack">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span class="nav-text">Track Shipment</span>
      </div>
      <div class="nav-item" data-tab="customerrequest">
        <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <span class="nav-text">Book Delivery 📦</span>
      </div>
      <div class="nav-item" data-tab="hubs">
        <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span class="nav-text">Hubs & Rates</span>
      </div>
    `;
  }

  menuContainer.innerHTML = navItemsHtml;

  // Restore navigation only after the backend-derived role/workspace routing is complete.
  state.activeTab = resolveNavigationSection(state.activeRole);

  // Add click events to newly generated items
  const navItems = menuContainer.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-tab') === state.activeTab);
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      
      const targetTab = item.getAttribute('data-tab');
      displayTabSection(targetTab);
    });
  });

  // Display initial active section
  displayTabSection(state.activeTab);
  
  // Show / Hide pending customer requests panel based on roles
  const requestPanel = document.getElementById('customer-requests-panel');
  if (requestPanel) {
    if (state.activeRole === 'Owner' || state.activeRole === 'Office') {
      requestPanel.style.display = 'block';
      renderCustomerRequestsList();
    } else {
      requestPanel.style.display = 'none';
    }
  }

  // Handle specific elements updates per roles
  const dbActionGroup = document.getElementById('dashboard-header-actions');
  if (dbActionGroup) {
    if (state.activeRole === 'Office' || state.activeRole === 'Owner') {
      dbActionGroup.style.display = 'block';
    } else {
      dbActionGroup.style.display = 'none';
    }
  }

  // Toggle database reset button for Owner only
  const resetDbBtn = document.getElementById('owner-reset-db-btn');
  if (resetDbBtn) {
    if (state.activeRole === 'Owner') {
      resetDbBtn.style.display = 'inline-flex';
    } else {
      resetDbBtn.style.display = 'none';
    }
  }
}

function applyCapabilityVisibility() {
  const permissions = new Set(state.capabilities?.permissions || []);
  const requestPanel = document.getElementById('customer-requests-panel');
  if (requestPanel) { requestPanel.style.display = permissions.has('package.update') ? 'block' : 'none'; if (permissions.has('package.update')) renderCustomerRequestsList(); }
  const dashboardActions = document.getElementById('dashboard-header-actions');
  if (dashboardActions) dashboardActions.style.display = permissions.has('package.create') ? 'block' : 'none';
  const resetButton = document.getElementById('owner-reset-db-btn');
  if (resetButton) resetButton.style.display = permissions.has('system.reset') ? 'inline-flex' : 'none';
}

function displayTabSection(tabId, { persist = true } = {}) {
  state.activeTab = tabId;
  if (persist) persistNavigationSection(tabId);
  
  document.querySelectorAll('.tab-section').forEach(section => {
    section.classList.remove('active');
  });
  
  const targetSection = document.getElementById(tabId);
  if (targetSection) targetSection.classList.add('active');

  // Trigger dynamic renderings
  if (tabId === 'public-home') {
    renderHomeHubs();
    calculateHomeRate();
  } else if (tabId === 'dashboard') {
    renderDashboard();
  } else if (tabId === 'packages') {
    renderPackagesTable();
  } else if (tabId === 'hubs') {
    renderHubs();
    calculateDynamicRate();
  } else if (tabId === 'employees') {
    renderEmployeesGrid();
  } else if (tabId === 'accesscontrol') {
    renderVerificationBoard();
  } else if (tabId === 'simulator') {
    populateSimSelector();
    loadSimPackage();
  }
}

/* ==================== 📊 DASHBOARD & METRICS ==================== */

function renderDashboard() {
  const totalPkgs = state.packages.length;
  const activeRiders = state.employees.filter(emp => emp.type === 'Field' && emp.status !== 'Off Duty').length;
  
  let totalRevenue = 0;
  state.packages.forEach(pkg => {
    totalRevenue += pkg.fee;
    if (pkg.status === 'Delivered' && pkg.payment === 'COD') {
      totalRevenue += pkg.codVal;
    }
  });

  const deliveredCount = state.packages.filter(p => p.status === 'Delivered').length;
  const successRate = totalPkgs > 0 ? ((deliveredCount / totalPkgs) * 100).toFixed(1) + '%' : '100%';

  document.getElementById('stat-total-pkgs').textContent = totalPkgs;
  document.getElementById('stat-active-riders').textContent = activeRiders;
  document.getElementById('stat-revenue').textContent = `LKR ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('stat-success-rate').textContent = successRate;

  // Render Activity Log
  const feedEl = document.getElementById('live-activity-feed');
  if (feedEl) {
    feedEl.innerHTML = '';
    state.activities.slice().reverse().forEach(act => {
      feedEl.innerHTML += `
        <div class="activity-item">
          <div class="activity-dot ${act.type}"></div>
          <div class="activity-details">
            <p>${act.text}</p>
            <span>${act.time}</span>
          </div>
        </div>
      `;
    });
  }

  setTimeout(drawRegionalChart, 50);
}

function drawRegionalChart() {
  const canvas = document.getElementById('regionalChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const gridY = 20 + ((h - 60) / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(40, gridY);
    ctx.lineTo(w - 20, gridY);
    ctx.stroke();
  }

  const hubData = {};
  state.hubs.forEach(hub => {
    hubData[hub.id] = 0;
  });
  state.packages.forEach(pkg => {
    if (hubData[pkg.hub] !== undefined) {
      hubData[pkg.hub]++;
    }
  });

  const hubKeys = Object.keys(hubData);
  const maxVal = Math.max(...Object.values(hubData), 5);

  const chartX = 50;
  const chartY = h - 40;
  const chartW = w - 70;
  const chartH = h - 60;
  const barGap = 15;
  const barW = (chartW - (barGap * (hubKeys.length - 1))) / hubKeys.length;

  hubKeys.forEach((hub, idx) => {
    const val = hubData[hub];
    const valRatio = val / maxVal;
    const barH = chartH * valRatio;

    const x = chartX + idx * (barW + barGap);
    const y = chartY - barH;

    const gradient = ctx.createLinearGradient(x, y, x, chartY);
    gradient.addColorStop(0, '#00f2fe');
    gradient.addColorStop(1, 'rgba(79, 172, 254, 0.15)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x, chartY);
    ctx.lineTo(x, y + 6);
    ctx.quadraticCurveTo(x, y, x + 6, y);
    ctx.lineTo(x + barW - 6, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + 6);
    ctx.lineTo(x + barW, chartY);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(hub, x + barW / 2, chartY + 16);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Outfit';
    ctx.fillText(val, x + barW / 2, y - 6);
  });
}

/* ==================== 📦 PACKAGE OPERATIONS & APPROVALS ==================== */

function renderPackagesTable() {
  const listEl = document.getElementById('packages-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const searchVal = document.getElementById('searchPkg').value.toLowerCase();
  const filterStatus = document.getElementById('filterStatus').value;
  const filterHub = document.getElementById('filterHub').value;

  // Enforce access control: Riders only see packages assigned to them
  let sourcePackages = state.packages;
  if (state.activeRole === 'Rider') {
    sourcePackages = state.packages.filter(p => p.rider === state.loggedInRider);
  }

  const filtered = sourcePackages.filter(pkg => {
    const matchesSearch = pkg.id.toLowerCase().includes(searchVal) || 
                          pkg.recipient.toLowerCase().includes(searchVal) ||
                          pkg.address.toLowerCase().includes(searchVal);
    const matchesStatus = filterStatus === 'ALL' || pkg.status === filterStatus;
    const matchesHub = filterHub === 'ALL' || pkg.hub === filterHub;

    return matchesSearch && matchesStatus && matchesHub;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">No packages found in this portal perspective.</td></tr>`;
    return;
  }

  filtered.forEach(pkg => {
    let badgeClass = 'badge-pending';
    if (pkg.status === 'Dispatched') badgeClass = 'badge-dispatched';
    if (pkg.status === 'Transit') badgeClass = 'badge-transit';
    if (pkg.status === 'Delivered') badgeClass = 'badge-delivered';

    const codDetail = pkg.payment === 'COD' 
      ? `<strong style="color:var(--color-pending);">LKR ${pkg.codVal.toLocaleString()}</strong><br><span style="font-size:10px; color:var(--text-muted);">COD (Fee: LKR ${pkg.fee})</span>`
      : `<strong style="color:var(--color-delivered);">Paid</strong><br><span style="font-size:10px; color:var(--text-muted);">Prepaid (Fee: LKR ${pkg.fee})</span>`;

    // Access control checks on delete operation (Disabled for Office portal)
    const isDeleteDisabled = state.activeRole === 'Office' ? 'disabled' : '';

    listEl.innerHTML += `
      <tr>
        <td><strong style="color: var(--primary); font-family: var(--font-title);">${pkg.id}</strong></td>
        <td>
          <strong>${pkg.recipient}</strong>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; line-height: 1.3;">
            📞 ${pkg.phone}<br>📍 ${pkg.address}
          </div>
        </td>
        <td>
          <span style="font-weight:600;">${pkg.hub}</span><br>
          <span style="font-size:10px; color:var(--text-muted);">${pkg.weight} kg</span>
        </td>
        <td>${codDetail}</td>
        <td><span class="badge ${badgeClass}">${pkg.status}</span></td>
        <td><span style="font-weight: 500;">${pkg.rider}</span></td>
        <td>
          <div class="action-buttons">
            <button class="icon-btn btn-active-primary" data-tooltip="Print label" onclick="printBarcodeLabel('${pkg.id}')">
              <svg viewBox="0 0 24 24"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            </button>
            ${pkg.status !== 'Delivered' ? `
              <div class="action-dropdown">
                <button class="icon-btn" data-tooltip="Operations">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>
                <div class="action-dropdown-content">
                  <button onclick="dispatchPackageQuick('${pkg.id}')">🚀 Assign Rider & Dispatch</button>
                  <button onclick="markDeliveredQuick('${pkg.id}')">✅ Complete Delivery</button>
                  <button onclick="deletePackage('${pkg.id}')" ${isDeleteDisabled} style="${state.activeRole === 'Office' ? 'opacity: 0.3; cursor:not-allowed;' : 'color: #ef4444;'}">❌ Delete Record</button>
                </div>
              </div>
            ` : `
              <button class="icon-btn" data-tooltip="Archive Completed" style="opacity: 0.3; cursor: not-allowed;">
                <svg viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  });
}

function filterPackages() {
  renderPackagesTable();
}

function dispatchPackageQuick(id) {
  if (isApiAuthMode() && window.ceylonSwiftOperations) { void window.ceylonSwiftOperations.dispatchPackage(id); return; }
  const pkg = state.packages.find(p => p.id === id);
  if (!pkg) return;

  if (pkg.status !== 'Pending') {
    alert('This package is already dispatched!');
    return;
  }

  // Auto assign rider
  const rider = state.employees.find(emp => emp.type === 'Field' && emp.status === 'Available') 
             || state.employees.find(emp => emp.type === 'Field');

  if (!rider) {
    alert('No riders are currently available.');
    return;
  }

  pkg.status = 'Dispatched';
  pkg.rider = rider.name;
  rider.status = 'Out for Delivery';

  addActivityLog('info', `Rider ${rider.name} dispatched with package ${pkg.id} for ${pkg.hub}.`);

  saveState('packages');
  saveState('employees');
  saveState('activities');
  
  renderPackagesTable();
  renderDashboard();
  playSound('beep');
}

function markDeliveredQuick(id) {
  if (isApiAuthMode() && window.ceylonSwiftOperations) { const pkg = state.packages.find(item => item.id === id); if (pkg) void window.ceylonSwiftOperations.transitionPackage(pkg.backendId, 'DELIVERED', pkg.version); return; }
  const pkg = state.packages.find(p => p.id === id);
  if (!pkg) return;

  if (pkg.status === 'Delivered') return;

  if (pkg.rider !== 'None') {
    const rider = state.employees.find(emp => emp.name === pkg.rider);
    if (rider) {
      rider.status = 'Available';
      saveState('employees');
    }
  }

  pkg.status = 'Delivered';
  addActivityLog('success', `Package ${pkg.id} delivered to ${pkg.recipient}.`);

  saveState('packages');
  saveState('activities');

  renderPackagesTable();
  renderDashboard();
  playSound('chime');
}

function deletePackage(id) {
  if (isApiAuthMode() && window.ceylonSwiftOperations) { const pkg = state.packages.find(item => item.id === id); if (pkg && confirm(`Cancel shipment ${id}?`)) void window.ceylonSwiftOperations.transitionPackage(pkg.backendId, 'CANCELLED', pkg.version); return; }
  if (state.activeRole === 'Office') {
    alert('Security Gate: Office employees do not have authority to delete records!');
    return;
  }

  if (!confirm(`Confirm deletion of shipment registry ${id}?`)) return;
  
  state.packages = state.packages.filter(p => p.id !== id);
  addActivityLog('pending', `Package ${id} registry deleted by Owner.`);
  
  saveState('packages');
  saveState('activities');
  
  renderPackagesTable();
  renderDashboard();
}

/* Owner / Office Registration form submit */
function handleNewPackage(event) {
  if (isApiAuthMode() && window.ceylonSwiftOperations) { void window.ceylonSwiftOperations.createPackage(event); return; }
  event.preventDefault();

  const recipient = document.getElementById('pkg-recipient').value;
  const phone = document.getElementById('pkg-phone').value;
  const address = document.getElementById('pkg-address').value;
  const weight = parseFloat(document.getElementById('pkg-weight').value);
  const hub = document.getElementById('pkg-hub').value;
  const payment = document.getElementById('pkg-payment').value;
  const codVal = payment === 'COD' ? parseFloat(document.getElementById('pkg-cod-val').value) : 0;

  const calculatedFee = calculateFeeLogic(weight, 'Colombo', hub, 'express');
  const randomId = 'CS-' + Math.floor(1000 + Math.random() * 9000);

  const newPkg = {
    id: randomId,
    recipient,
    phone,
    address,
    weight,
    hub,
    payment,
    codVal,
    fee: calculatedFee,
    status: 'Pending',
    rider: 'None',
    date: new Date().toISOString().split('T')[0]
  };

  state.packages.push(newPkg);
  addActivityLog('pending', `Registered shipment ${randomId} for ${recipient}.`);

  saveState('packages');
  saveState('activities');

  document.getElementById('pkgForm').reset();
  toggleCODField();
  closeModal('pkgModal');
  
  renderPackagesTable();
  renderDashboard();
  playSound('beep');

  printBarcodeLabel(randomId);
}

function toggleCODField() {
  const paymentType = document.getElementById('pkg-payment').value;
  const codGroup = document.getElementById('cod-amount-group');
  if (codGroup) {
    codGroup.style.display = paymentType === 'COD' ? 'block' : 'none';
  }
}

function printBarcodeLabel(id) {
  const pkg = state.packages.find(p => p.id === id);
  if (!pkg) return;

  const modalContent = document.getElementById('barcode-modal-content');
  if (!modalContent) return;

  const pseudobar = Array.from({length: 30}, () => Math.random() > 0.45 ? '|' : ' ').join('');

  modalContent.innerHTML = `
    <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 12px;">
      <h4 style="font-size: 24px; margin: 0; font-family: var(--font-title); font-weight: 800; letter-spacing: 2px;">${pkg.id}</h4>
      <div style="font-size: 22px; font-weight: bold; margin: 6px 0; font-family: monospace; letter-spacing: 3px;">
        ${pseudobar}
      </div>
      <span style="font-size: 11px; text-transform: uppercase;">Tracking Reference Code</span>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 13px;">
      <tr>
        <td style="padding: 4px 0; font-weight: bold; width: 35%;">DESTINATION:</td>
        <td style="padding: 4px 0;">${pkg.hub.toUpperCase()} HUB</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold;">RECIPIENT:</td>
        <td style="padding: 4px 0;">${pkg.recipient}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold;">PHONE:</td>
        <td style="padding: 4px 0;">${pkg.phone}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; vertical-align: top;">ADDRESS:</td>
        <td style="padding: 4px 0; line-height: 1.3;">${pkg.address}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold;">WEIGHT:</td>
        <td style="padding: 4px 0;">${pkg.weight} kg</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold;">PAYMENT TYPE:</td>
        <td style="padding: 4px 0; font-weight: bold; color: #000;">${pkg.payment.toUpperCase()}</td>
      </tr>
      ${pkg.payment === 'COD' ? `
      <tr style="background: #000; color: #fff;">
        <td style="padding: 6px; font-weight: bold;">COLLECT COD:</td>
        <td style="padding: 6px; font-weight: bold; font-size: 16px;">LKR ${pkg.codVal.toLocaleString()}.00</td>
      </tr>
      ` : ''}
    </table>

    <div style="border-top: 1px dashed #000; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
      <div>
        <strong>POST CODE:</strong> L-POST-90200<br>
        <strong>DATE:</strong> ${pkg.date}
      </div>
      <div style="border: 2px solid #000; padding: 4px 8px; font-weight: bold; font-family: var(--font-title); font-size: 12px; border-radius: 4px;">
        ⚡ EXPRESS
      </div>
    </div>
  `;

  openModal('labelModal');
}

/* ==================== 👤 CUSTOMER INCOMING REQUEST QUEUES ==================== */

function renderCustomerRequestsList() {
  const container = document.getElementById('customer-requests-list');
  if (!container) return;
  
  container.innerHTML = '';
  const visibleRequests = isApiAuthMode() ? state.customerRequests.filter(request => request.status === 'PENDING') : state.customerRequests;
  
  const countBadge = document.getElementById('customer-requests-count');
  if (countBadge) {
    countBadge.textContent = `${visibleRequests.length} Pending Approval`;
  }

  if (visibleRequests.length === 0) {
    container.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px;">No incoming customer requests at this time.</td></tr>`;
    return;
  }

  visibleRequests.forEach(req => {
    container.innerHTML += `
      <tr>
        <td>
          <strong>${req.recipient}</strong><br>
          <span style="font-size: 11px; color: var(--text-muted);">📞 ${req.phone}</span>
        </td>
        <td><span style="font-size:12px;">${req.address}</span></td>
        <td><strong>${req.weight} kg</strong></td>
        <td><strong style="color: var(--primary);">LKR ${req.fee.toFixed(2)}</strong></td>
        <td>
          <span class="badge ${req.payment === 'COD' ? 'badge-pending' : 'badge-delivered'}">
            ${req.payment === 'COD' ? `COD (LKR ${req.codVal.toLocaleString()})` : 'PREPAID'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-success" style="padding: 6px 12px; font-size: 11px;" onclick="approveCustomerRequest('${req.id}')">Approve Booking</button>
            <button class="btn btn-danger" style="padding: 6px 12px; font-size: 11px;" onclick="rejectCustomerRequest('${req.id}')">Reject</button>
          </div>
        </td>
      </tr>
    `;
  });
}

function approveCustomerRequest(reqId) {
  if (isApiAuthMode() && window.ceylonSwiftOperations) { const request = state.customerRequests.find(item => item.id === reqId); if (request) void window.ceylonSwiftOperations.convertRequest(request.backendId); return; }
  const req = state.customerRequests.find(r => r.id === reqId);
  if (!req) return;

  // Convert customer request into actual package
  const randomId = 'CS-' + Math.floor(1000 + Math.random() * 9000);
  
  const approvedPkg = {
    id: randomId,
    recipient: req.recipient,
    phone: req.phone,
    address: req.address,
    weight: req.weight,
    hub: req.hub,
    payment: req.payment,
    codVal: req.codVal,
    fee: req.fee,
    status: 'Pending',
    rider: 'None',
    date: new Date().toISOString().split('T')[0]
  };

  state.packages.push(approvedPkg);
  state.customerRequests = state.customerRequests.filter(r => r.id !== reqId);

  addActivityLog('success', `Customer Booking approved. Registered Package ${randomId} for destination ${req.hub}.`);

  saveState('packages');
  saveState('custrequests');
  saveState('activities');

  renderCustomerRequestsList();
  renderPackagesTable();
  renderDashboard();
  playSound('chime');
  
  printBarcodeLabel(randomId);
}

function rejectCustomerRequest(reqId) {
  if (isApiAuthMode() && window.ceylonSwiftOperations) { const request = state.customerRequests.find(item => item.id === reqId); if (request && confirm('Cancel this customer delivery request?')) void window.ceylonSwiftOperations.cancelRequest(request.backendId); return; }
  if (!confirm('Reject and cancel this customer shipping booking?')) return;

  state.customerRequests = state.customerRequests.filter(r => r.id !== reqId);
  addActivityLog('pending', `Customer booking request ${reqId} rejected by staff.`);

  saveState('custrequests');
  saveState('activities');

  renderCustomerRequestsList();
  playSound('beep');
}

/* ==================== 👤 CUSTOMER PORTAL INTERACTIONS ==================== */

// Dynamic fee preview inside customer submit panel
function calculateCustomerRequestFee() {
  if (isApiAuthMode() && window.ceylonSwiftOperations) { void window.ceylonSwiftOperations.calculate('cust'); return; }
  const weight = parseFloat(document.getElementById('cust-weight').value) || 1.0;
  const dest = document.getElementById('cust-hub').value;
  const payment = document.getElementById('cust-payment').value;

  const total = calculateFeeLogic(weight, 'Colombo', dest, 'express');
  
  let baseRate = 250;
  if (dest !== 'Colombo') baseRate += 150;

  let weightFee = 0;
  if (weight > 1) weightFee = Math.ceil(weight - 1) * 80;

  document.getElementById('cust-result-price').textContent = `LKR ${total.toFixed(2)}`;
  document.getElementById('cust-base-val').textContent = `LKR ${baseRate.toFixed(2)}`;
  document.getElementById('cust-weight-val').textContent = `LKR ${weightFee.toFixed(2)}`;
}

function toggleCustCODField() {
  const payment = document.getElementById('cust-payment').value;
  const group = document.getElementById('cust-cod-group');
  if (group) {
    group.style.display = payment === 'COD' ? 'block' : 'none';
  }
}

// Submission of public booking request
function handleCustomerRequest(event) {
  if (isApiAuthMode() && window.ceylonSwiftOperations) { void window.ceylonSwiftOperations.submitCustomerRequest(event); return; }
  event.preventDefault();

  const recipient = document.getElementById('cust-recipient').value;
  const phone = document.getElementById('cust-phone').value;
  const address = document.getElementById('cust-address').value;
  const weight = parseFloat(document.getElementById('cust-weight').value);
  const hub = document.getElementById('cust-hub').value;
  const payment = document.getElementById('cust-payment').value;
  const codVal = payment === 'COD' ? parseFloat(document.getElementById('cust-cod-val').value) : 0;

  const fee = calculateFeeLogic(weight, 'Colombo', hub, 'express');
  const reqId = 'REQ-' + Math.floor(1000 + Math.random() * 9000);

  const request = {
    id: reqId,
    recipient,
    phone,
    address,
    weight,
    hub,
    payment,
    codVal,
    fee,
    date: new Date().toISOString().split('T')[0]
  };

  state.customerRequests.push(request);
  saveState('custrequests');

  alert(`Shipment Booking Submitted! Your Request Reference is: ${reqId}. We will review and collect your package shortly.`);

  // Reset Form
  document.getElementById('customerRequestForm').reset();
  toggleCustCODField();
  
  // Switch immediately to Track Tab and search it
  const trackInput = document.getElementById('public-track-input');
  if (trackInput) {
    trackInput.value = reqId;
  }
  
  // Reroute active tab to customertrack
  const navItem = document.querySelector('[data-tab="customertrack"]');
  if (navItem) {
    navItem.click();
  }
  
  // Query status (which displays pending booking status)
  queryPublicTracking();
}

// Public tracking query function
function queryPublicTracking() {
  if (isApiAuthMode() && window.ceylonSwiftOperations) { void window.ceylonSwiftOperations.track(); return; }
  const input = document.getElementById('public-track-input').value.trim();
  const resultBox = document.getElementById('public-track-result');
  const errorBox = document.getElementById('public-track-error');

  if (!input) {
    alert('Please enter a tracking ID!');
    return;
  }

  // Check if it matches a registered package
  const pkg = state.packages.find(p => p.id.toLowerCase() === input.toLowerCase());
  // Check if it matches a pending request instead
  const req = state.customerRequests.find(r => r.id.toLowerCase() === input.toLowerCase());

  if (pkg) {
    errorBox.style.display = 'none';
    resultBox.style.display = 'block';

    document.getElementById('pub-pkg-id').textContent = pkg.id;
    document.getElementById('pub-pkg-dest').textContent = `${pkg.hub} Hub`;
    document.getElementById('pub-pkg-rider').textContent = pkg.rider === 'None' ? 'Awaiting Allocation' : pkg.rider;

    const statusBadge = document.getElementById('pub-pkg-status');
    statusBadge.textContent = pkg.status;
    
    let badgeClass = 'badge-pending';
    if (pkg.status === 'Dispatched') badgeClass = 'badge-dispatched';
    if (pkg.status === 'Transit') badgeClass = 'badge-transit';
    if (pkg.status === 'Delivered') badgeClass = 'badge-delivered';
    statusBadge.className = `badge ${badgeClass}`;

    // Render Timeline Nodes based on status
    const timeline = document.getElementById('public-track-timeline');
    timeline.innerHTML = `
      <div class="timeline-step completed">
        <div class="timeline-badge">✓</div>
        <div class="timeline-content">
          <h5>1. Shipping Order Registered <span>${pkg.date}</span></h5>
          <p>Package registry fully received and entered into CeylonSwift active logistics grids.</p>
        </div>
      </div>
      <div class="timeline-step ${pkg.status !== 'Pending' ? 'completed' : 'active'}">
        <div class="timeline-badge">${pkg.status !== 'Pending' ? '✓' : '●'}</div>
        <div class="timeline-content">
          <h5>2. Approved & Collected <span>${pkg.status !== 'Pending' ? pkg.date : 'Awaiting'}</span></h5>
          <p>${pkg.status !== 'Pending' ? `Package received at CeylonSwift sorting bays. Courier assigned: ${pkg.rider}.` : 'Operations reviewing logistics details for courier parcel collections.'}</p>
        </div>
      </div>
      <div class="timeline-step ${pkg.status === 'Transit' || pkg.status === 'Delivered' ? 'completed' : (pkg.status === 'Dispatched' ? 'active' : '')}">
        <div class="timeline-badge">${pkg.status === 'Transit' || pkg.status === 'Delivered' ? '✓' : (pkg.status === 'Dispatched' ? '●' : ' ')}</div>
        <div class="timeline-content">
          <h5>3. Transit Highway sorted <span>${pkg.status === 'Transit' || pkg.status === 'Delivered' ? pkg.date : ''}</span></h5>
          <p>Courier container sorting completed. Dispatch set out for target district: ${pkg.hub}.</p>
        </div>
      </div>
      <div class="timeline-step ${pkg.status === 'Delivered' ? 'completed' : (pkg.status === 'Transit' ? 'active' : '')}">
        <div class="timeline-badge">${pkg.status === 'Delivered' ? '✓' : (pkg.status === 'Transit' ? '●' : ' ')}</div>
        <div class="timeline-content">
          <h5>4. Out for Delivery <span>${pkg.status === 'Delivered' ? pkg.date : ''}</span></h5>
          <p>${pkg.status === 'Delivered' ? 'Courier reached sorting hub. Handed over to recipient.' : (pkg.status === 'Transit' ? `Arrived at destination hub. Courier ${pkg.rider} out for active delivery!` : 'Awaiting transit completion.')}</p>
        </div>
      </div>
      <div class="timeline-step ${pkg.status === 'Delivered' ? 'completed' : ''}">
        <div class="timeline-badge">${pkg.status === 'Delivered' ? '✓' : ' '}</div>
        <div class="timeline-content">
          <h5>5. Handed to Recipient <span>${pkg.status === 'Delivered' ? pkg.date : ''}</span></h5>
          <p>${pkg.status === 'Delivered' ? `Delivered successfully. Signee: ${pkg.recipient}. verified by dispatcher ${pkg.rider}.` : 'Pending final courier updates.'}</p>
        </div>
      </div>
    `;
    playSound('beep');
  } 
  else if (req) {
    errorBox.style.display = 'none';
    resultBox.style.display = 'block';

    document.getElementById('pub-pkg-id').textContent = req.id;
    document.getElementById('pub-pkg-dest').textContent = `${req.hub} Hub`;
    document.getElementById('pub-pkg-rider').textContent = 'Pending Booking Approval';

    const statusBadge = document.getElementById('pub-pkg-status');
    statusBadge.textContent = 'Pending Approval';
    statusBadge.className = 'badge badge-pending';

    const timeline = document.getElementById('public-track-timeline');
    timeline.innerHTML = `
      <div class="timeline-step active">
        <div class="timeline-badge">●</div>
        <div class="timeline-content">
          <h5>1. Booking Request Submitted <span>${req.date}</span></h5>
          <p>Your delivery request has been successfully queued. Waiting for operations to confirm and dispatch a rider.</p>
        </div>
      </div>
      <div class="timeline-step">
        <div class="timeline-badge"> </div>
        <div class="timeline-content">
          <h5>2. Operations approval & Courier Allocation</h5>
          <p>Hub coordinator will approve details, calculate final distance costs, and direct a courier to collect.</p>
        </div>
      </div>
    `;
    playSound('beep');
  }
  else {
    resultBox.style.display = 'none';
    errorBox.style.display = 'flex';
    playSound('beep');
  }
}

/* ==================== 📍 HUB CAPACITIES MONITOR ==================== */

function renderHubs() {
  const hubsContainer = document.getElementById('hubs-container');
  if (!hubsContainer) return;
  hubsContainer.innerHTML = '';

  state.hubs.forEach(hub => {
    const dynamicCount = state.packages.filter(p => p.hub === hub.id && p.status !== 'Delivered').length;
    if (!isApiAuthMode()) hub.activePkgs = dynamicCount;

    const fillPercent = Math.min(((hub.activePkgs / hub.capacity) * 100).toFixed(0), 100);
    let fillBarColor = 'var(--primary)';
    if (fillPercent > 65) fillBarColor = 'var(--color-pending)';
    if (fillPercent > 85) fillBarColor = '#ef4444';

    hubsContainer.innerHTML += `
      <div class="hub-card">
        <div class="hub-header">
          <h5>${hub.name}</h5>
          <span class="badge badge-glow-green" style="font-size: 9px; padding: 4px 8px;">${hub.speed} Speed</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          Operational sorting center servicing the ${hub.district} shipping district.
        </div>
        
        <div style="margin-top: 16px;">
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:6px;">
            <span>Sorting Capacity Load</span>
            <strong>${hub.activePkgs} / ${hub.capacity} items (${fillPercent}%)</strong>
          </div>
          <div style="width:100%; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
            <div style="width: ${fillPercent}%; height: 100%; background: ${fillBarColor}; border-radius: 3px; box-shadow: 0 0 10px ${fillBarColor};"></div>
          </div>
        </div>

        <div class="hub-stats">
          <div class="hub-stat-box">
            <div class="hub-stat-num">${hub.riders}</div>
            <div class="hub-stat-label">Riders</div>
          </div>
          <div class="hub-stat-box">
            <div class="hub-stat-num">${hub.activePkgs}</div>
            <div class="hub-stat-label">Active parcels</div>
          </div>
        </div>
      </div>
    `;
  });
}

function calculateFeeLogic(weight, origin, dest, urgency) {
  let baseRate = 250;
  if (origin !== dest) baseRate += 150;

  let weightFee = 0;
  if (weight > 1) {
    weightFee = Math.ceil(weight - 1) * 80;
  }

  let markup = 0;
  if (urgency === 'express') markup = 150;
  if (urgency === 'instant') markup = 300;

  return baseRate + weightFee + markup;
}

function calculateDynamicRate() {
  if (isApiAuthMode() && window.ceylonSwiftOperations) { void window.ceylonSwiftOperations.calculate('portal'); return; }
  const weight = parseFloat(document.getElementById('calc-weight').value) || 1.0;
  const origin = document.getElementById('calc-origin').value;
  const dest = document.getElementById('calc-dest').value;
  const speed = document.getElementById('calc-speed').value;

  const total = calculateFeeLogic(weight, origin, dest, speed);

  let baseRate = 250;
  if (origin !== dest) baseRate += 150;

  let weightFee = 0;
  if (weight > 1) weightFee = Math.ceil(weight - 1) * 80;

  let markup = 0;
  if (speed === 'express') markup = 150;
  if (speed === 'instant') markup = 300;

  let timeStr = '2-3 Days (Standard)';
  if (speed === 'express') timeStr = 'Next-Day (By 12:00 PM)';
  if (speed === 'instant') timeStr = 'Same-Day Instant (Within 4 hrs)';

  document.getElementById('calc-result-total').textContent = `LKR ${total.toFixed(2)}`;
  document.getElementById('calc-base').textContent = `LKR ${baseRate.toFixed(2)}`;
  document.getElementById('calc-weight-fee').textContent = `LKR ${weightFee.toFixed(2)}`;
  document.getElementById('calc-markup').textContent = `LKR ${markup.toFixed(2)}`;
  document.getElementById('calc-time').textContent = timeStr;
}

/* ==================== 👥 EMPLOYEE REGISTRIES ==================== */

function renderEmployeesGrid(typeFilter = 'ALL') {
  if (isApiAuthMode() && window.ceylonSwiftWorkforce) {
    window.ceylonSwiftWorkforce.renderTeam(typeFilter);
    return;
  }
  const container = document.getElementById('employees-container');
  if (!container) return;
  container.innerHTML = '';

  const filtered = state.employees.filter(emp => {
    return typeFilter === 'ALL' || emp.type === typeFilter;
  });

  filtered.forEach(emp => {
    const isFieldRider = emp.type === 'Field';
    const initials = emp.name.split(' ').map(n => n[0]).join('');
    
    let riderStatusBadge = '';
    if (isFieldRider) {
      let statusColorClass = 'badge-delivered';
      if (emp.status === 'Out for Delivery') statusColorClass = 'badge-transit';
      if (emp.status === 'Off Duty') statusColorClass = 'badge-pending';
      
      riderStatusBadge = `
        <div style="margin-top: 8px;">
          <span class="badge ${statusColorClass}" style="cursor:pointer;" onclick="toggleRiderStatus('${emp.id}')" data-tooltip="Click to toggle availability status">
            ${emp.status}
          </span>
        </div>
      `;
    }

    container.innerHTML += `
      <div class="employee-card">
        <div class="emp-avatar ${isFieldRider ? 'field' : ''}">${initials}</div>
        <div class="emp-details">
          <h6>${emp.name}</h6>
          <p class="role">${emp.role} • <strong>Hub: ${emp.hub}</strong></p>
          <p class="phone">📞 ${emp.phone}</p>
          ${riderStatusBadge}
          <div class="emp-performance">
            <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>${emp.rating.toFixed(1)} Performance Rating</span>
          </div>
        </div>
      </div>
    `;
  });
}

function filterEmployees(type) {
  document.getElementById('emp-btn-all').classList.remove('active');
  document.getElementById('emp-btn-office').classList.remove('active');
  document.getElementById('emp-btn-field').classList.remove('active');

  if (type === 'ALL') document.getElementById('emp-btn-all').classList.add('active');
  if (type === 'Office') document.getElementById('emp-btn-office').classList.add('active');
  if (type === 'Field') document.getElementById('emp-btn-field').classList.add('active');

  renderEmployeesGrid(type);
}

function toggleRiderStatus(id) {
  if (isApiAuthMode() && window.ceylonSwiftWorkforce) {
    void window.ceylonSwiftWorkforce.toggleRider(id);
    return;
  }
  const emp = state.employees.find(e => e.id === id);
  if (!emp || emp.type !== 'Field') return;

  if (emp.status === 'Available') {
    emp.status = 'Out for Delivery';
  } else if (emp.status === 'Out for Delivery') {
    emp.status = 'Off Duty';
  } else {
    emp.status = 'Available';
  }

  saveState('employees');
  
  // Re-render based on active filter button
  let currentFilter = 'ALL';
  if (document.getElementById('emp-btn-office').classList.contains('active')) currentFilter = 'Office';
  if (document.getElementById('emp-btn-field').classList.contains('active')) currentFilter = 'Field';
  
  renderEmployeesGrid(currentFilter);
  playSound('beep');
}

function handleNewEmployee(event) {
  event.preventDefault();

  if (isApiAuthMode()) {
    window.ceylonSwiftWorkforce?.openInvite();
    return;
  }

  const name = document.getElementById('emp-name').value;
  const phone = document.getElementById('emp-phone').value;
  const role = document.getElementById('emp-role').value;
  const hub = document.getElementById('emp-hub').value;

  const isFieldRider = role.includes('Rider') || role.includes('Driver');
  const type = isFieldRider ? 'Field' : 'Office';
  const newEmpId = 'EMP-' + Math.floor(108 + Math.random() * 90);

  const newEmp = {
    id: newEmpId,
    name,
    role,
    type,
    hub,
    phone,
    rating: 5.0,
    ...(isFieldRider && { status: 'Available' })
  };

  state.employees.push(newEmp);
  addActivityLog('info', `Hired new CeylonSwift teammate: ${name} as ${role}.`);

  saveState('employees');
  saveState('activities');

  document.getElementById('empForm').reset();
  closeModal('empModal');

  renderEmployeesGrid();
  playSound('chime');
}

/* ==================== ⚡ DYNAMIC ROUTE SPEED SIMULATOR ==================== */

function populateSimSelector() {
  const select = document.getElementById('sim-pkg-select');
  if (!select) return;
  select.innerHTML = '';

  // Access Control: Riders can ONLY simulate packages assigned to them
  let sourcePackages = state.packages.filter(p => p.status !== 'Delivered');
  if (state.activeRole === 'Rider') {
    sourcePackages = sourcePackages.filter(p => p.rider === state.loggedInRider);
  }

  if (sourcePackages.length === 0) {
    select.innerHTML = '<option value="NONE">-- No active shipments for simulation --</option>';
    return;
  }

  sourcePackages.forEach(pkg => {
    select.innerHTML += `<option value="${pkg.id}">Shipment ${pkg.id} (${pkg.recipient} ➔ ${pkg.hub})</option>`;
  });
}

function loadSimPackage() {
  const select = document.getElementById('sim-pkg-select');
  if (!select) return;
  const pkgId = select.value;

  const simPkgId = document.getElementById('sim-pkg-id');
  const simPkgName = document.getElementById('sim-pkg-name');
  const simPkgDest = document.getElementById('sim-pkg-dest');
  const simPkgCod = document.getElementById('sim-pkg-cod');

  if (pkgId === 'NONE' || !pkgId) {
    simPkgId.textContent = '-';
    simPkgName.textContent = '-';
    simPkgDest.textContent = '-';
    simPkgCod.textContent = '-';
    return;
  }

  const pkg = state.packages.find(p => p.id === pkgId);
  if (!pkg) return;

  simPkgId.textContent = pkg.id;
  simPkgName.textContent = pkg.recipient;
  simPkgDest.textContent = `${pkg.hub} Hub`;
  simPkgCod.textContent = pkg.payment === 'COD' ? `LKR ${pkg.codVal.toLocaleString()}` : 'Prepaid';
}

function startDeliverySimulation() {
  if (state.isSimulating) {
    alert('Transit speed engine is already running!');
    return;
  }

  const select = document.getElementById('sim-pkg-select');
  const pkgId = select.value;

  if (pkgId === 'NONE' || !pkgId) {
    alert('Please register/assign a shipment to simulate!');
    return;
  }

  const pkg = state.packages.find(p => p.id === pkgId);
  if (!pkg) return;

  state.isSimulating = true;
  document.getElementById('sim-start-btn').disabled = true;
  document.getElementById('sim-start-btn').textContent = '⚡ Speed Simulator Running...';

  playSound('beep');

  const badge = document.getElementById('sim-status-badge');
  badge.textContent = 'Transit Engine Running';
  badge.className = 'badge badge-dispatched';

  const fill = document.getElementById('sim-progress-fill');
  const bike = document.getElementById('sim-vehicle');
  bike.classList.add('active');

  const consoleEl = document.getElementById('sim-console');
  consoleEl.innerHTML = '';
  logSimConsole(`[SYSTEM] Initializing speed mechanics for ${pkg.id}...`, 'info');

  let riderName = pkg.rider;
  if (riderName === 'None') {
    const activeRider = state.employees.find(e => e.type === 'Field' && e.status === 'Available') 
                      || state.employees.find(e => e.type === 'Field');
    riderName = activeRider ? activeRider.name : 'Velo Courier';
    pkg.rider = riderName;
    saveState('packages');
  }

  let progress = 0;
  const nodes = [
    { pct: 0, label: 'Colombo Hub', desc: `Assigned CeylonSwift dispatch rider ${riderName}. Exiting sorting yards...` },
    { pct: 33, label: 'Transit route', desc: `High-speed highway transit activated. Courier vehicle speed optimal.` },
    { pct: 66, label: 'Local sorting', desc: `Arrived at local sorting center. Fast package sorting completed successfully.` },
    { pct: 100, label: 'Delivered', desc: `Out for delivery. Reached destination. Signee verified: ${pkg.recipient}. Delivery success!` }
  ];

  pkg.status = 'Transit';
  saveState('packages');

  const clearNodes = () => {
    document.getElementById('node-0').className = 'sim-node';
    document.getElementById('node-1').className = 'sim-node';
    document.getElementById('node-2').className = 'sim-node';
    document.getElementById('node-3').className = 'sim-node';
  };
  clearNodes();

  state.simulationInterval = setInterval(() => {
    progress += 1;
    fill.style.width = progress + '%';
    bike.style.left = `calc(${progress}% - 10px)`;

    if (progress === 1) {
      document.getElementById('node-0').classList.add('active');
      logSimConsole(`[12:01:00] CS-LOG: ${nodes[0].desc}`, 'time');
      playSound('beep');
    }
    
    if (progress === 33) {
      document.getElementById('node-0').className = 'sim-node completed';
      document.getElementById('node-1').classList.add('active');
      logSimConsole(`[12:02:15] CS-LOG: ${nodes[1].desc}`, 'time');
      playSound('beep');
    }

    if (progress === 66) {
      document.getElementById('node-1').className = 'sim-node completed';
      document.getElementById('node-2').classList.add('active');
      logSimConsole(`[12:03:30] CS-LOG: ${nodes[2].desc}`, 'time');
      playSound('beep');
    }

    if (progress >= 100) {
      clearInterval(state.simulationInterval);
      state.isSimulating = false;
      document.getElementById('sim-start-btn').disabled = false;
      document.getElementById('sim-start-btn').textContent = '⚡ Launch Hyper-Speed Dispatch';

      document.getElementById('node-2').className = 'sim-node completed';
      document.getElementById('node-3').className = 'sim-node completed';
      
      markDeliveredQuick(pkg.id);

      badge.textContent = 'DELIVERED SUCCESS';
      badge.className = 'badge badge-delivered';

      logSimConsole(`[12:05:00] SUCCESS: ${nodes[3].desc}`, 'success');
      
      if (pkg.payment === 'COD') {
        logSimConsole(`[SYSTEM] REVENUE ADDED: Cash on Delivery LKR ${pkg.codVal.toLocaleString()}.00 collected.`, 'success');
      }
      
      playSound('chime');
      bike.classList.remove('active');
      
      populateSimSelector();
      loadSimPackage();
    }
  }, 80); // Speed factor increased slightly for even faster simulation
}

function logSimConsole(text, type = '') {
  const consoleEl = document.getElementById('sim-console');
  if (!consoleEl) return;

  const line = document.createElement('div');
  line.className = `console-line ${type}`;
  line.textContent = text;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function clearSimConsole() {
  const consoleEl = document.getElementById('sim-console');
  if (consoleEl) {
    consoleEl.innerHTML = '<div class="console-line">[SYSTEM] Console logs flushed. Waiting for logistics activity...</div>';
  }
}

/* ==================== 🎛️ UTILITY METHODS ==================== */

function addActivityLog(type, text) {
  const timestamp = 'Just now';
  const newAct = {
    id: Date.now(),
    type,
    text,
    time: timestamp
  };
  state.activities.push(newAct);
  if (state.activities.length > 8) {
    state.activities.shift();
  }
  saveState('activities');
}

function playSound(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();

    if (type === 'beep') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } else if (type === 'chime') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + (index * 0.07));
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime + (index * 0.07));
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (index * 0.07) + 0.35);

        osc.start(audioCtx.currentTime + (index * 0.07));
        osc.stop(audioCtx.currentTime + (index * 0.07) + 0.35);
      });
    } else if (type === 'ringtone') {
      // Premium double-beep text chime
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      const gain2 = audioCtx.createGain();
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5
      gain2.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.15);
      osc2.start(audioCtx.currentTime + 0.15);
      osc2.stop(audioCtx.currentTime + 0.35);
    }
  } catch (err) {
    console.warn('Audio synthesis block:', err);
  }
}

window.openModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
};

window.closeModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
};

/* ==================== 🕰️ SRI LANKAN LIVE CLOCK ENGINE ==================== */

function updateLiveClock() {
  const timeEl = document.getElementById('lk-clock-time');
  const dateEl = document.getElementById('lk-clock-date');
  const greetingEl = document.getElementById('lk-greeting');
  if (!timeEl || !dateEl) return;
  
  const now = new Date();
  const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
  const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  
  timeEl.textContent = now.toLocaleTimeString('en-US', optionsTime);
  dateEl.textContent = now.toLocaleDateString('en-US', optionsDate);
  
  const hour = now.getHours();
  let greeting = 'Ayubowan!';
  if (hour < 12) greeting = 'Ayubowan! 🌅 Good Morning';
  else if (hour < 16) greeting = 'Ayubowan! ☀️ Good Afternoon';
  else if (hour < 20) greeting = 'Ayubowan! 🌇 Good Evening';
  else greeting = 'Ayubowan! 🌙 Good Night';
  
  if (greetingEl) greetingEl.textContent = greeting;
}

/* ==================== 🔑 MODAL & HELPER INTERFACES ==================== */

function openAuthModal() {
  if (window.ceylonSwiftAuthView) { window.ceylonSwiftAuthView.open('customer'); return; }
  resetOwnerAuthFlow();
  const inputs = document.querySelectorAll('#authPortalModal input');
  inputs.forEach(i => i.value = '');
  switchAuthTab('customer');
  openModal('authPortalModal');
}

window.openAppSection = function(sectionId) {
  if (!state.allowedNavigationSections.includes(sectionId)) return false;
  window.ceylonSwiftNavigation?.activate(document.getElementById('sidebar-nav-menu'), sectionId);
  displayTabSection(sectionId);
  return true;
};

function switchAuthTab(role) {
  const tabBtns = document.querySelectorAll('.auth-tab-btn');
  tabBtns.forEach(btn => btn.classList.remove('active'));
  
  const formViews = document.querySelectorAll('.auth-form-view');
  formViews.forEach(view => view.classList.remove('active'));
  
  const targetBtn = document.getElementById(`tab-btn-${role}`);
  const targetView = document.getElementById(`auth-view-${role}`);
  
  if (targetBtn) targetBtn.classList.add('active');
  if (targetView) targetView.classList.add('active');
  
  if (role === 'owner') {
    resetOwnerAuthFlow();
  }
}

function toggleRiderSubView(mode) {
  const loginBtn = document.getElementById('rider-toggle-login');
  const signupBtn = document.getElementById('rider-toggle-signup');
  const loginView = document.getElementById('rider-login-subview');
  const signupView = document.getElementById('rider-signup-subview');
  
  if (mode === 'login') {
    if (loginBtn) loginBtn.classList.add('active');
    if (signupBtn) signupBtn.classList.remove('active');
    if (loginView) loginView.style.display = 'block';
    if (signupView) signupView.style.display = 'none';
  } else {
    if (loginBtn) loginBtn.classList.remove('active');
    if (signupBtn) signupBtn.classList.add('active');
    if (loginView) loginView.style.display = 'none';
    if (signupView) signupView.style.display = 'block';
  }
}

function toggleOfficeSubView(mode) {
  const loginBtn = document.getElementById('office-toggle-login');
  const signupBtn = document.getElementById('office-toggle-signup');
  const loginView = document.getElementById('office-login-subview');
  const signupView = document.getElementById('office-signup-subview');
  
  if (mode === 'login') {
    if (loginBtn) loginBtn.classList.add('active');
    if (signupBtn) signupBtn.classList.remove('active');
    if (loginView) loginView.style.display = 'block';
    if (signupView) signupView.style.display = 'none';
  } else {
    if (loginBtn) loginBtn.classList.remove('active');
    if (signupBtn) signupBtn.classList.add('active');
    if (loginView) loginView.style.display = 'none';
    if (signupView) signupView.style.display = 'block';
  }
}

function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  const behavior = document.body.classList.contains('performance-lite') ? 'auto' : 'smooth';

  if (id === 'home-hero') {
    window.scrollTo({ top: 0, behavior });
    return;
  }

  const navbar = document.querySelector('.public-navbar');
  const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;
  const targetTop = target.getBoundingClientRect().top + window.scrollY - navbarHeight - 24;
  window.scrollTo({ top: Math.max(0, targetTop), behavior });
}

/* ==================== 🌐 GUEST HOMEPAGE OPERATIONS ==================== */

function calculateHomeRate() {
  if (isApiAuthMode() && window.ceylonSwiftOperations) { void window.ceylonSwiftOperations.calculate('home'); return; }
  const weightInput = document.getElementById('home-calc-weight');
  const originSelect = document.getElementById('home-calc-origin');
  const destSelect = document.getElementById('home-calc-dest');
  const speedSelect = document.getElementById('home-calc-speed');
  
  if (!weightInput || !originSelect || !destSelect || !speedSelect) return;
  
  const weight = parseFloat(weightInput.value) || 1.0;
  const origin = originSelect.value;
  const dest = destSelect.value;
  const speed = speedSelect.value;
  
  const total = calculateFeeLogic(weight, origin, dest, speed);
  
  let baseRate = 250;
  if (origin !== dest) baseRate += 150;
  
  let weightFee = 0;
  if (weight > 1) weightFee = Math.ceil(weight - 1) * 80;
  
  let markup = 0;
  if (speed === 'express') markup = 150;
  if (speed === 'instant') markup = 300;
  
  let timeStr = '2-3 Days (Standard)';
  if (speed === 'express') timeStr = 'Next-Day (By 12:00 PM)';
  if (speed === 'instant') timeStr = 'Same-Day Instant (Within 4 hrs)';
  
  document.getElementById('home-calc-result-total').textContent = `LKR ${total.toFixed(2)}`;
  document.getElementById('home-calc-base').textContent = `LKR ${baseRate.toFixed(2)}`;
  document.getElementById('home-calc-weight-fee').textContent = `LKR ${weightFee.toFixed(2)}`;
  document.getElementById('home-calc-markup').textContent = `LKR ${markup.toFixed(2)}`;
  document.getElementById('home-calc-time').textContent = timeStr;
}

function queryHomeTracking() {
  if (isApiAuthMode() && window.ceylonSwiftOperations) { const code = document.getElementById('home-track-input')?.value; void window.ceylonSwiftOperations.track(code, 'home'); return; }
  const inputEl = document.getElementById('home-track-input');
  if (!inputEl) return;
  const input = inputEl.value.trim();
  const resultBox = document.getElementById('home-track-result');
  const errorBox = document.getElementById('home-track-error');
  
  if (!input) {
    alert('Please enter a tracking ID!');
    return;
  }
  
  const pkg = state.packages.find(p => p.id.toLowerCase() === input.toLowerCase());
  const req = state.customerRequests.find(r => r.id.toLowerCase() === input.toLowerCase());
  
  if (pkg) {
    if (errorBox) errorBox.style.display = 'none';
    if (resultBox) resultBox.style.display = 'block';
    
    document.getElementById('home-pkg-id').textContent = pkg.id;
    document.getElementById('home-pkg-dest').textContent = `${pkg.hub} Hub`;
    document.getElementById('home-pkg-rider').textContent = pkg.rider === 'None' ? 'Awaiting Allocation' : pkg.rider;
    
    const statusBadge = document.getElementById('home-pkg-status');
    statusBadge.textContent = pkg.status;
    let badgeClass = 'badge-pending';
    if (pkg.status === 'Dispatched') badgeClass = 'badge-dispatched';
    if (pkg.status === 'Transit') badgeClass = 'badge-transit';
    if (pkg.status === 'Delivered') badgeClass = 'badge-delivered';
    statusBadge.className = `badge ${badgeClass}`;
    
    const timeline = document.getElementById('home-track-timeline');
    timeline.innerHTML = `
      <div class="timeline-step completed">
        <div class="timeline-badge">✓</div>
        <div class="timeline-content">
          <h5>1. Shipping Order Registered <span>${pkg.date}</span></h5>
          <p>Package registry fully received and entered into CeylonSwift active logistics grids.</p>
        </div>
      </div>
      <div class="timeline-step ${pkg.status !== 'Pending' ? 'completed' : 'active'}">
        <div class="timeline-badge">${pkg.status !== 'Pending' ? '✓' : '●'}</div>
        <div class="timeline-content">
          <h5>2. Approved & Collected <span>${pkg.status !== 'Pending' ? pkg.date : 'Awaiting'}</span></h5>
          <p>${pkg.status !== 'Pending' ? `Package received at CeylonSwift sorting bays. Courier assigned: ${pkg.rider}.` : 'Operations reviewing logistics details for courier parcel collections.'}</p>
        </div>
      </div>
      <div class="timeline-step ${pkg.status === 'Transit' || pkg.status === 'Delivered' ? 'completed' : (pkg.status === 'Dispatched' ? 'active' : '')}">
        <div class="timeline-badge">${pkg.status === 'Transit' || pkg.status === 'Delivered' ? '✓' : (pkg.status === 'Dispatched' ? '●' : ' ')}</div>
        <div class="timeline-content">
          <h5>3. Transit Highway sorted <span>${pkg.status === 'Transit' || pkg.status === 'Delivered' ? pkg.date : ''}</span></h5>
          <p>Courier container sorting completed. Dispatch set out for target district: ${pkg.hub}.</p>
        </div>
      </div>
      <div class="timeline-step ${pkg.status === 'Delivered' ? 'completed' : (pkg.status === 'Transit' ? 'active' : '')}">
        <div class="timeline-badge">${pkg.status === 'Delivered' ? '✓' : (pkg.status === 'Transit' ? '●' : ' ')}</div>
        <div class="timeline-content">
          <h5>4. Out for Delivery <span>${pkg.status === 'Delivered' ? pkg.date : ''}</span></h5>
          <p>${pkg.status === 'Delivered' ? 'Courier reached sorting hub. Handed over to recipient.' : (pkg.status === 'Transit' ? `Arrived at destination hub. Courier ${pkg.rider} out for active delivery!` : 'Awaiting transit completion.')}</p>
        </div>
      </div>
      <div class="timeline-step ${pkg.status === 'Delivered' ? 'completed' : ''}">
        <div class="timeline-badge">${pkg.status === 'Delivered' ? '✓' : ' '}</div>
        <div class="timeline-content">
          <h5>5. Handed to Recipient <span>${pkg.status === 'Delivered' ? pkg.date : ''}</span></h5>
          <p>${pkg.status === 'Delivered' ? `Delivered successfully. Signee: ${pkg.recipient}. verified by dispatcher ${pkg.rider}.` : 'Pending final courier updates.'}</p>
        </div>
      </div>
    `;
    playSound('beep');
  } 
  else if (req) {
    if (errorBox) errorBox.style.display = 'none';
    if (resultBox) resultBox.style.display = 'block';
    
    document.getElementById('home-pkg-id').textContent = req.id;
    document.getElementById('home-pkg-dest').textContent = `${req.hub} Hub`;
    document.getElementById('home-pkg-rider').textContent = 'Pending Booking Approval';
    
    const statusBadge = document.getElementById('home-pkg-status');
    statusBadge.textContent = 'Pending Approval';
    statusBadge.className = 'badge badge-pending';
    
    const timeline = document.getElementById('home-track-timeline');
    timeline.innerHTML = `
      <div class="timeline-step active">
        <div class="timeline-badge">●</div>
        <div class="timeline-content">
          <h5>1. Booking Request Submitted <span>${req.date}</span></h5>
          <p>Your delivery request has been successfully queued. Waiting for operations to confirm and dispatch a courier.</p>
        </div>
      </div>
      <div class="timeline-step">
        <div class="timeline-badge"> </div>
        <div class="timeline-content">
          <h5>2. Operations approval & Courier Allocation</h5>
          <p>Hub coordinator will approve details, calculate final distance costs, and direct a courier to collect.</p>
        </div>
      </div>
    `;
    playSound('beep');
  }
  else {
    if (resultBox) resultBox.style.display = 'none';
    if (errorBox) errorBox.style.display = 'flex';
    playSound('beep');
  }
}

function renderHomeHubs() {
  const container = document.getElementById('home-hubs-container');
  if (!container) return;
  container.innerHTML = '';
  
  state.hubs.forEach(hub => {
    const dynamicCount = state.packages.filter(p => p.hub === hub.id && p.status !== 'Delivered').length;
    hub.activePkgs = dynamicCount;
    
    const fillPercent = Math.min(((hub.activePkgs / hub.capacity) * 100).toFixed(0), 100);
    let fillBarColor = 'var(--primary)';
    if (fillPercent > 65) fillBarColor = 'var(--color-pending)';
    if (fillPercent > 85) fillBarColor = '#ef4444';
    
    container.innerHTML += `
      <div class="hub-card">
        <div class="hub-header">
          <h5>${hub.name}</h5>
          <span class="badge badge-glow-green" style="font-size: 9px; padding: 4px 8px;">${hub.speed} Speed</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          Operational sorting center servicing the ${hub.district} shipping district.
        </div>
        
        <div style="margin-top: 16px;">
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:6px;">
            <span>Sorting Capacity Load</span>
            <strong>${hub.activePkgs} / ${hub.capacity} items (${fillPercent}%)</strong>
          </div>
          <div style="width:100%; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
            <div style="width: ${fillPercent}%; height: 100%; background: ${fillBarColor}; border-radius: 3px; box-shadow: 0 0 10px ${fillBarColor};"></div>
          </div>
        </div>
        
        <div class="hub-stats">
          <div class="hub-stat-box">
            <div class="hub-stat-num">${hub.riders}</div>
            <div class="hub-stat-label">Riders</div>
          </div>
          <div class="hub-stat-box">
            <div class="hub-stat-num">${hub.activePkgs}</div>
            <div class="hub-stat-label">Active parcels</div>
          </div>
        </div>
      </div>
    `;
  });
}

/* ==================== 🔑 SECURITY & MULTI-ROLE GATEWAY ==================== */

async function triggerOTPVerification(emailOrPhone, role, userObj) {
  if (isApiAuthMode()) {
    try {
      const challenge = await window.ceylonSwiftAuth.requestOtp({ identifier: emailOrPhone });
      state.pendingLoginSession = { backend: true, challengeId: challenge.challengeId };
      showUniversalOtpView();
    } catch (_) {}
    return;
  }
  const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
  state.tempOTP = generatedOTP;
  state.pendingLoginSession = { emailOrPhone, role, userObj, otp: generatedOTP };

  // Update simulator widget clock
  const timeEl = document.getElementById('device-time');
  if (timeEl) {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // Update notification widget details
  const senderEl = document.getElementById('device-sender');
  const bodyEl = document.getElementById('device-body');
  const displayEl = document.getElementById('device-otp-display');

  if (emailOrPhone.includes('@')) {
    if (senderEl) senderEl.textContent = 'CeylonSwift Security ✉️';
    if (bodyEl) bodyEl.textContent = `CeylonSwift Security: Verification OTP for ${emailOrPhone} is:`;
  } else {
    if (senderEl) senderEl.textContent = 'CeylonSwift SMS 📱';
    if (bodyEl) bodyEl.textContent = `CeylonSwift: Your verification code is:`;
  }

  if (displayEl) displayEl.textContent = generatedOTP;

  // Sound chime and slide in simulator phone widget
  playSound('ringtone');
  const widget = document.getElementById('device-simulator-widget');
  if (widget) widget.classList.add('active');

  showUniversalOtpView();
}

function showUniversalOtpView() {
  // Hide modal standard tabs & open universal OTP validation tab
  const tabs = document.getElementById('auth-portal-tabs');
  if (tabs) tabs.style.display = 'none';

  document.querySelectorAll('.auth-form-view').forEach(view => {
    view.classList.remove('active');
    view.style.display = 'none';
  });

  const otpView = document.getElementById('auth-view-universal-otp');
  if (otpView) {
    otpView.classList.add('active');
    otpView.style.display = 'block';
  }

  const otpInput = document.getElementById('universal-otp-input');
  if (otpInput) {
    otpInput.value = '';
    otpInput.focus();
  }
}

async function handleUniversalOTPVerify(event) {
  event.preventDefault();
  const inputEl = document.getElementById('universal-otp-input');
  if (!inputEl || !state.pendingLoginSession) return;

  const enteredCode = inputEl.value.trim();
  const session = state.pendingLoginSession;

  if (isApiAuthMode()) {
    try {
      await window.ceylonSwiftAuth.verifyOtp(enteredCode);
      inputEl.value = '';
      resetUniversalOTPFlow();
    } catch (_) {}
    return;
  }

  if (enteredCode === session.otp) {
    // Verified: log in
    if (session.role === 'Customer') {
      let cust = state.employees.find(emp => emp.role === 'Customer' && (emp.phone === session.emailOrPhone || emp.email === session.emailOrPhone));
      if (!cust) {
        cust = session.userObj;
        state.employees.push(cust);
        saveState('employees');
        addActivityLog('info', `New Customer Account registered automatically for ${session.emailOrPhone}`);
      }
    }

    state.activeRole = session.role;
    state.currentUser = session.userObj;

    if (session.role === 'Rider') {
      state.loggedInRider = session.userObj.name;
    }

    if (session.role === 'Owner' || session.role === 'Office') {
      state.activeTab = 'dashboard';
    } else if (session.role === 'Rider') {
      state.activeTab = 'packages';
    } else {
      state.activeTab = 'customertrack';
    }

    // Dismiss notifications & modals
    closeModal('authPortalModal');
    closeDeviceSimulator();
    playSound('chime');

    inputEl.value = '';
    applyRoleRouting();

    state.pendingLoginSession = null;
    state.tempOTP = null;
  } else {
    alert('Security Gate Warning: Invalid OTP code entered. Please check the simulated smartphone notification and try again.');
  }
}

function resetUniversalOTPFlow() {
  const tabs = document.getElementById('auth-portal-tabs');
  if (tabs) tabs.style.display = 'flex';

  const otpView = document.getElementById('auth-view-universal-otp');
  if (otpView) {
    otpView.classList.remove('active');
    otpView.style.display = 'none';
  }

  const activeTab = document.querySelector('.auth-tab-btn.active');
  if (activeTab) {
    const role = activeTab.id.replace('tab-btn-', '');
    switchAuthTab(role);
  }

  state.pendingLoginSession = null;
  state.tempOTP = null;
}

function requestBackendOtpForRole(role) {
  if (!isApiAuthMode()) {
    alert('Verification-code testing is available through the development demo login flow.');
    return;
  }
  const fields = { customer: 'cust-auth-input', rider: 'rider-login-input', office: 'office-login-input', owner: 'owner-email-input' };
  const identifier = document.getElementById(fields[role])?.value.trim();
  if (!identifier) { alert('Enter your email, phone number, or approved identifier first.'); return; }
  void triggerOTPVerification(identifier, null, null);
}

function closeDeviceSimulator() {
  const widget = document.getElementById('device-simulator-widget');
  if (widget) widget.classList.remove('active');
}

async function handleCustAuth(event) {
  event.preventDefault();
  const inputEl = document.getElementById('cust-auth-input');
  if (!inputEl) return;
  const inputVal = inputEl.value.trim();
  if (isApiAuthMode()) {
    const password = document.getElementById('cust-password-input')?.value || '';
    try { await window.ceylonSwiftAuth.login({ identifier: inputVal, password, selectedUiRole: 'Customer' }); } catch (_) {}
    return;
  }
  
  if (!inputVal) {
    alert('Please enter an email or phone number!');
    return;
  }
  
  let cust = state.employees.find(emp => emp.role === 'Customer' && (emp.phone === inputVal || emp.email === inputVal || emp.name === inputVal));
  if (!cust) {
    cust = {
      id: 'CUST-' + Math.floor(1000 + Math.random() * 9000),
      name: inputVal.includes('@') ? inputVal.split('@')[0] : inputVal,
      role: 'Customer',
      type: 'Customer',
      hub: 'Colombo',
      phone: inputVal.includes('@') ? '' : inputVal,
      email: inputVal.includes('@') ? inputVal : '',
      rating: 5.0
    };
  }
  
  triggerOTPVerification(inputVal, 'Customer', cust);
}

async function handleRiderLogin(event) {
  event.preventDefault();
  const inputEl = document.getElementById('rider-login-input');
  if (!inputEl) return;
  const val = inputEl.value.trim();
  if (isApiAuthMode()) {
    const password = document.getElementById('rider-password-input')?.value || '';
    try { await window.ceylonSwiftAuth.login({ identifier: val, password, selectedUiRole: 'Rider' }); } catch (_) {}
    return;
  }
  
  if (!val) {
    alert('Please enter your credentials!');
    return;
  }
  
  const foundRider = state.employees.find(emp => emp.type === 'Field' && (emp.id.toLowerCase() === val.toLowerCase() || emp.phone === val));
  
  if (foundRider) {
    triggerOTPVerification(foundRider.phone || foundRider.id, 'Rider', foundRider);
  } else {
    const pending = state.pendingSignups.find(p => p.type === 'Field' && (p.id.toLowerCase() === val.toLowerCase() || p.phone === val));
    if (pending) {
      alert(`Security Gate Warning: Your Rider Application (${pending.name}) is still Awaiting Verification! Please contact the hub operators or wait for Owner clearance.`);
    } else {
      alert('Security Protocol: Rider credentials not recognized. If you are new, please register using the "Join Us" tab!');
    }
  }
}

function handleRiderRegister(event) {
  event.preventDefault();
  
  const nameEl = document.getElementById('rider-signup-name');
  const phoneEl = document.getElementById('rider-signup-phone');
  const vehicleEl = document.getElementById('rider-signup-vehicle');
  const hubEl = document.getElementById('rider-signup-hub');
  
  if (!nameEl || !phoneEl || !vehicleEl || !hubEl) return;
  
  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const vehicle = vehicleEl.value;
  const hub = hubEl.value;
  
  const pendingId = 'PEND-R-' + Math.floor(100 + Math.random() * 900);
  
  const newSignup = {
    id: pendingId,
    name,
    phone,
    role: vehicle,
    type: 'Field',
    hub,
    status: 'Awaiting Verification',
    vehicle,
    date: new Date().toISOString().split('T')[0]
  };
  
  state.pendingSignups.push(newSignup);
  saveState('pendingsignups');
  
  addActivityLog('pending', `New Rider Application submitted by ${name} (${pendingId})`);
  
  alert(`Rider Application Submitted Successfully!\nYour Application ID is: ${pendingId}\nPlease note that it is currently Awaiting Verification by our sorting hub coordinators or owner.`);
  
  nameEl.value = '';
  phoneEl.value = '';
  
  toggleRiderSubView('login');
  closeModal('authPortalModal');
  playSound('beep');
}

async function handleOfficeLogin(event) {
  event.preventDefault();
  const inputEl = document.getElementById('office-login-input');
  if (!inputEl) return;
  const val = inputEl.value.trim();
  if (isApiAuthMode()) {
    const password = document.getElementById('office-password-input')?.value || '';
    try { await window.ceylonSwiftAuth.login({ identifier: val, password, selectedUiRole: 'Office' }); } catch (_) {}
    return;
  }
  
  if (!val) {
    alert('Please enter your staff ID or phone!');
    return;
  }
  
  const foundStaff = state.employees.find(emp => emp.type === 'Office' && (emp.id.toLowerCase() === val.toLowerCase() || emp.phone === val));
  
  if (foundStaff) {
    triggerOTPVerification(foundStaff.phone || foundStaff.id, 'Office', foundStaff);
  } else {
    const pending = state.pendingSignups.find(p => p.type === 'Office' && (p.id.toLowerCase() === val.toLowerCase() || p.phone === val));
    if (pending) {
      alert(`Security Gate Warning: Your staff coordinator profile (${pending.name}) is still Awaiting Verification by the Owner. Standard coordinators cannot authorize other staff accounts.`);
    } else {
      alert('Security Protocol: Office credentials not recognized. Please submit a "Sign Up Request" if you are a newly hired team member.');
    }
  }
}

function handleOfficeRegister(event) {
  event.preventDefault();
  
  const nameEl = document.getElementById('office-signup-name');
  const phoneEl = document.getElementById('office-signup-phone');
  const roleEl = document.getElementById('office-signup-role');
  const hubEl = document.getElementById('office-signup-hub');
  
  if (!nameEl || !phoneEl || !roleEl || !hubEl) return;
  
  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const role = roleEl.value;
  const hub = hubEl.value;
  
  const pendingId = 'PEND-S-' + Math.floor(100 + Math.random() * 900);
  
  const newSignup = {
    id: pendingId,
    name,
    phone,
    role,
    type: 'Office',
    hub,
    status: 'Awaiting Verification',
    date: new Date().toISOString().split('T')[0]
  };
  
  state.pendingSignups.push(newSignup);
  saveState('pendingsignups');
  
  addActivityLog('pending', `New Coordinator Signup submitted by ${name} (${pendingId})`);
  
  alert(`Office Coordinator Application Submitted Successfully!\nYour Application Reference is: ${pendingId}\nSecurity Protocol: This request requires direct Owner clearance and activation.`);
  
  nameEl.value = '';
  phoneEl.value = '';
  
  toggleOfficeSubView('login');
  closeModal('authPortalModal');
  playSound('beep');
}

async function handleOwnerAuthStep1(event) {
  event.preventDefault();
  const emailEl = document.getElementById('owner-email-input');
  const passEl = document.getElementById('owner-password-input');
  
  if (!emailEl || !passEl) return;
  
  const email = emailEl.value.trim();
  const password = passEl.value;
  
  try {
    await window.ceylonSwiftAuth.login({ identifier: email, password, selectedUiRole: 'Owner' });
    emailEl.value = '';
    passEl.value = '';
  } catch (_) {}
}

function handleOwnerAuthStep2(event) {
  event.preventDefault();
}

function resetOwnerAuthFlow() {
}

/* ==================== 🎨 PERSISTENT THEME SWITCHING ENGINE ==================== */

function toggleTheme(event) {
  const switchingToLight = !document.body.classList.contains('light-theme');
  const applyTheme = () => {
    const isLight = document.body.classList.toggle('light-theme');
    const theme = isLight ? 'light' : 'dark';
    localStorage.setItem('ceylonswift_theme', theme);
    saveUserPreference('theme', theme);
    updateThemeUI();
  };

  const reduceMotion = document.body.classList.contains('performance-lite')
    || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    || typeof document.startViewTransition !== 'function';

  if (reduceMotion) {
    applyTheme();
    return;
  }

  const source = event?.currentTarget || document.getElementById('professional-theme-toggle');
  const rect = source?.getBoundingClientRect();
  const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
  const radius = Math.hypot(
    Math.max(originX, window.innerWidth - originX),
    Math.max(originY, window.innerHeight - originY)
  );

  const transition = document.startViewTransition(applyTheme);
  transition.ready.then(() => {
    const root = document.documentElement;
    root.dataset.themeTransition = switchingToLight ? 'to-light' : 'to-dark';
    const animation = root.animate(
      switchingToLight
        ? { clipPath: [`circle(0px at ${originX}px ${originY}px)`, `circle(${radius}px at ${originX}px ${originY}px)`] }
        : { clipPath: [`circle(${radius}px at ${originX}px ${originY}px)`, `circle(0px at ${originX}px ${originY}px)`] },
      {
        duration: switchingToLight ? 620 : 680,
        easing: switchingToLight ? 'cubic-bezier(.22,.8,.24,1)' : 'cubic-bezier(.76,0,.28,1)',
        pseudoElement: switchingToLight ? '::view-transition-new(root)' : '::view-transition-old(root)'
      }
    );
    animation.finished.finally(() => delete root.dataset.themeTransition);
  }).catch(() => {});
}

function updateThemeUI() {
  const isLight = document.body.classList.contains('light-theme');
  
  const iconLight = document.getElementById('theme-icon-light');
  const iconDark = document.getElementById('theme-icon-dark');
  if (iconLight && iconDark) {
    iconLight.style.display = isLight ? 'block' : 'none';
    iconDark.style.display = isLight ? 'none' : 'block';
  }

  // Update public navbar icons
  document.querySelectorAll('.theme-pub-icon').forEach(icon => {
    icon.textContent = isLight ? '☀️' : '🌙';
  });
  const professionalToggle = document.getElementById('professional-theme-toggle');
  if (professionalToggle) professionalToggle.setAttribute('aria-checked', String(isLight));
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = isLight ? '#f4f6fa' : '#0d1422';
  updateSettingsUI();
}

function initTheme() {
  const savedTheme = localStorage.getItem('ceylonswift_theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
  updateThemeUI();
}

/* ==================== 🌐 SIMULATED GOOGLE AUTH ENGINE ==================== */

function openGoogleSelector() {
  if (isApiAuthMode()) { void window.ceylonSwiftAuth.startGoogleLogin(); return; }
  closeModal('authPortalModal');
  openModal('googleAuthModal');
  
  const chooser = document.getElementById('google-accounts-chooser');
  const custom = document.getElementById('google-custom-account-view');
  const spinner = document.getElementById('google-spinner-view');

  if (chooser) chooser.style.display = 'block';
  if (custom) custom.style.display = 'none';
  if (spinner) spinner.style.display = 'none';
}

function selectGoogleAccount(email, name) {
  if (isApiAuthMode()) { void window.ceylonSwiftAuth.startGoogleLogin(); return; }
  const chooser = document.getElementById('google-accounts-chooser');
  const custom = document.getElementById('google-custom-account-view');
  const spinner = document.getElementById('google-spinner-view');
  const spinnerText = document.getElementById('google-loading-text');

  if (chooser) chooser.style.display = 'none';
  if (custom) custom.style.display = 'none';
  if (spinner) spinner.style.display = 'block';
  if (spinnerText) spinnerText.textContent = `Signing you in as ${name}...`;

  setTimeout(() => {
    if (email === 'prabothweerawansha@gmail.com') {
      // System Owner Login
      state.activeRole = 'Owner';
      state.currentUser = state.employees.find(emp => emp.role === 'System Owner') || {
        id: 'EMP-001',
        name: 'Praboth Weerasinghe',
        role: 'System Owner',
        type: 'Office',
        hub: 'Colombo',
        phone: '0770000001',
        email: 'prabothweerawansha@gmail.com',
        rating: 5.0
      };
      state.activeTab = 'dashboard';
      addActivityLog('info', `Owner Praboth logged in via Google Auth One-Click.`);
    } else {
      // Customer Login
      let cust = state.employees.find(emp => emp.role === 'Customer' && emp.email === email);
      if (!cust) {
        cust = {
          id: 'CUST-' + Math.floor(1000 + Math.random() * 9000),
          name: name,
          role: 'Customer',
          type: 'Customer',
          hub: 'Colombo',
          phone: '',
          email: email,
          rating: 5.0
        };
        state.employees.push(cust);
        saveState('employees');
        addActivityLog('info', `New Customer Account registered via Google for ${email}`);
      }
      
      state.activeRole = 'Customer';
      state.currentUser = cust;
      state.activeTab = 'customertrack';
    }

    closeModal('googleAuthModal');
    applyRoleRouting();
    playSound('chime');
  }, 1500);
}

function triggerGoogleCustomAccount() {
  const chooser = document.getElementById('google-accounts-chooser');
  const custom = document.getElementById('google-custom-account-view');
  if (chooser) chooser.style.display = 'none';
  if (custom) custom.style.display = 'block';
  
  const emailInput = document.getElementById('google-custom-email');
  if (emailInput) emailInput.value = '';
}

function backToGoogleChooser() {
  const chooser = document.getElementById('google-accounts-chooser');
  const custom = document.getElementById('google-custom-account-view');
  if (chooser) chooser.style.display = 'block';
  if (custom) custom.style.display = 'none';
}

function handleGoogleCustomLogin(event) {
  event.preventDefault();
  const emailInput = document.getElementById('google-custom-email');
  if (!emailInput) return;

  const email = emailInput.value.trim();
  const name = email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

  if (isApiAuthMode()) { void window.ceylonSwiftAuth.startGoogleLogin(); return; }
  selectGoogleAccount(email, name);
}

/* ==================== 🛠️ OWNER SYSTEM DATABASE RESET ==================== */

function resetSystemDatabase() {
  if (isApiAuthMode()) { alert('API mode data is backend-managed and cannot be erased from browser storage.'); return; }
  if (confirm("⚠️ WARNING: Are you sure you want to completely erase all CeylonSwift databases and reset all data to clean defaults? This action cannot be undone!")) {
    localStorage.removeItem('ceylonswift_packages');
    localStorage.removeItem('ceylonswift_employees');
    localStorage.removeItem('ceylonswift_hubs');
    localStorage.removeItem('ceylonswift_activities');
    localStorage.removeItem('ceylonswift_custrequests');
    localStorage.removeItem('ceylonswift_pending_signups');
    localStorage.removeItem('ceylonswift_theme');
    
    alert("Database flushed successfully. Reloading platform...");
    window.location.reload();
  }
}

/* ==================== 🔐 SECURE VERIFICATION OPERATIONS ==================== */

function renderVerificationBoard() {
  if (isApiAuthMode() && window.ceylonSwiftWorkforce) {
    window.ceylonSwiftWorkforce.renderApprovals();
    return;
  }
  const ridersList = document.getElementById('pending-riders-list');
  const staffList = document.getElementById('pending-staff-list');
  const ridersCount = document.getElementById('pending-riders-count');
  const staffCount = document.getElementById('pending-staff-count');
  const restrictedView = document.getElementById('staff-restricted-view');
  const staffTableWrapper = document.getElementById('pending-staff-table-wrapper');
  const directHirePanel = document.getElementById('direct-employee-hire-panel');
  
  if (!ridersList) return;
  
  ridersList.innerHTML = '';
  if (staffList) staffList.innerHTML = '';
  
  const pendingRiders = state.pendingSignups.filter(p => p.type === 'Field');
  const pendingStaff = state.pendingSignups.filter(p => p.type === 'Office');
  
  if (ridersCount) {
    ridersCount.textContent = `${pendingRiders.length} Awaiting Approval`;
  }
  
  if (pendingRiders.length === 0) {
    ridersList.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:16px;">No pending rider applications in queue.</td></tr>`;
  } else {
    pendingRiders.forEach(rider => {
      ridersList.innerHTML += `
        <tr>
          <td><strong style="color:var(--primary);">${rider.name}</strong><br><span style="font-size:10px; color:var(--text-muted);">Ref: ${rider.id}</span></td>
          <td>📞 ${rider.phone}<br><span style="font-size:10px; color:var(--text-muted);">Submitted: ${rider.date || 'Today'}</span></td>
          <td><strong>${rider.role}</strong><br><span style="font-size:11px; color:var(--primary);">Hub: ${rider.hub}</span></td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-success" style="padding:6px 12px; font-size:11px;" onclick="approveSignup('${rider.id}')">Verify</button>
              <button class="btn btn-danger" style="padding:6px 12px; font-size:11px;" onclick="rejectSignup('${rider.id}')">Reject</button>
            </div>
          </td>
        </tr>
      `;
    });
  }
  
  if (state.activeRole === 'Office') {
    if (restrictedView) restrictedView.style.display = 'block';
    if (staffTableWrapper) staffTableWrapper.style.display = 'none';
    if (directHirePanel) directHirePanel.style.display = 'none';
    if (staffCount) {
      staffCount.textContent = 'Owner Clearance Required 👑';
      staffCount.className = 'badge badge-owner';
    }
  } else if (state.activeRole === 'Owner') {
    if (restrictedView) restrictedView.style.display = 'none';
    if (staffTableWrapper) staffTableWrapper.style.display = 'block';
    if (directHirePanel) directHirePanel.style.display = 'block';
    
    if (staffCount) {
      staffCount.textContent = `${pendingStaff.length} Awaiting Owner Approval`;
      staffCount.className = 'badge badge-pending';
    }
    
    if (staffList) {
      if (pendingStaff.length === 0) {
        staffList.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:16px;">No pending staff signups in queue.</td></tr>`;
      } else {
        pendingStaff.forEach(staff => {
          staffList.innerHTML += `
            <tr>
              <td><strong style="color:var(--role-owner);">${staff.name}</strong><br><span style="font-size:10px; color:var(--text-muted);">Ref: ${staff.id}</span></td>
              <td>📞 ${staff.phone}<br><span style="font-size:10px; color:var(--text-muted);">Submitted: ${staff.date || 'Today'}</span></td>
              <td><strong>${staff.role}</strong><br><span style="font-size:11px; color:var(--primary);">Hub: ${staff.hub}</span></td>
              <td>
                <div class="action-buttons">
                  <button class="btn btn-success" style="padding:6px 12px; font-size:11px;" onclick="approveSignup('${staff.id}')">Verify</button>
                  <button class="btn btn-danger" style="padding:6px 12px; font-size:11px;" onclick="rejectSignup('${staff.id}')">Reject</button>
                </div>
              </td>
            </tr>
          `;
        });
      }
    }
  }
}

function approveSignup(id) {
  if (isApiAuthMode() && window.ceylonSwiftWorkforce) {
    void window.ceylonSwiftWorkforce.decideApproval(id, true);
    return;
  }
  const index = state.pendingSignups.findIndex(p => p.id === id);
  if (index === -1) return;
  const signup = state.pendingSignups[index];
  
  if (signup.type === 'Office' && state.activeRole !== 'Owner') {
    alert('Security Violation: Only the system Owner can authorize staff registrations!');
    return;
  }
  
  const newEmpId = 'EMP-' + Math.floor(108 + Math.random() * 90);
  const newEmployee = {
    id: newEmpId,
    name: signup.name,
    role: signup.role,
    type: signup.type,
    hub: signup.hub,
    phone: signup.phone,
    rating: 5.0,
    ...(signup.type === 'Field' && { status: 'Available' })
  };
  
  state.employees.push(newEmployee);
  state.pendingSignups.splice(index, 1);
  
  saveState('employees');
  saveState('pendingsignups');
  
  addActivityLog('success', `Verification Approved: ${signup.name} joined as active ${signup.role} (${newEmpId})`);
  playSound('chime');
  
  renderVerificationBoard();
  
  if (state.activeTab === 'employees') {
    renderEmployeesGrid();
  }
}

function rejectSignup(id) {
  if (isApiAuthMode() && window.ceylonSwiftWorkforce) {
    void window.ceylonSwiftWorkforce.decideApproval(id, false);
    return;
  }
  const index = state.pendingSignups.findIndex(p => p.id === id);
  if (index === -1) return;
  const signup = state.pendingSignups[index];
  
  if (signup.type === 'Office' && state.activeRole !== 'Owner') {
    alert('Security Violation: Only the system Owner can reject staff registrations!');
    return;
  }
  
  if (!confirm(`Are you sure you want to reject the registration request of ${signup.name}?`)) return;
  
  state.pendingSignups.splice(index, 1);
  saveState('pendingsignups');
  
  addActivityLog('pending', `Verification Rejected: signup request for ${signup.name} declined.`);
  playSound('beep');
  
  renderVerificationBoard();
}

function handleDirectHireOffice(event) {
  event.preventDefault();
  if (isApiAuthMode()) {
    window.ceylonSwiftWorkforce?.openInvite();
    return;
  }
  if (state.activeRole !== 'Owner') {
    alert('Security Access Blocked: Only the Owner can perform direct employee hiring!');
    return;
  }
  
  const nameEl = document.getElementById('hire-name');
  const phoneEl = document.getElementById('hire-phone');
  const roleEl = document.getElementById('hire-role');
  const hubEl = document.getElementById('hire-hub');
  
  if (!nameEl || !phoneEl || !roleEl || !hubEl) return;
  
  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const role = roleEl.value;
  const hub = hubEl.value;
  
  const newEmpId = 'EMP-' + Math.floor(108 + Math.random() * 90);
  
  const newEmp = {
    id: newEmpId,
    name,
    role,
    type: 'Office',
    hub,
    phone,
    rating: 5.0
  };
  
  state.employees.push(newEmp);
  saveState('employees');
  
  addActivityLog('info', `Owner directly verified and hired staff member: ${name} as ${role} (${newEmpId})`);
  
  alert(`Direct Hire Successful!\nVerified employee ${name} has been added to CeylonSwift workspace directory with staff ID: ${newEmpId}`);
  
  nameEl.value = '';
  phoneEl.value = '';
  
  renderVerificationBoard();
  playSound('chime');
}

/* ==================== 🚪 SESSION TERMINATION ENGINE ==================== */

async function handleLogout() {
  resetSavedNavigationSection();
  if (isApiAuthMode()) await window.ceylonSwiftAuth.logout();
  if (state.isSimulating) {
    clearInterval(state.simulationInterval);
    state.isSimulating = false;
    
    const startBtn = document.getElementById('sim-start-btn');
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = '⚡ Launch Hyper-Speed Dispatch';
    }
    const badge = document.getElementById('sim-status-badge');
    if (badge) {
      badge.textContent = 'Ready';
      badge.className = 'badge badge-pending';
    }
    const bike = document.getElementById('sim-vehicle');
    if (bike) bike.classList.remove('active');
  }
  
  addActivityLog('info', `User logout initiated: ${state.currentUser ? state.currentUser.name : 'Operator'} logged out.`);
  
  state.activeRole = null;
  state.currentUser = null;
  state.activeTab = 'public-home';
  
  const modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(m => m.classList.remove('active'));
  
  resetOwnerAuthFlow();
  applyRoleRouting();
  playSound('beep');
}
