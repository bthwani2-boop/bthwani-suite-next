from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "services/dsh/frontend/control-panel/catalogs/CatalogDashboardScreen.tsx"
text = TARGET.read_text(encoding="utf-8")

import_old = '''  reviewCatalogAsset,
  putEntityImage,'''
import_new = '''  reviewCatalogAsset,
  deleteCatalogAsset,
  putEntityImage,'''
if import_old in text:
    text = text.replace(import_old, import_new, 1)
elif import_new not in text:
    raise RuntimeError("catalog asset import anchor missing")

handler_old = '''  const handleAssetReview = async (assetId: string, status: "approved" | "rejected" | "archived", note: string) => {
    try {
      await reviewCatalogAsset(assetId, { decision: status, reviewNote: note });
      alert("تم تسجيل قرار مراجعة الصورة بنجاح");
      await reloadAssets();
    } catch (e: any) {
      alert("فشل مراجعة الصورة: " + (e.message ?? e.toString()));
    }
  };'''
handler_new = '''  const handleAssetReview = async (assetId: string, status: "approved" | "rejected" | "archived", note: string) => {
    try {
      if (status === "archived") {
        await deleteCatalogAsset(assetId);
        alert("تمت أرشفة الصورة وإزالتها من المكتبة النشطة");
      } else {
        await reviewCatalogAsset(assetId, { decision: status, reviewNote: note });
        alert("تم تسجيل قرار مراجعة الصورة بنجاح");
      }
      await reloadAssets();
    } catch (e: any) {
      alert("فشل تنفيذ إجراء الصورة: " + (e.message ?? e.toString()));
    }
  };'''
if handler_old in text:
    text = text.replace(handler_old, handler_new, 1)
elif handler_new not in text:
    raise RuntimeError("catalog asset review handler anchor missing")

TARGET.write_text(text, encoding="utf-8")
Path(__file__).unlink()
