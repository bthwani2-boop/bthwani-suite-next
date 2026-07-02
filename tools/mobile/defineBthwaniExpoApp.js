const manifest = require("./mobile-apps.manifest.json");

const PERMISSION_TEXT = {
  photos: "نحتاج الوصول إلى معرض الصور لاختيار الصور ومشاركتها.",
  camera: "نحتاج الوصول إلى الكاميرا لالتقاط الصور.",
  microphone: "نحتاج الوصول إلى الميكروفون عند تسجيل فيديو من الكاميرا.",
  locationWhenInUse: "نحتاج الوصول إلى موقعك لعرض أقرب الخدمات وتتبع الطلبات.",
  locationAlways: "نحتاج الوصول إلى موقعك في الخلفية لمتابعة الطلبات أثناء التنقل.",
  notifications: "نستخدم الإشعارات لإبلاغك بتحديثات الطلبات والمهام."
};

function buildInfoPlist(features) {
  const infoPlist = {
    NSPhotoLibraryUsageDescription: PERMISSION_TEXT.photos
  };

  if (features.includes("camera")) {
    infoPlist.NSCameraUsageDescription = PERMISSION_TEXT.camera;
    infoPlist.NSMicrophoneUsageDescription = PERMISSION_TEXT.microphone;
  }

  if (features.includes("location")) {
    infoPlist.NSLocationWhenInUseUsageDescription = PERMISSION_TEXT.locationWhenInUse;
  }

  return infoPlist;
}

function buildAndroidConfig(app, features) {
  const android = {
    package: app.androidPackage
  };

  if (features.includes("maps")) {
    android.config = {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || ""
      }
    };
  }

  return android;
}

function buildIosConfig(app, features) {
  const ios = {
    bundleIdentifier: app.iosBundleIdentifier,
    infoPlist: buildInfoPlist(features)
  };

  if (features.includes("maps")) {
    ios.config = {
      googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY || ""
    };
  }

  return ios;
}

function buildPlugins(features) {
  const plugins = [
    [
      "expo-image-picker",
      {
        photosPermission: PERMISSION_TEXT.photos,
        cameraPermission: PERMISSION_TEXT.camera,
        microphonePermission: PERMISSION_TEXT.microphone
      }
    ],
    "expo-document-picker"
  ];

  if (features.includes("camera")) {
    plugins.push([
      "expo-camera",
      {
        cameraPermission: PERMISSION_TEXT.camera,
        microphonePermission: PERMISSION_TEXT.microphone
      }
    ]);
  }

  if (features.includes("video")) {
    plugins.push("expo-video");
  }

  if (features.includes("location")) {
    plugins.push([
      "expo-location",
      {
        locationWhenInUsePermission: PERMISSION_TEXT.locationWhenInUse
      }
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
    throw new Error("Unknown BThwani mobile app: " + appKey);
  }

  const features = app.features || [];

  return {
    name: app.name,
    slug: app.slug,
    owner: manifest.global.owner,

    platforms: ["ios", "android"],

    scheme: app.scheme,
    version: manifest.global.version,

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
        projectId: app.projectId
      }
    }
  };
}

module.exports = {
  defineBthwaniExpoApp
};
