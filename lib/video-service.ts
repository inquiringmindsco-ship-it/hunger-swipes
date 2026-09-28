import ffmpeg from 'fluent-ffmpeg'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

export interface VideoProbe {
  duration: number
  width: number
  height: number
  hasVideoStream: boolean
  format: string
}

export interface TranscodeResult {
  optimizedPath: string
  posterPath: string
  optimizedSizeBytes: number
  width: number
  height: number
  duration: number
}

const ffprobeAsync = promisify(ffmpeg.ffprobe) as unknown as (path: string) => Promise<any>

export function ffmpegAvailable(): boolean {
  try {
    return Boolean(process.env.FFMPEG_PATH || require('child_process').execSync('which ffmpeg').toString().trim())
  } catch {
    return false
  }
}

export async function probeVideo(filePath: string): Promise<VideoProbe> {
  const info: any = await ffprobeAsync(filePath)
  const stream = info.streams.find((s: any) => s.codec_type === 'video')
  return {
    duration: parseFloat(info.format?.duration || '0'),
    width: stream?.width || 0,
    height: stream?.height || 0,
    hasVideoStream: Boolean(stream),
    format: info.format?.format_name || '',
  }
}

export async function transcodeForDelivery(
  inputPath: string,
  outputDir: string,
  baseName: string,
  maxDuration = 10
): Promise<TranscodeResult | null> {
  if (!ffmpegAvailable()) return null

  await fs.mkdir(outputDir, { recursive: true })
  const optimizedPath = path.join(outputDir, `${baseName}-opt.mp4`)
  const posterPath = path.join(outputDir, `${baseName}-poster.jpg`)

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioFrequency(44100)
      .audioBitrate('128k')
      .videoBitrate('2000k')
      .size('?x720')
      .outputOptions([
        '-movflags +faststart',
        '-pix_fmt yuv420p',
        '-profile:v main',
        '-level 4.1',
        '-crf 28',
        `-t ${maxDuration}`,
      ])
      .on('error', reject)
      .on('end', () => resolve())
      .save(optimizedPath)
  })

  // Extract poster at 25% through the trimmed clip.
  await new Promise<void>((resolve, reject) => {
    ffmpeg(optimizedPath)
      .screenshots({
        timestamps: ['25%'],
        filename: `${baseName}-poster.jpg`,
        folder: outputDir,
        size: '?x720',
      })
      .on('error', reject)
      .on('end', () => resolve())
  })

  const stats = await fs.stat(optimizedPath)
  const probe = await probeVideo(optimizedPath)

  return {
    optimizedPath,
    posterPath,
    optimizedSizeBytes: stats.size,
    width: probe.width,
    height: probe.height,
    duration: Math.min(probe.duration, maxDuration),
  }
}

export async function extractFrames(inputPath: string, outputDir: string, baseName: string, count = 3): Promise<string[]> {
  await fs.mkdir(outputDir, { recursive: true })
  const probe = await probeVideo(inputPath)
  const duration = Math.min(probe.duration, 10)
  const timestamps = Array.from({ length: count }, (_, i) => `${Math.max(0, duration * (i + 1) / (count + 1))}s`)

  return new Promise<string[]>((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps,
        filename: `${baseName}-frame-%i.jpg`,
        folder: outputDir,
        size: '?x480',
      })
      .on('error', reject)
      .on('end', async () => {
        const files: string[] = []
        for (let i = 0; i < count; i++) {
          files.push(path.join(outputDir, `${baseName}-frame-${i + 1}.jpg`))
        }
        resolve(files)
      })
  })
}

export async function fileToDataUri(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath)
  const ext = path.extname(filePath).slice(1)
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
  return `data:${mime};base64,${buf.toString('base64')}`
}

export async function tempDir(prefix = 'hs-video-'): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix))
}

export async function cleanupDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true })
  } catch {}
}
