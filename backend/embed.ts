import { AssFile, AssUser, EmbedTemplate, PreparedEmbed } from "ass"
import { TemplateExecutor } from "./templates/executor";

let executor = TemplateExecutor.createExecutor(); 

export const DEFAULT_EMBED: EmbedTemplate = {
    sitename:    "ass",
    title:       "",
    description: ""
};

// ensures a template is valid
export const validateEmbed = (template: EmbedTemplate) => {
    // lets hope this works
    let context = executor.createContext(null!, null!);

    executor.validateTemplate(template.title,       context);
    executor.validateTemplate(template.description, context);
    executor.validateTemplate(template.sitename,    context);
}

// cooks up the embed
export const prepareEmbed = (template: EmbedTemplate, user: AssUser, file: AssFile): PreparedEmbed => {
    let context = executor.createContext(user, file);

    return {
        title:       executor.executeTemplate(template.title,       context),
        description: executor.executeTemplate(template.description, context),
        sitename:    executor.executeTemplate(template.sitename,    context)
    };
};