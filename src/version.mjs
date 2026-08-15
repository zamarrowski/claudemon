export const compareVersions = (a, b) => {
  const left = String(a).split('.')
  const right = String(b).split('.')

  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const one = Number.parseInt(left[index], 10) || 0
    const two = Number.parseInt(right[index], 10) || 0

    if (one !== two) return one - two
  }

  return 0
}

export const isNewer = (candidate, current) => {
  if (!candidate || !current) return false

  return compareVersions(candidate, current) > 0
}

export const updateNotice = ({ current, installed = null, latest = null }) => {
  if (isNewer(installed, current)) return { kind: 'stale', version: installed }
  if (isNewer(latest, current)) return { kind: 'available', version: latest }

  return null
}
