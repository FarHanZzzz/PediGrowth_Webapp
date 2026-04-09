// PEDI-GROWTH — Clinical Motor Assessment Frameworks
// ====================================================================
// Contains age-normed motor milestones (based on Bayley/DAYC principles),
// AIMS observational categories, and GMFCS level definitions.
//
// IMPORTANT: These are SCREENING SUPPORT checklists, NOT diagnostic tools.
// They help structure parent observations for clinician review.
// No clinical diagnosis should be derived from these alone.
//
// Sources:
//   - WHO Motor Development Study (2006)
//   - Bayley Scales of Infant and Toddler Development, 4th Ed
//   - Alberta Infant Motor Scale (AIMS) — Piper & Darrah
//   - GMFCS — Palisano et al. (1997, revised 2007)
//   - DAYC-2 — Voress & Maddox
// ====================================================================

// ============================================================
// Age-Normed Motor Milestones (Bayley/DAYC-inspired)
// ============================================================

export interface MotorMilestone {
  /** Unique identifier for the milestone */
  id: string;
  /** Human-readable label for the milestone */
  label: string;
  /** Typical age range in months when this milestone is expected */
  expectedByMonths: number;
  /** Category grouping for UI display */
  category: "gross_motor" | "fine_motor" | "postural";
  /** Clinical significance if missed at the expected age */
  clinicalNote: string;
}

/**
 * Age-normed motor milestones grouped by developmental stage.
 * Each band covers a specific age range in months.
 *
 * Usage: Given a child's age, select the band where ageMonths falls
 * within [minAge, maxAge] and present those milestones as checkboxes.
 * Milestones from EARLIER bands that are NOT yet achieved are flagged
 * as "delayed" observations.
 */
export interface MilestoneBand {
  /** Minimum age in months for this band (inclusive) */
  minAge: number;
  /** Maximum age in months for this band (inclusive) */
  maxAge: number;
  /** Display label for the age range */
  label: string;
  /** Milestones expected to be achieved within this band */
  milestones: MotorMilestone[];
}

