export type TemplateTypeValue = 'EMAIL' | 'WHATSAPP' | 'BOTH';
export type EstTemplateVariant = 'STANDARD' | 'CONFIRMATION';
export type EstExamCode = 'EST I' | 'EST II';

export type EstGuidedTemplateConfig = {
    examCode: EstExamCode;
    variant: EstTemplateVariant;
    examDay: string;
    examDate: string;
    arrivalTime: string;
};

export type TemplatePresetDefinition = {
    id: string;
    name: string;
    type: TemplateTypeValue;
    subject: string;
    body: string;
    description: string;
    guidedConfig: EstGuidedTemplateConfig;
};

export type TemplateEditorVariable = {
    token: string;
    label: string;
};

export type TemplatePreviewRecipient = Record<string, string>;

const EST_LOGO_URL = '{{brand_logo_url}}';
const META_PREFIX = 'EST_TEMPLATE_META:';
const FOOTER_CONTACT_EMAIL = 'noreply@est.com';
const FOOTER_PHYSICAL_ADDRESS = 'EST Operations Office, Cairo, Egypt';

const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildMetaComment = (config: EstGuidedTemplateConfig) => `<!-- ${META_PREFIX}${encodeURIComponent(JSON.stringify(config))} -->`;

const buildBulletproofButton = (label: string, href: string, background: string, width = 220) => `
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:44px;v-text-anchor:middle;width:${width}px;" arcsize="50%" stroke="f" fillcolor="${background}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;">${label}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-- -->
    <a href="${href}" role="button" aria-label="${label}" style="display:block;background:${background};border-radius:999px;color:#ffffff;font-family:Segoe UI,Tahoma,Arial,sans-serif;font-size:14px;font-weight:800;line-height:44px;text-align:center;text-decoration:none;width:${width}px;-webkit-text-size-adjust:none;mso-hide:all;">${label}</a>
    <!--<![endif]-->
`.trim();

const buildFooterBlock = () => `
    <tr>
        <td style="padding:24px 28px 30px;border-top:1px solid #dbe2ea;background:#f8fafc;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                <tr>
                    <td style="padding:0 0 8px;font-size:12px;line-height:18px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#475569;mso-line-height-rule:exactly;">
                        EST
                    </td>
                </tr>
                <tr>
                    <td style="padding:0 0 4px;font-size:13px;line-height:20px;color:#475569;mso-line-height-rule:exactly;">
                        Contact email:
                        <a href="mailto:${FOOTER_CONTACT_EMAIL}" style="color:#0f172a;text-decoration:underline;">${FOOTER_CONTACT_EMAIL}</a>
                    </td>
                </tr>
                <tr>
                    <td style="padding:0 0 4px;font-size:13px;line-height:20px;color:#475569;mso-line-height-rule:exactly;">
                        Physical address: ${FOOTER_PHYSICAL_ADDRESS}
                    </td>
                </tr>
                <tr>
                    <td style="padding:0;font-size:12px;line-height:20px;color:#64748b;mso-line-height-rule:exactly;">
                        Unsubscribe: If you no longer wish to receive these emails, please reply to this message.
                    </td>
                </tr>
            </table>
        </td>
    </tr>
`.trim();

const buildButtonsBlock = () => `
    <tr>
        <td style="padding:0 0 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #d8e3da;background:#f6fbf7;">
                <tr>
                    <td style="padding:22px 24px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
                            <tr>
                                <td style="padding:0 0 8px;font-size:12px;line-height:18px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#166534;mso-line-height-rule:exactly;">
                                    Action Required
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:0 0 10px;font-size:18px;line-height:28px;font-weight:800;color:#0f172a;mso-line-height-rule:exactly;">
                                    Please confirm your attendance or send an apology.
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:0 0 18px;font-size:14px;line-height:24px;color:#475569;mso-line-height-rule:exactly;">
                                    This is the most important step. Open the response options below and choose the correct action.
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:0 0 14px;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
                                        <tr>
                                            <td width="50%" style="padding:0 6px 0 0;vertical-align:top;" align="left">
                                                ${buildBulletproofButton('Confirm Attendance', '{{confirm_url}}', '#15803d', 248)}
                                            </td>
                                            <td width="50%" style="padding:0 0 0 6px;vertical-align:top;" align="left">
                                                ${buildBulletproofButton('Send Apology', '{{decline_url}}', '#dc2626', 248)}
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:14px 16px;border:1px solid #dbe2ea;background:#ffffff;font-size:12px;line-height:20px;color:#475569;mso-line-height-rule:exactly;">
                                    If the buttons do not open, use this page instead:
                                    <a href="{{response_url}}" style="color:#0f172a;font-weight:800;text-decoration:underline;word-break:break-word;">Open response page</a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
`.trim();

