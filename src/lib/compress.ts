export async function compress(str: string) {
  const stream = new Blob([str]).stream() as unknown as ReadableStream
  const compressedStream = stream.pipeThrough(new CompressionStream("gzip"))
  const chunks = []
  for await (const chunk of compressedStream) chunks.push(chunk)
  return await concatUint8Arrays(chunks)
}

export async function decompress(compressedBytes: Uint8Array) {
  const stream = new Blob([compressedBytes as BlobPart]).stream() as unknown as ReadableStream
  const decompressedStream = stream.pipeThrough(new DecompressionStream("gzip"))
  const chunks = []
  for await (const chunk of decompressedStream) chunks.push(chunk)
  const stringBytes = await concatUint8Arrays(chunks)
  return new TextDecoder().decode(stringBytes)
}

async function concatUint8Arrays(uint8arrays: Uint8Array[]) {
  const blob = new Blob(uint8arrays as BlobPart[])
  const buffer = await blob.arrayBuffer()
  return new Uint8Array(buffer)
}
