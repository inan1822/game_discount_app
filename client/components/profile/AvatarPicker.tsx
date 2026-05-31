"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { toast } from "react-toastify"
import { getAvatarGallery, updateAvatar } from "@/lib/api/users"

interface Props {
  currentAvatar?: string
  onClose: () => void
  onUpdated: (avatarUrl: string) => void
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

export default function AvatarPicker({ currentAvatar, onClose, onUpdated }: Props) {
  const [presets, setPresets] = useState<string[]>([])
  const [loadingPath, setLoadingPath] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getAvatarGallery()
      .then(setPresets)
      .catch(() => toast.error("Failed to load avatars"))
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const pick = async (presetPath: string) => {
    if (loadingPath) return
    setLoadingPath(presetPath)
    try {
      const url = await updateAvatar({ avatarUrl: presetPath })
      onUpdated(url)
      onClose()
    } catch {
      toast.error("Failed to update avatar")
    } finally {
      setLoadingPath(null)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be under 2 MB")
      e.target.value = ""
      return
    }
    setLoadingPath("upload")
    try {
      const url = await updateAvatar({ file })
      onUpdated(url)
      onClose()
    } catch {
      toast.error("Failed to upload avatar")
    } finally {
      setLoadingPath(null)
      e.target.value = ""
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-[10px] p-6"
        style={{
          background: "rgba(28,30,42,0.95)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-text-muted hover:text-white transition-colors text-lg leading-none"
        >
          ✕
        </button>

        <h2 className="mb-5 text-base font-semibold text-white">Choose Avatar</h2>

        {/* Preset grid — 3 columns */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {presets.map(path => {
            const isActive = currentAvatar === path
            const isLoading = loadingPath === path
            return (
              <button
                key={path}
                onClick={() => pick(path)}
                disabled={!!loadingPath}
                className="relative flex items-center justify-center rounded-full overflow-hidden transition-transform hover:scale-105 disabled:opacity-60"
                style={{
                  width: 72,
                  height: 72,
                  margin: "0 auto",
                  outline: isActive ? "2px solid #6475D1" : "2px solid transparent",
                  outlineOffset: 2,
                }}
              >
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                ) : null}
                <Image
                  src={path}
                  alt="avatar option"
                  width={72}
                  height={72}
                  sizes="72px"
                  style={{ display: "block" }}
                />
              </button>
            )
          })}

          {/* Upload tile */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={!!loadingPath}
            className="flex flex-col items-center justify-center rounded-full transition-transform hover:scale-105 disabled:opacity-60"
            style={{
              width: 72,
              height: 72,
              margin: "0 auto",
              background: "rgba(100,117,209,0.15)",
              border: "2px dashed rgba(100,117,209,0.5)",
            }}
          >
            {loadingPath === "upload" ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
            ) : (
              <>
                <span className="text-xl text-brand-blue leading-none">+</span>
                <span className="text-[9px] text-text-muted mt-1 leading-tight text-center">Upload</span>
              </>
            )}
          </button>
        </div>

        <p className="text-center text-[10px] text-text-muted">PNG or JPEG · max 2 MB</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
