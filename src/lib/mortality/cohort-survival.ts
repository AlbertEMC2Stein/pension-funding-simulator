/** Annual cohort death probabilities and survival from a selected attained age. */
export type LongevityScenario = "low" | "medium" | "high";
/** Sex-specific cohort table used before any custom survival-curve mixture. */
export type CohortSex = "female" | "male";

export const FIRST_COHORT_YEAR = 1926;
export const LAST_COHORT_YEAR = 2026;
export const LAST_SUPPORTED_RETIREMENT_AGE = 99;

/** Validate year inputs consistently for the form, chart and simulation draft. */
export function validateCohortYears(birthText: string, retirementText: string) {
  const birthYear = /^\d{4}$/.test(birthText.trim()) ? Number(birthText) : NaN;
  const retirementYear = /^\d{4}$/.test(retirementText.trim())
    ? Number(retirementText)
    : NaN;
  const birthValid =
    Number.isInteger(birthYear) &&
    birthYear >= FIRST_COHORT_YEAR &&
    birthYear <= LAST_COHORT_YEAR;
  const birthError = birthValid
    ? null
    : `Enter a birth year from ${FIRST_COHORT_YEAR} to ${LAST_COHORT_YEAR}.`;
  const retirementError = !Number.isInteger(retirementYear)
    ? "Enter a four-digit retirement year."
    : birthValid &&
        (retirementYear < birthYear ||
          retirementYear > birthYear + LAST_SUPPORTED_RETIREMENT_AGE)
      ? `Enter a year from ${birthYear} to ${birthYear + LAST_SUPPORTED_RETIREMENT_AGE} (retirement age 0–99).`
      : null;

  return {
    birthYear,
    retirementYear,
    birthError,
    retirementError,
    valid: birthError === null && retirementError === null,
  };
}

/** Read and validate a single cohort row from one of the packaged wide CSVs. */
export function parseCohortCsv(csv: string, birthYear: number): number[] {
  if (!Number.isInteger(birthYear) || birthYear < 1926 || birthYear > 2026)
    throw new Error("Birth year must be between 1926 and 2026.");

  const lines = csv
    .replace(/^\uFEFF/, "")
    .trimEnd()
    .split(/\r?\n/);
  const header = [
    "birth_year",
    ...Array.from({ length: 100 }, (_, age) => `age_${age}`),
  ].join(",");

  if (lines[0] !== header)
    throw new Error("The cohort table has an unexpected format.");

  const matches = lines
    .slice(1)
    .filter((line) => line.split(",", 1)[0] === String(birthYear));

  if (matches.length !== 1)
    throw new Error("The requested cohort is missing or duplicated.");

  const fields = matches[0].split(",");

  if (fields.length !== 101)
    throw new Error("The cohort row has an unexpected number of ages.");

  return fields.slice(1).map((field) => {
    if (!/^(?:\d+)(?:\.\d+)?$/.test(field))
      throw new Error("The cohort table contains an invalid probability.");

    const value = Number(field);

    if (!Number.isFinite(value) || value < 0 || value >= 1)
      throw new Error("The cohort table contains an invalid probability.");

    return value;
  });
}

/** Survival conditional on reaching retirement age, through attained age 100. */
export function cohortSurvival(
  probabilities: number[],
  retirementAge: number,
): { age: number; survival: number }[] {
  if (
    probabilities.length !== 100 ||
    probabilities.some((q) => !Number.isFinite(q) || q < 0 || q >= 1)
  )
    throw new Error(
      "A cohort requires valid annual probabilities for ages 0–99.",
    );
  if (
    !Number.isInteger(retirementAge) ||
    retirementAge < 0 ||
    retirementAge > 99
  )
    throw new Error("Retirement age must be between 0 and 99.");

  const curve = [{ age: retirementAge, survival: 1 }];
  let survival = 1;

  for (let age = retirementAge; age < 100; age += 1) {
    survival *= 1 - probabilities[age];
    curve.push({ age: age + 1, survival });
  }

  return curve;
}

/** Mix conditional survival curves, not annual death probabilities. */
export function mixCohortSurvival(
  female: number[],
  male: number[],
  retirementAge: number,
  maleWeight: number,
) {
  if (!Number.isFinite(maleWeight) || maleWeight < 0 || maleWeight > 1)
    throw new Error("Mixture weight must be between 0 and 1.");

  const f = cohortSurvival(female, retirementAge);
  const m = cohortSurvival(male, retirementAge);

  return f.map((point, i) => ({
    age: point.age,
    survival: (1 - maleWeight) * point.survival + maleWeight * m[i].survival,
  }));
}

/** Fetch only the requested file; basePath is the static site's build-time prefix. */
export async function loadCohort(
  birthYear: number,
  sex: CohortSex,
  scenario: LongevityScenario,
  basePath: string,
  signal: AbortSignal,
): Promise<number[]> {
  const file = `cohort_table_1926_2026_${sex}_${scenario}.csv`;
  const response = await fetch(`${basePath}/data/mortality/${file}`, {
    signal,
  });

  if (!response.ok)
    throw new Error(`Could not load cohort data (${response.status}).`);

  return parseCohortCsv(await response.text(), birthYear);
}
