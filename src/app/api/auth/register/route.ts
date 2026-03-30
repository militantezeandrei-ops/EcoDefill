import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { verifyAndConsumeCode, VerificationPurpose } from "@/lib/verification";

const VALID_COURSES = ["BSIT", "BSCS", "BSHM", "BSTM", "BECED", "BTLED", "BSOAD"];

const registerSchemaServer = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    verificationCode: z.string().length(6),
    phoneNumber: z
        .string()
        .regex(/^\+?[0-9]{10,15}$/, "Invalid phone number format"),
    fullName: z.string().optional(),
    course: z.string().optional(),
    yearLevel: z.string().optional(),
    section: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = registerSchemaServer.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ message: "Invalid input format" }, { status: 400 });
        }

        const { email, password, fullName, course, yearLevel, section, verificationCode, phoneNumber } = result.data;
        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 });
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
                phoneNumber,
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
