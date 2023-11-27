import { TemplateSourceRange } from "ass";

export class TemplateError extends Error {
    range?: TemplateSourceRange;

    constructor(msg: string, range?: TemplateSourceRange) {
        super(msg);

        this.range = range;
    }

    public format(): string {
        let format = '';

        if (this.range) {
            let fcol   = 0;
            let fline  = 1;
            let pstart = 0;

            for (let i = 0; i < this.range.from; i++) {
                fcol++;
                if (this.range.file.code[i] == '\n') {
                    fline++;
                    fcol = 0;
                    pstart = i + 1;
                }
            }

            let tcol  = fcol;
            let tline = fline;
            let pend = pstart;

            for (let i = this.range.from; i < this.range.to; i++) {
                tcol++;
                if (this.range.file.code[i] == '\n') {
                    tline++;
                    tcol = 0;
                    pend = i + 1;
                }
            }

            pend = Math.max(this.range.file.code.indexOf('\n', pend), pend);

            if (fline == tline) {
                format += `${fline.toString().padStart(5, ' ')} | ${this.range.file.code.substring(pstart, pend)}\n`;
                format += `${fline.toString().padStart(5, ' ')} | ${' '.repeat(fcol)}^${'~'.repeat(Math.max(tcol - fcol, 0))}\n`;
            } else {
                let lines = this.range.file.code.substring(pstart, pend).split('\n');

                format += `      | /${'~'.repeat(lines[0].length)}v\n`;

                for (let i = fline; i < fline + 5 && i <= tline; i++) {
                    format += `${i.toString().padStart(5, ' ')} | | ${lines[i - fline]}\n`;
                }

                if (fline + 5 < tline) {
                    format += `      | | ...\n`;

                    for (let i = tline - 4; i <= tline; i++) {
                        format += `${i.toString().padStart(5, ' ')} | | ${lines[i - fline]}\n`;
                    }
                }

                format += `      | \\${'~'.repeat(tcol + 1)}^\n`;
            }
        }

        format += `${this.name}: ${this.message}`;

        return format;
    }
}

// template syntax error with token range, token range converted to source position
// outside of prepareTemplate
export class TemplateSyntaxError extends TemplateError {};