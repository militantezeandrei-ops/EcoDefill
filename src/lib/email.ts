import nodemailer from "nodemailer";

interface SendCodeParams {
    to: string;
    code: string;
    purpose: "register" | "reset_password";
}

function subjectForPurpose(purpose: SendCodeParams["purpose"]) {
    return purpose === "register"
        ? "EcoDefill Email Verification Code"
        : "EcoDefill Password Reset Code";
}

function bodyForPurpose(code: string, purpose: SendCodeParams["purpose"]) {
    const action =
        purpose === "register"
            ? "complete your EcoDefill registration"
            : "reset your EcoDefill password";
    return `Your verification code is ${code}. It expires in 10 minutes. Use this code to ${action}.`;
}

export async function sendVerificationEmail({
    to,
    code,
    purpose,
}: SendCodeParams): Promise<{ delivered: boolean; error?: string }> {
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpPort = Number(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    const smtpSecure = (process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim() || "EcoDefill <no-reply@ecodefill.app>";

    if (smtpHost && smtpUser && smtpPass) {
        try {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });

            await transporter.sendMail({
                from,
                to,
                subject: subjectForPurpose(purpose),
                text: bodyForPurpose(code, purpose),
            });

            return { delivered: true };
        } catch (error) {
            console.error("SMTP email send failed:", error);
            return { delivered: false, error: "Failed to send email via SMTP." };
        }
    }

    if (!resendApiKey) {
        return {
            delivered: false,
            error: "Email service not configured. Set SMTP_* or RESEND_API_KEY.",
        };
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from,
            to,
            subject: subjectForPurpose(purpose),
            text: bodyForPurpose(code, purpose),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to send email verification code:", errorText);
        return {
            delivered: false,
            error: "Failed to send email with provider.",
        };
    }

    return { delivered: true };
}
