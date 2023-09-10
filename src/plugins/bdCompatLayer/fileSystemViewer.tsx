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
import { Text, useRef } from "@webpack/common";

import { TransparentButton } from "./components/TransparentButton";
import TreeView, { findInTree, TreeNode } from "./treeView";
import { readdirPromise } from "./utils";

type SettingsPlugin = Plugin & {
    customSections: ((ID: Record<string, unknown>) => any)[];
};

const TabName = "Virtual Filesystem";

function makeTab() {
    const baseNode = {
        id: "fs-/",
        label: "/",
        children: [],
        // expanded: true,
        expanded: false,
        fetchChildren: function () { return fetchDirContentForId(this.id); },
        // createExpanded: true,
    } as TreeNode;

    // const [selectedNode, setSelectedNode] = useState<TreeNode>(baseNode);

    // const handleNodeSelect = (node: TreeNode) => {
    //     console.log(node);
    //     console.log(selectedNode);
    //     setSelectedNode(node);
    // };
    // const [selectedNode, setSelectedNode] = useState<string>(baseNode.id);
    const ref = useRef(baseNode.id);

    const handleNodeSelect = (node: TreeNode) => {
        console.log(node);
        // console.log(selectedNode);
        console.log(ref.current);
        // setSelectedNode(node.id);
        ref.current = node.id;
    };

    const contextMenuHandler = (event: MouseEvent) => {
        // console.log(event);
        const contextMenuBuild = () => {
            return window.BdApi.ContextMenu.buildMenu([
                { label: ref.current, disabled: true },
                findInTree(baseNode, x => x.expandable === true && x.id === ref.current)?.expandable && { label: "This is a dir" }
            ].filter(Boolean));
        };
        window.BdApi.ContextMenu.open(event, contextMenuBuild(), {});
    };

    return <SettingsTab title={TabName}>
        <TransparentButton isToggle={false} onClick={() => { }}>
            <Text>Export everything as ZIP</Text>
        </TransparentButton>
        <TransparentButton isToggle={false} onClick={() => { }}>
            <Text>Import filesystem from ZIP</Text>
        </TransparentButton>
        {/* <TreeView onContextMenu={contextMenuHandler} selectedNode={selectedNode} selectNode={handleNodeSelect} data={ */}
        <TreeView onContextMenu={contextMenuHandler} selectedNode={ref.current} selectNode={handleNodeSelect} data={
            [
                baseNode
            ]
        }></TreeView>
    </SettingsTab>;
}

async function fetchDirContentForId(id: string) {
    const fs = window.require("fs");
    const dirContents = await readdirPromise(id.split("fs-")[1]) as string[];
    return dirContents.map(x => {
        return {
            id: "fs-" + id.split("fs-")[1] + "/" + x,
            label: x,
            children: [],
            fetchChildren: function () { return fetchDirContentForId(this.id); },
            // expanded: nodeStateStore["fs-" + id.split("fs-")[1] + "/" + x]?.expanded ?? false,
            expanded: false,
            expandable: !fs.statSync(id.split("fs-")[1] + "/" + x).isFile(),
            // createExpanded: nodeStateStore["fs-" + id.split("fs-")[1] + "/" + x]?.expanded ?? false,
        } as TreeNode;
    });
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

export function unInjectSettingsTab() {
    const settingsPlugin = Vencord.Plugins.plugins.Settings as SettingsPlugin;
    const { customSections } = settingsPlugin;
    customSections.splice(customSections.findIndex(x => x({}).className === createFilesSystemViewTab({}).className), 1);
}
