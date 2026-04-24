import { TemplateType } from '@prisma/client';

type TemplateRecord = {
    name: string;
    type: TemplateType;
    subject: string;
    body: string;
    include_confirmation_button?: boolean;
};

type ExamAssignmentTemplateMeta = {
    variant: 'V1' | 'V2' | 'V3';
    examLabel: string;
};

type GuidedExamAssignmentTemplateConfig = {
    examLabel: 'EST I' | 'EST II';
    examDay: string;
    examDate: string;
    arrivalTime: string;
    variant: 'STANDARD' | 'CONFIRMATION';
};

const GUIDED_TEMPLATE_META_PREFIX = 'EST_GUIDED_TEMPLATE_META:';
const EST_LOGO_URL = '{{brand_logo_url}}';
const FOOTER_CONTACT_EMAIL = 'noreply@est.com';
const FOOTER_PHYSICAL_ADDRESS = 'EST Operations Office, Cairo, Egypt';

export const OBSOLETE_EXAM_ASSIGNMENT_TEMPLATE_NAMES = [
    'EST I Exam Assignment - V2 Modern',
    'EST II Exam Assignment - V2 Modern',
    'EST I Exam Assignment - V2 Modern (With Confirmation)',
    'EST II Exam Assignment - V2 Modern (With Confirmation)',
];

