import {decompress} from '~/lib/compress'
import {BufferAttribute, BufferGeometry} from 'three'
import 'core-js/proposals/array-buffer-base64'

export async function decodeGeometryData(data: string) {
  const bufferData = JSON.parse(data) as { length: number, buffer: string }
  const buffer = new Uint8Array(bufferData.length)
  buffer.setFromBase64(bufferData.buffer)
  const str = await decompress(buffer)
  const arrays = JSON.parse(str) as { position: number[], normal: number[] }[]
  return arrays.map(({position, normal}) => {
    const vertices = new Float32Array(position)
    const normals = new Float32Array(normal)
    const geometry = new BufferGeometry()
    return geometry
      .setAttribute('position', new BufferAttribute(vertices, 3))
      .setAttribute('normal', new BufferAttribute(normals, 3))
  })
}