export const buildGuidedTemplateContent = (config: EstGuidedTemplateConfig) => {
    const responseBlock = config.variant === 'CONFIRMATION' ? buildButtonsBlock() : '';
    const roomBlock = config.variant === 'CONFIRMATION'
        ? ''
        : `
                                        <tr>
                                            <td style="padding:0 0 12px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #dbe2ea;background:#f8fafc;">
                                                    <tr>
                                                        <td style="padding:16px 18px;">
                                                            <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Room #</div>
                                                            <div style="margin-top:8px;font-size:16px;line-height:1.7;font-weight:800;color:#111111;">{{room_est1}}</div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
`.trim();
    const subject = `${config.examCode} Exam Assignment${config.variant === 'CONFIRMATION' ? ' - Action Required' : ''} | {{name}}`;

    const body = `
${buildMetaComment(config)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0;padding:0;border-collapse:collapse;table-layout:fixed;background:#eef2f6;font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#0f172a;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
        <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px;max-width:640px;margin:0 auto;border-collapse:collapse;background:#ffffff;">
                <tr>
                    <td style="border:1px solid #dbe2ea;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#ffffff;">
                            <tr>
                                <td style="padding:28px 28px 22px;background:#171717;">
                                    <img src="${EST_LOGO_URL}" alt="EST logo" width="200" style="display:block;width:200px;max-width:200px;height:auto;border:0;outline:none;text-decoration:none;" />
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;border-collapse:collapse;">
                                        <tr>
                                            <td style="padding:8px 14px;background:#ffe347;color:#111111;font-size:12px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;">
                                                ${config.examCode} Exam Assignment
                                            </td>
                                        </tr>
                                    </table>
                                    <p style="margin:16px 0 0;font-size:15px;line-height:27px;color:#f8fafc;mso-line-height-rule:exactly;">
                                        Dear {{name}}, we look forward to welcoming you on <strong>${config.examDay}</strong> the <strong>${config.examDate}</strong> for the <strong>${config.examCode} Exam</strong> as our <strong>{{assignment_role}}</strong>.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:28px;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                                        ${responseBlock}
                                        <tr>
                                            <td style="padding:0 0 20px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #dbe2ea;background:#f9fafb;">
                                                    <tr>
                                                        <td style="padding:18px 18px 6px;font-size:12px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
                                                            Assignment Snapshot
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding:0 18px 18px;">
                                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                                                                <tr>
                                                                    <td width="33.333%" valign="top" style="padding:0 10px 0 0;">
                                                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #f2dd7d;background:#fff8cc;">
                                                                            <tr>
                                                                                <td style="padding:14px 14px 12px;">
                                                                                    <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#7c6500;">Day</div>
                                                                                    <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#111111;">${config.examDay}</div>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                    <td width="33.333%" valign="top" style="padding:0 5px;">
                                                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #dbe2ea;background:#ffffff;">
                                                                            <tr>
                                                                                <td style="padding:14px 14px 12px;">
                                                                                    <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Date</div>
                                                                                    <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#111111;">${config.examDate}</div>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                    <td width="33.333%" valign="top" style="padding:0 0 0 10px;">
                                                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #171717;background:#171717;">
                                                                            <tr>
                                                                                <td style="padding:14px 14px 12px;">
                                                                                    <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#f8fafc;">Arrival Time</div>
                                                                                    <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#ffe347;">${config.arrivalTime}</div>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>

                                    <div style="margin-bottom:18px;font-size:12px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
                                        Session Details
                                    </div>
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                                        <tr>
                                            <td style="padding:0 0 12px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #dbe2ea;background:#f8fafc;">
                                                    <tr>
                                                        <td style="padding:16px 18px;">
                                                            <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Test Center</div>
                                                            <div style="margin-top:8px;font-size:16px;line-height:1.7;font-weight:800;color:#111111;">{{test_center}}</div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        ${roomBlock}
                                        <tr>
                                            <td style="padding:0 0 12px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #dbe2ea;background:#f8fafc;">
                                                    <tr>
                                                        <td style="padding:16px 18px;">
                                                            <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Address</div>
                                                            <div style="margin-top:8px;font-size:16px;line-height:1.7;font-weight:700;color:#111111;">{{address}}</div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:0;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #dbe2ea;background:#f8fafc;">
                                                    <tr>
                                                        <td style="padding:16px 18px;">
                                                            <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Google Maps</div>
                                                            <div style="margin-top:8px;font-size:15px;line-height:1.7;font-weight:700;color:#111111;">
                                                                <a href="{{map_link}}" style="color:#111111;text-decoration:underline;">{{map_link}}</a>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>

                                    <div style="margin-top:24px;background:#fff8cc;border:1px solid #f2dd7d;padding:18px 20px;">
                                        <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#7c6500;">Important</div>
                                        <div style="margin-top:8px;font-size:14px;line-height:25px;color:#4a5565;mso-line-height-rule:exactly;">
                                            You are required to be at the test center at <strong>${config.arrivalTime}</strong> sharp for briefing and preparation before the exam.
                                            Kindly ensure you follow all exam regulations and procedures.
                                        </div>
                                    </div>

                                    <p style="margin:28px 0 0;font-size:14px;line-height:24px;color:#475569;mso-line-height-rule:exactly;">
                                        Best Regards,<br />
                                        <strong style="color:#111111;">The EST Team</strong>
                                    </p>
                                </td>
                            </tr>
                            ${buildFooterBlock()}
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
`.trim();

    return { subject, body };
};