export const AGE_NORMED_MILESTONES: MilestoneBand[] = [
  {
    minAge: 0,
    maxAge: 5,
    label: "0–5 months",
    milestones: [
      {
        id: "m-0-1",
        label: "Lifts head briefly when on tummy (prone)",
        expectedByMonths: 2,
        category: "gross_motor",
        clinicalNote: "Head control is the first gross motor milestone. Persistent head lag after 3 months warrants evaluation.",
      },
      {
        id: "m-0-2",
        label: "Pushes up on forearms when on tummy",
        expectedByMonths: 4,
        category: "gross_motor",
        clinicalNote: "Forearm propping indicates developing upper body strength and shoulder stability.",
      },
      {
        id: "m-0-3",
        label: "Holds head steady when supported in sitting",
        expectedByMonths: 4,
        category: "postural",
        clinicalNote: "Steady head in supported sitting indicates neck extensor strength.",
      },
      {
        id: "m-0-4",
        label: "Brings hands to midline",
        expectedByMonths: 4,
        category: "fine_motor",
        clinicalNote: "Midline hand play indicates bilateral coordination and body awareness.",
      },
      {
        id: "m-0-5",
        label: "Rolls from tummy to back",
        expectedByMonths: 5,
        category: "gross_motor",
        clinicalNote: "Rolling indicates trunk rotation and antigravity movement pattern development.",
      },
    ],
  },
  {
    minAge: 6,
    maxAge: 9,
    label: "6–9 months",
    milestones: [
      {
        id: "m-6-1",
        label: "Sits independently without support",
        expectedByMonths: 7,
        category: "postural",
        clinicalNote: "Independent sitting by 9 months is a critical milestone. Failure to sit by 9 months is a red flag for motor delay.",
      },
      {
        id: "m-6-2",
        label: "Rolls both ways (tummy to back and back to tummy)",
        expectedByMonths: 7,
        category: "gross_motor",
        clinicalNote: "Bilateral rolling indicates symmetric trunk control.",
      },
      {
        id: "m-6-3",
        label: "Bears weight on legs when held standing",
        expectedByMonths: 7,
        category: "gross_motor",
        clinicalNote: "Weight-bearing through legs indicates lower limb strength and readiness for standing.",
      },
      {
        id: "m-6-4",
        label: "Reaches for objects with one hand",
        expectedByMonths: 6,
        category: "fine_motor",
        clinicalNote: "Unilateral reaching indicates hand-eye coordination and visual-motor integration.",
      },
      {
        id: "m-6-5",
        label: "Transfers objects between hands",
        expectedByMonths: 8,
        category: "fine_motor",
        clinicalNote: "Object transfer requires bilateral coordination and midline crossing.",
      },
    ],
  },
  {
    minAge: 10,
    maxAge: 14,
    label: "10–14 months",
    milestones: [
      {
        id: "m-10-1",
        label: "Pulls to stand using furniture",
        expectedByMonths: 10,
        category: "gross_motor",
        clinicalNote: "Pull-to-stand indicates lower limb strength, balance readiness, and motor planning.",
      },
      {
        id: "m-10-2",
        label: "Cruises along furniture (walks while holding on)",
        expectedByMonths: 11,
        category: "gross_motor",
        clinicalNote: "Cruising is a critical pre-walking milestone indicating lateral weight shifting.",
      },
      {
        id: "m-10-3",
        label: "Stands alone for a few seconds",
        expectedByMonths: 12,
        category: "postural",
        clinicalNote: "Independent standing requires balance and postural control without support.",
      },
      {
        id: "m-10-4",
        label: "Takes first independent steps",
        expectedByMonths: 13,
        category: "gross_motor",
        clinicalNote: "Most children walk between 9-15 months. Not walking by 18 months requires evaluation.",
      },
      {
        id: "m-10-5",
        label: "Uses pincer grasp (thumb and finger)",
        expectedByMonths: 10,
        category: "fine_motor",
        clinicalNote: "Pincer grasp indicates fine motor maturation and hand dexterity.",
      },
    ],
  },
  {
    minAge: 15,
    maxAge: 23,
    label: "15–23 months",
    milestones: [
      {
        id: "m-15-1",
        label: "Walks independently (stable walking pattern)",
        expectedByMonths: 15,
        category: "gross_motor",
        clinicalNote: "Most children achieve stable walking by 15 months. Absence by 18 months is a formal red flag (WHO).",
      },
      {
        id: "m-15-2",
        label: "Squats to pick up a toy and returns to standing",
        expectedByMonths: 18,
        category: "gross_motor",
        clinicalNote: "Squat-to-stand indicates quadriceps strength, balance, and motor planning.",
      },
      {
        id: "m-15-3",
        label: "Walks backwards",
        expectedByMonths: 18,
        category: "gross_motor",
        clinicalNote: "Backward walking requires spatial awareness and balance control.",
      },
      {
        id: "m-15-4",
        label: "Begins to run (hurried walk)",
        expectedByMonths: 20,
        category: "gross_motor",
        clinicalNote: "Running emergence indicates maturing gait patterns and balance confidence.",
      },
      {
        id: "m-15-5",
        label: "Kicks a ball forward",
        expectedByMonths: 22,
        category: "gross_motor",
        clinicalNote: "Ball kicking requires single-leg balance and bilateral limb coordination.",
      },
    ],
  },
  {
    minAge: 24,
    maxAge: 48,
    label: "24–48 months",
    milestones: [
      {
        id: "m-24-1",
        label: "Runs well without frequent falling",
        expectedByMonths: 24,
        category: "gross_motor",
        clinicalNote: "Mature running should be smooth with reciprocal arm swing by 24 months.",
      },
      {
        id: "m-24-2",
        label: "Jumps with both feet off the ground",
        expectedByMonths: 30,
        category: "gross_motor",
        clinicalNote: "Bilateral jumping requires explosive strength, balance, and motor coordination.",
      },
      {
        id: "m-24-3",
        label: "Goes up stairs with alternating feet",
        expectedByMonths: 36,
        category: "gross_motor",
        clinicalNote: "Reciprocal stair climbing indicates hip/knee strength and balance maturation.",
      },
      {
        id: "m-24-4",
        label: "Stands on one foot for 2–3 seconds",
        expectedByMonths: 36,
        category: "postural",
        clinicalNote: "Single-leg stance tests balance and hip abductor strength (related to Trendelenburg).",
      },
      {
        id: "m-24-5",
        label: "Pedals a tricycle",
        expectedByMonths: 36,
        category: "gross_motor",
        clinicalNote: "Pedalling requires lower limb reciprocal movement, coordination, and motor planning.",
      },
    ],
  },
];

// ============================================================
// AIMS (Alberta Infant Motor Scale) — Observational Categories
// ============================================================
// AIMS is designed for infants 0–18 months. It evaluates motor
// maturation through 4 positional subscales.
//
// NOTE: This is a SIMPLIFIED checklist inspired by AIMS categories.
// The full AIMS requires trained clinical administration and scoring.

export interface AIMSCategory {
  /** Position category identifier */
  id: string;
  /** Positional subscale name */
  position: "Prone" | "Supine" | "Sitting" | "Standing";
  /** Observation items within this position */
  items: AIMSItem[];
}

