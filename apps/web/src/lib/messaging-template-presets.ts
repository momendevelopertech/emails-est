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

const EST_LOGO_URL = '/brand/est-logo-dark.svg';
const META_PREFIX = 'EST_TEMPLATE_META:';

const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildMetaComment = (config: EstGuidedTemplateConfig) => `<!-- ${META_PREFIX}${encodeURIComponent(JSON.stringify(config))} -->`;

const buildButtonsBlock = () => `
    <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:28px;text-align:center;">
        <div style="font-size:12px;line-height:1.5;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#0f172a;">Action Required</div>
        <p style="margin:10px 0 18px;font-size:14px;line-height:1.7;color:#475569;">
            Please confirm your attendance or send an apology using one of the buttons below.
        </p>
        <a href="{{confirm_url}}" style="display:inline-block;margin:0 8px 12px;padding:14px 24px;border-radius:999px;background:#111111;color:#ffe347;text-decoration:none;font-size:14px;font-weight:800;letter-spacing:0.02em;">Confirm Attendance</a>
        <a href="{{decline_url}}" style="display:inline-block;margin:0 8px 12px;padding:14px 24px;border-radius:999px;background:#ef4444;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;letter-spacing:0.02em;">Send Apology</a>
        <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#64748b;">
            If the buttons do not open, use this link: <a href="{{response_url}}" style="color:#111111;font-weight:700;">Open response page</a>
        </p>
    </div>
`.trim();

export const buildGuidedTemplateContent = (config: EstGuidedTemplateConfig) => {
    const responseBlock = config.variant === 'CONFIRMATION' ? buildButtonsBlock() : '';
    const subject = `${config.examCode} Exam Assignment${config.variant === 'CONFIRMATION' ? ' - Action Required' : ''} | {{name}}`;

    const body = `
${buildMetaComment(config)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0;padding:28px 0;background:#eef2f6;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#0f172a;">
    <tr>
        <td align="center" style="padding:0 14px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:720px;margin:0 auto;">
                <tr>
                    <td style="border-radius:30px;overflow:hidden;background:#ffffff;box-shadow:0 24px 48px rgba(15,23,42,0.12);">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                            <tr>
                                <td style="padding:28px 28px 24px;background:#111111;">
                                    <img src="${EST_LOGO_URL}" alt="EST" style="display:block;width:168px;max-width:100%;height:auto;" />
                                    <div style="margin-top:18px;display:inline-block;padding:8px 14px;border-radius:999px;background:#ffe347;color:#111111;font-size:12px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;">
                                        ${config.examCode} Exam Assignment
                                    </div>
                                    <div style="margin-top:16px;font-size:28px;line-height:1.2;font-weight:900;color:#ffffff;">
                                        Invigilator Briefing
                                    </div>
                                    <p style="margin:12px 0 0;font-size:15px;line-height:1.8;color:rgba(255,255,255,0.86);">
                                        Dear {{name}}, we look forward to welcoming you on <strong>${config.examDay}</strong> the <strong>${config.examDate}</strong> for the <strong>${config.examCode} Exam</strong> as an Invigilator.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:28px;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
                                        <tr>
                                            <td width="33.333%" valign="top" style="padding:0 6px 12px 0;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:22px;background:#fff8cc;border:1px solid #f6e27f;">
                                                    <tr>
                                                        <td style="padding:16px 18px;">
                                                            <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#7c6500;">Day</div>
                                                            <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#111111;">${config.examDay}</div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td width="33.333%" valign="top" style="padding:0 6px 12px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:22px;background:#f8fafc;border:1px solid #e2e8f0;">
                                                    <tr>
                                                        <td style="padding:16px 18px;">
                                                            <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Date</div>
                                                            <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#111111;">${config.examDate}</div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td width="33.333%" valign="top" style="padding:0 0 12px 6px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:22px;background:#111111;border:1px solid #111111;">
                                                    <tr>
                                                        <td style="padding:16px 18px;">
                                                            <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#f8fafc;">Arrival Time</div>
                                                            <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#ffe347;">${config.arrivalTime}</div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>

                                    <div style="margin-bottom:18px;font-size:12px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
                                        Session Details
                                    </div>
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                                        <tr>
                                            <td style="padding:0 0 12px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:20px;border:1px solid #e2e8f0;background:#f8fafc;">
                                                    <tr>
                                                        <td style="padding:16px 18px;">
                                                            <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Test Center</div>
                                                            <div style="margin-top:8px;font-size:16px;line-height:1.7;font-weight:800;color:#111111;">{{test_center}}</div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:0 0 12px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:20px;border:1px solid #e2e8f0;background:#f8fafc;">
                                                    <tr>
                                                        <td style="padding:16px 18px;">
                                                            <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Room #</div>
                                                            <div style="margin-top:8px;font-size:16px;line-height:1.7;font-weight:800;color:#111111;">{{room_est1}}</div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:0 0 12px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:20px;border:1px solid #e2e8f0;background:#f8fafc;">
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
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:20px;border:1px solid #e2e8f0;background:#f8fafc;">
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

                                    <div style="margin-top:24px;border-radius:22px;background:#fff8cc;border:1px solid #f6e27f;padding:18px 20px;">
                                        <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#7c6500;">Important</div>
                                        <div style="margin-top:8px;font-size:14px;line-height:1.8;color:#4a5565;">
                                            You are required to be at the test center at <strong>${config.arrivalTime}</strong> sharp for briefing and preparation before the exam.
                                            Kindly ensure you follow all exam regulations and procedures.
                                        </div>
                                    </div>

                                    ${responseBlock}

                                    <p style="margin:28px 0 0;font-size:14px;line-height:1.8;color:#475569;">
                                        Best Regards,<br />
                                        <strong style="color:#111111;">The EST Team</strong>
                                    </p>
                                </td>
                            </tr>
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
Invigilator Briefing

Dear {{name}},
We look forward to welcoming you on *${config.examDay}* the *${config.examDate}* for the *${config.examCode} Exam* as an Invigilator.

*Session details*
Day: ${config.examDay}
Date: ${config.examDate}
Arrival time: ${config.arrivalTime}
Test center: {{test_center}}
Room: {{room_est1}}
Address: {{address}}

*Important*
Please be at the test center by *${config.arrivalTime}* sharp for briefing and preparation before the exam.
Kindly ensure you follow all exam regulations and procedures.
${config.variant === 'CONFIRMATION' ? `

*Action required*
Please reply directly in WhatsApp using one word:

confirm = attendance confirmed
apology = apology sent` : ''}

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
            arrivalTime: '7:30 AM',
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
            arrivalTime: '7:30 AM',
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
            arrivalTime: '7:30 AM',
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
            arrivalTime: '7:30 AM',
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
    { token: '{{confirm_url}}', label: 'Confirm URL' },
    { token: '{{decline_url}}', label: 'Decline URL' },
    { token: '{{response_url}}', label: 'Response page URL' },
];

export const TEMPLATE_PREVIEW_RECIPIENT: TemplatePreviewRecipient = {
    name: 'Mohamed Hassan',
    arabic_name: 'محمد حسن',
    day: 'Friday',
    date: '15th of May 2026',
    arrival_time: '7:30 AM',
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
    confirm_url: 'https://emails-est-web.vercel.app/messaging/confirm?token=preview&action=confirm',
    decline_url: 'https://emails-est-web.vercel.app/messaging/confirm?token=preview&action=decline',
    response_url: 'https://emails-est-web.vercel.app/messaging/confirm?token=preview',
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
