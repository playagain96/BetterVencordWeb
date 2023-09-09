/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Link } from "@components/Link";
import { React } from "@webpack/common";

export function getDeferred() {
    let resolve: undefined | ((arg: any) => void) = undefined;
    let reject: undefined | ((e?: Error) => void) = undefined;

    const promise = new Promise((resolveCb, rejectCb) => {
        resolve = resolveCb;
        reject = rejectCb;
    });

    return { resolve, reject, promise };
}

// export function evalInScope(js, contextAsScope) {
//     return new Function(`with (this) { return (${js}); }`).call(contextAsScope);
// }
export function evalInScope(js: string, contextAsScope: any) {
    // @ts-ignore
    // eslint-disable-next-line quotes
    return new Function(["contextAsScope", "js"], "return (function() { with(this) { return eval(js); } }).call(contextAsScope)")(contextAsScope, js);
}

export function addLogger() {
    return {
        warn: function (...args) {
            console.warn(...args);
        },
        info: function (...args) {
            console.log(...args);
        },
        err: function (...args) {
            console.error(...args);
        },
        stacktrace: function (...args) {
            console.error(...args);
        },
        error: function (...args) {
            console.error(...args);
        },
    };
}

export function simpleGET(url: string, headers?: any) {
    var httpRequest = new XMLHttpRequest();

    httpRequest.open("GET", url, false);
    if (headers)
        for (const header in headers) {
            httpRequest.setRequestHeader(header, headers[header]);
        }
    httpRequest.send();
    return httpRequest;
}

export function findFirstLineWithoutX(str, x) {
    const lines = str.split("\n");
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].startsWith(x)) {
            return i + 1; // Return line number (1-indexed)
        }
    }
    return -1; // If no line is found, return -1
}

export function evalInContext(js, context) {
    // Return the results of the in-line anonymous function we .call with the passed context
    return function () {
        return window.eval(js);
    }.call(context);
}

export function readdirPromise(filename) {
    const fs = window.require("fs");
    return new Promise((resolve, reject) => {
        fs.readdir(filename, (err, files) => {
            if (err)
                reject(err);
            else
                resolve(files);
        });
    });
}

export function injectZipToWindow() {
    window.eval(
        simpleGET(
            "https://raw.githubusercontent.com/gildas-lormeau/zip.js/master/dist/zip.min.js"
        ).responseText
    );
}

export function createTextForm(field1, field2, asLink = false, linkLabel = field2) {
    return React.createElement(
        "div",
        {},
        React.createElement(
            Vencord.Webpack.Common.Forms.FormTitle,
            {
                tag: "h3",
            },
            [
                field1,
                React.createElement(
                    Vencord.Webpack.Common.Forms.FormText,
                    {},
                    asLink ? React.createElement(Link, { href: field2 }, linkLabel) : field2,
                ),
            ]
        ),
    );
}

export function objectToString(obj: any) {
    if (typeof obj === "function") {
        return obj.toString();
    }

    if (typeof obj !== "object" || obj === null) {
        return String(obj);
    }

    let str = "{";
    let isFirst = true;

    for (const key in obj) {
        // eslint-disable-next-line no-prototype-builtins
        if (obj.hasOwnProperty(key)) {
            const descriptor = Object.getOwnPropertyDescriptor(obj, key);

            if (!isFirst) {
                str += ", ";
            }
            isFirst = false;

            if (!descriptor) {
                // uhh how did we get here?
                continue;
            }

            if (descriptor.get) {
                str += `${String(descriptor.get)}`;
            } else {
                str += key + ": " + objectToString(obj[key]);
            }
        }
    }

    str += "}";
    return str;
}

export function openFileSelect() {
    return new Promise<File>((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        const timeout = setTimeout(() => {
            reject();
            // so we don't wait forever
        }, 30 * 60 * 1000);
        input.addEventListener("change", () => {
            if (input.files && input.files.length > 0) {
                clearTimeout(timeout);
                resolve(input.files[0]);
            } else {
                clearTimeout(timeout);
                reject("No file selected.");
            }
        });

        input.click();
    });
}

