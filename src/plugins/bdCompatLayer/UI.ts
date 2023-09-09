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

// eslint-disable-next-line semi
export const UI = class {
    helper() {
        console.log("hi");
    }
    alert() {
        // Redoing
    }
    toast() {
        window.BdApi.DOM.addStyle(
            "bv-toasts",
            `
            @keyframes bv-toast-up {
                from {
                    transform: translateY(0);
                    opacity: 0;
                }
            }

            .some-toast-shit {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(0);
                animation: bv-toast-up 300ms ease;
                background-color: var(--background-primary);
                padding: 10px;
                border-radius: 5px;
                box-shadow: var(--elevation-medium), var(--elevation-stroke);
                font-weight: 500;
                color: var(--header-primary);
                font-size: 14px;
                opacity: 1;
                pointer-events: none;
                user-select: none;
            }`
        );

        // Create a toast element
        const toast = document.createElement("div");
        toast.classList.add("some-toast-shit");
        document.body.appendChild(toast);
    }
};

export default UI;
