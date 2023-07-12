interface ImageDimensions {
    /**
     * Image width in pixels.<br>
     * If unspecified, width will be calculated from height
     */
    width?: number;
    /**
     * Image height in pixels.<br>
     * If unspecified, height will be calculated from width
     */
    height?: number;
}

interface ImageOptions {
    /**
     * Base duration for images in milliseconds.<br>
     * Can be overridden by providing a specific image duration in the input images array.<br>
     * Default: 3000
     */
    imageDuration?: number;
    /**
     * ImageDimensions of the images.<br>
     * If not provided, the dimensions of the largest input image will be used
     */
    imageDimensions?: ImageDimensions;
    /**
     * Added duration for the last image in milliseconds.<br>
     * Default: `0`
     */
    lastImageExtraDuration?: number;
}

interface LoopingOptions {
    /**
     * Looping mode for images.<br>
     * `never` - no looping<br>
     * `auto` - loops images if duration and threshold conditions are met, see the documentation
     * for a detailed explanation with examples.<br>
     * Default: `never`
     */
    loopImages?: 'never' | 'auto';
    /**
     * Looping mode for audio.<br>
     * `never` - no looping<br>
     * `auto` - loops audio if duration and threshold conditions are met, see the documentation
     * for a detailed explanation with examples.<br>
     * Default: `auto`
     */
    loopAudio?: 'never' | 'auto';
    /**
     * Number of images (or `all`) that need to fit inside a second loop for a loop to be created.
     * Fitting is considered through the audio duration, the image durations (including
     * transition durations) and end of input threshold.<br>
     * See the documentation for a detailed explanation with examples.<br>
     * Default: `all`
     */
    imageLoopThreshold?: number | 'all';
    /**
     * Number of milliseconds (or `all`) that need to fit inside a second loop for a loop to be
     * created.
     * Fitting is considered through the audio duration, the image durations (including
     * transition durations) and end of input threshold.<br>
     * See the documentation for a detailed explanation with examples.<br>
     * Default: 0
     */
    audioLoopThreshold?: number | 'all';
    /**
     * Number of milliseconds to allow images or audio to go over the end of either input before
     * looping is considered.<br>
     * `auto` - the threshold is the last image's duration<br>
     * See the documentation for a detailed explanation with examples.<br>
     * Default: `auto`
     */
    endOfInputThreshold?: number | 'auto';
}

declare type TransitionType =
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

interface TransitionOptions {
    /**
     * Whether to use transitions between images.<br>
     * Default: `true`
     */
    useTransitions?: boolean;
    /**
     * Base transition type for images.<br>
     * Can be overridden by providing a specific transition type in the input images array.<br>
     * See [xfade](https://trac.ffmpeg.org/wiki/Xfade) for a demonstration of each transition.<br>
     * Default: `slideleft`
     */
    imageTransition?: TransitionType;
    /**
     * Transition type to use for when transitioning from the last image to the first image.<br>
     * See [xfade](https://trac.ffmpeg.org/wiki/Xfade) for a demonstration of each transition.<br>
     * Default: `pixelize`
     */
    loopTransition?: TransitionType;
    /**
     * Base transition duration for images in milliseconds.<br>
     * Can be overridden by providing a specific transition duration in the input images array.<br>
     * Default: 250
     */
    transitionDuration?: number;
}

declare type Container =
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

declare type x264Preset =
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

interface FfmpegOptions {
    /**
     * Path to ffmpeg binary.<br>
     * Default: Automatically provided
     */
    ffmpegPath?: string;
    /**
     * Path to ffprobe binary.<br>
     * Default: Automatically provided
     */
    ffprobePath?: string;
    /**
     * Whether to return the ffmpeg output of the slideshow creation.<br>
     * Default: `false`
     */
    showFfmpegOutput?: boolean;
    /**
     * Whether to return the ffmpeg command used to create the slideshow.<br>
     * Default: `false`
     */
    showFfmpegCommand?: boolean;
    /**
     * Container format for the resulting slideshow.<br>
     * Make sure to use a container that supports your codecs.<br>
     * Default: `mp4`
     */
    container?: Container;
    /**
     * Output framerate for the resulting slideshow.<br>
     * Default: `mp4`
     */
    fps?: number;
    /**
     * Pixel format to use for the resulting slideshow.<br>
     * Default: `yuv420p`
     */
    pixelFormat?: string;
    /**
     * Video codec to use for the resulting slideshow.<br>
     * Make sure to use a codec that is supported by your container.<br>
     * Default: `libx264`
     */
    videoCodec?: string;
    /**
     * Audio codec to use for the resulting slideshow.<br>
     * Make sure to use a codec that is supported by your container.<br>
     * Default: `auto` (let ffmpeg decide)
     */
    audioCodec?: string;
    /**
     * Video bitrate to use for the resulting slideshow.<br>
     * Specify in ffmpeg format.<br>
     * Default: `auto` (let ffmpeg decide)
     */
    videoBitrate?: string;
    /**
     * Audio bitrate to use for the resulting slideshow.<br>
     * Specify in ffmpeg format<br>
     * Default: `auto` (let ffmpeg decide)
     */
    audioBitrate?: string;
    /**
     * x264 preset to use for the resulting slideshow.<br>
     * Default: `superfast`
     */
    x264Preset?: x264Preset;
    /**
     * Whether to avoid re-encoding the audio by stream copying it.<br>
     * Make sure to use only when supported by your codec and container.<br>
     * (should be widely supported,
     * Default: `false`
     */
    streamCopyAudio?: boolean;
    /**
     * Advanced:<br>
     * Provide custom output arguments to ffmpeg which will override every other option
     * specified here.<br>
     * See the documentation for an in-depth explanation with examples.<br>
     * Default: `none`
     */
    customOutputArgs?: string;
}

interface OutputOptions {
    /**
     * Whether to return the created slideshow as a buffer.<br>
     * Default: `true`
     */
    outputBuffer?: boolean;
    /**
     * Output directory for the resulting slideshow.<br>
     * If empty, no file will be created.<br>
     * Default: `none`
     */
    outputDir?: string;
}

interface SlideshowOptions {
    imageOptions?: ImageOptions;
    loopingOptions?: LoopingOptions;
    transitionOptions?: TransitionOptions;
    ffmpegOptions?: FfmpegOptions;
    outputOptions?: OutputOptions;
}

interface InputImage {
    /**
     * Image buffer<br>
     * Either `buffer` or `filePath` must be provided
     */
    buffer?: Buffer;
    /**
     * Image file path<br>
     * Either `filePath` or `buffer` must be provided
     */
    filePath?: string;
    /**
     * Duration of this image in milliseconds.<br>
     * Overrides the `imageDuration` SlideshowOption.<br>
     */
    duration?: number;
    /**
     * Transition type to use when transitioning to the next image.<br>
     * Overrides the `imageTransition` SlideshowOption.<br>
     */
    transition?: TransitionType;
    /**
     * Transition duration after this image in milliseconds.<br>
     * Overrides the `transitionDuration` SlideshowOption.<br>
     */
    transitionDuration?: number;
}

declare type NonOptional<T> = { [K in keyof T]-?: T[K] };

interface SlideshowResponse {
    buffer: Buffer;
    filePath: string;
    ffmpegOutput: string;
    ffmpegCommand: string;
}
