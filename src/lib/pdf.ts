type TextColor = [number, number, number];

interface TextOptions {
    size?: number;
    bold?: boolean;
    color?: TextColor;
    indent?: number;
    width?: number;
    gap?: number;
}

interface TableColumn {
    header: string;
    width: number;
    align?: "left" | "center" | "right";
}

interface TableOptions {
    columns: TableColumn[];
    rows: string[][];
    fontSize?: number;
    headerFontSize?: number;
    rowPadding?: number;
    headerFill?: TextColor;
    headerColor?: TextColor;
    borderColor?: TextColor;
    rowStripeFill?: TextColor;
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN = 48;
const encoder = new TextEncoder();

function byteLength(value: string) {
    return encoder.encode(value).length;
}

function sanitizePdfText(value: string) {
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
        if (word.length > maxChars) {
            if (line) {
                lines.push(line);
                line = "";
            }
            for (let i = 0; i < word.length; i += maxChars) {
                lines.push(word.slice(i, i + maxChars));
            }
            continue;
        }

        const next = line ? `${line} ${word}` : word;
        if (next.length > maxChars) {
            lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }

    if (line) lines.push(line);
    return lines.length ? lines : [""];
}

export class PdfDocument {
    private pages: string[][] = [[]];
    private y = PAGE_HEIGHT - PAGE_MARGIN;

    private get currentPage() {
        return this.pages[this.pages.length - 1];
    }

    private ensureSpace(height: number) {
        if (this.y - height >= PAGE_MARGIN) return;
        this.pages.push([]);
        this.y = PAGE_HEIGHT - PAGE_MARGIN;
    }

    private writeTextLine(text: string, x: number, y: number, size: number, font: "F1" | "F2", color: TextColor) {
        const [r, g, b] = color.map((v) => (v / 255).toFixed(3));
        this.currentPage.push(`${r} ${g} ${b} rg\nBT /${font} ${size} Tf ${x} ${y.toFixed(2)} Td (${sanitizePdfText(text)}) Tj ET\n`);
    }

    private setStrokeColor(color: TextColor) {
        const [r, g, b] = color.map((v) => (v / 255).toFixed(3));
        this.currentPage.push(`${r} ${g} ${b} RG\n`);
    }

    private setFillColor(color: TextColor) {
        const [r, g, b] = color.map((v) => (v / 255).toFixed(3));
        this.currentPage.push(`${r} ${g} ${b} rg\n`);
    }

    private drawRect(x: number, y: number, width: number, height: number, fill?: TextColor, stroke?: TextColor) {
        if (fill) {
            this.setFillColor(fill);
            this.currentPage.push(`${x.toFixed(2)} ${(y - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f\n`);
        }

        if (stroke) {
            this.setStrokeColor(stroke);
            this.currentPage.push(`${x.toFixed(2)} ${(y - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S\n`);
        }
    }

    addText(text: string, options: TextOptions = {}) {
        const size = options.size ?? 11;
        const x = PAGE_MARGIN + (options.indent ?? 0);
        const width = options.width ?? PAGE_WIDTH - PAGE_MARGIN * 2 - (options.indent ?? 0);
        const lineHeight = size * 1.35;
        const maxChars = Math.max(12, Math.floor(width / (size * 0.52)));
        const lines = wrapText(text, maxChars);

        for (const line of lines) {
            this.ensureSpace(lineHeight);
            this.writeTextLine(line, x, this.y, size, options.bold ? "F2" : "F1", options.color ?? [31, 41, 55]);
            this.y -= lineHeight;
        }

        this.y -= options.gap ?? 3;
    }

    addSpacer(height = 10) {
        this.ensureSpace(height);
        this.y -= height;
    }

    addRule() {
        this.ensureSpace(12);
        this.currentPage.push(`0.900 0.914 0.933 RG\n${PAGE_MARGIN} ${this.y.toFixed(2)} m ${PAGE_WIDTH - PAGE_MARGIN} ${this.y.toFixed(2)} l S\n`);
        this.y -= 12;
    }

    addKeyValue(label: string, value: string) {
        this.addText(`${label}: ${value}`, { size: 10.5, gap: 1 });
    }

