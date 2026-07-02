export type BrowserImageMetadata = {
  width: number
  height: number
}

export async function readImageMetadata(file: File): Promise<BrowserImageMetadata> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = new Image()
    const loaded = new Promise<BrowserImageMetadata>((resolve, reject) => {
      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        })
      }
      image.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."))
    })

    image.src = objectUrl
    return await loaded
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function sha256File(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hash = await crypto.subtle.digest("SHA-256", buffer)

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
