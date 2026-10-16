import { downloadObject } from './s3-document.js'

describe('#downloadObject', () => {
  test('returns the S3 object body as a Buffer', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    const s3Client = {
      send: vi.fn().mockResolvedValue({
        Body: { transformToByteArray: vi.fn().mockResolvedValue(bytes) }
      })
    }

    const result = await downloadObject(s3Client, 'my-bucket', 'my-key')

    expect(result).toBeInstanceOf(Buffer)
    expect([...result]).toEqual([1, 2, 3])
    expect(s3Client.send).toHaveBeenCalledTimes(1)
  })
})
