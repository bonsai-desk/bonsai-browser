<div id="top"></div>

<!-- PROJECT SHIELDS -->

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/Bonsai-Desk/bonsai-browser">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Bonsai Browser</h3>

  <p align="center">
    Web-browser for research
that helps programmers
think clearly
    <br />
    <a href="https://bonsaibrowser.com"><strong>Website »</strong></a>
    <br />
    <br />
    <a href="https://github.com/Bonsai-Desk/bonsai-browser/releases">Releases</a>
    ·
    <a href="https://github.com/Bonsai-Desk/bonsai-browser/issues">Report Bug</a>
    ·
    <a href="https://github.com/Bonsai-Desk/bonsai-browser/issues">Request Feature</a>
  </p>
</div>

<!-- GETTING STARTED -->

## Getting Started

### Prerequisites

- nodejs
  - Bonsai Browser has been tested and works with node version 16.15.1, but it will probably work with other node versions
- yarn
  - Bonsai Browser uses yarn instead of npm

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/Bonsai-Desk/bonsai-browser
   ```
2. Navigate to project root
   ```sh
   cd bonsai-browser
   ```
3. Install dependencies
   ```sh
   yarn
   ```

## Usage

- Run Bonsai Browser

hot reloading will work for render threads, but not the main thread

non-packaged builds prepend the toggle shortcut with "Ctrl", so the default is Ctrl+Alt+Space instead of Alt+Space

```sh
yarn start
```

- Build Bonsai Browser

The packaged build will end up in the release folder, and for some platforms, it will include both an installable version and a portable version

```sh
yarn package
```

- configuration

The most recent commits have user accounts disabled by default. This can be controlled by a .env file in the root folder.

The following configuration could be used to enable user accounts and to do notarized builds.

This configuration is also required for previous commits to work at all.

Commits older than 11/29/2021 should work without configuration because user accounts did not exist yet.

```
USE_ACCOUNT=true
REACT_APP_SUPABASE_URL="https://[app url].supabase.co"
SUPABASE_ANON_KEY="[anon key]"
MIXPANEL_PROJECT_DEV_TOKEN="[mixpanel project dev token]"
MIXPANEL_PROJECT_TOKEN="[mixpanel project token]"
CI=true
APPLE_ID="example@example.com"
APPLE_ID_PASS="[apple id pass]"
GH_TOKEN="[github token]"
DEBUG=false
```

## Contributing

Bonsai Browser is no longer being actively developed, but contributions are welcome

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Join the [Discord server](https://discord.com/invite/DRCu3qJEZc)

[contributors-shield]: https://img.shields.io/github/contributors/Bonsai-Desk/bonsai-browser.svg?style=for-the-badge
[contributors-url]: https://github.com/Bonsai-Desk/bonsai-browser/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/Bonsai-Desk/bonsai-browser.svg?style=for-the-badge
[forks-url]: https://github.com/Bonsai-Desk/bonsai-browser/network/members
[stars-shield]: https://img.shields.io/github/stars/Bonsai-Desk/bonsai-browser.svg?style=for-the-badge
[stars-url]: https://github.com/Bonsai-Desk/bonsai-browser/stargazers
[issues-shield]: https://img.shields.io/github/issues/Bonsai-Desk/bonsai-browser.svg?style=for-the-badge
[issues-url]: https://github.com/Bonsai-Desk/bonsai-browser/issues
[license-shield]: https://img.shields.io/github/license/Bonsai-Desk/bonsai-browser.svg?style=for-the-badge
[license-url]: https://github.com/Bonsai-Desk/bonsai-browser/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: images/screenshot.png
