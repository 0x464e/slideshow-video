// not using @ffmpeg-installer/ffmpeg because it serves a very outdated
// version of ffmpeg with no support for the xfade filter
import ffmpeg from 'ffmpeg-static';
import ffprobe from '@ffprobe-installer/ffprobe';
import { getSlideshowName } from './util';
import { joinPaths, saveFile, toBuffer } from './filesystem';
import fluentFfmpeg from 'fluent-ffmpeg';

export class Ffmpeg {
    private readonly ffmpegCommandBuilder: FfmpegCommandBuilder;

    private readonly lastImageExtraDuration: number;

    private readonly loopImages: 'never' | 'auto';
    private readonly loopAudio: 'never' | 'auto';
    private readonly imageLoopThreshold: number | 'all';
    private readonly audioLoopThreshold: number | 'all';
    private readonly endOfInputThreshold: number | 'auto';

    private readonly useTransitions: boolean;
    private readonly loopTransition: TransitionType;
    private readonly defaultTransitionDuration: number;

    private readonly outputPath?: string;

    private ffmpegOutput = '';

    constructor(options: SlideshowOptions, tempDir: string) {
        fluentFfmpeg.setFfmpegPath(options.ffmpegOptions?.ffmpegPath ?? (ffmpeg as string));
        fluentFfmpeg.setFfprobePath(options.ffmpegOptions?.ffprobePath ?? ffprobe.path);
        this.ffmpegCommandBuilder = new FfmpegCommandBuilder(
            options.ffmpegOptions as FfmpegOptions,
            tempDir,
            options.outputOptions?.outputDir
        );

        this.lastImageExtraDuration = options.imageOptions?.lastImageExtraDuration as number;
        this.endOfInputThreshold = options.loopingOptions?.endOfInputThreshold as number | 'auto';

        this.loopImages = options.loopingOptions?.loopImages as 'never' | 'auto';
        this.loopAudio = options.loopingOptions?.loopAudio as 'never' | 'auto';
        this.imageLoopThreshold = options.loopingOptions?.imageLoopThreshold as number | 'all';
        this.audioLoopThreshold = options.loopingOptions?.audioLoopThreshold as number | 'all';

        this.useTransitions = options.transitionOptions?.useTransitions as boolean;
        this.loopTransition = options.transitionOptions?.loopTransition as TransitionType;
        this.defaultTransitionDuration = options.transitionOptions?.transitionDuration as number;

        this.outputPath = options.outputOptions?.outputDir;
    }

    private async getAudioDuration(audio: string): Promise<number> {
        return new Promise((resolve, reject) => {
            fluentFfmpeg.ffprobe(audio, (err, metadata) => {
                if (err) {
                    reject(err);
                } else {
                    resolve((metadata.format.duration as number) * 1000);
                }
            });
        });
    }

    private calculateTotalImageDuration(images: NonOptional<InputImage>[]): number {
        return images.reduce((sum, image) => sum + image.duration + image.transitionDuration, 0);
    }

    private getEndOfInputThreshold(images: NonOptional<InputImage>[]): number {
        if (this.endOfInputThreshold === 'auto') {
            return images[images.length - 1].duration;
        }

        return this.endOfInputThreshold;
    }

    private calculateImageLoopCount(
        totalImageDuration: number,
        audioDuration: number,
        endOfInputThreshold: number
    ) {
        const totalLeftoverDuration: number =
            audioDuration + endOfInputThreshold - totalImageDuration;
        const singleLoopDuration: number =
            totalImageDuration + (this.useTransitions ? this.defaultTransitionDuration : 0);
        return {
            fullLoopCount: Math.floor(totalLeftoverDuration / singleLoopDuration),
            leftoverDuration: totalLeftoverDuration % singleLoopDuration
        };
    }

    private fillRemainingAudioDuration(
        images: NonOptional<InputImage>[],
        leftoverDuration: number
    ) {
        const outputImages: NonOptional<InputImage>[] = [];
        for (const image of images) {
            if (image.duration >= leftoverDuration) {
                break;
            }

            outputImages.push(image);
            leftoverDuration -= image.duration + image.transitionDuration;
        }

        return outputImages;
    }

    private generateLoopedImages(
        images: NonOptional<InputImage>[],
        audioDuration: number,
        endOfInputThreshold: number
    ): NonOptional<InputImage>[] {
        const totalImageDuration: number = this.calculateTotalImageDuration(images);

        if (
            this.loopImages === 'never' ||
            totalImageDuration + endOfInputThreshold >= audioDuration
        ) {
            return images;
        }

        const { fullLoopCount, leftoverDuration } = this.calculateImageLoopCount(
            totalImageDuration,
            audioDuration,
            endOfInputThreshold
        );

        const partialLoopImages: NonOptional<InputImage>[] = [];

        if (this.imageLoopThreshold !== 'all' && this.imageLoopThreshold <= images.length) {
            partialLoopImages.push(...this.fillRemainingAudioDuration(images, leftoverDuration));
        }

        if (fullLoopCount === 0 && !partialLoopImages.length) {
            return images;
        }

        if (this.useTransitions) {
            images[images.length - 1].transition = this.loopTransition;
            images[images.length - 1].transitionDuration = this.defaultTransitionDuration;
        }

        const loopedImages: NonOptional<InputImage>[] = Array.from(
            { length: fullLoopCount + 1 },
            () => images
        ).flat();

        if (!partialLoopImages.length) {
            loopedImages[loopedImages.length - 1].transition = 'none';
            loopedImages[loopedImages.length - 1].transitionDuration = 0;
            return loopedImages;
        }

        partialLoopImages[partialLoopImages.length - 1].transition = 'none';
        partialLoopImages[partialLoopImages.length - 1].transitionDuration = 0;
        return loopedImages.concat(partialLoopImages);
    }

