import {App, PluginSettingTab, Setting} from "obsidian";
import LineNumbersPlugin from "./main";

/* defines the shape of the plugin's settings object */
export interface LineNumbersSettings {
	mode: "absolute" | "relative" | "hybrid";
	showCursorPositionInStatusBar: boolean;
}

/* default settings  */
export const DEFAULT_SETTINGS: LineNumbersSettings = {
	mode: "hybrid",
	showCursorPositionInStatusBar: true,
}

/* setting tab displayed in Obsidian's plugin settings panel */
export class LineNumbersSettingTab extends PluginSettingTab {
	/* reference to the main plugin instance */
	plugin: LineNumbersPlugin;

	/* initializes the setting tab with the app and plugin instances */
	constructor(app: App, plugin: LineNumbersPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/* renders the settings UI into the settings panel container */
	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		/* dropdown setting for selecting the line numbering mode */
		new Setting(containerEl)
			.setName("Line numbering mode")
			.setDesc("Choose how line numbers are shown in the editor: absolute, relative to the cursor, or hybrid.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("absolute", "Absolute")
					.addOption("relative", "Relative")
					.addOption("hybrid", "Hybrid")
					.setValue(this.plugin.settings.mode)
					/* persists the selected mode to settings on change */
					.onChange((value) => {
						this.plugin.settings.mode = value as "absolute" | "relative" | "hybrid";
						void this.plugin.saveSettings();

						/* notify the editor that extensions need rebuilding
						* so the gutter immediately reflects the new line number mode
						* */
						this.plugin.refreshExtensions();
					})
			);

		/* toggle setting for showing cursor position in the status bar */
		new Setting(containerEl)
			.setName("Show cursor position in status bar")
			.setDesc("Display the current cursor line and column position in the status bar.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showCursorPositionInStatusBar)
					/* persists the toggle state to settings on change */
					.onChange((value) => {
						this.plugin.settings.showCursorPositionInStatusBar = value;
						void this.plugin.saveSettings();
						this.plugin.updateStatusBarVisibility();
					})
			);
	}
}
