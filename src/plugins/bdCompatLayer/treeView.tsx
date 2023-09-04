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

import { React, useState } from "@webpack/common";

interface TreeNode {
    id: string;
    label: string;
    children?: TreeNode[];
}

interface TreeViewProps {
    data: TreeNode[];
}

const TreeNodeItem: React.FC<{ node: TreeNode; }> = ({ node }) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => {
        setExpanded(!expanded);
    };

    return (
        <div>
            <div onClick={toggleExpand}>
                {expanded ? "▼" : "►"} {node.label}
            </div>
            {expanded && node.children && (
                <div style={{ marginLeft: "20px" }}>
                    {node.children.map(childNode => (
                        <TreeNodeItem key={childNode.id} node={childNode} />
                    ))}
                </div>
            )}
        </div>
    );
};

const TreeView: React.FC<TreeViewProps> = ({ data }) => {
    return (
        <div>
            {data.map(node => (
                <TreeNodeItem key={node.id} node={node} />
            ))}
        </div>
    );
};

export default TreeView;
