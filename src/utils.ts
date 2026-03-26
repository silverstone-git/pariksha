import type { Question, ExamConfig, ExamPreset, ExamSection, UserAnswer } from "./types";

export const isLocalhost = (): boolean => {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168.")
  );
};

export const API_BASE_URL = (
  isLocalhost() ? "" : (import.meta.env.VITE_API_BASE_URL || "https://outsie.aryan.cfd")
).replace(/\/$/, "");

/**
 * Converts legacy flat-question exams into the new section-based format.
 * Ensures the rest of the application can assume a section-based structure.
 */
export const normalizeExamConfig = (config: ExamConfig): ExamConfig => {
  if (config.sections && config.sections.length > 0) {
    const sections = config.sections.map((section, sIdx) => {
      const sectionId = section.id || `section-${sIdx}`;
      return {
        ...section,
        id: sectionId,
        questions: section.questions.map((q, qIdx) => ({
          ...q,
          id: q.id || `${sectionId}-q-${qIdx}`,
          type: q.type || "MCQ",
        })),
      };
    });
    return { ...config, sections };
  }

  // Fallback for legacy format: Wrap flat questions into a single section
  const legacyQuestions = config.questions || [];
  const normalizedSection: ExamSection = {
    id: "default-section",
    name: "General",
    questions: legacyQuestions.map((q, idx) => ({
      ...q,
      id: q.id || `q-${idx}`,
      type: q.type || "MCQ",
    })),
    marking: {
      positive: config.settings?.positiveMarking ?? 1,
      negative: config.settings?.negativeMarking ?? 0,
    },
  };

  return {
    ...config,
    sections: [normalizedSection],
  };
};

/**
 * Validates if an answer is correct based on its type.
 */
export const isQuestionCorrect = (question: Question, answer: { 
  selectedOptionLabel?: number | null; 
  selectedOptionLabels?: number[]; 
  enteredAnswer?: string 
}): boolean => {
  const type = question.type || "MCQ";

  switch (type) {
    case "MCQ":
      return answer.selectedOptionLabel === question.answer_label;
    case "MSQ": {
      if (!answer.selectedOptionLabels || !question.answer_labels) return false;
      const userLabels = [...answer.selectedOptionLabels].sort();
      const correctLabels = [...question.answer_labels].sort();
      return (
        userLabels.length === correctLabels.length &&
        userLabels.every((val, index) => val === correctLabels[index])
      );
    }
    case "NAT": {
      if (!answer.enteredAnswer) return false;
      const numAnswer = parseFloat(answer.enteredAnswer);
      if (isNaN(numAnswer)) return false;
      
      if (question.answer_range) {
        return numAnswer >= question.answer_range.min && numAnswer <= question.answer_range.max;
      }
      if (question.answer_value) {
        return parseFloat(question.answer_value) === numAnswer;
      }
      return false;
    }
    default:
      return false;
  }
};

// --- Topic Mapping for Presets ---
export const SUBJECT_GROUPS: Record<string, string[]> = {
  "Quantum Mechanics": ["Foundations of Quantum Mechanics", "Schrödinger Equation", "Angular Momentum", "Hydrogen Atom", "Approximation Methods", "Scattering Theory"],
  "Electromagnetic Theory": ["Magnetostatics", "Electrodynamics", "Electromagnetic Waves", "Waveguides and Cavities", "Radiation"],
  "Thermodynamics & Statistical": ["Laws of Thermodynamics", "Statistical Ensembles", "Quantum Statistics", "Random Walks & Ising Model"],
  "Mathematical Physics": ["Complex Analysis", "Linear Algebra", "Differential Equations", "Fourier & Laplace Transforms", "Numerical Methods"],
  "Classical Mechanics": ["Constraints", "Lagrangian Dynamics", "Hamiltonian Dynamics", "Symmetry and Conservation Laws", "Central Force Motion", "Scattering", "Small Oscillations", "Rigid Body Dynamics", "Canonical Transformations", "Poisson Brackets", "Kepler Problems", "Special Theory of Relativity", "Phase Space Dynamics", "Action-Angle Variables", "Non-Inertial Frames", "Hamilton-Jacobi Theory"],
  "Solid State Physics": ["Condensed Matter"],
  "Atomic & Molecular": ["Atomic Physics", "Molecular Physics"],
  "Nuclear & Particle": ["Nuclear Physics", "Particle Physics"],
  "Electronics": ["Analog Electronics", "Digital Electronics"],
};

