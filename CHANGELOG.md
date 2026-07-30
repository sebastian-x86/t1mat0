# Changelog

## [0.2.0](https://github.com/sebastian-x86/t1mat0/compare/t1mat0-v0.1.0...t1mat0-v0.2.0) (2026-07-30)


### Features

* **settings:** make closing to the notification area optional ([#38](https://github.com/sebastian-x86/t1mat0/issues/38)) ([d2ecdfd](https://github.com/sebastian-x86/t1mat0/commit/d2ecdfd51ddad7b3abaeae512fbbd71ffd4360e4))
* **ui:** add a light theme ([#36](https://github.com/sebastian-x86/t1mat0/issues/36)) ([319f8b6](https://github.com/sebastian-x86/t1mat0/commit/319f8b61d60806534bd7dd024d1bf1c2471b3af3)), closes [#32](https://github.com/sebastian-x86/t1mat0/issues/32)


### Bug Fixes

* **ui:** keep the primary button readable while hovered ([#39](https://github.com/sebastian-x86/t1mat0/issues/39)) ([2aa9694](https://github.com/sebastian-x86/t1mat0/commit/2aa969453a7084fbedf2b5e5d53fc6ee6eccccf9))
* **ui:** keep the primary button readable while hovered ([#40](https://github.com/sebastian-x86/t1mat0/issues/40)) ([f116c93](https://github.com/sebastian-x86/t1mat0/commit/f116c93718099324153b29e800727a53937cb98b))
* **ui:** line up the language and theme pickers ([#43](https://github.com/sebastian-x86/t1mat0/issues/43)) ([044a423](https://github.com/sebastian-x86/t1mat0/commit/044a423fdc03c9f7751475b5b02edd43d7add2e9))


### Refactoring

* **frontend:** split App.tsx and App.css by component ([#31](https://github.com/sebastian-x86/t1mat0/issues/31)) ([3d86ac8](https://github.com/sebastian-x86/t1mat0/commit/3d86ac82d09a76196120e0bff49b24caf63bafd4)), closes [#3](https://github.com/sebastian-x86/t1mat0/issues/3)
* move go code into internal packages ([#30](https://github.com/sebastian-x86/t1mat0/issues/30)) ([471bdcb](https://github.com/sebastian-x86/t1mat0/commit/471bdcb0c807bfae31ee3c706134c3d4232ed27d)), closes [#2](https://github.com/sebastian-x86/t1mat0/issues/2)


### Build

* **frontend:** move to typescript 7 ([#27](https://github.com/sebastian-x86/t1mat0/issues/27)) ([7af2971](https://github.com/sebastian-x86/t1mat0/commit/7af29717e2d9c543bb77877324db8b6e3b651708)), closes [#26](https://github.com/sebastian-x86/t1mat0/issues/26)
* **frontend:** replace eslint with oxlint and move to typescript 7 ([#34](https://github.com/sebastian-x86/t1mat0/issues/34)) ([ebdbdcb](https://github.com/sebastian-x86/t1mat0/commit/ebdbdcba701b1d4f77f663d78da9fc5335a5e4a2)), closes [#26](https://github.com/sebastian-x86/t1mat0/issues/26)
* **release:** attach SHA256SUMS to every release ([#35](https://github.com/sebastian-x86/t1mat0/issues/35)) ([a192cea](https://github.com/sebastian-x86/t1mat0/commit/a192cea0712337605ad8bfc0fa6bd9870e33b183)), closes [#6](https://github.com/sebastian-x86/t1mat0/issues/6)

## 0.1.0 (2026-07-30)


### Features

* add i18n, keyboard control and tomato harvest ([91c577f](https://github.com/sebastian-x86/t1mat0/commit/91c577f986e80e63a9034546c6d9ec58101d1c94))
* add t1mat0 pomodoro timer ([011c419](https://github.com/sebastian-x86/t1mat0/commit/011c4193e6cfe26457e5a8f64874b78de6700675))
* doze animation, plus tests for persistence and clock ([cf497d1](https://github.com/sebastian-x86/t1mat0/commit/cf497d1e7b7054744f34d08608eed8234cb23da1))
* show the built version in the shortcut overlay ([5c759c2](https://github.com/sebastian-x86/t1mat0/commit/5c759c2ab0c27041e8734bdf0e4c5f9521dafbb3))
* **ui:** tomato icon and gear settings popover ([4787ce2](https://github.com/sebastian-x86/t1mat0/commit/4787ce20d9487df8ea18101afe9fe06f22758426))


### Bug Fixes

* **deps:** bump x/crypto and x/net past the ssh advisories ([#11](https://github.com/sebastian-x86/t1mat0/issues/11)) ([15da793](https://github.com/sebastian-x86/t1mat0/commit/15da79309dfad8b9be272277034e2c82dd8d01f6))


### Documentation

* add GPL-3.0 license and contributing guide ([d52290c](https://github.com/sebastian-x86/t1mat0/commit/d52290cf8d45097c470759178c5bd3408a88ec20))
* add the community and security files ([#12](https://github.com/sebastian-x86/t1mat0/issues/12)) ([2556d1b](https://github.com/sebastian-x86/t1mat0/commit/2556d1b0af3b9c26a8f8528e7114235206fc652e))
* describe a11y, scenes, clock editing and coverage ([24b73da](https://github.com/sebastian-x86/t1mat0/commit/24b73dafabe147855330a3cd1804848131080782))
* show the remaining screens in the readme ([#17](https://github.com/sebastian-x86/t1mat0/issues/17)) ([02d72bd](https://github.com/sebastian-x86/t1mat0/commit/02d72bdeaa367a2588618b8735d474fb4f2373e8)), closes [#5](https://github.com/sebastian-x86/t1mat0/issues/5)


### Build

* bump vite from 7.3.6 to 8.1.5 in /frontend ([#20](https://github.com/sebastian-x86/t1mat0/issues/20)) ([f4262fd](https://github.com/sebastian-x86/t1mat0/commit/f4262fdaf99502726eb9f544b58bfeba261016ae))
