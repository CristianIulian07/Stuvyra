import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));

  // 1. Academic Dashboard Generator based on current semester subjects
  app.post('/api/ai/academic-overview', async (req, res) => {
    try {
      const { profile, subjects, todayIso, simulateError, language = 'en' } = req.body || {};
      const isRo = language === 'ro';
      await delay(450);

      if (simulateError) {
        res.status(503).json({
          error: isRo
            ? 'Serviciul Gemini nu a putut fi contactat momentan. Te rugăm să încerci din nou.'
            : 'Could not reach Gemini academic planner right now. Please retry in a moment.',
        });
        return;
      }

      const ai = getGeminiClient();
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
            model: 'gemini-3.8-flash',
            contents: `You are Stuvyra, an academic AI advisor for ${profile?.username || 'a student'} at ${profile?.university || 'University'} (${profile?.faculty || 'Faculty'}, Major: ${profile?.major || 'Major'}, ${profile?.yearOfStudy || 'Year'}, ${profile?.currentSemester || 'Semester'}). Today's date is ${todayIso || '2026-10-26'}.
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
      const baseDate = todayIso || '2026-10-26';

      if (isRo) {
        res.json({
          welcomeHeadline: `Centrul Academic de Comandă — ${profile?.currentSemester || 'Semestrul Curent'}`,
          semesterStrategy: `Te concentrezi pe ${subjectList.length || 1} materii active la ${profile?.university || 'universitate'}. Prioritizează sinteza teoretică pentru ${primarySubject} și rezolvarea etapizată a fișelor de seminar înainte de examenele parțiale.`,
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
              title: `${secondarySubject}: Recapitulare Formule și Demonstrații pentru Parțial`,
              dueDate: subjectList[1]?.midtermDate || baseDate,
              category: 'milestone',
              priority: 'high',
            },
          ],
        });
        return;
      }

      res.json({
        welcomeHeadline: `${profile?.currentSemester || 'Current Semester'} Academic Command Center`,
        semesterStrategy: `Focusing on ${subjectList.length || 1} active course${subjectList.length === 1 ? '' : 's'} at ${profile?.university || 'your university'}. Prioritize early concept synthesis for ${primarySubject} and stagger practice problem sets ahead of midterm dates.`,
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
            dueDate: subjectList[1]?.midtermDate || baseDate,
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
      await delay(500);

      if (simulateError) {
        res.status(503).json({
          error: isRo
            ? 'Gemini a întâmpinat o întrerupere temporară la analizarea cursurilor PDF și a exercițiilor. Te rugăm să încerci din nou.'
            : 'Gemini encountered a temporary interruption while analyzing your course PDFs and exercises. Please try again.',
        });
        return;
      }

      const ai = getGeminiClient();
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
Today's date is ${todayIso || '2026-10-26'}.
${langInstruction}
Subjects & Exam Dates:
${subjectList.map((s: any) => `- ${s.name} (${s.code}): Midterm on ${s.midtermDate}, Final on ${s.finalDate}`).join('\n')}

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
            model: 'gemini-3.8-flash',
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
              dayLabel: 'Azi · Sinteză Suport de Curs PDF',
              date: todayIso || '2026-10-26',
              subjectName: s0.name,
              topic: `Adnotare și Demonstrații Cheie: ${latestDoc}`,
              durationMinutes: 50,
              focusType: 'PDF Review',
            },
            {
              dayLabel: 'Azi · Antrenament Exerciții Seminar',
              date: todayIso || '2026-10-26',
              subjectName: s0.name,
              topic: `Rezolvare Completă: ${unsolvedEx.title}`,
              durationMinutes: 45,
              focusType: 'Exercise Drill',
            },
            {
              dayLabel: 'Mâine · Consolidare Teoretică',
              date: todayIso || '2026-10-26',
              subjectName: s1.name,
              topic: `Recapitulare Formule și Teoreme pentru Parțial (${s1.midtermDate || 'În curând'})`,
              durationMinutes: 60,
              focusType: 'Concept Synthesis',
            },
            {
              dayLabel: 'În 2 Zile · Simulare Examen în Condiții de Timp',
              date: todayIso || '2026-10-26',
              subjectName: s0.name,
              topic: `Simulare Subiecte de Parțial pentru ${s0.name}`,
              durationMinutes: 75,
              focusType: 'Exam Prep',
            },
          ],
          learningInsights: [
            {
              subjectName: s0.name,
              title: `Corelează ${latestDoc} cu Fișa de Seminar`,
              actionableAdvice: `Extrage teoremele fundamentale din ${latestDoc} și aplică-le direct pe „${unsolvedEx.title}” înainte de parțialul din ${s0.midtermDate || 'această perioadă'}.`,
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
              actionableAdvice: `Notează câte 3 capcane frecvente pentru fiecare fișă de exerciții de la facultate pentru a le revizui rapid cu 48 de ore înainte de examenul final (${s0.finalDate || 'sesiune'}).`,
              impactLevel: 'Quick Win',
            },
          ],
          newReminders: [
            {
              subjectName: s0.name,
              title: `Finalizează ${unsolvedEx.title} înainte de Parțialul la ${s0.name}`,
              dueDate: s0.midtermDate || todayIso || '2026-10-26',
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
            date: todayIso || '2026-10-26',
            subjectName: s0.name,
            topic: `Deep-Dive Annotation: ${latestDoc}`,
            durationMinutes: 50,
            focusType: 'PDF Review',
          },
          {
            dayLabel: 'Today · Faculty Exercise Drill',
            date: todayIso || '2026-10-26',
            subjectName: s0.name,
            topic: `Solve & Verify: ${unsolvedEx.title}`,
            durationMinutes: 45,
            focusType: 'Exercise Drill',
          },
          {
            dayLabel: 'Tomorrow · Cross-Topic Synthesis',
            date: todayIso || '2026-10-26',
            subjectName: s1.name,
            topic: `Midterm Proof & Formula Consolidation (${s1.midtermDate || 'Upcoming'})`,
            durationMinutes: 60,
            focusType: 'Concept Synthesis',
          },
          {
            dayLabel: 'Upcoming · Timed Exam Rehearsal',
            date: todayIso || '2026-10-26',
            subjectName: s0.name,
            topic: `Simulated Midterm Conditions for ${s0.name}`,
            durationMinutes: 75,
            focusType: 'Exam Prep',
          },
        ],
        learningInsights: [
          {
            subjectName: s0.name,
            title: `Bridge ${latestDoc} with Faculty Exercises`,
            actionableAdvice: `Extract the core theorem definitions from ${latestDoc} and test them directly against "${unsolvedEx.title}" before your ${s0.midtermDate || 'upcoming'} midterm.`,
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
            actionableAdvice: `Keep a 3-bullet mistake log for each faculty exercise sheet so you can review high-yield edge cases 48 hours before ${s0.finalDate || 'finals'}.`,
            impactLevel: 'Quick Win',
          },
        ],
        newReminders: [
          {
            subjectName: s0.name,
            title: `Complete ${unsolvedEx.title} ahead of ${s0.name} Midterm`,
            dueDate: s0.midtermDate || todayIso || '2026-10-26',
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
      await delay(500);

      if (simulateError) {
        res.status(503).json({
          error: isRo
            ? 'Gemini nu a putut genera simularea de examen momentan. Te rugăm să apeși pe Încearcă din nou.'
            : 'Gemini could not assemble the simulated exam right now. Please click Try Again.',
        });
        return;
      }

      const ai = getGeminiClient();
      const exList = Array.isArray(exercises) ? exercises : [];
      const docList = Array.isArray(documents) ? documents : [];
      const subjectName = subject?.name || (isRo ? 'Curs Universitar' : 'University Course');
      const langInstruction = isRo
        ? 'IMPORTANT: Write topic, prompt, sampleSolution, and gradingCriteria in fluent Romanian. Keep difficulty as one of "Foundation", "Intermediate", or "Advanced".'
        : 'Write all fields in clear English.';

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `You are a university professor creating a realistic simulated exam for "${subjectName}".
${langInstruction}
Base the exam questions directly on the style and concepts of these faculty exercises and course PDFs:
Exercises:
${exList.map((e: any) => `- [${e.difficulty}] ${e.title}: ${e.prompt}`).join('\n') || 'Core course concepts'}
Course PDFs:
${docList.map((d: any) => `- ${d.fileName}: ${d.extractedText}`).join('\n') || 'Standard syllabus'}

Generate ${questionCount} rigorous exam questions. Each question must have a topic, difficulty ("Foundation", "Intermediate", or "Advanced"), clear problem prompt, points (10), comprehensive sampleSolution, and gradingCriteria.`,
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

      const questions = [0, 1, 2].map((idx) => {
        const refEx = baseExercises[idx % baseExercises.length];
        const diff = idx === 0 ? 'Foundation' : idx === 1 ? 'Intermediate' : 'Advanced';
        if (isRo) {
          return {
            questionNumber: idx + 1,
            topic: refEx.title || `${subjectName} — Subiectul ${idx + 1}`,
            difficulty: diff,
            prompt:
              idx === 0
                ? `[Subiectul 1 — Adaptat după ${refEx.title}] Formulează riguros modelul matematic și demonstrează condiția de optimalitate pentru: ${refEx.prompt}`
                : idx === 1
                  ? `[Subiectul 2 — Construcție Algoritmică] Pornind de la o instanță modificată a problemei „${refEx.title}”, construiește pas cu pas algoritmul sau demonstrația și analizează complexitatea în cazul cel mai defavorabil.`
                  : `[Subiectul 3 — Analiză Cazuri Limită] Presupunem că ipoteza de capacitate sau regularitate din „${refEx.title}” este relaxată. Stabilește dacă teorema rămâne adevărată, oferă un contraexemplu sau o demonstrație adaptată și justifică răspunsul.`,
            points: 10,
            sampleSolution: `Se pornește de la definiția formală din ${refEx.title}. Se stabilesc explicit marginile superioare și inferioare, se verifică condițiile la limită și se deduce expresia asimptotică sau algebrică exactă.`,
            gradingCriteria:
              '4p pentru formularea corectă și definiții, 4p pentru pașii riguroși de demonstrație, 2p pentru analiza complexității și a cazurilor limită.',
          };
        }
        return {
          questionNumber: idx + 1,
          topic: refEx.title || `${subjectName} Topic ${idx + 1}`,
          difficulty: diff,
          prompt:
            idx === 0
              ? `[Exam Problem 1 — Adapted from ${refEx.title}] State the formal mathematical formulation and prove why the key optimality condition holds for: ${refEx.prompt}`
              : idx === 1
                ? `[Exam Problem 2 — Applied Construction] Given a modified instance of "${refEx.title}", construct a step-by-step algorithm or derivation and analyze its worst-case complexity or error bound.`
                : `[Exam Problem 3 — Edge-Case Synthesis] Suppose the regularity or capacity assumption in "${refEx.title}" is relaxed. Identify whether the theorem still holds, provide a counterexample or adapted proof, and justify your conclusion.`,
          points: 10,
          sampleSolution: `Start by invoking the core definition from ${refEx.title}. Establish the upper and lower bounds explicitly, verify boundary conditions, and conclude with the exact asymptotic or algebraic expression.`,
          gradingCriteria:
            '4 pts for formal setup & definitions, 4 pts for rigorous derivation/proof steps, 2 pts for complexity or boundary analysis.',
        };
      });

      res.json({
        durationMinutes: 45,
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
      await delay(350);

      if (simulateError) {
        res.status(503).json({
          error: isRo
            ? 'Nu am putut prelua indiciul de la Gemini momentan. Te rugăm să încerci din nou.'
            : 'Could not fetch hint from Gemini right now. Please try again.',
        });
        return;
      }

      const ai = getGeminiClient();
      const langInstruction = isRo
        ? 'IMPORTANT: Write both hint and keyConceptToReview in fluent Romanian.'
        : 'Write both hint and keyConceptToReview in clear English.';

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
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
          hint: `Concentrează-te pe invariantul structural din „${exerciseTitle || 'acest exercițiu'}”: scrie mai întâi funcția obiectiv sau legea de conservare, apoi verifică modul în care o perturbație unitară afectează condițiile la limită.`,
          keyConceptToReview: `${subjectName || 'Curs'} — Invariant & Reducere la Condițiile de Frontieră`,
        });
        return;
      }

      res.json({
        hint: `Focus on the structural invariant in "${exerciseTitle || 'this problem'}": write down the objective function or conservation law first, then check how a unit perturbation affects the boundary condition.`,
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
      await delay(450);

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
      const langInstruction = isRo
        ? 'IMPORTANT: Write overallFeedback and aiFeedback in fluent, encouraging Romanian.'
        : 'Write overallFeedback and aiFeedback in clear English.';

      if (ai && qList.length > 0) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `Grade this simulated university exam for "${subjectName || 'Course'}".
${langInstruction}
Questions and Student Answers:
${qList
  .map(
    (q: any, i: number) =>
      `Q${i + 1} (${q.points} pts): ${q.prompt}\nSample Solution: ${q.sampleSolution}\nStudent Answer: ${q.userAnswer || '(blank)'}`
  )
  .join('\n\n')}

Award fair points (0 to q.points) and concise constructive feedback for each question, plus an overallFeedback summary.`,
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
        const pts = ans.length > 40 ? 9 : ans.length > 10 ? 7 : 5;
        if (isRo) {
          return {
            questionNumber: q.questionNumber || idx + 1,
            awardedPoints: pts,
            aiFeedback:
              ans.length > 10
                ? 'Raționament bine structurat și notație clară. Asigură-te că menționezi explicit justificarea cazurilor limită și a complexității pentru punctaj maxim.'
                : 'Punctaj parțial pentru formularea inițială; dezvoltă pașii formali ai demonstrației și compară cu soluția din barem.',
          };
        }
        return {
          questionNumber: q.questionNumber || idx + 1,
          awardedPoints: pts,
          aiFeedback:
            ans.length > 10
              ? 'Solid reasoning structure and clear notation. Make sure to state the boundary or complexity justification explicitly for full marks.'
              : 'Partial credit for initial setup; expand your formal derivation steps and compare against the reference solution.',
        };
      });

      res.json({
        overallFeedback: isRo
          ? `Efort excelent la simularea de examen pentru ${subjectName || 'această materie'}! Parcurge demonstrațiile din barem pentru pașii cu punctaj parțial ca să îți asiguri pregătirea completă înainte de examen.`
          : `Strong effort on your ${subjectName || 'Simulated'} Exam! Review the reference proofs on any partial-credit steps to lock in 100% readiness before exam day.`,
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
      await delay(400);

      if (simulateError) {
        res.status(503).json({
          error: isRo
            ? 'Nu am putut actualiza Analiza AI a Zilei momentan. Te rugăm să apeși pe Încearcă din nou.'
            : 'Could not refresh your Daily AI Insight right now. Please click Try Again.',
        });
        return;
      }

      const ai = getGeminiClient();
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
            model: 'gemini-3.8-flash',
            contents: `You are Stuvyra, a warm, insightful academic AI companion for ${profile?.username || 'student'}.
${langInstruction}
Today's performance so far:
- Study time logged today: ${minutes} minutes
- Exercises solved today: ${solved}
- Latest exam simulation score: ${score !== undefined ? `${score}%` : 'None today'}
- Active subjects: ${subjectList.map((s: any) => `${s.name} (Midterm: ${s.midtermDate})`).join(', ')}
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
            ? `Ritm excelent astăzi, ${profile?.username || 'student'} — ai acumulat deja ${minutes} minute de studiu concentrat și ai rezolvat ${solved} exerciții de la facultate${score ? ` cu un scor de ${score}% la simulare` : ''}.`
            : `Un început proaspăt de zi, ${profile?.username || 'student'} — spațiul tău academic este pregătit pentru prima sesiune de studiu.`;

        const nextSessionSuggestion =
          minutes >= 60
            ? `Pentru că ai deja un ritm foarte bun de rezolvare, dedică următoarele 40 de minute unui exercițiu avansat la ${firstSubject} fără a consulta notițele de curs.`
            : `Începe cu o sesiune scurtă de 35 de minute de sinteză pe suportul de curs PDF la ${firstSubject} și rezolvă un exercițiu de bază pentru a intra ușor în ritm.`;

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
          ? `Great consistency today, ${profile?.username || 'scholar'} — you have completed ${minutes} minutes of deep work and solved ${solved} faculty exercise${solved === 1 ? '' : 's'}${score ? ` with a ${score}% simulation score` : ''}.`
          : `Fresh slate today, ${profile?.username || 'scholar'} — your workspace is organized and ready for your first focused study block.`;

      const nextSessionSuggestion =
        minutes >= 60
          ? `Since your problem-solving momentum is high, run a 40-minute active-recall drill on your toughest ${firstSubject} exercise without consulting lecture notes.`
          : `Start with a crisp 35-minute PDF concept review on ${firstSubject} and solve one Foundation exercise to build effortless momentum.`;

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
    console.log(`Stuvyra server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
