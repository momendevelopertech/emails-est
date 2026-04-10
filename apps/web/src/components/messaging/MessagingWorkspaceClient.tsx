'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
    CheckCircle2,
    FileSpreadsheet,
    Filter,
    LayoutPanelTop,
    Mail,
    MessageSquare,
    RefreshCcw,
    Search,
    SendHorizontal,
    SquarePen,
    Users,
} from 'lucide-react';
import api from '@/lib/api';
import { useRequireAuth } from '@/lib/use-auth';
import { REQUIRED_UPLOAD_COLUMNS, validateUploadHeaders } from './upload-utils';

type WorkspaceTab = 'recipients' | 'templates' | 'campaign';
type TemplateType = 'BOTH' | 'EMAIL' | 'WHATSAPP';
type SendScope = 'selected' | 'filtered' | 'all_pending' | 'failed';

type Recipient = {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    exam_type?: string | null;
    role?: string | null;
    day?: string | null;
    date?: string | null;
    status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
    error_message?: string | null;
    attempts_count?: number;
    last_attempt_at?: string | null;
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
    };
};

const EMPTY_RECIPIENTS: Recipient[] = [];

const STATUS_STYLES: Record<Recipient['status'], string> = {
    PENDING: 'bg-amber-50 text-amber-800 border border-amber-200',
    PROCESSING: 'bg-sky-50 text-sky-800 border border-sky-200',
    SENT: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    FAILED: 'bg-rose-50 text-rose-800 border border-rose-200',
};

const CHANNEL_STYLES: Record<TemplateType, string> = {
    BOTH: 'bg-slate-900 text-white',
    EMAIL: 'bg-cyan-50 text-cyan-800 border border-cyan-200',
    WHATSAPP: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
};

const isWorkspaceTab = (value?: string | null): value is WorkspaceTab =>
    value === 'recipients' || value === 'templates' || value === 'campaign';

