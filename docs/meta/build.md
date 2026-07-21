## Overview

Web Apps for Meta Ray-Ban Display (MRBD) use standard web APIs. The easiest way to build Web Apps is using AI coding tools.

Learn how to build optimized Meta Ray-Ban Display Web Apps by understanding:

- How to Build with AI
- Capabilities and Best Practices
  - Display
  - Input
  - Sensors
  - Location
  - Local Storage
  - App Icons

## Build with AI

AI coding tools and app platforms such as Replit, Manus, Lovable, Claude Code, Vercel, and Cursor can help build Web Apps for Meta Ray-Ban Display glasses when prompts include the platform constraints. The most reliable setup combines the [Web Apps GitHub plugin](https://github.com/facebookincubator/meta-wearables-webapp), this guide, and the Wearables MCP endpoint https://mcp.developer.meta.com/wearables and its `search_webapps_docs` tool.

### Copy a starter prompt

Use these prompts to get started quickly. They tell the assistant to inspect your project first, use the Wearables MCP endpoint https://mcp.developer.meta.com/wearables to call `search_webapps_docs` for current docs, handle unavailable MCP tools explicitly, and keep the first code change small.

#### New Web App

```text
Use https://wearables.developer.meta.com/docs/develop/webapps/build/, then use the Wearables MCP endpoint https://mcp.developer.meta.com/wearables to call search_webapps_docs for current Meta Ray-Ban Display Web Apps constraints, setup, testing, and publishing guidance. If search_webapps_docs is unavailable, use the linked build guide and state that MCP docs lookup was unavailable before proceeding. Inspect my project first, then build the smallest working Web App for this idea: [describe the app]. It must render in a fixed 600 x 600 pixel viewport, avoid scrolling, use a dark additive-display UI, support arrow-key navigation and Enter activation, and keep all interactive elements reachable without mouse or touch input. Run the relevant local checks.
```

#### Navigation and focus behavior

```text
Use https://wearables.developer.meta.com/docs/develop/webapps/build/, then use the Wearables MCP endpoint https://mcp.developer.meta.com/wearables to call search_webapps_docs for current Meta Ray-Ban Display Web Apps input, D-pad navigation, focus-management, viewport, and no-scroll guidance. If search_webapps_docs is unavailable, use the linked build guide and state that MCP docs lookup was unavailable before proceeding. Inspect this Web App first, then add the smallest reliable navigation fix. Preserve arrow-key movement, Enter activation, visible focus states, a fixed 600 x 600 pixel viewport, and no scrolling. Run the relevant local checks.
```

#### Debug an existing Web App

```text
Use https://wearables.developer.meta.com/docs/develop/webapps/build/, then use the Wearables MCP endpoint https://mcp.developer.meta.com/wearables to call search_webapps_docs for current Meta Ray-Ban Display Web Apps constraints and troubleshooting guidance. If search_webapps_docs is unavailable, use the linked build guide and state that MCP docs lookup was unavailable before proceeding. Inspect this Web App first and identify whether the issue is layout, input navigation, storage, sensors, or deployment. Preserve the fixed 600 x 600 pixel viewport, no-scrolling behavior, arrow-key and Enter input model, and dark additive-display UI. Make the smallest fix and run the relevant local checks.
```

## HTML metadata

Add the following metadata to the `<head>` of your HTML file. This allows your web app to support upcoming discovery surfaces and enables us to message users when a website isn't compatible with MRBD.

```html
<head>
  <!-- A brief description of your app -->
  <meta name="description" content="Description of your web app" />
  <!-- Identify your web app as MRBD-compatible -->
  <meta name="mrbd-web-app-capable" content="yes" />
</head>
```

## Capabilities

### Summary

Below are the currently supported capabilities for Web Apps.

| Capability     | Description and guidance                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Display        | Additive waveguide overlay. Use dark backgrounds/light, high-contrast UI colors. Fixed 600x600px viewport. Avoid scrolling.                              |
| Input          | Navigation via Neural Band/captouch gestures translates to standard arrow key and Enter events. No mouse/touch/keyboard. All elements must be focusable. |
| Sensors (IMU)  | Standard `DeviceMotionEvent` (accelerometer, gyroscope) and `DeviceOrientationEvent` (heading, tilt, roll) W3C APIs. Requires user permission.           |
| Location (GPS) | Standard `navigator.geolocation` W3C API. Location is fetched from the paired mobile device. Requires user permission.                                   |
| Local Storage  | Standard Web Storage APIs (`localStorage`, `sessionStorage`). Best for lightweight data (preferences, small caches). Use JSON for structured data.       |
| App Icons      | Use Unicode symbols or high-resolution PNG favicons (>= 52x52 px) via `<link>` tags or Web App Manifest. SVGs are not supported.                         |

**Unsupported Capabilities:** Web Apps do **not** yet support:

- Camera
- Microphone
- Text Input
- Offline Support
- Notifications
- Back Navigation

Also, there is no continuous cursor support for Web Apps.

### Display

The display is an additive waveguide that overlays rendered pixels onto the wearer's real-world view. This has a direct impact on how your app looks.

- A pixel rendered as pure black is fully transparent, since it contributes zero light.
- Bright, vivid colors are the most visible, because they add light on top of the real-world scene.

#### Color and typography

Because the display is additive, color choices matter more than on a conventional screen:

- Use dark backgrounds, since they effectively disappear. Bright backgrounds cause glare and reduce readability.
- Use light, high-contrast colors for UI elements like text and interactive components. Also, use bright colors for accents.
- Use large, readable fonts: a minimum of 16 px for body text and 20-24 px for primary content.

#### Viewport

All content should render within a fixed 600 x 600 pixel viewport and avoid scrolling.
Include the following viewport `meta` tag to lock the scale and prevent unexpected zooming:

```html
<!-- optional -->
<meta name="viewport" content="width=600, height=600, initial-scale=1.0, user-scalable=no" />
```

Set `overflow: hidden` on the `<body>` element to ensure no content extends beyond the viewport boundary:

```css
body {
  width: 600px;
  height: 600px;
  overflow: hidden;
}
```

### Input: Neural band and captouch gesture

MRBD UI navigation is driven by two input mechanisms: the Neural Band and a touch strip on the glasses temple arm that senses swipe gestures. They produce directional and selection inputs that the glasses OS translates into standard arrow key (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) and `Enter` events delivered to your Web App.

**Note:** Since there is no mouse, touch screen, or physical keyboard, every interactive element of your Web App must be reached and activated by these gestures.

**JavaScript**

```javascript
// — Input Constants —
const DPAD = {
  UP: "ArrowUp",
  DOWN: "ArrowDown",
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
  SELECT: "Enter",
  BACK: "Escape",
};

// — Focus Management —
function moveFocus(direction) {
  var focusables = Array.from(document.querySelectorAll(".focusable:not([disabled]):not(.hidden)"));
  if (!focusables.length) return;

  var idx = focusables.indexOf(document.activeElement);
  if (idx === -1) {
    focusables[0].focus();
    return;
  }

  var next =
    direction === "up" || direction === "left"
      ? idx > 0
        ? idx - 1
        : focusables.length - 1
      : idx < focusables.length - 1
        ? idx + 1
        : 0;

  focusables[next].focus();
  focusables[next].scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// — D-pad Listener —
document.addEventListener("keydown", function (e) {
  switch (e.key) {
    case DPAD.UP:
      moveFocus("up");
      break;
    case DPAD.DOWN:
      moveFocus("down");
      break;
    case DPAD.LEFT:
      moveFocus("left");
      break;
    case DPAD.RIGHT:
      moveFocus("right");
      break;
    case DPAD.SELECT:
      if (document.activeElement.classList.contains("focusable")) {
        document.activeElement.click();
      }
      break;
    case DPAD.BACK:
      history.back();
      break;
    default:
      return; // don't preventDefault on unhandled keys
  }
  e.preventDefault();
});
```

**HTML**

```html
<!-- Mark interactive elements with the focusable class -->
<button class="focusable" data-action="settings">Settings</button>
<button class="focusable" data-action="start">Start</button>
```

**CSS**

```css
.focusable {
  transition: all 150ms ease;
  border: 2px solid transparent;
  min-height: 88px; /* glasses minimum tap target */
}

.focusable:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
}
```

### Sensors

#### Overview

Meta Ray-Ban Display glasses expose access to accelerometer, gyroscope, and compass data through the standard `DeviceMotionEvent` and `DeviceOrientationEvent` web APIs. Simply add event listeners on `window` as you would in any mobile browser.

#### Requesting permission

Motion and orientation data require an explicit user permission grant. For cross-platform compatibility, check whether `DeviceOrientationEvent.requestPermission()` exists and call it before attaching listeners.

```javascript
function startIMU() {
  window.addEventListener("deviceorientation", handleOrientation);
  window.addEventListener("devicemotion", handleMotion);
}
// Check whether requestPermission exists before calling it
if (
  typeof DeviceOrientationEvent !== "undefined" &&
  typeof DeviceOrientationEvent.requestPermission === "function"
) {
  // Platforms that require explicit permission (e.g., iOS Safari)
  DeviceOrientationEvent.requestPermission().then(function (state) {
    if (state === "granted") {
      startIMU();
    }
  });
} else {
  // Glasses runtime and most Android browsers grant automatically
  startIMU();
}
```

**Note:** The permission request must be triggered by a user gesture (for example, a button press via Enter key). It cannot be called automatically.

#### DeviceMotionEvent

`DeviceMotionEvent` provides real-time accelerometer and gyroscope readings. Use it to detect movement, measure G-forces, or track rotation speed.

```javascript
window.addEventListener("devicemotion", function (e) {
  // Accelerometer (including gravity), in m/s²
  var ax = e.accelerationIncludingGravity.x;
  var ay = e.accelerationIncludingGravity.y;
  var az = e.accelerationIncludingGravity.z;

  // Compute magnitude in G-force
  var g = Math.sqrt(ax * ax + ay * ay + az * az) / 9.81;
  document.getElementById("gforce").textContent = g.toFixed(2) + " G";

  // Gyroscope (rotation rate in degrees/second)
  var yawRate = e.rotationRate.alpha;
  var pitchRate = e.rotationRate.beta;
  var rollRate = e.rotationRate.gamma;
});
```

#### DeviceOrientationEvent

`DeviceOrientationEvent` provides the current orientation of the glasses relative to the Earth. Use it for compass heading, tilt detection, or spatial UI.

```javascript
window.addEventListener("deviceorientation", function (e) {
  var heading = e.alpha; // Compass direction (rotation around z-axis): 0-360°
  var tilt = e.beta; // Forward/back tilt (rotation around x-axis): -180° to 180°
  var roll = e.gamma; // Left/right tilt (rotation around y-axis): -90° to 90°

  document.getElementById("heading").textContent = heading.toFixed(1) + "°";
});
```

#### Best practices

| Consider                                                                | Avoid                                                            |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Requesting permission from a user gesture (for example, button press)   | Calling `requestPermission()` automatically on page load         |
| Checking for API availability before attaching listeners                | Assuming `DeviceOrientationEvent` is always defined              |
| Throttling or debouncing high-frequency sensor updates for UI rendering | Updating the DOM on every single sensor event without throttling |
| Using `accelerationIncludingGravity` for tilt-based interactions        | Relying on acceleration alone when gravity context is needed     |
| Removing event listeners when sensor data is no longer needed           | Leaving listeners active in the background, which drains battery |

### Location

#### Overview

MRBD glasses implement the standard `navigator.geolocation` web API. Location data is fetched from the wearer's paired mobile device, since the glasses themselves do not have location-aware sensors. Use the API exactly as you would in any Web App. Like Sensor Data, Location also requires user permission.

#### One-shot position

Use `getCurrentPosition` to request a single location fix.

```javascript
navigator.geolocation.getCurrentPosition(
  function (position) {
    var coords = position.coords;

    console.log("Latitude:  " + coords.latitude); // Decimal degrees
    console.log("Longitude: " + coords.longitude); // Decimal degrees
    console.log("Accuracy:  " + coords.accuracy); // m
    console.log("Altitude:  " + coords.altitude); // m (may be null)
    console.log("Speed:     " + coords.speed); // m/s (may be null)
    console.log("Heading:   " + coords.heading); // Degrees from north (may be null)
    console.log("Timestamp: " + position.timestamp); // ms since epoch (UTC)
  },
  function (error) {
    // error.code:
    //   1 = PERMISSION_DENIED: wearer denied permission request
    //   2 = POSITION_UNAVAILABLE: location could not be retrieved (i.e., phone offline)
    //   3 = TIMEOUT: request exceeded the timeout
    // error.message - human-readable description
    console.error("Geolocation error:", error.code, error.message);
  },
  { timeout: 15000 },
);
```

#### Continuous position tracking

Use `watchPosition` to receive ongoing location updates as the wearer moves.

```javascript
var watchId = navigator.geolocation.watchPosition(
  function (position) {
    // Called each time the position updates
    updateMap(position.coords.latitude, position.coords.longitude);
  },
  function (error) {
    // error.code:
    //   1 = PERMISSION_DENIED: wearer denied permission request
    //   2 = POSITION_UNAVAILABLE: location could not be retrieved (i.e., phone offline)
    //   3 = TIMEOUT: request exceeded the timeout
    // error.message - human-readable description
    console.error("Watch error:", error.code, error.message);
  },
);
```

Call `clearWatch` when updates are no longer needed.

```javascript
// Stop watching when done
navigator.geolocation.clearWatch(watchId);
```

#### Position options

Both `getCurrentPosition` and `watchPosition` accept an optional third argument to configure behavior:

| Option               | Type    | Default  | Description                                                                                       |
| -------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------- |
| `enableHighAccuracy` | boolean | false    | Request the most accurate position available. May take longer and use more power.                 |
| `timeout`            | number  | Infinity | Maximum time (in milliseconds) to wait for a position. Use 10000-15000 ms as a practical default. |
| `maximumAge`         | number  | 0        | Accept a cached position if it is no older than this value (in milliseconds).                     |

```javascript
navigator.geolocation.getCurrentPosition(successCb, errorCb, {
  enableHighAccuracy: true, // Request most accurate position (boolean, default false)
  timeout: 15000, // Max wait time in ms (number, default Infinity)
  maximumAge: 5000, // Accept cached position if newer than this in ms (number, default 0)
});
```

#### Best practices

| Consider                                                                                              | Avoid                                              |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Using a `timeout` of 10-15 seconds (10000-15000 ms), since the first request may take several seconds | Omitting using a `timeout` or setting it too low   |
| Handling `PERMISSION_DENIED` gracefully, since the wearer must grant permission                       | Assuming wearer does not need to grant permissions |
| Ensuring permissions requests are triggered by a user gesture                                         | Assuming permission requests are triggered         |

#### Notes

- Remember, location comes from the paired companion phone's GPS/network services.
- Expect an accuracy of 5-50 meters, depending on signal quality.

#### Location error handling

Always provide an error callback to handle failure gracefully. Location may be unavailable if the following errors occur:

| Description                                                                     | Error code | Type                   |
| ------------------------------------------------------------------------------- | ---------- | ---------------------- |
| Wearer denies the permission prompt                                             | 1          | `PERMISSION_DENIED`    |
| Location data could not be retrieved (for example, companion device is offline) | 2          | `POSITION_UNAVAILABLE` |
| Request exceeded the specified timeout                                          | 3          | `TIMEOUT`              |

### Storage

Web Apps on MRBD glasses have access to standard Web Storage APIs, including both `localStorage` and `sessionStorage`, to persist lightweight data on MRBD glasses:

- `localStorage` persists data across sessions, even after the app is closed and reopened.
- `sessionStorage` persists data only for the current session, so values are cleared when the session ends.

These work exactly as they do in any modern browser, and both APIs store data as key-value string pairs.

#### Saving and reading data

Use the standard `setItem`, `getItem`, and `removeItem` methods.

```javascript
// Save a value
localStorage.setItem("userPreference", "dark");

// Read a value
var preference = localStorage.getItem("userPreference");
// Returns 'dark', or null if the key does not exist

// Remove a value
localStorage.removeItem("userPreference");

// Clear all stored data
localStorage.clear();
```

#### Session storage

`sessionStorage` has an identical API, but scopes data to the current session. Use it for temporary states that should not persist after the user exits your app.

```javascript
// Track whether the user has seen the onboarding screen this session
if (sessionStorage.getItem("onboardingSeen")) {
  showMainScreen();
} else {
  showOnboarding();
  sessionStorage.setItem("onboardingSeen", "true");
}
```

#### Storage limits

The glasses runtime provides storage within the following limits:

- `localStorage`: 5 MB
- `sessionStorage`: 5 MB

As a general practice, keep stored data lightweight - avoid storing large blobs, images, or multi-megabyte datasets. Web storage is best suited for user preferences, small caches, and application state.

### App Icons

For app icons, use Unicode symbols or high-resolution PNG favicons (larger than 52x52 px). The system checks the Web App manifest and page source (not just `favicon.ico`) for this content. If no suitable icon is found, a default fallback icon is shown. SVGs are not supported.

Icons can be implemented as HTML `<link>` tags in your page's `<head>` section.

```html
<link rel="icon" href="/icon-96.png" sizes="96x96" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
```

Icons can also be implemented by referencing the Web App JSON manifest. Each entry in the `icons` array must include a `src` attribute and ideal sizes.

**HTML**

```html
<link rel="manifest" href="/manifest.webmanifest" />
```

**JSON**

```json
{
  "icons": [
    { "src": "/icons/icon-96.png", "sizes": "96x96" },
    { "src": "/icons/icon-192.png", "sizes": "192x192" }
  ]
}
```
