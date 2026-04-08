export const REQUIRED_UPLOAD_COLUMNS = [
  'name','email','phone','exam_type','role','day','date','test_center','faculty','room','address','map_link','arrival_time',
] as const;

export const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '_');

export function validateUploadHeaders(headers: string[]) {
  const normalized = headers.map((h) => normalizeHeader(h));
  const missing = REQUIRED_UPLOAD_COLUMNS.filter((col) => !normalized.includes(col));
  return { normalized, missing };
}
