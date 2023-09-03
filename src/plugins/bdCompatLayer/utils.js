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
    return new Function(["contextAsScope", "js"],"return (function() { with(this) { return eval(js); } }).call(contextAsScope)")(contextAsScope, js);
}
