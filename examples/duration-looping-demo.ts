/**
 * follow this example via the documentation writeup about
 * duration and looping options
 * https://github.com/0x464e/slideshow-video#duration-looping
 */

// you'd import/require this as 'slideshow-video' in your project, of course
import { createSlideshow, InputImage, SlideshowOptions, SlideshowResponse } from '../src';
// ensure consistent working directory for this example
import { chdir } from 'process';

chdir(__dirname);

const images: InputImage[] = [
    {
        filePath: './image-audio-files/duration-looping-demo/1.png',
        transitionDuration: 500
    },
    {
        filePath: './image-audio-files/duration-looping-demo/2.png',
        duration: 4000,
        transitionDuration: 300
    },
    {
        filePath: './image-audio-files/duration-looping-demo/3.png'
    }
];

// 21024 ms audio duration
const audio = './image-audio-files/duration-looping-demo/audio.mp3';

const options: SlideshowOptions = {
    imageOptions: {
        imageDuration: 3500,
        lastImageExtraDuration: 3000
    },
    loopingOptions: {
        loopImages: 'auto',
        endOfInputThreshold: 2000,
        imageLoopThreshold: 1
    },
    outputOptions: {
        outputDir: '.',
        outputBuffer: false
    }
};

(async () => {
    // Two loops fit in due to end of input threshold
    const twoLoops: Partial<SlideshowResponse> = await createSlideshow(images, audio, options);
    console.log('two loops: ', twoLoops.filePath);

    // End of input threshold lowered, only one loop fits in
    const noLoop: Partial<SlideshowResponse> = await createSlideshow(images, audio, {
        ...options,
        loopingOptions: { ...options.loopingOptions, endOfInputThreshold: 1000 }
    });
    console.log('no loop: ', noLoop.filePath);

    // requirement for how many images need to fit into a loop lowered
    // from "all" to 1, two images fit into the second loop
    const twoImages: Partial<SlideshowResponse> = await createSlideshow(images, audio, {
        ...options,
        loopingOptions: { ...options.loopingOptions, imageLoopThreshold: 1 }
    });
    console.log('second loop two images: ', twoImages.filePath);

    // first loop's last image's duration is extended by 3 seconds,
    // only one image fits into the second loop
    const oneImage: Partial<SlideshowResponse> = await createSlideshow(images, audio, {
        ...options,
        imageOptions: { ...options.imageOptions, lastImageExtraDuration: 3000 }
    });
    console.log('second loop one image: ', oneImage.filePath);
})();
