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
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginDef } from "@utils/types";
// import { readFileSync } from "fs";
// const process = require("~process");

const { Plugin } = require("@utils/types");
import { Settings } from "@api/Settings";

import { PLUGIN_NAME } from "./constants";
import { createGlobalBdApi, getGlobalApi } from "./fakeBdApi";
import { addContextMenu, addDiscordModules, FakeEventEmitter, fetchWithCorsProxyFallback, Patcher } from "./fakeStuff";
import { injectSettingsTabs, unInjectSettingsTab } from "./fileSystemViewer";
import { addCustomPlugin, convertPlugin, removeAllCustomPlugins } from "./pluginConstructor";
import { FSUtils, getDeferred, patchMkdirSync, patchReadFileSync, reloadCompatLayer, simpleGET, ZIPUtils } from "./utils";
// String.prototype.replaceAll = function (search, replacement) {
//     var target = this;
//     return target.split(search).join(replacement);
// };

const thePlugin = {
    name: PLUGIN_NAME,
    description: "Converts BD plugins to run in Vencord",
    authors: [
        Devs.Davvy,
        Devs.WhoIsThis,
    ],
    // patches: [
    //     {
    //         match: (/(\w+)\.\w+\s*=\s*function\(\w+\,\w+\){for\(var\s+\w\s+in\s\w+\)\w\.o\(\w,\w\)&&!\w\.o\(\w,\w\)&&Object.defineProperty\(\w,\w,{enumerable:!0,get:\w\[\w\]}\)}/.toString()),
    //         replace: `$1.d = function (target, exports) { console.log("hello there"); for (const key in exports) { Object.defineProperty( target, key, {get: () => exports[key](),set: e => { exports[key] = () => e }, enumerable: !0, configurable: !1}); } }`
    //     }
    // ],
    options: {
        enableExperimentalRequestPolyfills: {
            description: "Enables request polyfills that first try to request using normal fetch, then using a cors proxy when the normal one fails",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: false,
        },
        corsProxyUrl: {
            description: "CORS proxy used to bypass CORS",
            type: OptionType.STRING,
            default: "https://cors-get-proxy.sirjosh.workers.dev/?url=",
            restartNeeded: true,
        },
        useIndexedDBInstead: {
            description: "Uses indexedDB instead of localStorage. It may cause memory usage issues but prevents exceeding localStorage quota. Note, after switching, you have to import your stuff back manually",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        },
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
    originalBuffer: {},
    start() {
        injectSettingsTabs();
        // const proxyUrl = "https://api.allorigins.win/raw?url=";
        // const proxyUrl = "https://cors-get-proxy.sirjosh.workers.dev/?url=";
        const proxyUrl = Settings.plugins[this.name].corsProxyUrl ?? this.options.corsProxyUrl.default;
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
                const temp: any = {};
                const browserFSSetting = Settings.plugins[this.name].useIndexedDBInstead === true ? {
                    fs: "AsyncMirror",
                    options: {
                        sync: { fs: "InMemory" },
                        async: { fs: "IndexedDB", options: { storeName: "VirtualFS" } },
                    }
                } : {
                    fs: "LocalStorage",
                };
                window.BrowserFS.install(temp);
                window.BrowserFS.configure(
                    browserFSSetting,
                    // {
                    // fs: "InMemory"
                    // fs: "LocalStorage",
                    // fs: "IndexedDB",
                    // options: {
                    //     "storeName": "VirtualFS"
                    // },
                    // fs: "AsyncMirror",
                    // options: {
                    //     sync: { fs: "InMemory" },
                    //     async: { fs: "IndexedDB", options: { storeName: "VirtualFS" } },
                    // }
                    // },
                    () => {
                        // window.BdApi.ReqImpl.fs = temp.require("fs");
                        // window.BdApi.ReqImpl.path = temp.require("path");
                        // ReImplementationObject.fs = temp.require("fs");
                        ReImplementationObject.fs = patchReadFileSync(patchMkdirSync(temp.require("fs")));
                        ReImplementationObject.path = temp.require("path");
                        // @ts-ignore
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
            reloadCompatLayer,
            fsReadyPromise: getDeferred(),
            mainObserver: {},
            fakeClipboard: undefined,
        };
        window.BdCompatLayer = windowBdCompatLayer;

        window.GeneratedPlugins = [];
        /*
        const BdApiReImplementation_ = {
            ContextMenu: {},
            Patcher,
            Plugins: {
                getAll: () => {
                    return window.GeneratedPlugins;
                },
                isEnabled: name => {
                    return Vencord.Plugins.isPluginEnabled(name);
                },
                get: function (name) {
                    return this.getAll().filter(x => x.name == name)[0] ?? this.getAll().filter(x => x.originalName == name)[0];
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
                    const style: HTMLElement =
                        document
                            .querySelector("bd-styles")
                            ?.querySelector(`#${id}`) ||
                        this.createElement("style", { id });
                    style.textContent = css;
                    document.querySelector("bd-styles")?.append(style);
                },
                removeStyle(id) {
                    id = id.replace(/^[^a-z]+|[^\w-]+/gi, "-");
                    const exists = document
                        .querySelector("bd-styles")
                        ?.querySelector(`#${id}`);
                    if (exists) exists.remove();
                },
                createElement(tag, options: any = {}, child = null) {
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
                    get byKeys() {
                        return this.byProps.bind(BdApiReImplementation.Webpack.Filters); // just in case
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
                    get byStrings() {
                        return BdApiReImplementation.Webpack.getByStrings;
                    }
                },
                getModule: BdApi_getModule,
                waitForModule(filter) {
                    return new Promise((resolve, reject) => {
                        Vencord.Webpack.waitFor(filter, module => {
                            resolve(module);
                        });
                    });
                },
                getModuleWithKey(filter) {
                    let target, id, key;

                    BdApiReImplementation.Webpack.getModule(
                        (e, m, i) => filter(e, m, i) && (target = m) && (id = i) && true,
                        { searchExports: true }
                    );

                    for (const k in target.exports) {
                        if (filter(target.exports[k], target, id)) {
                            key = k;
                            break;
                        }
                    }

                    return [target.exports, key];
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
                // load(...args) {
                //     return BdApiReImplementation.getData(...args);
                // },
                // save(...args) {
                //     return BdApiReImplementation.setData(...args);
                // },
                get load() {
                    return BdApiReImplementation.getData.bind(BdApiReImplementation);
                },
                get save() {
                    return BdApiReImplementation.setData.bind(BdApiReImplementation);
                }
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
            get loadData() {
                return BdApiReImplementation.getData.bind(BdApiReImplementation);
            },
            get saveData() {
                return BdApiReImplementation.setData.bind(BdApiReImplementation);
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
            ReactUtils:
            {
                getInternalInstance(node: Node & any) { return node.__reactFiber$ || node[Object.keys(node).find(k => k.startsWith("__reactInternalInstance") || k.startsWith("__reactFiber")) as string] || null; },
            },
            UI: {
                helper() {
                    console.info("hi");
                },
                showToast(message, toastType = 1) {
                    const { createToast, showToast } = BdApiReImplementation.Webpack.getModule(x => x.createToast);
                    showToast(createToast(message || "Success !", [0, 1, 2, 3, 4, 5].includes(toastType) ? toastType : 1)); // showToast has more then 3 toast types?
                    // uhmm.. aschtually waht is 4.
                },
                showConfirmationModal(title: string, content: any, settings: any = {}) {
                    // The stolen code from my beloved davyy has been removed. :(
                    const Colors = {
                        BRAND: BdApiReImplementation.findModuleByProps("colorBrand").colorBrand
                    };
                    const ConfirmationModal = BdApiReImplementation.Webpack.getModule(m => m?.toString?.()?.includes(".confirmButtonColor"), { searchExports: true });
                    const { openModal } = BdApiReImplementation.findModuleByProps("openModal");

                    const {
                        confirmText = settings.confirmText || "Confirm",
                        cancelText = settings.cancelText || "Cancel",
                        onConfirm = settings.onConfirm || (() => { }),
                        onCancel = settings.onCancel || (() => { }),
                        extraReact = settings.extraReact || [],
                    } = settings;

                    const moreReact: React.ReactElement[] = [];

                    const whiteTextStyle = {
                        color: "white",
                    };

                    const whiteTextContent = BdApiReImplementation.React.createElement("div", { style: whiteTextStyle }, content);

                    moreReact.push(whiteTextContent);
                    // moreReact.push(...extraReact) // IM ADDING MORE DIV POSSIBILITESS !!!!

                    // I dont know how anyone would find this useful but screw it yeah?
                    // Someone will find it useful one day
                    /*
                    USAGE:::
                    const extra1 = BdApi.React.createElement("div", {}, "Extra 1");
                    const extra2 = BdApi.React.createElement("div", {}, "Extra 2");

                    const extraReact = [extra1, extra2];

                    BdApi.UI.showConfirmationModal(
                    "Modal title",
                    "Modal content",
                    {
                        extraReact: extraReact
                    }
                    );
                    *
                    extraReact.forEach(reactElement => {
                        moreReact.push(reactElement);
                    });

                    openModal(props => BdApiReImplementation.React.createElement(ConfirmationModal, Object.assign({
                        header: title,
                        confirmButtonColor: Colors.BRAND,
                        confirmText: confirmText,
                        cancelText: cancelText,
                        onConfirm: onConfirm,
                        onCancel: onCancel,
                        children: moreReact,
                        ...props
                    })));
                },
                showNotice_(title, content, options: any = {}) {
                    // const { React, ReactDOM } = BdApiReImplementation;
                    const container = document.createElement("div");
                    container.className = "custom-notification-container";

                    const closeNotification = () => {
                        const customNotification = container.querySelector(".custom-notification");
                        if (customNotification) {
                            customNotification.classList.add("close");
                            setTimeout(() => {
                                // ReactDOM.unmountComponentAtNode(container);
                                document.body.removeChild(container);
                            }, 1000);
                        }
                    };

                    const { timeout = 0, type = "default" } = options;
                    const buttons = [
                        { label: "Close", onClick: () => { } },
                        ...options.buttons || []
                    ];

                    const buttonElements = buttons.map((button, index) => {
                        const onClickHandler = () => {
                            button.onClick();
                            closeNotification();
                        };

                        // return React.createElement(
                        //     "button",
                        //     { key: index, className: "confirm-button", onClick: onClickHandler },
                        //     button.label
                        // );
                        // const t = document.createElement("button");
                        // t.setAttribute("key", index);
                        // t.className = "confirm-button";
                        // t.onclick = onClickHandler;
                        // // t.onClick = t.onclick;
                        // t.append(button.label);
                        // return t;
                        return docCreateElement("button", { className: "confirm-button", onclick: onClickHandler }, [typeof button.label === "string" ? docCreateElement("span", { innerText: button.label }) : button.label]);
                    });
                    // const xButton = React.createElement(
                    //     "button",
                    //     { onClick: closeNotification, className: "button-with-svg" },
                    //     React.createElement(
                    //         "svg",
                    //         { width: "24", height: "24", className: "xxx" },
                    //         React.createElement("path", {
                    //             d:
                    //                 "M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z",
                    //             stroke: "white",
                    //             strokeWidth: "2",
                    //             fill: "none",
                    //         })
                    //     )
                    // );
                    const xButton = docCreateElement("button", { onclick: closeNotification, className: "button-with-svg" }, [
                        docCreateElement("svg", { className: "xxx" }, [
                            docCreateElement("path", undefined, undefined, {
                                stroke: "white",
                                strokeWidth: "2",
                                fill: "none",
                                d:
                                    "M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z",
                            }),
                        ], { style: "width: 24px; height: 24px;" }),
                    ]);
                    // const titleComponent = typeof title === "string" ? (
                    //     React.createElement("div", { className: "notification-title" }, title, xButton)
                    // ) : (
                    //     React.createElement(
                    //         title.tagName.toLowerCase(),
                    //         { className: "notification-title" },
                    //         title.textContent || " ",
                    //         xButton
                    //     )
                    // );
                    // const titleComponent = docCreateElement("span", { className: "notification-title" }, [typeof title === "string" ? docCreateElement("span", { innerText: title }) : title, xButton]);
                    const titleComponent = docCreateElement("span", { className: "notification-title" }, [typeof title === "string" ? docCreateElement("span", { innerText: title }) : title]);
                    // const contentComponent = typeof content === "string" ? (
                    //     React.createElement("div", { className: "content" }, content)
                    // ) : (
                    //     React.isValidElement(content) ? content : React.createElement("div", { className: "content" }, " ") // Very nice looking fallback. I dont know why I dont optimize code along the way.
                    // );
                    const contentComponent = docCreateElement("div", { className: "content" }, [typeof content === "string" ? docCreateElement("span", { innerText: title }) : content]);

                    // const customNotification = React.createElement(
                    //     "div",
                    //     { className: `custom-notification ${type}` },
                    //     React.createElement("div", { className: "top-box" }, titleComponent),
                    //     contentComponent,
                    //     React.createElement("div", { className: "bottom-box" }, buttonElements)
                    // );
                    const customNotification = docCreateElement("div", { className: `custom-notification ${type}` }, [
                        docCreateElement("div", { className: "top-box" }, [titleComponent]),
                        contentComponent,
                        docCreateElement("div", { className: "bottom-box" }, buttonElements),
                    ]);

                    // ReactDOM.render(customNotification, container);
                    container.appendChild(customNotification);
                    document.body.appendChild(container);

                    if (timeout > 0) {
                        setTimeout(closeNotification, timeout);
                    }
                },
                showNotice(content, options) {
                    return this.showNotice_("Notice", content, options);
                },
            },
            alert(title, content) {
                BdApiReImplementation.UI.showConfirmationModal(title, content, { cancelText: null });
            },
            showNotice(content, settings = {}) {
                BdApiReImplementation.UI.showNotice(content, settings);
            },
            showConfirmationModal(title, content, settings = {}) {
                BdApiReImplementation.UI.showConfirmationModal(title, content, settings);
            },
            get ReactDOM() { return BdApiReImplementation.findModuleByProps("render", "findDOMNode"); },
            Utils: {
                findInTree(tree, searchFilter, options = {}) {
                    const { walkable = null, ignore = [] } = options;

                    function findInObject(obj) {
                        for (const key in obj) {
                            if (ignore.includes(key)) continue;
                            const value = obj[key];

                            if (searchFilter(value)) return value;

                            if (typeof value === "object" && value !== null) {
                                const result = findInObject(value);
                                if (result !== undefined) return result;
                            }
                        }
                        return undefined;
                    }

                    if (typeof searchFilter === "string") return tree?.[searchFilter];
                    if (searchFilter(tree)) return tree;

                    if (Array.isArray(tree)) {
                        for (const value of tree) {
                            const result = BdApiReImplementation.Utils.findInTree(value, searchFilter, { walkable, ignore });
                            if (result !== undefined) return result;
                        }
                    } else if (typeof tree === "object" && tree !== null) {
                        const keysToWalk = walkable || Object.keys(tree);
                        for (const key of keysToWalk) {
                            if (tree[key] === undefined) continue;
                            const result = BdApiReImplementation.Utils.findInTree(tree[key], searchFilter, { walkable, ignore });
                            if (result !== undefined) return result;
                        }
                    }

                    return undefined;
                }
            }
        };
        */
        const ReImplementationObject = {
            // request: (url, cb) => {
            //     cb({ err: "err" }, undefined, undefined);
            // },
            fs: {},
            path: {},
            https: {
                get_(url, options, cb) {
                    const ev = new ReImplementationObject.events.EventEmitter();
                    const ev2 = new ReImplementationObject.events.EventEmitter();
                    const fetchResponse = fetchWithCorsProxyFallback(url, { ...options, method: "get" }, proxyUrl);
                    fetchResponse.then(async x => {
                        ev2.emit("response", ev);
                        if (x.body) {
                            const reader = x.body.getReader();
                            let result = await reader.read();
                            while (!result.done) {
                                ev.emit("data", result.value);
                                result = await reader.read();
                            }
                        }
                        ev.emit("end", Object.assign({}, x, {
                            statusCode: x.status,
                            headers: Object.fromEntries(x.headers.entries()),
                        }));
                    });
                    cb(ev);
                    fetchResponse.catch((reason) => {
                        if (ev2.callbacks["error"]) // https://nodejs.org/api/http.html#class-httpclientrequest "For backward compatibility, res will only emit 'error' if there is an 'error' listener registered."
                            ev2.emit("error", reason);
                    });
                    return ev2;
                },
                get get() {
                    if (Settings.plugins[thePlugin.name].enableExperimentalRequestPolyfills === true)
                        return this.get_;
                    return undefined;
                }
            },
            get request() {
                const fakeRequest = function (url: string, cb = (...args) => { }, headers = {}) {
                    const stuff = { theCallback: cb };
                    if (typeof headers === "function") {
                        // @ts-ignore
                        cb = headers;
                        headers = stuff.theCallback;
                    }
                    // @ts-ignore
                    delete stuff.theCallback;
                    // cb({ err: "err" }, undefined, undefined);
                    const fetchOut = fetchWithCorsProxyFallback(url, { ...headers, method: "get" }, proxyUrl);
                    // uh did somebody say "compatibility"? no? I didn't hear that either.
                    fetchOut.then(async x => {
                        // cb(undefined, x, await x.text());
                        cb(undefined, Object.assign({}, x, {
                            statusCode: x.status,
                            headers: Object.fromEntries(x.headers.entries()),
                        }), await x.text()); // shouldn't this be arrayBuffer?
                    });
                    fetchOut.catch(x => {
                        cb(x, undefined, undefined);
                    });
                };
                // fakeRequest.stuffHere = function () {}
                fakeRequest.get = function (url: string, cb = (...args) => { }, options = {}) {
                    return this(url, cb, { ...options, method: "get" });
                };
                if (Settings.plugins[thePlugin.name].enableExperimentalRequestPolyfills === true)
                    return fakeRequest;
                return undefined;
            },
            events: {
                EventEmitter: FakeEventEmitter,
            },
            electron: {},
        };
        const RequireReimpl = name => {
            return ReImplementationObject[name];
        };
        const BdApiReImplementation = createGlobalBdApi();
        window.BdApi = BdApiReImplementation;
        window // Talk about being tedious
            .nuhuh = // Why the hell did vencord not expose process??
            (bool = true) => {
                BdApiReImplementation
                    .Webpack
                    .getModule(
                        x =>
                            x
                                .logout)
                    .logout();
                console
                    .log(
                        "HAHAHAHH GET NUHUH'ED");
            };
        // window.BdApi.UI = new UI();
        // @ts-ignore
        window.require = RequireReimpl;
        this.originalBuffer = window.Buffer;
        window.Buffer = BdApiReImplementation.Webpack.getModule(x => x.INSPECT_MAX_BYTES)?.Buffer;
        // window.BdApi.ReqImpl = ReImplementationObject;
        windowBdCompatLayer.fakeClipboard = (() => {
            const try1 = BdApiReImplementation.Webpack.getModule(x => x.clipboard);
            if (try1) {
                return try1.clipboard;
            }
            const filter = x2 => x2 && x2.toString?.().includes(".copy(") && x2.toString?.().length < 100;
            const try2 = Object.values(BdApiReImplementation.Webpack.getModule(x => x && Object.values(x).some(filter))).find(filter);
            return {
                copy: try2,
            };
        })();

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
                    BdApiReImplementation.Plugins.isEnabled(plugin.name) && typeof plugin.instance.onSwitch === "function" && plugin.instance.onSwitch()
                )
            );
            const observer = new MutationObserver(mutations => mutations.forEach(m => window.GeneratedPlugins.forEach(p => BdApiReImplementation.Plugins.isEnabled(p.name) && p.instance.observer?.(m))));
            observer.observe(document, {
                childList: true,
                subtree: true
            });
            windowBdCompatLayer.mainObserver = observer;
            const localFs = window.require("fs");
            if (!localFs.existsSync(BdApiReImplementation.Plugins.folder)) {
                // localFs.mkdirSync(BdApiReimpl.Plugins.rootFolder);
                // localFs.mkdirSync(BdApiReimpl.Plugins.folder);
                // Utils.mkdirSyncRecursive(BdApiReImplementation.Plugins.folder);
                FSUtils.mkdirSyncRecursive(BdApiReImplementation.Plugins.folder);
            }
            for (const key in this.options) {
                if (Object.hasOwnProperty.call(this.options, key)) {
                    if (Settings.plugins[this.name][key] && key.startsWith("pluginUrl")) {
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
                convertPlugin(pluginJS, element, true).then(plugin => {
                    addCustomPlugin(plugin);
                });
            }
        });
        BdApiReImplementation.DOM.addStyle("OwOStylesOwO", `
            .custom-notification {
                display: flex;
                flex-direction: column;
                position: absolute;
                bottom: 20px; right: 20px;
                width: 440px; height: 270px;
                overflow: hidden;
                background-color: var(--modal-background);
                color: white;
                border-radius: 5px;
                box-shadow: var(--legacy-elevation-border),var(--legacy-elevation-high);
                animation: 1s slide cubic-bezier(0.39, 0.58, 0.57, 1);
            }
            @keyframes slide {
                0% {
                    right: -440px;
                }
                100% {
                    right: 20px;
                }
            }
            .custom-notification.close {
                animation: 1s gobyebye cubic-bezier(0.39, 0.58, 0.57, 1) forwards;
                right: 20px;
            }

            @keyframes gobyebye {
                0% {
                    right: 20px;
                }
                100% {
                    right: -440px;
                }
            }
            .custom-notification .top-box {padding: 16px;}
            .custom-notification .notification-title {font-size: 20px; font-weight: bold;}
            .custom-notification .content {
                padding: 0 16px 20px;
                flex: 1 1 auto;
                overflow: hidden;
            }
            .custom-notification .bottom-box {
                background-color: var(--modal-footer-background);
                padding: 16px;
                display: flex;
                justify-content: flex-end;
                align-items: center;
            }
            .custom-notification .confirm-button {
                background-color: #007bff;
                color: white;
                border-radius: 5px;
                padding: 5px 10px;
                margin: 0 5px;
            }
            .custom-notification .cancel-button {
                background-color: red;
                color: white;
                border-radius: 5px;
                padding: 5px 10px;
                margin: 0 5px;
            }
            .button-with-svg {
                position: absolute;
                right: 15px;
                margin-top: -0px !important;
                background: transparent;
            }
    `);
    },
    async stop() {
        console.warn("Disabling observer...");
        window.BdCompatLayer.mainObserver.disconnect();
        console.warn("UnPatching context menu...");
        getGlobalApi().Patcher.unpatchAll("ContextMenuPatcher");
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
        console.warn("Restoring buffer...");
        window.Buffer = this.originalBuffer as BufferConstructor;
    },
};

export default definePlugin(thePlugin as PluginDef);
