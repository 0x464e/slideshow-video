import { directoryExists, fileExists, toBuffer, writePermissions } from './filesystem';
import { defaults } from 'options-defaults';
import split from 'split-string';
import { InputImage, NonOptional, SlideshowOptions, TransitionType } from './slideshow';

export const validateInput = async (
    images: string[] | Buffer[] | InputImage[],
    audio?: string | Buffer,
    options?: SlideshowOptions
) => {
    if (!images.length) {
        throw new Error('No images provided');
    }

    const checkFileExists = async (paths: string[]) => {
        for (const path of paths) {
            if (!(await fileExists(path))) {
                throw new Error(`File not found: ${path}`);
            }
        }
    };

    // if input was string[]
    if (typeof images[0] === 'string') {
        await checkFileExists(images as string[]);
    } else if (!Buffer.isBuffer((images as Buffer[])[0])) {
        // if input was InputImage[]
        const lastImgTransition = (images as InputImage[]).at(-1)?.transition;
        const lastImgTransitionDuration = (images as InputImage[]).at(-1)?.transitionDuration;
        if (
            (lastImgTransition && lastImgTransition !== 'none') ||
            (lastImgTransitionDuration && lastImgTransitionDuration !== 0)
        ) {
            throw new Error(
                'Last image cannot have a transition as there might be nothing to transition' +
                    ' to.\nIf you meant to set transition options for looping, use the' +
                    ' transitionOptions property in options.'
            );
        }

        for (const image of images as InputImage[]) {
            if (!image.buffer && !image.filePath) {
                throw new Error('No image buffer or file path provided for an image');
            }
        }

        await checkFileExists((images as InputImage[]).map((x) => x.filePath as string));
    }

    if (audio && typeof audio === 'string' && !(await fileExists(audio as string))) {
        throw new Error(`Audio file not found: ${audio}`);
    }

    if (options?.outputOptions?.outputDir) {
        if (!(await directoryExists(options.outputOptions.outputDir))) {
            throw new Error(`Output directory not found:  }${options.outputOptions.outputDir}`);
        }
        if (!(await writePermissions(options.outputOptions.outputDir))) {
            throw new Error(
                `No write permissions for output directory: ${options.outputOptions.outputDir}`
            );
        }
    }

    // image dimensions have to be divisible by two
    if (options?.imageOptions?.imageResizeDimensions) {
        const width: number | undefined = options.imageOptions.imageResizeDimensions.width;
        const height: number | undefined = options.imageOptions.imageResizeDimensions.height;
        if (width && width % 2 !== 0) {
            throw new Error(`Image width must be divisible by two: ${width}`);
        }
        if (height && height % 2 !== 0) {
            throw new Error(`Image height must be divisible by two: ${height}`);
        }
    }
};

export const inputImagesToBuffers = async (
    images: string[] | Buffer[] | InputImage[]
): Promise<Buffer[]> => {
    if (!images.length) {
        throw new Error('No images provided');
    }

    let imageBuffers: Buffer[];
    if (typeof images[0] === 'string') {
        imageBuffers = (await toBuffer(images as string[])) as Buffer[];
    } else if (images[0] instanceof Buffer) {
        imageBuffers = images as Buffer[];
    } else if ((images as InputImage[]).some((x) => !x.buffer && !x.filePath)) {
        throw new Error('No image buffer or file path provided for an image');
    } else {
        imageBuffers = await Promise.all(
            (images as InputImage[]).map(async (x) =>
                x.buffer
                    ? Promise.resolve(x.buffer)
                    : ((await toBuffer(x.filePath as string)) as Buffer)
            )
        );
    }

    return imageBuffers;
};

export const fillDefaultSlideshowOptions = (
    options: SlideshowOptions | undefined
): SlideshowOptions =>
    defaults(
        {
            imageOptions: {
                imageDuration: 3000,
                lastImageExtraDuration: 0
            },
            loopingOptions: {
                loopImages: 'never',
                loopAudio: 'auto',
                imageLoopThreshold: 'all',
                audioLoopThreshold: 0,
                endOfInputThreshold: 'auto'
            },
            transitionOptions: {
                useTransitions: true,
                imageTransition: 'slideleft',
                loopTransition: 'pixelize',
                transitionDuration: 250
            },
            ffmpegOptions: {
                showFfmpegOutput: false,
                showFfmpegCommand: false,
                container: 'mp4',
                pixelFormat: 'yuv420p',
                videoCodec: 'libx264',
                streamCopyAudio: false
            },
            outputOptions: {
                outputBuffer: true
            }
        },
        options
    );

export const toInputImages = (
    savedImages: string[],
    inputImages: string[] | Buffer[] | InputImage[],
    options: SlideshowOptions
): NonOptional<InputImage>[] => {
    const base = {
        buffer: Buffer.from(''),
        duration: options.imageOptions?.imageDuration as number,
        transition: options.transitionOptions?.imageTransition as TransitionType,
        transitionDuration: options.transitionOptions?.transitionDuration as number
    };

    const override = {
        transition: 'none' as TransitionType,
        transitionDuration: 0
    };

    let output: NonOptional<InputImage>[];

    if (inputImages[0] instanceof Object) {
        output = (inputImages as InputImage[]).map((x, i) => ({
            ...base,
            ...x,
            filePath: savedImages[i]
        }));
    } else {
        output = savedImages.map((x) => ({
            ...base,
            filePath: x
        }));
    }

    output[output.length - 1].transition = 'none';
    output[output.length - 1].transitionDuration = 0;

    if (!options.transitionOptions?.useTransitions) {
        output = output.map((x) => ({ ...x, ...override }));
    }

    const extraDuration: number = options.imageOptions?.lastImageExtraDuration as number;
    if (extraDuration > 0) {
        output[output.length - 1].duration += extraDuration;
    }

    return output;
};

export const splitString = (str: string, keepQuotes = true): string[] =>
    split(str, {
        separator: ' ',
        quotes: ['"', "'"],
        keep: keepQuotes
            ? undefined
            : (value, state) => value !== '\\' && (value !== '"' || state.prev() === '\\')
    });

export const getSlideshowName = (): string => `slideshow-video-${Date.now()}`;
