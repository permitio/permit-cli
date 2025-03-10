import { writeFileSync } from 'fs';
import { resolve } from 'path';
import open from 'open';

// Define the data structure for a graph node's data
interface GraphNodeData {
	id: string;
	label: string;
}

// Define a graph node; `classes` is optional
interface GraphNode {
	data: GraphNodeData;
	classes?: string;
}

// Define the data structure for a graph edge's data
interface GraphEdgeData {
	source: string;
	target: string;
	label: string;
}

// Define a graph edge; here `classes` is required
interface GraphEdge {
	data: GraphEdgeData;
	classes: string;
}

// Define the overall GraphData structure
interface GraphData {
	nodes: GraphNode[];
	edges: GraphEdge[];
}

export const saveHTMLGraph = (graphData: GraphData) => {
	const outputHTMLPath = resolve(process.cwd(), 'permit-graph.html');
	const htmlTemplate = `
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>ReBAC Graph</title>
		<script src="https://d3js.org/d3.v7.min.js"></script>
		<script src="https://unpkg.com/@popperjs/core@2"></script>
		<link
			href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&display=swap"
			rel="stylesheet"
		/>
		<style>
			body {
				display: flex;
				flex-direction: column;
				margin: 0;
				height: 100vh;
				background-color: rgb(43, 20, 0);
				font-family: 'Manrope', Arial, sans-serif;
				color: #ffffff;
			}
			#title {
				text-align: center;
				font-size: 30px;
				font-weight: 600;
				height: 50px;
				line-height: 50px;
				background-clip: text;
				-webkit-background-clip: text;
				color: transparent; /* Makes the text color transparent to apply gradient */
				background-image: linear-gradient(
					to right,
					#ffba81,
					#bb84ff
				); /* Gradient color */
				background-color: rgb(
					43,
					20,
					0
				); /* Same background color as bg-[#2B1400] */
			}
			svg {
				width: 100vw;
				height: calc(100vh - 50px);
				background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cdefs%3E%3Cpattern id='squarePattern' x='0' y='0' width='20' height='20' patternUnits='userSpaceOnUse'%3E%3Crect width='20' height='20' fill='white'/%3E%3Crect x='2' y='2' width='1.3' height='1.3' fill='%23ccc'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23squarePattern)'/%3E%3C/svg%3E")
					repeat;
			}
			/* Main node style */
			.node-main rect {
				fill: rgb(206, 231, 254);
				stroke: rgb(206, 231, 254);
				stroke-width: 10px;
				rx: 73px;
				ry: 73px;
			}
			.node-main text {
				fill: rgb(0, 106, 220);
				font-size: 85px;
				font-weight: 700;
				pointer-events: none;
				font-family: 'Manrope', Arial, sans-serif;
				text-anchor: middle;
				dominant-baseline: middle;
			}

			.node-text.user-node {
				/* Specific styling for text on user nodes */
				fill: rgb(67, 48, 43); /* for example */
				dominant-baseline: middle;
				text-anchor: middle;
			}

			.node-text.resource-instance-node {
				/* Specific styling for text on resource instance nodes */
				fill: rgb(0, 106, 220);
				dominant-baseline: middle;
				text-anchor: middle;
			}

			/* -------------------------------
 USER NODE SPECIFIC STYLE
---------------------------------*/
			.node-main.user-node rect {
				fill: rgb(234, 221, 215);
				stroke: rgb(234, 221, 215);
				stroke-width: 15px;
			}

			/* -------------------------------
//   RESOURCE INSTANCE NODE STYLE
---------------------------------*/
			.node-main.resource-instance-node rect {
				fill: rgb(206, 231, 254);
				stroke: rgb(206, 231, 254);
			}

			/* Port node style */
			.node-port {
				fill: rgb(94, 176, 239);
				stroke: rgb(255, 255, 255);
				stroke-width: 3px;
			}
			.node-port.user-node {
				fill: rgb(161, 140, 130);
				stroke: rgb(255, 255, 255);
				stroke-width: 3px;
			}

			.node-port.resource-instance-node {
				fill: rgb(94, 176, 239);
				stroke: rgb(255, 255, 255);
				stroke-width: 4px;
			}

			/* Link (edge) style for port edges */
			.link {
				fill: none;
				stroke: rgb(161, 140, 130);
				stroke-width: 4px;
				stroke-dasharray: 45, 40;
				animation: dash 0.5s linear infinite;
			}
			@keyframes dash {
				to {
					stroke-dashoffset: -85;
				}
			}
			/* -------------------------------
   RELATIONSHIP CONNECTION EDGES
---------------------------------*/
			.link.relationship-connection {
				stroke: rgb(163, 131, 117);
				stroke-width: 5;
			}

			/* -------------------------------
   EDGE LABELS
---------------------------------*/
			.edge-label {
				fill: #ffffff;
				font-size: 25px;
				font-family: 'Manrope', Arial, sans-serif;
			}

			/* Zoom Controls Styling */
			#zoom-controls {
				position: fixed;
				bottom: 10px;
				left: 10px;
				display: flex;
				flex-direction: column;
				gap: 5px;
				z-index: 10000;
			}
			#zoom-controls button {
				width: 40px;
				height: 40px;
				border: none;
				border-radius: 5px;
				background-color: rgb(254, 248, 244);
				color: rgb(69, 30, 17);
				font-size: 24px;
				font-weight: bold;
				cursor: pointer;
			}
			#zoom-controls button svg {
				width: 24px;
				height: 24px;
			}
			#minimap-container {
				position: fixed;
				bottom: 10px;
				right: 10px;
				width: 400px;
				height: 100px;
				z-index: 9999;
				background: transparent; /* Transparent background */
				border: 1px solid #ccc;
				border-radius: 25px;
				overflow: hidden;
				pointer-events: none; /* Do not block mouse events */
			}
		</style>
	</head>
	<body>
		<div id="title">Permit ReBAC Graph</div>
		<svg></svg>
		<div id="minimap-container"></div>
		<!-- Zoom controls on bottom left -->
		<div id="zoom-controls">
			<button id="zoom-in">+</button>
			<button id="zoom-out">–</button>
			<button id="lock-toggle"></button>
		</div>

		<script>
			/***********************
			 * 1. DATA & HIERARCHY
			 ***********************/
			// Assume your dynamic graph data (flat, Cytoscape-style) is injected here.
			// For example:
			const graphData = ${JSON.stringify(graphData, null, 2)};

			function flatToForestLayered(flatNodes, flatEdges) {
				const nodeMap = new Map();
				const relationshipCount = {};

				// Initialize relationship count for each node.
				flatNodes.forEach(n => {
					relationshipCount[n.data.id] = 0;
				});
				flatEdges.forEach(e => {
					const s = e.data.source,
						t = e.data.target;
					if (relationshipCount[s] !== undefined) relationshipCount[s]++;
					if (relationshipCount[t] !== undefined) relationshipCount[t]++;
				});

				// Create a unique node object for each flat node and assign a layer.
				flatNodes.forEach(n => {
					if (!nodeMap.has(n.data.id)) {
						let layer = 1; // default layer
						const classesStr = n.classes || '';
						// For user-nodes: if they have any relationships, assign layer 2.
						if (classesStr.includes('user-node')) {
							layer = relationshipCount[n.data.id] > 0 ? 2 : 1;
						}
						// For resource-instance-nodes: no relationships → layer 1; one → layer 3; more → layer 4.
						else if (classesStr.includes('resource-instance-node')) {
							if (relationshipCount[n.data.id] === 0) {
								layer = 1;
							} else if (relationshipCount[n.data.id] === 1) {
								layer = 3;
							} else {
								layer = 4;
							}
						}
						// For object-nodes, assign layer 5.
						else if (classesStr.includes('object-node')) {
							layer = 5;
						}

						nodeMap.set(n.data.id, {
							id: n.data.id,
							id2: n.data.id2 || '',
							name: n.data.label.trim(),
							classes: n.classes,
							children: [],
							incomingEdges: [],
							layer: layer,
						});
					}
				});

				// Keep track of which nodes have been attached as children.
				const attached = new Set();

				// Process each edge.
				flatEdges.forEach(edge => {
					const sourceId = edge.data.source;
					const targetId = edge.data.target;
					if (nodeMap.has(sourceId) && nodeMap.has(targetId)) {
						const sourceNode = nodeMap.get(sourceId);
						const targetNode = nodeMap.get(targetId);
						if (!attached.has(targetId)) {
							sourceNode.children.push(targetNode);
							attached.add(targetId);
							targetNode.edgeLabel = edge.data.label;
						} else {
							if (!targetNode.extraRelationships) {
								targetNode.extraRelationships = [];
							}
							targetNode.extraRelationships.push({
								source: sourceId,
								label: edge.data.label,
							});
						}
					}
				});

				// Build the forest by iterating over the unique nodes.
				const forest = [];
				nodeMap.forEach((node, id) => {
					if (!attached.has(id)) {
						forest.push(node);
					}
				});
				if (forest.length === 0) {
					nodeMap.forEach(node => forest.push(node));
				}
				return forest;
			}

			const forest = flatToForestLayered(graphData.nodes, graphData.edges);
			// Wrap the forest in a dummy root.
			const dummyRoot = { id: 'dummy_root', name: 'Root', children: forest };

			// Create D3 hierarchy.
			const rootHierarchy = d3.hierarchy(dummyRoot);

			// -----------------------------
			// 2. LAYOUT: Compute Tree Layout
			// -----------------------------
			const layoutWidth = window.innerWidth * 100; //  horizontal space
			const layoutHeight = (window.innerHeight - 100) * 4; // Vertical space

			const treeLayout = d3
				.tree()
				.size([layoutWidth, layoutHeight])
				.separation((a, b) => (a.parent === b.parent ? 2 : 3));

			treeLayout(rootHierarchy);

			// For each node (except dummy root), if a layer property exists, force d.y = layer * spacing.
			const layerSpacing = 800;
			rootHierarchy.descendants().forEach(d => {
				if (d.depth > 0 && d.data.layer !== undefined) {
					d.y = d.data.layer * layerSpacing;
				}
			});
			// --- horizontal spacing without disturbing user nodes ---
			const minSpacing = 1250;
			const maxSpacing = 3000; // maximum gap allowed between layer 1 nodes

			const baselineNodes = rootHierarchy
				.descendants()
				.filter(
					d =>
						d.data.layer !== undefined &&
						(d.data.layer === 2 || d.data.layer === 3),
				);
			const baselineAvgX =
				baselineNodes.length > 0 ? d3.mean(baselineNodes, d => d.x) : null;

			const nodesByLayer = d3.group(
				rootHierarchy
					.descendants()
					.filter(
						d => d.data.id !== 'dummy_root' && d.data.layer !== undefined,
					),
				d => d.data.layer,
			);

			// For each layer, check nodes in order of x and nudge non-user nodes if they’re too close.
			nodesByLayer.forEach((nodes, layer) => {
				nodes.sort((a, b) => a.x - b.x);
				for (let i = 1; i < nodes.length; i++) {
					const prev = nodes[i - 1];
					const curr = nodes[i];
					if ((curr.data.classes || '').includes('user-node')) continue;
					if (curr.x - prev.x < minSpacing) {
						curr.x = prev.x + minSpacing;
					}
				}
			});
			// --- Horizontal Alignment Adjustment with Combined Layers 4 & 5 and Clamping ---
			// Compute baseline x from layers 2 and 3.
			// If layer 2 is missing (and thus layer 3 is absent), center all nodes evenly.
			if (!nodesByLayer.has(2)) {
				const allNodes = rootHierarchy
					.descendants()
					.filter(d => d.data.id !== 'dummy_root');
				allNodes.sort((a, b) => a.x - b.x);
				const total = allNodes.length;
				const spacing = layoutWidth / (total + 50);
				allNodes.forEach((node, i) => {
					node.x = spacing * (i + 1);
				});
			} else {
				// Otherwise, align layer 1 with the baseline of layers 2 and 3.

				const group1 = rootHierarchy
					.descendants()
					.filter(d => d.data.layer === 1);
				const minAllowedX = 50;
				const maxAllowedX = layoutWidth + 5000;
				if (group1.length > 0) {
					const group1AvgX = d3.mean(group1, d => d.x);
					const shift1 = baselineAvgX - group1AvgX;
					group1.forEach(d => {
						d.x += shift1;
						d.x = Math.max(minAllowedX, Math.min(d.x, maxAllowedX));
					});
				}
			}

			// For layer 1, enforce min and max spacing.
			if (nodesByLayer.has(1)) {
				const layer1Nodes = nodesByLayer.get(1);
				layer1Nodes.sort((a, b) => a.x - b.x);
				for (let i = 1; i < layer1Nodes.length; i++) {
					const prev = layer1Nodes[i - 1];
					const curr = layer1Nodes[i];
					if (curr.x - prev.x < minSpacing) {
						curr.x = prev.x + minSpacing;
					}
					if (curr.x - prev.x > maxSpacing) {
						curr.x = prev.x + maxSpacing;
					}
				}
			}

			// --- Combined Group (Layers 4 & 5) Alignment ---
			// Determine effective baseline for group45.
			// Priority: layers 2/3 > layer 1 > fallback (center of layout).
			let effectiveBaseline;
			if (baselineNodes.length > 0) {
				effectiveBaseline = d3.mean(baselineNodes, d => d.x);
			} else if (nodesByLayer.has(1)) {
				const group1 = rootHierarchy
					.descendants()
					.filter(d => d.data.layer === 1);
				effectiveBaseline = d3.mean(group1, d => d.x);
			} else {
				effectiveBaseline = layoutWidth / 2;
			}

			const group45 = rootHierarchy
				.descendants()
				.filter(
					d =>
						d.data.layer !== undefined &&
						(d.data.layer === 4 || d.data.layer === 5),
				);

			const minAllowedXFor45 = 50;
			const maxAllowedXFor45 = layoutWidth + 5000;

			// Adjust combined group (layers 4 and 5):
			if (group45.length > 0) {
				const group45AvgX = d3.mean(group45, d => d.x);
				const shift45 = effectiveBaseline - group45AvgX;
				group45.forEach(d => {
					d.x += shift45;
					d.x = Math.max(minAllowedXFor45, Math.min(d.x, maxAllowedXFor45));
				});

				// Enforce maximum gap between adjacent nodes.
				group45.sort((a, b) => a.x - b.x);
				const maxGap = 1050;
				for (let i = 1; i < group45.length; i++) {
					const gap = group45[i].x - group45[i - 1].x;
					if (gap > maxGap) {
						group45[i].x = group45[i - 1].x + maxGap;
					}
				}
			}

			// ---- NEW: Reassign resource-instance nodes in layer 4 to layer 7 if too far horizontally from connected user nodes ----
			const maxAllowedDistance = 1500;

			rootHierarchy.descendants().forEach(d => {
				// Check only resource-instance nodes currently in layer 4.
				if (
					d.data.layer === 4 &&
					(d.data.classes || '').includes('resource-instance-node')
				) {
					// Find all user nodes that are connected to this resource instance.
					const connectedUserXs = [];
					// Iterate over graphData.edges to find edges where this node is the target.
					graphData.edges.forEach(e => {
						if (e.data.target === d.data.id) {
							const sourceNode = graphData.nodes.find(
								n =>
									n.data.id === e.data.source &&
									(n.classes || '').includes('user-node'),
							);
							if (sourceNode) {
								const sourceLayoutNode = rootHierarchy
									.descendants()
									.find(n => n.data.id === sourceNode.data.id);
								if (sourceLayoutNode) {
									connectedUserXs.push(sourceLayoutNode.x);
								}
							}
						}
					});
					if (connectedUserXs.length > 0) {
						const avgUserX = d3.mean(connectedUserXs);
						// If the horizontal distance exceeds the maximum allowed, update the layer to 7.
						if (Math.abs(d.x - avgUserX) > maxAllowedDistance) {
							d.data.layer = 7;
							d.y = 6.5 * layerSpacing;
						}
					}
				}
			});

			// --- Center each user node (layer 2) based on its layer 3 children only ---
			const userNodes = rootHierarchy
				.descendants()
				.filter(
					d =>
						d.data.layer === 2 && (d.data.classes || '').includes('user-node'),
				);

			userNodes.forEach(user => {
				// Filter children of the user node that are in layer 3.
				const childrenLayer3 = (user.children || []).filter(
					child => child.data.layer === 3,
				);
				if (childrenLayer3.length > 0) {
					// Compute the average x of these children.
					const avgChildX = d3.mean(childrenLayer3, child => child.x);
					// Set the user node's x coordinate to this average.
					user.x = avgChildX;
				}
			});

			// Only adjust spacing for layer 2 nodes (user-nodes)
			const layer2Nodes = nodesByLayer.get(2);
			if (layer2Nodes) {
				layer2Nodes.sort((a, b) => a.x - b.x);
				const minUserSpacing = 4000; // set your desired minimum gap for user nodes
				for (let i = 1; i < layer2Nodes.length; i++) {
					const prev = layer2Nodes[i - 1];
					const curr = layer2Nodes[i];
					if (curr.x - prev.x < minUserSpacing) {
						curr.x = prev.x + minUserSpacing;
					}
				}
			}

			// -----------------------------
			// 3. RENDERING: Create SVG and Container Group (unchanged)
			// -----------------------------
			const svg = d3
				.select('svg')
				.attr('viewBox', \`0 0 \${layoutWidth + 100} \${layoutHeight + 100}\`);

			const defs = svg.append('defs');
			defs
				.append('pattern')
				.attr('id', 'squarePattern')
				.attr('x', 0)
				.attr('y', 0)
				.attr('width', 90)
				.attr('height', 90)
				.attr('patternUnits', 'userSpaceOnUse')
				.html(
					"<rect width='120' height='120' fill='white' />" +
						"<rect x='18' y='18' width='7' height='7' fill='#ccc' />",
				);

			// Create a main group with translation.
			const g = svg.append('g').attr('transform', 'translate(50,50)');

			// Create two subgroups: one for the background and one for the content.
			const bgGroup = g.append('g').attr('class', 'bg-group');
			const contentGroup = g.append('g').attr('class', 'content-group');

			// Insert the background rectangle into the bgGroup.
			bgGroup
				.insert('rect', ':first-child')
				.attr('x', -100000)
				.attr('y', -100000)
				.attr('width', layoutWidth + 200000)
				.attr('height', layoutHeight + 200000)
				.attr('fill', 'url(#squarePattern)');

			// Render nodes into the contentGroup.
			const mainNodes = rootHierarchy
				.descendants()
				.filter(d => d.data.id !== 'dummy_root');

			const nodeGroup = contentGroup
				.selectAll('g.node-main')
				.data(mainNodes)
				.enter()
				.append('g')
				.attr('class', d => 'node-main ' + (d.data.classes || ''))
				.attr('transform', d => \`translate(\${d.x}, \${d.y})\`)
				.call(
					d3
						.drag()
						.on('start', function (event, d) {
							d3.select(this).classed('dragging', true);
						})
						.on('drag', function (event, d) {
							d.x = event.x;
							d.y = event.y;
							d3.select(this).attr('transform', \`translate(\${d.x}, \${d.y})\`);
							updatePortPositions(d);
							updatePortEdges();
						})
						.on('end', function (event, d) {
							d3.select(this).classed('dragging', false);
						}),
				);

			// Helper function to truncate strings.
			function truncateTo7(str = '') {
				return str.length > 7 ? str.substring(0, 7) + '...' : str;
			}

			nodeGroup.each(function (d) {
				const nodeSel = d3.select(this);
				nodeSel.selectAll('*').remove();

				let textSel;
				const classesStr = d.data.classes || '';

				if (classesStr.includes('resource-instance-node')) {
					// -----------------------------------------
					//  resource-instance-node handling
					// -----------------------------------------
					const fullText = d.data.name || '';
					const [resourceTypeRaw, resourceIdRaw] = fullText.split('#');
					const resourceType = truncateTo7(resourceTypeRaw || '');
					const resourceId = truncateTo7(resourceIdRaw || '');
					textSel = nodeSel
						.append('text')
						.attr('class', 'node-text resource-instance-text')
						.attr('text-anchor', 'middle')
						.attr('dominant-baseline', 'middle')
						.attr('dy', '0.15em');
					textSel
						.append('tspan')
						.text(resourceType)
						.attr('fill', 'rgb(0, 106, 220)');
					textSel.append('tspan').text('#').attr('fill', 'rgb(94, 176, 239)');
					textSel
						.append('tspan')
						.text(resourceId)
						.attr('fill', 'rgb(0, 106, 220)');

					// Insert the diamond icon :
					requestAnimationFrame(() => {
						const bbox = textSel.node().getBBox();
						const diamondMargin = 10;
						const diamondWidth = 24;
						const diamondScale = 2.9;
						const diamondCenterX =
							bbox.x +
							bbox.width -
							diamondMargin -
							(diamondWidth * diamondScale) / 2;
						const diamondCenterY = bbox.y + bbox.height / 1.6;

						nodeSel
							.append('path')
							.attr(
								'd',
								\`M 16 8 L 23.5 12 L 16 16 L 12 23.5 L 8 16 L 0.5 12 L 8 8 L 12 0.5 L 16 8 Z\`,
							)
							.attr('fill', 'none')
							.attr('stroke', 'rgb(0, 106, 220)')
							.attr('stroke-width', 2.3)
							.attr(
								'transform',
								\`
          translate(\${diamondCenterX}, \${diamondCenterY})
          scale(\${diamondScale})
          translate(-10, -10)
        \`,
							);
					});
				} else if (classesStr.includes('user-node')) {
					// -----------------------------------------
					// user-node handling WITH a "person+star" icon
					// -----------------------------------------
					textSel = nodeSel
						.append('text')
						.attr('class', 'node-text user-node')
						.attr('text-anchor', 'middle')
						.attr('dominant-baseline', 'middle')
						.attr('dy', '0.15em')
						.text(d.data.name);

					requestAnimationFrame(() => {
						const bbox = textSel.node().getBBox();

						const iconMargin = 10;
						const iconWidth = 24;
						const iconScale = 3.9;

						const iconCenterX = bbox.x + 5;
						const iconCenterY = bbox.y + bbox.height / 1.6;

						const personPlusStarPath = \`
  M12,2
  C9.79,2,8,3.79,8,6
  C8,8.21,9.79,10,12,10
  C14.21,10,16,8.21,16,6
  C16,3.79,14.21,2,12,2
  Z

  M12,10
  A8 8 0 0 1 4,18

  M20,15
  L21,17
  L23,17.5
  L21,18.5
  L21.5,20.5
  L20,19.5
  L18.5,20.5
  L19,18.5
  L17,17.5
  L19,17
  Z
\`.trim();

						nodeSel
							.append('path')
							.attr('d', personPlusStarPath.trim()   )
							.attr('fill', 'none')
							.attr('stroke', 'rgb(67, 48, 43)')
							.attr('stroke-width', 2.3)
							.attr(
								'transform',
								\`
          translate(\${iconCenterX}, \${iconCenterY})
          scale(\${iconScale})
        translate(-13.5, -11.25)
        \`,
							);
					});
				} else {
					// -----------------------------------------
					// Fallback for all other node types
					// -----------------------------------------
					textSel = nodeSel
						.append('text')
						.attr('class', 'node-text ' + classesStr)
						.attr('text-anchor', 'middle')
						.attr('dominant-baseline', 'middle')
						.attr('dy', '0.15em')
						.text(d.data.name);
				}

				// Insert the rounded rectangle behind the text (common to all):
				requestAnimationFrame(() => {
					const bbox = textSel.node().getBBox();
					const paddingX = 120;
					const paddingY = 42;
					const rectWidth = bbox.width + paddingX;
					const rectHeight = bbox.height + paddingY;

					nodeSel
						.insert('rect', 'text')
						.attr('width', rectWidth)
						.attr('height', rectHeight)
						.attr('x', -rectWidth / 2)
						.attr('y', (-rectHeight + 1.3) / 2)
						.attr('rx', 12.5)
						.attr('ry', 12.5);
				});
			});

			// -----------------------------
			// 6. RENDER DUMMY PORT NODES
			// -----------------------------
			const portData = [];
			mainNodes.forEach(d => {
				const inheritedClass = d.data.classes || '';
				portData.push({
					id: d.data.id + '_in',
					main: d.data.id,
					type: 'in',
					x: d.x,
					y: d.y - 75,
					classes: inheritedClass,
					layer: d.data.layer,
				});
				portData.push({
					id: d.data.id + '_out',
					main: d.data.id,
					type: 'out',
					x: d.x,
					y: d.y + 78,
					classes: inheritedClass,
					layer: d.data.layer,
				});
			});

			const portNodeSel = g
				.selectAll('circle.node-port')
				.data(portData, d => d.id)
				.enter()
				.append('circle')
				.attr('class', d => \`node-port \${d.classes}\`)
				.attr('id', d => d.id)
				.attr('r', 10)
				.attr('cx', d => d.x)
				.attr('cy', d => d.y);

			// -----------------------------
			// 7. RENDER PORT EDGES
			// -----------------------------
			const portEdges = rootHierarchy.links().map(link => ({
				source: link.source.data.id + '_out',
				target: link.target.data.id + '_in',
				label: link.target.data.edgeLabel,
				classes:
					(
						graphData.edges.find(
							e =>
								e.data.source === link.source.data.id &&
								e.data.target === link.target.data.id,
						) || {}
					).classes || 'relationship-connection',
			}));

			// Generate extra port edges from extraRelationships by traversing the hierarchy.
			const extraPortEdges = [];
			rootHierarchy.descendants().forEach(d => {
				if (d.data.extraRelationships) {
					d.data.extraRelationships.forEach(rel => {
						extraPortEdges.push({
							source: rel.source + '_out',
							target: d.data.id + '_in',
							label: rel.label,
							classes: 'relationship-connection extra',
						});
					});
				}
			});

			const allEdges = portEdges.concat(extraPortEdges);

			// A helper function that returns a hover opacity based on the target node's layer.
			// (Assumes that the portData for each port includes a "layer" property.)
			function getEdgeHoverOpacity(edgeData) {
				// Look up the target port data.
				const targetPort = portData.find(n => n.id === edgeData.target);
				if (targetPort) {
					const layer = targetPort.layer;
					// Adjust these values as desired.
					if (layer === 2 || layer === 3) {
						return 0.8; // Full opacity for baseline (user) nodes
					} else if (layer === 4) {
						return 0.7; // Slightly lower for layer 4
					} else if (layer === 7) {
						return 0.2; // Lower for layer 7
					} else if (layer === 8) {
						return 0.2; // Even lower for layer 8
					}
				}
				return 1; // default
			}

			// Render extra port edges.
			const extraPortEdgeSel = g
				.selectAll('path.extra-port-link')
				.data(extraPortEdges)
				.enter()
				.append('path')
				.attr('class', d => 'link extra-port-link ' + (d.classes || ''))
				.attr('d', portLinkGenerator)
				.style('opacity', function (edge) {
					return getEdgeHoverOpacity(edge);
				});

			const portEdgeSel = g
				.selectAll('path.port-link')
				.data(portEdges)
				.enter()
				.append('path')
				.attr('class', d => 'link port-link ' + (d.classes || ''))
				.attr('d', portLinkGenerator)
				.style('opacity', function (edge) {
					return getEdgeHoverOpacity(edge);
				});
			function portLinkGenerator(d) {
				const sourceCircle =
					g.select(\`circle.node-port[id="\${d.source}"]\`).node() ||
					document.getElementById(d.source);
				const targetCircle =
					g.select(\`circle.node-port[id="\${d.target}"]\`).node() ||
					document.getElementById(d.target);
				const source = portData.find(n => n.id === d.source);
				const target = portData.find(n => n.id === d.target);
				if (!source || !target) return '';
				const sX = source.x,
					sY = source.y;
				const tX = target.x,
					tY = target.y;
				// Set default control points.
				let cp1 = [sX, sY + 270];
				let cp2 = [tX, tY - 270];

				// If the target node is in layer 4, adjust the control points.
				if (target.layer === 4) {
					cp1 = [sX, sY + 600];
					cp2 = [tX, tY - 600];
				}
				if (target.layer === 7) {
					cp1 = [sX, sY + 5000];
					cp2 = [tX, tY - 1000];
				}

				return \`M \${sX} \${sY} C \${cp1[0]} \${cp1[1]}, \${cp2[0]} \${cp2[1]}, \${tX} \${tY}\`;
			}

			// -----------------------------
			// 8. DRAG BEHAVIOR: Update Port Nodes and Edges on Drag
			// -----------------------------
			function updatePortPositions(d) {
				portData.forEach(p => {
					if (p.main === d.data.id) {
						if (p.type === 'in') {
							p.x = d.x;
							p.y = d.y - 75;
						} else if (p.type === 'out') {
							p.x = d.x;
							p.y = d.y + 80;
						}
					}
				});
				portNodeSel.attr('cx', d => d.x).attr('cy', d => d.y);
			}
			function updatePortEdges() {
				g.selectAll('path.port-link').attr('d', portLinkGenerator);
				g.selectAll('path.extra-port-link').attr('d', portLinkGenerator);
				updateEdgeLabels();
			}

			let nodesLocked = false;
			const lockOpenIcon = \`<svg class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-vubbuv" focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="LockOpenOutlinedIcon"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path></svg>\`;
			const lockClosedIcon = \`<svg class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-vubbuv" focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="LockOutlinedIcon"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path></svg>\`;

			const lockToggleButton = document.getElementById('lock-toggle');
			lockToggleButton.innerHTML = lockOpenIcon;

			// Also update the dot after node drag events.
			nodeGroup.call(
				d3
					.drag()
					.on('start', function (event, d) {
					    if (nodesLocked) return;
						d3.select(this).classed('dragging', true);
					})
					.on('drag', function (event, d) {
					    if (nodesLocked) return;
						d.x = event.x;
						d.y = event.y;
						d3.select(this).attr('transform', \`translate(\${d.x}, \${d.y})\`);
						updatePortPositions(d);
						updatePortEdges();
						updateEdgeLabels();
					})
					.on('end', function (event, d) {
					    if (nodesLocked) return;
						d3.select(this).classed('dragging', false);
					}),
			);

			// -----------------------------
			// 9. ENABLE ZOOM AND PAN
			// -----------------------------
			const zoomBehavior = d3
				.zoom()
				.scaleExtent([7.5, 22])
				.on('zoom', event => {
					// Apply zoom to the entire group (both bgGroup and contentGroup)
					g.attr('transform', event.transform);
					updateMinimapViewport(); // Update minimap on every zoom (including panning)
				});
			svg.call(zoomBehavior);
			g.attr('transform', 'translate(0,0)');
			const initialScale = 12;

			// Zoom control buttons functionality.
			const zoomInButton = document.getElementById('zoom-in');
			const zoomOutButton = document.getElementById('zoom-out');
			zoomInButton.addEventListener('click', () => {
				svg.transition().call(zoomBehavior.scaleBy, 1.2);
			});
			zoomOutButton.addEventListener('click', () => {
				svg.transition().call(zoomBehavior.scaleBy, 0.8);
			});

			// Lock toggle button remains unchanged.
			lockToggleButton.addEventListener('click', () => {
				nodesLocked = !nodesLocked;
				lockToggleButton.innerHTML = nodesLocked
					? lockClosedIcon
					: lockOpenIcon;
			});

			// Compute the center for initial zoom.
			// Use contentGroup (which excludes the huge background) for the bounding box.
			requestAnimationFrame(() => {
				const svgWidth = svg.node().clientWidth;
				const svgHeight = svg.node().clientHeight;
				const centerX = svgWidth / 2;
				const centerY = svgHeight / 2;

				let centerPoint = null;

				// Filter for user nodes from the hierarchy.
				const userNodes = rootHierarchy
					.descendants()
					.filter(
						d =>
							d.data.id !== 'dummy_root' &&
							(d.data.classes || '').includes('user-node'),
					);

				if (userNodes.length > 0) {
					let maxCount = -1;
					let mostConnectedUser = null;

					// Count connections for each user node.
					userNodes.forEach(node => {
						const count = graphData.edges.reduce((acc, edge) => {
							return (
								acc +
								(edge.data.source === node.data.id ||
								edge.data.target === node.data.id
									? 1
									: 0)
							);
						}, 0);
						if (count > maxCount) {
							maxCount = count;
							mostConnectedUser = node;
						}
					});

					// Use the most connected user if it has at least one connection.
					if (mostConnectedUser && maxCount > 0) {
						centerPoint = {
							x: mostConnectedUser.x - mostConnectedUser.x / 11,
							y: mostConnectedUser.y - mostConnectedUser.y * -0.7,
						};
					}
				}

				// Fallback: center on the entire content.
				if (!centerPoint) {
					const bbox = contentGroup.node().getBBox();
					if (bbox.width === 0 || bbox.height === 0) {
						// Use layout center if bounding box is degenerate.
						centerPoint = { x: layoutWidth / 2, y: layoutHeight / 2 };
					} else {
						centerPoint = {
							x: bbox.x + (bbox.width / 2) -5000,
							y: bbox.y + bbox.height / 2,
						};
					}
				}

				// Calculate translation to place the computed center at the SVG center.
				const translateX = centerX - initialScale * centerPoint.x;
				const translateY = centerY - initialScale * centerPoint.y;
				const initialTransform = d3.zoomIdentity
					.translate(translateX, translateY)
					.scale(initialScale);

				svg.call(zoomBehavior.transform, initialTransform);
			});

			// -----------------------------
			// 10. CREATE & UPDATE EDGE LABEL GROUPS WITH BACKGROUND (initially hidden)
			// -----------------------------
			const edgeLabelGroup = g
				.selectAll('g.edge-label-group')
				.data(allEdges, d => d.source + '|' + d.target)
				.enter()
				.append('g')
				.attr('class', d => 'edge-label-group ' + (d.classes || ''))
				.style('opacity', 0);

			// Append a background rectangle into each group (no explicit opacity set here).
			edgeLabelGroup
				.append('rect')
				.attr('class', 'edge-label-bg')
				.style('fill', 'rgb(206, 231, 254)')
				.attr('rx', 5)
				.attr('ry', 5);

			// Append the text element inside each group.
			edgeLabelGroup
				.append('text')
				.attr('class', 'edge-label')
				.attr('dy', -5)
				.attr('text-anchor', 'middle')
				.style('fill', 'rgb(15, 48, 88)')
				.style('font-size', '60px')
				.text(d => d.label);

			// Once rendered, measure each text element and update the background rectangle.
			edgeLabelGroup.each(function () {
				const group = d3.select(this);
				const textElem = group.select('text.edge-label');
				requestAnimationFrame(() => {
					const bbox = textElem.node().getBBox();
					const paddingX = 70; // horizontal padding
					const paddingY = 50; // vertical padding
					const rectWidth = bbox.width + paddingX;
					const rectHeight = bbox.height + paddingY;
					group
						.select('rect.edge-label-bg')
						.attr('width', rectWidth)
						.attr('height', rectHeight)
						.attr('x', -rectWidth / 2)
						.attr('y', -rectHeight / 1.4);
				});
			});

			// Updated updateEdgeLabels function: update the transform on the edge-label groups.
			function updateEdgeLabels() {
				edgeLabelGroup
					.attr('transform', d => {
						const sourceCircle = g
							.select(\`circle.node-port[id="\${d.source}"]\`)
							.node();
						const targetCircle = g
							.select(\`circle.node-port[id="\${d.target}"]\`)
							.node();
						if (sourceCircle && targetCircle) {
							const sX = +sourceCircle.getAttribute('cx');
							const sY = +sourceCircle.getAttribute('cy');
							const tX = +targetCircle.getAttribute('cx');
							const tY = +targetCircle.getAttribute('cy');

							// Look up target port data to check its layer.
							const targetPort = portData.find(n => n.id === d.target);
							if (targetPort && targetPort.layer === 7) {
								// For layer 7 edges, use the modified control points as in portLinkGenerator.
								let cp1 = [sX, sY + 5500];
								let cp2 = [tX, tY - 1000];
								// Compute the cubic Bezier midpoint at t=0.5:
								const midX =
									0.125 * sX + 0.375 * cp1[0] + 0.375 * cp2[0] + 0.125 * tX;
								const midY =
									0.125 * sY + 0.375 * cp1[1] + 0.375 * cp2[1] + 0.125 * tY;
								return \`translate(\${midX}, \${midY})\`;
							} else {
								const midX = (sX + tX) / 2;
								const midY = (sY + tY) / 2;
								return \`translate(\${midX}, \${midY})\`;
							}
						}
						return '';
					})
					.select('text.edge-label')
					.text(d => d.label);
			}
			updateEdgeLabels();

			// -----------------------------
			// TOOLTIP
			// -----------------------------
			const tooltip = document.createElement('div');
			tooltip.id = 'tooltip';
			tooltip.style.position = 'absolute';
			tooltip.style.background = 'rgba(0, 0, 0, 0.7)';
			tooltip.style.color = '#fff';
			tooltip.style.padding = '5px 10px';
			tooltip.style.borderRadius = '12px';
			tooltip.style.fontFamily = "'Manrope', Arial, sans-serif";
			tooltip.style.fontSize = '11.5px';
			tooltip.style.whiteSpace = 'pre-line';
			tooltip.style.display = 'none';
			document.body.appendChild(tooltip);

			nodeGroup
				.on('mouseover', function (event, d) {
					let tooltipText = d.data.name;
					if ((d.data.classes || '').includes('resource-instance-node')) {
						tooltipText +=
							\`
\` + d.data.id2;
					}
					tooltip.innerText = tooltipText;
					tooltip.style.display = 'block';
					Popper.createPopper(this, tooltip, {
						placement: 'bottom',
						modifiers: [{ name: 'offset', options: { offset: [0, 15] } }],
					});
					// For connected edges:
					g.selectAll('path.port-link')
						.filter(
							edge =>
								edge.source === d.data.id + '_out' ||
								edge.target === d.data.id + '_in',
						)
						.transition()
						.duration(200)
						.style('opacity', 2);

					// For connected extra port edges:
					g.selectAll('path.extra-port-link')
						.filter(
							edge =>
								edge.source === d.data.id + '_out' ||
								edge.target === d.data.id + '_in',
						)
						.transition()
						.duration(200)
						.style('opacity', 1);

					// For connected edge label groups:
					g.selectAll('g.edge-label-group')
						.filter(
							edge =>
								edge.source === d.data.id + '_out' ||
								edge.target === d.data.id + '_in',
						)
						.transition()
						.duration(200)
						.style('opacity', 2);
				})
				.on('mouseout', function (event, d) {
					tooltip.style.display = 'none';
					// Revert connected edges to 50% opacity:
					g.selectAll('path.port-link')
						.filter(
							edge =>
								edge.source === d.data.id + '_out' ||
								edge.target === d.data.id + '_in',
						)
						.transition()
						.duration(200)
						.style('opacity', edge => getEdgeHoverOpacity(edge));

					g.selectAll('path.extra-port-link')
						.filter(
							edge =>
								edge.source === d.data.id + '_out' ||
								edge.target === d.data.id + '_in',
						)
						.transition()
						.duration(200)
						.style('opacity', edge => getEdgeHoverOpacity(edge));

					g.selectAll('g.edge-label-group')
						.filter(
							edge =>
								edge.source === d.data.id + '_out' ||
								edge.target === d.data.id + '_in',
						)
						.transition()
						.duration(200)
						.style('opacity', 0);
				});

			// Ensure that all node groups are raised above edges.
			g.selectAll('g.node-main').raise();
			g.selectAll('circle.node-port').raise();

			setTimeout(() => {
				// ===== MINI-MAP SETUP =====
				const miniMapContainer = document.getElementById('minimap-container');
				if (!miniMapContainer) return;

				// Use the container's fixed dimensions from your styles:
				const miniWidth = 400; // as defined in CSS
				const miniHeight = 100; // as defined in CSS
				const margin = 10; // margin to prevent content from touching the edges

				// Create the minimap SVG inside the container.
				const miniSvg = d3
					.select(miniMapContainer)
					.append('svg')
					.attr('width', miniWidth)
					.attr('height', miniHeight)
					.style('background', 'transparent');

				// ----- CLONE THE MAIN GRAPH CONTENT (EXCLUDING BACKGROUND) -----
				// Clone only the contentGroup, so we ignore the huge background in bgGroup.
				const graphClone = contentGroup.node().cloneNode(true);
				// Remove any existing transform so that getBBox() reflects the natural layout.
				graphClone.removeAttribute('transform');

				const miniG = miniSvg.append('g');
				miniG.node().appendChild(graphClone);

				// ----- FIXED SCALE & CENTERING -----
				// Compute the bounding box of the cloned content.
				let bbox = graphClone.getBBox();
				if (bbox.width === 0 || bbox.height === 0) {
					console.warn(
						'Graph bounding box is empty! Check if elements are rendered.',
					);
					return;
				}

				// Calculate scale factors so that the entire bounding box fits inside the minimap (with margin).
				const scaleX = (miniWidth - 2 * margin) / bbox.width;
				const scaleY = (miniHeight - 2 * margin) / bbox.height;
				const fixedScale = Math.min(scaleX, scaleY);

				// Compute the center of the cloned content's bounding box.
				const contentCenter = {
					x: bbox.x + bbox.width / 2,
					y: bbox.y + bbox.height / 2,
				};

				// The desired center in the minimap is at (miniWidth/2, miniHeight/2)
				const desiredCenter = { x: miniWidth / 2, y: miniHeight / 2 };

				// Compute translation so that the content's center aligns with the minimap's center.
				const translateX = desiredCenter.x - fixedScale * contentCenter.x;
				const translateY = desiredCenter.y - fixedScale * contentCenter.y;

				// Apply the computed transform (translation and scale) to the cloned content.
				d3.select(graphClone).attr(
					'transform',
					\`translate(\${translateX}, \${translateY}) scale(\${fixedScale})\`,
				);

				// ----- VIEWPORT INDICATOR -----
				const viewportDot = miniSvg
					.append('circle')
					.attr('r', 2.3)
					.attr('fill', 'rgba(161, 140, 130, 0.5)')
					.attr('pointer-events', 'none');
				viewportDot.raise();

				// ----- UPDATE FUNCTION: Sync Mini-Map Viewport Indicator -----
				function updateMinimapViewport() {
					const t = d3.zoomTransform(g.node());
					const miniWidth = miniMapContainer.clientWidth;
					const miniHeight = miniMapContainer.clientHeight;
					const mainWidth = svg.node().clientWidth;
					const mainHeight = svg.node().clientHeight;

					// Compute the center of the visible area in main graph coordinates.
					const mainCenter = t.invert([mainWidth / 2, mainHeight / 2]);

					// Map that center into minimap coordinates using the fixed scale and translation.
					let miniX = mainCenter[0] * fixedScale + translateX;
					let miniY = mainCenter[1] * fixedScale + translateY;

					// Add extra offset in X by 30 pixels.
					miniX += 80;

					const dotRadius = 2.3; // The radius of the viewport dot.
					miniX = Math.max(dotRadius, Math.min(miniWidth - dotRadius, miniX));
					miniY = Math.max(dotRadius, Math.min(miniHeight - dotRadius, miniY));

					viewportDot.attr('cx', miniX).attr('cy', miniY);
				}

				window.updateMinimapViewport = updateMinimapViewport;

				// Attach update function to the main SVG's zoom event.
				svg.on('zoom.minimap', updateMinimapViewport);
				updateMinimapViewport();
			}, 1000);
		</script>
	</body>
</html>


`;

	writeFileSync(outputHTMLPath, htmlTemplate, 'utf8');
	console.log(`Graph saved as: ${outputHTMLPath}`);
	open(outputHTMLPath);
};
