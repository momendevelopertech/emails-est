import { TemplateType } from '@prisma/client';

type TemplateRecord = {
    name: string;
    type: TemplateType;
    subject: string;
    body: string;
    include_confirmation_button?: boolean;
};

type EstTemplateDefinition = {
    key: 'est-i-standard' | 'est-i-confirmation' | 'est-ii-standard' | 'est-ii-confirmation';
    examCode: 'EST I' | 'EST II';
    variant: 'STANDARD' | 'CONFIRMATION';
    examDay: string;
    examDate: string;
    arrivalTime: string;
};

const EST_LOGO_URL = 'https://emails-est-web.vercel.app/brand/est-logo-dark.svg';
const META_PREFIX = 'EST_TEMPLATE_META:';

const buildMetaComment = (definition: EstTemplateDefinition) => `<!-- ${META_PREFIX}${encodeURIComponent(JSON.stringify(definition))} -->`;

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

const normalizeWhatsAppText = (value: string) => String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const buildExamAssignmentEmailBody = (definition: EstTemplateDefinition) => {
    const responseBlock = definition.variant === 'CONFIRMATION' ? buildButtonsBlock() : '';

    return `
${buildMetaComment(definition)}
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
                                        ${definition.examCode} Exam Assignment
                                    </div>
                                    <div style="margin-top:16px;font-size:28px;line-height:1.2;font-weight:900;color:#ffffff;">
                                        Invigilator Briefing
                                    </div>
                                    <p style="margin:12px 0 0;font-size:15px;line-height:1.8;color:rgba(255,255,255,0.86);">
                                        Dear {{name}}, we look forward to welcoming you on <strong>${definition.examDay}</strong> the <strong>${definition.examDate}</strong> for the <strong>${definition.examCode} Exam</strong> as an Invigilator.
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
                                                            <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#111111;">${definition.examDay}</div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td width="33.333%" valign="top" style="padding:0 6px 12px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:22px;background:#f8fafc;border:1px solid #e2e8f0;">
                                                    <tr>
                                                        <td style="padding:16px 18px;">
                                                            <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Date</div>
                                                            <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#111111;">${definition.examDate}</div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td width="33.333%" valign="top" style="padding:0 0 12px 6px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:22px;background:#111111;border:1px solid #111111;">
                                                    <tr>
                                                        <td style="padding:16px 18px;">
                                                            <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#f8fafc;">Arrival Time</div>
                                                            <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#ffe347;">${definition.arrivalTime}</div>
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
                                            You are required to be at the test center at <strong>${definition.arrivalTime}</strong> sharp for briefing and preparation before the exam.
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
};

export const parseExamAssignmentTemplateMeta = (body: string): EstTemplateDefinition | null => {
    const match = String(body || '').match(new RegExp(`<!--\\s*${META_PREFIX}([\\s\\S]*?)\\s*-->`, 'i'));
    if (!match?.[1]) {
        return null;
    }

    try {
        const parsed = JSON.parse(decodeURIComponent(match[1])) as Partial<EstTemplateDefinition>;
        if (
            (parsed.key === 'est-i-standard' || parsed.key === 'est-i-confirmation' || parsed.key === 'est-ii-standard' || parsed.key === 'est-ii-confirmation')
            && (parsed.examCode === 'EST I' || parsed.examCode === 'EST II')
            && (parsed.variant === 'STANDARD' || parsed.variant === 'CONFIRMATION')
            && typeof parsed.examDay === 'string'
            && typeof parsed.examDate === 'string'
            && typeof parsed.arrivalTime === 'string'
        ) {
            return {
                key: parsed.key,
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

export const buildExamAssignmentWhatsAppBody = (
    definition: EstTemplateDefinition,
    recipient: Record<string, any>,
) => {
    const lines = [
        `*${definition.examCode} Exam Assignment*`,
        'Invigilator Briefing',
        '',
        `Dear ${String(recipient.name || '').trim() || '{{name}}'},`,
        `We look forward to welcoming you on *${definition.examDay}* the *${definition.examDate}* for the *${definition.examCode} Exam* as an Invigilator.`,
        '',
        '*Session details*',
        `Day: ${definition.examDay}`,
        `Date: ${definition.examDate}`,
        `Arrival time: ${definition.arrivalTime}`,
        `Test center: ${String(recipient.test_center || '').trim() || '{{test_center}}'}`,
        `Room: ${String(recipient.room_est1 || '').trim() || '{{room_est1}}'}`,
        `Address: ${String(recipient.address || '').trim() || '{{address}}'}`,
        `Google Maps: ${String(recipient.map_link || '').trim() || '{{map_link}}'}`,
        '',
        '*Important*',
        `Please be at the test center by *${definition.arrivalTime}* sharp for briefing and preparation before the exam.`,
        'Kindly ensure you follow all exam regulations and procedures.',
    ];

    if (definition.variant === 'CONFIRMATION') {
        lines.push(
            '',
            '*Action required*',
            'Choose one of the links below:',
            '',
            `Confirm attendance: ${String(recipient.confirm_url || '').trim() || '{{confirm_url}}'}`,
            `Send apology: ${String(recipient.decline_url || '').trim() || '{{decline_url}}'}`,
            `Open response page: ${String(recipient.response_url || '').trim() || '{{response_url}}'}`,
        );
    }

    lines.push('', 'Best regards,', 'The EST Team');

    return normalizeWhatsAppText(lines.join('\n'));
};

const TEMPLATE_DEFINITIONS: EstTemplateDefinition[] = [
    {
        key: 'est-i-standard',
        examCode: 'EST I',
        variant: 'STANDARD',
        examDay: 'Friday',
        examDate: '15th of May 2026',
        arrivalTime: '7:30 AM',
    },
    {
        key: 'est-i-confirmation',
        examCode: 'EST I',
        variant: 'CONFIRMATION',
        examDay: 'Friday',
        examDate: '15th of May 2026',
        arrivalTime: '7:30 AM',
    },
    {
        key: 'est-ii-standard',
        examCode: 'EST II',
        variant: 'STANDARD',
        examDay: 'Saturday',
        examDate: '16th of May 2026',
        arrivalTime: '7:30 AM',
    },
    {
        key: 'est-ii-confirmation',
        examCode: 'EST II',
        variant: 'CONFIRMATION',
        examDay: 'Saturday',
        examDate: '16th of May 2026',
        arrivalTime: '7:30 AM',
    },
];

export const EXAM_ASSIGNMENT_TEMPLATE_PRESETS: TemplateRecord[] = TEMPLATE_DEFINITIONS.map((definition) => ({
    name: `${definition.examCode} Exam Assignment${definition.variant === 'CONFIRMATION' ? ' (With Confirmation)' : ''}`,
    type: TemplateType.BOTH,
    subject: `${definition.examCode} Exam Assignment${definition.variant === 'CONFIRMATION' ? ' - Action Required' : ''} | {{name}}`,
    body: buildExamAssignmentEmailBody(definition),
    include_confirmation_button: definition.variant === 'CONFIRMATION',
}));

export const isRichHtmlEmailTemplate = (body: string) => /<[a-z][\w:-]*\b[^>]*>/i.test(body);
