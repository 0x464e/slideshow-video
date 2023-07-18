/**
 * This example demonstrates how to create a slideshow with all default settings.
 * Nothing special about it, just a simple slideshow.
 * Audio duration is about 30sec, and image duration about 42 sec,
 * so the audio will loop
 */

// you'd import/require this as 'slideshow-video' in your project, of course
import { createSlideshow } from '../src';
import * as fs from 'fs';
// ensure consistent working directory for this example
import { chdir } from 'process';

`${fs}`; // hack to prevent fs import from being removed because it's unused

chdir(__dirname);

const images = [
    './image-audio-files/all-default-settings/1.jpg',
    './image-audio-files/all-default-settings/2.jpg',
    './image-audio-files/all-default-settings/3.jpg',
    './image-audio-files/all-default-settings/4.jpg',
    './image-audio-files/all-default-settings/5.jpg',
    './image-audio-files/all-default-settings/6.jpg',
    './image-audio-files/all-default-settings/7.jpg',
    './image-audio-files/all-default-settings/8.jpg',
    './image-audio-files/all-default-settings/9.jpg',
    './image-audio-files/all-default-settings/10.jpg',
    './image-audio-files/all-default-settings/11.jpg',
    './image-audio-files/all-default-settings/12.jpg',
    './image-audio-files/all-default-settings/13.jpg'
];

const audio = './image-audio-files/all-default-settings/audio.mp3';

console.log('Creating slideshow with default settings...');
createSlideshow(images, audio).then((response) => {
    console.log('Success! Default response:', response);

    // uncomment to save the video to disk
    // or you could of course also set outputOptions.outputDir to options
    // (3rd parameter of the createSlideshow function)
    // fs.writeFileSync('slideshow-defaults.mp4', response.buffer as Buffer);
});
