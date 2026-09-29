import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
// Real in-browser pose detection (MediaPipe Tasks). Frames never leave the device.
// Needs internet on first load for the wasm + model files; self-host them for offline demos.
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
let loading
export function loadModel() {
  loading ||= FilesetResolver.forVisionTasks(WASM).then(async fs => {
    const make = delegate => PoseLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numPoses: 1 })
    try { return await make('GPU') } catch { return make('CPU') }
  })
  loading.catch(() => { loading = null })
  return loading
}
// onFrame(landmarks | null) roughly once per new video frame. Returns a stop function.
export async function startDetection(video, onFrame) {
  const model = await loadModel()
  let raf, last = -1, stopped = false
  const loop = () => {
    if (stopped) return
    if (video.readyState >= 2 && video.currentTime !== last) {
      last = video.currentTime
      onFrame(model.detectForVideo(video, performance.now()).landmarks[0] || null)
    }
    raf = requestAnimationFrame(loop)
  }
  loop()
  return () => { stopped = true; cancelAnimationFrame(raf) }
}

// Separate landmarker instances for uploads, so they never clash with the live camera's timestamps.
async function create(mode) {
  const fs = await FilesetResolver.forVisionTasks(WASM)
  const make = delegate => PoseLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: mode, numPoses: 1 })
  try { return await make('GPU') } catch { return make('CPU') }
}
let imageModel
export async function detectImage(img) {
  imageModel ||= await create('IMAGE')
  return imageModel.detect(img).landmarks[0] || null
}
export const createVideoLandmarker = () => create('VIDEO')
