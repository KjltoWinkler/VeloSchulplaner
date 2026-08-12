# DSBmaterial 🎓

<p align="center">
  <img src="assets/DSBmaterial.png" alt="App Icon" width="128"/>
</p>

<p align="center">
  <strong>Material You Expressive alternative for DSBmobile</strong><br>
</p>

<div align="center">
	<a href="https://github.com/WollyDev24/DSBmaterial">
		<img src="https://m3-markdown-badges.vercel.app/stars/6/2/WollyDev24/DSBmaterial" alt="Stars Badge"/>
	</a>
	<a href="https://github.com/WollyDev24/DSBmaterial">
		<img src="https://m3-markdown-badges.vercel.app/issues/1/2/WollyDev24/DSBmaterial" alt="Stars Badge"/>
	</a>
	<a href="https://github.com/WollyDev24/DSBmaterial">
		<img src="https://ziadoua.github.io/m3-Markdown-Badges/badges/Android/android3.svg" alt="Android Badge"/>
	</a>

</div>

## ❓ Why does this app exist?
- The offical DSBmobile app hasn't been update since 2 years and isn't native at all

## ⬇️ Get DSBmaterial from here

<p align="left">
  <a href="https://apps.obtainium.imranr.dev/redirect?r=obtainium://add/https://github.com/WollyDev24/DSB_Material">
    <img src="assets/obtainium.png" alt="Get it on Obtainium" height="60" /></a>
  <a href="https://github.com/WollyDev24/DSB_Material/releases/latest">
    <img src="assets/github.webp" alt="Get it on GitHub" height="60" /></a>
<!--  <a href="https://fdroid.org">
    <img src="assets/fdroid.png" alt="Get it on Fdroid" height="60" /></a> -->
</p>

## 📱 Preview
<p align="center">
  <img src="assets/Preview/screenshot1.png" alt="Screenshot 1" width="200" style="border-radius:26px;"/>
  <img src="assets/Preview/screenshot2.png" alt="Screenshot 2" width="200" style="border-radius:26px;"/>
  <img src="assets/Preview/screenshot3.png" alt="Screenshot 3" width="200" style="border-radius:26px;"/>
  <img src="assets/Preview/screenshot4.png" alt="Screenshot 4" width="200" style="border-radius:26px;"/>
</p>

## 📂 Project Structure

```text
app/src/main/
├── assets/webserver/           # Self-contained browser page for the local webserver
├── res/
│   ├── font/google_sans_flex.ttf  # Bundled variable font (SIL OFL 1.1)
│   └── ...                         # Layouts, values, themes, app icon
└── java/dev/wolly/dsbmaterial/
    ├── api/
    │   └── DSBMobileAPI.kt       # API client for DSBmobile (GZIP/HTML parsing)
    ├── data/
    │   ├── DataStoreManager.kt   # Persistent storage for settings & credentials
    │   └── Models.kt             # Data classes for substitution entries
    ├── ui/
    │   ├── theme/                # Material 3 Theme, Color, Type, Shape, Motion
    │   ├── components/           # Shared UI components (sliders, buttons, layout)
    │   ├── screens/              # Home, Substitutions, Archive, Calendar, Settings,
    │   │                         # Theme picker, About, Share card, Debug mode, State screens
    │   └── MainViewModel.kt      # Business logic and UI state
    ├── AutoFetchWorker.kt        # Background auto-refresh of the substitution plan
    ├── LocalWebServer.kt         # NanoHTTPD server serving the plan over the local network
    ├── DSBWidget.kt / DSBWidgetReceiver.kt  # Home-screen widget
    ├── DSBApp.kt                 # Application class
    └── MainActivity.kt           # Main entry point and all Compose UI screens
```

## 🛠️ Building the app from source:

1. **Clone the repo**
```bash
git clone https://github.com/WollyDev24/DSB_Material/
```
2. **Open in Android Studio**
   - Open Android Studio
   - Select "Open an Existing Project"
   - Navigate to the cloned directory

3. **Sync and Build**
   - Wait for Gradle to sync dependencies
   - Build the project (Build → Make Project)

4. **Run**
   - Connect a device or start an emulator
   - Click Run (▶️)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ⭐ Special Thanks to
- [Tenner/dsbmobile](https://github.com/Tenner/dsbmobile) - Understanding and usage of the API

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.
Third-party attributions are listed in the [NOTICE](NOTICE) file.

---
<p align="center">
  Made with ❤️ by <a href="https://github.com/wollydev24">WollyDev24</a>
</p>
