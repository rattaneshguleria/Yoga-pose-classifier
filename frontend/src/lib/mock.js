// Same shape as the FastAPI response. Replace by calling the backend / WebSocket.
export const SAMPLE_LANDMARKS = Array.from({ length: 33 }, () => [.5, .5])
Object.entries({0:[.5,.14],11:[.60,.28],12:[.40,.28],13:[.72,.30],14:[.28,.30],15:[.84,.30],16:[.16,.30],
  23:[.57,.52],24:[.43,.52],25:[.72,.66],26:[.40,.66],27:[.80,.88],28:[.34,.90]}).forEach(([i, v]) => { SAMPLE_LANDMARKS[i] = v })
export const SAMPLE_RESULT = {
  pose: 'Warrior II', confidence: 0.94, form_score: 0.87,
  errors: [
    { joint: 'left_knee', detected: 148, expected: [85, 110], severity: 'warning', landmark: 25 },
    { joint: 'spine', detected: 14.2, expected: [0, 12], severity: 'warning', landmark: 11 },
  ],
  corrections: ['Bend your front knee more, keep it over the ankle.', 'Keep your torso upright.'],
  joint_angles: { left_knee: 148, right_knee: 172, left_elbow: 174, right_elbow: 171 },
}
