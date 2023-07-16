import { getTempDir, saveAudio, saveSlideshowImages } from './filesystem';
import { getImageDimensions, resizeImages, SlideshowImageDimensions } from './images';
import {
    fillDefaultSlideshowOptions,
    inputImagesToBuffers,
    toInputImages,
    validateInput
} from './util';
import { Ffmpeg } from './ffmpeg';

/**
 * //TODO: document this
 * @param images
 * @param audio
 * @param options
 * @returns
 */
export const createSlideshow = async (
    images: string[] | Buffer[] | InputImage[],
    audio?: string | Buffer,
    options?: SlideshowOptions
): Promise<Partial<SlideshowResponse>> => {
    await validateInput(images, audio, options);

    options = fillDefaultSlideshowOptions(options);

    const { path: tempDir, cleanup } = await getTempDir();

    const imageBuffers: Buffer[] = await inputImagesToBuffers(images);
    const dimensions: SlideshowImageDimensions = getImageDimensions(imageBuffers);
    const paddedImages: Buffer[] = await resizeImages(
        dimensions,
        options.imageOptions?.imageResizeDimensions
    );
    const savedImages: string[] = await saveSlideshowImages(tempDir, paddedImages);
    const savedAudio: string | undefined = audio ? await saveAudio(tempDir, audio) : undefined;
    const ffmpeg = new Ffmpeg(options, tempDir);
    try {
        await ffmpeg.createSlideshow(toInputImages(savedImages, images, options), savedAudio);
    } catch (e) {
        await cleanup();
        throw e;
    }
    const response: Partial<SlideshowResponse> = {};
    if (options.outputOptions?.outputBuffer) {
        response.buffer = (await ffmpeg.getSlideShowBuffer()) as Buffer;
    }
    if (options.outputOptions?.outputDir) {
        response.filePath = ffmpeg.getSlideshowFilePath();
    }
    if (options.ffmpegOptions?.showFfmpegOutput) {
        response.ffmpegOutput = ffmpeg.getFfmpegOutput();
    }
    if (options.ffmpegOptions?.showFfmpegCommand) {
        response.ffmpegCommand = ffmpeg.getFfmpegCommand();
    }
    await cleanup();
    return response;
};

export interface ImageResizeDimensions {
    /**
     * Image width in pixels.\
     * If unspecified, width will be calculated from height.
     */
    width?: number;
    /**
     * Image height in pixels.\
     * If unspecified, height will be calculated from width.
     */
    height?: number;
}

export interface ImageOptions {
    /**
     * Base duration for images in milliseconds.\
     * Can be overridden by providing a specific image duration in the input images array.
     * @defaultValue 3000
     */
    imageDuration?: number;
    /**
     * Dimensions to which the input images will be resized.\
     * If unspecified, dimensions of the largest input image will be used
     */
    imageResizeDimensions?: ImageResizeDimensions;
    /**
     * Added duration for the last image of any loop in milliseconds.
     * @defaultValue 0
     */
    lastImageExtraDuration?: number;
}

export interface LoopingOptions {
    /**
     * Looping mode for images.
     * - `never` - no looping
     * - `auto` - loops images if duration and threshold conditions are met, see the documentation
     * for a detailed explanation with examples.
     * @defaultValue `"auto"`
     */
    loopImages?: 'never' | 'auto';
    /**
     * Looping mode for audio.
     * - `never` - no looping
     * - `auto` - loops audio if duration and threshold conditions are met, see the documentation
     * for a detailed explanation with examples.
     * @defaultValue `"auto"`
     */
    loopAudio?: 'never' | 'auto';
    /**
     * Number of images (or `all`) that need to fit inside a loop for a loop to be created.
     * Fitting is considered through the audio duration, the image durations (including
     * transition durations) and end of input threshold.\
     * See the documentation for a detailed explanation with examples.
     * @defaultValue `"all"`
     */
    imageLoopThreshold?: number | 'all';
    /**
     * Number of milliseconds (or `all`) that need to fit inside a loop for a loop to be
     * created.\
     * Fitting is considered through the audio duration, the image durations (including
     * transition durations) and end of input threshold.\
     * See the documentation for a detailed explanation with examples.
     * @defaultValue 0
     */
    audioLoopThreshold?: number | 'all';
    /**
     * Number of milliseconds to allow images or audio to go over the end of either input before
     * looping is considered.\
     * `auto` - the threshold is the last image's duration.\
     * See the documentation for a detailed explanation with examples.
     * @defaultValue `"auto"`
     */
    endOfInputThreshold?: number | 'auto';
}