export const FSUtils = {
    readDirectory(dirPath: string) {
        const fs = window.require("fs");
        const path = window.require("path");
        const files = fs.readdirSync(dirPath);

        const result = {};

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                result[file] = this.readDirectory(filePath);
            } else if (stat.isFile()) {
                result[file] = new ReadableStream({
                    start(controller) {
                        controller.enqueue(fs.readFileSync(filePath));
                        controller.close();
                    },
                });
            }
        }

        return result;
    },
    createPathFromTree(tree: {}, currentPath = "") {
        let paths = {};

        for (const key in tree) {
            // eslint-disable-next-line no-prototype-builtins
            if (tree.hasOwnProperty(key)) {
                const newPath = currentPath
                    ? currentPath + "/" + key
                    : key;

                if (
                    typeof tree[key] === "object" &&
                    tree[key] !== null &&
                    !(tree[key] instanceof ReadableStream)
                ) {
                    const nestedPaths = this.createPathFromTree(
                        tree[key],
                        newPath
                    );
                    // paths = paths.concat(nestedPaths);
                    paths = Object.assign({}, paths, nestedPaths);
                } else {
                    // paths.push(newPath);
                    paths[newPath] = tree[key];
                }
            }
        }

        return paths;
    },
    completeFileSystem() {
        return this.createPathFromTree(this.readDirectory("/"));
    },
    removeDirectoryRecursive(directoryPath) {
        const fs = window.require("fs");
        const path = window.require("path");
        const files = fs.readdirSync(directoryPath);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const currentPath = path.join(directoryPath, file);

            if (fs.lstatSync(currentPath).isDirectory()) {
                this.removeDirectoryRecursive(currentPath);
            } else {
                fs.unlinkSync(currentPath);
            }
        }
        if (directoryPath === "/") return;
        fs.rmdirSync(directoryPath);
    },
    formatFs() {
        const filesystem = this.createPathFromTree(
            this.readDirectory("/")
        );
        const fs = window.require("fs");
        for (const key in filesystem) {
            if (Object.hasOwnProperty.call(filesystem, key)) {
                fs.unlinkSync("/" + key);
            }
        }
        // const directories = fs.readdirSync("/");
        // for (let i = 0; i < directories.length; i++) {
        //     const element = directories[i];
        //     fs.rmdirSync("/" + element);
        // }
        this.removeDirectoryRecursive("/");
    },
    mkdirSyncRecursive(directory: string) {
        if (directory === "") return;
        const fs = window.require("fs");
        if (fs.existsSync(directory)) return;
        const path = window.require("path");
        const parentDir = path.dirname(directory);
        if (!fs.existsSync(parentDir)) {
            this.mkdirSyncRecursive(parentDir);
        }
        fs.mkdirSync(directory);
    },
    async importFile(targetPath: string) {
        const file = await openFileSelect();
        const fs = window.require("fs");
        const path = window.require("path");
        fs.writeFile(
            targetPath,
            window.BrowserFS.BFSRequire("buffer").Buffer.from(
                await file.arrayBuffer()
            ),
            () => { }
        );
    }
};

export const ZIPUtils = {
    async exportZip() {
        if (!window.zip) {
            injectZipToWindow();
        }
        const { BlobWriter, ZipWriter } = window.zip;
        const zipFileWriter = new BlobWriter();
        const zipWriter = new ZipWriter(zipFileWriter);
        // await zipWriter.add("hello.txt", helloWorldReader);
        const fileSystem = FSUtils.completeFileSystem();
        for (const key in fileSystem) {
            if (Object.hasOwnProperty.call(fileSystem, key)) {
                const element = fileSystem[key];
                await zipWriter.add(key, element);
            }
        }
        const data = await zipWriter.close();
        // console.log(data);
        return data;
    },
    async importZip() {
        if (!window.zip) {
            injectZipToWindow();
        }
        const fs = window.require("fs");
        const path = window.require("path");
        const { BlobReader, ZipReader, BlobWriter } = window.zip;
        const zipFileReader = new BlobReader(await this.uploadZip());
        // await zipWriter.add("hello.txt", helloWorldReader);
        const zipReader = new ZipReader(zipFileReader);
        FSUtils.formatFs();
        const entries = await zipReader.getEntries();
        // debugger;
        for (let i = 0; i < entries.length; i++) {
            const element = entries[i];
            const dir = element.directory
                ? element.filename
                : path.dirname(element.filename);
            const modElement =
                dir === element.filename
                    ? dir.endsWith("/")
                        ? dir.slice(0, 1)
                        : dir
                    : dir;
            FSUtils.mkdirSyncRecursive("/" + modElement);
            const writer = new BlobWriter();
            const out = await element.getData(writer);
            // console.log(out);
            // debugger;
            if (element.directory) continue;
            fs.writeFile(
                "/" + element.filename,
                window.BrowserFS.BFSRequire("buffer").Buffer.from(
                    await out.arrayBuffer()
                ),
                () => { }
            );
        }
        const data = await zipReader.close();
        // console.log(data);
        return data;
    },
    uploadZip() {
        return new Promise<Blob>((resolve, reject) => {
            // return new Promise((resolve, reject) => {
            //     const fileInput = document.createElement("input");
            //     fileInput.type = "file";
            //     fileInput.accept = "*";
            //     fileInput.onchange = event => {
            //         const file = event.target.files[0];
            openFileSelect().then(file => {
                // if (!file)
                //     return null;
                const reader = new FileReader();
                reader.onload = () => {
                    const blob = new Blob([reader.result as BlobPart], {
                        type: file.type,
                    });
                    resolve(blob);
                };
                reader.readAsArrayBuffer(file);
            });
            //     };
            //     fileInput.click();
            // });
        });
    },
    async downloadZip() {
        const zipFile = await this.exportZip();
        const blobUrl = URL.createObjectURL(zipFile);
        const newA = document.createElement("a");
        newA.href = blobUrl;
        newA.download = "filesystem-dump.zip";
        newA.click();
        newA.remove();
        URL.revokeObjectURL(blobUrl);
    }
};
