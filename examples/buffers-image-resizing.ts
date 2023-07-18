/**
 * This example shows how to create a slideshow from buffers and teaches about how images are resized.
 * A random duration audio is generated to be able to observe how image/audio looping happens with
 * different durations.
 */

// you'd import/require this as 'slideshow-video' in your project, of course
import { createSlideshow, SlideshowOptions, SlideshowResponse } from '../src';

import { chdir } from 'process';
import axios from 'axios';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ffmpeg from 'ffmpeg-static';

// ensure consistent working directory for this example
chdir(__dirname);
const execFileAsync = promisify(execFile);

(async () => {
    const audio = './image-audio-files/buffers-image-resizing/audio.mp3';

    // random duration between 1 and 40 seconds
    const audioDuration = Math.floor(Math.random() * 40) + 1;

    console.log('Generating audio with duration of about', audioDuration, 'seconds...');
    // create audio file with the random duration (just a sine wave)
    await execFileAsync(ffmpeg as string, [
        '-f',
        'lavfi',
        '-i',
        `aevalsrc='sin(1000*(t*2*PI*t*(t/2)))':s=44100:d=${audioDuration}`,
        '-af',
        'loudnorm,volume=.5',
        audio,
        '-y'
    ]);

    console.log('Downloading images from https://picsum.photos/...');
    // 200x300 image, tiny will get scaled up
    const { data: img200x300 } = await axios.get<Buffer>('https://picsum.photos/200/300', {
        responseType: 'arraybuffer'
    });

    // 3000x1000 image, very large, we wouldn't want such a resolution in our slideshow
    // the largest width image, so its width will be used as a base for the aspect ratio
    const { data: img3000x1000 } = await axios.get<Buffer>('https://picsum.photos/3000/1000', {
        responseType: 'arraybuffer'
    });

    // 1281x1500 image, width is not divisible by 2, which is not good for encoding
    // the largest height image, so its height will be used as a base for the aspect ratio
    const { data: img1281x1500 } = await axios.get<Buffer>('https://picsum.photos/1281/1500', {
        responseType: 'arraybuffer'
    });

    // 420x630 image, this will be our target height, so this image doesn't get resized, only
    // padded with black bars, as will all other images
    const { data: img420x630 } = await axios.get<Buffer>('https://picsum.photos/420/630', {
        responseType: 'arraybuffer'
    });

    // video loops will be created automatically, if audio duration happened to be long enough
    // audio will loop to fill images, if audio duration happened to be short
    // image and transitions durations left on default (3 sec images, 250 ms transitions)
    const options: SlideshowOptions = {
        imageOptions: {
            imageResizeDimensions: {
                // width will be calculated according to the resulting aspect ratio
                height: 630
            },
            lastImageExtraDuration: 1000
        },
        loopingOptions: {
            loopImages: 'auto',
            loopAudio: 'auto'
        },
        ffmpegOptions: {
            streamCopyAudio: true
        },
        outputOptions: {
            outputDir: '.'
        }
    };

    console.log('Creating slideshow...');
    const response: Partial<SlideshowResponse> = await createSlideshow(
        [img200x300, img3000x1000, img1281x1500, img420x630],
        audio,
        options
    );
    console.log('created slideshow: ', response.filePath);
})();