/**
 * Ffmpeg xfade filter transitions.\
 * See [xfade](https://trac.ffmpeg.org/wiki/Xfade) for visual demonstrations of each transition.
 */
export declare type TransitionType =
    | 'fade'
    | 'wipeleft'
    | 'wiperight'
    | 'wipeup'
    | 'wipedown'
    | 'slideleft'
    | 'slideright'
    | 'slideup'
    | 'slidedown'
    | 'circlecrop'
    | 'rectcrop'
    | 'distance'
    | 'fadeblack'
    | 'fadewhite'
    | 'radial'
    | 'smoothleft'
    | 'smoothright'
    | 'smoothup'
    | 'smoothdown'
    | 'circleopen'
    | 'circleclose'
    | 'vertopen'
    | 'vertclose'
    | 'horzopen'
    | 'horzclose'
    | 'dissolve'
    | 'pixelize'
    | 'diagtl'
    | 'diagtr'
    | 'diagbl'
    | 'diagbr'
    | 'hlslice'
    | 'hrslice'
    | 'vuslice'
    | 'vdslice'
    | 'hblur'
    | 'fadegrays'
    | 'wipetl'
    | 'wipetr'
    | 'wipebl'
    | 'wipebr'
    | 'squeezeh'
    | 'squeezev'
    | 'zoomin'
    | 'fadefast'
    | 'fadeslow'
    | 'hlwind'
    | 'hrwind'
    | 'vuwind'
    | 'vdwind'
    | 'none';

export interface TransitionOptions {
    /**
     * Whether to use transitions between images.\
     * Note: increases memory and CPU usage drastically.
     * @defaultValue `true`
     */
    useTransitions?: boolean;
    /**
     * Base transition type for images.\
     * Can be overridden by providing a specific transition type in the input images array.\
     * See [xfade](https://trac.ffmpeg.org/wiki/Xfade) for a demonstration of each transition.
     * @defaultValue `slideleft`
     */
    imageTransition?: TransitionType;
    /**
     * Transition type to use for when transitioning from the last image to the first image.\
     * See [xfade](https://trac.ffmpeg.org/wiki/Xfade) for a demonstration of each transition.
     * @defaultValue `pixelize`
     */
    loopTransition?: TransitionType;
    /**
     * Base transition duration for images in milliseconds.\
     * Can be overridden by providing a specific transition duration in the input images array.
     * @defaultValue 250
     */
    transitionDuration?: number;
}

export declare type Container =
    | 'mkv'
    | 'mka'
    | 'mp4'
    | 'flv'
    | 'f4v'
    | '3gp'
    | '3g2'
    | 'mpg'
    | 'ts'
    | 'm2ts'
    | 'webm'
    | 'ogg';

/**
 * The faster the preset, the lower the encoding time and CPU/Memory usage,
 * but also the lower the quality and higher the file size.\
 * Although the quality difference might not be very significant.
 * @see https://trac.ffmpeg.org/wiki/Encode/H.264#Preset
 */
export declare type x264Preset =
    | 'ultrafast'
    | 'superfast'
    | 'veryfast'
    | 'faster'
    | 'fast'
    | 'medium'
    | 'slow'
    | 'slower'
    | 'veryslow'
    | 'placebo';

/**
 * Options that influence the ffmpeg command used to create the slideshow.
 */
