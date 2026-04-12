'use client';

import { ChangeEvent, MouseEvent, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import {
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    FileSpreadsheet,
    Filter,
    LayoutPanelTop,
    Mail,
    MessageSquare,
    RefreshCcw,
    Search,
    SendHorizontal,
    Settings,
    Server,
    SquarePen,
    Users,
} from 'lucide-react';
import api, { fetchCsrfToken } from '@/lib/api';
import { useRequireAuth } from '@/lib/use-auth';
import {
    downloadWorkbook as downloadRecipientWorkbook,
    getImportErrorMessage,
    parseRecipientWorkbook,
    type RecipientImportRow,
} from './upload-utils';

type WorkspaceTab = 'recipients' | 'templates' | 'campaign' | 'settings';
type TemplateType = 'BOTH' | 'EMAIL' | 'WHATSAPP';
type SendScope = 'selected' | 'filtered' | 'all_pending' | 'failed';

type Recipient = {
    id: string;
    cycleId?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
    room_est1?: string | null;
    type?: string | null;
    governorate?: string | null;
    address?: string | null;
    building?: string | null;
    location?: string | null;
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

type RecipientFormState = {
    name: string;
    email: string;
    phone: string;
    role: string;
    room_est1: string;
    type: string;
    governorate: string;
    address: string;
    building: string;
    location: string;
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
};

const EMPTY_RECIPIENTS: Recipient[] = [];
const EMPTY_RECIPIENT_FORM: RecipientFormState = {
    name: '',
    email: '',
    phone: '',
    role: '',
    room_est1: '',
    type: '',
    governorate: '',
    address: '',
    building: '',
    location: '',
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

const ALL_CYCLES_VALUE = '__all_cycles__';

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

const isWorkspaceTab = (value?: string | null): value is WorkspaceTab =>
    value === 'recipients' || value === 'templates' || value === 'campaign' || value === 'settings';

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
        roomEst1: isArabic ? 'غرفة EST1' : 'ROOM EST1',
        typeLabel: isArabic ? 'النوع' : 'Type',
        governorate: isArabic ? 'المحافظة' : 'Governorate',
        address: isArabic ? 'العنوان' : 'Address',
        building: isArabic ? 'المبنى' : 'Building',
        location: isArabic ? 'الموقع' : 'Location',
        emailLabel: isArabic ? 'الإيميل' : 'Email',
        status: isArabic ? 'الحالة' : 'Status',
        clearFilters: isArabic ? 'مسح الفلاتر' : 'Clear filters',
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
        recipientDeleteError: isArabic ? 'تعذر حذف الصف.' : 'Unable to delete the row.',
        recipientNameRequired: isArabic ? 'يرجى إدخال اسم المستلم.' : 'Please enter the recipient name.',
        recipientDeleteConfirm: isArabic ? 'هل أنت متأكد من حذف هذا الصف؟' : 'Are you sure you want to delete this row?',
        statusLabels: {
            PENDING: isArabic ? 'معلق' : 'Pending',
            PROCESSING: isArabic ? 'قيد التنفيذ' : 'Processing',
            SENT: isArabic ? 'تم الإرسال' : 'Sent',
            FAILED: isArabic ? 'فشل' : 'Failed',
        },
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
    const [page, setPage] = useState(1);
    const [pageSize] = useState(25);
    const [filters, setFilters] = useState<RecipientFilters>(EMPTY_FILTERS);
    const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
    const [fileName, setFileName] = useState('');
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const [templateForm, setTemplateForm] = useState({
        name: '',
        type: 'BOTH' as TemplateType,
        subject: '',
        body: '',
    });
    const [templateSearch, setTemplateSearch] = useState('');
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [campaignTemplateId, setCampaignTemplateId] = useState('');
    const [sendScope, setSendScope] = useState<SendScope>('selected');
    const [logsExpanded, setLogsExpanded] = useState(false);
    const [emailSettingsForm, setEmailSettingsForm] = useState({
        sender_name: '',
        sender_email: '',
    });
    const [recipientForm, setRecipientForm] = useState<RecipientFormState>(EMPTY_RECIPIENT_FORM);
    const [editingRecipientId, setEditingRecipientId] = useState<string | null>(null);
    const [isRecipientFormOpen, setIsRecipientFormOpen] = useState(false);

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
        queryKey: ['messaging-recipients', filters, selectedCycleId, page, pageSize],
        queryFn: async () => {
            const response = await api.get('/messaging/recipients', {
                params: {
                    ...filters,
                    cycleId: selectedCycleId === ALL_CYCLES_VALUE ? undefined : selectedCycleId,
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

    const importMutation = useMutation({
        mutationFn: async (payload: { sourceFileName: string; recipients: Array<Record<string, string>> }) => {
            await fetchCsrfToken();
            const response = await api.post('/messaging/recipients/import', {
                source_file_name: payload.sourceFileName,
                recipients: payload.recipients,
            });
            return response.data;
        },
        onSuccess(data) {
            setPreviewCount(data.imported ?? 0);
            if (data.cycle?.id) {
                setSelectedCycleId(data.cycle.id);
                setCycleSelectionReady(true);
            }
            toast.success(copy.uploadSuccess);
            void refreshAll();
        },
        onError(error: any) {
            toast.error(getImportErrorMessage(error, copy.uploadError));
        },
    });

    const saveRecipientMutation = useMutation({
        mutationFn: async ({ recipientId, values }: { recipientId: string | null; values: RecipientFormState }) => {
            await fetchCsrfToken();
            if (recipientId) {
                const response = await api.put(`/messaging/recipients/${recipientId}`, values);
                return response.data;
            }

            const response = await api.post('/messaging/recipients', values);
            return response.data;
        },
        onSuccess(_data, variables) {
            toast.success(variables.recipientId ? copy.recipientUpdated : copy.recipientCreated);
            setRecipientForm(EMPTY_RECIPIENT_FORM);
            setEditingRecipientId(null);
            setIsRecipientFormOpen(false);
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipients'] });
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
                setEditingRecipientId(null);
                setIsRecipientFormOpen(false);
            }
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipients'] });
        },
        onError(error: any) {
            toast.error(getImportErrorMessage(error, copy.recipientDeleteError));
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
            setTemplateForm({ name: '', type: 'BOTH', subject: '', body: '' });
            setEditingTemplateId(null);
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

    const filterOptions = recipientFilterOptionsQuery.data ?? { roles: [], types: [], governorates: [] };

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

    const downloadWorkbook = (kind: 'template' | 'sample') => {
        downloadRecipientWorkbook(kind);
    };

    const parseWorkbook = async (file: File) => parseRecipientWorkbook(file, locale);
    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setPreviewCount(null);

        try {
            const parsedWorkbook = await parseWorkbook(file);
            if (!parsedWorkbook.recipients.length) {
                throw new Error(isArabic ? 'لم يتم العثور على مستلمين داخل الملف.' : 'No recipients were found in the file.');
            }
            importMutation.mutate(parsedWorkbook);
        } catch (error: any) {
            toast.error(getImportErrorMessage(error, copy.uploadError));
        } finally {
            event.target.value = '';
        }
    };

    const openCreateRecipientForm = () => {
        setEditingRecipientId(null);
        setRecipientForm(EMPTY_RECIPIENT_FORM);
        setIsRecipientFormOpen(true);
    };

    const openEditRecipientForm = (recipient: Recipient) => {
        setEditingRecipientId(recipient.id);
        setRecipientForm({
            name: recipient.name || '',
            email: recipient.email || '',
            phone: recipient.phone || '',
            role: recipient.role || '',
            room_est1: recipient.room_est1 || '',
            type: recipient.type || '',
            governorate: recipient.governorate || '',
            address: recipient.address || '',
            building: recipient.building || '',
            location: recipient.location || '',
        });
        setIsRecipientFormOpen(true);
    };

    const closeRecipientForm = () => {
        setEditingRecipientId(null);
        setRecipientForm(EMPTY_RECIPIENT_FORM);
        setIsRecipientFormOpen(false);
    };

    const updateRecipientForm = (key: keyof RecipientFormState, value: string) => {
        setRecipientForm((current) => ({ ...current, [key]: value }));
    };

    const saveRecipient = () => {
        if (!recipientForm.name.trim()) {
            toast.error(copy.recipientNameRequired);
            return;
        }

        saveRecipientMutation.mutate({
            recipientId: editingRecipientId,
            values: recipientForm,
        });
    };

    const deleteRecipient = (recipientId: string) => {
        if (!window.confirm(copy.recipientDeleteConfirm)) {
            return;
        }

        deleteRecipientMutation.mutate(recipientId);
    };

    const beginEditTemplate = (template: Template) => {
        setEditingTemplateId(template.id);
        setTemplateForm({
            name: template.name,
            type: template.type,
            subject: template.subject,
            body: template.body,
        });
        updateTab('templates');
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

    const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof Users }> = [
        { id: 'recipients', label: copy.tabs.recipients, icon: Users },
        { id: 'templates', label: copy.tabs.templates, icon: LayoutPanelTop },
        { id: 'campaign', label: copy.tabs.campaign, icon: SendHorizontal },
        ...(isSuperAdmin ? [{ id: 'settings' as WorkspaceTab, label: t('settingsTab'), icon: Settings }] : []),
    ];

    const cardClass = 'rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/5';
    const statClass = 'rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm';

    return (
        <section className="space-y-6 py-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_340px]">
                <div className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-slate-900/5">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 size={14} />
                                <span>{copy.readyCredentials}</span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-semibold text-slate-950">{copy.heroTitle}</h1>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{copy.heroSubtitle}</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-start gap-3 lg:items-end">
                            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                <div className="font-semibold text-slate-900">{user?.fullName || 'SPHINX Admin'}</div>
                                <div dir="ltr" className="text-xs text-slate-500">{user?.email || 'superadmin@sphinx.com'}</div>
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

                <div className={`${cardClass} grid gap-3 sm:grid-cols-2 xl:grid-cols-2`}>
                    <div className={statClass}>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.visibleCount}</div>
                        <div className="mt-3 text-3xl font-semibold text-slate-950">{totalRecipients}</div>
                    </div>
                    <div className={statClass}>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.selectedCount}</div>
                        <div className="mt-3 text-3xl font-semibold text-slate-950">{selectedRecipientIds.length}</div>
                    </div>
                    <div className={statClass}>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.pendingCount}</div>
                        <div className="mt-3 text-3xl font-semibold text-amber-700">{pageStats.pending}</div>
                    </div>
                    <div className={statClass}>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.sentCount}</div>
                        <div className="mt-3 text-3xl font-semibold text-emerald-700">{pageStats.sent}</div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => updateTab(tab.id)}
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                active
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                            }`}
                        >
                            <Icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {activeTab === 'recipients' && (
                <div className="space-y-6">
                    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
                        <div className={cardClass}>
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                                    <FileSpreadsheet size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-950">{copy.uploadCardTitle}</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{copy.uploadCardHint}</p>
                                </div>
                            </div>

                            <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4">
                                <label className="block text-sm font-medium text-slate-700">{copy.selectFile}</label>
                                <div className="mt-3">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        className="file-input"
                                        onChange={handleFileChange}
                                        disabled={importMutation.isPending}
                                    />
                                </div>
                                <div className="mt-3 text-xs text-slate-500">{fileName || 'No file selected yet.'}</div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <button type="button" className="btn-outline" onClick={() => downloadWorkbook('template')}>
                                    {copy.uploadTemplate}
                                </button>
                                <button type="button" className="btn-secondary" onClick={() => downloadWorkbook('sample')}>
                                    {copy.uploadSample}
                                </button>
                            </div>

                            {previewCount !== null && (
                                <div className="mt-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                                    {copy.importedCount} <strong>{previewCount}</strong>
                                </div>
                            )}
                        </div>

                        <div className={cardClass}>
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-950">{copy.recipientsSectionTitle}</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{copy.recipientsSectionHint}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                                        {selectedRecipientIds.length} {copy.selectedRowsSummary}
                                    </div>
                                    <button type="button" className="btn-primary" onClick={openCreateRecipientForm}>
                                        {copy.addRecipient}
                                    </button>
                                </div>
                            </div>

                            {isRecipientFormOpen && (
                                <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-950">
                                                {editingRecipientId ? copy.editRecipientTitle : copy.createRecipientTitle}
                                            </h3>
                                            <p className="mt-2 text-sm leading-6 text-slate-500">{copy.recipientFormHint}</p>
                                        </div>
                                        <button type="button" className="btn-outline" onClick={closeRecipientForm}>
                                            {copy.cancelEdit}
                                        </button>
                                    </div>

                                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        <input
                                            value={recipientForm.name}
                                            onChange={(event) => updateRecipientForm('name', event.target.value)}
                                            className="input w-full"
                                            placeholder={copy.name}
                                        />
                                        <input
                                            value={recipientForm.email}
                                            onChange={(event) => updateRecipientForm('email', event.target.value)}
                                            className="input w-full"
                                            placeholder={copy.emailLabel}
                                        />
                                        <input
                                            value={recipientForm.phone}
                                            onChange={(event) => updateRecipientForm('phone', event.target.value)}
                                            className="input w-full"
                                            placeholder="Phone"
                                        />
                                        <input
                                            value={recipientForm.role}
                                            onChange={(event) => updateRecipientForm('role', event.target.value)}
                                            className="input w-full"
                                            placeholder={copy.role}
                                        />
                                        <input
                                            value={recipientForm.room_est1}
                                            onChange={(event) => updateRecipientForm('room_est1', event.target.value)}
                                            className="input w-full"
                                            placeholder={copy.roomEst1}
                                        />
                                        <input
                                            value={recipientForm.type}
                                            onChange={(event) => updateRecipientForm('type', event.target.value)}
                                            className="input w-full"
                                            placeholder={copy.typeLabel}
                                        />
                                        <input
                                            value={recipientForm.governorate}
                                            onChange={(event) => updateRecipientForm('governorate', event.target.value)}
                                            className="input w-full"
                                            placeholder={copy.governorate}
                                        />
                                        <input
                                            value={recipientForm.building}
                                            onChange={(event) => updateRecipientForm('building', event.target.value)}
                                            className="input w-full"
                                            placeholder={copy.building}
                                        />
                                        <input
                                            value={recipientForm.location}
                                            onChange={(event) => updateRecipientForm('location', event.target.value)}
                                            className="input w-full"
                                            placeholder={copy.location}
                                        />
                                        <textarea
                                            value={recipientForm.address}
                                            onChange={(event) => updateRecipientForm('address', event.target.value)}
                                            className="input min-h-28 w-full md:col-span-2 xl:col-span-3"
                                            placeholder={copy.address}
                                        />
                                    </div>

                                    <div className="mt-5 flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={saveRecipient}
                                            disabled={saveRecipientMutation.isPending}
                                        >
                                            {copy.saveRecipient}
                                        </button>
                                        <button type="button" className="btn-outline" onClick={closeRecipientForm}>
                                            {copy.cancelEdit}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        {isArabic ? 'الدورة النشطة' : 'Active cycle'}
                                    </div>
                                    <select
                                        value={selectedCycleId}
                                        onChange={(event) => {
                                            setPage(1);
                                            setSelectedRecipientIds([]);
                                            setSelectedCycleId(event.target.value);
                                        }}
                                        className="input mt-3 w-full"
                                    >
                                        <option value={ALL_CYCLES_VALUE}>{isArabic ? 'كل الدورات' : 'All cycles'}</option>
                                        {cycles.map((cycle) => (
                                            <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                                        ))}
                                    </select>
                                    <div className="mt-3 text-xs leading-6 text-slate-500">
                                        {currentCycle ? (
                                            <>
                                                <div>{isArabic ? 'المستلمين:' : 'Recipients:'} <strong>{currentCycle.recipients_count}</strong></div>
                                                <div>{isArabic ? 'تم الاستيراد:' : 'Imported:'} <strong>{new Date(currentCycle.created_at).toLocaleString()}</strong></div>
                                                <div>{isArabic ? 'الملف:' : 'File:'} <strong>{currentCycle.source_file_name || '-'}</strong></div>
                                            </>
                                        ) : (
                                            <div>{isArabic ? 'عرض كل البيانات المتاحة من جميع الدورات.' : 'Showing recipients from every saved cycle.'}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        {isArabic ? 'فلاتر المستلمين' : 'Recipient filters'}
                                    </div>
                                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <label className="relative block xl:col-span-2">
                                    <Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        value={filters.search}
                                        onChange={(event) => updateFilter('search', event.target.value)}
                                        className="input w-full !ps-11"
                                        placeholder={copy.searchPlaceholder}
                                    />
                                </label>

                                {textRecipientFilterFields.map((field) => (
                                    <input
                                        key={field.key}
                                        value={filters[field.key]}
                                        onChange={(event) => updateFilter(field.key, event.target.value)}
                                        className="input w-full"
                                        placeholder={field.label}
                                    />
                                ))}
                                <select value={filters.role} onChange={(event) => updateFilter('role', event.target.value)} className="input w-full">
                                    <option value="">{copy.role}</option>
                                    {filterOptions.roles.map((role) => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                                <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)} className="input w-full">
                                    <option value="">{copy.typeLabel}</option>
                                    {filterOptions.types.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                <select value={filters.governorate} onChange={(event) => updateFilter('governorate', event.target.value)} className="input w-full">
                                    <option value="">{copy.governorate}</option>
                                    {filterOptions.governorates.map((governorate) => (
                                        <option key={governorate} value={governorate}>{governorate}</option>
                                    ))}
                                </select>
                                <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="input w-full">
                                    <option value="">{copy.status}</option>
                                    {Object.entries(copy.statusLabels).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                <button type="button" className="btn-outline xl:col-span-2" onClick={clearFilters}>
                                    <Filter size={16} />
                                    <span>{copy.clearFilters}</span>
                                </button>
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
                                                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">{copy.emptyRecipients}</td>
                                                </tr>
                                            ) : recipients.map((recipient) => (
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
                                                        <div className="font-semibold text-slate-900">{recipient.name || '-'}</div>
                                                        <div className="mt-1 text-xs text-slate-500">
                                                            {recipient.cycle?.name || recipient.id}
                                                            {recipient.sheet && recipient.sheet !== 'LEGACY' ? ` • ${recipient.sheet}` : ''}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-slate-700">
                                                                <Mail size={14} className="text-slate-400" />
                                                                <span dir="ltr">{recipient.email || '-'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-slate-700">
                                                                <MessageSquare size={14} className="text-slate-400" />
                                                                <span dir="ltr">{recipient.phone || '-'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top">
                                                        <div className="space-y-1 text-xs text-slate-600">
                                                            <div><strong>{isArabic ? 'الشيت' : 'Sheet'}:</strong> {recipient.sheet || 'LEGACY'}</div>
                                                            <div><strong>{copy.roomEst1}:</strong> {recipient.room_est1 || '-'}</div>
                                                            <div><strong>{copy.role}:</strong> {recipient.role || '-'}</div>
                                                            <div><strong>{copy.typeLabel}:</strong> {recipient.type || '-'}</div>
                                                            <div><strong>{copy.governorate}:</strong> {recipient.governorate || '-'}</div>
                                                            <div><strong>{copy.building}:</strong> {recipient.building || '-'}</div>
                                                            <div><strong>{copy.address}:</strong> {recipient.address || '-'}</div>
                                                            <div><strong>{copy.location}:</strong> {recipient.location || '-'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top">
                                                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[recipient.status]}`}>
                                                            <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                                                            {copy.statusLabels[recipient.status]}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 align-top text-slate-700">{recipient.attempts_count ?? 0}</td>
                                                    <td className="px-4 py-4 align-top text-slate-700">
                                                        {recipient.last_attempt_at ? new Date(recipient.last_attempt_at).toLocaleString() : '-'}
                                                    </td>
                                                    <td className="max-w-[220px] px-4 py-4 align-top text-xs text-rose-700">
                                                        <div className="truncate" title={recipient.error_message || '-'}>
                                                            {recipient.error_message || '-'}
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
                                            ))}
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
            )}

            {activeTab === 'templates' && (
                <div className="space-y-6">
                    <div className={cardClass}>
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                                <SquarePen size={22} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-950">{copy.tabs.templates}</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-500">{copy.templatesHint}</p>
                            </div>
                        </div>

                        <div className="mt-5 space-y-4">
                            <input
                                value={templateForm.name}
                                onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))}
                                className="input w-full"
                                placeholder={copy.templateName}
                            />
                            <select
                                value={templateForm.type}
                                onChange={(event) => setTemplateForm((current) => ({ ...current, type: event.target.value as TemplateType }))}
                                className="input w-full"
                            >
                                {Object.entries(copy.templateTypeLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                            <input
                                value={templateForm.subject}
                                onChange={(event) => setTemplateForm((current) => ({ ...current, subject: event.target.value }))}
                                className="input w-full"
                                placeholder={copy.templateSubject}
                            />
                            <textarea
                                rows={10}
                                value={templateForm.body}
                                onChange={(event) => setTemplateForm((current) => ({ ...current, body: event.target.value }))}
                                className="textarea w-full"
                                placeholder={copy.templateBody}
                            />

                            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.preview}</div>
                                <div className="space-y-3">
                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${CHANNEL_STYLES[templateForm.type]}`}>
                                        {copy.templateTypeLabels[templateForm.type]}
                                    </span>
                                    <div className="text-base font-semibold text-slate-900">{templateForm.subject || copy.templateSubject}</div>
                                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{templateForm.body || copy.templateBody}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button type="button" className="btn-primary" onClick={saveTemplate} disabled={saveTemplateMutation.isPending}>
                                    {editingTemplateId ? copy.updateTemplate : copy.createTemplate}
                                </button>
                                {editingTemplateId && (
                                    <button
                                        type="button"
                                        className="btn-outline"
                                        onClick={() => {
                                            setEditingTemplateId(null);
                                            setTemplateForm({ name: '', type: 'BOTH', subject: '', body: '' });
                                        }}
                                    >
                                        {copy.cancelEdit}
                                    </button>
                                )}
                            </div>
                        </div>
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
                            ) : filteredTemplates.length ? filteredTemplates.map((template) => (
                                <div key={template.id} className="rounded-[1.5rem] border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-sm">
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-semibold text-slate-950">{template.name}</h3>
                                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${CHANNEL_STYLES[template.type]}`}>
                                                    {copy.templateTypeLabels[template.type]}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">{template.subject}</p>
                                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-500">{template.body}</p>
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
                            )) : (
                                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                                    {templateSearch.trim() ? copy.noTemplateMatches : copy.noTemplates}
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
                                    <select
                                        value={campaignTemplateId}
                                        onChange={(event) => setCampaignTemplateId(event.target.value)}
                                        className="input w-full"
                                    >
                                        {templatesQuery.data?.map((template) => (
                                            <option key={template.id} value={template.id}>{template.name}</option>
                                        ))}
                                    </select>
                                    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${CHANNEL_STYLES[currentTemplate.type]}`}>
                                                {copy.templateTypeLabels[currentTemplate.type]}
                                            </span>
                                        </div>
                                        <div className="mt-3 text-base font-semibold text-slate-900">{currentTemplate.subject}</div>
                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{currentTemplate.body}</p>
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

