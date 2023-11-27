import { AssFile, AssUser, TemplateCommandOp, TemplateCommandSchema, TemplateOp } from 'ass';
import { TemplateCommand } from './command';
import { TemplateError } from './error';

export class TemplateContext {
    public readonly owner: TemplateExecutor;

    public uploader: AssUser;
    public file:     AssFile; 

    constructor(owner: TemplateExecutor, uploader: AssUser, file: AssFile) {
        this.owner = owner;
        this.uploader = uploader;
        this.file = file;
    }
}

export class TemplateExecutor {
    private commands: { [index: string]: TemplateCommand<any, any> } = {};

    // register a template command globally
    public registerCommand<N extends string, S extends TemplateCommandSchema>(name: N, attrs: S, cmd: (op: TemplateCommandOp<N, S>, ctx: TemplateContext) => string) {
        if (this.commands[name] == null) {
            this.commands[name] = {
                name:   name,
                schema: attrs,
                exec:   cmd
            };
        } else throw new Error(`Template command "${name}" already exists`);
    }

    public createContext(uploader: AssUser, file: AssFile) {
        return new TemplateContext(this, uploader, file);
    }

    // expects template to be valid and does not preform runtime checks.
    // run validateTemplate first
    public executeTemplate(op: TemplateOp, ctx: TemplateContext): string {
        switch (typeof op) {
            case 'string': return op;
            case 'object': return this.commands[op.op].exec(op, ctx);
        }
    }

    public validateTemplate(op: TemplateOp, ctx: TemplateContext): void {
        if (typeof op == 'string') return;

        if (this.commands[op.op] != null) {
            let cmd = this.commands[op.op].schema as TemplateCommandSchema;

            if (cmd.named) {
                for (let name in cmd.named) {
                    let arg = cmd.named[name];
                    
                    // @ts-ignore
                    if (arg.required && op.named[name] == null) {
                        throw new TemplateError(`Required template argument "${name}" is missing.`, op.srcRange);
                    }
                }
            }

            for (let arg  of op.args)  this.validateTemplate(arg, ctx);
            for (let name in op.named) {
                if (!cmd.named || cmd.named[name] == null) {
                    let arg = (op.named as {[index:string]:TemplateOp})[name] as TemplateOp | undefined;

                    // @ts-ignore
                    throw new TemplateError(`Unknown template argument "${name}".`, {
                        file: op.srcRange.file,
                        from: (typeof arg == 'object' && arg.srcRange.from - 1 - name.length) || op.srcRange.from,
                        to:   (typeof arg == 'object' && arg.srcRange.to) || op.srcRange.to
                    });
                }

                // @ts-ignore
                this.validateTemplate(op.named[name]!, ctx);
            }
        } else throw new TemplateError(`Template command "${op.op}" does not exist.`, op.srcRange);
    }

    // creates an executor with the default commands.
    public static createExecutor(): TemplateExecutor {
        let ex = new TemplateExecutor();

        // joins two strings
        ex.registerCommand('concat', {}, (op, ctx) => {
            return op.args.reduce((a: string, b): string => a + ctx.owner.executeTemplate(b, ctx), "");
        });

        // converts a number to a file size
        ex.registerCommand('formatbytes', {
            named: { unit: {} }
        }, (op, ctx) => {
            let value = ctx.owner.executeTemplate(op.args[0], ctx);
        
            let exponent = (op.named.unit != null && { 'b': 0, 'kb': 1, 'mb': 2, 'gb': 3, 'tb': 4 }[ctx.owner.executeTemplate(op.named.unit, ctx)])
                        || Math.max(Math.min(Math.floor(Math.log10(Number(value))/3), 4), 0);
        
            return `${(Number(value) / 1000 ** exponent).toFixed(2)}${['b', 'kb', 'mb', 'gb', 'tb'][exponent]}`;
        });

        // gets the size of the active file
        ex.registerCommand('filesize', {}, (op, ctx) => {
            return ctx.file.size.toString();
        });

        // gets the uploader of the active file
        ex.registerCommand('uploader', {}, (op, ctx) => {
            return ctx.uploader.username;
        });
        
        // selects a random argument
        ex.registerCommand('random', {}, (op, ctx) => {
            if (op.args.length > 0) {
                return ctx.owner.executeTemplate(op.args[Math.round(Math.random() * (op.args.length - 1))], ctx);
            } else throw new TemplateError('Random without arguments');
        });

        return ex;
    }
}