declare module 'prom-client' {
  export interface LabelValues {
    [key: string]: string | number;
  }

  export class Counter<T extends string = string> {
    constructor(configuration: { name: string; help: string; labelNames?: T[] });
    inc(labels?: Record<T, string>, value?: number): void;
    labels(...values: string[]): { inc(value?: number): void };
  }

  export class Histogram<T extends string = string> {
    constructor(configuration: { name: string; help: string; labelNames?: T[]; buckets?: number[] });
    startTimer(labels?: Record<T, string>): (labels?: Record<T, string>) => void;
    observe(labels: Record<T, string>, value: number): void;
    labels(...values: string[]): { observe(value: number): void };
  }

  export function collectDefaultMetrics(): void;
  export const register: { metrics(): Promise<string> };
}

