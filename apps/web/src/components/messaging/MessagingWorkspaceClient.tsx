'use client';

import { MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import {
    ChevronDown,
    ChevronUp,
    FileSpreadsheet,
    Filter,
    LayoutPanelTop,
    Mail,
    Phone,
    RefreshCcw,
    Search,
    SendHorizontal,
    Settings,
    Server,
    SquarePen,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api, { fetchCsrfToken } from '@/lib/api';
import {
    buildEmailPreviewDocument,
    EXAM_ASSIGNMENT_TEMPLATE_PRESETS,
    isHtmlTemplateBody,
    renderTemplateTokens,
    stripHtmlPreviewText,
    TEMPLATE_EDITOR_VARIABLES,
    TEMPLATE_PREVIEW_RECIPIENT,
} from '@/lib/messaging-template-presets';
import { useRequireAuth } from '@/lib/use-auth';
import { buildRecipientExcelRow, getImportErrorMessage } from './upload-utils';
import RecipientFormModal, { RecipientExcelFormState, RecipientFormErrors } from './RecipientFormModal';
import ConfirmDialog from '../ConfirmDialog';
import FormSelect from '../FormSelect';

type WorkspaceTab = 'recipients' | 'templates' | 'campaign' | 'settings';
type TemplateType = 'BOTH' | 'EMAIL' | 'WHATSAPP';
type SendScope = 'selected' | 'filtered' | 'all_pending' | 'failed';
type TemplateEditorField = 'subject' | 'body';

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
    sheet?: 'LEGACY' | 'EST1' | 'EST2';
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
        value: 'LEGACY' | 'EST1' | 'EST2';
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
        sheet?: 'LEGACY' | 'EST1' | 'EST2';
    };
};

