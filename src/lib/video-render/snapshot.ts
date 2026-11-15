import deployment from './deployment-snapshot.json'

export function getDeploymentSnapshotId(): string | null {
  return process.env.VIDEO_SNAPSHOT_ID || deployment.snapshotId || null
}
