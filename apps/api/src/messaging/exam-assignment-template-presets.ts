import { TemplateType } from '@prisma/client';

type TemplateRecord = {
    name: string;
    type: TemplateType;
    subject: string;
    body: string;
    include_confirmation_button?: boolean;
};

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

export const EXAM_ASSIGNMENT_TEMPLATE_PRESETS: TemplateRecord[] = [
    {
        name: 'EST I Exam Assignment - V2 Modern',
        type: TemplateType.BOTH,
        subject: 'EST I Exam Assignment - V2 | {{name}}',
        body: buildExamAssignmentEmailBodyV2({
            examLabel: 'EST I',
            logoUrl: 'https://emails-est-web.vercel.app/brand/est-i-logo.svg',
        }),
        include_confirmation_button: false,
    },
    {
        name: 'EST II Exam Assignment - V2 Modern',
        type: TemplateType.BOTH,
        subject: 'EST II Exam Assignment - V2 | {{name}}',
        body: buildExamAssignmentEmailBodyV2({
            examLabel: 'EST II',
            logoUrl: 'https://emails-est-web.vercel.app/brand/est-ii-logo.svg',
        }),
        include_confirmation_button: false,
    },
    {
        name: 'EST I Exam Assignment - V2 Modern (With Confirmation)',
        type: TemplateType.BOTH,
        subject: 'EST I Exam Assignment - V2 | {{name}} (Action Required)',
        body: buildExamAssignmentEmailBodyV2({
            examLabel: 'EST I',
            logoUrl: 'https://emails-est-web.vercel.app/brand/est-i-logo.svg',
        }) + '\n\n<!-- Confirmation Link -->\n<p style="text-align:center;margin:24px 0;"><a href="{{confirm_url}}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Confirm Attendance</a></p>\n\n<p style="text-align:center;font-size:12px;color:#718096;"><a href="{{confirm_url}}" style="color:#718096;">Or click here to confirm</a></p>',
        include_confirmation_button: true,
    },
    {
        name: 'EST II Exam Assignment - V2 Modern (With Confirmation)',
        type: TemplateType.BOTH,
        subject: 'EST II Exam Assignment - V2 | {{name}} (Action Required)',
        body: buildExamAssignmentEmailBodyV2({
            examLabel: 'EST II',
            logoUrl: 'https://emails-est-web.vercel.app/brand/est-ii-logo.svg',
        }) + '\n\n<!-- Confirmation Link -->\n<p style="text-align:center;margin:24px 0;"><a href="{{confirm_url}}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Confirm Attendance</a></p>\n\n<p style="text-align:center;font-size:12px;color:#718096;"><a href="{{confirm_url}}" style="color:#718096;">Or click here to confirm</a></p>',
        include_confirmation_button: true,
    },
];

export const isRichHtmlEmailTemplate = (body: string) => /<[a-z][\w:-]*\b[^>]*>/i.test(body);
