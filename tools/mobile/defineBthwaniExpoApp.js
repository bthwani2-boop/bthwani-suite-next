const fs = require("fs");
const path = require("path");
const manifest = require("./mobile-apps.manifest.json");

const PERMISSION_TEXT = {
  photos: "نحتاج الوصول إلى معرض الصور لاختيار الصور ومشاركتها.",
  camera: "نحتاج الوصول إلى الكاميرا لالتقاط الصور ومسح الباركود وتوثيق الطلب عند الحاجة.",
  microphone: "نحتاج الوصول إلى الميكروفون لتسجيل الرسائل الصوتية أو الفيديو المرتبط بالطلب.",
  locationWhenInUse: "نحتاج الوصول إلى موقعك لعرض أقرب الخدمات وتتبع الطلبات.",
  locationAlwaysAndWhenInUse: "نحتاج الوصول إلى الموقع في الخلفية لتتبع مسار المهمة النشطة وتحديد وصول الكابتن.",
  faceId: "نحتاج حماية التطبيق باستخدام البصمة أو Face ID للعمليات الحساسة والمحفظة.",
};

function nativeCapabilities(features) {
  const hasCamera = features.includes("camera");
  const hasAudioRecording = features.includes("audio");
  const hasVideoPlayback = features.includes("video");
  const hasVideoRecording = hasCamera && hasVideoPlayback;

  return {
    hasCamera,
    hasAudioRecording,
    hasVideoPlayback,
    hasVideoRecording,
    needsMicrophone: hasAudioRecording || hasVideoRecording,
  };
}

function appAsset(appKey, fileName) {
  const relative = `./assets/${fileName}`;
  const absolute = path.resolve(__dirname, "../..", "apps", appKey, "runtime", "assets", fileName);
  return fs.existsSync(absolute) ? relative : undefined;
}

function buildInfoPlist(features) {
  const { hasCamera, needsMicrophone } = nativeCapabilities(features);
  const infoPlist = {
    NSPhotoLibraryUsageDescription: PERMISSION_TEXT.photos,
  };

  if (hasCamera) infoPlist.NSCameraUsageDescription = PERMISSION_TEXT.camera;
  if (needsMicrophone) infoPlist.NSMicrophoneUsageDescription = PERMISSION_TEXT.microphone;
  if (features.includes("location")) infoPlist.NSLocationWhenInUseUsageDescription = PERMISSION_TEXT.locationWhenInUse;
  if (features.includes("backgroundLocation")) {
    infoPlist.NSLocationAlwaysAndWhenInUseUsageDescription = PERMISSION_TEXT.locationAlwaysAndWhenInUse;
  }
  if (features.includes("localAuthentication")) infoPlist.NSFaceIDUsageDescription = PERMISSION_TEXT.faceId;

  return infoPlist;
}

function buildAndroidConfig(appKey, app, features) {
  const { needsMicrophone } = nativeCapabilities(features);
  const adaptiveIcon = appAsset(appKey, "adaptive-icon.png");
  const android = {
    package: app.androidPackage,
    blockedPermissions: needsMicrophone ? [] : ["android.permission.RECORD_AUDIO"],
  };

  if (adaptiveIcon) {
    android.adaptiveIcon = {
      foregroundImage: adaptiveIcon,
      backgroundColor: "#FFFFFF",
    };
  }

  if (features.includes("notifications") && process.env.GOOGLE_SERVICES_JSON) {
    android.googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
  }

  if (features.includes("maps")) {
    android.config = {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || "",
      },
    };
  }

  return android;
}

function buildIosConfig(app, features) {
  const ios = {
    bundleIdentifier: app.iosBundleIdentifier,
    supportsTablet: false,
    infoPlist: buildInfoPlist(features),
  };

  if (features.includes("maps")) {
    ios.config = {
      googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY || "",
    };
  }

  return ios;
}

