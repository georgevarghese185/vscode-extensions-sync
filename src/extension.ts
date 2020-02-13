import * as _ from 'lodash';
import * as cp from 'child_process'
import * as vscode from 'vscode';
import { TextEncoder, TextDecoder } from 'util';

enum Action {
	Uninstall,
	Add
}

export async function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('extensions-sync.sync', () => {
		synchronize(context).catch(console.error);
	});

	context.subscriptions.push(disposable);

	try {
		await synchronize(context);
		handleInstalls(context);
	} catch (e) {
		console.error(e);
	}
}

const synchronize = async function (context: vscode.ExtensionContext) {
	const savedExtensions = await readExtensionJSON(context);
	const installedExtensions = getInstalled();

	const newExtensions = _.difference(savedExtensions, installedExtensions);
	await Promise.all(newExtensions.map(install));

	const missingExtensions = _.difference(installedExtensions, savedExtensions);
	const extensionsToSave: Array<string> = [];

	await Promise.all(missingExtensions.map(async extension => {
		const action = await askMissing(extension);
		switch (action) {
			case Action.Uninstall:
				await uninstall(extension);
				break;
			case Action.Add:
				extensionsToSave.push(extension);
				break;
		}
	}));

	if(extensionsToSave.length > 0) {
		await updateJSON(context, _.union(savedExtensions, extensionsToSave));
	}
}

const handleInstalls = function (context: vscode.ExtensionContext) {
	let extensions = getInstalled();
	vscode.extensions.onDidChange(async (e) => {
		try {
			const updatedExtensions = getInstalled();
			const uninstalled = _.difference(extensions, updatedExtensions);
			const installed = _.difference(updatedExtensions, extensions);

			extensions = updatedExtensions;

			const savedList = await readExtensionJSON(context);
			const newList = _.union(_.difference(savedList, uninstalled), installed);

			await updateJSON(context, newList);
		} catch (e) {
			console.error(e);
		}
	})
}

const readExtensionJSON = async function (context: vscode.ExtensionContext) {
	const jsonUri = vscode.Uri.file(getJSONFilePath(context));
	if(!await fileExists(jsonUri)) {
		await updateJSON(context, getInstalled())
	}
	const fs = vscode.workspace.fs;
	const extensionsJson = fromBytes(await fs.readFile(jsonUri));

	if(!Array.isArray(extensionsJson.extensions)) {
		throw new Error('Corrupt/Incorrect file format');
	}

	return extensionsJson.extensions;
}

const updateJSON = async function (context: vscode.ExtensionContext, extensions: Array<string>) {
	const jsonUri = vscode.Uri.file(getJSONFilePath(context));
	const fs = vscode.workspace.fs;

	extensions.sort((a, b) => a.toLocaleLowerCase().localeCompare(b));
	await fs.writeFile(jsonUri, toBytes({ extensions }));
}

const getJSONFilePath = function(context: vscode.ExtensionContext) {
	return `${context.globalStoragePath}/extensions.json`;
}

const getInstalled = function(): Array<string> {
	return vscode.extensions.all
		.filter(e => !isPreinstalledExtension(e))
		.map(e => e.id);
}

const isPreinstalledExtension = function(extension: vscode.Extension<any>) {
	const vsCodeInstallPath = vscode.env.appRoot;
	return extension.extensionPath.indexOf(vsCodeInstallPath) == 0; // Pre-installed extensions are usually inside the VSCode app directory
}

const install = async function(extension: string) {
	await new Promise((resolve, reject) => {
		vscode.window.showInformationMessage(`Installing extension '${extension}'`);
		cp.exec(`code --install-extension ${extension}`, (err, stdout, stderr) => {
			if (err) {
				vscode.window.showErrorMessage(`Failed to install '${extension}': ${stderr}`);
				reject(stderr);
			} else {
				vscode.window.showInformationMessage(`Installed extension '${extension}'`)
				resolve();
			}
		});
	})
}

const uninstall = async function (extension: string) {
	await new Promise((resolve, reject) => {
		vscode.window.showInformationMessage(`Uninstalling extension '${extension}'`);
		cp.exec(`code --uninstall-extension ${extension}`, (err, stdout, stderr) => {
			if (err) {
				vscode.window.showErrorMessage(`Failed to uninstall '${extension}': ${stderr}`);
				reject(stderr);
			} else {
				vscode.window.showInformationMessage(`Uninstalled extension '${extension}'`)
				resolve();
			}
		});
	})
}

const askMissing = async function(extension: string) {
	const action = await vscode.window.showWarningMessage(
		`The extension '${extension}' is installed on your system but is missing from your extensions JSON file. What would you like to do?`,
		"Uninstall it",
		"Add it to the JSON file"
	);

	if (action === "Uninstall it") {
		return Action.Uninstall;
	} else if (action === "Add it to the JSON file") {
		return Action.Add;
	}
}

const fileExists = async function(uri: vscode.Uri) {
	try {
		await vscode.workspace.fs.stat(uri);
		return true
	} catch(e) {
		return false;
	}
}

const toBytes = function(object: any) {
	return new TextEncoder().encode(JSON.stringify(object, null, 2))
}

const fromBytes = function(bytes: Uint8Array): any {
	return JSON.parse(new TextDecoder('utf8').decode(bytes));
}

export function deactivate() {}
