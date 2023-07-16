<div align='center'>
    <img width="150" src="https://raw.githubusercontent.com/0x464e/slideshow-video/master/assets/slideshow-video-icon.svg"  alt='icon'/>
    <h1>slideshow-video</h1>
    <h3>Automated creation of slideshow videos from images</h3>
    <h4>Powered by NodeJS and ffmpeg</h4>
</div>

<div align='center'>

[![npm-version][npm-version-shield]][npm-url]
[![npm-downloads][npm-downloads-shield]][npm-url]
[![HitCount][hit-count-shield]][hit-count-url]

[Examples][examples-url] • [Report Bug][issues-url] • [Request Feature][issues-url] • [Releases][releases-url]

</div>


## About The Project 
This tool uses ffmpeg to automatically create slideshow videos from images. 
Cross-platform support is ensured, and it comes bundled with ffmpeg and ffprobe binaries.
The goal of this tool is to automate the creation of slideshow videos, so you don't have 
to manually tailor settings for every run.

* Different image dimensions?
* Different image counts?
* Different audio durations?
* Loop video if audio duration permits?
* Loop audio if image count permits?

**No problem**, configure your settings once and let the tool do the rest.

The main inspiration for this tool is automated creation of videos from TikTok slideshows. 
With those you never know how many images there will be, what their dimensions will be, 
and how long the audio will be, etc. This tool can reliably and automatically create videos from them.

## Installation & Usage
Install the package from npm:

```sh
$ npm install slideshow-video
```

Then simply use it in your code:  
<sup><sub>(in reality you probably want to await, I just used `.then()` better compatibility 
(top level await is a bit iffy to setup))</sup></sub>
### Basic example with all default settings
```js
import { createSlideshow } from 'slideshow-video';
// or in commonjs
// const { createSlideshow } = require('slideshow-video');

const images = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
const audio = 'audio.mp3';

createSlideshow(images, audio).then(console.log);
```

### Advanced example with options

<details>
    <summary>Click to expand</summary>
Showcase of some of the available options, and ability to pass in image objects with specific options.<br>
See full documentation for all available options below.

```js
const options = {
    imageOptions: {
        imageDuration: 5000,
        imageResizeDimensions: { width: 500 }
    },
    loopingOptions: {
        loopImages: 'auto',
        imageLoopThreshold: 'all',
    },
    transitionOptions: {
        imageTransition: 'smoothleft',
        loopTransition: 'fadeslow',
    },
    ffmpegOptions: {
        showFfmpegOutput: false,
        showFfmpegCommand: true,
        fps: 50,
        streamCopyAudio: true,
        videoCodec: 'libx264',
        x264Preset: 'ultrafast'
    },
    outputOptions: {
        outputBuffer: false,
        outputDir: '../my-out-folder'
    }
};

const imagesWithOptions = [
    {
        filePath: 'image1.jpg',
        duration: 1500,
        transitionDuration: 700
    },
    {
        buffer: Buffer.from(something),
        transition: 'circleclose'
    },
    {
        filePath: 'image3.jpg'
    }
];

createSlideshow(imagesWithOptions, audio, options).then(console.log);
```

</details>



<!-- MARKDOWN LINKS & IMAGES -->
[npm-version-shield]: https://img.shields.io/npm/v/slideshow-video.svg
[npm-url]: https://www.npmjs.com/package/slideshow-video
[npm-downloads-shield]: https://img.shields.io/npm/dt/slideshow-video.svg
[hit-count-shield]: https://img.shields.io/endpoint?url=https%3A%2F%2Fhits.dwyl.com%2F0x464e%2Fslideshow-video.json&color=brightgreen
[hit-count-url]: https://hits.dwyl.com/0x464e/slideshow-video
[examples-url]: https://github.com/0x464e/slideshow-video/tree/master/examples
[issues-url]: https://github.com/0x464e/slideshow-video/issues
[releases-url]: https://github.com/0x464e/slideshow-video/releases
