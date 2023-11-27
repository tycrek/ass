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
            format += this.range.file.code + '\n';
            format += ' '.repeat(this.range.from) + '^' + '~'.repeat(Math.max(this.range.to - this.range.from, 0)) + '\n';
        }

        format += `${this.name}: ${this.message}`;

        return format;
    }
}

// template syntax error with token range, token range converted to source position
// outside of prepareTemplate
export class TemplateSyntaxError extends TemplateError {};