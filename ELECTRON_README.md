# Staff Manager - Electron Desktop App

## Building the Desktop Application

This project includes an Electron wrapper to create a standalone Windows `.exe` application.

### Prerequisites
- Node.js 18+ installed
- Yarn package manager
- Windows OS (for building .exe) or use GitHub Actions

### Local Development

1. **Build the React frontend:**
   ```bash
   cd frontend
   yarn install
   yarn build
   ```

2. **Copy build to electron folder:**
   ```bash
   mkdir -p electron/build
   cp -r frontend/build/* electron/build/
   ```

3. **Install Electron dependencies:**
   ```bash
   cd electron
   yarn install
   ```

4. **Run in development mode:**
   ```bash
   yarn start
   ```

5. **Build Windows executable:**
   ```bash
   yarn build:win
   ```

The `.exe` installer will be created in `electron/dist/` folder.

### Automatic Builds with GitHub Actions

The project includes a GitHub Actions workflow that automatically builds and releases the Windows executable when you:

1. **Push a version tag:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Manual trigger:** Go to Actions tab in GitHub and run "Build and Release Electron App" workflow

The workflow will:
- Build the React frontend
- Package it with Electron
- Create a Windows `.exe` installer
- Upload as release artifact

### Auto-Update Feature

The app includes automatic update checking:
- Checks for updates on startup
- Manual check via Help → Check for Updates
- Downloads and installs updates automatically

To enable auto-updates:
1. Create releases on GitHub with the `.exe` file
2. The app will detect and download new versions

### Version Management

Update version in these files when releasing:
- `electron/package.json` → `version`
- `frontend/src/App.js` → version badge (if shown)

### Icon

Place your app icon in these locations:
- `electron/build/icon.ico` (Windows)
- `electron/build/icon.png` (Linux)
- `electron/build/icon.icns` (macOS)

Recommended icon sizes:
- 256x256 pixels minimum
- Square aspect ratio
