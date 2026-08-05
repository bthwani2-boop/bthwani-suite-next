import React from "react";

export type CartConflictSheetProps = {
  readonly onKeepServer: () => void;
  readonly onReviewOffline: () => void;
};

export const CartConflictSheet: React.FC<CartConflictSheetProps> = ({
  onKeepServer,
  onReviewOffline,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-amber-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="text-xl font-bold">تضارب في السلة</h3>
          </div>
          <p className="text-gray-600 mb-6 leading-relaxed">
            تم تعديل سلتك من جهاز آخر أو أثناء انقطاع اتصالك بالإنترنت.
            نحن نمنع التعديلات المتضاربة لحمايتك من الطلب بشكل خاطئ. ماذا تريد أن تفعل؟
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={onKeepServer}
              className="w-full py-3 px-4 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
            >
              مزامنة مع الخادم وتجاهل تعديلاتي
            </button>
            <button
              onClick={onReviewOffline}
              className="w-full py-3 px-4 bg-white text-gray-900 border border-gray-200 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              المراجعة أولاً (سلة الخادم الحالية)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
