# Advanced Line Numbers

An Obsidian plugin that enhances the editor with customizable line numbers and active line highlighting.

## Features

### Line Number Modes
- Absolute - Standard line numbers (1, 2, 3...)
- Relative - Shows distance from current line (useful for vim-style navigation)
- Hybrid - Combines both: absolute number on current line, relative on others

### Active Line Highlighting
- Highlight the active line in the editor
- Highlight the active line in the gutter
- Highlight the active line number with a distinct color

### Status Bar
- Displays cursor's position (Ln X, Col Y)

## Screenshots
### Line Number Modes
![Absolute Mode](screenshots/absolute-line-numbers.gif)
![Relative Mode](screenshots/relative-line-numbers.gif)
![Hybrid Mode](screenshots/hybrid-line-numbers.gif)

### Cursor's Position In Status Bar
![Cursor's Position](screenshots/cursor-position-statusbar.gif)

## Installation

### From Community Plugins
1. Open Settings → Community Plugins
2. Search for "Advanced Line Numbers"
3. Click Install, then Enable

### Manual Installation
1. Download `main.js`, `styles.css`, and `manifest.json` from the latest release
2. Create folder: `VaultFolder/.obsidian/plugins/advanced-line-numbers/`
3. Copy the downloaded files into the folder
4. Reload Obsidian and enable the plugin in Settings → Community Plugins

## Settings
| Setting                   | Description                                  |
|---------------------------|----------------------------------------------|
| Line Number Mode          | Choose between Absolute, Relative, or Hybrid |
| Display Cursor's Position | Toggle on and off                            |

## Development
```bash
# Install dependencies
npm install

# Build for development (watch mode)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Support
- [Report a bug](https://github.com/anamaydev/advanced-line-numbers/issues)
- [Request a feature](https://github.com/anamaydev/advanced-line-numbers/issues)

## License
MIT