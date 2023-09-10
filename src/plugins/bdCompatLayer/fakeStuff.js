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

import { addLogger, evalInScope, findFirstLineWithoutX, simpleGET } from "./utils";

export const FakeEventEmitter = class {
    constructor() {
        this.callbacks = {};
    }

    on(event, cb) {
        if (!this.callbacks[event]) this.callbacks[event] = [];
        this.callbacks[event].push(cb);
    }

    off(event, cb) {
        const cbs = this.callbacks[event];
        if (cbs) {
            this.callbacks[event] = cbs.filter(callback => callback !== cb);
        }
    }

    emit(event, data) {
        const cbs = this.callbacks[event];
        if (cbs) {
            cbs.forEach(cb => cb(data));
        }
    }
};

export const addDiscordModules = proxyUrl => {
    const context = {
        get WebpackModules() {
            return BdApi.Webpack;
        }
    };
    const ModuleDataText = simpleGET(
        proxyUrl +
        "https://github.com/BetterDiscord/BetterDiscord/raw/main/renderer/src/modules/discordmodules.js"
    ).responseText.replaceAll("\r", "");
    const ev =
        "(" +
        ModuleDataText.split("export default Utilities.memoizeObject(")[1];
    // const sourceBlob = new Blob([ev], { type: "application/javascript" });
    // const sourceBlobUrl = URL.createObjectURL(sourceBlob);
    // return { output: evalInScope(ev + "\n//# sourceURL=" + sourceBlobUrl, context), sourceBlobUrl };
    return { output: evalInScope(ev + "\n//# sourceURL=" + "betterDiscord://internal/DiscordModules.js", context), sourceBlobUrl: undefined };
};

export const addContextMenu = (DiscordModules, proxyUrl) => {
    /**
     * @type {string}
     */
    const ModuleDataText = simpleGET(
        proxyUrl +
        "https://github.com/BetterDiscord/BetterDiscord/raw/main/renderer/src/modules/api/contextmenu.js"
    ).responseText.replaceAll("\r", "");
    const context = {
        get WebpackModules() {
            return BdApi.Webpack;
        },
        DiscordModules,
        get Patcher() {
            return BdApi.Patcher;
        }
    };
    const linesToRemove = findFirstLineWithoutX(
        ModuleDataText,
        "import"
    );
    // eslint-disable-next-line prefer-const
    let ModuleDataArr = ModuleDataText.split("\n");
    ModuleDataArr.splice(0, linesToRemove);
    ModuleDataArr.pop();
    ModuleDataArr.pop();
    // for (let i = 0; i < ModuleDataArr.length; i++) {
    //     const element = ModuleDataArr[i];
    //     if (element.trimStart().startsWith("Patcher.before(\"ContextMenuPatcher\", ")) {
    //         ModuleDataArr[i] = "debugger;" + element;
    //     }
    // }
    const ModuleDataAssembly =
        "(()=>{" +
        addLogger.toString() +
        ";const Logger = " + addLogger.name + "();const {React} = DiscordModules;" +
        ModuleDataArr.join("\n") +
        "\nreturn ContextMenu;})();";
    // const sourceBlob = new Blob([ModuleDataAssembly], {
    //     type: "application/javascript",
    // });
    // const sourceBlobUrl = URL.createObjectURL(sourceBlob);
    // const evaluatedContextMenu = evalInScope(ModuleDataAssembly + "\n//# sourceURL=" + sourceBlobUrl, context);
    const evaluatedContextMenu = evalInScope(ModuleDataAssembly + "\n//# sourceURL=" + "betterDiscord://internal/ContextMenu.js", context);
    // return { output: new evaluatedContextMenu(), sourceBlobUrl };
    return { output: new evaluatedContextMenu(), sourceBlobUrl: undefined };
};

export { Patcher } from "./stuffFromBD";
