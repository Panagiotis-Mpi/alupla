declare module "pdfkit" {
  import { EventEmitter } from "node:events";
  import { Readable } from "node:stream";

  type TextOptions = {
    width?: number;
    align?: "left" | "center" | "right" | "justify";
  };

  type PageOptions = {
    size?: string | [number, number];
    layout?: "portrait" | "landscape";
    margin?: number;
    margins?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };

  export default class PDFDocument extends Readable {
    constructor(options?: PageOptions & { compress?: boolean });
    page: {
      width: number;
      height: number;
      margins: {
        top: number;
        bottom: number;
        left: number;
        right: number;
      };
    };
    y: number;
    on(event: "data", listener: (chunk: Buffer | Uint8Array) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    font(path: string): this;
    fontSize(size: number): this;
    text(text: string, xOrOptions?: number | TextOptions, y?: number, options?: TextOptions): this;
    moveDown(lines?: number): this;
    fillColor(color: string): this;
    lineWidth(width: number): this;
    rect(x: number, y: number, width: number, height: number): this;
    fill(color?: string): this;
    stroke(color?: string): this;
    save(): this;
    restore(): this;
    addPage(options?: PageOptions): this;
    heightOfString(text: string, options?: TextOptions): number;
    end(): void;
  }
}
