import type {
  SbaAssessment,
  SbaImportBatch,
  SbaImportRow,
  SbaResult,
  SbaResultStatus,
} from './types';

export const normalizeHeader = (value: string): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const parseCsvText = (text: string): string[][] => {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.trim().length > 0)) {
      rows.push(row);
    }
  }

  return rows.filter((r) => r.length > 0);
};

export const csvRowsToObjects = (text: string): Array<Record<string, string>> => {
  const rows = parseCsvText(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());
  const body = rows.slice(1);

  return body.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? '';
    });
    return record;
  });
};

export const inferColumnMapping = (headers: string[]) => {
  const normalizedToHeader = new Map<string, string>();

  headers.forEach((header) => {
    const normalized = normalizeHeader(header);
    if (normalized) normalizedToHeader.set(normalized, header);
  });

  const find = (candidates: string[]) => {
    for (const candidate of candidates) {
      const match = normalizedToHeader.get(normalizeHeader(candidate));
      if (match) return match;
    }
    return undefined;
  };

  return {
    admissionNumber: find(['admission number', 'admission_no', 'admission', 'student admission', 'student no', 'adm no']),
    learnerName: find(['student name', 'learner name', 'name', 'candidate name', 'full name']),
    score: find(['score', 'marks', 'marks obtained', 'obtained', 'score obtained', 'total score']),
    maxScore: find(['max score', 'maximum score', 'total marks', 'out of', 'maximum marks']),
    status: find(['status', 'result status', 'grade status', 'outcome']),
    subject: find(['subject', 'subject name', 'subject code']),
    className: find(['class', 'class name', 'stream', 'classroom']),
    grade: find(['grade', 'performance level', 'performance level grade']),
    remarks: find(['remarks', 'comment', 'teacher remarks']),
  };
};

export const createStableId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const parseNumericScore = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  const lowered = cleaned.toLowerCase();
  if (['na', 'n/a', 'missing', 'absent', 'exempt', 'pending'].includes(lowered)) return null;
  const normalized = cleaned.replace(/[^0-9.\-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeStatus = (raw: string | null | undefined): SbaResultStatus => {
  const normalized = String(raw ?? '').trim().toLowerCase();
  if (!normalized) return 'pending';
  if (['0', 'zero', 'absent', 'missing', 'not done', 'not available', 'n/a'].includes(normalized)) return 'absent';
  if (['exempt', 'exemption', 'e', 'x'].includes(normalized)) return 'exempt';
  if (['pending', 'in progress', 'not yet graded', 'ongoing'].includes(normalized)) return 'pending';
  if (['invalid', 'reject', 'rejected'].includes(normalized)) return 'invalid';
  return 'present';
};

export const validateScore = (
  score: number | null,
  maxScore: number,
  status: SbaResultStatus,
  scoreMode: 'marks' | 'percentage' | 'grade'
): { valid: boolean; reason?: string } => {
  if (status === 'absent' || status === 'exempt' || status === 'pending' || status === 'invalid') {
    return { valid: true };
  }

  if (score === null) {
    return { valid: false, reason: 'Missing score for present result' };
  }

  if (!Number.isFinite(score)) {
    return { valid: false, reason: 'Score is not numeric' };
  }

  if (scoreMode === 'percentage' && (score < 0 || score > 100)) {
    return { valid: false, reason: 'Percentage score should be between 0 and 100' };
  }

  if (scoreMode === 'marks' && maxScore > 0 && (score < 0 || score > maxScore)) {
    return { valid: false, reason: `Score must be between 0 and ${maxScore}` };
  }

  if (scoreMode === 'grade' && !['A', 'B', 'C', 'D', 'E', 'U'].includes(String(score).toUpperCase())) {
    return { valid: true };
  }

  return { valid: true };
};

export const compareAdmissionNumbers = (a?: string, b?: string): boolean => {
  if (!a && !b) return true;
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
};

export type SbaImportPreview = {
  accepted: Array<{
    rowNumber: number;
    admissionNumber: string;
    studentId?: string;
    score: number | null;
    maxScore: number;
    status: SbaResultStatus;
    reason?: string;
    rawData: Record<string, string>;
  }>;
  rejected: Array<{
    rowNumber: number;
    admissionNumber?: string;
    reason: string;
    rawData: Record<string, string>;
  }>;
  conflicts: Array<{
    rowNumber: number;
    admissionNumber?: string;
    reason: string;
    rawData: Record<string, string>;
  }>;
};

export const previewImportRows = (
  rows: Array<Record<string, string>>,
  mapping: ReturnType<typeof inferColumnMapping>,
  assessment: Pick<SbaAssessment, 'maxScore' | 'scoreMode'>,
  students: Array<{ id: string; schoolId: string; admissionNumber: string }>,
  existingResults: SbaResult[] = []
): SbaImportPreview => {
  const accepted: SbaImportPreview['accepted'] = [];
  const rejected: SbaImportPreview['rejected'] = [];
  const conflicts: SbaImportPreview['conflicts'] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const admissionNumber = String(row[mapping.admissionNumber ?? ''] ?? '').trim();

    if (!admissionNumber) {
      rejected.push({ rowNumber, reason: 'Admission number missing', rawData: row });
      return;
    }

    const matches = students.filter((student) =>
      compareAdmissionNumbers(student.admissionNumber, admissionNumber)
    );

    if (matches.length === 0) {
      conflicts.push({
        rowNumber,
        admissionNumber,
        reason: 'Learner not found. Matching requires an existing school student record.',
        rawData: row,
      });
      return;
    }

    if (matches.length > 1) {
      conflicts.push({
        rowNumber,
        admissionNumber,
        reason: 'More than one learner matches this admission number.',
        rawData: row,
      });
      return;
    }

    const matched = matches[0];
    const duplicateResult = existingResults.find(
      (result) => result.studentId === matched.id && result.assessmentId === ''
    );
    if (duplicateResult) {
      conflicts.push({
        rowNumber,
        admissionNumber,
        reason: 'Duplicate result already exists for this learner under this assessment.',
        rawData: row,
      });
      return;
    }

    const rawStatus = row[mapping.status ?? ''] ?? '';
    const parsedStatus = normalizeStatus(rawStatus);
    const parsedScore = parseNumericScore(row[mapping.score ?? ''] ?? '');
    const maxScoreValue = parseNumericScore(row[mapping.maxScore ?? ''] ?? '') ?? assessment.maxScore;
    const validation = validateScore(parsedScore, maxScoreValue, parsedStatus, assessment.scoreMode);

    if (!validation.valid) {
      rejected.push({ rowNumber, admissionNumber, reason: validation.reason || 'Invalid score', rawData: row });
      return;
    }

    accepted.push({
      rowNumber,
      admissionNumber,
      studentId: matched.id,
      score: parsedScore,
      maxScore: maxScoreValue,
      status: parsedStatus,
      rawData: row,
    });
  });

  return { accepted, rejected, conflicts };
};