export interface CustomConfig {
  sections: {
    name: string;
    topicWeights: Record<string, number>;
    marking: { positive: number; negative: number };
    allowedTypes: QuestionType[];
    maxAttempts?: number;
  }[];
}

export const generatePresetExam = async (preset: ExamPreset, customConfig?: CustomConfig): Promise<ExamConfig> => {
  // Pattern definitions (Questions per Subject Group)
  const PATTERNS: Record<Exclude<ExamPreset, "CUSTOM">, Record<string, number>> = {
    GATE: {
      "Quantum Mechanics": 10,
      "Electromagnetic Theory": 9,
      "Thermodynamics & Statistical": 9,
      "Mathematical Physics": 6,
      "Classical Mechanics": 6,
      "Solid State Physics": 6,
      "Atomic & Molecular": 5,
      "Nuclear & Particle": 5,
      "Electronics": 5,
    },
    CSIR_NET: {
      "Mathematical Physics": 10,
      "Quantum Mechanics": 10,
      "Electromagnetic Theory": 9,
      "Classical Mechanics": 8,
      "Thermodynamics & Statistical": 7,
      "Solid State Physics": 5,
      "Electronics": 5,
      "Nuclear & Particle": 5,
      "Atomic & Molecular": 4,
    },
    TIFR_GS: {
      "Quantum Mechanics": 9,
      "Classical Mechanics": 7,
      "Electromagnetic Theory": 7,
      "Thermodynamics & Statistical": 7,
      "Mathematical Physics": 6,
      "Electronics": 4,
    },
    BARC_OCES: {
      "Quantum Mechanics": 18,
      "Electromagnetic Theory": 18,
      "Thermodynamics & Statistical": 18,
      "Classical Mechanics": 11,
      "Nuclear & Particle": 11,
      "Solid State Physics": 11,
      "Mathematical Physics": 6,
      "Electronics": 4,
      "Atomic & Molecular": 3,
    }
  };

  if (preset === "CUSTOM" && customConfig) {
    const sections: ExamSection[] = [];
    
    // 1. Identify all unique topics needed across all sections and their total counts
    const topicToTotalCount: Record<string, number> = {};
    customConfig.sections.forEach(s => {
      Object.entries(s.topicWeights).forEach(([group, count]) => {
        if (count > 0) {
          const topicsInGroup = SUBJECT_GROUPS[group] || [];
          topicsInGroup.forEach(topic => {
            // Fetch significantly more to allow for type filtering (MCQ vs MSQ vs NAT)
            const multiplier = s.allowedTypes.length === 3 ? 3 : 10;
            topicToTotalCount[topic] = (topicToTotalCount[topic] || 0) + Math.max(20, Math.ceil((count * multiplier) / topicsInGroup.length)); 
          });
        }
      });
    });

    // 2. Pre-fetch all necessary questions from the bank in one pass (conceptually)
    const topicCache: Record<string, Question[]> = {};
    await Promise.all(Object.entries(topicToTotalCount).map(async ([topic, totalNeeded]) => {
      try {
        const slug = topic.replace(/ /g, "_").toLowerCase();
        const url = `${API_BASE_URL}/api/question_bank/sample?topic=${slug}&count=${totalNeeded}`;
        const response = await fetch(url);
        
        let bankQuestions: Question[] = [];
        if (!response.ok) {
          const fallbackResponse = await fetch(`/question_bank/${slug}.json`);
          if (fallbackResponse.ok) {
            bankQuestions = await fallbackResponse.json();
          }
        } else {
          bankQuestions = await response.json();
        }
        topicCache[topic] = bankQuestions;
      } catch (err) {
        console.warn(`Could not fetch bank for topic: ${topic}`, err);
        topicCache[topic] = [];
      }
    }));

    // 3. Distribute cached questions into sections
    for (let i = 0; i < customConfig.sections.length; i++) {
      const s = customConfig.sections[i];
      const sectionPool: Question[] = [];
      
      Object.entries(s.topicWeights).forEach(([group, count]) => {
        if (count <= 0) return;
        const topicsInGroup = SUBJECT_GROUPS[group] || [];
        topicsInGroup.forEach(topic => {
          const questions = topicCache[topic] || [];
          // Filter by allowed types for this specific section
          const filtered = s.allowedTypes.length > 0 
            ? questions.filter(q => s.allowedTypes.includes(q.type || "MCQ"))
            : questions;
          sectionPool.push(...filtered);
        });
      });

      const totalRequired = Object.values(s.topicWeights).reduce((a, b) => a + b, 0);
      sections.push({
        id: `custom-section-${i}`,
        name: s.name,
        questions: shuffleArray(sectionPool).slice(0, totalRequired),
        marking: s.marking,
        maxAttempts: s.maxAttempts,
        allowedTypes: s.allowedTypes
      });
    }

    return {
      name: "Custom Physics Exam",
      sections,
      settings: { timerHours: 3, timerMinutes: 0, shuffleQuestions: true, shuffleOptions: true }
    };
  }

  // Handle standard presets (GATE, CSIR_NET, etc.)
  const pattern = PATTERNS[preset as keyof typeof PATTERNS];
  const allQuestions: Question[] = [];

  for (const [group, count] of Object.entries(pattern)) {
    const topicsInGroup = SUBJECT_GROUPS[group] || [];
    if (topicsInGroup.length === 0) continue;

    const questionsPerTopic = Math.ceil(count / topicsInGroup.length);
    
    for (const topic of topicsInGroup) {
      try {
        const slug = topic.replace(/ /g, "_").toLowerCase();
        const url = `${API_BASE_URL}/api/question_bank/sample?topic=${slug}&count=${questionsPerTopic}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          const fallbackResponse = await fetch(`/question_bank/${slug}.json`);
          if (!fallbackResponse.ok) continue;
          const bankQuestions: Question[] = await fallbackResponse.json();
          allQuestions.push(...shuffleArray(bankQuestions).slice(0, questionsPerTopic));
          continue;
        }
        
        const sampled: Question[] = await response.json();
        allQuestions.push(...sampled);
      } catch (err) {
        console.warn(`Could not fetch bank for topic: ${topic}`, err);
      }
    }
  }

  const finalPool = shuffleArray(allQuestions).slice(0, Object.values(pattern).reduce((a, b) => a + b, 0));

  if (preset === "GATE") {
    // GATE Structure: Section A (General Aptitude - skipped here for physics), Section B (Physics)
    // We'll split the 65 questions into 1-mark and 2-mark sections roughly
    const q1Mark = finalPool.slice(0, 25);
    const q2Mark = finalPool.slice(25, 65);

    return {
      name: "GATE Physics Mock Exam",
      sections: [
        {
          id: "gate-physics-1m",
          name: "Physics - 1 Mark Questions",
          questions: q1Mark,
          marking: { positive: 1, negative: 0.33 }
        },
        {
          id: "gate-physics-2m",
          name: "Physics - 2 Mark Questions",
          questions: q2Mark,
          marking: { positive: 2, negative: 0.66 }
        }
      ],
      settings: { timerHours: 3, timerMinutes: 0, shuffleQuestions: true, shuffleOptions: true }
    };
  }

  if (preset === "CSIR_NET") {
    // CSIR NET: Part B (+3.5/-0.875) and Part C (+5/0 or -1.25)
    // Part C usually has a choice (Answer 20 out of 30)
    const partB = finalPool.slice(0, 20);
    const partC = finalPool.slice(20, 50);

    return {
      name: "CSIR NET Physical Sciences Mock",
      sections: [
        {
          id: "net-part-b",
          name: "Part B (Core Physics)",
          questions: partB,
          marking: { positive: 3.5, negative: 0.875 }
        },
        {
          id: "net-part-c",
          name: "Part C (Advanced Physics)",
          questions: partC,
          marking: { positive: 5, negative: 1.25 },
          maxAttempts: 20
        }
      ],
      settings: { timerHours: 3, timerMinutes: 0, shuffleQuestions: true, shuffleOptions: true }
    };
  }

  // Default fallback for others (Legacy or simple format)
  let defaultSettings: ExamSettings | undefined;
  if (preset === "BARC_OCES") {
    defaultSettings = { timerHours: 2, timerMinutes: 0, positiveMarking: 3, negativeMarking: 1, shuffleQuestions: true, shuffleOptions: true, questionCount: 100 };
  } else if (preset === "TIFR_GS") {
    defaultSettings = { timerHours: 3, timerMinutes: 0, positiveMarking: 3, negativeMarking: 1, shuffleQuestions: true, shuffleOptions: true, questionCount: 40 };
  }

  return {
    name: `${preset.replace("_", " ")} Physics Exam`,
    questions: finalPool,
    settings: defaultSettings,
  };
};

export const isValidQuestion = (q: any): q is Question => {
  if (typeof q.question !== "string" || typeof q.topic !== "string" || typeof q.explanation !== "string") return false;
  
  const type = q.type || "MCQ";
  if (type === "MCQ") {
    return Array.isArray(q.options) && typeof q.answer_label === "number";
  }
  if (type === "MSQ") {
    return Array.isArray(q.options) && Array.isArray(q.answer_labels);
  }
  if (type === "NAT") {
    return typeof q.answer_value === "string" || (q.answer_range && typeof q.answer_range.min === "number" && typeof q.answer_range.max === "number");
  }
  return false;
};

export const isValidExamConfig = (config: any): config is ExamConfig => {
  if (typeof config !== "object" || !config.name) return false;
  
  if (Array.isArray(config.sections)) {
    return config.sections.every((s: any) => 
      typeof s.id === "string" && 
      typeof s.name === "string" && 
      Array.isArray(s.questions) && 
      s.questions.every(isValidQuestion) &&
      typeof s.marking === "object" &&
      typeof s.marking.positive === "number" &&
      typeof s.marking.negative === "number"
    );
  }
  
  if (Array.isArray(config.questions)) {
    return config.questions.every(isValidQuestion);
  }
  
  return false;
};

export const isValidExamQuestions = (
  questions: any,
): questions is Question[] => {
  return Array.isArray(questions) && questions.every(isValidQuestion);
};

export const robustJsonParse = (jsonString: string): any => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (error instanceof SyntaxError && error.message.includes("at position")) {
      const positionMatch = /at position (\d+)/.exec(error.message);
      if (positionMatch && positionMatch[1]) {
        const position = parseInt(positionMatch[1], 10);
        const fixedJsonString =
          jsonString.slice(0, position) + "\\" + jsonString.slice(position);
        try {
          return JSON.parse(fixedJsonString);
        } catch (secondError) {
          console.error("JSON parsing fix failed. Original error:", error);
          throw error;
        }
      }
    }
    throw error;
  }
};

export const shuffleArray = <T>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
};

export const resolveImagePath = (path: string | undefined): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  
  const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL || "https://pub-682f1a94c94443278f61ec7ca3dadaec.r2.dev";
  return `${publicUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};
