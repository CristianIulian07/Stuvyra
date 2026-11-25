# Stuvyra — AI Academic Workspace & Exam Simulator

**Stuvyra** este o platformă web full-stack și bilingvă (**Română / Engleză**) construită pentru studenții de la orice facultate care vor să își organizeze semestrul, să sintetizeze suporturile de curs PDF și fișele de seminar/laborator, să își măsoare timpul real de studiu și să își testeze cunoștințele prin simulări de examen evaluate cu **Google Gemini AI**.

## Funcționalități principale

1. **Onboarding & Multi-Account Workspace (cu Backup JSON & Persistență Server + Browser)**
   - Profil personalizat pe universitate, facultate, specializare, an și semestru
   - Stocare hibridă: sincronizare automată între backend-ul Express (`data/workspaces.json`) și `localStorage` (cu protecție automată la depășirea cotei de memorie din browser)
   - Export și import instant de backup `.json` pentru mutarea contului pe alt dispozitiv
2. **Panou Academic de Comandă & Cronometru Pomodoro Integrat**
   - Gestionarea materiilor din semestrul curent cu numărătoare inversă până la parțiale/colocvii și examenele din sesiune
   - Cronometru de studiu Pomodoro (`25m` / `45m` / `60m`) care salvează automat sesiunile în jurnalul zilnic
   - Strategie semestrială, mementouri inteligente și *Analiză AI a Zilei* generate prin Gemini
3. **Materiale PDF, Exerciții de Seminar & Orar AI Personalizat**
   - Încărcare suporturi de curs PDF (trimise multimodal către Gemini) și fișe de exerciții pe grade de dificultate (`Foundation`, `Intermediate`, `Advanced`)
   - Indicii socratice pas cu pas (*Gemini Hints*) fără a dezvălui direct rezolvarea completă
   - Generare automată de blocuri de studiu pe următoarele zile și recomandări acționabile
4. **Simulator de Examen cu Cronometru & Evaluare pe Barem**
   - Compune subiecte de examen plecând de la cursurile și exercițiile încărcate la materia aleasă
   - Cronometru live de examen, istoric complet al simulărilor anterioare, evaluare pe barem și soluții de referință
5. **Analiză Săptămânală & Grafic SVG pe 7 Zile**
   - Curbe Bezier interactive pentru minutele studiate și exercițiile rezolvate, plus jurnal istoric pe fiecare dată calendaristică
   - Temă vizuală dublă (*Dark Glass* / *Light Glass*) și comutator instant `RO / EN`

## Tehnologii utilizate

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, SVG Data Visualization
- **Backend:** Node.js, Express 4, `@google/genai` SDK (Google Gemini Structured Outputs & Multimodal PDF Input)
- **Calitate & Testare:** Node.js Test Runner (`node:test`), TypeScript strict (`tsc --noEmit`), Vite 8

```text
Stuvyra/
├── server.ts                          # Backend Express: endpoint-uri Gemini AI + API REST persistență conturi
├── src/
│   ├── App.tsx                        # Navigație, teme Dark/Light, bilingvism RO/EN și sincronizare conturi
│   ├── components/
│   │   ├── OnboardingFlow.tsx         # Creare cont, profil demonstrativ UPB, import JSON și schimbare cont
│   │   ├── DashboardView.tsx          # Panou principal, materii, termene, Pomodoro și Daily AI Insights
│   │   ├── MaterialsScheduleView.tsx  # Upload PDF-uri curs, exerciții cu indicii AI și orar personalizat
│   │   ├── ExamSimulatorView.tsx      # Simulator de examen cronometrat, evaluare AI pe barem și istoric
│   │   ├── WeeklyProgressView.tsx     # Grafic SVG pe 7 zile și jurnal istoric al sesiunilor de studiu
│   │   └── GlassPrimitives.tsx        # Componente UI reutilizabile și stări accesibile de loading/eroare
│   ├── types/
│   │   └── study.ts                   # Modele de date TypeScript partajate
│   └── utils/
│       ├── i18n.ts                    # Dicționare complete Română & Engleză
│       ├── storage.ts                 # Sincronizare localStorage + backend REST + Export/Import JSON
│       ├── studyLogic.ts              # Calcule calendaristice, agregări săptămânale și generare curbe SVG
│       └── studyLogic.test.ts         # Suite de teste unitare
└── package.json
```

## Rulare locală

### Cerințe
- **Node.js 20+**
- *(Opțional, dar recomandat)* O cheie gratuită **Google Gemini API** din [Google AI Studio](https://aistudio.google.com/apikey). Aplicația include și un mod fallback inteligent dacă rulează offline sau fără cheie API.

### Instalare și pornire

```bash
git clone https://github.com/CristianIulian07/Stuvyra.git
cd Stuvyra
npm install
cp .env.example .env
```

Editează `.env` și adaugă cheia ta Gemini:

```env
GEMINI_API_KEY=cheia_ta_gemini_aici
GEMINI_MODEL=gemini-3.8-flash
PORT=3001
```

Pornește aplicația:

```bash
npm run dev
```

Deschide [http://localhost:3001](http://localhost:3001) în browser.

## Teste & Build de producție

```bash
npm test          # Rulează suitele de teste unitare
npm run lint      # Verifică tipurile TypeScript
npm run build     # Generează aplicația optimizată în dist/
npm start         # Rulează serverul Express în modul production
```

## Licență

Distribuit sub licența [MIT](./LICENSE).
