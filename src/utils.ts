import type { Question, ExamConfig, ExamPreset } from "./types";

export const isLocalhost = (): boolean => {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168.")
  );
};

export const API_BASE_URL = isLocalhost() ? "" : (import.meta.env.VITE_API_BASE_URL || "https://outsie.aryan.cfd").replace(/\/$/, "");

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

export const generatePresetExam = async (preset: ExamPreset, customPattern?: Record<string, number>): Promise<ExamConfig> => {
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

  const pattern = preset === "CUSTOM" && customPattern ? customPattern : PATTERNS[preset as keyof typeof PATTERNS];
  const allQuestions: Question[] = [];

  for (const [group, count] of Object.entries(pattern)) {
    const topicsInGroup = SUBJECT_GROUPS[group] || [];
    if (topicsInGroup.length === 0) continue;

    // Pick a random topic from this group to sample from
    // (Or ideally, distribute across topics in group)
    const questionsPerTopic = Math.ceil(count / topicsInGroup.length);
    
    for (const topic of topicsInGroup) {
      try {
        const fileName = topic.replace(/ /g, "_").toLowerCase() + ".json";
        const response = await fetch(`/question_bank/${fileName}`);
        if (!response.ok) continue;
        
        const bankQuestions: Question[] = await response.json();
        const sampled = shuffleArray(bankQuestions).slice(0, questionsPerTopic);
        allQuestions.push(...sampled);
      } catch (err) {
        console.warn(`Could not fetch bank for topic: ${topic}`);
      }
    }
  }

  // Shuffle the final set and trim to exact count if needed
  const finalQuestions = shuffleArray(allQuestions).slice(0, Object.values(pattern).reduce((a, b) => a + b, 0));

  let defaultSettings: ExamSettings | undefined;
  if (preset === "BARC_OCES") {
    defaultSettings = { timerHours: 2, timerMinutes: 0, positiveMarking: 3, negativeMarking: 1, shuffleQuestions: true, shuffleOptions: true, questionCount: 100 };
  } else if (preset === "GATE") {
    // GATE is mixed (1 and 2 marks, some 0 negative). We set an average global config.
    defaultSettings = { timerHours: 3, timerMinutes: 0, positiveMarking: 1.5, negativeMarking: 0.5, shuffleQuestions: true, shuffleOptions: true, questionCount: 65 };
  } else if (preset === "TIFR_GS") {
    // TIFR is mixed (+3/-1 and +5/0). We set Section A defaults.
    defaultSettings = { timerHours: 3, timerMinutes: 0, positiveMarking: 3, negativeMarking: 1, shuffleQuestions: true, shuffleOptions: true, questionCount: 40 };
  } else if (preset === "CSIR_NET") {
    // CSIR NET is mixed. We set Part B defaults as an average.
    defaultSettings = { timerHours: 3, timerMinutes: 0, positiveMarking: 3.5, negativeMarking: 0.875, shuffleQuestions: true, shuffleOptions: true, questionCount: 75 };
  }

  return {
    name: `${preset.replace("_", " ")} Physics Exam`,
    questions: finalQuestions,
    settings: defaultSettings,
  };
};

export const isValidExamQuestions = (
  questions: any,
): questions is Question[] => {
  return (
    Array.isArray(questions) &&
    questions.length > 0 &&
    questions.every(
      (q) =>
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.every(
          (opt: any) =>
            typeof opt.label === "number" && typeof opt.value === "string",
        ) &&
        typeof q.answer_label === "number" &&
        typeof q.topic === "string" &&
        typeof q.explanation === "string",
    )
  );
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
  
  const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL || "https://pub-274880572da940869a8b273d6e53a77f.r2.dev";
  return `${publicUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};
