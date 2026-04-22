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

const EST_LOGO_URL = '{{brand_logo_url}}';
const META_PREFIX = 'EST_TEMPLATE_META:';

const buildMetaComment = (definition: EstTemplateDefinition) => `<!-- ${META_PREFIX}${encodeURIComponent(JSON.stringify(definition))} -->`;

const buildBulletproofButton = (label: string, href: string, background: string) => `
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="50%" stroke="f" fillcolor="${background}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;">${label}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-- -->
    <a href="${href}" style="display:inline-block;background:${background};border-radius:999px;color:#ffffff;font-family:Segoe UI,Tahoma,Arial,sans-serif;font-size:14px;font-weight:800;line-height:44px;text-align:center;text-decoration:none;width:220px;-webkit-text-size-adjust:none;mso-hide:all;">${label}</a>
    <!--<![endif]-->
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
                                            <td style="padding:0 6px 0 0;vertical-align:top;">
                                                ${buildBulletproofButton('Confirm Attendance', '{{confirm_url}}', '#15803d')}
                                            </td>
                                            <td style="padding:0 0 0 6px;vertical-align:top;">
                                                ${buildBulletproofButton('Send Apology', '{{decline_url}}', '#dc2626')}
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:14px 16px;border:1px solid #dbe2ea;background:#ffffff;font-size:12px;line-height:20px;color:#475569;mso-line-height-rule:exactly;">
                                    If the buttons do not open, use this page instead:
                                    <a href="{{response_url}}" style="color:#0f172a;font-weight:800;text-decoration:underline;">Open response page</a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
`.trim();

const normalizeWhatsAppText = (value: string) => String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const buildExamAssignmentEmailBody = (definition: EstTemplateDefinition) => {
    const responseBlock = definition.variant === 'CONFIRMATION' ? buildButtonsBlock() : '';
    const roomBlock = definition.variant === 'CONFIRMATION'
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

    return `
${buildMetaComment(definition)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0;padding:0;border-collapse:collapse;background:#eef2f6;font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#0f172a;">
    <tr>
        <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0" style="width:680px;max-width:680px;margin:0 auto;border-collapse:collapse;background:#ffffff;">
                <tr>
                    <td style="border:1px solid #dbe2ea;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                            <tr>
                                <td style="padding:28px 28px 22px;background:#171717;">
                                    <img src="${EST_LOGO_URL}" alt="EST" width="200" style="display:block;width:200px;max-width:200px;height:auto;border:0;outline:none;text-decoration:none;" />
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;border-collapse:collapse;">
                                        <tr>
                                            <td style="padding:8px 14px;background:#ffe347;color:#111111;font-size:12px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;">
                                                ${definition.examCode} Exam Assignment
                                            </td>
                                        </tr>
                                    </table>
                                    <p style="margin:16px 0 0;font-size:15px;line-height:27px;color:#f8fafc;mso-line-height-rule:exactly;">
                                        Dear {{name}}, we look forward to welcoming you on <strong>${definition.examDay}</strong> the <strong>${definition.examDate}</strong> for the <strong>${definition.examCode} Exam</strong> as our <strong>{{assignment_role}}</strong>.
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
                                                                                    <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#111111;">${definition.examDay}</div>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                    <td width="33.333%" valign="top" style="padding:0 5px;">
                                                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #dbe2ea;background:#ffffff;">
                                                                            <tr>
                                                                                <td style="padding:14px 14px 12px;">
                                                                                    <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Date</div>
                                                                                    <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#111111;">${definition.examDate}</div>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                    <td width="33.333%" valign="top" style="padding:0 0 0 10px;">
                                                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #171717;background:#171717;">
                                                                            <tr>
                                                                                <td style="padding:14px 14px 12px;">
                                                                                    <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#f8fafc;">Arrival Time</div>
                                                                                    <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#ffe347;">${definition.arrivalTime}</div>
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
                                            You are required to be at the test center at <strong>${definition.arrivalTime}</strong> sharp for briefing and preparation before the exam.
                                            Kindly ensure you follow all exam regulations and procedures.
                                        </div>
                                    </div>

                                    <p style="margin:28px 0 0;font-size:14px;line-height:24px;color:#475569;mso-line-height-rule:exactly;">
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
        '',
        `Dear ${String(recipient.name || '').trim() || '{{name}}'},`,
        `We look forward to welcoming you on *${definition.examDay}* the *${definition.examDate}* for the *${definition.examCode} Exam* as our *${String(recipient.assignment_role || recipient.role || '').trim() || 'team member'}*.`,
        '',
        '*Session details*',
        `Day: ${definition.examDay}`,
        `Date: ${definition.examDate}`,
        `Arrival time: ${definition.arrivalTime}`,
        `Test center: ${String(recipient.test_center || '').trim() || '{{test_center}}'}`,
        `Address: ${String(recipient.address || '').trim() || '{{address}}'}`,
        '',
        '*Important*',
        `Please be at the test center by *${definition.arrivalTime}* sharp for briefing and preparation before the exam.`,
        'Kindly ensure you follow all exam regulations and procedures.',
    ];

    if (definition.variant !== 'CONFIRMATION') {
        lines.splice(10, 0, `Room: ${String(recipient.room_est1 || '').trim() || '{{room_est1}}'}`);
    }

    if (definition.variant === 'CONFIRMATION') {
        lines.push(
            '',
            '*Action required*',
            'Open the response page below, then choose either Confirm Attendance or Send Apology.',
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
        arrivalTime: '8:00 AM',
    },
    {
        key: 'est-i-confirmation',
        examCode: 'EST I',
        variant: 'CONFIRMATION',
        examDay: 'Friday',
        examDate: '15th of May 2026',
        arrivalTime: '8:00 AM',
    },
    {
        key: 'est-ii-standard',
        examCode: 'EST II',
        variant: 'STANDARD',
        examDay: 'Saturday',
        examDate: '16th of May 2026',
        arrivalTime: '8:00 AM',
    },
    {
        key: 'est-ii-confirmation',
        examCode: 'EST II',
        variant: 'CONFIRMATION',
        examDay: 'Saturday',
        examDate: '16th of May 2026',
        arrivalTime: '8:00 AM',
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
