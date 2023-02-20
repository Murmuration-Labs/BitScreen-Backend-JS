export enum Visibility {
  None,
  Private,
  Public,
  Shared,
  Exception,
}

export enum AnalysisService {
  Safer = 'safer',
}

// BEWARE: if you update this here, make sure to also update it in the cid-monitor repo
export enum AnalysisStatus {
  retrievingFailure = 'retrievingFailure',
  scanningFailure = 'scanningFailure',
  scanningSuccess = 'scanningSuccess',
  irrelevant = 'irrelevant',
}
