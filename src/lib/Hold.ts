export type Hold = {
    id: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
    confidence?: number;
    confirmed?: boolean;
    contours?: any;
}