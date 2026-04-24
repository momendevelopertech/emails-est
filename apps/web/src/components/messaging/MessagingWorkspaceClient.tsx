'use client';

import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import {
    ArrowLeftRight,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    FileSpreadsheet,
    Filter,
    LayoutPanelTop,
    Mail,
    MessageCircleMore,
    Eye,
    Phone,
    Plus,
    Search,
    SendHorizontal,
    Settings,
    Server,
    SquarePen,
    Trash2,
    X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api, { fetchCsrfToken } from '@/lib/api';
import {
    buildGuidedTemplateContent,
    buildEmailPreviewDocument,
    buildWhatsAppPreviewText,
    EXAM_ASSIGNMENT_TEMPLATE_PRESETS,
    EstGuidedTemplateConfig,
    isHtmlTemplateBody,
    parseGuidedTemplateConfig,
    renderTemplateTokens,
    TEMPLATE_EDITOR_VARIABLES,
    TEMPLATE_PREVIEW_RECIPIENT,
} from '@/lib/messaging-template-presets';
import { useRequireAuth } from '@/lib/use-auth';
import { buildRecipientExcelRow, getImportErrorMessage } from './upload-utils';
import RecipientFormModal, { RecipientExcelFormState, RecipientFormErrors } from './RecipientFormModal';
import {
    type BlacklistConflictInfo,
    buildBlacklistConflictMapByCycle,
    buildSheetAssignmentOptions,
    formatRecipientFloorLabel,
    getRecipientSheetLabel,
    isManagedRecipientSheet,
    MANAGED_SHEET_DISPLAY_ORDER,
    SHEET_DISPLAY_ORDER,
    SHEET_META,
    type RecipientSheetValue,
} from './recipient-sheet-utils';
import ConfirmDialog from '../ConfirmDialog';
import FormSelect from '../FormSelect';

type WorkspaceTab = 'recipients' | 'templates' | 'campaign' | 'settings';
type CampaignViewTab = 'send' | 'briefs' | 'logs';
type SettingsViewTab = 'email' | 'whatsapp';
type TemplateType = 'BOTH' | 'EMAIL' | 'WHATSAPP';
type SendScope = 'selected' | 'filtered' | 'all_pending' | 'failed';
type TemplateEditorField = 'subject' | 'body';
type RecipientResponseValue = 'PENDING' | 'CONFIRMED' | 'DECLINED';
type DeliveryChannelName = 'EMAIL' | 'WHATSAPP';
type DeliveryChannelState = 'SENT' | 'FAILED' | 'SKIPPED';
type CampaignPreviewModal = 'email' | 'whatsapp' | null;
type ReassignTargetSheet = Extract<RecipientSheetValue, 'EST1' | 'EST2'>;

type Recipient = {
    id: string;
    cycleId?: string | null;
    division?: string | null;
    name: string;
    arabic_name?: string | null;
    email?: string | null;
    phone?: string | null;
    employer?: string | null;
    kind_of_school?: string | null;
    title?: string | null;
    insurance_number?: string | null;
    institution_tax_number?: string | null;
    national_id_number?: string | null;
    national_id_picture?: string | null;
    personal_photo?: string | null;
    preferred_proctoring_city?: string | null;
    preferred_test_center?: string | null;
    bank_account_name?: string | null;
    bank_name?: string | null;
    bank_branch_name?: string | null;
    account_number?: string | null;
    iban_number?: string | null;
    exam_type?: string | null;
    role?: string | null;
    day?: string | null;
    date?: string | null;
    test_center?: string | null;
    faculty?: string | null;
    room?: string | null;
    room_est1?: string | null;
    type?: string | null;
    governorate?: string | null;
    address?: string | null;
    building?: string | null;
    location?: string | null;
    map_link?: string | null;
    bank_divid?: string | null;
    additional_info_1?: string | null;
    additional_info_2?: string | null;
    arrival_time?: string | null;
    confirmed_at?: string | null;
    declined_at?: string | null;
    sheet?: RecipientSheetValue;
    status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
    error_message?: string | null;
    attempts_count?: number;
    last_attempt_at?: string | null;
    cycle?: {
        id: string;
        name: string;
        source_file_name?: string | null;
    } | null;
};

type RecipientFilters = {
    cycleId: string;
    search: string;
    name: string;
    email: string;
    role: string;
    room_est1: string;
    type: string;
    governorate: string;
    address: string;
    building: string;
    location: string;
    status: string;
};

type CycleSummary = {
    id: string;
    name: string;
    source_file_name?: string | null;
    imported_count: number;
    skipped_count: number;
    recipients_count: number;
    pending_count: number;
    processing_count: number;
    sent_count: number;
    failed_count: number;
    created_at: string;
};

type RecipientFilterOptions = {
    roles: string[];
    types: string[];
    governorates: string[];
    sheets: Array<{
        value: RecipientSheetValue;
        count: number;
    }>;
};

type Template = {
    id: string;
    name: string;
    type: TemplateType;
    subject: string;
    body: string;
};

type LogRow = {
    id: string;
    status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
    error?: string | null;
    created_at: string;
    recipient?: {
        id: string;
        name?: string | null;
        email?: string | null;
        phone?: string | null;
        cycle?: {
            id: string;
            name: string;
        } | null;
        sheet?: RecipientSheetValue;
    };
};

type EmailSettingsRecord = {
    sender_name: string;
    sender_email: string;
    mail_from: string;
    active_sender_account_id: string | null;
    using_env_fallback: boolean;
    smtp_host: string;
    smtp_port: number;
    sent_today_success_count: number;
    smtp_daily_limit: number | null;
    smtp_remaining_today: number | null;
    sender_accounts: SenderEmailAccount[];
};

type SenderEmailAccount = {
    id: string;
    label: string;
    sender_name: string;
    sender_email: string;
    mail_from: string;
    smtp_host: string;
    smtp_port: number;
    smtp_secure: boolean;
    smtp_require_tls: boolean;
    smtp_username: string;
    smtp_daily_limit: number | null;
    has_password: boolean;
    is_active: boolean;
};

type WhatsAppSettingsRecord = {
    api_url: string;
    media_url: string;
    id_instance: string;
    api_token_instance: string;
    updated_at: string | null;
    using_default_values: boolean;
    test_phone: string;
    test_chat_id: string;
};

type WhatsAppTestResult = {
    ok: boolean;
    phone: string;
    chat_id: string;
    message: string;
    settings: WhatsAppSettingsRecord;
    delivery: {
        ok: boolean;
        chatId?: string;
        phone: string;
        attempts: number;
        source?: 'database' | 'default';
        status?: number;
        error?: string;
        response?: unknown;
    };
};

type HierarchyBriefChannel = 'WHATSAPP' | 'EMAIL';

type HierarchyBriefResult = {
    dry_run: boolean;
    cycle_id: string | null;
    sheet: RecipientSheetValue | null;
    channels: HierarchyBriefChannel[];
    filters: {
        include_heads: boolean;
        include_seniors: boolean;
        selected_head_ids: string[];
        selected_senior_ids: string[];
    };
    summary: {
        buildings: number;
        floors: number;
        heads: {
            targeted: number;
            sent: number;
            failed: number;
            skipped: number;
        };
        seniors: {
            targeted: number;
            sent: number;
            failed: number;
            skipped: number;
        };
        channels: {
            whatsapp: {
                requested: boolean;
                ready: number;
                missing: number;
                sent: number;
                failed: number;
                skipped: number;
            };
            email: {
                requested: boolean;
                ready: number;
                missing: number;
                sent: number;
                failed: number;
                skipped: number;
            };
        };
    };
    available_targets: {
        heads: Array<{
            recipient_id: string;
            recipient_name: string;
            row_order: number;
            building: string;
            phone: string | null;
            email: string | null;
            seniors_count: number;
        }>;
        seniors: Array<{
            recipient_id: string;
            recipient_name: string;
            row_order: number;
            building: string;
            floor: string;
            phone: string | null;
            email: string | null;
            members_count: number;
            head_id: string | null;
        }>;
    };
    preview: {
        heads: HierarchyBriefPreviewTarget[];
        seniors: HierarchyBriefPreviewTarget[];
        ordered: HierarchyBriefPreviewTarget[];
    };
    delivery?: Array<{
        recipient_id: string;
        recipient_name: string;
        role: 'HEAD' | 'SENIOR';
        row_order: number;
        channels: Array<{
            channel: HierarchyBriefChannel;
            status: 'SENT' | 'FAILED' | 'SKIPPED';
            reason?: string;
        }>;
    }>;
};

type HierarchyBriefPreviewTarget = {
    role: 'HEAD' | 'SENIOR';
    recipient_id: string;
    recipient_name: string;
    row_order: number;
    building: string;
    floor: string | null;
    phone: string | null;
    email: string | null;
    whatsapp_message: string;
    email_subject: string;
    public_review_url: string;
    seniors: Array<{
        recipient_id: string;
        recipient_name: string;
        row_order: number;
        floor: string;
        phone: string | null;
        email: string | null;
        invigilators_count: number;
    }>;
    members: Array<{
        recipient_id: string;
        recipient_name: string;
        row_order: number;
        role: string | null;
        room: string | null;
        phone: string | null;
        email: string | null;
    }>;
};

const EMPTY_RECIPIENTS: Recipient[] = [];
const EMPTY_RECIPIENT_FORM: RecipientExcelFormState = {
    room_est1: '',
    division: '',
    name: '',
    arabic_name: '',
    email: '',
    phone: '',
    employer: '',
    kind_of_school: '',
    title: '',
    insurance_number: '',
    institution_tax_number: '',
    national_id_number: '',
    national_id_picture: '',
    personal_photo: '',
    preferred_proctoring_city: '',
    preferred_test_center: '',
    bank_account_name: '',
    bank_name: '',
    bank_branch_name: '',
    account_number: '',
    iban_number: '',
    role: '',
    type: '',
    governorate: '',
    address: '',
    building: '',
    location: '',
    bank_divid: '',
    additional_info_1: '',
    additional_info_2: '',
    sheet: '',
};
const EMPTY_FILTERS: RecipientFilters = {
    cycleId: '',
    search: '',
    name: '',
    email: '',
    role: '',
    room_est1: '',
    type: '',
    governorate: '',
    address: '',
    building: '',
    location: '',
    status: '',
};

const EMPTY_TEMPLATE_FORM = {
    name: '',
    type: 'EMAIL' as TemplateType,
    subject: '',
    body: '',
};

const EMPTY_SENDER_ACCOUNT_FORM = {
    label: '',
    sender_name: '',
    sender_email: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: false,
    smtp_require_tls: true,
    smtp_username: '',
    smtp_password: '',
    smtp_daily_limit: '',
};

const EMPTY_WHATSAPP_SETTINGS_FORM = {
    api_url: '',
    media_url: '',
    id_instance: '',
    api_token_instance: '',
};

const ALL_CYCLES_VALUE = '__all_cycles__';
const PAGE_SIZE_OPTIONS = [20, 50, 100, 500, 1000, 1500] as const;

const STATUS_STYLES: Record<Recipient['status'], string> = {
    PENDING: 'bg-amber-50 text-amber-800 border border-amber-200',
    PROCESSING: 'bg-sky-50 text-sky-800 border border-sky-200',
    SENT: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    FAILED: 'bg-rose-50 text-rose-800 border border-rose-200',
};

const CHANNEL_STYLES: Record<TemplateType, string> = {
    BOTH: 'bg-violet-50 text-violet-800 border border-violet-200',
    EMAIL: 'bg-cyan-50 text-cyan-800 border border-cyan-200',
    WHATSAPP: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
};

type RecipientResponseState = 'pending' | 'confirmed' | 'declined';

const RESPONSE_STATUS_LABELS: Record<RecipientResponseState, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    declined: 'Apologized',
};

const CONFIRMATION_STYLES: Record<RecipientResponseState, string> = {
    pending: 'bg-slate-100 text-slate-700 border border-slate-200',
    confirmed: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    declined: 'bg-rose-50 text-rose-800 border border-rose-200',
};

const DELIVERY_STATUS_STYLES: Record<DeliveryChannelState, string> = {
    SENT: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    FAILED: 'bg-rose-50 text-rose-800 border border-rose-200',
    SKIPPED: 'bg-slate-100 text-slate-700 border border-slate-200',
};

type ParsedRecipientDelivery = {
    channels: Array<{
        channel: DeliveryChannelName;
        status: DeliveryChannelState;
        detail?: string;
    }>;
};

type WhatsAppPreviewLink = {
    label: string;
    href: string;
};

type WhatsAppPreviewModel = {
    message: string;
    links: WhatsAppPreviewLink[];
};

const EMPTY_VALUE_LABEL = 'empty';
const DELIVERY_LINE_REGEX = /^(Email|WhatsApp):\s*(SENT|FAILED|SKIPPED)(?:\s*-\s*(.+))?$/i;

const RECIPIENT_DETAIL_FIELDS: Array<{ key: keyof Recipient; fallback: string }> = [
    { key: 'room_est1', fallback: 'ROOM EST' },
    { key: 'division', fallback: 'Division' },
    { key: 'name', fallback: 'Full English name (at least 4 names)' },
    { key: 'arabic_name', fallback: 'Arabic Name' },
    { key: 'email', fallback: 'Email' },
    { key: 'phone', fallback: 'Mobile number' },
    { key: 'employer', fallback: 'Employer' },
    { key: 'kind_of_school', fallback: 'Kind of school' },
    { key: 'title', fallback: 'Title' },
    { key: 'insurance_number', fallback: 'Insurance number' },
    { key: 'institution_tax_number', fallback: 'Institution tax number' },
    { key: 'national_id_number', fallback: 'National ID number' },
    { key: 'national_id_picture', fallback: 'National ID picture' },
    { key: 'personal_photo', fallback: 'Personal photo' },
    { key: 'preferred_proctoring_city', fallback: 'Preferred proctoring city' },
    { key: 'preferred_test_center', fallback: 'Preferred test center' },
    { key: 'bank_account_name', fallback: 'Bank account name' },
    { key: 'bank_name', fallback: 'Bank name' },
    { key: 'bank_branch_name', fallback: 'Bank branch' },
    { key: 'account_number', fallback: 'Account number' },
    { key: 'iban_number', fallback: 'IBAN' },
    { key: 'role', fallback: 'Role' },
    { key: 'type', fallback: 'Type' },
    { key: 'governorate', fallback: 'Governorate' },
    { key: 'address', fallback: 'Address' },
    { key: 'building', fallback: 'Building' },
    { key: 'location', fallback: 'Location' },
    { key: 'bank_divid', fallback: 'Bank divid' },
    { key: 'additional_info_1', fallback: 'Additional info 1' },
    { key: 'additional_info_2', fallback: 'Additional info 2' },
];

const isWorkspaceTab = (value?: string | null): value is WorkspaceTab =>
    value === 'recipients' || value === 'templates' || value === 'campaign' || value === 'settings';

const getRecipientResponseState = (recipient: Pick<Recipient, 'confirmed_at' | 'declined_at'>): RecipientResponseState => {
    if (recipient.declined_at) return 'declined';
    if (recipient.confirmed_at) return 'confirmed';
    return 'pending';
};

