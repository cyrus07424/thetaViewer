"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";

const ThetaViewer = dynamic(() => import("./components/ThetaViewer"), {
  ssr: false,
});

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
      }
      const nextObjectUrl = URL.createObjectURL(file);
      activeObjectUrlRef.current = nextObjectUrl;
      setImageUrl(nextObjectUrl);
      e.target.value = "";
    },
    []
  );

  useEffect(() => {
    return () => {
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }
    };
  }, []);

  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {imageUrl ? (
        /* ── Full-screen viewer ── */
        <div className="fixed inset-0 bg-black">
          <ThetaViewer imageUrl={imageUrl} />

          {/* Unobtrusive re-select button */}
          <button
            onClick={openFilePicker}
            title="画像を再選択"
            className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm transition hover:bg-black/60 hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            画像を再選択
          </button>
        </div>
      ) : (
        /* ── Welcome / landing screen ── */
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-4">
          <div className="max-w-lg w-full text-center space-y-8">
            {/* Icon */}
            <div className="flex justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-20 w-20 text-blue-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <ellipse cx="12" cy="12" rx="10" ry="4" />
                <line x1="12" y1="2" x2="12" y2="22" />
              </svg>
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              Theta Panorama Viewer
            </h1>

            <p className="text-gray-400 leading-relaxed">
              RICOH THETA などの全天球カメラで撮影したパノラマ画像（等距円筒図法 / Equirectangular）を
              ブラウザ上で表示するビューワーです。
              画像はすべてローカルで処理され、サーバーにはアップロードされません。
            </p>

            <ul className="text-sm text-gray-500 space-y-1">
              <li>🖱️ ドラッグ・スワイプで視点を回転</li>
              <li>🔍 スクロール（ピンチ）でズーム</li>
              <li>📁 いつでも別の画像に切り替え可能</li>
            </ul>

            <button
              onClick={openFilePicker}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-base font-semibold shadow-lg transition hover:bg-blue-500 active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              画像を開く
            </button>
          </div>

          <footer className="absolute bottom-4 text-xs text-gray-600">
            &copy; 2026{" "}
            <a
              href="https://github.com/cyrus07424"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-400"
            >
              cyrus
            </a>
          </footer>
        </div>
      )}
    </>
  );
}
