import { createSlideshow } from './slideshow';
import axios from 'axios';

//testing shit

const getTT = async (id: string) => {
    const ttResponse = (
        await axios.get(`https://api16-va.tiktokv.com/aweme/v1/feed/?aweme_id=${id}`)
    ).data;

    const tt = ttResponse.aweme_list[0];
    const audioUrl = tt.music.play_url.url_list[0];
    const audioBuffer: Buffer = (await axios.get(audioUrl, { responseType: 'arraybuffer' })).data;

    const imageUrls = tt.image_post_info.images.map((x: any) => x.display_image.url_list[0]);
    const imageBuffers: Buffer[] = await Promise.all(
        imageUrls.map(async (x: any) => (await axios.get(x, { responseType: 'arraybuffer' })).data)
    );

    return { imageBuffers, audioBuffer };
};

const options: SlideshowOptions = {
    imageOptions: { imageDimensions: { width: 500 } },
    loopingOptions: {
        loopImages: 'auto'
    },
    ffmpegOptions: {
        fps: 20,
        showFfmpegCommand: true,
        showFfmpegOutput: true,
        streamCopyAudio: true
    },
    outputOptions: {
        outputDir: '.'
    },
    transitionOptions: { useTransitions: false }
};

const test: NonOptional<InputImage> = {
    buffer: Buffer.from(''),
    filePath: '../slideshow-video2/test1/1.webp',
    duration: 1000,
    transition: 'slideleft',
    transitionDuration: 250
};

const inputImages: InputImage[] = [
    {
        filePath: '../slideshow-video2/test1/1.webp',
        duration: 1000
    },
    {
        filePath: '../slideshow-video2/test1/2.webp',
        transition: 'pixelize'
    },
    {
        filePath: '../slideshow-video2/test1/3.webp'
    }
];

(async () => {
    const tt = await getTT('7245327652393848091'); //7245337845039140138
    const response = await createSlideshow(tt.imageBuffers, tt.audioBuffer, options);
    console.log(response.ffmpegCommand);
    const asdasd = '';
})();
