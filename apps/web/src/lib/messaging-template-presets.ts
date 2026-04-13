export type TemplateTypeValue = 'EMAIL' | 'WHATSAPP' | 'BOTH';

export type TemplatePresetDefinition = {
    id: string;
    name: string;
    type: TemplateTypeValue;
    subject: string;
    body: string;
    description: string;
};

export type TemplateEditorVariable = {
    token: string;
    label: string;
};

export type TemplatePreviewRecipient = Record<string, string>;

const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildMetricCard = (label: string, valueToken: string, accentColor: string) => `
    <td width="33.333%" style="padding:0 6px 12px;" valign="top">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:22px;background:${accentColor};">
            <tr>
                <td style="padding:18px 18px 16px;">
                    <div style="font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#5d6b7d;">${label}</div>
                    <div style="margin-top:8px;font-size:20px;line-height:1.4;font-weight:800;color:#112033;">${valueToken}</div>
                </td>
            </tr>
        </table>
    </td>
`;

const buildDetailRow = (iconEntity: string, label: string, valueToken: string) => `
    <tr>
        <td style="padding:0 0 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:22px;border:1px solid #e2e8f0;background:#f8fafc;">
                <tr>
                    <td width="56" valign="top" style="padding:16px 0 16px 16px;">
                        <div style="width:38px;height:38px;border-radius:999px;background:#e0ecff;color:#1d4ed8;font-size:18px;line-height:38px;text-align:center;">${iconEntity}</div>
                    </td>
                    <td style="padding:14px 18px 14px 8px;">
                        <div style="font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#738194;">${label}</div>
                        <div style="margin-top:6px;font-size:16px;line-height:1.7;font-weight:700;color:#122033;">${valueToken}</div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
`;

const buildExamAssignmentEmailBody = ({
    examLabel,
    heroStart,
    heroEnd,
    badgeBackground,
    panelBackground,
}: {
    examLabel: string;
    heroStart: string;
    heroEnd: string;
    badgeBackground: string;
    panelBackground: string;
}) => `
<!-- EST_ASSIGNMENT_TEMPLATE_V1:${examLabel} -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0;padding:30px 0 42px;background:#edf2f8;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#102033;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:700px;margin:0 auto;">
                <tr>
                    <td style="padding:0 14px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:32px;overflow:hidden;background:#ffffff;box-shadow:0 24px 60px rgba(15,23,42,0.16);">
                            <tr>
                                <td align="center" style="padding:36px 34px 28px;background:${heroStart};background:linear-gradient(135deg, ${heroStart} 0%, ${heroEnd} 100%);">
                                    <div style="display:inline-block;padding:8px 16px;border-radius:999px;background:${badgeBackground};color:#ffffff;font-size:12px;line-height:1.2;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                                        ${examLabel} Exam Assignment
                                    </div>
                                    <div style="margin-top:18px;font-size:12px;line-height:1.6;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
                                        SPHINX Assessment Operations
                                    </div>
                                    <div style="margin-top:18px;font-size:40px;line-height:1.1;font-weight:800;color:#ffffff;text-align:center;">
                                        {{name}}
                                    </div>
                                    <p style="margin:16px auto 0;max-width:520px;font-size:16px;line-height:1.85;color:rgba(255,255,255,0.9);">
                                        Your official ${examLabel} assignment is ready. Please review the room, venue, and arrival details carefully before exam day.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:26px 22px 10px;background:#ffffff;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                                        <tr>
                                            ${buildMetricCard('Room', '{{room_est1}}', '#eef4ff')}
                                            ${buildMetricCard('Role', '{{role}}', '#eefbf5')}
                                            ${buildMetricCard('Type', '{{type}}', '#fff6e8')}
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:0 22px 12px;background:#ffffff;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                                        ${buildDetailRow('&#127961;', 'Governorate', '{{governorate}}')}
                                        ${buildDetailRow('&#127968;', 'Address', '{{address}}')}
                                        ${buildDetailRow('&#127970;', 'Building', '{{building}}')}
                                        ${buildDetailRow('&#128506;', 'Location', '{{location}}')}
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:0 22px 26px;background:#ffffff;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:24px;background:${panelBackground};">
                                        <tr>
                                            <td style="padding:20px 22px;">
                                                <div style="font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#5a6a7d;">
                                                    Arrival Note
                                                </div>
                                                <div style="margin-top:8px;font-size:14px;line-height:1.9;color:#1f3145;">
                                                    Keep this message with you on exam day. If any location detail needs clarification, reply to this email and include your full name and assigned room.
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:0 22px 28px;background:#ffffff;">
                                    <div style="border-top:1px solid #e4e8ef;padding-top:18px;text-align:center;font-size:12px;line-height:1.8;color:#728093;">
                                        This assignment was generated from the latest uploaded Excel roster for ${examLabel}.
                                    </div>
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

export const TEMPLATE_EDITOR_VARIABLES: TemplateEditorVariable[] = [
    { token: '{{name}}', label: 'Name' },
    { token: '{{room_est1}}', label: 'Room' },
    { token: '{{role}}', label: 'Role' },
    { token: '{{type}}', label: 'Type' },
    { token: '{{governorate}}', label: 'Governorate' },
    { token: '{{address}}', label: 'Address' },
    { token: '{{building}}', label: 'Building' },
    { token: '{{location}}', label: 'Location' },
    { token: '{{exam_type}}', label: 'Exam type' },
    { token: '{{sheet}}', label: 'Sheet' },
    { token: '{{email}}', label: 'Email' },
];

export const TEMPLATE_PREVIEW_RECIPIENT: TemplatePreviewRecipient = {
    name: 'Mohamed Hassan',
    room_est1: 'Hall A-214',
    role: 'Chief Invigilator',
    type: 'Speaking Committee',
    governorate: 'Cairo',
    address: 'Rawasy Hall, District 5',
    building: 'North Academic Building',
    location: 'Gate 3, beside the main conference court',
    exam_type: 'EST Assignment',
    sheet: 'EST1',
    email: 'mohamed.hassan@example.com',
};

export const EXAM_ASSIGNMENT_TEMPLATE_PRESETS: TemplatePresetDefinition[] = [
    {
        id: 'est-i-assignment',
        name: 'EST I Exam Assignment',
        type: 'EMAIL',
        subject: 'EST I Exam Assignment | {{name}}',
        body: buildExamAssignmentEmailBody({
            examLabel: 'EST I',
            heroStart: '#0f766e',
            heroEnd: '#1d4ed8',
            badgeBackground: 'rgba(255,255,255,0.18)',
            panelBackground: '#eef8ff',
        }),
        description: 'Luxury HTML layout for EST I assignment emails with centered name and detail cards.',
    },
    {
        id: 'est-ii-assignment',
        name: 'EST II Exam Assignment',
        type: 'EMAIL',
        subject: 'EST II Exam Assignment | {{name}}',
        body: buildExamAssignmentEmailBody({
            examLabel: 'EST II',
            heroStart: '#7c2d12',
            heroEnd: '#a21caf',
            badgeBackground: 'rgba(255,255,255,0.16)',
            panelBackground: '#fff4ef',
        }),
        description: 'Luxury HTML layout for EST II assignment emails with bold assignment highlights.',
    },
];

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