const parseRecipientDeliveryDetails = (value?: string | null): ParsedRecipientDelivery | null => {
    const lines = String(value || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (!lines.length) {
        return null;
    }

    const channels = lines
        .map((line) => {
            const match = line.match(DELIVERY_LINE_REGEX);
            if (!match) {
                return null;
            }

            const rawChannel = match[1].toLowerCase();
            const channel: DeliveryChannelName = rawChannel === 'email' ? 'EMAIL' : 'WHATSAPP';
            const status = match[2].toUpperCase() as DeliveryChannelState;
            const detail = match[3]?.trim() || undefined;

            return {
                channel,
                status,
                detail,
            };
        })
        .filter(Boolean) as ParsedRecipientDelivery['channels'];

    if (!channels.length) {
        return null;
    }

    return { channels };
};

const getDeliveryChannelLabel = (isArabic: boolean, channel: DeliveryChannelName) =>
    channel === 'EMAIL'
        ? (isArabic ? 'إيميل' : 'Email')
        : (isArabic ? 'واتساب' : 'WhatsApp');

const getDeliveryStateLabel = (isArabic: boolean, status: DeliveryChannelState) => {
    if (status === 'SENT') return isArabic ? 'تم الإرسال' : 'Sent';
    if (status === 'FAILED') return isArabic ? 'فشل' : 'Failed';
    return isArabic ? 'تم التخطي' : 'Skipped';
};

const buildWhatsAppPreviewModel = (value: string): WhatsAppPreviewModel => {
    const links: WhatsAppPreviewLink[] = [];
    const messageLines: string[] = [];

    for (const rawLine of String(value || '').split('\n')) {
        const line = rawLine.trim();
        if (!line) {
            if (messageLines[messageLines.length - 1] !== '') {
                messageLines.push('');
            }
            continue;
        }

        const linkMatch = line.match(/^(?:\d+\.\s*)?(.+?):\s*(https?:\/\/\S+)$/i);
        if (linkMatch) {
            links.push({
                label: linkMatch[1].trim(),
                href: linkMatch[2].trim(),
            });
            continue;
        }

        messageLines.push(line);
    }

    return {
        message: messageLines.join('\n').trim(),
        links,
    };
};

const summarizeText = (value: string, maxLength = 240) => {
    const compact = String(value || '').replace(/\s+/g, ' ').trim();
    if (compact.length <= maxLength) {
        return compact;
    }

    return `${compact.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const normalizeRecipientPhoneLookup = (value?: string | null) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) {
        return '';
    }

    if (digits.length === 10 && digits.startsWith('1')) {
        return `0${digits}`;
    }

    if (digits.length === 12 && digits.startsWith('20')) {
        return `0${digits.slice(2)}`;
    }

    if (digits.length === 13 && digits.startsWith('0020')) {
        return `0${digits.slice(4)}`;
    }

    if (digits.length >= 11) {
        return digits.slice(-11);
    }

    return digits;
};

const trimRecipientFormValues = (form: RecipientExcelFormState): RecipientExcelFormState => ({
    room_est1: form.room_est1.trim(),
    division: form.division.trim(),
    name: form.name.trim(),
    arabic_name: form.arabic_name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    employer: form.employer.trim(),
    kind_of_school: form.kind_of_school.trim(),
    title: form.title.trim(),
    insurance_number: form.insurance_number.trim(),
    institution_tax_number: form.institution_tax_number.trim(),
    national_id_number: form.national_id_number.trim(),
    national_id_picture: form.national_id_picture.trim(),
    personal_photo: form.personal_photo.trim(),
    preferred_proctoring_city: form.preferred_proctoring_city.trim(),
    preferred_test_center: form.preferred_test_center.trim(),
    bank_account_name: form.bank_account_name.trim(),
    bank_name: form.bank_name.trim(),
    bank_branch_name: form.bank_branch_name.trim(),
    account_number: form.account_number.trim(),
    iban_number: form.iban_number.trim(),
    role: form.role.trim(),
    type: form.type.trim(),
    governorate: form.governorate.trim(),
    address: form.address.trim(),
    building: form.building.trim(),
    location: form.location.trim(),
    bank_divid: form.bank_divid.trim(),
    additional_info_1: form.additional_info_1.trim(),
    additional_info_2: form.additional_info_2.trim(),
    sheet: form.sheet.trim() as RecipientExcelFormState['sheet'],
});

export default function MessagingWorkspaceClient({ locale }: { locale: string }) {
    const isArabic = locale === 'ar';
    const t = useTranslations('messaging');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { user, ready, isChecking, error } = useRequireAuth(locale);
    const canManageSettings = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN';
    const canManageResponses = canManageSettings;

    const copy = useMemo(() => ({
        tabs: {
            recipients: isArabic ? 'المستلمين والرفع' : 'Recipients',
            templates: isArabic ? 'القوالب' : 'Templates',
            campaign: isArabic ? 'الإرسال والسجل' : 'Campaign',
        },
        heroTitle: isArabic ? 'مركز إدارة الرسائل' : 'Messaging Control Center',
        heroSubtitle: isArabic
            ? 'ارفع المستلمين، فلترهم، اختر فرد أو مجموعة، ثم أرسل الإيميل أو الواتساب من مكان واحد.'
            : 'Upload recipients, filter them, target one or many, then send email or WhatsApp from one workspace.',
        refresh: isArabic ? 'تحديث' : 'Refresh',
        uploadCardTitle: isArabic ? 'رفع ملف Excel' : 'Upload Excel file',
        uploadCardHint: isArabic
            ? 'بعد الرفع ستظهر البيانات فورًا في الجدول، وسيتم استبدال كل الإيميلات تلقائيًا بإيميلات التيست المحددة.'
            : 'After import, recipients will appear immediately in the table below and every email will be replaced automatically with the test addresses.',
        uploadTemplate: isArabic ? 'تحميل قالب فارغ' : 'Download template',
        uploadSample: isArabic ? 'تحميل مثال جاهز' : 'Download sample',
        selectFile: isArabic ? 'اختر ملف Excel' : 'Choose Excel file',
        importedCount: isArabic ? 'تم استيراد' : 'Imported',
        recipientsSectionTitle: isArabic ? 'جدول المستلمين' : 'Recipients table',
        recipientsSectionHint: isArabic
            ? 'فلتر بأي هيدر موجود في ملف الإكسيل، ثم حدّد الصفوف التي تريد استخدامها في الإرسال.'
            : 'Filter by any header from the Excel sheet, then select the rows you want to use in a campaign.',
        searchPlaceholder: isArabic ? 'ابحث بالاسم أو الإيميل أو الغرفة أو المبنى أو المحافظة' : 'Search by name, email, room, building or governorate',
        role: isArabic ? 'الدور' : 'Role',
        examType: isArabic ? 'نوع الامتحان' : 'Exam type',
        day: isArabic ? 'اليوم' : 'Day',
        date: isArabic ? 'التاريخ' : 'Date',
        testCenter: isArabic ? 'مركز الاختبار' : 'Test center',
        faculty: isArabic ? 'الكلية' : 'Faculty',
        room: isArabic ? 'الغرفة' : 'Room',
        roomEst1: isArabic ? 'الغرفة' : 'Room',
        typeLabel: isArabic ? 'النوع' : 'Type',
        governorate: isArabic ? 'المحافظة' : 'Governorate',
        address: isArabic ? 'العنوان' : 'Address',
        building: isArabic ? 'المبنى' : 'Building',
        location: isArabic ? 'الموقع' : 'Location',
        mapLink: isArabic ? 'رابط الخريطة' : 'Map link',
        arrivalTime: isArabic ? 'وقت الوصول' : 'Arrival time',
        sheet: isArabic ? 'الشيت' : 'Sheet',
        emailLabel: isArabic ? 'الإيميل' : 'Email',
        status: isArabic ? 'الحالة' : 'Status',
        clearFilters: isArabic ? 'مسح الفلاتر' : 'Clear filters',
        recordsPerPage: isArabic ? 'عدد الصفوف في الصفحة' : 'Records per page',
        sheetTabsTitle: isArabic ? 'الشيتات' : 'Sheets',
        noSheets: isArabic ? 'لا توجد شيتات متاحة' : 'No sheets available',
        legacySheet: isArabic ? 'بيانات قديمة' : 'Legacy',
        visibleCount: isArabic ? 'إجمالي النتائج' : 'Matching recipients',
        selectedCount: isArabic ? 'المحدد' : 'Selected',
        pendingCount: isArabic ? 'معلق' : 'Pending',
        sentCount: isArabic ? 'مرسل' : 'Sent',
        respondedCount: isArabic ? 'تم الرد' : 'Responded',
        confirmedCount: isArabic ? 'تم التأكيد' : 'Confirm',
        apologizedCount: isArabic ? 'المعتذرون' : 'Apologies',
        failedCount: isArabic ? 'فشل' : 'Failed',
        selectAll: isArabic ? 'تحديد الكل في الصفحة' : 'Select page',
        deselectAll: isArabic ? 'إلغاء تحديد الكل' : 'Deselect all',
        clearSelection: isArabic ? 'إلغاء التحديد' : 'Clear selection',
        goToSend: isArabic ? 'الانتقال إلى الإرسال' : 'Go to send',
        name: isArabic ? 'الاسم' : 'Name',
        contact: isArabic ? 'التواصل' : 'Contact',
        details: isArabic ? 'التفاصيل' : 'Details',
        detailsSeeMore: isArabic ? 'عرض باقي البيانات' : 'See more',
        detailsHideMore: isArabic ? 'إخفاء البيانات' : 'Hide details',
        attempts: isArabic ? 'المحاولات' : 'Attempts',
        lastAttempt: isArabic ? 'آخر محاولة' : 'Last attempt',
        errorLabel: isArabic ? 'الخطأ' : 'Error',
        deliveryDetailsLabel: isArabic ? 'تفاصيل الإرسال' : 'Delivery details',
        emptyRecipients: isArabic ? 'لا يوجد مستلمين حتى الآن. ارفع ملف Excel للبدء.' : 'No recipients yet. Upload an Excel file to get started.',
        loading: isArabic ? 'جاري التحميل...' : 'Loading...',
        previous: isArabic ? 'السابق' : 'Previous',
        next: isArabic ? 'التالي' : 'Next',
        page: isArabic ? 'صفحة' : 'Page',
        showing: isArabic ? 'عرض' : 'Showing',
        of: isArabic ? 'من' : 'of',
        templatesTitle: isArabic ? 'القوالب الجاهزة' : 'Saved templates',
        templatesHint: isArabic
            ? 'أنشئ قوالب منفصلة للإيميل أو الواتساب أو الاثنين معًا، ثم استخدمها في الإرسال.'
            : 'Create reusable templates for email, WhatsApp or both, then use them in campaigns.',
        templateSearchPlaceholder: isArabic ? 'ابحث في القوالب المحفوظة' : 'Search saved templates',
        templateName: isArabic ? 'اسم القالب' : 'Template name',
        templateType: isArabic ? 'قناة الإرسال' : 'Delivery channel',
        templateSubject: isArabic ? 'عنوان الإيميل' : 'Email subject',
        templateBody: isArabic ? 'نص الرسالة' : 'Message body',
        createTemplate: isArabic ? 'إنشاء قالب' : 'Create template',
        updateTemplate: isArabic ? 'تحديث القالب' : 'Update template',
        cancelEdit: isArabic ? 'إلغاء التعديل' : 'Cancel edit',
        useForCampaign: isArabic ? 'استخدمه في الإرسال' : 'Use in campaign',
        noTemplates: isArabic ? 'لا توجد قوالب محفوظة بعد.' : 'No templates saved yet.',
        noTemplateMatches: isArabic ? 'لا توجد قوالب تطابق هذا البحث.' : 'No templates match this search yet.',
        campaignTitle: isArabic ? 'إعداد الإرسال' : 'Campaign setup',
        campaignHint: isArabic
            ? 'اختر قالبًا ثم حدّد هل تريد الإرسال للمحددين أو النتائج المفلترة أو كل المعلقين أو إعادة فاشلين.'
            : 'Pick a template, then send to selected rows, filtered rows, all pending recipients, or retry failed ones.',
        selectedTemplate: isArabic ? 'القالب المختار' : 'Selected template',
        noTemplateSelected: isArabic ? 'اختر قالبًا أولًا أو أنشئ واحدًا من تبويب القوالب.' : 'Select a template first or create one in the templates tab.',
        sendScopeTitle: isArabic ? 'نطاق الإرسال' : 'Send scope',
        sendNow: isArabic ? 'ابدأ الإرسال' : 'Send now',
        sending: isArabic ? 'جاري الإرسال...' : 'Sending...',
        recentLogs: isArabic ? 'آخر السجلات' : 'Recent logs',
        logsHint: isArabic ? 'راجع حالة آخر محاولات الإرسال بسرعة.' : 'Review the latest delivery attempts quickly.',
        showLogs: isArabic ? 'إظهار السجلات' : 'Show logs',
        hideLogs: isArabic ? 'إخفاء السجلات' : 'Hide logs',
        openTemplates: isArabic ? 'افتح القوالب' : 'Open templates',
        needTemplate: isArabic ? 'اختر قالبًا قبل الإرسال.' : 'Choose a template before sending.',
        needSelection: isArabic ? 'حدد مستلمًا واحدًا على الأقل للإرسال المحدد.' : 'Select at least one recipient for targeted sending.',
        selectedRowsSummary: isArabic ? 'محدد' : 'selected',
        uploadSuccess: isArabic ? 'تم استيراد المستلمين بنجاح.' : 'Recipients imported successfully.',
        uploadError: isArabic ? 'تعذر استيراد ملف Excel.' : 'Unable to import the Excel file.',
        templateSaved: isArabic ? 'تم حفظ القالب.' : 'Template saved.',
        templateDeleted: isArabic ? 'تم حذف القالب.' : 'Template deleted.',
        sendSuccess: isArabic ? 'تم تنفيذ الإرسال بنجاح.' : 'Campaign processed successfully.',
        sendError: isArabic ? 'تعذر تنفيذ الإرسال.' : 'Unable to process the campaign.',
        delete: isArabic ? 'حذف' : 'Delete',
        edit: isArabic ? 'تعديل' : 'Edit',
        preview: isArabic ? 'معاينة' : 'Preview',
        retryFailed: isArabic ? 'إعادة الفاشلين' : 'Retry failed',
        filtersFallback: isArabic ? 'سيتم استخدام الفلاتر الحالية، وإذا لم تحدد حالة فسيتم استهداف المعلقين فقط.' : 'Current filters will be used. If no status is selected, pending recipients will be targeted by default.',
        noLogs: isArabic ? 'لا توجد سجلات حتى الآن.' : 'No logs yet.',
        actions: isArabic ? 'الإجراءات' : 'Actions',
        addRecipient: isArabic ? 'إضافة صف' : 'Add row',
        createRecipientTitle: isArabic ? 'إضافة صف جديد' : 'Add a new row',
        editRecipientTitle: isArabic ? 'تعديل الصف المحدد' : 'Edit selected row',
        recipientFormHint: isArabic
            ? 'تقدر تضيف صف مانيوال أو تعدل بيانات أي مستلم مباشرة من هنا.'
            : 'Add a manual row or update any recipient directly from here.',
        saveRecipient: isArabic ? 'حفظ الصف' : 'Save row',
        recipientCreated: isArabic ? 'تم إضافة الصف بنجاح.' : 'Row added successfully.',
        recipientUpdated: isArabic ? 'تم تحديث الصف بنجاح.' : 'Row updated successfully.',
        recipientDeleted: isArabic ? 'تم حذف الصف بنجاح.' : 'Row deleted successfully.',
        recipientSaveError: isArabic ? 'تعذر حفظ الصف.' : 'Unable to save the row.',
        recipientRoomRequired: isArabic ? 'يرجى إدخال ROOM.' : 'ROOM is required.',
        recipientEmailRequired: isArabic ? 'يرجى إدخال Email.' : 'Email is required.',
        recipientEmailInvalid: isArabic ? 'يرجى إدخال Email بصيغة صحيحة.' : 'Email must be valid.',
        recipientSheetRequired: isArabic ? 'يرجى اختيار Sheet.' : 'Sheet is required.',
        recipientDeleteError: isArabic ? 'تعذر حذف الصف.' : 'Unable to delete the row.',
        exportExcel: isArabic ? 'تصدير Excel' : 'Export Excel',
        exportSuccess: isArabic ? 'تم تصدير ملف Excel بنجاح.' : 'Excel exported successfully.',
        exportError: isArabic ? 'تعذر تصدير ملف Excel.' : 'Unable to export Excel.',
        cycleDelete: isArabic ? 'حذف الدورة' : 'Delete cycle',
        cycleDeleted: isArabic ? 'تم حذف الدورة بنجاح.' : 'Cycle deleted successfully.',
        cycleDeleteError: isArabic ? 'تعذر حذف الدورة.' : 'Unable to delete cycle.',
        cycleDeleteConfirm: isArabic ? 'سيتم حذف الدورة وكل المستلمين داخلها. هل تريد المتابعة؟' : 'This will delete the cycle and all its recipients. Continue?',
        recipientNameRequired: isArabic ? 'يرجى إدخال اسم المستلم.' : 'Please enter the recipient name.',
        recipientDeleteConfirm: isArabic ? 'هل أنت متأكد من حذف هذا الصف؟' : 'Are you sure you want to delete this row?',
        statusLabels: {
            PENDING: isArabic ? 'معلق' : 'Pending',
            PROCESSING: isArabic ? 'قيد التنفيذ' : 'Processing',
            SENT: isArabic ? 'تم الإرسال' : 'Sent',
            FAILED: isArabic ? 'فشل' : 'Failed',
        },
        confirmedLabels: {
            confirmed: isArabic ? 'تم التأكيد' : 'Confirmed',
            declined: isArabic ? 'اعتذر' : 'Apologized',
            pending: isArabic ? 'بانتظار الرد' : 'Pending response',
            unconfirmed: isArabic ? 'بانتظار الرد' : 'Pending response',
        },
        confirmed: isArabic ? 'تأكيد' : 'Confirmed',
        unconfirmed: isArabic ? 'بانتظار الرد' : 'Pending response',
        confirmTitle: isArabic ? 'حالة الرد' : 'Response',
        templateTypeLabels: {
            BOTH: isArabic ? 'إيميل + واتساب' : 'Email + WhatsApp',
            EMAIL: isArabic ? 'إيميل فقط' : 'Email only',
            WHATSAPP: isArabic ? 'واتساب فقط' : 'WhatsApp only',
        },
        sendScopes: {
            selected: {
                title: isArabic ? 'المحددون' : 'Selected rows',
                description: isArabic ? 'أرسل للمستلمين الذين اخترتهم من الجدول فقط.' : 'Send only to recipients checked in the table.',
            },
            filtered: {
                title: isArabic ? 'النتائج المفلترة' : 'Filtered recipients',
                description: isArabic ? 'أرسل لكل من يطابق الفلاتر الحالية.' : 'Send to everyone matching the active filters.',
            },
            all_pending: {
                title: isArabic ? 'كل المعلقين' : 'All pending',
                description: isArabic ? 'أرسل لجميع المستلمين بحالة Pending.' : 'Send to every recipient currently marked pending.',
            },
            failed: {
                title: isArabic ? 'إعادة الفاشلين' : 'Retry failed',
                description: isArabic ? 'أعد المحاولة لكل من فشل سابقًا.' : 'Retry all recipients that failed before.',
            },
        },
        settingsTabs: {
            email: isArabic ? 'إعدادات الإيميل' : 'Email settings',
            whatsapp: isArabic ? 'إعدادات واتساب' : 'WhatsApp settings',
        },
        readyCredentials: isArabic ? 'مسجل دخولك كأدمن، وتقدر تدير الرفع والقوالب والإرسال من هنا.' : 'You are signed in as admin and can manage upload, templates and delivery here.',
    }), [isArabic]);

    const recipientSheetActionCopy = useMemo(() => ({
        moveToSpare: isArabic ? 'انقل إلى Spare' : 'Move to Spare',
        moveToSheet: isArabic ? 'انقل إلى...' : 'Move to...',
        moveReady: isArabic ? 'نقل' : 'Move',
        targetSheet: isArabic ? 'الشيت الهدف' : 'Target sheet',
        targetBuilding: isArabic ? 'المبنى' : 'Building',
        targetFloor: isArabic ? 'الدور' : 'Floor',
        targetRoom: isArabic ? 'الرووم' : 'Room',
        reassignSpareTitle: isArabic ? 'توزيع مراقب من Spare' : 'Assign spare recipient',
        reassignSpareHint: isArabic ? 'اختر EST1 أو EST2 ثم حدّد المبنى والدور والرووم من نفس الشيت قبل النقل.' : 'Choose EST1 or EST2, then pick the building, floor, and room from that sheet before moving.',
        noAssignmentSlots: isArabic ? 'لا توجد أماكن متاحة في هذا الشيت حالياً.' : 'No assignment slots are available in this sheet right now.',
        confirmMove: isArabic ? 'تأكيد النقل' : 'Confirm move',
        moveToSpareSuccess: isArabic ? 'تم نقل الصف إلى Spare بنجاح.' : 'Row moved to Spare successfully.',
        moveToSheetSuccess: isArabic ? 'تم تعيين المراقب في المكان المحدد بنجاح.' : 'Recipient assigned to the selected slot successfully.',
        moveError: isArabic ? 'تعذر تنفيذ النقل.' : 'Unable to complete the move.',
        blacklistConflict: isArabic ? 'تعارض في Blacklist' : 'Blacklist conflict',
        blacklistConflictFoundIn: isArabic ? 'موجود أيضاً في' : 'Also found in',
        blacklistConflictMatchedBy: isArabic ? 'التطابق بواسطة' : 'Matched by',
        blacklistConflictClear: isArabic ? 'سليم' : 'Clear',
        blacklistConflictHint: isArabic ? 'الصفوف المتعارضة متعلّمة بالأحمر حتى تراجعها وتحذف غير المطلوب.' : 'Conflicting blacklist rows are marked in red so you can review and delete the duplicates.',
        blacklistConflictDeleteHint: isArabic ? 'احذف الصف إذا كان يجب أن يبقى خارج الشيتات التشغيلية.' : 'Delete this row if the recipient should stay out of the operational sheets.',
    }), [isArabic]);

    const recipientSheetActionUxCopy = useMemo(() => ({
        ...recipientSheetActionCopy,
        swapWithSpare: isArabic ? 'بدّل مع Spare' : 'Swap with Spare',
        currentSlot: isArabic ? 'المكان الحالي' : 'Current slot',
        sparePhone: isArabic ? 'رقم مراقب Spare' : 'Spare phone number',
        sparePhonePlaceholder: isArabic ? 'اكتب رقم مراقب Spare' : 'Enter the spare recipient phone',
        swapSpareTitle: isArabic ? 'تبديل مع مراقب من Spare' : 'Swap with a Spare recipient',
        swapSpareHint: isArabic ? 'أدخل رقم مراقب من Spare، وسيأخذ نفس الدور والرووم الحالية للمعتذر بنفس ترتيب الشيت.' : 'Enter a Spare phone number and that recipient will take over the same floor and room while the current row moves to Spare in the correct sheet order.',
        spareMatchPreview: isArabic ? 'سيتم التبديل مع' : 'Matched Spare',
        spareNoMatch: isArabic ? 'لم نجد مراقباً في Spare بهذا الرقم في نفس الدورة.' : 'No Spare recipient matches this phone number in the same cycle.',
        confirmSwap: isArabic ? 'تأكيد التبديل' : 'Confirm swap',
        swapSuccess: isArabic ? 'تم التبديل مع Spare بنجاح.' : 'Spare swap completed successfully.',
    }), [isArabic, recipientSheetActionCopy]);

    const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => (
        isWorkspaceTab(searchParams.get('tab')) ? (searchParams.get('tab') as WorkspaceTab) : 'recipients'
    ));
    const [selectedCycleId, setSelectedCycleId] = useState('');
    const [cycleSelectionReady, setCycleSelectionReady] = useState(false);
    const [selectedSheet, setSelectedSheet] = useState<RecipientSheetValue | ''>('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(1500);
    const [filters, setFilters] = useState<RecipientFilters>(EMPTY_FILTERS);
    const [desktopFiltersCollapsed, setDesktopFiltersCollapsed] = useState(false);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
    const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE_FORM);
    const [templateSearch, setTemplateSearch] = useState('');
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [isTemplateComposerOpen, setIsTemplateComposerOpen] = useState(false);
    const [activeTemplateField, setActiveTemplateField] = useState<TemplateEditorField>('body');
    const [guidedTemplateForm, setGuidedTemplateForm] = useState<EstGuidedTemplateConfig | null>(null);
    const [isAdvancedTemplateEditorOpen, setIsAdvancedTemplateEditorOpen] = useState(false);
    const [campaignTemplateId, setCampaignTemplateId] = useState('');
    const [campaignViewTab, setCampaignViewTab] = useState<CampaignViewTab>('send');
    const [settingsViewTab, setSettingsViewTab] = useState<SettingsViewTab>('email');
    const [campaignPreviewModal, setCampaignPreviewModal] = useState<CampaignPreviewModal>(null);
    const [sendScope, setSendScope] = useState<SendScope>('selected');
    const [logsExpanded, setLogsExpanded] = useState(false);
    const [emailSettingsForm, setEmailSettingsForm] = useState({
        sender_name: '',
        sender_email: '',
        active_sender_account_id: '',
    });
    const [whatsAppSettingsForm, setWhatsAppSettingsForm] = useState(EMPTY_WHATSAPP_SETTINGS_FORM);
    const [whatsAppTestResult, setWhatsAppTestResult] = useState<WhatsAppTestResult | null>(null);
    const [hierarchyPreviewResult, setHierarchyPreviewResult] = useState<HierarchyBriefResult | null>(null);
    const [hierarchySendResult, setHierarchySendResult] = useState<HierarchyBriefResult | null>(null);
    const [hierarchyIncludeHeads, setHierarchyIncludeHeads] = useState(true);
    const [hierarchyIncludeSeniors, setHierarchyIncludeSeniors] = useState(true);
    const [hierarchyChannels, setHierarchyChannels] = useState<HierarchyBriefChannel[]>(['WHATSAPP', 'EMAIL']);
    const [hierarchySelectedHeadIds, setHierarchySelectedHeadIds] = useState<string[]>([]);
    const [hierarchySelectedSeniorIds, setHierarchySelectedSeniorIds] = useState<string[]>([]);
    const [isHierarchyConfirmOpen, setIsHierarchyConfirmOpen] = useState(false);
    const [senderAccountForm, setSenderAccountForm] = useState(EMPTY_SENDER_ACCOUNT_FORM);
    const [editingSenderAccountId, setEditingSenderAccountId] = useState<string | null>(null);
    const [recipientForm, setRecipientForm] = useState<RecipientExcelFormState>(EMPTY_RECIPIENT_FORM);
    const [recipientFormErrors, setRecipientFormErrors] = useState<RecipientFormErrors>({});
    const [editingRecipientId, setEditingRecipientId] = useState<string | null>(null);
    const [editingRecipientCycleId, setEditingRecipientCycleId] = useState<string | null>(null);
    const [isRecipientFormOpen, setIsRecipientFormOpen] = useState(false);
    const [expandedRecipientDetailsId, setExpandedRecipientDetailsId] = useState<string | null>(null);
    const [deleteConfirmState, setDeleteConfirmState] = useState<{ type: 'recipient'; recipientId: string } | { type: 'cycle'; cycleId: string } | null>(null);
    const [movingRecipientId, setMovingRecipientId] = useState<string | null>(null);
    const [spareAssignmentRecipient, setSpareAssignmentRecipient] = useState<Recipient | null>(null);
    const [spareAssignmentTargetSheet, setSpareAssignmentTargetSheet] = useState<ReassignTargetSheet>('EST1');
    const [spareAssignmentBuilding, setSpareAssignmentBuilding] = useState('');
    const [spareAssignmentFloor, setSpareAssignmentFloor] = useState('');
    const [spareAssignmentRoomKey, setSpareAssignmentRoomKey] = useState('');
    const [spareSwapRecipient, setSpareSwapRecipient] = useState<Recipient | null>(null);
    const [spareSwapPhone, setSpareSwapPhone] = useState('');
    const subjectInputRef = useRef<HTMLInputElement>(null);
    const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const nextTab = searchParams.get('tab');
        if (isWorkspaceTab(nextTab) && nextTab !== activeTab) {
            setActiveTab(nextTab);
        }
    }, [activeTab, searchParams]);

    useEffect(() => {
        setMobileFiltersOpen(false);
    }, [activeTab]);

    const updateTab = (nextTab: WorkspaceTab) => {
        setActiveTab(nextTab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', nextTab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const cyclesQuery = useQuery<CycleSummary[]>({
        queryKey: ['messaging-cycles'],
        queryFn: async () => {
            const response = await api.get('/messaging/cycles');
            return response.data;
        },
        enabled: ready,
    });

    useEffect(() => {
        if (cycleSelectionReady) {
            return;
        }

        if (!cyclesQuery.isFetched) {
            return;
        }

        const nextCycleId = cyclesQuery.data?.[0]?.id || ALL_CYCLES_VALUE;
        setSelectedCycleId(nextCycleId);
        setCycleSelectionReady(true);
    }, [cycleSelectionReady, cyclesQuery.data, cyclesQuery.isFetched]);

    useEffect(() => {
        if (!cycleSelectionReady) {
            return;
        }

        setFilters((current) => ({
            ...current,
            cycleId: selectedCycleId === ALL_CYCLES_VALUE ? '' : selectedCycleId,
        }));
    }, [cycleSelectionReady, selectedCycleId]);

    const fetchAllRecipients = useCallback(async (params: Record<string, string | number | undefined>) => {
        const firstResponse = await api.get('/messaging/recipients', {
            params: {
                ...params,
                page: 1,
                limit: 1000,
            },
        });
        const firstPage = firstResponse.data as { items: Recipient[]; total: number };
        let items = [...(firstPage.items ?? [])];
        const total = firstPage.total ?? items.length;
        const pages = Math.ceil(total / 1000);

        for (let currentPage = 2; currentPage <= pages; currentPage += 1) {
            const response = await api.get('/messaging/recipients', {
                params: {
                    ...params,
                    page: currentPage,
                    limit: 1000,
                },
            });
            items = items.concat(response.data?.items ?? []);
        }

        return items;
    }, []);

    const sheetReferenceQueryEnabled = ready && activeTab === 'recipients' && (
        selectedSheet === 'BLACKLIST'
        || selectedSheet === 'SPARE'
        || Boolean(spareAssignmentRecipient)
        || Boolean(spareSwapRecipient)
    );

    const est1ReferenceQuery = useQuery<Recipient[]>({
        queryKey: ['messaging-recipient-reference', selectedCycleId, 'EST1'],
        queryFn: () => fetchAllRecipients({
            cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
            sheet: 'EST1',
        }),
        enabled: sheetReferenceQueryEnabled,
        staleTime: 30_000,
    });

    const est2ReferenceQuery = useQuery<Recipient[]>({
        queryKey: ['messaging-recipient-reference', selectedCycleId, 'EST2'],
        queryFn: () => fetchAllRecipients({
            cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
            sheet: 'EST2',
        }),
        enabled: sheetReferenceQueryEnabled,
        staleTime: 30_000,
    });

    const spareReferenceQuery = useQuery<Recipient[]>({
        queryKey: ['messaging-recipient-reference', selectedCycleId, 'SPARE'],
        queryFn: () => fetchAllRecipients({
            cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
            sheet: 'SPARE',
        }),
        enabled: ready && activeTab === 'recipients' && (
            selectedSheet === 'BLACKLIST'
            || Boolean(spareSwapRecipient)
        ),
        staleTime: 30_000,
    });

    const recipientsQuery = useQuery<{ items: Recipient[]; total: number; page: number; limit: number }>({
        queryKey: ['messaging-recipients', filters, selectedCycleId, selectedSheet, page, pageSize],
        queryFn: async () => {
            const response = await api.get('/messaging/recipients', {
                params: {
                    ...filters,
                    cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
                    sheet: selectedSheet || undefined,
                    status: filters.status || undefined,
                    page,
                    limit: pageSize,
                },
            });
            return response.data;
        },
        enabled: ready && cycleSelectionReady,
        placeholderData: keepPreviousData,
    });

    const recipientFilterOptionsQuery = useQuery<RecipientFilterOptions>({
        queryKey: ['messaging-recipient-filter-options', selectedCycleId],
        queryFn: async () => {
            const response = await api.get('/messaging/filters/options', {
                params: {
                    cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
                },
            });
            return response.data;
        },
        enabled: ready && cycleSelectionReady,
    });

    useEffect(() => {
        const availableSheets = recipientFilterOptionsQuery.data?.sheets?.map((sheet) => sheet.value) ?? [];
        if (!availableSheets.length) {
            setSelectedSheet('');
            return;
        }

        if (selectedSheet && availableSheets.includes(selectedSheet)) {
            return;
        }

        const preferred = (['EST1', 'EST2', 'SPARE', 'BLACKLIST', 'LEGACY'] as const).find((sheet) => availableSheets.includes(sheet));
        setSelectedSheet(preferred ?? availableSheets[0]);
        setPage(1);
    }, [recipientFilterOptionsQuery.data?.sheets, selectedSheet]);

    useEffect(() => {
        setHierarchyPreviewResult(null);
        setHierarchySendResult(null);
        setHierarchySelectedHeadIds([]);
        setHierarchySelectedSeniorIds([]);
        setIsHierarchyConfirmOpen(false);
    }, [selectedCycleId, selectedSheet]);

    useEffect(() => {
        if (!hierarchyIncludeHeads) {
            setHierarchySelectedHeadIds([]);
        }
    }, [hierarchyIncludeHeads]);

    useEffect(() => {
        if (!hierarchyIncludeSeniors) {
            setHierarchySelectedSeniorIds([]);
        }
    }, [hierarchyIncludeSeniors]);

    useEffect(() => {
        setHierarchyPreviewResult(null);
        setHierarchySendResult(null);
    }, [
        hierarchyIncludeHeads,
        hierarchyIncludeSeniors,
        hierarchyChannels,
        hierarchySelectedHeadIds,
        hierarchySelectedSeniorIds,
    ]);

    const templatesQuery = useQuery<Template[]>({
        queryKey: ['messaging-templates'],
        queryFn: async () => {
            const response = await api.get('/messaging/templates');
            return response.data;
        },
        enabled: ready,
    });

    const logsQuery = useQuery<{ items: LogRow[] }>({
        queryKey: ['messaging-logs', selectedCycleId],
        queryFn: async () => {
            const response = await api.get('/messaging/logs', {
                params: {
                    limit: 12,
                    cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
                },
            });
            return response.data;
        },
        enabled: ready && cycleSelectionReady,
    });

    const emailSettingsQuery = useQuery<EmailSettingsRecord>({
        queryKey: ['email-settings'],
        queryFn: async () => {
            const response = await api.get('/settings/email');
            return response.data;
        },
        enabled: ready && canManageSettings,
    });

    const whatsAppSettingsQuery = useQuery<WhatsAppSettingsRecord>({
        queryKey: ['whatsapp-settings'],
        queryFn: async () => {
            const response = await api.get('/settings/whatsapp');
            return response.data;
        },
        enabled: ready && canManageSettings,
    });

    useEffect(() => {
        if (!campaignTemplateId && templatesQuery.data?.length) {
            setCampaignTemplateId(templatesQuery.data[0].id);
        }
    }, [campaignTemplateId, templatesQuery.data]);

    useEffect(() => {
        if (emailSettingsQuery.data) {
            setEmailSettingsForm({
                sender_name: emailSettingsQuery.data.sender_name,
                sender_email: emailSettingsQuery.data.sender_email,
                active_sender_account_id: emailSettingsQuery.data.active_sender_account_id || '',
            });
        }
    }, [emailSettingsQuery.data]);

    useEffect(() => {
        if (whatsAppSettingsQuery.data) {
            setWhatsAppSettingsForm({
                api_url: whatsAppSettingsQuery.data.api_url,
                media_url: whatsAppSettingsQuery.data.media_url,
                id_instance: whatsAppSettingsQuery.data.id_instance,
                api_token_instance: whatsAppSettingsQuery.data.api_token_instance,
            });
        }
    }, [whatsAppSettingsQuery.data]);

    useEffect(() => {
        if (!guidedTemplateForm) {
            return;
        }

        const generated = buildGuidedTemplateContent(guidedTemplateForm);
        setTemplateForm((current) => ({
            ...current,
            subject: generated.subject,
            body: generated.body,
        }));
    }, [guidedTemplateForm]);

    useEffect(() => {
        if (!isRecipientFormOpen && !isTemplateComposerOpen && !spareAssignmentRecipient && !spareSwapRecipient) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isRecipientFormOpen, isTemplateComposerOpen, spareAssignmentRecipient, spareSwapRecipient]);

    const refreshAll = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['messaging-cycles'] }),
            queryClient.invalidateQueries({ queryKey: ['messaging-recipients'] }),
            queryClient.invalidateQueries({ queryKey: ['messaging-recipient-filter-options'] }),
            queryClient.invalidateQueries({ queryKey: ['messaging-templates'] }),
            queryClient.invalidateQueries({ queryKey: ['messaging-logs'] }),
            queryClient.invalidateQueries({ queryKey: ['email-settings'] }),
            queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] }),
        ]);
    };

    const saveRecipientMutation = useMutation({
        mutationFn: async ({ recipientId, values }: { recipientId: string | null; values: RecipientExcelFormState }) => {
            await fetchCsrfToken();
            const payload = {
                ...values,
                room: values.room_est1,
                cycleId: recipientId
                    ? editingRecipientCycleId || undefined
                    : (selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId),
            };
            if (recipientId) {
                const response = await api.put(`/messaging/recipients/${recipientId}`, payload);
                return response.data;
            }

            const response = await api.post('/messaging/recipients', payload);
            return response.data;
        },
        onSuccess(_data, variables) {
            toast.success(variables.recipientId ? copy.recipientUpdated : copy.recipientCreated);
            setRecipientForm(EMPTY_RECIPIENT_FORM);
            setRecipientFormErrors({});
            setEditingRecipientId(null);
            setEditingRecipientCycleId(null);
            setIsRecipientFormOpen(false);
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipients'] });
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipient-filter-options'] });
        },
        onError(error: any) {
            toast.error(getImportErrorMessage(error, copy.recipientSaveError));
        },
    });

    const deleteRecipientMutation = useMutation({
        mutationFn: async (recipientId: string) => {
            await fetchCsrfToken();
            const response = await api.delete(`/messaging/recipients/${recipientId}`);
            return response.data;
        },
        onSuccess(_data, recipientId) {
            toast.success(copy.recipientDeleted);
            setSelectedRecipientIds((current) => current.filter((id) => id !== recipientId));
            if (editingRecipientId === recipientId) {
                setRecipientForm(EMPTY_RECIPIENT_FORM);
                setRecipientFormErrors({});
                setEditingRecipientId(null);
                setEditingRecipientCycleId(null);
                setIsRecipientFormOpen(false);
            }
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipients'] });
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipient-filter-options'] });
        },
        onError(error: any) {
            toast.error(getImportErrorMessage(error, copy.recipientDeleteError));
        },
    });

    const updateRecipientResponseMutation = useMutation({
        mutationFn: async ({ recipientId, status }: { recipientId: string; status: RecipientResponseValue }) => {
            await fetchCsrfToken();
            const response = await api.put(`/messaging/recipients/${recipientId}/response`, { status });
            return response.data;
        },
        onSuccess(_data, variables) {
            const responseLabel = variables.status === 'CONFIRMED'
                ? copy.confirmedLabels.confirmed
                : variables.status === 'DECLINED'
                    ? copy.confirmedLabels.declined
                    : copy.confirmedLabels.pending;
            toast.success(`${copy.confirmTitle}: ${responseLabel}`);
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipients'] });
        },
        onError(error: any) {
            toast.error(getImportErrorMessage(error, isArabic ? 'تعذر تحديث حالة الرد.' : 'Unable to update the response status.'));
        },
    });

    const moveRecipientMutation = useMutation({
        mutationFn: async ({
            recipient,
            targetSheet,
            templateRecipient,
        }: {
            recipient: Recipient;
            targetSheet: RecipientSheetValue;
            templateRecipient?: Recipient | null;
        }) => {
            await fetchCsrfToken();

            if (targetSheet === 'SPARE') {
                const response = await api.patch(`/messaging/recipients/${recipient.id}/sheet`, { sheet: 'SPARE' });
                return response.data;
            }

            if (!templateRecipient || (targetSheet !== 'EST1' && targetSheet !== 'EST2')) {
                throw new Error('A destination slot is required.');
            }

            const response = await api.post(`/messaging/recipients/${recipient.id}/reassign`, {
                targetSheet,
                templateRecipientId: templateRecipient.id,
            });
            return response.data;
        },
        onSuccess(_data, variables) {
            toast.success(
                variables.targetSheet === 'SPARE'
                    ? recipientSheetActionCopy.moveToSpareSuccess
                    : recipientSheetActionCopy.moveToSheetSuccess,
            );
            setMovingRecipientId(null);
            setSelectedRecipientIds((current) => current.filter((id) => id !== variables.recipient.id));
            setSpareAssignmentRecipient(null);
            setSpareSwapRecipient(null);
            setSpareSwapPhone('');
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipients'] });
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipient-filter-options'] });
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipient-reference'] });
        },
        onError(error: any) {
            setMovingRecipientId(null);
            toast.error(getImportErrorMessage(error, recipientSheetActionCopy.moveError));
        },
    });

    const swapRecipientWithSpareMutation = useMutation({
        mutationFn: async ({ recipientId, sparePhone }: { recipientId: string; sparePhone: string }) => {
            await fetchCsrfToken();
            const response = await api.post(`/messaging/recipients/${recipientId}/swap-with-spare`, {
                sparePhone,
            });
            return response.data;
        },
        onSuccess(_data, variables) {
            toast.success(recipientSheetActionUxCopy.swapSuccess);
            setMovingRecipientId(null);
            setSelectedRecipientIds((current) => current.filter((id) => id !== variables.recipientId));
            setSpareSwapRecipient(null);
            setSpareSwapPhone('');
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipients'] });
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipient-filter-options'] });
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipient-reference'] });
        },
        onError(error: any) {
            setMovingRecipientId(null);
            toast.error(getImportErrorMessage(error, recipientSheetActionCopy.moveError));
        },
    });

    const deleteCycleMutation = useMutation({
        mutationFn: async (cycleId: string) => {
            await fetchCsrfToken();
            const response = await api.delete(`/messaging/cycles/${cycleId}`);
            return response.data;
        },
        onSuccess() {
            toast.success(copy.cycleDeleted);
            setSelectedRecipientIds([]);
            setSelectedCycleId(ALL_CYCLES_VALUE);
            void refreshAll();
        },
        onError(error: any) {
            toast.error(getImportErrorMessage(error, copy.cycleDeleteError));
        },
    });

    const saveTemplateMutation = useMutation({
        mutationFn: async () => {
            if (editingTemplateId) {
                const response = await api.put(`/messaging/templates/${editingTemplateId}`, templateForm);
                return response.data;
            }

            const response = await api.post('/messaging/templates', templateForm);
            return response.data;
        },
        onSuccess(savedTemplate: Template) {
            toast.success(copy.templateSaved);
            setTemplateForm(EMPTY_TEMPLATE_FORM);
            setEditingTemplateId(null);
            setIsTemplateComposerOpen(false);
            setGuidedTemplateForm(null);
            setIsAdvancedTemplateEditorOpen(false);
            setActiveTemplateField('body');
            setCampaignTemplateId(savedTemplate?.id || campaignTemplateId);
            void queryClient.invalidateQueries({ queryKey: ['messaging-templates'] });
        },
        onError(error: any) {
            toast.error(error?.message || copy.sendError);
        },
    });

    const deleteTemplateMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/messaging/templates/${id}`);
            return response.data;
        },
        onSuccess() {
            toast.success(copy.templateDeleted);
            setEditingTemplateId(null);
            setIsTemplateComposerOpen(false);
            setTemplateForm(EMPTY_TEMPLATE_FORM);
            setGuidedTemplateForm(null);
            setIsAdvancedTemplateEditorOpen(false);
            setActiveTemplateField('body');
            void queryClient.invalidateQueries({ queryKey: ['messaging-templates'] });
        },
    });

    const sendMutation = useMutation({
        mutationFn: async (payload: any) => {
            await fetchCsrfToken();
            const response = await api.post('/messaging/send', payload);
            return response.data;
        },
        onSuccess(data) {
            toast.success(`${copy.sendSuccess} ${data.processed}/${data.total}`);
            void refreshAll();
        },
        onError(error: any) {
            toast.error(error?.message || copy.sendError);
        },
    });

    const retryMutation = useMutation({
        mutationFn: async (payload: any) => {
            await fetchCsrfToken();
            const response = await api.post('/messaging/retry', payload);
            return response.data;
        },
        onSuccess(data) {
            toast.success(`${copy.sendSuccess} ${data.processed}/${data.total}`);
            void refreshAll();
        },
        onError(error: any) {
            toast.error(error?.message || copy.sendError);
        },
    });

    const previewHierarchyBriefsMutation = useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
            await fetchCsrfToken();
            const response = await api.post('/messaging/hierarchy-briefs/preview', payload);
            return response.data as HierarchyBriefResult;
        },
        onSuccess(data) {
            setHierarchyPreviewResult(data);
            setHierarchySendResult(null);
            const totalTargets = data.summary.heads.targeted + data.summary.seniors.targeted;
            toast.success(
                `Preview generated for ${totalTargets} targets.`,
            );
        },
        onError(error: any) {
            toast.error(error?.message || 'Unable to generate hierarchy preview right now.');
        },
    });

    const sendHierarchyBriefsMutation = useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
            await fetchCsrfToken();
            const response = await api.post('/messaging/hierarchy-briefs/send', payload);
            return response.data as HierarchyBriefResult;
        },
        onSuccess(data) {
            setHierarchySendResult(data);
            setIsHierarchyConfirmOpen(false);
            const totalSent = data.summary.heads.sent + data.summary.seniors.sent;
            const totalFailed = data.summary.heads.failed + data.summary.seniors.failed;
            toast.success(
                `Hierarchy briefs sent: ${totalSent} delivered / ${totalFailed} failed`,
            );
        },
        onError(error: any) {
            toast.error(error?.message || 'Unable to send head/senior briefs right now.');
        },
    });
    const saveEmailSettingsMutation = useMutation({
        mutationFn: async () => {
            await fetchCsrfToken();
            const response = await api.patch('/settings/email', {
                sender_name: emailSettingsForm.sender_name.trim() || undefined,
                sender_email: emailSettingsForm.sender_email.trim() || undefined,
                active_sender_account_id: emailSettingsForm.active_sender_account_id || null,
            });
            return response.data as EmailSettingsRecord;
        },
        onSuccess(data) {
            setEmailSettingsForm({
                sender_name: data.sender_name,
                sender_email: data.sender_email,
                active_sender_account_id: data.active_sender_account_id || '',
            });
            void queryClient.invalidateQueries({ queryKey: ['email-settings'] });
            toast.success(t('emailSettingsSaveSuccess'));
        },
        onError(error: any) {
            toast.error(error?.message || t('emailSettingsSaveError'));
        },
    });

    const saveWhatsAppSettingsMutation = useMutation({
        mutationFn: async () => {
            await fetchCsrfToken();
            const response = await api.patch('/settings/whatsapp', {
                api_url: whatsAppSettingsForm.api_url.trim(),
                media_url: whatsAppSettingsForm.media_url.trim(),
                id_instance: whatsAppSettingsForm.id_instance.trim(),
                api_token_instance: whatsAppSettingsForm.api_token_instance.trim(),
            });
            return response.data as WhatsAppSettingsRecord;
        },
        onSuccess(data) {
            setWhatsAppSettingsForm({
                api_url: data.api_url,
                media_url: data.media_url,
                id_instance: data.id_instance,
                api_token_instance: data.api_token_instance,
            });
            void queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] });
            toast.success(isArabic ? 'تم حفظ إعدادات واتساب.' : 'WhatsApp settings saved successfully.');
        },
        onError(error: any) {
            toast.error(error?.message || (isArabic ? 'تعذر حفظ إعدادات واتساب حالياً.' : 'Unable to save WhatsApp settings right now.'));
        },
    });

    const testWhatsAppMutation = useMutation({
        mutationFn: async () => {
            await fetchCsrfToken();
            await api.patch('/settings/whatsapp', {
                api_url: whatsAppSettingsForm.api_url.trim(),
                media_url: whatsAppSettingsForm.media_url.trim(),
                id_instance: whatsAppSettingsForm.id_instance.trim(),
                api_token_instance: whatsAppSettingsForm.api_token_instance.trim(),
            });
            const response = await api.post('/settings/whatsapp/test', {});
            return response.data as WhatsAppTestResult;
        },
        onSuccess(data) {
            setWhatsAppSettingsForm({
                api_url: data.settings.api_url,
                media_url: data.settings.media_url,
                id_instance: data.settings.id_instance,
                api_token_instance: data.settings.api_token_instance,
            });
            setWhatsAppTestResult(data);
            void queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] });
            toast.success(
                data.ok
                    ? (isArabic ? `تم إرسال رسالة واتساب تجريبية إلى ${data.phone}.` : `Test WhatsApp message sent to ${data.phone}.`)
                    : (isArabic ? `فشل اختبار واتساب: ${data.delivery.error || 'خطأ غير معروف'}` : `WhatsApp test failed: ${data.delivery.error || 'Unknown error'}`),
            );
        },
        onError(error: any) {
            setWhatsAppTestResult(null);
            toast.error(error?.message || (isArabic ? 'تعذر تنفيذ اختبار واتساب.' : 'Unable to run the WhatsApp test.'));
        },
    });

    const saveSenderAccountMutation = useMutation({
        mutationFn: async () => {
            await fetchCsrfToken();
            const payload = {
                label: senderAccountForm.label.trim(),
                sender_name: senderAccountForm.sender_name.trim(),
                sender_email: senderAccountForm.sender_email.trim(),
                smtp_host: senderAccountForm.smtp_host.trim(),
                smtp_port: Number.parseInt(senderAccountForm.smtp_port, 10) || 587,
                smtp_secure: senderAccountForm.smtp_secure,
                smtp_require_tls: senderAccountForm.smtp_require_tls,
                smtp_username: senderAccountForm.smtp_username.trim(),
                smtp_password: senderAccountForm.smtp_password.trim() || undefined,
                smtp_daily_limit: senderAccountForm.smtp_daily_limit.trim()
                    ? Number.parseInt(senderAccountForm.smtp_daily_limit, 10)
                    : undefined,
            };

            if (editingSenderAccountId) {
                const response = await api.patch(`/settings/email/accounts/${editingSenderAccountId}`, payload);
                return response.data as EmailSettingsRecord;
            }

            const response = await api.post('/settings/email/accounts', {
                ...payload,
                smtp_password: senderAccountForm.smtp_password.trim(),
            });
            return response.data as EmailSettingsRecord;
        },
        onSuccess(data) {
            setEmailSettingsForm({
                sender_name: data.sender_name,
                sender_email: data.sender_email,
                active_sender_account_id: data.active_sender_account_id || '',
            });
            setSenderAccountForm(EMPTY_SENDER_ACCOUNT_FORM);
            setEditingSenderAccountId(null);
            void queryClient.invalidateQueries({ queryKey: ['email-settings'] });
            toast.success(editingSenderAccountId ? t('senderAccountUpdated') : t('senderAccountCreated'));
        },
        onError(error: any) {
            toast.error(error?.message || t('senderAccountSaveError'));
        },
    });

    const deleteSenderAccountMutation = useMutation({
        mutationFn: async (id: string) => {
            await fetchCsrfToken();
            const response = await api.delete(`/settings/email/accounts/${id}`);
            return response.data as EmailSettingsRecord;
        },
        onSuccess(data, deletedId) {
            if (editingSenderAccountId === deletedId) {
                setEditingSenderAccountId(null);
                setSenderAccountForm(EMPTY_SENDER_ACCOUNT_FORM);
            }
            setEmailSettingsForm({
                sender_name: data.sender_name,
                sender_email: data.sender_email,
                active_sender_account_id: data.active_sender_account_id || '',
            });
            void queryClient.invalidateQueries({ queryKey: ['email-settings'] });
            toast.success(t('senderAccountDeleted'));
        },
        onError(error: any) {
            toast.error(error?.message || t('senderAccountDeleteError'));
        },
    });

    const recipients = recipientsQuery.data?.items ?? EMPTY_RECIPIENTS;
    const cycles = cyclesQuery.data ?? [];
    const currentCycle = cycles.find((cycle) => cycle.id === selectedCycleId) || null;
    const totalRecipients = recipientsQuery.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalRecipients / pageSize));
    const visibleRangeStart = totalRecipients === 0 ? 0 : (page - 1) * pageSize + 1;
    const visibleRangeEnd = totalRecipients === 0 ? 0 : Math.min(page * pageSize, totalRecipients);
    const filteredTemplates = (templatesQuery.data ?? []).filter((template) => {
        const query = templateSearch.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [
            template.name,
            template.subject,
            template.body,
            copy.templateTypeLabels[template.type],
        ].some((value) => value.toLowerCase().includes(query));
    });
    const currentTemplate = templatesQuery.data?.find((template) => template.id === campaignTemplateId) || null;
    const renderTemplateBodyPreview = (body: string) => {
        if (isHtmlTemplateBody(body)) {
            return renderTemplateTokens(body, TEMPLATE_PREVIEW_RECIPIENT, { escapeHtmlValues: true });
        }

        return renderTemplateTokens(body, TEMPLATE_PREVIEW_RECIPIENT);
    };
    const templateComposerBodyPreview = renderTemplateBodyPreview(templateForm.body);
    const templateComposerSubjectPreview = renderTemplateTokens(templateForm.subject, TEMPLATE_PREVIEW_RECIPIENT);
    const templateComposerPreviewDocument = useMemo(
        () => buildEmailPreviewDocument(templateComposerBodyPreview),
        [templateComposerBodyPreview],
    );
    const templateComposerWhatsAppPreview = buildWhatsAppPreviewText(templateForm.body, TEMPLATE_PREVIEW_RECIPIENT);
    const templateComposerWhatsAppModel = useMemo(
        () => buildWhatsAppPreviewModel(templateComposerWhatsAppPreview),
        [templateComposerWhatsAppPreview],
    );
    const currentTemplateBodyPreview = currentTemplate ? renderTemplateBodyPreview(currentTemplate.body) : '';
    const currentTemplateSubjectPreview = currentTemplate ? renderTemplateTokens(currentTemplate.subject, TEMPLATE_PREVIEW_RECIPIENT) : '';
    const currentTemplatePreviewDocument = useMemo(
        () => buildEmailPreviewDocument(currentTemplateBodyPreview),
        [currentTemplateBodyPreview],
    );
    const currentTemplateWhatsAppPreview = currentTemplate
        ? buildWhatsAppPreviewText(currentTemplate.body, TEMPLATE_PREVIEW_RECIPIENT)
        : '';
    const currentTemplateWhatsAppModel = useMemo(
        () => buildWhatsAppPreviewModel(currentTemplateWhatsAppPreview),
        [currentTemplateWhatsAppPreview],
    );
    const selectedVisibleRecipients = recipients.filter((recipient) => selectedRecipientIds.includes(recipient.id));
    const senderAccounts = emailSettingsQuery.data?.sender_accounts ?? [];
    const whatsAppProviderResponse = whatsAppTestResult?.delivery?.response
        ? JSON.stringify(whatsAppTestResult.delivery.response, null, 2)
        : '';
    const activeSenderAccount = senderAccounts.find((account) => account.id === emailSettingsForm.active_sender_account_id) || null;
    const emailIdentityPreview = emailSettingsForm.sender_email
        ? `${emailSettingsForm.sender_name.trim() || t('senderNamePlaceholder')} <${emailSettingsForm.sender_email}>`
        : emailSettingsForm.sender_name.trim() || '-';
    const hierarchyReferenceResult = hierarchyPreviewResult ?? hierarchySendResult;
    const availableHierarchyHeads = hierarchyReferenceResult?.available_targets.heads ?? [];
    const availableHierarchySeniors = hierarchyReferenceResult?.available_targets.seniors ?? [];
    const hierarchyPreviewTargets = hierarchyPreviewResult?.preview.ordered ?? [];
    const hierarchyDeliveryRows = hierarchySendResult?.delivery ?? [];
    const est1ReferenceRecipients = est1ReferenceQuery.data ?? EMPTY_RECIPIENTS;
    const est2ReferenceRecipients = est2ReferenceQuery.data ?? EMPTY_RECIPIENTS;
    const spareReferenceRecipients = spareReferenceQuery.data ?? EMPTY_RECIPIENTS;
    const blacklistReferenceRecipients = useMemo(
        () => [...est1ReferenceRecipients, ...est2ReferenceRecipients, ...spareReferenceRecipients],
        [est1ReferenceRecipients, est2ReferenceRecipients, spareReferenceRecipients],
    );
    const blacklistConflictMap = useMemo(
        () => selectedSheet === 'BLACKLIST'
            ? buildBlacklistConflictMapByCycle(recipients, blacklistReferenceRecipients)
            : new Map<string, BlacklistConflictInfo>(),
        [blacklistReferenceRecipients, recipients, selectedSheet],
    );
    const blacklistConflictCount = blacklistConflictMap.size;
    const blacklistReferenceLoading = selectedSheet === 'BLACKLIST' && (
        est1ReferenceQuery.isLoading
        || est2ReferenceQuery.isLoading
        || spareReferenceQuery.isLoading
    );
    const spareAssignmentReferenceRecipients = useMemo(() => {
        if (!spareAssignmentRecipient) {
            return EMPTY_RECIPIENTS;
        }

        const targetRecipients = spareAssignmentTargetSheet === 'EST1'
            ? est1ReferenceRecipients
            : est2ReferenceRecipients;

        if (selectedCycleId !== ALL_CYCLES_VALUE) {
            return targetRecipients;
        }

        return targetRecipients.filter((recipient) => (
            spareAssignmentRecipient.cycleId
                ? recipient.cycleId === spareAssignmentRecipient.cycleId
                : !recipient.cycleId
        ));
    }, [
        est1ReferenceRecipients,
        est2ReferenceRecipients,
        selectedCycleId,
        spareAssignmentRecipient,
        spareAssignmentTargetSheet,
    ]);
    const spareAssignmentOptions = useMemo(
        () => buildSheetAssignmentOptions(spareAssignmentReferenceRecipients),
        [spareAssignmentReferenceRecipients],
    );
    const spareAssignmentBuildingOptions = useMemo(
        () => Array.from(new Set(spareAssignmentOptions.map((option) => option.building))).map((building) => ({
            value: building,
            label: building,
        })),
        [spareAssignmentOptions],
    );
    const spareAssignmentFloorOptions = useMemo(() => (
        Array.from(new Set(
            spareAssignmentOptions
                .filter((option) => option.building === spareAssignmentBuilding)
                .map((option) => option.floorKey),
        )).map((floorKey) => ({
            value: floorKey,
            label: formatRecipientFloorLabel(floorKey, isArabic),
        }))
    ), [isArabic, spareAssignmentBuilding, spareAssignmentOptions]);
    const spareAssignmentRoomOptions = useMemo(() => (
        spareAssignmentOptions
            .filter((option) => option.building === spareAssignmentBuilding && option.floorKey === spareAssignmentFloor)
            .map((option) => ({
                value: option.value,
                label: option.room,
            }))
    ), [spareAssignmentBuilding, spareAssignmentFloor, spareAssignmentOptions]);
    const selectedSpareAssignmentOption = useMemo(
        () => spareAssignmentOptions.find((option) => option.value === spareAssignmentRoomKey) ?? null,
        [spareAssignmentOptions, spareAssignmentRoomKey],
    );
    const selectedSpareAssignmentTemplate = useMemo(
        () => spareAssignmentReferenceRecipients.find((recipient) => recipient.id === selectedSpareAssignmentOption?.templateRecipientId) ?? null,
        [selectedSpareAssignmentOption?.templateRecipientId, spareAssignmentReferenceRecipients],
    );
    const spareAssignmentLoading = Boolean(spareAssignmentRecipient) && (
        spareAssignmentTargetSheet === 'EST1'
            ? est1ReferenceQuery.isLoading
            : est2ReferenceQuery.isLoading
    );
    const spareSwapReferenceRecipients = useMemo(() => {
        if (!spareSwapRecipient) {
            return EMPTY_RECIPIENTS;
        }

        if (selectedCycleId !== ALL_CYCLES_VALUE) {
            return spareReferenceRecipients;
        }

        return spareReferenceRecipients.filter((recipient) => (
            spareSwapRecipient.cycleId
                ? recipient.cycleId === spareSwapRecipient.cycleId
                : !recipient.cycleId
        ));
    }, [selectedCycleId, spareReferenceRecipients, spareSwapRecipient]);
    const matchedSpareSwapRecipient = useMemo(() => {
        const normalizedPhone = normalizeRecipientPhoneLookup(spareSwapPhone);
        if (!normalizedPhone) {
            return null;
        }

        return spareSwapReferenceRecipients.find((recipient) => (
            recipient.id !== spareSwapRecipient?.id
            && normalizeRecipientPhoneLookup(recipient.phone) === normalizedPhone
        )) ?? null;
    }, [spareSwapPhone, spareSwapReferenceRecipients, spareSwapRecipient?.id]);

    useEffect(() => {
        if (!spareAssignmentRecipient) {
            return;
        }

        if (spareAssignmentTargetSheet === 'EST1' && !est1ReferenceRecipients.length && est2ReferenceRecipients.length) {
            setSpareAssignmentTargetSheet('EST2');
            return;
        }

        if (spareAssignmentTargetSheet === 'EST2' && !est2ReferenceRecipients.length && est1ReferenceRecipients.length) {
            setSpareAssignmentTargetSheet('EST1');
        }
    }, [
        est1ReferenceRecipients.length,
        est2ReferenceRecipients.length,
        spareAssignmentRecipient,
        spareAssignmentTargetSheet,
    ]);

    useEffect(() => {
        if (!spareAssignmentRecipient) {
            return;
        }

        const firstBuilding = spareAssignmentBuildingOptions[0]?.value ?? '';
        if (!spareAssignmentBuildingOptions.some((option) => option.value === spareAssignmentBuilding)) {
            setSpareAssignmentBuilding(firstBuilding);
        }
    }, [spareAssignmentBuilding, spareAssignmentBuildingOptions, spareAssignmentRecipient]);

    useEffect(() => {
        if (!spareAssignmentRecipient) {
            return;
        }

        const firstFloor = spareAssignmentFloorOptions[0]?.value ?? '';
        if (!spareAssignmentFloorOptions.some((option) => option.value === spareAssignmentFloor)) {
            setSpareAssignmentFloor(firstFloor);
        }
    }, [spareAssignmentFloor, spareAssignmentFloorOptions, spareAssignmentRecipient]);

    useEffect(() => {
        if (!spareAssignmentRecipient) {
            return;
        }

        const firstRoom = spareAssignmentRoomOptions[0]?.value ?? '';
        if (!spareAssignmentRoomOptions.some((option) => option.value === spareAssignmentRoomKey)) {
            setSpareAssignmentRoomKey(firstRoom);
        }
    }, [spareAssignmentRecipient, spareAssignmentRoomKey, spareAssignmentRoomOptions]);

    const pageStats = useMemo(() => ({
        pending: recipients.filter((recipient) => recipient.status === 'PENDING').length,
        sent: recipients.filter((recipient) => recipient.status === 'SENT').length,
        responded: recipients.filter((recipient) => getRecipientResponseState(recipient) !== 'pending').length,
        confirmed: recipients.filter((recipient) => getRecipientResponseState(recipient) === 'confirmed').length,
        apologized: recipients.filter((recipient) => getRecipientResponseState(recipient) === 'declined').length,
        failed: recipients.filter((recipient) => recipient.status === 'FAILED').length,
    }), [recipients]);

    const textRecipientFilterFields = useMemo(() => ([
        { key: 'name', label: copy.name },
        { key: 'email', label: copy.emailLabel },
        { key: 'room_est1', label: copy.roomEst1 },
    ] as Array<{ key: keyof RecipientFilters; label: string }>), [
        copy.emailLabel,
        copy.name,
        copy.roomEst1,
    ]);

    const compactSelectTriggerClass = '!min-h-[2.625rem] !rounded-xl !px-3 !py-2 text-sm shadow-none';
    const compactInputClass = 'input w-full !min-h-[2.375rem] !rounded-xl !px-3 !py-1.5 text-sm';
    const compactSelectClass = '!min-h-[2.375rem] !rounded-xl !px-3 !py-1.5 text-sm shadow-none';
    const topStatPills = [
        { key: 'matching', label: copy.visibleCount, value: totalRecipients, valueClassName: 'text-slate-950' },
        { key: 'pending', label: copy.pendingCount, value: pageStats.pending, valueClassName: 'text-amber-700' },
        { key: 'sent', label: copy.sentCount, value: pageStats.sent, valueClassName: 'text-emerald-700' },
        { key: 'responded', label: copy.respondedCount, value: pageStats.responded, valueClassName: 'text-violet-700' },
        { key: 'confirmed', label: copy.confirmedCount, value: pageStats.confirmed, valueClassName: 'text-emerald-700' },
        { key: 'apologized', label: copy.apologizedCount, value: pageStats.apologized, valueClassName: 'text-rose-700' },
        { key: 'selected', label: copy.selectedCount, value: selectedRecipientIds.length, valueClassName: 'text-blue-700' },
    ];

    const filterOptions = recipientFilterOptionsQuery.data ?? { roles: [], types: [], governorates: [], sheets: [] };
    const availableSheets = filterOptions.sheets;
    const orderedSheetTabs = SHEET_DISPLAY_ORDER
        .map((sheetValue) => availableSheets.find((sheet) => sheet.value === sheetValue))
        .filter((sheet): sheet is RecipientFilterOptions['sheets'][number] => Boolean(sheet));
    const clearableOption = { value: '', label: isArabic ? 'بدون تحديد' : 'No selection' };
    const cycleSelectOptions = [
        { value: ALL_CYCLES_VALUE, label: isArabic ? 'كل الدورات' : 'All cycles' },
        ...cycles.map((cycle) => ({ value: cycle.id, label: cycle.name })),
    ];
    const roleFilterOptions = [
        clearableOption,
        ...filterOptions.roles.map((role) => ({ value: role, label: role })),
    ];
    const typeFilterOptions = [
        clearableOption,
        ...filterOptions.types.map((type) => ({ value: type, label: type })),
    ];
    const governorateFilterOptions = [
        clearableOption,
        ...filterOptions.governorates.map((governorate) => ({ value: governorate, label: governorate })),
    ];
    const statusFilterOptions = [
        clearableOption,
        ...Object.entries(copy.statusLabels).map(([statusValue, label]) => ({ value: statusValue, label })),
    ];
    const pageSizeOptions = PAGE_SIZE_OPTIONS.map((option) => ({ value: String(option), label: String(option) }));
    const templateTypeOptions = (['EMAIL', 'WHATSAPP', 'BOTH'] as TemplateType[]).map((templateValue) => ({
        value: templateValue,
        label: copy.templateTypeLabels[templateValue],
    }));
    const campaignTemplateOptions = (templatesQuery.data ?? []).map((template) => ({
        value: template.id,
        label: template.name,
    }));
    const responseStatusOptions = [
        { value: 'PENDING', label: RESPONSE_STATUS_LABELS.pending },
        { value: 'CONFIRMED', label: RESPONSE_STATUS_LABELS.confirmed },
        { value: 'DECLINED', label: RESPONSE_STATUS_LABELS.declined },
    ];
    const reassignTargetSheetOptions = (['EST1', 'EST2'] as ReassignTargetSheet[]).map((sheetValue) => ({
        value: sheetValue,
        label: getRecipientSheetLabel(sheetValue, isArabic),
    }));

    const allVisibleSelected = recipients.length > 0 && recipients.every((recipient) => selectedRecipientIds.includes(recipient.id));

    const updateFilter = (key: keyof typeof filters, value: string) => {
        setPage(1);
        setFilters((current) => ({ ...current, [key]: value }));
    };

    const clearFilters = () => {
        setPage(1);
        setFilters({
            ...EMPTY_FILTERS,
            cycleId: selectedCycleId === ALL_CYCLES_VALUE ? '' : selectedCycleId,
        });
    };

    const toggleRecipient = (recipientId: string) => {
        setSelectedRecipientIds((current) => (
            current.includes(recipientId)
                ? current.filter((id) => id !== recipientId)
                : [...current, recipientId]
        ));
    };

    const stopRowToggle = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
    };

    const toggleAllVisible = () => {
        if (allVisibleSelected) {
            setSelectedRecipientIds((current) => current.filter((id) => !recipients.some((recipient) => recipient.id === id)));
            return;
        }

        setSelectedRecipientIds((current) => Array.from(new Set([...current, ...recipients.map((recipient) => recipient.id)])));
    };

    const moveRecipientToSpare = (recipient: Recipient) => {
        setMovingRecipientId(recipient.id);
        moveRecipientMutation.mutate({
            recipient,
            targetSheet: 'SPARE',
        });
    };

    const openSpareAssignmentDialog = (recipient: Recipient) => {
        setSpareAssignmentRecipient(recipient);
        setSpareAssignmentTargetSheet(est1ReferenceRecipients.length || !est2ReferenceRecipients.length ? 'EST1' : 'EST2');
        setSpareAssignmentBuilding('');
        setSpareAssignmentFloor('');
        setSpareAssignmentRoomKey('');
    };

    const openSpareSwapDialog = (recipient: Recipient) => {
        setSpareSwapRecipient(recipient);
        setSpareSwapPhone('');
    };

    const confirmSpareAssignment = () => {
        if (!spareAssignmentRecipient || !selectedSpareAssignmentTemplate) {
            toast.error(recipientSheetActionCopy.noAssignmentSlots);
            return;
        }

        setMovingRecipientId(spareAssignmentRecipient.id);
        moveRecipientMutation.mutate({
            recipient: spareAssignmentRecipient,
            targetSheet: spareAssignmentTargetSheet,
            templateRecipient: selectedSpareAssignmentTemplate,
        });
    };

    const confirmSpareSwap = () => {
        if (!spareSwapRecipient || !matchedSpareSwapRecipient) {
            toast.error(recipientSheetActionUxCopy.spareNoMatch);
            return;
        }

        setMovingRecipientId(spareSwapRecipient.id);
        swapRecipientWithSpareMutation.mutate({
            recipientId: spareSwapRecipient.id,
            sparePhone: spareSwapPhone.trim(),
        });
    };

    const openCreateRecipientForm = () => {
        setEditingRecipientId(null);
        setEditingRecipientCycleId(null);
        setRecipientForm({
            ...EMPTY_RECIPIENT_FORM,
            sheet: isManagedRecipientSheet(selectedSheet) ? selectedSheet : '',
        });
        setRecipientFormErrors({});
        setIsRecipientFormOpen(true);
    };

    const openEditRecipientForm = (recipient: Recipient) => {
        setEditingRecipientId(recipient.id);
        setEditingRecipientCycleId(recipient.cycleId || null);
        setRecipientForm({
            room_est1: recipient.room_est1 || recipient.room || '',
            division: recipient.division || '',
            name: recipient.name || '',
            arabic_name: recipient.arabic_name || '',
            email: recipient.email || '',
            phone: recipient.phone || '',
            employer: recipient.employer || '',
            kind_of_school: recipient.kind_of_school || '',
            title: recipient.title || '',
            insurance_number: recipient.insurance_number || '',
            institution_tax_number: recipient.institution_tax_number || '',
            national_id_number: recipient.national_id_number || '',
            national_id_picture: recipient.national_id_picture || '',
            personal_photo: recipient.personal_photo || '',
            preferred_proctoring_city: recipient.preferred_proctoring_city || '',
            preferred_test_center: recipient.preferred_test_center || '',
            bank_account_name: recipient.bank_account_name || '',
            bank_name: recipient.bank_name || '',
            bank_branch_name: recipient.bank_branch_name || '',
            account_number: recipient.account_number || '',
            iban_number: recipient.iban_number || '',
            role: recipient.role || '',
            type: recipient.type || '',
            governorate: recipient.governorate || '',
            address: recipient.address || '',
            building: recipient.building || '',
            location: recipient.location || '',
            bank_divid: recipient.bank_divid || '',
            additional_info_1: recipient.additional_info_1 || '',
            additional_info_2: recipient.additional_info_2 || '',
            sheet: isManagedRecipientSheet(recipient.sheet) ? recipient.sheet : '',
        });
        setRecipientFormErrors({});
        setIsRecipientFormOpen(true);
    };

    const closeRecipientForm = () => {
        setEditingRecipientId(null);
        setEditingRecipientCycleId(null);
        setRecipientForm(EMPTY_RECIPIENT_FORM);
        setRecipientFormErrors({});
        setIsRecipientFormOpen(false);
    };

    const updateRecipientForm = <K extends keyof RecipientExcelFormState,>(key: K, value: RecipientExcelFormState[K]) => {
        setRecipientForm((current) => ({ ...current, [key]: value }));
        setRecipientFormErrors((current) => ({ ...current, [key]: undefined }));
    };

    const validateRecipientForm = (): RecipientFormErrors => {
        const errors: RecipientFormErrors = {};
        if (!recipientForm.room_est1.trim()) errors.room_est1 = copy.recipientRoomRequired;
        if (!recipientForm.name.trim()) errors.name = copy.recipientNameRequired;
        if (!recipientForm.email.trim()) {
            errors.email = copy.recipientEmailRequired;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(recipientForm.email.trim())) {
            errors.email = copy.recipientEmailInvalid;
        }
        if (!recipientForm.sheet) errors.sheet = copy.recipientSheetRequired;
        return errors;
    };

    const saveRecipient = () => {
        const nextErrors = validateRecipientForm();
        if (Object.keys(nextErrors).length) {
            setRecipientFormErrors(nextErrors);
            toast.error(Object.values(nextErrors)[0] || copy.recipientSaveError);
            return;
        }

        const trimmedValues = trimRecipientFormValues(recipientForm);
        saveRecipientMutation.mutate({
            recipientId: editingRecipientId,
            values: {
                ...trimmedValues,
            },
        });
    };

    const exportRecipientsToExcel = async () => {
        try {
            const fetchRecipientsForExport = async ({
                sheet = selectedSheet,
                applyCurrentFilters = true,
            }: {
                sheet?: RecipientSheetValue | '';
                applyCurrentFilters?: boolean;
            } = {}) => {
                const params: Record<string, string | number | undefined> = applyCurrentFilters
                    ? buildFilterPayload(false)
                    : {};

                if (selectedCycleId !== ALL_CYCLES_VALUE) {
                    params.cycleId = selectedCycleId;
                }

                params.sheet = sheet || undefined;
                params.status = applyCurrentFilters ? filters.status || undefined : undefined;
                return fetchAllRecipients(params);
            };

            const allItems = await fetchRecipientsForExport();
            const blacklistConflictMap: Map<string, BlacklistConflictInfo> = selectedSheet === 'BLACKLIST'
                ? buildBlacklistConflictMapByCycle(
                    allItems,
                    (await Promise.all(
                        MANAGED_SHEET_DISPLAY_ORDER
                            .filter((sheet) => sheet !== 'BLACKLIST')
                            .map((sheet) => fetchRecipientsForExport({ sheet, applyCurrentFilters: false })),
                    )).flat(),
                )
                : new Map<string, BlacklistConflictInfo>();

            const blacklistConflictHeader = isArabic ? 'حالة تعارض البلاك ليست' : 'Blacklist Conflict';
            const blacklistFoundInHeader = isArabic ? 'موجود في الشيتات' : 'Found In Sheets';
            const blacklistMatchByHeader = isArabic ? 'التطابق بواسطة' : 'Matched By';
            const blacklistConflictLabel = isArabic ? 'موجود في شيتات أخرى' : 'Found in other sheets';
            const blacklistClearLabel = isArabic ? 'سليم' : 'Clear';

            const worksheet = XLSX.utils.json_to_sheet(
                allItems.map((recipient) => {
                    const blacklistConflict = selectedSheet === 'BLACKLIST'
                        ? blacklistConflictMap.get(recipient.id)
                        : null;

                    return {
                        'Response Status': RESPONSE_STATUS_LABELS[getRecipientResponseState(recipient)],
                        ...(selectedSheet === 'BLACKLIST' ? {
                            [blacklistConflictHeader]: blacklistConflict ? blacklistConflictLabel : blacklistClearLabel,
                            [blacklistFoundInHeader]: blacklistConflict
                                ? blacklistConflict.foundIn.map((sheet) => getRecipientSheetLabel(sheet, isArabic)).join(', ')
                                : '',
                            [blacklistMatchByHeader]: blacklistConflict
                                ? [
                                    blacklistConflict.matchedByName ? (isArabic ? 'الاسم' : 'Name') : null,
                                    blacklistConflict.matchedByPhone ? (isArabic ? 'رقم الهاتف' : 'Phone') : null,
                                ].filter(Boolean).join(', ')
                                : '',
                        } : {}),
                        ...buildRecipientExcelRow({
                            room_est1: recipient.room_est1 || recipient.room || '',
                            division: recipient.division || '',
                            name: recipient.name || '',
                            arabic_name: recipient.arabic_name || '',
                            email: recipient.email || '',
                            phone: recipient.phone || '',
                            employer: recipient.employer || '',
                            kind_of_school: recipient.kind_of_school || '',
                            title: recipient.title || '',
                            insurance_number: recipient.insurance_number || '',
                            institution_tax_number: recipient.institution_tax_number || '',
                            national_id_number: recipient.national_id_number || '',
                            national_id_picture: recipient.national_id_picture || '',
                            personal_photo: recipient.personal_photo || '',
                            preferred_proctoring_city: recipient.preferred_proctoring_city || '',
                            preferred_test_center: recipient.preferred_test_center || '',
                            bank_account_name: recipient.bank_account_name || '',
                            bank_name: recipient.bank_name || '',
                            bank_branch_name: recipient.bank_branch_name || '',
                            account_number: recipient.account_number || '',
                            iban_number: recipient.iban_number || '',
                            role: recipient.role || '',
                            type: recipient.type || '',
                            governorate: recipient.governorate || '',
                            address: recipient.address || '',
                            building: recipient.building || '',
                            location: recipient.location || '',
                            bank_divid: recipient.bank_divid || '',
                            additional_info_1: recipient.additional_info_1 || '',
                            additional_info_2: recipient.additional_info_2 || '',
                        }),
                    };
                }),
            );
            const responseStatusStyles: Record<string, any> = {
                Pending: {
                    fill: { fgColor: { rgb: 'E2E8F0' } },
                    font: { color: { rgb: '334155' }, bold: true },
                    alignment: { horizontal: 'center', vertical: 'center' },
                },
                Confirmed: {
                    fill: { fgColor: { rgb: 'DCFCE7' } },
                    font: { color: { rgb: '166534' }, bold: true },
                    alignment: { horizontal: 'center', vertical: 'center' },
                },
                Apologized: {
                    fill: { fgColor: { rgb: 'FFE4E6' } },
                    font: { color: { rgb: 'BE123C' }, bold: true },
                    alignment: { horizontal: 'center', vertical: 'center' },
                },
            };
            const blacklistConflictCellStyle = {
                fill: { fgColor: { rgb: 'FFE4E6' } },
                font: { color: { rgb: '9F1239' }, bold: true },
                alignment: { horizontal: 'center', vertical: 'center' },
            };
            const blacklistConflictRowStyle = {
                fill: { fgColor: { rgb: 'FFF1F2' } },
                font: { color: { rgb: '881337' } },
            };
            const blacklistClearCellStyle = {
                fill: { fgColor: { rgb: 'ECFDF5' } },
                font: { color: { rgb: '166534' }, bold: true },
                alignment: { horizontal: 'center', vertical: 'center' },
            };

            const headerStyle = {
                fill: { fgColor: { rgb: '0F172A' } },
                font: { color: { rgb: 'FFFFFF' }, bold: true },
                alignment: { horizontal: 'center', vertical: 'center' },
            };

            const dataRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
            const headers = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, blankrows: false, defval: '' })[0] || [];
            worksheet['!cols'] = headers.map((header) => {
                const normalized = String(header || '').toLowerCase();
                if (normalized === 'response status') return { wch: 18 };
                if (normalized.includes('blacklist')) return { wch: 22 };
                if (normalized.includes('found in')) return { wch: 22 };
                if (normalized.includes('matched by')) return { wch: 16 };
                if (normalized.includes('arabic')) return { wch: 24 };
                if (normalized.includes('email')) return { wch: 28 };
                if (normalized.includes('phone')) return { wch: 18 };
                if (normalized.includes('address') || normalized.includes('location')) return { wch: 32 };
                if (normalized.includes('name')) return { wch: 24 };
                if (normalized.includes('photo') || normalized.includes('picture')) return { wch: 24 };
                if (normalized.includes('role') || normalized.includes('type') || normalized.includes('governorate')) return { wch: 20 };
                return { wch: 18 };
            });
            worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(dataRange) };
            worksheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
            worksheet['!rows'] = [{ hpt: 26 }];

            for (let col = dataRange.s.c; col <= dataRange.e.c; col += 1) {
                const headerCell = XLSX.utils.encode_cell({ r: 0, c: col });
                if (worksheet[headerCell]) {
                    worksheet[headerCell].s = headerStyle;
                }
            }

            allItems.forEach((recipient, index) => {
                const cellAddress = XLSX.utils.encode_cell({ r: index + 1, c: 0 });
                const statusLabel = RESPONSE_STATUS_LABELS[getRecipientResponseState(recipient)];
                if (worksheet[cellAddress]) {
                    worksheet[cellAddress].s = responseStatusStyles[statusLabel] || responseStatusStyles.Pending;
                }
            });

            if (selectedSheet === 'BLACKLIST') {
                const conflictColumnIndex = headers.indexOf(blacklistConflictHeader);

                allItems.forEach((recipient, index) => {
                    const conflict = blacklistConflictMap.get(recipient.id);

                    if (!conflict && conflictColumnIndex >= 0) {
                        const conflictCellAddress = XLSX.utils.encode_cell({ r: index + 1, c: conflictColumnIndex });
                        if (worksheet[conflictCellAddress]) {
                            worksheet[conflictCellAddress].s = blacklistClearCellStyle;
                        }
                        return;
                    }

                    if (!conflict) {
                        return;
                    }

                    for (let col = dataRange.s.c; col <= dataRange.e.c; col += 1) {
                        const cellAddress = XLSX.utils.encode_cell({ r: index + 1, c: col });
                        if (!worksheet[cellAddress]) {
                            continue;
                        }

                        worksheet[cellAddress].s = col === conflictColumnIndex
                            ? blacklistConflictCellStyle
                            : blacklistConflictRowStyle;
                    }
                });
            }

            const workbook = XLSX.utils.book_new();
            const worksheetName = selectedSheet === 'BLACKLIST'
                ? 'Blacklist Review'
                : selectedSheet
                    ? getRecipientSheetLabel(selectedSheet, false)
                    : 'Recipients';
            XLSX.utils.book_append_sheet(workbook, worksheet, worksheetName);
            const fileName = selectedSheet === 'BLACKLIST'
                ? 'recipients_blacklist_review.xlsx'
                : selectedSheet
                    ? `recipients_${selectedSheet.toLowerCase()}.xlsx`
                    : 'recipients.xlsx';
            XLSX.writeFile(workbook, fileName, { cellStyles: true });
            toast.success(copy.exportSuccess);
        } catch (error: any) {
            toast.error(getImportErrorMessage(error, copy.exportError));
        }
    };

    const deleteRecipient = (recipientId: string) => {
        setDeleteConfirmState({ type: 'recipient', recipientId });
    };

    const deleteCycle = () => {
        if (!currentCycle?.id) {
            return;
        }

        setDeleteConfirmState({ type: 'cycle', cycleId: currentCycle.id });
    };

    const confirmDeleteAction = () => {
        if (!deleteConfirmState) {
            return;
        }

        if (deleteConfirmState.type === 'recipient') {
            const { recipientId } = deleteConfirmState;
            setDeleteConfirmState(null);
            deleteRecipientMutation.mutate(recipientId);
            return;
        }

        const { cycleId } = deleteConfirmState;
        setDeleteConfirmState(null);
        deleteCycleMutation.mutate(cycleId);
    };

    const beginEditTemplate = (template: Template) => {
        const parsedGuidedConfig = parseGuidedTemplateConfig(template.body);
        setEditingTemplateId(template.id);
        setTemplateForm({
            name: template.name,
            type: template.type,
            subject: template.subject,
            body: template.body,
        });
        setGuidedTemplateForm(parsedGuidedConfig);
        setIsAdvancedTemplateEditorOpen(!parsedGuidedConfig);
        setActiveTemplateField('body');
        setIsTemplateComposerOpen(true);
        updateTab('templates');
    };

    const openTemplateComposer = () => {
        setEditingTemplateId(null);
        setTemplateForm(EMPTY_TEMPLATE_FORM);
        setGuidedTemplateForm(null);
        setIsAdvancedTemplateEditorOpen(false);
        setActiveTemplateField('body');
        setIsTemplateComposerOpen(true);
    };

    const closeTemplateComposer = () => {
        setEditingTemplateId(null);
        setTemplateForm(EMPTY_TEMPLATE_FORM);
        setGuidedTemplateForm(null);
        setIsAdvancedTemplateEditorOpen(false);
        setActiveTemplateField('body');
        setIsTemplateComposerOpen(false);
    };

    const applyTemplatePreset = (presetId: string) => {
        const preset = EXAM_ASSIGNMENT_TEMPLATE_PRESETS.find((item) => item.id === presetId);
        if (!preset) {
            return;
        }

        setTemplateForm({
            name: preset.name,
            type: preset.type,
            subject: preset.subject,
            body: preset.body,
        });
        setGuidedTemplateForm(preset.guidedConfig ?? null);
        setIsAdvancedTemplateEditorOpen(false);
        setActiveTemplateField('body');
    };

    const openNewSenderAccountForm = () => {
        setEditingSenderAccountId(null);
        setSenderAccountForm(EMPTY_SENDER_ACCOUNT_FORM);
    };

    const beginEditSenderAccount = (account: SenderEmailAccount) => {
        setEditingSenderAccountId(account.id);
        setSenderAccountForm({
            label: account.label,
            sender_name: account.sender_name,
            sender_email: account.sender_email,
            smtp_host: account.smtp_host,
            smtp_port: String(account.smtp_port),
            smtp_secure: account.smtp_secure,
            smtp_require_tls: account.smtp_require_tls,
            smtp_username: account.smtp_username,
            smtp_password: '',
            smtp_daily_limit: account.smtp_daily_limit ? String(account.smtp_daily_limit) : '',
        });
    };

    const insertTemplateVariable = (token: string) => {
        const isSubjectField = activeTemplateField === 'subject';
        const targetElement = isSubjectField ? subjectInputRef.current : bodyTextareaRef.current;
        const fieldName = isSubjectField ? 'subject' : 'body';

        if (!targetElement) {
            setTemplateForm((current) => ({
                ...current,
                [fieldName]: `${current[fieldName]}${token}`,
            }));
            return;
        }

        const selectionStart = targetElement.selectionStart ?? targetElement.value.length;
        const selectionEnd = targetElement.selectionEnd ?? targetElement.value.length;

        setTemplateForm((current) => {
            const currentValue = current[fieldName];
            return {
                ...current,
                [fieldName]: `${currentValue.slice(0, selectionStart)}${token}${currentValue.slice(selectionEnd)}`,
            };
        });

        const nextCursor = selectionStart + token.length;
        window.requestAnimationFrame(() => {
            targetElement.focus();
            targetElement.setSelectionRange(nextCursor, nextCursor);
        });
    };

    const saveTemplate = () => {
        if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.body.trim()) {
            toast.error(isArabic ? 'يرجى ملء اسم القالب والعنوان والنص.' : 'Please complete the template name, subject and body.');
            return;
        }
        saveTemplateMutation.mutate();
    };

    const saveEmailSettings = () => {
        if (!emailSettingsForm.active_sender_account_id && (!emailSettingsForm.sender_name.trim() || !emailSettingsForm.sender_email.trim())) {
            toast.error(t('emailSettingsValidationError'));
            return;
        }
        saveEmailSettingsMutation.mutate();
    };

    const saveWhatsAppSettings = () => {
        if (
            !whatsAppSettingsForm.api_url.trim()
            || !whatsAppSettingsForm.media_url.trim()
            || !whatsAppSettingsForm.id_instance.trim()
            || !whatsAppSettingsForm.api_token_instance.trim()
        ) {
            toast.error(isArabic ? 'يرجى إدخال جميع حقول إعدادات واتساب.' : 'Please complete all WhatsApp settings fields.');
            return;
        }

        saveWhatsAppSettingsMutation.mutate();
    };

    const runWhatsAppTest = () => {
        if (
            !whatsAppSettingsForm.api_url.trim()
            || !whatsAppSettingsForm.media_url.trim()
            || !whatsAppSettingsForm.id_instance.trim()
            || !whatsAppSettingsForm.api_token_instance.trim()
        ) {
            toast.error(isArabic ? 'يرجى إدخال جميع حقول إعدادات واتساب قبل الاختبار.' : 'Please complete all WhatsApp settings fields before testing.');
            return;
        }

        testWhatsAppMutation.mutate();
    };

    const saveSenderAccount = () => {
        if (
            !senderAccountForm.label.trim()
            || !senderAccountForm.sender_name.trim()
            || !senderAccountForm.sender_email.trim()
            || !senderAccountForm.smtp_host.trim()
            || !senderAccountForm.smtp_username.trim()
            || (!editingSenderAccountId && !senderAccountForm.smtp_password.trim())
        ) {
            toast.error(t('senderAccountValidationError'));
            return;
        }

        saveSenderAccountMutation.mutate();
    };

    const buildFilterPayload = (applyPendingFallback = true) => {
        const payload: Record<string, string> = {};
        if (selectedCycleId !== ALL_CYCLES_VALUE) payload.cycleId = selectedCycleId;
        if (selectedSheet) payload.sheet = selectedSheet;
        if (filters.search.trim()) payload.search = filters.search.trim();
        if (filters.name.trim()) payload.name = filters.name.trim();
        if (filters.email.trim()) payload.email = filters.email.trim();
        if (filters.role.trim()) payload.role = filters.role.trim();
        if (filters.room_est1.trim()) payload.room_est1 = filters.room_est1.trim();
        if (filters.type.trim()) payload.type = filters.type.trim();
        if (filters.governorate.trim()) payload.governorate = filters.governorate.trim();
        if (filters.address.trim()) payload.address = filters.address.trim();
        if (filters.building.trim()) payload.building = filters.building.trim();
        if (filters.location.trim()) payload.location = filters.location.trim();
        if (filters.status) {
            payload.status = filters.status;
        } else if (applyPendingFallback) {
            payload.status = 'PENDING';
        }
        return payload;
    };

    const renderBlacklistConflictSummary = (conflict?: BlacklistConflictInfo) => {
        if (selectedSheet !== 'BLACKLIST') {
            return null;
        }

        if (!conflict) {
            return (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 size={14} />
                        <span>{recipientSheetActionCopy.blacklistConflictClear}</span>
                    </div>
                </div>
            );
        }

        const matchReasons = [
            conflict.matchedByName ? (isArabic ? 'الاسم' : 'Name') : null,
            conflict.matchedByPhone ? (isArabic ? 'رقم الهاتف' : 'Phone') : null,
        ].filter(Boolean).join(' + ');

        return (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                <div className="flex items-center gap-2 font-semibold">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span>{recipientSheetActionCopy.blacklistConflict}</span>
                </div>
                <div className="mt-2 space-y-1 text-rose-800">
                    <div>
                        {recipientSheetActionCopy.blacklistConflictFoundIn}: {conflict.foundIn.map((sheet) => getRecipientSheetLabel(sheet, isArabic)).join(', ')}
                    </div>
                    <div>
                        {recipientSheetActionCopy.blacklistConflictMatchedBy}: {matchReasons || '-'}
                    </div>
                    <div>{recipientSheetActionCopy.blacklistConflictDeleteHint}</div>
                </div>
            </div>
        );
    };

    const renderRecipientActionButtons = (recipient: Recipient) => {
        const isMoving = movingRecipientId === recipient.id && (
            moveRecipientMutation.isPending
            || swapRecipientWithSpareMutation.isPending
        );
        const canMoveToSpare = recipient.sheet === 'EST1' || recipient.sheet === 'EST2';
        const canAssignFromSpare = recipient.sheet === 'SPARE';

        return (
            <div className="space-y-2" onClick={stopRowToggle}>
                {canMoveToSpare ? (
                    <button
                        type="button"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => moveRecipientToSpare(recipient)}
                        disabled={isMoving}
                    >
                        <ArrowLeftRight size={13} />
                        <span>{recipientSheetActionCopy.moveToSpare}</span>
                    </button>
                ) : null}

                {canMoveToSpare ? (
                    <button
                        type="button"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => openSpareSwapDialog(recipient)}
                        disabled={isMoving}
                    >
                        <ArrowLeftRight size={13} />
                        <span>{recipientSheetActionUxCopy.swapWithSpare}</span>
                    </button>
                ) : null}

                {canAssignFromSpare ? (
                    <button
                        type="button"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => openSpareAssignmentDialog(recipient)}
                        disabled={isMoving}
                    >
                        <ArrowLeftRight size={13} />
                        <span>{recipientSheetActionCopy.moveToSheet}</span>
                    </button>
                ) : null}

                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        onClick={() => openEditRecipientForm(recipient)}
                        aria-label={copy.edit}
                        title={copy.edit}
                    >
                        <SquarePen size={14} />
                    </button>
                    <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50"
                        onClick={() => deleteRecipient(recipient.id)}
                        disabled={deleteRecipientMutation.isPending}
                        aria-label={copy.delete}
                        title={copy.delete}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        );
    };

    const buildHierarchyBriefPayload = () => ({
        cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
        sheet: selectedSheet || undefined,
        include_heads: hierarchyIncludeHeads,
        include_seniors: hierarchyIncludeSeniors,
        head_ids: hierarchyIncludeHeads && hierarchySelectedHeadIds.length ? hierarchySelectedHeadIds : undefined,
        senior_ids: hierarchyIncludeSeniors && hierarchySelectedSeniorIds.length ? hierarchySelectedSeniorIds : undefined,
        channels: hierarchyChannels,
    });

    const previewHierarchyBriefs = () => {
        if (!hierarchyIncludeHeads && !hierarchyIncludeSeniors) {
            toast.error(isArabic ? 'يجب تفعيل Head أو Senior على الأقل.' : 'Enable at least one target role (Head or Senior).');
            return;
        }

        if (!hierarchyChannels.length) {
            toast.error(isArabic ? 'اختر قناة إرسال واحدة على الأقل (WhatsApp أو Email).' : 'Select at least one delivery channel (WhatsApp or Email).');
            return;
        }

        previewHierarchyBriefsMutation.mutate(buildHierarchyBriefPayload());
    };

    const confirmSendHierarchyBriefs = () => {
        if (!hierarchyPreviewResult) {
            toast.error(isArabic ? 'اعمل معاينة الأول قبل التأكيد.' : 'Generate a preview first before confirming send.');
            return;
        }

        sendHierarchyBriefsMutation.mutate(buildHierarchyBriefPayload());
    };

    const toggleHierarchyChannel = (channel: HierarchyBriefChannel) => {
        setHierarchyChannels((current) => {
            if (current.includes(channel)) {
                return current.filter((item) => item !== channel);
            }
            return [...current, channel];
        });
    };

    const toggleHierarchyHead = (headId: string) => {
        setHierarchySelectedHeadIds((current) => (
            current.includes(headId)
                ? current.filter((id) => id !== headId)
                : [...current, headId]
        ));
    };

    const toggleHierarchySenior = (seniorId: string) => {
        setHierarchySelectedSeniorIds((current) => (
            current.includes(seniorId)
                ? current.filter((id) => id !== seniorId)
                : [...current, seniorId]
        ));
    };

    const handleSend = () => {
        if (!campaignTemplateId) {
            toast.error(copy.needTemplate);
            return;
        }

        if (sendScope === 'selected') {
            if (!selectedRecipientIds.length) {
                toast.error(copy.needSelection);
                return;
            }
            sendMutation.mutate({
                templateId: campaignTemplateId,
                mode: 'selected',
                cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
                ids: selectedRecipientIds,
            });
            return;
        }

        if (sendScope === 'filtered') {
            sendMutation.mutate({
                templateId: campaignTemplateId,
                mode: 'filtered',
                filter: buildFilterPayload(true),
            });
            return;
        }

        if (sendScope === 'all_pending') {
            sendMutation.mutate({
                templateId: campaignTemplateId,
                mode: 'all_pending',
                cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
            });
            return;
        }

        retryMutation.mutate({
            templateId: campaignTemplateId,
            cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
        });
    };

    if (isChecking) {
        return (
            <section className="py-6">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm text-slate-600">{copy.loading}</p>
                </div>
            </section>
        );
    }

    if (!ready && error === 'network') {
        return (
            <section className="py-6">
                <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-sm">
                    <h1 className="text-lg font-semibold text-rose-900">API is unavailable</h1>
                    <p className="mt-2 text-sm text-rose-800">
                        There is a network or backend connectivity problem. Refresh the page or check the local API.
                    </p>
                </div>
            </section>
        );
    }

    if (!ready) {
        return null;
    }

    const cardClass = 'rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/5 md:p-5';
    const statClass = 'rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm';
    const renderWhatsAppDeliveryPreview = (model: WhatsAppPreviewModel, label: string) => (
        <div className="template-preview-phone rounded-[1.6rem] p-3">
            <div className="template-preview-phone-screen rounded-[1.35rem] p-4">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    <span>{label}</span>
                    <span>{TEMPLATE_PREVIEW_RECIPIENT.phone}</span>
                </div>
                <div className="mt-4 flex justify-end">
                    <div className="template-preview-phone-bubble max-w-[560px] rounded-[1.45rem] px-4 py-3 shadow-lg shadow-black/10">
                        <div className="whitespace-pre-wrap break-words text-sm leading-6">
                            {model.message || copy.templateBody}
                        </div>
                        {model.links.length ? (
                            <div className="mt-4 space-y-2">
                                {model.links.map((link, index) => (
                                    <a
                                        key={`${link.label}-${index}`}
                                        href={link.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="template-preview-phone-link block rounded-[1rem] px-3 py-2 text-sm font-semibold transition hover:opacity-90"
                                    >
                                        <div>{link.label}</div>
                                        <div className="mt-1 break-all text-xs font-medium opacity-80">{link.href}</div>
                                    </a>
                                ))}
                            </div>
                        ) : null}
                        <div className="mt-4 flex justify-end">
                            <span className="template-preview-phone-detail inline-flex h-1.5 w-16 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    const isDesktopFiltersVisible = !desktopFiltersCollapsed;
    const switchSheet = (nextSheet: RecipientSheetValue) => {
        setPage(1);
        setSelectedRecipientIds([]);
        setSelectedSheet(nextSheet);
    };
    const renderRecipientSheetTabs = () => (
        orderedSheetTabs.length ? orderedSheetTabs.map((sheet) => {
            const active = selectedSheet === sheet.value;
            const meta = SHEET_META[sheet.value];
            const label = getRecipientSheetLabel(sheet.value, isArabic);

            return (
                <button
                    key={sheet.value}
                    type="button"
                    onClick={() => switchSheet(sheet.value)}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        active
                            ? `${meta.border} ${meta.bg} ${meta.color} shadow-sm`
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                >
                    <span className={`h-2 w-2 rounded-full ${active ? meta.dot : 'bg-slate-300'}`} />
                    <span>{label}</span>
                    <span
                        className={`rounded-full px-2 py-0.5 text-[11px] leading-none ${
                            active
                                ? `${meta.bg} ${meta.color} border ${meta.border}`
                                : 'bg-slate-100 text-slate-500'
                        }`}
                    >
                        {sheet.count}
                    </span>
                </button>
            );
        }) : (
            <div className="text-sm text-slate-500">{copy.noSheets}</div>
        )
    );
    const renderRecipientFiltersPanel = (isOverlay = false, includeCycleDetails = true) => (
        <div className={`flex h-full flex-col gap-3 rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-sm shadow-slate-900/5 ${isOverlay ? 'min-h-0' : ''}`}>
            {includeCycleDetails ? (
            <div className="rounded-[1.1rem] border border-blue-100 bg-blue-50/80 p-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                            {isArabic ? 'الدورة النشطة' : 'Active cycle'}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-950">{currentCycle?.name || (isArabic ? 'كل الدورات' : 'All cycles')}</div>
                    </div>
                    {isOverlay ? (
                        <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-white text-slate-500 transition hover:text-slate-900"
                            onClick={() => setMobileFiltersOpen(false)}
                            aria-label={isArabic ? 'إغلاق الفلاتر' : 'Close filters'}
                        >
                            <X size={16} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="hidden h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-white text-slate-500 transition hover:text-slate-900 lg:inline-flex"
                            onClick={() => setDesktopFiltersCollapsed(true)}
                            aria-label={isArabic ? 'إخفاء الفلاتر' : 'Collapse filters'}
                        >
                            {isArabic ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    )}
                </div>

                <FormSelect
                    value={selectedCycleId}
                    onChange={(nextValue) => {
                        setPage(1);
                        setSelectedRecipientIds([]);
                        setSelectedCycleId(nextValue);
                    }}
                    options={cycleSelectOptions}
                    ariaLabel={isArabic ? 'الدورة النشطة' : 'Active cycle'}
                    className="mt-3"
                    triggerClassName={`${compactSelectTriggerClass} !border-blue-100`}
                />

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
                        <div className="font-medium text-slate-500">{isArabic ? 'المستلمون' : 'Recipients'}</div>
                        <div className="mt-1 font-semibold text-slate-950">{currentCycle ? currentCycle.recipients_count : totalRecipients}</div>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
                        <div className="font-medium text-slate-500">{isArabic ? 'الاستيراد' : 'Imported'}</div>
                        <div className="mt-1 truncate font-semibold text-slate-950">
                            {currentCycle ? new Date(currentCycle.created_at).toLocaleDateString() : (isArabic ? 'كل الدورات' : 'All cycles')}
                        </div>
                    </div>
                    <div className="col-span-2 rounded-xl border border-white/70 bg-white/80 px-3 py-2">
                        <div className="font-medium text-slate-500">{isArabic ? 'الملف' : 'File'}</div>
                        <div className="mt-1 truncate font-semibold text-slate-950">
                            {currentCycle?.source_file_name || (isArabic ? 'عرض كل الملفات المستوردة' : 'Showing all imported files')}
                        </div>
                    </div>
                </div>

                {currentCycle ? (
                    <button
                        type="button"
                        className="btn-danger mt-3 w-full justify-center !rounded-xl !py-2.5"
                        onClick={deleteCycle}
                        disabled={deleteCycleMutation.isPending}
                    >
                        {copy.cycleDelete}
                    </button>
                ) : null}
            </div>
            ) : null}

            <div className="min-h-0 rounded-[1.1rem] border border-slate-200 bg-white">
                <div className="flex min-h-0 flex-col p-3">
                    <button
                        type="button"
                        onClick={() => setAdvancedFiltersOpen((value) => !value)}
                        className="flex items-center justify-between gap-2 text-start"
                    >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {isArabic ? 'فلاتر المستلمين' : 'Recipient filters'}
                        </div>
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
                            {advancedFiltersOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </span>
                    </button>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                value={filters.search}
                                onChange={(event) => updateFilter('search', event.target.value)}
                                className={`${compactInputClass} !ps-10`}
                                placeholder={copy.searchPlaceholder}
                            />
                        </label>

                        {textRecipientFilterFields.map((field) => (
                            <input
                                key={field.key}
                                value={filters[field.key]}
                                onChange={(event) => updateFilter(field.key, event.target.value)}
                                className={compactInputClass}
                                placeholder={field.label}
                            />
                        ))}
                    </div>

                    {advancedFiltersOpen ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <FormSelect
                            value={filters.role}
                            onChange={(nextValue) => updateFilter('role', nextValue)}
                            options={roleFilterOptions}
                            placeholder={copy.role}
                            ariaLabel={copy.role}
                            triggerClassName={compactSelectClass}
                        />
                        <FormSelect
                            value={filters.governorate}
                            onChange={(nextValue) => updateFilter('governorate', nextValue)}
                            options={governorateFilterOptions}
                            placeholder={copy.governorate}
                            ariaLabel={copy.governorate}
                            triggerClassName={compactSelectClass}
                        />
                        <FormSelect
                            value={filters.status}
                            onChange={(nextValue) => updateFilter('status', nextValue)}
                            options={statusFilterOptions}
                            placeholder={copy.status}
                            ariaLabel={copy.status}
                            triggerClassName={compactSelectClass}
                        />
                        <FormSelect
                            value={filters.type}
                            onChange={(nextValue) => updateFilter('type', nextValue)}
                            options={typeFilterOptions}
                            placeholder={copy.typeLabel}
                            ariaLabel={copy.typeLabel}
                            triggerClassName={compactSelectClass}
                        />
                    </div>
                    ) : null}

                    <button
                        type="button"
                        className="btn-outline mt-3 w-full justify-center !rounded-xl !py-2.5 sm:w-auto sm:self-end"
                        onClick={clearFilters}
                    >
                        <Filter size={16} />
                        <span>{copy.clearFilters}</span>
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <section className="space-y-4 py-4 md:space-y-5 md:py-5">
            {activeTab === 'recipients' || activeTab === 'campaign' ? (
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-4 shadow-sm shadow-slate-900/5 md:p-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-[220px]">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Emails EST</div>
                        <h1 className="mt-1 text-xl font-semibold text-slate-950 md:text-2xl">{copy.recipientsSectionTitle}</h1>
                    </div>

                    <div className="flex min-w-0 flex-1 items-stretch gap-2 overflow-x-auto pb-1">
                        {topStatPills.map((pill) => (
                            <div key={pill.key} className={`${statClass} min-w-[104px] shrink-0 !rounded-[1.1rem] !px-3 !py-2`}>
                                <div className={`text-lg font-semibold ${pill.valueClassName}`}>{pill.value}</div>
                                <div className="mt-1 text-[11px] font-medium text-slate-500">{pill.label}</div>
                            </div>
                        ))}
                    </div>

                    <button
                        className="btn-outline shrink-0 !rounded-xl !py-2.5"
                        type="button"
                        onClick={() => void refreshAll()}
                        disabled={recipientsQuery.isFetching || templatesQuery.isFetching || logsQuery.isFetching}
                    >
                        <span>{copy.refresh}</span>
                    </button>
                </div>
                <div className="mt-3 rounded-[1.1rem] border border-blue-100 bg-blue-50/70 p-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-[220px]">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                                {isArabic ? 'الدورة النشطة' : 'Active cycle'}
                            </div>
                            <FormSelect
                                value={selectedCycleId}
                                onChange={(nextValue) => {
                                    setPage(1);
                                    setSelectedRecipientIds([]);
                                    setSelectedCycleId(nextValue);
                                }}
                                options={cycleSelectOptions}
                                ariaLabel={isArabic ? 'الدورة النشطة' : 'Active cycle'}
                                className="mt-2"
                                triggerClassName={`${compactSelectTriggerClass} !border-blue-100`}
                            />
                        </div>
                        <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-xs text-slate-600">
                                <div className="font-medium text-slate-500">{isArabic ? 'المستلمون' : 'Recipients'}</div>
                                <div className="mt-1 font-semibold text-slate-950">{currentCycle ? currentCycle.recipients_count : totalRecipients}</div>
                            </div>
                            <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-xs text-slate-600">
                                <div className="font-medium text-slate-500">{isArabic ? 'الاستيراد' : 'Imported'}</div>
                                <div className="mt-1 truncate font-semibold text-slate-950">
                                    {currentCycle ? new Date(currentCycle.created_at).toLocaleDateString() : (isArabic ? 'كل الدورات' : 'All cycles')}
                                </div>
                            </div>
                            <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-xs text-slate-600 sm:col-span-2 xl:col-span-1">
                                <div className="font-medium text-slate-500">{isArabic ? 'الملف' : 'File'}</div>
                                <div className="mt-1 truncate font-semibold text-slate-950">
                                    {currentCycle?.source_file_name || (isArabic ? 'عرض كل الملفات المستوردة' : 'Showing all imported files')}
                                </div>
                            </div>
                        </div>
                        {currentCycle ? (
                            <button
                                type="button"
                                className="btn-danger w-full justify-center !rounded-xl !py-2.5 xl:w-auto"
                                onClick={deleteCycle}
                                disabled={deleteCycleMutation.isPending}
                            >
                                {copy.cycleDelete}
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
            ) : null}

            {activeTab === 'recipients' && (
                <div className="space-y-4">
                    {mobileFiltersOpen ? (
                        <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden">
                            <button
                                type="button"
                                className="absolute inset-0"
                                aria-label={isArabic ? 'إغلاق الفلاتر' : 'Close filters'}
                                onClick={() => setMobileFiltersOpen(false)}
                            />
                            <div className={`absolute inset-y-0 ${isArabic ? 'right-0' : 'left-0'} w-[min(90vw,320px)] p-3`}>
                                {renderRecipientFiltersPanel(true)}
                            </div>
                        </div>
                    ) : null}
                    <div className="space-y-4">
                        {renderRecipientFiltersPanel(false, false)}

                        <div className="min-w-0">
                            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
                                <div className="border-b border-slate-200 px-4 py-3">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex min-w-0 items-center gap-3 overflow-x-auto pb-1">
                                            <button
                                                type="button"
                                                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 lg:hidden"
                                                onClick={() => setMobileFiltersOpen(true)}
                                            >
                                                <Filter size={16} />
                                                <span>{isArabic ? 'الفلاتر' : 'Filters'}</span>
                                            </button>

                                            {renderRecipientSheetTabs()}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                                                {selectedRecipientIds.length} {copy.selectedRowsSummary}
                                            </div>
                                            <button type="button" className="btn-outline !rounded-xl !py-2.5" onClick={() => void exportRecipientsToExcel()}>
                                                <FileSpreadsheet size={16} />
                                                <span>{copy.exportExcel}</span>
                                            </button>
                                            <button type="button" className="btn-primary !rounded-xl !py-2.5" onClick={openCreateRecipientForm}>
                                                <Plus size={16} />
                                                <span>{copy.addRecipient}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-b border-slate-200 px-4 py-3">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-sm text-slate-500">
                                            {copy.showing} {visibleRangeStart}-{visibleRangeEnd} {copy.of} {totalRecipients}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                            <div className="w-[132px]">
                                                <FormSelect
                                                    value={String(pageSize)}
                                                    onChange={(nextValue) => {
                                                        setPage(1);
                                                        setPageSize(parseInt(nextValue, 10));
                                                    }}
                                                    options={pageSizeOptions}
                                                    ariaLabel={copy.recordsPerPage}
                                                    triggerClassName={compactSelectTriggerClass}
                                                />
                                            </div>
                                            <button type="button" className="btn-outline !rounded-xl !py-2.5" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>
                                                {copy.previous}
                                            </button>
                                            <button type="button" className="btn-outline !rounded-xl !py-2.5" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>
                                                {copy.next}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {selectedSheet === 'BLACKLIST' ? (
                                    <div className={`border-b px-4 py-3 text-sm ${blacklistConflictCount ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="font-semibold">
                                                {blacklistReferenceLoading
                                                    ? copy.loading
                                                    : `${blacklistConflictCount} ${recipientSheetActionCopy.blacklistConflict}`}
                                            </div>
                                            <div className="text-xs sm:text-sm">
                                                {recipientSheetActionCopy.blacklistConflictHint}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="overflow-x-auto">
                                    <div className="min-w-[1280px]">
                                        <table className="w-full table-fixed divide-y divide-slate-200 text-left text-sm">
                                            <thead className="bg-slate-50 text-slate-600">
                                                <tr>
                                                    <th className="sticky top-0 z-10 w-[44px] bg-slate-50 px-2.5 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={allVisibleSelected}
                                                            onChange={() => toggleAllVisible()}
                                                            onClick={stopRowToggle}
                                                        />
                                                    </th>
                                                    <th className="sticky top-0 z-10 w-[180px] bg-slate-50 px-2.5 py-3">{copy.name}</th>
                                                    <th className="sticky top-0 z-10 w-[180px] bg-slate-50 px-2.5 py-3">{copy.contact}</th>
                                                    <th className="sticky top-0 z-10 w-[260px] bg-slate-50 px-2.5 py-3">{copy.details}</th>
                                                    <th className="sticky top-0 z-10 w-[90px] bg-slate-50 px-2.5 py-3">{copy.status}</th>
                                                    <th className="sticky top-0 z-10 w-[100px] bg-slate-50 px-2.5 py-3">{copy.confirmTitle}</th>
                                                    <th className="sticky top-0 z-10 w-[60px] bg-slate-50 px-2.5 py-3 text-center">{copy.attempts}</th>
                                                    <th className="sticky top-0 z-10 w-[110px] bg-slate-50 px-2.5 py-3">{copy.lastAttempt}</th>
                                                    <th className="sticky top-0 z-10 w-[220px] bg-slate-50 px-2.5 py-3 text-center">{copy.actions}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {recipientsQuery.isLoading ? (
                                                    Array.from({ length: 8 }).map((_, index) => (
                                                        <tr key={`recipient-skeleton-${index}`}>
                                                            <td colSpan={9} className="px-3 py-3">
                                                                <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : recipients.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={9} className="px-4 py-12 text-center text-slate-500">{copy.emptyRecipients}</td>
                                                    </tr>
                                                ) : recipients.map((recipient) => {
                                                    const responseState = getRecipientResponseState(recipient);
                                                    const parsedDelivery = parseRecipientDeliveryDetails(recipient.error_message);
                                                    const deliveryChannels = parsedDelivery?.channels || [];
                                                    const channelDeliveryRows = ([
                                                        deliveryChannels.find((item) => item.channel === 'EMAIL') || null,
                                                        deliveryChannels.find((item) => item.channel === 'WHATSAPP') || null,
                                                    ].filter(Boolean) as ParsedRecipientDelivery['channels']);
                                                    const failedChannelDetails = deliveryChannels
                                                        .filter((item) => item.status === 'FAILED')
                                                        .map((item) => `${getDeliveryChannelLabel(isArabic, item.channel)}: ${item.detail || (isArabic ? 'خطأ غير معروف' : 'Unknown error')}`);
                                                    const statusTitle = failedChannelDetails.join(' | ')
                                                        || channelDeliveryRows.map((item) => `${getDeliveryChannelLabel(isArabic, item.channel)}: ${getDeliveryStateLabel(isArabic, item.status)}`).join(' | ')
                                                        || recipient.error_message
                                                        || undefined;
                                                    const lastAttemptDate = recipient.last_attempt_at ? new Date(recipient.last_attempt_at) : null;
                                                    const responseLabel = responseState === 'confirmed'
                                                        ? copy.confirmedLabels.confirmed
                                                        : responseState === 'declined'
                                                            ? copy.confirmedLabels.declined
                                                            : copy.confirmedLabels.pending;
                                                    const blacklistConflict = selectedSheet === 'BLACKLIST'
                                                        ? blacklistConflictMap.get(recipient.id)
                                                        : undefined;
                                                    const detailsExpanded = expandedRecipientDetailsId === recipient.id;
                                                    const detailItems = RECIPIENT_DETAIL_FIELDS.map(({ key, fallback }) => ({
                                                        key,
                                                        label: fallback,
                                                        value: key === 'room_est1'
                                                            ? (recipient.room_est1 || recipient.room)
                                                            : key === 'preferred_test_center'
                                                                ? (recipient.preferred_test_center || recipient.test_center)
                                                                : recipient[key],
                                                    }));
                                                    const expandedDetailItems = detailItems.filter((item) => (
                                                        item.value
                                                        && item.key !== 'room_est1'
                                                        && item.key !== 'role'
                                                        && item.key !== 'governorate'
                                                        && item.key !== 'name'
                                                        && item.key !== 'arabic_name'
                                                        && item.key !== 'email'
                                                        && item.key !== 'phone'
                                                    ));

                                                    return (
                                                        <tr
                                                            key={recipient.id}
                                                            className={`cursor-pointer transition ${
                                                                blacklistConflict
                                                                    ? 'bg-rose-50/70 hover:bg-rose-100/70'
                                                                    : 'hover:bg-blue-50/60'
                                                            }`}
                                                            onClick={() => toggleRecipient(recipient.id)}
                                                        >
                                                            <td className="px-2.5 py-2 align-top">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedRecipientIds.includes(recipient.id)}
                                                                    onChange={() => toggleRecipient(recipient.id)}
                                                                    onClick={stopRowToggle}
                                                                />
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top">
                                                                <div className="space-y-1">
                                                                    <div className="truncate text-sm font-semibold text-slate-900">{recipient.name || EMPTY_VALUE_LABEL}</div>
                                                                    <div className="truncate text-xs text-slate-500">{recipient.arabic_name || EMPTY_VALUE_LABEL}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top">
                                                                <div className="space-y-1.5 text-xs text-slate-600">
                                                                    <div className="flex items-start gap-2">
                                                                        <Mail size={13} className="mt-0.5 shrink-0 text-slate-400" />
                                                                        <span dir="ltr" className="break-all">{recipient.email || EMPTY_VALUE_LABEL}</span>
                                                                    </div>
                                                                    <div className="flex items-start gap-2">
                                                                        <Phone size={13} className="mt-0.5 shrink-0 text-slate-400" />
                                                                        <span dir="ltr">{recipient.phone || EMPTY_VALUE_LABEL}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top">
                                                                <div className={`rounded-xl border p-3 ${
                                                                    blacklistConflict
                                                                        ? 'border-rose-200 bg-rose-50/80'
                                                                        : 'border-slate-200 bg-slate-50/70'
                                                                }`}>
                                                                    <div className="grid gap-2 sm:grid-cols-3">
                                                                        <div className="rounded-lg bg-white/80 px-2.5 py-2">
                                                                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.roomEst1}</div>
                                                                            <div className="mt-1 truncate text-sm font-medium text-slate-900">{recipient.room_est1 || recipient.room || EMPTY_VALUE_LABEL}</div>
                                                                        </div>
                                                                        <div className="rounded-lg bg-white/80 px-2.5 py-2">
                                                                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.role}</div>
                                                                            <div className="mt-1 truncate text-sm font-medium text-slate-900">{recipient.role || EMPTY_VALUE_LABEL}</div>
                                                                        </div>
                                                                        <div className="rounded-lg bg-white/80 px-2.5 py-2">
                                                                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.governorate}</div>
                                                                            <div className="mt-1 truncate text-sm font-medium text-slate-900">{recipient.governorate || EMPTY_VALUE_LABEL}</div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="mt-2 flex items-center justify-between gap-2" onClick={stopRowToggle}>
                                                                        <div className="truncate text-[11px] text-slate-500">
                                                                            {recipient.type || EMPTY_VALUE_LABEL}
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-50"
                                                                            onClick={() => setExpandedRecipientDetailsId((current) => current === recipient.id ? null : recipient.id)}
                                                                        >
                                                                            {detailsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                            <span>{detailsExpanded ? copy.detailsHideMore : copy.detailsSeeMore}</span>
                                                                        </button>
                                                                    </div>

                                                                    {detailsExpanded ? (
                                                                        <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 sm:grid-cols-2">
                                                                            {expandedDetailItems.length ? expandedDetailItems.map((item) => (
                                                                                <div key={`${recipient.id}-${String(item.key)}`} className="min-w-0">
                                                                                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                                                                        {item.label}
                                                                                    </div>
                                                                                    <div className="mt-1 break-words text-slate-700 [overflow-wrap:anywhere]">
                                                                                        {String(item.value)}
                                                                                    </div>
                                                                                </div>
                                                                            )) : (
                                                                                <div className="sm:col-span-2">{EMPTY_VALUE_LABEL}</div>
                                                                            )}
                                                                        </div>
                                                                    ) : null}

                                                                    {renderBlacklistConflictSummary(blacklistConflict)}
                                                                </div>
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top">
                                                                <div className="space-y-1.5">
                                                                    <span
                                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[recipient.status]}`}
                                                                        title={statusTitle}
                                                                    >
                                                                        <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                                                                        {copy.statusLabels[recipient.status]}
                                                                    </span>
                                                                    {channelDeliveryRows.length ? (
                                                                        <div className="space-y-1">
                                                                            {channelDeliveryRows.map((item) => (
                                                                                <div
                                                                                    key={`${recipient.id}-${item.channel}`}
                                                                                    className={`inline-flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-[10px] font-semibold ${DELIVERY_STATUS_STYLES[item.status]}`}
                                                                                    title={item.detail}
                                                                                >
                                                                                    <span>{getDeliveryChannelLabel(isArabic, item.channel)}</span>
                                                                                    <span>{getDeliveryStateLabel(isArabic, item.status)}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top">
                                                                <div className="space-y-2" onClick={stopRowToggle}>
                                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${CONFIRMATION_STYLES[responseState]}`}>
                                                                        <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                                                                        {responseLabel}
                                                                    </span>
                                                                    {canManageResponses ? (
                                                                        <FormSelect
                                                                            value={responseState === 'confirmed' ? 'CONFIRMED' : responseState === 'declined' ? 'DECLINED' : 'PENDING'}
                                                                            onChange={(nextValue) => updateRecipientResponseMutation.mutate({
                                                                                recipientId: recipient.id,
                                                                                status: nextValue as RecipientResponseValue,
                                                                            })}
                                                                            options={responseStatusOptions}
                                                                            ariaLabel={`${copy.confirmTitle} ${recipient.name}`}
                                                                            triggerClassName={compactSelectTriggerClass}
                                                                        />
                                                                    ) : null}
                                                                </div>
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top text-center text-sm text-slate-700">{recipient.attempts_count ?? 0}</td>
                                                            <td className="px-2.5 py-2 align-top text-xs text-slate-600">
                                                                {lastAttemptDate ? (
                                                                    <div className="space-y-1">
                                                                        <div className="font-medium text-slate-900">{lastAttemptDate.toLocaleDateString()}</div>
                                                                        <div>{lastAttemptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                                    </div>
                                                                ) : (
                                                                    EMPTY_VALUE_LABEL
                                                                )}
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top">
                                                                {renderRecipientActionButtons(recipient)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                            </div>
                        </div>

                        <div className="hidden">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-950 md:text-xl">{copy.recipientsSectionTitle}</h2>
                                <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">{copy.recipientsSectionHint}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 md:px-4 md:py-2 md:text-sm">
                                    {selectedRecipientIds.length} {copy.selectedRowsSummary}
                                </div>
                                <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={() => router.push(`/${locale}/messaging/upload`)}
                                >
                                    <FileSpreadsheet size={16} />
                                    <span>{isArabic ? 'صفحة الرفع' : 'Upload page'}</span>
                                </button>
                                <button type="button" className="btn-primary" onClick={openCreateRecipientForm}>
                                    {copy.addRecipient}
                                </button>
                                <button type="button" className="btn-outline" onClick={() => void exportRecipientsToExcel()}>
                                    <FileSpreadsheet size={16} />
                                    <span>{copy.exportExcel}</span>
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                            <aside className="space-y-3">
                                <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#faf7f1_0%,#f6f2ea_100%)] p-4">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {isArabic ? 'الدورة النشطة' : 'Active cycle'}
                                </div>
                                <FormSelect
                                    value={selectedCycleId}
                                    onChange={(nextValue) => {
                                        setPage(1);
                                        setSelectedRecipientIds([]);
                                        setSelectedCycleId(nextValue);
                                    }}
                                    options={cycleSelectOptions}
                                    ariaLabel={isArabic ? 'الدورة النشطة' : 'Active cycle'}
                                    className="mt-3"
                                />
                                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                    <div className="rounded-[1.15rem] border border-white/70 bg-white/80 px-3 py-2 text-xs text-slate-600">
                                        <div className="font-semibold text-slate-900">{isArabic ? 'المستلمين' : 'Recipients'}</div>
                                        <div className="mt-1">{currentCycle ? currentCycle.recipients_count : totalRecipients}</div>
                                    </div>
                                    <div className="rounded-[1.15rem] border border-white/70 bg-white/80 px-3 py-2 text-xs text-slate-600 sm:col-span-2">
                                        <div className="font-semibold text-slate-900">{isArabic ? 'تم الاستيراد' : 'Imported'}</div>
                                        <div className="mt-1 truncate">{currentCycle ? new Date(currentCycle.created_at).toLocaleString() : (isArabic ? 'كل الدورات' : 'All cycles')}</div>
                                    </div>
                                    <div className="rounded-[1.15rem] border border-white/70 bg-white/80 px-3 py-2 text-xs text-slate-600 sm:col-span-3">
                                        <div className="font-semibold text-slate-900">{isArabic ? 'الملف' : 'File'}</div>
                                        <div className="mt-1 truncate">{currentCycle?.source_file_name || (isArabic ? 'عرض كل الملفات المستوردة' : 'Showing all imported files')}</div>
                                    </div>
                                </div>
                                {currentCycle && (
                                    <button
                                        type="button"
                                        className="btn-danger mt-3 w-full justify-center"
                                        onClick={deleteCycle}
                                        disabled={deleteCycleMutation.isPending}
                                    >
                                        {copy.cycleDelete}
                                    </button>
                                )}
                                </div>

                                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {isArabic ? 'فلاتر المستلمين' : 'Recipient filters'}
                                </div>
                                <div className="mt-3 space-y-3">
                                    <label className="relative block">
                                        <Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            value={filters.search}
                                            onChange={(event) => updateFilter('search', event.target.value)}
                                            className="input w-full !ps-11"
                                            placeholder={copy.searchPlaceholder}
                                        />
                                    </label>

                                    <div className="grid gap-3">
                                    {textRecipientFilterFields.map((field) => (
                                        <input
                                            key={field.key}
                                            value={filters[field.key]}
                                            onChange={(event) => updateFilter(field.key, event.target.value)}
                                            className="input w-full"
                                            placeholder={field.label}
                                        />
                                    ))}
                                    </div>

                                    <FormSelect
                                        value={filters.role}
                                        onChange={(nextValue) => updateFilter('role', nextValue)}
                                        options={roleFilterOptions}
                                        placeholder={copy.role}
                                        ariaLabel={copy.role}
                                    />
                                    <FormSelect
                                        value={filters.type}
                                        onChange={(nextValue) => updateFilter('type', nextValue)}
                                        options={typeFilterOptions}
                                        placeholder={copy.typeLabel}
                                        ariaLabel={copy.typeLabel}
                                    />
                                    <FormSelect
                                        value={filters.governorate}
                                        onChange={(nextValue) => updateFilter('governorate', nextValue)}
                                        options={governorateFilterOptions}
                                        placeholder={copy.governorate}
                                        ariaLabel={copy.governorate}
                                    />
                                    <FormSelect
                                        value={filters.status}
                                        onChange={(nextValue) => updateFilter('status', nextValue)}
                                        options={statusFilterOptions}
                                        placeholder={copy.status}
                                        ariaLabel={copy.status}
                                        className="sm:col-span-2 2xl:col-span-1"
                                    />
                                    <button type="button" className="btn-outline w-full justify-center" onClick={clearFilters}>
                                        <Filter size={16} />
                                        <span>{copy.clearFilters}</span>
                                    </button>
                                </div>
                                </div>
                            </aside>
                            <div className="min-w-0">
                            <div className="mt-5 flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.sheetTabsTitle}</div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {renderRecipientSheetTabs()}
                                            </div>
                                        </div>

                                    <div className="min-w-[220px]">
                                        <label className="mb-2 block text-sm font-medium text-slate-700">{copy.recordsPerPage}</label>
                                        <FormSelect
                                            value={String(pageSize)}
                                            onChange={(nextValue) => {
                                                setPage(1);
                                                setPageSize(parseInt(nextValue, 10));
                                            }}
                                            options={pageSizeOptions}
                                            ariaLabel={copy.recordsPerPage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
                                <div className="max-h-[34rem] overflow-auto">
                                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-600">
                                            <tr>
                                                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">
                                                    <input type="checkbox" checked={allVisibleSelected} onChange={() => toggleAllVisible()} onClick={stopRowToggle} />
                                                </th>
                                                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">{copy.name}</th>
                                                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">{copy.contact}</th>
                                                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">{copy.details}</th>
                                                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">{copy.status}</th>
                                                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">{copy.confirmTitle}</th>
                                                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">{copy.attempts}</th>
                                                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">{copy.lastAttempt}</th>
                                                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">{copy.deliveryDetailsLabel}</th>
                                                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">{copy.actions}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white">
                                            {recipientsQuery.isLoading ? (
                                                Array.from({ length: 6 }).map((_, index) => (
                                                    <tr key={`recipient-skeleton-${index}`}>
                                                        <td colSpan={9} className="px-4 py-4">
                                                            <div className="animate-pulse rounded-[1.25rem] bg-slate-100 px-4 py-5">
                                                                <div className="grid gap-3 md:grid-cols-[0.5fr_1.2fr_1.2fr_1.4fr_0.9fr_0.6fr_0.9fr_1.1fr_0.8fr]">
                                                                    {Array.from({ length: 9 }).map((__, cellIndex) => (
                                                                        <div key={cellIndex} className="h-4 rounded-full bg-slate-200" />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : recipients.length === 0 ? (
                                                <tr>
                                                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">{copy.emptyRecipients}</td>
                                                </tr>
                                            ) : recipients.map((recipient) => {
                                                const responseState = getRecipientResponseState(recipient);
                                                const parsedDelivery = parseRecipientDeliveryDetails(recipient.error_message);
                                                const deliveryChannels = parsedDelivery?.channels || [];
                                                const channelDeliveryRows = ([
                                                    deliveryChannels.find((item) => item.channel === 'EMAIL') || null,
                                                    deliveryChannels.find((item) => item.channel === 'WHATSAPP') || null,
                                                ].filter(Boolean) as ParsedRecipientDelivery['channels']);
                                                const failedChannelDetails = deliveryChannels
                                                    .filter((item) => item.status === 'FAILED')
                                                    .map((item) => `${getDeliveryChannelLabel(isArabic, item.channel)}: ${item.detail || (isArabic ? 'خطأ غير معروف' : 'Unknown error')}`);
                                                const hasStructuredDelivery = channelDeliveryRows.length > 0;
                                                const hasChannelFailures = failedChannelDetails.length > 0;
                                                const fallbackErrorMessage = hasStructuredDelivery ? '' : (recipient.error_message || '');
                                                const detailItems = RECIPIENT_DETAIL_FIELDS.map(({ key, fallback }) => ({
                                                    key,
                                                    label: fallback,
                                                    value: key === 'room_est1'
                                                        ? (recipient.room_est1 || recipient.room)
                                                        : key === 'preferred_test_center'
                                                            ? (recipient.preferred_test_center || recipient.test_center)
                                                            : recipient[key],
                                                }));
                                                const detailsExpanded = expandedRecipientDetailsId === recipient.id;

                                                return (
                                                    <tr
                                                        key={recipient.id}
                                                        className="cursor-pointer transition hover:bg-slate-50/80"
                                                        onClick={() => toggleRecipient(recipient.id)}
                                                    >
                                                        <td className="px-4 py-4 align-top">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedRecipientIds.includes(recipient.id)}
                                                                onChange={() => toggleRecipient(recipient.id)}
                                                                onClick={stopRowToggle}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-4 align-top">
                                                            <div className="min-w-[220px]">
                                                                <div className="font-semibold text-slate-900">{recipient.name || EMPTY_VALUE_LABEL}</div>
                                                                {recipient.arabic_name ? (
                                                                    <div className="mt-1 text-sm text-slate-600">{recipient.arabic_name}</div>
                                                                ) : (
                                                                    <div className="mt-1 text-sm text-slate-400">{EMPTY_VALUE_LABEL}</div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 align-top">
                                                            <div className="min-w-[220px] space-y-2 text-sm text-slate-700">
                                                                <div className="flex items-start gap-2">
                                                                    <Mail size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                                                    <span dir="ltr" className="break-all">{recipient.email || EMPTY_VALUE_LABEL}</span>
                                                                </div>
                                                                <div className="flex items-start gap-2">
                                                                    <Phone size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                                                    <span dir="ltr">{recipient.phone || EMPTY_VALUE_LABEL}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 align-top">
                                                            <div className="min-w-[280px] space-y-1 text-xs text-slate-600">
                                                                <div><strong>{copy.roomEst1}:</strong> {recipient.room_est1 || recipient.room || EMPTY_VALUE_LABEL}</div>
                                                                <div><strong>{copy.role}:</strong> {recipient.role || EMPTY_VALUE_LABEL}</div>
                                                                <div><strong>{copy.typeLabel}:</strong> {recipient.type || EMPTY_VALUE_LABEL}</div>
                                                                <div><strong>{copy.governorate}:</strong> {recipient.governorate || EMPTY_VALUE_LABEL}</div>
                                                                <div className="pt-2">
                                                                    <button
                                                                        type="button"
                                                                        className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                                                                        onClick={(event) => {
                                                                            stopRowToggle(event);
                                                                            setExpandedRecipientDetailsId((current) => current === recipient.id ? null : recipient.id);
                                                                        }}
                                                                    >
                                                                        {detailsExpanded ? copy.detailsHideMore : copy.detailsSeeMore}
                                                                    </button>
                                                                    {detailsExpanded ? (
                                                                        <div className="mt-3 space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                                                            {detailItems.map((item) => (
                                                                                <div key={String(item.key)}>
                                                                                    <strong>{item.label}:</strong> {item.value ? String(item.value) : EMPTY_VALUE_LABEL}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 align-top">
                                                            <div className="min-w-[190px] space-y-2">
                                                                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[recipient.status]}`}>
                                                                    <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                                                                    {copy.statusLabels[recipient.status]}
                                                                </span>
                                                                {channelDeliveryRows.length ? (
                                                                    <div className="flex flex-col gap-1.5">
                                                                        {channelDeliveryRows.map((item) => (
                                                                            <span
                                                                                key={item.channel}
                                                                                className={`inline-flex items-center gap-2 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold ${DELIVERY_STATUS_STYLES[item.status]}`}
                                                                                title={item.detail || ''}
                                                                            >
                                                                                <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                                                                                {getDeliveryChannelLabel(isArabic, item.channel)}: {getDeliveryStateLabel(isArabic, item.status)}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 align-top">
                                                            <div className="min-w-[170px] space-y-3">
                                                                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${CONFIRMATION_STYLES[responseState]}`}>
                                                                    <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                                                                    {responseState === 'confirmed'
                                                                        ? copy.confirmedLabels.confirmed
                                                                        : responseState === 'declined'
                                                                            ? copy.confirmedLabels.declined
                                                                            : copy.confirmedLabels.pending}
                                                                </span>
                                                                {canManageResponses ? (
                                                                    <div onClick={stopRowToggle}>
                                                                        <FormSelect
                                                                            value={responseState === 'confirmed' ? 'CONFIRMED' : responseState === 'declined' ? 'DECLINED' : 'PENDING'}
                                                                            onChange={(nextValue) => updateRecipientResponseMutation.mutate({
                                                                                recipientId: recipient.id,
                                                                                status: nextValue as RecipientResponseValue,
                                                                            })}
                                                                            options={responseStatusOptions}
                                                                            ariaLabel={`${copy.confirmTitle} ${recipient.name}`}
                                                                        />
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 align-top text-slate-700">{recipient.attempts_count ?? 0}</td>
                                                        <td className="px-4 py-4 align-top text-slate-700">
                                                            {recipient.last_attempt_at ? new Date(recipient.last_attempt_at).toLocaleString() : EMPTY_VALUE_LABEL}
                                                        </td>
                                                        <td className={`max-w-[320px] px-4 py-4 align-top text-xs leading-5 ${hasChannelFailures || fallbackErrorMessage ? 'text-rose-700' : 'text-slate-500'}`}>
                                                            {hasChannelFailures ? (
                                                                <div className="space-y-1">
                                                                    {failedChannelDetails.map((line) => (
                                                                        <div key={line} className="break-words [overflow-wrap:anywhere]">
                                                                            {line}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : fallbackErrorMessage ? (
                                                                <div className="break-words [overflow-wrap:anywhere]">{fallbackErrorMessage}</div>
                                                            ) : hasStructuredDelivery ? (
                                                                <div>{isArabic ? 'لا توجد أخطاء في القنوات.' : 'No channel errors.'}</div>
                                                            ) : (
                                                                <div>{EMPTY_VALUE_LABEL}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 align-top">
                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="btn-outline"
                                                                    onClick={(event) => {
                                                                        stopRowToggle(event);
                                                                        openEditRecipientForm(recipient);
                                                                    }}
                                                                >
                                                                    {copy.edit}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn-outline border-rose-200 text-rose-700 hover:bg-rose-50"
                                                                    onClick={(event) => {
                                                                        stopRowToggle(event);
                                                                        deleteRecipient(recipient.id);
                                                                    }}
                                                                    disabled={deleteRecipientMutation.isPending}
                                                                >
                                                                    {copy.delete}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm text-slate-500">
                                    {copy.showing} {visibleRangeStart}-{visibleRangeEnd} {copy.of} {totalRecipients}
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" className="btn-outline" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>
                                        {copy.previous}
                                    </button>
                                    <button type="button" className="btn-outline" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>
                                        {copy.next}
                                    </button>
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>

                    <RecipientFormModal
                        isOpen={isRecipientFormOpen}
                        mode={editingRecipientId ? 'edit' : 'add'}
                        form={recipientForm}
                        errors={recipientFormErrors}
                        isSaving={saveRecipientMutation.isPending}
                        onChange={updateRecipientForm}
                        onClose={closeRecipientForm}
                        onSubmit={saveRecipient}
                        copy={{
                            cancelEdit: copy.cancelEdit,
                            createRecipientTitle: copy.createRecipientTitle,
                            editRecipientTitle: copy.editRecipientTitle,
                            recipientFormHint: copy.recipientFormHint,
                            saveRecipient: copy.saveRecipient,
                        }}
                    />
                    {spareAssignmentRecipient ? (
                        <div className="fixed inset-0 z-[92] flex items-center justify-center p-4 md:p-6">
                            <button
                                type="button"
                                className="overlay-backdrop absolute inset-0"
                                aria-label={copy.cancelEdit}
                                onClick={() => setSpareAssignmentRecipient(null)}
                            />
                            <div className="modal-shell relative z-10 w-full max-w-3xl rounded-[2rem] p-5 md:p-6">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-950">{recipientSheetActionCopy.reassignSpareTitle}</h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-500">{recipientSheetActionCopy.reassignSpareHint}</p>
                                    </div>
                                    <button type="button" className="btn-outline" onClick={() => setSpareAssignmentRecipient(null)}>
                                        {copy.cancelEdit}
                                    </button>
                                </div>

                                <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.name}</div>
                                    <div className="mt-2 text-base font-semibold text-slate-950">{spareAssignmentRecipient.name}</div>
                                    <div className="mt-1 text-sm text-slate-500">{spareAssignmentRecipient.phone || spareAssignmentRecipient.email || EMPTY_VALUE_LABEL}</div>
                                </div>

                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">{recipientSheetActionCopy.targetSheet}</label>
                                        <FormSelect
                                            value={spareAssignmentTargetSheet}
                                            onChange={(nextValue) => setSpareAssignmentTargetSheet(nextValue as ReassignTargetSheet)}
                                            options={reassignTargetSheetOptions}
                                            ariaLabel={recipientSheetActionCopy.targetSheet}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">{recipientSheetActionCopy.targetBuilding}</label>
                                        <FormSelect
                                            value={spareAssignmentBuilding}
                                            onChange={setSpareAssignmentBuilding}
                                            options={spareAssignmentBuildingOptions}
                                            ariaLabel={recipientSheetActionCopy.targetBuilding}
                                            disabled={!spareAssignmentBuildingOptions.length}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">{recipientSheetActionCopy.targetFloor}</label>
                                        <FormSelect
                                            value={spareAssignmentFloor}
                                            onChange={setSpareAssignmentFloor}
                                            options={spareAssignmentFloorOptions}
                                            ariaLabel={recipientSheetActionCopy.targetFloor}
                                            disabled={!spareAssignmentFloorOptions.length}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">{recipientSheetActionCopy.targetRoom}</label>
                                        <FormSelect
                                            value={spareAssignmentRoomKey}
                                            onChange={setSpareAssignmentRoomKey}
                                            options={spareAssignmentRoomOptions}
                                            ariaLabel={recipientSheetActionCopy.targetRoom}
                                            disabled={!spareAssignmentRoomOptions.length}
                                        />
                                    </div>
                                </div>

                                {!spareAssignmentLoading && !spareAssignmentOptions.length ? (
                                    <div className="mt-5 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                        {recipientSheetActionCopy.noAssignmentSlots}
                                    </div>
                                ) : null}

                                {selectedSpareAssignmentOption ? (
                                    <div className="mt-5 rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.preview}</div>
                                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{recipientSheetActionCopy.targetBuilding}</div>
                                                <div className="mt-1 font-semibold text-slate-900">{selectedSpareAssignmentOption.building}</div>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{recipientSheetActionCopy.targetFloor}</div>
                                                <div className="mt-1 font-semibold text-slate-900">{formatRecipientFloorLabel(selectedSpareAssignmentOption.floorKey, isArabic)}</div>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{recipientSheetActionCopy.targetRoom}</div>
                                                <div className="mt-1 font-semibold text-slate-900">{selectedSpareAssignmentOption.room}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={confirmSpareAssignment}
                                        disabled={spareAssignmentLoading || moveRecipientMutation.isPending || !selectedSpareAssignmentTemplate}
                                    >
                                        {recipientSheetActionCopy.confirmMove}
                                    </button>
                                    <button type="button" className="btn-outline" onClick={() => setSpareAssignmentRecipient(null)}>
                                        {copy.cancelEdit}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                    {spareSwapRecipient ? (
                        <div className="fixed inset-0 z-[92] flex items-center justify-center p-4 md:p-6">
                            <button
                                type="button"
                                className="overlay-backdrop absolute inset-0"
                                aria-label={copy.cancelEdit}
                                onClick={() => {
                                    setSpareSwapRecipient(null);
                                    setSpareSwapPhone('');
                                }}
                            />
                            <div className="modal-shell relative z-10 w-full max-w-2xl rounded-[2rem] p-5 md:p-6">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-950">{recipientSheetActionUxCopy.swapSpareTitle}</h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-500">{recipientSheetActionUxCopy.swapSpareHint}</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-outline"
                                        onClick={() => {
                                            setSpareSwapRecipient(null);
                                            setSpareSwapPhone('');
                                        }}
                                    >
                                        {copy.cancelEdit}
                                    </button>
                                </div>

                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.name}</div>
                                        <div className="mt-2 text-base font-semibold text-slate-950">{spareSwapRecipient.name}</div>
                                        <div className="mt-1 text-sm text-slate-500">{spareSwapRecipient.phone || spareSwapRecipient.email || EMPTY_VALUE_LABEL}</div>
                                    </div>
                                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{recipientSheetActionUxCopy.currentSlot}</div>
                                        <div className="mt-2 text-base font-semibold text-slate-950">{spareSwapRecipient.room_est1 || spareSwapRecipient.room || EMPTY_VALUE_LABEL}</div>
                                        <div className="mt-1 text-sm text-slate-600">
                                            {[spareSwapRecipient.building, spareSwapRecipient.division].filter(Boolean).join(' • ') || EMPTY_VALUE_LABEL}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <label className="mb-2 block text-sm font-medium text-slate-700">{recipientSheetActionUxCopy.sparePhone}</label>
                                    <input
                                        value={spareSwapPhone}
                                        onChange={(event) => setSpareSwapPhone(event.target.value)}
                                        className="input w-full !min-h-[2.75rem] !rounded-xl !px-3 !py-2 text-sm"
                                        placeholder={recipientSheetActionUxCopy.sparePhonePlaceholder}
                                    />
                                </div>

                                {spareSwapPhone.trim() ? (
                                    matchedSpareSwapRecipient ? (
                                        <div className="mt-5 rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                                            <div className="font-semibold">{recipientSheetActionUxCopy.spareMatchPreview}</div>
                                            <div className="mt-2">{matchedSpareSwapRecipient.name}</div>
                                            <div className="mt-1 text-emerald-800">{matchedSpareSwapRecipient.phone || matchedSpareSwapRecipient.email || EMPTY_VALUE_LABEL}</div>
                                            <div className="mt-3 text-xs text-emerald-800">
                                                {recipientSheetActionUxCopy.currentSlot}: {spareSwapRecipient.room_est1 || spareSwapRecipient.room || EMPTY_VALUE_LABEL}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-5 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                            {recipientSheetActionUxCopy.spareNoMatch}
                                        </div>
                                    )
                                ) : null}

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={confirmSpareSwap}
                                        disabled={!matchedSpareSwapRecipient || swapRecipientWithSpareMutation.isPending}
                                    >
                                        {recipientSheetActionUxCopy.confirmSwap}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-outline"
                                        onClick={() => {
                                            setSpareSwapRecipient(null);
                                            setSpareSwapPhone('');
                                        }}
                                    >
                                        {copy.cancelEdit}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                    <ConfirmDialog
                        open={Boolean(deleteConfirmState)}
                        title={
                            deleteConfirmState?.type === 'cycle'
                                ? (isArabic ? 'تأكيد حذف الدورة' : 'Confirm cycle deletion')
                                : (isArabic ? 'تأكيد حذف الصف' : 'Confirm row deletion')
                        }
                        description={
                            deleteConfirmState?.type === 'cycle'
                                ? copy.cycleDeleteConfirm
                                : copy.recipientDeleteConfirm
                        }
                        confirmLabel={copy.delete}
                        cancelLabel={isArabic ? 'إلغاء' : 'Cancel'}
                        destructive
                        isLoading={deleteRecipientMutation.isPending || deleteCycleMutation.isPending}
                        onCancel={() => setDeleteConfirmState(null)}
                        onConfirm={confirmDeleteAction}
                    />

                    {selectedRecipientIds.length > 0 && (
                        <div className="sticky bottom-4 z-20">
                            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-emerald-200 bg-white/95 px-5 py-4 shadow-xl shadow-slate-900/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm font-semibold text-slate-900">
                                    {selectedRecipientIds.length} {copy.selectedRowsSummary}
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <button type="button" className="btn-primary" onClick={() => updateTab('campaign')}>
                                        {copy.sendNow}
                                    </button>
                                    <button type="button" className="btn-outline" onClick={() => setSelectedRecipientIds([])}>
                                        {copy.deselectAll}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                </div>
            )}

            {activeTab === 'templates' && (
                <div className="space-y-6">
                    <div className={cardClass}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                                    <SquarePen size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-950">{copy.tabs.templates}</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{copy.templatesHint}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button type="button" className="btn-primary" onClick={openTemplateComposer}>
                                    {isArabic ? 'إضافة قالب' : 'Add template'}
                                </button>
                            </div>
                        </div>

                        {isTemplateComposerOpen && (
                            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 md:p-6">
                                <button
                                    type="button"
                                    className="overlay-backdrop absolute inset-0"
                                    aria-label={copy.cancelEdit}
                                    onClick={closeTemplateComposer}
                                />
                                <div className="modal-shell relative z-10 max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] p-5 md:p-6">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-950">
                                            {editingTemplateId ? copy.updateTemplate : (isArabic ? 'إضافة قالب جديد' : 'Create a new template')}
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            {isArabic ? 'اكتب القالب هنا ثم احفظه لاستخدامه مباشرة في الحملات.' : 'Build the template here, then save it to use it directly in campaigns.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                                    <div className="space-y-4">
                                        <div className="template-hero rounded-[1.6rem] border border-slate-200 p-4 md:p-5">
                                            <div className="flex flex-col gap-4">
                                                <div>
                                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                        {isArabic ? 'قوالب EST الرسمية' : 'Official EST presets'}
                                                    </div>
                                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                                        {isArabic
                                                            ? 'حمّل أحد القوالب الأربعة الرسمية، ثم عدّل اليوم والتاريخ ووقت الحضور من المحرر المبسط.'
                                                            : 'Load one of the 4 official EST templates, then adjust day, date, and arrival time from the guided editor.'}
                                                    </p>
                                                </div>
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    {EXAM_ASSIGNMENT_TEMPLATE_PRESETS.map((preset) => (
                                                        <button
                                                            key={preset.id}
                                                            type="button"
                                                            onClick={() => applyTemplatePreset(preset.id)}
                                                            className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4 text-start transition hover:border-slate-300 hover:shadow-sm"
                                                        >
                                                            <div className="text-sm font-semibold text-slate-900">{preset.name}</div>
                                                            <div className="mt-1 text-xs leading-5 text-slate-500">{preset.description}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {guidedTemplateForm ? (
                                            <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4 md:p-5">
                                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                    <div>
                                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                                                            {isArabic ? 'محرر EST المبسط' : 'Guided EST editor'}
                                                        </div>
                                                        <p className="mt-2 text-sm leading-6 text-amber-900">
                                                            {isArabic
                                                                ? 'اليوم والتاريخ ووقت الحضور هم أكثر عناصر مهمة للتعديل. غيرهم من هنا مباشرة والقالب هيتبني تلقائياً.'
                                                                : 'Day, date, and arrival time are the main fields to adjust. Update them here and the template rebuilds automatically.'}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn-outline"
                                                        onClick={() => setIsAdvancedTemplateEditorOpen((current) => !current)}
                                                    >
                                                        {isAdvancedTemplateEditorOpen
                                                            ? (isArabic ? 'إخفاء HTML المتقدم' : 'Hide advanced HTML')
                                                            : (isArabic ? 'إظهار HTML المتقدم' : 'Show advanced HTML')}
                                                    </button>
                                                </div>

                                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                    <div>
                                                        <label className="mb-2 block text-sm font-medium text-amber-950">{isArabic ? 'يوم الامتحان' : 'Exam day'}</label>
                                                        <input
                                                            value={guidedTemplateForm.examDay}
                                                            onChange={(event) => setGuidedTemplateForm((current: EstGuidedTemplateConfig | null) => current ? { ...current, examDay: event.target.value } : current)}
                                                            className="input w-full bg-white"
                                                            placeholder={isArabic ? 'مثال: Friday' : 'e.g. Friday'}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-2 block text-sm font-medium text-amber-950">{isArabic ? 'التاريخ الكامل' : 'Full date'}</label>
                                                        <input
                                                            value={guidedTemplateForm.examDate}
                                                            onChange={(event) => setGuidedTemplateForm((current: EstGuidedTemplateConfig | null) => current ? { ...current, examDate: event.target.value } : current)}
                                                            className="input w-full bg-white"
                                                            placeholder={isArabic ? 'مثال: 15th of May 2026' : 'e.g. 15th of May 2026'}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-2 block text-sm font-medium text-amber-950">{isArabic ? 'وقت الحضور' : 'Arrival time'}</label>
                                                        <input
                                                            value={guidedTemplateForm.arrivalTime}
                                                            onChange={(event) => setGuidedTemplateForm((current: EstGuidedTemplateConfig | null) => current ? { ...current, arrivalTime: event.target.value } : current)}
                                                            className="input w-full bg-white"
                                                            placeholder={isArabic ? 'مثال: 8:00 AM' : 'e.g. 8:00 AM'}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-2 block text-sm font-medium text-amber-950">{isArabic ? 'نوع القالب' : 'Template mode'}</label>
                                                        <div className="rounded-[1rem] border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900">
                                                            {guidedTemplateForm.variant === 'CONFIRMATION'
                                                                ? (isArabic ? 'بزرار تأكيد واعتذار' : 'With confirmation buttons')
                                                                : (isArabic ? 'بدون زرار' : 'Without buttons')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}

                                        <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 md:p-5">
                                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                <div>
                                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                        {isArabic ? 'المتغيرات الجاهزة' : 'Template variables'}
                                                    </div>
                                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                                        {isArabic
                                                            ? 'اضغط على أي متغير لإدراجه داخل العنوان أو الـ HTML حسب آخر حقل قمت بالكتابة فيه.'
                                                            : 'Click any variable to insert it into the subject or HTML editor based on the last field you focused.'}
                                                    </p>
                                                </div>
                                                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                                    {activeTemplateField === 'subject'
                                                        ? (isArabic ? 'الإدراج الحالي: العنوان' : 'Inserting into: Subject')
                                                        : (isArabic ? 'الإدراج الحالي: نص التيمبلت' : 'Inserting into: Body')}
                                                </div>
                                            </div>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {TEMPLATE_EDITOR_VARIABLES.map((variable) => (
                                                    <button
                                                        key={variable.token}
                                                        type="button"
                                                        onClick={() => insertTemplateVariable(variable.token)}
                                                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                                                    >
                                                        {variable.label}: {variable.token}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <input
                                            value={templateForm.name}
                                            onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))}
                                            className="input w-full"
                                            placeholder={copy.templateName}
                                        />
                                        {!guidedTemplateForm || isAdvancedTemplateEditorOpen ? (
                                            <>
                                        <FormSelect
                                            value={templateForm.type}
                                            onChange={(nextValue) => setTemplateForm((current) => ({ ...current, type: nextValue as TemplateType }))}
                                            options={templateTypeOptions}
                                            ariaLabel={copy.templateType}
                                        />
                                        <input
                                            ref={subjectInputRef}
                                            value={templateForm.subject}
                                            onChange={(event) => setTemplateForm((current) => ({ ...current, subject: event.target.value }))}
                                            onFocus={() => setActiveTemplateField('subject')}
                                            className="input w-full"
                                            placeholder={copy.templateSubject}
                                        />
                                        <textarea
                                            ref={bodyTextareaRef}
                                            rows={18}
                                            value={templateForm.body}
                                            onChange={(event) => setTemplateForm((current) => ({ ...current, body: event.target.value }))}
                                            onFocus={() => setActiveTemplateField('body')}
                                            className="textarea w-full"
                                            placeholder={copy.templateBody}
                                        />
                                        <div className="rounded-[1.35rem] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm leading-6 text-cyan-900">
                                            {isArabic
                                                ? (guidedTemplateForm
                                                    ? 'أنت في وضع HTML المتقدم. أي تعديل هنا سيكون يدويًا على التيمبلت.'
                                                    : 'تقدر تكتب HTML كامل داخل نص التيمبلت. الإيميل هيتبعت بنفس التصميم، ولو القناة Email + WhatsApp فالواتساب هيستقبل نسخة نصية نظيفة تلقائيًا.')
                                                : (guidedTemplateForm
                                                    ? 'You are in advanced HTML mode. Edits here are manual changes to the template markup.'
                                                    : 'You can author full HTML inside the template body. Email will keep the rich layout, and if the template is Email + WhatsApp, WhatsApp will receive a clean text fallback automatically.')}
                                        </div>
                                            </>
                                        ) : (
                                            <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                                                {isArabic
                                                    ? 'القالب يتبني تلقائيًا من المحرر المبسط. استخدم زر "إظهار HTML المتقدم" إذا حبيت تعدل الكود يدويًا.'
                                                    : 'This template is currently generated from the guided editor. Use "Show advanced HTML" only if you want manual code editing.'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-5">
                                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.preview}</div>
                                        <div className="space-y-3">
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${CHANNEL_STYLES[templateForm.type]}`}>
                                                {copy.templateTypeLabels[templateForm.type]}
                                            </span>
                                            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                    {isArabic ? 'العنوان بعد استبدال المتغيرات' : 'Rendered subject'}
                                                </div>
                                                <div className="mt-2 text-base font-semibold text-slate-900">
                                                    {templateComposerSubjectPreview || copy.templateSubject}
                                                </div>
                                            </div>

                                            {guidedTemplateForm ? (
                                                <div className="grid gap-3 md:grid-cols-3">
                                                    <div className="rounded-[1.15rem] border border-amber-200 bg-amber-50 px-4 py-3">
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">{isArabic ? 'اليوم' : 'Day'}</div>
                                                        <div className="mt-2 text-sm font-semibold text-slate-900">{guidedTemplateForm.examDay}</div>
                                                    </div>
                                                    <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3">
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{isArabic ? 'التاريخ' : 'Date'}</div>
                                                        <div className="mt-2 text-sm font-semibold text-slate-900">{guidedTemplateForm.examDate}</div>
                                                    </div>
                                                    <div className="rounded-[1.15rem] border border-slate-900 bg-slate-900 px-4 py-3">
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">{isArabic ? 'الوقت' : 'Time'}</div>
                                                        <div className="mt-2 text-sm font-semibold text-amber-300">{guidedTemplateForm.arrivalTime}</div>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {isHtmlTemplateBody(templateForm.body) && templateForm.type !== 'WHATSAPP' ? (
                                                <div className="template-preview-shell rounded-[1.6rem] p-3">
                                                    <div className="template-preview-email-shell overflow-hidden rounded-[1.35rem]">
                                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-xs text-slate-500">
                                                            <span>{isArabic ? 'معاينة بريد حقيقية' : 'Rendered email preview'}</span>
                                                            <span>{TEMPLATE_PREVIEW_RECIPIENT.email}</span>
                                                        </div>
                                                        <iframe
                                                            title="Template email preview"
                                                            className="h-[560px] w-full bg-white"
                                                            sandbox=""
                                                            srcDoc={templateComposerPreviewDocument}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                                                    <div className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                                        {renderTemplateTokens(templateForm.body, TEMPLATE_PREVIEW_RECIPIENT) || copy.templateBody}
                                                    </div>
                                                </div>
                                            )}

                                            {templateForm.type !== 'EMAIL'
                                                ? renderWhatsAppDeliveryPreview(
                                                    templateComposerWhatsAppModel,
                                                    isArabic ? 'معاينة واتساب' : 'WhatsApp preview',
                                                )
                                                : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <button type="button" className="btn-primary" onClick={saveTemplate} disabled={saveTemplateMutation.isPending}>
                                        {editingTemplateId ? copy.updateTemplate : copy.createTemplate}
                                    </button>
                                    <button type="button" className="btn-outline" onClick={closeTemplateComposer}>
                                        {copy.cancelEdit}
                                    </button>
                                </div>
                                </div>
                            </div>
                        )}
                    </div>

                    

                    <div className="space-y-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <h2 className="text-xl font-semibold text-slate-950">{copy.templatesTitle}</h2>
                            <label className="relative block w-full lg:max-w-sm">
                                <Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    value={templateSearch}
                                    onChange={(event) => setTemplateSearch(event.target.value)}
                                    className="input w-full !ps-11"
                                    placeholder={copy.templateSearchPlaceholder}
                                />
                            </label>
                        </div>
                        <div className="space-y-4">
                            {templatesQuery.isLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 3 }).map((_, index) => (
                                        <div key={`template-skeleton-${index}`} className="animate-pulse rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                                <div className="space-y-3">
                                                    <div className="h-5 w-40 rounded-full bg-slate-200" />
                                                    <div className="h-4 w-64 rounded-full bg-slate-200" />
                                                    <div className="h-4 w-80 rounded-full bg-slate-200" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="h-10 w-24 rounded-full bg-slate-200" />
                                                    <div className="h-10 w-24 rounded-full bg-slate-200" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredTemplates.length ? filteredTemplates.map((template) => {
                                const renderedSubject = renderTemplateTokens(template.subject, TEMPLATE_PREVIEW_RECIPIENT);
                                const summaryText = buildWhatsAppPreviewText(template.body, TEMPLATE_PREVIEW_RECIPIENT);
                                const whatsAppPreviewText = template.type !== 'EMAIL'
                                    ? buildWhatsAppPreviewText(template.body, TEMPLATE_PREVIEW_RECIPIENT)
                                    : '';
                                const whatsAppPreview = buildWhatsAppPreviewModel(whatsAppPreviewText);
                                const hasResponseLink = whatsAppPreview.links.length >= 1;

                                return (
                                    <div key={template.id} className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50/70 p-5 transition hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                            <div className="min-w-0 flex-1 space-y-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-lg font-semibold text-slate-950">{template.name}</h3>
                                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${CHANNEL_STYLES[template.type]}`}>
                                                        {copy.templateTypeLabels[template.type]}
                                                    </span>
                                                    {isHtmlTemplateBody(template.body) && template.type !== 'WHATSAPP' ? (
                                                        <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                                            {isArabic ? 'HTML فاخر' : 'Luxury HTML'}
                                                        </span>
                                                    ) : null}
                                                    {hasResponseLink ? (
                                                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                            {isArabic ? 'رابط الرد جاهز' : 'Response link ready'}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.95fr)]">
                                                    <div className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4">
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                            {isArabic ? 'تجربة الإيميل' : 'Email experience'}
                                                        </div>
                                                        <p className="mt-2 text-sm font-semibold text-slate-800">{renderedSubject}</p>
                                                        <p className="mt-3 text-sm leading-6 text-slate-500">
                                                            {summarizeText(summaryText || copy.templateBody, 260)}
                                                        </p>
                                                    </div>
                                                    <div className={`rounded-[1.25rem] border p-4 ${template.type === 'EMAIL' ? 'border-slate-200 bg-slate-50' : 'border-emerald-200 bg-emerald-50/70'}`}>
                                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                                            <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${template.type === 'EMAIL' ? 'text-slate-500' : 'text-emerald-700'}`}>
                                                                {template.type === 'EMAIL'
                                                                    ? (isArabic ? 'واتساب غير مفعّل' : 'WhatsApp disabled')
                                                                    : (isArabic ? 'شكل الرسالة على واتساب' : 'WhatsApp delivery')}
                                                            </div>
                                                            {template.type !== 'EMAIL' ? (
                                                                <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-emerald-800">
                                                                    <Phone size={12} />
                                                                    {TEMPLATE_PREVIEW_RECIPIENT.phone}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <div className="mt-3">
                                                            {template.type === 'EMAIL' ? (
                                                                <p className="text-sm leading-6 text-slate-500">
                                                                    {isArabic ? 'هذا القالب مخصص للإيميل فقط.' : 'This template is configured for email only.'}
                                                                </p>
                                                            ) : (
                                                                <>
                                                                    <p className="text-sm leading-6 text-emerald-950">
                                                                        {summarizeText(whatsAppPreview.message || whatsAppPreviewText || copy.templateBody, 220)}
                                                                    </p>
                                                                    {whatsAppPreview.links.length ? (
                                                                        <div className="mt-4 flex flex-wrap gap-2">
                                                                            {whatsAppPreview.links.slice(0, 3).map((link) => (
                                                                                <a
                                                                                    key={`${template.id}-${link.label}`}
                                                                                    href={link.href}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:border-emerald-300"
                                                                                >
                                                                                    {link.label}
                                                                                </a>
                                                                            ))}
                                                                        </div>
                                                                    ) : null}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex w-full flex-col gap-2 xl:w-[190px]">
                                                <button type="button" className="btn-outline w-full justify-center" onClick={() => beginEditTemplate(template)}>
                                                    {copy.edit}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-secondary w-full justify-center"
                                                    onClick={() => {
                                                        setCampaignTemplateId(template.id);
                                                        updateTab('campaign');
                                                    }}
                                                >
                                                    {copy.useForCampaign}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-danger w-full justify-center"
                                                    onClick={() => deleteTemplateMutation.mutate(template.id)}
                                                    disabled={deleteTemplateMutation.isPending}
                                                >
                                                    {copy.delete}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                                    <div>{templateSearch.trim() ? copy.noTemplateMatches : copy.noTemplates}</div>
                                    {!templateSearch.trim() && (
                                        <div className="mt-4">
                                            <button type="button" className="btn-outline" onClick={openTemplateComposer}>
                                                {isArabic ? 'ابدأ بإضافة قالب' : 'Create your first template'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'campaign' && (
                <div className="space-y-4">
                    {mobileFiltersOpen ? (
                        <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden">
                            <button
                                type="button"
                                className="absolute inset-0"
                                aria-label={isArabic ? 'إغلاق الفلاتر' : 'Close filters'}
                                onClick={() => setMobileFiltersOpen(false)}
                            />
                            <div className={`absolute inset-y-0 ${isArabic ? 'right-0' : 'left-0'} w-[min(90vw,320px)] p-3`}>
                                {renderRecipientFiltersPanel(true)}
                            </div>
                        </div>
                    ) : null}
                    <div className="hidden">
                        {isDesktopFiltersVisible ? (
                            <aside className="hidden min-w-[240px] lg:block">
                                {renderRecipientFiltersPanel()}
                            </aside>
                        ) : null}

                        <div className="min-w-0">
                            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
                                <div className="border-b border-slate-200 px-4 py-3">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex min-w-0 items-center gap-3 overflow-x-auto pb-1">
                                            <button
                                                type="button"
                                                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 lg:hidden"
                                                onClick={() => setMobileFiltersOpen(true)}
                                            >
                                                <Filter size={16} />
                                                <span>{isArabic ? 'الفلاتر' : 'Filters'}</span>
                                            </button>
                                            {!isDesktopFiltersVisible ? (
                                                <button
                                                    type="button"
                                                    className="hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 lg:inline-flex"
                                                    onClick={() => setDesktopFiltersCollapsed(false)}
                                                >
                                                    {isArabic ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                                                    <span>{isArabic ? 'إظهار الفلاتر' : 'Show filters'}</span>
                                                </button>
                                            ) : null}

                                            {renderRecipientSheetTabs()}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                                                {selectedRecipientIds.length} {copy.selectedRowsSummary}
                                            </div>
                                            <button type="button" className="btn-outline !rounded-xl !py-2.5" onClick={() => void exportRecipientsToExcel()}>
                                                <FileSpreadsheet size={16} />
                                                <span>{copy.exportExcel}</span>
                                            </button>
                                            <button type="button" className="btn-primary !rounded-xl !py-2.5" onClick={openCreateRecipientForm}>
                                                <Plus size={16} />
                                                <span>{copy.addRecipient}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <div className="min-w-[1160px]">
                                        <table className="w-full table-fixed divide-y divide-slate-200 text-left text-sm">
                                            <thead className="bg-slate-50 text-slate-600">
                                                <tr>
                                                    <th className="sticky top-0 z-10 w-[44px] bg-slate-50 px-2.5 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={allVisibleSelected}
                                                            onChange={() => toggleAllVisible()}
                                                            onClick={stopRowToggle}
                                                        />
                                                    </th>
                                                    <th className="sticky top-0 z-10 w-[180px] bg-slate-50 px-2.5 py-3">{copy.name}</th>
                                                    <th className="sticky top-0 z-10 w-[180px] bg-slate-50 px-2.5 py-3">{copy.contact}</th>
                                                    <th className="sticky top-0 z-10 w-[60px] bg-slate-50 px-2.5 py-3 text-center">{copy.roomEst1}</th>
                                                    <th className="sticky top-0 z-10 w-[100px] bg-slate-50 px-2.5 py-3">{copy.role}</th>
                                                    <th className="sticky top-0 z-10 w-[100px] bg-slate-50 px-2.5 py-3">{copy.governorate}</th>
                                                    <th className="sticky top-0 z-10 w-[90px] bg-slate-50 px-2.5 py-3">{copy.status}</th>
                                                    <th className="sticky top-0 z-10 w-[100px] bg-slate-50 px-2.5 py-3">{copy.confirmTitle}</th>
                                                    <th className="sticky top-0 z-10 w-[60px] bg-slate-50 px-2.5 py-3 text-center">{copy.attempts}</th>
                                                    <th className="sticky top-0 z-10 w-[110px] bg-slate-50 px-2.5 py-3">{copy.lastAttempt}</th>
                                                    <th className="sticky top-0 z-10 w-[90px] bg-slate-50 px-2.5 py-3 text-center">{copy.actions}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {recipientsQuery.isLoading ? (
                                                    Array.from({ length: 8 }).map((_, index) => (
                                                        <tr key={`recipient-skeleton-${index}`}>
                                                            <td colSpan={11} className="px-3 py-3">
                                                                <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : recipients.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={11} className="px-4 py-12 text-center text-slate-500">{copy.emptyRecipients}</td>
                                                    </tr>
                                                ) : recipients.map((recipient) => {
                                                    const responseState = getRecipientResponseState(recipient);
                                                    const parsedDelivery = parseRecipientDeliveryDetails(recipient.error_message);
                                                    const deliveryChannels = parsedDelivery?.channels || [];
                                                    const channelDeliveryRows = ([
                                                        deliveryChannels.find((item) => item.channel === 'EMAIL') || null,
                                                        deliveryChannels.find((item) => item.channel === 'WHATSAPP') || null,
                                                    ].filter(Boolean) as ParsedRecipientDelivery['channels']);
                                                    const failedChannelDetails = deliveryChannels
                                                        .filter((item) => item.status === 'FAILED')
                                                        .map((item) => `${getDeliveryChannelLabel(isArabic, item.channel)}: ${item.detail || (isArabic ? 'خطأ غير معروف' : 'Unknown error')}`);
                                                    const statusTitle = failedChannelDetails.join(' | ')
                                                        || channelDeliveryRows.map((item) => `${getDeliveryChannelLabel(isArabic, item.channel)}: ${getDeliveryStateLabel(isArabic, item.status)}`).join(' | ')
                                                        || recipient.error_message
                                                        || undefined;
                                                    const lastAttemptDate = recipient.last_attempt_at ? new Date(recipient.last_attempt_at) : null;
                                                    const responseLabel = responseState === 'confirmed'
                                                        ? copy.confirmedLabels.confirmed
                                                        : responseState === 'declined'
                                                            ? copy.confirmedLabels.declined
                                                            : copy.confirmedLabels.pending;

                                                    return (
                                                        <tr
                                                            key={recipient.id}
                                                            className="cursor-pointer transition hover:bg-blue-50/60"
                                                            onClick={() => toggleRecipient(recipient.id)}
                                                        >
                                                            <td className="px-2.5 py-2 align-top">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedRecipientIds.includes(recipient.id)}
                                                                    onChange={() => toggleRecipient(recipient.id)}
                                                                    onClick={stopRowToggle}
                                                                />
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top">
                                                                <div className="space-y-1">
                                                                    <div className="truncate text-sm font-semibold text-slate-900">{recipient.name || EMPTY_VALUE_LABEL}</div>
                                                                    <div className="truncate text-xs text-slate-500">{recipient.arabic_name || EMPTY_VALUE_LABEL}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top">
                                                                <div className="space-y-1.5 text-xs text-slate-600">
                                                                    <div className="flex items-start gap-2">
                                                                        <Mail size={13} className="mt-0.5 shrink-0 text-slate-400" />
                                                                        <span dir="ltr" className="break-all">{recipient.email || EMPTY_VALUE_LABEL}</span>
                                                                    </div>
                                                                    <div className="flex items-start gap-2">
                                                                        <Phone size={13} className="mt-0.5 shrink-0 text-slate-400" />
                                                                        <span dir="ltr">{recipient.phone || EMPTY_VALUE_LABEL}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top text-center text-sm font-medium text-slate-700">
                                                                {recipient.room_est1 || recipient.room || EMPTY_VALUE_LABEL}
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top">
                                                                <div className="space-y-1">
                                                                    <div className="truncate text-sm font-medium text-slate-900">{recipient.role || EMPTY_VALUE_LABEL}</div>
                                                                    <div className="truncate text-xs text-slate-500">{recipient.type || EMPTY_VALUE_LABEL}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top text-sm text-slate-700">
                                                                <div className="truncate">{recipient.governorate || EMPTY_VALUE_LABEL}</div>
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top">
                                                                <div className="space-y-1.5">
                                                                    <span
                                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[recipient.status]}`}
                                                                        title={statusTitle}
                                                                    >
                                                                        <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                                                                        {copy.statusLabels[recipient.status]}
                                                                    </span>
                                                                    {channelDeliveryRows.length ? (
                                                                        <div className="space-y-1">
                                                                            {channelDeliveryRows.map((item) => (
                                                                                <div
                                                                                    key={`${recipient.id}-${item.channel}`}
                                                                                    className={`inline-flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-[10px] font-semibold ${DELIVERY_STATUS_STYLES[item.status]}`}
                                                                                    title={item.detail}
                                                                                >
                                                                                    <span>{getDeliveryChannelLabel(isArabic, item.channel)}</span>
                                                                                    <span>{getDeliveryStateLabel(isArabic, item.status)}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top">
                                                                <div className="space-y-2" onClick={stopRowToggle}>
                                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${CONFIRMATION_STYLES[responseState]}`}>
                                                                        <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                                                                        {responseLabel}
                                                                    </span>
                                                                    {canManageResponses ? (
                                                                        <FormSelect
                                                                            value={responseState === 'confirmed' ? 'CONFIRMED' : responseState === 'declined' ? 'DECLINED' : 'PENDING'}
                                                                            onChange={(nextValue) => updateRecipientResponseMutation.mutate({
                                                                                recipientId: recipient.id,
                                                                                status: nextValue as RecipientResponseValue,
                                                                            })}
                                                                            options={responseStatusOptions}
                                                                            ariaLabel={`${copy.confirmTitle} ${recipient.name}`}
                                                                            triggerClassName={compactSelectTriggerClass}
                                                                        />
                                                                    ) : null}
                                                                </div>
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top text-center text-sm text-slate-700">{recipient.attempts_count ?? 0}</td>
                                                            <td className="px-2.5 py-2 align-top text-xs text-slate-600">
                                                                {lastAttemptDate ? (
                                                                    <div className="space-y-1">
                                                                        <div className="font-medium text-slate-900">{lastAttemptDate.toLocaleDateString()}</div>
                                                                        <div>{lastAttemptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                                    </div>
                                                                ) : (
                                                                    EMPTY_VALUE_LABEL
                                                                )}
                                                            </td>
                                                            <td className="px-2.5 py-2 align-top">
                                                                <div className="flex items-center justify-center gap-2" onClick={stopRowToggle}>
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                                                        onClick={() => openEditRecipientForm(recipient)}
                                                                        aria-label={copy.edit}
                                                                        title={copy.edit}
                                                                    >
                                                                        <SquarePen size={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50"
                                                                        onClick={() => deleteRecipient(recipient.id)}
                                                                        disabled={deleteRecipientMutation.isPending}
                                                                        aria-label={copy.delete}
                                                                        title={copy.delete}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-sm text-slate-500">
                                        {copy.showing} {visibleRangeStart}-{visibleRangeEnd} {copy.of} {totalRecipients}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                        <div className="w-[132px]">
                                            <FormSelect
                                                value={String(pageSize)}
                                                onChange={(nextValue) => {
                                                    setPage(1);
                                                    setPageSize(parseInt(nextValue, 10));
                                                }}
                                                options={pageSizeOptions}
                                                ariaLabel={copy.recordsPerPage}
                                                triggerClassName={compactSelectTriggerClass}
                                            />
                                        </div>
                                        <button type="button" className="btn-outline !rounded-xl !py-2.5" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>
                                            {copy.previous}
                                        </button>
                                        <button type="button" className="btn-outline !rounded-xl !py-2.5" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>
                                            {copy.next}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="mb-4 overflow-x-auto">
                            <div className="inline-flex min-w-full gap-2 rounded-2xl border border-slate-200 bg-white p-1.5">
                                {([
                                    { key: 'send', label: `${copy.sendNow} / ${copy.retryFailed}` },
                                    { key: 'briefs', label: 'Head/Senior Briefs' },
                                    { key: 'logs', label: copy.recentLogs },
                                ] as Array<{ key: CampaignViewTab; label: string }>).map((tabOption) => {
                                    const active = campaignViewTab === tabOption.key;
                                    return (
                                        <button
                                            key={tabOption.key}
                                            type="button"
                                            onClick={() => setCampaignViewTab(tabOption.key)}
                                            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                                active
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            {tabOption.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {campaignViewTab === 'send' ? (
                        <>
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                                <SendHorizontal size={22} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-950">{copy.campaignTitle}</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-500">{copy.campaignHint}</p>
                            </div>
                        </div>

                        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.selectedTemplate}</div>
                            {currentTemplate ? (
                                <div className="mt-4 space-y-4">
                                    <FormSelect
                                        value={campaignTemplateId}
                                        onChange={setCampaignTemplateId}
                                        options={campaignTemplateOptions}
                                        ariaLabel={copy.selectedTemplate}
                                    />
                                    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${CHANNEL_STYLES[currentTemplate.type]}`}>
                                                {copy.templateTypeLabels[currentTemplate.type]}
                                            </span>
                                        </div>
                                        <div className="mt-3 text-base font-semibold text-slate-900">{currentTemplateSubjectPreview}</div>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            {currentTemplate.type !== 'WHATSAPP' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setCampaignPreviewModal('email')}
                                                    className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 text-start transition hover:border-blue-300 hover:bg-blue-50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition group-hover:bg-blue-200">
                                                            <Mail size={18} />
                                                        </span>
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-900">{isArabic ? 'معاينة الإيميل' : 'Email preview'}</div>
                                                            <div className="text-xs text-slate-500">{TEMPLATE_PREVIEW_RECIPIENT.email}</div>
                                                        </div>
                                                        <span className="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500">
                                                            <Eye size={14} />
                                                        </span>
                                                    </div>
                                                </button>
                                            ) : null}
                                            {currentTemplate.type !== 'EMAIL' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setCampaignPreviewModal('whatsapp')}
                                                    className="group rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4 text-start transition hover:border-emerald-300 hover:bg-emerald-50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition group-hover:bg-emerald-200">
                                                            <MessageCircleMore size={18} />
                                                        </span>
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-900">{isArabic ? 'معاينة واتساب' : 'WhatsApp preview'}</div>
                                                            <div className="text-xs text-slate-500">{TEMPLATE_PREVIEW_RECIPIENT.phone}</div>
                                                        </div>
                                                        <span className="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500">
                                                            <Eye size={14} />
                                                        </span>
                                                    </div>
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 rounded-[1.25rem] border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                                    {copy.noTemplateSelected}
                                    <div className="mt-3">
                                        <button type="button" className="btn-outline" onClick={() => updateTab('templates')}>
                                            {copy.openTemplates}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {currentTemplate && campaignPreviewModal ? (
                            <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
                                <button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" aria-label="Close preview modal" onClick={() => setCampaignPreviewModal(null)} />
                                <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-2xl">
                                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">
                                                {campaignPreviewModal === 'email'
                                                    ? isArabic
                                                        ? 'معاينة الإيميل'
                                                        : 'Email preview'
                                                    : isArabic
                                                      ? 'معاينة واتساب'
                                                      : 'WhatsApp delivery preview'}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {campaignPreviewModal === 'email' ? TEMPLATE_PREVIEW_RECIPIENT.email : TEMPLATE_PREVIEW_RECIPIENT.phone}
                                            </div>
                                        </div>
                                        <button type="button" className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100" onClick={() => setCampaignPreviewModal(null)}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="max-h-[calc(90vh-84px)] overflow-y-auto p-4 md:p-5">
                                        {campaignPreviewModal === 'email' ? (
                                            isHtmlTemplateBody(currentTemplate.body) ? (
                                                <div className="template-preview-email-shell overflow-hidden rounded-[1.35rem] border border-slate-200">
                                                    <iframe
                                                        title="Campaign template email preview"
                                                        className="h-[62vh] min-h-[420px] w-full bg-white"
                                                        sandbox=""
                                                        srcDoc={currentTemplatePreviewDocument}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                    {renderTemplateTokens(currentTemplate.body, TEMPLATE_PREVIEW_RECIPIENT)}
                                                </div>
                                            )
                                        ) : (
                                            <div className="template-preview-shell rounded-[1.6rem] p-3">
                                                <div className="template-preview-phone overflow-hidden rounded-[1.6rem] p-3">
                                                    <div className="template-preview-phone-screen rounded-[1.2rem] px-3 py-4">
                                                        <div className="template-preview-phone-detail mx-auto mb-4 h-1.5 w-16 rounded-full" />
                                                        <div className="template-preview-phone-bubble rounded-[1.35rem] px-4 py-4 shadow-sm">
                                                            <div className="whitespace-pre-wrap text-sm leading-6">
                                                                {currentTemplateWhatsAppModel.message || currentTemplateWhatsAppPreview}
                                                            </div>
                                                            {currentTemplateWhatsAppModel.links.length ? (
                                                                <div className="mt-4 flex flex-wrap gap-2">
                                                                    {currentTemplateWhatsAppModel.links.map((link) => (
                                                                        <a
                                                                            key={`${link.label}-${link.href}`}
                                                                            href={link.href}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="template-preview-phone-link inline-flex rounded-full px-3 py-2 text-xs font-semibold transition hover:opacity-90"
                                                                        >
                                                                            {link.label}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.sendScopeTitle}</div>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {(Object.keys(copy.sendScopes) as SendScope[]).map((scope) => {
                                    const active = sendScope === scope;
                                    return (
                                        <button
                                            key={scope}
                                            type="button"
                                            onClick={() => setSendScope(scope)}
                                            className={`rounded-[1.25rem] border px-4 py-4 text-start transition ${
                                                active
                                                    ? 'border-emerald-200 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="text-sm font-semibold text-slate-900">{copy.sendScopes[scope].title}</div>
                                            <div className="mt-1 text-xs leading-5 text-slate-500">{copy.sendScopes[scope].description}</div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-xs leading-6 text-slate-500">
                                {copy.filtersFallback}
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-4 xl:flex-row">
                            <div className={`${statClass} flex-1`}>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.selectedCount}</div>
                                <div className="mt-3 text-3xl font-semibold text-slate-950">{selectedRecipientIds.length}</div>
                            </div>
                            <div className={`${statClass} flex-1`}>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.visibleCount}</div>
                                <div className="mt-3 text-3xl font-semibold text-slate-950">{totalRecipients}</div>
                            </div>
                            <div className={`${statClass} flex-1`}>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.failedCount}</div>
                                <div className="mt-3 text-3xl font-semibold text-rose-700">{pageStats.failed}</div>
                            </div>
                        </div>

                        {selectedVisibleRecipients.length > 0 && (
                            <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                <span className="font-semibold text-slate-900">Selected on this page:</span>{' '}
                                {selectedVisibleRecipients.map((recipient) => recipient.name).slice(0, 3).join(', ')}
                            </div>
                        )}

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            <button
                                type="button"
                                className="inline-flex min-h-14 items-center justify-center rounded-[1.25rem] bg-cactus px-6 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={handleSend}
                                disabled={sendMutation.isPending || retryMutation.isPending || !currentTemplate}
                            >
                                {sendMutation.isPending || retryMutation.isPending ? copy.sending : copy.sendNow}
                            </button>
                            <button
                                type="button"
                                className="btn-outline"
                                onClick={() => retryMutation.mutate({
                                    templateId: campaignTemplateId,
                                    cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
                                })}
                                disabled={!campaignTemplateId || retryMutation.isPending || sendMutation.isPending}
                            >
                                {copy.retryFailed}
                            </button>
                        </div>
                        </>
                        ) : null}

                        {campaignViewTab === 'briefs' ? (
                        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Head/Senior Briefs
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Choose roles, channels, and targets, then preview exact messages in Excel row order before confirming send.
                            </p>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={hierarchyIncludeHeads}
                                        onChange={(event) => setHierarchyIncludeHeads(event.target.checked)}
                                    />
                                    <span>Send to Heads</span>
                                </label>
                                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={hierarchyIncludeSeniors}
                                        onChange={(event) => setHierarchyIncludeSeniors(event.target.checked)}
                                    />
                                    <span>Send to Seniors</span>
                                </label>
                                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={hierarchyChannels.includes('WHATSAPP')}
                                        onChange={() => toggleHierarchyChannel('WHATSAPP')}
                                    />
                                    <span>WhatsApp</span>
                                </label>
                                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={hierarchyChannels.includes('EMAIL')}
                                        onChange={() => toggleHierarchyChannel('EMAIL')}
                                    />
                                    <span>Email</span>
                                </label>
                            </div>

                            <div className="mt-4 grid gap-4 xl:grid-cols-2">
                                <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm font-semibold text-slate-900">Head selection</div>
                                        <button
                                            type="button"
                                            className="text-xs font-semibold text-slate-600 underline decoration-dotted underline-offset-4"
                                            onClick={() => setHierarchySelectedHeadIds([])}
                                        >
                                            All heads
                                        </button>
                                    </div>
                                    {availableHierarchyHeads.length ? (
                                        <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
                                            {availableHierarchyHeads.map((head) => (
                                                <label key={head.recipient_id} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 h-4 w-4"
                                                        checked={hierarchySelectedHeadIds.includes(head.recipient_id)}
                                                        onChange={() => toggleHierarchyHead(head.recipient_id)}
                                                        disabled={!hierarchyIncludeHeads}
                                                    />
                                                    <span>
                                                        #{head.row_order} {head.recipient_name} ({head.building})
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-3 text-xs text-slate-500">
                                            Run preview once to load head options.
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm font-semibold text-slate-900">Senior selection</div>
                                        <button
                                            type="button"
                                            className="text-xs font-semibold text-slate-600 underline decoration-dotted underline-offset-4"
                                            onClick={() => setHierarchySelectedSeniorIds([])}
                                        >
                                            All seniors
                                        </button>
                                    </div>
                                    {availableHierarchySeniors.length ? (
                                        <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
                                            {availableHierarchySeniors.map((senior) => (
                                                <label key={senior.recipient_id} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 h-4 w-4"
                                                        checked={hierarchySelectedSeniorIds.includes(senior.recipient_id)}
                                                        onChange={() => toggleHierarchySenior(senior.recipient_id)}
                                                        disabled={!hierarchyIncludeSeniors}
                                                    />
                                                    <span>
                                                        #{senior.row_order} {senior.recipient_name} ({senior.floor})
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-3 text-xs text-slate-500">
                                            Run preview once to load senior options.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={previewHierarchyBriefs}
                                    disabled={previewHierarchyBriefsMutation.isPending || sendHierarchyBriefsMutation.isPending}
                                >
                                    {previewHierarchyBriefsMutation.isPending ? 'Generating preview...' : 'Preview Head/Senior briefs'}
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => setIsHierarchyConfirmOpen(true)}
                                    disabled={!hierarchyPreviewResult || sendHierarchyBriefsMutation.isPending}
                                >
                                    {sendHierarchyBriefsMutation.isPending ? 'Sending...' : 'Confirm and send'}
                                </button>
                            </div>

                        {hierarchyPreviewResult ? (
                            <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hierarchy Preview</div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                        <div className="text-xs text-slate-500">Buildings</div>
                                        <div className="mt-1 text-lg font-semibold text-slate-900">{hierarchyPreviewResult.summary.buildings}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                        <div className="text-xs text-slate-500">Floors</div>
                                        <div className="mt-1 text-lg font-semibold text-slate-900">{hierarchyPreviewResult.summary.floors}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                        <div className="text-xs text-slate-500">Heads</div>
                                        <div className="mt-1 text-lg font-semibold text-slate-900">{hierarchyPreviewResult.summary.heads.targeted}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                        <div className="text-xs text-slate-500">Seniors</div>
                                        <div className="mt-1 text-lg font-semibold text-slate-900">{hierarchyPreviewResult.summary.seniors.targeted}</div>
                                    </div>
                                </div>

                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                                        <div className="font-semibold text-slate-900">WhatsApp</div>
                                        <div className="mt-1">{hierarchyPreviewResult.summary.channels.whatsapp.ready} ready / {hierarchyPreviewResult.summary.channels.whatsapp.missing} missing</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                                        <div className="font-semibold text-slate-900">Email</div>
                                        <div className="mt-1">{hierarchyPreviewResult.summary.channels.email.ready} ready / {hierarchyPreviewResult.summary.channels.email.missing} missing</div>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-3">
                                    {hierarchyPreviewTargets.map((target) => (
                                        <div key={target.recipient_id} className="rounded-xl border border-slate-200 bg-white p-3">
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">#{target.row_order}</span>
                                                <span>{target.role}</span>
                                                <span>{target.recipient_name}</span>
                                                <span>{target.building}</span>
                                                {target.floor ? <span>{target.floor}</span> : null}
                                            </div>
                                            <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                                                <div>Phone: {target.phone || '-'}</div>
                                                <div>Email: {target.email || '-'}</div>
                                            </div>
                                            {target.public_review_url ? (
                                                <div className="mt-2 text-xs text-slate-600">
                                                    Public review: <a href={target.public_review_url} target="_blank" rel="noreferrer" className="font-semibold text-cyan-700 underline underline-offset-4">{target.public_review_url}</a>
                                                </div>
                                            ) : null}
                                            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs whitespace-pre-wrap text-slate-700">
                                                {target.whatsapp_message}
                                            </div>

                                            {target.role === 'HEAD' ? (
                                                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                                                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                                                        <thead className="bg-slate-50 text-slate-600">
                                                            <tr>
                                                                <th className="px-2 py-2 text-left">Row</th>
                                                                <th className="px-2 py-2 text-left">Floor</th>
                                                                <th className="px-2 py-2 text-left">Senior</th>
                                                                <th className="px-2 py-2 text-left">Invigilators</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200 bg-white">
                                                            {target.seniors.length ? target.seniors.map((senior) => (
                                                                <tr key={senior.recipient_id}>
                                                                    <td className="px-2 py-2">{senior.row_order}</td>
                                                                    <td className="px-2 py-2">{senior.floor}</td>
                                                                    <td className="px-2 py-2">{senior.recipient_name}</td>
                                                                    <td className="px-2 py-2">{senior.invigilators_count}</td>
                                                                </tr>
                                                            )) : (
                                                                <tr>
                                                                    <td colSpan={4} className="px-2 py-3 text-center text-slate-500">No seniors under this head.</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                                                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                                                        <thead className="bg-slate-50 text-slate-600">
                                                            <tr>
                                                                <th className="px-2 py-2 text-left">Row</th>
                                                                <th className="px-2 py-2 text-left">Room</th>
                                                                <th className="px-2 py-2 text-left">Name</th>
                                                                <th className="px-2 py-2 text-left">Role</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200 bg-white">
                                                            {target.members.length ? target.members.map((member) => (
                                                                <tr key={member.recipient_id}>
                                                                    <td className="px-2 py-2">{member.row_order}</td>
                                                                    <td className="px-2 py-2">{member.room || '-'}</td>
                                                                    <td className="px-2 py-2">{member.recipient_name}</td>
                                                                    <td className="px-2 py-2">{member.role || '-'}</td>
                                                                </tr>
                                                            )) : (
                                                                <tr>
                                                                    <td colSpan={4} className="px-2 py-3 text-center text-slate-500">No invigilators under this senior.</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {hierarchySendResult ? (
                            <div className="mt-5 rounded-[1.25rem] border border-emerald-200 bg-emerald-50/50 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Delivery result</div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700">
                                        <div className="text-xs text-slate-500">Heads</div>
                                        <div className="mt-1 text-lg font-semibold text-emerald-700">{hierarchySendResult.summary.heads.sent}/{hierarchySendResult.summary.heads.targeted}</div>
                                    </div>
                                    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700">
                                        <div className="text-xs text-slate-500">Seniors</div>
                                        <div className="mt-1 text-lg font-semibold text-emerald-700">{hierarchySendResult.summary.seniors.sent}/{hierarchySendResult.summary.seniors.targeted}</div>
                                    </div>
                                    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700">
                                        <div className="text-xs text-slate-500">WhatsApp</div>
                                        <div className="mt-1 text-lg font-semibold text-emerald-700">{hierarchySendResult.summary.channels.whatsapp.sent}</div>
                                    </div>
                                    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700">
                                        <div className="text-xs text-slate-500">Email</div>
                                        <div className="mt-1 text-lg font-semibold text-emerald-700">{hierarchySendResult.summary.channels.email.sent}</div>
                                    </div>
                                </div>
                                {hierarchyDeliveryRows.length ? (
                                    <div className="mt-4 space-y-2 rounded-xl border border-emerald-200 bg-white p-3 text-xs text-slate-700">
                                        {hierarchyDeliveryRows.slice(0, 30).map((item) => (
                                            <div key={`${item.recipient_id}-${item.role}`} className="rounded-lg border border-slate-200 px-3 py-2">
                                                <div className="font-semibold text-slate-900">#{item.row_order} {item.recipient_name} ({item.role})</div>
                                                <div className="mt-1">
                                                    {item.channels.map((channelResult) => `${channelResult.channel}: ${channelResult.status}${channelResult.reason ? ` (${channelResult.reason})` : ''}`).join(' | ')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        </div>
                        ) : null}
                    </div>

                    <ConfirmDialog
                        open={isHierarchyConfirmOpen}
                        title="Confirm hierarchy brief sending"
                        description={`This will send briefs to ${hierarchyPreviewTargets.length} targets using selected channels. Continue?`}
                        confirmLabel="Confirm send"
                        cancelLabel="Cancel"
                        isLoading={sendHierarchyBriefsMutation.isPending}
                        onCancel={() => setIsHierarchyConfirmOpen(false)}
                        onConfirm={confirmSendHierarchyBriefs}
                    />

                    {campaignViewTab === 'logs' ? (
                    <div className={cardClass}>
                        <button
                            type="button"
                            className="flex w-full items-center justify-between gap-4 text-start"
                            onClick={() => setLogsExpanded((value) => !value)}
                        >
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                                    <LayoutPanelTop size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-950">{copy.recentLogs}</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{copy.logsHint}</p>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                                {logsExpanded ? copy.hideLogs : copy.showLogs}
                                {logsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </span>
                        </button>

                        {logsExpanded && (
                            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-600">
                                            <tr>
                                                <th className="px-4 py-3">{copy.name}</th>
                                                <th className="px-4 py-3">{copy.status}</th>
                                                <th className="px-4 py-3">{copy.errorLabel}</th>
                                                <th className="px-4 py-3">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white">
                                            {logsQuery.isLoading ? (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">{copy.loading}</td>
                                                </tr>
                                            ) : logsQuery.data?.items?.length ? logsQuery.data.items.map((log) => (
                                                <tr key={log.id}>
                                                    <td className="px-4 py-4 text-slate-900">{log.recipient?.name || log.recipient?.email || '-'}</td>
                                                    <td className="px-4 py-4">
                                                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[log.status]}`}>
                                                            <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                                                            {copy.statusLabels[log.status]}
                                                        </span>
                                                    </td>
                                                    <td className="max-w-[280px] px-4 py-4 text-xs text-rose-700">
                                                        <div className="truncate" title={log.error || '-'}>
                                                            {log.error || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">{copy.noLogs}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                    ) : null}
                </div>
            )}
            {activeTab === 'settings' && (
                canManageSettings ? (
                    <div className="grid gap-6">
                        <div className={cardClass}>
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                                    <Settings size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-950">{t('settingsTitle')}</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{t('settingsSubtitle')}</p>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-2">
                                {([
                                    { key: 'email', label: copy.settingsTabs.email },
                                    { key: 'whatsapp', label: copy.settingsTabs.whatsapp },
                                ] as Array<{ key: SettingsViewTab; label: string }>).map((tabOption) => (
                                    <button
                                        key={tabOption.key}
                                        type="button"
                                        className={settingsViewTab === tabOption.key ? 'btn-primary' : 'btn-outline'}
                                        onClick={() => setSettingsViewTab(tabOption.key)}
                                    >
                                        {tabOption.label}
                                    </button>
                                ))}
                            </div>

                            {settingsViewTab === 'email' ? (
                            <>
                            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{isArabic ? 'الحساب النشط للإرسال' : 'Active sender account'}</div>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {isArabic
                                        ? 'اختار الإيميل اللي هيطلع منه الإرسال الآن. لو سيبت الاختيار على fallback النظام هيرجع لقيم البيئة.'
                                        : 'Choose which sender account should be used right now. If you keep fallback selected, the system will use environment values.'}
                                </p>

                                <div className="mt-5 grid gap-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">{isArabic ? 'أرسل من' : 'Send from'}</label>
                                        <FormSelect
                                            value={emailSettingsForm.active_sender_account_id || '__env__'}
                                            onChange={(nextValue) => {
                                                const nextId = nextValue === '__env__' ? '' : nextValue;
                                                const selectedAccount = senderAccounts.find((account) => account.id === nextId) || null;
                                                setEmailSettingsForm((current) => ({
                                                    ...current,
                                                    active_sender_account_id: nextId,
                                                    sender_name: selectedAccount?.sender_name || current.sender_name,
                                                    sender_email: selectedAccount?.sender_email || current.sender_email,
                                                }));
                                            }}
                                            ariaLabel={isArabic ? 'أرسل من' : 'Send from'}
                                            options={[
                                                { value: '__env__', label: isArabic ? 'Fallback من البيئة' : 'Environment fallback' },
                                                ...senderAccounts.map((account) => ({
                                                    value: account.id,
                                                    label: `${account.label} - ${account.sender_email}`,
                                                })),
                                            ]}
                                        />
                                    </div>

                                    {!emailSettingsForm.active_sender_account_id ? (
                                        <>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-slate-700">{t('senderName')}</label>
                                                <input
                                                    value={emailSettingsForm.sender_name}
                                                    onChange={(event) => setEmailSettingsForm((current) => ({ ...current, sender_name: event.target.value }))}
                                                    className="input w-full"
                                                    placeholder={t('senderNamePlaceholder')}
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-slate-700">{t('senderEmail')}</label>
                                                <input
                                                    value={emailSettingsForm.sender_email}
                                                    onChange={(event) => setEmailSettingsForm((current) => ({ ...current, sender_email: event.target.value }))}
                                                    className="input w-full"
                                                    placeholder="sender@example.com"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 text-sm text-slate-700">
                                            <div className="font-semibold text-slate-900">{activeSenderAccount?.label || '-'}</div>
                                            <div className="mt-1">{activeSenderAccount?.smtp_username || '-'}</div>
                                            <div className="mt-3 text-xs text-slate-500">
                                                {isArabic ? 'تقدر تعدل التفاصيل من فورم الحسابات بالأسفل.' : 'You can edit the full credentials in the sender accounts form below.'}
                                            </div>
                                        </div>
                                    )}

                                    <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{t('fromPreview')}</div>
                                        <div className="mt-3 text-base font-semibold text-emerald-900">{emailIdentityPreview}</div>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={saveEmailSettings}
                                        disabled={saveEmailSettingsMutation.isPending || emailSettingsQuery.isLoading}
                                    >
                                        {t('saveChanges')}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{isArabic ? 'حسابات الإرسال' : 'Sender accounts'}</div>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                            {isArabic
                                                ? 'ضيف أكثر من SMTP account واختار منهم وقت ما تحتاج بدون الرجوع لـ .env.'
                                                : 'Add multiple SMTP accounts and switch between them without editing the .env file.'}
                                        </p>
                                    </div>
                                    <button type="button" className="btn-outline" onClick={openNewSenderAccountForm}>
                                        {editingSenderAccountId ? (isArabic ? 'إضافة حساب جديد' : 'Add another account') : (isArabic ? 'حساب جديد' : 'New account')}
                                    </button>
                                </div>

                                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
                                    <div className="space-y-3">
                                        {senderAccounts.length ? senderAccounts.map((account) => (
                                            <div key={account.id} className={`rounded-[1.35rem] border p-4 ${account.is_active ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="text-sm font-semibold text-slate-950">{account.label}</div>
                                                            {account.is_active ? (
                                                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                                                    {isArabic ? 'نشط' : 'Active'}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <div className="mt-2 text-sm text-slate-700">{account.mail_from}</div>
                                                        <div className="mt-1 text-xs text-slate-500">{account.smtp_host}:{account.smtp_port} • {account.smtp_username}</div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {!account.is_active ? (
                                                            <button
                                                                type="button"
                                                                className="btn-outline"
                                                                onClick={() => setEmailSettingsForm((current) => ({
                                                                    ...current,
                                                                    active_sender_account_id: account.id,
                                                                    sender_name: account.sender_name,
                                                                    sender_email: account.sender_email,
                                                                }))}
                                                            >
                                                                {isArabic ? 'تحديده' : 'Use it'}
                                                            </button>
                                                        ) : null}
                                                        <button type="button" className="btn-outline" onClick={() => beginEditSenderAccount(account)}>
                                                            {copy.edit}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-outline border-rose-200 text-rose-700 hover:bg-rose-50"
                                                            onClick={() => deleteSenderAccountMutation.mutate(account.id)}
                                                            disabled={deleteSenderAccountMutation.isPending}
                                                        >
                                                            {copy.delete}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                                                {isArabic ? 'لا توجد حسابات إرسال محفوظة حتى الآن.' : 'No sender accounts saved yet.'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 md:p-5">
                                        <div className="text-sm font-semibold text-slate-950">
                                            {editingSenderAccountId
                                                ? (isArabic ? 'تعديل حساب الإرسال' : 'Edit sender account')
                                                : (isArabic ? 'إضافة حساب إرسال' : 'Add sender account')}
                                        </div>
                                        <div className="mt-4 grid gap-4">
                                            <input
                                                value={senderAccountForm.label}
                                                onChange={(event) => setSenderAccountForm((current) => ({ ...current, label: event.target.value }))}
                                                className="input w-full"
                                                placeholder={isArabic ? 'اسم داخلي للحساب' : 'Internal account label'}
                                            />
                                            <input
                                                value={senderAccountForm.sender_name}
                                                onChange={(event) => setSenderAccountForm((current) => ({ ...current, sender_name: event.target.value }))}
                                                className="input w-full"
                                                placeholder={t('senderNamePlaceholder')}
                                            />
                                            <input
                                                value={senderAccountForm.sender_email}
                                                onChange={(event) => setSenderAccountForm((current) => ({ ...current, sender_email: event.target.value }))}
                                                className="input w-full"
                                                placeholder="sender@example.com"
                                            />
                                            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
                                                <input
                                                    value={senderAccountForm.smtp_host}
                                                    onChange={(event) => setSenderAccountForm((current) => ({ ...current, smtp_host: event.target.value }))}
                                                    className="input w-full"
                                                    placeholder="smtp.example.com"
                                                />
                                                <input
                                                    value={senderAccountForm.smtp_port}
                                                    onChange={(event) => setSenderAccountForm((current) => ({ ...current, smtp_port: event.target.value }))}
                                                    className="input w-full"
                                                    placeholder="587"
                                                />
                                            </div>
                                            <input
                                                value={senderAccountForm.smtp_username}
                                                onChange={(event) => setSenderAccountForm((current) => ({ ...current, smtp_username: event.target.value }))}
                                                className="input w-full"
                                                placeholder={isArabic ? 'اسم مستخدم SMTP' : 'SMTP username'}
                                            />
                                            <input
                                                type="password"
                                                value={senderAccountForm.smtp_password}
                                                onChange={(event) => setSenderAccountForm((current) => ({ ...current, smtp_password: event.target.value }))}
                                                className="input w-full"
                                                placeholder={editingSenderAccountId
                                                    ? (isArabic ? 'اتركه فارغاً للاحتفاظ بالباسورد الحالي' : 'Leave blank to keep current password')
                                                    : (isArabic ? 'كلمة مرور SMTP' : 'SMTP password')}
                                            />
                                            <input
                                                value={senderAccountForm.smtp_daily_limit}
                                                onChange={(event) => setSenderAccountForm((current) => ({ ...current, smtp_daily_limit: event.target.value }))}
                                                className="input w-full"
                                                placeholder={isArabic ? 'الحد اليومي الاختياري' : 'Optional daily limit'}
                                            />
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <label className="flex items-center gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={senderAccountForm.smtp_secure}
                                                        onChange={(event) => setSenderAccountForm((current) => ({ ...current, smtp_secure: event.target.checked }))}
                                                    />
                                                    <span>{isArabic ? 'اتصال آمن SSL' : 'Secure SSL'}</span>
                                                </label>
                                                <label className="flex items-center gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={senderAccountForm.smtp_require_tls}
                                                        onChange={(event) => setSenderAccountForm((current) => ({ ...current, smtp_require_tls: event.target.checked }))}
                                                    />
                                                    <span>{isArabic ? 'إجبار TLS' : 'Require TLS'}</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="mt-5 flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                className="btn-primary"
                                                onClick={saveSenderAccount}
                                                disabled={saveSenderAccountMutation.isPending}
                                            >
                                                {editingSenderAccountId
                                                    ? (isArabic ? 'حفظ التعديل' : 'Save account')
                                                    : (isArabic ? 'إضافة الحساب' : 'Add account')}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-outline"
                                                onClick={openNewSenderAccountForm}
                                            >
                                                {isArabic ? 'تفريغ الفورم' : 'Clear form'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            </>
                            ) : null}

                            {settingsViewTab === 'whatsapp' ? (
                            <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/40 p-5">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                                        <Phone size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-950">{isArabic ? 'إعدادات واتساب' : 'WhatsApp Settings'}</h2>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                            {isArabic
                                                ? 'اضبط بيانات Green API هنا. زر الاختبار سيحفظ القيم الحالية ثم يرسل رسالة تجريبية إلى +201145495393.'
                                                : 'Configure Green API here. The test button saves the current values, then sends a test message to +201145495393.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">apiUrl</label>
                                        <input
                                            value={whatsAppSettingsForm.api_url}
                                            onChange={(event) => setWhatsAppSettingsForm((current) => ({ ...current, api_url: event.target.value }))}
                                            className="input w-full"
                                            placeholder="https://7107.api.greenapi.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">mediaUrl</label>
                                        <input
                                            value={whatsAppSettingsForm.media_url}
                                            onChange={(event) => setWhatsAppSettingsForm((current) => ({ ...current, media_url: event.target.value }))}
                                            className="input w-full"
                                            placeholder="https://7107.api.greenapi.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">idInstance</label>
                                        <input
                                            value={whatsAppSettingsForm.id_instance}
                                            onChange={(event) => setWhatsAppSettingsForm((current) => ({ ...current, id_instance: event.target.value }))}
                                            className="input w-full"
                                            placeholder="7107593651"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">apiTokenInstance</label>
                                        <input
                                            type="password"
                                            value={whatsAppSettingsForm.api_token_instance}
                                            onChange={(event) => setWhatsAppSettingsForm((current) => ({ ...current, api_token_instance: event.target.value }))}
                                            className="input w-full"
                                            placeholder="Green API token"
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                                    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            {isArabic ? 'وجهة الاختبار' : 'Test destination'}
                                        </div>
                                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                                            <div><span className="font-semibold text-slate-900">Phone:</span> {whatsAppSettingsQuery.data?.test_phone || '+201145495393'}</div>
                                            <div><span className="font-semibold text-slate-900">chatId:</span> {whatsAppSettingsQuery.data?.test_chat_id || '201145495393@c.us'}</div>
                                            <div><span className="font-semibold text-slate-900">{isArabic ? 'المصدر' : 'Source'}:</span> {whatsAppSettingsQuery.data?.using_default_values ? (isArabic ? 'القيم الافتراضية' : 'Default values') : (isArabic ? 'القيم المحفوظة' : 'Saved values')}</div>
                                        </div>
                                    </div>

                                    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            {isArabic ? 'آخر تحديث' : 'Last updated'}
                                        </div>
                                        <div className="mt-3 text-sm font-semibold text-slate-900">
                                            {whatsAppSettingsQuery.data?.updated_at
                                                ? new Date(whatsAppSettingsQuery.data.updated_at).toLocaleString()
                                                : (isArabic ? 'لم يتم الحفظ بعد' : 'Not saved yet')}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={saveWhatsAppSettings}
                                        disabled={saveWhatsAppSettingsMutation.isPending || whatsAppSettingsQuery.isLoading}
                                    >
                                        {saveWhatsAppSettingsMutation.isPending
                                            ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...')
                                            : (isArabic ? 'حفظ إعدادات واتساب' : 'Save WhatsApp settings')}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-outline border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                                        onClick={runWhatsAppTest}
                                        disabled={testWhatsAppMutation.isPending || whatsAppSettingsQuery.isLoading}
                                    >
                                        {testWhatsAppMutation.isPending
                                            ? (isArabic ? 'جارٍ الاختبار...' : 'Testing...')
                                            : (isArabic ? 'اختبار واتساب' : 'Test WhatsApp')}
                                    </button>
                                </div>

                                {whatsAppTestResult ? (
                                    <div className={`mt-5 rounded-[1.35rem] border p-4 ${whatsAppTestResult.ok ? 'border-emerald-200 bg-white' : 'border-rose-200 bg-rose-50/50'}`}>
                                        <div className={`text-sm font-semibold ${whatsAppTestResult.ok ? 'text-emerald-800' : 'text-rose-700'}`}>
                                            {whatsAppTestResult.ok
                                                ? (isArabic ? 'نجح اختبار واتساب.' : 'WhatsApp test succeeded.')
                                                : (isArabic ? 'فشل اختبار واتساب.' : 'WhatsApp test failed.')}
                                        </div>
                                        <div className="mt-3 grid gap-2 text-sm text-slate-700">
                                            <div><span className="font-semibold text-slate-900">Phone:</span> {whatsAppTestResult.phone}</div>
                                            <div><span className="font-semibold text-slate-900">chatId:</span> {whatsAppTestResult.chat_id}</div>
                                            <div><span className="font-semibold text-slate-900">{isArabic ? 'الحالة' : 'Status'}:</span> {whatsAppTestResult.delivery.status ?? '-'}</div>
                                            <div><span className="font-semibold text-slate-900">{isArabic ? 'المحاولات' : 'Attempts'}:</span> {whatsAppTestResult.delivery.attempts}</div>
                                            <div><span className="font-semibold text-slate-900">{isArabic ? 'النص' : 'Message'}:</span> {whatsAppTestResult.message}</div>
                                            {whatsAppTestResult.delivery.error ? (
                                                <div><span className="font-semibold text-slate-900">{isArabic ? 'الخطأ' : 'Error'}:</span> {whatsAppTestResult.delivery.error}</div>
                                            ) : null}
                                        </div>
                                        {whatsAppProviderResponse ? (
                                            <div className="mt-4">
                                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    {isArabic ? 'رد Green API' : 'Green API response'}
                                                </div>
                                                <pre className="mt-2 overflow-x-auto rounded-[1rem] border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">{whatsAppProviderResponse}</pre>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                            ) : null}
                        </div>

                        <div className="hidden">
                            <div className={cardClass}>
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                                        <Server size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-950">{t('smtpServerTitle')}</h2>
                                        <p className="mt-2 text-sm leading-6 text-slate-500">{t('smtpServerDescription')}</p>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-4">
                                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{isArabic ? 'مصدر الإرسال الحالي' : 'Current sender source'}</div>
                                        <div className="mt-2 text-sm font-semibold text-slate-900">
                                            {emailSettingsQuery.data?.using_env_fallback
                                                ? (isArabic ? 'Fallback من البيئة' : 'Environment fallback')
                                                : (activeSenderAccount?.label || (isArabic ? 'حساب محفوظ' : 'Saved account'))}
                                        </div>
                                    </div>
                                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('host')}</div>
                                        <div className="mt-2 text-sm font-semibold text-slate-900">{emailSettingsQuery.data?.smtp_host || '-'}</div>
                                    </div>
                                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('port')}</div>
                                        <div className="mt-2 text-sm font-semibold text-slate-900">{emailSettingsQuery.data?.smtp_port ?? '-'}</div>
                                    </div>
                                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{t('sentToday')}</div>
                                        <div className="mt-2 text-sm font-semibold text-emerald-900">{emailSettingsQuery.data?.sent_today_success_count ?? 0}</div>
                                    </div>
                                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">{t('smtpLimitRemaining')}</div>
                                        <div className="mt-2 text-sm font-semibold text-amber-900">
                                            {emailSettingsQuery.data?.smtp_daily_limit
                                                ? `${emailSettingsQuery.data.smtp_remaining_today ?? 0} / ${emailSettingsQuery.data.smtp_daily_limit}`
                                                : t('smtpLimitNotConfigured')}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={cardClass}>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('fromPreview')}</div>
                                <div className="mt-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                                    {emailSettingsQuery.data?.mail_from || emailIdentityPreview}
                                </div>
                            </div>

                            <div className={cardClass}>
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                                        <Phone size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-950">{isArabic ? 'ملخص واتساب' : 'WhatsApp Summary'}</h2>
                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            {isArabic
                                                ? 'ملخص سريع لإعدادات Green API النشطة ونتيجة آخر اختبار.'
                                                : 'A quick summary of the active Green API settings and the latest test result.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-4">
                                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">apiUrl</div>
                                        <div className="mt-2 break-all text-sm font-semibold text-slate-900">{whatsAppSettingsForm.api_url || '-'}</div>
                                    </div>
                                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">idInstance</div>
                                        <div className="mt-2 text-sm font-semibold text-slate-900">{whatsAppSettingsForm.id_instance || '-'}</div>
                                    </div>
                                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{isArabic ? 'هاتف الاختبار' : 'Test phone'}</div>
                                        <div className="mt-2 text-sm font-semibold text-slate-900">{whatsAppSettingsQuery.data?.test_phone || '+201145495393'}</div>
                                    </div>
                                    <div className={`rounded-[1.5rem] border p-4 ${whatsAppTestResult?.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                                        <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${whatsAppTestResult?.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
                                            {isArabic ? 'آخر اختبار' : 'Latest test'}
                                        </div>
                                        <div className={`mt-2 text-sm font-semibold ${whatsAppTestResult?.ok ? 'text-emerald-900' : 'text-amber-900'}`}>
                                            {whatsAppTestResult
                                                ? (whatsAppTestResult.ok
                                                    ? (isArabic ? 'نجح الإرسال التجريبي.' : 'Test message delivered successfully.')
                                                    : (whatsAppTestResult.delivery.error || (isArabic ? 'فشل الإرسال التجريبي.' : 'Test delivery failed.')))
                                                : (isArabic ? 'لم يتم تشغيل اختبار بعد.' : 'No test has been run yet.')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={cardClass}>
                        <h2 className="text-xl font-semibold text-slate-950">{t('settingsPermissionTitle')}</h2>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{t('settingsPermissionHint')}</p>
                    </div>
                )
            )}
        </section>
    );
}
