// import { Text } from "ink";
// import SelectInput from "ink-select-input";
// import Spinner from "ink-spinner";
// import React, { useEffect } from "react";

// export default function WorkspaceSelector({
//     onWorkspaceSelection: (Item<string>)
// }) {
//     const [authToken, loadingAuth, authCookie] = useAuth();
//     const [workspaces, setWorkspaces] = useState([]);

//     const fetchWorkspaces = useCallback(async () => {
// 		if (!authToken) {
// 			return;
// 		}

// 		try {
// 			const { response: items, status } = await apiCall(
// 				`v2/orgs`,
// 				authToken ?? '',
// 				authCookie,
// 			);

// 			if (!items.map) {
// 				return;
// 			}

// 			const workspaces: Array<Item<string>> = items.map((w: any) => ({
// 				label: w.name,
// 				value: w.id,
// 			}));

// 			if (status === 200) {
// 				if (workspaces.length === 1 && workspaces[0]) {
// 					handleWorkspaceSelection(workspaces[0]);
// 				} else if (workspace) {
// 					const selectedWorkspace = workspaces.find(
// 						(w: any) => w.id === workspace,
// 					);
// 					if (selectedWorkspace) {
// 						handleWorkspaceSelection(selectedWorkspace);
// 					}
// 				}

// 				setWorkspaces(workspaces);
// 			} else {
// 				onError('Failed to fetch workspaces');
// 			}
// 		} catch (error) {
// 			onError(error as string);
// 		}
// 	}, [authCookie, authToken, workspace, handleWorkspaceSelection, onError]);

//     useEffect(() => {
//     }, []);

//     return ((workspaces && workspaces.length > 0 ? (
//         <>
//             <Text>Select a workspace</Text>
//             <SelectInput
//                 items={workspaces}
//                 onSelect={handleWorkspaceSelection}
//             />
//         </>
//     ) : (
//         <Text>
//             <Spinner type="dots" /> Loading Workspaces
//         </Text>
//     ))})
// }
