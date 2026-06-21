// Director role permissions
export const DIRECTOR_ROLES = {
  "Head Director": {
    canRecordGames: true,
    canManageSessions: true,
    canManagePlayers: true,
    canUploadPhotos: true,
    canManageDirectors: true,
    canApproveRequests: true,
  },
  "Tournament Director": {
    canRecordGames: true,
    canManageSessions: true,
    canManagePlayers: false,
    canUploadPhotos: true,
    canManageDirectors: false,
    canApproveRequests: true,
  },
  "Assistant Director": {
    canRecordGames: true,
    canManageSessions: true,
    canManagePlayers: false,
    canUploadPhotos: false,
    canManageDirectors: false,
    canApproveRequests: false,
  },
};

export const hasPermission = (directorRole, permission) => {
  return DIRECTOR_ROLES[directorRole]?.[permission] ?? false;
};