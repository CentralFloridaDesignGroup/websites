export function FormatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat("en-US", options).format(value);
}

export function DistanceFromCoordinates(startX: number, startY: number, endX: number, endY: number): number {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}