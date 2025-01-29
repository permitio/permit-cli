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
		<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.23.0/cytoscape.min.js"></script>
		<link
			href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&display=swap"
			rel="stylesheet"
		/>
		<script src="https://unpkg.com/@popperjs/core@2"></script>
		<script src="https://unpkg.com/cytoscape-popper@2.0.0"></script>

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

			#cy {
				flex: 1;
				width: 100%;
				background-color: linear-gradient(
					180deg,
					#fff1e7 0%,
					#ffe0d2 100%
				); /* Base background color */
				padding: 10px;
				background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAj0lEQVR4Ae3YMQoEIRBE0Ro1NhHvfz8xMhXc3RnYGyjFwH8n6E931NfnRy8W9HIEuBHgRoAbAW4EuBHgRoAbAW4EuBHglrTZGEOtNcUYVUpRzlknbd9A711rLc05n5DTtgfcw//dWzhte0CtVSklhRCeEzrt4jNnRoAbAW4EuBHgRoAbAW4EuBHgRoAbAW5fFH4dU6tFNJ4AAAAASUVORK5CYII=');
				background-size: 30px 35px; /* Matches the original image dimensions */
				background-repeat: repeat; /* Ensures the pattern repeats */
			}

			.popper-content {
				background-color: rgb(255, 255, 255);
				color: rgb(151, 78, 242);
				border: 2px solid rgb(211, 179, 250);
				padding: 10px;
				border-radius: 5px;
				font-family: 'Manrope', Arial, sans-serif;
				font-size: 14px;
				font-weight: 700;
				max-width: 200px;
				word-wrap: break-word;
				display: none; /* Initially hidden */
				position: absolute; /* Positioning for the popper */
				z-index: 9999; /* Ensure it is on top */
				box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
				border-radius: 8px;
				transition: opacity 0.2s ease-in-out;
				letter-spacing: 0.5px; /* Works in standard HTML */
			}
		</style>
