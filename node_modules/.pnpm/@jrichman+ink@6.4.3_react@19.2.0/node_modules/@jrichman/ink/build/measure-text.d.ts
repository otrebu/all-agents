import { type StyledChar } from '@alcalzone/ansi-tokenize';
export type StringWidth = (text: string) => number;
export declare function setStringWidthFunction(fn: StringWidth): void;
export declare function clearStringWidthCache(): void;
export declare function toStyledCharacters(text: string): StyledChar[];
export declare function styledCharsWidth(styledChars: StyledChar[]): number;
export declare function inkCharacterWidth(text: string): number;
export declare function splitStyledCharsByNewline(styledChars: StyledChar[]): StyledChar[][];
export declare function widestLineFromStyledChars(lines: StyledChar[][]): number;
export declare function styledCharsToString(styledChars: StyledChar[]): string;
export declare function measureStyledChars(styledChars: StyledChar[]): {
    width: number;
    height: number;
};
