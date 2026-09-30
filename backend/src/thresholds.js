// Safety limits per metric. "max" => alert if value > limit, "min" => alert if value < limit
module.exports = {
  temperature: { type: 'max', limit: 40, unit: '°C', label: 'High temperature' },
  gas: { type: 'max', limit: 50, unit: 'ppm', label: 'Hazardous gas level' },
  noise: { type: 'max', limit: 95, unit: 'dB', label: 'Excessive noise' },
  vibration: { type: 'max', limit: 7, unit: 'mm/s', label: 'Structural vibration' },
  helmetCompliance: { type: 'min', limit: 80, unit: '%', label: 'Low helmet compliance' },
};
