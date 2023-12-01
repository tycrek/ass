import { TemplateOp, TemplateSource } from 'ass';

import fs from 'fs';

import { TemplateSyntaxError } from './error.js';

enum TokenType {
    T_OPEN, T_CLOSE,
    PIPE, EQUALS,
    TEXT,
};

type TemplateToken = {
    type : TokenType;
    data?: string;
    from:  number;
    to:    number;
};

// tree used by findReplacement to select the best amp-substitution
type TemplateAmpNode = { [index: string]: TemplateAmpNode | string | undefined; }
const TEMPLATE_AMP_SUBSTITUTIONS: TemplateAmpNode = {
    e: { q: { $: '=' } },
    p: { i: { p: { e: { $: '|' } } } },
    t: {
        c: { l: { o: { s: { e: { $: '}}' } } } } },
        o: { p: { e: { n: { $: '{{' } } } }
    }
};

function getTemplateTokens(src: string): TemplateToken[] {
    let tokens: TemplateToken[] = [];
    let buf   : string          = '';
    let pos   : number          = 0; 
    
    // digs through TEMPLATE_AMP_SUBSTITUTIONS to find
    // longest possible string to replace
    function findReplacement() {
        let raw  = "";
        let bestpos: number | null = null;
        let best:    string | null = null;
        let node = TEMPLATE_AMP_SUBSTITUTIONS;

        while (true) {
            if (pos >= src.length) break;
            if (!/[a-z]/.test(src[pos])) break;

            if (node[src[pos]] != null) { // enter the thing
                node = node[src[pos]] as TemplateAmpNode;
            } else {
                break;
            }

            if (node.$ != null) {
                best    = node.$ as string;
                bestpos = pos;
            }

            raw += src[pos++];
        }

        if (best != null) {
            pos = bestpos! + 1;
            return best;
        }

        return `&${raw}`;
    }

    for (; pos < src.length; pos++) {
        let lp = pos;

        if (pos + 1 < src.length && src[pos] == '{' && src[pos + 1] == '{') {
            tokens.push({ 
                type: TokenType.T_OPEN,
                from: pos,
                to: pos + 1
            });
            pos++;
        } else if (pos + 1 < src.length && src[pos] == '}' && src[pos + 1] == '}') {
            tokens.push({
                type: TokenType.T_CLOSE,
                from: pos,
                to: pos + 1
            });
            pos++;
        } else if (src[pos] == '|') {
            tokens.push({
                type: TokenType.PIPE,
                from: pos,
                to: pos
            });
        } else if (src[pos] == '=') {
            tokens.push({
                type: TokenType.EQUALS,
                from: pos,
                to: pos
            });
        } else if (src[pos] == '&') {
            pos++;
            buf += findReplacement();
            pos--; continue;
        } else if (src[pos] == '\n') {
            pos++;
            for (; pos < src.length && (src[pos] == ' ' || src[pos] == '\t'); pos++);
            pos--; continue;
        } else {
            buf += src[pos];
            continue;
        }

        if (buf.length) {
            tokens.splice(-1, 0, {
                type: TokenType.TEXT,
                data: buf,
                from: lp - buf.length,
                to: lp - 1
            });
            buf = '';
        }
    }

    if (buf.length) tokens.push({
        type: TokenType.TEXT,
        data: buf,
        from: src.length - buf.length,
        to: src.length
    });

    return tokens;
}

export type PrepareTemplateOptions = {
    allowIncludeFile?: boolean;
};

