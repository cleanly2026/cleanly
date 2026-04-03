import { useState } from 'react'
import { View, Text, Pressable, Image, Modal, StyleSheet } from 'react-native'
import { usePhotoUpload } from '../hooks/usePhotoUpload'

type Props = {
  orderId: string
  photoType: 'before' | 'after' | 'pickup' | 'return'
  instruction: string
  bodyText: string
  token: string
  onComplete: () => void
  onSkip: (reason: string) => void
}

type State = 'initial' | 'review' | 'uploading' | 'success' | 'error'

export function PhotoUploader({
  orderId,
  photoType,
  instruction,
  bodyText,
  token,
  onComplete,
  onSkip,
}: Props) {
  const { takePhoto, compressAndUpload, uploading, progress, error, setError } = usePhotoUpload(token)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [showSkipModal, setShowSkipModal] = useState(false)
  const [succeeded, setSucceeded] = useState(false)

  const currentState: State = succeeded
    ? 'success'
    : error
      ? 'error'
      : uploading
        ? 'uploading'
        : photoUri
          ? 'review'
          : 'initial'

  const handleOpenCamera = async () => {
    const uri = await takePhoto()
    if (uri) setPhotoUri(uri)
  }

  const handleUpload = async () => {
    if (!photoUri) return
    const key = await compressAndUpload(photoUri, orderId, photoType)
    if (key) {
      setSucceeded(true)
      setTimeout(onComplete, 1000)
    }
  }

  const handleRetake = () => {
    setPhotoUri(null)
    setError(null)
    setSucceeded(false)
  }

  const handleRetry = () => {
    setError(null)
    handleUpload()
  }

  const handleSkipSelect = (reason: string) => {
    setShowSkipModal(false)
    onSkip(reason)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>{instruction}</Text>
      <Text style={styles.body}>{bodyText}</Text>

      {/* Initial state */}
      {currentState === 'initial' && (
        <Pressable style={styles.cameraButton} onPress={handleOpenCamera}>
          <Text style={styles.cameraButtonText}>Open Camera</Text>
        </Pressable>
      )}

      {/* Review state */}
      {currentState === 'review' && (
        <View style={styles.reviewContainer}>
          <Image source={{ uri: photoUri! }} style={styles.thumbnail} />
          <Pressable style={styles.uploadButton} onPress={handleUpload}>
            <Text style={styles.uploadButtonText}>Upload Photo</Text>
          </Pressable>
          <Pressable onPress={handleRetake}>
            <Text style={styles.retakeLink}>Retake</Text>
          </Pressable>
        </View>
      )}

      {/* Uploading state */}
      {currentState === 'uploading' && (
        <View style={styles.uploadingContainer}>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.thumbnail} />}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{`Uploading… ${progress}%`}</Text>
        </View>
      )}

      {/* Success state */}
      {currentState === 'success' && (
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successText}>Photo saved</Text>
        </View>
      )}

      {/* Error state */}
      {currentState === 'error' && (
        <View style={styles.errorContainer}>
          <Pressable style={styles.errorBanner} onPress={handleRetry}>
            <Text style={styles.errorText}>Upload failed — tap to retry</Text>
          </Pressable>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.thumbnail} />}
        </View>
      )}

      {/* Skip option */}
      {currentState !== 'success' && currentState !== 'uploading' && (
        <Pressable onPress={() => setShowSkipModal(true)} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      )}

      {/* Skip reason modal */}
      <Modal visible={showSkipModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>Skip Photo</Text>
            <Pressable
              style={styles.modalOption}
              onPress={() => handleSkipSelect('poor_signal')}
            >
              <Text style={styles.modalOptionText}>Poor signal — will upload later</Text>
            </Pressable>
            <Pressable
              style={styles.modalOption}
              onPress={() => handleSkipSelect('not_needed')}
            >
              <Text style={styles.modalOptionText}>No photo needed</Text>
            </Pressable>
            <Pressable
              style={styles.modalCancel}
              onPress={() => setShowSkipModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  instruction: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    color: '#1A2744',
    fontFamily: 'Cairo',
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1A2744',
    fontFamily: 'Cairo',
    marginBottom: 24,
  },
  cameraButton: {
    height: 56,
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2744',
    fontFamily: 'Cairo',
  },
  reviewContainer: {
    gap: 16,
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  uploadButton: {
    height: 44,
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2744',
    fontFamily: 'Cairo',
  },
  retakeLink: {
    fontSize: 16,
    color: '#1A2744',
    fontFamily: 'Cairo',
  },
  uploadingContainer: {
    gap: 12,
    alignItems: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E8E5DF',
    borderRadius: 2,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#C9A84C',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 14,
    color: '#1A2744',
    fontFamily: 'Cairo',
  },
  successContainer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  successIcon: {
    fontSize: 32,
    color: '#16A34A',
  },
  successText: {
    fontSize: 16,
    color: '#16A34A',
    fontFamily: 'Cairo',
    fontWeight: '600',
  },
  errorContainer: {
    gap: 12,
  },
  errorBanner: {
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#1A2744',
    fontFamily: 'Cairo',
  },
  skipButton: {
    marginTop: 24,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    color: '#D97706',
    fontFamily: 'Cairo',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F8F7F4',
    borderTopStartRadius: 16,
    borderTopEndRadius: 16,
    padding: 24,
    gap: 12,
  },
  modalHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2744',
    fontFamily: 'Cairo',
    marginBottom: 8,
  },
  modalOption: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5DF',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1A2744',
    fontFamily: 'Cairo',
  },
  modalCancel: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#DC2626',
    fontFamily: 'Cairo',
  },
})