function buildPlugins(appKey, features) {
  const {
    hasCamera,
    hasAudioRecording,
    hasVideoPlayback,
    needsMicrophone,
  } = nativeCapabilities(features);

  const plugins = [
    [
      "expo-image-picker",
      {
        photosPermission: PERMISSION_TEXT.photos,
        cameraPermission: hasCamera ? PERMISSION_TEXT.camera : false,
        microphonePermission: needsMicrophone ? PERMISSION_TEXT.microphone : false,
      },
    ],
    "expo-document-picker",
    "@sentry/react-native/expo",
  ];

  if (features.includes("router")) plugins.push("expo-router");
  if (features.includes("updates")) plugins.push("expo-updates");

  if (features.includes("splashScreen")) {
    const splashIcon = appAsset(appKey, "splash-icon.png");
    plugins.push(splashIcon ? [
      "expo-splash-screen",
      {
        image: splashIcon,
        imageWidth: 220,
        resizeMode: "contain",
        backgroundColor: "#FFFFFF",
      },
    ] : "expo-splash-screen");
  }

  if (features.includes("localAuthentication")) {
    plugins.push([
      "expo-local-authentication",
      { faceIDPermission: PERMISSION_TEXT.faceId },
    ]);
  }

  if (hasAudioRecording) {
    plugins.push([
      "expo-audio",
      {
        microphonePermission: PERMISSION_TEXT.microphone,
        recordAudioAndroid: true,
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
      },
    ]);
  }

  if (hasCamera) {
    plugins.push([
      "expo-camera",
      {
        cameraPermission: PERMISSION_TEXT.camera,
        microphonePermission: needsMicrophone ? PERMISSION_TEXT.microphone : false,
        recordAudioAndroid: needsMicrophone,
      },
    ]);
  }

  if (hasVideoPlayback) plugins.push("expo-video");
  if (features.includes("sharing")) plugins.push("expo-sharing");
  if (features.includes("webBrowser")) plugins.push("expo-web-browser");
  if (features.includes("sqlite")) plugins.push("expo-sqlite");
  if (features.includes("taskManager")) plugins.push("expo-task-manager");
  if (features.includes("backgroundTask")) plugins.push("expo-background-task");

  if (features.includes("backgroundLocation")) {
    plugins.push([
      "expo-location",
      {
        locationWhenInUsePermission: PERMISSION_TEXT.locationWhenInUse,
        locationAlwaysAndWhenInUsePermission: PERMISSION_TEXT.locationAlwaysAndWhenInUse,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        isIosBackgroundLocationEnabled: true,
      },
    ]);
  } else if (features.includes("location")) {
    plugins.push([
      "expo-location",
      { locationWhenInUsePermission: PERMISSION_TEXT.locationWhenInUse },
    ]);
  }

  if (features.includes("notifications")) {
    const notificationIcon = appAsset(appKey, "notification-icon.png");
    plugins.push([
      "expo-notifications",
      {
        defaultChannel: "bthwani-operational",
        ...(notificationIcon ? { icon: notificationIcon } : {}),
      },
    ]);
  }

  if (features.includes("secureStore")) plugins.push("expo-secure-store");
  return plugins;
}

function defineBthwaniExpoApp(appKey) {
  const app = manifest.apps[appKey];
  if (!app) throw new Error(`Unknown BThwani mobile app: ${appKey}`);

  const features = app.features || [];
  return {
    name: app.name,
    slug: app.slug,
    entryPoint: "./index.js",
    owner: manifest.global.owner,
    platforms: ["ios", "android"],
    scheme: app.scheme,
    version: manifest.global.version,
    icon: appAsset(appKey, "icon.png"),
    runtimeVersion: { policy: "fingerprint" },
    updates: {
      url: `https://u.expo.dev/${app.projectId}`,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
    },
    orientation: "portrait",
    userInterfaceStyle: "light",
    android: buildAndroidConfig(appKey, app, features),
    ios: buildIosConfig(app, features),
    plugins: buildPlugins(appKey, features),
    extra: {
      appKey,
      appLine: manifest.global.appLine,
      sourceRepo: manifest.global.sourceRepo,
      eas: { projectId: app.projectId },
    },
  };
}

module.exports = { defineBthwaniExpoApp };
