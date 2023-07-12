interface SlideshowImageDimensions {
    images: Array<{
        buffer: Buffer;
        width: number;
        height: number;
    }>;
    maxWidth: number;
    maxHeight: number;
}
