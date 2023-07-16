import imageSize from 'image-size';
import sharp from 'sharp';
import { ImageResizeDimensions, NonOptional } from './slideshow';

export const getImageDimensions = (buffers: Buffer[]): SlideshowImageDimensions => {
    const dimensions: SlideshowImageDimensions = {
        images: [],
        maxWidth: 0,
        maxHeight: 0
    };

    for (const buffer of buffers) {
        const { width, height } = imageSize(buffer);

        if (!width || !height) {
            throw new Error('Could not get image dimensions');
        }

        dimensions.images.push({
            buffer,
            width,
            height
        });

        if (width > dimensions.maxWidth) {
            dimensions.maxWidth = width;
        }

        if (height > dimensions.maxHeight) {
            dimensions.maxHeight = height;
        }
    }

    return dimensions;
};

const getResizeDimensions = (
    maxWidth: number,
    maxHeight: number,
    resizeDimensions?: ImageResizeDimensions
): NonOptional<ImageResizeDimensions> => {
    if (!resizeDimensions) {
        return {
            width: maxWidth % 2 === 0 ? maxWidth : maxWidth + 1,
            height: maxHeight % 2 === 0 ? maxHeight : maxHeight + 1
        };
    }

    if (resizeDimensions.width && resizeDimensions.height) {
        return resizeDimensions as NonOptional<ImageResizeDimensions>;
    }

    if (resizeDimensions.width) {
        const newHeight: number = Math.floor((resizeDimensions.width / maxWidth) * maxHeight);
        return {
            width: resizeDimensions.width,
            height: newHeight % 2 === 0 ? newHeight : newHeight + 1
        };
    }

    const newWidth: number = Math.floor(
        ((resizeDimensions.height as number) / maxHeight) * maxWidth
    );
    return {
        width: newWidth % 2 === 0 ? newWidth : newWidth + 1,
        height: resizeDimensions.height as number
    };
};

export const resizeImages = async (
    imageDimensions: SlideshowImageDimensions,
    resizeDimensions?: ImageResizeDimensions
): Promise<Awaited<Buffer[]>> => {
    const paddedImages: Promise<Buffer>[] = [];

    const { width: targetWidth, height: targetHeight } = getResizeDimensions(
        imageDimensions.maxWidth,
        imageDimensions.maxHeight,
        resizeDimensions
    );

    for (const image of imageDimensions.images) {
        if (image.width === targetWidth && image.height === targetHeight) {
            paddedImages.push(Promise.resolve(image.buffer));
            continue;
        }

        paddedImages.push(
            sharp(image.buffer).resize(targetWidth, targetHeight, { fit: 'contain' }).toBuffer()
        );
    }

    return Promise.all(paddedImages);
};

export interface SlideshowImageDimensions {
    images: Array<{
        buffer: Buffer;
        width: number;
        height: number;
    }>;
    maxWidth: number;
    maxHeight: number;
}
