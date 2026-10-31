import type { ClinicBranch, ConsultationMode, User } from '../types/clinic';

export const CLINIC_BRANCHES: readonly ClinicBranch[] = [
  'Main Outpatient Clinic',
  'Annex Satellite Clinic',
] as const;

export interface SpecialtySuggestion {
  specialty: string;
  department: string;
  matchedKeywords: string[];
  rationale: string;
  guidanceNote: string;
  availableDoctorCount: number;
  doctors: User[];
  isFallbackGeneral?: boolean;
}

export interface SpecialtyMatchResult {
  branch: ClinicBranch;
  reason: string;
  suggestions: SpecialtySuggestion[];
  allBranchSpecialties: {
    specialty: string;
    department: string;
    doctors: User[];
  }[];
  disclaimer: string;
}

export const NON_DIAGNOSTIC_MATCHER_DISCLAIMER =
  'Specialty suggestions are non-diagnostic administrative routing hints based on keywords in your reason for consultation. They do not constitute medical advice, diagnosis, or treatment recommendations. You may choose any available specialty or general consultation.';

interface KeywordRule {
  id: string;
  keywords: string[];
  targetSpecialties: string[];
  rationale: string;
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    id: 'headache-neuro',
    keywords: [
      'headache',
      'headaches',
      'migraine',
      'dizziness',
      'dizzy',
      'vertigo',
      'numbness',
      'tingling',
      'tremor',
      'memory',
      'nerve',
    ],
    targetSpecialties: ['Internal Medicine', 'General Medicine', 'Family Medicine', 'Neurology'],
    rationale: 'Headache, dizziness, or neurological concerns may be evaluated by General / Internal Medicine or Neurology when available.',
  },
  {
    id: 'skin-derm',
    keywords: [
      'skin',
      'rash',
      'rashes',
      'acne',
      'eczema',
      'itch',
      'itching',
      'itchy',
      'hives',
      'psoriasis',
      'mole',
      'lesion',
      'dermatitis',
    ],
    targetSpecialties: ['Dermatology', 'Internal Medicine', 'General Medicine'],
    rationale: 'Skin, rash, or dermatologic concerns match Dermatology or General / Internal Medicine.',
  },
  {
    id: 'respiratory-pulmo',
    keywords: [
      'cough',
      'coughing',
      'phlegm',
      'wheeze',
      'wheezing',
      'asthma',
      'breathing',
      'breath',
      'bronchitis',
      'congestion',
      'lungs',
      'respiratory',
    ],
    targetSpecialties: ['Internal Medicine', 'General Medicine', 'Family Medicine', 'Pulmonology'],
    rationale: 'Cough or respiratory concerns may be seen by General / Internal Medicine or Pulmonology when offered at the branch.',
  },
  {
    id: 'fever-general',
    keywords: [
      'fever',
      'febrile',
      'chills',
      'flu',
      'cold',
      'sore throat',
      'fatigue',
      'weakness',
      'infection',
      'checkup',
      'check-up',
      'annual',
      'clearance',
    ],
    targetSpecialties: ['Internal Medicine', 'General Medicine', 'Family Medicine'],
    rationale: 'Fever, flu-like symptoms, or general checkups are commonly scheduled with General / Internal Medicine.',
  },
  {
    id: 'stomach-internal',
    keywords: [
      'stomach',
      'abdominal',
      'abdomen',
      'acidity',
      'reflux',
      'heartburn',
      'indigestion',
      'nausea',
      'diarrhea',
      'constipation',
      'bloating',
      'gastric',
      'diabetes',
      'blood sugar',
      'thyroid',
    ],
    targetSpecialties: ['Internal Medicine', 'General Medicine', 'Family Medicine'],
    rationale: 'Digestive, metabolic, or general medical concerns match Internal Medicine or General Medicine.',
  },
  {
    id: 'cardio-heart',
    keywords: [
      'blood pressure',
      'hypertension',
      'palpitation',
      'palpitations',
      'heart',
      'cholesterol',
      'lipid',
      'ecg',
      'cardiac',
    ],
    targetSpecialties: ['Cardiology', 'Internal Medicine', 'General Medicine'],
    rationale: 'Blood pressure, cholesterol, or cardiovascular follow-ups match Cardiology or Internal Medicine.',
  },
  {
    id: 'ortho-joint',
    keywords: [
      'back pain',
      'joint',
      'joints',
      'knee',
      'shoulder',
      'ankle',
      'wrist',
      'sprain',
      'strain',
      'arthritis',
      'muscle',
      'bone',
      'posture',
      'neck pain',
    ],
    targetSpecialties: ['Orthopedics', 'Internal Medicine', 'General Medicine'],
    rationale: 'Back, joint, or musculoskeletal discomfort matches Orthopedics or General / Internal Medicine.',
  },
  {
    id: 'obgyn-womens',
    keywords: [
      'pregnancy',
      'prenatal',
      'menstrual',
      'period',
      'pelvic',
      'gynecology',
      'gynecological',
      'obgyn',
      'ob-gyn',
      'pap smear',
      'pcos',
    ],
    targetSpecialties: ['Obstetrics & Gynecology', 'Internal Medicine'],
    rationale: 'Women’s health, menstrual, or prenatal consultations match Obstetrics & Gynecology.',
  },
  {
    id: 'pediatric-child',
    keywords: [
      'child',
      'children',
      'infant',
      'baby',
      'toddler',
      'pediatric',
      'kid',
      'immunization',
      'vaccine',
      'adolescent',
      'teen',
    ],
    targetSpecialties: ['Pediatrics'],
    rationale: 'Child, infant, and adolescent consultations match Pediatrics.',
  },
];

