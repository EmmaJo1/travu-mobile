declare module '@react-native-google-signin/google-signin/lib/module/signIn/GoogleSignin' {
  export const GoogleSignin: {
    configure: (options: {
      iosClientId?: string;
      scopes?: string[];
      webClientId: string;
    }) => void;
    hasPlayServices: (options: { showPlayServicesUpdateDialog: boolean }) => Promise<boolean>;
    signIn: () => Promise<
      | {
          type: 'success';
          data: {
            idToken: string | null;
          };
        }
      | {
          type: 'cancelled';
          data: null;
        }
    >;
    signOut: () => Promise<null>;
  };
}
