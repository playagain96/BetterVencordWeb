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

"use strict";
/* eslint-disable eqeqeq */
import definePlugin, { OptionType } from "@utils/types";
// import { readFileSync } from "fs";
// const process = require("~process");

const { Plugin } = require("@utils/types");
import { Settings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { ModalRoot, openModal } from "@utils/modal";

import { addContextMenu, addDiscordModules, FakeEventEmitter } from "./fakeStuff";
import UI from "./UI";
import { getDeferred } from "./utils";

// String.prototype.replaceAll = function (search, replacement) {
//     var target = this;
//     return target.split(search).join(replacement);
// };

const thePlugin = {
    name: "BD Compatibility Layer",
    description: "Converts BD plugins to run in Vencord",
    authors: [
        {
            id: 568109529884000260n,
            name: "Davilarek",
        },
    ],
    // patches: [],
    options: {
        pluginUrl1: {
            description: "Plugin url 1",
            type: OptionType.STRING,
            default: "",
            restartNeeded: true,
        },
        pluginUrl2: {
            description: "Plugin url 2",
            type: OptionType.STRING,
            default: "",
            restartNeeded: true,
        },
        pluginUrl3: {
            description: "Plugin url 3",
            type: OptionType.STRING,
            default: "",
            restartNeeded: true,
        },
        pluginUrl4: {
            description: "Plugin url 4",
            type: OptionType.STRING,
            default: "",
            restartNeeded: true,
        },
    },
    simpleGET(url, headers) {
        var httpRequest = new XMLHttpRequest();

        httpRequest.open("GET", url, false);
        if (headers)
            for (var header in headers) {
                httpRequest.setRequestHeader(header, headers[header]);
            }
        httpRequest.send();
        return httpRequest;
    },
    objectToString(obj) {
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

                if (descriptor.get) {
                    str += `${String(descriptor.get)}`;
                } else {
                    str += key + ": " + this.objectToString(obj[key]);
                }
            }
        }

        str += "}";
        return str;
    },
    // Delete these two below if you are only using code patches
    start() {
        // const proxyUrl = "https://api.allorigins.win/raw?url=";
        const proxyUrl = "https://cors-get-proxy.sirjosh.workers.dev/?url=";
        // const Filer = this.simpleGET(proxyUrl + "https://github.com/jvilk/BrowserFS/releases/download/v1.4.3/browserfs.js");
        fetch(
            proxyUrl +
            "https://github.com/jvilk/BrowserFS/releases/download/v1.4.3/browserfs.min.js"
        )
            .then(out => out.text())
            .then(out2 => {
                eval.call(
                    window,
                    out2.replaceAll(
                        ".localStorage",
                        ".Vencord.Util.localStorage"
                    )
                );
                const temp = {};
                BrowserFS.install(temp);
                BrowserFS.configure(
                    {
                        // fs: "InMemory"
                        fs: "LocalStorage",
                    },
                    () => {
                        window.BdApi.ReqImpl.fs = temp.require("fs");
                        window.BdApi.ReqImpl.path = temp.require("path");
                        windowBdCompatLayer.fsReadyPromise.resolve();
                    }
                );
            });
        const Utils = {
            readDirectory(dirPath) {
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
            createPathFromTree(tree, currentPath = "") {
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
                if (directoryPath == "/") return;
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
            /**
             * @returns {Promise<File>}
             */
            openFileSelect() {
                return new Promise((resolve, reject) => {
                    const input = document.createElement("input");
                    input.type = "file";

                    input.addEventListener("change", () => {
                        if (input.files && input.files.length > 0) {
                            resolve(input.files[0]);
                        } else {
                            reject("No file selected.");
                        }
                    });

                    input.click();
                });
            },
            uploadZip() {
                return new Promise((resolve, reject) => {
                    // return new Promise((resolve, reject) => {
                    //     const fileInput = document.createElement("input");
                    //     fileInput.type = "file";
                    //     fileInput.accept = "*";
                    //     fileInput.onchange = event => {
                    //         const file = event.target.files[0];
                    this.openFileSelect().then(file => {
                        // if (!file)
                        //     return null;
                        const reader = new FileReader();
                        reader.onload = () => {
                            const blob = new Blob([reader.result], {
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
            mkdirSyncRecursive(directory) {
                if (directory == "") return;
                const fs = window.require("fs");
                if (fs.existsSync(directory)) return;
                const path = window.require("path");
                const parentDir = path.dirname(directory);
                if (!fs.existsSync(parentDir)) {
                    this.mkdirSyncRecursive(parentDir);
                }
                fs.mkdirSync(directory);
            },
            stream2buffer(stream) {
                return new Promise((resolve, reject) => {
                    const _buf = [];
                    stream.on("data", chunk => _buf.push(chunk));
                    stream.on("end", () => resolve(Buffer.concat(_buf)));
                    stream.on("error", err => reject(err));
                });
            },
        };
        const exportZip = async () => {
            if (!window.zip) {
                eval(
                    this.simpleGET(
                        "https://raw.githubusercontent.com/gildas-lormeau/zip.js/master/dist/zip.min.js"
                    ).responseText
                );
            }
            const { BlobWriter, ZipWriter } = window.zip;
            const zipFileWriter = new BlobWriter();
            const zipWriter = new ZipWriter(zipFileWriter);
            // await zipWriter.add("hello.txt", helloWorldReader);
            const fileSystem = completeFileSystem();
            for (const key in fileSystem) {
                if (Object.hasOwnProperty.call(fileSystem, key)) {
                    const element = fileSystem[key];
                    await zipWriter.add(key, element);
                }
            }
            const data = await zipWriter.close();
            // console.log(data);
            return data;
        };
        const importZip = async () => {
            if (!window.zip) {
                eval(
                    this.simpleGET(
                        "https://raw.githubusercontent.com/gildas-lormeau/zip.js/master/dist/zip.min.js"
                    ).responseText
                );
            }
            const fs = window.require("fs");
            const path = window.require("path");
            const { BlobReader, ZipReader, BlobWriter } = window.zip;
            const zipFileReader = new BlobReader(await Utils.uploadZip());
            // await zipWriter.add("hello.txt", helloWorldReader);
            const zipReader = new ZipReader(zipFileReader);
            Utils.formatFs();
            const entries = await zipReader.getEntries();
            // debugger;
            for (let i = 0; i < entries.length; i++) {
                const element = entries[i];
                const dir = element.directory
                    ? element.filename
                    : path.dirname(element.filename);
                const modElement =
                    dir == element.filename
                        ? dir.endsWith("/")
                            ? dir.slice(0, 1)
                            : dir
                        : dir;
                Utils.mkdirSyncRecursive("/" + modElement);
                const writer = new BlobWriter();
                const out = await element.getData(writer);
                // console.log(out);
                // debugger;
                if (element.directory) continue;
                fs.writeFile(
                    "/" + element.filename,
                    BrowserFS.BFSRequire("buffer").Buffer.from(
                        await out.arrayBuffer()
                    ),
                    () => { }
                );
            }
            const data = await zipReader.close();
            // console.log(data);
            return data;
        };
        const downloadZip = async () => {
            const zipFile = await exportZip();
            const blobUrl = URL.createObjectURL(zipFile);
            const newA = document.createElement("a");
            newA.href = blobUrl;
            newA.download = "filesystem-dump.zip";
            newA.click();
            newA.remove();
            URL.revokeObjectURL(blobUrl);
        };
        const completeFileSystem = () => {
            return Utils.createPathFromTree(Utils.readDirectory("/"));
        };
        const importFile = async targetPath => {
            const file = await Utils.openFileSelect();
            const fs = window.require("fs");
            const path = window.require("path");
            fs.writeFile(
                targetPath,
                BrowserFS.BFSRequire("buffer").Buffer.from(
                    await file.arrayBuffer()
                ),
                () => { }
            );
        };
        window.BdCompatLayer = {
            Utils,
            exportZip,
            completeFileSystem,
            downloadZip,
            importZip,
            importFile,
        };
        const windowBdCompatLayer = {
            Utils,
            exportZip,
            completeFileSystem,
            downloadZip,
            importZip,
            importFile,
            fsReadyPromise: getDeferred(),
        };
        window.BdCompatLayer = windowBdCompatLayer;
        // const fsContext = {};
        // const setupFiler = (() => function () { return eval(Filer.responseText); }.call(fsContext));
        // setupFiler();
        // console.log(fsContext);
        // eval(Filer.responseText);
        // const instance = window.webpackChunkdiscord_app;
        // instance.push([[Symbol()], {}, require => {
        //     require.d = (target, exports) => {
        //         for (const key in exports) {
        //             if (!Reflect.has(exports, key) || target[key]) continue;

        //             Object.defineProperty(target, key, {
        //                 get: () => exports[key](),
        //                 set: v => { exports[key] = () => v; },
        //                 enumerable: true,
        //                 configurable: true
        //             });
        //         }
        //     };
        // }]);

        // instance.pop();
        // function patchAll() {
        //     let modules = [];
        //     window.webpackChunkdiscord_app.push([[""], {}, e => { for (const c in e.c) modules.push(e.c[c]); }]);
        //     for (let i = 0; i < modules.length; i++) {
        //         const { exports } = Object.assign({}, modules[i]);
        //         if (typeof exports != "object")
        //             continue;
        //         for (const key in exports) {
        //             if (!Reflect.has(exports, key) || modules[i][key]) continue;

        //             Object.defineProperty(modules[i], key, {
        //                 get: () => exports[key](),
        //                 set: v => { exports[key] = () => v; },
        //                 enumerable: true,
        //                 configurable: true
        //             });
        //         }
        //         delete modules[i].exports;
        //         modules[i].exports = {};
        //         for (const key in modules[i]) {
        //             if (!Reflect.has(exports, key)) continue;

        //             Object.defineProperty(modules[i].exports, key, {
        //                 get: () => exports[key](),
        //                 set: v => { exports[key] = () => v; },
        //                 enumerable: true,
        //                 configurable: true
        //             });
        //         }
        //     }
        //     modules = [];
        // }
        // // const originalPush = instance.push;
        // const predefine = function (target, prop, effect) {
        //     const value = target[prop];
        //     Object.defineProperty(target, prop, {
        //         get() { return value; },
        //         set(newValue) {
        //             Object.defineProperty(target, prop, {
        //                 value: newValue,
        //                 configurable: true,
        //                 enumerable: true,
        //                 writable: true
        //             });

        //             try {
        //                 effect(newValue);
        //             }
        //             catch (error) {
        //                 // eslint-disable-next-line no-console
        //                 console.error(error);
        //             }

        //             // eslint-disable-next-line no-setter-return
        //             return newValue;
        //         },
        //         configurable: true
        //     });
        // };
        // predefine(instance, "push", () => {
        //     patchAll();
        // });
        // predefine(instance, "push", () => {
        //     instance.push([[Symbol()], {}, require => {
        //         require.d = (target, exports) => {
        //             for (const key in exports) {
        //                 if (!Reflect.has(exports, key) || target[key]) continue;

        //                 Object.defineProperty(target, key, {
        //                     get: () => exports[key](),
        //                     set: v => { exports[key] = () => v; },
        //                     enumerable: true,
        //                     configurable: true
        //                 });
        //             }
        //         };
        //     }]);

        //     instance.pop();
        // });

        // console.log(process.env);
        // readFileSync("");
        // definePlugin();
        // window.RegisterPlugin = data => {

        // };

        function addLogger() {
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

        class Patcher {
            static get patches() {
                return this._patches || (this._patches = []);
            }

            /**
             * Returns all the patches done by a specific caller
             * @param {string} name - Name of the patch caller
             * @method
             */
            static getPatchesByCaller(name) {
                if (!name) return [];
                const patches = [];
                for (const patch of this.patches) {
                    for (const childPatch of patch.children) {
                        if (childPatch.caller === name)
                            patches.push(childPatch);
                    }
                }
                return patches;
            }

            /**
             * Unpatches all patches passed, or when a string is passed unpatches all
             * patches done by that specific caller.
             * @param {Array|string} patches - Either an array of patches to unpatch or a caller name
             */
            static unpatchAll(patches) {
                if (typeof patches === "string")
                    patches = this.getPatchesByCaller(patches);

                for (const patch of patches) {
                    patch.unpatch();
                }
            }

            static resolveModule(module) {
                if (
                    !module ||
                    typeof module === "function" ||
                    (typeof module === "object" && !Array.isArray(module))
                )
                    return module;
                if (typeof module === "string") return DiscordModules[module];
                if (Array.isArray(module))
                    return BdApi.Webpack.findByUniqueProperties(module);
                return null;
            }

            static makeOverride(patch) {
                return function () {
                    let returnValue;
                    if (!patch.children || !patch.children.length)
                        return patch.originalFunction.apply(this, arguments);
                    for (const superPatch of patch.children.filter(
                        c => c.type === "before"
                    )) {
                        try {
                            superPatch.callback(this, arguments);
                        } catch (err) {
                            console.error(
                                "Patcher",
                                `Could not fire before callback of ${patch.functionName} for ${superPatch.caller}`,
                                err
                            );
                        }
                    }

                    const insteads = patch.children.filter(
                        c => c.type === "instead"
                    );
                    if (!insteads.length) {
                        returnValue = patch.originalFunction.apply(
                            this,
                            arguments
                        );
                    } else {
                        for (const insteadPatch of insteads) {
                            try {
                                const tempReturn = insteadPatch.callback(
                                    this,
                                    arguments,
                                    patch.originalFunction.bind(this)
                                );
                                if (typeof tempReturn !== "undefined")
                                    returnValue = tempReturn;
                            } catch (err) {
                                console.error(
                                    "Patcher",
                                    `Could not fire instead callback of ${patch.functionName} for ${insteadPatch.caller}`,
                                    err
                                );
                            }
                        }
                    }

                    for (const slavePatch of patch.children.filter(
                        c => c.type === "after"
                    )) {
                        try {
                            const tempReturn = slavePatch.callback(
                                this,
                                arguments,
                                returnValue
                            );
                            if (typeof tempReturn !== "undefined")
                                returnValue = tempReturn;
                        } catch (err) {
                            console.error(
                                "Patcher",
                                `Could not fire after callback of ${patch.functionName} for ${slavePatch.caller}`,
                                err
                            );
                        }
                    }
                    return returnValue;
                };
            }

            static rePatch(patch) {
                patch.proxyFunction = patch.module[patch.functionName] =
                    this.makeOverride(patch);
            }

            static makePatch(module, functionName, name) {
                const patch = {
                    name,
                    module,
                    functionName,
                    originalFunction: module[functionName],
                    proxyFunction: null,
                    revert: () => {
                        // Calling revert will destroy any patches added to the same module after this
                        patch.module[patch.functionName] =
                            patch.originalFunction;
                        patch.proxyFunction = null;
                        patch.children = [];
                    },
                    counter: 0,
                    children: [],
                };
                patch.proxyFunction = module[functionName] =
                    this.makeOverride(patch);
                Object.assign(module[functionName], patch.originalFunction);
                module[functionName].__originalFunction =
                    patch.originalFunction;
                module[functionName].toString = () =>
                    patch.originalFunction.toString();
                this.patches.push(patch);
                return patch;
            }

            /**
             * Function with no arguments and no return value that may be called to revert changes made by {@link module:Patcher}, restoring (unpatching) original method.
             * @callback module:Patcher~unpatch
             */

            /**
             * A callback that modifies method logic. This callback is called on each call of the original method and is provided all data about original call. Any of the data can be modified if necessary, but do so wisely.
             *
             * The third argument for the callback will be `undefined` for `before` patches. `originalFunction` for `instead` patches and `returnValue` for `after` patches.
             *
             * @callback module:Patcher~patchCallback
             * @param {object} thisObject - `this` in the context of the original function.
             * @param {arguments} args - The original arguments of the original function.
             * @param {(function|*)} extraValue - For `instead` patches, this is the original function from the module. For `after` patches, this is the return value of the function.
             * @return {*} Makes sense only when using an `instead` or `after` patch. If something other than `undefined` is returned, the returned value replaces the value of `returnValue`. If used for `before` the return value is ignored.
             */

            /**
             * This method patches onto another function, allowing your code to run beforehand.
             * Using this, you are also able to modify the incoming arguments before the original method is run.
             *
             * @param {string} caller - Name of the caller of the patch function. Using this you can undo all patches with the same name using {@link module:Patcher.unpatchAll}. Use `""` if you don't care.
             * @param {object} moduleToPatch - Object with the function to be patched. Can also patch an object's prototype.
             * @param {string} functionName - Name of the method to be patched
             * @param {module:Patcher~patchCallback} callback - Function to run before the original method
             * @param {object} options - Object used to pass additional options.
             * @param {string} [options.displayName] You can provide meaningful name for class/object provided in `what` param for logging purposes. By default, this function will try to determine name automatically.
             * @param {boolean} [options.forcePatch=true] Set to `true` to patch even if the function doesnt exist. (Adds noop function in place).
             * @return {module:Patcher~unpatch} Function with no arguments and no return value that should be called to cancel (unpatch) this patch. You should save and run it when your plugin is stopped.
             */
            static before(
                caller,
                moduleToPatch,
                functionName,
                callback,
                options = {}
            ) {
                return this.pushChildPatch(
                    caller,
                    moduleToPatch,
                    functionName,
                    callback,
                    Object.assign(options, { type: "before" })
                );
            }

            /**
             * This method patches onto another function, allowing your code to run after.
             * Using this, you are also able to modify the return value, using the return of your code instead.
             *
             * @param {string} caller - Name of the caller of the patch function. Using this you can undo all patches with the same name using {@link module:Patcher.unpatchAll}. Use `""` if you don't care.
             * @param {object} moduleToPatch - Object with the function to be patched. Can also patch an object's prototype.
             * @param {string} functionName - Name of the method to be patched
             * @param {module:Patcher~patchCallback} callback - Function to run instead of the original method
             * @param {object} options - Object used to pass additional options.
             * @param {string} [options.displayName] You can provide meaningful name for class/object provided in `what` param for logging purposes. By default, this function will try to determine name automatically.
             * @param {boolean} [options.forcePatch=true] Set to `true` to patch even if the function doesnt exist. (Adds noop function in place).
             * @return {module:Patcher~unpatch} Function with no arguments and no return value that should be called to cancel (unpatch) this patch. You should save and run it when your plugin is stopped.
             */
            static after(
                caller,
                moduleToPatch,
                functionName,
                callback,
                options = {}
            ) {
                return this.pushChildPatch(
                    caller,
                    moduleToPatch,
                    functionName,
                    callback,
                    Object.assign(options, { type: "after" })
                );
            }

            /**
             * This method patches onto another function, allowing your code to run instead.
             * Using this, you are also able to modify the return value, using the return of your code instead.
             *
             * @param {string} caller - Name of the caller of the patch function. Using this you can undo all patches with the same name using {@link module:Patcher.unpatchAll}. Use `""` if you don't care.
             * @param {object} moduleToPatch - Object with the function to be patched. Can also patch an object's prototype.
             * @param {string} functionName - Name of the method to be patched
             * @param {module:Patcher~patchCallback} callback - Function to run after the original method
             * @param {object} options - Object used to pass additional options.
             * @param {string} [options.displayName] You can provide meaningful name for class/object provided in `what` param for logging purposes. By default, this function will try to determine name automatically.
             * @param {boolean} [options.forcePatch=true] Set to `true` to patch even if the function doesnt exist. (Adds noop function in place).
             * @return {module:Patcher~unpatch} Function with no arguments and no return value that should be called to cancel (unpatch) this patch. You should save and run it when your plugin is stopped.
             */
            static instead(
                caller,
                moduleToPatch,
                functionName,
                callback,
                options = {}
            ) {
                return this.pushChildPatch(
                    caller,
                    moduleToPatch,
                    functionName,
                    callback,
                    Object.assign(options, { type: "instead" })
                );
            }

            /**
             * This method patches onto another function, allowing your code to run before, instead or after the original function.
             * Using this you are able to modify the incoming arguments before the original function is run as well as the return
             * value before the original function actually returns.
             *
             * @param {string} caller - Name of the caller of the patch function. Using this you can undo all patches with the same name using {@link module:Patcher.unpatchAll}. Use `""` if you don't care.
             * @param {object} moduleToPatch - Object with the function to be patched. Can also patch an object's prototype.
             * @param {string} functionName - Name of the method to be patched
             * @param {module:Patcher~patchCallback} callback - Function to run after the original method
             * @param {object} options - Object used to pass additional options.
             * @param {string} [options.type=after] - Determines whether to run the function `before`, `instead`, or `after` the original.
             * @param {string} [options.displayName] You can provide meaningful name for class/object provided in `what` param for logging purposes. By default, this function will try to determine name automatically.
             * @param {boolean} [options.forcePatch=true] Set to `true` to patch even if the function doesnt exist. (Adds noop function in place).
             * @return {module:Patcher~unpatch} Function with no arguments and no return value that should be called to cancel (unpatch) this patch. You should save and run it when your plugin is stopped.
             */
            static pushChildPatch(
                caller,
                moduleToPatch,
                functionName,
                callback,
                options = {}
            ) {
                const { type = "after", forcePatch = true } = options;
                const module = this.resolveModule(moduleToPatch);
                if (!module) return null;
                if (!module[functionName] && forcePatch)
                    module[functionName] = function () { };
                if (!(module[functionName] instanceof Function)) return null;

                if (typeof moduleToPatch === "string")
                    options.displayName = moduleToPatch;
                const displayName =
                    options.displayName ||
                    module.displayName ||
                    module.name ||
                    module.constructor.displayName ||
                    module.constructor.name;

                const patchId = `${displayName}.${functionName}`;
                const patch =
                    this.patches.find(
                        p =>
                            p.module == module && p.functionName == functionName
                    ) || this.makePatch(module, functionName, patchId);
                if (!patch.proxyFunction) this.rePatch(patch);
                const child = {
                    caller,
                    type,
                    id: patch.counter,
                    callback,
                    unpatch: () => {
                        patch.children.splice(
                            patch.children.findIndex(
                                cpatch =>
                                    cpatch.id === child.id &&
                                    cpatch.type === type
                            ),
                            1
                        );
                        if (patch.children.length <= 0) {
                            const patchNum = this.patches.findIndex(
                                p =>
                                    p.module == module &&
                                    p.functionName == functionName
                            );
                            if (patchNum < 0) return;
                            this.patches[patchNum].revert();
                            this.patches.splice(patchNum, 1);
                        }
                    },
                };
                patch.children.push(child);
                patch.counter++;
                return child.unpatch;
            }
        }

        // class Patcher {
        //     static get patches() { return this._patches || (this._patches = []); }

        //     static getPatchesByCaller(name) {
        //         if (!name) return [];
        //         const patches = [];
        //         for (const patch of this.patches) {
        //             for (const childPatch of patch.children)
        //                 if (childPatch.caller === name) patches.push(childPatch);
        //         }
        //         return patches;
        //     }

        //     static unpatchAll(patches) {
        //         if (typeof patches === "string") patches = this.getPatchesByCaller(patches);
        //         for (const patch of patches) patch.unpatch();
        //     }

        //     static resolveModule(module) {
        //         if (!module || typeof module === "function" || (typeof module === "object" && !Array.isArray(module))) return module;
        //         if (typeof module === "string") return DiscordModules[module];
        //         if (Array.isArray(module)) return BdApi.findModuleByProps(...module);
        //         return null;
        //     }

        //     static makePatch(module, functionName, name) {
        //         const patch = {
        //             name,
        //             module,
        //             functionName,
        //             originalFunction: module[functionName],
        //             revert: () => {
        //                 for (const child of patch.children) child.unpatch?.();
        //                 patch.children = [];
        //             },
        //             counter: 0,
        //             children: []
        //         };

        //         this.patches.push(patch);
        //         return patch;
        //     }

        //     static before(caller, module, functionName, callback, options = {}) {
        //         return this.pushChildPatch(caller, module, functionName, callback, { ...options, type: "before" });
        //     }

        //     static instead(caller, module, functionName, callback, options = {}) {
        //         return this.pushChildPatch(caller, module, functionName, callback, { ...options, type: "instead" });
        //     }

        //     static after(caller, module, functionName, callback, options = {}) {
        //         return this.pushChildPatch(caller, module, functionName, callback, { ...options, type: "after" });
        //     }

        //     static pushChildPatch(caller, module, functionName, callback, options = {}) {
        //         const { type = "after", forcePatch = true } = options;
        //         const mdl = this.resolveModule(module);
        //         if (!mdl) return null;
        //         if (!mdl[functionName] && forcePatch) mdl[functionName] = function () { };
        //         if (typeof mdl[functionName] !== "function") return null;

        //         const displayName = options.displayName || module.displayName || module.name || module.constructor.displayName || module.constructor.name;

        //         const patchId = `${displayName}.${functionName}`;
        //         const patch = this.patches.find(p => p.module == module && p.functionName === functionName) || this.makePatch(module, functionName, patchId);

        //         const child = {
        //             caller,
        //             type,
        //             id: patch.counter,
        //             callback,
        //             unpatch: BdApi.monkeyPatch(mdl, functionName, {
        //                 [type]: data => {
        //                     const r = callback(data.thisObject, data.methodArguments, data.returnValue);
        //                     if (r !== undefined) data.returnValue = r;
        //                 }
        //             })
        //         };
        //         patch.children.push(child);
        //         patch.counter++;
        //         return child.unpatch;
        //     }
        // }

        window.GeneratedPlugins = [];
        const BdApiReimpl = {
            // "Testogus": () => {
            //     console.log("test123");
            // },
            // Patcher: {
            // unpatchAll: () => { },
            // },
            Patcher,
            UI: new UI(),
            Plugins: {
                getAll: () => {
                    // return Vencord.Plugins.plugins;
                    return GeneratedPlugins;
                },
                // "getAll": () => {
                //     return [{
                //         "id": ZeresPluginLibrary
                //     }];
                // },
                isEnabled: name => {
                    return Vencord.Plugins.isPluginEnabled(name);
                },
                get: function (name) {
                    return this.getAll().filter(x => x.name == name)[0];
                },
                reload: name => {
                    Vencord.Plugins.stopPlugin(Vencord.Plugins.plugins[name]);
                    Vencord.Plugins.startPlugin(Vencord.Plugins.plugins[name]);
                },
                // rootFolder: "/BD",
                // folder: (function () { return window.BdApi.Plugins.rootFolder + "/plugins"; })(),
                // folder: "/BD/plugins",
                rootFolder: "/BD",
                get folder() {
                    return this.rootFolder + "/plugins";
                },
            },
            DOM: {
                addStyle(id, css) {
                    id = id.replace(/^[^a-z]+|[^\w-]+/gi, "-");
                    const style =
                        document
                            .querySelector("bd-styles")
                            .querySelector(`#${id}`) ||
                        this.createElement("style", { id });
                    style.textContent = css;
                    document.querySelector("bd-styles").append(style);
                },
                removeStyle(id) {
                    id = id.replace(/^[^a-z]+|[^\w-]+/gi, "-");
                    const exists = document
                        .querySelector("bd-styles")
                        .querySelector(`#${id}`);
                    if (exists) exists.remove();
                },
                createElement(tag, options = {}, child = null) {
                    const { className, id, target } = options;
                    const element = document.createElement(tag);
                    if (className) element.className = className;
                    if (id) element.id = id;
                    if (child) element.append(child);
                    if (target) document.querySelector(target).append(element);
                    return element;
                },
            },
            Components: {
                get Tooltip() {
                    return BdApiReimpl.Webpack.getModule(
                        x => x.prototype.renderTooltip,
                        { searchExports: true }
                    );
                },
            },
            get React() {
                return Vencord.Webpack.Common.React;
            },
            Webpack: {
                Filters: {
                    byDisplayName: name => {
                        return module => {
                            return module && module.displayName === name;
                        };
                    },
                    byProps: (...props) => {
                        return Vencord.Webpack.filters.byProps(...props);
                    },
                    byStoreName(name) {
                        return module => {
                            return (
                                module?._dispatchToken &&
                                module?.getName?.() === name
                            );
                        };
                    },
                },
                /**
                 * @param {function} filter
                 * @param {*} options
                 * @returns
                 */
                getModule(filter, options) {
                    // if (typeof options === "undefined")
                    //     options = {
                    //         first: true,
                    //     };
                    if (typeof options === "undefined") options = {};
                    // return options.first === false ? Vencord.Webpack.findAll(filter) : Vencord.Webpack.find(filter);
                    // return;
                    // if (typeof options.first === "undefined")
                    //     options.first = true;

                    // if (filter.toString().includes("?.displayName")) {

                    // }
                    // // console.log("Options:", options);
                    // // if ()
                    // try {
                    //     if (!options.first)
                    //         return Vencord.Webpack.findAll(filter);
                    //     else
                    //         return Vencord.Webpack.find(filter);
                    // } catch (error) {
                    //     console.log("Options:", options);
                    //     console.warn("Module not found: " + filter.toString());
                    //     return undefined;
                    // }
                    const wrapFilter =
                        filter => (exports, module, moduleId) => {
                            try {
                                if (
                                    exports?.default?.remove &&
                                    exports?.default?.set &&
                                    exports?.default?.clear &&
                                    exports?.default?.get &&
                                    !exports?.default?.sort
                                )
                                    return false;
                                if (
                                    exports.remove &&
                                    exports.set &&
                                    exports.clear &&
                                    exports.get &&
                                    !exports.sort
                                )
                                    return false;
                                if (
                                    exports?.default?.getToken ||
                                    exports?.default?.getEmail ||
                                    exports?.default?.showToken
                                )
                                    return false;
                                if (
                                    exports.getToken ||
                                    exports.getEmail ||
                                    exports.showToken
                                )
                                    return false;
                                return filter(exports, module, moduleId);
                            } catch (err) {
                                return false;
                            }
                        };

                    const {
                        first = true,
                        defaultExport = true,
                        searchExports = false,
                    } = options;
                    const wrappedFilter = wrapFilter(filter);

                    const modules = Vencord.Webpack.cache;
                    /*
                    const rm = [];
                    const indices = Object.keys(modules);
                    for (let i = 0; i < indices.length; i++) {
                        const index = indices[i];
                        // eslint-disable-next-line no-prototype-builtins
                        if (!modules.hasOwnProperty(index)) continue;
                        const module = modules[index];
                        const { exports } = module;
                        if (!exports || exports === window || exports === document.documentElement) continue;

                        if (typeof (exports) === "object" && searchExports) {
                            for (const key in exports) {
                                let foundModule = null;
                                const wrappedExport = exports[key];
                                if (!wrappedExport) continue;
                                if (wrappedFilter(wrappedExport, module, index)) foundModule = wrappedExport;
                                if (!foundModule) continue;
                                if (first) return foundModule;
                                rm.push(foundModule);
                            }
                        }
                        else {
                            let foundModule = null;
                            if (exports.Z && wrappedFilter(exports.Z, module, index)) foundModule = defaultExport ? exports.Z : exports;
                            if (exports.ZP && wrappedFilter(exports.ZP, module, index)) foundModule = defaultExport ? exports.ZP : exports;
                            if (exports.__esModule && exports.default && wrappedFilter(exports.default, module, index)) foundModule = defaultExport ? exports.default : exports;
                            if (wrappedFilter(exports, module, index)) foundModule = exports;
                            if (!foundModule) continue;
                            if (first) return foundModule;
                            rm.push(foundModule);
                        }
                    }

                    // eslint-disable-next-line eqeqeq
                    return first || rm.length == 0 ? undefined : rm;
                    */
                    const rm = [];
                    const indices = Object.keys(modules);
                    for (let i = 0; i < indices.length; i++) {
                        const index = indices[i];
                        // eslint-disable-next-line no-prototype-builtins
                        if (!modules.hasOwnProperty(index)) continue;

                        let module = null;
                        try {
                            module = modules[index];
                        } catch {
                            continue;
                        }

                        const { exports } = module;
                        if (
                            !exports ||
                            exports === window ||
                            exports === document.documentElement ||
                            exports[Symbol.toStringTag] === "DOMTokenList"
                        )
                            continue;

                        if (
                            typeof exports === "object" &&
                            searchExports &&
                            !exports.TypedArray
                        ) {
                            for (const key in exports) {
                                let foundModule = null;
                                let wrappedExport = null;
                                try {
                                    wrappedExport = exports[key];
                                } catch {
                                    continue;
                                }

                                if (!wrappedExport) continue;
                                if (wrappedFilter(wrappedExport, module, index))
                                    foundModule = wrappedExport;
                                if (!foundModule) continue;
                                if (first) return foundModule;
                                rm.push(foundModule);
                            }
                        } else {
                            let foundModule = null;
                            if (
                                exports.Z &&
                                wrappedFilter(exports.Z, module, index)
                            )
                                foundModule = defaultExport
                                    ? exports.Z
                                    : exports;
                            if (
                                exports.ZP &&
                                wrappedFilter(exports.ZP, module, index)
                            )
                                foundModule = defaultExport
                                    ? exports.ZP
                                    : exports;
                            if (
                                exports.__esModule &&
                                exports.default &&
                                wrappedFilter(exports.default, module, index)
                            )
                                foundModule = defaultExport
                                    ? exports.default
                                    : exports;
                            if (wrappedFilter(exports, module, index))
                                foundModule = exports;
                            if (!foundModule) continue;
                            if (first) return foundModule;
                            rm.push(foundModule);
                        }
                    }
                    return first || rm.length == 0 ? undefined : rm;
                },
                waitForModule(filter) {
                    return new Promise((resolve, reject) => {
                        Vencord.Webpack.waitFor(filter, module => {
                            resolve(module);
                        });
                    });
                },
                getByDisplayName(name) {
                    return this.getModule(
                        BdApi.Webpack.Filters.byDisplayName(name)
                    );
                },
                getAllByProps(...props) {
                    return this.getModule(this.Filters.byProps(...props), {
                        first: false,
                    });
                },
                getByProps(...props) {
                    return this.getModule(this.Filters.byProps(...props), {});
                },
                getByPrototypes(...fields) {
                    return this.getModule(
                        x =>
                            x.prototype &&
                            fields.every(field => field in x.prototype),
                        {}
                    );
                },
                findByUniqueProperties(props, first = true) {
                    return first
                        ? this.getByProps(...props)
                        : this.getAllByProps(...props);
                },
                getStore(name) {
                    return this.getModule(this.Filters.byStoreName(name));
                },
                // require: (() => {
                //     return Vencord.Webpack.wreq;
                // })(),
                get require() {
                    return Vencord.Webpack.wreq;
                },
                get modules() {
                    // this function is really really wrong
                    const { cache } = Vencord.Webpack;
                    const result = {};

                    for (const key in cache) {
                        // eslint-disable-next-line no-prototype-builtins
                        if (
                            cache.hasOwnProperty(key) &&
                            cache[key].hasOwnProperty("exports")
                        ) {
                            result[key] = cache[key].exports;
                        }
                    }
                    return result;
                },
            },
            isSettingEnabled(collection, category, id) {
                return false;
            },
            enableSetting(collection, category, id) { },
            disableSetting(collection, category, id) { },
            // getData(pluginName, key) {
            //     return Vencord.Settings.plugins[pluginName] ? Vencord.Settings.plugins[pluginName][key] : {};
            // },
            // setData(pluginName, key, value) {
            //     if (!Vencord.Settings.plugins[pluginName])
            //         Vencord.Settings.plugins[pluginName] = {};
            //     Vencord.Settings.plugins[pluginName][key] = value;
            // },
            Data: {
                load(...args) {
                    return BdApiReimpl.getData(...args);
                },
                save(...args) {
                    return BdApiReimpl.setData(...args);
                },
            },
            pluginData: {},
            getData(key, value) {
                // if (!this.pluginData[key]) {
                //     if (!window.require("fs").existsSync(BdApiReimpl.Plugins.folder + "/" + key + ".config.json"))
                //         this.pluginData[key] = {};
                //     this.pluginData[key] = JSON.parse(window.require("fs").readFileSync(BdApiReimpl.Plugins.folder + "/" + key + ".config.json"));
                // }
                if (!value || !key) return;
                this.latestDataCheck(key);
                return this.pluginData[key][value];
            },
            latestDataCheck(key) {
                if (typeof this.pluginData[key] !== "undefined") return;
                if (
                    !window
                        .require("fs")
                        .existsSync(
                            BdApiReimpl.Plugins.folder +
                            "/" +
                            key +
                            ".config.json"
                        )
                ) {
                    this.pluginData[key] = {};
                    return;
                }
                this.pluginData[key] = JSON.parse(
                    window
                        .require("fs")
                        .readFileSync(
                            BdApiReimpl.Plugins.folder +
                            "/" +
                            key +
                            ".config.json"
                        )
                );
            },
            setData(key, value, data) {
                if (!value || !key || !data) return;
                this.latestDataCheck(key);
                this.pluginData[key][value] = data;
                window
                    .require("fs")
                    .writeFileSync(
                        BdApiReimpl.Plugins.folder + "/" + key + ".config.json",
                        JSON.stringify(this.pluginData[key], null, 4)
                    );
            },
            findModuleByProps(...props) {
                return BdApi.findModule(module =>
                    props.every(prop => typeof module[prop] !== "undefined")
                );
            },
            findModule(filter) {
                return this.Webpack.getModule(filter);
            },
            __injectAfter(data, origMethod) {
                const patchID = `bd-patch-after-${data.displayName.toLowerCase()}-${this.__generateRandomHexString()}`;

                const cancelPatch = () => {
                    if (!data.options.silent)
                        console.log(
                            `Unpatching after of ${data.displayName} ${data.methodName}`
                        );
                    uninject(patchID);
                };

                inject(
                    patchID,
                    data.what,
                    data.methodName,
                    function afterPatch(args, res) {
                        const patchData = {
                            // eslint-disable-next-line no-invalid-this
                            thisObject: this,
                            methodArguments: args,
                            returnValue: res,
                            cancelPatch: cancelPatch,
                            originalMethod: origMethod,
                            callOriginalMethod: () =>
                                (patchData.returnValue =
                                patchData.originalMethod.apply(
                                    patchData.thisObject,
                                    patchData.methodArguments
                                )),
                        };

                        try {
                            data.options.after(patchData);
                        } catch (err) {
                            console.error(
                                err,
                                `Error in after callback of ${data.displayName} ${data.methodName}`
                            );
                        }

                        if (data.options.once) cancelPatch();

                        return patchData.returnValue;
                    },
                    false
                );

                return cancelPatch;
            },
            __injectBefore(data, origMethod) {
                const patchID = `bd-patch-before-${data.displayName.toLowerCase()}-${this.__generateRandomHexString()}`;

                const cancelPatch = () => {
                    if (!data.options.silent)
                        console.log(
                            `Unpatching before of ${data.displayName} ${data.methodName}`
                        );
                    uninject(patchID);
                };

                inject(
                    patchID,
                    data.what,
                    data.methodName,
                    function beforePatch(args, res) {
                        const patchData = {
                            // eslint-disable-next-line no-invalid-this
                            thisObject: this,
                            methodArguments: args,
                            returnValue: res,
                            cancelPatch: cancelPatch,
                            originalMethod: origMethod,
                            callOriginalMethod: () =>
                                (patchData.returnValue =
                                patchData.originalMethod.apply(
                                    patchData.thisObject,
                                    patchData.methodArguments
                                )),
                        };

                        try {
                            data.options.before(patchData);
                        } catch (err) {
                            console.error(
                                err,
                                `Error in before callback of ${data.displayName} ${data.methodName}`
                            );
                        }

                        if (data.options.once) cancelPatch();

                        return patchData.methodArguments;
                    },
                    true
                );

                return cancelPatch;
            },
            monkeyPatch(what, methodName, options = {}) {
                const displayName =
                    options.displayName ||
                    what.displayName ||
                    what[methodName].displayName ||
                    what.name ||
                    what.constructor.displayName ||
                    what.constructor.name ||
                    "MissingName";

                // if (options.instead) return BdApi.__warn('Powercord API currently does not support replacing the entire method!')

                if (!what[methodName])
                    if (options.force) {
                        // eslint-disable-next-line no-empty-function
                        what[methodName] = function forcedFunction() { };
                    } else {
                        return console.error(
                            null,
                            `${methodName} doesn't exist in ${displayName}!`
                        );
                    }

                if (!options.silent)
                    console.log(
                        `Patching ${displayName}'s ${methodName} method`
                    );

                const origMethod = what[methodName];

                if (options.instead) {
                    const cancel = () => {
                        if (!options.silent)
                            console.log(
                                `Unpatching instead of ${displayName} ${methodName}`
                            );
                        what[methodName] = origMethod;
                    };
                    what[methodName] = function () {
                        const data = {
                            thisObject: this,
                            methodArguments: arguments,
                            cancelPatch: cancel,
                            originalMethod: origMethod,
                            callOriginalMethod: () =>
                                (data.returnValue = data.originalMethod.apply(
                                    data.thisObject,
                                    data.methodArguments
                                )),
                        };
                        const tempRet = BdApi.suppressErrors(
                            options.instead,
                            "`instead` callback of " +
                            what[methodName].displayName
                        )(data);
                        if (tempRet !== undefined) data.returnValue = tempRet;
                        return data.returnValue;
                    };
                    if (displayName != "MissingName")
                        what[methodName].displayName = displayName;
                    return cancel;
                }

                const patches = [];
                if (options.before)
                    patches.push(
                        BdApi.__injectBefore(
                            { what, methodName, options, displayName },
                            origMethod
                        )
                    );
                if (options.after)
                    patches.push(
                        BdApi.__injectAfter(
                            { what, methodName, options, displayName },
                            origMethod
                        )
                    );
                if (displayName != "MissingName")
                    what[methodName].displayName = displayName;

                const finalCancelPatch = () =>
                    patches.forEach(patch => patch());

                return finalCancelPatch;
            },
            suppressErrors(method, message = "") {
                return (...params) => {
                    try {
                        return method(...params);
                    } catch (err) {
                        console.error(err, `Error occured in ${message}`);
                    }
                };
            },
            __generateRandomHexString() {
                const randomBytes = new Uint8Array(4);
                window.crypto.getRandomValues(randomBytes);
                const hexString = Array.from(randomBytes)
                    .map(b => ("00" + b.toString(16)).slice(-2))
                    .join("");
                return hexString;
            },
        };
        const ReImplementationObject = {
            /*  "fs": {
                 "writeFile": () => Promise.resolve(),
             }, */
            // "path": {
            //     dirname: function (path) {
            //         // eslint-disable-next-line no-useless-escape
            //         return path.replace(/\\/g, "/").replace(/\/[^\/]*$/, "");
            //     },
            //     basename: function (path) {
            //         return path.replace(/\\/g, "/").replace(/^.*\//, "");
            //     },
            //     extname: function (path) {
            //         // eslint-disable-next-line no-useless-escape
            //         return path.replace(/^.*(\.[^\.]*)$/, "$1");
            //     },
            //     join: function () {
            //         var args = Array.prototype.slice.call(arguments);
            //         return args.join("/").replace(/\/{2,}/g, "/");
            //     },
            //     normalize: function (path) {
            //         return path.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
            //     },
            //     resolve: function () {
            //         var args = Array.prototype.slice.call(arguments);
            //         return path.normalize(args.join("/").replace(/\/{2,}/g, "/"));
            //     }
            // },
            request: (url, cb) => {
                cb({ err: "err" }, undefined, undefined);
            },
            events: {
                EventEmitter: FakeEventEmitter,
            },
            electron: {},
        };
        const RequireReimpl = name => {
            return ReImplementationObject[name];
        };
        window.BdApi = BdApiReimpl;
        // window.BdApi.UI = new UI();
        window.require = RequireReimpl;
        window.BdApi.ReqImpl = ReImplementationObject;

        const DiscordModulesInjectorOutput = addDiscordModules();
        const DiscordModules = DiscordModulesInjectorOutput.output;
        windowBdCompatLayer.discordModulesBlobUrl = DiscordModulesInjectorOutput.sourceBlobUrl;
        // const WebpackModules = (function () {
        //     return BdApi.Webpack;
        // })();
        // const ModuleDataText = this.simpleGET(
        //     proxyUrl +
        //     "https://github.com/BetterDiscord/BetterDiscord/raw/main/renderer/src/modules/discordmodules.js"
        // ).responseText.replaceAll("\r", "");
        // // const ev = "(" + ModuleDataText.split("export default Utilities.memoizeObject(")[1].replaceAll("WebpackModules", "BdApi.Webpack");
        // const ev =
        //     "(" +
        //     ModuleDataText.split("export default Utilities.memoizeObject(")[1];
        // const sourceBlob = new Blob([ev], { type: "application/javascript" });
        // const sourceBlobUrl = URL.createObjectURL(sourceBlob);
        // DiscordModules = eval(ev + "\n//# sourceURL=" + sourceBlobUrl);
        function summonInjector(simpleGET) {
            /**
             * @type {string}
             */
            const ModuleDataText = simpleGET(
                proxyUrl +
                "https://github.com/powercord-org/powercord/raw/v2/src/fake_node_modules/powercord/injector/index.js"
            ).responseText.replaceAll("\r", "");
            const ModuleDataAssembly =
                "(()=>{const module = { exports: {} };" +
                ModuleDataText +
                "\nreturn module;})();";
            const sourceBlob = new Blob([ModuleDataAssembly], {
                type: "application/javascript",
            });
            const sourceBlobUrl = URL.createObjectURL(sourceBlob);
            return eval(ModuleDataAssembly + "\n//# sourceURL=" + sourceBlobUrl)
                .exports;
        }

        // const { inject, uninject } = summonInjector(this.simpleGET);

        const ContextMenuInjectorOutput = addContextMenu();
        const ContextMenu = ContextMenuInjectorOutput.output;
        windowBdCompatLayer.contextMenuBlobUrl = ContextMenuInjectorOutput.sourceBlobUrl;
        BdApiReimpl.ContextMenu = ContextMenu;

        const fakeLoading = document.createElement("span");
        fakeLoading.style.display = "none";
        fakeLoading.id = "bd-loading-icon";
        document.body.appendChild(fakeLoading);
        setTimeout(() => {
            fakeLoading.remove();
        }, 500);
        const fakeBdStyles = document.createElement("bd-styles");
        document.body.appendChild(fakeBdStyles);
        // const checkInterval = setInterval(() => {
        //     if (window.BdApi.ReqImpl.fs === undefined)
        //         return;
        //     clearInterval(checkInterval);
        windowBdCompatLayer.fsReadyPromise.promise.then(() => {
            // for (const key in this.options) {
            //     if (Object.hasOwnProperty.call(this.options, key)) {
            //         if (Settings.plugins[this.name][key]) {
            //             try {
            //                 const url = Settings.plugins[this.name][key];
            //                 const filenameFromUrl = url.split("/").pop();
            //                 // this.convertPlugin(this.simpleGET(proxyUrl + url).responseText, filenameFromUrl).then(plugin => {
            //                 this.convertPlugin(this.simpleGET(proxyUrl + url).responseText, filenameFromUrl).then(plugin => {
            //                     this.addCustomPlugin(plugin);
            //                 });
            //             } catch (error) {
            //                 console.error(error, "\nWhile loading: " + Settings.plugins[this.name][key]);
            //             }
            //         }
            //     }
            // }
            const localFs = window.require("fs");
            if (!localFs.existsSync(BdApiReimpl.Plugins.folder)) {
                // localFs.mkdirSync(BdApiReimpl.Plugins.rootFolder);
                // localFs.mkdirSync(BdApiReimpl.Plugins.folder);
                Utils.mkdirSyncRecursive(BdApiReimpl.Plugins.folder);
            }
            for (const key in this.options) {
                if (Object.hasOwnProperty.call(this.options, key)) {
                    if (Settings.plugins[this.name][key]) {
                        try {
                            const url = Settings.plugins[this.name][key];
                            // const filenameFromUrl = url.split("/").pop();
                            const response = this.simpleGET(proxyUrl + url);
                            const filenameFromUrl = response.responseURL
                                .split("/")
                                .pop();
                            // this.convertPlugin(this.simpleGET(proxyUrl + url).responseText, filenameFromUrl).then(plugin => {

                            localFs.writeFileSync(
                                window.BdApi.Plugins.folder +
                                "/" +
                                filenameFromUrl,
                                response.responseText
                            );
                        } catch (error) {
                            console.error(
                                error,
                                "\nWhile loading: " +
                                Settings.plugins[this.name][key]
                            );
                        }
                    }
                }
            }

            const pluginFolder = localFs
                .readdirSync(BdApiReimpl.Plugins.folder)
                .sort();
            const plugins = pluginFolder.filter(x =>
                x.endsWith(".plugin.js")
            );
            for (let i = 0; i < plugins.length; i++) {
                const element = plugins[i];
                const pluginJS = localFs.readFileSync(
                    BdApiReimpl.Plugins.folder + "/" + element,
                    "utf8"
                );
                this.convertPlugin(pluginJS, element).then(plugin => {
                    this.addCustomPlugin(plugin);
                });
            }
        });
    },
    findFirstLineWithoutX(str, x) {
        const lines = str.split("\n");
        for (let i = 0; i < lines.length; i++) {
            if (!lines[i].startsWith(x)) {
                return i + 1; // Return line number (1-indexed)
            }
        }
        return -1; // If no line is found, return -1
    },
    async addCustomPlugin(generatedPlugin) {
        /**
         * @type {{GeneratedPlugins: Array}}
         */
        const { GeneratedPlugins } = window;
        const generated = generatedPlugin;
        Vencord.Plugins.plugins[generated.name] = generated;
        Vencord.Settings.plugins[generated.name].enabled = true;
        Vencord.Plugins.startPlugin(generated);
        GeneratedPlugins.push(generated);
    },
    async removeAllCustomPlugins() {
        const arrayToObject = array => {
            const object = array.reduce((obj, element, index) => {
                obj[index] = element;
                return obj;
            }, {});
            return object;
        };

        /**
         * @type {{GeneratedPlugins: Array}}
         */
        const { GeneratedPlugins } = window;
        const copyOfGeneratedPlugin = arrayToObject(GeneratedPlugins);
        const removePlugin = generatedPlugin => {
            const generated = generatedPlugin;
            Vencord.Settings.plugins[generated.name].enabled = false;
            Vencord.Plugins.stopPlugin(generated);
            delete Vencord.Plugins.plugins[generated.name];
            // copyOfGeneratedPlugin.splice(copyOfGeneratedPlugin.indexOf(generated), 1);
            delete copyOfGeneratedPlugin[GeneratedPlugins.indexOf(generated)];
        };
        for (let i = 0; i < GeneratedPlugins.length; i++) {
            const element = GeneratedPlugins[i];
            removePlugin(element);
        }
        GeneratedPlugins.length = 0;
    },
    /**
     * @param {string} BetterDiscordPlugin
     * @returns {Plugin}
     */
    async convertPlugin(BetterDiscordPlugin, filename) {
        const final = {};
        final.started = false;
        // final.patches = [];
        final.authors = [
            {
                id: 0n,
            },
        ];
        final.name = "";
        final.internals = {};
        final.description = "";
        final.id = "";
        final.start = () => { };
        final.stop = () => { };
        const { React } = Vencord.Webpack.Common;
        const openSettingsModal = () => {
            openModal(props => {
                // let el = final.instance.getSettingsPanel();
                // if (el instanceof Node) {
                //     el = Vencord.Webpack.Common.React.createElement("div", { dangerouslySetInnerHTML: { __html: el.outerHTML } });
                // }
                const panel = final.instance.getSettingsPanel();
                let child = panel;
                if (panel instanceof Node || typeof panel === "string")
                    child = class ReactWrapper extends React.Component {
                        constructor(props) {
                            super(props);
                            this.elementRef = React.createRef();
                            this.element = panel;
                            this.state = { hasError: false };
                        }

                        componentDidCatch() {
                            this.setState({ hasError: true });
                        }

                        componentDidMount() {
                            if (this.element instanceof Node)
                                this.elementRef.current.appendChild(
                                    this.element
                                );
                        }

                        render() {
                            if (this.state.hasError) return null;
                            const props = {
                                className: "bd-addon-settings-wrap",
                                ref: this.elementRef,
                            };
                            if (typeof this.element === "string")
                                props.dangerouslySetInnerHTML = {
                                    __html: this.element,
                                };
                            return React.createElement("div", props);
                        }
                    };
                if (typeof child === "function")
                    child = React.createElement(child);

                const modal = props => {
                    const mc = BdApi.Webpack.getByProps("Header", "Footer");
                    const TextElement = BdApi.Webpack.getModule(
                        m => m?.Sizes?.SIZE_32 && m.Colors
                    );
                    const Buttons = BdApi.Webpack.getModule(
                        m => m.BorderColors,
                        { searchExports: true }
                    );
                    return React.createElement(
                        ErrorBoundary,
                        {},
                        React.createElement(
                            ModalRoot,
                            Object.assign(
                                {
                                    size: mc.Sizes.MEDIUM,
                                    className:
                                        "bd-addon-modal" +
                                        " " +
                                        mc.Sizes.MEDIUM,
                                },
                                props
                            ),
                            React.createElement(
                                mc.Header,
                                {
                                    separator: false,
                                    className: "bd-addon-modal-header",
                                },
                                React.createElement(
                                    TextElement,
                                    {
                                        tag: "h1",
                                        size: TextElement.Sizes.SIZE_20,
                                        strong: true,
                                    },
                                    `${final.name} Settings`
                                )
                            ),
                            React.createElement(
                                mc.Content,
                                { className: "bd-addon-modal-settings" },
                                React.createElement(ErrorBoundary, {}, child)
                            ),
                            React.createElement(
                                mc.Footer,
                                { className: "bd-addon-modal-footer" },
                                React.createElement(
                                    Buttons,
                                    {
                                        onClick: props.onClose,
                                        className: "bd-button",
                                    },
                                    "Close"
                                )
                            )
                        )
                    );
                };
                return modal(props);
            });
        };
        final.options = {
            openSettings: {
                type: OptionType.COMPONENT,
                description: "Open settings",
                component: () =>
                    React.createElement(
                        Vencord.Webpack.Common.Button,
                        { onClick: openSettingsModal },
                        "Open settings"
                    ),
            },
        };

        let metaEndLine = 0;
        /**
         * @param {string} data
         */
        function generateMeta(data) {
            /**
             * @type {string[]}
             */
            const metadata = data
                .split("/**")[1]
                .split("*/")[0]
                .replaceAll("\n", "")
                .split("*")
                .filter(x => x !== "" && x !== " ");
            metaEndLine = metadata.length + 3;
            for (let i = 0; i < metadata.length; i++) {
                const element = metadata[i].trim();
                if (element.startsWith("@name")) {
                    final.name = element.split("@name")[1].trim();
                    final.id = final.name;
                }
                if (element.startsWith("@description")) {
                    final.description = element.split("@description ")[1];
                }
                if (element.startsWith("@authorId")) {
                    final.authors[0].id = Number(
                        element.split("@authorId ")[1] + "n"
                    );
                }
                if (element.startsWith("@author")) {
                    final.authors[0].name = element.split("@author ")[1];
                }
            }
        }

        function evalInContext(js, context) {
            // Return the results of the in-line anonymous function we .call with the passed context
            return function () {
                return eval(js);
            }.call(context);
        }

        /**
         * @param {string} data
         */
        function generateCode(data) {
            // const lines = data.split("\n");
            // const desiredLine = metaEndLine;
            // let codeData = lines.slice(desiredLine - 1).join("\n");
            let codeData = data;
            // console.log(codeData);
            // const context = {
            // "generatedClass": null,
            // };
            const debugLine =
                "\ntry{" + codeData + "}catch(e){console.error(e);debugger;}";
            const additionalCode = [
                "const module = { exports: {} };",
                "const global = window;",
                "const __filename=BdApi.Plugins.folder+`/" + filename + "`;",
                "const __dirname=BdApi.Plugins.folder;",
                "const DiscordNative={clipboard:{}};",
                // "debugger;",
            ];
            // codeData = "(()=>{const module = { exports: {} };const global = window;const __filename=BdApi.Plugins.folder+`/" + filename + "`;const __dirname=BdApi.Plugins.folder;debugger;" + (true ? debugLine : codeData) + "\nreturn module;})();\n";
            // eslint-disable-next-line no-constant-condition
            codeData =
                "(()=>{" +
                additionalCode.join("") +
                (true ? debugLine : codeData) +
                "\nreturn module;})();\n";
            const sourceBlob = new Blob([codeData], {
                type: "application/javascript",
            });
            const sourceBlobUrl = URL.createObjectURL(sourceBlob);
            codeData += "\n//# sourceURL=" + sourceBlobUrl;
            if (!window.GeneratedPluginsBlobs)
                window.GeneratedPluginsBlobs = {};
            window.GeneratedPluginsBlobs[final.name] = sourceBlobUrl;
            // codeData = codeData.replaceAll("module.exports = ", "this.generatedClass = ");
            // window.GeneratedPlugins[final.name] = evalInContext(codeData, context);
            // const codeClass = evalInContext(codeData, context);
            const codeClass = eval.call(window, codeData);
            // const functions = Object.getOwnPropertyNames(codeClass.prototype);

            // for (let i = 0; i < functions.length; i++) {
            //     const element = functions[i];
            //     final[element] = codeClass.prototype[element];
            // }
            final.internals = {
                module: codeClass,
            };
        }

        /**
         * @param {string} data
         */
        function generateFunctions() {
            let { exports } = final.internals.module;
            if (typeof exports === "object") {
                exports = exports[final.name];
            }
            final.instance = new exports();
            const functions = Object.getOwnPropertyNames(exports.prototype);

            for (let i = 0; i < functions.length; i++) {
                const element = functions[i];
                // if (final.instance[element].bind)
                //     final[element] = final.instance[element].bind(final.instance);
                // else
                final[element] = final.instance[element];
            }
        }

        generateMeta(BetterDiscordPlugin);
        generateCode(BetterDiscordPlugin);
        generateFunctions(BetterDiscordPlugin);
        if (final.instance.getName) final.name = final.instance.getName();
        if (final.instance.getVersion)
            final.version = final.instance.getVersion();
        if (final.instance.getDescription)
            final.description = final.instance.getDescription();
        // if (final.instance.getAuthor)
        //     final.authors[0].id = final.instance.getAuthor();
        // eslint-disable-next-line eqeqeq
        // if (final.start.toString() == (() => { }).toString() && typeof final.instance.onStart === "function") {
        //     final.start = final.instance.onStart.bind(final.instance);
        //     final.stop = final.instance.onStop.bind(final.instance);
        // }
        const startFunction = function () {
            this.instance.start();
        };
        const stopFunction = function () {
            this.instance.stop();
        };
        final.start = startFunction.bind(final);
        final.stop = stopFunction.bind(final);
        console.log(final);
        return final;
    },
    async stop() {
        console.warn("Removing plugins...");
        await this.removeAllCustomPlugins();
        console.warn("Removing compat layer...");
        delete window.BdCompatLayer;
        console.warn("Removing BdApi...");
        delete window.BdApi;
        console.warn("Freeing blobs...");
        Object.values(window.GeneratedPluginsBlobs).forEach(x => {
            URL.revokeObjectURL(x);
            delete window.GeneratedPluginsBlobs[x];
        });
        URL.revokeObjectURL(windowBdCompatLayer.contextMenuBlobUrl);
        URL.revokeObjectURL(windowBdCompatLayer.discordModulesBlobUrl);
        if (window.zip) {
            console.warn("Removing ZIP...");
            delete window.zip;
        }
        console.warn("Removing FileSystem...");
        delete window.BrowserFS;
    },
};

export default definePlugin(thePlugin);