export const buildGuidedWhatsAppText = (config: EstGuidedTemplateConfig) => `
*${config.examCode} Exam Assignment*

Dear {{name}},
We look forward to welcoming you on *${config.examDay}* the *${config.examDate}* for the *${config.examCode} Exam* as our *{{assignment_role}}*.

*Session details*
Day: ${config.examDay}
Date: ${config.examDate}
Arrival time: ${config.arrivalTime}
Test center: {{test_center}}
${config.variant === 'CONFIRMATION' ? '' : 'Room: {{room_est1}}'}
Address: {{address}}

*Important*
Please be at the test center by *${config.arrivalTime}* sharp for briefing and preparation before the exam.
Kindly ensure you follow all exam regulations and procedures.
${config.variant === 'CONFIRMATION' ? `

*Action required*
Open the response page below, then choose either Confirm Attendance or Send Apology.
Open response page: {{response_url}}` : ''}

Best regards,
The EST Team
`.trim();

const GUIDED_PRESET_DEFINITIONS: Array<{
    id: string;
    name: string;
    description: string;
    guidedConfig: EstGuidedTemplateConfig;
}> = [
    {
        id: 'est-i-standard',
        name: 'EST I Exam Assignment',
        description: 'Friday assignment with polished email and WhatsApp delivery.',
        guidedConfig: {
            examCode: 'EST I',
            variant: 'STANDARD',
            examDay: 'Friday',
            examDate: '15th of May 2026',
            arrivalTime: '8:00 AM',
        },
    },
    {
        id: 'est-i-confirmation',
        name: 'EST I Exam Assignment (With Confirmation)',
        description: 'Friday assignment with confirmation and apology actions.',
        guidedConfig: {
            examCode: 'EST I',
            variant: 'CONFIRMATION',
            examDay: 'Friday',
            examDate: '15th of May 2026',
            arrivalTime: '8:00 AM',
        },
    },
    {
        id: 'est-ii-standard',
        name: 'EST II Exam Assignment',
        description: 'Saturday assignment with polished email and WhatsApp delivery.',
        guidedConfig: {
            examCode: 'EST II',
            variant: 'STANDARD',
            examDay: 'Saturday',
            examDate: '16th of May 2026',
            arrivalTime: '8:00 AM',
        },
    },
    {
        id: 'est-ii-confirmation',
        name: 'EST II Exam Assignment (With Confirmation)',
        description: 'Saturday assignment with confirmation and apology actions.',
        guidedConfig: {
            examCode: 'EST II',
            variant: 'CONFIRMATION',
            examDay: 'Saturday',
            examDate: '16th of May 2026',
            arrivalTime: '8:00 AM',
        },
    },
];

export const EXAM_ASSIGNMENT_TEMPLATE_PRESETS: TemplatePresetDefinition[] = GUIDED_PRESET_DEFINITIONS.map((preset) => {
    const content = buildGuidedTemplateContent(preset.guidedConfig);

    return {
        id: preset.id,
        name: preset.name,
        type: 'BOTH',
        subject: content.subject,
        body: content.body,
        description: preset.description,
        guidedConfig: preset.guidedConfig,
    };
});

export const TEMPLATE_EDITOR_VARIABLES: TemplateEditorVariable[] = [
    { token: '{{name}}', label: 'Name' },
    { token: '{{arabic_name}}', label: 'Arabic name' },
    { token: '{{day}}', label: 'Day' },
    { token: '{{date}}', label: 'Date' },
    { token: '{{arrival_time}}', label: 'Arrival time' },
    { token: '{{test_center}}', label: 'Test center' },
    { token: '{{room_est1}}', label: 'Room' },
    { token: '{{role}}', label: 'Role' },
    { token: '{{type}}', label: 'Type' },
    { token: '{{governorate}}', label: 'Governorate' },
    { token: '{{address}}', label: 'Address' },
    { token: '{{building}}', label: 'Building' },
    { token: '{{location}}', label: 'Location' },
    { token: '{{map_link}}', label: 'Google Maps link' },
    { token: '{{exam_type}}', label: 'Exam type' },
    { token: '{{sheet}}', label: 'Sheet' },
    { token: '{{email}}', label: 'Email' },
    { token: '{{phone}}', label: 'Phone' },
    { token: '{{assignment_role}}', label: 'Assignment role label' },
    { token: '{{brand_logo_url}}', label: 'Brand logo URL' },
    { token: '{{confirm_url}}', label: 'Confirm URL' },
    { token: '{{decline_url}}', label: 'Decline URL' },
    { token: '{{response_url}}', label: 'Response page URL' },
];

