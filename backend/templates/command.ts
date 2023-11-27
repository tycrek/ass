import { TemplateCommandOp, TemplateCommandSchema } from 'ass';
import { TemplateContext } from './executor';

export type TemplateCommand<N extends string, S extends TemplateCommandSchema> = {
    readonly name:   N;
    readonly schema: S;

    exec: (op: TemplateCommandOp<N, S>, ctx: TemplateContext) => string;
};