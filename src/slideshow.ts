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
 * Brains of the operation, entrypoint to this whole package.
 *
 * Takes in images, audio, and options from which it automatically creates a slideshow video.
 *
 * If images are provided as an {@link InputImage} array, per image options can be specified.
 * Per image options override options specified in the 3rd parameter.<br>
 * For example:
 * ```ts
 * const images: InputImage[] = [
 *     {
 *         buffer: Buffer.from(myImage),
 *         duration: 5000
 *     },
 *     {
 *         filePath: 'image2.jpg',
 *         transition: 'dissolve',
 *         transitionDuration: 200
 *     },
 *     {
 *         filePath: '../../../documents/image3.png'
 *     }
 * ];
 *
 * const options: SlideshowOptions = {
 *     imageOptions: {
 *         imageDuration: 3500
 *     },
 *     transitionOptions: {
 *         transitionDuration: 500
 *     }
 * };
 *
 * const response = await createSlideshow(images, './music/audio.mp3', options);
 * ```
 *
 * The tree input images broken down:
 *
 * First image, buffer input, overrides duration
 * - Has a duration of 5000ms
 * - 500ms transition (specified in options object) to the next image
 * with the default transition (`slideleft`)
 *
 * Second image, file path input, overrides transition and transition duration
 * - Has a duration of 3500ms, specified in the options object
 * - 200 ms transition to the next image with the `dissolve` transition
 *
 * Third image, file path input, uses default options
 * - Has a duration of 3500ms, specified in the options object
 * - Will have no normal transition as it's the last image
 * - Might have a 500ms loop transition (by default `pixelize`),
 * if image and audio durations permit it
 * - See remarks section for more about durations and looping
 *
 *
 * <a name="duration-looping"></a>
 * @remarks
 * **Duration and looping**
 *
 * Possible total duration for one loop of images consist of the following:
 * - Image duration (set globally in {@link ImageOptions.imageDuration | ImageOptions.imageDuration}
 * or per image in {@link InputImage.duration | InputImage.duration})
 * - Transition duration (set globally in {@link TransitionOptions.transitionDuration | TransitionOptions.transitionDuration}
 * or per image in {@link InputImage.transitionDuration | InputImage.transitionDuration})
 * - Loop transition duration (also set in {@link TransitionOptions.transitionDuration | TransitionOptions.transitionDuration})
 * - Last image extra duration (set in {@link ImageOptions.lastImageExtraDuration | ImageOptions.lastImageExtraDuration})
 * - End of input threshold (set in {@link LoopingOptions.endOfInputThreshold | LoopingOptions.endOfInputThreshold})
 *
 * Audio duration is simply just the duration of the audio.
 *
 * **Image Looping**
 *
 * Image looping is enabled by setting {@link LoopingOptions.loopImages | LoopingOptions.loopImages} to `"auto"`.<br>
 * It is set to `"never"` by default. `"auto"` means that the images will start looping if duration
 * and threshold conditions are met.
 *
 * For example:
 *
 * |            | Image 1 | Image 2 |      Image 3      |  Audio |
 * |------------|:-------:|:-------:|:-----------------:|:------:|
 * | Duration   |  3.5 s  |  4 sec  |      3.5 sec      | 21 sec |
 * | Transition |  500 ms |  300 ms |  250 ms (if loop) |    -   |
 *
 * So we have a total image duration of 11.8 sec + 250 ms loop transition (if a loop occurs)<br>
 * And a total audio duration of 21 sec.
 *
 * We have no last image extra duration, and a default end of input threshold of 3.5 sec (last
 * image's duration).<br>
 * And {@link LoopingOptions.imageLoopThreshold | LoopingOptions.imageLoopThreshold}
 * is at its default value `"all"`.
 *
 * After the images have played once, 21 - 11.8 = 9.2 sec of audio is left.
 *
 * Our imageLoopThreshold is set to `"all"`, so all images will need to fit inside a loop for
 * a loop to occur. We only have 9.2 sec of audio left, and full loop of images will take 12.05
 * sec, so no loop will be created? No, actually a loop will be created due to our end of input
 * threshold being 3.5 sec. This means we are allowed 9.2 + 3.5 = 12.7 secs for a new loop.
 *
 * Ok, new lets say our end of input threshold is set to `2000` (1 sec) instead. Now we only have
 * 9.2 + 2 = 11.2 secs for a new loop. And a full loop of images will take 12.05 sec, so no loop
 * will be created.
 *
 * But let's also change our image loop threshold from `"all"` to `1`. This means that only one
 * image needs to fit inside a loop for a loop to occur. And our first image is 3.5 sec long,
 * so a loop will be created.<br>
 * After the first image has looped, we have 11.2 - (3.5 + 0.25) = 7.45 secs left. The second image
 * is 4 sec long, so it will also be inserted into the loop. Now we have 7.45 - (4 + 0.5) = 2.95 secs
 * left. Inserting the third image would require 3.75 secs, so it will not be inserted into the
 * second loop and the second loop, and whole slideshow, ends.
 *
 * Now lets say we have a last image extra duration of 3 sec. This means that the last image of a
 * full loop will be extended by 3 sec. And now we wouldn't again have space for the second image,
 * so the second loop would only contain one image.
 *
 * You can run this example as code from the
 * [examples](https://github.com/0x464e/slideshow-video/tree/master/examples) folder.
 *
 * ```sh
 * npx ts-node examples/duration-looping.ts
 * ```
 *
 * **Audio Looping**
 *
 * Audio looping works in a similar way to image looping, but is a bit simpler. And of course,
 * the logic is inverted in the sense that we are checking how much video duration time we have left
 * for a new loop of the audio track. The end of input threshold is also considered, just as it
 * was for image looping.
 *
 * For audio looping, {@link LoopingOptions.audioLoopThreshold | LoopingOptions.audioLoopThreshold},
 * which default to `0`, exists. It specifies the amount of milliseconds that need to fit inside a
 * loop an audio loop to occur. Alternatively it can be set to `"all"`, which means that the
 * whole audio track needs to fit into a loop for a loop to occur.
 *
 *
 * @see {@link SlideshowOptions} for more information about the options object\
 * {@link InputImage} for more information about per image options
 *
 * @param images Images to be used in the slideshow.<br>
 * Either a file path, buffer, or an {@link InputImage}
 * @param audio Audio to be used in the slideshow.<br>
 * Either a file path or buffer.<br>
 * Can be undefined, so the slideshow will have no audio
 * @param options Options object to configure the slideshow creation
 * @returns A promise that resolves to a partial {@link SlideshowResponse} object.<br>
 * Available fields in the response object depend on what was specified in {@link OutputOptions}.<br>
 * By default, only a buffer of the resulting slideshow video is returned.
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

/**
 * Width and high of every image is checked, and the largest of both are saved.\
 * This gives the target aspect ratio of the slideshow (or resolution) of the slideshow.\
 * If either a resize width or height is specified alone, the other dimension is calculated
 * via the target aspect ratio.
 */
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
     * - `auto` - loops images if duration and threshold conditions are met
     * @see [Duration and looping](https://github.com/0x464e/slideshow-video#duration-looping) for
     * a detailed explanation with examples.
     * @defaultValue `"never"`
     */
    loopImages?: 'never' | 'auto';
    /**
     * Looping mode for audio.
     * - `never` - no looping
     * - `auto` - loops audio if duration and threshold conditions are met
     * @see [Duration and looping](https://github.com/0x464e/slideshow-video#duration-looping) for
     * a detailed explanation with examples.
     * @defaultValue `"auto"`
     */
    loopAudio?: 'never' | 'auto';
    /**
     * Number of images (or `all`) that need to fit inside a loop for a loop to be created.
     * Fitting is considered through the audio duration, the image durations (including
     * transition durations) and end of input threshold.
     * @see [Duration and looping](https://github.com/0x464e/slideshow-video#duration-looping) for
     * a detailed explanation with examples.
     * @defaultValue `"all"`
     */
    imageLoopThreshold?: number | 'all';
    /**
     * Number of milliseconds (or `all`) that need to fit inside a loop for a loop to be
     * created.\
     * Fitting is considered through the audio duration, the image durations (including
     * transition durations) and end of input threshold.
     * @see [Duration and looping](https://github.com/0x464e/slideshow-video#duration-looping) for
     * a detailed explanation with examples.
     * @defaultValue `0`
     */
    audioLoopThreshold?: number | 'all';
    /**
     * Number of milliseconds to allow images or audio to go over the end of either input before
     * looping is considered.\
     * `auto` - the threshold is the last image's duration.
     * @see [Duration and looping](https://github.com/0x464e/slideshow-video#duration-looping) for
     * a detailed explanation with examples.
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
     * Can be overridden by providing a specific transition duration in the input images array.\
     * Also used for the loop transition duration.
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
     * except video and audio stream mappings and total duration. Output filename will also
     * be specified for you.\
     * Specify in format suitable for the [fluent-ffmpeg outputOptions api](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#outputoptionsoption-add-custom-output-options).
     *
     * Think of the ffmpeg command as:
     * `ffmpeg <inputs> <complexFilter> -map [filterOutput] -map audio:a -t duration <customOutputArgs> outputFilename.format`
     *
     * So you will need to specify at the very least the video codec you want to use.\
     * Also be sure to specify a compatible container via {@link FfmpegOptions.container | FFmpegOptions.container}
     *
     * @example
     * ```js
     * customOutputArgs: [
     *    '-c:v libx264',
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
     * Overrides {@link ImageOptions.imageDuration | ImageOptions.imageDuration}.
     */
    duration?: number;
    /**
     * Transition type to use when transitioning to the next image.\
     * Overrides {@link TransitionOptions.imageTransition | TransitionOptions.imageTransition}.
     */
    transition?: TransitionType;
    /**
     * Transition duration after this image in milliseconds.\
     * Overrides {@link TransitionOptions.transitionDuration | TransitionOptions.transitionDuration}.
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
     * Unspecified if {@link OutputOptions.outputBuffer | OutputOptions.outputBuffer} is `false`
     */
    buffer: Buffer;
    /**
     * The resulting slideshow video file path.\
     * Unspecified if {@link OutputOptions.outputDir | OutputOptions.outputDir} is empty
     */
    filePath: string;
    /**
     * The ffmpeg output of the slideshow creation.\
     * Unspecified if {@link FfmpegOptions.showFfmpegOutput | FfmpegOptions.showFfmpegOutput} is `false`
     */
    ffmpegOutput: string;
    /**
     * The ffmpeg command used to create the slideshow.\
     * Unspecified if {@link FfmpegOptions.showFfmpegCommand | FfmpegOptions.showFfmpegCommand} is `false`
     */
    ffmpegCommand: string;
}