export const TEMPLATE_PREVIEW_RECIPIENT: TemplatePreviewRecipient = {
    name: 'Mohamed Hassan',
    arabic_name: 'محمد حسن',
    day: 'Friday',
    date: '15th of May 2026',
    arrival_time: '8:00 AM',
    test_center: 'Future University - New Cairo',
    room_est1: 'Hall A-214',
    role: 'Invigilator',
    type: 'EST I',
    governorate: 'Cairo',
    address: 'Rawasy Hall, District 5, New Cairo',
    building: 'North Academic Building',
    location: 'Gate 3, beside the main conference court',
    map_link: 'https://maps.app.goo.gl/example',
    exam_type: 'EST Assignment',
    sheet: 'EST1',
    email: 'mohamed.hassan@example.com',
    phone: '+201000000000',
    assignment_role: 'Chief Invigilator',
    brand_logo_url: '/brand/est-logo.jpg',
    confirm_url: 'https://emails-est-web.vercel.app/r/preview/confirm',
    decline_url: 'https://emails-est-web.vercel.app/r/preview/decline',
    response_url: 'https://emails-est-web.vercel.app/r/preview',
};

export const isHtmlTemplateBody = (body: string) => /<[a-z][\w:-]*\b[^>]*>/i.test(body);

export const renderTemplateTokens = (
    template: string,
    data: Record<string, string>,
    options?: { escapeHtmlValues?: boolean },
) => String(template || '').replace(/{{\s*([^}\s]+)\s*}}/g, (_, key) => {
    const value = data[key] ?? data[key.replace(/_/g, '')] ?? '';
    const normalized = String(value ?? '');
    return options?.escapeHtmlValues ? escapeHtml(normalized) : normalized;
});

export const parseGuidedTemplateConfig = (body: string): EstGuidedTemplateConfig | null => {
    const match = String(body || '').match(/<!--\s*EST_TEMPLATE_META:([\s\S]*?)\s*-->/i);
    if (!match?.[1]) {
        return null;
    }

    try {
        const parsed = JSON.parse(decodeURIComponent(match[1])) as Partial<EstGuidedTemplateConfig>;
        if (
            (parsed.examCode === 'EST I' || parsed.examCode === 'EST II')
            && (parsed.variant === 'STANDARD' || parsed.variant === 'CONFIRMATION')
            && typeof parsed.examDay === 'string'
            && typeof parsed.examDate === 'string'
            && typeof parsed.arrivalTime === 'string'
        ) {
            return {
                examCode: parsed.examCode,
                variant: parsed.variant,
                examDay: parsed.examDay,
                examDate: parsed.examDate,
                arrivalTime: parsed.arrivalTime,
            };
        }
    } catch {
        return null;
    }

    return null;
};

const decodeEntities = (value: string) => value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

export const stripHtmlPreviewText = (value: string) => decodeEntities(
    String(value || '')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<(br|\/p|\/div|\/tr|\/table|\/h[1-6])\b[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim(),
);

export const htmlToPlainTextWithLinks = (value: string) => decodeEntities(
    String(value || '')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<a\b[^>]*href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_, _quote, href, label) => {
            const cleanLabel = decodeEntities(String(label || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
            const cleanHref = decodeEntities(String(href || '').trim());
            if (!cleanHref) {
                return cleanLabel;
            }

            if (!cleanLabel || cleanLabel === cleanHref) {
                return cleanHref;
            }

            return `${cleanLabel}: ${cleanHref}`;
        })
        .replace(/<(br|\/p|\/div|\/tr|\/table|\/h[1-6]|\/li|li|\/ul|\/ol)\b[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim(),
);

export const buildWhatsAppPreviewText = (body: string, data: Record<string, string>) => {
    if (isHtmlTemplateBody(body)) {
        const guidedConfig = parseGuidedTemplateConfig(body);
        if (guidedConfig) {
            return renderTemplateTokens(buildGuidedWhatsAppText(guidedConfig), data);
        }

        return htmlToPlainTextWithLinks(renderTemplateTokens(body, data, { escapeHtmlValues: true }));
    }

    return renderTemplateTokens(body, data);
};

export const buildEmailPreviewDocument = (body: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Email Preview</title>
  </head>
  <body style="margin:0;background:#edf2f8;">
    ${body}
  </body>
</html>`;