export interface FfmpegOptions {
    /**
     * Path to ffmpeg binary.
     * @defaultValue Automatically provided
     */
    ffmpegPath?: string;
    /**
     * Path to ffprobe binary.
     * @defaultValue Automatically provided
     */
    ffprobePath?: string;
    /**
     * Whether to return the ffmpeg output of the slideshow creation.
     * @defaultValue `false`
     */
    showFfmpegOutput?: boolean;
    /**
     * Whether to return the ffmpeg command used to create the slideshow.
     * @defaultValue `false`
     */
    showFfmpegCommand?: boolean;
    /**
     * Container format for the resulting slideshow.\
     * Make sure to use a container that supports your codecs.
     * @defaultValue `mp4`
     */
    container?: Container;
    /**
     * Output framerate for the resulting slideshow.
     * @defaultValue Let ffmpeg decide
     */
    fps?: number;
    /**
     * Pixel format to use for the resulting slideshow.
     * @defaultValue `yuv420p`
     */
    pixelFormat?: string;
    /**
     * Video codec to use for the resulting slideshow.\
     * Make sure to use a codec that is supported by your container.
     * @defaultValue `libx264`
     */
    videoCodec?: string;
    /**
     * Audio codec to use for the resulting slideshow.\
     * Make sure to use a codec that is supported by your container.
     * @defaultValue Let ffmpeg decide
     */
    audioCodec?: string;
    /**
     * Video bitrate to use for the resulting slideshow.\
     * Specify in ffmpeg format.
     * @example `'10M'`, `'5000k'`
     * @defaultValue Let ffmpeg decide
     */
    videoBitrate?: string;
    /**
     * Audio bitrate to use for the resulting slideshow.\
     * Specify in ffmpeg format
     * @example `'128k'`, `'320k'`
     * @defaultValue Let ffmpeg decide
     */
    audioBitrate?: string;
    /**
     * x264 preset to use for the resulting slideshow.\
     * @defaultValue Let ffmpeg decide (should be `medium`)
     */
    x264Preset?: x264Preset;
    /**
     * Whether to avoid re-encoding the audio by stream copying it.\
     * Make sure to use only when supported by your codec and container.\
     * If you're unsure, I'd recommend you give it a try give it a try, you save on memory usage
     * and encoding time if you can stream copy the audio.\
     * Ffmpeg will fail if it's not supported.
     * @defaultValue `false`
     */
    streamCopyAudio?: boolean;
    /**
     * Advanced:\
     * Provide custom output arguments to ffmpeg which will override all default options,
     * except video and audio stream mappings and total duration.\
     * Specify in format suitable for the [fluent-ffmpeg outputOptions api](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#outputoptionsoption-add-custom-output-options).\
     * See the documentation for an in-depth explanation with examples.
     * @example
     * ```js
     * customOutputArgs: [
     *    '-crf 20',
     *    '-preset veryfast',
     *    '-profile:v baseline',
     *    '-level 3.0',
     *    '-pix_fmt yuv420p'
     *    '-movflags +faststart'
     * ]
     * ```
     * @defaultValue none
     */
    customOutputArgs?: string[];
}

export interface OutputOptions {
    /**
     * Whether to return the created slideshow as a buffer.
     * @defaultValue `true`
     */
    outputBuffer?: boolean;
    /**
     * Output directory for the resulting slideshow.\
     * If empty, no file will be created.
     * @defaultValue `undefined`
     */
    outputDir?: string;
}

/**
 * Options that influence the creation of the slideshow.
 */
export interface SlideshowOptions {
    imageOptions?: ImageOptions;
    loopingOptions?: LoopingOptions;
    transitionOptions?: TransitionOptions;
    ffmpegOptions?: FfmpegOptions;
    outputOptions?: OutputOptions;
}

/**
 * Slideshow options for a single image.\
 * These options override options from {@link SlideshowOptions}.
 */
export interface InputImage {
    /**
     * Image buffer\
     * Either `buffer` or `filePath` must be provided
     */
    buffer?: Buffer;
    /**
     * Image file path\
     * Either `filePath` or `buffer` must be provided
     */
    filePath?: string;
    /**
     * Duration of this image in milliseconds.\
     * Overrides {@link ImageOptions.imageDuration}.
     */
    duration?: number;
    /**
     * Transition type to use when transitioning to the next image.\
     * Overrides {@link TransitionOptions.imageTransition}.
     */
    transition?: TransitionType;
    /**
     * Transition duration after this image in milliseconds.\
     * Overrides {@link TransitionOptions.transitionDuration}.
     */
    transitionDuration?: number;
}

/**
 * Utility type to make all properties of T non-optional
 */
export type NonOptional<T> = { [K in keyof T]-?: T[K] };

export interface SlideshowResponse {
    /**
     * The resulting slideshow video as a buffer.\
     * Unspecified if {@link OutputOptions.outputBuffer} is `false`
     */
    buffer: Buffer;
    /**
     * The resulting slideshow video file path.\
     * Unspecified if {@link OutputOptions.outputDir} is empty
     */
    filePath: string;
    /**
     * The ffmpeg output of the slideshow creation.\
     * Unspecified if {@link FfmpegOptions.showFfmpegOutput} is `false`
     */
    ffmpegOutput: string;
    /**
     * The ffmpeg command used to create the slideshow.\
     * Unspecified if {@link FfmpegOptions.showFfmpegCommand} is `false`
     */
    ffmpegCommand: string;
}
