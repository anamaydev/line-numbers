import {MarkdownView, Plugin} from "obsidian";
import {ViewUpdate, ViewPlugin, EditorView, gutter, GutterMarker, BlockInfo, Decoration, DecorationSet} from "@codemirror/view";
import {StateField, EditorState, Transaction, Text, Extension} from "@codemirror/state";
import { LineNumbersSettings, DEFAULT_SETTINGS, LineNumbersSettingTab} from "./settings";

/* data representing the cursor's current position in the editor */
interface CursorData {
  lineNumber: number;
  columnNumber: number;
}

/* GutterMarker rendering a single line number in the gutter */
class LineNumberMarker extends GutterMarker {
  lineNumber: number;
  isActive: boolean;

  constructor(lineNumber: number, isActive: boolean) {
    super();
    this.lineNumber = lineNumber;
    this.isActive = isActive;
  }

  /* create the DOM element that displays the line number */
  toDOM(): HTMLElement {
    const div = document.createElement("div");
    div.textContent = this.lineNumber.toString();
    div.className = this.isActive
      ? "cm-gutterElement active-gutter-highlight"
      : "cm-gutterElement";
    return div;
  }

  /* return true if the other marker has the same line number to skip re-rendering markers with the same line number */
  eq(other: GutterMarker): boolean {
    return other instanceof LineNumberMarker &&
      other.lineNumber === this.lineNumber;

  }
}

/* create a gutter extension that displays line numbers alongside the editor based on the given mode */
const createLineNumberGutter = (settings: LineNumbersSettings) => gutter({
  class: "cm-lineNumbers",
  lineMarker(view: EditorView, line: BlockInfo) {
    /* get the 1-indexed absolute line number for the current line */
    const cursorPosition = view.state.field(cursorPositionField);
    const lineNumber = view.state.doc.lineAt(line.from).number;
    const isActive = cursorPosition.lineNumber === lineNumber;

    if (settings.mode === "relative") {
      return new LineNumberMarker(Math.abs(cursorPosition.lineNumber - lineNumber), isActive);
    }else if(settings.mode === "hybrid") {
      if(cursorPosition.lineNumber === lineNumber) return new LineNumberMarker(lineNumber, isActive);
      else return new LineNumberMarker(Math.abs(cursorPosition.lineNumber - lineNumber), isActive);
    }
    return new LineNumberMarker(lineNumber, isActive);
  },

  /*
  * force the gutter to re-render on every update,
  * gutter immediately reflects the new mode when
  * settings.mode and extensions are refreshed
  * */
  lineMarkerChange(): boolean {
    return true;
  }
});

/* return cursor line and column from a document offset */
function getCursorData(doc: Text, head: number): CursorData {
  const line = doc.lineAt(head);
  return {
    lineNumber: line.number,
    columnNumber: head - line.from + 1,
  };
}

/* StateField that tracks the cursor's line and column across transactions */
const cursorPositionField = StateField.define<CursorData>({
  /* initialise from the editor's starting selection */
  create(state: EditorState): CursorData{
    return getCursorData(state.doc, state.selection.main.head);
  },

  /* recalculate only when the selection has actually changed */
  update(value: CursorData, transaction: Transaction){
    if(!transaction.newSelection.eq(transaction.startState.selection)){
      return getCursorData(transaction.state.doc, transaction.newSelection.main.head);
    }
    return value;
  }
})

/* create a ViewPlugin that recalculates and displays the cursor's line and column on every editor update */
const createCursorPositionPlugin = (statusBarItemElement: HTMLElement) => {
  return ViewPlugin.define<{ decorations: DecorationSet; update(u: ViewUpdate): void; destroy(): void }>(() => ({
    decorations: Decoration.none,

    update(update: ViewUpdate) {
      if(update.selectionSet) {
        const cursorPosition = update.state.field(cursorPositionField);
        statusBarItemElement.setText(`Ln ${cursorPosition.lineNumber}, Col ${cursorPosition.columnNumber}`);

        const line = update.state.doc.lineAt(update.state.selection.main.head);
        /* add a line decoration on the cursor's current line */
        this.decorations = Decoration.set([
          Decoration.line({ class: "active-line-highlight" }).range(line.from)
        ]);
      }
    },

    destroy() {}
  }),
  { decorations: (plugin) => plugin.decorations }
  );
};

