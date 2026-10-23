import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { verifyAndConsumeCode, VerificationPurpose } from "@/lib/verification";

const VALID_COURSES = ["BSIT", "BSCS", "BSHM", "BSTM", "BECED", "BTLED", "BSOAD"];
const SCHOOL_EMAIL_DOMAIN = "@pdmeduph.onmicrosoft.com";
const STUDENT_NUMBER_REGEX = /^PDM-\d{4}-\d{6}$/;

const registerSchemaServer = z.object({
    email: z
        .string()
        .email()
        .refine((e) => e.trim().toLowerCase().endsWith(SCHOOL_EMAIL_DOMAIN), {
            message: `Only school emails ending with ${SCHOOL_EMAIL_DOMAIN} are allowed.`,
        }),
    password: z.string().min(8),
    verificationCode: z.string().length(6),
    fullName: z.string().optional(),
    studentNumber: z
        .string()
        .optional()
        .refine((sn) => !sn || STUDENT_NUMBER_REGEX.test(sn), {
            message: "Student number must follow the format PDM-YYYY-XXXXXX (e.g. PDM-2022-002471).",
        }),
    course: z.string().optional(),
    yearLevel: z.string().optional(),
    section: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = registerSchemaServer.safeParse(body);

        if (!result.success) {
            const firstError = result.error.issues[0]?.message || "Invalid input format";
            return NextResponse.json({ message: firstError }, { status: 400 });
        }

        const { email, password, fullName, studentNumber, course, yearLevel, section, verificationCode } = result.data;
        const normalizedEmail = email.trim().toLowerCase();

        // Check for existing account with same email
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 });
        }

        // Check for existing account with same student number
        if (studentNumber) {
            const existingStudentNum = await prisma.user.findUnique({ where: { studentNumber } });
            if (existingStudentNum) {
                return NextResponse.json({ message: "An account with this student number already exists" }, { status: 409 });
            }
        }

        const isCodeValid = await verifyAndConsumeCode(
            normalizedEmail,
            VerificationPurpose.Register,
            verificationCode
        );
        if (!isCodeValid) {
            return NextResponse.json({ message: "Invalid or expired email verification code." }, { status: 400 });
        }

        if (course && !VALID_COURSES.includes(course)) {
            return NextResponse.json({ message: "Invalid course selection" }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                email: normalizedEmail,
                passwordHash,
                fullName: fullName || null,
                studentNumber: studentNumber || null,
                role: "STUDENT",
                balance: 0,
                course: course || null,
                yearLevel: yearLevel || null,
                section: section || null,
            }
        });

        return NextResponse.json({ message: "Registration successful", userId: newUser.id }, { status: 201 });

    } catch (error) {
        console.error("Registration Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
