/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// eslint-disable-next-line semi
class UI {
    helper() {
        console.log("hi");
    }
    alert() {
        // Redoing
    }
    toast() {
        BdApi.DOM.addStyle(
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
}

export default UI;