</head>
<body>
    <div id="title">Permit ReBAC Graph</div>
    <div id="cy"></div>
    <script>
        const graphData = ${JSON.stringify(graphData, null, 2)};

			const cy = cytoscape({
				container: document.getElementById('cy'),
				elements: [...graphData.nodes, ...graphData.edges],
				style: [
					{
						selector: 'edge',
						style: {
							'line-color': 'rgb(18, 165, 148)',
							width: 9,
							'line-style': 'dashed',
							'line-dash-pattern': [10, 5],
							shape: 'round-rectangle',
							'target-arrow-shape': 'triangle',
							'target-arrow-color': 'rgb(18, 165, 148)',
							'curve-style': 'taxi',
							'taxi-turn': '45%',
							'taxi-direction': 'vertical',
							'taxi-turn-min-distance': 5,
							'target-label': 'data(label)',
							color: '#ffffff',
							'font-size': 75,
							'font-family': 'Manrope, Arial, sans-serif',
							'font-weight': 500 /* Adjusted for edge labels */,
							'text-background-color': 'rgb(18, 165, 148)',
							'text-background-opacity': 1,
							'text-background-padding': 10,
							'text-background-shape': 'round-rectangle',
							'text-rotation': 'autorotate', // Added for label rotation
							'target-distance-from-node': 86,
							'target-text-offset': 65,
							'target-text-rotation': 'autorotate',
							'text-outline-color': 'rgba(0, 0, 0, 0.2)', // Soft glow effect
							'text-outline-width': 3, // Adds contrast to text
						},
					},
					{
						selector: 'edge.relationship-connection',
						style: {
							'line-color': '#F76808',
							'target-arrow-color': '#F76808',
							'text-background-color': '#F76808',
							color: '#ffffff',
							'target-distance-from-node': 2,
							'target-text-offset': 13,
						},
					},
					{
						selector: 'node',
						style: {
							'background-color': 'rgb(255, 255, 255)',
							'border-color': 'rgb(211, 179, 250)',
							'border-width': 13,
							shape: 'round-rectangle',
							label: 'data(label)',
							color: 'rgb(151, 78, 242)',
							'font-size': 85,
							'font-family': 'Manrope, Arial, sans-serif',
							'font-weight': 700 /* Adjusted for node labels */,
							width: '600',
							height: '600',
							padding: 15,
							textWrap: 'wrap',
							'text-valign': 'center',
							'text-halign': 'center',
							'text-outline-color': 'rgba(151, 78, 242, 0.6)',
							'text-outline-width': 3, // Makes text stand out
							'text-background-color': 'rgba(255, 255, 255, 0.5)', // Light text background for clarity
							'text-background-opacity': 1,
							'text-background-padding': 5,
							'text-background-shape': 'round-rectangle',
						},
					},
					{
						selector: 'node.user-node',
						style: {
							shape: 'ellipse',
							'border-width': 15,
							'border-color': '#FFB381' /*light Orange border */,
							'font-size': 90,
							padding: 15,
							width: '800',
							height: '800',
							color: '#F76808' /* Orange text */,
							textWrap: 'wrap',
							'text-valign': 'center',
							'text-halign': 'center',
							'text-outline-color': '#F76808',
							'text-outline-width': 3, // Makes text stand out
							'text-background-color': 'rgba(255, 255, 255, 0.5)', // Light text background for clarity
							'text-background-opacity': 1,
							'text-background-padding': 5,
							'text-background-shape': 'round-rectangle',
						},
					},
					{
						selector: 'node.resource-instance-node',
						style: {
							'border-color': '#D3B3FA' /* light Purple border */,
							color: '#974EF2' /* Purple text */,
							'text-outline-color': 'rgba(151, 78, 242, 0.6)',
							'text-outline-width': 3, // Makes text stand out
							'text-background-color': 'rgba(255, 255, 255, 0.5)', // Light text background for clarity
							'text-background-opacity': 1,
							'text-background-padding': 5,
							'text-background-shape': 'round-rectangle',
						},
					},
				],
				layout: {
					name: 'cose',
					animate: true, // Animates the layout
					fit: true, // Ensures the graph fits in the viewport
					padding: 10, // Padding around the graph
					nodeDimensionsIncludeLabels: true, // Includes label dimensions
					randomize: false, // Starts from current positions
					avoidOverlap: true, // Prevents nodes from overlapping
					componentSpacing: 1000, // Increased spacing between connected components
					nodeRepulsion: 20000, // Increased strength of the node repulsion force
					idealEdgeLength: 200, // Increased ideal length of edges
					edgeElasticity: 1000, // Elasticity of edges
					gravity: 1, // Gravity force applied to the nodes
					maxSimulationTime: 2000, // Max time for simulation
					numIter: 2500, // Maximum iterations to run
					initialTemp: 200, // Initial cooling temperature
					coolingFactor: 0.95, // Cooling factor for the simulation
					minTemp: 1.0, // Minimum temperature to stop the simulation
				},
			});
			
     	
      // Function to wrap text
        function wrapText(text, lineLength) {
            const regex = new RegExp(\`.{1,\${lineLength}}\`, 'g');
            return text.match(regex)?.join('\\n') || text;
        }

      // Preprocess node labels for resource-instance-node
			cy.nodes('.resource-instance-node').forEach(node => {
				const originalLabel = node.data('label'); // Get the original label
				const resource = originalLabel.split('#')[0]; // Extract the resource part
				const wrappedLabel = wrapText(resource, 14); // Wrap the resource text
				node.data('label', wrappedLabel); // Update the node label with the wrapped text

				// Create a popper for the full label
				const popperDiv = document.createElement('div');
				popperDiv.classList.add('popper-content');
				popperDiv.innerHTML = originalLabel;
				document.body.appendChild(popperDiv);

				const popper = node.popper({
					content: () => popperDiv,
					popper: {
						placement: 'top',
						modifiers: [
							{
								name: 'offset',
								options: {
									offset: [0, 10],
								},
							},
						],
					},
				});

				// Show popper on hover
				node.on('mouseover', () => {
					popper.update();
					popperDiv.style.display = 'block';
				});

				// Hide popper on mouseout
				node.on('mouseout', () => {
					popperDiv.style.display = 'none';
				});
			});

			cy.nodes().forEach(node => {
				let label = node.data('label');
				let spacedLabel = label.split('').join('\u200A'); // Adds small spaces between letters
				node.data('label', spacedLabel);
			});

			// Preprocess node labels for resource-instance-node
			cy.nodes('.user-node').forEach(node => {
				const originalLabel = node.data('label'); // Get the original label
				const wrappedLabel = wrapText(originalLabel, 14); // Wrap the label text
				node.data('label', wrappedLabel); // Update the node label with the wrapped text
			});
			// Track target nodes and offsets dynamically
			const targetOffsets = new Map(); // Keeps track of target nodes and their current offset

			cy.edges().forEach(edge => {
				const target = edge.target().id(); // Get the target node ID
				let offset = targetOffsets.get(target) || 37; // Default starting offset is 37

				// Set the target-text-offset for the edge
				edge.style('target-text-offset', offset);

				// Update the offset for the next edge targeting the same node
				targetOffsets.set(target, offset + 105); // Increment by 105
			});
		</script>
	</body>
</html>

`;

	writeFileSync(outputHTMLPath, htmlTemplate, 'utf8');
	console.log(`Graph saved as: ${outputHTMLPath}`);
	open(outputHTMLPath);
};
