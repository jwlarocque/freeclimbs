export type Hold = {
    id: string;
    left: number;
    top: number;
    right: number;
    bottom: number;
    confidence?: number;
    confirmed?: boolean;
    mask?: any;
}