export function isDoctorOfferedAtBranch(
  doctor: User,
  branch: ClinicBranch | string,
  consultationMode?: ConsultationMode
): boolean {
  if (doctor.role !== 'doctor') return false;
  if (doctor.status === 'Inactive' || doctor.status === 'On Leave') return false;

  const branches: readonly string[] =
    Array.isArray(doctor.branches) && doctor.branches.length > 0
      ? doctor.branches
      : (['Main Outpatient Clinic'] as ClinicBranch[]);

  if (!branches.includes(branch)) return false;

  if (consultationMode) {
    const modes =
      Array.isArray(doctor.consultationModes) && doctor.consultationModes.length > 0
        ? doctor.consultationModes
        : (['In-Person'] as ConsultationMode[]);
    if (!modes.includes(consultationMode)) return false;
  }

  return true;
}

function canonicalizeDepartment(doctor: User): string {
  return (doctor.specialty || doctor.department || 'Internal Medicine').trim();
}

function matchesTargetSpecialty(doctor: User, target: string): boolean {
  const t = target.toLowerCase();
  const spec = (doctor.specialty || '').toLowerCase();
  const dept = (doctor.department || '').toLowerCase();

  if (t === 'general medicine' || t === 'family medicine' || t === 'internal medicine') {
    return (
      spec.includes('internal') ||
      spec.includes('general') ||
      spec.includes('family') ||
      spec.includes('primary') ||
      dept.includes('internal') ||
      dept.includes('general') ||
      dept.includes('family')
    );
  }

  return spec.includes(t) || dept.includes(t);
}

export interface MatchSpecialtiesParams {
  reason: string;
  branch?: ClinicBranch | string;
  doctors?: User[];
  users?: User[];
  consultationMode?: ConsultationMode;
}

/**
 * Transparent, deterministic, non-diagnostic keyword-to-specialty matcher.
 * Supports both `{ reason, branch, doctors | users }` (branch-filtered) and `reason: string` (keyword-only).
 */
