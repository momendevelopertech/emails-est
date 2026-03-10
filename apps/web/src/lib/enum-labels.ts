type Locale = 'en' | 'ar';

const labels = {
    ar: {
        roles: {
            SUPER_ADMIN: '???? ???',
            HR_ADMIN: '????? ??????? ???????',
            MANAGER: '????',
            BRANCH_SECRETARY: '???????? ?????',
            SUPPORT: '????? ?????',
            EMPLOYEE: '????',
        },
        status: {
            DRAFT: '?????',
            PENDING: '??? ????????',
            MANAGER_APPROVED: '?????? ??????',
            HR_APPROVED: '?????? ??????? ???????',
            REJECTED: '?????',
            CANCELLED: '????',
        },
        leaveType: {
            ANNUAL: '?????',
            CASUAL: '?????',
            EMERGENCY: '?????',
            MISSION: '???????',
            ABSENCE_WITH_PERMISSION: '???? ????',
        },
        permissionType: {
            PERSONAL: '??? ????',
            LATE_ARRIVAL: '????? ????',
            EARLY_LEAVE: '?????? ????',
        },
    },
    en: {
        roles: {
            SUPER_ADMIN: 'Super Admin',
            HR_ADMIN: 'HR Admin',
            MANAGER: 'Manager',
            BRANCH_SECRETARY: 'Branch Secretary',
            SUPPORT: 'Support',
            EMPLOYEE: 'Employee',
        },
        status: {
            DRAFT: 'Draft',
            PENDING: 'Pending',
            MANAGER_APPROVED: 'Manager Approved',
            HR_APPROVED: 'HR Approved',
            REJECTED: 'Rejected',
            CANCELLED: 'Cancelled',
        },
        leaveType: {
            ANNUAL: 'Annual',
            CASUAL: 'Casual',
            EMERGENCY: 'Emergency',
            MISSION: 'Mission',
            ABSENCE_WITH_PERMISSION: 'Absence With Permission',
        },
        permissionType: {
            PERSONAL: 'Personal Permission',
            LATE_ARRIVAL: 'Late Arrival',
            EARLY_LEAVE: 'Early Leave',
        },
    },
} as const;

function getLabel(group: keyof (typeof labels)['ar'], value: string, locale: Locale) {
    return labels[locale][group][value as keyof (typeof labels)['ar'][typeof group]] || value;
}

export const enumLabels = {
    role: (value: string, locale: Locale) => getLabel('roles', value, locale),
    status: (value: string, locale: Locale) => getLabel('status', value, locale),
    leaveType: (value: string, locale: Locale) => getLabel('leaveType', value, locale),
    permissionType: (value: string, locale: Locale) => getLabel('permissionType', value, locale),
};