    private calculateAudioLoopCount(
        loopedImagesDuration: number,
        audioDuration: number,
        endOfInputThreshold: number
    ): number {
        if (
            this.loopAudio === 'never' ||
            audioDuration + endOfInputThreshold >= loopedImagesDuration
        ) {
            return 1;
        }

        return Math.ceil((loopedImagesDuration + endOfInputThreshold) / audioDuration);
    }

    public async runFfmpegCommand(ffmpegCommand: fluentFfmpeg.FfmpegCommand): Promise<void> {
        return new Promise((resolve, reject) => {
            ffmpegCommand
                .on('end', (stdout, stderr) => {
                    this.ffmpegOutput = stderr;
                    resolve();
                })
                .on('error', (err, stdout, stderr) => {
                    reject({ err, stdout, stderr });
                })
                .run();
        });
    }

    public async createSlideshow(images: NonOptional<InputImage>[], audio?: string): Promise<void> {
        const audioDuration: number = audio ? await this.getAudioDuration(audio) : 0;
        const endOfInputThreshold: number = this.getEndOfInputThreshold(images);
        const loopedImages: NonOptional<InputImage>[] = this.generateLoopedImages(
            images,
            audioDuration,
            endOfInputThreshold
        );

        const loopedImagesDuration: number = this.calculateTotalImageDuration(loopedImages);
        this.ffmpegCommandBuilder.setImages(loopedImages, loopedImagesDuration);

        if (audio) {
            const audioLoopCount: number = this.calculateAudioLoopCount(
                loopedImagesDuration,
                audioDuration,
                endOfInputThreshold
            );
            this.ffmpegCommandBuilder.setAudio(audio, audioLoopCount);
        }

        const ffmpegCommand = await this.ffmpegCommandBuilder.buildSlideshowCommand();
        await this.runFfmpegCommand(ffmpegCommand);
    }

    public async getSlideShowBuffer(): Promise<Buffer | Awaited<Buffer>[]> {
        return toBuffer(this.ffmpegCommandBuilder.getOutputFilePath() as string);
    }

    public getSlideshowFilePath(): string {
        return this.ffmpegCommandBuilder.getOutputFilePath() as string;
    }

    public getFfmpegOutput(): string {
        return this.ffmpegOutput;
    }

    public getFfmpegCommand(): string {
        return this.ffmpegCommandBuilder.getStringSlideshowCommand();
    }
}

class FfmpegCommandBuilder {
    private readonly ffmpegOptions: FfmpegOptions;
    private readonly tempDir: string;
    private readonly outputDir?: string;
    private readonly outputFilename: string;
    private readonly ffmpegCommand: fluentFfmpeg.FfmpegCommand;

    private images: NonOptional<InputImage>[] = [];
    private totalImageDuration = 0;
    private audio?: string;
    private audioLoopCount?: number;
    private useTransitions = true;

    constructor(ffmpegOptions: FfmpegOptions, tempDir: string, outputDir?: string) {
        this.ffmpegOptions = ffmpegOptions;
        this.tempDir = tempDir;
        this.outputDir = outputDir;
        this.outputFilename = joinPaths(
            this.outputDir ?? this.tempDir,
            `${getSlideshowName()}.${this.ffmpegOptions.container}`
        );
        this.ffmpegCommand = fluentFfmpeg({ stdoutLines: 0 });
    }

    private async generateImageInputs() {
        if (!this.useTransitions) {
            const concatString: string = this.images
                .map(
                    (x) =>
                        `file ${x.filePath}\nduration ${(x.duration / 1000).toLocaleString(
                            'en-US',
                            { minimumFractionDigits: 2 }
                        )}`
                )
                .join('\n');

            const concatFilePath: string = await saveFile(
                joinPaths(this.tempDir, 'concat'),
                concatString
            );

            this.ffmpegCommand
                .input(concatFilePath)
                .inputOptions(['-benchmark', '-loglevel verbose', '-f concat', '-safe 0']);

            return;
        }

        for (let i = 0; i < this.images.length; i++) {
            const image: NonOptional<InputImage> = this.images[i];
            const duration: number =
                image.duration +
                image.transitionDuration +
                (i !== 0 ? this.images[i - 1].transitionDuration : 0);
            this.ffmpegCommand.input(image.filePath);
            if (i == 0) {
                // stupid fluent-ffmpeg api, so this is the only place to specify these options
                this.ffmpegCommand.inputOptions(['-benchmark', '-loglevel verbose']);
            }
            this.ffmpegCommand.inputOptions(['-loop', '1', '-t', `${duration / 1000}`]);
        }
    }

