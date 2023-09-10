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
import { injectSettingsTabs, unInjectSettingsTab } from "./fileSystemViewer";
import { addCustomPlugin, convertPlugin, removeAllCustomPlugins } from "./pluginConstructor";
import { getModule as BdApi_getModule, monkeyPatch as BdApi_monkeyPatch } from "./stuffFromBD";
import UI from "./UI";
import { FSUtils, getDeferred, simpleGET, ZIPUtils } from "./utils";
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
        // const Utils = {
        //     stream2buffer(stream) {
        //         return new Promise((resolve, reject) => {
        //             const _buf = [];
        //             stream.on("data", chunk => _buf.push(chunk));
        //             stream.on("end", () => resolve(Buffer.concat(_buf)));
        //             stream.on("error", err => reject(err));
        //         });
        //     },
        // };
        const windowBdCompatLayer = {
            // Utils,
            // exportZip,
            // completeFileSystem,
            // downloadZip,
            // importZip,
            // importFile,
            FSUtils,
            ZIPUtils,
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
                getModule: BdApi_getModule,
                waitForModule(filter) {
                    return new Promise((resolve, reject) => {
                        Vencord.Webpack.waitFor(filter, module => {
                            resolve(module);
                        });
                    });
                },
                getByDisplayName(name) {
                    return this.getModule(
                        this.Filters.byDisplayName(name)
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
                        if (
                            // eslint-disable-next-line no-prototype-builtins
                            cache.hasOwnProperty(key) &&
                            // eslint-disable-next-line no-prototype-builtins
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
                return this.findModule(module =>
                    props.every(prop => typeof module[prop] !== "undefined")
                );
            },
            findModule(filter) {
                return this.Webpack.getModule(filter);
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
            monkeyPatch: BdApi_monkeyPatch,
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
        // windowBdCompatLayer.discordModulesBlobUrl = DiscordModulesInjectorOutput.sourceBlobUrl;

        const ContextMenuInjectorOutput = addContextMenu(DiscordModules, proxyUrl);
        const ContextMenu = ContextMenuInjectorOutput.output;
        // windowBdCompatLayer.contextMenuBlobUrl = ContextMenuInjectorOutput.sourceBlobUrl;
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
                // Utils.mkdirSyncRecursive(BdApiReImplementation.Plugins.folder);
                FSUtils.mkdirSyncRecursive(BdApiReImplementation.Plugins.folder);
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
                                BdApiReImplementation.Plugins.folder +
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
        console.warn("Removing settings tab...");
        unInjectSettingsTab();
        // console.warn("Freeing blobs...");
        // Object.values(window.GeneratedPluginsBlobs).forEach(x => {
        //     URL.revokeObjectURL(x);
        //     delete window.GeneratedPluginsBlobs[x];
        // });
        // URL.revokeObjectURL(window.BdCompatLayer.contextMenuBlobUrl);
        // URL.revokeObjectURL(window.BdCompatLayer.discordModulesBlobUrl);
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
