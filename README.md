<div align='center'>
    <img width="150" src="https://raw.githubusercontent.com/0x464e/slideshow-video/master/assets/slideshow-video-icon.svg"  alt='icon'/>
    <h1>slideshow-video</h1>
    <h3>Automated creation of slideshow videos from images</h3>
    <h4>Powered by NodeJS and FFmpeg</h4>
</div>

<div align='center'>

[![documentation-page][documentation-page-shield]][documentation-url]
[![npm-version][npm-version-shield]][npm-url]
[![npm-downloads][npm-downloads-shield]][npm-url]
[![discord][discord-shield]][discord-url]
[![hit-count][hit-count-shield]][hit-count-url]

[Examples][examples-url] • [Project Board][board-url] • [Report Bug][issues-url] • [Request Feature][issues-url] • [Releases][releases-url]

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
See [the documentation][documentation-url] for more information about all the options.

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


<!-- createSlideshow begin -->
### createSlideshow

▸ **createSlideshow**(`images`, `audio?`, `options?`): `Promise`<`Partial`<[`SlideshowResponse`](https://0x464e.github.io/slideshow-video/interfaces/SlideshowResponse)\>\>

Brains of the operation, entrypoint to this whole package.

Takes in images, audio, and options from which it automatically creates a slideshow video.

If images are provided as an [InputImage](https://0x464e.github.io/slideshow-video/interfaces/InputImage) array, per image options can be specified.
Per image options override options specified in the 3rd parameter.<br>
For example:
```ts
const images: InputImage[] = [
    {
        buffer: Buffer.from(myImage),
        duration: 5000
    },
    {
        filePath: 'image2.jpg',
        transition: 'dissolve',
        transitionDuration: 200
    },
    {
        filePath: '../../../documents/image3.png'
    }
];

const options: SlideshowOptions = {
    imageOptions: {
        imageDuration: 3500
    },
    transitionOptions: {
        transitionDuration: 500
    }
};
```

The tree input images broken down:

First image, buffer input, overrides duration
- Has a duration of 5000ms
- 500ms transition (specified in options object) to the next image
with the default transition (`slideleft`)

Second image, file path input, overrides transition and transition duration
- Has a duration of 3500ms, specified in the options object
- 200 ms transition to the next image with the `dissolve` transition

Third image, file path input, uses default options
- Has a duration of 3500ms, specified in the options object
- Will have no normal transition as it's the last image
- Might have a 500ms loop transition (by default `pixelize`),
if image and audio durations permit it
- See remarks section for more about durations and looping

<a name="duration-looping"></a>

**`Remarks`**

**Duration and looping**

Possible total duration for one loop of images consist of the following:
- Image duration (set globally in [ImageOptions.imageDuration](https://0x464e.github.io/slideshow-video/interfaces/ImageOptions)
or per image in [InputImage.duration](https://0x464e.github.io/slideshow-video/interfaces/InputImage))
- Transition duration (set globally in [TransitionOptions.transitionDuration](https://0x464e.github.io/slideshow-video/interfaces/TransitionOptions)
or per image in [InputImage.transitionDuration](https://0x464e.github.io/slideshow-video/interfaces/InputImage))
- Loop transition duration (also set in [TransitionOptions.transitionDuration](https://0x464e.github.io/slideshow-video/interfaces/TransitionOptions))
- Last image extra duration (set in [ImageOptions.lastImageExtraDuration](https://0x464e.github.io/slideshow-video/interfaces/ImageOptions))
- End of input threshold (set in [LoopingOptions.endOfInputThreshold](https://0x464e.github.io/slideshow-video/interfaces/LoopingOptions))

Audio duration is simply just the duration of the audio.

**Image Looping**

Image looping is enabled by setting [LoopingOptions.loopImages](https://0x464e.github.io/slideshow-video/interfaces/LoopingOptions) to `"auto"`.<br>
It is enabled by default, and means that the images will start looping if duration and
threshold conditions are met.

For example:

|            | Image 1 | Image 2 |      Image 3      |  Audio |
|------------|:-------:|:-------:|:-----------------:|:------:|
| Duration   |   3 s   |  4 sec  |       3 sec       | 21 sec |
| Transition |  500 ms |  250 ms |  250 ms (if loop) |    -   |

So we have a total image duration of 11.75 sec + 250 ms loop transition (if a loop occurs)<br>
And a total audio duration of 21 sec.

We have no last image extra duration, and a default end of input threshold of 3 sec (last
image's duration).<br>
And [LoopingOptions.imageLoopThreshold](https://0x464e.github.io/slideshow-video/interfaces/LoopingOptions)
is at its default value `"all"`.

After the images have played once, 21 - 11.75 = 9.25 sec of audio is left.

Our imageLoopThreshold is set to `"all"`, so all images will need to fit inside a loop for
a loop to occur. We only have 8.25 sec of audio left, and full loop of images will take 12
sec, so no loop will be created? No, actually a loop will be created due to our end of input
threshold being 3 sec. This means we are allowed 9.25 + 3 = 12.25 secs for a new loop.

Ok, new lets say our end of input threshold is set to `1000` (1 sec) instead. Now we only have
9.25 + 1 = 10.25 secs for a new loop. And a full loop of images will take 12 sec, so no loop
will be created.

But let's also change our image loop threshold from `"all"` to `1`. This means that only one
image needs to fit inside a loop for a loop to occur. And our first image is 3 sec long,
so a loop will be created.<br>
After the first image has looped, we have 10.25 - (3 + 0.25) = 7 secs left. The second image
is 4 sec long, so it will also be inserted into the loop. Now we have 7 - (4 + 0.5) = 2.5 secs
left. Inserting the third image would require 3.25 secs, so it will not be inserted into the
second loop and the second loop, and whole slideshow, ends.

Now lets say we have a last image extra duration of 3 sec. This means that the last image
of a loop will be extended by 3 sec. And now we wouldn't again have space the second image,
so the second loop would only contain one image.

**Audio Looping**

Audio looping works in a similar way to image looping, but is a bit simpler. And of course,
logic is inverted in the sense that we are checking how much video duration time we have left
for a new loop of the audio track. The end of input threshold is also considered, just as it
was for image looping.

For audio looping, [LoopingOptions.audioLoopThreshold](https://0x464e.github.io/slideshow-video/interfaces/LoopingOptions),
which default to `0`, exists. It specifies the amount of milliseconds that need to fit into a
loop an audio loop to occur. Alternatively it can be set to `"all"`, which means that the
whole audio track needs to fit into a loop for a loop to occur.

**`See`**

[SlideshowOptions](https://0x464e.github.io/slideshow-video/interfaces/SlideshowOptions) for more information about the options object\
[InputImage](https://0x464e.github.io/slideshow-video/interfaces/InputImage) for more information about per image options

**`Example`**

//TODO

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `images` | `string`[] \| `Buffer`[] \| [`InputImage`](https://0x464e.github.io/slideshow-video/interfaces/InputImage)[] | Images to be used in the slideshow.<br> Either a file path, buffer, or an [InputImage](https://0x464e.github.io/slideshow-video/interfaces/InputImage) |
| `audio?` | `string` \| `Buffer` | Audio to be used in the slideshow.<br> Either a file path or buffer.<br> Can be undefined, so the slideshow will have no audio |
| `options?` | [`SlideshowOptions`](https://0x464e.github.io/slideshow-video/interfaces/SlideshowOptions) | Options object to configure the slideshow creation |

#### Returns

`Promise`<`Partial`<[`SlideshowResponse`](https://0x464e.github.io/slideshow-video/interfaces/SlideshowResponse)\>\>

A promise that resolves to a partial [SlideshowResponse](https://0x464e.github.io/slideshow-video/interfaces/SlideshowResponse) object.<br>
Available fields in the response object depend on what was specified in [OutputOptions](https://0x464e.github.io/slideshow-video/interfaces/OutputOptions).<br>
By default, only a buffer of the resulting slideshow video is returned.
<!-- createSlideshow end -->

<!-- MARKDOWN LINKS & IMAGES -->
[documentation-page-shield]: https://img.shields.io/badge/documentation-page-blue.svg
[documentation-url]: https://0x464e.github.io/slideshow-video/
[npm-version-shield]: https://img.shields.io/npm/v/slideshow-video.svg
[npm-url]: https://www.npmjs.com/package/slideshow-video
[npm-downloads-shield]: https://img.shields.io/npm/dt/slideshow-video.svg
[discord-shield]: https://img.shields.io/badge/Discord-join-738ad6?logo=discord&logoColor=white
[discord-url]: https://discord.gg/SQCzaVeBTa
[hit-count-shield]: https://img.shields.io/endpoint?url=https%3A%2F%2Fhits.dwyl.com%2F0x464e%2Fslideshow-video.json&color=brightgreen
[hit-count-url]: https://hits.dwyl.com/0x464e/slideshow-video
[examples-url]: https://github.com/0x464e/slideshow-video/tree/master/examples
[board-url]: https://github.com/users/0x464e/projects/1
[issues-url]: https://github.com/0x464e/slideshow-video/issues
[releases-url]: https://github.com/0x464e/slideshow-video/releases