// V1: Classic Design with Gradient Hero
const buildExamAssignmentEmailBodyV1 = ({
    examLabel,
}: {
    examLabel: string;
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
                                <td align="center" style="padding:48px 34px 36px;background:linear-gradient(135deg, ${examLabel === 'EST I' ? '#0f766e' : '#7c2d12'} 0%, ${examLabel === 'EST I' ? '#1d4ed8' : '#a21caf'} 100%);">
                                    <div style="display:inline-block;padding:10px 20px;border-radius:999px;background:rgba(255,255,255,0.2);color:#ffffff;font-size:13px;line-height:1.2;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                                        ${examLabel} - Classic Edition
                                    </div>
                                    <div style="margin-top:20px;font-size:36px;line-height:1.1;font-weight:800;color:#ffffff;">{{name}}</div>
                                    <p style="margin:16px auto 0;max-width:520px;font-size:14px;line-height:1.8;color:rgba(255,255,255,0.95);">
                                        Your official ${examLabel} exam assignment is confirmed. Please review your room details and arrival time carefully.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:32px 28px;">
                                    <div style="margin-bottom:28px;">
                                        <div style="font-size:12px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:16px;">Assignment Details</div>
                                        <table width="100%" style="width:100%;">
                                            <tr>
                                                <td style="padding:14px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;background:#f8fafc;">
                                                    <div style="font-size:11px;font-weight:600;color:#718096;text-transform:uppercase;">Room</div>
                                                    <div style="font-size:16px;font-weight:700;color:#1a202c;margin-top:4px;">{{room_est1}}</div>
                                                </td>
                                                <td style="padding:0 8px;"></td>
                                                <td style="padding:14px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;background:#f8fafc;">
                                                    <div style="font-size:11px;font-weight:600;color:#718096;text-transform:uppercase;">Role</div>
                                                    <div style="font-size:16px;font-weight:700;color:#1a202c;margin-top:4px;">{{role}}</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div>
                                        <div style="font-size:12px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:16px;">Location & Venue</div>
                                        <table width="100%" style="width:100%;">
                                            <tr style="border-bottom:1px solid #e2e8f0;">
                                                <td style="padding:12px 0;"><strong style="font-size:13px;color:#1a202c;">Center:</strong></td>
                                                <td style="padding:12px 0;text-align:right;color:#475569;">{{building}}</td>
                                            </tr>
                                            <tr style="border-bottom:1px solid #e2e8f0;">
                                                <td style="padding:12px 0;"><strong style="font-size:13px;color:#1a202c;">Address:</strong></td>
                                                <td style="padding:12px 0;text-align:right;color:#475569;">{{address}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:12px 0;"><strong style="font-size:13px;color:#1a202c;">Location:</strong></td>
                                                <td style="padding:12px 0;text-align:right;color:#475569;">{{location}}</td>
                                            </tr>
                                        </table>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;text-align:center;font-size:12px;color:#475569;">
                                    Arrive 30 minutes early. Bring valid ID. Keep this message for reference.
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:16px 28px;text-align:center;font-size:11px;color:#718096;">
                                    Generated from Excel roster | EST Team
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

// V2: Modern Design with Logo
const buildExamAssignmentEmailBodyV2 = ({
    examLabel,
    logoUrl,
}: {
    examLabel: string;
    logoUrl: string;
}) => `
<!-- EST_ASSIGNMENT_TEMPLATE_V2:${examLabel} -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI','Helvetica Neue','Arial',sans-serif;color:#1a202c;">
    <tr>
        <td align="center" style="padding:20px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;margin:0 auto;">
                <tr>
                    <td align="center" style="padding:24px 20px 16px;">
                        <img src="${logoUrl}" alt="EST Logo" style="width:120px;height:auto;display:block;margin:0 auto;" />
                    </td>
                </tr>
                <tr>
                    <td style="padding:0 16px 24px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:16px;background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                            <tr>
                                <td style="padding:32px 28px 24px;border-bottom:2px solid #f0f2f5;">
                                    <div style="font-size:18px;line-height:1.5;font-weight:600;color:#1a202c;">
                                        Dear {{name}},
                                    </div>
                                    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#475569;">
                                        We are pleased to confirm your assignment for the <strong>${examLabel} Exam</strong>. Please find your assigned examination details below.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:24px 28px;">
                                    <div style="margin-bottom:20px;">
                                        <div style="font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#718096;margin-bottom:16px;">Exam Assignment Details</div>
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                                            <tr>
                                                <td width="50%" style="padding-right:12px;margin-bottom:16px;">
                                                    <div style="padding:14px;border-radius:12px;background:#f7fafc;border-left:4px solid #2563eb;">
                                                        <div style="font-size:12px;font-weight:600;text-transform:uppercase;color:#4b5563;margin-bottom:6px;">Test Center</div>
                                                        <div style="font-size:14px;font-weight:700;color:#1a202c;">{{building}}</div>
                                                    </div>
                                                </td>
                                                <td width="50%" style="padding-left:12px;margin-bottom:16px;">
                                                    <div style="padding:14px;border-radius:12px;background:#f7fafc;border-left:4px solid #7c3aed;">
                                                        <div style="font-size:12px;font-weight:600;text-transform:uppercase;color:#4b5563;margin-bottom:6px;">Room</div>
                                                        <div style="font-size:14px;font-weight:700;color:#1a202c;">{{room_est1}}</div>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td width="50%" style="padding-right:12px;">
                                                    <div style="padding:14px;border-radius:12px;background:#f7fafc;border-left:4px solid #dc2626;">
                                                        <div style="font-size:12px;font-weight:600;text-transform:uppercase;color:#4b5563;margin-bottom:6px;">Your Role</div>
                                                        <div style="font-size:14px;font-weight:700;color:#1a202c;">{{role}}</div>
                                                    </div>
                                                </td>
                                                <td width="50%" style="padding-left:12px;">
                                                    <div style="padding:14px;border-radius:12px;background:#f7fafc;border-left:4px solid #059669;">
                                                        <div style="font-size:12px;font-weight:600;text-transform:uppercase;color:#4b5563;margin-bottom:6px;">Session Type</div>
                                                        <div style="font-size:14px;font-weight:700;color:#1a202c;">{{type}}</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:24px 28px;border-top:1px solid #f0f2f5;border-bottom:1px solid #f0f2f5;">
                                    <div style="font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#718096;margin-bottom:16px;">Location Information</div>
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                                        <tr style="background:#fafbfc;border-radius:8px;">
                                            <td style="padding:12px 16px;width:28px;">📍</td>
                                            <td style="padding:12px 16px;">
                                                <div style="font-size:12px;font-weight:600;color:#718096;">Governorate</div>
                                                <div style="font-size:14px;font-weight:600;color:#1a202c;margin-top:2px;">{{governorate}}</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:12px 16px;width:28px;">🏢</td>
                                            <td style="padding:12px 16px;">
                                                <div style="font-size:12px;font-weight:600;color:#718096;">Address</div>
                                                <div style="font-size:14px;font-weight:600;color:#1a202c;margin-top:2px;">{{address}}</div>
                                            </td>
                                        </tr>
                                        <tr style="background:#fafbfc;">
                                            <td style="padding:12px 16px;width:28px;">🗺️</td>
                                            <td style="padding:12px 16px;">
                                                <div style="font-size:12px;font-weight:600;color:#718096;">Location (On Site)</div>
                                                <div style="font-size:14px;font-weight:600;color:#1a202c;margin-top:2px;">{{location}}</div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:24px 28px;">
                                    <div style="padding:16px;border-radius:12px;background:#fef3c7;border-left:4px solid #f59e0b;">
                                        <div style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;margin-bottom:8px;">⏰ Important</div>
                                        <div style="font-size:13px;line-height:1.6;color:#78350f;">
                                            Please arrive at least 30 minutes before your scheduled exam time. Bring a valid ID and review all venue details carefully.
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:24px 28px;border-top:1px solid #f0f2f5;text-align:center;">
                                    <div style="font-size:12px;line-height:1.6;color:#718096;">
                                        <div style="margin-bottom:8px;font-weight:600;color:#1a202c;">The EST Team</div>
                                        <div style="margin-top:12px;font-size:11px;color:#cbd5e1;">
                                            Generated from the latest uploaded roster for ${examLabel}.
                                        </div>
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

// V3: Minimal Design - Simple and Fast
const buildExamAssignmentEmailBodyV3 = ({
    examLabel,
}: {
    examLabel: string;
}) => `
<!-- EST_ASSIGNMENT_TEMPLATE_V3:${examLabel} -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0;padding:20px;background:#ffffff;font-family:Arial,sans-serif;color:#333;">
    <tr>
        <td style="max-width:600px;margin:0 auto;">
            <div style="margin-bottom:24px;">
                <h2 style="margin:0;font-size:20px;color:#1a202c;font-weight:bold;">Exam Assignment - ${examLabel}</h2>
            </div>
            
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
                Dear {{name}},<br/><br/>
                Your assignment for the ${examLabel} exam has been confirmed. Below are your assignment details:
            </p>
            
            <table width="100%" style="width:100%;border-collapse:collapse;margin:20px 0;">
                <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                    <td style="padding:10px;font-weight:bold;color:#1a202c;width:40%;">Test Center</td>
                    <td style="padding:10px;color:#475569;">{{building}}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:10px;font-weight:bold;color:#1a202c;">Room</td>
                    <td style="padding:10px;color:#475569;">{{room_est1}}</td>
                </tr>
                <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                    <td style="padding:10px;font-weight:bold;color:#1a202c;">Your Role</td>
                    <td style="padding:10px;color:#475569;">{{role}}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:10px;font-weight:bold;color:#1a202c;">Session Type</td>
                    <td style="padding:10px;color:#475569;">{{type}}</td>
                </tr>
                <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                    <td style="padding:10px;font-weight:bold;color:#1a202c;">Location</td>
                    <td style="padding:10px;color:#475569;">{{location}}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:10px;font-weight:bold;color:#1a202c;">Address</td>
                    <td style="padding:10px;color:#475569;">{{address}}</td>
                </tr>
                <tr style="background:#f8fafc;">
                    <td style="padding:10px;font-weight:bold;color:#1a202c;">Governorate</td>
                    <td style="padding:10px;color:#475569;">{{governorate}}</td>
                </tr>
            </table>
            
            <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px;margin:20px 0;font-size:13px;color:#856404;">
                <strong>Important:</strong> Please arrive 30 minutes early. Bring a valid ID and review all details carefully.
            </div>
            
            <p style="margin:20px 0 0;font-size:12px;color:#718096;border-top:1px solid #e2e8f0;padding-top:12px;">
                Best regards,<br/>
                The EST Team
            </p>
        </td>
    </tr>
</table>
`.trim();

const buildResponseButtons = () => '\n\n<!-- Response Links -->\n<div style="text-align:center;margin:24px 0;">'
    + '<a href="{{confirm_url}}" style="display:inline-block;margin:0 6px 12px;padding:12px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Confirm Attendance</a>'
    + '<a href="{{decline_url}}" style="display:inline-block;margin:0 6px 12px;padding:12px 28px;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Send Apology</a>'
    + '</div>\n\n<p style="text-align:center;font-size:12px;color:#718096;"><a href="{{response_url}}" style="color:#718096;">Open the response page if the buttons above do not work.</a></p>';

const buildBulletproofButton = (label: string, href: string, background: string, width = 232) => `
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

const buildGuidedFooterBlock = () => `
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

const buildGuidedButtonsBlock = () => `
    <tr>
        <td style="padding:0 0 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #d8e3da;background:#f6fbf7;">
                <tr>
                    <td style="padding:22px 24px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
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
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                                        <tr>
                                            <td width="50%" style="padding:0 6px 0 0;vertical-align:top;" align="left">
                                                ${buildBulletproofButton('Confirm Attendance', '{{confirm_url}}', '#15803d')}
                                            </td>
                                            <td width="50%" style="padding:0 0 0 6px;vertical-align:top;" align="left">
                                                ${buildBulletproofButton('Send Apology', '{{decline_url}}', '#dc2626')}
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

const normalizeGuidedTemplateConfig = (
    config: GuidedExamAssignmentTemplateConfig,
): GuidedExamAssignmentTemplateConfig => ({
    examLabel: config.examLabel === 'EST II' ? 'EST II' : 'EST I',
    examDay: config.examDay.trim() || 'Friday',
    examDate: config.examDate.trim() || '15th of May 2026',
    arrivalTime: config.arrivalTime.trim() || '8:00 AM',
    variant: config.variant === 'CONFIRMATION' ? 'CONFIRMATION' : 'STANDARD',
});

const buildGuidedTemplateContent = (config: GuidedExamAssignmentTemplateConfig) => {
    const normalized = normalizeGuidedTemplateConfig(config);
    const metadata = `<!-- ${GUIDED_TEMPLATE_META_PREFIX}${encodeURIComponent(JSON.stringify(normalized))} -->`;
    const subject = normalized.variant === 'CONFIRMATION'
        ? `${normalized.examLabel} Exam Assignment - Action Required | {{name}}`
        : `${normalized.examLabel} Exam Assignment | {{name}}`;
    const responseBlock = normalized.variant === 'CONFIRMATION' ? buildGuidedButtonsBlock() : '';
    const roomBlock = normalized.variant === 'CONFIRMATION'
        ? ''
        : `
                                        <tr>
                                            <td style="padding:0 0 12px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #dbe2ea;background:#f8fafc;">
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

    return {
        subject,
        body: `
${metadata}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0;padding:0;border-collapse:collapse;table-layout:fixed;background:#eef2f6;font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#0f172a;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
        <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px;max-width:640px;margin:0 auto;border-collapse:collapse;background:#ffffff;">
                <tr>
                    <td style="border:1px solid #dbe2ea;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#ffffff;">
                            <tr>
                                <td style="padding:28px 28px 22px;background:#171717;">
                                    <img src="${EST_LOGO_URL}" alt="EST" width="180" style="display:block;width:180px;max-width:180px;height:auto;border:0;outline:none;text-decoration:none;" />
                                    <div style="margin-top:10px;font-size:13px;line-height:1.4;font-weight:900;letter-spacing:0.28em;text-transform:uppercase;color:#f8fafc;">
                                        EST
                                    </div>
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;border-collapse:collapse;">
                                        <tr>
                                            <td style="padding:8px 14px;background:#ffe347;color:#111111;font-size:12px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;">
                                                ${normalized.examLabel} Exam Assignment
                                            </td>
                                        </tr>
                                    </table>
                                    <p style="margin:16px 0 0;font-size:15px;line-height:27px;color:#f8fafc;mso-line-height-rule:exactly;">
                                        Dear {{name}}, we look forward to welcoming you on <strong>${normalized.examDay}</strong> the <strong>${normalized.examDate}</strong> for the <strong>${normalized.examLabel} Exam</strong> as our <strong>{{assignment_role}}</strong>.
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
                                                                                    <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#111111;">${normalized.examDay}</div>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                    <td width="33.333%" valign="top" style="padding:0 5px;">
                                                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #dbe2ea;background:#ffffff;">
                                                                            <tr>
                                                                                <td style="padding:14px 14px 12px;">
                                                                                    <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Date</div>
                                                                                    <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#111111;">${normalized.examDate}</div>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                    <td width="33.333%" valign="top" style="padding:0 0 0 10px;">
                                                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #171717;background:#171717;">
                                                                            <tr>
                                                                                <td style="padding:14px 14px 12px;">
                                                                                    <div style="font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#f8fafc;">Arrival Time</div>
                                                                                    <div style="margin-top:8px;font-size:18px;line-height:1.4;font-weight:900;color:#ffe347;">${normalized.arrivalTime}</div>
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
                                </td>
                            </tr>
                            ${buildGuidedFooterBlock()}
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>`.trim(),
    };
};

export const EXAM_ASSIGNMENT_TEMPLATE_PRESETS: TemplateRecord[] = [
    {
        name: 'EST I Exam Assignment',
        type: TemplateType.BOTH,
        subject: buildGuidedTemplateContent({
            examLabel: 'EST I',
            examDay: 'Friday',
            examDate: '15th of May 2026',
            arrivalTime: '8:00 AM',
            variant: 'STANDARD',
        }).subject,
        body: buildGuidedTemplateContent({
            examLabel: 'EST I',
            examDay: 'Friday',
            examDate: '15th of May 2026',
            arrivalTime: '8:00 AM',
            variant: 'STANDARD',
        }).body,
        include_confirmation_button: false,
    },
    {
        name: 'EST II Exam Assignment',
        type: TemplateType.BOTH,
        subject: buildGuidedTemplateContent({
            examLabel: 'EST II',
            examDay: 'Saturday',
            examDate: '16th of May 2026',
            arrivalTime: '8:00 AM',
            variant: 'STANDARD',
        }).subject,
        body: buildGuidedTemplateContent({
            examLabel: 'EST II',
            examDay: 'Saturday',
            examDate: '16th of May 2026',
            arrivalTime: '8:00 AM',
            variant: 'STANDARD',
        }).body,
        include_confirmation_button: false,
    },
    {
        name: 'EST I Exam Assignment (With Confirmation)',
        type: TemplateType.BOTH,
        subject: buildGuidedTemplateContent({
            examLabel: 'EST I',
            examDay: 'Friday',
            examDate: '15th of May 2026',
            arrivalTime: '8:00 AM',
            variant: 'CONFIRMATION',
        }).subject,
        body: buildGuidedTemplateContent({
            examLabel: 'EST I',
            examDay: 'Friday',
            examDate: '15th of May 2026',
            arrivalTime: '8:00 AM',
            variant: 'CONFIRMATION',
        }).body,
        include_confirmation_button: true,
    },
    {
        name: 'EST II Exam Assignment (With Confirmation)',
        type: TemplateType.BOTH,
        subject: buildGuidedTemplateContent({
            examLabel: 'EST II',
            examDay: 'Saturday',
            examDate: '16th of May 2026',
            arrivalTime: '8:00 AM',
            variant: 'CONFIRMATION',
        }).subject,
        body: buildGuidedTemplateContent({
            examLabel: 'EST II',
            examDay: 'Saturday',
            examDate: '16th of May 2026',
            arrivalTime: '8:00 AM',
            variant: 'CONFIRMATION',
        }).body,
        include_confirmation_button: true,
    },
];

export const isRichHtmlEmailTemplate = (body: string) => /<[a-z][\w:-]*\b[^>]*>/i.test(body);

export function parseExamAssignmentTemplateMeta(body: string): ExamAssignmentTemplateMeta | null {
    const match = String(body || '').match(/<!--\s*EST_ASSIGNMENT_TEMPLATE_(V[123]):([^>]+?)\s*-->/i);
    if (!match) {
        return null;
    }

    return {
        variant: match[1].toUpperCase() as ExamAssignmentTemplateMeta['variant'],
        examLabel: match[2].trim(),
    };
}

export function parseGuidedTemplateConfig(body: string): GuidedExamAssignmentTemplateConfig | null {
    const match = String(body || '').match(new RegExp(`<!--\\s*${GUIDED_TEMPLATE_META_PREFIX}([^>]+)\\s*-->`, 'i'));
    if (!match) {
        return null;
    }

    try {
        const parsed = JSON.parse(decodeURIComponent(match[1]));
        return normalizeGuidedTemplateConfig({
            examLabel: parsed.examLabel === 'EST II' ? 'EST II' : 'EST I',
            examDay: String(parsed.examDay || ''),
            examDate: String(parsed.examDate || ''),
            arrivalTime: String(parsed.arrivalTime || ''),
            variant: parsed.variant === 'CONFIRMATION' ? 'CONFIRMATION' : 'STANDARD',
        });
    } catch {
        return null;
    }
}

export function buildGuidedExamAssignmentWhatsAppBody(
    config: GuidedExamAssignmentTemplateConfig,
    recipient: Record<string, any>,
) {
    const normalized = normalizeGuidedTemplateConfig(config);
    const name = String(recipient.name || '').trim();
    const role = String(recipient.assignment_role || recipient.role || '').trim();
    const building = String(recipient.building || recipient.test_center || '').trim();
    const room = String(recipient.room_est1 || recipient.room || '').trim();
    const responseUrl = String(recipient.response_url || '').trim();

    return [
        `*${normalized.examLabel} Exam Assignment*`,
        name ? `Dear ${name},` : 'Dear colleague,',
        '',
        `📅 Exam day: ${normalized.examDay}`,
        `🗓️ Date: ${normalized.examDate}`,
        `🕗 Arrival time: ${normalized.arrivalTime}`,
        role ? `👤 Role: ${role}` : null,
        building ? `🏢 Test center: ${building}` : null,
        normalized.variant === 'CONFIRMATION' ? null : (room ? `🚪 Room: ${room}` : null),
        '',
        'Please review your assignment details carefully and arrive 30 minutes early.',
        normalized.variant === 'CONFIRMATION' ? '' : null,
        normalized.variant === 'CONFIRMATION' ? '*Action Required*' : null,
        normalized.variant === 'CONFIRMATION'
            ? 'Please open the response page to confirm attendance or send an apology.'
            : null,
        normalized.variant === 'CONFIRMATION' && responseUrl ? `🔗 ${responseUrl}` : null,
    ]
        .filter((line): line is string => line !== null && line !== undefined)
        .join('\n');
}

export function buildExamAssignmentWhatsAppBody(
    meta: ExamAssignmentTemplateMeta,
    recipient: Record<string, any>,
) {
    const role = String(recipient.assignment_role || recipient.role || '').trim();
    const building = String(recipient.building || recipient.test_center || '').trim();
    const room = String(recipient.room_est1 || recipient.room || '').trim();
    const responseUrl = String(recipient.response_url || '').trim();

    return [
        `*${meta.examLabel} Exam Assignment*`,
        recipient.name ? `Dear ${recipient.name},` : 'Dear colleague,',
        '',
        role ? `👤 Role: ${role}` : null,
        building ? `🏢 Test center: ${building}` : null,
        responseUrl ? null : (room ? `🚪 Room: ${room}` : null),
        '',
        'Please review your assignment details carefully.',
        responseUrl ? '' : null,
        responseUrl ? '*Action Required*' : null,
        responseUrl ? 'Please open the response page to confirm attendance or send an apology.' : null,
        responseUrl ? `🔗 ${responseUrl}` : null,
    ]
        .filter((line): line is string => line !== null && line !== undefined)
        .join('\n');
}