/* register the cursor tracking field, status bar plugin, and custom gutter */
export default class LineNumbersPlugin extends Plugin {
  statusBarItemElement: HTMLElement;
  settings: LineNumbersSettings;
  private editorExtensions: Extension[] = [];

  async onload(){
    /* load the settings when the plugin loads */
    await this.loadSettings();
    this.addSettingTab(new LineNumbersSettingTab(this.app, this));

    /* create status bar item */
    this.statusBarItemElement = this.addStatusBarItem();

    const lineNumberModes: Array<"absolute" | "relative" | "hybrid"> = [
      "absolute", "relative", "hybrid"
    ];
    const cursorPositionState = new Map<string, boolean>([
      ["enable", true], ["disable", false]
    ]);

    /* commands for toggling line numbers mode */
    lineNumberModes.forEach((mode) => {
      this.addCommand({
        id: `set-line-numbering-${mode}`,
        name: `Set line numbering: ${mode}`,
        checkCallback: (checking: boolean) => {
          if (checking)
            return this.settings.mode !== mode;

          this.settings.mode = mode;
          void this.saveSettings();
          return;
        },
      });
    });

    /* command for toggling cursor position */
    cursorPositionState.forEach((value, key) => {
      this.addCommand({
        id: `${key}-cursor-position`,
        name: `${key.charAt(0).toUpperCase()}${key.slice(1)} cursor position`,
        checkCallback: (checking: boolean) => {
          const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (checking)
            return !!markdownView && this.settings.showCursorPositionInStatusBar !== value;

          this.settings.showCursorPositionInStatusBar = value;
          void this.saveSettings();
          this.updateStatusBarVisibility();
          return;
        },});
    });

    /* register CodeMirror extensions for cursor tracking, status bar, and line gutter */
    this.editorExtensions = [
      cursorPositionField,
      createCursorPositionPlugin(this.statusBarItemElement),
      createLineNumberGutter(this.settings)
    ]
    this.registerEditorExtension(this.editorExtensions);

    /* hide/show the status bar item depending on whether the active leaf is a Markdown file */
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.updateStatusBarVisibility();
      })
    )

    /* set the initial cursor position when the plugin loads, if a Markdown file is already open */
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if(markdownView){
      const cursor = markdownView.editor.getCursor();
      this.statusBarItemElement.setText(`Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`);
    }

    /* set initial visibility of the status bar item when plugin first loads */
    this.updateStatusBarVisibility();
  }

  refreshExtensions(): void {
    /* clear without creating a new array (empties the array so the same reference is reused */
    this.editorExtensions.length = 0;

    /* push fresh extensions that capture the updated settings */
    this.editorExtensions.push(
      cursorPositionField,
      createCursorPositionPlugin(this.statusBarItemElement),
      createLineNumberGutter(this.settings)     /* capture current settings.mode*/
    );
    this.app.workspace.updateOptions();         /* force Obsidian to re-apply extensions */
  }

  /* toggle status bar visibility based on settings and active view */
  updateStatusBarVisibility(): void {
    if (!this.settings.showCursorPositionInStatusBar) {
      this.statusBarItemElement.addClass("statusbar-cursor-position");
      return;
    }
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!markdownView) {
      this.statusBarItemElement.addClass("statusbar-cursor-position");
    } else {
      this.statusBarItemElement.removeClass("statusbar-cursor-position");
    }
  }

  /* retrieve data from disk */
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<LineNumbersSettings>);
  }

  /* save data from disk */
  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    this.statusBarItemElement.remove();
  }
}