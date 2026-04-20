import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to generate dates up to N days ago
const getPastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d;
};

async function main() {
    await prisma.machineSession.deleteMany();
    await prisma.qrToken.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.recyclingLog.deleteMany();
    await prisma.user.deleteMany();

    const adminPassword = await bcrypt.hash('admin123', 10);
    const studentPassword = await bcrypt.hash('student1', 10);

    // 1. Create Admin
    const admin = await prisma.user.create({
        data: {
            email: 'ecodefill@gmail.com',
            passwordHash: adminPassword,
            role: 'ADMIN',
            balance: 0,
        },
    });

    // 2. Create Students from the 7 official courses
    const studentNames = [
        "Juan Dela Cruz", "Maria Santos", "Jose Rizal", "Ana Reyes", "Carlos Garcia",
        "Elena Bautista", "Andres Bonifacio", "Sofia Lopez", "Ricardo Dalisay", "Liza Soberano",
        "Enrique Gil", "Kathryn Bernardo", "Daniel Padilla", "Angel Locsin", "Piolo Pascual",
        "Marian Rivera", "Dingdong Dantes", "Anne Curtis", "Vice Ganda", "Joshua Garcia",
        "Julia Barretto", "Alden Richards", "Maine Mendoza", "Coco Martin", "Kim Chiu"
    ];

    const courses = ["BSIT", "BSCS", "BSHM", "BSTM", "BECED", "BTLED", "BSOAD"];
    const yearLevels = ["1", "2", "3", "4"];
    const sections = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];

    const users = [];

    // Generate 20 students
    for (let i = 0; i < 20; i++) {
        const fullName = studentNames[i];
        const firstName = fullName.split(" ")[0].toLowerCase();
        const email = `${firstName}.${i + 1}@gmail.com`;
        const course = courses[Math.floor(Math.random() * courses.length)];
        const yearLevel = yearLevels[Math.floor(Math.random() * yearLevels.length)];
        const section = sections[Math.floor(Math.random() * sections.length)];
        const balance = Math.floor(Math.random() * 300); // Random initial balance

        users.push(await prisma.user.create({
            data: {
                email,
                fullName,
                passwordHash: studentPassword, // 'student1' for all
                role: 'STUDENT',
                balance: balance,
                course: course,
                yearLevel: yearLevel,
                section: section
            }
        }));
    }

    // 3. Machine Logs
    await prisma.machineLog.createMany({
        data: [
            { machineId: "ESP32-CAM-01", status: "ONLINE", pingMs: 45, createdAt: getPastDate(1) },
            { machineId: "ESP32-CAM-01", status: "OFFLINE", pingMs: 0, createdAt: getPastDate(3) },
            { machineId: "ESP32-CAM-01", status: "ONLINE", pingMs: 32, createdAt: new Date() },
            { machineId: "ESP32-CAM-02", status: "ONLINE", pingMs: 51, createdAt: new Date() },
            { machineId: "ESP32-CAM-03", status: "MAINTENANCE", pingMs: 0, createdAt: new Date() },
        ]
    });

    // 4. Seeding historical data for the 7-day chart & Leaderboard
    const materials = ["BOTTLE", "CUP", "PAPER"] as const;
    const statuses = ["SUCCESS", "SUCCESS", "SUCCESS", "REJECTED"] as const;

    for (let day = 0; day <= 6; day++) {
        const date = getPastDate(day);
        
        // Generate 3-8 recycling transactions per day
        const numTransactions = Math.floor(Math.random() * 6) + 3;

        for (let i = 0; i < numTransactions; i++) {
            const user = users[Math.floor(Math.random() * users.length)];
            const material = materials[Math.floor(Math.random() * materials.length)];
            let count = 0;
            let points = 0;
            const status = statuses[Math.floor(Math.random() * statuses.length)];

            if (material === "BOTTLE") {
                points = Math.floor(Math.random() * 5) + 1; // 1 to 5 points
                count = points; // 1 bottle = 1 point
            } else if (material === "CUP") {
                points = Math.floor(Math.random() * 4) + 1; // 1 to 4 points
                count = points * 2; // 2 cups = 1 point
            } else if (material === "PAPER") {
                points = Math.floor(Math.random() * 3) + 1; // 1 to 3 points
                count = points * 3; // 3 paper = 1 point
            }

            if (status !== "SUCCESS") {
                points = 0;
            }

            // Log the recycling event
            await prisma.recyclingLog.create({
                data: {
                    machineId: "ESP32-CAM-01",
                    userId: user.id,
                    materialType: material,
                    count: count,
                    pointsEarned: points,
                    status: status,
                    createdAt: date
                }
            });

            // Log the "EARN" transaction if successful
            if (status === "SUCCESS") {
                await prisma.transaction.create({
                    data: {
                        userId: user.id,
                        type: "EARN",
                        amount: points,
                        materialType: material,
                        count: count,
                        status: "SUCCESS",
                        createdAt: date
                    }
                });
            }
        }
        
        // Occasional redemptions
        if (Math.random() > 0.5) {
            const user = users[Math.floor(Math.random() * users.length)];
            await prisma.transaction.create({
                data: {
                    userId: user.id,
                    type: "REDEEM",
                    amount: 5, // 500ml
                    status: "SUCCESS",
                    createdAt: date
                }
            });
        }
    }

    console.log("Database seeded with robust historical data!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
