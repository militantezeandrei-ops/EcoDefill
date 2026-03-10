import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchemaServer = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = registerSchemaServer.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ message: "Invalid input format" }, { status: 400 });
        }

        const { email, password } = result.data;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: "STUDENT",
                balance: 0,
            }
        });

        return NextResponse.json({ message: "Registration successful", userId: newUser.id }, { status: 201 });

    } catch (error) {
        console.error("Registration Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
