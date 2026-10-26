import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { verifyAndConsumeCode, VerificationPurpose } from "@/lib/verification";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

const VALID_COURSES = [
    "BSIT",
    "BSCS",
    "BSHM",
    "BSTM",
    "BECED",
    "BTLED",
    "BSOAD",
] as const;
const VALID_YEAR_LEVELS = ["1", "2", "3", "4"] as const;
const VALID_SECTIONS = ["A", "B", "C", "D"] as const;
const SCHOOL_EMAIL_DOMAIN = "@pdmeduph.onmicrosoft.com";
const STUDENT_NUMBER_REGEX = /^PDM-20\d{2}-\d{6}$/;
const MOBILE_CLIENT_HEADER = "ecodefill-mobile-v1";

const registerSchemaServer = z.object({
    email: z
        .string()
        .email("Invalid email format.")
        .refine((e) => e.trim().toLowerCase().endsWith(SCHOOL_EMAIL_DOMAIN), {
            message: `Only official PDM school emails ending with ${SCHOOL_EMAIL_DOMAIN} are allowed.`,
        })
        .refine((e) => !e.trim().split("@")[0].includes("+"), {
            message:
                "Email aliases (+ tags) are not permitted. Use your primary school email.",
        }),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters.")
        .refine(
            (p) => Buffer.byteLength(p, "utf8") <= 72,
            "Password must be at most 72 bytes.",
        ),
    verificationCode: z
        .string()
        .regex(/^\d{6}$/, "Verification code must be 6 digits."),
    fullName: z.string().trim().min(2, "Full name is required.").max(100),
    studentNumber: z
        .string()
        .trim()
        .regex(
            STUDENT_NUMBER_REGEX,
            "Student number must follow the format PDM-20XX-XXXXXX (e.g. PDM-2024-001234).",
        ),
    course: z.enum(VALID_COURSES, {
        error: () => ({ message: "Valid course selection is required." }),
    }),
    yearLevel: z.enum(VALID_YEAR_LEVELS, {
        error: () => ({ message: "Valid year level (1-4) is required." }),
    }),
    section: z.enum(VALID_SECTIONS, {
        error: () => ({ message: "Valid section (A-D) is required." }),
    }),
});

export async function POST(req: NextRequest) {
    try {
        // 1. Enforce Mobile App client header
        const clientHeader = req.headers.get("x-ecodefill-client");
        if (clientHeader !== MOBILE_CLIENT_HEADER) {
            return NextResponse.json(
                {
                    message:
                        "Registration is only permitted through the official EcoDefill Mobile App.",
                },
                { status: 403 },
            );
        }

        // 2. Rate limit registration attempts per IP
        const ip = getClientIp(req);
        if (!(await checkRateLimit(`${ip}:register`, 5, 5 * 60_000))) {
            return NextResponse.json(
                {
                    message:
                        "Too many registration attempts. Please try again later.",
                },
                { status: 429 },
            );
        }

        const body = await req.json();
        const result = registerSchemaServer.safeParse(body);

        if (!result.success) {
            const firstError =
                result.error.issues[0]?.message || "Invalid input format";
            return NextResponse.json({ message: firstError }, { status: 400 });
        }

        const {
            email,
            password,
            fullName,
            studentNumber,
            course,
            yearLevel,
            section,
            verificationCode,
        } = result.data;
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedStudentNumber = studentNumber.trim().toUpperCase();

        // Check for existing account with same email
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        if (existingUser) {
            return NextResponse.json(
                { message: "An account with this email already exists" },
                { status: 409 },
            );
        }

        // Check for existing account with same student number
        const existingStudentNum = await prisma.user.findUnique({
            where: { studentNumber: normalizedStudentNumber },
        });
        if (existingStudentNum) {
            return NextResponse.json(
                {
                    message:
                        "An account with this student number already exists",
                },
                { status: 409 },
            );
        }

        const passwordHash = await bcrypt.hash(password, 10);
        let newUserId = "";
        const isCodeValid = await verifyAndConsumeCode(
            normalizedEmail,
            VerificationPurpose.Register,
            verificationCode,
            async (tx) => {
                const newUser = await tx.user.create({
                    data: {
                        email: normalizedEmail,
                        passwordHash,
                        fullName,
                        studentNumber: normalizedStudentNumber,
                        role: "STUDENT",
                        balance: 0,
                        course,
                        yearLevel,
                        section,
                    },
                });

                newUserId = newUser.id;
            },
        );
        if (!isCodeValid) {
            return NextResponse.json(
                { message: "Invalid or expired email verification code." },
                { status: 400 },
            );
        }

        return NextResponse.json(
            { message: "Registration successful", userId: newUserId },
            { status: 201 },
        );
    } catch (error) {
        console.error("Registration Error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 },
        );
    }
}
