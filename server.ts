import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

function getConfiguredModel(): string {
  const custom = process.env.GEMINI_MODEL?.trim();
  return custom && custom.length > 0 ? custom : DEFAULT_GEMINI_MODEL;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (
    !apiKey ||
    apiKey === 'MY_GEMINI_API_KEY' ||
    apiKey === 'cheia_ta_aici' ||
    apiKey === ''
  ) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

const DATA_DIR = path.join(__dirname, 'data');
const WORKSPACES_FILE = path.join(DATA_DIR, 'workspaces.json');

function readServerWorkspaces(): Record<string, unknown> {
  try {
    if (!fs.existsSync(WORKSPACES_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(WORKSPACES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function writeServerWorkspaces(accounts: Record<string, unknown>): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmpFile = `${WORKSPACES_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(accounts, null, 2), 'utf-8');
    fs.renameSync(tmpFile, WORKSPACES_FILE);
  } catch (err) {
    console.warn('Could not persist workspaces to disk:', err);
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  app.use(express.json({ limit: '15mb' }));

  // Health & AI configuration endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      apiKeyConfigured: Boolean(getGeminiClient()),
      model: getConfiguredModel(),
    });
  });

  // Persistent Workspace Storage REST Endpoints
  app.get('/api/workspaces', (_req, res) => {
    res.json({ accounts: readServerWorkspaces() });
  });

  app.put('/api/workspaces/:username', (req, res) => {
    const username = String(req.params.username || '').trim();
    const workspace = req.body;
    if (!username || !workspace || typeof workspace !== 'object') {
      res.status(400).json({ error: 'Invalid workspace payload.' });
      return;
    }
    const accounts = readServerWorkspaces();
    accounts[username] = workspace;
    writeServerWorkspaces(accounts);
    res.json({ ok: true });
  });

  app.delete('/api/workspaces/:username', (req, res) => {
    const username = String(req.params.username || '').trim();
    if (!username) {
      res.status(400).json({ error: 'Missing username.' });
      return;
    }
    const accounts = readServerWorkspaces();
    delete accounts[username];
    writeServerWorkspaces(accounts);
    res.json({ ok: true });
  });

  // 1. Academic Dashboard Generator based on current semester subjects
  app.post('/api/ai/academic-overview', async (req, res) => {
    try {
      const { profile, subjects, todayIso, simulateError, language = 'en' } = req.body || {};
      const isRo = language === 'ro';
      await delay(300);

      if (simulateError) {
        res.status(503).json({
          error: isRo
            ? 'Serviciul Gemini nu a putut fi contactat momentan. Te rugăm să încerci din nou.'
            : 'Could not reach Gemini academic planner right now. Please retry in a moment.',
        });
        return;
      }

      const ai = getGeminiClient();
      const model = getConfiguredModel();
      const subjectList = Array.isArray(subjects) ? subjects : [];
      const subjectNames = subjectList
        .map((s: any) => `${s.name} (Midterm: ${s.midtermDate || 'TBD'}, Final: ${s.finalDate || 'TBD'})`)
        .join('; ');
      const langInstruction = isRo
        ? 'IMPORTANT: Write all output text fields (welcomeHeadline, semesterStrategy, and suggestedReminders titles) in fluent, natural Romanian suitable for university students in Romania.'
        : 'Write all output text fields in clear English.';

      if (ai && subjectList.length > 0) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: `You are Stuvyra, an academic AI advisor for ${profile?.username || 'a student'} at ${profile?.university || 'University'} (${profile?.faculty || 'Faculty'}, Major: ${profile?.major || 'Major'}, ${profile?.yearOfStudy || 'Year'}, ${profile?.currentSemester || 'Semester'}). Today's date is ${todayIso || '2026-11-25'}.
The student is taking these subjects this semester: ${subjectNames}.
${langInstruction}
Create a concise academic dashboard overview with a welcoming headline, a 2-sentence strategic focus plan for the semester, and 3 concrete upcoming assignment deadlines or study milestones with realistic YYYY-MM-DD due dates.`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  welcomeHeadline: { type: Type.STRING },
                  semesterStrategy: { type: Type.STRING },
                  suggestedReminders: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        subjectName: { type: Type.STRING },
                        title: { type: Type.STRING },
                        dueDate: { type: Type.STRING },
                        category: { type: Type.STRING },
                        priority: { type: Type.STRING },
                      },
                      required: ['subjectName', 'title', 'dueDate', 'category', 'priority'],
                    },
                  },
                },
                required: ['welcomeHeadline', 'semesterStrategy', 'suggestedReminders'],
              },
            },
          });

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            res.json(parsed);
            return;
          }
        } catch (sdkErr) {
          console.warn('Gemini academic-overview fallback:', sdkErr);
        }
      }

      const primarySubject = subjectList[0]?.name || (isRo ? 'Materia Principală' : 'Core Major Coursework');
      const secondarySubject = subjectList[1]?.name || primarySubject;
      const baseDate = todayIso || '2026-11-25';

      if (isRo) {
        res.json({
          welcomeHeadline: `Plan Strategic — ${profile?.currentSemester || 'Semestrul Curent'}`,
          semesterStrategy: `Te concentrezi pe ${subjectList.length || 1} materii active la ${profile?.university || 'universitate'}. Prioritizează sinteza teoretică pentru ${primarySubject} și rezolvarea etapizată a fișelor de seminar înainte de examenele parțiale și sesiune.`,
          suggestedReminders: [
            {
              subjectName: primarySubject,
              title: `${primarySubject}: Sinteză Teoretică & Rezolvare Seminar`,
              dueDate: subjectList[0]?.midtermDate || baseDate,
              category: 'assignment',
              priority: 'high',
            },
            {
              subjectName: secondarySubject,
              title: `${secondarySubject}: Recapitulare Formule și Demonstrații`,
              dueDate: subjectList[1]?.midtermDate || subjectList[1]?.finalDate || baseDate,
              category: 'milestone',
              priority: 'high',
            },
          ],
        });
        return;
      }

      res.json({
        welcomeHeadline: `${profile?.currentSemester || 'Current Semester'} Strategic Command Plan`,
        semesterStrategy: `Focusing on ${subjectList.length || 1} active course${subjectList.length === 1 ? '' : 's'} at ${profile?.university || 'your university'}. Prioritize early concept synthesis for ${primarySubject} and stagger practice problem sets ahead of midterm and final dates.`,
        suggestedReminders: [
          {
            subjectName: primarySubject,
            title: `${primarySubject}: Core Concept Summary & Problem Set`,
            dueDate: subjectList[0]?.midtermDate || baseDate,
            category: 'assignment',
            priority: 'high',
          },
          {
            subjectName: secondarySubject,
            title: `${secondarySubject}: Midterm Formula & Proof Checkpoint`,
            dueDate: subjectList[1]?.midtermDate || subjectList[1]?.finalDate || baseDate,
            category: 'milestone',
            priority: 'high',
          },
        ],
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Unable to generate academic dashboard overview.',
      });
    }
  });

  // 2. Personalized Study Schedule & Actionable Learning Insights
  app.post('/api/ai/study-plan', async (req, res) => {
    try {
      const { profile, subjects, documents, exercises, todayIso, simulateError, language = 'en' } =
        req.body || {};
      const isRo = language === 'ro';
      await delay(350);

      if (simulateError) {
        res.status(503).json({
          error: isRo
            ? 'Gemini a întâmpinat o întrerupere temporară la analizarea cursurilor PDF și a exercițiilor. Te rugăm să încerci din nou.'
            : 'Gemini encountered a temporary interruption while analyzing your course PDFs and exercises. Please try again.',
        });
        return;
      }

      const ai = getGeminiClient();
      const model = getConfiguredModel();
      const subjectList = Array.isArray(subjects) ? subjects : [];
      const docList = Array.isArray(documents) ? documents : [];
      const exList = Array.isArray(exercises) ? exercises : [];
      const langInstruction = isRo
        ? 'IMPORTANT: Write all dayLabel, topic, title, and actionableAdvice fields in fluent Romanian. Keep focusType as one of "PDF Review", "Exercise Drill", "Exam Prep", "Concept Synthesis" and impactLevel as one of "Exam Critical", "High Impact", "Quick Win".'
        : 'Write all output fields in clear English.';

      if (ai && subjectList.length > 0) {
        try {
          const parts: any[] = [];
          const pdfWithBase64 = docList.find(
            (d: any) => d.base64Data && d.mimeType === 'application/pdf' && d.base64Data.length < 4_000_000
          );
          if (pdfWithBase64) {
            parts.push({
              inlineData: {
                mimeType: 'application/pdf',
                data: pdfWithBase64.base64Data,
              },
            });
          }

          const promptText = `You are Stuvyra, an expert university AI study planner for ${profile?.username || 'a student'} (${profile?.major || 'Major'} at ${profile?.university || 'University'}).
Today's date is ${todayIso || '2026-11-25'}.
${langInstruction}
Subjects & Exam Dates:
${subjectList.map((s: any) => `- ${s.name} (${s.code}): Midterm on ${s.midtermDate || 'TBD'}, Final on ${s.finalDate || 'TBD'}`).join('\n')}

Uploaded Course PDFs:
${docList.map((d: any) => `- ${d.fileName}: ${d.extractedText || 'Course lecture PDF'}`).join('\n') || 'None yet'}

Faculty Exercises:
${exList.map((e: any) => `- [${e.difficulty}] ${e.title}: ${e.prompt} (Solved: ${e.solved})`).join('\n') || 'None yet'}

Generate:
1. "scheduleBlocks": 4 personalized study schedule sessions over the next 3 days calibrated to exam proximity, PDF topics, and unsolved faculty exercises.
2. "learningInsights": 3 actionable learning insights connecting the uploaded PDFs and faculty exercises to the upcoming midterms/finals.
3. "newReminders": 2 specific study milestone or assignment deadline reminders.`;

          parts.push({ text: promptText });

          const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  scheduleBlocks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        dayLabel: { type: Type.STRING },
                        date: { type: Type.STRING },
                        subjectName: { type: Type.STRING },
                        topic: { type: Type.STRING },
                        durationMinutes: { type: Type.INTEGER },
                        focusType: { type: Type.STRING },
                      },
                      required: ['dayLabel', 'date', 'subjectName', 'topic', 'durationMinutes', 'focusType'],
                    },
                  },
                  learningInsights: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        subjectName: { type: Type.STRING },
                        title: { type: Type.STRING },
                        actionableAdvice: { type: Type.STRING },
                        impactLevel: { type: Type.STRING },
                      },
                      required: ['subjectName', 'title', 'actionableAdvice', 'impactLevel'],
                    },
                  },
                  newReminders: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        subjectName: { type: Type.STRING },
                        title: { type: Type.STRING },
                        dueDate: { type: Type.STRING },
                        category: { type: Type.STRING },
                        priority: { type: Type.STRING },
                      },
                      required: ['subjectName', 'title', 'dueDate', 'category', 'priority'],
                    },
                  },
                },
                required: ['scheduleBlocks', 'learningInsights', 'newReminders'],
              },
            },
          });

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            res.json(parsed);
            return;
          }
        } catch (sdkErr) {
          console.warn('Gemini study-plan fallback:', sdkErr);
        }
      }

      const s0 = subjectList[0] || { id: 'subj-1', name: isRo ? 'Materia Principală' : 'Core Subject', midtermDate: todayIso };
      const s1 = subjectList[1] || s0;
      const latestDoc = docList[0]?.fileName || `${s0.name}_Curs.pdf`;
      const unsolvedEx = exList.find((e: any) => !e.solved) || exList[0] || {
        title: isRo ? `Fișa de Seminar — ${s0.name}` : `${s0.name} Faculty Problem Set`,
      };

      if (isRo) {
        res.json({
          scheduleBlocks: [
            {
              dayLabel: 'Azi · Sinteză Suport de Curs',
              date: todayIso || '2026-11-25',
              subjectName: s0.name,
              topic: `Adnotare și Demonstrații Cheie: ${latestDoc}`,
              durationMinutes: 50,
              focusType: 'PDF Review',
            },
            {
              dayLabel: 'Azi · Antrenament Exerciții Seminar',
              date: todayIso || '2026-11-25',
              subjectName: s0.name,
              topic: `Rezolvare Completă: ${unsolvedEx.title}`,
              durationMinutes: 45,
              focusType: 'Exercise Drill',
            },
            {
              dayLabel: 'Mâine · Consolidare Teoretică',
              date: todayIso || '2026-11-25',
              subjectName: s1.name,
              topic: `Recapitulare Formule și Teoreme (${s1.midtermDate || s1.finalDate || 'Sesiune'})`,
              durationMinutes: 60,
              focusType: 'Concept Synthesis',
            },
            {
              dayLabel: 'În 2 Zile · Simulare Examen în Condiții de Timp',
              date: todayIso || '2026-11-25',
              subjectName: s0.name,
              topic: `Simulare Subiecte de Examen pentru ${s0.name}`,
              durationMinutes: 75,
              focusType: 'Exam Prep',
            },
          ],
          learningInsights: [
            {
              subjectName: s0.name,
              title: `Corelează ${latestDoc} cu Fișa de Seminar`,
              actionableAdvice: `Extrage teoremele fundamentale din ${latestDoc} și aplică-le direct pe „${unsolvedEx.title}” înainte de evaluare.`,
              impactLevel: 'Exam Critical',
            },
            {
              subjectName: s1.name,
              title: 'Recapitulare Activă Fără Suportul de Curs',
              actionableAdvice: `Dedică primele 15 minute din următoarea sesiune la ${s1.name} reproducerii demonstrațiilor din memorie înainte de a verifica slide-urile.`,
              impactLevel: 'High Impact',
            },
            {
              subjectName: s0.name,
              title: 'Jurnal de Cazuri Limită Înainte de Sesiune',
              actionableAdvice: `Notează câte 3 capcane frecvente pentru fiecare fișă de exerciții ca să le revizuiești rapid cu 48 de ore înainte de examen.`,
              impactLevel: 'Quick Win',
            },
          ],
          newReminders: [
            {
              subjectName: s0.name,
              title: `Finalizează ${unsolvedEx.title} (${s0.name})`,
              dueDate: s0.midtermDate || s0.finalDate || todayIso || '2026-11-25',
              category: 'milestone',
              priority: 'high',
            },
          ],
        });
        return;
      }

      res.json({
        scheduleBlocks: [
          {
            dayLabel: 'Today · Focused PDF Synthesis',
            date: todayIso || '2026-11-25',
            subjectName: s0.name,
            topic: `Deep-Dive Annotation: ${latestDoc}`,
            durationMinutes: 50,
            focusType: 'PDF Review',
          },
          {
            dayLabel: 'Today · Faculty Exercise Drill',
            date: todayIso || '2026-11-25',
            subjectName: s0.name,
            topic: `Solve & Verify: ${unsolvedEx.title}`,
            durationMinutes: 45,
            focusType: 'Exercise Drill',
          },
          {
            dayLabel: 'Tomorrow · Cross-Topic Synthesis',
            date: todayIso || '2026-11-25',
            subjectName: s1.name,
            topic: `Proof & Formula Consolidation (${s1.midtermDate || s1.finalDate || 'Upcoming'})`,
            durationMinutes: 60,
            focusType: 'Concept Synthesis',
          },
          {
            dayLabel: 'Upcoming · Timed Exam Rehearsal',
            date: todayIso || '2026-11-25',
            subjectName: s0.name,
            topic: `Simulated Exam Conditions for ${s0.name}`,
            durationMinutes: 75,
            focusType: 'Exam Prep',
          },
        ],
        learningInsights: [
          {
            subjectName: s0.name,
            title: `Bridge ${latestDoc} with Faculty Exercises`,
            actionableAdvice: `Extract the core theorem definitions from ${latestDoc} and test them directly against "${unsolvedEx.title}".`,
            impactLevel: 'Exam Critical',
          },
          {
            subjectName: s1.name,
            title: 'Active Recall Over Passive Re-Reading',
            actionableAdvice: `Spend the first 15 minutes of your next ${s1.name} session reproducing key derivations from memory before checking lecture slides.`,
            impactLevel: 'High Impact',
          },
          {
            subjectName: s0.name,
            title: 'Error-Log Checkpoint Before Final Exam',
            actionableAdvice: `Keep a 3-bullet mistake log for each faculty exercise sheet so you can review high-yield edge cases 48 hours before finals.`,
            impactLevel: 'Quick Win',
          },
        ],
        newReminders: [
          {
            subjectName: s0.name,
            title: `Complete ${unsolvedEx.title} (${s0.name})`,
            dueDate: s0.midtermDate || s0.finalDate || todayIso || '2026-11-25',
            category: 'milestone',
            priority: 'high',
          },
        ],
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Failed to generate personalized study schedule.',
      });
    }
  });

  // 3. Exam Simulator Generator
  app.post('/api/ai/simulate-exam', async (req, res) => {
    try {
      const { subject, exercises, documents, questionCount = 3, simulateError, language = 'en' } =
        req.body || {};
      const isRo = language === 'ro';
      await delay(350);

      if (simulateError) {
        res.status(503).json({
          error: isRo
            ? 'Gemini nu a putut genera simularea de examen momentan. Te rugăm să apeși pe Încearcă din nou.'
            : 'Gemini could not assemble the simulated exam right now. Please click Try Again.',
        });
        return;
      }

      const ai = getGeminiClient();
      const model = getConfiguredModel();
      const exList = Array.isArray(exercises) ? exercises : [];
      const docList = Array.isArray(documents) ? documents : [];
      const subjectName = subject?.name || (isRo ? 'Curs Universitar' : 'University Course');
      const count = Math.min(Math.max(1, Number(questionCount) || 3), 6);
      const langInstruction = isRo
        ? 'IMPORTANT: Write topic, prompt, sampleSolution, and gradingCriteria in fluent Romanian. Keep difficulty as one of "Foundation", "Intermediate", or "Advanced".'
        : 'Write all fields in clear English.';

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: `You are a university professor creating a realistic simulated exam for "${subjectName}".
${langInstruction}
Base the exam questions directly on the style and concepts of these faculty exercises and course PDFs:
Exercises:
${exList.map((e: any) => `- [${e.difficulty}] ${e.title}: ${e.prompt}`).join('\n') || 'Core course concepts'}
Course PDFs:
${docList.map((d: any) => `- ${d.fileName}: ${d.extractedText}`).join('\n') || 'Standard syllabus'}

Generate ${count} rigorous exam questions. Each question must have a topic, difficulty ("Foundation", "Intermediate", or "Advanced"), clear problem prompt, points (10), comprehensive sampleSolution, and gradingCriteria.`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  durationMinutes: { type: Type.INTEGER },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        questionNumber: { type: Type.INTEGER },
                        topic: { type: Type.STRING },
                        difficulty: { type: Type.STRING },
                        prompt: { type: Type.STRING },
                        points: { type: Type.INTEGER },
                        sampleSolution: { type: Type.STRING },
                        gradingCriteria: { type: Type.STRING },
                      },
                      required: [
                        'questionNumber',
                        'topic',
                        'difficulty',
                        'prompt',
                        'points',
                        'sampleSolution',
                        'gradingCriteria',
                      ],
                    },
                  },
                },
                required: ['durationMinutes', 'questions'],
              },
            },
          });

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            res.json(parsed);
            return;
          }
        } catch (sdkErr) {
          console.warn('Gemini simulate-exam fallback:', sdkErr);
        }
      }

      const baseExercises =
        exList.length > 0
          ? exList
          : [
              {
                title: isRo ? `Demonstrație Fundamentală — ${subjectName}` : `${subjectName} Fundamental Derivation`,
                prompt: isRo
                  ? `Explică invariantul principal și complexitatea algoritmică pentru ${subjectName}.`
                  : `Explain the core invariant and complexity trade-offs in ${subjectName}.`,
                difficulty: 'Intermediate',
              },
            ];

      const questions = Array.from({ length: count }, (_, idx) => {
        const refEx = baseExercises[idx % baseExercises.length];
        const diff = idx === 0 ? 'Foundation' : idx === count - 1 ? 'Advanced' : 'Intermediate';
        if (isRo) {
          return {
            questionNumber: idx + 1,
            topic: refEx.title || `${subjectName} — Subiectul ${idx + 1}`,
            difficulty: diff,
            prompt:
              idx % 3 === 0
                ? `[Subiectul ${idx + 1} — Adaptat după ${refEx.title}] Formulează riguros modelul matematic și demonstrează condiția de corectitudine pentru: ${refEx.prompt}`
                : idx % 3 === 1
                  ? `[Subiectul ${idx + 1} — Construcție Algoritmică] Pornind de la o instanță modificată a problemei „${refEx.title}”, construiește pas cu pas algoritmul sau demonstrația și analizează complexitatea în cazul cel mai defavorabil.`
                  : `[Subiectul ${idx + 1} — Analiză Cazuri Limită] Presupunem că ipoteza de regularitate din „${refEx.title}” este relaxată. Stabilește dacă proprietatea rămâne adevărată, oferă un contraexemplu sau o demonstrație adaptată și justifică răspunsul.`,
            points: 10,
            sampleSolution: `Se pornește de la definiția formală din ${refEx.title}. Se stabilesc explicit invariantele, se verifică condițiile la limită și se deduce expresia asimptotică sau algebrică exactă.`,
            gradingCriteria:
              '4p pentru formularea corectă și definiții, 4p pentru pașii riguroși de demonstrație, 2p pentru analiza complexității și a cazurilor limită.',
          };
        }
        return {
          questionNumber: idx + 1,
          topic: refEx.title || `${subjectName} Topic ${idx + 1}`,
          difficulty: diff,
          prompt:
            idx % 3 === 0
              ? `[Exam Problem ${idx + 1} — Adapted from ${refEx.title}] State the formal mathematical formulation and prove why the key correctness condition holds for: ${refEx.prompt}`
              : idx % 3 === 1
                ? `[Exam Problem ${idx + 1} — Applied Construction] Given a modified instance of "${refEx.title}", construct a step-by-step algorithm or derivation and analyze its worst-case complexity.`
                : `[Exam Problem ${idx + 1} — Edge-Case Synthesis] Suppose the regularity assumption in "${refEx.title}" is relaxed. Identify whether the theorem still holds, provide a counterexample or adapted proof, and justify your conclusion.`,
          points: 10,
          sampleSolution: `Start by invoking the core definition from ${refEx.title}. Establish the bounds explicitly, verify boundary conditions, and conclude with the exact asymptotic or algebraic expression.`,
          gradingCriteria:
            '4 pts for formal setup & definitions, 4 pts for rigorous derivation/proof steps, 2 pts for complexity or boundary analysis.',
        };
      });

      res.json({
        durationMinutes: count * 15,
        questions,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Failed to simulate exam.',
      });
    }
  });

  // 4. Exercise / Exam Hint Generator
  app.post('/api/ai/exercise-hint', async (req, res) => {
    try {
      const {
        subjectName,
        exerciseTitle,
        exercisePrompt,
        currentAttempt,
        simulateError,
        language = 'en',
      } = req.body || {};
      const isRo = language === 'ro';
      await delay(250);

      if (simulateError) {
        res.status(503).json({
          error: isRo
            ? 'Nu am putut prelua indiciul de la Gemini momentan. Te rugăm să încerci din nou.'
            : 'Could not fetch hint from Gemini right now. Please try again.',
        });
        return;
      }

      const ai = getGeminiClient();
      const model = getConfiguredModel();
      const langInstruction = isRo
        ? 'IMPORTANT: Write both hint and keyConceptToReview in fluent Romanian.'
        : 'Write both hint and keyConceptToReview in clear English.';

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: `You are a supportive university TA for "${subjectName || 'Course'}".
${langInstruction}
Give a concise, Socratic 2-sentence hint for this exercise without revealing the full final answer.
Exercise: ${exerciseTitle || 'Problem'}
Prompt: ${exercisePrompt}
Student's current attempt: ${currentAttempt || 'Not started yet'}`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  hint: { type: Type.STRING },
                  keyConceptToReview: { type: Type.STRING },
                },
                required: ['hint', 'keyConceptToReview'],
              },
            },
          });

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            res.json(parsed);
            return;
          }
        } catch (sdkErr) {
          console.warn('Gemini exercise-hint fallback:', sdkErr);
        }
      }

      if (isRo) {
        res.json({
          hint: `Concentrează-te pe invariantul structural din „${exerciseTitle || 'acest exercițiu'}”: scrie mai întâi relația de bază sau cazul elementar, apoi verifică modul în care o tranziție unitară afectează condițiile la limită.`,
          keyConceptToReview: `${subjectName || 'Curs'} — Invariant & Condiții la Limită`,
        });
        return;
      }

      res.json({
        hint: `Focus on the structural invariant in "${exerciseTitle || 'this problem'}": write down the base relation first, then check how a unit step affects the boundary condition.`,
        keyConceptToReview: `${subjectName || 'Course'} — Invariant & Boundary Reduction`,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Unable to generate hint.',
      });
    }
  });

  // 5. Simulated Exam Grading & Feedback
  app.post('/api/ai/grade-exam', async (req, res) => {
    try {
      const { subjectName, questions, simulateError, language = 'en' } = req.body || {};
      const isRo = language === 'ro';
      await delay(350);

      if (simulateError) {
        res.status(503).json({
          error: isRo
            ? 'Serviciul de evaluare Gemini a întâmpinat o scurtă întrerupere. Răspunsurile tale sunt în siguranță — apasă pe Încearcă din nou.'
            : 'Gemini grading service experienced a brief hiccup. Your answers are safe—please click Try Again.',
        });
        return;
      }

      const qList = Array.isArray(questions) ? questions : [];
      const ai = getGeminiClient();
      const model = getConfiguredModel();
      const langInstruction = isRo
        ? 'IMPORTANT: Write overallFeedback and aiFeedback in fluent, encouraging Romanian.'
        : 'Write overallFeedback and aiFeedback in clear English.';

      if (ai && qList.length > 0) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: `Grade this simulated university exam for "${subjectName || 'Course'}".
${langInstruction}
Questions and Student Answers:
${qList
  .map(
    (q: any, i: number) =>
      `Q${i + 1} (${q.points} pts): ${q.prompt}\nSample Solution: ${q.sampleSolution}\nGrading Criteria: ${q.gradingCriteria || 'Standard'}\nStudent Answer: ${q.userAnswer || '(blank)'}`
  )
  .join('\n\n')}

Award fair points (0 if blank or completely unrelated, up to q.points for complete solutions) and concise constructive feedback for each question, plus an overallFeedback summary.`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  overallFeedback: { type: Type.STRING },
                  gradedQuestions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        questionNumber: { type: Type.INTEGER },
                        awardedPoints: { type: Type.INTEGER },
                        aiFeedback: { type: Type.STRING },
                      },
                      required: ['questionNumber', 'awardedPoints', 'aiFeedback'],
                    },
                  },
                },
                required: ['overallFeedback', 'gradedQuestions'],
              },
            },
          });

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            res.json(parsed);
            return;
          }
        } catch (sdkErr) {
          console.warn('Gemini grade-exam fallback:', sdkErr);
        }
      }

      const gradedQuestions = qList.map((q: any, idx: number) => {
        const ans = (q.userAnswer || '').trim();
        const maxPts = Number(q.points) || 10;
        const pts =
          ans.length === 0
            ? 0
            : ans.length > 120
              ? Math.min(maxPts, 9)
              : ans.length > 40
                ? Math.min(maxPts, 7)
                : Math.min(maxPts, 4);

        if (isRo) {
          return {
            questionNumber: q.questionNumber || idx + 1,
            awardedPoints: pts,
            aiFeedback:
              ans.length === 0
                ? 'Subiect necompletat (0 puncte). Parcurge soluția din barem și încearcă să scrii cel puțin definițiile și ideea principală la următoarea simulare.'
                : ans.length > 40
                  ? 'Raționament bine structurat. Verifică baremul de mai jos pentru a te asigura că ai acoperit și justificarea cazurilor limită.'
                  : 'Punctaj parțial pentru schița inițială; dezvoltă pașii formali ai demonstrației conform baremului.',
          };
        }
        return {
          questionNumber: q.questionNumber || idx + 1,
          awardedPoints: pts,
          aiFeedback:
            ans.length === 0
              ? 'No solution submitted (0 points). Review the reference solution below and write out at least the formal setup next time.'
              : ans.length > 40
                ? 'Solid reasoning structure. Compare against the reference solution to make sure boundary and complexity justifications are explicit.'
                : 'Partial credit for initial outline; expand your formal derivation steps using the grading rubric.',
        };
      });

      res.json({
        overallFeedback: isRo
          ? `Simulare evaluată pentru ${subjectName || 'această materie'}. Compară răspunsurile tale cu baremul de referință pentru fiecare subiect!`
          : `Simulated exam graded for ${subjectName || 'this course'}. Compare your derivations against each reference solution below!`,
        gradedQuestions,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Unable to grade simulated exam.',
      });
    }
  });

  // 6. Daily AI Insights Card
  app.post('/api/ai/daily-insight', async (req, res) => {
    try {
      const { profile, todayLog, subjects, reminders, simulateError, language = 'en' } =
        req.body || {};
      const isRo = language === 'ro';
      await delay(250);

      if (simulateError) {
        res.status(503).json({
          error: isRo
            ? 'Nu am putut actualiza Analiza AI a Zilei momentan. Te rugăm să apeși pe Încearcă din nou.'
            : 'Could not refresh your Daily AI Insight right now. Please click Try Again.',
        });
        return;
      }

      const ai = getGeminiClient();
      const model = getConfiguredModel();
      const minutes = todayLog?.minutesStudied ?? 0;
      const solved = todayLog?.exercisesSolved ?? 0;
      const score = todayLog?.examScorePercent;
      const subjectList = Array.isArray(subjects) ? subjects : [];
      const firstSubject = subjectList[0]?.name || (isRo ? 'materiile principale' : 'your core coursework');
      const langInstruction = isRo
        ? 'IMPORTANT: Write summaryOfDay and nextSessionSuggestion in warm, friendly, natural Romanian suitable for a university student in Romania.'
        : 'Write summaryOfDay and nextSessionSuggestion in warm, friendly English.';

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: `You are Stuvyra, a warm, insightful academic AI companion for ${profile?.username || 'student'}.
${langInstruction}
Today's performance so far:
- Study time logged today: ${minutes} minutes
- Exercises solved today: ${solved}
- Latest exam simulation score: ${score !== undefined ? `${score}%` : 'None today'}
- Active subjects: ${subjectList.map((s: any) => `${s.name} (Midterm: ${s.midtermDate || 'TBD'})`).join(', ')}
- Upcoming reminders: ${(reminders || []).slice(0, 3).map((r: any) => `${r.title} (${r.dueDate})`).join(', ')}

Return a JSON object with:
1. "summaryOfDay": A short, friendly 1-2 sentence summary of the day so far celebrating progress or gently encouraging a start.
2. "nextSessionSuggestion": One specific, practical suggestion for the very next study session based on how well they performed.
3. "focusSubject": Name of the recommended subject for the next session.
4. "recommendedMinutes": Recommended duration in minutes (e.g. 35, 45, or 50).`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  summaryOfDay: { type: Type.STRING },
                  nextSessionSuggestion: { type: Type.STRING },
                  focusSubject: { type: Type.STRING },
                  recommendedMinutes: { type: Type.INTEGER },
                },
                required: ['summaryOfDay', 'nextSessionSuggestion', 'focusSubject', 'recommendedMinutes'],
              },
            },
          });

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            res.json(parsed);
            return;
          }
        } catch (sdkErr) {
          console.warn('Gemini daily-insight fallback:', sdkErr);
        }
      }

      if (isRo) {
        const summaryOfDay =
          minutes > 0
            ? `Ritm excelent astăzi, ${profile?.username || 'student'} — ai acumulat deja ${minutes} minute de studiu concentrat și ai rezolvat ${solved} exerciții${score !== undefined ? ` (ultimul scor la simulare: ${score}%)` : ''}.`
            : `Un început proaspăt de zi, ${profile?.username || 'student'} — spațiul tău academic este pregătit pentru prima sesiune de studiu.`;

        const nextSessionSuggestion =
          minutes >= 60
            ? `Pentru că ai deja un ritm foarte bun, dedică următoarele 40 de minute unui exercițiu la ${firstSubject} fără a consulta notițele de curs.`
            : `Începe cu o sesiune Pomodoro de 25–35 de minute pe suportul de curs la ${firstSubject} și rezolvă un exercițiu de bază.`;

        res.json({
          summaryOfDay,
          nextSessionSuggestion,
          focusSubject: firstSubject,
          recommendedMinutes: minutes >= 60 ? 40 : 35,
        });
        return;
      }

      const summaryOfDay =
        minutes > 0
          ? `Great consistency today, ${profile?.username || 'scholar'} — you have completed ${minutes} minutes of deep work and solved ${solved} exercise${solved === 1 ? '' : 's'}${score !== undefined ? ` (latest simulation: ${score}%)` : ''}.`
          : `Fresh slate today, ${profile?.username || 'scholar'} — your workspace is organized and ready for your first focused study block.`;

      const nextSessionSuggestion =
        minutes >= 60
          ? `Since your momentum is high, run a 40-minute active-recall drill on ${firstSubject} without consulting lecture notes.`
          : `Start with a focused 25–35 minute concept review on ${firstSubject} and solve one Foundation exercise.`;

      res.json({
        summaryOfDay,
        nextSessionSuggestion,
        focusSubject: firstSubject,
        recommendedMinutes: minutes >= 60 ? 40 : 35,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Unable to generate daily insight.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Stuvyra server running on http://localhost:${PORT}`);
  });
}

startServer();
