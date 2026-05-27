import { NextRequest, NextResponse } from "next/server";
import { getAdminReportData, getAdminReportLabel, resolveAdminReportType, type AdminReportData, type AdminReportType } from "@/lib/admin-reports";
import { verifyToken } from "@/lib/auth";
import { PdfDocument } from "@/lib/pdf";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
    return Number(value || 0).toLocaleString("en-US", {
        maximumFractionDigits: 1,
    });
}

function formatDate(value: Date) {
    return value.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function addSummarySection(pdf: PdfDocument, data: AdminReportData) {
    pdf.addText("Executive Summary", { size: 15, bold: true, color: [17, 24, 39], gap: 6 });
    pdf.addTable({
        columns: [
            { header: "Metric", width: 300 },
            { header: "Value", width: 216, align: "right" },
        ],
        rows: [
            ["Registered students", formatNumber(data.totalUsers)],
            ["Total transactions", formatNumber(data.totalTransactions)],
            ["Total points earned", `${formatNumber(data.totalEarned)} pts`],
            ["Total points redeemed", `${formatNumber(data.totalRedeemed)} pts`],
            ["Estimated water dispensed", `${formatNumber(data.waterDispensedMl)} ml`],
            ["Items recycled", formatNumber(data.totalItemsRecycled)],
        ],
        headerFill: [17, 24, 39],
    });
    pdf.addSpacer(6);
}

function addUserActivitySection(pdf: PdfDocument, data: AdminReportData) {
    pdf.addText("User Activity", { size: 15, bold: true, color: [37, 99, 235], gap: 6 });
    pdf.addText("Top students ranked by recycling points earned.", { size: 10.5, color: [75, 85, 99] });
    if (data.activeStudents.length === 0) {
        pdf.addText("No active students yet.", { size: 10, indent: 10 });
    } else {
        pdf.addTable({
            columns: [
                { header: "#", width: 36, align: "center" },
                { header: "Student", width: 190 },
                { header: "Course", width: 70, align: "center" },
                { header: "Section", width: 55, align: "center" },
                { header: "Points", width: 80, align: "right" },
                { header: "Items", width: 85, align: "right" },
            ],
            rows: data.activeStudents.map((student, index) => [
                String(index + 1),
                student.fullName || student.email,
                student.course || "N/A",
                student.section || "N/A",
                `${formatNumber(student.totalPoints)} pts`,
                formatNumber(student.totalItems),
            ]),
            headerFill: [37, 99, 235],
        });
    }
    pdf.addSpacer(8);
}

function addRecyclingSection(pdf: PdfDocument, data: AdminReportData) {
    pdf.addText("Recycling Performance", { size: 15, bold: true, color: [5, 150, 105], gap: 6 });
    pdf.addText("Material breakdown based on successful earning transactions.", { size: 10.5, color: [75, 85, 99] });
    pdf.addTable({
        columns: [
            { header: "Material", width: 160 },
            { header: "Items", width: 120, align: "right" },
            { header: "Points", width: 120, align: "right" },
            { header: "Transactions", width: 116, align: "right" },
        ],
        rows: data.materialSummary.map((material) => [
            material.materialType,
            formatNumber(material.items),
            `${formatNumber(material.points)} pts`,
            formatNumber(material.transactions),
        ]),
        headerFill: [5, 150, 105],
    });
    pdf.addSpacer(8);
}

function addTransactionSection(pdf: PdfDocument, data: AdminReportData) {
    pdf.addText("Transaction History", { size: 15, bold: true, color: [124, 58, 237], gap: 6 });
    pdf.addText("Most recent transactions in the admin log.", { size: 10.5, color: [75, 85, 99] });
    if (data.recentTransactions.length === 0) {
        pdf.addText("No transactions found.", { size: 10, indent: 10 });
    } else {
        pdf.addTable({
            columns: [
                { header: "Date", width: 95 },
                { header: "Type", width: 48, align: "center" },
                { header: "User", width: 155 },
                { header: "Material", width: 66, align: "center" },
                { header: "Amount", width: 72, align: "right" },
                { header: "Status", width: 80, align: "center" },
            ],
            rows: data.recentTransactions.slice(0, 25).map((transaction) => [
                formatDate(transaction.createdAt),
                transaction.type,
                transaction.userName,
                transaction.materialType,
                `${formatNumber(transaction.amount)} pts`,
                transaction.status,
            ]),
            fontSize: 8,
            headerFontSize: 8,
            headerFill: [124, 58, 237],
        });
    }
}

function buildReportPdf(type: AdminReportType, data: AdminReportData) {
    const pdf = new PdfDocument();
    const title = getAdminReportLabel(type);

    pdf.addText(title, { size: 20, bold: true, color: [17, 24, 39], gap: 4 });
    pdf.addText("EcoDefill Admin System", { size: 11, bold: true, color: [37, 99, 235], gap: 1 });
    pdf.addText(`Generated ${formatDate(data.generatedAt)}`, { size: 10, color: [107, 114, 128] });
    pdf.addRule();

    if (type === "all") {
        addSummarySection(pdf, data);
    }

    if (type === "all" || type === "user-activity") {
        addUserActivitySection(pdf, data);
    }

    if (type === "all" || type === "recycling-performance") {
        addRecyclingSection(pdf, data);
    }

    if (type === "all" || type === "transaction-history") {
        addTransactionSection(pdf, data);
    }

    return pdf.output();
}

export async function GET(req: NextRequest) {
    const token = req.cookies.get("adminAuthToken")?.value;
    const auth = token ? verifyToken(token) : null;

    if (!auth || auth.role !== "ADMIN") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const type = resolveAdminReportType(req.nextUrl.searchParams.get("type"));
    const data = await getAdminReportData();
    const pdf = buildReportPdf(type, data);
    const filename = `${type}-ecodefill-report-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new Response(pdf, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
