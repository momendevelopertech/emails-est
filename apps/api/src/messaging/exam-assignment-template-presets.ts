import { TemplateType } from '@prisma/client';

type TemplateRecord = {
    name: string;
    type: TemplateType;
    subject: string;
    body: string;
};

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
                <!-- Header with Logo -->
                <tr>
                    <td align="center" style="padding:24px 20px 16px;">
                        <img src="${logoUrl}" alt="EST Logo" style="width:120px;height:auto;display:block;margin:0 auto;" />
                    </td>
                </tr>
                <!-- Main Content Card -->
                <tr>
                    <td style="padding:0 16px 24px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-radius:16px;background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                            <!-- Greeting Section -->
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
                            <!-- Key Details Section -->
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
                            <!-- Location Section -->
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
                            <!-- Important Notice -->
                            <tr>
                                <td style="padding:24px 28px;">
                                    <div style="padding:16px;border-radius:12px;background:#fef3c7;border-left:4px solid #f59e0b;">
                                        <div style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;margin-bottom:8px;">⏰ Important</div>
                                        <div style="font-size:13px;line-height:1.6;color:#78350f;">
                                            Please arrive at least 30 minutes before your scheduled exam time. Bring a valid ID and review all venue details carefully. Keep this message for reference on exam day.
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="padding:24px 28px;border-top:1px solid #f0f2f5;text-align:center;">
                                    <div style="font-size:12px;line-height:1.6;color:#718096;">
                                        <div style="margin-bottom:8px;font-weight:600;color:#1a202c;">The EST Team</div>
                                        <div>For any questions, please contact our support team.</div>
                                        <div style="margin-top:12px;font-size:11px;color:#cbd5e1;">
                                            This assignment was generated from the latest uploaded roster for ${examLabel}.
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

export const EXAM_ASSIGNMENT_TEMPLATE_PRESETS: TemplateRecord[] = [
    {
        name: 'EST I Exam Assignment',
        type: TemplateType.EMAIL,
        subject: 'EST I Exam Assignment | {{name}}',
        body: buildExamAssignmentEmailBodyV2({
            examLabel: 'EST I',
            logoUrl: 'https://emails-est-web.vercel.app/brand/est-i-logo.svg',
        }),
    },
    {
        name: 'EST II Exam Assignment',
        type: TemplateType.EMAIL,
        subject: 'EST II Exam Assignment | {{name}}',
        body: buildExamAssignmentEmailBodyV2({
            examLabel: 'EST II',
            logoUrl: 'https://emails-est-web.vercel.app/brand/est-ii-logo.svg',
        }),
    },
];

export const isRichHtmlEmailTemplate = (body: string) => /<[a-z][\w:-]*\b[^>]*>/i.test(body);
