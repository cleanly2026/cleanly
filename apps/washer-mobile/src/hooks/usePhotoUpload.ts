import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { useState, useCallback } from 'react'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

export function usePhotoUpload(token: string) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const takePhoto = useCallback(async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    })
    if (result.canceled || !result.assets[0]) return null
    return result.assets[0].uri
  }, [])

  const compressAndUpload = useCallback(
    async (
      uri: string,
      orderId: string,
      photoType: 'before' | 'after' | 'pickup' | 'return'
    ) => {
      setUploading(true)
      setProgress(0)
      setError(null)

      try {
        // Compress: max 1200px, JPEG quality 0.8
        const compressed = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        )

        // Get presigned URL
        const urlRes = await fetch(
          `${API_URL}/api/photos/upload-url?orderId=${orderId}&photoType=${photoType}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        const { uploadUrl, key } = await urlRes.json()

        setProgress(30)

        // Upload to R2 with retry (PHO-06: exponential backoff 2s -> 4s -> 8s)
        const blob = await fetch(compressed.uri).then((r) => r.blob())
        let uploaded = false
        for (let attempt = 0; attempt <= 3; attempt++) {
          try {
            const putRes = await fetch(uploadUrl, {
              method: 'PUT',
              body: blob,
              headers: { 'Content-Type': 'image/jpeg' },
            })
            if (!putRes.ok) throw new Error(`R2 ${putRes.status}`)
            uploaded = true
            break
          } catch (e) {
            if (attempt === 3) throw e
            await new Promise((r) => setTimeout(r, Math.pow(2, attempt + 1) * 1000))
          }
        }

        setProgress(80)

        // Confirm to API
        if (uploaded) {
          await fetch(`${API_URL}/api/orders/${orderId}/photos`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoType, r2Key: key }),
          })
        }

        setProgress(100)
        return key
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Upload failed'
        setError(message)
        return null
      } finally {
        setUploading(false)
      }
    },
    [token]
  )

  return { takePhoto, compressAndUpload, uploading, progress, error, setError }
}
