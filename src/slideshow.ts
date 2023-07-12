import { getTempDir, saveAudio, saveSlideshowImages } from './filesystem';
import { getImageDimensions, resizeImages } from './images';
import {
    fillDefaultSlideshowOptions,
    inputImagesToBuffers,
    toInputImages,
    validateInput
} from './util';
import { Ffmpeg } from './ffmpeg';

export const createSlideshow = async (
    images: string[] | Buffer[] | InputImage[],
    audio?: string | Buffer,
    options?: SlideshowOptions
) => {
    await validateInput(images, audio, options);

    options = fillDefaultSlideshowOptions(options);

    const { path: tempDir, cleanup } = await getTempDir();

    const imageBuffers: Buffer[] = await inputImagesToBuffers(images);
    const dimensions: SlideshowImageDimensions = getImageDimensions(imageBuffers);
    const paddedImages: Buffer[] = await resizeImages(
        dimensions,
        options.imageOptions?.imageDimensions
    );
    const savedImages: string[] = await saveSlideshowImages(tempDir, paddedImages);
    const savedAudio: string | undefined = audio ? await saveAudio(tempDir, audio) : undefined;
    const ffmpeg = new Ffmpeg(options, tempDir);
    await ffmpeg.createSlideshow(toInputImages(savedImages, images, options), savedAudio);
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
