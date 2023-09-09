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

export function getDeferred() {
    let resolve = undefined;
    let reject = undefined;

    const promise = new Promise((resolveCb, rejectCb) => {
        resolve = resolveCb;
        reject = rejectCb;
    });

    return { resolve, reject, promise };
}

// export function evalInScope(js, contextAsScope) {
//     return new Function(`with (this) { return (${js}); }`).call(contextAsScope);
// }
export function evalInScope(js, contextAsScope) {
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

export function simpleGET(url, headers) {
    var httpRequest = new XMLHttpRequest();

    httpRequest.open("GET", url, false);
    if (headers)
        for (var header in headers) {
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
