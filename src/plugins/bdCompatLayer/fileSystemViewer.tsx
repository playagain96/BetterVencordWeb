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

import { SettingsTab, wrapTab } from "@components/VencordSettings/shared";
import { Plugin } from "@utils/types";

import TreeView from "./treeView";

type SettingsPlugin = Plugin & {
    customSections: ((ID: Record<string, unknown>) => any)[];
};

const TabName = "Virtual Filesystem";

function makeTab() {
    return <SettingsTab title={TabName}>
        <TreeView data={[
            {
                id: "test",
                label: "amogus",
                children: [
                    {
                        id: "test2",
                        label: "amogus2",
                    }
                ]
            }
        ]}></TreeView>
    </SettingsTab>;
}

function createFilesSystemViewTab(ID: Record<string, unknown>) {
    return {
        section: "BDCompatFS",
        label: TabName,
        element: wrapTab(makeTab, TabName),
        className: "bv-fs-view",
    };
}

export function injectSettingsTabs() {
    const settingsPlugin = Vencord.Plugins.plugins.Settings as SettingsPlugin;
    const { customSections } = settingsPlugin;
    // if (customSections.find(x=>x)) {
    // }
    customSections.push(createFilesSystemViewTab);
}