export default function MessagingWorkspaceClient({ locale }: { locale: string }) {
    const isArabic = locale === 'ar';
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { user, ready, isChecking, error } = useRequireAuth(locale);

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
            ? 'بعد الرفع ستظهر البيانات فورًا في الجدول بالأسفل مع الحالة لكل مستلم.'
            : 'After import, recipients will appear immediately in the table below with delivery status.',
        uploadTemplate: isArabic ? 'تحميل قالب فارغ' : 'Download template',
        uploadSample: isArabic ? 'تحميل مثال جاهز' : 'Download sample',
        selectFile: isArabic ? 'اختر ملف Excel' : 'Choose Excel file',
        importedCount: isArabic ? 'تم استيراد' : 'Imported',
        recipientsSectionTitle: isArabic ? 'جدول المستلمين' : 'Recipients table',
        recipientsSectionHint: isArabic
            ? 'فلتر بالاسم أو الامتحان أو الدور أو اليوم أو الحالة، وحدد من تريد إرساله.'
            : 'Filter by name, exam, role, day or status, then select who should receive the campaign.',
        searchPlaceholder: isArabic ? 'ابحث بالاسم أو الإيميل أو رقم الهاتف' : 'Search by name, email or phone',
        examType: isArabic ? 'نوع الامتحان' : 'Exam type',
        role: isArabic ? 'الدور' : 'Role',
        day: isArabic ? 'اليوم' : 'Day',
        status: isArabic ? 'الحالة' : 'Status',
        clearFilters: isArabic ? 'مسح الفلاتر' : 'Clear filters',
        visibleCount: isArabic ? 'إجمالي النتائج' : 'Matching recipients',
        selectedCount: isArabic ? 'المحدد' : 'Selected',
        pendingCount: isArabic ? 'معلق' : 'Pending',
        sentCount: isArabic ? 'مرسل' : 'Sent',
        failedCount: isArabic ? 'فشل' : 'Failed',
        selectAll: isArabic ? 'تحديد الكل في الصفحة' : 'Select page',
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
        templatesTitle: isArabic ? 'القوالب الجاهزة' : 'Saved templates',
        templatesHint: isArabic
            ? 'أنشئ قوالب منفصلة للإيميل أو الواتساب أو الاثنين معًا، ثم استخدمها في الإرسال.'
            : 'Create reusable templates for email, WhatsApp or both, then use them in campaigns.',
        templateName: isArabic ? 'اسم القالب' : 'Template name',
        templateType: isArabic ? 'قناة الإرسال' : 'Delivery channel',
        templateSubject: isArabic ? 'عنوان الإيميل' : 'Email subject',
        templateBody: isArabic ? 'نص الرسالة' : 'Message body',
        createTemplate: isArabic ? 'إنشاء قالب' : 'Create template',
        updateTemplate: isArabic ? 'تحديث القالب' : 'Update template',
        cancelEdit: isArabic ? 'إلغاء التعديل' : 'Cancel edit',
        useForCampaign: isArabic ? 'استخدمه في الإرسال' : 'Use in campaign',
        noTemplates: isArabic ? 'لا توجد قوالب محفوظة بعد.' : 'No templates saved yet.',
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
        openTemplates: isArabic ? 'افتح القوالب' : 'Open templates',
        needTemplate: isArabic ? 'اختر قالبًا قبل الإرسال.' : 'Choose a template before sending.',
        needSelection: isArabic ? 'حدد مستلمًا واحدًا على الأقل للإرسال المحدد.' : 'Select at least one recipient for targeted sending.',
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
    const [page, setPage] = useState(1);
    const [pageSize] = useState(25);
    const [filters, setFilters] = useState({
        search: '',
        exam_type: '',
        role: '',
        day: '',
        status: '',
    });
    const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
    const [fileName, setFileName] = useState('');
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const [templateForm, setTemplateForm] = useState({
        name: '',
        type: 'BOTH' as TemplateType,
        subject: '',
        body: '',
    });
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [campaignTemplateId, setCampaignTemplateId] = useState('');
    const [sendScope, setSendScope] = useState<SendScope>('selected');

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

    const recipientsQuery = useQuery<{ items: Recipient[]; total: number; page: number; limit: number }>({
        queryKey: ['messaging-recipients', filters, page, pageSize],
        queryFn: async () => {
            const response = await api.get('/messaging/recipients', {
                params: {
                    ...filters,
                    status: filters.status || undefined,
                    page,
                    limit: pageSize,
                },
            });
            return response.data;
        },
        enabled: ready,
        placeholderData: keepPreviousData,
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
        queryKey: ['messaging-logs'],
        queryFn: async () => {
            const response = await api.get('/messaging/logs', { params: { limit: 12 } });
            return response.data;
        },
        enabled: ready,
    });

    useEffect(() => {
        if (!campaignTemplateId && templatesQuery.data?.length) {
            setCampaignTemplateId(templatesQuery.data[0].id);
        }
    }, [campaignTemplateId, templatesQuery.data]);

    const refreshAll = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['messaging-recipients'] }),
            queryClient.invalidateQueries({ queryKey: ['messaging-templates'] }),
            queryClient.invalidateQueries({ queryKey: ['messaging-logs'] }),
        ]);
    };

    const importMutation = useMutation({
        mutationFn: async (rows: Array<Record<string, string>>) => {
            await api.get('/auth/csrf', { headers: { 'x-skip-activity': '1' } });
            const response = await api.post('/messaging/recipients/import', { recipients: rows });
            return response.data;
        },
        onSuccess(data) {
            setPreviewCount(data.imported ?? 0);
            toast.success(copy.uploadSuccess);
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipients'] });
        },
        onError(error: any) {
            toast.error(error?.message || copy.uploadError);
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
            await api.get('/auth/csrf', { headers: { 'x-skip-activity': '1' } });
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
            await api.get('/auth/csrf', { headers: { 'x-skip-activity': '1' } });
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

    const recipients = recipientsQuery.data?.items ?? EMPTY_RECIPIENTS;
    const totalRecipients = recipientsQuery.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalRecipients / pageSize));
    const currentTemplate = templatesQuery.data?.find((template) => template.id === campaignTemplateId) || null;
    const selectedVisibleRecipients = recipients.filter((recipient) => selectedRecipientIds.includes(recipient.id));

    const pageStats = useMemo(() => ({
        pending: recipients.filter((recipient) => recipient.status === 'PENDING').length,
        sent: recipients.filter((recipient) => recipient.status === 'SENT').length,
        failed: recipients.filter((recipient) => recipient.status === 'FAILED').length,
    }), [recipients]);

    const allVisibleSelected = recipients.length > 0 && recipients.every((recipient) => selectedRecipientIds.includes(recipient.id));

    const updateFilter = (key: keyof typeof filters, value: string) => {
        setPage(1);
        setFilters((current) => ({ ...current, [key]: value }));
    };

    const clearFilters = () => {
        setPage(1);
        setFilters({ search: '', exam_type: '', role: '', day: '', status: '' });
    };

    const toggleRecipient = (recipientId: string) => {
        setSelectedRecipientIds((current) => (
            current.includes(recipientId)
                ? current.filter((id) => id !== recipientId)
                : [...current, recipientId]
        ));
    };

    const toggleAllVisible = () => {
        if (allVisibleSelected) {
            setSelectedRecipientIds((current) => current.filter((id) => !recipients.some((recipient) => recipient.id === id)));
            return;
        }

        setSelectedRecipientIds((current) => Array.from(new Set([...current, ...recipients.map((recipient) => recipient.id)])));
    };

    const downloadWorkbook = (kind: 'template' | 'sample') => {
        const workbook = XLSX.utils.book_new();
        const rows: string[][] = [
            [...REQUIRED_UPLOAD_COLUMNS],
            ...(kind === 'sample'
                ? [[
                    'Ahmed Ali',
                    'ahmed.ali@example.com',
                    '01012345678',
                    'EST 1',
                    'Senior',
                    'Friday',
                    '2026-04-10',
                    'Nasr City Center',
                    'Engineering',
                    'A-12',
                    'Nasr City, Cairo',
                    'https://maps.app.goo.gl/example',
                    '08:30',
                ]]
                : []),
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'recipients');
        XLSX.writeFile(workbook, kind === 'sample' ? 'messaging-recipients-sample.xlsx' : 'messaging-recipients-template.xlsx');
    };

    const parseWorkbook = async (file: File) => {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

        if (rows.length < 2 || !Array.isArray(rows[0])) {
            throw new Error(isArabic
                ? 'الملف يجب أن يحتوي على صف عناوين وصف بيانات واحد على الأقل.'
                : 'The sheet must contain a header row and at least one data row.');
        }

        const rawHeaders = rows[0].map((value) => String(value || ''));
        const { normalized: headers, missing } = validateUploadHeaders(rawHeaders);
        if (missing.length) {
            throw new Error(isArabic
                ? `الأعمدة الناقصة: ${missing.join(', ')}`
                : `Missing required headers: ${missing.join(', ')}`);
        }

        return rows
            .slice(1)
            .map((row) => {
                const values = Array.isArray(row) ? row : [];
                return headers.reduce((acc, header, index) => {
                    acc[header] = String(values[index] ?? '').trim();
                    return acc;
                }, {} as Record<string, string>);
            })
            .filter((item) => item.name || item.email || item.phone);
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setPreviewCount(null);

        try {
            const rows = await parseWorkbook(file);
            if (!rows.length) {
                throw new Error(isArabic ? 'لم يتم العثور على مستلمين داخل الملف.' : 'No recipients were found in the file.');
            }
            importMutation.mutate(rows);
        } catch (error: any) {
            toast.error(error?.message || copy.uploadError);
        } finally {
            event.target.value = '';
        }
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

    const buildFilterPayload = (applyPendingFallback = true) => {
        const payload: Record<string, string> = {};
        if (filters.search.trim()) payload.search = filters.search.trim();
        if (filters.exam_type.trim()) payload.exam_type = filters.exam_type.trim();
        if (filters.role.trim()) payload.role = filters.role.trim();
        if (filters.day.trim()) payload.day = filters.day.trim();
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
            sendMutation.mutate({ templateId: campaignTemplateId, mode: 'selected', ids: selectedRecipientIds });
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
            sendMutation.mutate({ templateId: campaignTemplateId, mode: 'all_pending' });
            return;
        }

        retryMutation.mutate({ templateId: campaignTemplateId });
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

                                <div className="flex flex-wrap gap-2">
                                    <button type="button" className="btn-outline" onClick={() => toggleAllVisible()} disabled={!recipients.length}>
                                        {allVisibleSelected ? copy.clearSelection : copy.selectAll}
                                    </button>
                                    <button type="button" className="btn-outline" onClick={() => setSelectedRecipientIds([])} disabled={!selectedRecipientIds.length}>
                                        {copy.clearSelection}
                                    </button>
                                    <button type="button" className="btn-primary" onClick={() => updateTab('campaign')} disabled={!selectedRecipientIds.length}>
                                        {copy.goToSend}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                                <label className="relative block xl:col-span-2">
                                    <Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        value={filters.search}
                                        onChange={(event) => updateFilter('search', event.target.value)}
                                        className="input w-full !ps-11"
                                        placeholder={copy.searchPlaceholder}
                                    />
                                </label>

                                <input value={filters.exam_type} onChange={(event) => updateFilter('exam_type', event.target.value)} className="input w-full" placeholder={copy.examType} />
                                <input value={filters.role} onChange={(event) => updateFilter('role', event.target.value)} className="input w-full" placeholder={copy.role} />
                                <input value={filters.day} onChange={(event) => updateFilter('day', event.target.value)} className="input w-full" placeholder={copy.day} />
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

                            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200 text-start text-sm">
                                        <thead className="bg-slate-50 text-slate-600">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    <input type="checkbox" checked={allVisibleSelected} onChange={() => toggleAllVisible()} />
                                                </th>
                                                <th className="px-4 py-3">{copy.name}</th>
                                                <th className="px-4 py-3">{copy.contact}</th>
                                                <th className="px-4 py-3">{copy.details}</th>
                                                <th className="px-4 py-3">{copy.status}</th>
                                                <th className="px-4 py-3">{copy.attempts}</th>
                                                <th className="px-4 py-3">{copy.lastAttempt}</th>
                                                <th className="px-4 py-3">{copy.errorLabel}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white">
                                            {recipientsQuery.isLoading ? (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">{copy.loading}</td>
                                                </tr>
                                            ) : recipients.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">{copy.emptyRecipients}</td>
                                                </tr>
                                            ) : recipients.map((recipient) => (
                                                <tr key={recipient.id} className="hover:bg-slate-50/80">
                                                    <td className="px-4 py-4 align-top">
                                                        <input type="checkbox" checked={selectedRecipientIds.includes(recipient.id)} onChange={() => toggleRecipient(recipient.id)} />
                                                    </td>
                                                    <td className="px-4 py-4 align-top">
                                                        <div className="font-semibold text-slate-900">{recipient.name || '-'}</div>
                                                        <div className="mt-1 text-xs text-slate-500">{recipient.id}</div>
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
                                                            <div><strong>{copy.examType}:</strong> {recipient.exam_type || '-'}</div>
                                                            <div><strong>{copy.role}:</strong> {recipient.role || '-'}</div>
                                                            <div><strong>{copy.day}:</strong> {recipient.day || '-'}</div>
                                                            <div><strong>Date:</strong> {recipient.date || '-'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top">
                                                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[recipient.status]}`}>
                                                            {copy.statusLabels[recipient.status]}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 align-top text-slate-700">{recipient.attempts_count ?? 0}</td>
                                                    <td className="px-4 py-4 align-top text-slate-700">
                                                        {recipient.last_attempt_at ? new Date(recipient.last_attempt_at).toLocaleString() : '-'}
                                                    </td>
                                                    <td className="px-4 py-4 align-top text-xs text-rose-700">{recipient.error_message || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm text-slate-500">
                                    {copy.page} {page} / {totalPages}
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
            )}

            {activeTab === 'templates' && (
                <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
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
                        <h2 className="text-xl font-semibold text-slate-950">{copy.templatesTitle}</h2>
                        <div className="mt-5 space-y-4">
                            {templatesQuery.isLoading ? (
                                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">{copy.loading}</div>
                            ) : templatesQuery.data?.length ? templatesQuery.data.map((template) => (
                                <div key={template.id} className="rounded-[1.5rem] border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-sm">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">{copy.noTemplates}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'campaign' && (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_420px]">
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

                            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.selectedTemplate}</div>
                                    {currentTemplate ? (
                                        <div className="mt-3 space-y-3">
                                            <select
                                                value={campaignTemplateId}
                                                onChange={(event) => setCampaignTemplateId(event.target.value)}
                                                className="input w-full"
                                            >
                                                {templatesQuery.data?.map((template) => (
                                                    <option key={template.id} value={template.id}>{template.name}</option>
                                                ))}
                                            </select>
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${CHANNEL_STYLES[currentTemplate.type]}`}>
                                                {copy.templateTypeLabels[currentTemplate.type]}
                                            </span>
                                            <div className="text-base font-semibold text-slate-900">{currentTemplate.subject}</div>
                                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{currentTemplate.body}</p>
                                        </div>
                                    ) : (
                                        <div className="mt-3 rounded-[1.25rem] border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                                            {copy.noTemplateSelected}
                                            <div className="mt-3">
                                                <button type="button" className="btn-outline" onClick={() => updateTab('templates')}>
                                                    {copy.openTemplates}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.sendScopeTitle}</div>
                                    <div className="mt-3 grid gap-3">
                                        {(Object.keys(copy.sendScopes) as SendScope[]).map((scope) => {
                                            const active = sendScope === scope;
                                            return (
                                                <button
                                                    key={scope}
                                                    type="button"
                                                    onClick={() => setSendScope(scope)}
                                                    className={`rounded-[1.25rem] border px-4 py-3 text-start transition ${
                                                        active
                                                            ? 'border-emerald-200 bg-emerald-50 shadow-sm'
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
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-3">
                                <div className={statClass}>
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.selectedCount}</div>
                                    <div className="mt-3 text-3xl font-semibold text-slate-950">{selectedRecipientIds.length}</div>
                                </div>
                                <div className={statClass}>
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.visibleCount}</div>
                                    <div className="mt-3 text-3xl font-semibold text-slate-950">{totalRecipients}</div>
                                </div>
                                <div className={statClass}>
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.failedCount}</div>
                                    <div className="mt-3 text-3xl font-semibold text-rose-700">{pageStats.failed}</div>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleSend}
                                    disabled={sendMutation.isPending || retryMutation.isPending || !currentTemplate}
                                >
                                    {sendMutation.isPending || retryMutation.isPending ? copy.sending : copy.sendNow}
                                </button>
                                <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={() => retryMutation.mutate({ templateId: campaignTemplateId })}
                                    disabled={!campaignTemplateId || retryMutation.isPending || sendMutation.isPending}
                                >
                                    {copy.retryFailed}
                                </button>
                                {selectedVisibleRecipients.length > 0 && (
                                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                                        <Users size={15} />
                                        <span>
                                            Selected on this page: {selectedVisibleRecipients.map((recipient) => recipient.name).slice(0, 3).join(', ')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={cardClass}>
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                                    <LayoutPanelTop size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-950">{copy.recentLogs}</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{copy.logsHint}</p>
                                </div>
                            </div>

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
                                                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[log.status]}`}>
                                                            {copy.statusLabels[log.status]}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-xs text-rose-700">{log.error || '-'}</td>
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
                        </div>
                    </div>

                    <div className={cardClass}>
                        <h2 className="text-xl font-semibold text-slate-950">Current workspace summary</h2>
                        <div className="mt-5 space-y-4">
                            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.sendScopes[sendScope].title}</div>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{copy.sendScopes[sendScope].description}</p>
                            </div>
                            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current filters</div>
                                <div className="mt-3 space-y-2 text-sm text-slate-700">
                                    <div>{copy.examType}: <strong>{filters.exam_type || '-'}</strong></div>
                                    <div>{copy.role}: <strong>{filters.role || '-'}</strong></div>
                                    <div>{copy.day}: <strong>{filters.day || '-'}</strong></div>
                                    <div>{copy.status}: <strong>{filters.status ? copy.statusLabels[filters.status as keyof typeof copy.statusLabels] : '-'}</strong></div>
                                </div>
                            </div>
                            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current user</div>
                                <div className="mt-3 text-sm text-slate-700">
                                    <div className="font-semibold text-slate-900">{user?.fullName}</div>
                                    <div dir="ltr">{user?.email}</div>
                                </div>
                            </div>
                            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                                To send to a single person, check the row in the recipients table then use the &quot;Selected rows&quot; scope in the campaign tab.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
