// not using @ffmpeg-installer/ffmpeg because it serves a very outdated
// version of ffmpeg with no support for the xfade filter
import ffmpeg from 'ffmpeg-static';
import ffprobe from '@ffprobe-installer/ffprobe';
import { getSlideshowName, splitString } from './util';
import { execFileAsync, getWorkingDirectory, joinPaths, toBuffer } from './filesystem';

export class Ffmpeg {
    private readonly ffmpegPath: string;
    private readonly ffprobePath: string;
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
        this.ffmpegPath = options.ffmpegOptions?.ffmpegPath ?? (ffmpeg as string);
        this.ffprobePath = options.ffmpegOptions?.ffprobePath ?? ffprobe.path;
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
        const audioDurationCommand: string[] = FfmpegCommandBuilder.getAudioDurationCommand(audio);
        const { stdout: audioDuration } = await execFileAsync(
            this.ffprobePath,
            audioDurationCommand
        );

        return Math.ceil(parseFloat(audioDuration) * 1000);
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
        const dividend: number = audioDuration + endOfInputThreshold - totalImageDuration;
        const divisor: number = totalImageDuration + this.defaultTransitionDuration;
        return {
            //TODO: verify if ceil needed
            fullLoopCount: Math.floor(dividend / divisor),
            leftoverDuration: dividend % divisor
        };
    }

    private fillRemainingAudioDuration(
        images: NonOptional<InputImage>[],
        leftoverDuration: number
    ) {
        const outputImages: NonOptional<InputImage>[] = [];
        for (const image of images) {
            outputImages.push(image);

            if (image.duration >= leftoverDuration) {
                break;
            }

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

        const imageLoopThresholdDuration =
            this.imageLoopThreshold === 'all' || this.imageLoopThreshold >= images.length
                ? totalImageDuration
                : this.calculateTotalImageDuration(images.slice(0, this.imageLoopThreshold));

        if (fullLoopCount === 0 && leftoverDuration < imageLoopThresholdDuration) {
            return images;
        }

        const partialLoopImages: NonOptional<InputImage>[] = this.fillRemainingAudioDuration(
            images,
            leftoverDuration + endOfInputThreshold
        );

        images[images.length - 1].transition = this.loopTransition;
        images[images.length - 1].transitionDuration = this.defaultTransitionDuration;

        const loopedImages: NonOptional<InputImage>[] = Array.from(
            { length: fullLoopCount },
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

    public async runFfmpegCommand(ffmpegCommand: string[]): Promise<void> {
        const promise = execFileAsync(this.ffmpegPath, ffmpegCommand, {
            cwd: getWorkingDirectory()
        });
        const { stderr } = await promise;
        this.ffmpegOutput = stderr;

        if (promise.child.exitCode) {
            throw new Error(stderr);
        }
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

        const ffmpegCommand: string[] = this.ffmpegCommandBuilder.buildSlideshowCommand();
        const asd = this.ffmpegCommandBuilder.getStringSlideshowCommand();
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
    private readonly outputFilename?: string;

    private images: NonOptional<InputImage>[] = [];
    private totalImageDuration = 0;
    private audio?: string;
    private audioLoopCount?: number;
    private ffmpegCommand: string[][] = [];

    constructor(ffmpegOptions: FfmpegOptions, tempDir: string, outputDir?: string) {
        this.ffmpegOptions = ffmpegOptions;
        this.tempDir = tempDir;
        this.outputDir = outputDir;
        if (outputDir) {
            this.outputFilename = joinPaths(
                this.outputDir ?? this.tempDir,
                `${getSlideshowName()}.${this.ffmpegOptions.container}`
            );
        }
    }

    static getAudioDurationCommand(audio: string): string[] {
        return [
            '-v',
            'error',
            '-show_entries',
            'format=duration',
            '-of',
            'default=noprint_wrappers=1:nokey=1',
            audio
        ];

        return splitString(
            `-v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audio}"`,
            false
        );
    }

    private appendCommand(command: string, keepQuotes = true): void {
        this.ffmpegCommand.push(splitString(command, keepQuotes));
    }

    private generateImageInputs() {
        for (let i = 0; i < this.images.length; i++) {
            const image: NonOptional<InputImage> = this.images[i];
            const duration: number =
                image.duration +
                image.transitionDuration +
                (i !== 0 ? this.images[i - 1].transitionDuration : 0);
            this.appendCommand(`-loop 1 -t ${duration / 1000} -i "${image.filePath}"`, false);
        }
    }

    private generateAudioInput() {
        if (!this.audio) {
            return;
        }

        this.appendCommand(
            `-stream_loop ${(this.audioLoopCount as number) - 1} -i "${this.audio}"`,
            false
        );
    }

    private generateFilters() {
        this.appendCommand('-filter_complex');

        let command = '"';
        for (let i = 0; i < this.images.length; i++) {
            command += `[${i}]settb=AVTB[img${i + 1}];`;
        }

        const firstImage: NonOptional<InputImage> = this.images[0];
        command += '[img1][img2]';
        if (firstImage.transition !== 'none') {
            command += `xfade=transition=${firstImage.transition}:duration=${
                firstImage.transitionDuration / 1000
            }:offset=${firstImage.duration / 1000}`;
        } else {
            command += 'concat=n=2:v=1:a=0';
        }
        command += '[filter1]';

        let offset: number = firstImage.duration + firstImage.transitionDuration;
        for (let i = 2; i < this.images.length; i++) {
            const image: NonOptional<InputImage> = this.images[i - 1];
            const transition: string = image.transition;
            const transitionDuration: number = image.transitionDuration;
            offset += image.duration;

            command += `;[filter${i - 1}][img${i + 1}]`;
            if (transition === 'none') {
                command += 'concat=n=2:v=1:a=0';
            } else {
                command += `xfade=transition=${transition}:duration=${
                    transitionDuration / 1000
                }:offset=${offset / 1000}`;
            }
            command += `[filter${i}]`;

            offset += transitionDuration;
        }

        this.appendCommand(command, false);
    }

    private generateOutput() {
        this.appendCommand(
            `-map [filter${this.images.length - 1}]${
                this.audio ? ` -map ${this.images.length}:a` : ''
            }`
        );

        let command = '';
        if (this.ffmpegOptions.customOutputArgs) {
            this.appendCommand(this.ffmpegOptions.customOutputArgs);
        } else {
            if (this.ffmpegOptions.fps) {
                command += `-r ${this.ffmpegOptions.fps} `;
            }

            command += `-pix_fmt ${this.ffmpegOptions.pixelFormat} `;

            if (this.ffmpegOptions.videoCodec === 'libx264') {
                command += `-vcodec libx264 -preset ${this.ffmpegOptions.x264Preset} `;
            } else {
                command += `-vcodec ${this.ffmpegOptions.videoCodec} `;
            }

            if (this.ffmpegOptions.videoBitrate) {
                command += `-b:v ${this.ffmpegOptions.videoBitrate} `;
            }

            this.appendCommand(command.trim());
            command = '';

            if (this.ffmpegOptions.streamCopyAudio) {
                command += '-c:a copy ';
            } else {
                if (this.ffmpegOptions.audioCodec) {
                    command += `-c:a ${this.ffmpegOptions.audioCodec} `;
                }
                if (this.ffmpegOptions.audioBitrate) {
                    command += `-b:a ${this.ffmpegOptions.audioBitrate} `;
                }
            }
            if (command) {
                this.appendCommand(command.trim());
            }
        }

        this.appendCommand(`-t ${this.totalImageDuration / 1000}`);

        this.appendCommand(
            `"${joinPaths(
                this.outputDir ?? this.tempDir,
                `${getSlideshowName()}.${this.ffmpegOptions.container}`
            )}" -y`,
            false
        );
    }

    public setImages(images: NonOptional<InputImage>[], totalImageDuration: number): void {
        this.images = images;
        this.totalImageDuration = totalImageDuration;
    }

    public setAudio(audio: string, audioLoopCount: number): void {
        this.audio = audio;
        this.audioLoopCount = audioLoopCount;
    }

    public buildSlideshowCommand(): string[] {
        this.ffmpegCommand = [['-benchmark', '-loglevel', 'verbose']];
        this.generateImageInputs();
        this.generateAudioInput();
        this.generateFilters();
        this.generateOutput();
        return this.ffmpegCommand.flat();
    }

    public getOutputFilePath(): string | undefined {
        return this.outputFilename;
    }

    public getStringSlideshowCommand(): string {
        let command = 'ffmpeg -loglevel verbose \\\n';
        const filterCommandIndex: number =
            this.ffmpegCommand.findIndex((x) => x.includes('-filter_complex')) + 1;

        for (let i = 1; i < this.ffmpegCommand.length; i++) {
            if (i === filterCommandIndex) {
                command += '"';
                const filterCommand: string = this.ffmpegCommand[i][0];
                const filters = filterCommand.split(';').map((x) => x + ';');
                command += filters
                    .slice(0, -1)
                    .map((x) => x + ' \\\n')
                    .join('');
                command += `${filters.at(-1)?.slice(0, -1)}" \\\n`;
                continue;
            }

            const line: string[] = this.ffmpegCommand[i];
            command += `${line.join(' ')} \\\n`;
        }

        return command.slice(0, -3);
    }
}