export const createImportSummary = (batch: SbaImportBatch) => ({
  batchId: batch.id,
  status: batch.status,
  totalRows: batch.totalRows,
  acceptedRows: batch.acceptedRows,
  rejectedRows: batch.rejectedRows,
  conflictRows: batch.conflictRows,
  createdAt: batch.createdAt,
});

export const createSbaResultFromPreview = (
  previewRow: SbaImportPreview['accepted'][number],
  assessmentId: string,
  schoolId: string,
  sourceBatchId: string,
  classId?: string,
  subjectId?: string,
  date = Date.now()
): SbaResult => ({
  id: createStableId('sba_result'),
  schoolId,
  assessmentId,
  studentId: previewRow.studentId || '',
  classId,
  subjectId,
  admissionNumber: previewRow.admissionNumber,
  score: previewRow.score,
  maxScore: previewRow.maxScore,
  status: previewRow.status,
  remarks: '',
  rawValues: previewRow.rawData,
  sourceBatchId,
  createdAt: date,
  updatedAt: date,
});

export const isCsvFile = (file: File | null): boolean => !!file && file.type === 'text/csv';

export const normaliseLearnerId = (value: string | undefined): string =>
  String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');

export const blankSbaResult = (schoolId: string, assessmentId: string): Omit<SbaResult, 'id' | 'createdAt' | 'updatedAt'> => ({
  schoolId,
  assessmentId,
  studentId: '',
  classId: undefined,
  subjectId: undefined,
  admissionNumber: '',
  score: null,
  maxScore: 100,
  status: 'pending',
  remarks: '',
  rawValues: {},
  sourceBatchId: undefined,
});

export default {
  normalizeHeader,
  parseCsvText,
  csvRowsToObjects,
  inferColumnMapping,
  createStableId,
  parseNumericScore,
  normalizeStatus,
  validateScore,
  previewImportRows,
  createImportSummary,
  createSbaResultFromPreview,
  isCsvFile,
  normaliseLearnerId,
  blankSbaResult,
};