export function matchSpecialtiesForReason(
  reasonOrParams: string | MatchSpecialtiesParams
): SpecialtyMatchResult {
  const isStringInput = typeof reasonOrParams === 'string';
  const rawReason = isStringInput ? reasonOrParams : reasonOrParams?.reason || '';
  const rawBranch = isStringInput
    ? CLINIC_BRANCHES[0]
    : reasonOrParams?.branch || CLINIC_BRANCHES[0];
  const branch: ClinicBranch =
    rawBranch === 'Annex Satellite Clinic' ? 'Annex Satellite Clinic' : 'Main Outpatient Clinic';
  const consultationMode = isStringInput ? undefined : reasonOrParams?.consultationMode;
  const providedPool = isStringInput
    ? undefined
    : reasonOrParams?.doctors ?? reasonOrParams?.users;

  const cleanReason = rawReason.trim();
  const lowerReason = cleanReason.toLowerCase();

  // Keyword-only mode when no user/doctor roster is passed
  if (!Array.isArray(providedPool)) {
    const suggestionMap = new Map<string, SpecialtySuggestion>();

    if (lowerReason.length > 0) {
      for (const rule of KEYWORD_RULES) {
        const matched = rule.keywords.filter((kw) => {
          const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(`\\b${escaped}`, 'i');
          return re.test(lowerReason);
        });
        if (matched.length === 0) continue;

        for (const target of rule.targetSpecialties) {
          const existing = suggestionMap.get(target);
          if (existing) {
            for (const kw of matched) {
              if (!existing.matchedKeywords.includes(kw)) {
                existing.matchedKeywords.push(kw);
              }
            }
          } else {
            suggestionMap.set(target, {
              specialty: target,
              department: target,
              matchedKeywords: [...matched],
              rationale: rule.rationale,
              guidanceNote: rule.rationale,
              availableDoctorCount: 0,
              doctors: [],
            });
          }
        }
      }
    }

    if (suggestionMap.size === 0) {
      const fallbackRationale =
        'General / Internal Medicine consultation option when no specific specialty keyword matches.';
      suggestionMap.set('Internal Medicine', {
        specialty: 'Internal Medicine',
        department: 'Internal Medicine',
        matchedKeywords: [],
        rationale: fallbackRationale,
        guidanceNote: fallbackRationale,
        availableDoctorCount: 0,
        doctors: [],
        isFallbackGeneral: true,
      });
    }

    return {
      branch,
      reason: cleanReason,
      suggestions: Array.from(suggestionMap.values()),
      allBranchSpecialties: [],
      disclaimer: NON_DIAGNOSTIC_MATCHER_DISCLAIMER,
    };
  }

  const branchDoctors = providedPool.filter((d) =>
    isDoctorOfferedAtBranch(d, branch, consultationMode)
  );

  // Group all branch doctors by canonical specialty/department
  const groupMap = new Map<string, { specialty: string; department: string; doctors: User[] }>();
  for (const doc of branchDoctors) {
    const dept = canonicalizeDepartment(doc);
    if (!groupMap.has(dept)) {
      groupMap.set(dept, {
        specialty: dept,
        department: doc.department || dept,
        doctors: [],
      });
    }
    groupMap.get(dept)!.doctors.push(doc);
  }
  const allBranchSpecialties = Array.from(groupMap.values());

  const suggestionMap = new Map<string, SpecialtySuggestion>();

  if (lowerReason.length > 0) {
    for (const rule of KEYWORD_RULES) {
      const matched = rule.keywords.filter((kw) => {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`\\b${escaped}`, 'i');
        return re.test(lowerReason);
      });

      if (matched.length === 0) continue;

      for (const target of rule.targetSpecialties) {
        for (const group of allBranchSpecialties) {
          if (group.doctors.some((doc) => matchesTargetSpecialty(doc, target))) {
            const existing = suggestionMap.get(group.specialty);
            if (existing) {
              for (const kw of matched) {
                if (!existing.matchedKeywords.includes(kw)) {
                  existing.matchedKeywords.push(kw);
                }
              }
            } else {
              suggestionMap.set(group.specialty, {
                specialty: group.specialty,
                department: group.department,
                matchedKeywords: [...matched],
                rationale: rule.rationale,
                guidanceNote: rule.rationale,
                availableDoctorCount: group.doctors.length,
                doctors: group.doctors,
              });
            }
          }
        }
      }
    }
  }

  // Fallback to General / Internal Medicine at this branch if no specific keyword matched
  if (suggestionMap.size === 0 && allBranchSpecialties.length > 0) {
    const generalGroups = allBranchSpecialties.filter((g) =>
      g.doctors.some((d) => matchesTargetSpecialty(d, 'Internal Medicine'))
    );
    const fallbackTargets = generalGroups.length > 0 ? generalGroups : [allBranchSpecialties[0]];
    const fallbackRationale =
      'General / Internal Medicine consultation option available at this branch when no specific specialty keyword matches.';
    for (const group of fallbackTargets) {
      suggestionMap.set(group.specialty, {
        specialty: group.specialty,
        department: group.department,
        matchedKeywords: [],
        rationale: fallbackRationale,
        guidanceNote: fallbackRationale,
        availableDoctorCount: group.doctors.length,
        doctors: group.doctors,
        isFallbackGeneral: true,
      });
    }
  }

  return {
    branch,
    reason: cleanReason,
    suggestions: Array.from(suggestionMap.values()),
    allBranchSpecialties,
    disclaimer: NON_DIAGNOSTIC_MATCHER_DISCLAIMER,
  };
}
