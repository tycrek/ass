import { EmbedTemplate, EmbedTemplateOperation, PreparedEmbed } from "ass"

export const DEFAULT_EMBED: EmbedTemplate = {
    title:       "ass - The simple self-hosted ShareX server",
    description: "ass is a self-hosted ShareX upload server written in Node.js"
}

const executeEmbedOperation = (op: EmbedTemplateOperation): string => {
    if (typeof op == 'string') {
        return op;
    } else if (typeof op == 'object') {
        switch (op.op) {
            case 'random':
                if (op.options.length > 0) {
                    return executeEmbedOperation(op.options[Math.round(Math.random() * (op.options.length - 1))]);
                } else throw new Error("Random without child operations");
        }
    } else throw new Error("Invalid embed template operation");
};

export const prepareEmbed = (template: EmbedTemplate): PreparedEmbed => {
    return {
        title:       executeEmbedOperation(template.title),
        description: executeEmbedOperation(template.description)
    };
};