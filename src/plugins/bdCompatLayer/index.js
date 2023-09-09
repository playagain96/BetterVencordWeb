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
import { Settings } from "@api/Settings";

import { addContextMenu, addDiscordModules, FakeEventEmitter, Patcher } from "./fakeStuff";
import { injectSettingsTabs } from "./fileSystemViewer";
import { addCustomPlugin, convertPlugin, removeAllCustomPlugins } from "./pluginConstructor";
import UI from "./UI";
import { getDeferred, injectZipToWindow, simpleGET } from "./utils";
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
    // Delete these two below if you are only using code patches
    start() {
        injectSettingsTabs();
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
                        // window.BdApi.ReqImpl.fs = temp.require("fs");
                        // window.BdApi.ReqImpl.path = temp.require("path");
                        ReImplementationObject.fs = temp.require("fs");
                        ReImplementationObject.path = temp.require("path");
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
                injectZipToWindow();
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
                injectZipToWindow();
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

        window.GeneratedPlugins = [];
        const BdApiReImplementation = {
            Patcher,
            UI: new UI(),
            Plugins: {
                getAll: () => {
                    return GeneratedPlugins;
                },
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
                    return BdApiReImplementation.Webpack.getModule(
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
                getByStringsOptimal(...strings) {
                    return module => {
                        if (!module?.toString || typeof (module?.toString) !== "function") return; // Not stringable
                        let moduleString = "";
                        try { moduleString = module?.toString([]); }
                        catch (err) { moduleString = module?.toString(); }
                        if (!moduleString) return false; // Could not create string
                        for (const s of strings) {
                            if (!moduleString.includes(s)) return false;
                        }
                        return true;
                    };
                },
                getByStrings(...strings) {
                    return module => {
                        const moduleString = module?.toString([]) || "";
                        if (!moduleString) return false; // Could not create string

                        return strings.every(s => moduleString.includes(s));
                    };

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
                    return BdApiReImplementation.getData(...args);
                },
                save(...args) {
                    return BdApiReImplementation.setData(...args);
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
                            BdApiReImplementation.Plugins.folder +
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
                            BdApiReImplementation.Plugins.folder +
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
                        BdApiReImplementation.Plugins.folder + "/" + key + ".config.json",
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
                            callOriginalMethod: () => (patchData.returnValue = patchData.originalMethod.apply(patchData.thisObject, patchData.methodArguments)),
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
                            callOriginalMethod: () => (patchData.returnValue = patchData.originalMethod.apply(patchData.thisObject, patchData.methodArguments)),
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
                            callOriginalMethod: () => (data.returnValue = data.originalMethod.apply(data.thisObject, data.methodArguments)),
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
        window.BdApi = BdApiReImplementation;
        // window.BdApi.UI = new UI();
        window.require = RequireReimpl;
        // window.BdApi.ReqImpl = ReImplementationObject;

        const DiscordModulesInjectorOutput = addDiscordModules(proxyUrl);
        const DiscordModules = DiscordModulesInjectorOutput.output;
        Patcher.setup(DiscordModules);
        windowBdCompatLayer.discordModulesBlobUrl = DiscordModulesInjectorOutput.sourceBlobUrl;

        const ContextMenuInjectorOutput = addContextMenu(DiscordModules, proxyUrl);
        const ContextMenu = ContextMenuInjectorOutput.output;
        windowBdCompatLayer.contextMenuBlobUrl = ContextMenuInjectorOutput.sourceBlobUrl;
        BdApiReImplementation.ContextMenu = ContextMenu;

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
            const Router = BdApiReImplementation.Webpack.getModule(x => x.listeners && x.flushRoute);
            Router.listeners.add(() =>
                window.GeneratedPlugins.forEach(plugin =>
                    typeof plugin.instance.onSwitch === "function" && plugin.instance.onSwitch()
                )
            );

            const localFs = window.require("fs");
            if (!localFs.existsSync(BdApiReImplementation.Plugins.folder)) {
                // localFs.mkdirSync(BdApiReimpl.Plugins.rootFolder);
                // localFs.mkdirSync(BdApiReimpl.Plugins.folder);
                Utils.mkdirSyncRecursive(BdApiReImplementation.Plugins.folder);
            }
            for (const key in this.options) {
                if (Object.hasOwnProperty.call(this.options, key)) {
                    if (Settings.plugins[this.name][key]) {
                        try {
                            const url = Settings.plugins[this.name][key];
                            // const filenameFromUrl = url.split("/").pop();
                            const response = simpleGET(proxyUrl + url);
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
                .readdirSync(BdApiReImplementation.Plugins.folder)
                .sort();
            const plugins = pluginFolder.filter(x =>
                x.endsWith(".plugin.js")
            );
            for (let i = 0; i < plugins.length; i++) {
                const element = plugins[i];
                const pluginJS = localFs.readFileSync(
                    BdApiReImplementation.Plugins.folder + "/" + element,
                    "utf8"
                );
                convertPlugin(pluginJS, element).then(plugin => {
                    addCustomPlugin(plugin);
                });
            }
        });
    },
    async stop() {
        console.warn("UnPatching context menu...");
        BdApi.Patcher.unpatchAll("ContextMenuPatcher");
        console.warn("Removing plugins...");
        await removeAllCustomPlugins();
        console.warn("Freeing blobs...");
        Object.values(window.GeneratedPluginsBlobs).forEach(x => {
            URL.revokeObjectURL(x);
            delete window.GeneratedPluginsBlobs[x];
        });
        URL.revokeObjectURL(window.BdCompatLayer.contextMenuBlobUrl);
        URL.revokeObjectURL(window.BdCompatLayer.discordModulesBlobUrl);
        console.warn("Removing compat layer...");
        delete window.BdCompatLayer;
        console.warn("Removing BdApi...");
        delete window.BdApi;
        if (window.zip) {
            console.warn("Removing ZIP...");
            delete window.zip;
        }
        console.warn("Removing FileSystem...");
        delete window.BrowserFS;
    },
};

export default definePlugin(thePlugin);