export interface AIMSItem {
  /** Unique item identifier */
  id: string;
  /** Observable behavior description */
  label: string;
  /** Brief guidance note for the parent observer */
  observationTip: string;
}

export const AIMS_CATEGORIES: AIMSCategory[] = [
  {
    id: "aims-prone",
    position: "Prone",
    items: [
      {
        id: "aims-p-1",
        label: "Lifts head and chest off surface",
        observationTip: "Place child on their tummy; observe head and chest lift.",
      },
      {
        id: "aims-p-2",
        label: "Props on extended arms",
        observationTip: "Watch for straight-arm pushing up from tummy position.",
      },
      {
        id: "aims-p-3",
        label: "Reaches forward while on tummy",
        observationTip: "Place a toy just out of reach and watch for forward arm extension.",
      },
    ],
  },
  {
    id: "aims-supine",
    position: "Supine",
    items: [
      {
        id: "aims-s-1",
        label: "Brings feet to mouth while on back",
        observationTip: "Observe whether child can bring feet up while lying on back.",
      },
      {
        id: "aims-s-2",
        label: "Rolls from back to side",
        observationTip: "Watch for intentional rolling movement from back position.",
      },
      {
        id: "aims-s-3",
        label: "Active head turning both directions",
        observationTip: "Observe if the child turns head freely to both sides.",
      },
    ],
  },
  {
    id: "aims-sitting",
    position: "Sitting",
    items: [
      {
        id: "aims-sit-1",
        label: "Sits with hand support (propped sitting)",
        observationTip: "Observe if child can maintain sitting with hands on the floor for balance.",
      },
      {
        id: "aims-sit-2",
        label: "Sits without hand support",
        observationTip: "Watch if child sits with hands free for play.",
      },
      {
        id: "aims-sit-3",
        label: "Reaches for toys while sitting without losing balance",
        observationTip: "While seated, place a toy to the side and see if child can reach without falling.",
      },
    ],
  },
  {
    id: "aims-standing",
    position: "Standing",
    items: [
      {
        id: "aims-stand-1",
        label: "Bears full weight on legs when held upright",
        observationTip: "Hold child under arms in standing; observe leg stiffening to bear weight.",
      },
      {
        id: "aims-stand-2",
        label: "Bounces when held in standing",
        observationTip: "While held upright, observe for active bouncing movements.",
      },
      {
        id: "aims-stand-3",
        label: "Pulls to stand at furniture",
        observationTip: "Place child near stable furniture and observe pull-to-stand attempts.",
      },
    ],
  },
];

// ============================================================
// GMFCS (Gross Motor Function Classification System)
// ============================================================
// Standard 5-level classification for children with cerebral palsy.
// Clinician-assigned, not parent-assigned. Used for documentation.
//
// Source: Palisano et al. Dev Med Child Neurol 1997; revised 2007.

export interface GMFCSLevel {
  /** GMFCS level (1–5) */
  level: number;
  /** Short title */
  title: string;
  /** Clinical description */
  description: string;
  /** Functional implication */
  functionalSummary: string;
  /** CSS color class for visual coding */
  colorClass: string;
}