    private generateAudioInput() {
        if (!this.audio) {
            return;
        }

        this.ffmpegCommand
            .input(this.audio)
            .inputOptions(['-stream_loop', `${(this.audioLoopCount as number) - 1}`]);
    }

    private generateFilters() {
        if (!this.useTransitions) {
            return;
        }

        const complexFilter: fluentFfmpeg.FilterSpecification[] = [];

        for (let i = 0; i < this.images.length; i++) {
            complexFilter.push({
                filter: 'settb',
                options: 'AVTB',
                inputs: i.toString(),
                outputs: `img${i + 1}`
            });
        }

        const firstImage: NonOptional<InputImage> = this.images[0];
        if (firstImage.transition !== 'none') {
            complexFilter.push({
                filter: 'xfade',
                options: {
                    transition: firstImage.transition,
                    duration: firstImage.transitionDuration / 1000,
                    offset: firstImage.duration / 1000
                },
                inputs: ['img1', 'img2'],
                outputs: 'filter1'
            });
        } else {
            complexFilter.push({
                filter: 'concat',
                options: {
                    n: this.images.length,
                    v: 1,
                    a: 0
                }
            });
        }

        let offset: number = firstImage.duration + firstImage.transitionDuration;
        for (let i = 2; i < this.images.length; i++) {
            const image: NonOptional<InputImage> = this.images[i - 1];
            const transition: string = image.transition;
            const transitionDuration: number = image.transitionDuration;
            offset += image.duration;

            if (transition === 'none') {
                complexFilter.push({
                    filter: 'concat',
                    options: {
                        n: 2,
                        v: 1,
                        a: 0
                    },
                    inputs: [`filter${i - 1}`, `img${i + 1}`],
                    outputs: `filter${i}`
                });
            } else {
                complexFilter.push({
                    filter: 'xfade',
                    options: {
                        transition: transition,
                        duration: transitionDuration / 1000,
                        offset: offset / 1000
                    },
                    inputs: [`filter${i - 1}`, `img${i + 1}`],
                    outputs: `filter${i}`
                });
            }
            offset += transitionDuration;
        }

        this.ffmpegCommand.complexFilter(complexFilter, 'filter' + (this.images.length - 1));
    }

    private generateOutput() {
        if (this.audio && this.useTransitions) {
            this.ffmpegCommand.outputOptions('-map', `${this.images.length}:a`);
        }

        if (this.ffmpegOptions.fps) {
            this.ffmpegCommand.fps(this.ffmpegOptions.fps);
        }

        this.ffmpegCommand.outputOptions('-pix_fmt', this.ffmpegOptions.pixelFormat as string);

        if (this.ffmpegOptions.videoCodec === 'libx264') {
            this.ffmpegCommand
                .videoCodec('libx264')
                .outputOptions('-preset', this.ffmpegOptions.x264Preset as string);
        } else {
            this.ffmpegCommand.videoCodec(this.ffmpegOptions.videoCodec as string);
        }

        if (this.ffmpegOptions.videoBitrate) {
            this.ffmpegCommand.videoBitrate(this.ffmpegOptions.videoBitrate);
        }

        if (this.ffmpegOptions.streamCopyAudio) {
            this.ffmpegCommand.audioCodec('copy');
        } else {
            if (this.ffmpegOptions.audioCodec) {
                this.ffmpegCommand.audioCodec(this.ffmpegOptions.audioCodec);
            }
            if (this.ffmpegOptions.audioBitrate) {
                this.ffmpegCommand.audioBitrate(this.ffmpegOptions.audioBitrate);
            }
        }

        this.ffmpegCommand.duration(this.totalImageDuration / 1000);
        this.ffmpegCommand.output(this.outputFilename);
    }

    public setImages(images: NonOptional<InputImage>[], totalImageDuration: number): void {
        this.images = images;
        this.totalImageDuration = totalImageDuration;
        this.useTransitions = images.some((x: NonOptional<InputImage>) => x.transition !== 'none');
    }

    public setAudio(audio: string, audioLoopCount: number): void {
        this.audio = audio;
        this.audioLoopCount = audioLoopCount;
    }

    public async buildSlideshowCommand(): Promise<fluentFfmpeg.FfmpegCommand> {
        await this.generateImageInputs();
        this.generateAudioInput();
        this.generateFilters();
        this.generateOutput();
        return this.ffmpegCommand;
    }

    public getOutputFilePath(): string | undefined {
        return this.outputFilename;
    }

    public getStringSlideshowCommand(): string {
        return this.ffmpegCommand._getArguments().join(' ');
    }
}
