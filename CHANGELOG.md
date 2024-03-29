# Changelog

## Bonsai v1.2.2 (January 31 2022)

## **Features**

- Include history in search
- Search UI looks like Google
- Hotkey for all tags page (Ctrl/Cmd+G)
- Settings option to disable focusing the search box on toggle

### **Fixes**

- Fix bug where some lists would select first item after deleting something
- Middle click now also closes pages on the tag view

## Bonsai v1.2.1 (January 25 2022)

### **Features**

- Support for local files
  - Click and drag file into window or put file path in search box
- Custom floating window widths in settings
- Open and close pages from tag views without leaving view
  - Click the green indicator, use hotkey, or middle mouse click item
- Update notifications in app
- Page zooming hotkeys
- Ctrl+Shift+Tab to cycle through tabs
- Buttons for tagging and closing pages on list items

### **Fixes**

- Tagged pages now have screenshots
- Alt+H/L no longer fills bonsai box with junk (macOS)
- Arrows don't work on some bonsai text boxes
- Right column dissapears sometimes in domain view
- List items in tag page remember selection when navigating

### **Other**

- Added some pre-filled data for first time users
- Blur text box when mouse highlights a list item
- Most recently used tag at top of tag modal
- Cleaner ordering of items' tags in tag page view

## Bonsai 1.2.0 (January 14, 2022)

### Features

- Tagging system to replace workspaces!
  - Use Ctrl/Cmd+D to tag a page
- Redesigned app around lists and hotkey navigation

## Bonsai 1.1.4 (December 17, 2021)

### Fixes

- Tiled windows now stay tiled when toggle the app

## Bonsai 1.1.3 (December 16, 2021)

### Features

- Tiling floating window with hotkeys (physics window replaced)
- While app is open, press Alt+H or Alt+L to tile window left or right.
- You can also use ALt+LeftArrow and Alt+RightArrow
- App is fully functional in tiled window mode
- Light & dark mode (matches system theme by default), custom background color, & UI improvements
- Choose between Google/DuckDuckGo
- Scrollbounce on macOS
- Switch between tabs on macOS with Cmd+Opt+Left/Right

### Fixes

- Escape hotkey now does not trigger unless app has focus
- Hotkeys display correctly for each platform
- Close find-in-page popup when you navigate
- Fixed problem where macOS notch cuts into search bar
- Remove unintended outlines that would appear on buttons sometimes
- Return to homepage hotkey no longer bricks app when in floaty window mode

## Bonsai 1.1.2 (December 07, 2021)

### Features

- Data backup and sync to Bonsai account
- New UI style
- Toggle between tab columns and bump-ordered grid on home page
- Feedback page

### Fixes

- Improved performance of workspaces
- Better tab image handling to reduce latency of home & search
- Undo closed tab(s) with ctrl+shift+t is no longer broken

## Bonsai 1.1.1 (October 26, 2021)

- Tab home page is now bump ordered instead of grouped by domains in columns
- New tab card styling on homepage & search
- Fix: UI for small tabs when many are open and overflow behavior in tab row
- Fix: new tab hotkey focuses the url box now

## Bonsai 1.1.0 (October 20, 2021)

- Normal URL box, tabs, and back/forward buttons cloned from Chrome
- Removed tree history data structure and associated UI
- Change the floating window icon to ‘Picture in Picture’
- Fixed bug where pages opened in a new window would disappear if opened too quickly
- Added more logging to workspace load function on startup to catch help catch bug where workspace data gets lost
- Updated some macOS icons

## Bonsai 1.0.9 (October 12, 2021)

- Linux version available at https://bonsaibrowser.com/
  - Tested on Ubuntu 20.04

## Bonsai 1.0.8 (October 8, 2021)

- Windows version available at https://bonsaibrowser.com/
- You will have to click 'more info' -> 'run anyway' to launch it the first time since the app is not signed on Windows
- Update the style of some buttons
- Change background to solid color instead of translucent
- Sign up for mailing list in settings

## Bonsai 1.0.7 (September 18, 2021)

- Floating window is now interactable
- Shortcuts can be rebound
- New settings page
- More shortcuts + documentation on the settings page
- Search box is now always available and focused when app is toggled on
- Fixed bug causing URLs to be Googled sometimes
- Added support for localhost
- Added support for custom hosts file URLs
- Fixed window width when OS dock in on the side of your screen
- Reduced lag when starting fuzzy search

New Shortcuts

- Toggle floating window: Command+\
- Focus search box: Command+L
- Return to tab page: Command+E
- Close current page: Command+W

## Bonsai 1.0.6 (September 7, 2021)

First public release (macOS only).