export const GMFCS_LEVELS: GMFCSLevel[] = [
  {
    level: 1,
    title: "Level I — Walks Without Limitations",
    description:
      "Walks indoors and outdoors and climbs stairs without limitation. Performs gross motor skills including running and jumping, but speed, balance, and coordination are reduced.",
    functionalSummary: "Independent community ambulation",
    colorClass: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  {
    level: 2,
    title: "Level II — Walks With Limitations",
    description:
      "Walks indoors and outdoors and climbs stairs holding onto a railing but has limitations walking on uneven surfaces, inclines, and in crowds.",
    functionalSummary: "Independent ambulation with environmental limits",
    colorClass: "bg-sky-50 border-sky-200 text-sky-800",
  },
  {
    level: 3,
    title: "Level III — Walks With Assistive Device",
    description:
      "Walks indoors or outdoors on a level surface with an assistive mobility device. May climb stairs holding onto a railing. May propel a wheelchair manually.",
    functionalSummary: "Assisted ambulation; manual wheelchair for distances",
    colorClass: "bg-amber-50 border-amber-200 text-amber-800",
  },
  {
    level: 4,
    title: "Level IV — Self-Mobility With Limitations",
    description:
      "May use powered mobility. Children are transported or use powered wheelchair outdoors and in the community. May achieve self-mobility using a powered wheelchair.",
    functionalSummary: "Limited self-mobility; powered wheelchair common",
    colorClass: "bg-orange-50 border-orange-200 text-orange-800",
  },
  {
    level: 5,
    title: "Level V — Transported in Manual Wheelchair",
    description:
      "Physical impairments limit voluntary control of movement. Children are transported in a manual wheelchair in all settings. Children have difficulty maintaining antigravity head and trunk postures.",
    functionalSummary: "Fully dependent for mobility",
    colorClass: "bg-red-50 border-red-200 text-red-800",
  },
];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the milestone band appropriate for a child's age.
 * Returns the band whose range contains the child's age,
 * PLUS all earlier bands (to check for delayed milestones).
 */
export function getMilestoneBandsForAge(ageMonths: number): MilestoneBand[] {
  return AGE_NORMED_MILESTONES.filter((band) => band.minAge <= ageMonths);
}

/**
 * Get the current (most relevant) milestone band for the child's age.
 */
export function getCurrentBand(ageMonths: number): MilestoneBand | null {
  const bands = AGE_NORMED_MILESTONES.filter(
    (band) => ageMonths >= band.minAge && ageMonths <= band.maxAge
  );
  return bands.length > 0 ? bands[bands.length - 1] : null;
}

/**
 * Get milestones from earlier bands that a child SHOULD have achieved.
 * These are milestones from bands BEFORE the child's current band.
 * If a parent says these are NOT achieved, it indicates a delay.
 */
export function getExpectedMilestones(ageMonths: number): MotorMilestone[] {
  const currentBand = getCurrentBand(ageMonths);
  if (!currentBand) return [];

  return AGE_NORMED_MILESTONES
    .filter((band) => band.maxAge < currentBand.minAge)
    .flatMap((band) => band.milestones);
}

/**
 * Determine if AIMS observational checks are relevant for a child's age.
 * AIMS is designed for infants 0–18 months.
 */
export function shouldShowAIMS(ageMonths: number): boolean {
  return ageMonths <= 18;
}

/**
 * Compute motor delay summary from milestone check results.
 * Returns a structured summary object for the clinician handoff.
 */
export interface MotorDelayAssessment {
  /** Total milestones checked */
  totalChecked: number;
  /** Milestones the child has NOT yet achieved */
  missingMilestones: string[];
  /** Milestones from earlier bands not achieved (indicates delay) */
  delayedMilestones: string[];
  /** AIMS items that were NOT observed (if applicable) */
  unobservedAIMSItems: string[];
  /** Overall delay flag based on milestone analysis */
  delayFlag: "none" | "watch" | "concern";
  /** Human-readable summary for the clinician */
  summaryNote: string;
}

export function computeMotorDelayAssessment(
  ageMonths: number,
  achievedMilestoneIds: Set<string>,
  observedAIMSIds: Set<string>,
): MotorDelayAssessment {
  // Get all milestones that SHOULD be achieved by this age
  const expectedFromPriorBands = getExpectedMilestones(ageMonths);
  const currentBand = getCurrentBand(ageMonths);
  const currentBandMilestones = currentBand?.milestones ?? [];

  // Delayed = milestones from PRIOR bands that are not achieved
  const delayedMilestones = expectedFromPriorBands
    .filter((m) => !achievedMilestoneIds.has(m.id))
    .map((m) => m.label);

  // Missing = current band milestones that are not yet achieved
  const missingMilestones = currentBandMilestones
    .filter((m) => !achievedMilestoneIds.has(m.id))
    .map((m) => m.label);

  // AIMS items not observed (only relevant for ≤18 months)
  const allAIMSItems = AIMS_CATEGORIES.flatMap((cat) => cat.items);
  const unobservedAIMSItems = ageMonths <= 18
    ? allAIMSItems.filter((item) => !observedAIMSIds.has(item.id)).map((item) => item.label)
    : [];

  // Determine delay flag severity
  let delayFlag: MotorDelayAssessment["delayFlag"] = "none";
  if (delayedMilestones.length >= 3) {
    delayFlag = "concern";
  } else if (delayedMilestones.length >= 1) {
    delayFlag = "watch";
  }

  // Generate summary note
  let summaryNote = "";
  if (delayFlag === "concern") {
    summaryNote = `${delayedMilestones.length} milestone(s) from earlier developmental stages have not been achieved. This pattern may indicate motor delay. A formal developmental evaluation is recommended.`;
  } else if (delayFlag === "watch") {
    summaryNote = `${delayedMilestones.length} earlier milestone(s) not yet achieved. Monitor closely and discuss with pediatrician at next visit.`;
  } else {
    summaryNote = "No delayed milestones from earlier developmental stages were identified in this screening.";
  }

  return {
    totalChecked: expectedFromPriorBands.length + currentBandMilestones.length,
    missingMilestones,
    delayedMilestones,
    unobservedAIMSItems,
    delayFlag,
    summaryNote,
  };
}