export function prepareTemplate(src: string, config?: PrepareTemplateOptions): TemplateOp {
    let options = {
        includeFiles: config?.allowIncludeFile ?? false
    };

    type ParserStackEntry = {
        pos: number
    };

    let tokens = getTemplateTokens(src);
    let pos    = 0;

    let stack: ParserStackEntry[] = [];

    function stackPush() {
        stack.push({ pos: pos });
    }

    function stackDrop() {
        stack.pop();
    }

    let file: TemplateSource = { code: src }; 

    // parse the text part of stuff. like uh
    // you know uh like uh this part
    // V---V         V V-V V
    // Hello {Concat|W|ORL|D}
    function parseConcat(root: boolean = false): TemplateOp {
        let joined: TemplateOp[] = [];
        
        let start = pos;

        stackPush();

        out: while (pos < tokens.length) {
            switch (tokens[pos].type) {
                case TokenType.TEXT:
                    joined.push(tokens[pos++].data!);
                    continue out;
                case TokenType.EQUALS:
                    if (root == true) throw new TemplateSyntaxError('Unexpected equals', { file: file, from: tokens[pos].from, to: tokens[pos].to });
                case TokenType.PIPE:
                    if (root == true) throw new TemplateSyntaxError('Unexpected pipe', { file: file, from: tokens[pos].from, to: tokens[pos].to });
                case TokenType.T_CLOSE:
                    if (root == true) throw new TemplateSyntaxError('Unexpected closing tag', { file: file, from: tokens[pos].from, to: tokens[pos].to });
                    break out;
                case TokenType.T_OPEN:
                    joined.push(parseTemplate());
            }
        }

        stackDrop();

        return joined.length == 1 ? joined[0] : { 
            op: "concat",
            named: {},
            args: joined,
            srcRange: {
                file: file,
                from: tokens[start]?.from ?? 0,
                to:   tokens[pos - 1]?.to ?? src.length - 1
            }
        };
    }

    // parse templates
    function parseTemplate(): TemplateOp {
        let name:  string;
        let args:  TemplateOp[] = [];
        let nargs: {[index: string]: TemplateOp} = {};
        let start = pos;

        stackPush();

        if (pos < tokens.length && tokens[pos].type == TokenType.T_OPEN) {
            pos++;
        } else throw new Error('Catastrophic failure');

        if (pos < tokens.length && tokens[pos].type == TokenType.TEXT) {
            name = tokens[pos++].data!;
        } else if (pos < tokens.length) {
            if (tokens[pos].type == TokenType.T_CLOSE) {
                throw new TemplateSyntaxError('Template name missing', { file: file, from: tokens[pos - 1].from, to: tokens[pos].to });
            } else throw new TemplateSyntaxError('Expected template name', { file: file, from: tokens[pos].from, to: tokens[pos].to });
        } else throw new TemplateSyntaxError('Unexpected end of file');

        if (pos < tokens.length && tokens[pos].type == TokenType.PIPE) {
            pos++;

            out: while (pos < tokens.length) {
                let argStart = pos;

                let arg = parseConcat();

                // this is some really nasty control flow im so sorry
                if (pos < tokens.length) {
                    switch (tokens[pos].type) {
                        case TokenType.EQUALS: // named arguments
                            if (typeof arg != 'string') {
                                throw new TemplateSyntaxError('Argument name must be a plain string', { file: file, from: tokens[argStart].from, to: tokens[pos - 1].to });
                            }

                            pos++;
                            if (pos < tokens.length) {
                                let arg2 = parseConcat();
                                nargs[arg] = arg2;
                                if (pos < tokens.length) {
                                    switch (tokens[pos].type) {
                                        case TokenType.T_CLOSE: break out;
                                        case TokenType.PIPE:    pos++;
                                    }
                                } else throw new TemplateSyntaxError('syntax error');
                            } else throw new TemplateSyntaxError('syntax error');
                            break;
                        case TokenType.T_CLOSE:
                            args.push(arg);
                            break out;
                        case TokenType.PIPE:
                            args.push(arg);
                            pos++;
                    }
                }
            }
        } else if (pos < tokens.length && tokens[pos].type != TokenType.T_CLOSE) {
            throw new TemplateSyntaxError('Expected arguments or closing tag', { file: file, from: tokens[pos].from, to: tokens[pos].to });
        }

        if (pos < tokens.length && tokens[pos].type == TokenType.T_CLOSE) {
            pos++;
        } else throw new TemplateSyntaxError('Template closing tag missing');

        stackDrop();

        // include is executed early
        if (name.toLowerCase() == 'include') {
            if (nargs['file'] != null) {
                // security check!
                if (!options.includeFiles) {
                    throw new TemplateSyntaxError('You are not allowed to include files', { file: file, from: tokens[start].from, to: tokens[pos - 1].to });
                }

                if (typeof nargs['file'] == 'string') {
                    if (fs.existsSync(nargs['file'])) {
                        let template = fs.readFileSync(nargs['file'], { encoding: 'utf-8' });

                        let tl = prepareTemplate(template, config);
                        
                        return tl;
                    } else throw new TemplateSyntaxError('File does not exist', { file: file, from: tokens[start].from, to: tokens[pos - 1].to});
                } else throw new TemplateSyntaxError('Include directive can not contain templates', { file: file, from: tokens[start].from, to: tokens[pos - 1].to});
            } else throw new TemplateSyntaxError(`Bad include directive`, { file: file, from: tokens[start].from, to: tokens[pos - 1].to});
        }

        return {
            op: name.toLocaleLowerCase(),
            named: nargs,
            args: args,
            srcRange: {
                file: file,
                from: tokens[start]?.from ?? 0,
                to:   tokens[pos - 1]?.to ?? src.length - 1
            }
        };
    }

    let result = parseConcat(true);
    return result;
}