    addTable(options: TableOptions) {
        const fontSize = options.fontSize ?? 8.5;
        const headerFontSize = options.headerFontSize ?? 8.5;
        const padding = options.rowPadding ?? 6;
        const lineHeight = fontSize * 1.25;
        const headerLineHeight = headerFontSize * 1.2;
        const headerFill = options.headerFill ?? [31, 41, 55];
        const headerColor = options.headerColor ?? [255, 255, 255];
        const borderColor = options.borderColor ?? [226, 232, 240];
        const stripeFill = options.rowStripeFill ?? [248, 250, 252];
        const tableWidth = options.columns.reduce((sum, column) => sum + column.width, 0);

        const wrapCell = (value: string, column: TableColumn, size: number) => {
            const maxChars = Math.max(4, Math.floor((column.width - padding * 2) / (size * 0.52)));
            return wrapText(value, maxChars);
        };

        const drawHeader = () => {
            const headerLines = options.columns.map((column) => wrapCell(column.header, column, headerFontSize));
            const headerHeight = Math.max(...headerLines.map((lines) => lines.length)) * headerLineHeight + padding * 2;

            this.ensureSpace(headerHeight + lineHeight + padding * 2);
            this.drawRect(PAGE_MARGIN, this.y, tableWidth, headerHeight, headerFill, borderColor);

            let x = PAGE_MARGIN;
            options.columns.forEach((column, columnIndex) => {
                this.drawRect(x, this.y, column.width, headerHeight, undefined, borderColor);
                headerLines[columnIndex].forEach((line, lineIndex) => {
                    this.writeTextLine(line, x + padding, this.y - padding - headerFontSize - lineIndex * headerLineHeight, headerFontSize, "F2", headerColor);
                });
                x += column.width;
            });

            this.y -= headerHeight;
        };

        drawHeader();

        options.rows.forEach((row, rowIndex) => {
            const rowLines = options.columns.map((column, columnIndex) => wrapCell(row[columnIndex] ?? "", column, fontSize));
            const rowHeight = Math.max(...rowLines.map((lines) => lines.length)) * lineHeight + padding * 2;

            if (this.y - rowHeight < PAGE_MARGIN) {
                this.pages.push([]);
                this.y = PAGE_HEIGHT - PAGE_MARGIN;
                drawHeader();
            }

            this.drawRect(PAGE_MARGIN, this.y, tableWidth, rowHeight, rowIndex % 2 === 1 ? stripeFill : [255, 255, 255], borderColor);

            let x = PAGE_MARGIN;
            options.columns.forEach((column, columnIndex) => {
                this.drawRect(x, this.y, column.width, rowHeight, undefined, borderColor);
                rowLines[columnIndex].forEach((line, lineIndex) => {
                    const textWidth = line.length * fontSize * 0.5;
                    const textX = column.align === "right"
                        ? x + column.width - padding - textWidth
                        : column.align === "center"
                            ? x + (column.width - textWidth) / 2
                            : x + padding;

                    this.writeTextLine(line, Math.max(x + padding, textX), this.y - padding - fontSize - lineIndex * lineHeight, fontSize, "F1", [31, 41, 55]);
                });
                x += column.width;
            });

            this.y -= rowHeight;
        });

        this.y -= 10;
    }

    output() {
        const objects: string[] = [];
        const pageObjectIds = this.pages.map((_, index) => 5 + index * 2);

        objects[0] = `<< /Type /Catalog /Pages 2 0 R >>`;
        objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${this.pages.length} >>`;
        objects[2] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
        objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`;

        this.pages.forEach((commands, index) => {
            const pageObjectId = 5 + index * 2;
            const contentObjectId = pageObjectId + 1;
            const content = commands.join("");

            objects[pageObjectId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
            objects[contentObjectId - 1] = `<< /Length ${byteLength(content)} >>\nstream\n${content}endstream`;
        });

        let body = "%PDF-1.4\n";
        const offsets = [0];

        objects.forEach((object, index) => {
            offsets[index + 1] = byteLength(body);
            body += `${index + 1} 0 obj\n${object}\nendobj\n`;
        });

        const xrefOffset = byteLength(body);
        body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
        offsets.slice(1).forEach((offset) => {
            body += `${String(offset).padStart(10, "0")} 00000 n \n`;
        });
        body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

        return encoder.encode(body);
    }
}
