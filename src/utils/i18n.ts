export type AppLanguage = 'en' | 'ro';
export type AppTheme = 'dark' | 'light';

const LANGUAGE_STORAGE_KEY = 'stuvyra_language_v1';
const THEME_STORAGE_KEY = 'stuvyra_theme_v1';

export function getSavedLanguage(): AppLanguage {
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (raw === 'ro' || raw === 'en') {
      return raw;
    }
  } catch {
    // Ignore storage error
  }
  return 'en';
}

export function saveLanguagePreference(lang: AppLanguage): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Ignore storage error
  }
}

export function getSavedTheme(): AppTheme {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') {
      return raw;
    }
  } catch {
    // Ignore storage error
  }
  return 'dark';
}

export function saveThemePreference(theme: AppTheme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage error
  }
}

export const TRANSLATIONS = {
  en: {
    // Navigation & Toolbar
    navDashboard: 'Dashboard',
    navMaterials: 'Materials & Schedule',
    navMaterialsShort: 'Materials & Plan',
    navSimulator: 'Exam Simulator',
    navWeekly: 'Weekly Progress',
    switchAccount: 'Switch Account',
    langLabel: 'Language',
    langEnglish: 'English',
    langRomanian: 'Română',
    themeLightLabel: 'Light Glass',
    themeDarkLabel: 'Dark Glass',
    themeToggleAria: 'Toggle between Liquid Glass light and dark theme',

    // Primitives
    skeletonDefault: 'Generating with Gemini AI...',
    synthesizing: 'Synthesizing',
    errorHeadline: 'Something went wrong while generating AI results',
    dismiss: 'Dismiss',
    tryAgain: 'Try Again',

    // Onboarding
    onboardTitle: 'Create Your Academic Workspace',
    onboardSubtitle:
      'Set up your university profile so Gemini can tailor your semester dashboard, study schedules, and exam simulations.',
    fillSampleProfile: 'Fill Sample Student Profile',
    savedAccountsTitle: 'Saved Accounts in This Browser',
    usernameLabel: 'Username',
    usernamePlaceholder: 'e.g. elena_vance',
    universityLabel: 'University Name',
    universityPlaceholder: 'e.g. ETH Zurich or Politehnica Bucharest',
    facultyLabel: 'Faculty Name',
    facultyPlaceholder: 'e.g. Faculty of Automatic Control & Computers',
    majorLabel: 'Major / Degree Program',
    majorPlaceholder: 'e.g. Computer Science & AI',
    yearLabel: 'Year of Study',
    yearSelectPlaceholder: 'Select Year of Study',
    yearOptions: [
      'Year 1 (Freshman)',
      'Year 2 (Sophomore)',
      'Year 3 (Junior)',
      'Year 4 (Senior)',
      "Graduate / Master's",
    ],
    semesterLabel: 'Current Semester',
    semesterSelectPlaceholder: 'Select Current Semester',
    semesterOptions: [
      'Fall Semester 2026',
      'Spring Semester 2027',
      'Summer Term 2026',
      'Winter Semester 2026/27',
    ],
    initialSubjectsLabel:
      'Current Semester Subjects (comma-separated, optional — you can also add or edit on the Dashboard)',
    initialSubjectsPlaceholder:
      'e.g. Advanced Algorithms, Statistical Learning, Numerical Linear Algebra',
    browserPersistenceNote:
      'All study data is saved in your browser and linked to your account.',
    createAccountBtn: 'Create Account & Launch Dashboard',

    // Validation Errors
    errUsernameReq: 'Please enter a username for your account.',
    errUsernameMin: 'Username must be at least 2 characters.',
    errUniversityReq: 'Please enter your university name.',
    errFacultyReq: 'Please enter your faculty or school name.',
    errMajorReq: 'Please enter your major or degree program.',
    errYearReq: 'Please select your year of study.',
    errSemesterReq: 'Please select your current semester.',

    // Dashboard View
    buildAcademicPlanBtn: 'Build Academic Plan with Gemini',
    synthesizingBtn: 'Synthesizing...',
    overviewSkeleton: 'Gemini is organizing your semester dashboard & milestones...',
    defaultSemesterStrategy:
      'Add your semester subjects below and let Gemini build your tailored study schedule, exam countdowns, and milestone reminders.',
    kpiTodayStudyTime: "Today's Study Time",
    kpiExercisesSolvedToday: 'Exercises Solved Today',
    kpiSemesterSubjects: 'Semester Subjects',
    kpiCoursePdfsUploaded: 'Course PDFs Uploaded',

    aiDailyInsightsTitle: 'AI Daily Insights',
    refreshBtn: 'Refresh',
    insightSkeleton: 'Gemini is reviewing your study performance today...',
    summaryOfDayLabel: 'Summary of Your Day So Far',
    nextSessionSuggestionLabel: 'Next Study Session Suggestion',
    recommendedLabel: 'Recommended:',
    openStudyPlanBtn: 'Open Study Plan',

    subjectsSectionTitle: 'Current Semester Subjects & Exam Dates',
    subjectsSectionSubtitle:
      'Tell Stuvyra what subjects you have this semester and set your midterm and final exam dates.',
    uploadPdfsShortcutBtn: 'Upload Course PDFs & Exercises',
    addSubjectFormTitle: 'Add a Subject for',
    subjectNameLabel: 'Subject Name',
    subjectNamePlaceholder: 'e.g. Operating Systems & Kernel Design',
    courseCodeLabel: 'Course Code',
    courseCodePlaceholder: 'e.g. CS-205',
    midtermDateLabel: 'Midterm Exam Date',
    finalDateLabel: 'Final Exam Date',
    addSubjectBtn: 'Add Subject',
    subjectNameErr: 'Please enter a subject name for your current semester.',
    noSubjectsYet:
      'No subjects added yet. Enter your current semester subjects above to get started.',
    pdfsCountLabel: 'PDFs',
    exercisesCountLabel: 'Exercises',
    midtermInLabel: 'Midterm in',
    finalInLabel: 'Final in',
    pastLabel: 'Past',
    midtermShort: 'Midterm:',
    finalShort: 'Final:',

    remindersSectionTitle: 'Deadlines & Study Milestones',
    remindersSectionSubtitle:
      'Reminders for upcoming assignment deadlines, midterms, and study milestones.',
    reminderInputPlaceholder: 'Add assignment deadline or study milestone...',
    catAssignment: 'Assignment Deadline',
    catMilestone: 'Study Milestone',
    catMidterm: 'Midterm Exam',
    catFinal: 'Final Exam',
    addReminderBtn: 'Add Reminder',
    reminderTitleErr: 'Please enter a reminder or milestone title.',
    overdueLabel: 'Overdue',
    dueTodayLabel: 'Due Today',
    inDaysPrefix: 'In',
    doneLabel: 'Done',

    // Materials & Schedule View
    materialsTitle: 'Course PDFs, Faculty Exercises & AI Study Schedule',
    materialsSubtitle:
      'Upload your course lecture PDFs and faculty exercise sheets, confirm midterm and final exam dates, and let Gemini generate your personalized study schedule and actionable learning insights.',
    generateScheduleBtn: 'Generate Study Schedule & Insights',
    generatingScheduleBtn: 'Generating Schedule & Insights...',
    materialsStep1Title: '1. Course PDFs & Exam Dates by Subject',
    materialsStep1Subtitle:
      'Select a subject to set its midterm/final exam dates and upload course PDFs.',
    activeSubjectLabel: 'Active Subject',
    pdfTopicsLabel: 'Course PDF Key Topics / Syllabus Notes (optional)',
    pdfTopicsPlaceholder: 'e.g. Lecture 05: Dynamic Programming & Amortized Analysis',
    uploadPdfBtn: 'Upload Course PDF',
    attachSamplePdfBtn: 'Attach Sample Lecture PDF',

    materialsStep2Title: '2. Faculty Exercises & Gemini Hints',
    materialsStep2Subtitle:
      'Input exercises from your faculty sheets, ask Gemini for step-by-step hints, and mark exercises solved.',
    exTitlePlaceholder: 'Exercise title (e.g. Sheet 5.1 — Spectral Clustering)',
    exPromptPlaceholder: 'Paste or type the faculty exercise problem statement...',
    exErrReq: 'Please provide both an exercise title and problem prompt.',
    addExerciseBtn: 'Add Faculty Exercise',
    solvedLabel: 'Solved',
    unsolvedLabel: 'Unsolved',
    getHintBtn: 'Get Hint',
    thinkingBtn: 'Thinking...',
    hintSkeletonLabel: 'Gemini is crafting a hint for this exercise...',
    geminiHintPrefix: 'Gemini Hint:',

    planSkeletonLabel:
      'Gemini is analyzing your uploaded course PDFs, faculty exercises, and midterm/final exam dates...',
    scheduleCardTitle: 'Personalized AI Study Schedule',
    scheduleCardSubtitle:
      'Check off completed study blocks to log study minutes directly to your account.',
    insightsCardTitle: 'Actionable Learning Insights',
    insightsCardSubtitle:
      'Synthesized from your course PDFs, unsolved exercises, and exam countdowns.',

    // Exam Simulator View
    simulatorTitle: 'Gemini Exam Simulator & Exercise Hints',
    simulatorSubtitle:
      'Simulate a university midterm or final exam tailored to the faculty exercises and course PDFs you inputted, with on-demand Gemini hints for every problem.',
    simulateNewExamBtn: 'Simulate New Exam with Gemini',
    assemblingExamBtn: 'Assembling Exam with Gemini...',
    targetSubjectSimLabel: 'Target Subject for Exam Simulation',
    extraExercisesSimLabel:
      'Additional Faculty Exercises or Topics to Include in Simulation (optional)',
    extraExercisesSimPlaceholder:
      'Paste an exercise prompt or topic (e.g. Dynamic Programming on Trees, Min-Cut reductions)...',
    simSkeletonLabel:
      'Gemini is crafting exam questions from your faculty exercises & PDFs...',
    simulatedExamBadge: 'Simulated University Exam',
    minTargetSuffix: 'min target',
    totalPointsSuffix: 'total points',
    examScoreLabel: 'Exam Score',
    examinerSummaryPrefix: 'Gemini Examiner Summary:',
    questionLabel: 'Question',
    getGeminiHintBtn: 'Get Gemini Hint',
    generatingHintBtn: 'Generating Hint...',
    questionHintSkeleton: 'Gemini is preparing a Socratic hint for this problem...',
    yourSolutionForLabel: 'Your Derivation / Solution for Question',
    solutionPlaceholder:
      'Write your proof, algorithm steps, or mathematical derivation here...',
    gradingFeedbackTitle: 'Gemini Grading Feedback',
    awardedLabel: 'Awarded:',
    referenceSolutionPrefix: 'Reference Solution:',
    gradingSkeletonLabel:
      'Gemini is evaluating your exam solutions and awarding points...',
    submitExamNote:
      "Submitting logs your study duration and solved exercises to today's progress chart.",
    submitGradeBtn: 'Submit & Grade Exam with Gemini',
    reGradeBtn: 'Re-Grade Exam with Gemini',
    gradingBtn: 'Grading with Gemini...',

    // Weekly Progress View
    weeklyTitle: 'Weekly Study Analytics & Date History',
    weeklySubtitle:
      'Smooth 7-day chart of time spent studying and exercises solved, with a date selector to look back at previous days.',
    inspectDateLabel: 'Inspect Date:',
    jumpToTodayBtn: 'Jump to Today',
    kpi7DayStudyTime: '7-Day Study Time',
    kpi7DayExercises: '7-Day Exercises Solved',
    kpiDailyAverage: 'Daily Average',
    kpiActiveStudyDays: 'Active Study Days',
    daysSuffix: 'days',
    daySuffix: 'day',
    curveTitle: '7-Day Study Minutes & Solved Exercises Curve',
    legendMinutes: 'Solid Cyan Curve: Time Studied (min)',
    legendExercises: 'Dashed Violet Curve: Exercises Solved',
    exercisesWord: 'exercises',
    studyRecordForTitle: 'Study Record for',
    studyRecordSubtitle:
      'Detailed breakdown of time spent studying, exercises solved, and session notes for this date.',
    studiedShort: 'Studied:',
    solvedShort: 'Solved:',
    subjectsStudiedPrefix: 'Subjects Studied:',
    completedSessionsOnTitle: 'Completed Sessions & Notes on',
    noSessionsOnDate:
      'No study sessions recorded on this date yet. Use the form on the right to log time or exercises for this day.',
    logSessionForTitle: 'Log Study Session for',
    logSessionSubtitle:
      'Record study minutes and solved exercises for any selected day.',
    minutesStudiedLabel: 'Minutes Studied',
    exercisesSolvedLabel: 'Exercises Solved',
    subjectLabel: 'Subject',
    sessionNoteLabel: 'Session Note (optional)',
    sessionNotePlaceholder:
      'e.g. Solved 2 min-cut exercises from Faculty Sheet 4',
    saveStudyLogBtn: 'Save Study Log to Account',

    // Empty States & Clean Account Notices
    dateNotSet: 'Not set',
    noRemindersYet:
      'No deadlines or study milestones yet. Add an assignment deadline or exam date above.',
    noPdfsYet:
      'No course PDFs uploaded yet. Select a subject above and upload your lecture PDF.',
    noExercisesYet:
      'No faculty exercises added yet. Input exercises above to practice and request Gemini hints.',
    noScheduleYet:
      'No AI study schedule generated yet. Upload your course PDFs and exercises on your subjects first, then click "Generate Study Schedule & Insights".',
    noInsightsYet:
      'No actionable learning insights yet. They will appear once you upload your course PDFs and generate your study plan.',
    needSubjectAndPdfErr:
      'Please add at least one subject and upload a course PDF for it before generating your personalized AI study schedule and insights.',
    noExamSimulatedYet:
      'No simulated exam generated yet. Add a subject and your faculty exercises, then click "Simulate New Exam with Gemini".',
    emptyDailyInsightSummary:
      'No study activity logged today yet. Add your current semester subjects and start your first study session.',
    emptyDailyInsightSuggestion:
      'Add your semester subjects and upload your course PDFs so Gemini can suggest your next focused study session.',
  },
  ro: {
    // Navigation & Toolbar
    navDashboard: 'Panou Principal',
    navMaterials: 'Materiale și Orar',
    navMaterialsShort: 'Materiale & Orar',
    navSimulator: 'Simulator Examen',
    navWeekly: 'Progres Săptămânal',
    switchAccount: 'Schimbă Contul',
    langLabel: 'Limbă',
    langEnglish: 'English',
    langRomanian: 'Română',
    themeLightLabel: 'Sticlă Luminoasă',
    themeDarkLabel: 'Sticlă Întunecată',
    themeToggleAria: 'Comută între tema luminoasă și tema întunecată Liquid Glass',

    // Primitives
    skeletonDefault: 'Se generează cu Gemini AI...',
    synthesizing: 'Se procesează',
    errorHeadline: 'A apărut o problemă la generarea rezultatelor AI',
    dismiss: 'Închide',
    tryAgain: 'Încearcă din nou',

    // Onboarding
    onboardTitle: 'Creează-ți Spațiul Academic de Studiu',
    onboardSubtitle:
      'Configurează-ți profilul universitar pentru ca Gemini să îți personalizeze materiile din acest semestru, programul de învățare și simulările de examen.',
    fillSampleProfile: 'Completează Profil Demonstrativ (UPB)',
    savedAccountsTitle: 'Conturi Salvate în Acest Browser',
    usernameLabel: 'Nume de utilizator',
    usernamePlaceholder: 'ex. andrei_popescu',
    universityLabel: 'Universitatea',
    universityPlaceholder: 'ex. Universitatea Politehnica din București / UBB Cluj',
    facultyLabel: 'Facultatea',
    facultyPlaceholder: 'ex. Facultatea de Automatică și Calculatoare',
    majorLabel: 'Specializarea / Programul de studiu',
    majorPlaceholder: 'ex. Calculatoare și Tehnologia Informației',
    yearLabel: 'Anul de studiu',
    yearSelectPlaceholder: 'Selectează anul de studiu',
    yearOptions: [
      'Anul 1 (Licență)',
      'Anul 2 (Licență)',
      'Anul 3 (Licență)',
      'Anul 4 (Licență)',
      'Masterat / Studii Postuniversitare',
    ],
    semesterLabel: 'Semestrul curent',
    semesterSelectPlaceholder: 'Selectează semestrul curent',
    semesterOptions: [
      'Semestrul I (Toamnă 2026)',
      'Semestrul II (Primăvară 2027)',
      'Sesiunea de Vară 2026',
      'Semestrul de Iarnă 2026/27',
    ],
    initialSubjectsLabel:
      'Materiile din semestrul curent (separate prin virgulă, opțional — le poți adăuga sau edita și în Panoul Principal)',
    initialSubjectsPlaceholder:
      'ex. Proiectarea Algoritmilor, Învățare Automată, Algebră Liniară Numerică',
    browserPersistenceNote:
      'Toate datele de studiu sunt salvate local în browser și păstrate în contul tău.',
    createAccountBtn: 'Creează Contul și Deschide Panoul',

    // Validation Errors
    errUsernameReq: 'Te rugăm să introduci un nume de utilizator.',
    errUsernameMin: 'Numele de utilizator trebuie să aibă cel puțin 2 caractere.',
    errUniversityReq: 'Te rugăm să introduci numele universității.',
    errFacultyReq: 'Te rugăm să introduci numele facultății.',
    errMajorReq: 'Te rugăm să introduci specializarea.',
    errYearReq: 'Te rugăm să selectezi anul de studiu.',
    errSemesterReq: 'Te rugăm să selectezi semestrul curent.',

    // Dashboard View
    buildAcademicPlanBtn: 'Generează Planul Academic cu Gemini',
    synthesizingBtn: 'Se generează...',
    overviewSkeleton:
      'Gemini îți organizează panoul semestrial și obiectivele de studiu...',
    defaultSemesterStrategy:
      'Adaugă materiile din acest semestru mai jos și lasă Gemini să îți construiască programul de studiu, numărătoarea inversă până la parțiale/examene și mementourile.',
    kpiTodayStudyTime: 'Timp Studiat Azi',
    kpiExercisesSolvedToday: 'Exerciții Rezolvate Azi',
    kpiSemesterSubjects: 'Materii în Semestru',
    kpiCoursePdfsUploaded: 'Cursuri PDF Încărcate',

    aiDailyInsightsTitle: 'Analiză AI a Zilei',
    refreshBtn: 'Actualizează',
    insightSkeleton: 'Gemini îți analizează performanța de studiu de astăzi...',
    summaryOfDayLabel: 'Rezumatul Zilei Până Acum',
    nextSessionSuggestionLabel: 'Recomandare Practică pentru Următoarea Sesiune',
    recommendedLabel: 'Recomandat:',
    openStudyPlanBtn: 'Vezi Orarul de Studiu',

    subjectsSectionTitle: 'Materiile Semestrului Curent și Datele Examenelor',
    subjectsSectionSubtitle:
      'Spune-i aplicației Stuvyra ce materii ai în acest semestru și setează data examenului parțial (colocviu) și a examenului final.',
    uploadPdfsShortcutBtn: 'Încarcă Cursuri PDF & Exerciții',
    addSubjectFormTitle: 'Adaugă o Materie pentru',
    subjectNameLabel: 'Numele Materiei',
    subjectNamePlaceholder: 'ex. Sisteme de Operare și Arhitectura Calculatoarelor',
    courseCodeLabel: 'Cod Materie',
    courseCodePlaceholder: 'ex. SO-205',
    midtermDateLabel: 'Data Examenului Parțial',
    finalDateLabel: 'Data Examenului Final',
    addSubjectBtn: 'Adaugă Materia',
    subjectNameErr: 'Te rugăm să introduci numele materiei pentru semestrul curent.',
    noSubjectsYet:
      'Nu ai adăugat încă nicio materie. Introdu materiile semestrului curent mai sus pentru a începe.',
    pdfsCountLabel: 'PDF-uri',
    exercisesCountLabel: 'Exerciții',
    midtermInLabel: 'Parțial în',
    finalInLabel: 'Final în',
    pastLabel: 'Trecut',
    midtermShort: 'Parțial:',
    finalShort: 'Final:',

    remindersSectionTitle: 'Termene Teme și Obiective de Studiu',
    remindersSectionSubtitle:
      'Mementouri pentru termenele temelor de casă, colocvii/parțiale și etape de învățare.',
    reminderInputPlaceholder: 'Adaugă un termen de predare sau obiectiv de studiu...',
    catAssignment: 'Termen Temă / Proiect',
    catMilestone: 'Obiectiv de Studiu',
    catMidterm: 'Examen Parțial / Colocviu',
    catFinal: 'Examen Final (Sesiune)',
    addReminderBtn: 'Adaugă Memento',
    reminderTitleErr: 'Te rugăm să introduci titlul termenului sau obiectivului.',
    overdueLabel: 'Restant',
    dueTodayLabel: 'Scadent Azi',
    inDaysPrefix: 'În',
    doneLabel: 'Finalizat',

    // Materials & Schedule View
    materialsTitle: 'Cursuri PDF, Exerciții de la Facultate și Orar AI',
    materialsSubtitle:
      'Încarcă suporturile de curs PDF și fișele de seminar/laborator de la facultate, setează datele de parțial și examen final și lasă Gemini să îți genereze orarul personalizat și recomandări de învățare.',
    generateScheduleBtn: 'Generează Orar de Studiu & Recomandări AI',
    generatingScheduleBtn: 'Se generează orarul & recomandările...',
    materialsStep1Title: '1. Cursuri PDF și Date Examene pe Materii',
    materialsStep1Subtitle:
      'Selectează o materie pentru a actualiza datele de parțial/final și pentru a încărca cursuri PDF.',
    activeSubjectLabel: 'Materia Selectată',
    pdfTopicsLabel: 'Subiecte Cheie din PDF / Notițe de Curs (opțional)',
    pdfTopicsPlaceholder: 'ex. Cursul 05: Programare Dinamică și Analiză Amortizată',
    uploadPdfBtn: 'Încarcă Curs PDF',
    attachSamplePdfBtn: 'Atașează PDF Demonstrativ de Curs',

    materialsStep2Title: '2. Exerciții de la Facultate și Indicii Gemini',
    materialsStep2Subtitle:
      'Introdu exerciții din fișele de seminar de la facultate, cere indicii pas cu pas de la Gemini și marchează exercițiile rezolvate.',
    exTitlePlaceholder: 'Titlu exercițiu (ex. Seminar 5.1 — Flux Maxim în Rețele)',
    exPromptPlaceholder: 'Lipește sau scrie enunțul exercițiului de la facultate...',
    exErrReq: 'Te rugăm să completezi atât titlul, cât și enunțul exercițiului.',
    addExerciseBtn: 'Adaugă Exercițiu de la Facultate',
    solvedLabel: 'Rezolvat',
    unsolvedLabel: 'Nerezolvat',
    getHintBtn: 'Cere Indiciu',
    thinkingBtn: 'Se gândește...',
    hintSkeletonLabel: 'Gemini pregătește un indiciu pentru acest exercițiu...',
    geminiHintPrefix: 'Indiciu Gemini:',

    planSkeletonLabel:
      'Gemini analizează cursurile PDF încărcate, exercițiile de la facultate și datele examenelor...',
    scheduleCardTitle: 'Orar de Studiu Personalizat de AI',
    scheduleCardSubtitle:
      'Bifează blocurile de studiu finalizate pentru a înregistra automat minutele în contul tău.',
    insightsCardTitle: 'Recomandări Acționabile de Învățare',
    insightsCardSubtitle:
      'Sintetizate din cursurile PDF, exercițiile nerezolvate și apropierea examenelor.',

    // Exam Simulator View
    simulatorTitle: 'Simulator de Examen Gemini & Indicii Exerciții',
    simulatorSubtitle:
      'Simulează un examen parțial sau final adaptat exercițiilor de la facultate și cursurilor PDF introduse, cu posibilitatea de a primi indicii Gemini pentru fiecare subiect.',
    simulateNewExamBtn: 'Simulează Examen Nou cu Gemini',
    assemblingExamBtn: 'Se compune examenul cu Gemini...',
    targetSubjectSimLabel: 'Materia pentru Simularea Examenului',
    extraExercisesSimLabel:
      'Exerciții de la Facultate sau Tematici Suplimentare de Inclus (opțional)',
    extraExercisesSimPlaceholder:
      'Lipește un enunț de exercițiu sau o temă (ex. Programare Dinamică pe Arbori, Tăietură Minimă)...',
    simSkeletonLabel:
      'Gemini compune subiectele de examen pe baza exercițiilor și cursurilor tale...',
    simulatedExamBadge: 'Simulare Examen Universitar',
    minTargetSuffix: 'min durată recomandată',
    totalPointsSuffix: 'puncte în total',
    examScoreLabel: 'Punctaj Examen',
    examinerSummaryPrefix: 'Evaluare Generală Gemini:',
    questionLabel: 'Subiectul',
    getGeminiHintBtn: 'Cere Indiciu Gemini',
    generatingHintBtn: 'Se generează indiciul...',
    questionHintSkeleton: 'Gemini pregătește un indiciu socratic pentru acest subiect...',
    yourSolutionForLabel: 'Rezolvare / Demonstrație pentru Subiectul',
    solutionPlaceholder:
      'Scrie demonstrația, pașii algoritmului sau rezolvarea matematică aici...',
    gradingFeedbackTitle: 'Feedback Evaluare Gemini',
    awardedLabel: 'Punctaj acordat:',
    referenceSolutionPrefix: 'Barem / Soluție de Referință:',
    gradingSkeletonLabel:
      'Gemini îți evaluează rezolvările și calculează punctajul...',
    submitExamNote:
      'Trimiterea examenului salvează automat durata de studiu și exercițiile rezolvate în graficul săptămânal.',
    submitGradeBtn: 'Trimite și Evaluează Examenul cu Gemini',
    reGradeBtn: 'Reevaluează Examenul cu Gemini',
    gradingBtn: 'Se evaluează cu Gemini...',

    // Weekly Progress View
    weeklyTitle: 'Analiză Săptămânală și Istoric pe Zile',
    weeklySubtitle:
      'Grafic neted pe 7 zile al timpului petrecut învățând și al exercițiilor rezolvate, cu selector de dată pentru a consulta zilele anterioare.',
    inspectDateLabel: 'Selectează Data:',
    jumpToTodayBtn: 'Salt la Azi',
    kpi7DayStudyTime: 'Timp Studiat (7 Zile)',
    kpi7DayExercises: 'Exerciții Rezolvate (7 Zile)',
    kpiDailyAverage: 'Medie Zilnică',
    kpiActiveStudyDays: 'Zile Active de Studiu',
    daysSuffix: 'zile',
    daySuffix: 'zi',
    curveTitle: 'Curba pe 7 Zile: Minute Studiate & Exerciții Rezolvate',
    legendMinutes: 'Curba Cyan Continuă: Timp Studiat (min)',
    legendExercises: 'Curba Violet Întreruptă: Exerciții Rezolvate',
    exercisesWord: 'exerciții',
    studyRecordForTitle: 'Jurnal de Studiu pentru',
    studyRecordSubtitle:
      'Detalii complete despre timpul petrecut învățând, exercițiile rezolvate și notițele sesiunilor din această zi.',
    studiedShort: 'Studiat:',
    solvedShort: 'Rezolvate:',
    subjectsStudiedPrefix: 'Materii parcurse:',
    completedSessionsOnTitle: 'Sesiuni Finalizate și Notițe pe',
    noSessionsOnDate:
      'Nu există sesiuni de studiu înregistrate în această zi. Folosește formularul din dreapta pentru a adăuga timp sau exerciții.',
    logSessionForTitle: 'Înregistrează Sesiune pentru',
    logSessionSubtitle:
      'Salvează minutele de studiu și exercițiile rezolvate pentru orice dată selectată.',
    minutesStudiedLabel: 'Minute Studiate',
    exercisesSolvedLabel: 'Exerciții Rezolvate',
    subjectLabel: 'Materia',
    sessionNoteLabel: 'Notiță Sesiune (opțional)',
    sessionNotePlaceholder:
      'ex. Am rezolvat 2 probleme de flux maxim din Seminarul 4',
    saveStudyLogBtn: 'Salvează Sesiunea în Cont',

    // Empty States & Clean Account Notices
    dateNotSet: 'Nesetat',
    noRemindersYet:
      'Nu există încă termene limită sau obiective de studiu. Adaugă un termen de predare sau o dată de examen mai sus.',
    noPdfsYet:
      'Niciun curs PDF încărcat încă. Selectează o materie mai sus și încarcă suportul de curs PDF.',
    noExercisesYet:
      'Niciun exercițiu de la facultate adăugat încă. Introdu exercițiile mai sus pentru a exersa și a cere indicii de la Gemini.',
    noScheduleYet:
      'Niciun orar de studiu generat încă. Încarcă mai întâi cursurile PDF și exercițiile pe materii, apoi apasă pe „Generează Orar de Studiu & Recomandări AI”.',
    noInsightsYet:
      'Nicio recomandare de învățare încă. Acestea vor apărea după ce încarci materialele de curs și generezi planul de studiu.',
    needSubjectAndPdfErr:
      'Te rugăm să adaugi cel puțin o materie și să încarci un curs PDF pentru aceasta înainte de a genera orarul personalizat și recomandările AI.',
    noExamSimulatedYet:
      'Nicio simulare de examen generată încă. Adaugă o materie și exercițiile de la facultate, apoi apasă pe „Simulează Examen Nou cu Gemini”.',
    emptyDailyInsightSummary:
      'Nu ai înregistrat încă activitate de studiu astăzi. Adaugă materiile semestrului curent și începe prima sesiune de învățare.',
    emptyDailyInsightSuggestion:
      'Adaugă materiile din acest semestru și încarcă suporturile de curs PDF pentru ca Gemini să îți poată sugera următoarea sesiune de studiu.',
  },
} as const;
