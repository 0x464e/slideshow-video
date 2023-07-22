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

---

## Table of Contents

<details>
    <summary>Click to expand</summary>

<!-- toc -->

- [About The Project](#about-the-project)
- [Installation & Usage](#installation--usage)
  * [Basic example with all default settings](#basic-example-with-all-default-settings)
  * [Advanced example with options](#advanced-example-with-options)
- [Features](#features)
- [Documentation](#documentation)
  * [createSlideshow](#createslideshow)
    + [Parameters](#parameters)
    + [Returns](#returns)
- [Examples](#examples)
- [Optimization & System Requirements](#optimization--system-requirements)
- [Support & Requests](#support--requests)
- [Comparison with videoshow](#comparison-with-videoshow)

<!-- tocstop -->

</details>

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
<sup><sub>This is my first TypeScript project and npm package, 
feel free to tell me what I'm doing wrong or could be doing better.</sup></sub>

## Installation & Usage
Install the package from npm:

```sh
npm install slideshow-video
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

## Features
- Automatic creation of a slideshow video from images
- Add audio to the video
- Local file paths or buffers
- Automatic and configurable resizing of images
- Configurable transitions between images
- Global and/or per image configurable options
- Automatically detect if image or audio looping is needed, configurable
- Support for stream copying and concat muxing for very low system resource usage and fast encoding
- Configurable FFmpeg options, output in any video format
- Output to file or buffer

## Documentation
Full documentation is hosted on the [documentation site][documentation-url].

Documentation for the main function, `createSlideshow`, is also available below.

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

const response = await createSlideshow(images, './music/audio.mp3', options);
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
It is set to `"never"` by default. `"auto"` means that the images will start looping if duration
and threshold conditions are met.

For example:

|            | Image 1 | Image 2 |      Image 3      |  Audio |
|------------|:-------:|:-------:|:-----------------:|:------:|
| Duration   |  3.5 s  |  4 sec  |      3.5 sec      | 21 sec |
| Transition |  500 ms |  300 ms |  250 ms (if loop) |    -   |

So we have a total image duration of 11.8 sec + 250 ms loop transition (if a loop occurs)<br>
And a total audio duration of 21 sec.

We have no last image extra duration, and a default end of input threshold of 3.5 sec (last
image's duration).<br>
And [LoopingOptions.imageLoopThreshold](https://0x464e.github.io/slideshow-video/interfaces/LoopingOptions)
is at its default value `"all"`.

After the images have played once, 21 - 11.8 = 9.2 sec of audio is left.

Our imageLoopThreshold is set to `"all"`, so all images will need to fit inside a loop for
a loop to occur. We only have 9.2 sec of audio left, and full loop of images will take 12.05
sec, so no loop will be created? No, actually a loop will be created due to our end of input
threshold being 3.5 sec. This means we are allowed 9.2 + 3.5 = 12.7 secs for a new loop.

Ok, new lets say our end of input threshold is set to `2000` (1 sec) instead. Now we only have
9.2 + 2 = 11.2 secs for a new loop. And a full loop of images will take 12.05 sec, so no loop
will be created.

But let's also change our image loop threshold from `"all"` to `1`. This means that only one
image needs to fit inside a loop for a loop to occur. And our first image is 3.5 sec long,
so a loop will be created.<br>
After the first image has looped, we have 11.2 - (3.5 + 0.25) = 7.45 secs left. The second image
is 4 sec long, so it will also be inserted into the loop. Now we have 7.45 - (4 + 0.5) = 2.95 secs
left. Inserting the third image would require 3.75 secs, so it will not be inserted into the
second loop and the second loop, and whole slideshow, ends.

Now lets say we have a last image extra duration of 3 sec. This means that the last image of a
full loop will be extended by 3 sec. And now we wouldn't again have space for the second image,
so the second loop would only contain one image.

You can run this example as code from the
[examples](https://github.com/0x464e/slideshow-video/tree/master/examples) folder.

```sh
npx ts-node examples/duration-looping.ts
```

**Audio Looping**

Audio looping works in a similar way to image looping, but is a bit simpler. And of course,
the logic is inverted in the sense that we are checking how much video duration time we have left
for a new loop of the audio track. The end of input threshold is also considered, just as it
was for image looping.

For audio looping, [LoopingOptions.audioLoopThreshold](https://0x464e.github.io/slideshow-video/interfaces/LoopingOptions),
which default to `0`, exists. It specifies the amount of milliseconds that need to fit inside a
loop an audio loop to occur. Alternatively it can be set to `"all"`, which means that the
whole audio track needs to fit into a loop for a loop to occur.

**`See`**

[SlideshowOptions](https://0x464e.github.io/slideshow-video/interfaces/SlideshowOptions) for more information about the options object\
[InputImage](https://0x464e.github.io/slideshow-video/interfaces/InputImage) for more information about per image options

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

## Examples
You can find examples about the usage of this library in the [examples][examples-url] folder.  
If you use this for something and want it to be shown here an example, I'd be glad to add it!  

## Optimization & System Requirements
Video encoding is a very CPU/memory intensive task. FFmpeg will suck back as much memory as it needs to complete 
its task. If memory runs out, FFmpeg probably gets killed by the OS. However, it's possible to use very little memory.

To optimize memory usage, consider the following:
- Never run parallel slideshow creations
- Don't use an unnecessarily high resolution
- Transitions will use a lot of memory compared to not using them
- Use 'libx264' or some other easy to encode codec
- Use a fast x264 preset (if using x264)

Example memory usages with 26 images at 1284x1350 resolution, no image looping, audio loops once, ran on my local machine WSL2:
- Transitions enabled, no resolution scaling, default x264 preset (medium)
  - 3.8 GB memory usage
- Transitions enabled, no resolution scaling, ultrafast x264 preset
  - 3.24 GB memory usage
- Transition enabled, scaled to 500px height, ultrafast x264 preset
  - 568 MB memory usage
- Transitions disabled, no resolution scaling, ultrafast x264 preset
  - 420 MB memory usage 
- Transitions disabled, scaled to 500px height, ultrafast x264 preset
  - 283 MB memory usage

## Support & Requests
Please report any issues you find on the [issues page][issues-url].  
You can also join the [discord server][discord-url] I just created to ask questions or request features or whatever.

## Comparison with videoshow
[videoshow](https://www.npmjs.com/package/videoshow) is another npm package that generate slideshow videos.  
It's very old, unmaintained, and didn't have some of the features I wanted, so I made this package.

Let's compare the two packages:  
<sup><sub>Yes, I'm obviously biased, but all the points are factual as far as I know</sup></sub>

| Feature                        | slideshow-video | videoshow | Notes                                                                                               |
|--------------------------------|:---------------:|:---------:|-----------------------------------------------------------------------------------------------------|
| Currently maintained           |        ✅        |     ❌     |                                                                                                     |
| Usable fully automatically     |        ✅        |     ❌     | videoshow can't function if you don't control what<br>will be passed into it (unless you get lucky) |
| Included cross-platform FFmpeg |        ✅        |     ❌     | with videoshow, you have to install and configure ffmpeg manually                                   |
| Promise support                |        ✅        |     ❌     |                                                                                                     |
| TypeScript support             |        ✅        |     ❌     |                                                                                                     |
| Buffer support                 |        ✅        |     ❌     |                                                                                                     |
| Transitions                    |        ✅        |    🟡     | Only one transition available vs 50 in slideshow-video                                              |
| Per image config               |        ✅        |     ✅     |                                                                                                     |
| Support mixed image dimensions |        ✅        |     ❌     | In videoshow, all input images must have same the dimensions                                        |
| Image/audio looping            |        ✅        |     ❌     |                                                                                                     |
| Configurable FFmpeg options    |        ✅        |     ✅     |                                                                                                     |
| Output to buffer               |        ✅        |     ❌     |                                                                                                     |
| CLI interface                  |        ❌        |     ✅     | Planned feature for slideshow-video                                                                 |
| Logo support                   |        ❌        |     ✅     |                                                                                                     |
| Subtitles support              |        ❌        |     ✅     |                                                                                                     |
| Custom FFmpeg filters support  |        ❌        |     ✅     |                                                                                                     |




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
