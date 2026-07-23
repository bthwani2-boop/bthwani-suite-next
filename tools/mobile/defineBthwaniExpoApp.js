const manifest = require("./mobile-apps.manifest.json");

const PERMISSION_TEXT = {
  photos: "نحتاج الوصول إلى معرض الصور لاختيار الصور ومشاركتها.",
  camera: "نحتاج الوصول إلى الكاميرا لالتقاط الصور ومسح الباركود.",
  microphone: "نحتاج الوصول إلى الميكروفون لتسجيل الرسائل الصوتية المرتبطة بالطلب.",
  locationWhenInUse: "نحتاج الوصول إلى موقعك لعرض أقرب الخدمات وتتبع الطلبات.",
  locationAlwaysAndWhenInUse: "نحتاج الوصول إلى الموقع في الخلفية لتتبع مسار المهمة النشطة وتحديد وصول الكابتن.",
  faceId: "نحتاج حماية التطبيق باستخدام البصمة أو Face ID للعمليات الحساسة والمحفظة.",
};

function buildInfoPlist(features) {
  const infoPlist = {
    NSPhotoLibraryUsageDescription: PERMISSION_TEXT.photos,
  };

  if (features.includes("camera")) {
    infoPlist.NSCameraUsageDescription = PERMISSION_TEXT.camera;
  }

  if (features.includes("camera") || features.includes("audio")) {
    infoPlist.NSMicrophoneUsageDescription = PERMISSION_TEXT.microphone;
  }

  if (features.includes("location")) {
    infoPlist.NSLocationWhenInUseUsageDescription = PERMISSION_TEXT.locationWhenInUse;
  }

  if (features.includes("backgroundLocation")) {
    infoPlist.NSLocationAlwaysAndWhenInUseUsageDescription = PERMISSION_TEXT.locationAlwaysAndWhenInUse;
  }

  if (features.includes("localAuthentication")) {
    infoPlist.NSFaceIDUsageDescription = PERMISSION_TEXT.faceId;
  }

  return infoPlist;
}

function buildAndroidConfig(app, features) {
  const android = {
    package: app.androidPackage,
  };

  if (features.includes("notifications")) {
    android.googleServicesFile = "./google-services.json";
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
    infoPlist: buildInfoPlist(features),
  };

  if (features.includes("maps")) {
    ios.config = {
      googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY || "",
    };
  }

  return ios;
}

function buildPlugins(features) {
  const hasCamera = features.includes("camera");
  const hasAudio = features.includes("audio");

  const plugins = [
    [
      "expo-image-picker",
      {
        photosPermission: PERMISSION_TEXT.photos,
        cameraPermission: hasCamera ? PERMISSION_TEXT.camera : false,
        microphonePermission: (hasCamera || hasAudio) ? PERMISSION_TEXT.microphone : false,
      },
    ],
    "expo-document-picker",
  ];

  if (features.includes("router")) {
    plugins.push("expo-router");
  }

  if (features.includes("updates")) {
    plugins.push("expo-updates");
  }

  if (features.includes("localAuthentication")) {
    plugins.push([
      "expo-local-authentication",
      {
        faceIDPermission: PERMISSION_TEXT.faceId,
      },
    ]);
  }

  if (hasAudio) {
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
        microphonePermission: PERMISSION_TEXT.microphone,
      },
    ]);
  }

  if (features.includes("video")) {
    plugins.push("expo-video");
  }

  if (features.includes("sharing")) {
    plugins.push("expo-sharing");
  }

  if (features.includes("webBrowser")) {
    plugins.push("expo-web-browser");
  }

  if (features.includes("sqlite")) {
    plugins.push("expo-sqlite");
  }

  if (features.includes("taskManager")) {
    plugins.push("expo-task-manager");
  }

  if (features.includes("backgroundTask")) {
    plugins.push("expo-background-task");
  }

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
      {
        locationWhenInUsePermission: PERMISSION_TEXT.locationWhenInUse,
      },
    ]);
  }

  if (features.includes("notifications")) {
    plugins.push("expo-notifications");
  }

  if (features.includes("secureStore")) {
    plugins.push("expo-secure-store");
  }

  return plugins;
}

function defineBthwaniExpoApp(appKey) {
  const app = manifest.apps[appKey];

  if (!app) {
    throw new Error(`Unknown BThwani mobile app: ${appKey}`);
  }

  const features = app.features || [];

  return {
    name: app.name,
    slug: app.slug,
    entryPoint: "./index.js",
    owner: manifest.global.owner,
    platforms: ["ios", "android"],
    scheme: app.scheme,
    version: manifest.global.version,
    runtimeVersion: {
      policy: "fingerprint",
    },
    updates: {
      url: `https://u.expo.dev/${app.projectId}`,
    },
    orientation: "portrait",
    userInterfaceStyle: "light",
    android: buildAndroidConfig(app, features),
    ios: buildIosConfig(app, features),
    plugins: buildPlugins(features),
    extra: {
      appKey,
      appLine: manifest.global.appLine,
      sourceRepo: manifest.global.sourceRepo,
      eas: {
        projectId: app.projectId,
      },
    },
  };
}

module.exports = {
  defineBthwaniExpoApp,
};

