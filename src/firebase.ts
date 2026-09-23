// Unified export from src/lib/firebase to prevent duplicate app initialization
export {
  app,
  auth,
  db,
  loginWithGoogle,
  loginWithEmailOrPhone,
  registerWithEmailOrPhone,
  logoutUser,
  testFirestoreConnection,
} from './lib/firebase';
