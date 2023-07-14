import { promises as fs } from 'fs';
import tmp, { DirectoryResult } from 'tmp-promise';
import { NumberedFileNameGenerator } from './util';
import * as _ from 'lodash';
import { execFile } from 'child_process';
import * as util from 'util';
import path from 'path';

tmp.setGracefulCleanup();

export const toBuffer = async (path: string | string[]): Promise<Buffer | Awaited<Buffer>[]> => {
    if (Array.isArray(path)) {
        return Promise.all(path.map((x) => fs.readFile(x)));
    }

    return fs.readFile(path);
};

export const fileExists = async (path: string): Promise<boolean> => {
    return fs
        .access(path, fs.constants.R_OK)
        .then(() => true)
        .catch(() => false);
};

export const directoryExists = async (path: string): Promise<boolean> =>
    fs
        .stat(path)
        .then((stats) => stats.isDirectory())
        .catch(() => false);

export const writePermissions = async (path: string): Promise<boolean> =>
    fs
        .access(path, fs.constants.W_OK)
        .then(() => true)
        .catch(() => false);

export const getTempDir = async (): Promise<DirectoryResult> => {
    return await tmp.dir({
        template: 'slideshow-video-XXXXXX',
        unsafeCleanup: true
    });
};

export const saveFile = async (path: string, data: Buffer | string): Promise<string> =>
    fs.writeFile(path, data).then(() => path);

const copyFile = async (path: string, newPath: string): Promise<string> =>
    fs.copyFile(path, newPath).then(() => newPath);

export const saveSlideshowImages = async (
    folderPath: string,
    images: Buffer[]
): Promise<string[]> => {
    const fileNameGenerator: NumberedFileNameGenerator = new NumberedFileNameGenerator(
        images.length
    );
    const fileNames: number[] = Array.from({ length: images.length }, (_, i) => i + 1);

    const zipped = _.zipObject(fileNames, images);
    return Promise.all(
        _.map(zipped, (buffer, fileName) => saveFile(joinPaths(folderPath, fileName), buffer))
    );
};

export const saveAudio = async (folderPath: string, audio: string | Buffer): Promise<string> => {
    const fileName = 'audio';
    return audio instanceof Buffer
        ? saveFile(joinPaths(folderPath, fileName), audio)
        : copyFile(audio, joinPaths(folderPath, fileName));
};

export const execFileAsync = util.promisify(execFile);

export const joinPaths = (...paths: string[]): string => path.join(...paths);

export const escapePath = (path: string): string => path.replace(/\\/g, '\\\\');
