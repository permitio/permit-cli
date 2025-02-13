import { writeFileSync } from 'fs';
import { resolve } from 'path';
import open from 'open';

export const saveHTMLGraph = (graphData: { nodes: any[]; edges: any[] }) => {
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
				background: linear-gradient(180deg, #fff1e7 0%, #ffe0d2 100%);
				background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAj0lEQVR4Ae3YMQoEIRBE0Ro1NhHvfz8xMhXc3RnYGyjFwH8n6E931NfnRy8W9HIEuBHgRoAbAW4EuBHgRoAbAW4EuBHglrTZGEOtNcUYVUpRzlknbd9A711rLc05n5DTtgfcw//dWzhte0CtVSklhRCeEzrt4jNnRoAbAW4EuBHgRoAbAW4EuBHgRoAbAW5fFH4dU6tFNJ4AAAAASUVORK5CYII=');
			}
			/* Main node style */
			.node-main rect {
				fill: #ffffff;
				stroke: rgb(211, 179, 250);
				stroke-width: 10px;
				rx: 65px;
				ry: 65px;
			}
			.node-main text {
				fill: rgb(151, 78, 242);
				font-size: 55px;
				font-weight: 700;
				pointer-events: none;
				font-family: 'Manrope', Arial, sans-serif;
				text-anchor: middle;
				dominant-baseline: middle;
			}

			.node-text.user-node {
				/* Specific styling for text on user nodes */
				fill: #ff6600; /* for example */
				dominant-baseline: middle;
				text-anchor: middle;
			}

			.node-text.resource-instance-node {
				/* Specific styling for text on resource instance nodes */
				fill: #7e23ec;
				dominant-baseline: middle;
				text-anchor: middle;
			}

			/* -------------------------------
 USER NODE SPECIFIC STYLE
---------------------------------*/
			.node-main.user-node rect {
				fill: #fff0e7;
				stroke: #fab587;
				stroke-width: 15px;
			}

			/* -------------------------------
//   RESOURCE INSTANCE NODE STYLE
---------------------------------*/
			.node-main.resource-instance-node rect {
				fill: #f4eefc;
				stroke: #caa5f7;
			}

			/* Port node style */
			.node-port {
				fill: #ffffff;
				stroke: rgb(211, 179, 250);
				stroke-width: 2px;
			}
			/* Link (edge) style for port edges */
			.link {
				fill: none;
				stroke: rgb(18, 165, 148);
				stroke-width: 3px;
				stroke-dasharray: 30, 25;
				animation: dash 0.5s linear infinite;
			}
			@keyframes dash {
				to {
					stroke-dashoffset: -55;
				}
			}
			/* -------------------------------
   RELATIONSHIP CONNECTION EDGES
---------------------------------*/
			.link.relationship-connection {
				stroke: #f76a0c;
			}

			/* -------------------------------
   EDGE LABELS
---------------------------------*/
			.edge-label {
				fill: #ffffff;
				font-size: 25px;
				font-family: 'Manrope', Arial, sans-serif;
				/* If you need a background for the text (as in Cytoscape),
     you'll need to render a separate rectangle behind the text.
     This snippet just sets the text styling. */
			}
		</style>
	</head>
	<body>
		<div id="title">Permit ReBAC Graph</div>
		<svg></svg>
		<script>
			/***********************
			 * 1. DATA & HIERARCHY
			 ***********************/
			// Assume your dynamic graph data (flat, Cytoscape-style) is injected here.
			// For example:
			const graphData = ${JSON.stringify(graphData, null, 2)};

			function flatToForest(flatNodes, flatEdges) {
				const nodeMap = new Map();

				// Create a node object for each flat node.
				flatNodes.forEach(n => {
					nodeMap.set(n.data.id, {
						id: n.data.id,
						name: n.data.label.trim(),
						classes: n.classes,
						children: [],
						incomingEdges: [], // Optionally store additional edge labels here.
					});
				});

				// Keep track of which nodes have already been attached as a child.
				const attached = new Set();

				// Process each edge.
				flatEdges.forEach(edge => {
					const sourceId = edge.data.source;
					const targetId = edge.data.target;
					if (nodeMap.has(sourceId) && nodeMap.has(targetId)) {
						// Get the source and target node objects.
						const sourceNode = nodeMap.get(sourceId);
						const targetNode = nodeMap.get(targetId);

						// If this target hasn't been attached yet, attach it as a child of source.
						if (!attached.has(targetId)) {
							sourceNode.children.push(targetNode);
							attached.add(targetId);
							// Optionally, store this edge's label on the target node:
							targetNode.edgeLabel = edge.data.label;
						} else {
							// If the target is already attached, you can optionally store additional edge labels.
							targetNode.incomingEdges.push(edge.data.label);
						}
					}
				});

				// The roots are those nodes that never appear as a target.
				const forest = [];
				flatNodes.forEach(n => {
					if (!attached.has(n.data.id)) {
						forest.push(nodeMap.get(n.data.id));
					}
				});

				// If no root is found (shouldn't normally happen), return all nodes.
				if (forest.length === 0) {
					flatNodes.forEach(n => forest.push(nodeMap.get(n.data.id)));
				}

				return forest;
			}

			const forest = flatToForest(graphData.nodes, graphData.edges);

			// If multiple roots, wrap them in a dummy root:
			const dummyRoot = { id: 'dummy_root', name: 'Root', children: forest };

			// Create D3 hierarchy.
			const rootHierarchy = d3.hierarchy(dummyRoot);

			// -----------------------------
			// 2. LAYOUT: Compute Tree Layout
			// -----------------------------
			const layoutWidth = window.innerWidth * 100; // Expand horizontal space as needed.
			const layoutHeight = (window.innerHeight - 100) * 4; // Vertical space remains as needed.

			// For a top-to-bottom layout, we want the root at the top.
			// One common approach is to set size as [width, height] and then use a vertical link generator.
			const treeLayout = d3
				.tree()
				.size([layoutWidth, layoutHeight])
				.separation((a, b) => (a.parent === b.parent ? 1.5 : 2.5));

			treeLayout(rootHierarchy);

			// -----------------------------
			// 3. RENDERING: Create SVG and Container Group
			// -----------------------------
			const svg = d3
				.select('svg')
				.attr('viewBox', \`0 0 \${layoutWidth + 100} \${layoutHeight + 100}\`);
			const g = svg.append('g').attr('transform', 'translate(50,50)');

			// -----------------------------
			// 4. RENDER MAIN LINKS (if needed)
			// -----------------------------
			// (We will later add port edges and use them for connection.)
			// For now, render links from the hierarchy using a vertical link generator.
			const linkGenerator = d3
				.linkVertical()
				.x(d => d.x)
				.y(d => d.y);

			// Uncomment if you want to see the original links:
			// g.selectAll("path.link")
			//   .data(rootHierarchy.links())
			//   .enter()
			//   .append("path")
			//   .attr("class", "link")
			//   .attr("d", linkGenerator);

			// -----------------------------
			// 5. RENDER MAIN NODES
			// -----------------------------
			// Render nodes from the hierarchy (excluding the dummy root)
			const mainNodes = rootHierarchy
				.descendants()
				.filter(d => d.data.id !== 'dummy_root');
			const nodeGroup = g
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
							// Update node coordinates.
							d.x = event.x;
							d.y = event.y;
							d3.select(this).attr('transform', \`translate(\${d.x}, \${d.y})\`);
							// Update port nodes and port edges.
							updatePortPositions(d);
							updatePortEdges();
						})
						.on('end', function (event, d) {
							d3.select(this).classed('dragging', false);
						}),
				);

			// Append rectangle and text for each main node.
			nodeGroup
				.append('rect')
				.attr('width', 650)
				.attr('height', 120)
				.attr('x', -325)
				.attr('y', -60);

			nodeGroup
				.append('text')
				.attr('class', d => 'node-text ' + (d.data.classes || ''))
				.attr('dy', '0.15em')
				.attr('text-anchor', 'middle')
				.attr('dominant-baseline', 'middle')
				.text(d => {
					const fullText = d.data.name;
					return fullText.length > 17
						? fullText.substring(0, 15) + '...'
						: fullText;
				});

			// -----------------------------
			// 6. RENDER DUMMY PORT NODES
			// -----------------------------
			// For each main node, we create two dummy port nodes:
			// One for incoming (id: mainID_in) and one for outgoing (id: mainID_out).
			// Compute an array for port nodes based on the mainNodes data.
			const portData = [];
			mainNodes.forEach(d => {
				portData.push({
					id: d.data.id + '_in',
					main: d.data.id,
					type: 'in',
					x: d.x, // Initially, same as main node.
					y: d.y - 70, // Offset above.
				});
				portData.push({
					id: d.data.id + '_out',
					main: d.data.id,
					type: 'out',
					x: d.x, // Initially, same as main node.
					y: d.y + 70, // Offset below.
				});
			});

			const portNodeSel = g
				.selectAll('circle.node-port')
				.data(portData, d => d.id)
				.enter()
				.append('circle')
				.attr('class', 'node-port')
				.attr('id', d => d.id)
				.attr('r', 5)
				.attr('cx', d => d.x)
				.attr('cy', d => d.y);

			// -----------------------------
			// 7. RENDER PORT EDGES
			// -----------------------------
			// For every link in the hierarchy (parent-to-child),
			// create a new edge that connects the parent's outgoing port to the child's incoming port.
			const portEdges = rootHierarchy.links().map(link => ({
				source: link.source.data.id + '_out',
				target: link.target.data.id + '_in',
				label: link.target.data.edgeLabel, // optional
				classes:
					(
						graphData.edges.find(
							e =>
								e.data.source === link.source.data.id &&
								e.data.target === link.target.data.id,
						) || {}
					).classes || 'relationship-connection',
			}));
			console.log(portEdges);
			// Render these port edges.
			const portEdgeSel = g
				.selectAll('path.port-link')
				.data(portEdges)
				.enter()
				.append('path')
				.attr('class', d => 'link port-link ' + (d.classes || ''))
				.attr('d', portLinkGenerator);

			// Define a function to generate the path for a port edge.
			function portLinkGenerator(d) {
				// For parent's out port and child's in port, get positions from the rendered circles.
				const sourceCircle =
					g.select(\`circle.node-port[id="\${d.source}"]\`).node() ||
					document.getElementById(d.source);
				const targetCircle =
					g.select(\`circle.node-port[id="\${d.target}"]\`).node() ||
					document.getElementById(d.target);
				// Alternatively, find in our portData array:
				const source = portData.find(n => n.id === d.source);
				const target = portData.find(n => n.id === d.target);
				if (!source || !target) return '';
				const sX = source.x,
					sY = source.y;
				const tX = target.x,
					tY = target.y;
				// Compute control points for an S-shaped curve:
				const cp1 = [sX, sY + 270];
				const cp2 = [tX, tY - 270];
				return \`M \${sX} \${sY} C \${cp1[0]} \${cp1[1]}, \${cp2[0]} \${cp2[1]}, \${tX} \${tY}\`;
			}

			// -----------------------------
			// 8. Drag Behavior: Update Port Nodes and Edges on Drag
			// -----------------------------
			function updatePortPositions(d) {
				// Update portData for the main node d.
				portData.forEach(p => {
					if (p.main === d.data.id) {
						if (p.type === 'in') {
							p.x = d.x;
							p.y = d.y - 40;
						} else if (p.type === 'out') {
							p.x = d.x;
							p.y = d.y + 40;
						}
					}
				});
				// Update the SVG circles for port nodes.
				portNodeSel.attr('cx', d => d.x).attr('cy', d => d.y);
			}

			function updatePortEdges() {
				g.selectAll('path.port-link').attr('d', portLinkGenerator);
				updateEdgeLabels();
			}

			// Reassign drag behavior on main nodes to update ports and port edges.
			nodeGroup.call(
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
						updateEdgeLabels();
					})
					.on('end', function (event, d) {
						d3.select(this).classed('dragging', false);
					}),
			);

			// -----------------------------
			// 9. Enable Zoom and Pan
			// -----------------------------
			// Create and store your zoom behavior instance.
			const zoomBehavior = d3
				.zoom()
				.scaleExtent([0.5, 22])
				.on('zoom', event => {
					g.attr('transform', event.transform);
				});

			// Apply the zoom behavior to your SVG.
			svg.call(zoomBehavior);

			// Reset any transform so we get a proper bounding box.
			g.attr('transform', 'translate(0,0)');

			requestAnimationFrame(() => {
				const bbox = g.node().getBBox();
				const svgWidth = svg.node().clientWidth;
				const svgHeight = svg.node().clientHeight;
				const centerX = svgWidth / 2;
				const centerY = svgHeight / 2;
				const graphCenterX = bbox.x + bbox.width / 2;
				const graphCenterY = bbox.y + bbox.height / 2;

				const initialScale = 15; // desired zoom level
				// Multiply the graph center coordinates by the scale factor:
				const translateX = centerX - initialScale * graphCenterX;
				const translateY = centerY - initialScale * graphCenterY;

				const initialTransform = d3.zoomIdentity
					.translate(translateX, translateY)
					.scale(initialScale);

				svg.call(zoomBehavior.transform, initialTransform);
			});

			// -----------------------------
			// 10. Update Link Paths Function (if needed)
			// -----------------------------
			// In this example, we update only port edges.
			// If you had additional links to update, call updatePortEdges() accordingly.
			// 1. Create (or select) a group for edge labels (if not already created)
			const edgeLabelGroup = g
				.selectAll('text.edge-label')
				.data(portEdges, d => d.source + '|' + d.target)
				.enter()
				.append('text')
				.attr('class', d => 'edge-label ' + (d.classes || ''))
				.attr('dy', -5) // Adjust vertical offset as needed
				.attr('text-anchor', 'middle')
				.style('fill', '#000000') // Label color
				.style('font-size', '60px')
				.text(d => d.label);

			updateEdgeLabels();

			// 2. Create a function to update label positions based on the port node positions.
			//    This function calculates the midpoint between the source and target port nodes.
			function updateEdgeLabels() {
				g.selectAll('text.edge-label')
					.data(portEdges, d => d.source + '|' + d.target)
					.attr('transform', d => {
						// Use the rendered port nodes (by their IDs)
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
							const midX = (sX + tX) / 2;
							const midY = (sY + tY) / 2;
							return \`translate(\${midX}, \${midY})\`;
						}
						return '';
					})
					.text(d => d.label);
			}

			// Create a tooltip div and append it to the body.
			const tooltip = document.createElement('div');
			tooltip.id = 'tooltip';
			tooltip.style.position = 'absolute';
			tooltip.style.background = 'rgba(0, 0, 0, 0.7)';
			tooltip.style.color = '#fff';
			tooltip.style.padding = '5px 10px';
			tooltip.style.borderRadius = '3px';
			tooltip.style.fontFamily = "'Manrope', Arial, sans-serif";
			tooltip.style.fontSize = '18px';
			tooltip.style.display = 'none'; // Initially hidden
			document.body.appendChild(tooltip);

			nodeGroup
				.on('mouseover', function (event, d) {
					// Set the tooltip content to the full text (or any desired content).
					tooltip.innerText = d.data.name;
					tooltip.style.display = 'block';

					// Create a Popper instance to position the tooltip relative to the hovered node.
					// We pass 'this' (the DOM element for the node) as the reference.
					Popper.createPopper(this, tooltip, {
						placement: 'bottom', // or "bottom", "right", etc.
						modifiers: [
							{
								name: 'offset',
								options: {
									offset: [0, 8], // Adjust the offset as needed.
								},
							},
						],
					});
				})
				.on('mousemove', function (event, d) {
					// Optionally update the tooltip position if needed; Popper generally handles this.
					// You might want to update the content or force an update if required.
				})
				.on('mouseout', function (event, d) {
					tooltip.style.display = 'none';
				});
		</script>
	</body>
</html>


`;

	writeFileSync(outputHTMLPath, htmlTemplate, 'utf8');
	console.log(`Graph saved as: ${outputHTMLPath}`);
	open(outputHTMLPath);
};
