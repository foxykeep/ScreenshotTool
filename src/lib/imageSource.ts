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