type EmailSettingsRecord = {
    sender_name: string;
    sender_email: string;
    mail_from: string;
    smtp_host: string;
    smtp_port: number;
    sent_today_success_count: number;
    smtp_daily_limit: number | null;
    smtp_remaining_today: number | null;
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

const CONFIRMATION_STYLES: Record<RecipientResponseState, string> = {
    pending: 'bg-slate-100 text-slate-700 border border-slate-200',
    confirmed: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    declined: 'bg-rose-50 text-rose-800 border border-rose-200',
};

const EMPTY_VALUE_LABEL = 'empty';

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
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

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
        readyCredentials: isArabic ? 'مسجل دخولك كأدمن، وتقدر تدير الرفع والقوالب والإرسال من هنا.' : 'You are signed in as admin and can manage upload, templates and delivery here.',
    }), [isArabic]);

    const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => (
        isWorkspaceTab(searchParams.get('tab')) ? (searchParams.get('tab') as WorkspaceTab) : 'recipients'
    ));
    const [selectedCycleId, setSelectedCycleId] = useState('');
    const [cycleSelectionReady, setCycleSelectionReady] = useState(false);
    const [selectedSheet, setSelectedSheet] = useState<'LEGACY' | 'EST1' | 'EST2' | ''>('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(1500);
    const [filters, setFilters] = useState<RecipientFilters>(EMPTY_FILTERS);
    const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
    const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE_FORM);
    const [templateSearch, setTemplateSearch] = useState('');
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [isTemplateComposerOpen, setIsTemplateComposerOpen] = useState(false);
    const [activeTemplateField, setActiveTemplateField] = useState<TemplateEditorField>('body');
    const [campaignTemplateId, setCampaignTemplateId] = useState('');
    const [sendScope, setSendScope] = useState<SendScope>('selected');
    const [logsExpanded, setLogsExpanded] = useState(false);
    const [emailSettingsForm, setEmailSettingsForm] = useState({
        sender_name: '',
        sender_email: '',
    });
    const [recipientForm, setRecipientForm] = useState<RecipientExcelFormState>(EMPTY_RECIPIENT_FORM);
    const [recipientFormErrors, setRecipientFormErrors] = useState<RecipientFormErrors>({});
    const [editingRecipientId, setEditingRecipientId] = useState<string | null>(null);
    const [editingRecipientCycleId, setEditingRecipientCycleId] = useState<string | null>(null);
    const [isRecipientFormOpen, setIsRecipientFormOpen] = useState(false);
    const [expandedRecipientDetailsId, setExpandedRecipientDetailsId] = useState<string | null>(null);
    const [deleteConfirmState, setDeleteConfirmState] = useState<{ type: 'recipient'; recipientId: string } | { type: 'cycle'; cycleId: string } | null>(null);
    const subjectInputRef = useRef<HTMLInputElement>(null);
    const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const nextTab = searchParams.get('tab');
        if (isWorkspaceTab(nextTab) && nextTab !== activeTab) {
            setActiveTab(nextTab);
        }
    }, [activeTab, searchParams]);

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

        const preferred = (['EST1', 'EST2', 'LEGACY'] as const).find((sheet) => availableSheets.includes(sheet));
        setSelectedSheet(preferred ?? availableSheets[0]);
        setPage(1);
    }, [recipientFilterOptionsQuery.data?.sheets, selectedSheet]);

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
        enabled: ready && isSuperAdmin,
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
            });
        }
    }, [emailSettingsQuery.data]);

    useEffect(() => {
        if (!isRecipientFormOpen && !isTemplateComposerOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isRecipientFormOpen, isTemplateComposerOpen]);

    const refreshAll = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['messaging-cycles'] }),
            queryClient.invalidateQueries({ queryKey: ['messaging-recipients'] }),
            queryClient.invalidateQueries({ queryKey: ['messaging-recipient-filter-options'] }),
            queryClient.invalidateQueries({ queryKey: ['messaging-templates'] }),
            queryClient.invalidateQueries({ queryKey: ['messaging-logs'] }),
            queryClient.invalidateQueries({ queryKey: ['email-settings'] }),
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

    const saveEmailSettingsMutation = useMutation({
        mutationFn: async () => {
            await fetchCsrfToken();
            const response = await api.patch('/settings/email', {
                sender_name: emailSettingsForm.sender_name.trim(),
                sender_email: emailSettingsForm.sender_email.trim(),
            });
            return response.data as EmailSettingsRecord;
        },
        onSuccess(data) {
            setEmailSettingsForm({
                sender_name: data.sender_name,
                sender_email: data.sender_email,
            });
            void queryClient.invalidateQueries({ queryKey: ['email-settings'] });
            toast.success(t('emailSettingsSaveSuccess'));
        },
        onError(error: any) {
            toast.error(error?.message || t('emailSettingsSaveError'));
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
    const currentTemplateBodyPreview = currentTemplate ? renderTemplateBodyPreview(currentTemplate.body) : '';
    const currentTemplateSubjectPreview = currentTemplate ? renderTemplateTokens(currentTemplate.subject, TEMPLATE_PREVIEW_RECIPIENT) : '';
    const currentTemplatePreviewDocument = useMemo(
        () => buildEmailPreviewDocument(currentTemplateBodyPreview),
        [currentTemplateBodyPreview],
    );
    const selectedVisibleRecipients = recipients.filter((recipient) => selectedRecipientIds.includes(recipient.id));
    const emailIdentityPreview = emailSettingsForm.sender_email
        ? `${emailSettingsForm.sender_name.trim() || t('senderNamePlaceholder')} <${emailSettingsForm.sender_email}>`
        : emailSettingsForm.sender_name.trim() || '-';

    const pageStats = useMemo(() => ({
        pending: recipients.filter((recipient) => recipient.status === 'PENDING').length,
        sent: recipients.filter((recipient) => recipient.status === 'SENT').length,
        failed: recipients.filter((recipient) => recipient.status === 'FAILED').length,
    }), [recipients]);

    const textRecipientFilterFields = useMemo(() => ([
        { key: 'name', label: copy.name },
        { key: 'email', label: copy.emailLabel },
        { key: 'room_est1', label: copy.roomEst1 },
        { key: 'address', label: copy.address },
        { key: 'building', label: copy.building },
        { key: 'location', label: copy.location },
    ] as Array<{ key: keyof RecipientFilters; label: string }>), [
        copy.address,
        copy.building,
        copy.emailLabel,
        copy.location,
        copy.name,
        copy.roomEst1,
    ]);

    const filterOptions = recipientFilterOptionsQuery.data ?? { roles: [], types: [], governorates: [], sheets: [] };
    const availableSheets = filterOptions.sheets;
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

    const openCreateRecipientForm = () => {
        setEditingRecipientId(null);
        setEditingRecipientCycleId(null);
        setRecipientForm(EMPTY_RECIPIENT_FORM);
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
            sheet: recipient.sheet === 'EST1' || recipient.sheet === 'EST2' ? recipient.sheet : '',
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
            const firstResponse = await api.get('/messaging/recipients', {
                params: {
                    ...filters,
                    cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
                    sheet: selectedSheet || undefined,
                    status: filters.status || undefined,
                    page: 1,
                    limit: 1000,
                },
            });

            const firstPage = firstResponse.data as { items: Recipient[]; total: number };
            let allItems = [...(firstPage.items ?? [])];
            const total = firstPage.total ?? allItems.length;
            const pages = Math.ceil(total / 1000);

            for (let currentPage = 2; currentPage <= pages; currentPage += 1) {
                const response = await api.get('/messaging/recipients', {
                    params: {
                        ...filters,
                        cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
                        sheet: selectedSheet || undefined,
                        status: filters.status || undefined,
                        page: currentPage,
                        limit: 1000,
                    },
                });
                allItems = allItems.concat(response.data?.items ?? []);
            }

            const worksheet = XLSX.utils.json_to_sheet(
                allItems.map((recipient) => buildRecipientExcelRow({
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
                })),
            );
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Recipients');
            const fileName = selectedSheet ? `recipients_${selectedSheet.toLowerCase()}.xlsx` : 'recipients.xlsx';
            XLSX.writeFile(workbook, fileName);
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
        setEditingTemplateId(template.id);
        setTemplateForm({
            name: template.name,
            type: template.type,
            subject: template.subject,
            body: template.body,
        });
        setActiveTemplateField('body');
        setIsTemplateComposerOpen(true);
        updateTab('templates');
    };

    const openTemplateComposer = () => {
        setEditingTemplateId(null);
        setTemplateForm(EMPTY_TEMPLATE_FORM);
        setActiveTemplateField('body');
        setIsTemplateComposerOpen(true);
    };

    const closeTemplateComposer = () => {
        setEditingTemplateId(null);
        setTemplateForm(EMPTY_TEMPLATE_FORM);
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
        setActiveTemplateField('body');
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
        if (!emailSettingsForm.sender_name.trim() || !emailSettingsForm.sender_email.trim()) {
            toast.error(t('emailSettingsValidationError'));
            return;
        }
        saveEmailSettingsMutation.mutate();
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

    return (
        <section className="space-y-4 py-4 md:space-y-5 md:py-5">
            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-4 shadow-sm shadow-slate-900/5 md:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-950 md:text-[2rem]">{copy.heroTitle}</h1>
                        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 md:text-sm">
                            {copy.heroSubtitle}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <div className={statClass}>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.visibleCount}</div>
                            <div className="mt-2 text-2xl font-semibold text-slate-950">{totalRecipients}</div>
                        </div>
                        <div className={statClass}>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.selectedCount}</div>
                            <div className="mt-2 text-2xl font-semibold text-slate-950">{selectedRecipientIds.length}</div>
                        </div>
                        <div className={statClass}>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.pendingCount}</div>
                            <div className="mt-2 text-2xl font-semibold text-amber-700">{pageStats.pending}</div>
                        </div>
                        <div className={statClass}>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.sentCount}</div>
                            <div className="mt-2 text-2xl font-semibold text-emerald-700">{pageStats.sent}</div>
                        </div>
                        <button
                            className="btn-outline shrink-0"
                            type="button"
                            onClick={() => void refreshAll()}
                            disabled={recipientsQuery.isFetching || templatesQuery.isFetching || logsQuery.isFetching}
                        >
                            <RefreshCcw size={16} />
                            <span>{copy.refresh}</span>
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'recipients' && (
                <div className="space-y-6">
                    <div className={cardClass}>
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
                                            {availableSheets.length ? availableSheets.map((sheet) => {
                                                const active = selectedSheet === sheet.value;
                                                const sheetLabel = sheet.value === 'LEGACY' ? copy.legacySheet : sheet.value;
                                                return (
                                                    <button
                                                        key={sheet.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setPage(1);
                                                            setSelectedRecipientIds([]);
                                                            setSelectedSheet(sheet.value);
                                                        }}
                                                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                                            active
                                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm'
                                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        {sheetLabel} ({sheet.count})
                                                    </button>
                                                );
                                            }) : (
                                                <div className="text-sm text-slate-500">{copy.noSheets}</div>
                                            )}
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
                                    <table className="min-w-full divide-y divide-slate-200 text-start text-sm">
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
                                                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">{copy.errorLabel}</th>
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
                                                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[recipient.status]}`}>
                                                                <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                                                                {copy.statusLabels[recipient.status]}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 align-top">
                                                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${CONFIRMATION_STYLES[responseState]}`}>
                                                                <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                                                                {responseState === 'confirmed'
                                                                    ? copy.confirmedLabels.confirmed
                                                                    : responseState === 'declined'
                                                                        ? copy.confirmedLabels.declined
                                                                        : copy.confirmedLabels.pending}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 align-top text-slate-700">{recipient.attempts_count ?? 0}</td>
                                                        <td className="px-4 py-4 align-top text-slate-700">
                                                            {recipient.last_attempt_at ? new Date(recipient.last_attempt_at).toLocaleString() : EMPTY_VALUE_LABEL}
                                                        </td>
                                                        <td className="max-w-[220px] px-4 py-4 align-top text-xs text-rose-700">
                                                            <div className="truncate" title={recipient.error_message || EMPTY_VALUE_LABEL}>
                                                                {recipient.error_message || EMPTY_VALUE_LABEL}
                                                            </div>
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
                                                        {isArabic ? 'قوالب جاهزة سريعة' : 'Quick luxury presets'}
                                                    </div>
                                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                                        {isArabic
                                                            ? 'حمّل شكل EST I أو EST II الجاهز، ثم عدّل أي جزء في الـ HTML من نفس شاشة الإديت.'
                                                            : 'Load the EST I or EST II luxury layout, then edit every part of the HTML directly from this editor.'}
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
                                                ? 'تقدر تكتب HTML كامل داخل نص التيمبلت. الإيميل هيتبعت بنفس التصميم، ولو القناة Email + WhatsApp فالواتساب هيستقبل نسخة نصية نظيفة تلقائيًا.'
                                                : 'You can author full HTML inside the template body. Email will keep the rich layout, and if the template is Email + WhatsApp, WhatsApp will receive a clean text fallback automatically.'}
                                        </div>
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

                                            {templateForm.type !== 'EMAIL' ? (
                                                <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3">
                                                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                                        {isArabic ? 'نسخة واتساب النصية' : 'WhatsApp text fallback'}
                                                    </div>
                                                    <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-900">
                                                        {stripHtmlPreviewText(templateComposerBodyPreview) || copy.templateBody}
                                                    </div>
                                                </div>
                                            ) : null}
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

                    <div className={cardClass}>
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
                        <div className="mt-5 space-y-4">
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
                                const renderedBody = renderTemplateBodyPreview(template.body);
                                const summaryText = stripHtmlPreviewText(renderedBody);

                                return (
                                    <div key={template.id} className="rounded-[1.5rem] border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-sm">
                                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                            <div className="space-y-2">
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
                                                </div>
                                                <p className="text-sm font-medium text-slate-700">{renderedSubject}</p>
                                                <p className="text-sm leading-6 text-slate-500">{summaryText || copy.templateBody}</p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <button type="button" className="btn-outline" onClick={() => beginEditTemplate(template)}>
                                                    {copy.edit}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-secondary"
                                                    onClick={() => {
                                                        setCampaignTemplateId(template.id);
                                                        updateTab('campaign');
                                                    }}
                                                >
                                                    {copy.useForCampaign}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-danger"
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
                <div className="space-y-6">
                    <div className={cardClass}>
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
                                        {isHtmlTemplateBody(currentTemplate.body) && currentTemplate.type !== 'WHATSAPP' ? (
                                            <div className="mt-4 template-preview-shell rounded-[1.6rem] p-3">
                                                <div className="template-preview-email-shell overflow-hidden rounded-[1.35rem]">
                                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-xs text-slate-500">
                                                        <span>{isArabic ? 'معاينة الإيميل' : 'Email preview'}</span>
                                                        <span>{TEMPLATE_PREVIEW_RECIPIENT.email}</span>
                                                    </div>
                                                    <iframe
                                                        title="Campaign template email preview"
                                                        className="h-[480px] w-full bg-white"
                                                        sandbox=""
                                                        srcDoc={currentTemplatePreviewDocument}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                                {renderTemplateTokens(currentTemplate.body, TEMPLATE_PREVIEW_RECIPIENT)}
                                            </p>
                                        )}
                                        {currentTemplate.type !== 'EMAIL' ? (
                                            <div className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                                                {stripHtmlPreviewText(currentTemplateBodyPreview)}
                                            </div>
                                        ) : null}
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
                    </div>

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
                                    <table className="min-w-full divide-y divide-slate-200 text-start text-sm">
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
                </div>
            )}
            {activeTab === 'settings' && (
                isSuperAdmin ? (
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
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

                            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('emailIdentityTitle')}</div>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{t('emailIdentityDescription')}</p>

                                <div className="mt-5 grid gap-4">
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
                                            readOnly
                                            className="input w-full cursor-not-allowed bg-slate-100 text-slate-500"
                                        />
                                        <p className="mt-2 text-xs text-slate-500">{t('senderEmailHint')}</p>
                                    </div>

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
                        </div>

                        <div className="space-y-6">
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
