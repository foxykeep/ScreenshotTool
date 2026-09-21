/**
 * Loads an image file from disk into an HTMLImageElement.
 * @param file - Image file chosen by the user
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Please choose an image file.'))
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not load that image.'))
    }
    img.src = url
  })
}

/**
 * Captures a display or window via getDisplayMedia and returns a still frame.
 * Stops the media stream after the frame is grabbed.
 */
export async function captureDisplayFrame(): Promise<HTMLImageElement> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen capture is not supported in this browser.')
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  })

  try {
    const track = stream.getVideoTracks()[0]
    if (!track) {
      throw new Error('No video track from screen capture.')
    }

    const video = document.createElement('video')
    video.playsInline = true
    video.muted = true
    video.srcObject = stream
    await video.play()

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve()
      })
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not create capture canvas.')
    }
    ctx.drawImage(video, 0, 0)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Capture frame failed.'))),
        'image/png',
      )
    })

    return await blobToImage(blob)
  } finally {
    for (const track of stream.getTracks()) {
      track.stop()
    }
  }
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not decode capture frame.'))
    }
    img.src = url
  })
}
