export const normalizeSearchText = (value?: string | null) => {
    if (!value) return '';
    return value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
        .replace(/ـ/g, '')
        .replace(/[إأآٱ]/g, 'ا')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ى/g, 'ي')
        .replace(/ء/g, '')
        .replace(/\s+/g, ' ');
};

export const matchesEmployeeSearch = (
    query: string,
    user: { fullName?: string | null; fullNameAr?: string | null; employeeNumber?: string | null },
) => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return true;
    const nameStack = normalizeSearchText(`${user.fullName || ''} ${user.fullNameAr || ''}`);
    if (nameStack.includes(normalizedQuery)) return true;
    const employeeNumber = (user.employeeNumber || '').toLowerCase();
    return employeeNumber.includes(normalizedQuery);
};
