import { AssFile, AssUser, EmbedTemplate, EmbedTemplateOperation, PreparedEmbed } from "ass"

export const DEFAULT_EMBED: EmbedTemplate = {
    title:       "ass - The simple self-hosted ShareX server",
    description: "ass is a self-hosted ShareX upload server written in Node.js"
}

class EmbedContext {
    public uploader: AssUser;
    public file:     AssFile;

    constructor(uploader: AssUser, file: AssFile) {
        this.uploader = uploader;
        this.file     = file;
    }
}

const executeEmbedOperation = (op: EmbedTemplateOperation, ctx: EmbedContext): string | number => {
    if (typeof op == 'string') {
        return op;
    } else if (typeof op == 'number') {
        return op;
    } else if (typeof op == 'object') {
        switch (op.op) {
            case 'random':
                if (op.values.length > 0) {
                    return executeEmbedOperation(op.values[Math.round(Math.random() * (op.values.length - 1))], ctx);
                } else throw new Error('Random without child operations');
            case 'fileSize':
                return ctx.file.size;
            case 'uploader':
                return ctx.uploader.username;
            case 'formatBytes':
                // calculate the value
                let value      = executeEmbedOperation(op.value, ctx);

                // calculate the exponent
                let exponent = (op.unit != null && { 'b': 0, 'kb': 1, 'mb': 2, 'gb': 3, 'tb': 4 }[executeEmbedOperation(op.unit, ctx)])
                            || Math.max(Math.min(Math.floor(Math.log10(Number(value))/3), 4), 0);
                
                return `${(Number(value) / 1000 ** exponent).toFixed(2)}${['b', 'kb', 'mb', 'gb', 'tb'][exponent]}`;
            case 'concat':
                return op.values.reduce<string>((prev, op) => prev.concat(executeEmbedOperation(op, ctx).toString()), "");
        }
    } else throw new Error("Invalid embed template operation");
};

export const prepareEmbed = (template: EmbedTemplate, user: AssUser, file: AssFile): PreparedEmbed => {
    let ctx = new EmbedContext(user, file);

    return {
        title:       executeEmbedOperation(template.title, ctx).toString(),
        description: executeEmbedOperation(template.description, ctx).toString()
    };
};