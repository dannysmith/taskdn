declare module 'marked-terminal' {
  import type { MarkedExtension } from 'marked';

  export interface TerminalRendererOptions {
    code?: (code: string) => string;
    blockquote?: (quote: string) => string;
    html?: (html: string) => string;
    heading?: (text: string, level: number) => string;
    firstHeading?: (text: string, level: number) => string;
    hr?: () => string;
    list?: (body: string, ordered: boolean) => string;
    listitem?: (text: string) => string;
    checkbox?: (checked: boolean) => string;
    paragraph?: (text: string) => string;
    table?: (header: string, body: string) => string;
    tablerow?: (content: string) => string;
    tablecell?: (content: string, flags: object) => string;
    strong?: (text: string) => string;
    em?: (text: string) => string;
    codespan?: (code: string) => string;
    br?: () => string;
    del?: (text: string) => string;
    link?: (href: string, title: string, text: string) => string;
    image?: (href: string, title: string, text: string) => string;
    text?: (text: string) => string;
    unescape?: boolean;
    emoji?: boolean;
    width?: number;
    reflowText?: boolean;
    showSectionPrefix?: boolean;
    tab?: number | string;
    tableOptions?: object;
  }

  export function markedTerminal(
    options?: TerminalRendererOptions,
    highlightOptions?: object
  ): MarkedExtension;
}
