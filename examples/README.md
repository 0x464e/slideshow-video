# Examples

Examples are written in TypeScript, sorry if you're only a JavaScript user.  
Nevertheless, all the examples are easy to run even if you've never touched TypeScript before.

```sh
git clone https://github.com/0x464e/slideshow-video
cd slideshow-video
npm install
npx ts-node examples/example.ts
```

And that's it.

### [all-default-settings.ts](https://github.com/0x464e/slideshow-video/blob/master/examples/all-default-settings.ts)
Demo about how to create a slideshow with all the default settings.  
As simple as it gets, audio duration is about 30sec, and image duration about 42 sec, 
so the audio will loop.

```sh
npx ts-node all-default-settings.ts
```

### [duration-looping-demo.ts](https://github.com/0x464e/slideshow-video/blob/master/examples/duration-looping-demo.ts)
Demo about how duration and looping works.  
The demo should be followed via the [duration and looping](https://github.com/0x464e/slideshow-video#duration-looping) 
documentation section.

```sh
npx ts-node duration-looping-demo.ts
```

### [buffers-image-resizing.ts](https://github.com/0x464e/slideshow-video/blob/master/examples/buffers-image-resizing.ts)
Demo about how to create a slideshow from buffers and teaches about how images are resized.  
Also a random duration audio is generated each run, how image/audio looping happens with different durations.

```sh
npx ts-node buffers-image-resizing.ts
```
